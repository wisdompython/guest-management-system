from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User

from .models import Event, Guest
from .serializers import BulkGuestUploadSerializer


class AsoEbiGuestTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            'aso-ebi-manager',
            password='pass',
            role='event_manager',
        )
        self.client.force_authenticate(self.manager)
        self.event = Event.objects.create(
            name='Aso Ebi Event',
            date=timezone.now() + timezone.timedelta(days=7),
            collect_aso_ebi=True,
        )

    def _payload(self, **extra):
        payload = {
            'event': self.event.id,
            'full_name': 'Requesting Guest',
            'phone_number': '2348000000001',
        }
        payload.update(extra)
        return payload

    def test_request_requires_positive_quantity(self):
        response = self.client.post(
            '/api/guests/',
            self._payload(aso_ebi_requested=True, aso_ebi_quantity=0),
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('aso_ebi_quantity', response.data)

    def test_request_is_rejected_when_event_collection_is_off(self):
        self.event.collect_aso_ebi = False
        self.event.save(update_fields=['collect_aso_ebi'])
        response = self.client.post(
            '/api/guests/',
            self._payload(aso_ebi_requested=True, aso_ebi_quantity=2),
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('aso_ebi_requested', response.data)

    def test_bulk_upload_collects_request_and_quantity(self):
        csv_file = SimpleUploadedFile(
            'guests.csv',
            b'full_name,phone_number,aso_ebi_requested,aso_ebi_quantity\nAda,2348000000002,yes,3\n',
            content_type='text/csv',
        )
        serializer = BulkGuestUploadSerializer(data={
            'event': self.event.id,
            'csv_file': csv_file,
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        rows, errors = serializer.parse()
        self.assertEqual(errors, [])
        self.assertTrue(rows[0]['aso_ebi_requested'])
        self.assertEqual(rows[0]['aso_ebi_quantity'], 3)

    def test_export_includes_aso_ebi_columns_and_quantity(self):
        Guest.objects.create(
            event=self.event,
            full_name='Export Guest',
            phone_number='2348000000003',
            aso_ebi_requested=True,
            aso_ebi_quantity=4,
        )
        response = self.client.get('/api/guests/export/', {'event': self.event.id})
        body = b''.join(response.streaming_content).decode()
        self.assertIn('aso_ebi_requested,aso_ebi_yards', body)
        self.assertIn(',Yes,4,', body)
