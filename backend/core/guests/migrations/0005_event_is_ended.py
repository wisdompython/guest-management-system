from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0004_whatsapptemplate'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='is_ended',
            field=models.BooleanField(default=False),
        ),
    ]
