"""
Django Admin Configuration for the 'notifications' application.

Registers Notification and NotificationPreference models with read-only protections,
informative list views, search fields, and filters.
"""

from django.contrib import admin
from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Admin interface for inspecting dispatched notifications.
    Keeps historical notification records read-only to prevent tampering.
    """

    list_display = (
        "id",
        "title",
        "recipient",
        "notification_type",
        "is_read",
        "read_at",
        "created_at",
    )
    list_filter = (
        "notification_type",
        "is_read",
        "created_at",
    )
    search_fields = (
        "title",
        "message",
        "recipient__username",
        "recipient__email",
    )
    readonly_fields = (
        "recipient",
        "title",
        "message",
        "notification_type",
        "related_ticket",
        "related_approval",
        "is_read",
        "read_at",
        "created_at",
    )
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        """Disallow manual creation of notifications in Django admin."""
        return False


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    """
    Admin interface for managing user notification preferences.
    """

    list_display = (
        "user",
        "in_app_enabled",
        "email_enabled",
        "ticket_notifications",
        "approval_notifications",
        "sla_notifications",
        "updated_at",
    )
    list_filter = (
        "in_app_enabled",
        "email_enabled",
        "ticket_notifications",
        "approval_notifications",
        "sla_notifications",
    )
    search_fields = (
        "user__username",
        "user__email",
    )
    ordering = ("user__username",)

