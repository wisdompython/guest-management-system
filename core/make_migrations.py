"""
Run this script directly (not via manage.py) to generate migrations
when the DB consistency check blocks makemigrations.

Usage: python make_migrations.py
"""
import os
import sys
import django
from pathlib import Path

# Point to the project settings
sys.path.insert(0, str(Path(__file__).parent))
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'

# Monkey-patch the loader to skip the consistency check
from django.db.migrations import loader as _loader
_orig_check = _loader.MigrationLoader.check_consistent_history
_loader.MigrationLoader.check_consistent_history = lambda self, conn: None

django.setup()

from django.core.management import call_command
call_command('makemigrations', 'accounts', 'guests', verbosity=2)
print("\nMigration files created. Now stop the dev server, delete db.sqlite3, and run:")
print("  python manage.py migrate")
print("  python manage.py createsuperuser")
