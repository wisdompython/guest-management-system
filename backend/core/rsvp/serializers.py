from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import serializers

from .models import RsvpRecipient, RsvpWorkflow


class RsvpStatsSerializer(serializers.Serializer):
    invited = serializers.IntegerField()
    awaiting = serializers.IntegerField()
    confirmed = serializers.IntegerField()
    declined = serializers.IntegerField()
    invitation_delivered = serializers.IntegerField()
    invitation_failed = serializers.IntegerField()
    passes_sent = serializers.IntegerField()
    passes_failed = serializers.IntegerField()
    aso_ebi_requests = serializers.IntegerField()
    aso_ebi_quantity = serializers.IntegerField()
    response_rate = serializers.FloatField()
    confirmation_rate = serializers.FloatField()


def build_workflow_stats(workflow):
    counts = workflow.recipients.aggregate(
        invited=Count('id'),
        awaiting=Count('id', filter=Q(response_status=RsvpRecipient.ResponseStatus.AWAITING)),
        confirmed=Count('id', filter=Q(response_status=RsvpRecipient.ResponseStatus.CONFIRMED)),
        declined=Count('id', filter=Q(response_status=RsvpRecipient.ResponseStatus.DECLINED)),
        invitation_delivered=Count(
            'id',
            filter=Q(invitation_status__in=[
                RsvpRecipient.InvitationStatus.DELIVERED,
                RsvpRecipient.InvitationStatus.READ,
            ]),
        ),
        invitation_failed=Count('id', filter=Q(invitation_status=RsvpRecipient.InvitationStatus.FAILED)),
        passes_sent=Count(
            'id',
            filter=Q(pass_status__in=[
                RsvpRecipient.PassStatus.SENT,
                RsvpRecipient.PassStatus.DELIVERED,
                RsvpRecipient.PassStatus.READ,
            ]),
        ),
        passes_failed=Count('id', filter=Q(pass_status=RsvpRecipient.PassStatus.FAILED)),
        aso_ebi_requests=Count(
            'id',
            filter=Q(
                response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
                guest__aso_ebi_requested=True,
            ),
        ),
        aso_ebi_quantity=Sum(
            'guest__aso_ebi_quantity',
            filter=Q(
                response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
                guest__aso_ebi_requested=True,
            ),
            default=0,
        ),
    )
    invited = counts['invited']
    responded = counts['confirmed'] + counts['declined']
    counts['response_rate'] = round((responded / invited) * 100, 1) if invited else 0.0
    counts['confirmation_rate'] = round((counts['confirmed'] / invited) * 100, 1) if invited else 0.0
    return counts


class RsvpWorkflowSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    event_date = serializers.DateTimeField(source='event.date', read_only=True)
    invitation_template_name = serializers.CharField(
        source='invitation_template.display_name',
        read_only=True,
    )
    pass_template_name = serializers.CharField(source='pass_template.display_name', read_only=True)
    stats = serializers.SerializerMethodField()

    class Meta:
        model = RsvpWorkflow
        fields = (
            'id',
            'event',
            'event_name',
            'event_date',
            'invitation_template',
            'invitation_template_name',
            'pass_template',
            'pass_template_name',
            'invitation_design',
            'invitation_name_zone_x',
            'invitation_name_zone_y',
            'invitation_name_zone_w',
            'invitation_name_zone_h',
            'status',
            'response_deadline',
            'invitation_send_at',
            'auto_send_pass',
            'pass_send_at',
            'launched_at',
            'completed_at',
            'created_at',
            'updated_at',
            'stats',
        )
        read_only_fields = (
            'id',
            'status',
            'launched_at',
            'completed_at',
            'created_at',
            'updated_at',
        )

    def get_stats(self, obj):
        return build_workflow_stats(obj)

    def validate_invitation_design(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('The RSVP artwork must be 5 MB or smaller.')
        content_type = getattr(value, 'content_type', '')
        if content_type and content_type not in {'image/jpeg', 'image/png'}:
            raise serializers.ValidationError('Upload a PNG or JPEG RSVP artwork.')
        return value

    def validate(self, attrs):
        instance = self.instance
        if (
            instance
            and 'event' in attrs
            and attrs['event'].pk != instance.event_id
        ):
            raise serializers.ValidationError({
                'event': 'The event cannot be changed after a workflow is created.',
            })
        event = attrs.get('event') or (instance.event if instance else None)
        invitation_template = attrs.get(
            'invitation_template',
            instance.invitation_template if instance else None,
        )
        pass_template = attrs.get('pass_template', instance.pass_template if instance else None)
        auto_send_pass = attrs.get(
            'auto_send_pass',
            instance.auto_send_pass if instance else True,
        )
        invitation_design = attrs.get(
            'invitation_design',
            instance.invitation_design if instance else None,
        )
        deadline = attrs.get(
            'response_deadline',
            instance.response_deadline if instance else None,
        )
        invitation_send_at = attrs.get(
            'invitation_send_at',
            instance.invitation_send_at if instance else None,
        )
        pass_send_at = attrs.get(
            'pass_send_at',
            instance.pass_send_at if instance else None,
        )

        if event and deadline and deadline >= event.date:
            raise serializers.ValidationError({
                'response_deadline': 'The response deadline must be before the event date.',
            })
        if not instance and deadline and deadline <= timezone.now():
            raise serializers.ValidationError({
                'response_deadline': 'The response deadline must be in the future.',
            })
        if not instance and invitation_send_at and invitation_send_at <= timezone.now():
            raise serializers.ValidationError({
                'invitation_send_at': 'The invitation send time must be in the future.',
            })
        if invitation_send_at and deadline and invitation_send_at >= deadline:
            raise serializers.ValidationError({
                'invitation_send_at': 'Invitations must be sent before the response deadline.',
            })
        if invitation_send_at and event and invitation_send_at >= event.date:
            raise serializers.ValidationError({
                'invitation_send_at': 'Invitations must be sent before the event date.',
            })
        if not instance and pass_send_at and pass_send_at <= timezone.now():
            raise serializers.ValidationError({
                'pass_send_at': 'The pass send time must be in the future.',
            })
        if pass_send_at and event and pass_send_at >= event.date:
            raise serializers.ValidationError({
                'pass_send_at': 'Passes must be sent before the event date.',
            })
        if invitation_template and not invitation_template.is_active:
            raise serializers.ValidationError({
                'invitation_template': 'Select an active WhatsApp template.',
            })
        if invitation_template and 'rsvp_link' not in (invitation_template.body_params or []):
            raise serializers.ValidationError({
                'invitation_template': 'The RSVP invitation template must include the rsvp_link variable.',
            })
        if (
            invitation_template
            and 'rsvp_deadline' in (invitation_template.body_params or [])
            and not deadline
        ):
            raise serializers.ValidationError({
                'response_deadline': 'Set a response deadline because the selected template includes the RSVP deadline.',
            })
        if invitation_design and invitation_template and not invitation_template.has_header_image:
            raise serializers.ValidationError({
                'invitation_template': 'Choose a template with an image header when RSVP artwork is attached.',
            })
        if invitation_template and invitation_template.has_header_image and not invitation_design:
            raise serializers.ValidationError({
                'invitation_design': 'Attach RSVP artwork for the selected image-header template.',
            })
        zone_fields = (
            'invitation_name_zone_x',
            'invitation_name_zone_y',
            'invitation_name_zone_w',
            'invitation_name_zone_h',
        )
        zone_values = [
            attrs.get(field, getattr(instance, field, None) if instance else None)
            for field in zone_fields
        ]
        if invitation_design and any(value is None for value in zone_values):
            raise serializers.ValidationError({
                'invitation_design': 'Mark the guest-name area on the RSVP artwork.',
            })
        if any(value is not None and not 0 <= value <= 1 for value in zone_values):
            raise serializers.ValidationError({
                'invitation_design': 'The guest-name area must stay inside the artwork.',
            })
        if invitation_design and (
            zone_values[0] + zone_values[2] > 1
            or zone_values[1] + zone_values[3] > 1
        ):
            raise serializers.ValidationError({
                'invitation_design': 'The guest-name area must stay inside the artwork.',
            })
        if invitation_design and (zone_values[2] <= 0 or zone_values[3] <= 0):
            raise serializers.ValidationError({
                'invitation_design': 'The guest-name area must have a visible width and height.',
            })
        if pass_template and not pass_template.is_active:
            raise serializers.ValidationError({
                'pass_template': 'Select an active WhatsApp template.',
            })
        resolved_pass_template = pass_template or (
            event.whatsapp_template if event and event.whatsapp_template_id else None
        )
        if auto_send_pass and event and not event.design_template:
            raise serializers.ValidationError({
                'event': 'Upload a guest-pass design before enabling automatic pass delivery.',
            })
        if auto_send_pass and resolved_pass_template and not resolved_pass_template.has_header_image:
            raise serializers.ValidationError({
                'pass_template': 'The guest-pass template must have an image header.',
            })
        if resolved_pass_template and 'rsvp_link' in (resolved_pass_template.body_params or []):
            raise serializers.ValidationError({
                'pass_template': 'Choose a guest-pass template, not an RSVP invitation template.',
            })
        return attrs


class RsvpRecipientSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(source='guest.full_name', read_only=True)
    event_name = serializers.CharField(source='workflow.event.name', read_only=True)
    ticket_type = serializers.CharField(source='guest.ticket_type', read_only=True)
    table_number = serializers.CharField(source='guest.table_number', read_only=True)
    aso_ebi_requested = serializers.BooleanField(source='guest.aso_ebi_requested', read_only=True)
    aso_ebi_quantity = serializers.IntegerField(source='guest.aso_ebi_quantity', read_only=True)
    has_phone = serializers.SerializerMethodField()

    class Meta:
        model = RsvpRecipient
        fields = (
            'id',
            'workflow',
            'guest',
            'guest_name',
            'event_name',
            'ticket_type',
            'table_number',
            'aso_ebi_requested',
            'aso_ebi_quantity',
            'has_phone',
            'response_status',
            'invitation_status',
            'invitation_image',
            'pass_status',
            'invitation_sent_at',
            'responded_at',
            'pass_queued_at',
            'reminder_count',
            'last_reminded_at',
            'last_error',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields

    def get_has_phone(self, obj):
        return bool(obj.guest.phone_number)


class PopulateRecipientsSerializer(serializers.Serializer):
    guest_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=False,
    )
