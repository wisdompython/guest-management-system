from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('guests', '0010_guest_scheduled_send_claimed_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='pass_send_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
