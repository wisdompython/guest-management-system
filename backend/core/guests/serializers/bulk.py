import csv
import io
import logging
from rest_framework import serializers

logger = logging.getLogger(__name__)
from ..models import Event, BulkUpload
from .event import _event_required_fields, _event_valid_ticket_values


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

        raw = csv_file.read()
        for enc in ('utf-8-sig', 'utf-8', 'latin-1', 'cp1252'):
            try:
                text = raw.decode(enc)
                break
            except (UnicodeDecodeError, ValueError):
                continue
        else:
            text = raw.decode('latin-1')
        reader = csv.DictReader(io.StringIO(text))

        raw_headers = reader.fieldnames or []
        headers = {h.strip().lower() for h in raw_headers}
        logger.warning("CSV headers raw=%r parsed=%r", raw_headers, headers)

        if 'full_name' not in headers:
            raise serializers.ValidationError(
                {'csv_file': f"CSV is missing the required 'full_name' column. Found columns: {list(headers)}"}
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
