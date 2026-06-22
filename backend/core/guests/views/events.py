from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from ..models import Event
from ..serializers import EventSerializer
from accounts.permissions import ReadOnlyOrEventManager


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [ReadOnlyOrEventManager]

    def get_queryset(self):
        return (
            Event.objects
            .select_related('name_font', 'whatsapp_template')
            .annotate(
                guest_count_ann=Count('guests', distinct=True),
                checked_in_count_ann=Count(
                    'guests', filter=Q(guests__status='checked_in'), distinct=True
                ),
            )
            .order_by('-date')
        )
