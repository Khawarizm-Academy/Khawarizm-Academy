"""Seed access roles and backfill existing non-student accounts safely."""

from django.db import migrations


def seed_access_roles(apps, schema_editor):
    # The service accepts the historical app registry so this migration does
    # not import current ORM model classes while it is replayed.
    from features.access.services import bootstrap_system_roles

    bootstrap_system_roles(apps=apps, using=schema_editor.connection.alias)


class Migration(migrations.Migration):
    dependencies = [
        ("access", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_access_roles, migrations.RunPython.noop),
    ]
