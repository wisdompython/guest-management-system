from django.db import migrations


def revert_failed_pass_guests(apps, schema_editor):
    """Un-mark guests whose pass send was accepted by the API but later
    reported failed by the status webhook. Until now only the RSVP recipient
    was flipped to failed, so the direct WhatsApp page kept counting these
    guests as sent."""
    RsvpRecipient = apps.get_model('rsvp', 'RsvpRecipient')
    Guest = apps.get_model('guests', 'Guest')

    guest_ids = list(
        RsvpRecipient.objects
        .filter(pass_status='failed')
        .values_list('guest_id', flat=True)
    )
    if guest_ids:
        Guest.objects.filter(
            pk__in=guest_ids,
            whatsapp_sent=True,
        ).update(whatsapp_sent=False)


class Migration(migrations.Migration):

    dependencies = [
        ('rsvp', '0009_split_delivery_errors'),
        ('guests', '0017_bulkupload_duplicate_reports'),
    ]

    operations = [
        migrations.RunPython(revert_failed_pass_guests, migrations.RunPython.noop),
    ]
