import re
import uuid

from django.db import transaction
from django.utils import timezone

from guests.whatsapp import _normalise_phone

from .models import (
    RsvpRecipient,
    RsvpResponse,
    RsvpWorkflow,
    assign_unique_public_codes,
)


CALLBACK_PATTERN = re.compile(
    r'^rsvp:(?P<token>[0-9a-fA-F-]{36}):(?P<answer>yes|no)$'
)


def sync_guest_to_workflow(guest):
    """Attach a newly-added eligible guest to this event's open RSVP workflow."""
    if not guest.phone_number:
        return None
    workflow = RsvpWorkflow.objects.filter(
        event_id=guest.event_id,
        status__in=[
            RsvpWorkflow.Status.DRAFT,
            RsvpWorkflow.Status.ACTIVE,
            RsvpWorkflow.Status.PAUSED,
        ],
    ).first()
    if not workflow:
        return None

    now = timezone.now()
    invitation_due = not workflow.invitation_send_at or workflow.invitation_send_at <= now
    initial_status = (
        RsvpRecipient.InvitationStatus.QUEUED
        if workflow.status == RsvpWorkflow.Status.ACTIVE and invitation_due
        else RsvpRecipient.InvitationStatus.NOT_SENT
    )
    code_candidate = assign_unique_public_codes([
        RsvpRecipient(workflow=workflow, guest=guest)
    ])[0]
    recipient, created = RsvpRecipient.objects.get_or_create(
        workflow=workflow,
        guest=guest,
        defaults={
            'public_code': code_candidate.public_code,
            'invitation_status': initial_status,
            # Dispatched directly below, so stamp it as in flight for the
            # send-budget accounting.
            'invitation_queued_at': (
                now if initial_status == RsvpRecipient.InvitationStatus.QUEUED else None
            ),
        },
    )
    if created and initial_status == RsvpRecipient.InvitationStatus.QUEUED:
        from .tasks import send_rsvp_invitation
        transaction.on_commit(lambda: send_rsvp_invitation.delay(recipient.id))
    return recipient


def bulk_sync_guests_to_workflow(event_id, guest_ids) -> int:
    """Attach a large imported guest set using bounded queries and one insert."""
    guest_ids = list(guest_ids)
    if not guest_ids:
        return 0
    workflow = RsvpWorkflow.objects.filter(
        event_id=event_id,
        status__in=[
            RsvpWorkflow.Status.DRAFT,
            RsvpWorkflow.Status.ACTIVE,
            RsvpWorkflow.Status.PAUSED,
        ],
    ).first()
    if not workflow:
        return 0

    from guests.models import Guest

    eligible_ids = list(
        Guest.objects
        .filter(id__in=guest_ids)
        .exclude(phone_number='')
        .values_list('id', flat=True)
    )
    existing_ids = set(
        RsvpRecipient.objects
        .filter(workflow=workflow, guest_id__in=eligible_ids)
        .values_list('guest_id', flat=True)
    )
    new_ids = [guest_id for guest_id in eligible_ids if guest_id not in existing_ids]
    if not new_ids:
        return 0

    invitation_due = (
        not workflow.invitation_send_at
        or workflow.invitation_send_at <= timezone.now()
    )
    initial_status = (
        RsvpRecipient.InvitationStatus.QUEUED
        if workflow.status == RsvpWorkflow.Status.ACTIVE and invitation_due
        else RsvpRecipient.InvitationStatus.NOT_SENT
    )
    new_recipients = assign_unique_public_codes(
        [
            RsvpRecipient(
                workflow=workflow,
                guest_id=guest_id,
                invitation_status=initial_status,
            )
            for guest_id in new_ids
        ]
    )
    RsvpRecipient.objects.bulk_create(
        new_recipients,
        batch_size=500,
        ignore_conflicts=True,
    )
    created = RsvpRecipient.objects.filter(
        workflow=workflow,
        guest_id__in=new_ids,
    ).count()
    if created and initial_status == RsvpRecipient.InvitationStatus.QUEUED:
        from .tasks import queue_workflow_invitations
        transaction.on_commit(lambda: queue_workflow_invitations.delay(workflow.id))
    return created


