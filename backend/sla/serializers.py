"""
REST API Serializers for the 'sla' application.

Provides serializers for:
1. SLAPolicySerializer: CRUD operations and conflict validation for SLA policies.
2. SLATrackingSerializer: Read-only representation of ticket SLA metrics, deadlines, and statuses.
3. SLAEscalationSerializer: Serializer for escalation incidents, audit logs, and acknowledgement workflows.
4. SLAMonitoringSummarySerializer: Aggregate metrics serializer for the SLA dashboard summary.
"""

from rest_framework import serializers
from .models import SLAPolicy, SLATracking, SLAEscalation


class SLAPolicySerializer(serializers.ModelSerializer):
    """
    Serializer for managing SLA Policies.
    Validates logical targets and prevents conflicting active policies for the same priority.
    """

    priority_display = serializers.CharField(
        source="get_priority_display",
        read_only=True,
        help_text="Human-readable priority level label.",
    )

    class Meta:
        model = SLAPolicy
        fields = [
            "id",
            "name",
            "priority",
            "priority_display",
            "response_time_hours",
            "resolution_time_hours",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "priority_display",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        """
        Validates that:
        1. Response time target is greater than 0.
        2. Resolution time target is greater than or equal to response time target.
        3. If setting is_active=True, no other active policy exists for this priority.
        """
        instance = getattr(self, "instance", None)

        response_hours = attrs.get(
            "response_time_hours",
            instance.response_time_hours if instance else None,
        )
        resolution_hours = attrs.get(
            "resolution_time_hours",
            instance.resolution_time_hours if instance else None,
        )

        if response_hours and response_hours <= 0:
            raise serializers.ValidationError({
                "response_time_hours": "First response target must be greater than 0 hours."
            })

        if response_hours and resolution_hours and resolution_hours < response_hours:
            raise serializers.ValidationError({
                "resolution_time_hours": "Resolution target cannot be shorter than the first response target."
            })

        # Check for conflicting active policies
        is_active = attrs.get("is_active", instance.is_active if instance else True)
        priority = attrs.get("priority", instance.priority if instance else None)

        if is_active and priority:
            conflict_query = SLAPolicy.objects.filter(priority=priority, is_active=True)
            if instance:
                conflict_query = conflict_query.exclude(pk=instance.pk)

            if conflict_query.exists():
                raise serializers.ValidationError({
                    "priority": f"An active SLA policy ('{conflict_query.first().name}') already exists for priority '{priority}'. Deactivate it before activating this policy."
                })

        return attrs


class SLATrackingSerializer(serializers.ModelSerializer):
    """
    Read-only serializer exposing comprehensive SLA metrics for a ticket.
    Clients and users cannot manipulate SLA deadlines or statuses directly.
    """

    policy_name = serializers.CharField(
        source="policy.name",
        read_only=True,
        default=None,
        help_text="Name of the applied SLA policy.",
    )

    ticket_number = serializers.UUIDField(
        source="ticket.ticket_number",
        read_only=True,
        help_text="Public UUID of the monitored ticket.",
    )

    ticket_subject = serializers.CharField(
        source="ticket.subject",
        read_only=True,
        help_text="Subject title of the monitored ticket.",
    )

    ticket_priority = serializers.CharField(
        source="ticket.priority",
        read_only=True,
        help_text="Priority level of the monitored ticket.",
    )

    response_status_display = serializers.CharField(
        source="get_response_status_display",
        read_only=True,
        help_text="Human-readable response SLA status.",
    )

    resolution_status_display = serializers.CharField(
        source="get_resolution_status_display",
        read_only=True,
        help_text="Human-readable resolution SLA status.",
    )

    class Meta:
        model = SLATracking
        fields = [
            "id",
            "ticket",
            "ticket_number",
            "ticket_subject",
            "ticket_priority",
            "policy",
            "policy_name",
            "response_deadline",
            "actual_response_at",
            "resolution_deadline",
            "actual_resolution_at",
            "response_status",
            "response_status_display",
            "resolution_status",
            "resolution_status_display",
            "created_at",
            "updated_at",
        ]
        # All SLA tracking fields are generated and updated by the server
        read_only_fields = fields


class SLAEscalationSerializer(serializers.ModelSerializer):
    """
    Serializer for viewing and acknowledging SLA Escalation events.
    """

    ticket_subject = serializers.CharField(
        source="ticket.subject",
        read_only=True,
        help_text="Subject of the escalated ticket.",
    )

    escalation_level_display = serializers.CharField(
        source="get_escalation_level_display",
        read_only=True,
        help_text="Severity tier of the escalation.",
    )

    event_type_display = serializers.CharField(
        source="get_event_type_display",
        read_only=True,
        help_text="Trigger condition display.",
    )

    assigned_recipient_username = serializers.CharField(
        source="assigned_recipient.username",
        read_only=True,
        help_text="Username of the notified staff member.",
    )

    acknowledged_by_username = serializers.CharField(
        source="acknowledged_by.username",
        read_only=True,
        default=None,
        help_text="Username of staff who acknowledged the escalation.",
    )

    class Meta:
        model = SLAEscalation
        fields = [
            "id",
            "ticket",
            "ticket_subject",
            "sla_tracking",
            "escalation_level",
            "escalation_level_display",
            "event_type",
            "event_type_display",
            "reason",
            "assigned_recipient",
            "assigned_recipient_username",
            "previous_assignee",
            "new_assignee",
            "notification_status",
            "notes",
            "is_acknowledged",
            "acknowledged_by",
            "acknowledged_by_username",
            "acknowledged_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "ticket",
            "ticket_subject",
            "sla_tracking",
            "escalation_level",
            "escalation_level_display",
            "event_type",
            "event_type_display",
            "assigned_recipient",
            "assigned_recipient_username",
            "previous_assignee",
            "new_assignee",
            "notification_status",
            "is_acknowledged",
            "acknowledged_by",
            "acknowledged_by_username",
            "acknowledged_at",
            "created_at",
        ]

