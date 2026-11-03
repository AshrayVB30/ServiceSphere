"""
Application configuration for 'analytics'.

Registers the Analytics and Performance Management application in ServiceSphere.
"""

from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    """Configuration class for the ServiceSphere Analytics application."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "analytics"
    verbose_name = "Analytics, KPI & KRA Management"