def pass_delivery_allowed(guest_id, event_id) -> bool:
    """Allow direct delivery only when RSVP is off or this guest confirmed."""
    from guests.models import Event

    rsvp_enabled = (
        Event.objects
        .filter(pk=event_id)
        .values_list('rsvp_enabled', flat=True)
        .first()
    )
    workflow = RsvpWorkflow.objects.filter(
        event_id=event_id,
        status__in=[
            RsvpWorkflow.Status.DRAFT,
            RsvpWorkflow.Status.ACTIVE,
            RsvpWorkflow.Status.PAUSED,
        ],
    ).first()
    # An open workflow also acts as a hold for compatibility with workflows
    # created before the event-level flag was introduced.
    if not rsvp_enabled and not workflow:
        return True
    # Deleting a workflow must not silently turn RSVP into direct delivery.
    if not workflow:
        return False
    recipient = RsvpRecipient.objects.filter(
        workflow=workflow,
        guest_id=guest_id,
    ).only('response_status').first()
    if not recipient:
        return False
    return recipient.response_status == RsvpRecipient.ResponseStatus.CONFIRMED


def confirmed_reminder_guest_ids(event_id):
    """Return confirmed guest IDs, or ``None`` when the event has no RSVP workflow.

    Reminder targeting intentionally follows the presence of a workflow rather
    than the event-level RSVP flag: an existing workflow limits reminders to
    confirmed recipients, while an event with no workflow sends to all guests.
    """
    workflow_id = (
        RsvpWorkflow.objects
        .filter(event_id=event_id)
        .values_list('id', flat=True)
        .first()
    )
    if workflow_id is None:
        return None
    return (
        RsvpRecipient.objects
        .filter(
            workflow_id=workflow_id,
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
        )
        .values_list('guest_id', flat=True)
    )


def extract_button_payload(message: dict):
    message_type = message.get('type')
    if message_type == 'button':
        return message.get('button', {}).get('payload', '')
    if message_type == 'interactive':
        interactive = message.get('interactive', {})
        return interactive.get('button_reply', {}).get('id', '')
    return ''


