from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('guests', '0019_event_guest_preferences_and_party_checkin'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='rsvp_primary_color',
            field=models.CharField(default='#8a6f2b', help_text='Primary accent colour for the public RSVP page.', max_length=20),
        ),
        migrations.AddField(
            model_name='event',
            name='rsvp_background_color',
            field=models.CharField(default='#f6f4ee', help_text='Page background colour for the public RSVP page.', max_length=20),
        ),
        migrations.AddField(
            model_name='event',
            name='rsvp_card_color',
            field=models.CharField(default='#ffffff', help_text='Card and form background colour for the public RSVP page.', max_length=20),
        ),
        migrations.AddField(
            model_name='event',
            name='rsvp_text_color',
            field=models.CharField(default='#23262e', help_text='Primary text colour for the public RSVP page.', max_length=20),
        ),
        migrations.AddField(
            model_name='event',
            name='rsvp_background_image',
            field=models.ImageField(blank=True, help_text='Optional full-page background image for the public RSVP page.', null=True, upload_to='rsvp_backgrounds/'),
        ),
        migrations.AddField(
            model_name='guest',
            name='plus_one_of',
            field=models.OneToOneField(blank=True, help_text='Primary guest who supplied this named plus one.', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='named_plus_one', to='guests.guest'),
        ),
    ]
