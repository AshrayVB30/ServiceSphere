"""
Configuration for the 'core' application.

The 'core' app contains project-wide shared components, utilities,
and global system endpoints (such as the health-check).
"""

from django.apps import AppConfig


class CoreConfig(AppConfig):
    # Specifies the default auto-generated primary key field type for models in this app
    default_auto_field = "django.db.models.BigAutoField"
    
    # The full Python path to the application
    name = "core"
