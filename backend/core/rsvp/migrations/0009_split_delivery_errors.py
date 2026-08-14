from django.db import migrations, models
from django.db.models import F


def backfill_channel_errors(apps, schema_editor):
    """Attribute the shared last_error to the channel that is failed."""
    RsvpRecipient = apps.get_model('rsvp', 'RsvpRecipient')
    RsvpRecipient.objects.filter(
        invitation_status='failed',
    ).exclude(last_error='').update(invitation_error=F('last_error'))
    RsvpRecipient.objects.filter(
        pass_status='failed',
    ).exclude(last_error='').update(pass_error=F('last_error'))


class Migration(migrations.Migration):

    dependencies = [
        ('rsvp', '0008_rsvprecipient_auto_retries'),
    ]

    operations = [
        migrations.AddField(
            model_name='rsvprecipient',
            name='invitation_error',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='rsvprecipient',
            name='pass_error',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_channel_errors, migrations.RunPython.noop),
    ]
