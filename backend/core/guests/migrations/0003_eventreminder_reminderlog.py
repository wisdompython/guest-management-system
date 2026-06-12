from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0002_event_qr_bg_color'),
    ]

    operations = [
        migrations.CreateModel(
            name='EventReminder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hours_before', models.PositiveIntegerField(help_text='How many hours before the event to send this reminder (e.g. 168 = 7 days, 24 = 1 day).')),
                ('template_name', models.CharField(help_text='Approved Meta WhatsApp template name to use for this reminder.', max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reminders', to='guests.event')),
            ],
            options={
                'ordering': ['hours_before'],
                'unique_together': {('event', 'hours_before')},
            },
        ),
        migrations.CreateModel(
            name='ReminderLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
                ('success', models.BooleanField(default=False)),
                ('guest', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reminder_logs', to='guests.guest')),
                ('reminder', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='guests.eventreminder')),
            ],
            options={
                'unique_together': {('reminder', 'guest')},
            },
        ),
    ]
