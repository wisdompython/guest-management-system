import uuid
from django.db import models


class Font(models.Model):
    name = models.CharField(max_length=100, unique=True)
    file = models.FileField(upload_to='fonts/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Event(models.Model):
    name = models.CharField(max_length=255)
    date = models.DateTimeField()
    venue = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    rsvp_message = models.TextField(
        blank=True,
        help_text='Guest-facing welcome message shown on the public RSVP page.',
    )
    color_of_day = models.CharField(
        max_length=255,
        blank=True,
        help_text='Optional dress colour or event colour shown on the RSVP page.',
    )
    rsvp_primary_color = models.CharField(
        max_length=20,
        default='#8a6f2b',
        help_text='Primary accent colour for the public RSVP page.',
    )
    rsvp_background_color = models.CharField(
        max_length=20,
        default='#f6f4ee',
        help_text='Page background colour for the public RSVP page.',
    )
    rsvp_card_color = models.CharField(
        max_length=20,
        default='#ffffff',
        help_text='Card and form background colour for the public RSVP page.',
    )
    rsvp_text_color = models.CharField(
        max_length=20,
        default='#23262e',
        help_text='Primary text colour for the public RSVP page.',
    )
    rsvp_background_image = models.ImageField(
        upload_to='rsvp_backgrounds/',
        blank=True,
        null=True,
        help_text='Optional full-page background image for the public RSVP page.',
    )
    # Admins upload one design per event; all guest passes are rendered on top of it
    design_template = models.ImageField(upload_to='design_templates/', blank=True, null=True)

    # QR zone — stored as fractions (0.0–1.0) of the template dimensions so they
    # scale correctly regardless of the actual image resolution.
    qr_zone_x = models.FloatField(null=True, blank=True)
    qr_zone_y = models.FloatField(null=True, blank=True)
    qr_zone_w = models.FloatField(null=True, blank=True)
    qr_zone_h = models.FloatField(null=True, blank=True)

    # Name zone — where the guest's name is drawn on the pass
    name_zone_x = models.FloatField(null=True, blank=True)
    name_zone_y = models.FloatField(null=True, blank=True)
    name_zone_w = models.FloatField(null=True, blank=True)
    name_zone_h = models.FloatField(null=True, blank=True)

    # Name typography settings
    name_font = models.ForeignKey(Font, null=True, blank=True, on_delete=models.SET_NULL, related_name='events')
    name_font_color = models.CharField(max_length=20, default='#ffffff')
    name_font_size_fraction = models.FloatField(default=0.05)  # fraction of template height

    # QR backing — 'none' means no backing, any CSS hex like '#ffffff' adds a solid pad
    QR_BG_NONE = 'none'
    qr_bg_color = models.CharField(max_length=20, default='none', blank=True)

    # Per-event guest configuration
    # ticket_types: [{"value": "vip", "label": "VIP"}, ...]  — defines allowed ticket categories
    ticket_types = models.JSONField(
        default=list,
        blank=True,
        help_text='List of {value, label} objects defining ticket categories for this event.',
    )
    # required_fields: subset of ["full_name", "phone_number", "email", "table_number", "seat_number"]
    required_fields = models.JSONField(
        default=list,
        blank=True,
        help_text='Guest fields that are required for this event.',
    )
    collect_aso_ebi = models.BooleanField(
        default=False,
        help_text='Allow guests to request Aso Ebi and specify a quantity.',
    )
    allow_plus_one = models.BooleanField(
        default=False,
        help_text='Allow confirmed guests to indicate that they will bring one additional guest.',
    )
    preferences_enabled = models.BooleanField(
        default=False,
        help_text='Collect guest preferences without requiring RSVP confirmation.',
    )
    collect_celebrant = models.BooleanField(
        default=False,
        help_text='Ask guests which celebrant they are attending for.',
    )
    celebrant_options = models.JSONField(
        default=list,
        blank=True,
        help_text='Optional predetermined celebrant names. Guests enter a custom name when empty.',
    )
    # When False, WhatsApp delivery is not expected and phone_number is not auto-required
    whatsapp_enabled = models.BooleanField(default=True)
    # RSVP is an event-level delivery decision. It intentionally survives deletion
    # of an individual workflow so guests cannot fall through to direct pass sends.
    rsvp_enabled = models.BooleanField(default=False)
    # Optional override — if set, this template is used for pass delivery instead of the global default
    whatsapp_template = models.ForeignKey(
        'WhatsAppTemplate',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='events',
        help_text='WhatsApp template to use for this event. Falls back to the global default if not set.',
    )
    # Default delivery time for the original (non-RSVP) workflow. New guests
    # inherit this value, while a per-guest scheduled_send_at can still override it.
    pass_send_at = models.DateTimeField(null=True, blank=True)
    is_ended = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Guest(models.Model):
    class Status(models.TextChoices):
        REGISTERED = 'registered', 'Registered'
        CHECKED_IN = 'checked_in', 'Checked In'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='guests')
    plus_one_of = models.OneToOneField(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='named_plus_one',
        help_text='Primary guest who supplied this named plus one.',
    )
    full_name = models.CharField(max_length=255)
    # phone_number is optional at the DB level; required-ness is governed by event.required_fields
    phone_number = models.CharField(max_length=20, blank=True)

    email = models.EmailField(blank=True)
    # ticket_type is a free-text field validated against event.ticket_types at the API level
    ticket_type = models.CharField(max_length=50, blank=True, default='general')
    table_number = models.CharField(max_length=50, blank=True)
    seat_number = models.CharField(max_length=50, blank=True)
    aso_ebi_requested = models.BooleanField(default=False)
    aso_ebi_quantity = models.PositiveIntegerField(default=0)
    plus_one_attending = models.BooleanField(default=False)
    celebrant_name = models.CharField(max_length=255, blank=True)
    preference_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    preferences_submitted_at = models.DateTimeField(null=True, blank=True)
    plus_one_checked_in = models.BooleanField(default=False)
    plus_one_checked_in_at = models.DateTimeField(null=True, blank=True)

    # Generated assets — created automatically after registration
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    pass_image = models.ImageField(upload_to='passes/', blank=True, null=True)

    # State
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REGISTERED)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    whatsapp_sent = models.BooleanField(default=False)
    whatsapp_sent_at = models.DateTimeField(null=True, blank=True)
    # If set, the WhatsApp pass is held back and sent by dispatch_scheduled_sends
    # once this time arrives, instead of immediately on registration.
    scheduled_send_at = models.DateTimeField(null=True, blank=True)
    # Set the moment dispatch_scheduled_sends claims this guest for sending, so a
    # slow queue (task not yet run) doesn't get re-claimed by the next Beat tick.
    scheduled_send_claimed_at = models.DateTimeField(null=True, blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} — {self.ticket_type or 'guest'}"


