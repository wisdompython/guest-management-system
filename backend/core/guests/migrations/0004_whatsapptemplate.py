from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0003_eventreminder_reminderlog'),
    ]

    operations = [
        migrations.CreateModel(
            name='WhatsAppTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Exact template name as in Meta Business Manager', max_length=200, unique=True)),
                ('display_name', models.CharField(blank=True, help_text='Friendly label shown in the UI', max_length=200)),
                ('description', models.TextField(blank=True)),
                ('body_params', models.JSONField(blank=True, default=list, help_text='Ordered list of variable keys for body params')),
                ('has_header_image', models.BooleanField(default=False, help_text='Template has a header image (pass image will be sent)')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
