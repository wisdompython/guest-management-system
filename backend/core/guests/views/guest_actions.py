import csv
import io
import logging
import os
import re
import zipfile

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import StreamingHttpResponse, HttpResponse

from ..models import Event, Guest, BulkUpload
from ..serializers import BulkGuestUploadSerializer
from ..tasks import generate_guest_assets

logger = logging.getLogger(__name__)


class GuestBulkExportMixin:
    """Mixin providing bulk_upload and export actions for GuestViewSet."""

    @action(detail=False, methods=['post'],
            parser_classes=[MultiPartParser, FormParser], url_path='bulk-upload')
    def bulk_upload(self, request):
        serializer = BulkGuestUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event = serializer.validated_data['event']
        csv_file = serializer.validated_data['csv_file']

        upload_record = BulkUpload.objects.create(
            event=event,
            csv_file=csv_file,
            uploaded_by=request.user if request.user.is_authenticated else None,
            status=BulkUpload.UploadStatus.PROCESSING,
        )

        valid_rows, error_report = serializer.parse()

        created_guests = []
        asset_failures = []
        for row in valid_rows:
            try:
                guest = Guest.objects.create(**row)
            except Exception as exc:
                logger.error("Failed to create guest from row %s: %s", row, exc, exc_info=True)
                error_report.append({'row': row, 'error': str(exc)})
                continue

            generate_guest_assets.delay(str(guest.id), send_whatsapp=True)
            created_guests.append(str(guest.id))
            if False:  # asset results now come from background worker
                asset_failures.append({
                    'guest_id': str(guest.id),
                    'name': guest.full_name,
                    'qr': False,
                    'pass': False,
                })

        upload_record.total_rows = len(valid_rows) + len(error_report)
        upload_record.successful_rows = len(created_guests)
        upload_record.failed_rows = len(error_report)
        upload_record.error_report = error_report
        upload_record.status = BulkUpload.UploadStatus.DONE
        upload_record.save()
        return Response({
            'upload_id': upload_record.id,
            'total_rows': upload_record.total_rows,
            'successful': upload_record.successful_rows,
            'failed': upload_record.failed_rows,
            'errors': error_report,
            'asset_warnings': asset_failures,
            'guest_ids': created_guests,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        qs = self.get_queryset()

        event_id = request.query_params.get('event')
        if event_id:
            qs = qs.filter(event_id=event_id)

        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        try:
            event = Event.objects.get(pk=event_id) if event_id else None
        except Event.DoesNotExist:
            event = None
        event_slug = event.name.replace(' ', '_') if event else 'all_events'
        filename = f"guests_{event_slug}.csv"

        columns = [
            'full_name', 'email', 'phone_number',
            'ticket_type', 'table_number', 'seat_number',
            'status', 'registered_at', 'checked_in_at',
            'whatsapp_sent', 'event',
        ]

        def row_iter():
            yield columns
            for g in qs.select_related('event').iterator():
                yield [
                    g.full_name, g.email, g.phone_number,
                    g.get_ticket_type_display(), g.table_number, g.seat_number,
                    g.get_status_display(),
                    g.registered_at.strftime('%Y-%m-%d %H:%M') if g.registered_at else '',
                    g.checked_in_at.strftime('%Y-%m-%d %H:%M') if g.checked_in_at else '',
                    'Yes' if g.whatsapp_sent else 'No',
                    g.event.name if g.event else '',
                ]

        class EchoBuffer:
            def write(self, value): return value

        writer = csv.writer(EchoBuffer())
        rows = (writer.writerow(r) for r in row_iter())
        response = StreamingHttpResponse(rows, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'], url_path='download-assets')
    def download_assets(self, request):
        event_id = request.query_params.get('event')
        mode = request.query_params.get('mode', 'both')  # 'passes', 'qr', 'both'
        if not event_id:
            return Response({'detail': 'event param required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        guests = Guest.objects.filter(event=event).order_by('full_name')

        def safe_name(name):
            return re.sub(r'[^\w\s-]', '', name).strip().replace(' ', '_')

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            missing = 0
            for guest in guests:
                name = safe_name(guest.full_name) or str(guest.id)

                if mode in ('passes', 'both') and guest.pass_image:
                    try:
                        path = guest.pass_image.path
                        ext = os.path.splitext(path)[1] or '.png'
                        zf.write(path, f'passes/{name}{ext}')
                    except (FileNotFoundError, ValueError):
                        missing += 1

                if mode in ('qr', 'both') and guest.qr_code:
                    try:
                        path = guest.qr_code.path
                        ext = os.path.splitext(path)[1] or '.png'
                        zf.write(path, f'qr_codes/{name}{ext}')
                    except (FileNotFoundError, ValueError):
                        missing += 1

        buf.seek(0)
        event_slug = re.sub(r'[^\w-]', '_', event.name)
        filename = f"{event_slug}_{mode}.zip"
        response = HttpResponse(buf.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
