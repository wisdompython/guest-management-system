import csv
import io
import logging
import os
import re
import zipfile

from django.db import transaction
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import StreamingHttpResponse, HttpResponse

from ..csv_utils import safe_csv_row
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
        replace_existing = serializer.validated_data['replace_existing']

        upload_record = BulkUpload.objects.create(
            event=event,
            csv_file=csv_file,
            uploaded_by=request.user if request.user.is_authenticated else None,
            status=BulkUpload.UploadStatus.PROCESSING,
        )

        valid_rows, error_report = serializer.parse()

        # Replacing is deliberately all-or-nothing. Never erase the current list
        # when the replacement file contains invalid rows or no usable guests.
        if replace_existing and (error_report or not valid_rows):
            upload_record.status = BulkUpload.UploadStatus.FAILED
            upload_record.total_rows = len(valid_rows) + len(error_report)
            upload_record.failed_rows = len(error_report)
            upload_record.error_report = error_report
            upload_record.save(update_fields=[
                'status', 'total_rows', 'failed_rows', 'error_report',
            ])
            return Response({
                'detail': (
                    'The existing guest list was not changed. Fix every CSV error '
                    'before replacing the list.'
                    if error_report else
                    'The existing guest list was not changed because the replacement CSV is empty.'
                ),
                'errors': error_report,
            }, status=status.HTTP_400_BAD_REQUEST)

        # Build Guest objects without hitting the DB yet
        guest_objects = [Guest(**row) for row in valid_rows]

        # Insert in chunks of 500 to keep each statement fast and memory bounded.
        # Replacement is one transaction so a database error restores the old list.
        CHUNK = 500
        created_guests = []
        replaced = 0
        if replace_existing:
            try:
                with transaction.atomic():
                    existing = Guest.objects.filter(event=event)
                    replaced = existing.count()
                    existing.delete()
                    created_guests = Guest.objects.bulk_create(
                        guest_objects,
                        batch_size=CHUNK,
                    )
            except Exception as exc:
                logger.error("Guest-list replacement failed: %s", exc, exc_info=True)
                upload_record.status = BulkUpload.UploadStatus.FAILED
                upload_record.error_report = [{'row': '?', 'error': str(exc)}]
                upload_record.save(update_fields=['status', 'error_report'])
                return Response(
                    {'detail': 'The replacement failed and the existing guest list was restored.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        else:
            for i in range(0, len(guest_objects), CHUNK):
                chunk = guest_objects[i:i + CHUNK]
                try:
                    inserted = Guest.objects.bulk_create(chunk, batch_size=CHUNK)
                    created_guests.extend(inserted)
                except Exception as exc:
                    logger.error("bulk_create chunk %s failed: %s", i // CHUNK, exc, exc_info=True)
                    # Fall back to individual creates so we don't lose the whole batch
                    for obj in chunk:
                        try:
                            obj.save()
                            created_guests.append(obj)
                        except Exception as row_exc:
                            error_report.append({'row': '?', 'error': str(row_exc)})

        # Queue asset generation outside the insert loop — one .delay() call per guest,
        # but only after all rows are committed so workers never race a missing row.
        from rsvp.services import sync_guest_to_workflow
        for guest in created_guests:
            sync_guest_to_workflow(guest)
            send_now = not (
                guest.scheduled_send_at and guest.scheduled_send_at > timezone.now()
            )
            generate_guest_assets.delay(str(guest.id), send_whatsapp=send_now)

        guest_ids = [str(g.id) for g in created_guests]
        upload_record.total_rows = len(valid_rows) + len(error_report)
        upload_record.successful_rows = len(guest_ids)
        upload_record.failed_rows = len(error_report)
        upload_record.error_report = error_report
        upload_record.status = BulkUpload.UploadStatus.DONE
        upload_record.save()
        return Response({
            'upload_id': upload_record.id,
            'total_rows': upload_record.total_rows,
            'successful': upload_record.successful_rows,
            'failed': upload_record.failed_rows,
            'replaced': replaced,
            'errors': error_report,
            'asset_warnings': [],
            'guest_ids': guest_ids,
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
        except ImportError:
            # zipstream-ng not installed — fall back to in-memory zip
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
