"""
Database Models for the 'approvals' application.

This module models ticket approval and authorization workflows:
1. ApprovalRequest: Tracks individual authorization requests submitted on tickets,
   identifying the requesting agent/admin, the assigned approver, the business rationale,
   and the current review status (Pending, Approved, Rejected, Information Requested).
2. ApprovalRecord: Stores an immutable chronological audit trail of all actions and decisions
   taken on an approval request, including decision comments and resubmissions.
"""

from django.conf import settings
from django.db import models


class ApprovalRequest(models.Model):
    """
    Approval Request Model.

    Represents a formal authorization request tied to a help desk ticket.
    Examples include requests for hardware purchases, permissions changes,
    or service tier upgrades requiring manager authorization.
    """

    class Status(models.TextChoices):
        # Enumeration of approval lifecycle statuses
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        INFO_REQUESTED = "INFO_REQUESTED", "Information Requested"

    # Reference to the support ticket that requires authorization.
    # on_delete=models.PROTECT prevents deleting tickets that have associated approval workflows.
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.PROTECT,
        related_name="approval_requests",
        help_text="The ticket requiring approval.",
    )

    # The user (support agent or administrator) who submitted this approval request.
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_approval_requests",
        help_text="The user who initiated the approval request.",
    )

    # The designated approver assigned to review and decide on this request.
    # Typically a user with the 'APPROVER' or 'ADMIN' role.
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_approval_requests",
        help_text="The user designated to approve or reject this request.",
    )

    # Business reason, justification, or explanation for why approval is required
    reason = models.TextField(
        help_text="Justification explaining why this approval is requested.",
    )

    # Current lifecycle state of the approval request
    # Indexed for rapid status filtering in approver task queues
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        help_text="Current state of the approval request.",
    )

    # Timestamp recorded automatically when the request is created
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the request was submitted.",
    )

    # Timestamp updated automatically whenever the request record changes
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of the most recent update.",
    )

    class Meta:
        # Default ordering: newest requests first
        ordering = ["-created_at"]
        verbose_name = "Approval request"
        verbose_name_plural = "Approval requests"

    def __str__(self):
        """
        Concise summary of the approval request.
        Example output: 'Approval #1 for Ticket #2 (Pending)'
        """
        return f"Approval #{self.id} for Ticket #{self.ticket_id} ({self.get_status_display()})"


class ApprovalRecord(models.Model):
    """
    Approval Record & Decision Audit Log Model.

    Stores an immutable log of every action performed on an ApprovalRequest,
    such as initial submission, approval, rejection, requests for information,
    and subsequent resubmissions.
    """

    class Action(models.TextChoices):
        # Enumeration of recorded workflow events
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        INFO_REQUESTED = "INFO_REQUESTED", "Information Requested"
        RESUBMITTED = "RESUBMITTED", "Resubmitted"

    # Link to the parent approval request
    approval_request = models.ForeignKey(
        ApprovalRequest,
        on_delete=models.PROTECT,
        related_name="records",
        help_text="The approval request associated with this record.",
    )

    # Action performed during this step
    action = models.CharField(
        max_length=20,
        choices=Action.choices,
        help_text="The action taken on the approval request.",
    )

    # User who performed the action (e.g. approver deciding, or agent resubmitting)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="approval_actions",
        help_text="The user who performed this action.",
    )

    # Comments, feedback, or explanation provided with the decision
    comment = models.TextField(
        blank=True,
        help_text="Decision notes, feedback, or justification.",
    )

    # Timestamp when this action was executed
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the record was created.",
    )

    class Meta:
        # Chronological ordering so the history reads forward in time
        ordering = ["created_at"]
        verbose_name = "Approval record"
        verbose_name_plural = "Approval records"

    def __str__(self):
        """
        Summary string for the decision record.
        Example output: 'Approval #1 - Approved by manager_steve'
        """
        return f"{self.approval_request} - {self.get_action_display()} by {self.performed_by.username}"

