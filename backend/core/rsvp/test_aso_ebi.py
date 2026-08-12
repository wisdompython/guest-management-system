from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from guests.models import Event, Guest

from .models import RsvpRecipient, RsvpWorkflow


class PublicRsvpAsoEbiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.event = Event.objects.create(
            name='Public Aso Ebi Event',
            date=timezone.now() + timezone.timedelta(days=7),
            collect_aso_ebi=True,
        )
        self.guest = Guest.objects.create(
            event=self.event,
            full_name='Public Guest',
            phone_number='2348000000004',
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

    def test_public_details_expose_collection_setting(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['collect_aso_ebi'])
        self.assertFalse(response.data['aso_ebi_requested'])
        self.assertEqual(response.data['aso_ebi_quantity'], 0)

    @patch('rsvp.tasks.send_confirmed_pass.delay')
    def test_confirmation_saves_aso_ebi_quantity(self, mock_send):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self.url, {
                'answer': 'yes',
                'aso_ebi_requested': True,
                'aso_ebi_quantity': 3,
            }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.guest.refresh_from_db()
        self.assertTrue(self.guest.aso_ebi_requested)
        self.assertEqual(self.guest.aso_ebi_quantity, 3)
        mock_send.assert_called_once_with(self.recipient.id)

    def test_confirmation_rejects_missing_quantity(self):
        response = self.client.post(self.url, {
            'answer': 'yes',
            'aso_ebi_requested': True,
            'aso_ebi_quantity': 0,
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.guest.refresh_from_db()
        self.assertFalse(self.guest.aso_ebi_requested)

    def test_decline_clears_existing_request(self):
        self.guest.aso_ebi_requested = True
        self.guest.aso_ebi_quantity = 2
        self.guest.save(update_fields=['aso_ebi_requested', 'aso_ebi_quantity'])
        response = self.client.post(self.url, {
            'answer': 'no',
            'aso_ebi_requested': True,
            'aso_ebi_quantity': 9,
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.guest.refresh_from_db()
        self.assertFalse(self.guest.aso_ebi_requested)
        self.assertEqual(self.guest.aso_ebi_quantity, 0)
