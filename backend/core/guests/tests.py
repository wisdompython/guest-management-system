import io
import zipfile
from unittest.mock import patch

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


def make_csv(rows: list[dict], extra_cols: list[str] | None = None) -> io.BytesIO:
    """Build an in-memory CSV file from a list of dicts."""
    cols = ['full_name', 'phone_number'] + (extra_cols or [])
    buf = io.StringIO()
    buf.write(','.join(cols) + '\n')
    for row in rows:
        buf.write(','.join(str(row.get(c, '')) for c in cols) + '\n')
    return io.BytesIO(buf.getvalue().encode())


@patch('guests.views.guest_actions.generate_guest_assets')
class BulkUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user('mgr2', password='pass', role='event_manager')
        self.client.force_authenticate(self.manager)
        self.event = make_event(name='Upload Event')

    def _upload(self, rows, mock_task, extra_cols=None):
        csv_file = make_csv(rows, extra_cols)
        csv_file.name = 'guests.csv'
        return self.client.post(
            '/api/guests/bulk-upload/',
            {'event': self.event.id, 'csv_file': csv_file},
            format='multipart',
        ), mock_task

    def test_small_upload_creates_all_guests(self, mock_task):
        rows = [{'full_name': f'Guest {i}', 'phone_number': f'23480000{i:05d}'} for i in range(10)]
        r, _ = self._upload(rows, mock_task)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['successful'], 10)
        self.assertEqual(r.data['failed'], 0)
        self.assertEqual(Guest.objects.filter(event=self.event).count(), 10)

    def test_large_upload_2000_guests_uses_bulk_create(self, mock_task):
        """2000-row upload must complete and create all guests via bulk_create."""
        rows = [{'full_name': f'Guest {i}', 'phone_number': f'23480{i:07d}'} for i in range(2000)]
        r, _ = self._upload(rows, mock_task)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['successful'], 2000)
        self.assertEqual(r.data['failed'], 0)
        self.assertEqual(Guest.objects.filter(event=self.event).count(), 2000)

    def test_celery_tasks_queued_after_all_rows_committed(self, mock_task):
        """generate_guest_assets.delay() must be called once per created guest."""
        rows = [{'full_name': f'G{i}', 'phone_number': f'23480000{i:05d}'} for i in range(50)]
        r, _ = self._upload(rows, mock_task)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        # One .delay() call per guest — no more, no less
        self.assertEqual(mock_task.delay.call_count, 50)
        # Every call passes a guest ID that actually exists in the DB
        queued_ids = {call.args[0] for call in mock_task.delay.call_args_list}
        db_ids = set(Guest.objects.filter(event=self.event).values_list('id', flat=True))
        db_ids_str = {str(i) for i in db_ids}
        self.assertEqual(queued_ids, db_ids_str)

    def test_celery_tasks_queued_with_send_whatsapp_true(self, mock_task):
        rows = [{'full_name': 'Alice', 'phone_number': '2348000000001'}]
        self._upload(rows, mock_task)
        _, kwargs = mock_task.delay.call_args
        self.assertTrue(kwargs.get('send_whatsapp', True))

    def test_invalid_rows_reported_valid_rows_still_created(self, mock_task):
        """Rows missing full_name go to error_report; valid rows are still inserted."""
        rows = [
            {'full_name': 'Valid Guest', 'phone_number': '2348000000001'},
            {'full_name': '',            'phone_number': '2348000000002'},  # invalid
            {'full_name': 'Another OK',  'phone_number': '2348000000003'},
        ]
        r, _ = self._upload(rows, mock_task)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['successful'], 2)
        self.assertEqual(r.data['failed'], 1)
        self.assertEqual(Guest.objects.filter(event=self.event).count(), 2)

    def test_empty_csv_returns_zero_created(self, mock_task):
        r, _ = self._upload([], mock_task)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['successful'], 0)
        self.assertEqual(mock_task.delay.call_count, 0)

    def test_unauthenticated_upload_denied(self, mock_task):
        self.client.force_authenticate(None)
        csv_file = make_csv([{'full_name': 'X', 'phone_number': '1'}])
        csv_file.name = 'g.csv'
        r = self.client.post('/api/guests/bulk-upload/', {'event': self.event.id, 'csv_file': csv_file}, format='multipart')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(mock_task.delay.call_count, 0)

    def test_missing_csv_returns_400(self, mock_task):
        r = self.client.post('/api/guests/bulk-upload/', {'event': self.event.id}, format='multipart')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


