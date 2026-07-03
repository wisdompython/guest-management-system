from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('super_admin', 'Super Admin'),
                    ('event_manager', 'Event Manager'),
                    ('check_in_staff', 'Check-In Staff'),
                    ('scanner', 'Scanner'),
                    ('viewer', 'Viewer'),
                ],
                default='viewer',
                max_length=20,
            ),
        ),
    ]
