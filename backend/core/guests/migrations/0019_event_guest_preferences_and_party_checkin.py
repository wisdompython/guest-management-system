import uuid

from django.db import migrations, models


def populate_preference_tokens(apps, schema_editor):
    Guest = apps.get_model('guests', 'Guest')
    for guest in Guest.objects.filter(preference_token__isnull=True).iterator(chunk_size=500):
        guest.preference_token = uuid.uuid4()
        guest.save(update_fields=['preference_token'])


class Migration(migrations.Migration):
    dependencies = [
        ('guests', '0018_event_allow_plus_one_guest_plus_one_attending'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='preferences_enabled',
            field=models.BooleanField(
                default=False,
                help_text='Collect guest preferences without requiring RSVP confirmation.',
            ),
        ),
        migrations.AddField(
            model_name='event',
            name='collect_celebrant',
            field=models.BooleanField(
                default=False,
                help_text='Ask guests which celebrant they are attending for.',
            ),
        ),
        migrations.AddField(
            model_name='event',
            name='celebrant_options',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Optional predetermined celebrant names. Guests enter a custom name when empty.',
            ),
        ),
        migrations.AddField(
            model_name='guest',
            name='celebrant_name',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='guest',
            name='preference_token',
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.RunPython(populate_preference_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='guest',
            name='preference_token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AddField(
            model_name='guest',
            name='preferences_submitted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='guest',
            name='plus_one_checked_in',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='guest',
            name='plus_one_checked_in_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
