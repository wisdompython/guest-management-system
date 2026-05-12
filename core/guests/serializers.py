import csv
import io
from rest_framework import serializers
from .models import Event, Guest, BulkUpload


class EventSerializer(serializers.ModelSerializer):
    guest_count = serializers.IntegerField(source='guests.count', read_only=True)

    class Meta:
        model = Event
        fields = (
            'id', 'name', 'date', 'venue', 'description',
            'design_template',
            'qr_zone_x', 'qr_zone_y', 'qr_zone_w', 'qr_zone_h',
            'guest_count', 'created_at',
        )
        read_only_fields = ('id', 'created_at')


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

    def validate_phone_number(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Phone number is required.")
        return cleaned


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

BULK_REQUIRED_COLUMNS = {'full_name', 'phone_number'}
BULK_OPTIONAL_COLUMNS = {'email', 'ticket_type', 'table_number', 'seat_number'}
VALID_TICKET_TYPES = {c[0] for c in Guest.TicketType.choices}


class BulkGuestUploadSerializer(serializers.Serializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    csv_file = serializers.FileField()

    def validate_csv_file(self, value):
        if not value.name.endswith('.csv'):
            raise serializers.ValidationError("Only .csv files are accepted.")
        return value

    def parse(self):
        """
        Parse the uploaded CSV and return:
          valid_rows   — list of dicts ready to create Guest objects
          error_report — list of {row, errors} for failed rows
        """
        event = self.validated_data['event']
        csv_file = self.validated_data['csv_file']

        text = csv_file.read().decode('utf-8-sig')  # handle BOM from Excel exports
        reader = csv.DictReader(io.StringIO(text))

        headers = {h.strip().lower() for h in (reader.fieldnames or [])}
        missing = BULK_REQUIRED_COLUMNS - headers
        if missing:
            raise serializers.ValidationError(
                {'csv_file': f"CSV is missing required columns: {', '.join(missing)}"}
            )

        valid_rows = []
        error_report = []

        for i, raw_row in enumerate(reader, start=2):  # row 1 is header
            row = {k.strip().lower(): v.strip() for k, v in raw_row.items() if k}
            errors = []

            full_name = row.get('full_name', '')
            phone_number = row.get('phone_number', '')

            if not full_name:
                errors.append("full_name is required.")
            if not phone_number:
                errors.append("phone_number is required.")

            ticket_type = row.get('ticket_type', 'general').lower()
            if ticket_type not in VALID_TICKET_TYPES:
                ticket_type = 'general'

            if errors:
                error_report.append({'row': i, 'data': row, 'errors': errors})
                continue

            valid_rows.append({
                'event': event,
                'full_name': full_name,
                'phone_number': phone_number,
                'email': row.get('email', ''),
                'ticket_type': ticket_type,
                'table_number': row.get('table_number', ''),
                'seat_number': row.get('seat_number', ''),
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
