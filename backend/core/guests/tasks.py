import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# Max messages per second — stay well under Meta's rate limit
# Meta allows ~80 messages/sec on higher tiers but 250/day on free tier.
# 1 message every 3 seconds = ~1,200/hour, safe for all tiers.
WHATSAPP_RATE_LIMIT = '20/m'  # 20 per minute = 1 every 3 seconds
WHATSAPP_BATCH_COUNTDOWN = 3  # seconds between individual sends in bulk


@shared_task(bind=True, max_retries=3, default_retry_delay=60,
             rate_limit=WHATSAPP_RATE_LIMIT)
def send_whatsapp_pass(self, guest_id: str):
    """Send the WhatsApp pass for a single guest. Retries up to 3 times on failure."""
    from .models import Guest
    from .whatsapp import send_pass

    try:
        guest = Guest.objects.select_related('event').get(pk=guest_id)
    except Guest.DoesNotExist:
        logger.warning("send_whatsapp_pass: guest %s not found", guest_id)
        return {'sent': False, 'reason': 'guest not found'}

    from django.conf import settings as django_settings
    if not django_settings.WHATSAPP_PHONE_ID or not django_settings.WHATSAPP_TOKEN:
        logger.warning("WhatsApp not configured — skipping send for guest %s", guest_id)
        return {'sent': False, 'reason': 'not configured'}

    try:
        sent = send_pass(guest)
    except Exception as exc:
        # Non-transient errors (bad template name, invalid number, etc.) — don't retry
        from pywa.errors import WhatsAppError
        if isinstance(exc, WhatsAppError) and not exc.is_transient:
            logger.error("Non-transient WhatsApp error for guest %s: %s", guest_id, exc)
            return {'sent': False, 'reason': str(exc)}
        raise self.retry(exc=exc)

    if sent:
        Guest.objects.filter(pk=guest_id).update(
            whatsapp_sent=True,
            whatsapp_sent_at=timezone.now(),
        )
        logger.info("WhatsApp pass sent for guest %s", guest_id)
        return {'sent': True}

    logger.warning("send_pass returned False for guest %s — not retrying", guest_id)
    return {'sent': False, 'reason': 'send_pass failed'}


@shared_task
def bulk_send_whatsapp_passes(event_id: int, resend: bool = False):
    """
    Dispatch individual send_whatsapp_pass tasks for each eligible guest,
    spread out using a countdown so we never burst all at once.
    20 messages/minute = 1 every 3 seconds.
    """
    from .models import Guest

    qs = Guest.objects.filter(
        event_id=event_id,
        pass_image__isnull=False,
    ).exclude(pass_image='').values_list('id', flat=True)

    if not resend:
        qs = qs.filter(whatsapp_sent=False)

    guest_ids = list(qs)
    total = len(guest_ids)

    for i, guest_id in enumerate(guest_ids):
        countdown = i * WHATSAPP_BATCH_COUNTDOWN
        send_whatsapp_pass.apply_async(
            args=[str(guest_id)],
            countdown=countdown,
        )

    logger.info(
        "Bulk WhatsApp queued %s messages for event %s (~%s mins)",
        total, event_id, round(total * WHATSAPP_BATCH_COUNTDOWN / 60, 1),
    )
    return {'queued': total, 'estimated_minutes': round(total * WHATSAPP_BATCH_COUNTDOWN / 60, 1)}


@shared_task
def generate_guest_assets(guest_id: str, send_whatsapp: bool = True):
    """Generate QR + pass image for a guest, then optionally queue WhatsApp send."""
    from .models import Guest
    from .utils import generate_qr_code, generate_pass_image

    try:
        guest = Guest.objects.select_related('event').get(pk=guest_id)
    except Guest.DoesNotExist:
        logger.warning("generate_guest_assets: guest %s not found", guest_id)
        return

    qr_ok = generate_qr_code(guest)
    if not qr_ok:
        logger.warning("QR generation failed for guest %s", guest_id)

    guest.refresh_from_db(fields=['qr_code'])
    pass_ok = False
    if guest.event and guest.event.design_template and guest.qr_code:
        pass_ok = generate_pass_image(guest)

    from django.conf import settings as django_settings
    wa_configured = bool(django_settings.WHATSAPP_PHONE_ID and django_settings.WHATSAPP_TOKEN)
    if send_whatsapp and pass_ok and wa_configured and guest.event and guest.event.whatsapp_enabled:
        guest.refresh_from_db(fields=['pass_image'])
        send_whatsapp_pass.delay(guest_id)

    return {'qr': qr_ok, 'pass': pass_ok}
