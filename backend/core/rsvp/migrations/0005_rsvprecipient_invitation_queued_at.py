from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rsvp', '0004_backfill_event_rsvp_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='rsvprecipient',
            name='invitation_queued_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
