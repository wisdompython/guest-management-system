from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0011_event_pass_send_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='collect_aso_ebi',
            field=models.BooleanField(
                default=False,
                help_text='Allow guests to request Aso Ebi and specify a quantity.',
            ),
        ),
        migrations.AddField(
            model_name='guest',
            name='aso_ebi_requested',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='guest',
            name='aso_ebi_quantity',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
