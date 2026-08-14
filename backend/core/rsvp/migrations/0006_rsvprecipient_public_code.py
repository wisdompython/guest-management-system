import secrets

import rsvp.models
from django.db import migrations, models


ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'


def populate_public_codes(apps, schema_editor):
    RsvpRecipient = apps.get_model('rsvp', 'RsvpRecipient')
    used = set(
        RsvpRecipient.objects.exclude(public_code__isnull=True)
        .values_list('public_code', flat=True)
    )
    for recipient in RsvpRecipient.objects.filter(public_code__isnull=True).iterator():
        code = ''.join(secrets.choice(ALPHABET) for _ in range(12))
        while code in used:
            code = ''.join(secrets.choice(ALPHABET) for _ in range(12))
        recipient.public_code = code
        recipient.save(update_fields=['public_code'])
        used.add(code)


class Migration(migrations.Migration):

    dependencies = [
        ('rsvp', '0005_rsvprecipient_invitation_queued_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='rsvprecipient',
            name='public_code',
            field=models.CharField(blank=True, editable=False, max_length=12, null=True, unique=True),
        ),
        migrations.RunPython(populate_public_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='rsvprecipient',
            name='public_code',
            field=models.CharField(default=rsvp.models.generate_public_code, editable=False, max_length=12, unique=True),
        ),
    ]
