from datetime import timedelta
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Role, User
from .operations import _normalise_inspected_tasks, _periodic_dispatchers, _safe_error


class QueueMonitorPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            'queue-manager', password='pass', role=Role.EVENT_MANAGER,
        )
        self.super_admin = User.objects.create_user(
            'queue-admin', password='pass', role=Role.SUPER_ADMIN,
        )

    def test_queue_monitor_requires_authentication(self):
        response = self.client.get('/api/auth/operations/queue/')
        self.assertIn(response.status_code, {401, 403})

    def test_queue_monitor_rejects_non_super_admin(self):
        self.client.force_authenticate(self.manager)
        response = self.client.get('/api/auth/operations/queue/')
        self.assertEqual(response.status_code, 403)

    @patch('accounts.operations.build_queue_monitor_snapshot')
    def test_super_admin_can_read_queue_monitor(self, mock_snapshot):
        mock_snapshot.return_value = {
            'generated_at': timezone.now(),
            'broker': {'available': True, 'error': '', 'queues': []},
        }
        self.client.force_authenticate(self.super_admin)

        response = self.client.get('/api/auth/operations/queue/')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['broker']['available'])
        mock_snapshot.assert_called_once_with()

    def test_queue_monitor_is_read_only(self):
        self.client.force_authenticate(self.super_admin)
        response = self.client.post('/api/auth/operations/queue/', {})
        self.assertEqual(response.status_code, 405)


class QueueMonitorSanitisingTests(SimpleTestCase):
    def test_inspected_tasks_do_not_expose_args_or_kwargs(self):
        tasks = _normalise_inspected_tasks({
            'worker@host': [{
                'id': 'task-1',
                'name': 'rsvp.tasks.send_confirmed_pass',
                'args': ['secret-recipient-id'],
                'kwargs': {'token': 'secret-token'},
                'delivery_info': {'routing_key': 'messages'},
            }],
        }, 'active')

        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]['queue'], 'messages')
        self.assertNotIn('args', tasks[0])
        self.assertNotIn('kwargs', tasks[0])

    def test_failure_summaries_redact_tokens_and_phone_numbers(self):
        summary = _safe_error(
            'authorization=secret-token failed for +2348001234567',
        )

        self.assertNotIn('secret-token', summary)
        self.assertNotIn('2348001234567', summary)
        self.assertIn('[redacted]', summary)
        self.assertIn('••••4567', summary)


class DispatcherHealthTests(TestCase):
    """Health must follow each dispatcher's own schedule, not a fixed age."""

    def _make_dispatcher(self, name, minute, last_run_at):
        from django_celery_beat.models import CrontabSchedule, PeriodicTask

        crontab, _ = CrontabSchedule.objects.get_or_create(
            minute=minute, hour='*', day_of_week='*',
            day_of_month='*', month_of_year='*',
        )
        row = PeriodicTask.objects.create(
            name=name,
            task='rsvp.tasks.dispatch_scheduled_rsvp_messages',
            crontab=crontab,
        )
        PeriodicTask.objects.filter(pk=row.pk).update(last_run_at=last_run_at)
        return name

    def _health_by_name(self):
        return {row['name']: row['healthy'] for row in _periodic_dispatchers()}

    def test_slow_cadence_between_runs_is_healthy(self):
        # A 30-minute dispatcher whose last run was its most recent slot is
        # simply between runs, even when that was more than 15 minutes ago.
        now = timezone.localtime()
        last_slot = now.replace(minute=(now.minute // 30) * 30, second=0, microsecond=0)
        name = self._make_dispatcher('slow-on-time', '*/30', last_slot)
        self.assertTrue(self._health_by_name()[name])

    def test_missed_run_is_unhealthy(self):
        now = timezone.localtime()
        last_slot = now.replace(minute=(now.minute // 30) * 30, second=0, microsecond=0)
        name = self._make_dispatcher('slow-stalled', '*/30', last_slot - timedelta(minutes=40))
        self.assertFalse(self._health_by_name()[name])

    def test_never_run_dispatcher_is_unhealthy(self):
        name = self._make_dispatcher('never-ran', '*/5', None)
        self.assertFalse(self._health_by_name()[name])
