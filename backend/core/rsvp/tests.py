import hashlib
import hmac
import json
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from guests.models import Event, Guest, WhatsAppTemplate

from .models import RsvpRecipient, RsvpResponse, RsvpWorkflow
from .services import pass_delivery_allowed, process_incoming_message, process_status_update
from .whatsapp import build_callback_data, build_rsvp_url, send_invitation


def make_event(name='RSVP Test Event'):
    return Event.objects.create(
        name=name,
        date=timezone.now() + timezone.timedelta(days=14),
        venue='Test Venue',
        whatsapp_enabled=True,
    )


def make_template(name, *, header=False, body_params=None):
    params = body_params or ['guest_name']
    return WhatsAppTemplate.objects.create(
        name=name,
        display_name=name.replace('_', ' ').title(),
        body_text=' '.join(f'{{{{{index + 1}}}}}' for index in range(len(params))),
        body_params=params,
        has_header_image=header,
    )


class RsvpWorkflowApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            username='rsvp-manager',
            password='pass',
            role='event_manager',
        )
        self.client.force_authenticate(self.manager)
        self.event = make_event()
        self.invitation_template = make_template(
            'rsvp_invitation',
            body_params=['guest_name', 'rsvp_link'],
        )
        self.pass_template = make_template('rsvp_pass', header=True)
        self.guest_a = Guest.objects.create(
            event=self.event,
            full_name='Ada Guest',
            phone_number='2348000000001',
        )
        self.guest_b = Guest.objects.create(
            event=self.event,
            full_name='No Phone',
            phone_number='',
        )

    def create_workflow(self):
        response = self.client.post('/api/rsvp/workflows/', {
            'event': self.event.id,
            'invitation_template': self.invitation_template.id,
            'pass_template': self.pass_template.id,
            'auto_send_pass': True,
            'response_deadline': (
                timezone.now() + timezone.timedelta(days=7)
            ).isoformat(),
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return RsvpWorkflow.objects.get(pk=response.data['id'])

    def test_create_workflow_is_attached_without_changing_event(self):
        workflow = self.create_workflow()
        self.assertEqual(workflow.event, self.event)
        self.assertEqual(workflow.created_by, self.manager)
        self.assertEqual(workflow.status, RsvpWorkflow.Status.DRAFT)
        self.event.refresh_from_db()
        self.assertTrue(self.event.whatsapp_enabled)

    def test_only_one_workflow_is_allowed_per_event(self):
        self.create_workflow()
        response = self.client.post('/api/rsvp/workflows/', {
            'event': self.event.id,
            'invitation_template': self.invitation_template.id,
            'pass_template': self.pass_template.id,
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_invitation_template_must_contain_rsvp_link(self):
        template_without_link = make_template('rsvp_without_link')
        response = self.client.post('/api/rsvp/workflows/', {
            'event': self.event.id,
            'invitation_template': template_without_link.id,
            'pass_template': self.pass_template.id,
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('rsvp_link', str(response.data))

    def test_populate_recipients_adds_only_guests_with_phone_numbers(self):
        workflow = self.create_workflow()
        response = self.client.post(
            f'/api/rsvp/workflows/{workflow.id}/populate-recipients/',
            {},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'added': 1, 'total': 1})
        self.assertTrue(workflow.recipients.filter(guest=self.guest_a).exists())
        self.assertFalse(workflow.recipients.filter(guest=self.guest_b).exists())

    @patch('rsvp.tasks.queue_workflow_invitations.delay')
    def test_launch_queues_invitations_and_activates_workflow(self, mock_queue):
        mock_queue.return_value.id = 'task-123'
        workflow = self.create_workflow()
        RsvpRecipient.objects.create(workflow=workflow, guest=self.guest_a)

        response = self.client.post(f'/api/rsvp/workflows/{workflow.id}/launch/')

        self.assertEqual(response.status_code, 200, response.data)
        workflow.refresh_from_db()
        self.assertEqual(workflow.status, RsvpWorkflow.Status.ACTIVE)
        self.assertIsNotNone(workflow.launched_at)
        self.assertEqual(
            workflow.recipients.get().invitation_status,
            RsvpRecipient.InvitationStatus.QUEUED,
        )
        mock_queue.assert_called_once_with(workflow.id)

    def test_stats_keep_response_and_delivery_counts_separate(self):
        workflow = self.create_workflow()
        RsvpRecipient.objects.create(
            workflow=workflow,
            guest=self.guest_a,
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
            invitation_status=RsvpRecipient.InvitationStatus.READ,
            pass_status=RsvpRecipient.PassStatus.DELIVERED,
        )
        response = self.client.get(f'/api/rsvp/workflows/{workflow.id}/stats/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['invited'], 1)
        self.assertEqual(response.data['confirmed'], 1)
        self.assertEqual(response.data['invitation_delivered'], 1)
        self.assertEqual(response.data['passes_sent'], 1)
        self.assertEqual(response.data['confirmation_rate'], 100.0)

    def test_export_contains_response_and_delivery_columns(self):
        workflow = self.create_workflow()
        RsvpRecipient.objects.create(workflow=workflow, guest=self.guest_a)
        response = self.client.get(f'/api/rsvp/workflows/{workflow.id}/export/')
        self.assertEqual(response.status_code, 200)
        body = b''.join(response.streaming_content).decode('utf-8')
        self.assertIn('response_status', body)
        self.assertIn('invitation_status', body)
        self.assertIn('Ada Guest', body)


class RsvpIsolationTests(TestCase):
    def setUp(self):
        self.event = make_event()
        self.guest = Guest.objects.create(
            event=self.event,
            full_name='Isolation Guest',
            phone_number='2348000000001',
        )

    def test_event_without_workflow_keeps_normal_pass_delivery(self):
        self.assertTrue(pass_delivery_allowed(self.guest.id, self.event.id))

    def test_draft_workflow_holds_pass_until_recipient_confirms(self):
        workflow = RsvpWorkflow.objects.create(event=self.event)
        recipient = RsvpRecipient.objects.create(workflow=workflow, guest=self.guest)
        self.assertFalse(pass_delivery_allowed(self.guest.id, self.event.id))

        recipient.response_status = RsvpRecipient.ResponseStatus.CONFIRMED
        recipient.save(update_fields=['response_status'])
        self.assertTrue(pass_delivery_allowed(self.guest.id, self.event.id))

    def test_completed_workflow_restores_normal_delivery(self):
        RsvpWorkflow.objects.create(
            event=self.event,
            status=RsvpWorkflow.Status.COMPLETED,
        )
        self.assertTrue(pass_delivery_allowed(self.guest.id, self.event.id))


class RsvpResponseTests(TestCase):
    def setUp(self):
        self.event = make_event()
        self.guest = Guest.objects.create(
            event=self.event,
            full_name='Reply Guest',
            phone_number='+234 800 000 0001',
        )
        self.workflow = RsvpWorkflow.objects.create(
            event=self.event,
            status=RsvpWorkflow.Status.ACTIVE,
            auto_send_pass=True,
        )
        self.recipient = RsvpRecipient.objects.create(
            workflow=self.workflow,
            guest=self.guest,
            invitation_status=RsvpRecipient.InvitationStatus.DELIVERED,
        )

    def message(self, answer='yes', message_id='wamid.reply-1', sender='2348000000001'):
        return {
            'id': message_id,
            'from': sender,
            'type': 'button',
            'button': {
                'text': 'Yes' if answer == 'yes' else 'No',
                'payload': build_callback_data(self.recipient, answer),
            },
        }

    @patch('rsvp.tasks.send_confirmed_pass.delay')
    def test_yes_confirms_and_queues_exactly_one_pass(self, mock_send):
        with self.captureOnCommitCallbacks(execute=True):
            handled = process_incoming_message(self.message())
        self.assertTrue(handled)
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.response_status, RsvpRecipient.ResponseStatus.CONFIRMED)
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.QUEUED)
        self.assertEqual(RsvpResponse.objects.count(), 1)
        mock_send.assert_called_once_with(self.recipient.id)

        with self.captureOnCommitCallbacks(execute=True):
            process_incoming_message(self.message())
        self.assertEqual(RsvpResponse.objects.count(), 1)
        mock_send.assert_called_once_with(self.recipient.id)

    @patch('rsvp.tasks.send_confirmed_pass.delay')
    def test_no_declines_without_queuing_a_pass(self, mock_send):
        with self.captureOnCommitCallbacks(execute=True):
            process_incoming_message(self.message(answer='no'))
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.response_status, RsvpRecipient.ResponseStatus.DECLINED)
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.NOT_ISSUED)
        mock_send.assert_not_called()

    @patch('rsvp.tasks.send_confirmed_pass.delay')
    def test_callback_from_a_different_phone_is_ignored(self, mock_send):
        process_incoming_message(self.message(sender='2348111111111'))
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.response_status, RsvpRecipient.ResponseStatus.AWAITING)
        self.assertFalse(RsvpResponse.objects.exists())
        mock_send.assert_not_called()

    def test_delivery_status_matches_the_outbound_message_id(self):
        self.recipient.invitation_message_id = 'wamid.invitation-1'
        self.recipient.save(update_fields=['invitation_message_id'])
        handled = process_status_update({
            'id': 'wamid.invitation-1',
            'status': 'read',
            'recipient_id': '2348000000001',
        })
        self.assertTrue(handled)
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.invitation_status, RsvpRecipient.InvitationStatus.READ)

    def test_non_rsvp_message_is_left_for_existing_webhook_processing(self):
        handled = process_incoming_message({
            'id': 'wamid.text-1',
            'from': '2348000000001',
            'type': 'text',
            'text': {'body': 'Hello'},
        })
        self.assertFalse(handled)


class PublicRsvpPageApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.event = make_event(name='Public RSVP Event')
        self.guest = Guest.objects.create(
            event=self.event,
            full_name='Public Guest',
            phone_number='2348000000001',
        )
        self.workflow = RsvpWorkflow.objects.create(
            event=self.event,
            status=RsvpWorkflow.Status.ACTIVE,
            auto_send_pass=True,
            response_deadline=timezone.now() + timezone.timedelta(days=5),
        )
        self.recipient = RsvpRecipient.objects.create(
            workflow=self.workflow,
            guest=self.guest,
        )
        self.url = f'/api/rsvp/respond/{self.recipient.callback_token}/'

    def test_public_details_are_available_without_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['guest_name'], 'Public Guest')
        self.assertEqual(response.data['event_name'], 'Public RSVP Event')
        self.assertTrue(response.data['can_respond'])

    @patch('rsvp.tasks.send_confirmed_pass.delay')
    def test_yes_response_confirms_and_queues_one_pass(self, mock_send):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self.url, {'answer': 'yes'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['accepted'])
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.response_status, RsvpRecipient.ResponseStatus.CONFIRMED)
        self.assertEqual(RsvpResponse.objects.get().source, RsvpResponse.Source.WEB)
        mock_send.assert_called_once_with(self.recipient.id)

        with self.captureOnCommitCallbacks(execute=True):
            duplicate = self.client.post(self.url, {'answer': 'yes'}, format='json')
        self.assertEqual(duplicate.status_code, 200)
        self.assertTrue(duplicate.data['already_responded'])
        self.assertEqual(RsvpResponse.objects.count(), 1)
        mock_send.assert_called_once_with(self.recipient.id)

    @patch('rsvp.tasks.send_confirmed_pass.delay')
    def test_no_response_declines_without_a_pass(self, mock_send):
        response = self.client.post(self.url, {'answer': 'no'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.response_status, RsvpRecipient.ResponseStatus.DECLINED)
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.NOT_ISSUED)
        mock_send.assert_not_called()

    def test_invalid_answer_is_rejected(self):
        response = self.client.post(self.url, {'answer': 'maybe'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.response_status, RsvpRecipient.ResponseStatus.AWAITING)

    def test_expired_deadline_is_closed(self):
        self.workflow.response_deadline = timezone.now() - timezone.timedelta(minutes=1)
        self.workflow.save(update_fields=['response_deadline'])
        details = self.client.get(self.url)
        self.assertFalse(details.data['can_respond'])
        self.assertEqual(details.data['closed_reason'], 'deadline_passed')
        response = self.client.post(self.url, {'answer': 'yes'}, format='json')
        self.assertEqual(response.status_code, 410)

    def test_rsvp_link_uses_the_public_frontend_url(self):
        with self.settings(SITE_URL='https://events.example.com'):
            self.assertEqual(
                build_rsvp_url(self.recipient),
                f'https://events.example.com/rsvp/{self.recipient.callback_token}',
            )


class RsvpInvitationLinkTests(TestCase):
    @patch('rsvp.whatsapp._get_client')
    def test_invitation_contains_link_parameter_and_no_button_parameters(self, mock_client):
        event = make_event()
        guest = Guest.objects.create(
            event=event,
            full_name='Link Guest',
            phone_number='2348000000001',
        )
        template = make_template(
            'link_invitation',
            body_params=['guest_name', 'rsvp_link'],
        )
        workflow = RsvpWorkflow.objects.create(
            event=event,
            invitation_template=template,
            status=RsvpWorkflow.Status.ACTIVE,
        )
        recipient = RsvpRecipient.objects.create(workflow=workflow, guest=guest)
        mock_client.return_value.send_template.return_value.id = 'wamid.link-invite'

        with self.settings(
            WHATSAPP_PHONE_ID='phone-id',
            WHATSAPP_TOKEN='token',
            SITE_URL='https://events.example.com',
        ):
            send_invitation(recipient)

        params = mock_client.return_value.send_template.call_args.kwargs['params']
        self.assertEqual(len(params), 1)
        self.assertEqual(params[0].positionals[0], 'Link Guest')
        self.assertEqual(
            params[0].positionals[1],
            f'https://events.example.com/rsvp/{recipient.callback_token}',
        )


class WebhookSignatureTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_invalid_signature_is_rejected_when_app_secret_is_configured(self):
        payload = json.dumps({'entry': []}).encode('utf-8')
        with self.settings(WHATSAPP_APP_SECRET='secret'):
            response = self.client.generic(
                'POST',
                '/api/webhooks/whatsapp/',
                payload,
                content_type='application/json',
                HTTP_X_HUB_SIGNATURE_256='sha256=invalid',
            )
        self.assertEqual(response.status_code, 403)

    def test_valid_signature_is_accepted(self):
        payload = json.dumps({'entry': []}).encode('utf-8')
        signature = 'sha256=' + hmac.new(b'secret', payload, hashlib.sha256).hexdigest()
        with self.settings(WHATSAPP_APP_SECRET='secret'):
            response = self.client.generic(
                'POST',
                '/api/webhooks/whatsapp/',
                payload,
                content_type='application/json',
                HTTP_X_HUB_SIGNATURE_256=signature,
            )
        self.assertEqual(response.status_code, 200)


class RsvpTaskClaimTests(TestCase):
    def setUp(self):
        self.event = make_event()
        self.guest = Guest.objects.create(
            event=self.event,
            full_name='Claim Guest',
            phone_number='2348000000001',
        )
        self.workflow = RsvpWorkflow.objects.create(
            event=self.event,
            status=RsvpWorkflow.Status.ACTIVE,
        )

    @patch('rsvp.whatsapp.send_invitation')
    def test_duplicate_invitation_task_only_calls_whatsapp_once(self, mock_send):
        from .tasks import send_rsvp_invitation

        mock_send.return_value.id = 'wamid.invite-claim'
        recipient = RsvpRecipient.objects.create(
            workflow=self.workflow,
            guest=self.guest,
            invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
        )
        first = send_rsvp_invitation(recipient.id)
        second = send_rsvp_invitation(recipient.id)
        self.assertTrue(first['sent'])
        self.assertFalse(second['sent'])
        mock_send.assert_called_once()

    @patch('rsvp.whatsapp.send_configured_pass')
    def test_duplicate_pass_task_only_calls_whatsapp_once(self, mock_send):
        from .tasks import send_confirmed_pass

        mock_send.return_value.id = 'wamid.pass-claim'
        recipient = RsvpRecipient.objects.create(
            workflow=self.workflow,
            guest=self.guest,
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
            pass_status=RsvpRecipient.PassStatus.QUEUED,
        )
        first = send_confirmed_pass(recipient.id)
        second = send_confirmed_pass(recipient.id)
        self.assertTrue(first['sent'])
        self.assertFalse(second['sent'])
        mock_send.assert_called_once()
