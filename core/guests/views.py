import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone

from .models import Event, Guest, BulkUpload
from .serializers import (
    EventSerializer, GuestSerializer, GuestListSerializer,
    BulkGuestUploadSerializer, BulkUploadSerializer,
)
from .utils import generate_qr_code, generate_pass_image

logger = logging.getLogger(__name__)


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('-date')
    serializer_class = EventSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class GuestViewSet(viewsets.ModelViewSet):
    queryset = Guest.objects.select_related('event').all().order_by('-registered_at')
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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
        """Generate QR and pass image. Returns dict with per-asset success flags."""
        results = {'qr': False, 'pass': False}
        results['qr'] = generate_qr_code(guest)
        if not results['qr']:
            logger.warning("QR generation skipped or failed for guest %s", guest.id)
        # Refresh from DB so pass generation can find the newly saved qr_code path
        guest.refresh_from_db(fields=['qr_code'])
        if guest.event and guest.event.design_template and guest.qr_code:
            results['pass'] = generate_pass_image(guest)
            if not results['pass']:
                logger.warning("Pass generation failed for guest %s", guest.id)
        return results

    @action(detail=True, methods=['post'], url_path='regenerate_assets')
    def regenerate_assets(self, request, pk=None):
        """Manually retry QR + pass generation for a guest (e.g. after template upload)."""
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

        # Support both legacy plain-UUID tokens and the current structured payload:
        # "EVENT: ...\nGUEST: ...\nID: <uuid>"
        guest_id = token.strip()
        if '\n' in guest_id:
            for line in guest_id.splitlines():
                if line.startswith('ID:'):
                    guest_id = line.split('ID:', 1)[1].strip()
                    break

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
            uploaded_by=None,
            status=BulkUpload.UploadStatus.PROCESSING,
        )

        valid_rows, error_report = serializer.parse()

        # TODO: move asset generation into a background task (Celery/Django-Q) for large batches.
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
