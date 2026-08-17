"""Read-only operational snapshots for the super-admin queue monitor."""

import json
import re
from datetime import timedelta

from django.conf import settings
from django.utils import timezone


MONITORED_QUEUES = ('messages', 'imports', 'assets', 'celery')
MONITORED_DELIVERY_STATUSES = ('queued', 'sending', 'failed')


def _safe_error(value, limit=240):
    """Return a compact error summary without exposing task payloads."""
    text = str(value or '').strip()
    if not text:
        return ''
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            text = str(parsed.get('exc_message') or parsed.get('message') or parsed)
    except (TypeError, ValueError, json.JSONDecodeError):
        pass
    text = ' '.join(text.split())
    text = re.sub(
        r'(?i)\b(access[_-]?token|authorization|bearer|token)(\s*[:=]\s*)([^\s,;}]+)',
        r'\1\2[redacted]',
        text,
    )
    text = re.sub(r'(?i)\bbearer\s+[^\s,;}]+', 'Bearer [redacted]', text)
    text = re.sub(
        r'(?<!\d)\+?\d{9,15}(?!\d)',
        lambda match: f'••••{match.group(0)[-4:]}',
        text,
    )
    return text[:limit] + ('…' if len(text) > limit else '')


def _queue_depths():
    if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
        return {
            'available': False,
            'error': 'Tasks run synchronously in this environment.',
            'queues': [{'name': name, 'pending': 0} for name in MONITORED_QUEUES],
        }
    try:
        from redis import Redis

        client = Redis.from_url(
            settings.CELERY_BROKER_URL,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
            decode_responses=True,
        )
        client.ping()
        queues = []
        for queue_name in MONITORED_QUEUES:
            pending = 0
            # Kombu stores Redis priority buckets as `<queue>\x06\x16<n>`.
            for key in client.scan_iter(match=f'{queue_name}*', count=100):
                if key == queue_name or key.startswith(f'{queue_name}\x06\x16'):
                    pending += client.llen(key)
            queues.append({'name': queue_name, 'pending': pending})
        return {'available': True, 'error': '', 'queues': queues}
    except Exception as exc:
        return {
            'available': False,
            'error': _safe_error(exc),
            'queues': [{'name': name, 'pending': None} for name in MONITORED_QUEUES],
        }


def _normalise_inspected_tasks(payload, state):
    tasks = []
    for worker, entries in (payload or {}).items():
        for entry in entries or []:
            request = entry.get('request', entry) if state == 'scheduled' else entry
            delivery = request.get('delivery_info') or {}
            tasks.append({
                'id': request.get('id', ''),
                'name': request.get('name', ''),
                'worker': worker,
                'state': state,
                'queue': delivery.get('routing_key') or delivery.get('exchange') or '',
                'time_start': request.get('time_start'),
                'eta': entry.get('eta') if state == 'scheduled' else None,
            })
    return tasks


def _worker_snapshot():
    if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
        return {
            'available': False,
            'error': 'No workers are used while Celery eager mode is enabled.',
            'workers': [],
            'tasks': [],
        }
    try:
        from core.celery import app

        inspector = app.control.inspect(timeout=0.75)
        ping = inspector.ping() or {}
        # Each inspect call is a separate broadcast that waits the full
        # timeout when nothing answers; skip the rest on a dead cluster so
        # the snapshot fails fast instead of stacking timeouts.
        if not ping:
            return {
                'available': False,
                'error': 'No Celery workers responded to inspection.',
                'workers': [],
                'tasks': [],
            }
        active_queues = inspector.active_queues() or {}
        stats = inspector.stats() or {}
        active = inspector.active() or {}
        reserved = inspector.reserved() or {}
        scheduled = inspector.scheduled() or {}
        worker_names = sorted(
            set(ping) | set(active_queues) | set(stats)
            | set(active) | set(reserved) | set(scheduled)
        )
        workers = []
        for name in worker_names:
            pool = (stats.get(name) or {}).get('pool') or {}
            queues = sorted({
                queue.get('name', '')
                for queue in active_queues.get(name, [])
                if queue.get('name')
            })
            workers.append({
                'name': name,
                'online': name in ping,
                'queues': queues,
                'concurrency': pool.get('max-concurrency'),
                'active': len(active.get(name, [])),
                'reserved': len(reserved.get(name, [])),
                'scheduled': len(scheduled.get(name, [])),
            })
        tasks = (
            _normalise_inspected_tasks(active, 'active')
            + _normalise_inspected_tasks(reserved, 'reserved')
            + _normalise_inspected_tasks(scheduled, 'scheduled')
        )
        return {
            'available': bool(worker_names),
            'error': '' if worker_names else 'No Celery workers responded to inspection.',
            'workers': workers,
            'tasks': tasks,
        }
    except Exception as exc:
        return {
            'available': False,
            'error': _safe_error(exc),
            'workers': [],
            'tasks': [],
        }


def _recent_task_results(limit=50):
    from django_celery_results.models import TaskResult

    results = []
    rows = TaskResult.objects.order_by('-date_done')[:limit]
    for row in rows:
        runtime_ms = None
        if row.date_started and row.date_done:
            runtime_ms = max(
                int((row.date_done - row.date_started).total_seconds() * 1000),
                0,
            )
        results.append({
            'id': row.task_id,
            'name': row.task_name or 'Unknown task',
            'status': row.status,
            'worker': row.worker or '',
            'created_at': row.date_created,
            'started_at': row.date_started,
            'finished_at': row.date_done,
            'runtime_ms': runtime_ms,
            'error': _safe_error(row.result) if row.status == 'FAILURE' else '',
        })
    return results