class EventReminder(models.Model):
    """A reminder rule attached to an event. Fires X hours before the event."""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='reminders')
    hours_before = models.PositiveIntegerField(
        help_text='How many hours before the event to send this reminder (e.g. 168 = 7 days, 24 = 1 day).'
    )
    template_name = models.CharField(
        max_length=100,
        help_text='Approved Meta WhatsApp template name to use for this reminder.',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['hours_before']
        unique_together = [('event', 'hours_before')]

    def __str__(self):
        days = self.hours_before // 24
        hours = self.hours_before % 24
        label = f"{days}d " if days else ""
        label += f"{hours}h" if hours else ""
        return f"{self.event.name} — {label.strip()} before"


class ReminderLog(models.Model):
    """Records that a specific reminder was sent to a specific guest."""
    reminder = models.ForeignKey(EventReminder, on_delete=models.CASCADE, related_name='logs')
    guest = models.ForeignKey(Guest, on_delete=models.CASCADE, related_name='reminder_logs')
    sent_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)
    # Set when the send task is dispatched; a fresh claim keeps the next Beat
    # run from re-queueing the same guest and counts against the send budget.
    queued_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('reminder', 'guest')]

    def __str__(self):
        return f"{self.reminder} → {self.guest.full_name}"


class BulkUpload(models.Model):
    class UploadStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        DONE = 'done', 'Done'
        FAILED = 'failed', 'Failed'

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='bulk_uploads')
    csv_file = models.FileField(upload_to='bulk_uploads/')
    uploaded_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True
    )
    status = models.CharField(max_length=20, choices=UploadStatus.choices, default=UploadStatus.PENDING)
    replace_existing = models.BooleanField(default=False)
    total_rows = models.PositiveIntegerField(default=0)
    successful_rows = models.PositiveIntegerField(default=0)
    failed_rows = models.PositiveIntegerField(default=0)
    skipped_rows = models.PositiveIntegerField(default=0)
    replaced_rows = models.PositiveIntegerField(default=0)
    recipients_created = models.PositiveIntegerField(default=0)
    assets_total = models.PositiveIntegerField(default=0)
    assets_processed = models.PositiveIntegerField(default=0)
    assets_failed = models.PositiveIntegerField(default=0)
    error_report = models.JSONField(default=list, blank=True)
    skipped_report = models.JSONField(default=list, blank=True)
    error_message = models.TextField(blank=True)
    task_id = models.CharField(max_length=255, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Upload for {self.event} ({self.status})"


class TemplateCategory(models.Model):
    """Grouping label for WhatsApp templates (e.g. Birthday, Wedding, Corporate)."""
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'template categories'

    def __str__(self):
        return self.name


class WhatsAppTemplate(models.Model):
    """Registry of approved Meta WhatsApp templates available for use."""

    AVAILABLE_VARS = [
        ('guest_name',  'Guest full name'),
        ('event_name',  'Event name'),
        ('event_date',  'Event date & time'),
        ('event_date_only', 'Event date only'),
        ('event_time',  'Event time only'),
        ('venue',       'Event venue'),
        ('ticket_type', 'Guest ticket type'),
        ('table_number','Guest table number'),
        ('seat_number', 'Guest seat number'),
        ('rsvp_link',   'Guest-specific RSVP link'),
        ('preferences_link', 'Guest preferences link'),
        ('rsvp_deadline', 'RSVP response deadline'),
    ]

    name         = models.CharField(max_length=200, unique=True, help_text="Exact template name as in Meta Business Manager")
    display_name = models.CharField(max_length=200, blank=True, help_text="Friendly label shown in the UI")
    description  = models.TextField(blank=True)
    category     = models.ForeignKey(
        TemplateCategory,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='templates',
        help_text='Optional category for grouping templates.',
    )
    # The raw template body as approved in Meta, with {{1}}, {{2}} placeholders
    body_text    = models.TextField(blank=True, help_text="Template body text with {{1}}, {{2}} placeholders — used for preview only")
    # Ordered list of variable keys to pass as body params, e.g. ["guest_name", "event_name", "event_date"]
    body_params  = models.JSONField(default=list, blank=True, help_text="Ordered list of variable keys for body params")
    has_header_image = models.BooleanField(default=False, help_text="Template has a header image (pass image will be sent)")
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['category__name', 'display_name', 'name']

    def __str__(self):
        return self.display_name or self.name
