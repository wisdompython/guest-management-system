import os
from celery.schedules import crontab

# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------
CELERY_BROKER_URL         = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND     = 'django-db'
CELERY_CACHE_BACKEND      = 'default'
CELERY_ACCEPT_CONTENT     = ['json']
CELERY_TASK_SERIALIZER    = 'json'
CELERY_RESULT_SERIALIZER  = 'json'
CELERY_TIMEZONE           = os.environ.get('APP_TIME_ZONE', 'Africa/Lagos')
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# Keep CPU-heavy rendering away from imports and rate-limited WhatsApp sends.
# This prevents a 5,000-guest upload from starving live RSVP delivery.
CELERY_TASK_ROUTES = {
    'guests.tasks.process_bulk_guest_upload': {'queue': 'imports'},
    'guests.tasks.generate_guest_assets': {'queue': 'assets'},
    'guests.tasks.generate_guest_asset_batch': {'queue': 'assets'},
    'guests.tasks.send_whatsapp_pass': {'queue': 'messages'},
    'guests.tasks.bulk_send_whatsapp_passes': {'queue': 'messages'},
    'guests.tasks.send_reminder': {'queue': 'messages'},
    'guests.tasks.dispatch_scheduled_sends': {'queue': 'messages'},
    'guests.tasks.dispatch_due_reminders': {'queue': 'messages'},
    'rsvp.tasks.*': {'queue': 'messages'},
}

# In development (DEBUG=True and no broker configured), run tasks synchronously
# so you don't need Redis or a Celery worker running locally.
_broker_set = bool(os.environ.get('CELERY_BROKER_URL'))
CELERY_TASK_ALWAYS_EAGER  = not _broker_set
CELERY_TASK_EAGER_PROPAGATES = True

# Periodic tasks (Celery Beat)
CELERY_BEAT_SCHEDULE = {
    'dispatch-due-reminders': {
        'task': 'guests.tasks.dispatch_due_reminders',
        'schedule': crontab(minute='*/30'),  # every 30 minutes
    },
    'dispatch-scheduled-sends': {
        'task': 'guests.tasks.dispatch_scheduled_sends',
        'schedule': crontab(minute='*/5'),  # every 5 minutes
    },
    'dispatch-scheduled-rsvp-messages': {
        'task': 'rsvp.tasks.dispatch_scheduled_rsvp_messages',
        'schedule': crontab(minute='*/5'),
    },
}