def record_response(
    *,
    callback_token,
    answer: str,
    response_id: str,
    source: str,
    sender_phone: str = '',
    raw_payload: dict | None = None,
    require_phone_match: bool = False,
    aso_ebi_requested: bool = False,
    aso_ebi_quantity: int = 0,
    plus_one_attending: bool = False,
    plus_one_full_name: str = '',
    plus_one_phone_number: str = '',
    celebrant_name: str = '',
) -> dict:
    """Record the first valid response and queue a pass when appropriate."""
    if answer not in {RsvpResponse.Answer.YES, RsvpResponse.Answer.NO}:
        return {'accepted': False, 'reason': 'invalid_answer'}

    with transaction.atomic():
        try:
            recipient = (
                RsvpRecipient.objects
                # Lock only the recipient row. ``guest__plus_one_of`` is a
                # nullable relation, and PostgreSQL cannot apply FOR UPDATE
                # to the nullable side of the resulting outer join.
                .select_for_update(of=('self',))
                .select_related('workflow', 'workflow__event', 'guest')
                .get(callback_token=callback_token)
            )
        except RsvpRecipient.DoesNotExist:
            return {'accepted': False, 'reason': 'not_found'}

        normalised_sender = _normalise_phone(sender_phone) if sender_phone else ''
        if require_phone_match and _normalise_phone(recipient.guest.phone_number) != normalised_sender:
            return {'accepted': False, 'reason': 'phone_mismatch'}
        if recipient.workflow.status != RsvpWorkflow.Status.ACTIVE:
            return {'accepted': False, 'reason': 'workflow_inactive'}
        if (
            recipient.workflow.response_deadline
            and recipient.workflow.response_deadline <= timezone.now()
        ):
            return {'accepted': False, 'reason': 'deadline_passed'}
        if recipient.response_status != RsvpRecipient.ResponseStatus.AWAITING:
            return {
                'accepted': False,
                'reason': 'already_responded',
                'response_status': recipient.response_status,
            }
        if aso_ebi_requested and not recipient.workflow.event.collect_aso_ebi:
            return {'accepted': False, 'reason': 'aso_ebi_not_enabled'}
        if aso_ebi_requested and aso_ebi_quantity < 1:
            return {'accepted': False, 'reason': 'invalid_aso_ebi_quantity'}
        if plus_one_attending and not recipient.workflow.event.allow_plus_one:
            return {'accepted': False, 'reason': 'plus_one_not_enabled'}
        if plus_one_attending:
            from guests.plus_one import NamedPlusOneError, validate_named_plus_one
            try:
                plus_one_full_name, plus_one_phone_number = validate_named_plus_one(
                    recipient.guest,
                    plus_one_full_name,
                    plus_one_phone_number,
                )
            except NamedPlusOneError as exc:
                return {'accepted': False, 'reason': exc.code, 'detail': str(exc)}
        else:
            plus_one_full_name = ''
            plus_one_phone_number = ''
        celebrant_name = str(celebrant_name or '').strip()
        if celebrant_name and not recipient.workflow.event.collect_celebrant:
            return {'accepted': False, 'reason': 'celebrant_not_enabled'}
        celebrant_options = recipient.workflow.event.celebrant_options or []
        if celebrant_name and celebrant_options and celebrant_name not in celebrant_options:
            return {'accepted': False, 'reason': 'invalid_celebrant'}

        _, created = RsvpResponse.objects.get_or_create(
            message_id=response_id,
            defaults={
                'recipient': recipient,
                'answer': answer,
                'source': source,
                'sender_phone': normalised_sender,
                'raw_payload': raw_payload or {},
            },
        )
        if not created:
            return {'accepted': False, 'reason': 'duplicate'}

        now = timezone.now()
        plus_one_recipient = None
        pass_due = (
            not recipient.workflow.pass_send_at
            or recipient.workflow.pass_send_at <= now
        )
        if answer == RsvpResponse.Answer.YES:
            recipient.response_status = RsvpRecipient.ResponseStatus.CONFIRMED
            recipient.guest.aso_ebi_requested = aso_ebi_requested
            recipient.guest.aso_ebi_quantity = aso_ebi_quantity if aso_ebi_requested else 0
            recipient.guest.plus_one_attending = plus_one_attending
            recipient.guest.celebrant_name = celebrant_name
            recipient.guest.preferences_submitted_at = now
            if not plus_one_attending:
                recipient.guest.plus_one_checked_in = False
                recipient.guest.plus_one_checked_in_at = None
            recipient.guest.save(update_fields=[
                'aso_ebi_requested', 'aso_ebi_quantity', 'plus_one_attending',
                'celebrant_name', 'plus_one_checked_in', 'plus_one_checked_in_at',
                'preferences_submitted_at',
            ])
            if plus_one_attending:
                from guests.plus_one import upsert_named_plus_one
                plus_one_guest, _, _ = upsert_named_plus_one(
                    recipient.guest,
                    plus_one_full_name,
                    plus_one_phone_number,
                )
                plus_one_recipient = sync_guest_to_workflow(plus_one_guest)
            elif recipient.guest.plus_one_of_id:
                Guest = recipient.guest.__class__
                Guest.objects.filter(pk=recipient.guest.plus_one_of_id).update(
                    plus_one_attending=True,
                )
            if recipient.workflow.auto_send_pass and pass_due:
                recipient.pass_status = RsvpRecipient.PassStatus.QUEUED
                recipient.pass_queued_at = now
        else:
            recipient.response_status = RsvpRecipient.ResponseStatus.DECLINED
            recipient.pass_status = RsvpRecipient.PassStatus.NOT_ISSUED
            recipient.guest.aso_ebi_requested = False
            recipient.guest.aso_ebi_quantity = 0
            recipient.guest.plus_one_attending = False
            recipient.guest.celebrant_name = ''
            recipient.guest.preferences_submitted_at = None
            recipient.guest.plus_one_checked_in = False
            recipient.guest.plus_one_checked_in_at = None
            recipient.guest.save(update_fields=[
                'aso_ebi_requested', 'aso_ebi_quantity', 'plus_one_attending',
                'celebrant_name', 'plus_one_checked_in', 'plus_one_checked_in_at',
                'preferences_submitted_at',
            ])
            if recipient.guest.plus_one_of_id:
                Guest = recipient.guest.__class__
                Guest.objects.filter(pk=recipient.guest.plus_one_of_id).update(
                    plus_one_attending=False,
                )
        recipient.responded_at = now
        recipient.save(update_fields=[
            'response_status',
            'pass_status',
            'pass_queued_at',
            'responded_at',
            'updated_at',
        ])

        should_queue_pass = (
            answer == RsvpResponse.Answer.YES
            and recipient.workflow.auto_send_pass
            and pass_due
        )
        if should_queue_pass:
            from .tasks import send_confirmed_pass
            transaction.on_commit(lambda: send_confirmed_pass.delay(recipient.id))

        return {
            'accepted': True,
            'response_status': recipient.response_status,
            'pass_queued': should_queue_pass,
            'plus_one_invitation_queued': bool(
                plus_one_recipient
                and plus_one_recipient.invitation_status
                == RsvpRecipient.InvitationStatus.QUEUED
            ),
            'pass_scheduled_for': (
                recipient.workflow.pass_send_at
                if answer == RsvpResponse.Answer.YES
                and recipient.workflow.auto_send_pass
                and not pass_due
                else None
            ),
        }


