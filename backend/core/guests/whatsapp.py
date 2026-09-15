import logging
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify

logger = logging.getLogger(__name__)


def build_preferences_url(guest) -> str:
    event_slug = slugify(guest.event.name)[:48] if guest.event else 'event'
    guest_slug = slugify(guest.full_name)[:40] or 'guest'
    return (
        f"{settings.SITE_URL.rstrip('/')}/preferences/"
        f"{event_slug or 'event'}-{guest_slug}-{guest.preference_token}"
    )

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

    # Don't send passes for events that have already ended
    from django.utils import timezone as tz
    event = guest.event
    if event and event.date and event.date < tz.now():
        logger.warning(
            "Event '%s' has passed — skipping WhatsApp pass for guest %s",
            event.name, guest.id,
        )
        return False

    try:
        from pywa.types.templates import HeaderImage, BodyText, TemplateLanguage

        phone = _normalise_phone(guest.phone_number)
        pass_url = _build_pass_url(guest)

        if not pass_url or 'localhost' in pass_url or '127.0.0.1' in pass_url:
            logger.error("Pass URL is not publicly accessible for guest %s: %s", guest.id, pass_url)
            return False

        # Resolve template: event override → global default
        event = guest.event
        tmpl = event.whatsapp_template if (event and event.whatsapp_template_id) else None

        if tmpl:
            template_name = tmpl.name
            body_param_values = _resolve_template_params(guest, tmpl.body_params or [])
            missing = missing_template_params(tmpl.body_params or [], body_param_values)
            if missing:
                logger.error(
                    'Template %s has unresolved variables %s for guest %s — not sending',
                    tmpl.name, missing, guest.id,
                )
                raise ValueError(describe_missing_params(event, missing))
            has_header_image = tmpl.has_header_image
        else:
            # Fall back to global default — image header + guest_name + event_name
            template_name = settings.WHATSAPP_PASS_TEMPLATE
            event_name = event.name if event else 'the event'
            body_param_values = [guest.full_name, event_name]
            has_header_image = True

        params = []
        if has_header_image:
            params.append(HeaderImage.params(image=pass_url))
        if body_param_values:
            params.append(BodyText.params(*body_param_values))

        logger.info("Sending WhatsApp to %s | template=%s | pass_url=%s", phone, template_name, pass_url)

        wa = _get_client()
        wa.send_template(to=phone, name=template_name, language=TemplateLanguage.ENGLISH, params=params)
        logger.info("WhatsApp pass sent to guest %s (%s)", guest.id, phone)
        return True

    except ValueError:
        # Template configuration this send can never satisfy (e.g. it references
        # a location the event does not have). Propagate so the caller can
        # surface the explanation instead of a generic failure.
        raise
    except Exception as exc:
        # Let WhatsAppError propagate so callers (e.g. send_whatsapp_pass) can
        # tell transient failures (worth retrying) from permanent ones.
        from pywa.errors import WhatsAppError
        if isinstance(exc, WhatsAppError):
            raise
        logger.error("WhatsApp send failed for guest %s: %s", guest.id, exc, exc_info=True)
        return False


def _resolve_template_params(guest, body_params: list) -> list:
    """Resolve ordered variable keys to actual guest/event values."""
    event = guest.event
    event_date = ''
    event_date_only = ''
    event_time = ''
    if event and event.date:
        local_event_date = timezone.localtime(event.date)
        event_date = local_event_date.strftime('%A, %d %B %Y at %I:%M %p')
        event_date_only = _format_ordinal_date(event.date)
        event_time = local_event_date.strftime('%I:%M %p').lstrip('0')

    var_map = {
        'guest_name':   guest.full_name or '',
        'event_name':   event.name if event else '',
        'event_date':   event_date,
        'event_date_only': event_date_only,
        'event_time':   event_time,
        'venue':        event.venue if event else '',
        'ticket_type':  guest.get_ticket_type_display() if hasattr(guest, 'get_ticket_type_display') else (guest.ticket_type or ''),
        'table_number': guest.table_number or '',
        'seat_number':  guest.seat_number or '',
        'preferences_link': build_preferences_url(guest),
    }
    var_map.update(_resolve_location_params(event))
    return [var_map.get(key, '') for key in body_params]


