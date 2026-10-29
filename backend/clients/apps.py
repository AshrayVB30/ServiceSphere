"""
Configuration for the 'clients' application.

The 'clients' app manages client companies (organizations), tenancy metadata,
and client-specific configurations within ServiceSphere.
"""

from django.apps import AppConfig


class ClientsConfig(AppConfig):
    # Default primary key field type for models in this app
    default_auto_field = "django.db.models.BigAutoField"
    
    # Python path of the application
    name = "clients"
