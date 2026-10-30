"""
Database Models for the 'notifications' application.

Defines:
1. Notification: Immutable in-app and email event records dispatched to users.
2. NotificationPreference: Per-user notification settings controlling in-app and email delivery.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone


class Notification(models.Model):
    """
    Represents an alert or notification dispatched to an individual user.
    
    Supports notifications linked to:
    - Tickets (creation, assignment, status changes, comments)
    - Approvals (submission, decisions, requests for info)
    - SLA Policies (approaching warnings, breaches, escalations)
    - System Alerts
    """

    class NotificationType(models.TextChoices):
        """Categorization of notification events across ServiceSphere modules."""
        TICKET = "TICKET", "Ticket"
        APPROVAL = "APPROVAL", "Approval"
        SLA = "SLA", "SLA"
        SYSTEM = "SYSTEM", "System"

    # User receiving this notification
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="User who received this notification.",
    )

    # Concise title displayed in toast notifications, push headers, or dropdowns
    title = models.CharField(
        max_length=255,
        help_text="Short summary header for the notification.",
    )

    # Full narrative message explaining the event details
    message = models.TextField(
        help_text="Detailed notification content.",
    )

    # Type of event for filtering in user interfaces
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        db_index=True,
        help_text="Category of the notification event.",
    )

    # Optional foreign key to related Ticket
    related_ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
        help_text="Ticket associated with this notification (if applicable).",
    )

    # Optional foreign key to related ApprovalRequest
    related_approval = models.ForeignKey(
        "approvals.ApprovalRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
        help_text="Approval request associated with this notification (if applicable).",
    )

    # Read state tracking
    is_read = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Indicates whether the user has read or acknowledged this notification.",
    )

    # Timestamp when the notification was marked as read
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the user marked this notification as read.",
    )

    # Timestamp when the notification was generated
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when the notification record was created.",
    )

    class Meta:
        # Default ordering: most recent notifications first
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        # Composite database indexes to accelerate unread lookups and user notification feeds
        indexes = [
            models.Index(fields=["recipient", "is_read"], name="notif_recip_unread_idx"),
            models.Index(fields=["recipient", "-created_at"], name="notif_recip_created_idx"),
            models.Index(fields=["notification_type"], name="notif_type_idx"),
        ]

    def __str__(self):
        """String representation of a notification."""
        status_label = "Read" if self.is_read else "Unread"
        return f"[{self.notification_type}] {self.title} -> {self.recipient.username} ({status_label})"

    def mark_as_read(self):
        """Marks the notification as read and records the current timestamp."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])


class NotificationPreference(models.Model):
    """
    Per-user notification preferences.

    Controls:
    - Delivery channel: in-app vs. email.
    - Category subscriptions: ticket, approval, SLA.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
        help_text="User owning these notification preferences.",
    )

    # Delivery Channel Toggles
    in_app_enabled = models.BooleanField(
        default=True,
        help_text="Whether in-app alerts and notifications are generated.",
    )

    email_enabled = models.BooleanField(
        default=False,
        help_text="Whether email alerts are dispatched (disabled by default).",
    )

    # Category Toggles
    ticket_notifications = models.BooleanField(
        default=True,
        help_text="Whether to receive notifications regarding ticket updates, assignments, and comments.",
    )

    approval_notifications = models.BooleanField(
        default=True,
        help_text="Whether to receive notifications regarding approval requests and decisions.",
    )

    sla_notifications = models.BooleanField(
        default=True,
        help_text="Whether to receive notifications regarding SLA warnings, breaches, and escalations.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when preferences were initialized.",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when preferences were last modified.",
    )

    class Meta:
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"

    def __str__(self):
        """String representation of user notification preferences."""
        return f"Preferences for {self.user.username} (Email: {self.email_enabled}, InApp: {self.in_app_enabled})"

