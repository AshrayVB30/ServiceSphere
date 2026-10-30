"""
Django Admin Configuration for the 'sla' application.

Registers:
1. SLAPolicyAdmin: Centralized management of priority-based response and resolution targets.
2. SLATrackingAdmin: Read-only ledger of ticket SLA progress, deadlines, and breach statuses.
3. SLAEscalationAdmin: Audit trail of automated escalation alerts and staff acknowledgements.
"""

from django.contrib import admin
from .models import SLAPolicy, SLATracking, SLAEscalation


@admin.register(SLAPolicy)
class SLAPolicyAdmin(admin.ModelAdmin):
    """
    Admin interface for configuring SLA Policies.
    """

    list_display = (
        "name",
        "priority",
        "response_time_hours",
        "resolution_time_hours",
        "is_active",
        "updated_at",
    )
    list_filter = (
        "is_active",
        "priority",
    )
    search_fields = (
        "name",
        "description",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )


@admin.register(SLATracking)
class SLATrackingAdmin(admin.ModelAdmin):
    """
    Admin interface for inspecting real-time ticket SLA tracking.
    Configured as read-only to preserve operational audit accuracy.
    """

    list_display = (
        "ticket",
        "policy",
        "response_deadline",
        "actual_response_at",
        "response_status",
        "resolution_deadline",
        "actual_resolution_at",
        "resolution_status",
    )
    list_filter = (
        "response_status",
        "resolution_status",
        "policy",
    )
    search_fields = (
        "ticket__subject",
        "ticket__ticket_number",
    )
    readonly_fields = (
        "ticket",
        "policy",
        "response_deadline",
        "actual_response_at",
        "resolution_deadline",
        "actual_resolution_at",
        "response_status",
        "resolution_status",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False


@admin.register(SLAEscalation)
class SLAEscalationAdmin(admin.ModelAdmin):
    """
    Admin interface for reviewing automated SLA Escalation records and alert logs.
    """

    list_display = (
        "ticket",
        "escalation_level",
        "event_type",
        "assigned_recipient",
        "notification_status",
        "is_acknowledged",
        "created_at",
    )
    list_filter = (
        "escalation_level",
        "event_type",
        "is_acknowledged",
        "notification_status",
    )
    search_fields = (
        "ticket__subject",
        "assigned_recipient__username",
        "reason",
        "notes",
    )
    readonly_fields = (
        "ticket",
        "sla_tracking",
        "escalation_level",
        "event_type",
        "reason",
        "assigned_recipient",
        "previous_assignee",
        "new_assignee",
        "notification_status",
        "acknowledged_by",
        "acknowledged_at",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

