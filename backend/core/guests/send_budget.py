"""Global daily WhatsApp send budget.

Meta caps the number of unique users a WhatsApp Business number may open
business-initiated conversations with per rolling 24 hours (the messaging
tier — WHATSAPP_DAILY_SEND_LIMIT). Every dispatcher checks the remaining
budget before queueing template sends, so a 5,000-guest event drains at the
tier limit across several days instead of hitting Meta's wall mid-send and
stranding half the list in a failed state.
"""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

# Sends are measured over Meta's rolling 24h window.
SEND_WINDOW = timedelta(hours=24)

# A dispatched-but-unsent RSVP message older than this is treated as lost
# (worker died, retries exhausted) — it stops counting as in-flight and the
# Beat sweep re-dispatches it. Must comfortably exceed the worst-case queue
# drain time (a full day's budget at the task rate limit) plus retry delays.
DISPATCHED_STALE_AFTER = timedelta(hours=6)

# How long a claimed-but-unsent scheduled/direct pass counts as in flight
# before the claim is considered stale and the guest is re-claimed.
SCHEDULED_SEND_CLAIM_TIMEOUT = timedelta(hours=1)

# A reminder claimed this recently counts as in flight and is not re-queued.
REMINDER_CLAIM_TIMEOUT = timedelta(hours=1)


def daily_send_limit() -> int:
    return settings.WHATSAPP_DAILY_SEND_LIMIT


def remaining_send_budget(now=None) -> int:
    """Business-initiated sends still allowed in the trailing 24h window.

    Counts messages already sent in the window plus messages dispatched to
    the broker but not yet sent (those will consume budget shortly). The
    count is deliberately conservative: a pass delivered inside a guest's
    24h reply window does not consume Meta's limit, but it is still counted
    here — under-spending is safe, overshooting strands sends in a failed
    state.
    """
    from rsvp.models import RsvpRecipient

    from .models import Guest, ReminderLog

    now = now or timezone.now()
    window_start = now - SEND_WINDOW
    fresh_after = now - DISPATCHED_STALE_AFTER

    sent = (
        RsvpRecipient.objects.filter(invitation_sent_at__gte=window_start).count()
        + Guest.objects.filter(whatsapp_sent_at__gte=window_start).count()
        + ReminderLog.objects.filter(success=True, sent_at__gte=window_start).count()
    )

    in_flight = (
        RsvpRecipient.objects.filter(
            invitation_status__in=[
                RsvpRecipient.InvitationStatus.QUEUED,
                RsvpRecipient.InvitationStatus.SENDING,
            ],
            invitation_queued_at__gte=fresh_after,
        ).count()
        + RsvpRecipient.objects.filter(
            pass_status__in=[
                RsvpRecipient.PassStatus.QUEUED,
                RsvpRecipient.PassStatus.SENDING,
            ],
            pass_queued_at__gte=fresh_after,
        ).count()
        + Guest.objects.filter(
            whatsapp_sent=False,
            scheduled_send_claimed_at__gte=now - SCHEDULED_SEND_CLAIM_TIMEOUT,
        ).count()
        + ReminderLog.objects.filter(
            success=False,
            queued_at__gte=now - REMINDER_CLAIM_TIMEOUT,
        ).count()
    )

    return max(daily_send_limit() - sent - in_flight, 0)