def process_incoming_message(message: dict) -> bool:
    """Keep compatibility with RSVP quick replies sent by an older workflow version."""
    callback_data = extract_button_payload(message)
    match = CALLBACK_PATTERN.fullmatch(callback_data or '')
    if not match:
        return False

    try:
        callback_token = uuid.UUID(match.group('token'))
    except ValueError:
        return True

    message_id = message.get('id', '')
    sender_phone = message.get('from', '')
    if not message_id or not sender_phone:
        return True

    record_response(
        callback_token=callback_token,
        answer=match.group('answer'),
        response_id=message_id,
        source=RsvpResponse.Source.WHATSAPP,
        sender_phone=sender_phone,
        raw_payload=message,
        require_phone_match=True,
    )

    return True


def _format_status_error(status_payload: dict) -> str:
    errors = status_payload.get('errors') or []
    if not errors or not isinstance(errors[0], dict):
        return 'WhatsApp delivery failed'

    error = errors[0]
    code = error.get('code')
    details = error.get('error_data') or {}
    candidates = [
        error.get('title'),
        error.get('message'),
        details.get('details') if isinstance(details, dict) else '',
    ]
    messages = []
    for candidate in candidates:
        text = str(candidate or '').strip()
        if text and text not in messages:
            messages.append(text)

    prefix = f'WhatsApp error {code}' if code else 'WhatsApp delivery failed'
    return f"{prefix}: {' — '.join(messages)}" if messages else prefix


def process_status_update(status_payload: dict) -> bool:
    """Apply a Meta status update to an RSVP invitation or pass by message ID."""
    message_id = status_payload.get('id', '')
    wa_status = status_payload.get('status', '')
    if not message_id or wa_status not in {'sent', 'delivered', 'read', 'failed'}:
        return False

    recipient = RsvpRecipient.objects.filter(invitation_message_id=message_id).first()
    field = 'invitation_status'
    if not recipient:
        recipient = RsvpRecipient.objects.filter(pass_message_id=message_id).first()
        field = 'pass_status'
    if not recipient:
        return False

    is_invitation = field == 'invitation_status'
    error_field = 'invitation_error' if is_invitation else 'pass_error'
    retries_field = 'invitation_auto_retries' if is_invitation else 'pass_auto_retries'
    updates = {field: wa_status, 'last_error': '', error_field: ''}
    if wa_status == 'failed':
        message = _format_status_error(status_payload)
        updates['last_error'] = message
        updates[error_field] = message
    elif wa_status in {'delivered', 'read'}:
        # API acceptance is not final delivery. Preserve the attempt count
        # through SENT so a later 131049 webhook cannot restart the retry cap.
        updates[retries_field] = 0
    recipients = RsvpRecipient.objects.filter(pk=recipient.pk)
    if wa_status == 'sent':
        recipients = recipients.exclude(**{f'{field}__in': ['delivered', 'read']})
    elif wa_status == 'delivered':
        recipients = recipients.exclude(**{field: 'read'})
    recipients.update(**updates)

    if wa_status == 'failed' and not is_invitation:
        # The send task marked the guest "sent" when Meta accepted the API
        # call; this webhook proves the pass never arrived. Flip the guest
        # back so the direct WhatsApp page and its sent/pending counts agree
        # with the RSVP dashboard, and so the guest is eligible for resend.
        # whatsapp_sent_at is kept: the attempt stays counted against the
        # daily send budget's trailing window.
        from guests.models import Guest

        Guest.objects.filter(pk=recipient.guest_id).update(whatsapp_sent=False)
    return True
