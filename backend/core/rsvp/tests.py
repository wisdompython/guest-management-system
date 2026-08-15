import hashlib
import hmac
import io
import json
import tempfile
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from PIL import Image

from accounts.models import User
from guests.models import Event, Guest, WhatsAppTemplate

from .models import (
    RsvpRecipient,
    RsvpResponse,
    RsvpWorkflow,
    assign_unique_public_codes,
)
from .services import pass_delivery_allowed, process_incoming_message, process_status_update
from .whatsapp import build_callback_data, build_rsvp_url, send_invitation


def make_event(name='RSVP Test Event'):
    return Event.objects.create(
        name=name,
        date=timezone.now() + timezone.timedelta(days=14),
        venue='Test Venue',
        design_template='event_templates/test-pass.png',
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
        self.assertTrue(self.event.rsvp_enabled)

    def test_only_one_workflow_is_allowed_per_event(self):
        self.create_workflow()
        response = self.client.post('/api/rsvp/workflows/', {
            'event': self.event.id,
            'invitation_template': self.invitation_template.id,
            'pass_template': self.pass_template.id,
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_event_cannot_be_changed_after_workflow_creation(self):
        workflow = self.create_workflow()
        other_event = make_event(name='Other Event')

        response = self.client.patch(
            f'/api/rsvp/workflows/{workflow.id}/',
            {'event': other_event.id},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('cannot be changed', str(response.data))
        workflow.refresh_from_db()
        self.assertEqual(workflow.event, self.event)

    def test_active_workflow_can_be_edited(self):
        workflow = self.create_workflow()
        workflow.status = RsvpWorkflow.Status.ACTIVE
        workflow.invitation_send_at = timezone.now() - timezone.timedelta(hours=1)
        workflow.save(update_fields=['status', 'invitation_send_at'])

        response = self.client.patch(
            f'/api/rsvp/workflows/{workflow.id}/',
            {'auto_send_pass': False},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        workflow.refresh_from_db()
        self.assertFalse(workflow.auto_send_pass)

    def test_active_workflow_can_be_deleted(self):
        workflow = self.create_workflow()
        workflow.status = RsvpWorkflow.Status.ACTIVE
        workflow.save(update_fields=['status'])
        RsvpRecipient.objects.create(workflow=workflow, guest=self.guest_a)

        response = self.client.delete(f'/api/rsvp/workflows/{workflow.id}/')

        self.assertEqual(response.status_code, 204)
        self.assertFalse(RsvpWorkflow.objects.filter(pk=workflow.id).exists())
        self.assertFalse(RsvpRecipient.objects.filter(workflow_id=workflow.id).exists())
        self.assertTrue(Event.objects.filter(pk=self.event.id).exists())
        self.event.refresh_from_db()
        self.assertTrue(self.event.rsvp_enabled)
        self.assertFalse(pass_delivery_allowed(self.guest_a.id, self.event.id))

    def test_completing_workflow_explicitly_restores_direct_delivery(self):
        workflow = self.create_workflow()
        workflow.status = RsvpWorkflow.Status.ACTIVE
        workflow.save(update_fields=['status'])

        response = self.client.post(f'/api/rsvp/workflows/{workflow.id}/complete/')

        self.assertEqual(response.status_code, 200, response.data)
        self.event.refresh_from_db()
        self.assertFalse(self.event.rsvp_enabled)
        self.assertTrue(pass_delivery_allowed(self.guest_a.id, self.event.id))

    def test_template_in_use_cannot_be_deleted(self):
        self.create_workflow()

        response = self.client.delete(
            f'/api/whatsapp-templates/{self.invitation_template.id}/',
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn('currently used', str(response.data))

    def test_unused_template_can_be_deleted(self):
        unused = make_template('unused_template')

        response = self.client.delete(f'/api/whatsapp-templates/{unused.id}/')

        self.assertEqual(response.status_code, 204)
        self.assertFalse(WhatsAppTemplate.objects.filter(pk=unused.id).exists())

    def test_event_template_in_use_cannot_be_deleted(self):
        self.event.whatsapp_template = self.invitation_template
        self.event.save(update_fields=['whatsapp_template'])

        response = self.client.delete(
            f'/api/whatsapp-templates/{self.invitation_template.id}/',
        )

        self.assertEqual(response.status_code, 409)
        self.event.refresh_from_db()
        self.assertEqual(self.event.whatsapp_template_id, self.invitation_template.id)

    def test_invitation_template_must_contain_rsvp_link(self):
        template_without_link = make_template('rsvp_without_link')
        response = self.client.post('/api/rsvp/workflows/', {
            'event': self.event.id,
            'invitation_template': template_without_link.id,
            'pass_template': self.pass_template.id,
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('rsvp_link', str(response.data))

    def test_template_deadline_variable_requires_workflow_deadline(self):
        deadline_template = make_template(
            'rsvp_with_deadline',
            body_params=['guest_name', 'rsvp_link', 'rsvp_deadline'],
        )
        response = self.client.post('/api/rsvp/workflows/', {
            'event': self.event.id,
            'invitation_template': deadline_template.id,
            'auto_send_pass': False,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('Set a response deadline', str(response.data))

    def test_pass_template_must_have_image_header(self):
        text_only_pass = make_template(
            'text_only_pass',
            body_params=['guest_name', 'event_name'],
        )

        response = self.client.post('/api/rsvp/workflows/', {
            'event': self.event.id,
            'invitation_template': self.invitation_template.id,
            'pass_template': text_only_pass.id,
            'auto_send_pass': True,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('image header', str(response.data))

    def test_auto_pass_delivery_requires_event_pass_design(self):
        self.event.design_template = None
        self.event.save(update_fields=['design_template'])

        response = self.client.post('/api/rsvp/workflows/', {
            'event': self.event.id,
            'invitation_template': self.invitation_template.id,
            'pass_template': self.pass_template.id,
            'auto_send_pass': True,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('guest-pass design', str(response.data))

    def test_image_header_template_requires_rsvp_artwork(self):
        image_template = make_template(
            'rsvp_image_header',
            header=True,
            body_params=['guest_name', 'rsvp_link'],
        )
        response = self.client.post('/api/rsvp/workflows/', {
            'event': self.event.id,
            'invitation_template': image_template.id,
            'pass_template': self.pass_template.id,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('artwork', str(response.data).lower())

    def test_workflow_accepts_uploaded_rsvp_artwork_and_name_zone(self):
        image_template = make_template(
            'rsvp_uploaded_artwork',
            header=True,
            body_params=['guest_name', 'rsvp_link'],
        )
        artwork_buffer = io.BytesIO()
        Image.new('RGB', (400, 600), '#182030').save(artwork_buffer, format='PNG')
        artwork = SimpleUploadedFile(
            'rsvp.png',
            artwork_buffer.getvalue(),
            content_type='image/png',
        )

        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            response = self.client.post('/api/rsvp/workflows/', {
                'event': str(self.event.id),
                'invitation_template': str(image_template.id),
                'pass_template': '',
                'response_deadline': '',
                'invitation_send_at': '',
                'auto_send_pass': 'true',
                'pass_send_at': '',
                'invitation_design': artwork,
                'invitation_name_zone_x': '0.1',
                'invitation_name_zone_y': '0.7',
                'invitation_name_zone_w': '0.8',
                'invitation_name_zone_h': '0.1',
            }, format='multipart')

            self.assertEqual(response.status_code, 201, response.data)
            workflow = RsvpWorkflow.objects.get(pk=response.data['id'])
            self.assertTrue(workflow.invitation_design.name.startswith('rsvp_designs/'))
            self.assertEqual(workflow.invitation_name_zone_w, 0.8)

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

        duplicate = self.client.post(f'/api/rsvp/workflows/{workflow.id}/launch/')
        self.assertEqual(duplicate.status_code, 409)
        mock_queue.assert_called_once_with(workflow.id)

    @patch('rsvp.views.RsvpWorkflow.objects.select_for_update')
    @patch('rsvp.tasks.queue_workflow_invitations.delay')
    def test_launch_locks_only_the_workflow_table(self, mock_queue, mock_select_for_update):
        mock_queue.return_value.id = 'task-locked'
        workflow = self.create_workflow()
        RsvpRecipient.objects.create(workflow=workflow, guest=self.guest_a)
        mock_select_for_update.return_value.get.return_value = workflow

        response = self.client.post(f'/api/rsvp/workflows/{workflow.id}/launch/')

        self.assertEqual(response.status_code, 200, response.data)
        mock_select_for_update.assert_called_once_with()
        mock_select_for_update.return_value.get.assert_called_once_with(pk=workflow.pk)

    @patch('rsvp.tasks.queue_workflow_invitations.delay')
    def test_launch_holds_invitations_until_the_scheduled_time(self, mock_queue):
        workflow = self.create_workflow()
        workflow.invitation_send_at = timezone.now() + timezone.timedelta(hours=2)
        workflow.save(update_fields=['invitation_send_at'])
        recipient = RsvpRecipient.objects.create(workflow=workflow, guest=self.guest_a)

        response = self.client.post(f'/api/rsvp/workflows/{workflow.id}/launch/')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['scheduled'])
        recipient.refresh_from_db()
        self.assertEqual(recipient.invitation_status, RsvpRecipient.InvitationStatus.NOT_SENT)
        mock_queue.assert_not_called()

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
        self.assertIn('phone_number', body)
        self.assertIn('Ada Guest', body)

    def test_export_escapes_spreadsheet_formulas(self):
        workflow = self.create_workflow()
        self.guest_a.full_name = '=HYPERLINK("https://example.com")'
        self.guest_a.save(update_fields=['full_name'])
        RsvpRecipient.objects.create(workflow=workflow, guest=self.guest_a)

        response = self.client.get(f'/api/rsvp/workflows/{workflow.id}/export/')
        body = b''.join(response.streaming_content).decode('utf-8')

        self.assertIn("'=HYPERLINK", body)

    def test_export_can_include_only_confirmed_guests(self):
        workflow = self.create_workflow()
        RsvpRecipient.objects.create(
            workflow=workflow,
            guest=self.guest_a,
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
        )
        RsvpRecipient.objects.create(workflow=workflow, guest=self.guest_b)

        response = self.client.get(
            f'/api/rsvp/workflows/{workflow.id}/export/',
            {'response_status': 'confirmed'},
        )
        body = b''.join(response.streaming_content).decode('utf-8')

        self.assertIn('Ada Guest', body)
        self.assertNotIn('No Phone', body)
        self.assertIn('rsvp_confirmed_', response['Content-Disposition'])

    @override_settings(RSVP_REMINDER_COOLDOWN_MINUTES=60, RSVP_MAX_REMINDERS=2)
    @patch('rsvp.tasks.queue_workflow_invitations.delay')
    def test_reminders_respect_cooldown_and_cap(self, mock_queue):
        workflow = self.create_workflow()
        workflow.status = RsvpWorkflow.Status.ACTIVE
        workflow.save(update_fields=['status'])
        old = timezone.now() - timezone.timedelta(hours=2)
        recent = timezone.now() - timezone.timedelta(minutes=10)
        eligible_guest = Guest.objects.create(event=self.event, full_name='Eligible', phone_number='2348000000002')
        recent_guest = Guest.objects.create(event=self.event, full_name='Recent', phone_number='2348000000003')
        capped_guest = Guest.objects.create(event=self.event, full_name='Capped', phone_number='2348000000004')
        eligible = RsvpRecipient.objects.create(workflow=workflow, guest=eligible_guest, invitation_status=RsvpRecipient.InvitationStatus.SENT, invitation_sent_at=old)
        recent_recipient = RsvpRecipient.objects.create(workflow=workflow, guest=recent_guest, invitation_status=RsvpRecipient.InvitationStatus.SENT, invitation_sent_at=recent)
        capped = RsvpRecipient.objects.create(workflow=workflow, guest=capped_guest, invitation_status=RsvpRecipient.InvitationStatus.READ, invitation_sent_at=old, reminder_count=2)

        response = self.client.post(f'/api/rsvp/workflows/{workflow.id}/remind-awaiting/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['queued'], 1)
        eligible.refresh_from_db()
        recent_recipient.refresh_from_db()
        capped.refresh_from_db()
        self.assertEqual(eligible.invitation_status, RsvpRecipient.InvitationStatus.QUEUED)
        self.assertEqual(recent_recipient.invitation_status, RsvpRecipient.InvitationStatus.SENT)
        self.assertEqual(capped.invitation_status, RsvpRecipient.InvitationStatus.READ)
        mock_queue.assert_called_once_with(workflow.id)

        duplicate = self.client.post(f'/api/rsvp/workflows/{workflow.id}/remind-awaiting/')
        self.assertEqual(duplicate.data['queued'], 0)
        mock_queue.assert_called_once_with(workflow.id)

    @patch('rsvp.tasks.queue_workflow_invitations.delay')
    def test_remind_awaiting_retries_failed_replacement_guest(self, mock_queue):
        workflow = self.create_workflow()
        workflow.status = RsvpWorkflow.Status.ACTIVE
        workflow.save(update_fields=['status'])
        recipient = RsvpRecipient.objects.create(
            workflow=workflow,
            guest=self.guest_a,
            invitation_status=RsvpRecipient.InvitationStatus.FAILED,
            last_error='Invalid destination number',
        )

        response = self.client.post(f'/api/rsvp/workflows/{workflow.id}/remind-awaiting/')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['queued'], 1)
        recipient.refresh_from_db()
        self.assertEqual(recipient.invitation_status, RsvpRecipient.InvitationStatus.QUEUED)
        self.assertEqual(recipient.last_error, '')
        mock_queue.assert_called_once_with(workflow.id)


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

    def test_guest_excluded_from_workflow_is_still_held_for_rsvp(self):
        RsvpWorkflow.objects.create(event=self.event)
        self.assertFalse(pass_delivery_allowed(self.guest.id, self.event.id))

    def test_deleted_workflow_does_not_disable_event_rsvp_hold(self):
        self.event.rsvp_enabled = True
        self.event.save(update_fields=['rsvp_enabled'])
        workflow = RsvpWorkflow.objects.create(event=self.event)
        workflow.delete()

        self.assertFalse(pass_delivery_allowed(self.guest.id, self.event.id))

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
    def test_scheduled_pass_stays_held_after_confirmation(self, mock_send):
        self.workflow.pass_send_at = timezone.now() + timezone.timedelta(hours=4)
        self.workflow.save(update_fields=['pass_send_at'])

        with self.captureOnCommitCallbacks(execute=True):
            handled = process_incoming_message(self.message(message_id='wamid.scheduled-pass'))

        self.assertTrue(handled)
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.response_status, RsvpRecipient.ResponseStatus.CONFIRMED)
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.HELD)
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

    def test_failed_pass_webhook_reverts_guest_sent_flag(self):
        """The direct WhatsApp page counts Guest.whatsapp_sent; a pass that
        Meta accepted but later reported failed must not stay counted as sent."""
        self.guest.whatsapp_sent = True
        self.guest.whatsapp_sent_at = timezone.now()
        self.guest.save(update_fields=['whatsapp_sent', 'whatsapp_sent_at'])
        self.recipient.response_status = RsvpRecipient.ResponseStatus.CONFIRMED
        self.recipient.pass_status = RsvpRecipient.PassStatus.SENT
        self.recipient.pass_message_id = 'wamid.pass-blocked'
        self.recipient.save(update_fields=['response_status', 'pass_status', 'pass_message_id'])

        handled = process_status_update({
            'id': 'wamid.pass-blocked',
            'status': 'failed',
            'errors': [{'title': 'This message was not delivered to maintain healthy ecosystem engagement.'}],
        })

        self.assertTrue(handled)
        self.recipient.refresh_from_db()
        self.guest.refresh_from_db()
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.FAILED)
        self.assertFalse(self.guest.whatsapp_sent)
        # The attempt still counts against the daily send budget window.
        self.assertIsNotNone(self.guest.whatsapp_sent_at)

    def test_failed_invitation_webhook_leaves_guest_sent_flag_alone(self):
        self.guest.whatsapp_sent = True
        self.guest.save(update_fields=['whatsapp_sent'])
        self.recipient.invitation_message_id = 'wamid.invite-blocked'
        self.recipient.save(update_fields=['invitation_message_id'])

        handled = process_status_update({
            'id': 'wamid.invite-blocked',
            'status': 'failed',
            'errors': [{'title': 'Spam rate limit hit.'}],
        })

        self.assertTrue(handled)
        self.guest.refresh_from_db()
        self.assertTrue(self.guest.whatsapp_sent)

    def test_delivery_status_does_not_regress_when_webhooks_arrive_out_of_order(self):
        self.recipient.invitation_message_id = 'wamid.out-of-order'
        self.recipient.invitation_status = RsvpRecipient.InvitationStatus.READ
        self.recipient.save(update_fields=['invitation_message_id', 'invitation_status'])

        handled = process_status_update({
            'id': 'wamid.out-of-order',
            'status': 'delivered',
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
        self.url = f'/api/rsvp/respond/{self.recipient.public_code}/'
        self.legacy_url = f'/api/rsvp/respond/{self.recipient.callback_token}/'

    def test_public_code_is_six_characters(self):
        self.assertEqual(len(self.recipient.public_code), 6)

    def test_previous_short_code_remains_available(self):
        self.recipient.legacy_public_code = 'A7kP4mQ9xB2c'
        self.recipient.save(update_fields=['legacy_public_code'])
        response = self.client.get('/api/rsvp/respond/A7kP4mQ9xB2c/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['guest_name'], 'Public Guest')

    @patch('rsvp.models.generate_public_code', return_value='XYZ789')
    def test_bulk_code_assignment_replaces_duplicates(self, mock_generate):
        first = RsvpRecipient(workflow=self.workflow, guest=self.guest, public_code='ABC234')
        second = RsvpRecipient(workflow=self.workflow, guest=self.guest, public_code='ABC234')
        assigned = assign_unique_public_codes([first, second])
        self.assertEqual([recipient.public_code for recipient in assigned], ['ABC234', 'XYZ789'])
        mock_generate.assert_called_once()

    def test_public_details_are_available_without_authentication(self):
        self.event.rsvp_message = 'Join us for a beautiful milestone celebration.'
        self.event.color_of_day = 'Burgundy and gold'
        self.event.save(update_fields=['rsvp_message', 'color_of_day'])
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['guest_name'], 'Public Guest')
        self.assertEqual(response.data['event_name'], 'Public RSVP Event')
        self.assertEqual(response.data['rsvp_message'], self.event.rsvp_message)
        self.assertEqual(response.data['color_of_day'], 'Burgundy and gold')
        self.assertTrue(response.data['can_respond'])

    def test_legacy_uuid_link_remains_available(self):
        response = self.client.get(self.legacy_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['guest_name'], 'Public Guest')

    def test_public_endpoint_is_throttled(self):
        cache.clear()
        try:
            for _ in range(30):
                self.assertEqual(self.client.get(self.url).status_code, 200)
            self.assertEqual(self.client.get(self.url).status_code, 429)
        finally:
            cache.clear()

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
                f'https://events.example.com/public-rsvp-event/rsvp/public-guest-{self.recipient.public_code}',
            )


class RsvpInvitationLinkTests(TestCase):
    @patch('rsvp.whatsapp._get_client')
    def test_invitation_resolves_workflow_deadline_in_wat(self, mock_client):
        event = make_event()
        guest = Guest.objects.create(
            event=event,
            full_name='Deadline Guest',
            phone_number='2348000000001',
        )
        template = make_template(
            'deadline_invitation',
            body_params=['guest_name', 'rsvp_link', 'rsvp_deadline'],
        )
        workflow = RsvpWorkflow.objects.create(
            event=event,
            invitation_template=template,
            status=RsvpWorkflow.Status.ACTIVE,
            response_deadline=timezone.make_aware(datetime(2026, 9, 9, 23, 59)),
        )
        recipient = RsvpRecipient.objects.create(workflow=workflow, guest=guest)
        mock_client.return_value.send_template.return_value.id = 'wamid.deadline'

        with self.settings(
            WHATSAPP_PHONE_ID='phone-id',
            WHATSAPP_TOKEN='token',
            SITE_URL='https://events.example.com',
        ):
            send_invitation(recipient)

        values = mock_client.return_value.send_template.call_args.kwargs['params'][0].positionals
        self.assertEqual(values[0], 'Deadline Guest')
        self.assertEqual(
            values[1],
            f'https://events.example.com/rsvp-test-event/rsvp/deadline-guest-{recipient.public_code}',
        )
        self.assertEqual(values[2], '9th September 2026')

    @patch('rsvp.whatsapp._get_client')
    def test_invitation_supports_separate_date_and_time_parameters(self, mock_client):
        event = make_event(name='Lady Otunba Osibogun @ 70')
        event.date = timezone.make_aware(datetime(2026, 9, 16, 13, 0))
        event.venue = 'Civic Centre Ibadan Agodi Gate Road, Iwo Road, Ibadan.'
        event.save(update_fields=['date', 'venue'])
        guest = Guest.objects.create(
            event=event,
            full_name='Guest Name',
            phone_number='2348000000001',
        )
        template = make_template(
            'split_date_time_invitation',
            body_params=[
                'guest_name', 'event_name', 'event_name', 'rsvp_link',
                'event_date_only', 'event_time', 'venue',
            ],
        )
        workflow = RsvpWorkflow.objects.create(
            event=event,
            invitation_template=template,
            status=RsvpWorkflow.Status.ACTIVE,
        )
        recipient = RsvpRecipient.objects.create(workflow=workflow, guest=guest)
        mock_client.return_value.send_template.return_value.id = 'wamid.split-date-time'

        with self.settings(
            WHATSAPP_PHONE_ID='phone-id',
            WHATSAPP_TOKEN='token',
            SITE_URL='https://events.example.com',
        ):
            send_invitation(recipient)

        values = mock_client.return_value.send_template.call_args.kwargs['params'][0].positionals
        self.assertEqual(values[0], 'Guest Name')
        self.assertEqual(values[1], 'Lady Otunba Osibogun @ 70')
        self.assertEqual(values[2], 'Lady Otunba Osibogun @ 70')
        self.assertEqual(
            values[3],
            f'https://events.example.com/lady-otunba-osibogun-70/rsvp/guest-name-{recipient.public_code}',
        )
        self.assertEqual(values[4], '16th September 2026')
        self.assertEqual(values[5], '1:00 PM')
        self.assertEqual(values[6], event.venue)

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
            f'https://events.example.com/rsvp-test-event/rsvp/link-guest-{recipient.public_code}',
        )

    @patch('rsvp.whatsapp._get_client')
    def test_invitation_artwork_is_personalised_and_attached(self, mock_client):
        event = make_event()
        guest = Guest.objects.create(
            event=event,
            full_name='Artwork Guest',
            phone_number='2348000000001',
        )
        template = make_template(
            'image_invitation',
            header=True,
            body_params=['guest_name', 'rsvp_link'],
        )
        artwork_buffer = io.BytesIO()
        Image.new('RGB', (600, 800), '#182030').save(artwork_buffer, format='PNG')
        artwork = SimpleUploadedFile(
            'rsvp.png',
            artwork_buffer.getvalue(),
            content_type='image/png',
        )
        mock_client.return_value.send_template.return_value.id = 'wamid.image-invite'

        with tempfile.TemporaryDirectory() as media_root, self.settings(
            MEDIA_ROOT=media_root,
            MEDIA_URL='/media/',
            WHATSAPP_MEDIA_BASE_URL='https://media.example.com',
            WHATSAPP_PHONE_ID='phone-id',
            WHATSAPP_TOKEN='token',
            SITE_URL='https://events.example.com',
        ):
            workflow = RsvpWorkflow.objects.create(
                event=event,
                invitation_template=template,
                invitation_design=artwork,
                invitation_name_zone_x=0.1,
                invitation_name_zone_y=0.7,
                invitation_name_zone_w=0.8,
                invitation_name_zone_h=0.1,
                status=RsvpWorkflow.Status.ACTIVE,
            )
            recipient = RsvpRecipient.objects.create(workflow=workflow, guest=guest)

            send_invitation(recipient)

            recipient.refresh_from_db()
            self.assertTrue(recipient.invitation_image.name.startswith('rsvp_invitations/rsvp_'))
            params = mock_client.return_value.send_template.call_args.kwargs['params']
            self.assertEqual(len(params), 2)
            self.assertEqual(
                params[0].media,
                f'https://media.example.com/media/{recipient.invitation_image.name}',
            )
            with Image.open(recipient.invitation_image.path) as generated:
                self.assertEqual(generated.size, (600, 800))


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

    @patch('rsvp.tasks._ensure_guest_pass')
    @patch('rsvp.whatsapp.send_configured_pass')
    def test_duplicate_pass_task_only_calls_whatsapp_once(self, mock_send, mock_ensure):
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

    @patch('rsvp.whatsapp.send_configured_pass')
    @patch('rsvp.tasks._stored_file_exists', side_effect=[False, False, True])
    @patch('guests.utils.generate_qr_code', return_value=True)
    @patch('guests.utils.generate_pass_image', return_value=True)
    def test_missing_pass_is_generated_before_delivery(
        self,
        mock_generate_pass,
        mock_generate_qr,
        mock_file_exists,
        mock_send,
    ):
        from .tasks import send_confirmed_pass

        mock_send.return_value.id = 'wamid.generated-pass'
        recipient = RsvpRecipient.objects.create(
            workflow=self.workflow,
            guest=self.guest,
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
            pass_status=RsvpRecipient.PassStatus.QUEUED,
        )

        result = send_confirmed_pass(recipient.id)

        self.assertTrue(result['sent'])
        mock_generate_qr.assert_called_once()
        mock_generate_pass.assert_called_once()
        mock_send.assert_called_once()


class RsvpScheduledDispatchTests(TestCase):
    def setUp(self):
        self.event = make_event(name='Scheduled RSVP Event')
        self.workflow = RsvpWorkflow.objects.create(
            event=self.event,
            status=RsvpWorkflow.Status.ACTIVE,
            auto_send_pass=True,
            invitation_send_at=timezone.now() - timezone.timedelta(minutes=1),
            pass_send_at=timezone.now() - timezone.timedelta(minutes=1),
        )
        self.invited_guest = Guest.objects.create(
            event=self.event,
            full_name='Awaiting Guest',
            phone_number='2348000000021',
        )
        self.confirmed_guest = Guest.objects.create(
            event=self.event,
            full_name='Confirmed Guest',
            phone_number='2348000000022',
        )
        self.invited_recipient = RsvpRecipient.objects.create(
            workflow=self.workflow,
            guest=self.invited_guest,
        )
        self.confirmed_recipient = RsvpRecipient.objects.create(
            workflow=self.workflow,
            guest=self.confirmed_guest,
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
        )

    @patch('rsvp.tasks.send_confirmed_pass')
    @patch('rsvp.tasks.send_rsvp_invitation')
    def test_due_messages_are_claimed_and_queued_once(self, mock_invitation, mock_pass):
        from .tasks import dispatch_scheduled_rsvp_messages

        first = dispatch_scheduled_rsvp_messages()
        second = dispatch_scheduled_rsvp_messages()

        self.assertEqual(first['invitations_queued'], 1)
        self.assertEqual(first['passes_queued'], 1)
        self.assertEqual(second['invitations_queued'], 0)
        self.assertEqual(second['passes_queued'], 0)
        mock_invitation.delay.assert_called_once()
        mock_pass.delay.assert_called_once()
        self.invited_recipient.refresh_from_db()
        self.confirmed_recipient.refresh_from_db()
        self.assertEqual(self.invited_recipient.invitation_status, RsvpRecipient.InvitationStatus.QUEUED)
        self.assertEqual(self.confirmed_recipient.pass_status, RsvpRecipient.PassStatus.QUEUED)


class RsvpSendBudgetTests(TestCase):
    """The daily WhatsApp send budget must gate every RSVP dispatch path."""

    def setUp(self):
        self.event = make_event(name='Budget Event')
        self.workflow = RsvpWorkflow.objects.create(
            event=self.event,
            status=RsvpWorkflow.Status.ACTIVE,
        )
        self.recipients = [
            RsvpRecipient.objects.create(
                workflow=self.workflow,
                guest=Guest.objects.create(
                    event=self.event,
                    full_name=f'Budget Guest {index}',
                    phone_number=f'234800000010{index}',
                ),
                invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
            )
            for index in range(3)
        ]

    @override_settings(WHATSAPP_DAILY_SEND_LIMIT=2)
    @patch('rsvp.tasks.send_rsvp_invitation')
    def test_queue_workflow_invitations_respects_daily_budget(self, mock_send):
        from .tasks import queue_workflow_invitations

        result = queue_workflow_invitations(self.workflow.id)

        self.assertEqual(result['queued'], 2)
        self.assertEqual(result['deferred'], 1)
        self.assertEqual(mock_send.delay.call_count, 2)
        # The overflow recipient stays approved (QUEUED) but unstamped, so
        # the Beat dispatcher can drain it once the window frees up.
        self.assertEqual(
            RsvpRecipient.objects.filter(
                invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
                invitation_queued_at__isnull=True,
            ).count(),
            1,
        )

    @override_settings(WHATSAPP_DAILY_SEND_LIMIT=2)
    @patch('rsvp.tasks.send_rsvp_invitation')
    def test_dispatcher_drains_deferred_invitations_as_window_rolls(self, mock_send):
        from .tasks import dispatch_scheduled_rsvp_messages, queue_workflow_invitations

        queue_workflow_invitations(self.workflow.id)
        blocked = dispatch_scheduled_rsvp_messages()
        self.assertEqual(blocked['invitations_queued'], 0)

        # Simulate the two dispatched sends completing more than 24h ago, so
        # the trailing window has budget again.
        RsvpRecipient.objects.filter(invitation_queued_at__isnull=False).update(
            invitation_status=RsvpRecipient.InvitationStatus.SENT,
            invitation_sent_at=timezone.now() - timezone.timedelta(hours=25),
        )

        drained = dispatch_scheduled_rsvp_messages()
        self.assertEqual(drained['invitations_queued'], 1)
        self.assertEqual(
            RsvpRecipient.objects.filter(
                invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
                invitation_queued_at__isnull=True,
            ).count(),
            0,
        )

    @patch('rsvp.tasks.send_rsvp_invitation')
    def test_stale_dispatched_invitation_is_swept_and_requeued(self, mock_send):
        from guests.send_budget import DISPATCHED_STALE_AFTER
        from .tasks import dispatch_scheduled_rsvp_messages

        stale_time = timezone.now() - DISPATCHED_STALE_AFTER - timezone.timedelta(minutes=5)
        RsvpRecipient.objects.filter(pk=self.recipients[0].pk).update(
            invitation_queued_at=stale_time,
        )

        result = dispatch_scheduled_rsvp_messages()

        self.assertEqual(result['requeued_stale'], 1)
        refreshed = RsvpRecipient.objects.get(pk=self.recipients[0].pk)
        self.assertGreater(refreshed.invitation_queued_at, stale_time)

    @override_settings(WHATSAPP_DAILY_SEND_LIMIT=1)
    @patch('rsvp.tasks.send_confirmed_pass')
    @patch('rsvp.tasks.send_rsvp_invitation')
    def test_confirmed_passes_outrank_invitations_for_budget(
        self, mock_invitation, mock_pass,
    ):
        from .tasks import dispatch_scheduled_rsvp_messages

        self.workflow.auto_send_pass = True
        self.workflow.pass_send_at = timezone.now() - timezone.timedelta(minutes=1)
        self.workflow.save(update_fields=['auto_send_pass', 'pass_send_at'])
        RsvpRecipient.objects.filter(pk=self.recipients[0].pk).update(
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
            invitation_status=RsvpRecipient.InvitationStatus.SENT,
            pass_status=RsvpRecipient.PassStatus.HELD,
        )

        result = dispatch_scheduled_rsvp_messages()

        self.assertEqual(result['passes_queued'], 1)
        self.assertEqual(result['invitations_queued'], 0)
        mock_pass.delay.assert_called_once()
        mock_invitation.delay.assert_not_called()


class RsvpAutoRetryTests(TestCase):
    """Webhook-reported WhatsApp restrictions must be retried automatically."""

    ECOSYSTEM_ERROR = (
        'This message was not delivered to maintain healthy ecosystem engagement.'
    )

    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            'retry-manager', password='pass', role='event_manager',
        )
        self.client.force_authenticate(self.manager)
        self.event = make_event(name='Auto Retry Event')
        self.workflow = RsvpWorkflow.objects.create(
            event=self.event,
            status=RsvpWorkflow.Status.ACTIVE,
        )
        self.guest = Guest.objects.create(
            event=self.event,
            full_name='Restricted Guest',
            phone_number='2348000000201',
        )
        self.recipient = RsvpRecipient.objects.create(
            workflow=self.workflow,
            guest=self.guest,
        )

    def _fail_pass(self, *, error, queued_ago_hours=2, retries=0):
        RsvpRecipient.objects.filter(pk=self.recipient.pk).update(
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
            invitation_status=RsvpRecipient.InvitationStatus.READ,
            pass_status=RsvpRecipient.PassStatus.FAILED,
            pass_queued_at=timezone.now() - timezone.timedelta(hours=queued_ago_hours),
            pass_auto_retries=retries,
            pass_error=error,
            last_error=error,
        )

    @patch('rsvp.tasks.send_confirmed_pass')
    def test_ecosystem_failed_pass_is_auto_requeued_after_24h(self, mock_pass):
        from .tasks import dispatch_scheduled_rsvp_messages

        self._fail_pass(error=self.ECOSYSTEM_ERROR, queued_ago_hours=25)

        result = dispatch_scheduled_rsvp_messages()

        self.assertEqual(result['retried_failed'], 1)
        mock_pass.delay.assert_called_once_with(self.recipient.id)
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.QUEUED)
        self.assertEqual(self.recipient.pass_auto_retries, 1)

    @patch('rsvp.tasks.send_confirmed_pass')
    def test_ecosystem_failure_waits_the_full_meta_window(self, mock_pass):
        """Meta advises ~24h for the per-user marketing cap; retrying a few
        hours in would fail again and waste an attempt plus budget."""
        from .tasks import dispatch_scheduled_rsvp_messages

        self._fail_pass(error=self.ECOSYSTEM_ERROR, queued_ago_hours=12)

        result = dispatch_scheduled_rsvp_messages()

        self.assertEqual(result['retried_failed'], 0)
        mock_pass.delay.assert_not_called()
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.FAILED)

    @patch('rsvp.tasks.send_confirmed_pass')
    def test_rate_limit_failure_retries_on_the_short_schedule(self, mock_pass):
        from .tasks import dispatch_scheduled_rsvp_messages

        self._fail_pass(error='Spam rate limit hit.', queued_ago_hours=2)

        result = dispatch_scheduled_rsvp_messages()

        self.assertEqual(result['retried_failed'], 1)
        mock_pass.delay.assert_called_once_with(self.recipient.id)

    @patch('rsvp.tasks.send_confirmed_pass')
    def test_recent_failure_waits_for_backoff(self, mock_pass):
        from .tasks import dispatch_scheduled_rsvp_messages

        self._fail_pass(error='Spam rate limit hit.', queued_ago_hours=0)

        result = dispatch_scheduled_rsvp_messages()

        self.assertEqual(result['retried_failed'], 0)
        mock_pass.delay.assert_not_called()
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.FAILED)

    @patch('rsvp.tasks.send_confirmed_pass')
    def test_permanent_failure_is_not_auto_retried(self, mock_pass):
        from .tasks import dispatch_scheduled_rsvp_messages

        self._fail_pass(error='Invalid WhatsApp number.')

        result = dispatch_scheduled_rsvp_messages()

        self.assertEqual(result['retried_failed'], 0)
        mock_pass.delay.assert_not_called()

    @patch('rsvp.tasks.send_confirmed_pass')
    def test_auto_retry_stops_after_max_attempts(self, mock_pass):
        from .tasks import FAILED_SEND_MAX_AUTO_RETRIES, dispatch_scheduled_rsvp_messages

        self._fail_pass(
            error=self.ECOSYSTEM_ERROR,
            queued_ago_hours=48,
            retries=FAILED_SEND_MAX_AUTO_RETRIES,
        )

        result = dispatch_scheduled_rsvp_messages()

        self.assertEqual(result['retried_failed'], 0)
        mock_pass.delay.assert_not_called()

    @patch('rsvp.tasks._ensure_guest_pass')
    @patch('rsvp.whatsapp.send_configured_pass')
    def test_retry_count_survives_api_acceptance_and_later_failure(
        self, mock_send, mock_ensure,
    ):
        """A webhook failure arrives after the send API has accepted the retry."""
        from .tasks import send_confirmed_pass

        mock_send.return_value = SimpleNamespace(id='wamid.retry-lifecycle')
        RsvpRecipient.objects.filter(pk=self.recipient.pk).update(
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
            pass_status=RsvpRecipient.PassStatus.QUEUED,
            pass_auto_retries=2,
            pass_error=self.ECOSYSTEM_ERROR,
            last_error=self.ECOSYSTEM_ERROR,
        )

        send_confirmed_pass(self.recipient.id)

        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.SENT)
        self.assertEqual(self.recipient.pass_auto_retries, 2)

        process_status_update({
            'id': 'wamid.retry-lifecycle',
            'status': 'failed',
            'errors': [{
                'code': 131049,
                'title': 'Meta chose not to deliver',
                'error_data': {'details': self.ECOSYSTEM_ERROR},
            }],
        })

        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.FAILED)
        self.assertEqual(self.recipient.pass_auto_retries, 2)
        self.assertIn('131049', self.recipient.pass_error)

    def test_delivered_webhook_resets_retry_count(self):
        RsvpRecipient.objects.filter(pk=self.recipient.pk).update(
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
            pass_status=RsvpRecipient.PassStatus.SENT,
            pass_message_id='wamid.delivered-retry',
            pass_auto_retries=2,
        )

        process_status_update({
            'id': 'wamid.delivered-retry',
            'status': 'delivered',
        })

        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.DELIVERED)
        self.assertEqual(self.recipient.pass_auto_retries, 0)

    @patch('rsvp.tasks.send_confirmed_pass.delay')
    def test_manual_retry_cannot_bypass_ecosystem_cooldown(self, mock_send):
        self._fail_pass(
            error=self.ECOSYSTEM_ERROR,
            queued_ago_hours=1,
            retries=1,
        )

        response = self.client.post(
            f'/api/rsvp/recipients/{self.recipient.id}/retry-pass/',
        )

        self.assertEqual(response.status_code, 409, response.data)
        self.assertIn('retry cooldown', response.data['detail'])
        self.assertIn('retry_after', response.data)
        mock_send.assert_not_called()
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.FAILED)
        self.assertEqual(self.recipient.pass_auto_retries, 1)

    @patch('rsvp.tasks.send_confirmed_pass.delay')
    def test_forced_manual_retry_overrides_ecosystem_cooldown(self, mock_send):
        self._fail_pass(
            error=self.ECOSYSTEM_ERROR,
            queued_ago_hours=1,
            retries=1,
        )

        response = self.client.post(
            f'/api/rsvp/recipients/{self.recipient.id}/retry-pass/',
            {'force': True},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        mock_send.assert_called_once_with(self.recipient.id)
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.QUEUED)

    @patch('rsvp.tasks.send_rsvp_invitation.delay')
    def test_forced_manual_retry_overrides_invitation_cooldown(self, mock_send):
        RsvpRecipient.objects.filter(pk=self.recipient.pk).update(
            invitation_status=RsvpRecipient.InvitationStatus.FAILED,
            invitation_queued_at=timezone.now() - timezone.timedelta(hours=1),
            invitation_auto_retries=1,
            invitation_error=self.ECOSYSTEM_ERROR,
        )

        blocked = self.client.post(
            f'/api/rsvp/recipients/{self.recipient.id}/retry-invitation/',
        )
        self.assertEqual(blocked.status_code, 409, blocked.data)

        forced = self.client.post(
            f'/api/rsvp/recipients/{self.recipient.id}/retry-invitation/',
            {'force': True},
            format='json',
        )
        self.assertEqual(forced.status_code, 200, forced.data)
        mock_send.assert_called_once_with(self.recipient.id)

    @patch('rsvp.tasks.send_confirmed_pass.delay')
    def test_manual_retry_after_cooldown_preserves_attempt_count(self, mock_send):
        self._fail_pass(
            error=self.ECOSYSTEM_ERROR,
            queued_ago_hours=25,
            retries=2,
        )

        response = self.client.post(
            f'/api/rsvp/recipients/{self.recipient.id}/retry-pass/',
        )

        self.assertEqual(response.status_code, 200, response.data)
        mock_send.assert_called_once_with(self.recipient.id)
        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.pass_status, RsvpRecipient.PassStatus.QUEUED)
        self.assertEqual(self.recipient.pass_auto_retries, 2)

    @patch('rsvp.tasks.send_confirmed_pass')
    def test_permanent_failures_do_not_hide_retryable_rows_after_500(self, mock_send):
        from .tasks import dispatch_scheduled_rsvp_messages

        guests = Guest.objects.bulk_create([
            Guest(
                event=self.event,
                full_name=f'A Permanent Failure {index:03d}',
                phone_number=f'2348001{index:06d}',
            )
            for index in range(500)
        ])
        RsvpRecipient.objects.bulk_create([
            RsvpRecipient(
                workflow=self.workflow,
                guest=guest,
                public_code=f'P{index:05d}',
                response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
                pass_status=RsvpRecipient.PassStatus.FAILED,
                pass_queued_at=timezone.now() - timezone.timedelta(hours=48),
                pass_error='Invalid destination number.',
                last_error='Invalid destination number.',
            )
            for index, guest in enumerate(guests)
        ])
        self._fail_pass(error=self.ECOSYSTEM_ERROR, queued_ago_hours=25)

        result = dispatch_scheduled_rsvp_messages()

        self.assertEqual(result['retried_failed'], 1)
        mock_send.delay.assert_called_once_with(self.recipient.id)

    @patch('rsvp.tasks.send_rsvp_invitation')
    def test_failed_invitation_is_auto_requeued(self, mock_invitation):
        from .tasks import dispatch_scheduled_rsvp_messages

        RsvpRecipient.objects.filter(pk=self.recipient.pk).update(
            invitation_status=RsvpRecipient.InvitationStatus.FAILED,
            invitation_queued_at=timezone.now() - timezone.timedelta(hours=2),
            last_error='Spam rate limit hit.',
        )

        result = dispatch_scheduled_rsvp_messages()

        self.assertEqual(result['retried_failed'], 1)
        mock_invitation.delay.assert_called_once_with(self.recipient.id)
        self.recipient.refresh_from_db()
        self.assertEqual(
            self.recipient.invitation_status, RsvpRecipient.InvitationStatus.QUEUED,
        )
        self.assertEqual(self.recipient.invitation_auto_retries, 1)


class RsvpRecipientSegmentTests(TestCase):
    """Dashboard segments: invite received / confirmed with and without pass."""

    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            'segment-manager', password='pass', role='event_manager',
        )
        self.client.force_authenticate(self.manager)
        self.event = make_event(name='Segment Event')
        self.workflow = RsvpWorkflow.objects.create(
            event=self.event,
            status=RsvpWorkflow.Status.ACTIVE,
        )

        def recipient(name, phone, **state):
            return RsvpRecipient.objects.create(
                workflow=self.workflow,
                guest=Guest.objects.create(
                    event=self.event, full_name=name, phone_number=phone,
                ),
                **state,
            )

        self.awaiting_delivered = recipient(
            'Invite Read', '2348000000301',
            invitation_status=RsvpRecipient.InvitationStatus.READ,
        )
        self.awaiting_unsent = recipient('Invite Pending', '2348000000302')
        self.confirmed_with_pass = recipient(
            'Has Pass', '2348000000303',
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
            invitation_status=RsvpRecipient.InvitationStatus.READ,
            pass_status=RsvpRecipient.PassStatus.DELIVERED,
        )
        self.confirmed_no_pass = recipient(
            'No Pass Yet', '2348000000304',
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
            invitation_status=RsvpRecipient.InvitationStatus.READ,
            pass_status=RsvpRecipient.PassStatus.FAILED,
        )
        self.failed_invitation = recipient(
            'Invite Failed', '2348000000305',
            invitation_status=RsvpRecipient.InvitationStatus.FAILED,
        )

    def _names(self, segment):
        response = self.client.get(
            '/api/rsvp/recipients/',
            {'workflow': self.workflow.id, 'segment': segment},
        )
        self.assertEqual(response.status_code, 200, response.data)
        return {row['guest_name'] for row in response.data['results']}

    def test_invited_awaiting_segment(self):
        self.assertEqual(self._names('invited_awaiting'), {'Invite Read'})

    def test_confirmed_with_pass_segment(self):
        self.assertEqual(self._names('confirmed_with_pass'), {'Has Pass'})

    def test_confirmed_no_pass_segment(self):
        self.assertEqual(self._names('confirmed_no_pass'), {'No Pass Yet'})

    def test_delivery_failed_segment_includes_invitation_and_pass_failures(self):
        self.assertEqual(
            self._names('delivery_failed'),
            {'Invite Failed', 'No Pass Yet'},
        )

    def test_confirmed_no_pass_count_in_stats(self):
        from .serializers import build_workflow_stats

        stats = build_workflow_stats(self.workflow)
        self.assertEqual(stats['confirmed_no_pass'], 1)
        self.assertEqual(stats['passes_sent'], 1)
        self.assertEqual(stats['delivery_failed'], 2)


class RsvpChannelErrorTests(TestCase):
    """Failure reasons must be attributable to the exact message that failed."""

    def setUp(self):
        self.event = make_event(name='Channel Error Event')
        self.workflow = RsvpWorkflow.objects.create(
            event=self.event,
            status=RsvpWorkflow.Status.ACTIVE,
        )
        self.guest = Guest.objects.create(
            event=self.event,
            full_name='Error Guest',
            phone_number='2348000000401',
        )
        self.recipient = RsvpRecipient.objects.create(
            workflow=self.workflow,
            guest=self.guest,
        )

    @patch('rsvp.whatsapp.send_invitation', side_effect=ValueError('The RSVP workflow has no invitation template.'))
    def test_invitation_task_failure_stores_invitation_error(self, mock_send):
        from .tasks import send_rsvp_invitation

        RsvpRecipient.objects.filter(pk=self.recipient.pk).update(
            invitation_status=RsvpRecipient.InvitationStatus.QUEUED,
        )
        send_rsvp_invitation(self.recipient.id)

        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.invitation_status, RsvpRecipient.InvitationStatus.FAILED)
        self.assertIn('invitation template', self.recipient.invitation_error)
        self.assertEqual(self.recipient.pass_error, '')

    def test_webhook_failure_lands_on_the_right_channel(self):
        RsvpRecipient.objects.filter(pk=self.recipient.pk).update(
            invitation_message_id='wamid.channel-invite',
            pass_message_id='wamid.channel-pass',
            invitation_status=RsvpRecipient.InvitationStatus.SENT,
            pass_status=RsvpRecipient.PassStatus.SENT,
        )

        process_status_update({
            'id': 'wamid.channel-pass',
            'status': 'failed',
            'errors': [{'title': 'This message was not delivered to maintain healthy ecosystem engagement.'}],
        })

        self.recipient.refresh_from_db()
        self.assertEqual(self.recipient.pass_status, 'failed')
        self.assertIn('ecosystem engagement', self.recipient.pass_error)
        self.assertEqual(self.recipient.invitation_error, '')
        self.assertEqual(self.recipient.invitation_status, RsvpRecipient.InvitationStatus.SENT)

        process_status_update({
            'id': 'wamid.channel-invite',
            'status': 'failed',
            'errors': [{'title': 'Spam rate limit hit.'}],
        })

        self.recipient.refresh_from_db()
        self.assertIn('Spam rate limit', self.recipient.invitation_error)
        self.assertIn('ecosystem engagement', self.recipient.pass_error)


class RsvpBulkRetryTests(TestCase):
    """Operators can retry an explicit selection of failed sends at once."""

    ECOSYSTEM_ERROR = (
        'This message was not delivered to maintain healthy ecosystem engagement.'
    )

    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            'bulk-retry-manager', password='pass', role='event_manager',
        )
        self.client.force_authenticate(self.manager)
        self.event = make_event(name='Bulk Retry Event')
        self.workflow = RsvpWorkflow.objects.create(
            event=self.event,
            status=RsvpWorkflow.Status.ACTIVE,
        )
        old = timezone.now() - timezone.timedelta(hours=25)

        self.pass_failed = self._recipient('2348000000301')
        RsvpRecipient.objects.filter(pk=self.pass_failed.pk).update(
            response_status=RsvpRecipient.ResponseStatus.CONFIRMED,
            invitation_status=RsvpRecipient.InvitationStatus.READ,
            pass_status=RsvpRecipient.PassStatus.FAILED,
            pass_queued_at=old,
            pass_error=self.ECOSYSTEM_ERROR,
        )
        self.invitation_failed = self._recipient('2348000000302')
        RsvpRecipient.objects.filter(pk=self.invitation_failed.pk).update(
            invitation_status=RsvpRecipient.InvitationStatus.FAILED,
            invitation_queued_at=old,
            invitation_error='Invalid WhatsApp number.',
        )
        self.healthy = self._recipient('2348000000303')
        RsvpRecipient.objects.filter(pk=self.healthy.pk).update(
            invitation_status=RsvpRecipient.InvitationStatus.SENT,
        )

    def _recipient(self, phone):
        return RsvpRecipient.objects.create(
            workflow=self.workflow,
            guest=Guest.objects.create(
                event=self.event,
                full_name=f'Bulk Guest {phone[-3:]}',
                phone_number=phone,
            ),
        )

    def _bulk_retry(self, ids, kind):
        return self.client.post(
            '/api/rsvp/recipients/bulk-retry/',
            {'recipient_ids': ids, 'kind': kind},
            format='json',
        )

    @patch('rsvp.tasks.send_confirmed_pass.delay')
    def test_bulk_pass_retry_queues_only_eligible_rows(self, mock_delay):
        response = self._bulk_retry(
            [self.pass_failed.id, self.invitation_failed.id, self.healthy.id],
            'pass',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['queued'], 1)
        self.assertEqual(response.data['skipped_ineligible'], 2)
        self.assertEqual(response.data['skipped_cooldown'], 0)
        mock_delay.assert_called_once_with(self.pass_failed.id)
        self.pass_failed.refresh_from_db()
        self.assertEqual(self.pass_failed.pass_status, RsvpRecipient.PassStatus.QUEUED)
        self.assertEqual(self.pass_failed.pass_error, '')

    @patch('rsvp.tasks.send_rsvp_invitation.delay')
    def test_bulk_invitation_retry_queues_only_eligible_rows(self, mock_delay):
        response = self._bulk_retry(
            [self.invitation_failed.id, self.healthy.id],
            'invitation',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['queued'], 1)
        self.assertEqual(response.data['skipped_ineligible'], 1)
        mock_delay.assert_called_once_with(self.invitation_failed.id)
        self.invitation_failed.refresh_from_db()
        self.assertEqual(
            self.invitation_failed.invitation_status,
            RsvpRecipient.InvitationStatus.QUEUED,
        )

    @patch('rsvp.tasks.send_confirmed_pass.delay')
    def test_bulk_retry_skips_rows_still_in_cooldown(self, mock_delay):
        RsvpRecipient.objects.filter(pk=self.pass_failed.pk).update(
            pass_queued_at=timezone.now(),
        )

        response = self._bulk_retry([self.pass_failed.id], 'pass')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['queued'], 0)
        self.assertEqual(response.data['skipped_cooldown'], 1)
        mock_delay.assert_not_called()
        self.pass_failed.refresh_from_db()
        self.assertEqual(self.pass_failed.pass_status, RsvpRecipient.PassStatus.FAILED)

    def test_bulk_retry_validates_input(self):
        self.assertEqual(self._bulk_retry([], 'pass').status_code, 400)
        self.assertEqual(
            self._bulk_retry([self.pass_failed.id], 'everything').status_code, 400,
        )


