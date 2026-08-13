from django.db import migrations


def enable_rsvp_for_existing_workflows(apps, schema_editor):
    Event = apps.get_model('guests', 'Event')
    RsvpWorkflow = apps.get_model('rsvp', 'RsvpWorkflow')
    event_ids = RsvpWorkflow.objects.values_list('event_id', flat=True)
    Event.objects.filter(pk__in=event_ids).update(rsvp_enabled=True)


def reverse_backfill(apps, schema_editor):
    Event = apps.get_model('guests', 'Event')
    RsvpWorkflow = apps.get_model('rsvp', 'RsvpWorkflow')
    event_ids = RsvpWorkflow.objects.values_list('event_id', flat=True)
    Event.objects.filter(pk__in=event_ids).update(rsvp_enabled=False)


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0013_event_rsvp_enabled'),
        ('rsvp', '0003_rsvp_invitation_artwork'),
    ]

    operations = [
        migrations.RunPython(enable_rsvp_for_existing_workflows, reverse_backfill),
    ]
