from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0015_reminderlog_queued_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='color_of_day',
            field=models.CharField(
                blank=True,
                help_text='Optional dress colour or event colour shown on the RSVP page.',
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name='event',
            name='rsvp_message',
            field=models.TextField(
                blank=True,
                help_text='Guest-facing welcome message shown on the public RSVP page.',
            ),
        ),
    ]
