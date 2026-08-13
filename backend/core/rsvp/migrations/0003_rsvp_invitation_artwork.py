from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rsvp', '0002_workflow_scheduling'),
    ]

    operations = [
        migrations.AddField(
            model_name='rsvpworkflow',
            name='invitation_design',
            field=models.ImageField(
                blank=True,
                help_text='Optional RSVP artwork. Guest names are added before delivery.',
                null=True,
                upload_to='rsvp_designs/',
            ),
        ),
        migrations.AddField(
            model_name='rsvpworkflow',
            name='invitation_name_zone_x',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='rsvpworkflow',
            name='invitation_name_zone_y',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='rsvpworkflow',
            name='invitation_name_zone_w',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='rsvpworkflow',
            name='invitation_name_zone_h',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='rsvprecipient',
            name='invitation_image',
            field=models.ImageField(blank=True, null=True, upload_to='rsvp_invitations/'),
        ),
    ]
