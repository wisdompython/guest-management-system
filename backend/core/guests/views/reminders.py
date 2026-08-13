from django.db.models.deletion import ProtectedError
from rest_framework import status, viewsets, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from ..models import EventReminder, ReminderLog, WhatsAppTemplate, TemplateCategory
from accounts.permissions import IsEventManagerOrAbove


class EventReminderSerializer(serializers.ModelSerializer):
    logs_sent = serializers.SerializerMethodField()

    class Meta:
        model = EventReminder
        fields = ['id', 'event', 'hours_before', 'template_name', 'is_active', 'created_at', 'logs_sent']
        read_only_fields = ['id', 'created_at', 'logs_sent']

    def get_logs_sent(self, obj):
        return sum(1 for log in obj.logs.all() if log.success)


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
        reminder = self.get_object()

        already_sent = ReminderLog.objects.filter(
            reminder=reminder,
            success=True,
        ).values_list('guest_id', flat=True)

        guests = (
            reminder.event.guests
            .exclude(pk__in=already_sent)
            .exclude(phone_number='')
            .values_list('id', flat=True)
        )

        queued = 0
        for guest_id in guests:
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
