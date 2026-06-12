import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone

from ..models import Guest
from ..serializers import GuestSerializer, GuestListSerializer
from ..tasks import generate_guest_assets, send_whatsapp_pass, bulk_send_whatsapp_passes
from accounts.permissions import (
    IsAuthenticatedAnyRole,
    IsEventManagerOrAbove,
    IsCheckInStaffOrAbove,
)
from .guest_actions import GuestBulkExportMixin

logger = logging.getLogger(__name__)


class GuestViewSet(GuestBulkExportMixin, viewsets.ModelViewSet):
    queryset = Guest.objects.select_related('event').all().order_by('-registered_at')
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        list/retrieve/scan/export  → any authenticated user
        check_in                   → check-in staff or above
        create/update/delete/bulk  → event manager or above
        """
        if self.action in ('list', 'retrieve', 'scan', 'export', 'download_assets'):
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
        # Dispatch asset generation + WhatsApp send to background worker
        generate_guest_assets.delay(str(guest.id), send_whatsapp=True)

    @action(detail=True, methods=['post'], url_path='regenerate_assets')
    def regenerate_assets(self, request, pk=None):
        guest = self.get_object()
        try:
            generate_guest_assets.delay(str(guest.id), send_whatsapp=True)
            return Response({'queued': True, 'guest_id': str(guest.id)})
        except Exception as exc:
            logger.error("regenerate_assets error for guest %s: %s", guest.id, exc, exc_info=True)
            return Response({'queued': False, 'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='send_whatsapp')
    def send_whatsapp(self, request, pk=None):
        guest = self.get_object()
        if not guest.pass_image:
            return Response(
                {'detail': 'No pass image — regenerate assets first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            send_whatsapp_pass.delay(str(guest.id))
            return Response({'queued': True, 'guest_id': str(guest.id)})
        except Exception as exc:
            logger.error("send_whatsapp error for guest %s: %s", guest.id, exc, exc_info=True)
            return Response({'queued': False, 'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='bulk_send_whatsapp')
    def bulk_send_whatsapp(self, request):
        event_id = request.data.get('event_id')
        resend   = request.data.get('resend', False)
        if not event_id:
            return Response({'detail': 'event_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = bulk_send_whatsapp_passes.delay(int(event_id), resend)
            return Response({'queued': True, 'event_id': event_id, 'task_id': result.id})
        except Exception as exc:
            logger.error("bulk_send_whatsapp error: %s", exc, exc_info=True)
            return Response({'queued': False, 'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

    @action(detail=True, methods=['post'], url_path='send_message')
    def send_message(self, request, pk=None):
        """
        Send a free-form text message to a guest.
        Only works within the 24-hour session window after the guest
        has messaged the business number first.
        """
        guest = self.get_object()
        message = request.data.get('message', '').strip()
        if not message:
            return Response({'detail': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not guest.phone_number:
            return Response({'detail': 'Guest has no phone number.'}, status=status.HTTP_400_BAD_REQUEST)
        from ..whatsapp import send_message as wa_send_message
        sent = wa_send_message(guest.phone_number, message)
        return Response({'sent': sent})

    @action(detail=False, methods=['get'])
    def scan(self, request):
        token = request.query_params.get('token')
        if not token:
            return Response({'detail': 'token required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Support full URL, plain uuid, or legacy "uuid|name|event|ticket"
        raw = token.strip()
        if raw.startswith('http'):
            raw = raw.rstrip('/').split('/')[-1]
        guest_id = raw.split('|')[0] if '|' in raw else raw

        try:
            guest = Guest.objects.select_related('event').get(id=guest_id)
        except (Guest.DoesNotExist, ValueError):
            return Response({'detail': 'Invalid QR code.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(GuestSerializer(guest).data)
