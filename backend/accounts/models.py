from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrator"
        SUPPORT_AGENT = "SUPPORT_AGENT", "Support Agent"
        CLIENT = "CLIENT", "Client"
        APPROVER = "APPROVER", "Approver"

    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CLIENT,
        db_index=True,
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
    )

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
