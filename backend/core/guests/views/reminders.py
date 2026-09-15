from django.db.models.deletion import ProtectedError
from rest_framework import status, viewsets, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from ..models import EventReminder, ReminderLog, WhatsAppTemplate, TemplateCategory
from accounts.permissions import IsEventManagerOrAbove


class EventReminderSerializer(serializers.ModelSerializer):
    logs_sent = serializers.SerializerMethodField()
    includes_event_pass = serializers.SerializerMethodField()

    class Meta:
        model = EventReminder
        fields = [
            'id', 'event', 'hours_before', 'template_name', 'is_active',
            'created_at', 'logs_sent', 'includes_event_pass',
        ]
        read_only_fields = ['id', 'created_at', 'logs_sent', 'includes_event_pass']

    def get_logs_sent(self, obj):
        return sum(1 for log in obj.logs.all() if log.success)

    def get_includes_event_pass(self, obj):
        return WhatsAppTemplate.objects.filter(
            name=obj.template_name,
            is_active=True,
            has_header_image=True,
        ).exists()


class EventReminderViewSet(viewsets.ModelViewSet):
    serializer_class = EventReminderSerializer
    permission_classes = [IsEventManagerOrAbove]

    def get_queryset(self):
        qs = EventReminder.objects.select_related('event').prefetch_related('logs')
        event_id = self.request.query_params.get('event')
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

    @action(detail=True, methods=['post'], url_path='send_now')
    def send_now(self, request, pk=None):
        """Manually trigger a reminder for all eligible guests immediately."""
        from ..tasks import send_reminder
        from rsvp.services import confirmed_reminder_guest_ids
        reminder = self.get_object()

        already_sent = ReminderLog.objects.filter(
            reminder=reminder,
            success=True,
        ).values_list('guest_id', flat=True)

        guests = (
            reminder.event.guests
            .exclude(pk__in=already_sent)
            .exclude(phone_number='')
        )
        confirmed_guest_ids = confirmed_reminder_guest_ids(reminder.event_id)
        if confirmed_guest_ids is not None:
            guests = guests.filter(pk__in=confirmed_guest_ids)

        queued = 0
        for guest_id in guests.values_list('id', flat=True):
            send_reminder.delay(reminder.id, str(guest_id))
            queued += 1

        return Response({'queued': queued})


AVAILABLE_VARS = [
    {'key': key, 'label': label}
    for key, label in WhatsAppTemplate.AVAILABLE_VARS
]


class TemplateCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateCategory
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']


class WhatsAppTemplateSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = WhatsAppTemplate
        fields = ['id', 'name', 'display_name', 'description', 'category', 'category_name',
                  'body_text', 'body_params', 'has_header_image', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at', 'category_name']


class AvailableVarsView(APIView):
    permission_classes = [IsEventManagerOrAbove]

    def get(self, request):
        return Response(AVAILABLE_VARS)


class TemplateSimulationView(APIView):
    """Render a template against a real event and guest, exactly as a send would.

    The template builder's static preview uses invented sample values, so it
    cannot show what a specific event will actually produce — nor catch a
    template that references a location the event does not have. This runs the
    same resolver the send path uses and reports the same blocking errors,
    letting an operator verify a template before any message is queued.
    """

    permission_classes = [IsEventManagerOrAbove]

    def post(self, request):
        from ..models import Event, Guest
        from ..whatsapp import (
            _resolve_template_params,
            describe_missing_params,
            missing_template_params,
        )

        body_text = request.data.get('body_text') or ''
        body_params = request.data.get('body_params') or []
        if not isinstance(body_params, list):
            return Response(
                {'detail': 'body_params must be a list.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_id = request.data.get('event')
        if not event_id:
            return Response(
                {'detail': 'Choose an event to simulate against.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            event = Event.objects.prefetch_related('locations').get(pk=event_id)
        except (Event.DoesNotExist, ValueError, TypeError):
            return Response(
                {'detail': 'That event could not be found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # A specific guest can be requested; otherwise use any real guest from
        # the event so the preview reflects genuine data rather than invention.
        guest_id = request.data.get('guest')
        guest_qs = Guest.objects.filter(event=event).select_related('event')
        guest = None
        if guest_id:
            guest = guest_qs.filter(pk=guest_id).first()
            if guest is None:
                return Response(
                    {'detail': 'That guest is not on the selected event.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            guest = guest_qs.order_by('registered_at').first()

        if guest is None:
            return Response({
                'detail': (
                    'This event has no guests yet, so there is nothing to '
                    'preview with. Add a guest, then try again.'
                ),
            }, status=status.HTTP_400_BAD_REQUEST)

        values = _resolve_template_params(guest, body_params)
        missing = missing_template_params(body_params, values)

        rendered = body_text
        for index, value in enumerate(values, start=1):
            rendered = rendered.replace(f'{{{{{index}}}}}', value or f'[{body_params[index - 1]}]')

        placeholders = _max_placeholder(body_text)
        problems = []
        if placeholders != len(body_params):
            problems.append(
                f'The message body has {placeholders} placeholder'
                f'{"" if placeholders == 1 else "s"} but {len(body_params)} '
                f'variable{"" if len(body_params) == 1 else "s"} are selected. '
                'These must match.'
            )
        if missing:
            problems.append(describe_missing_params(event, missing))

        return Response({
            'rendered': rendered,
            'would_send': not problems,
            'problems': problems,
            'missing_params': missing,
            'event': {
                'id': event.id,
                'name': event.name,
                'location_count': event.locations.count(),
            },
            'guest': {'id': str(guest.id), 'full_name': guest.full_name},
            'resolved': [
                {'key': key, 'value': value}
                for key, value in zip(body_params, values)
            ],
        })


def _max_placeholder(body_text: str) -> int:
    """Highest {{n}} used in the body, matching the builder's own counting."""
    import re

    numbers = [int(match) for match in re.findall(r'\{\{(\d+)\}\}', body_text or '')]
    return max(numbers) if numbers else 0



class TemplateCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = TemplateCategorySerializer
    permission_classes = [IsEventManagerOrAbove]
    queryset = TemplateCategory.objects.all()
    pagination_class = None  # small list, no pagination needed


class WhatsAppTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = WhatsAppTemplateSerializer
    permission_classes = [IsEventManagerOrAbove]

    def get_queryset(self):
        qs = WhatsAppTemplate.objects.select_related('category').all()
        if self.request.query_params.get('active_only') == '1':
            qs = qs.filter(is_active=True)
        if cat := self.request.query_params.get('category'):
            qs = qs.filter(category_id=cat)
        return qs

    def destroy(self, request, *args, **kwargs):
        template = self.get_object()
        if (
            template.events.exists()
            or template.rsvp_invitation_workflows.exists()
            or template.rsvp_pass_workflows.exists()
        ):
            return Response(
                {
                    'detail': (
                        'This template is currently used by an event or RSVP workflow. '
                        'Choose another template there before deleting it.'
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )
        try:
            template.delete()
        except ProtectedError:
            return Response(
                {
                    'detail': (
                        'This template is currently used by an event or RSVP workflow. '
                        'Choose another template there before deleting it.'
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
