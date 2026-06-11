import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from accounts.permissions import IsEventManagerOrAbove

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsEventManagerOrAbove])
def whatsapp_test_send(request):
    """
    Send a test WhatsApp template message directly to any phone number.
    Body: { "phone": "2348012345678", "name": "Test Guest", "event": "Test Event" }
    """
    phone = request.data.get('phone', '').strip()
    name  = request.data.get('name', 'Test Guest').strip()
    event = request.data.get('event', 'Test Event').strip()

    if not phone:
        return Response({'detail': 'phone is required.'}, status=status.HTTP_400_BAD_REQUEST)

    from ..whatsapp import _get_client, _normalise_phone
    from django.conf import settings

    try:
        from pywa.types.templates import HeaderImage, BodyText, TemplateLanguage

        phone_normalised = _normalise_phone(phone)
        wa = _get_client()
        wa.send_template(
            to=phone_normalised,
            name=settings.WHATSAPP_PASS_TEMPLATE,
            language=TemplateLanguage.ENGLISH,
            params=[
                BodyText.params(name, event),
            ],
        )
        logger.info("Test WhatsApp sent to %s", phone_normalised)
        return Response({'sent': True, 'to': phone_normalised})

    except Exception as exc:
        logger.error("Test WhatsApp send failed: %s", exc, exc_info=True)
        return Response({'sent': False, 'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
