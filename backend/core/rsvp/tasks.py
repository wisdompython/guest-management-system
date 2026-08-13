import logging

from celery import shared_task
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from guests.send_budget import DISPATCHED_STALE_AFTER, remaining_send_budget

logger = logging.getLogger(__name__)

RSVP_MESSAGES_PER_MINUTE = 20
RSVP_RATE_LIMIT = f'{RSVP_MESSAGES_PER_MINUTE}/m'


def _is_transient_whatsapp_error(exc):
    try:
        from pywa.errors import WhatsAppError
    except ImportError:
        return False
    return isinstance(exc, WhatsAppError) and exc.is_transient


def _stored_file_exists(file_field) -> bool:
    if not file_field or not file_field.name:
        return False
    try:
        return file_field.storage.exists(file_field.name)
    except OSError:
        return False


def _ensure_guest_pass(recipient):
    """Generate a missing/stale QR and guest pass before RSVP delivery."""
    guest = recipient.guest
    event = guest.event
    if _stored_file_exists(guest.pass_image):
        return
    if not event or not event.design_template:
        raise ValueError(
            'No guest-pass design is configured for this event. '
            'Upload a pass design, then retry the pass.'
        )

    from guests.utils import generate_pass_image, generate_qr_code

    if not _stored_file_exists(guest.qr_code):
        if not generate_qr_code(guest):
            raise ValueError('The guest QR code could not be generated. Retry after checking the pass design.')
        guest.refresh_from_db(fields=['qr_code'])
    if not generate_pass_image(guest):
        raise ValueError('The personalised guest pass could not be generated. Check the pass-design zones.')
    guest.refresh_from_db(fields=['pass_image'])
    if not _stored_file_exists(guest.pass_image):
        raise ValueError('The generated guest pass image could not be stored. Check media storage.')


def _claim_and_dispatch(candidates, limit, now, *, updates, stamp_field, send_task):
    """Atomically claim up to `limit` rows from `candidates` and enqueue sends.

    The UPDATE re-applies the candidate filters, so a row whose state changed
    in between is skipped. `updates` must set `stamp_field` to `now`; the
    stamp identifies the rows this call actually claimed. Double-delivery is
    additionally guarded by the send tasks' own QUEUED→SENDING claim.
    """
    from .models import RsvpRecipient

    if limit <= 0:
        return 0
    ids = list(candidates.values_list('id', flat=True)[:limit])
    if not ids:
        return 0
    candidates.filter(pk__in=ids).update(**updates)
    claimed_ids = list(
        RsvpRecipient.objects.filter(
            pk__in=ids, **{stamp_field: now},
        ).values_list('id', flat=True)
    )
    for recipient_id in claimed_ids:
        send_task.delay(recipient_id)
    return len(claimed_ids)


@shared_task
def queue_workflow_invitations(workflow_id: int):
    """Dispatch this workflow's approved invitations within the send budget.

    Views and the import sync mark recipients QUEUED without an
    invitation_queued_at stamp ("approved, awaiting dispatch"). Up to the
    remaining daily budget is dispatched and stamped here; the overflow keeps
    its unstamped QUEUED state and is drained by
    dispatch_scheduled_rsvp_messages as the trailing 24h window frees up.
    """
    from .models import RsvpRecipient, RsvpWorkflow

    try:
        workflow = RsvpWorkflow.objects.get(pk=workflow_id)
    except RsvpWorkflow.DoesNotExist:
        return {'queued': 0, 'reason': 'workflow not found'}

    if workflow.status != RsvpWorkflow.Status.ACTIVE:
        return {'queued': 0, 'reason': 'workflow is not active'}

    now = timezone.now()
    candidates = RsvpRecipient.objects.filter(
        workflow=workflow,
        invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
        response_status=RsvpRecipient.ResponseStatus.AWAITING,
        invitation_queued_at__isnull=True,
    )
    total = candidates.count()
    queued = _claim_and_dispatch(
        candidates,
        min(remaining_send_budget(now), total),
        now,
        updates={'invitation_queued_at': now},
        stamp_field='invitation_queued_at',
        send_task=send_rsvp_invitation,
    )
    deferred = total - queued
    if deferred:
        logger.info(
            'RSVP workflow %s: %s invitations deferred until the daily send '
            'window frees up.', workflow_id, deferred,
        )
    return {
        'queued': queued,
        'deferred': deferred,
        'estimated_minutes': round(queued / RSVP_MESSAGES_PER_MINUTE, 1),
    }


