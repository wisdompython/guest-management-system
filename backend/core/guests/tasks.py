import logging
from celery import shared_task
from django.db import transaction
from django.db.models import F
from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from datetime import timedelta

from .send_budget import (
    REMINDER_CLAIM_TIMEOUT,
    SCHEDULED_SEND_CLAIM_TIMEOUT,
    remaining_send_budget,
)

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


# How long a budget-deferred bulk send waits before checking the window again.
BULK_SEND_BUDGET_RETRY_SECONDS = 30 * 60


@shared_task
def bulk_send_whatsapp_passes(event_id: int, resend: bool = False, guest_ids: list[str] | None = None):
    """
    Dispatch individual pass tasks for each eligible guest, within the daily
    send budget. The worker-level task rate limit controls throughput; when
    the budget runs out, the task re-schedules itself with the remaining
    guests and continues once the trailing 24h window frees up.
    """
    from django.conf import settings as django_settings

    from .models import Guest

    if guest_ids is None:
        qs = Guest.objects.filter(
            event_id=event_id,
            pass_image__isnull=False,
        ).exclude(pass_image='').values_list('id', flat=True)

        if not resend:
            qs = qs.filter(whatsapp_sent=False)
        guest_ids = [str(guest_id) for guest_id in qs]

    now = timezone.now()
    budget = remaining_send_budget(now)
    to_send = guest_ids[:budget] if budget > 0 else []
    deferred = guest_ids[len(to_send):]

    if to_send:
        # Claim so the budget accounting counts these as in flight until sent.
        Guest.objects.filter(id__in=to_send).update(scheduled_send_claimed_at=now)
        for guest_id in to_send:
            send_whatsapp_pass.delay(guest_id)

    if deferred:
        if getattr(django_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            # Eager mode runs countdown tasks inline, which would recurse
            # while the budget is still exhausted.
            logger.warning(
                'Bulk WhatsApp for event %s: %s sends dropped in eager mode '
                '(daily send budget exhausted)', event_id, len(deferred),
            )
        else:
            bulk_send_whatsapp_passes.apply_async(
                args=[event_id],
                kwargs={'resend': resend, 'guest_ids': deferred},
                countdown=BULK_SEND_BUDGET_RETRY_SECONDS,
            )
            logger.info(
                'Bulk WhatsApp for event %s: %s sends deferred until the '
                'daily send window frees up', event_id, len(deferred),
            )

    logger.info(
        "Bulk WhatsApp queued %s messages for event %s (~%s mins)",
        len(to_send), event_id, round(len(to_send) / WHATSAPP_MESSAGES_PER_MINUTE, 1),
    )
    return {
        'queued': len(to_send),
        'deferred': len(deferred),
        'estimated_minutes': round(len(to_send) / WHATSAPP_MESSAGES_PER_MINUTE, 1),
    }


def _generate_guest_assets(guest_id: str, send_whatsapp: bool = True):
    """Generate one guest's assets; shared by single and batched tasks.

    Returns whether the pass may be sent right away ('send_ready'); the
    caller dispatches through _dispatch_pass_sends so the daily send budget
    is applied once per batch instead of once per guest.
    """
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
    send_ready = bool(
        send_whatsapp and pass_ok and wa_configured and guest.event
        and guest.event.whatsapp_enabled and delivery_allowed
    )
    return {'qr': qr_ok, 'pass': pass_ok, 'send_ready': send_ready}


def _dispatch_pass_sends(guest_ids) -> int:
    """Send freshly generated passes within the daily budget.

    Guests over the budget get scheduled_send_at=now so the Beat scheduler
    delivers them once the trailing 24h window frees up.
    """
    from .models import Guest

    guest_ids = [str(guest_id) for guest_id in guest_ids]
    if not guest_ids:
        return 0
    now = timezone.now()
    budget = remaining_send_budget(now)
    to_send = guest_ids[:budget] if budget > 0 else []
    deferred = guest_ids[len(to_send):]
    if to_send:
        # Claim so the budget accounting counts these as in flight until sent.
        Guest.objects.filter(id__in=to_send).update(scheduled_send_claimed_at=now)
        for guest_id in to_send:
            send_whatsapp_pass.delay(guest_id)
    if deferred:
        Guest.objects.filter(id__in=deferred).update(
            scheduled_send_at=now,
            scheduled_send_claimed_at=None,
        )
        logger.info(
            'Deferred %s pass sends until the daily send window frees up',
            len(deferred),
        )
    return len(to_send)


@shared_task
def generate_guest_assets(guest_id: str, send_whatsapp: bool = True):
    """Generate QR + pass image for one guest."""
    result = _generate_guest_assets(guest_id, send_whatsapp=send_whatsapp)
    if result and result.get('send_ready') is True:
        _dispatch_pass_sends([guest_id])
    return result


@shared_task(acks_late=True, reject_on_worker_lost=True)
def generate_guest_asset_batch(upload_id: int, guest_ids: list[str], send_whatsapp: bool):
    """Process a bounded asset batch and atomically advance import progress."""
    from .models import BulkUpload

    failed = 0
    send_ready_ids = []
    for guest_id in guest_ids:
        try:
            result = _generate_guest_assets(guest_id, send_whatsapp=send_whatsapp)
            if not result or not result.get('qr') or not result.get('pass'):
                failed += 1
            if result and result.get('send_ready') is True:
                send_ready_ids.append(guest_id)
        except Exception:
            failed += 1
            logger.exception('Asset generation failed for imported guest %s', guest_id)
    if send_ready_ids:
        _dispatch_pass_sends(send_ready_ids)

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
    from .models import BulkUpload, Event, Guest
    from .serializers.bulk import parse_guest_csv
    from .whatsapp import _normalise_phone
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

        with transaction.atomic():
            # Serialise imports for the same event. This keeps two concurrent
            # "add" uploads from both passing the duplicate check.
            locked_event = Event.objects.select_for_update().get(pk=upload.event_id)
            rows_to_create = []
            skipped_report = []

            existing_phone_keys = set()
            if not upload.replace_existing:
                existing_phone_keys = {
                    _normalise_phone(phone)
                    for phone in Guest.objects.filter(event=locked_event)
                    .exclude(phone_number='')
                    .values_list('phone_number', flat=True)
                }
            seen_phone_keys = set(existing_phone_keys)
            for row in valid_rows:
                phone = row.get('phone_number', '')
                plus_one_phone = row.get('_plus_one_phone_number', '')
                phone_keys = [
                    _normalise_phone(value)
                    for value in (phone, plus_one_phone)
                    if value
                ]
                duplicate_key = next(
                    (key for key in phone_keys if key in seen_phone_keys),
                    None,
                )
                if len(phone_keys) != len(set(phone_keys)):
                    duplicate_key = phone_keys[0]
                if duplicate_key:
                    duplicate_phone = (
                        plus_one_phone
                        if _normalise_phone(plus_one_phone) == duplicate_key
                        else phone
                    )
                    skipped_report.append({
                        'row': row['_csv_row'],
                        'full_name': row.get('full_name', ''),
                        'phone_number': duplicate_phone,
                        'reason': (
                            'A guest with this phone number is already in the event.'
                            if duplicate_key in existing_phone_keys else
                            'This phone number appeared earlier in the same CSV row or file.'
                        ),
                    })
                    continue
                seen_phone_keys.update(phone_keys)
                rows_to_create.append({
                    key: value for key, value in row.items() if key != '_csv_row'
                })

            plus_one_specs = [
                (row.pop('_plus_one_full_name', ''), row.pop('_plus_one_phone_number', ''))
                for row in rows_to_create
            ]
            guest_objects = [Guest(**row) for row in rows_to_create]
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
            named_plus_ones = []
            for primary, (plus_one_name, plus_one_phone) in zip(
                created_guests, plus_one_specs,
            ):
                if not plus_one_name:
                    continue
                named_plus_ones.append(Guest(
                    event=primary.event,
                    plus_one_of=primary,
                    full_name=plus_one_name,
                    phone_number=_normalise_phone(plus_one_phone),
                    ticket_type=primary.ticket_type,
                    table_number=primary.table_number,
                    celebrant_name=primary.celebrant_name,
                    scheduled_send_at=primary.scheduled_send_at,
                ))
            for start in range(0, len(named_plus_ones), 500):
                Guest.objects.bulk_create(
                    named_plus_ones[start:start + 500],
                    batch_size=500,
                )
            all_created_guests = created_guests + named_plus_ones
            guest_ids = [guest.id for guest in all_created_guests]
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
                successful_rows=len(created_guests),
                failed_rows=len(error_report),
                skipped_rows=len(skipped_report),
                replaced_rows=replaced,
                recipients_created=recipients_created,
                assets_total=asset_total,
                error_report=error_report,
                skipped_report=skipped_report,
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
            'imported': len(created_guests),
            'failed': len(error_report),
            'skipped': len(skipped_report),
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

    # Re-check eligibility at delivery time as RSVP responses can change after
    # the dispatcher claims a reminder but before this worker runs.
    from rsvp.services import confirmed_reminder_guest_ids
    confirmed_guest_ids = confirmed_reminder_guest_ids(reminder.event_id)
    is_same_event = guest.event_id == reminder.event_id
    is_confirmed = (
        confirmed_guest_ids is None or
        confirmed_guest_ids.filter(guest_id=guest.id).exists()
    )
    if not is_same_event or not is_confirmed:
        # Release an unsent dispatcher claim. If the guest confirms later,
        # the reminder can then be picked up by a future due-reminder run.
        ReminderLog.objects.filter(
            reminder=reminder,
            guest=guest,
            success=False,
        ).delete()
        return {'sent': False, 'reason': 'not eligible for reminder'}

    # Avoid duplicate sends — only a successful prior send blocks a retry, so a
    # transient failure doesn't permanently suppress this reminder for the guest.
    if ReminderLog.objects.filter(reminder=reminder, guest=guest, success=True).exists():
        return {'sent': False, 'reason': 'already sent'}

    success = wa_send_reminder(guest, reminder.template_name)
    if success:
        # The dispatcher usually pre-created the log row as its claim; flip it
        # to success (or create one for direct/manual invocations).
        updated = ReminderLog.objects.filter(
            reminder=reminder, guest=guest,
        ).update(success=True, sent_at=timezone.now())
        if not updated:
            ReminderLog.objects.create(reminder=reminder, guest=guest, success=True)
    return {'sent': success}


@shared_task
def dispatch_scheduled_sends():
    """
    Periodic task — runs every 30 minutes.
    Finds guests whose scheduled_send_at has arrived (or passed) and whose
    pass hasn't been sent yet, then queues send_whatsapp_pass for each,
    staggered to respect the WhatsApp rate limit and capped by the daily
    send budget (the overflow stays eligible for the next run).

    Guests are atomically claimed (scheduled_send_claimed_at set) before being
    queued so a run that takes longer than the 30-minute Beat interval can't
    have the next run queue the same guest again. A claim older than
    SCHEDULED_SEND_CLAIM_TIMEOUT is considered stale and eligible for re-claim.
    """
    from .models import Guest

    now = timezone.now()
    stale_before = now - SCHEDULED_SEND_CLAIM_TIMEOUT
    budget = remaining_send_budget(now)
    if budget <= 0:
        logger.info('dispatch_scheduled_sends: daily send budget exhausted')
        return {'queued': 0}

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
        .values_list('id', flat=True)[:budget]
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
    from rsvp.services import confirmed_reminder_guest_ids

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

    budget = remaining_send_budget(now)
    claim_cutoff = now - REMINDER_CLAIM_TIMEOUT

    queued = 0
    for reminder in due_reminders:
        if budget <= 0:
            logger.info(
                'dispatch_due_reminders: daily send budget exhausted; '
                'remaining reminders resume on a later run',
            )
            break
        fire_at = reminder.event.date - timedelta(hours=reminder.hours_before)
        if now < fire_at:
            continue

        # Skip guests already sent successfully, and guests claimed by a
        # recent run whose task is still draining through the rate limiter
        # (a prior failed attempt is retried once its claim goes stale).
        blocked = ReminderLog.objects.filter(
            reminder=reminder,
        ).filter(
            Q(success=True) | Q(queued_at__gte=claim_cutoff),
        ).values_list('guest_id', flat=True)

        eligible_guests = (
            reminder.event.guests
            .exclude(pk__in=blocked)
            .exclude(phone_number='')
        )
        confirmed_guest_ids = confirmed_reminder_guest_ids(reminder.event_id)
        if confirmed_guest_ids is not None:
            eligible_guests = eligible_guests.filter(pk__in=confirmed_guest_ids)

        guest_ids = list(
            eligible_guests.values_list('id', flat=True)[:budget]
        )
        if not guest_ids:
            continue

        # Claim: one log row per (reminder, guest). New rows are created with
        # the claim stamp; stale failed rows are atomically re-claimed.
        ReminderLog.objects.bulk_create(
            [
                ReminderLog(reminder=reminder, guest_id=guest_id, queued_at=now)
                for guest_id in guest_ids
            ],
            batch_size=500,
            ignore_conflicts=True,
        )
        ReminderLog.objects.filter(
            reminder=reminder,
            guest_id__in=guest_ids,
            success=False,
        ).filter(
            Q(queued_at__isnull=True) | Q(queued_at__lt=claim_cutoff),
        ).update(queued_at=now)

        claimed_ids = list(
            ReminderLog.objects.filter(
                reminder=reminder,
                guest_id__in=guest_ids,
                success=False,
                queued_at=now,
            ).values_list('guest_id', flat=True)
        )
        for guest_id in claimed_ids:
            send_reminder.delay(reminder.id, str(guest_id))
        queued += len(claimed_ids)
        budget -= len(claimed_ids)

    logger.info("dispatch_due_reminders: queued %s reminder sends", queued)
    return {'queued': queued}
