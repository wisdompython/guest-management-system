from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rsvp', '0007_shorten_rsvp_public_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='rsvprecipient',
            name='invitation_auto_retries',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='rsvprecipient',
            name='pass_auto_retries',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
