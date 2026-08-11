from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('rsvp', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='rsvpworkflow',
            name='invitation_send_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='rsvpworkflow',
            name='pass_send_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
