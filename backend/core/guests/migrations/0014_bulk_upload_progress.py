from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0013_event_rsvp_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='bulkupload',
            name='assets_failed',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='bulkupload',
            name='assets_processed',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='bulkupload',
            name='assets_total',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='bulkupload',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='bulkupload',
            name='error_message',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='bulkupload',
            name='recipients_created',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='bulkupload',
            name='replace_existing',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='bulkupload',
            name='replaced_rows',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='bulkupload',
            name='started_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='bulkupload',
            name='task_id',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
