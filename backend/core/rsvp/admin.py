from django.contrib import admin

from .models import RsvpRecipient, RsvpResponse, RsvpWorkflow


@admin.register(RsvpWorkflow)
class RsvpWorkflowAdmin(admin.ModelAdmin):
    list_display = (
        'event', 'status', 'invitation_send_at', 'auto_send_pass',
        'pass_send_at', 'response_deadline', 'launched_at',
    )
    list_filter = ('status', 'auto_send_pass')
    search_fields = ('event__name',)
    readonly_fields = ('created_at', 'updated_at', 'launched_at', 'completed_at')


@admin.register(RsvpRecipient)
class RsvpRecipientAdmin(admin.ModelAdmin):
    list_display = (
        'guest',
        'workflow',
        'response_status',
        'invitation_status',
        'invitation_auto_retries',
        'invitation_last_template_name',
        'pass_status',
        'pass_auto_retries',
        'pass_last_template_name',
        'pass_queued_at',
        'responded_at',
    )
    list_filter = ('response_status', 'invitation_status', 'pass_status')
    search_fields = ('guest__full_name', 'guest__phone_number', 'workflow__event__name')
    readonly_fields = ('public_code', 'legacy_public_code', 'callback_token', 'invitation_image', 'created_at', 'updated_at')


@admin.register(RsvpResponse)
class RsvpResponseAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'answer', 'message_id', 'sender_phone', 'received_at')
    list_filter = ('answer',)
    search_fields = ('recipient__guest__full_name', 'message_id', 'sender_phone')
    readonly_fields = ('received_at',)
