"""
REST API Serializers for the 'approvals' application.

This module handles serialization and deserialization for:
1. ApprovalRecordSerializer: Exposes chronological decision audit entries (action, performer, notes, timestamp).
2. ApprovalRequestSerializer: Exposes approval requests with nested decision records and related ticket details.
   Validates approver eligibility and sets security-critical fields server-side.
"""

from rest_framework import serializers
from accounts.models import User
from tickets.models import Ticket
from .models import ApprovalRequest, ApprovalRecord


class ApprovalRecordSerializer(serializers.ModelSerializer):
    """
    Serializer for individual ApprovalRecord decision entries.
    Exposes immutable audit trail information.
    """

    # Username of the user who performed the decision or resubmission
    performed_by_username = serializers.CharField(
        source="performed_by.username",
        read_only=True,
        help_text="Username of the user who took this action.",
    )

    # Human-readable display of the action choice (e.g. 'Approved', 'Information Requested')
    action_display = serializers.CharField(
        source="get_action_display",
        read_only=True,
        help_text="Human-readable label of the action taken.",
    )

    class Meta:
        model = ApprovalRecord
        fields = [
            "id",
            "action",
            "action_display",
            "performed_by",
            "performed_by_username",
            "comment",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "action",
            "action_display",
            "performed_by",
            "performed_by_username",
            "comment",
            "created_at",
        ]


class ApprovalRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for creating, viewing, and listing Approval Requests.
    """

    # Subject line of the associated ticket
    ticket_subject = serializers.CharField(
        source="ticket.subject",
        read_only=True,
        help_text="Subject title of the linked support ticket.",
    )

    # Username of the user who initiated this approval request
    requested_by_username = serializers.CharField(
        source="requested_by.username",
        read_only=True,
        help_text="Username of the user who initiated the request.",
    )

    # Username of the designated approver
    approver_username = serializers.CharField(
        source="approver.username",
        read_only=True,
        help_text="Username of the designated approver.",
    )

    # Human-readable status label (e.g. 'Pending', 'Approved', 'Rejected')
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
        help_text="Human-readable display of the current approval status.",
    )

    # Nested chronological list of decision records
    records = ApprovalRecordSerializer(
        many=True,
        read_only=True,
        help_text="Chronological list of all decisions and actions taken on this request.",
    )

    class Meta:
        model = ApprovalRequest
        fields = [
            "id",
            "ticket",
            "ticket_subject",
            "requested_by",
            "requested_by_username",
            "approver",
            "approver_username",
            "reason",
            "status",
            "status_display",
            "records",
            "created_at",
            "updated_at",
        ]

        # Security-critical read-only fields:
        # Client payloads cannot forge the request author, status, or timestamps.
        read_only_fields = [
            "id",
            "ticket_subject",
            "requested_by",
            "requested_by_username",
            "approver_username",
            "status",
            "status_display",
            "records",
            "created_at",
            "updated_at",
        ]

    def validate_approver(self, approver):
        """
        Validates that the selected approver has an appropriate role (APPROVER or ADMIN)
        and is an active account.
        """
        if not approver.is_active:
            raise serializers.ValidationError("The selected approver account is inactive.")

        # Check that the approver possesses an authorization role
        if approver.role not in (User.Role.APPROVER, User.Role.ADMIN) and not approver.is_superuser:
            raise serializers.ValidationError(
                f"User '{approver.username}' does not have an APPROVER or ADMIN role."
            )

        return approver

