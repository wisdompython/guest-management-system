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
CELERY_TIMEZONE           = 'UTC'

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
}