@patch('guests.views.guest_actions.generate_guest_assets')
class DownloadAssetsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user('mgr3', password='pass', role='event_manager')
        self.client.force_authenticate(self.manager)
        self.event = make_event(name='Assets Event')
        # Create guests without real files — download should handle missing files gracefully
        self.g1 = make_guest(self.event, full_name='Alice')
        self.g2 = make_guest(self.event, full_name='Bob')

    def test_download_assets_returns_zip(self, _mock):
        r = self.client.get('/api/guests/download-assets/', {'event': self.event.id, 'mode': 'both'})
        self.assertEqual(r.status_code, 200)
        content_type = r.get('Content-Type', '')
        self.assertIn('zip', content_type)

    def test_download_assets_missing_event_returns_400(self, _mock):
        r = self.client.get('/api/guests/download-assets/')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_download_assets_nonexistent_event_returns_404(self, _mock):
        r = self.client.get('/api/guests/download-assets/', {'event': 99999})
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_download_assets_zip_is_valid(self, _mock):
        """Response body must be a parseable ZIP even when guests have no files."""
        r = self.client.get('/api/guests/download-assets/', {'event': self.event.id})
        # Collect streamed response
        body = b''.join(r.streaming_content) if hasattr(r, 'streaming_content') else r.content
        try:
            with zipfile.ZipFile(io.BytesIO(body)) as zf:
                # Valid zip — may be empty (no real files on disk in test env)
                self.assertIsInstance(zf.namelist(), list)
        except zipfile.BadZipFile:
            self.fail('download-assets response is not a valid ZIP file')


@patch('guests.tasks.send_whatsapp_pass')
class PastEventWhatsAppGuardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user('mgr4', password='pass', role='event_manager')
        self.client.force_authenticate(self.manager)
        self.past_event   = make_event(name='Past Event',   date=timezone.now() - timezone.timedelta(days=1))
        self.future_event = make_event(name='Future Event', date=timezone.now() + timezone.timedelta(days=7))
        self.past_guest   = make_guest(self.past_event,   full_name='Past Guest')
        self.future_guest = make_guest(self.future_event, full_name='Future Guest')
        # Give both guests a pass_image name so the no-image guard doesn't fire first
        Guest.objects.filter(pk=self.past_guest.pk).update(pass_image='passes/fake.png')
        Guest.objects.filter(pk=self.future_guest.pk).update(pass_image='passes/fake.png')
        self.past_guest.refresh_from_db()
        self.future_guest.refresh_from_db()

    def test_send_whatsapp_blocked_for_past_event(self, mock_task):
        r = self.client.post(f'/api/guests/{self.past_guest.id}/send_whatsapp/')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ended', r.data['detail'].lower())
        mock_task.delay.assert_not_called()

    def test_send_whatsapp_allowed_for_future_event(self, mock_task):
        r = self.client.post(f'/api/guests/{self.future_guest.id}/send_whatsapp/')
        self.assertEqual(r.status_code, 200)
        mock_task.delay.assert_called_once_with(str(self.future_guest.id))

    def test_bulk_send_whatsapp_blocked_for_past_event(self, mock_task):
        r = self.client.post('/api/guests/bulk_send_whatsapp/', {'event_id': self.past_event.id}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ended', r.data['detail'].lower())
        mock_task.delay.assert_not_called()

    def test_bulk_send_whatsapp_allowed_for_future_event(self, mock_task):
        r = self.client.post('/api/guests/bulk_send_whatsapp/', {'event_id': self.future_event.id}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['queued'])


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
