from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from .models import Event, Guest


def make_event(**kwargs):
    defaults = dict(name='Test Event', date=timezone.now() + timezone.timedelta(days=7))
    defaults.update(kwargs)
    return Event.objects.create(**defaults)


def make_guest(event, **kwargs):
    defaults = dict(full_name='Test Guest', phone_number='2348000000001')
    defaults.update(kwargs)
    return Guest.objects.create(event=event, **defaults)


class GuestListFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user('mgr', password='pass', role='event_manager')
        self.client.force_authenticate(self.manager)
        self.event_a = make_event(name='Event A')
        self.event_b = make_event(name='Event B')
        self.g1 = make_guest(self.event_a, full_name='Alice')
        self.g2 = make_guest(self.event_a, full_name='Bob', whatsapp_sent=True, status='checked_in')
        self.g3 = make_guest(self.event_b, full_name='Carol')

    def test_event_filter_returns_only_that_events_guests(self):
        r = self.client.get('/api/guests/', {'event': self.event_a.id})
        self.assertEqual(r.status_code, 200)
        names = {g['full_name'] for g in r.data['results']}
        self.assertEqual(names, {'Alice', 'Bob'})
        self.assertNotIn('Carol', names)

    def test_no_event_filter_returns_all(self):
        r = self.client.get('/api/guests/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 3)

    def test_wa_sent_false_filter(self):
        r = self.client.get('/api/guests/', {'event': self.event_a.id, 'wa_sent': 'false'})
        names = {g['full_name'] for g in r.data['results']}
        self.assertEqual(names, {'Alice'})

    def test_wa_sent_true_filter(self):
        r = self.client.get('/api/guests/', {'event': self.event_a.id, 'wa_sent': 'true'})
        names = {g['full_name'] for g in r.data['results']}
        self.assertEqual(names, {'Bob'})

    def test_response_includes_stats(self):
        r = self.client.get('/api/guests/', {'event': self.event_a.id})
        self.assertIn('stats', r.data)
        stats = r.data['stats']
        self.assertEqual(stats['checked_in'], 1)
        self.assertEqual(stats['pending'], 1)
        self.assertEqual(stats['wa_sent'], 1)
        self.assertEqual(stats['wa_unsent'], 1)

    def test_search_filter(self):
        r = self.client.get('/api/guests/', {'event': self.event_a.id, 'search': 'ali'})
        names = {g['full_name'] for g in r.data['results']}
        self.assertEqual(names, {'Alice'})

    def test_status_filter(self):
        r = self.client.get('/api/guests/', {'event': self.event_a.id, 'status': 'checked_in'})
        names = {g['full_name'] for g in r.data['results']}
        self.assertEqual(names, {'Bob'})


class BulkDeleteTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user('mgr', password='pass', role='event_manager')
        self.client.force_authenticate(self.manager)
        self.event = make_event()
        self.g1 = make_guest(self.event, full_name='Alice')
        self.g2 = make_guest(self.event, full_name='Bob')
        self.g3 = make_guest(self.event, full_name='Carol')

    def test_delete_by_ids(self):
        r = self.client.post('/api/guests/bulk-delete/', {'ids': [str(self.g1.id), str(self.g2.id)]}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['deleted'], 2)
        self.assertFalse(Guest.objects.filter(id=self.g1.id).exists())
        self.assertFalse(Guest.objects.filter(id=self.g2.id).exists())
        self.assertTrue(Guest.objects.filter(id=self.g3.id).exists())

    def test_delete_all_by_event_id(self):
        r = self.client.post('/api/guests/bulk-delete/', {'event_id': self.event.id}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['deleted'], 3)
        self.assertEqual(Guest.objects.filter(event=self.event).count(), 0)

    def test_empty_ids_list_deletes_nothing(self):
        r = self.client.post('/api/guests/bulk-delete/', {'ids': []}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['deleted'], 0)
        self.assertEqual(Guest.objects.filter(event=self.event).count(), 3)

    def test_missing_both_ids_and_event_id_returns_400(self):
        r = self.client.post('/api/guests/bulk-delete/', {}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_request_denied(self):
        self.client.force_authenticate(None)
        r = self.client.post('/api/guests/bulk-delete/', {'event_id': self.event.id}, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


class SendMessageTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user('mgr', password='pass', role='event_manager')
        self.client.force_authenticate(self.manager)
        self.event = make_event()
        self.guest = make_guest(self.event, phone_number='2348000000001')
        self.guest_no_phone = make_guest(self.event, full_name='No Phone', phone_number='')

    def test_missing_message_returns_400(self):
        r = self.client.post(f'/api/guests/{self.guest.id}/send_message/', {'message': ''}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_guest_without_phone_returns_400(self):
        r = self.client.post(f'/api/guests/{self.guest_no_phone.id}/send_message/', {'message': 'Hi'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_whatsapp_not_configured_returns_503(self):
        with self.settings(WHATSAPP_PHONE_ID='', WHATSAPP_TOKEN=''):
            r = self.client.post(f'/api/guests/{self.guest.id}/send_message/', {'message': 'Hello'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn('not configured', r.data['detail'].lower())


class CheckInTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user('staff', password='pass', role='check_in_staff')
        self.client.force_authenticate(self.staff)
        self.event = make_event()
        self.guest = make_guest(self.event)

    def test_check_in_succeeds(self):
        r = self.client.post(f'/api/guests/{self.guest.id}/check_in/')
        self.assertEqual(r.status_code, 200)
        self.guest.refresh_from_db()
        self.assertEqual(self.guest.status, Guest.Status.CHECKED_IN)
        self.assertIsNotNone(self.guest.checked_in_at)

    def test_double_check_in_returns_409(self):
        self.client.post(f'/api/guests/{self.guest.id}/check_in/')
        r = self.client.post(f'/api/guests/{self.guest.id}/check_in/')
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
