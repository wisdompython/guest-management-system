import csv
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

from ..csv_utils import safe_csv_row
from ..models import Event, Guest, BulkUpload
from ..serializers import BulkGuestUploadSerializer, BulkUploadSerializer
from ..tasks import process_bulk_guest_upload

logger = logging.getLogger(__name__)


class GuestBulkExportMixin:
    """Mixin providing bulk_upload and export actions for GuestViewSet."""

    @action(detail=False, methods=['post'],
            parser_classes=[MultiPartParser, FormParser], url_path='bulk-upload')
    def bulk_upload(self, request):
        serializer = BulkGuestUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = BulkUpload.objects.create(
            event=serializer.validated_data['event'],
            csv_file=serializer.validated_data['csv_file'],
            replace_existing=serializer.validated_data['replace_existing'],
            uploaded_by=request.user if request.user.is_authenticated else None,
            status=BulkUpload.UploadStatus.PENDING,
        )
        try:
            task = process_bulk_guest_upload.delay(upload.id)
        except Exception:
            logger.exception('Could not queue bulk upload %s', upload.id)
            upload.status = BulkUpload.UploadStatus.FAILED
            upload.error_message = (
                'The import service is temporarily unavailable. '
                'Your current guest list was not changed.'
            )
            upload.save(update_fields=['status', 'error_message'])
            return Response(
                self._bulk_upload_payload(upload),
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        BulkUpload.objects.filter(pk=upload.id, task_id='').update(task_id=task.id or '')
        upload.refresh_from_db()
        return Response(
            self._bulk_upload_payload(upload),
            status=status.HTTP_202_ACCEPTED,
        )

    @action(
        detail=False,
        methods=['get'],
        url_path=r'bulk-upload-status/(?P<upload_id>\d+)',
    )
    def bulk_upload_status(self, request, upload_id=None):
        uploads = BulkUpload.objects.all()
        if not request.user.is_super_admin:
            uploads = uploads.filter(uploaded_by=request.user)
        try:
            upload = uploads.get(pk=upload_id)
        except BulkUpload.DoesNotExist:
            return Response(
                {'detail': 'Upload not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(self._bulk_upload_payload(upload))

    @staticmethod
    def _bulk_upload_payload(upload):
        data = BulkUploadSerializer(upload).data
        data.update({
            'upload_id': upload.id,
            'successful': upload.successful_rows,
            'failed': upload.failed_rows,
            'replaced': upload.replaced_rows,
            'errors': upload.error_report,
            'asset_warnings': [],
        })
        return data

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
            'aso_ebi_requested', 'aso_ebi_yards',
            'status', 'registered_at', 'checked_in_at',
            'whatsapp_sent', 'event',
        ]

        def row_iter():
            yield columns
            for g in qs.select_related('event').iterator():
                yield safe_csv_row([
                    g.full_name, g.email, g.phone_number,
                    g.ticket_type, g.table_number, g.seat_number,
                    'Yes' if g.aso_ebi_requested else 'No',
                    g.aso_ebi_quantity if g.aso_ebi_requested else 0,
                    g.get_status_display(),
                    g.registered_at.strftime('%Y-%m-%d %H:%M') if g.registered_at else '',
                    g.checked_in_at.strftime('%Y-%m-%d %H:%M') if g.checked_in_at else '',
                    'Yes' if g.whatsapp_sent else 'No',
                    g.event.name if g.event else '',
                ])

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

        event_slug = re.sub(r'[^\w-]', '_', event.name)
        filename = f"{event_slug}_{mode}.zip"

        # Stream the zip so we never hold all files in memory at once.
        # zipstream-ng writes each file as it is yielded; the browser receives
        # chunks immediately rather than waiting for the full archive.
        try:
            import zipstream
            zs = zipstream.ZipFile(mode='w', compression=zipstream.ZIP_DEFLATED)
            for guest in guests.iterator():
                name = safe_name(guest.full_name) or str(guest.id)
                if mode in ('passes', 'both') and guest.pass_image:
                    try:
                        zs.write(guest.pass_image.path, f'passes/{name}.png')
                    except (FileNotFoundError, ValueError):
                        pass
                if mode in ('qr', 'both') and guest.qr_code:
                    try:
                        zs.write(guest.qr_code.path, f'qr_codes/{name}.png')
                    except (FileNotFoundError, ValueError):
                        pass
            response = StreamingHttpResponse(zs, content_type='application/zip')
        except (ImportError, AttributeError):
            # zipstream-ng not installed (or a different zipstream package is
            # shadowing it) — fall back to in-memory zip
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
                for guest in guests.iterator():
                    name = safe_name(guest.full_name) or str(guest.id)
                    if mode in ('passes', 'both') and guest.pass_image:
                        try:
                            zs_path = guest.pass_image.path
                            zf.write(zs_path, f'passes/{name}.png')
                        except (FileNotFoundError, ValueError):
                            pass
                    if mode in ('qr', 'both') and guest.qr_code:
                        try:
                            zs_path = guest.qr_code.path
                            zf.write(zs_path, f'qr_codes/{name}.png')
                        except (FileNotFoundError, ValueError):
                            pass
            buf.seek(0)
            response = HttpResponse(buf.read(), content_type='application/zip')

        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