@shared_task(bind=True, max_retries=3, default_retry_delay=60, rate_limit=RSVP_RATE_LIMIT)
def send_rsvp_invitation(self, recipient_id: int):
    from .models import RsvpRecipient, RsvpWorkflow
    from .whatsapp import send_invitation

    try:
        recipient = (
            RsvpRecipient.objects
            .select_related(
                'workflow__invitation_template',
                'workflow__event__name_font',
                'guest__event',
            )
            .get(pk=recipient_id)
        )
    except RsvpRecipient.DoesNotExist:
        return {'sent': False, 'reason': 'recipient not found'}

    if recipient.workflow.status != RsvpWorkflow.Status.ACTIVE:
        return {'sent': False, 'reason': 'workflow is not active'}
    if recipient.response_status != RsvpRecipient.ResponseStatus.AWAITING:
        return {'sent': False, 'reason': 'recipient already responded'}
    if recipient.invitation_status != RsvpRecipient.InvitationStatus.QUEUED:
        return {'sent': False, 'reason': 'invitation already sent'}

    claimed = RsvpRecipient.objects.filter(
        pk=recipient_id,
        invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
    ).update(invitation_status=RsvpRecipient.InvitationStatus.SENDING)
    if not claimed:
        return {'sent': False, 'reason': 'invitation already claimed'}

    try:
        sent_update = send_invitation(recipient)
    except Exception as exc:
        if _is_transient_whatsapp_error(exc):
            RsvpRecipient.objects.filter(pk=recipient_id).update(
                invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
            )
            raise self.retry(exc=exc)
        RsvpRecipient.objects.filter(pk=recipient_id).update(
            invitation_status=RsvpRecipient.InvitationStatus.FAILED,
            last_error=str(exc),
        )
        logger.error('RSVP invitation failed for recipient %s: %s', recipient_id, exc)
        return {'sent': False, 'reason': str(exc)}

    updates = {
        'invitation_status': RsvpRecipient.InvitationStatus.SENT,
        'invitation_message_id': sent_update.id,
        'invitation_sent_at': timezone.now(),
        'last_error': '',
    }
    if recipient.invitation_sent_at:
        updates.update({
            'reminder_count': F('reminder_count') + 1,
            'last_reminded_at': timezone.now(),
        })
    RsvpRecipient.objects.filter(pk=recipient_id).update(**updates)
    return {'sent': True, 'message_id': sent_update.id}


@shared_task(bind=True, max_retries=3, default_retry_delay=60, rate_limit=RSVP_RATE_LIMIT)
def send_confirmed_pass(self, recipient_id: int):
    from guests.models import Guest

    from .models import RsvpRecipient
    from .whatsapp import send_configured_pass

    try:
        recipient = (
            RsvpRecipient.objects
            .select_related(
                'workflow__pass_template',
                'workflow__event',
                'guest__event__whatsapp_template',
                'guest__event__name_font',
            )
            .get(pk=recipient_id)
        )
    except RsvpRecipient.DoesNotExist:
        return {'sent': False, 'reason': 'recipient not found'}

    if recipient.response_status != RsvpRecipient.ResponseStatus.CONFIRMED:
        return {'sent': False, 'reason': 'recipient is not confirmed'}
    if recipient.pass_status != RsvpRecipient.PassStatus.QUEUED:
        return {'sent': False, 'reason': 'pass is not queued'}

    claimed = RsvpRecipient.objects.filter(
        pk=recipient_id,
        pass_status=RsvpRecipient.PassStatus.QUEUED,
    ).update(pass_status=RsvpRecipient.PassStatus.SENDING)
    if not claimed:
        return {'sent': False, 'reason': 'pass already claimed'}

    try:
        _ensure_guest_pass(recipient)
        sent_update = send_configured_pass(recipient)
    except Exception as exc:
        if _is_transient_whatsapp_error(exc):
            RsvpRecipient.objects.filter(pk=recipient_id).update(
                pass_status=RsvpRecipient.PassStatus.QUEUED,
            )
            raise self.retry(exc=exc)
        RsvpRecipient.objects.filter(pk=recipient_id).update(
            pass_status=RsvpRecipient.PassStatus.FAILED,
            last_error=str(exc),
        )
        logger.error('RSVP pass failed for recipient %s: %s', recipient_id, exc)
        return {'sent': False, 'reason': str(exc)}

    now = timezone.now()
    with transaction.atomic():
        RsvpRecipient.objects.filter(pk=recipient_id).update(
            pass_status=RsvpRecipient.PassStatus.SENT,
            pass_message_id=sent_update.id,
            last_error='',
        )
        Guest.objects.filter(pk=recipient.guest_id).update(
            whatsapp_sent=True,
            whatsapp_sent_at=now,
        )
    return {'sent': True, 'message_id': sent_update.id}


