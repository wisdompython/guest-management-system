import logging
from celery import shared_task
from django.db import transaction
from django.db.models import F
from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

# Max messages per second — stay well under Meta's rate limit
# Meta allows ~80 messages/sec on higher tiers but 250/day on free tier.
# 1 message every 3 seconds = ~1,200/hour, safe for all tiers.
WHATSAPP_MESSAGES_PER_MINUTE = 20
WHATSAPP_RATE_LIMIT = f'{WHATSAPP_MESSAGES_PER_MINUTE}/m'
ASSET_BATCH_SIZE = 25


@shared_task(bind=True, max_retries=3, default_retry_delay=60,
             rate_limit=WHATSAPP_RATE_LIMIT)
def send_whatsapp_pass(self, guest_id: str):
    """Send the WhatsApp pass for a single guest. Retries up to 3 times on failure."""
    from .models import Guest
    from .whatsapp import send_pass

    try:
        guest = Guest.objects.select_related('event__whatsapp_template').get(pk=guest_id)
    except Guest.DoesNotExist:
        logger.warning("send_whatsapp_pass: guest %s not found", guest_id)
        return {'sent': False, 'reason': 'guest not found'}

    # Optional RSVP workflows hold passes until this specific guest confirms.
    # Events without an RSVP workflow always pass this guard.
    from rsvp.services import pass_delivery_allowed
    if not pass_delivery_allowed(guest.id, guest.event_id):
        logger.info("RSVP workflow is holding the pass for guest %s", guest_id)
        return {'sent': False, 'reason': 'awaiting RSVP confirmation'}

    from django.conf import settings as django_settings
    if not django_settings.WHATSAPP_PHONE_ID or not django_settings.WHATSAPP_TOKEN:
        logger.warning("WhatsApp not configured — skipping send for guest %s", guest_id)
        return {'sent': False, 'reason': 'not configured'}

    try:
        sent = send_pass(guest)
    except Exception as exc:
        # Non-transient errors (bad template name, invalid number, etc.) — don't retry
        from pywa.errors import WhatsAppError
        if isinstance(exc, WhatsAppError) and not exc.is_transient:
            logger.error("Non-transient WhatsApp error for guest %s: %s", guest_id, exc)
            return {'sent': False, 'reason': str(exc)}
        raise self.retry(exc=exc)

    if sent:
        Guest.objects.filter(pk=guest_id).update(
            whatsapp_sent=True,
            whatsapp_sent_at=timezone.now(),
        )
        logger.info("WhatsApp pass sent for guest %s", guest_id)
        return {'sent': True}

    logger.warning("send_pass returned False for guest %s — not retrying", guest_id)
    return {'sent': False, 'reason': 'send_pass failed'}


@shared_task
def bulk_send_whatsapp_passes(event_id: int, resend: bool = False):
    """
    Dispatch individual pass tasks for each eligible guest. The worker-level
    task rate limit controls throughput without reserving thousands of ETA
    tasks in worker memory.
    """
    from .models import Guest

    qs = Guest.objects.filter(
        event_id=event_id,
        pass_image__isnull=False,
    ).exclude(pass_image='').values_list('id', flat=True)

    if not resend:
        qs = qs.filter(whatsapp_sent=False)

    guest_ids = list(qs)
    total = len(guest_ids)

    for guest_id in guest_ids:
        send_whatsapp_pass.delay(str(guest_id))

    logger.info(
        "Bulk WhatsApp queued %s messages for event %s (~%s mins)",
        total, event_id, round(total / WHATSAPP_MESSAGES_PER_MINUTE, 1),
    )
    return {
        'queued': total,
        'estimated_minutes': round(total / WHATSAPP_MESSAGES_PER_MINUTE, 1),
    }