class RsvpGuestSyncTests(TestCase):
    @patch('guests.views.guests.generate_guest_assets')
    def test_guest_added_after_event_setup_joins_the_draft_workflow(self, mock_assets):
        client = APIClient()
        manager = User.objects.create_user('sync-manager', password='pass', role='event_manager')
        client.force_authenticate(manager)
        event = make_event(name='Draft Sync Event')
        workflow = RsvpWorkflow.objects.create(event=event, created_by=manager)

        response = client.post('/api/guests/', {
            'event': event.id,
            'full_name': 'Later Guest',
            'phone_number': '2348000000031',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(workflow.recipients.filter(guest_id=response.data['id']).exists())

    @patch('rsvp.tasks.send_rsvp_invitation.delay')
    @patch('guests.views.guests.generate_guest_assets')
    def test_corrected_guest_rejoins_active_workflow_and_is_sent(
        self, mock_assets, mock_invitation,
    ):
        client = APIClient()
        manager = User.objects.create_user('correct-manager', password='pass', role='event_manager')
        client.force_authenticate(manager)
        event = make_event(name='Correction Event')
        workflow = RsvpWorkflow.objects.create(
            event=event,
            created_by=manager,
            status=RsvpWorkflow.Status.ACTIVE,
        )
        wrong_guest = Guest.objects.create(
            event=event,
            full_name='Correct Me',
            phone_number='2348000000000',
        )
        RsvpRecipient.objects.create(workflow=workflow, guest=wrong_guest)

        deleted = client.delete(f'/api/guests/{wrong_guest.id}/')
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(workflow.recipients.filter(guest_id=wrong_guest.id).exists())

        with self.captureOnCommitCallbacks(execute=True):
            created = client.post('/api/guests/', {
                'event': event.id,
                'full_name': 'Correct Me',
                'phone_number': '2348000000099',
            }, format='json')

        self.assertEqual(created.status_code, 201, created.data)
        recipient = workflow.recipients.get(guest_id=created.data['id'])
        self.assertEqual(recipient.invitation_status, RsvpRecipient.InvitationStatus.QUEUED)
        mock_invitation.assert_called_once_with(recipient.id)
