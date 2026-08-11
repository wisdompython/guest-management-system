import json
import logging
import hashlib
import hmac
from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(['GET', 'POST'])
def whatsapp_webhook(request):
    """
    GET  — Meta webhook verification challenge
    POST — Incoming status updates and messages from Meta
    """
    if request.method == 'GET':
        return _verify(request)
    return _handle(request)


def _verify(request):
    mode      = request.GET.get('hub.mode')
    token     = request.GET.get('hub.verify_token')
    challenge = request.GET.get('hub.challenge')

    if mode == 'subscribe' and token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified")
        return HttpResponse(challenge, content_type='text/plain')

    logger.warning("WhatsApp webhook verification failed — bad token")
    return HttpResponseForbidden("Forbidden")


def _handle(request):
    if not _valid_signature(request):
        logger.warning("WhatsApp webhook rejected — invalid POST signature")
        return HttpResponseForbidden("Forbidden")

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        logger.warning("WhatsApp webhook received invalid JSON")
        return HttpResponse(status=400)

    logger.info("WhatsApp webhook payload: %s", json.dumps(payload))

    for entry in payload.get('entry', []):
        for change in entry.get('changes', []):
            value = change.get('value', {})
            _process_statuses(value.get('statuses', []))
            _process_messages(value.get('messages', []))

    return HttpResponse(status=200)


def _valid_signature(request):
    """Validate Meta's X-Hub-Signature-256 when an app secret is configured."""
    app_secret = getattr(settings, 'WHATSAPP_APP_SECRET', '')
    if not app_secret:
        logger.warning("WHATSAPP_APP_SECRET is empty — webhook signature validation is disabled")
        return True

    received = request.headers.get('X-Hub-Signature-256', '')
    expected = 'sha256=' + hmac.new(
        app_secret.encode('utf-8'),
        request.body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(received, expected)


def _process_messages(messages: list):
    """Log incoming messages from guests."""
    for msg in messages:
        from rsvp.services import process_incoming_message
        if process_incoming_message(msg):
            logger.info("Processed RSVP WhatsApp response %s", msg.get('id'))
            continue

        from_number = msg.get('from')
        msg_type    = msg.get('type')
        body        = msg.get('text', {}).get('body', '') if msg_type == 'text' else f'[{msg_type}]'
        logger.info("Incoming WhatsApp from %s: %s", from_number, body)


def _process_statuses(statuses: list):
    from .models import Guest

    for s in statuses:
        from rsvp.services import process_status_update
        if process_status_update(s):
            continue

        wa_status = s.get('status')
        recipient = s.get('recipient_id')

        logger.info("WhatsApp status update: %s for %s", wa_status, recipient)

        if wa_status not in ('delivered', 'read', 'failed'):
            continue

        if not recipient:
            continue

        try:
            guest = Guest.objects.get(phone_number__icontains=recipient[-9:])
        except (Guest.DoesNotExist, Guest.MultipleObjectsReturned):
            logger.warning("No unique guest match for WhatsApp status %s / %s", wa_status, recipient)
            continue

        if wa_status in ('delivered', 'read') and not guest.whatsapp_sent:
            Guest.objects.filter(pk=guest.pk).update(
                whatsapp_sent=True,
                whatsapp_sent_at=timezone.now(),
            )
            logger.info("WhatsApp delivered to guest %s", guest.id)

        elif wa_status == 'failed':
            logger.warning("WhatsApp delivery failed for guest %s (%s)", guest.id, recipient)