def _generate_guest_assets(guest_id: str, send_whatsapp: bool = True):
    """Generate one guest's assets; shared by single and batched tasks."""
    from .models import Guest
    from .utils import generate_qr_code, generate_pass_image

    try:
        guest = Guest.objects.select_related('event').get(pk=guest_id)
    except Guest.DoesNotExist:
        logger.warning("generate_guest_assets: guest %s not found", guest_id)
        return

    qr_ok = generate_qr_code(guest)
    if not qr_ok:
        logger.warning("QR generation failed for guest %s", guest_id)

    guest.refresh_from_db(fields=['qr_code'])
    pass_ok = False
    if guest.event and guest.event.design_template and guest.qr_code:
        pass_ok = generate_pass_image(guest)

    from django.conf import settings as django_settings
    wa_configured = bool(django_settings.WHATSAPP_PHONE_ID and django_settings.WHATSAPP_TOKEN)
    from rsvp.services import pass_delivery_allowed
    delivery_allowed = pass_delivery_allowed(guest.id, guest.event_id) if guest.event_id else True
    if (
        send_whatsapp and pass_ok and wa_configured and guest.event
        and guest.event.whatsapp_enabled and delivery_allowed
    ):
        guest.refresh_from_db(fields=['pass_image'])
        send_whatsapp_pass.delay(guest_id)

    return {'qr': qr_ok, 'pass': pass_ok}


@shared_task
def generate_guest_assets(guest_id: str, send_whatsapp: bool = True):
    """Generate QR + pass image for one guest."""
    return _generate_guest_assets(guest_id, send_whatsapp=send_whatsapp)


@shared_task(acks_late=True, reject_on_worker_lost=True)
def generate_guest_asset_batch(upload_id: int, guest_ids: list[str], send_whatsapp: bool):
    """Process a bounded asset batch and atomically advance import progress."""
    from .models import BulkUpload

    failed = 0
    for guest_id in guest_ids:
        try:
            result = _generate_guest_assets(guest_id, send_whatsapp=send_whatsapp)
            if not result or not result.get('qr') or not result.get('pass'):
                failed += 1
        except Exception:
            failed += 1
            logger.exception('Asset generation failed for imported guest %s', guest_id)

    BulkUpload.objects.filter(
        pk=upload_id,
        status=BulkUpload.UploadStatus.PROCESSING,
    ).update(
        assets_processed=F('assets_processed') + len(guest_ids),
        assets_failed=F('assets_failed') + failed,
    )
    BulkUpload.objects.filter(
        pk=upload_id,
        assets_processed__gte=F('assets_total'),
    ).update(
        status=BulkUpload.UploadStatus.DONE,
        completed_at=timezone.now(),
    )
    return {'processed': len(guest_ids), 'failed': failed}


def _queue_asset_batches(upload_id: int, guest_ids, send_whatsapp: bool):
    guest_ids = [str(guest_id) for guest_id in guest_ids]
    for start in range(0, len(guest_ids), ASSET_BATCH_SIZE):
        generate_guest_asset_batch.delay(
            upload_id,
            guest_ids[start:start + ASSET_BATCH_SIZE],
            send_whatsapp,
        )


