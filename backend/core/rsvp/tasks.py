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
            .select_related('workflow__invitation_template', 'workflow__event', 'guest__event')
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
            .select_related('workflow__pass_template', 'workflow__event', 'guest__event')
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
