"""
DRF Serializers for the 'notifications' application.

Exposes:
1. NotificationSerializer: Detailed notification representations for React UI (dropdowns, feeds, toasts).
2. NotificationPreferenceSerializer: Granular per-user delivery settings (channels & categories).
"""

from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Notification model.
    Enriches the notification payload with related entity metadata for seamless React integration.
    """

    # Human-readable label for the notification type
    notification_type_display = serializers.CharField(
        source="get_notification_type_display",
        read_only=True,
    )

    # Contextual metadata from related ticket (if present)
    ticket_subject = serializers.CharField(
        source="related_ticket.subject",
        read_only=True,
        default=None,
    )
    ticket_status = serializers.CharField(
        source="related_ticket.status",
        read_only=True,
        default=None,
    )

    # Contextual metadata from related approval request (if present)
    approval_status = serializers.CharField(
        source="related_approval.status",
        read_only=True,
        default=None,
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "notification_type_display",
            "related_ticket",
            "ticket_subject",
            "ticket_status",
            "related_approval",
            "approval_status",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "notification_type_display",
            "related_ticket",
            "ticket_subject",
            "ticket_status",
            "related_approval",
            "approval_status",
            "read_at",
            "created_at",
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for the NotificationPreference model.
    Allows authenticated users to toggle in-app and email delivery options.
    """

    user_username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = NotificationPreference
        fields = [
            "id",
            "user_username",
            "in_app_enabled",
            "email_enabled",
            "ticket_notifications",
            "approval_notifications",
            "sla_notifications",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_username",
            "created_at",
            "updated_at",
        ]

