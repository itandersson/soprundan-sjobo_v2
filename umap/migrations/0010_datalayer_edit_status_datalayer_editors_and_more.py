# Generated by Django 4.1.7 on 2023-05-31 00:54

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("umap", "0009_star"),
    ]

    operations = [
        migrations.AddField(
            model_name="datalayer",
            name="edit_status",
            field=models.SmallIntegerField(
                choices=[
                    (1, "Everyone can edit"),
                    (2, "Only editors can edit"),
                    (3, "Only owner can edit"),
                ],
                default=3,
                verbose_name="edit status",
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="editors",
            field=models.ManyToManyField(
                blank=True,
                related_name="%(app_label)s_%(class)s_editors_related",
                related_query_name="%(app_label)s_%(class)ss",
                to=settings.AUTH_USER_MODEL,
                verbose_name="editors",
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="%(app_label)s_%(class)s_owner_related",
                related_query_name="%(app_label)s_%(class)ss",
                to=settings.AUTH_USER_MODEL,
                verbose_name="owner",
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="share_status",
            field=models.SmallIntegerField(
                choices=[
                    (1, "everyone (public)"),
                    (2, "anyone with link"),
                    (3, "editors only"),
                    (9, "blocked"),
                ],
                default=1,
                verbose_name="share status",
            ),
        ),
        migrations.AlterField(
            model_name="map",
            name="editors",
            field=models.ManyToManyField(
                blank=True,
                related_name="%(app_label)s_%(class)s_editors_related",
                related_query_name="%(app_label)s_%(class)ss",
                to=settings.AUTH_USER_MODEL,
                verbose_name="editors",
            ),
        ),
        migrations.AlterField(
            model_name="map",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="%(app_label)s_%(class)s_owner_related",
                related_query_name="%(app_label)s_%(class)ss",
                to=settings.AUTH_USER_MODEL,
                verbose_name="owner",
            ),
        ),
    ]
