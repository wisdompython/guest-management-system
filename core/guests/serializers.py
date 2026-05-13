import csv
import io
from rest_framework import serializers
from .models import Event, Guest, BulkUpload, Font

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


def _event_valid_ticket_values(event: Event) -> list[str]:
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
            'guest_count', 'created_at',
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


# ---------------------------------------------------------------------------
# Bulk upload
# ---------------------------------------------------------------------------

class BulkGuestUploadSerializer(serializers.Serializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    csv_file = serializers.FileField()

    def validate_csv_file(self, value):
        if not value.name.endswith('.csv'):
            raise serializers.ValidationError("Only .csv files are accepted.")
        return value

    def parse(self):
        """
        Parse the uploaded CSV using the event's required_fields and ticket_types config.
        Returns (valid_rows, error_report).
        """
        event: Event = self.validated_data['event']
        csv_file = self.validated_data['csv_file']

        required = _event_required_fields(event)
        valid_ticket_values = _event_valid_ticket_values(event)
        # Default ticket type: first in the event's list, or 'general' as a fallback
        default_ticket = valid_ticket_values[0] if valid_ticket_values else 'general'

        text = csv_file.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(text))

        headers = {h.strip().lower() for h in (reader.fieldnames or [])}

        # full_name is the only column we always require in the CSV header
        if 'full_name' not in headers:
            raise serializers.ValidationError(
                {'csv_file': "CSV is missing the required 'full_name' column."}
            )

        valid_rows = []
        error_report = []

        for i, raw_row in enumerate(reader, start=2):
            row = {k.strip().lower(): v.strip() for k, v in raw_row.items() if k}
            errors = []

            # Validate required fields
            for field in required:
                if not row.get(field, ''):
                    errors.append(f"'{field}' is required for this event.")

            # Resolve ticket_type
            ticket_type = row.get('ticket_type', '').lower().strip()
            if not ticket_type:
                ticket_type = default_ticket
            elif valid_ticket_values and ticket_type not in valid_ticket_values:
                # Try case-insensitive match against labels too
                label_match = next(
                    (t['value'] for t in (event.ticket_types or [])
                     if t.get('label', '').lower() == ticket_type),
                    None
                )
                if label_match:
                    ticket_type = label_match
                else:
                    ticket_type = default_ticket  # silently coerce to default

            if errors:
                error_report.append({'row': i, 'data': row, 'errors': errors})
                continue

            valid_rows.append({
                'event':        event,
                'full_name':    row.get('full_name', ''),
                'phone_number': row.get('phone_number', ''),
                'email':        row.get('email', ''),
                'ticket_type':  ticket_type,
                'table_number': row.get('table_number', ''),
                'seat_number':  row.get('seat_number', ''),
            })

        return valid_rows, error_report


class BulkUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = BulkUpload
        fields = (
            'id', 'event', 'csv_file', 'status',
            'total_rows', 'successful_rows', 'failed_rows',
            'error_report', 'uploaded_at',
        )
        read_only_fields = (
            'id', 'status', 'total_rows', 'successful_rows',
            'failed_rows', 'error_report', 'uploaded_at',
        )
