"""
Database Models for the 'tickets' application.

This module defines the core Help Desk Ticket model for ServiceSphere.
Tickets capture issues reported by client organizations, assign them to
internal support agents, track priority and status changes, and record
full resolution lifecycle timestamps.
"""

import uuid
from django.conf import settings
from django.db import models


class Ticket(models.Model):
    """
    Help Desk Ticket Model.
    
    Represents a discrete support issue or service request filed by a client user.
    Tracks assignment, classification, urgency, and the complete resolution lifecycle.
    """

    class Priority(models.TextChoices):
        # Enumeration of ticket urgency levels.
        # Format: ATTRIBUTE_NAME = "DB_VALUE", "HUMAN_READABLE_LABEL"
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    class Status(models.TextChoices):
        # Enumeration of ticket lifecycle stages.
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        AWAITING_CUSTOMER = "AWAITING_CUSTOMER", "Awaiting Customer"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

    # Universally Unique Identifier (UUIDv4) providing an unguessable ticket number.
    # While the database maintains a numeric integer primary key ('id') internally,
    # 'ticket_number' is exposed externally in URLs and API responses for security.
    ticket_number = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        help_text="Globally unique public ticket identifier.",
    )

    # Link to the client company/organization that owns this ticket.
    # on_delete=models.PROTECT prevents deleting a client organization while it still has tickets.
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="tickets",
        help_text="The client organization that owns this support request.",
    )

    # The specific user who originally filed this support ticket.
    # on_delete=models.PROTECT prevents deleting a user who is the author of existing tickets.
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_tickets",
        help_text="The user who created and submitted this ticket.",
    )

    # The internal support agent assigned to investigate and resolve this ticket.
    # on_delete=models.SET_NULL ensures that if an agent leaves, the ticket remains intact
    # with assigned_to set to NULL until reassigned to another agent.
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
        help_text="The support agent currently assigned to resolve this ticket.",
    )

    # Brief, one-line summary of the issue
    subject = models.CharField(
        max_length=250,
        help_text="Brief summary or title of the support request.",
    )

    # Full details, error messages, and reproduction steps submitted by the user
    description = models.TextField(
        help_text="Detailed description of the issue or request.",
    )

    # Category classification (e.g., 'Billing', 'Bug', 'Feature Request', 'Network')
    category = models.CharField(
        max_length=100,
        help_text="Functional category or domain of the ticket.",
    )

    # Urgency level of the ticket, indexed for fast filtering in dashboards
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        db_index=True,
        help_text="Priority level (Low, Medium, High, Urgent).",
    )

    # Current lifecycle stage of the ticket, indexed for quick status queue queries
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
        help_text="Current lifecycle stage of the ticket.",
    )

    # Timestamp recorded when the ticket moves to the 'RESOLVED' status
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the ticket was marked as resolved.",
    )

    # Timestamp recorded automatically when the ticket is initially created
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the ticket was created.",
    )

    # Timestamp automatically updated whenever any ticket field is updated
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of the most recent modification.",
    )

    class Meta:
        # Default ordering: newest tickets first
        ordering = ["-created_at"]

        # Composite indexes optimize high-volume queries in support agent queues:
        # 1. Filtering by client and ticket status
        # 2. Filtering by status and priority (e.g. all OPEN tickets sorted by priority)
        indexes = [
            models.Index(fields=["client", "status"]),
            models.Index(fields=["status", "priority"]),
        ]

    def __str__(self):
        """
        Returns a concise human-readable summary of the ticket.
        Example output: '[OPEN] Low - Printer not working'
        """
        return f"[{self.get_status_display()}] {self.get_priority_display()} - {self.subject}"
