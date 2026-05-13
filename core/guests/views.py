import csv
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import StreamingHttpResponse
from django.utils import timezone

from .models import Event, Guest, BulkUpload, Font
from .serializers import (
    EventSerializer, GuestSerializer, GuestListSerializer,
    BulkGuestUploadSerializer, BulkUploadSerializer, FontSerializer,
)
from .utils import generate_qr_code, generate_pass_image
from accounts.permissions import (
    IsAuthenticatedAnyRole,
    IsEventManagerOrAbove,
    IsCheckInStaffOrAbove,
    ReadOnlyOrEventManager,
)

logger = logging.getLogger(__name__)


class FontViewSet(viewsets.ModelViewSet):
    queryset = Font.objects.all().order_by('name')
    serializer_class = FontSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsEventManagerOrAbove]


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('-date')
    serializer_class = EventSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [ReadOnlyOrEventManager]


class GuestViewSet(viewsets.ModelViewSet):
    queryset = Guest.objects.select_related('event').all().order_by('-registered_at')
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        list/retrieve/scan/export  → any authenticated user
        check_in                   → check-in staff or above
        create/update/delete/bulk  → event manager or above
        """
        if self.action in ('list', 'retrieve', 'scan', 'export'):
            return [IsAuthenticatedAnyRole()]
        if self.action == 'check_in':
            return [IsCheckInStaffOrAbove()]
        return [IsEventManagerOrAbove()]

    def get_serializer_class(self):
        if self.action == 'list':
            return GuestListSerializer
        return GuestSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if search := params.get('search'):
            qs = qs.filter(full_name__icontains=search) | qs.filter(phone_number__icontains=search)
        if s := params.get('status'):
            qs = qs.filter(status=s)
        if t := params.get('ticket_type'):
            qs = qs.filter(ticket_type=t)
        return qs

    def perform_create(self, serializer):
        guest = serializer.save()
        self._generate_assets(guest)

    def _generate_assets(self, guest) -> dict:
        results = {'qr': False, 'pass': False}
        results['qr'] = generate_qr_code(guest)
        if not results['qr']:
            logger.warning("QR generation skipped or failed for guest %s", guest.id)
        guest.refresh_from_db(fields=['qr_code'])
        if guest.event and guest.event.design_template and guest.qr_code:
            results['pass'] = generate_pass_image(guest)
            if not results['pass']:
                logger.warning("Pass generation failed for guest %s", guest.id)
        return results

    @action(detail=True, methods=['post'], url_path='regenerate_assets')
    def regenerate_assets(self, request, pk=None):
        guest = self.get_object()
        results = self._generate_assets(guest)
        guest.refresh_from_db()
        return Response({
            'qr_generated': results['qr'],
            'pass_generated': results['pass'],
            'guest': GuestSerializer(guest).data,
        })

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        guest = self.get_object()
        if guest.status == Guest.Status.CHECKED_IN:
            return Response(
                {'detail': 'Guest already checked in.', 'checked_in_at': guest.checked_in_at},
                status=status.HTTP_409_CONFLICT,
            )
        guest.status = Guest.Status.CHECKED_IN
        guest.checked_in_at = timezone.now()
        guest.save(update_fields=['status', 'checked_in_at'])
        return Response(GuestSerializer(guest).data)

    @action(detail=False, methods=['get'])
    def scan(self, request):
        token = request.query_params.get('token')
        if not token:
            return Response({'detail': 'token required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Support both "uuid|name|event|ticket" and plain uuid
        raw = token.strip()
        guest_id = raw.split('|')[0] if '|' in raw else raw

        try:
            guest = Guest.objects.select_related('event').get(id=guest_id)
        except (Guest.DoesNotExist, ValueError):
            return Response({'detail': 'Invalid QR code.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(GuestSerializer(guest).data)

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

            results = self._generate_assets(guest)
            created_guests.append(str(guest.id))
            if not results['qr'] or not results['pass']:
                asset_failures.append({
                    'guest_id': str(guest.id),
                    'name': guest.full_name,
                    'qr': results['qr'],
                    'pass': results['pass'],
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
