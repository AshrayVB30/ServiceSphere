"""
Application configuration for 'notifications'.

Registers the notification application and connects user signals to ensure
every user has default notification preferences initialized upon account creation.
"""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """Configuration class for the ServiceSphere notifications application."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "notifications"
    verbose_name = "Notifications & Alert Management"

    def ready(self):
        """
        Connect signals when Django starts up.
        Ensures signals for automatic preference provisioning are registered.
        """
        import notifications.signals  # noqa: F401

