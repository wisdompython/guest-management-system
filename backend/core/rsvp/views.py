import csv
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import ReadOnlyOrEventManager
from guests.csv_utils import safe_csv_row
from guests.models import Event, Guest

from .models import RsvpRecipient, RsvpWorkflow, assign_unique_public_codes
from .serializers import (
    PopulateRecipientsSerializer,
    RsvpRecipientSerializer,
    RsvpWorkflowSerializer,
    build_workflow_stats,
)


def _retry_available_at(error_text, last_attempt, attempts):
    """When a retryable WhatsApp failure may be attempted again (None = now)."""
    from .tasks import is_retryable_failure, retry_delay_for

    if not last_attempt or not is_retryable_failure(error_text):
        return None
    return last_attempt + retry_delay_for(error_text, attempts)


def _retry_cooldown_response(error_text, last_attempt, attempts):
    """Return a conflict response while a retryable WhatsApp error cools down."""
    retry_at = _retry_available_at(error_text, last_attempt, attempts)
    if not retry_at or timezone.now() >= retry_at:
        return None
    local_retry_at = timezone.localtime(retry_at)
    return Response(
        {
            'detail': (
                'This WhatsApp failure is still in its retry cooldown. '
                f'Try again on or after {local_retry_at:%d %B %Y at %I:%M %p} WAT.'
            ),
            'retry_after': retry_at.isoformat(),
        },
        status=status.HTTP_409_CONFLICT,
    )


def _template_changed(last_template_name, configured_template_name):
    """Whether a manual retry will use a different (or newly tracked) template.

    Blank legacy values are treated as changed once so recipients that failed
    before template tracking was deployed are not trapped behind stale
    cooldown data.
    """
    return bool(configured_template_name) and (
        not last_template_name
        or last_template_name != configured_template_name
    )


RECIPIENT_DELIVERED_STATUSES = [
    RsvpRecipient.InvitationStatus.SENT,
    RsvpRecipient.InvitationStatus.DELIVERED,
    RsvpRecipient.InvitationStatus.READ,
]
RECIPIENT_SEGMENTS = {
    'invited_awaiting': dict(
        response_status=RsvpRecipient.ResponseStatus.AWAITING,
        invitation_status__in=RECIPIENT_DELIVERED_STATUSES,
    ),
    'confirmed_with_pass': dict(
        response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
        pass_status__in=RECIPIENT_DELIVERED_STATUSES,
    ),
    'confirmed_no_pass': dict(
        response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
    ),
}


def _apply_recipient_filters(recipients, query_params):
    """Apply the dashboard's complete filter set to a recipient queryset."""
    errors = {}
    segment = query_params.get('segment')
    if segment:
        if segment == 'delivery_failed':
            recipients = recipients.filter(
                Q(invitation_status=RsvpRecipient.InvitationStatus.FAILED)
                | Q(pass_status=RsvpRecipient.PassStatus.FAILED)
            )
        elif segment in RECIPIENT_SEGMENTS:
            recipients = recipients.filter(**RECIPIENT_SEGMENTS[segment])
            if segment == 'confirmed_no_pass':
                recipients = recipients.exclude(
                    pass_status__in=RECIPIENT_DELIVERED_STATUSES,
                )
        else:
            errors['segment'] = 'Invalid segment filter.'

    filter_choices = {
        'response_status': {
            value for value, _label in RsvpRecipient.ResponseStatus.choices
        },
        'invitation_status': {
            value for value, _label in RsvpRecipient.InvitationStatus.choices
        },
        'pass_status': {
            value for value, _label in RsvpRecipient.PassStatus.choices
        },
    }
    for field, choices in filter_choices.items():
        if value := query_params.get(field):
            if value in choices:
                recipients = recipients.filter(**{field: value})
            else:
                errors[field] = f'Invalid {field} filter.'

    if delivery_status := query_params.get('delivery_status'):
        if delivery_status == 'failed':
            recipients = recipients.filter(
                Q(invitation_status=RsvpRecipient.InvitationStatus.FAILED)
                | Q(pass_status=RsvpRecipient.PassStatus.FAILED)
            )
        else:
            errors['delivery_status'] = 'Invalid delivery_status filter.'

    if search := query_params.get('search'):
        recipients = recipients.filter(guest__full_name__icontains=search)
    return recipients, errors


