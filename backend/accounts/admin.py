"""
Django Admin Configuration for the 'accounts' app.

Customizes how the custom User model is displayed, filtered, searched,
and edited within the Django Admin web dashboard.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    Extends Django's built-in UserAdmin to support ServiceSphere's custom fields:
    'role', 'phone_number', and 'client'.
    """

    # Columns displayed in the user list table view in Django Admin
    list_display = (
        "username",      # Account username
        "email",         # Primary email address
        "role",          # Role (Administrator, Support Agent, Client, Approver)
        "is_staff",      # Whether user can log into the Django Admin site
        "is_active",     # Whether user account is active or deactivated
    )

    # Right-hand sidebar filters to quickly narrow down users
    list_filter = (
        "role",          # Filter users by role
        "is_staff",      # Filter by staff status
        "is_active",     # Filter active vs inactive accounts
    )

    # Fields searched when typing in the Admin search bar
    search_fields = (
        "username",
        "email",
        "first_name",
        "last_name",
    )

    # Form layout when EDITING an existing user in Django Admin.
    # We take Django's default UserAdmin fieldsets and append our custom section.
    fieldsets = UserAdmin.fieldsets + (
        (
            "ServiceSphere Information",
            {
                "fields": (
                    "role",          # Dropdown of Role choices
                    "phone_number",  # Contact number
                    "client",        # Foreign key dropdown to link to a Client organization
                )
            },
        ),
    )

    # Form layout when CREATING a new user via the Django Admin '+ Add User' button.
    # Includes email and custom fields in the initial creation screen.
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "ServiceSphere Information",
            {
                "fields": (
                    "email",
                    "role",
                    "phone_number",
                    "client",
                )
            },
        ),
    )
