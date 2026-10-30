"""
Configuration for the 'sla' application.

The 'sla' app manages Service Level Agreements (SLAs), priority-based deadlines,
first-response tracking, resolution tracking, automated SLA monitoring,
breach detection, and multi-tier escalations.
"""

from django.apps import AppConfig


class SlaConfig(AppConfig):
    # Specifies 64-bit auto-incrementing integer IDs as the default primary key
    default_auto_field = "django.db.models.BigAutoField"

    # Full Python package path for this application
    name = "sla"

