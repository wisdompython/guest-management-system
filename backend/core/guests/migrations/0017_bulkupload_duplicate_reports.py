from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0016_event_rsvp_page_content'),
    ]

    operations = [
        migrations.AddField(
            model_name='bulkupload',
            name='skipped_rows',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='bulkupload',
            name='skipped_report',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
