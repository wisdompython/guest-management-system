import csv
import uuid

from django.db import transaction
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ReadOnlyOrEventManager
from guests.models import Guest

from .models import RsvpRecipient, RsvpWorkflow
from .serializers import (
    PopulateRecipientsSerializer,
    RsvpRecipientSerializer,
    RsvpWorkflowSerializer,
    build_workflow_stats,
)


class RsvpWorkflowViewSet(viewsets.ModelViewSet):
    serializer_class = RsvpWorkflowSerializer
    permission_classes = [ReadOnlyOrEventManager]
    queryset = (
        RsvpWorkflow.objects
        .select_related('event', 'invitation_template', 'pass_template', 'created_by')
        .all()
    )

    def get_queryset(self):
        qs = super().get_queryset()
        if event_id := self.request.query_params.get('event'):
            qs = qs.filter(event_id=event_id)
        if workflow_status := self.request.query_params.get('status'):
            qs = qs.filter(status=workflow_status)
        if search := self.request.query_params.get('search'):
            qs = qs.filter(event__name__icontains=search)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        workflow = self.get_object()
        if workflow.status in {RsvpWorkflow.Status.ACTIVE, RsvpWorkflow.Status.PAUSED}:
            return Response(
                {'detail': 'Pause and complete this workflow before deleting it.'},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='populate-recipients')
    def populate_recipients(self, request, pk=None):
        workflow = self.get_object()
        if workflow.status != RsvpWorkflow.Status.DRAFT:
            return Response(
                {'detail': 'Recipients can only be changed while the workflow is a draft.'},
                status=status.HTTP_409_CONFLICT,
            )

        input_serializer = PopulateRecipientsSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        guest_ids = input_serializer.validated_data.get('guest_ids')

        guests = Guest.objects.filter(event=workflow.event).exclude(phone_number='')
        if guest_ids is not None:
            guests = guests.filter(id__in=guest_ids)

        existing_ids = set(
            workflow.recipients.values_list('guest_id', flat=True)
        )
        new_recipients = [
            RsvpRecipient(workflow=workflow, guest=guest)
            for guest in guests.iterator()
            if guest.id not in existing_ids
        ]
        RsvpRecipient.objects.bulk_create(new_recipients, ignore_conflicts=True)

        return Response({
            'added': len(new_recipients),
            'total': workflow.recipients.count(),
        })

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        return Response(build_workflow_stats(self.get_object()))

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        workflow = self.get_object()
        recipients = workflow.recipients.select_related('guest').order_by('guest__full_name')

        class Echo:
            def write(self, value):
                return value

        writer = csv.writer(Echo())

        def rows():
            yield writer.writerow([
                'guest_name', 'ticket_type', 'table_number', 'response_status',
                'responded_at', 'invitation_status', 'pass_status', 'reminder_count',
            ])
            for recipient in recipients.iterator():
                yield writer.writerow([
                    recipient.guest.full_name,
                    recipient.guest.ticket_type,
                    recipient.guest.table_number,
                    recipient.response_status,
                    recipient.responded_at.isoformat() if recipient.responded_at else '',
                    recipient.invitation_status,
                    recipient.pass_status,
                    recipient.reminder_count,
                ])

        safe_name = ''.join(
            character if character.isalnum() else '_'
            for character in workflow.event.name
        ).strip('_')
        response = StreamingHttpResponse(rows(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="rsvp_{safe_name or workflow.id}.csv"'
        return response

    @action(detail=True, methods=['post'])
    def launch(self, request, pk=None):
        workflow = self.get_object()
        if workflow.status != RsvpWorkflow.Status.DRAFT:
            return Response(
                {'detail': 'Only a draft workflow can be launched.'},
                status=status.HTTP_409_CONFLICT,
            )
        if not workflow.invitation_template_id:
            return Response(
                {'detail': 'Select an RSVP invitation template before launch.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if 'rsvp_link' not in (workflow.invitation_template.body_params or []):
            return Response(
                {'detail': 'The RSVP invitation template must include the rsvp_link variable.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if workflow.auto_send_pass and not workflow.pass_template_id:
            return Response(
                {'detail': 'Select a pass template before launch.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if workflow.response_deadline and workflow.response_deadline <= timezone.now():
            return Response(
                {'detail': 'The response deadline has passed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not workflow.recipients.exists():
            return Response(
                {'detail': 'Add at least one eligible recipient before launch.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            workflow.status = RsvpWorkflow.Status.ACTIVE
            workflow.launched_at = timezone.now()
            workflow.save(update_fields=['status', 'launched_at', 'updated_at'])
            invitations_due = (
                not workflow.invitation_send_at
                or workflow.invitation_send_at <= timezone.now()
            )
            if invitations_due:
                workflow.recipients.filter(
                    invitation_status=RsvpRecipient.InvitationStatus.NOT_SENT,
                ).update(invitation_status=RsvpRecipient.InvitationStatus.QUEUED)

        if invitations_due:
            from .tasks import queue_workflow_invitations
            result = queue_workflow_invitations.delay(workflow.id)
            return Response({'launched': True, 'scheduled': False, 'task_id': result.id})
        return Response({
            'launched': True,
            'scheduled': True,
            'invitation_send_at': workflow.invitation_send_at,
            'task_id': None,
        })

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        workflow = self.get_object()
        if workflow.status != RsvpWorkflow.Status.ACTIVE:
            return Response(
                {'detail': 'Only an active workflow can be paused.'},
                status=status.HTTP_409_CONFLICT,
            )
        workflow.status = RsvpWorkflow.Status.PAUSED
        workflow.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(workflow).data)

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        workflow = self.get_object()
        if workflow.status != RsvpWorkflow.Status.PAUSED:
            return Response(
                {'detail': 'Only a paused workflow can be resumed.'},
                status=status.HTTP_409_CONFLICT,
            )
        workflow.status = RsvpWorkflow.Status.ACTIVE
        workflow.save(update_fields=['status', 'updated_at'])
        workflow.recipients.filter(
            response_status=RsvpRecipient.ResponseStatus.AWAITING,
            invitation_status=RsvpRecipient.InvitationStatus.FAILED,
        ).update(invitation_status=RsvpRecipient.InvitationStatus.QUEUED)
        from .tasks import queue_workflow_invitations
        queue_workflow_invitations.delay(workflow.id)
        return Response(self.get_serializer(workflow).data)

    @action(detail=True, methods=['post'], url_path='remind-awaiting')
    def remind_awaiting(self, request, pk=None):
        workflow = self.get_object()
        if workflow.status != RsvpWorkflow.Status.ACTIVE:
            return Response(
                {'detail': 'Reminders can only be sent for an active workflow.'},
                status=status.HTTP_409_CONFLICT,
            )
        if workflow.response_deadline and workflow.response_deadline <= timezone.now():
            return Response(
                {'detail': 'The response deadline has passed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        eligible = workflow.recipients.filter(
            response_status=RsvpRecipient.ResponseStatus.AWAITING,
            invitation_status__in=[
                RsvpRecipient.InvitationStatus.SENT,
                RsvpRecipient.InvitationStatus.DELIVERED,
                RsvpRecipient.InvitationStatus.READ,
                RsvpRecipient.InvitationStatus.FAILED,
            ],
        )
        queued = eligible.count()
        eligible.update(
            invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
            last_error='',
        )
        from .tasks import queue_workflow_invitations
        queue_workflow_invitations.delay(workflow.id)
        return Response({'queued': queued})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        workflow = self.get_object()
        if workflow.status not in {RsvpWorkflow.Status.ACTIVE, RsvpWorkflow.Status.PAUSED}:
            return Response(
                {'detail': 'Only an active or paused workflow can be completed.'},
                status=status.HTTP_409_CONFLICT,
            )
        workflow.status = RsvpWorkflow.Status.COMPLETED
        workflow.completed_at = timezone.now()
        workflow.save(update_fields=['status', 'completed_at', 'updated_at'])
        return Response(self.get_serializer(workflow).data)


class RsvpRecipientViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RsvpRecipientSerializer
    permission_classes = [ReadOnlyOrEventManager]
    queryset = (
        RsvpRecipient.objects
        .select_related('workflow__event', 'guest')
        .all()
    )

    def get_queryset(self):
        qs = super().get_queryset()
        if workflow_id := self.request.query_params.get('workflow'):
            qs = qs.filter(workflow_id=workflow_id)
        if response_status := self.request.query_params.get('response_status'):
            qs = qs.filter(response_status=response_status)
        if invitation_status := self.request.query_params.get('invitation_status'):
            qs = qs.filter(invitation_status=invitation_status)
        if pass_status := self.request.query_params.get('pass_status'):
            qs = qs.filter(pass_status=pass_status)
        if search := self.request.query_params.get('search'):
            qs = qs.filter(guest__full_name__icontains=search)
        return qs

    @action(detail=True, methods=['post'], url_path='retry-invitation')
    def retry_invitation(self, request, pk=None):
        recipient = self.get_object()
        if recipient.workflow.status != RsvpWorkflow.Status.ACTIVE:
            return Response(
                {'detail': 'The workflow must be active.'},
                status=status.HTTP_409_CONFLICT,
            )
        if recipient.response_status != RsvpRecipient.ResponseStatus.AWAITING:
            return Response(
                {'detail': 'This guest has already responded.'},
                status=status.HTTP_409_CONFLICT,
            )
        if recipient.invitation_status != RsvpRecipient.InvitationStatus.FAILED:
            return Response(
                {'detail': 'Only failed invitations can be retried.'},
                status=status.HTTP_409_CONFLICT,
            )
        recipient.invitation_status = RsvpRecipient.InvitationStatus.QUEUED
        recipient.last_error = ''
        recipient.save(update_fields=['invitation_status', 'last_error', 'updated_at'])
        from .tasks import send_rsvp_invitation
        send_rsvp_invitation.delay(recipient.id)
        return Response({'queued': True})

    @action(detail=True, methods=['post'], url_path='retry-pass')
    def retry_pass(self, request, pk=None):
        recipient = self.get_object()
        if recipient.response_status != RsvpRecipient.ResponseStatus.CONFIRMED:
            return Response(
                {'detail': 'Only confirmed guests can receive a pass.'},
                status=status.HTTP_409_CONFLICT,
            )
        if recipient.pass_status != RsvpRecipient.PassStatus.FAILED:
            return Response(
                {'detail': 'Only failed pass deliveries can be retried.'},
                status=status.HTTP_409_CONFLICT,
            )
        recipient.pass_status = RsvpRecipient.PassStatus.QUEUED
        recipient.pass_queued_at = timezone.now()
        recipient.last_error = ''
        recipient.save(update_fields=['pass_status', 'pass_queued_at', 'last_error', 'updated_at'])
        from .tasks import send_confirmed_pass
        send_confirmed_pass.delay(recipient.id)
        return Response({'queued': True})


class PublicRsvpResponseView(APIView):
    """Guest-facing RSVP details and response endpoint secured by an opaque token."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get_recipient(self, token):
        return get_object_or_404(
            RsvpRecipient.objects.select_related('workflow__event', 'guest'),
            callback_token=token,
        )

    def get(self, request, token):
        recipient = self.get_recipient(token)
        workflow = recipient.workflow
        deadline_passed = bool(
            workflow.response_deadline
            and workflow.response_deadline <= timezone.now()
        )
        return Response({
            'guest_name': recipient.guest.full_name,
            'event_name': workflow.event.name,
            'event_date': workflow.event.date,
            'venue': workflow.event.venue,
            'response_deadline': workflow.response_deadline,
            'response_status': recipient.response_status,
            'responded_at': recipient.responded_at,
            'can_respond': (
                workflow.status == RsvpWorkflow.Status.ACTIVE
                and not deadline_passed
                and recipient.response_status == RsvpRecipient.ResponseStatus.AWAITING
            ),
            'closed_reason': (
                'deadline_passed' if deadline_passed
                else 'workflow_inactive' if workflow.status != RsvpWorkflow.Status.ACTIVE
                else 'already_responded' if recipient.response_status != RsvpRecipient.ResponseStatus.AWAITING
                else None
            ),
        })

    def post(self, request, token):
        answer = request.data.get('answer')
        if answer not in {'yes', 'no'}:
            return Response(
                {'detail': 'answer must be yes or no.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .models import RsvpResponse
        from .services import record_response
        result = record_response(
            callback_token=token,
            answer=answer,
            response_id=f'web:{uuid.uuid4()}',
            source=RsvpResponse.Source.WEB,
            raw_payload={'answer': answer},
        )
        reason = result.get('reason')
        if reason == 'not_found':
            return Response({'detail': 'RSVP invitation not found.'}, status=status.HTTP_404_NOT_FOUND)
        if reason == 'deadline_passed':
            return Response({'detail': 'The RSVP deadline has passed.'}, status=status.HTTP_410_GONE)
        if reason == 'workflow_inactive':
            return Response({'detail': 'This RSVP workflow is not accepting responses.'}, status=status.HTTP_409_CONFLICT)
        if reason == 'already_responded':
            return Response({
                'accepted': False,
                'already_responded': True,
                'response_status': result.get('response_status'),
            })
        return Response(result, status=status.HTTP_200_OK if result.get('accepted') else status.HTTP_409_CONFLICT)