@shared_task(bind=True)
def process_bulk_guest_upload(self, upload_id: int):
    """Validate and import a CSV outside the web request, safe for 5,000+ rows."""
    from rest_framework.exceptions import ValidationError as DrfValidationError
    from .models import BulkUpload, Guest
    from .serializers.bulk import parse_guest_csv
    from rsvp.services import bulk_sync_guests_to_workflow

    try:
        upload = BulkUpload.objects.select_related('event').get(pk=upload_id)
    except BulkUpload.DoesNotExist:
        return {'imported': 0, 'reason': 'upload not found'}

    claimed = BulkUpload.objects.filter(
        pk=upload_id,
        status=BulkUpload.UploadStatus.PENDING,
    ).update(
        status=BulkUpload.UploadStatus.PROCESSING,
        task_id=self.request.id or '',
        started_at=timezone.now(),
        error_message='',
    )
    if not claimed:
        upload.refresh_from_db()
        return {'imported': upload.successful_rows, 'reason': f'upload is {upload.status}'}
    try:
        valid_rows, error_report = parse_guest_csv(upload.event, upload.csv_file)
        total_rows = len(valid_rows) + len(error_report)
        if upload.replace_existing and (error_report or not valid_rows):
            message = (
                'The existing guest list was not changed. Fix every CSV error '
                'before replacing the list.'
                if error_report else
                'The existing guest list was not changed because the replacement CSV is empty.'
            )
            BulkUpload.objects.filter(pk=upload_id).update(
                status=BulkUpload.UploadStatus.FAILED,
                total_rows=total_rows,
                failed_rows=len(error_report),
                error_report=error_report,
                error_message=message,
                completed_at=timezone.now(),
            )
            return {'imported': 0, 'reason': message}

        guest_objects = [Guest(**row) for row in valid_rows]
        with transaction.atomic():
            created_guests = []
            replaced = 0
            if upload.replace_existing:
                existing = Guest.objects.filter(event=upload.event)
                replaced = existing.count()
                existing.delete()
            for start in range(0, len(guest_objects), 500):
                created_guests.extend(Guest.objects.bulk_create(
                    guest_objects[start:start + 500],
                    batch_size=500,
                ))
            guest_ids = [guest.id for guest in created_guests]
            recipients_created = bulk_sync_guests_to_workflow(
                upload.event_id,
                guest_ids,
            )
            asset_total = len(guest_ids)
            final_status = (
                BulkUpload.UploadStatus.PROCESSING
                if asset_total else BulkUpload.UploadStatus.DONE
            )
            BulkUpload.objects.filter(pk=upload_id).update(
                status=final_status,
                total_rows=total_rows,
                successful_rows=len(guest_ids),
                failed_rows=len(error_report),
                replaced_rows=replaced,
                recipients_created=recipients_created,
                assets_total=asset_total,
                error_report=error_report,
                completed_at=timezone.now() if not asset_total else None,
            )

        if asset_total:
            send_now = not (
                upload.event.pass_send_at
                and upload.event.pass_send_at > timezone.now()
            )
            try:
                _queue_asset_batches(upload_id, guest_ids, send_whatsapp=send_now)
            except Exception as exc:
                logger.exception('Could not queue asset batches for import %s', upload_id)
                BulkUpload.objects.filter(pk=upload_id).update(
                    status=BulkUpload.UploadStatus.FAILED,
                    error_message=(
                        'Guests were imported, but pass generation could not be queued. '
                        'Use “Regen passes” from the guest list.'
                    ),
                    error_report=[{'row': '?', 'error': str(exc)}],
                    completed_at=timezone.now(),
                )
                return {'imported': len(guest_ids), 'reason': str(exc)}
        return {
            'imported': len(guest_ids),
            'failed': len(error_report),
            'replaced': replaced,
            'recipients_created': recipients_created,
            'asset_batches': (asset_total + ASSET_BATCH_SIZE - 1) // ASSET_BATCH_SIZE,
        }
    except (DrfValidationError, DjangoValidationError) as exc:
        detail = getattr(exc, 'detail', None) or getattr(exc, 'message_dict', None) or str(exc)
        message = str(detail)
        BulkUpload.objects.filter(pk=upload_id).update(
            status=BulkUpload.UploadStatus.FAILED,
            error_message=message,
            completed_at=timezone.now(),
        )
        return {'imported': 0, 'reason': message}
    except Exception as exc:
        logger.exception('Bulk guest import %s failed', upload_id)
        BulkUpload.objects.filter(pk=upload_id).update(
            status=BulkUpload.UploadStatus.FAILED,
            error_message='The import failed before it could be completed.',
            error_report=[{'row': '?', 'error': str(exc)}],
            completed_at=timezone.now(),
        )
        return {'imported': 0, 'reason': str(exc)}


@shared_task(rate_limit=WHATSAPP_RATE_LIMIT)
def send_reminder(reminder_id: int, guest_id: str):
    """Send a single reminder WhatsApp message to one guest."""
    from .models import EventReminder, ReminderLog, Guest
    from .whatsapp import send_reminder as wa_send_reminder

    try:
        reminder = EventReminder.objects.select_related('event').get(pk=reminder_id)
        guest = Guest.objects.select_related('event').get(pk=guest_id)
    except (EventReminder.DoesNotExist, Guest.DoesNotExist):
        return {'sent': False, 'reason': 'not found'}

    # Avoid duplicate sends — only a successful prior send blocks a retry, so a
    # transient failure doesn't permanently suppress this reminder for the guest.
    if ReminderLog.objects.filter(reminder=reminder, guest=guest, success=True).exists():
        return {'sent': False, 'reason': 'already sent'}

    success = wa_send_reminder(guest, reminder.template_name)
    if success:
        ReminderLog.objects.create(reminder=reminder, guest=guest, success=True)
    return {'sent': success}


