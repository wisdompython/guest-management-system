import logging

from celery import shared_task
from django.db import transaction
from django.db.models import F
from django.utils import timezone

logger = logging.getLogger(__name__)

RSVP_RATE_LIMIT = '20/m'
RSVP_BATCH_COUNTDOWN = 3


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


@shared_task
def queue_workflow_invitations(workflow_id: int):
    from .models import RsvpRecipient, RsvpWorkflow

    try:
        workflow = RsvpWorkflow.objects.get(pk=workflow_id)
    except RsvpWorkflow.DoesNotExist:
        return {'queued': 0, 'reason': 'workflow not found'}

    if workflow.status != RsvpWorkflow.Status.ACTIVE:
        return {'queued': 0, 'reason': 'workflow is not active'}

    recipient_ids = list(
        workflow.recipients.filter(
            invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
            response_status=RsvpRecipient.ResponseStatus.AWAITING,
        ).values_list('id', flat=True)
    )
    for index, recipient_id in enumerate(recipient_ids):
        send_rsvp_invitation.apply_async(
            args=[recipient_id],
            countdown=index * RSVP_BATCH_COUNTDOWN,
        )
    return {
        'queued': len(recipient_ids),
        'estimated_minutes': round(len(recipient_ids) * RSVP_BATCH_COUNTDOWN / 60, 1),
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
    """Queue due RSVP invitations and confirmed passes exactly once."""
    from .models import RsvpRecipient, RsvpWorkflow

    now = timezone.now()
    workflows = RsvpWorkflow.objects.filter(
        status=RsvpWorkflow.Status.ACTIVE,
        event__date__gt=now,
    )

    invitation_workflow_ids = list(
        workflows.filter(
            invitation_send_at__isnull=False,
            invitation_send_at__lte=now,
        ).values_list('id', flat=True)
    )
    invitation_ids = list(
        RsvpRecipient.objects.filter(
            workflow_id__in=invitation_workflow_ids,
            response_status=RsvpRecipient.ResponseStatus.AWAITING,
            invitation_status=RsvpRecipient.InvitationStatus.NOT_SENT,
        ).values_list('id', flat=True)
    )
    claimed_invitation_ids = []
    for recipient_id in invitation_ids:
        claimed = RsvpRecipient.objects.filter(
            id=recipient_id,
            invitation_status=RsvpRecipient.InvitationStatus.NOT_SENT,
        ).update(invitation_status=RsvpRecipient.InvitationStatus.QUEUED)
        if claimed:
            claimed_invitation_ids.append(recipient_id)
    if claimed_invitation_ids:
        for index, recipient_id in enumerate(claimed_invitation_ids):
            send_rsvp_invitation.apply_async(
                args=[recipient_id],
                countdown=index * RSVP_BATCH_COUNTDOWN,
            )

    pass_workflow_ids = list(
        workflows.filter(
            auto_send_pass=True,
            pass_send_at__isnull=False,
            pass_send_at__lte=now,
        ).values_list('id', flat=True)
    )
    pass_ids = list(
        RsvpRecipient.objects.filter(
            workflow_id__in=pass_workflow_ids,
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
            pass_status=RsvpRecipient.PassStatus.HELD,
        ).values_list('id', flat=True)
    )
    claimed_pass_ids = []
    for recipient_id in pass_ids:
        claimed = RsvpRecipient.objects.filter(
            id=recipient_id,
            pass_status=RsvpRecipient.PassStatus.HELD,
        ).update(
            pass_status=RsvpRecipient.PassStatus.QUEUED,
            pass_queued_at=now,
        )
        if claimed:
            claimed_pass_ids.append(recipient_id)
    if claimed_pass_ids:
        for index, recipient_id in enumerate(claimed_pass_ids):
            send_confirmed_pass.apply_async(
                args=[recipient_id],
                countdown=index * RSVP_BATCH_COUNTDOWN,
            )

    return {
        'invitations_queued': len(claimed_invitation_ids),
        'passes_queued': len(claimed_pass_ids),
    }
