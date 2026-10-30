"""
Database Models for the 'sla' (Service Level Agreement) application.

Defines the core data structures for:
1. SLAPolicy: Configurable priority-based response and resolution targets (Low, Medium, High, Urgent).
2. SLATracking: Real-time deadline calculation, response tracking, and status state machine for individual tickets.
3. SLAEscalation: Multi-tier escalation records, breach history, automated alerts, and staff acknowledgements.
"""

from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from tickets.models import Ticket


class SLAPolicy(models.Model):
    """
    SLA Policy Model.

    Defines expected service targets for each ticket priority level.
    Only one active policy can exist per priority to prevent conflicting expectations.
    """

    # Human-readable policy name (e.g. 'Standard High Priority SLA')
    name = models.CharField(
        max_length=150,
        help_text="Name of this SLA policy.",
    )

    # Ticket priority tier to which this policy applies (LOW, MEDIUM, HIGH, URGENT)
    priority = models.CharField(
        max_length=10,
        choices=Ticket.Priority.choices,
        help_text="Applicable ticket priority level.",
    )

    # First response target duration in hours (e.g. 1.00 hour, 4.00 hours)
    response_time_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal("4.00"),
        help_text="Maximum allowed hours before a support agent must provide a first public response.",
    )

    # Full resolution target duration in hours (e.g. 8.00 hours, 24.00 hours)
    resolution_time_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal("24.00"),
        help_text="Maximum allowed hours before the ticket must be marked as RESOLVED or CLOSED.",
    )

    # Additional notes, scope details, or contract terms
    description = models.TextField(
        blank=True,
        help_text="Detailed description of the policy scope and terms.",
    )

    # Status flag indicating if the policy is currently in force
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this SLA policy is currently active.",
    )

    # Timestamp recorded when the policy was created
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the policy was created.",
    )

    # Timestamp recorded when the policy was last modified
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of the most recent modification.",
    )

    class Meta:
        ordering = ["priority", "name"]
        verbose_name = "SLA policy"
        verbose_name_plural = "SLA policies"
        # Database constraint preventing multiple active policies for the same priority
        constraints = [
            models.UniqueConstraint(
                fields=["priority"],
                condition=models.Q(is_active=True),
                name="unique_active_policy_per_priority",
            )
        ]

    def clean(self):
        """
        Validates logical constraints:
        - Response time must be greater than zero.
        - Resolution time must be greater than or equal to first response time.
        """
        if self.response_time_hours <= Decimal("0.00"):
            raise ValidationError({"response_time_hours": "First response time target must be greater than 0."})

        if self.resolution_time_hours < self.response_time_hours:
            raise ValidationError({
                "resolution_time_hours": "Resolution target cannot be shorter than the first response target."
            })

    def __str__(self):
        """String representation of the policy (e.g. 'High Priority SLA (Active)')."""
        status_label = "Active" if self.is_active else "Inactive"
        return f"{self.name} - {self.get_priority_display()} ({status_label})"


class SLATracking(models.Model):
    """
    SLA Tracking Model.

    Maintains one-to-one SLA progress for a specific ticket, storing exact deadlines,
    actual timestamps for responses/resolutions, and current SLA statuses.
    """

    class SLAStatus(models.TextChoices):
        # Operational SLA stages
        WITHIN_SLA = "WITHIN_SLA", "Within SLA"
        APPROACHING = "APPROACHING", "Approaching Deadline"
        BREACHED = "BREACHED", "Breached"
        COMPLETED = "COMPLETED", "Completed"

    # Link to the monitored ticket (OneToOne guarantees each ticket has exactly one tracking ledger)
    ticket = models.OneToOneField(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="sla_tracking",
        help_text="The ticket being tracked against this SLA.",
    )

    # The SLA policy applied to calculate these deadlines
    policy = models.ForeignKey(
        SLAPolicy,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trackings",
        help_text="The SLA policy used to calculate deadlines.",
    )

    # Calculated timestamp deadline by which a support agent must publicly respond
    response_deadline = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Deadline for first public agent response.",
    )

    # Actual timestamp when the first qualifying public agent response was submitted
    actual_response_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when first public response was recorded.",
    )

    # Calculated timestamp deadline by which the ticket must be resolved
    resolution_deadline = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Deadline for ticket resolution.",
    )

    # Actual timestamp when the ticket was marked as RESOLVED or CLOSED
    actual_resolution_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the ticket was resolved.",
    )

    # Current status of first response SLA (WITHIN_SLA, APPROACHING, BREACHED, COMPLETED)
    response_status = models.CharField(
        max_length=20,
        choices=SLAStatus.choices,
        default=SLAStatus.WITHIN_SLA,
        db_index=True,
        help_text="Current status of the first response SLA.",
    )

    # Current status of resolution SLA (WITHIN_SLA, APPROACHING, BREACHED, COMPLETED)
    resolution_status = models.CharField(
        max_length=20,
        choices=SLAStatus.choices,
        default=SLAStatus.WITHIN_SLA,
        db_index=True,
        help_text="Current status of the resolution SLA.",
    )

    # Audit timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "SLA tracking"
        verbose_name_plural = "SLA trackings"

    def __str__(self):
        return f"SLA for Ticket #{self.ticket_id} (Resp: {self.get_response_status_display()}, Res: {self.get_resolution_status_display()})"


