from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rsvp', '0010_reconcile_failed_pass_guests'),
    ]

    operations = [
        migrations.AddField(
            model_name='rsvprecipient',
            name='invitation_last_template_name',
            field=models.CharField(blank=True, max_length=512),
        ),
        migrations.AddField(
            model_name='rsvprecipient',
            name='pass_last_template_name',
            field=models.CharField(blank=True, max_length=512),
        ),
    ]
