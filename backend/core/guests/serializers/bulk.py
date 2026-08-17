import csv
import io
import logging
from rest_framework import serializers

logger = logging.getLogger(__name__)
from ..models import Event, BulkUpload
from .event import _event_required_fields, _event_valid_ticket_values


TRUE_VALUES = {'1', 'true', 'yes', 'y', 'requested'}
FALSE_VALUES = {'', '0', 'false', 'no', 'n', 'not requested'}


def parse_guest_csv(event, csv_file):
    """Parse a guest CSV without retaining request/serializer state."""
    required = _event_required_fields(event)
    valid_ticket_values = _event_valid_ticket_values(event)
    default_ticket = valid_ticket_values[0] if valid_ticket_values else 'general'

    csv_file.seek(0)
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
    logger.info("CSV headers parsed=%r", headers)

    if 'full_name' not in headers:
        raise serializers.ValidationError({
            'csv_file': (
                "CSV is missing the required 'full_name' column. "
                f'Found columns: {list(headers)}'
            ),
        })

    valid_rows = []
    error_report = []
    for i, raw_row in enumerate(reader, start=2):
        row = {k.strip().lower(): v.strip() for k, v in raw_row.items() if k}
        if not any(row.values()):
            continue
        errors = []

        aso_ebi_requested = False
        aso_ebi_quantity = 0
        raw_aso_ebi = row.get('aso_ebi_requested', '').lower()
        if raw_aso_ebi in TRUE_VALUES:
            aso_ebi_requested = True
        elif raw_aso_ebi not in FALSE_VALUES:
            errors.append("'aso_ebi_requested' must be yes or no.")

        if aso_ebi_requested:
            if not event.collect_aso_ebi:
                errors.append('Aso Ebi requests are not enabled for this event.')
            try:
                aso_ebi_quantity = int(
                    row.get('aso_ebi_yards') or row.get('aso_ebi_quantity', '')
                )
                if aso_ebi_quantity < 1:
                    raise ValueError
            except (TypeError, ValueError):
                errors.append(
                    "'aso_ebi_yards' must be a whole number of at least 1 "
                    'when Aso Ebi is requested.'
                )

        plus_one_attending = False
        raw_plus_one = row.get('plus_one_attending', '').lower()
        if raw_plus_one in TRUE_VALUES:
            plus_one_attending = True
            if not event.allow_plus_one:
                errors.append('Plus ones are not enabled for this event.')
        elif raw_plus_one not in FALSE_VALUES:
            errors.append("'plus_one_attending' must be yes or no.")

        celebrant_name = row.get('celebrant_name', '').strip()
        if celebrant_name and not event.collect_celebrant:
            errors.append('Celebrant preferences are not enabled for this event.')
        if celebrant_name and event.celebrant_options and celebrant_name not in event.celebrant_options:
            errors.append("'celebrant_name' must match a configured celebrant.")

        for field in required:
            if not row.get(field, ''):
                errors.append(f"'{field}' is required for this event.")

        ticket_type = row.get('ticket_type', '').lower().strip()
        if not ticket_type:
            ticket_type = default_ticket
        elif valid_ticket_values and ticket_type not in valid_ticket_values:
            label_match = next(
                (
                    ticket['value']
                    for ticket in (event.ticket_types or [])
                    if ticket.get('label', '').lower() == ticket_type
                ),
                None,
            )
            ticket_type = label_match or default_ticket

        if errors:
            error_report.append({'row': i, 'data': row, 'errors': errors})
            continue

        valid_rows.append({
            '_csv_row': i,
            'event': event,
            'full_name': row.get('full_name', ''),
            'phone_number': row.get('phone_number', ''),
            'email': row.get('email', ''),
            'ticket_type': ticket_type,
            'table_number': row.get('table_number', ''),
            'seat_number': row.get('seat_number', ''),
            'aso_ebi_requested': aso_ebi_requested,
            'aso_ebi_quantity': aso_ebi_quantity,
            'plus_one_attending': plus_one_attending,
            'celebrant_name': celebrant_name,
            'scheduled_send_at': event.pass_send_at,
        })
    return valid_rows, error_report


class BulkGuestUploadSerializer(serializers.Serializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    csv_file = serializers.FileField()
    replace_existing = serializers.BooleanField(required=False, default=False)

    def validate_csv_file(self, value):
        if not value.name.endswith('.csv'):
            raise serializers.ValidationError("Only .csv files are accepted.")
        return value

    def parse(self):
        """
        Parse the uploaded CSV using the event's required_fields and ticket_types config.
        Returns (valid_rows, error_report).
        """
        return parse_guest_csv(
            self.validated_data['event'],
            self.validated_data['csv_file'],
        )


class BulkUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = BulkUpload
        fields = (
            'id', 'event', 'csv_file', 'status',
            'total_rows', 'successful_rows', 'failed_rows',
            'skipped_rows',
            'replace_existing', 'replaced_rows', 'recipients_created',
            'assets_total', 'assets_processed', 'assets_failed',
            'error_report', 'skipped_report', 'error_message', 'task_id',
            'started_at', 'completed_at', 'uploaded_at',
        )
        read_only_fields = (
            'id', 'status', 'total_rows', 'successful_rows',
            'failed_rows', 'replace_existing', 'replaced_rows',
            'skipped_rows',
            'recipients_created', 'assets_total', 'assets_processed',
            'assets_failed', 'error_report', 'skipped_report', 'error_message', 'task_id',
            'started_at', 'completed_at', 'uploaded_at',
        )
