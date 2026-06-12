import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

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


@shared_task
def send_reminder(reminder_id: int, guest_id: str):
    """Send a single reminder WhatsApp message to one guest."""
    from .models import EventReminder, ReminderLog, Guest
    from .whatsapp import send_reminder as wa_send_reminder

    try:
        reminder = EventReminder.objects.select_related('event').get(pk=reminder_id)
        guest = Guest.objects.select_related('event').get(pk=guest_id)
    except (EventReminder.DoesNotExist, Guest.DoesNotExist):
        return {'sent': False, 'reason': 'not found'}

    # Avoid duplicate sends
    if ReminderLog.objects.filter(reminder=reminder, guest=guest).exists():
        return {'sent': False, 'reason': 'already sent'}

    success = wa_send_reminder(guest, reminder.template_name)
    ReminderLog.objects.create(reminder=reminder, guest=guest, success=success)
    return {'sent': success}


@shared_task
def dispatch_due_reminders():
    """
    Periodic task — runs every 30 minutes.
    Finds all active reminder rules whose fire window is now,
    then queues individual send_reminder tasks for each eligible guest.
    Fire window: event_date - hours_before is within the next 30 minutes.
    """
    from .models import EventReminder, ReminderLog

    now = timezone.now()
    window_end = now + timedelta(minutes=30)

    # Find reminders whose scheduled fire time falls in the next 30-minute window
    due_reminders = (
        EventReminder.objects
        .filter(is_active=True, event__date__isnull=False)
        .select_related('event')
    )

    queued = 0
    for reminder in due_reminders:
        fire_at = reminder.event.date - timedelta(hours=reminder.hours_before)
        if not (now <= fire_at < window_end):
            continue

        # Get guests for this event who have a phone number and haven't received this reminder
        already_sent = ReminderLog.objects.filter(
            reminder=reminder
        ).values_list('guest_id', flat=True)

        guests = (
            reminder.event.guests
            .exclude(pk__in=already_sent)
            .exclude(phone_number='')
            .values_list('id', flat=True)
        )

        for i, guest_id in enumerate(guests):
            send_reminder.apply_async(
                args=[reminder.id, str(guest_id)],
                countdown=i * 3,  # 3s apart, same rate limit as pass sends
            )
            queued += 1

    logger.info("dispatch_due_reminders: queued %s reminder sends", queued)
    return {'queued': queued}