class SLAEscalation(models.Model):
    """
    SLA Escalation Model.

    Records automated alerts and escalation events triggered when tickets
    approach or breach their first-response or resolution deadlines.
    """

    class EscalationLevel(models.IntegerChoices):
        # Multi-tier escalation hierarchy
        LEVEL_1 = 1, "Level 1 - Assigned Agent"
        LEVEL_2 = 2, "Level 2 - Support Manager"
        LEVEL_3 = 3, "Level 3 - System Administrator"

    class EventType(models.TextChoices):
        # Specific SLA trigger conditions
        RESPONSE_APPROACHING = "RESPONSE_APPROACHING", "Response Approaching Deadline"
        RESPONSE_BREACHED = "RESPONSE_BREACHED", "Response Breached"
        RESOLUTION_APPROACHING = "RESOLUTION_APPROACHING", "Resolution Approaching Deadline"
        RESOLUTION_BREACHED = "RESOLUTION_BREACHED", "Resolution Breached"

    class NotificationStatus(models.TextChoices):
        # Email / alert delivery statuses
        PENDING = "PENDING", "Pending"
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"

    # Reference to the escalated ticket
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="escalations",
        help_text="The ticket subject to escalation.",
    )

    # Reference to the ticket's SLA tracking ledger
    sla_tracking = models.ForeignKey(
        SLATracking,
        on_delete=models.CASCADE,
        related_name="escalations",
        help_text="The SLA tracking instance.",
    )

    # Escalation tier (Level 1, Level 2, Level 3)
    escalation_level = models.IntegerField(
        choices=EscalationLevel.choices,
        db_index=True,
        help_text="Escalation severity level.",
    )

    # Specific condition that triggered this escalation
    event_type = models.CharField(
        max_length=30,
        choices=EventType.choices,
        db_index=True,
        help_text="Type of SLA event that triggered escalation.",
    )

    # Human-readable justification explaining the escalation
    reason = models.TextField(
        help_text="Detailed reason for the escalation.",
    )

    # Staff member designated as the recipient of this escalation
    assigned_recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_escalations",
        help_text="Staff member notified for this escalation.",
    )

    # Prior assigned agent if reassigned as part of escalation
    previous_assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="escalated_from_tickets",
        help_text="Previous agent assigned to the ticket.",
    )

    # New agent if re-assigned as part of escalation
    new_assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="escalated_to_tickets",
        help_text="New agent assigned following escalation.",
    )

    # Delivery status of the alert notification
    notification_status = models.CharField(
        max_length=20,
        choices=NotificationStatus.choices,
        default=NotificationStatus.SENT,
        help_text="Email/alert delivery status.",
    )

    # Internal operational notes or follow-up instructions
    notes = models.TextField(
        blank=True,
        help_text="Internal notes regarding escalation resolution.",
    )

    # Acknowledgment flag indicating whether the notified party has reviewed the escalation
    is_acknowledged = models.BooleanField(
        default=False,
        help_text="Whether this escalation has been formally acknowledged by staff.",
    )

    # Staff member who acknowledged the escalation
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="acknowledged_escalations",
        help_text="User who acknowledged the escalation.",
    )

    # Timestamp when acknowledgment occurred
    acknowledged_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the escalation was acknowledged.",
    )

    # Timestamp when the escalation was generated
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when this escalation was generated.",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "SLA escalation"
        verbose_name_plural = "SLA escalations"
        # Unique constraint to prevent duplicate alerts for the same ticket, event, and level
        constraints = [
            models.UniqueConstraint(
                fields=["ticket", "event_type", "escalation_level"],
                name="unique_ticket_event_escalation_level",
            )
        ]

    def __str__(self):
        return f"Level {self.escalation_level} Escalation ({self.get_event_type_display()}) for Ticket #{self.ticket_id}"

