"""
Django Admin Configuration for the 'clients' application.

Registers the Client model with the Django Admin site, enabling system
administrators to onboard, view, search, and activate/deactivate client organizations.
"""

from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """
    Admin interface options for managing Client organizations.
    """

    # Columns displayed in the client summary table
    list_display = (
        "name",           # Organization name
        "code",           # Slug code
        "contact_email",  # Contact email address
        "is_active",      # Active/Inactive boolean indicator
        "created_at",     # Onboarding date
    )

    # Filter sidebar options (enables filtering active vs inactive companies)
    list_filter = (
        "is_active",
    )

    # Search bar targets (allows searching by company name, slug code, or email)
    search_fields = (
        "name",
        "code",
        "contact_email",
    )

    # Prevent administrators from manually tampering with system audit timestamps
    readonly_fields = (
        "created_at",
        "updated_at",
    )
