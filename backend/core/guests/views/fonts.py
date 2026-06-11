from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from ..models import Font
from ..serializers import FontSerializer
from accounts.permissions import IsEventManagerOrAbove


class FontViewSet(viewsets.ModelViewSet):
    queryset = Font.objects.all().order_by('name')
    serializer_class = FontSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsEventManagerOrAbove]
