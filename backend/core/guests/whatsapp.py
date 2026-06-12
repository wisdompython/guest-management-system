import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy client — only initialised when first used so the app starts fine even
# if the WhatsApp env vars are not configured yet.
# ---------------------------------------------------------------------------
_client = None


def _get_client():
    global _client
    if _client is None:
        from pywa import WhatsApp
        _client = WhatsApp(
            phone_id=settings.WHATSAPP_PHONE_ID,
            token=settings.WHATSAPP_TOKEN,
            app_id=settings.WHATSAPP_APP_ID,
            app_secret=settings.WHATSAPP_APP_SECRET,
        )
    return _client


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def send_pass(guest) -> bool:
    """
    Send the guest's branded pass via WhatsApp using the approved template.
    Returns True on success, False on failure (logs the error).
    """
    if not settings.WHATSAPP_PHONE_ID or not settings.WHATSAPP_TOKEN:
        logger.warning("WhatsApp not configured — skipping send for guest %s", guest.id)
        return False

    if not guest.phone_number:
        logger.warning("Guest %s has no phone number — skipping WhatsApp send", guest.id)
        return False

    # Pass image must be publicly accessible for Meta to fetch it
    if not guest.pass_image:
        logger.warning("Guest %s has no pass image — skipping WhatsApp send", guest.id)
        return False

    try:
        from pywa.types.templates import HeaderImage, BodyText, TemplateLanguage

        phone = _normalise_phone(guest.phone_number)
        pass_url = _build_pass_url(guest)
        event_name = guest.event.name if guest.event else 'the event'

        if not pass_url or 'localhost' in pass_url or '127.0.0.1' in pass_url:
            logger.error("Pass URL is not publicly accessible for guest %s: %s", guest.id, pass_url)
            return False

        logger.info("Sending WhatsApp to %s | pass_url=%s", phone, pass_url)

        wa = _get_client()
        wa.send_template(
            to=phone,
            name=settings.WHATSAPP_PASS_TEMPLATE,
            language=TemplateLanguage.ENGLISH,
            params=[
                HeaderImage.params(image=pass_url),
                BodyText.params(guest.full_name, event_name),
            ],
        )
        logger.info("WhatsApp pass sent to guest %s (%s)", guest.id, phone)
        return True

    except Exception as exc:
        logger.error("WhatsApp send failed for guest %s: %s", guest.id, exc, exc_info=True)
        return False


def _resolve_template_params(guest, body_params: list) -> list:
    """Resolve ordered variable keys to actual guest/event values."""
    event = guest.event
    event_date = ''
    if event and event.date:
        event_date = event.date.strftime('%A, %d %B %Y at %I:%M %p')

    var_map = {
        'guest_name':   guest.full_name or '',
        'event_name':   event.name if event else '',
        'event_date':   event_date,
        'venue':        event.venue if event else '',
        'ticket_type':  guest.get_ticket_type_display() if hasattr(guest, 'get_ticket_type_display') else (guest.ticket_type or ''),
        'table_number': guest.table_number or '',
        'seat_number':  guest.seat_number or '',
    }
    return [var_map.get(key, '') for key in body_params]


def send_reminder(guest, template_name: str) -> bool:
    """Send a reminder WhatsApp template message to a guest."""
    if not settings.WHATSAPP_PHONE_ID or not settings.WHATSAPP_TOKEN:
        logger.warning("WhatsApp not configured — skipping reminder for guest %s", guest.id)
        return False

    if not guest.phone_number:
        return False

    try:
        from pywa.types.templates import BodyText, HeaderImage, TemplateLanguage
        from .models import WhatsAppTemplate

        phone = _normalise_phone(guest.phone_number)

        # Look up registered template config for param mapping
        try:
            tmpl = WhatsAppTemplate.objects.get(name=template_name, is_active=True)
            body_param_values = _resolve_template_params(guest, tmpl.body_params or [])
            has_header_image = tmpl.has_header_image
        except WhatsAppTemplate.DoesNotExist:
            # Fallback: default param order for unregistered templates
            event = guest.event
            event_date = event.date.strftime('%A, %d %B %Y at %I:%M %p') if (event and event.date) else ''
            body_param_values = [guest.full_name, event.name if event else '', event_date]
            has_header_image = False

        params = []
        if has_header_image:
            pass_url = _build_pass_url(guest)
            if pass_url:
                params.append(HeaderImage.params(image=pass_url))

        if body_param_values:
            params.append(BodyText.params(*body_param_values))

        wa = _get_client()
        wa.send_template(
            to=phone,
            name=template_name,
            language=TemplateLanguage.ENGLISH,
            params=params,
        )
        logger.info("Reminder sent to guest %s via template %s", guest.id, template_name)
        return True

    except Exception as exc:
        logger.error("Reminder send failed for guest %s: %s", guest.id, exc, exc_info=True)
        return False


def send_message(phone_number: str, message: str) -> bool:
    """
    Send a free-form text message to a phone number.
    Only works within the 24-hour session window after the recipient
    has messaged the business number first.
    Returns True on success, False on failure.
    """
    if not settings.WHATSAPP_PHONE_ID or not settings.WHATSAPP_TOKEN:
        logger.warning("WhatsApp not configured — skipping free-form send")
        return False

    if not phone_number or not message.strip():
        logger.warning("send_message: missing phone or message")
        return False

    try:
        phone = _normalise_phone(phone_number)
        wa = _get_client()
        wa.send_message(to=phone, text=message)
        logger.info("WhatsApp free-form message sent to %s", phone)
        return True
    except Exception as exc:
        logger.error("WhatsApp free-form send failed to %s: %s", phone_number, exc, exc_info=True)
        return False


def _normalise_phone(phone: str) -> str:
    """Strip spaces/dashes and ensure international format (no leading +)."""
    cleaned = phone.strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    if cleaned.startswith('+'):
        cleaned = cleaned[1:]
    # Convert local Nigerian 0XXXXXXXXXX → 234XXXXXXXXXX
    if cleaned.startswith('0') and len(cleaned) == 11:
        cleaned = '234' + cleaned[1:]
    return cleaned


def _build_pass_url(guest) -> str:
    """Build the absolute public URL for the guest's pass image."""
    base = settings.WHATSAPP_MEDIA_BASE_URL if hasattr(settings, 'WHATSAPP_MEDIA_BASE_URL') else ''
    if not base:
        # Fallback: construct from ALLOWED_HOSTS + MEDIA_URL
        host = settings.ALLOWED_HOSTS[0] if settings.ALLOWED_HOSTS else 'localhost:8000'
        scheme = 'https' if not settings.DEBUG else 'http'
        base = f"{scheme}://{host}"
    return f"{base}{settings.MEDIA_URL}{guest.pass_image.name}"
