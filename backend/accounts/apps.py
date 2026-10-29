"""
Configuration for the 'accounts' application.

The 'accounts' app handles custom user identity, roles, and authentication
for the ServiceSphere platform.
"""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    # Specifies the default primary key type for auto-generated model IDs
    default_auto_field = "django.db.models.BigAutoField"
    
    # Python path of this application
    name = "accounts"
