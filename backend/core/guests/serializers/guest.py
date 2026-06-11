from rest_framework import serializers
from ..models import Guest
from .event import CONFIGURABLE_FIELDS, _event_required_fields, _event_valid_ticket_values


class GuestSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)

    class Meta:
        model = Guest
        fields = (
            'id', 'event', 'event_name', 'full_name', 'phone_number', 'email',
            'ticket_type', 'table_number', 'seat_number',
            'qr_code', 'pass_image',
            'status', 'checked_in_at',
            'whatsapp_sent', 'whatsapp_sent_at',
            'registered_at',
        )
        read_only_fields = (
            'id', 'event_name', 'qr_code', 'pass_image',
            'status', 'checked_in_at',
            'whatsapp_sent', 'whatsapp_sent_at', 'registered_at',
        )

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

        return data


class GuestListSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)

    class Meta:
        model = Guest
        fields = (
            'id', 'event', 'event_name', 'full_name', 'phone_number',
            'email', 'ticket_type', 'table_number',
            'status', 'whatsapp_sent', 'registered_at',
        )
