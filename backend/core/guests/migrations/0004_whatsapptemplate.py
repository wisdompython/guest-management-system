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
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
