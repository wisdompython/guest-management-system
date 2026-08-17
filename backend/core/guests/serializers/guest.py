from rest_framework import serializers
from ..models import Guest
from .event import CONFIGURABLE_FIELDS, _event_required_fields, _event_valid_ticket_values


def _can_see_phone(request) -> bool:
    """Only super admins may see guest phone numbers."""
    return bool(request and request.user and request.user.is_authenticated and request.user.is_super_admin)


class GuestSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    preferences_link = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = (
            'id', 'event', 'event_name', 'full_name', 'phone_number', 'email',
            'ticket_type', 'table_number', 'seat_number',
            'aso_ebi_requested', 'aso_ebi_quantity', 'plus_one_attending',
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
            'registered_at',
        )

    def get_preferences_link(self, obj):
        from ..whatsapp import build_preferences_url
        return build_preferences_url(obj)

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
                'plus_one_attending': 'Plus ones are not enabled for this event.',
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

    def create(self, validated_data):
        event = validated_data.get('event')
        if event and 'scheduled_send_at' not in validated_data and event.pass_send_at:
            validated_data['scheduled_send_at'] = event.pass_send_at
        return super().create(validated_data)

    def update(self, instance, validated_data):
        guest = super().update(instance, validated_data)
        if not guest.plus_one_attending and (guest.plus_one_checked_in or guest.plus_one_checked_in_at):
            guest.plus_one_checked_in = False
            guest.plus_one_checked_in_at = None
            guest.save(update_fields=['plus_one_checked_in', 'plus_one_checked_in_at'])
        return guest


class GuestListSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)

    class Meta:
        model = Guest
        fields = (
            'id', 'event', 'event_name', 'full_name', 'phone_number',
            'email', 'ticket_type', 'table_number',
            'aso_ebi_requested', 'aso_ebi_quantity', 'plus_one_attending',
            'celebrant_name', 'preferences_submitted_at',
            'status', 'checked_in_at', 'plus_one_checked_in', 'plus_one_checked_in_at',
            'whatsapp_sent', 'scheduled_send_at', 'registered_at',
        )
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not _can_see_phone(self.context.get('request')):
            data['phone_number'] = None
        return data