# How far past its own scheduled slot a dispatcher may run before the
# monitor flags it, so Beat's normal dispatch jitter doesn't flash red.
DISPATCHER_OVERDUE_GRACE_SECONDS = 300
# Fallback when a row's schedule cannot be evaluated.
DISPATCHER_FALLBACK_MAX_AGE_SECONDS = 900


def _dispatcher_overdue_seconds(row):
    """How many seconds past its next scheduled run this dispatcher is.

    Derived from the row's own cron schedule so slow cadences (e.g. every
    30 minutes) are not flagged just for being between runs. Returns None
    when the schedule cannot be evaluated.
    """
    if not row.last_run_at:
        return None
    try:
        remaining = row.schedule.remaining_estimate(row.last_run_at)
    except Exception:
        return None
    return max(int(-remaining.total_seconds()), 0)


def _periodic_dispatchers():
    from django_celery_beat.models import PeriodicTask

    configured_tasks = set(
        entry['task'] for entry in settings.CELERY_BEAT_SCHEDULE.values()
    )
    rows = PeriodicTask.objects.filter(task__in=configured_tasks).order_by('name')
    now = timezone.now()
    dispatchers = []
    for row in rows:
        age_seconds = (
            int((now - row.last_run_at).total_seconds())
            if row.last_run_at else None
        )
        overdue_seconds = _dispatcher_overdue_seconds(row)
        if not row.enabled or age_seconds is None:
            healthy = False
        elif overdue_seconds is None:
            healthy = age_seconds <= DISPATCHER_FALLBACK_MAX_AGE_SECONDS
        else:
            healthy = overdue_seconds <= DISPATCHER_OVERDUE_GRACE_SECONDS
        dispatchers.append({
            'name': row.name,
            'task': row.task,
            'enabled': row.enabled,
            'last_run_at': row.last_run_at,
            'seconds_since_last_run': age_seconds,
            'overdue_seconds': overdue_seconds,
            'total_runs': row.total_run_count,
            'healthy': healthy,
        })
    return dispatchers


def _mask_phone(phone):
    digits = ''.join(character for character in str(phone or '') if character.isdigit())
    return f'••••{digits[-4:]}' if digits else ''


def _delivery_pipeline(limit=100):
    from django.db.models import Q
    from rsvp.models import RsvpRecipient

    recipients = (
        RsvpRecipient.objects
        .filter(
            Q(invitation_status__in=MONITORED_DELIVERY_STATUSES)
            | Q(pass_status__in=MONITORED_DELIVERY_STATUSES)
        )
        .select_related('guest', 'workflow__event')
        .order_by('-updated_at')[:limit]
    )
    deliveries = []
    for recipient in recipients:
        common = {
            'recipient_id': recipient.id,
            'workflow_id': recipient.workflow_id,
            'event': recipient.workflow.event.name,
            'guest': recipient.guest.full_name,
            'phone': _mask_phone(recipient.guest.phone_number),
            'updated_at': recipient.updated_at,
        }
        if recipient.invitation_status in MONITORED_DELIVERY_STATUSES:
            deliveries.append({
                **common,
                'channel': 'invitation',
                'status': recipient.invitation_status,
                'template': recipient.invitation_last_template_name,
                'queued_at': recipient.invitation_queued_at,
                'retries': recipient.invitation_auto_retries,
                'error': _safe_error(recipient.invitation_error or recipient.last_error),
            })
        if recipient.pass_status in MONITORED_DELIVERY_STATUSES:
            deliveries.append({
                **common,
                'channel': 'pass',
                'status': recipient.pass_status,
                'template': recipient.pass_last_template_name,
                'queued_at': recipient.pass_queued_at,
                'retries': recipient.pass_auto_retries,
                'error': _safe_error(recipient.pass_error or recipient.last_error),
            })
    return deliveries[:limit]


def build_queue_monitor_snapshot():
    from guests.send_budget import daily_send_limit, remaining_send_budget
    from rsvp.tasks import RSVP_MESSAGES_PER_MINUTE

    broker = _queue_depths()
    workers = _worker_snapshot()
    message_workers = sum(
        1 for worker in workers['workers'] if 'messages' in worker['queues']
    )
    return {
        'generated_at': timezone.now(),
        'broker': broker,
        'workers': workers,
        'periodic_dispatchers': _periodic_dispatchers(),
        'recent_tasks': _recent_task_results(),
        'deliveries': _delivery_pipeline(),
        'message_rate': {
            'configured_per_worker_per_minute': RSVP_MESSAGES_PER_MINUTE,
            'workers_consuming_messages': message_workers,
            'estimated_global_ceiling_per_minute': (
                RSVP_MESSAGES_PER_MINUTE * message_workers
            ),
        },
        'send_budget': {
            'daily_limit': daily_send_limit(),
            'remaining': remaining_send_budget(),
            'window_hours': int(timedelta(days=1).total_seconds() / 3600),
        },
    }
