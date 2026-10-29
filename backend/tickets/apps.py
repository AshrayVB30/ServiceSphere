"""
Configuration for the 'tickets' application.

The 'tickets' app is the central help-desk module of ServiceSphere, managing
ticket creation, prioritization, assignments, status lifecycles, and resolution tracking.
"""

from django.apps import AppConfig


class TicketsConfig(AppConfig):
    # Specifies the default primary key type for auto-generated model IDs (64-bit integer)
    default_auto_field = "django.db.models.BigAutoField"

    # Python module path for this application
    name = "tickets"
