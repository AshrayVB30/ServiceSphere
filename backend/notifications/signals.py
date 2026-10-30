"""
Signals for the 'notifications' application.

Listens for user lifecycle events to automatically create default
NotificationPreference records whenever a new User registers or is created.
"""

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import NotificationPreference


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_user_notification_preferences(sender, instance, created, **kwargs):
    """
    Signal handler: Provisions default notification preferences for newly created users.
    - in_app_enabled: True
    - email_enabled: False (disabled by default)
    - ticket_notifications: True
    - approval_notifications: True
    - sla_notifications: True
    """
    if created:
        NotificationPreference.objects.get_or_create(user=instance)

