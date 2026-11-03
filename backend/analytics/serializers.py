"""
Django REST Framework Serializers for the 'analytics' application.

Handles serialization, deserialization, and business validation for:
1. Key Result Areas (KRAs)
2. Key Performance Indicators (KPIs)
3. Agent KRA and KPI Assignments
4. Historical Performance Evaluation Records
5. Operational Evaluation Requests
"""

# Import Decimal for accurate metric validation
from decimal import Decimal
# Import serializers module from Django REST Framework
from rest_framework import serializers

# Import User model to validate agent assignment roles
from accounts.models import User
# Import analytics models
from .models import (
    KRA,
    KPI,
    KRAAssignment,
    KPIAssignment,
    KPIPerformanceRecord,
)
# Import calculation engine
from .services import calculate_kpi_achievement


class KRASerializer(serializers.ModelSerializer):
    """
    Serializer for Key Result Areas (KRAs).
    Includes computed count of associated KPIs.
    """
    # Count of active KPIs grouped under this KRA
    kpis_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = KRA
        fields = [
            "id",
            "name",
            "code",
            "description",
            "measurable_objective",
            "weightage",
            "is_active",
            "kpis_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "code", "kpis_count", "created_at", "updated_at"]

    def get_kpis_count(self, obj):
        """Returns the number of child KPIs defined under this KRA."""
        return obj.kpis.filter(is_active=True).count()

    def validate_weightage(self, value):
        """Validates that weightage is a realistic percentage between 1 and 100."""
        if value < 1 or value > 100:
            raise serializers.ValidationError("KRA weightage must be between 1% and 100%.")
        return value


class KPISerializer(serializers.ModelSerializer):
    """
    Serializer for Key Performance Indicators (KPIs).
    Exposes parent KRA name and readable metric choices.
    """
    # Expose human-readable title of the parent KRA
    kra_name = serializers.CharField(source="kra.name", read_only=True)
    # Display labels for choice fields
    metric_type_display = serializers.CharField(source="get_metric_type_display", read_only=True)
    target_direction_display = serializers.CharField(source="get_target_direction_display", read_only=True)
    evaluation_period_display = serializers.CharField(source="get_evaluation_period_display", read_only=True)

    class Meta:
        model = KPI
        fields = [
            "id",
            "kra",
            "kra_name",
            "name",
            "code",
            "description",
            "metric_type",
            "metric_type_display",
            "target_direction",
            "target_direction_display",
            "default_target_value",
            "evaluation_period",
            "evaluation_period_display",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "code",
            "kra_name",
            "metric_type_display",
            "target_direction_display",
            "evaluation_period_display",
            "created_at",
            "updated_at",
        ]

    def validate_default_target_value(self, value):
        """Ensures default target value is not negative."""
        if value < Decimal("0.00"):
            raise serializers.ValidationError("Target value cannot be negative.")
        return value


class KRAAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for assigning KRAs to Support Agents.
    Enforces that only users with the SUPPORT_AGENT role can be assigned.
    """
    kra_name = serializers.CharField(source="kra.name", read_only=True)
    agent_username = serializers.CharField(source="agent.username", read_only=True)
    agent_email = serializers.CharField(source="agent.email", read_only=True)
    assigned_by_username = serializers.CharField(source="assigned_by.username", read_only=True)

    class Meta:
        model = KRAAssignment
        fields = [
            "id",
            "kra",
            "kra_name",
            "agent",
            "agent_username",
            "agent_email",
            "assigned_by",
            "assigned_by_username",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "kra_name",
            "agent_username",
            "agent_email",
            "assigned_by",
            "assigned_by_username",
            "created_at",
            "updated_at",
        ]

    def validate_agent(self, value):
        """Ensures the assigned user is a Support Agent."""
        if value.role != User.Role.SUPPORT_AGENT:
            raise serializers.ValidationError("KRAs can only be assigned to users with the SUPPORT_AGENT role.")
        return value


class KPIAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for assigning KPIs to Support Agents with optional target customization.
    """
    kpi_name = serializers.CharField(source="kpi.name", read_only=True)
    kpi_code = serializers.CharField(source="kpi.code", read_only=True)
    kra_name = serializers.CharField(source="kpi.kra.name", read_only=True)
    agent_username = serializers.CharField(source="agent.username", read_only=True)
    agent_email = serializers.CharField(source="agent.email", read_only=True)
    assigned_by_username = serializers.CharField(source="assigned_by.username", read_only=True)
    effective_target = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = KPIAssignment
        fields = [
            "id",
            "kpi",
            "kpi_name",
            "kpi_code",
            "kra_name",
            "agent",
            "agent_username",
            "agent_email",
            "custom_target_value",
            "effective_target",
            "assigned_by",
            "assigned_by_username",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "kpi_name",
            "kpi_code",
            "kra_name",
            "agent_username",
            "agent_email",
            "effective_target",
            "assigned_by",
            "assigned_by_username",
            "created_at",
            "updated_at",
        ]

    def validate_agent(self, value):
        """Ensures the assigned user is a Support Agent."""
        if value.role != User.Role.SUPPORT_AGENT:
            raise serializers.ValidationError("KPIs can only be assigned to users with the SUPPORT_AGENT role.")
        return value

    def validate_custom_target_value(self, value):
        """Ensures customized target is not negative."""
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("Custom target value cannot be negative.")
        return value


class KPIPerformanceRecordSerializer(serializers.ModelSerializer):
    """
    Serializer for historical KPI performance evaluation entries.
    Computes achievement percentage on creation/update.
    """
    agent_username = serializers.CharField(source="assignment.agent.username", read_only=True)
    kpi_name = serializers.CharField(source="assignment.kpi.name", read_only=True)
    evaluated_by_username = serializers.CharField(source="evaluated_by.username", read_only=True)

    class Meta:
        model = KPIPerformanceRecord
        fields = [
            "id",
            "assignment",
            "agent_username",
            "kpi_name",
            "period_start",
            "period_end",
            "target_value",
            "actual_value",
            "achievement_percentage",
            "notes",
            "evaluated_by",
            "evaluated_by_username",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "agent_username",
            "kpi_name",
            "achievement_percentage",
            "evaluated_by",
            "evaluated_by_username",
            "created_at",
        ]

    def validate(self, attrs):
        """Validates evaluation date range and calculates achievement percentage."""
        start = attrs.get("period_start")
        end = attrs.get("period_end")
        if start and end and start > end:
            raise serializers.ValidationError({"period_end": "Evaluation period end date cannot be earlier than start date."})

        # Calculate achievement percentage based on KPI target direction
        assignment = attrs.get("assignment") or getattr(self.instance, "assignment", None)
        target = attrs.get("target_value") or getattr(self.instance, "target_value", Decimal("0.00"))
        actual = attrs.get("actual_value") or getattr(self.instance, "actual_value", Decimal("0.00"))

        if assignment and assignment.kpi:
            attrs["achievement_percentage"] = calculate_kpi_achievement(
                target_value=target,
                actual_value=actual,
                target_direction=assignment.kpi.target_direction,
            )

        return attrs


class KPIEvaluationRequestSerializer(serializers.Serializer):
    """
    Validates payload for initiating automated KPI evaluation.
    """
    agent_id = serializers.IntegerField(
        required=True,
        help_text="ID of the support agent being evaluated.",
    )
    period_start = serializers.DateField(
        required=True,
        help_text="Start date of review window (YYYY-MM-DD).",
    )
    period_end = serializers.DateField(
        required=True,
        help_text="End date of review window (YYYY-MM-DD).",
    )
    save_records = serializers.BooleanField(
        required=False,
        default=True,
        help_text="Whether to persist generated evaluations as KPIPerformanceRecord entries.",
    )

    def validate(self, attrs):
        """Validate agent exists and date order."""
        if attrs["period_start"] > attrs["period_end"]:
            raise serializers.ValidationError({"period_end": "period_end cannot precede period_start."})

        try:
            attrs["agent"] = User.objects.get(id=attrs["agent_id"], role=User.Role.SUPPORT_AGENT)
        except User.DoesNotExist:
            raise serializers.ValidationError({"agent_id": "Valid support agent with specified ID was not found."})

        return attrs

