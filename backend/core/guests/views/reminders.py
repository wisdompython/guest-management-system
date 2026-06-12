from rest_framework import viewsets, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from ..models import EventReminder, ReminderLog, WhatsAppTemplate
from accounts.permissions import IsEventManagerOrAbove


class EventReminderSerializer(serializers.ModelSerializer):
    logs_sent = serializers.SerializerMethodField()

    class Meta:
        model = EventReminder
        fields = ['id', 'event', 'hours_before', 'template_name', 'is_active', 'created_at', 'logs_sent']
        read_only_fields = ['id', 'created_at', 'logs_sent']

    def get_logs_sent(self, obj):
        return obj.logs.filter(success=True).count()


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
            reminder=reminder
        ).values_list('guest_id', flat=True)

        guests = (
            reminder.event.guests
            .exclude(pk__in=already_sent)
            .exclude(phone_number='')
            .values_list('id', flat=True)
        )

        queued = 0
        for i, guest_id in enumerate(guests):
            send_reminder.apply_async(
                args=[reminder.id, str(guest_id)],
                countdown=i * 3,
            )
            queued += 1

        return Response({'queued': queued})


class WhatsAppTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppTemplate
        fields = ['id', 'name', 'display_name', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class WhatsAppTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = WhatsAppTemplateSerializer
    permission_classes = [IsEventManagerOrAbove]

    def get_queryset(self):
        qs = WhatsAppTemplate.objects.all().order_by('display_name', 'name')
        if self.request.query_params.get('active_only') == '1':
            qs = qs.filter(is_active=True)
        return qs
