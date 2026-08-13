from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
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
    guest_count = serializers.SerializerMethodField()
    checked_in_count = serializers.SerializerMethodField()
    name_font_name = serializers.CharField(source='name_font.name', read_only=True)
    whatsapp_template_name = serializers.CharField(source='whatsapp_template.display_name', read_only=True)
    create_rsvp_workflow = serializers.BooleanField(write_only=True, required=False, default=False)
    rsvp_workflow_id = serializers.SerializerMethodField()

    def get_guest_count(self, obj):
        # Use annotation when available (list view), fall back for single-object endpoints.
        ann = getattr(obj, 'guest_count_ann', None)
        return ann if ann is not None else obj.guests.count()

    def get_checked_in_count(self, obj):
        ann = getattr(obj, 'checked_in_count_ann', None)
        return ann if ann is not None else obj.guests.filter(status='checked_in').count()

    def get_rsvp_workflow_id(self, obj):
        try:
            return obj.rsvp_workflow.id
        except ObjectDoesNotExist:
            return None

    class Meta:
        model = Event
        fields = (
            'id', 'name', 'date', 'venue', 'description', 'rsvp_message', 'color_of_day',
            'design_template',
            'qr_zone_x', 'qr_zone_y', 'qr_zone_w', 'qr_zone_h',
            'name_zone_x', 'name_zone_y', 'name_zone_w', 'name_zone_h',
            'name_font', 'name_font_name', 'name_font_color', 'name_font_size_fraction',
            'qr_bg_color',
            'ticket_types', 'required_fields', 'collect_aso_ebi', 'whatsapp_enabled',
            'rsvp_enabled',
            'whatsapp_template', 'whatsapp_template_name',
            'pass_send_at', 'create_rsvp_workflow', 'rsvp_workflow_id',
            'is_ended', 'guest_count', 'checked_in_count', 'created_at',
        )
        read_only_fields = ('id', 'created_at', 'name_font_name', 'whatsapp_template_name')

    def validate(self, attrs):
        attrs = super().validate(attrs)
        event_date = attrs.get('date') or (self.instance.date if self.instance else None)
        pass_send_at = attrs.get(
            'pass_send_at',
            self.instance.pass_send_at if self.instance else None,
        )
        if pass_send_at and pass_send_at <= timezone.now():
            raise serializers.ValidationError({
                'pass_send_at': 'The scheduled pass time must be in the future.',
            })
        if pass_send_at and event_date and pass_send_at >= event_date:
            raise serializers.ValidationError({
                'pass_send_at': 'The scheduled pass time must be before the event date.',
            })
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        create_rsvp_workflow = validated_data.pop('create_rsvp_workflow', False)
        if create_rsvp_workflow:
            validated_data['rsvp_enabled'] = True
            validated_data['pass_send_at'] = None
        event = super().create(validated_data)
        if create_rsvp_workflow:
            from rsvp.models import RsvpWorkflow

            request = self.context.get('request')
            created_by = request.user if request and request.user.is_authenticated else None
            RsvpWorkflow.objects.create(event=event, created_by=created_by)
        return event

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