# If a claimed scheduled send still hasn't gone out after this long, treat the
# claim as stale (worker likely died mid-flight) and let it be re-claimed.
SCHEDULED_SEND_CLAIM_TIMEOUT = timedelta(hours=1)


@shared_task
def dispatch_scheduled_sends():
    """
    Periodic task — runs every 30 minutes.
    Finds guests whose scheduled_send_at has arrived (or passed) and whose
    pass hasn't been sent yet, then queues send_whatsapp_pass for each,
    staggered to respect the WhatsApp rate limit.

    Guests are atomically claimed (scheduled_send_claimed_at set) before being
    queued so a run that takes longer than the 30-minute Beat interval can't
    have the next run queue the same guest again. A claim older than
    SCHEDULED_SEND_CLAIM_TIMEOUT is considered stale and eligible for re-claim.
    """
    from .models import Guest

    now = timezone.now()
    stale_before = now - SCHEDULED_SEND_CLAIM_TIMEOUT

    eligible_ids = list(
        Guest.objects.filter(
            scheduled_send_at__isnull=False,
            scheduled_send_at__lte=now,
            whatsapp_sent=False,
        )
        .filter(
            Q(scheduled_send_claimed_at__isnull=True) |
            Q(scheduled_send_claimed_at__lt=stale_before)
        )
        .exclude(pass_image='')
        .filter(pass_image__isnull=False)
        .exclude(phone_number='')
        .filter(
            event__whatsapp_enabled=True,
            event__rsvp_enabled=False,
            event__date__gte=now,
        )
        .values_list('id', flat=True)
    )

    if not eligible_ids:
        return {'queued': 0}

    # Atomically claim only the rows still matching (guards against a
    # concurrent Beat run claiming the same guests between select and update).
    Guest.objects.filter(
        id__in=eligible_ids,
        whatsapp_sent=False,
    ).filter(
        Q(scheduled_send_claimed_at__isnull=True) |
        Q(scheduled_send_claimed_at__lt=stale_before)
    ).update(scheduled_send_claimed_at=now)

    guest_ids = list(
        Guest.objects.filter(id__in=eligible_ids, scheduled_send_claimed_at=now)
        .values_list('id', flat=True)
    )

    for guest_id in guest_ids:
        send_whatsapp_pass.delay(str(guest_id))

    logger.info("dispatch_scheduled_sends: queued %s scheduled sends", len(guest_ids))
    return {'queued': len(guest_ids)}


@shared_task
def dispatch_due_reminders():
    """
    Periodic task — runs every 30 minutes.
    Finds all active reminder rules whose fire window is now,
    then queues individual send_reminder tasks for each eligible guest.
    Fire window: event_date - hours_before is within the next 30 minutes.
    """
    from .models import EventReminder, ReminderLog

    now = timezone.now()

    # Find reminders whose scheduled fire time has arrived (or passed). Using
    # "now >= fire_at" rather than a forward-looking window means a delayed or
    # missed Beat tick still catches up on the next run instead of permanently
    # skipping the reminder — dedup against ReminderLog prevents re-sends.
    due_reminders = (
        EventReminder.objects
        .filter(is_active=True, event__date__isnull=False)
        .select_related('event')
    )

    queued = 0
    for reminder in due_reminders:
        fire_at = reminder.event.date - timedelta(hours=reminder.hours_before)
        if now < fire_at:
            continue

        # Get guests for this event who have a phone number and haven't successfully
        # received this reminder yet (a prior failed attempt is retried, not skipped)
        already_sent = ReminderLog.objects.filter(
            reminder=reminder, success=True,
        ).values_list('guest_id', flat=True)

        guests = (
            reminder.event.guests
            .exclude(pk__in=already_sent)
            .exclude(phone_number='')
            .values_list('id', flat=True)
        )

        for guest_id in guests:
            send_reminder.delay(reminder.id, str(guest_id))
            queued += 1

    logger.info("dispatch_due_reminders: queued %s reminder sends", queued)
    return {'queued': queued}
