from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0012_event_and_guest_aso_ebi'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='rsvp_enabled',
            field=models.BooleanField(default=False),
        ),
    ]
