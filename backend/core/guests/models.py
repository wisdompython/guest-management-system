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
    # When False, WhatsApp delivery is not expected and phone_number is not auto-required
    whatsapp_enabled = models.BooleanField(default=True)
    # Optional override — if set, this template is used for pass delivery instead of the global default
    whatsapp_template = models.ForeignKey(
        'WhatsAppTemplate',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='events',
        help_text='WhatsApp template to use for this event. Falls back to the global default if not set.',
    )
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
    full_name = models.CharField(max_length=255)
    # phone_number is optional at the DB level; required-ness is governed by event.required_fields
    phone_number = models.CharField(max_length=20, blank=True)

    email = models.EmailField(blank=True)
    # ticket_type is a free-text field validated against event.ticket_types at the API level
    ticket_type = models.CharField(max_length=50, blank=True, default='general')
    table_number = models.CharField(max_length=50, blank=True)
    seat_number = models.CharField(max_length=50, blank=True)

    # Generated assets — created automatically after registration
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    pass_image = models.ImageField(upload_to='passes/', blank=True, null=True)

    # State
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REGISTERED)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    whatsapp_sent = models.BooleanField(default=False)
    whatsapp_sent_at = models.DateTimeField(null=True, blank=True)
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
    total_rows = models.PositiveIntegerField(default=0)
    successful_rows = models.PositiveIntegerField(default=0)
    failed_rows = models.PositiveIntegerField(default=0)
    error_report = models.JSONField(default=list, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Upload for {self.event} ({self.status})"


class WhatsAppTemplate(models.Model):
    """Registry of approved Meta WhatsApp templates available for use."""

    AVAILABLE_VARS = [
        ('guest_name',  'Guest full name'),
        ('event_name',  'Event name'),
        ('event_date',  'Event date & time'),
        ('venue',       'Event venue'),
        ('ticket_type', 'Guest ticket type'),
        ('table_number','Guest table number'),
        ('seat_number', 'Guest seat number'),
    ]

    name         = models.CharField(max_length=200, unique=True, help_text="Exact template name as in Meta Business Manager")
    display_name = models.CharField(max_length=200, blank=True, help_text="Friendly label shown in the UI")
    description  = models.TextField(blank=True)
    # Ordered list of variable keys to pass as body params, e.g. ["guest_name", "event_name", "event_date"]
    body_params  = models.JSONField(default=list, blank=True, help_text="Ordered list of variable keys for body params")
    has_header_image = models.BooleanField(default=False, help_text="Template has a header image (pass image will be sent)")
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.display_name or self.name
