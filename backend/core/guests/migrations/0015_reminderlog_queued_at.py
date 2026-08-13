from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0014_bulk_upload_progress'),
    ]

    operations = [
        migrations.AddField(
            model_name='reminderlog',
            name='queued_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
