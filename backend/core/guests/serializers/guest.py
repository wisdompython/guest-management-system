from django.db import transaction
from rest_framework import serializers
from ..models import Guest
from .event import CONFIGURABLE_FIELDS, _event_required_fields, _event_valid_ticket_values


def _can_see_phone(request) -> bool:
    """Only super admins may see guest phone numbers."""
    return bool(request and request.user and request.user.is_authenticated and request.user.is_super_admin)


class GuestSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    preferences_link = serializers.SerializerMethodField()
    has_named_plus_one = serializers.SerializerMethodField()
    plus_one_guest_id = serializers.SerializerMethodField()
    named_plus_one_name = serializers.SerializerMethodField()
    is_plus_one = serializers.SerializerMethodField()
    primary_guest_name = serializers.SerializerMethodField()
    plus_one_full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    plus_one_phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Guest
        fields = (
            'id', 'event', 'event_name', 'full_name', 'phone_number', 'email',
            'ticket_type', 'table_number', 'seat_number',
            'aso_ebi_requested', 'aso_ebi_quantity', 'plus_one_attending',
            'has_named_plus_one', 'plus_one_guest_id',
            'named_plus_one_name', 'is_plus_one', 'primary_guest_name',
            'plus_one_full_name', 'plus_one_phone_number',
            'celebrant_name', 'preferences_link', 'preferences_submitted_at',
            'qr_code', 'pass_image',
            'status', 'checked_in_at', 'plus_one_checked_in', 'plus_one_checked_in_at',
            'whatsapp_sent', 'whatsapp_sent_at', 'scheduled_send_at',
            'registered_at',
        )
        read_only_fields = (
            'id', 'event_name', 'qr_code', 'pass_image',
            'status', 'checked_in_at',
            'whatsapp_sent', 'whatsapp_sent_at', 'preferences_link',
            'preferences_submitted_at', 'plus_one_checked_in', 'plus_one_checked_in_at',
            'has_named_plus_one', 'plus_one_guest_id',
            'named_plus_one_name', 'is_plus_one', 'primary_guest_name',
            'registered_at',
        )

    def get_preferences_link(self, obj):
        from ..whatsapp import build_preferences_url
        return build_preferences_url(obj)

    def get_has_named_plus_one(self, obj):
        from ..plus_one import get_named_plus_one
        return get_named_plus_one(obj) is not None

    def get_plus_one_guest_id(self, obj):
        from ..plus_one import get_named_plus_one
        plus_one = get_named_plus_one(obj)
        return str(plus_one.id) if plus_one else None

    def get_named_plus_one_name(self, obj):
        from ..plus_one import get_named_plus_one
        plus_one = get_named_plus_one(obj)
        return plus_one.full_name if plus_one else ''

    def get_is_plus_one(self, obj):
        return obj.plus_one_of_id is not None

    def get_primary_guest_name(self, obj):
        return obj.plus_one_of.full_name if obj.plus_one_of_id else ''

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not _can_see_phone(self.context.get('request')):
            data['phone_number'] = None
        return data

    def validate_scheduled_send_at(self, value):
        from django.utils import timezone as tz
        if value and value < tz.now():
            raise serializers.ValidationError('scheduled_send_at must be in the future.')
        return value

    def validate(self, data):
        # On update, merge with existing instance values so partial updates work
        event = data.get('event') or (self.instance.event if self.instance else None)
        if not event:
            return data

        required = _event_required_fields(event)

        for field in CONFIGURABLE_FIELDS:
            if field in required:
                value = data.get(field) or (getattr(self.instance, field, '') if self.instance else '')
                if not str(value).strip():
                    raise serializers.ValidationError({field: f"{field} is required for this event."})

        # Validate ticket_type against event's allowed list (if the event has any defined)
        valid_types = _event_valid_ticket_values(event)
        ticket_type = data.get('ticket_type', '')
        if valid_types and ticket_type and ticket_type not in valid_types:
            raise serializers.ValidationError(
                {'ticket_type': f"'{ticket_type}' is not a valid ticket type for this event. Allowed: {', '.join(valid_types)}"}
            )

        # Default ticket_type to first defined type if not provided
        if not ticket_type and valid_types:
            data['ticket_type'] = valid_types[0]

        scheduled_send_at = data.get('scheduled_send_at')
        if scheduled_send_at and event.date and scheduled_send_at > event.date:
            raise serializers.ValidationError(
                {'scheduled_send_at': 'Scheduled send time must be before the event date.'}
            )

        aso_ebi_requested = data.get(
            'aso_ebi_requested',
            self.instance.aso_ebi_requested if self.instance else False,
        )
        aso_ebi_quantity = data.get(
            'aso_ebi_quantity',
            self.instance.aso_ebi_quantity if self.instance else 0,
        )
        if aso_ebi_requested and not event.collect_aso_ebi:
            raise serializers.ValidationError({
                'aso_ebi_requested': 'Aso Ebi requests are not enabled for this event.',
            })
        if aso_ebi_requested and aso_ebi_quantity < 1:
            raise serializers.ValidationError({
                'aso_ebi_quantity': 'Enter at least 1 yard for an Aso Ebi request.',
            })
        if not aso_ebi_requested:
            data['aso_ebi_quantity'] = 0

        plus_one_attending = data.get(
            'plus_one_attending',
            self.instance.plus_one_attending if self.instance else False,
        )
        if plus_one_attending and not event.allow_plus_one:
            raise serializers.ValidationError({
                'plus_one_attending': 'Plus one is not enabled for this event.',
            })
        if plus_one_attending:
            from ..plus_one import get_named_plus_one
            current_plus_one = get_named_plus_one(self.instance) if self.instance else None
            plus_one_full_name = str(
                data.get('plus_one_full_name')
                or (current_plus_one.full_name if current_plus_one else '')
            ).strip()
            plus_one_phone_number = str(
                data.get('plus_one_phone_number')
                or (current_plus_one.phone_number if current_plus_one else '')
            ).strip()
            if not plus_one_full_name:
                raise serializers.ValidationError({
                    'plus_one_full_name': 'Enter the full name of the plus one.',
                })
            if not plus_one_phone_number:
                raise serializers.ValidationError({
                    'plus_one_phone_number': 'Enter the WhatsApp phone number of the plus one.',
                })

        celebrant_name = str(data.get(
            'celebrant_name',
            self.instance.celebrant_name if self.instance else '',
        ) or '').strip()
        if celebrant_name and not event.collect_celebrant:
            raise serializers.ValidationError({
                'celebrant_name': 'Celebrant preferences are not enabled for this event.',
            })
        options = event.celebrant_options or []
        if celebrant_name and options and celebrant_name not in options:
            raise serializers.ValidationError({
                'celebrant_name': 'Select one of the configured celebrants.',
            })
        data['celebrant_name'] = celebrant_name

        return data

    @transaction.atomic
    def create(self, validated_data):
        plus_one_full_name = validated_data.pop('plus_one_full_name', '')
        plus_one_phone_number = validated_data.pop('plus_one_phone_number', '')
        event = validated_data.get('event')
        if event and 'scheduled_send_at' not in validated_data and event.pass_send_at:
            validated_data['scheduled_send_at'] = event.pass_send_at
        guest = super().create(validated_data)
        if guest.plus_one_attending:
            from ..plus_one import NamedPlusOneError, upsert_named_plus_one
            try:
                upsert_named_plus_one(
                    guest, plus_one_full_name, plus_one_phone_number,
                )
            except NamedPlusOneError as exc:
                raise serializers.ValidationError({'plus_one': str(exc)}) from exc
        return guest

    @transaction.atomic
    def update(self, instance, validated_data):
        plus_one_full_name = validated_data.pop('plus_one_full_name', '')
        plus_one_phone_number = validated_data.pop('plus_one_phone_number', '')
        guest = super().update(instance, validated_data)
        from ..plus_one import NamedPlusOneError, get_named_plus_one, remove_named_plus_one, upsert_named_plus_one
        try:
            if guest.plus_one_attending:
                current = get_named_plus_one(guest)
                upsert_named_plus_one(
                    guest,
                    plus_one_full_name or (current.full_name if current else ''),
                    plus_one_phone_number or (current.phone_number if current else ''),
                )
            else:
                remove_named_plus_one(guest)
        except NamedPlusOneError as exc:
            raise serializers.ValidationError({'plus_one': str(exc)}) from exc
        return guest


class GuestListSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    has_named_plus_one = serializers.SerializerMethodField()
    plus_one_guest_id = serializers.SerializerMethodField()
    named_plus_one_name = serializers.SerializerMethodField()
    is_plus_one = serializers.SerializerMethodField()
    primary_guest_name = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = (
            'id', 'event', 'event_name', 'full_name', 'phone_number',
            'email', 'ticket_type', 'table_number',
            'aso_ebi_requested', 'aso_ebi_quantity', 'plus_one_attending',
            'has_named_plus_one', 'plus_one_guest_id',
            'named_plus_one_name', 'is_plus_one', 'primary_guest_name',
            'celebrant_name', 'preferences_submitted_at',
            'status', 'checked_in_at', 'plus_one_checked_in', 'plus_one_checked_in_at',
            'whatsapp_sent', 'scheduled_send_at', 'registered_at',
        )
        read_only_fields = fields

    def get_has_named_plus_one(self, obj):
        from ..plus_one import get_named_plus_one
        return get_named_plus_one(obj) is not None

    def get_plus_one_guest_id(self, obj):
        from ..plus_one import get_named_plus_one
        plus_one = get_named_plus_one(obj)
        return str(plus_one.id) if plus_one else None

    def get_named_plus_one_name(self, obj):
        from ..plus_one import get_named_plus_one
        plus_one = get_named_plus_one(obj)
        return plus_one.full_name if plus_one else ''

    def get_is_plus_one(self, obj):
        return obj.plus_one_of_id is not None

    def get_primary_guest_name(self, obj):
        return obj.plus_one_of.full_name if obj.plus_one_of_id else ''

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not _can_see_phone(self.context.get('request')):
            data['phone_number'] = None
        return data
