from rest_framework import serializers
from ..models import Event, Font

# Guest fields that can be toggled required/optional per event
CONFIGURABLE_FIELDS = ['full_name', 'phone_number', 'email', 'table_number', 'seat_number']

# Absolute minimum — full_name is always required regardless of event config
ALWAYS_REQUIRED = {'full_name'}


def _event_required_fields(event: Event) -> set:
    """Return the set of required field names for this event."""
    configured = set(event.required_fields or [])
    # full_name is non-negotiable
    configured |= ALWAYS_REQUIRED
    # if WhatsApp is enabled, phone_number is implicitly required unless already listed
    if event.whatsapp_enabled and 'phone_number' not in configured:
        configured.add('phone_number')
    return configured


def _event_valid_ticket_values(event: Event) -> list:
    """Return list of allowed ticket_type values for this event."""
    return [t['value'] for t in (event.ticket_types or []) if isinstance(t, dict) and 'value' in t]


class FontSerializer(serializers.ModelSerializer):
    class Meta:
        model = Font
        fields = ('id', 'name', 'file', 'uploaded_at')
        read_only_fields = ('id', 'uploaded_at')


class EventSerializer(serializers.ModelSerializer):
    guest_count = serializers.IntegerField(source='guests.count', read_only=True)
    name_font_name = serializers.CharField(source='name_font.name', read_only=True)

    class Meta:
        model = Event
        fields = (
            'id', 'name', 'date', 'venue', 'description',
            'design_template',
            'qr_zone_x', 'qr_zone_y', 'qr_zone_w', 'qr_zone_h',
            'name_zone_x', 'name_zone_y', 'name_zone_w', 'name_zone_h',
            'name_font', 'name_font_name', 'name_font_color', 'name_font_size_fraction',
            'qr_bg_color',
            'ticket_types', 'required_fields', 'whatsapp_enabled',
            'is_ended', 'guest_count', 'created_at',
        )
        read_only_fields = ('id', 'created_at', 'name_font_name')

    def validate_ticket_types(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("ticket_types must be a list.")
        for item in value:
            if not isinstance(item, dict) or 'value' not in item or 'label' not in item:
                raise serializers.ValidationError(
                    "Each ticket type must be an object with 'value' and 'label' keys."
                )
            if not str(item['value']).strip():
                raise serializers.ValidationError("Ticket type 'value' cannot be empty.")
        return value

    def validate_required_fields(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("required_fields must be a list.")
        invalid = set(value) - set(CONFIGURABLE_FIELDS)
        if invalid:
            raise serializers.ValidationError(
                f"Unknown field(s): {', '.join(invalid)}. Allowed: {', '.join(CONFIGURABLE_FIELDS)}"
            )
        return value
