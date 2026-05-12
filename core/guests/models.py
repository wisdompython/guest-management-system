import uuid
from django.db import models


class Event(models.Model):
    name = models.CharField(max_length=255)
    date = models.DateTimeField()
    venue = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    # Admins upload one design per event; all guest passes are rendered on top of it
    design_template = models.ImageField(upload_to='design_templates/', blank=True, null=True)

    # QR zone — stored as fractions (0.0–1.0) of the template dimensions so they
    # scale correctly regardless of the actual image resolution.
    # Set via the visual QR zone selector in the event editor.
    qr_zone_x = models.FloatField(null=True, blank=True)
    qr_zone_y = models.FloatField(null=True, blank=True)
    qr_zone_w = models.FloatField(null=True, blank=True)
    qr_zone_h = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Guest(models.Model):
    class TicketType(models.TextChoices):
        GENERAL = 'general', 'General'
        VIP = 'vip', 'VIP'
        VVIP = 'vvip', 'VVIP'

    class Status(models.TextChoices):
        REGISTERED = 'registered', 'Registered'
        CHECKED_IN = 'checked_in', 'Checked In'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Required fields
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='guests')
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)

    # Optional fields
    email = models.EmailField(blank=True)
    ticket_type = models.CharField(max_length=20, choices=TicketType.choices, default=TicketType.GENERAL)
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
        return f"{self.full_name} ({self.ticket_type})"


class BulkUpload(models.Model):
    class UploadStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        DONE = 'done', 'Done'
        FAILED = 'failed', 'Failed'

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='bulk_uploads')
    csv_file = models.FileField(upload_to='bulk_uploads/')
    uploaded_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True
    )
    status = models.CharField(max_length=20, choices=UploadStatus.choices, default=UploadStatus.PENDING)
    total_rows = models.PositiveIntegerField(default=0)
    successful_rows = models.PositiveIntegerField(default=0)
    failed_rows = models.PositiveIntegerField(default=0)
    error_report = models.JSONField(default=list, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Upload for {self.event} ({self.status})"