def _resolve_location_params(event) -> dict:
    """Map location_N_* keys to this event's ordered locations.

    Slots beyond the event's location count are simply absent from the map, so
    they resolve to '' like any unknown key. ``missing_template_params`` is what
    stops such a send from reaching Meta.
    """
    if not event:
        return {}
    values = {}
    for index, location in enumerate(event.locations.all(), start=1):
        local_start = timezone.localtime(location.starts_at)
        values[f'location_{index}_title'] = location.title
        values[f'location_{index}_venue'] = location.venue
        values[f'location_{index}_datetime'] = local_start.strftime('%A, %d %B %Y at %I:%M %p')
        values[f'location_{index}_date'] = _format_ordinal_date(location.starts_at)
        values[f'location_{index}_time'] = local_start.strftime('%I:%M %p').lstrip('0')
    return values


def missing_template_params(body_params: list, values: list) -> list:
    """Return the variable keys that resolved to nothing.

    Meta rejects a template send whose body parameter is an empty string, and
    ``send_whatsapp_pass`` treats that rejection as permanent — so a template
    referencing a location the event does not have would strand every guest on
    that event. Callers check this before hitting the API and fail with an
    explanatory message instead.
    """
    return [
        key for key, value in zip(body_params, values)
        if not str(value or '').strip()
    ]


def describe_missing_params(event, missing: list) -> str:
    """Build an operator-facing explanation for unresolved template variables."""
    location_slots = sorted({
        int(key.split('_')[1])
        for key in missing
        if key.startswith('location_') and key.split('_')[1].isdigit()
    })
    if location_slots:
        have = event.locations.count() if event else 0
        wanted = max(location_slots)
        return (
            f'This template expects location {wanted}, but this event has '
            f'{have} location{"" if have == 1 else "s"}. Add the missing '
            f'location to the event, or choose a template that does not use it.'
        )
    return 'This template expects values that are empty for this guest: ' + ', '.join(missing)


def _format_ordinal_date(value) -> str:
    """Format a date as `25th June 2026`, without a weekday."""
    local_value = timezone.localtime(value)
    day = local_value.day
    if 10 <= day % 100 <= 20:
        suffix = 'th'
    else:
        suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
    return f'{day}{suffix} {local_value.strftime("%B %Y")}'


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
            missing = missing_template_params(tmpl.body_params or [], body_param_values)
            if missing:
                logger.error(
                    'Reminder template %s has unresolved variables %s for guest %s — not sending',
                    template_name, missing, guest.id,
                )
                return False
            has_header_image = tmpl.has_header_image
        except WhatsAppTemplate.DoesNotExist:
            # Fallback: default param order for unregistered templates
            event = guest.event
            event_date = timezone.localtime(event.date).strftime('%A, %d %B %Y at %I:%M %p') if (event and event.date) else ''
            body_param_values = [guest.full_name, event.name if event else '', event_date]
            has_header_image = False

        params = []
        if has_header_image:
            # Image-header reminder templates resend the guest's generated
            # event pass. The pass contains the QR code, so never submit an
            # image template without a usable pass image/header parameter.
            if not guest.pass_image:
                logger.warning(
                    "Guest %s has no pass image — skipping image reminder",
                    guest.id,
                )
                return False
            pass_url = _build_pass_url(guest)
            if not pass_url or 'localhost' in pass_url or '127.0.0.1' in pass_url:
                logger.error(
                    "Pass URL is not publicly accessible for reminder guest %s: %s",
                    guest.id,
                    pass_url,
                )
                return False
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
