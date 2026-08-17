import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Q

from ..models import Event, Guest
from ..serializers import GuestSerializer, GuestListSerializer
from ..tasks import generate_guest_assets, send_whatsapp_pass, bulk_send_whatsapp_passes
from accounts.permissions import (
    IsAuthenticatedAnyRole,
    IsEventManagerOrAbove,
    IsCheckInStaffOrAbove,
    IsCheckInOrScanner,
)
from .guest_actions import GuestBulkExportMixin

logger = logging.getLogger(__name__)


class GuestViewSet(GuestBulkExportMixin, viewsets.ModelViewSet):
    queryset = Guest.objects.select_related('event').all().order_by('-registered_at')
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """
        scan/check_in              → scanner, check-in staff, or above
        list/retrieve/export       → check-in staff or above (scanners excluded)
        create/update/delete/bulk  → event manager or above
        """
        if self.action in ('scan', 'check_in'):
            return [IsCheckInOrScanner()]
        if self.action in ('list', 'retrieve', 'export', 'download_assets'):
            return [IsCheckInStaffOrAbove()]
        return [IsEventManagerOrAbove()]

    def get_serializer_class(self):
        if self.action == 'list':
            return GuestListSerializer
        return GuestSerializer

    ORDERING_FIELDS = {
        'name':         'full_name',
        '-name':        '-full_name',
        'registered':   'registered_at',
        '-registered':  '-registered_at',
        'checked_in':   'checked_in_at',
        '-checked_in':  '-checked_in_at',
    }

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if e := params.get('event'):
            qs = qs.filter(event_id=e)
        if search := params.get('search'):
            name_qs = qs.filter(full_name__icontains=search)
            # Only super admins may search by phone number
            if self.request.user.is_super_admin:
                qs = name_qs | qs.filter(phone_number__icontains=search)
            else:
                qs = name_qs
        if s := params.get('status'):
            qs = qs.filter(status=s)
        if t := params.get('ticket_type'):
            qs = qs.filter(ticket_type=t)
        wa_sent = params.get('wa_sent')
        if wa_sent == 'true':
            qs = qs.filter(whatsapp_sent=True)
        elif wa_sent == 'false':
            qs = qs.filter(whatsapp_sent=False)
        if params.get('has_phone') == '1':
            qs = qs.exclude(phone_number__in=['', None])
        if registered_after := params.get('registered_after'):
            qs = qs.filter(registered_at__gte=registered_after)
        if registered_before := params.get('registered_before'):
            qs = qs.filter(registered_at__lte=registered_before)
        if checked_in_after := params.get('checked_in_after'):
            qs = qs.filter(checked_in_at__gte=checked_in_after)
        if checked_in_before := params.get('checked_in_before'):
            qs = qs.filter(checked_in_at__lte=checked_in_before)
        if ordering := self.ORDERING_FIELDS.get(params.get('ordering', '')):
            qs = qs.order_by(ordering)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # Compute aggregate counts over the full filtered set (ignores pagination).
        # Re-derive the queryset from scratch to avoid composed querysets that
        # Django cannot aggregate over (e.g. union from the search OR filter).
        qs = self.get_queryset()
        agg = qs.aggregate(
            checked_in=Count('id', filter=Q(status='checked_in')),
            pending=Count('id', filter=Q(status='registered')),
            wa_sent=Count('id', filter=Q(whatsapp_sent=True)),
            wa_unsent=Count('id', filter=Q(whatsapp_sent=False)),
        )
        response.data['stats'] = agg
        return response

    def perform_create(self, serializer):
        guest = serializer.save()
        from rsvp.services import sync_guest_to_workflow
        sync_guest_to_workflow(guest)
        # If a future send time was requested, generate assets now but hold off
        # on the WhatsApp send — dispatch_scheduled_sends will pick it up later.
        send_now = not (guest.scheduled_send_at and guest.scheduled_send_at > timezone.now())
        generate_guest_assets.delay(str(guest.id), send_whatsapp=send_now)

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
        from django.utils import timezone as tz
        guest = self.get_object()
        if not guest.pass_image:
            return Response(
                {'detail': 'No pass image — regenerate assets first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        event = guest.event
        if event and event.date and event.date < tz.now():
            return Response(
                {'detail': f'"{event.name}" has already ended — passes are not sent for past events.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            send_whatsapp_pass.delay(str(guest.id))
            return Response({'queued': True, 'guest_id': str(guest.id)})
        except Exception as exc:
            logger.error("send_whatsapp error for guest %s: %s", guest.id, exc, exc_info=True)
            return Response({'queued': False, 'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        ids = request.data.get('ids')
        event_id = request.data.get('event_id')
        # ids=[] (empty list) is falsy — use explicit None check
        if ids is None and not event_id:
            return Response({'detail': 'Provide ids or event_id.'}, status=status.HTTP_400_BAD_REQUEST)
        # Scope through get_queryset() to enforce event/tenant filters
        qs = self.get_queryset()
        if ids is not None:
            if not ids:
                return Response({'deleted': 0})
            qs = qs.filter(id__in=ids)
        elif event_id:
            qs = qs.filter(event_id=event_id)
        deleted, _ = qs.delete()
        return Response({'deleted': deleted})

    @action(detail=False, methods=['post'], url_path='bulk_regenerate_assets')
    def bulk_regenerate_assets(self, request):
        event_id = request.data.get('event_id')
        if not event_id:
            return Response({'detail': 'event_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        guest_ids = list(
            Guest.objects.filter(event_id=event_id).values_list('id', flat=True)
        )
        if not guest_ids:
            return Response({'queued': 0})
        from celery import group
        job = group(
            generate_guest_assets.s(str(gid), send_whatsapp=False)
            for gid in guest_ids
        )
        job.delay()
        logger.info("bulk_regenerate_assets: queued %s guests for event %s", len(guest_ids), event_id)
        return Response({'queued': len(guest_ids), 'event_id': event_id})

    @action(detail=False, methods=['post'], url_path='bulk_send_whatsapp')
    def bulk_send_whatsapp(self, request):
        from django.utils import timezone as tz
        event_id = request.data.get('event_id')
        resend   = request.data.get('resend', False)
        if not event_id:
            return Response({'detail': 'event_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)
        if event.date and event.date < tz.now():
            return Response(
                {'detail': f'"{event.name}" has already ended — passes are not sent for past events.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = bulk_send_whatsapp_passes.delay(int(event_id), resend)
            return Response({'queued': True, 'event_id': event_id, 'task_id': result.id})
        except Exception as exc:
            logger.error("bulk_send_whatsapp error: %s", exc, exc_info=True)
            return Response({'queued': False, 'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        target = request.data.get('target', 'guest')
        if target not in {'guest', 'plus_one', 'both'}:
            return Response(
                {'detail': 'target must be guest, plus_one, or both.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            guest = Guest.objects.select_for_update().select_related('event').get(pk=pk)
            now = timezone.now()
            update_fields = []

            if target in {'guest', 'both'} and guest.status != Guest.Status.CHECKED_IN:
                guest.status = Guest.Status.CHECKED_IN
                guest.checked_in_at = now
                update_fields.extend(['status', 'checked_in_at'])
            elif target == 'guest':
                return Response(
                    {'detail': 'Guest already checked in.', 'checked_in_at': guest.checked_in_at},
                    status=status.HTTP_409_CONFLICT,
                )

            if target in {'plus_one', 'both'}:
                if not guest.plus_one_attending:
                    return Response(
                        {'detail': 'This guest does not have a plus-one.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if not guest.plus_one_checked_in:
                    guest.plus_one_checked_in = True
                    guest.plus_one_checked_in_at = now
                    update_fields.extend(['plus_one_checked_in', 'plus_one_checked_in_at'])
                elif target == 'plus_one':
                    return Response(
                        {
                            'detail': 'Plus-one already checked in.',
                            'plus_one_checked_in_at': guest.plus_one_checked_in_at,
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

            if not update_fields:
                return Response(
                    {'detail': 'Guest and plus-one are already checked in.'},
                    status=status.HTTP_409_CONFLICT,
                )
            guest.save(update_fields=update_fields)
        return Response(GuestSerializer(guest, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='send_message')
    def send_message(self, request, pk=None):
        """
        Send a free-form text message to a guest.
        Only works within the 24-hour session window after the guest
        has messaged the business number first.
        """
        from django.conf import settings as django_settings
        guest = self.get_object()
        message = request.data.get('message', '').strip()
        if not message:
            return Response({'detail': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not guest.phone_number:
            return Response({'detail': 'Guest has no phone number.'}, status=status.HTTP_400_BAD_REQUEST)
        if not django_settings.WHATSAPP_PHONE_ID or not django_settings.WHATSAPP_TOKEN:
            return Response(
                {'detail': 'WhatsApp is not configured on this server. Add WHATSAPP_PHONE_ID and WHATSAPP_TOKEN to your environment.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        from ..whatsapp import send_message as wa_send_message
        sent = wa_send_message(guest.phone_number, message)
        if not sent:
            return Response(
                {'detail': 'Message not sent. The guest must message your WhatsApp business number first to open a 24-hour session window.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'sent': True})

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