class RsvpWorkflowViewSet(viewsets.ModelViewSet):
    serializer_class = RsvpWorkflowSerializer
    permission_classes = [ReadOnlyOrEventManager]
    queryset = (
        RsvpWorkflow.objects
        .select_related(
            'event__whatsapp_template',
            'invitation_template',
            'pass_template',
            'created_by',
        )
        .all()
    )

    def get_queryset(self):
        qs = super().get_queryset()
        # Collection filters must not hide a detail action's workflow. Export
        # reuses `search` for guest names, while the workflow list uses it for
        # event names.
        if getattr(self, 'action', None) != 'list':
            return qs
        if event_id := self.request.query_params.get('event'):
            qs = qs.filter(event_id=event_id)
        if workflow_status := self.request.query_params.get('status'):
            qs = qs.filter(status=workflow_status)
        if search := self.request.query_params.get('search'):
            qs = qs.filter(event__name__icontains=search)
        return qs

    def perform_create(self, serializer):
        workflow = serializer.save(created_by=self.request.user)
        Event.objects.filter(pk=workflow.event_id).update(
            rsvp_enabled=True,
            pass_send_at=None,
        )

    def destroy(self, request, *args, **kwargs):
        # Deleting the workflow removes its recipients/responses, but the event's
        # RSVP hold intentionally remains enabled until an operator explicitly
        # changes the delivery mode from the event settings.
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
        RsvpRecipient.objects.bulk_create(
            assign_unique_public_codes(new_recipients),
            ignore_conflicts=True,
        )

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
        recipients, filter_errors = _apply_recipient_filters(
            recipients,
            request.query_params,
        )
        if filter_errors:
            return Response(filter_errors, status=status.HTTP_400_BAD_REQUEST)

        class Echo:
            def write(self, value):
                return value

        writer = csv.writer(Echo())

        def rows():
            yield writer.writerow([
                'guest_name', 'phone_number', 'email',
                'ticket_type', 'table_number', 'response_status',
                'aso_ebi_requested', 'aso_ebi_yards', 'plus_one_attending',
                'responded_at', 'invitation_status', 'pass_status', 'reminder_count',
                'invitation_error', 'pass_error',
                'invitation_auto_retries', 'pass_auto_retries',
                'invitation_last_template', 'pass_last_template',
                'invitation_last_attempt_at', 'pass_last_attempt_at',
            ])
            for recipient in recipients.iterator():
                yield writer.writerow(safe_csv_row([
                    recipient.guest.full_name,
                    recipient.guest.phone_number,
                    recipient.guest.email,
                    recipient.guest.ticket_type,
                    recipient.guest.table_number,
                    recipient.response_status,
                    'Yes' if recipient.guest.aso_ebi_requested else 'No',
                    recipient.guest.aso_ebi_quantity if recipient.guest.aso_ebi_requested else 0,
                    'Yes' if recipient.guest.plus_one_attending else 'No',
                    recipient.responded_at.isoformat() if recipient.responded_at else '',
                    recipient.invitation_status,
                    recipient.pass_status,
                    recipient.reminder_count,
                    recipient.invitation_error,
                    recipient.pass_error,
                    recipient.invitation_auto_retries,
                    recipient.pass_auto_retries,
                    recipient.invitation_last_template_name,
                    recipient.pass_last_template_name,
                    recipient.invitation_queued_at.isoformat() if recipient.invitation_queued_at else '',
                    recipient.pass_queued_at.isoformat() if recipient.pass_queued_at else '',
                ]))

        safe_name = ''.join(
            character if character.isalnum() else '_'
            for character in workflow.event.name
        ).strip('_')
        response = StreamingHttpResponse(rows(), content_type='text/csv')
        suffixes = [
            request.query_params.get(name)
            for name in (
                'response_status', 'segment', 'invitation_status',
                'pass_status', 'delivery_status',
            )
            if request.query_params.get(name)
        ]
        if request.query_params.get('search'):
            suffixes.append('search')
        filter_suffix = f"_{'_'.join(suffixes)}" if suffixes else ''
        response['Content-Disposition'] = (
            f'attachment; filename="rsvp{filter_suffix}_{safe_name or workflow.id}.csv"'
        )
        return response

    @action(detail=True, methods=['post'])
    def launch(self, request, pk=None):
        requested_workflow = self.get_object()
        with transaction.atomic():
            # Do not reuse get_queryset() here. It select_related()s nullable
            # template/user relations, which makes PostgreSQL try to apply FOR
            # UPDATE to the nullable side of an outer join. Lock only the
            # workflow row; related objects can be loaded normally afterward.
            workflow = (
                RsvpWorkflow.objects
                .select_for_update()
                .get(pk=requested_workflow.pk)
            )
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
            if (
                'rsvp_deadline' in (workflow.invitation_template.body_params or [])
                and not workflow.response_deadline
            ):
                return Response(
                    {'detail': 'Set a response deadline because the invitation template includes the RSVP deadline.'},
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
                ).update(
                    invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
                    invitation_queued_at=None,
                )

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
        # Re-approve failed sends and clear the dispatch stamp on invitations
        # that were queued when the workflow paused (their tasks no-op'd), so
        # queue_workflow_invitations re-dispatches all of them within budget.
        workflow.recipients.filter(
            response_status=RsvpRecipient.ResponseStatus.AWAITING,
            invitation_status__in=[
                RsvpRecipient.InvitationStatus.FAILED,
                RsvpRecipient.InvitationStatus.QUEUED,
            ],
        ).update(
            invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
            invitation_queued_at=None,
        )
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

        now = timezone.now()
        cooldown_minutes = settings.RSVP_REMINDER_COOLDOWN_MINUTES
        reminder_cutoff = now - timedelta(minutes=cooldown_minutes)
        awaiting = workflow.recipients.filter(
            response_status=RsvpRecipient.ResponseStatus.AWAITING,
            reminder_count__lt=settings.RSVP_MAX_REMINDERS,
        )

        # Failed sends follow the same rules as the single and bulk retry
        # endpoints: a retryable WhatsApp error must be past its cooldown
        # unless the configured template has changed since the failure.
        configured_template = (
            workflow.invitation_template.name
            if workflow.invitation_template_id else ''
        )
        failed_ids, skipped_cooldown = [], 0
        failed_rows = awaiting.filter(
            invitation_status=RsvpRecipient.InvitationStatus.FAILED,
        ).values(
            'id', 'invitation_last_template_name', 'invitation_error',
            'last_error', 'invitation_queued_at', 'invitation_auto_retries',
        )
        for row in failed_rows:
            if not _template_changed(
                row['invitation_last_template_name'], configured_template,
            ):
                retry_at = _retry_available_at(
                    row['invitation_error'] or row['last_error'],
                    row['invitation_queued_at'],
                    row['invitation_auto_retries'],
                )
                if retry_at and now < retry_at:
                    skipped_cooldown += 1
                    continue
            failed_ids.append(row['id'])

        eligible = awaiting.filter(
            Q(
                pk__in=failed_ids,
                invitation_status=RsvpRecipient.InvitationStatus.FAILED,
            )
            | Q(
                invitation_status__in=[
                    RsvpRecipient.InvitationStatus.SENT,
                    RsvpRecipient.InvitationStatus.DELIVERED,
                    RsvpRecipient.InvitationStatus.READ,
                ],
            ) & (
                Q(last_reminded_at__lte=reminder_cutoff)
                | Q(last_reminded_at__isnull=True, invitation_sent_at__lte=reminder_cutoff)
            )
        )
        queued = eligible.update(
            invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
            invitation_queued_at=None,
            invitation_error='',
            last_error='',
        )
        if queued:
            from .tasks import queue_workflow_invitations
            queue_workflow_invitations.delay(workflow.id)
        return Response({
            'queued': queued,
            'skipped_cooldown': skipped_cooldown,
            'cooldown_minutes': cooldown_minutes,
            'max_reminders': settings.RSVP_MAX_REMINDERS,
        })

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
        Event.objects.filter(pk=workflow.event_id).update(rsvp_enabled=False)
        return Response(self.get_serializer(workflow).data)


class RsvpRecipientViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RsvpRecipientSerializer
    permission_classes = [ReadOnlyOrEventManager]
    queryset = (
        RsvpRecipient.objects
        .select_related(
            'workflow__event__whatsapp_template',
            'workflow__invitation_template',
            'workflow__pass_template',
            'guest__event__whatsapp_template',
        )
        .all()
    )

    def get_queryset(self):
        qs = super().get_queryset()
        if workflow_id := self.request.query_params.get('workflow'):
            qs = qs.filter(workflow_id=workflow_id)
        qs, filter_errors = _apply_recipient_filters(qs, self.request.query_params)
        return qs.none() if filter_errors else qs

    BULK_RETRY_MAX_SELECTION = 500

    @action(detail=False, methods=['post'], url_path='bulk-retry')
    def bulk_retry(self, request):
        """Retry failed invitations or passes for an explicit selection.

        Mirrors the single-recipient retry rules: only failed sends are
        touched, and recipients whose retryable WhatsApp error is still in
        its cooldown are skipped (reported back, not errored) so one cooling
        guest doesn't block the rest of the selection.
        """
        from .tasks import send_confirmed_pass, send_rsvp_invitation
        from .whatsapp import (
            configured_invitation_template_name,
            configured_pass_template_name,
        )

        kind = request.data.get('kind')
        recipient_ids = request.data.get('recipient_ids')
        if kind not in {'invitation', 'pass'}:
            return Response(
                {'detail': "kind must be 'invitation' or 'pass'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(recipient_ids, list) or not recipient_ids:
            return Response(
                {'detail': 'Select at least one guest to retry.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        recipient_ids = recipient_ids[:self.BULK_RETRY_MAX_SELECTION]

        now = timezone.now()
        if kind == 'invitation':
            rows = RsvpRecipient.objects.select_related(
                'workflow__invitation_template',
            ).filter(
                pk__in=recipient_ids,
                workflow__status=RsvpWorkflow.Status.ACTIVE,
                response_status=RsvpRecipient.ResponseStatus.AWAITING,
                invitation_status=RsvpRecipient.InvitationStatus.FAILED,
            )
            error_field, stamp_field = 'invitation_error', 'invitation_queued_at'
            retries_field = 'invitation_auto_retries'
            template_field = 'invitation_last_template_name'
            configured_template = configured_invitation_template_name
            claim_filters = {
                'invitation_status': RsvpRecipient.InvitationStatus.FAILED,
            }
            claim_updates = {
                'invitation_status': RsvpRecipient.InvitationStatus.QUEUED,
                'invitation_queued_at': now,
                'invitation_error': '',
                'last_error': '',
            }
            send_task = send_rsvp_invitation
        else:
            rows = RsvpRecipient.objects.select_related(
                'workflow__pass_template',
                'guest__event__whatsapp_template',
            ).filter(
                pk__in=recipient_ids,
                response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
                pass_status=RsvpRecipient.PassStatus.FAILED,
            )
            error_field, stamp_field = 'pass_error', 'pass_queued_at'
            retries_field = 'pass_auto_retries'
            template_field = 'pass_last_template_name'
            configured_template = configured_pass_template_name
            claim_filters = {'pass_status': RsvpRecipient.PassStatus.FAILED}
            claim_updates = {
                'pass_status': RsvpRecipient.PassStatus.QUEUED,
                'pass_queued_at': now,
                'pass_error': '',
                'last_error': '',
            }
            send_task = send_confirmed_pass

        rows = list(rows)
        eligible_ids, cooling = [], 0
        for row in rows:
            if _template_changed(
                getattr(row, template_field),
                configured_template(row),
            ):
                eligible_ids.append(row.id)
                continue
            retry_at = _retry_available_at(
                getattr(row, error_field) or row.last_error,
                getattr(row, stamp_field),
                getattr(row, retries_field),
            )
            if retry_at and now < retry_at:
                cooling += 1
                continue
            eligible_ids.append(row.id)

        queued = 0
        if eligible_ids:
            RsvpRecipient.objects.filter(
                pk__in=eligible_ids, **claim_filters,
            ).update(**claim_updates)
            claimed_ids = list(
                RsvpRecipient.objects.filter(
                    pk__in=eligible_ids, **{stamp_field: now},
                ).values_list('id', flat=True)
            )
            for recipient_id in claimed_ids:
                send_task.delay(recipient_id)
            queued = len(claimed_ids)

        return Response({
            'queued': queued,
            'skipped_cooldown': cooling,
            'skipped_ineligible': len(recipient_ids) - len(rows),
        })

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
        # force=True is the operator's explicit "retry anyway" during a
        # cooldown — e.g. the guest just messaged back, which lifts Meta's
        # per-user block. Deliberately not offered on the bulk endpoint.
        from .whatsapp import configured_invitation_template_name

        configured_template = configured_invitation_template_name(recipient)
        template_changed = _template_changed(
            recipient.invitation_last_template_name,
            configured_template,
        )
        if not bool(request.data.get('force')) and not template_changed:
            if cooldown := _retry_cooldown_response(
                recipient.invitation_error or recipient.last_error,
                recipient.invitation_queued_at,
                recipient.invitation_auto_retries,
            ):
                return cooldown
        recipient.invitation_status = RsvpRecipient.InvitationStatus.QUEUED
        recipient.invitation_queued_at = timezone.now()
        recipient.invitation_error = ''
        recipient.last_error = ''
        recipient.save(update_fields=[
            'invitation_status', 'invitation_queued_at', 'invitation_error',
            'last_error', 'updated_at',
        ])
        from .tasks import send_rsvp_invitation
        send_rsvp_invitation.delay(recipient.id)
        return Response({
            'queued': True,
            'template': configured_template,
            'template_changed': template_changed,
        })

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
        from .whatsapp import configured_pass_template_name

        configured_template = configured_pass_template_name(recipient)
        template_changed = _template_changed(
            recipient.pass_last_template_name,
            configured_template,
        )
        if not bool(request.data.get('force')) and not template_changed:
            if cooldown := _retry_cooldown_response(
                recipient.pass_error or recipient.last_error,
                recipient.pass_queued_at,
                recipient.pass_auto_retries,
            ):
                return cooldown
        recipient.pass_status = RsvpRecipient.PassStatus.QUEUED
        recipient.pass_queued_at = timezone.now()
        recipient.pass_error = ''
        recipient.last_error = ''
        recipient.save(update_fields=[
            'pass_status', 'pass_queued_at', 'pass_error', 'last_error',
            'updated_at',
        ])
        from .tasks import send_confirmed_pass
        send_confirmed_pass.delay(recipient.id)
        return Response({
            'queued': True,
            'template': configured_template,
            'template_changed': template_changed,
        })


class PublicRsvpResponseView(APIView):
    """Guest-facing RSVP endpoint secured by a short code or legacy UUID."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'public_rsvp'

    def get_recipient(self, identifier):
        recipients = RsvpRecipient.objects.select_related('workflow__event', 'guest')
        recipient = recipients.filter(
            Q(public_code=identifier) | Q(legacy_public_code=identifier)
        ).first()
        if recipient:
            return recipient
        try:
            legacy_token = uuid.UUID(str(identifier))
        except (TypeError, ValueError, AttributeError):
            legacy_token = None
        return get_object_or_404(recipients, callback_token=legacy_token)

    def get(self, request, identifier):
        recipient = self.get_recipient(identifier)
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
            'rsvp_message': workflow.event.rsvp_message,
            'color_of_day': workflow.event.color_of_day,
            'collect_aso_ebi': workflow.event.collect_aso_ebi,
            'allow_plus_one': workflow.event.allow_plus_one,
            'aso_ebi_requested': recipient.guest.aso_ebi_requested,
            'aso_ebi_quantity': recipient.guest.aso_ebi_quantity,
            'plus_one_attending': recipient.guest.plus_one_attending,
            'invitation_image': (
                request.build_absolute_uri(recipient.invitation_image.url)
                if recipient.invitation_image else None
            ),
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

    def post(self, request, identifier):
        answer = request.data.get('answer')
        if answer not in {'yes', 'no'}:
            return Response(
                {'detail': 'answer must be yes or no.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        recipient = self.get_recipient(identifier)
        aso_ebi_requested = request.data.get('aso_ebi_requested', False)
        if not isinstance(aso_ebi_requested, bool):
            return Response(
                {'detail': 'aso_ebi_requested must be true or false.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if answer == 'no':
            aso_ebi_requested = False
        plus_one_attending = request.data.get('plus_one_attending', False)
        if not isinstance(plus_one_attending, bool):
            return Response(
                {'detail': 'plus_one_attending must be true or false.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if answer == 'no':
            plus_one_attending = False
        if plus_one_attending and not recipient.workflow.event.allow_plus_one:
            return Response(
                {'detail': 'Plus ones are not enabled for this event.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if aso_ebi_requested and not recipient.workflow.event.collect_aso_ebi:
            return Response(
                {'detail': 'Aso Ebi requests are not enabled for this event.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            aso_ebi_quantity = int(request.data.get('aso_ebi_quantity', 0))
        except (TypeError, ValueError):
            aso_ebi_quantity = 0
        if aso_ebi_requested and aso_ebi_quantity < 1:
            return Response(
                {'detail': 'Enter at least 1 yard for the Aso Ebi request.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .models import RsvpResponse
        from .services import record_response
        result = record_response(
            callback_token=recipient.callback_token,
            answer=answer,
            response_id=f'web:{uuid.uuid4()}',
            source=RsvpResponse.Source.WEB,
            raw_payload={
                'answer': answer,
                'aso_ebi_requested': aso_ebi_requested,
                'aso_ebi_quantity': aso_ebi_quantity if aso_ebi_requested else 0,
                'plus_one_attending': plus_one_attending,
            },
            aso_ebi_requested=aso_ebi_requested,
            aso_ebi_quantity=aso_ebi_quantity if aso_ebi_requested else 0,
            plus_one_attending=plus_one_attending,
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
