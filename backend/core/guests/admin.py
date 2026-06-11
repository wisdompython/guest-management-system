from django.contrib import admin
from .models import Event, Guest, BulkUpload


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('name', 'date', 'venue', 'guest_count', 'created_at')
    search_fields = ('name', 'venue')

    def guest_count(self, obj):
        return obj.guests.count()
    guest_count.short_description = 'Guests'


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone_number', 'event', 'ticket_type', 'table_number', 'status', 'whatsapp_sent', 'registered_at')
    list_filter = ('status', 'ticket_type', 'whatsapp_sent', 'event')
    search_fields = ('full_name', 'phone_number', 'email')
    readonly_fields = ('id', 'qr_code', 'pass_image', 'checked_in_at', 'whatsapp_sent_at', 'registered_at')
    autocomplete_fields = ('event',)


@admin.register(BulkUpload)
class BulkUploadAdmin(admin.ModelAdmin):
    list_display = ('event', 'status', 'total_rows', 'successful_rows', 'failed_rows', 'uploaded_at')
    list_filter = ('status', 'event')
    readonly_fields = ('status', 'total_rows', 'successful_rows', 'failed_rows', 'error_report', 'uploaded_at')
