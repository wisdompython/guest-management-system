#!/bin/sh
set -e

# If arguments are passed (e.g. celery worker), run them directly without gunicorn setup
if [ "$1" = "celery" ]; then
  exec "$@"
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser from env vars if set, and ensure role=super_admin
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  echo "Creating superuser if not exists..."
  python manage.py shell -c "
from accounts.models import User
u, created = User.objects.get_or_create(username='$DJANGO_SUPERUSER_USERNAME')
if created:
    u.set_password('$DJANGO_SUPERUSER_PASSWORD')
    u.email = '${DJANGO_SUPERUSER_EMAIL:-}'
    print('Created superuser.')
else:
    print('Superuser already exists.')
u.role = 'super_admin'
u.is_staff = True
u.is_superuser = True
u.is_active = True
u.save()
print('Ensured role=super_admin.')
"
fi

echo "Starting Gunicorn..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers ${GUNICORN_WORKERS:-3} \
    --threads ${GUNICORN_THREADS:-2} \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
