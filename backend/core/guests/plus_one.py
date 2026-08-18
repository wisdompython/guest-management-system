from django.core.exceptions import ObjectDoesNotExist

from .models import Guest
from .whatsapp import _normalise_phone


class NamedPlusOneError(ValueError):
    def __init__(self, code: str, message: str):
        self.code = code
        super().__init__(message)


def get_named_plus_one(primary_guest):
    try:
        return primary_guest.named_plus_one
    except ObjectDoesNotExist:
        return None


def validate_named_plus_one(primary_guest, full_name: str, phone_number: str):
    if primary_guest.plus_one_of_id:
        raise NamedPlusOneError(
            'plus_one_cannot_invite',
            'A plus one cannot add another plus one.',
        )

    full_name = str(full_name or '').strip()
    phone_number = _normalise_phone(str(phone_number or ''))
    if not full_name:
        raise NamedPlusOneError(
            'plus_one_name_required',
            'Enter the full name of your plus one.',
        )
    if len(phone_number) < 7:
        raise NamedPlusOneError(
            'plus_one_phone_required',
            'Enter a valid WhatsApp phone number for your plus one.',
        )

    existing_plus_one = get_named_plus_one(primary_guest)
    candidates = Guest.objects.filter(event_id=primary_guest.event_id).exclude(
        pk=primary_guest.pk,
    )
    if existing_plus_one:
        candidates = candidates.exclude(pk=existing_plus_one.pk)
    for candidate_phone in candidates.exclude(phone_number='').values_list(
        'phone_number', flat=True,
    ):
        if _normalise_phone(candidate_phone) == phone_number:
            raise NamedPlusOneError(
                'plus_one_phone_in_use',
                'That phone number already belongs to another guest for this event.',
            )
    return full_name, phone_number


def upsert_named_plus_one(primary_guest, full_name: str, phone_number: str):
    """Create or update the independently ticketed guest linked to a primary guest."""
    # All callers run inside an atomic response/create transaction. Locking the
    # event serialises simultaneous plus-one submissions so two guests cannot
    # claim the same phone number between validation and creation.
    primary_guest.event.__class__.objects.select_for_update().only('pk').get(
        pk=primary_guest.event_id,
    )
    full_name, phone_number = validate_named_plus_one(
        primary_guest, full_name, phone_number,
    )
    plus_one = get_named_plus_one(primary_guest)
    created = plus_one is None
    changed = created
    if created:
        plus_one = Guest.objects.create(
            event=primary_guest.event,
            plus_one_of=primary_guest,
            full_name=full_name,
            phone_number=phone_number,
            ticket_type=primary_guest.ticket_type,
            table_number=primary_guest.table_number,
            celebrant_name=primary_guest.celebrant_name,
            scheduled_send_at=primary_guest.scheduled_send_at,
        )
    else:
        updates = {
            'full_name': full_name,
            'phone_number': phone_number,
            'ticket_type': primary_guest.ticket_type,
            'table_number': primary_guest.table_number,
            'celebrant_name': primary_guest.celebrant_name,
            'scheduled_send_at': primary_guest.scheduled_send_at,
        }
        changed_fields = []
        for field, value in updates.items():
            if getattr(plus_one, field) != value:
                setattr(plus_one, field, value)
                changed_fields.append(field)
        if changed_fields:
            plus_one.whatsapp_sent = False
            plus_one.whatsapp_sent_at = None
            changed_fields.extend(['whatsapp_sent', 'whatsapp_sent_at'])
            plus_one.save(update_fields=changed_fields)
            changed = True

    if not primary_guest.plus_one_attending:
        primary_guest.plus_one_attending = True
        primary_guest.save(update_fields=['plus_one_attending'])
    return plus_one, created, changed


def remove_named_plus_one(primary_guest):
    plus_one = get_named_plus_one(primary_guest)
    if plus_one:
        if plus_one.status == Guest.Status.CHECKED_IN:
            raise NamedPlusOneError(
                'plus_one_checked_in',
                'A plus one who has already checked in cannot be removed.',
            )
        plus_one.delete()
    if (
        primary_guest.plus_one_attending
        or primary_guest.plus_one_checked_in
        or primary_guest.plus_one_checked_in_at
    ):
        primary_guest.plus_one_attending = False
        primary_guest.plus_one_checked_in = False
        primary_guest.plus_one_checked_in_at = None
        primary_guest.save(update_fields=[
            'plus_one_attending', 'plus_one_checked_in',
            'plus_one_checked_in_at',
        ])
    return bool(plus_one)