@shared_task
def dispatch_scheduled_rsvp_messages():
    """Queue due RSVP invitations and passes exactly once, within budget.

    Spends the remaining daily send budget in priority order:
      1. dispatched sends gone stale (lost worker / exhausted retries)
      2. scheduled passes now due (confirmed guests come first)
      3. approved invitations deferred by an earlier budget check
      4. scheduled invitations now due
    Whatever doesn't fit is picked up on a later tick as the trailing 24h
    window frees up.
    """
    from .models import RsvpRecipient, RsvpWorkflow

    now = timezone.now()
    stale_before = now - DISPATCHED_STALE_AFTER
    budget = remaining_send_budget(now)

    live = {
        'workflow__status': RsvpWorkflow.Status.ACTIVE,
        'workflow__event__date__gt': now,
    }

    stale_passes = RsvpRecipient.objects.filter(
        response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
        pass_status=RsvpRecipient.PassStatus.QUEUED,
        pass_queued_at__lt=stale_before,
        **live,
    )
    requeued_passes = _claim_and_dispatch(
        stale_passes, budget, now,
        updates={'pass_queued_at': now},
        stamp_field='pass_queued_at',
        send_task=send_confirmed_pass,
    )
    budget -= requeued_passes

    stale_invitations = RsvpRecipient.objects.filter(
        response_status=RsvpRecipient.ResponseStatus.AWAITING,
        invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
        invitation_queued_at__lt=stale_before,
        **live,
    )
    requeued_invitations = _claim_and_dispatch(
        stale_invitations, budget, now,
        updates={'invitation_queued_at': now},
        stamp_field='invitation_queued_at',
        send_task=send_rsvp_invitation,
    )
    budget -= requeued_invitations

    due_passes = RsvpRecipient.objects.filter(
        response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
        pass_status=RsvpRecipient.PassStatus.HELD,
        workflow__auto_send_pass=True,
        workflow__pass_send_at__isnull=False,
        workflow__pass_send_at__lte=now,
        **live,
    )
    passes_queued = _claim_and_dispatch(
        due_passes, budget, now,
        updates={
            'pass_status': RsvpRecipient.PassStatus.QUEUED,
            'pass_queued_at': now,
        },
        stamp_field='pass_queued_at',
        send_task=send_confirmed_pass,
    )
    budget -= passes_queued

    deferred_invitations = RsvpRecipient.objects.filter(
        response_status=RsvpRecipient.ResponseStatus.AWAITING,
        invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
        invitation_queued_at__isnull=True,
        **live,
    )
    deferred_dispatched = _claim_and_dispatch(
        deferred_invitations, budget, now,
        updates={'invitation_queued_at': now},
        stamp_field='invitation_queued_at',
        send_task=send_rsvp_invitation,
    )
    budget -= deferred_dispatched

    due_invitations = RsvpRecipient.objects.filter(
        response_status=RsvpRecipient.ResponseStatus.AWAITING,
        invitation_status=RsvpRecipient.InvitationStatus.NOT_SENT,
        workflow__invitation_send_at__isnull=False,
        workflow__invitation_send_at__lte=now,
        **live,
    )
    invitations_queued = _claim_and_dispatch(
        due_invitations, budget, now,
        updates={
            'invitation_status': RsvpRecipient.InvitationStatus.QUEUED,
            'invitation_queued_at': now,
        },
        stamp_field='invitation_queued_at',
        send_task=send_rsvp_invitation,
    )
    budget -= invitations_queued

    return {
        'invitations_queued': invitations_queued + deferred_dispatched,
        'passes_queued': passes_queued,
        'requeued_stale': requeued_passes + requeued_invitations,
        'budget_left': budget,
    }
