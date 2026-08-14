import secrets

import rsvp.models
from django.db import migrations, models


ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'


def generate_code(used):
    code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
    while code in used:
        code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
    used.add(code)
    return code


def shorten_codes(apps, schema_editor):
    RsvpRecipient = apps.get_model('rsvp', 'RsvpRecipient')
    used = set()
    batch = []
    for recipient in RsvpRecipient.objects.all().iterator(chunk_size=1000):
        recipient.legacy_public_code = recipient.public_code
        recipient.public_code = generate_code(used)
        batch.append(recipient)
        if len(batch) == 1000:
            RsvpRecipient.objects.bulk_update(
                batch,
                ['legacy_public_code', 'public_code'],
                batch_size=1000,
            )
            batch = []
    if batch:
        RsvpRecipient.objects.bulk_update(
            batch,
            ['legacy_public_code', 'public_code'],
            batch_size=1000,
        )


def restore_codes(apps, schema_editor):
    RsvpRecipient = apps.get_model('rsvp', 'RsvpRecipient')
    batch = []
    recipients = RsvpRecipient.objects.exclude(
        legacy_public_code__isnull=True,
    ).iterator(chunk_size=1000)
    for recipient in recipients:
        recipient.public_code = recipient.legacy_public_code
        recipient.legacy_public_code = None
        batch.append(recipient)
        if len(batch) == 1000:
            RsvpRecipient.objects.bulk_update(
                batch,
                ['public_code', 'legacy_public_code'],
                batch_size=1000,
            )
            batch = []
    if batch:
        RsvpRecipient.objects.bulk_update(
            batch,
            ['public_code', 'legacy_public_code'],
            batch_size=1000,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('rsvp', '0006_rsvprecipient_public_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='rsvprecipient',
            name='legacy_public_code',
            field=models.CharField(
                blank=True,
                editable=False,
                max_length=12,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(shorten_codes, restore_codes),
        migrations.AlterField(
            model_name='rsvprecipient',
            name='public_code',
            field=models.CharField(
                default=rsvp.models.generate_public_code,
                editable=False,
                max_length=6,
                unique=True,
            ),
        ),
    ]
