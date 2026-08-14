import secrets
import uuid

from django.conf import settings
from django.db import models


RSVP_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'


def generate_public_code():
    """Return a compact, URL-safe, non-sequential RSVP access code."""
    return ''.join(secrets.choice(RSVP_CODE_ALPHABET) for _ in range(12))


class RsvpWorkflow(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        PAUSED = 'paused', 'Paused'
        COMPLETED = 'completed', 'Completed'

    event = models.OneToOneField(
        'guests.Event',
        on_delete=models.CASCADE,
        related_name='rsvp_workflow',
    )
    invitation_template = models.ForeignKey(
        'guests.WhatsAppTemplate',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='rsvp_invitation_workflows',
    )
    pass_template = models.ForeignKey(
        'guests.WhatsAppTemplate',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='rsvp_pass_workflows',
    )
    invitation_design = models.ImageField(
        upload_to='rsvp_designs/',
        blank=True,
        null=True,
        help_text='Optional RSVP artwork. Guest names are added before delivery.',
    )
    invitation_name_zone_x = models.FloatField(null=True, blank=True)
    invitation_name_zone_y = models.FloatField(null=True, blank=True)
    invitation_name_zone_w = models.FloatField(null=True, blank=True)
    invitation_name_zone_h = models.FloatField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    response_deadline = models.DateTimeField(null=True, blank=True)
    invitation_send_at = models.DateTimeField(null=True, blank=True)
    auto_send_pass = models.BooleanField(default=True)
    pass_send_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_rsvp_workflows',
    )
    launched_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.event.name} RSVP ({self.get_status_display()})'

    @property
    def holds_automatic_passes(self):
        return self.status in {
            self.Status.DRAFT,
            self.Status.ACTIVE,
            self.Status.PAUSED,
        }


class RsvpRecipient(models.Model):
    class ResponseStatus(models.TextChoices):
        AWAITING = 'awaiting', 'Awaiting response'
        CONFIRMED = 'confirmed', 'Confirmed'
        DECLINED = 'declined', 'Declined'

    class InvitationStatus(models.TextChoices):
        NOT_SENT = 'not_sent', 'Not sent'
        QUEUED = 'queued', 'Queued'
        SENDING = 'sending', 'Sending'
        SENT = 'sent', 'Sent'
        DELIVERED = 'delivered', 'Delivered'
        READ = 'read', 'Read'
        FAILED = 'failed', 'Failed'

    class PassStatus(models.TextChoices):
        HELD = 'held', 'Held'
        QUEUED = 'queued', 'Queued'
        SENDING = 'sending', 'Sending'
        SENT = 'sent', 'Sent'
        DELIVERED = 'delivered', 'Delivered'
        READ = 'read', 'Read'
        FAILED = 'failed', 'Failed'
        NOT_ISSUED = 'not_issued', 'Not issued'

    workflow = models.ForeignKey(
        RsvpWorkflow,
        on_delete=models.CASCADE,
        related_name='recipients',
    )
    guest = models.ForeignKey(
        'guests.Guest',
        on_delete=models.CASCADE,
        related_name='rsvp_recipients',
    )
    callback_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )
    public_code = models.CharField(
        max_length=12,
        default=generate_public_code,
        unique=True,
        editable=False,
    )
    response_status = models.CharField(
        max_length=20,
        choices=ResponseStatus.choices,
        default=ResponseStatus.AWAITING,
        db_index=True,
    )
    invitation_status = models.CharField(
        max_length=20,
        choices=InvitationStatus.choices,
        default=InvitationStatus.NOT_SENT,
        db_index=True,
    )
    pass_status = models.CharField(
        max_length=20,
        choices=PassStatus.choices,
        default=PassStatus.HELD,
        db_index=True,
    )
    invitation_message_id = models.CharField(max_length=255, blank=True, db_index=True)
    invitation_image = models.ImageField(
        upload_to='rsvp_invitations/',
        blank=True,
        null=True,
    )
    pass_message_id = models.CharField(max_length=255, blank=True, db_index=True)
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    # Set when the invitation send task is handed to the broker. A QUEUED
    # recipient without this stamp is approved but still waiting for daily
    # send budget; the Beat dispatcher drains those as the window frees up.
    invitation_queued_at = models.DateTimeField(null=True, blank=True)
    pass_queued_at = models.DateTimeField(null=True, blank=True)
    reminder_count = models.PositiveIntegerField(default=0)
    last_reminded_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['guest__full_name']
        constraints = [
            models.UniqueConstraint(
                fields=['workflow', 'guest'],
                name='unique_rsvp_recipient_per_workflow',
            ),
        ]

    def __str__(self):
        return f'{self.guest.full_name} — {self.get_response_status_display()}'


class RsvpResponse(models.Model):
    class Answer(models.TextChoices):
        YES = 'yes', 'Yes'
        NO = 'no', 'No'

    class Source(models.TextChoices):
        WEB = 'web', 'RSVP page'
        WHATSAPP = 'whatsapp', 'WhatsApp button'

    recipient = models.ForeignKey(
        RsvpRecipient,
        on_delete=models.CASCADE,
        related_name='responses',
    )
    message_id = models.CharField(max_length=255, unique=True)
    answer = models.CharField(max_length=10, choices=Answer.choices)
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.WEB,
    )
    sender_phone = models.CharField(max_length=32, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f'{self.recipient.guest.full_name}: {self.get_answer_display()}'
