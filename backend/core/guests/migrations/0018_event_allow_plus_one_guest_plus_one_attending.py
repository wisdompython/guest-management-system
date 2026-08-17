from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('guests', '0017_bulkupload_duplicate_reports'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='allow_plus_one',
            field=models.BooleanField(
                default=False,
                help_text='Allow confirmed guests to indicate that they will bring one additional guest.',
            ),
        ),
        migrations.AddField(
            model_name='guest',
            name='plus_one_attending',
            field=models.BooleanField(default=False),
        ),
    ]
