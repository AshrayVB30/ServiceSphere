"""
Django Admin Configuration for the 'approvals' application.

Registers ApprovalRequest and ApprovalRecord models with the Django Admin site,
giving administrators full visibility into pending and completed approval workflows,
decision notes, and audit timelines.
"""

from django.contrib import admin
from .models import ApprovalRequest, ApprovalRecord


class ApprovalRecordInline(admin.TabularInline):
    """
    Inline table displaying decision records directly inside the ApprovalRequest admin page.
    Configured as read-only to preserve audit trail integrity.
    """

    model = ApprovalRecord
    extra = 0
    can_delete = False

    # Read-only fields to prevent manual editing of decision logs
    readonly_fields = (
        "action",
        "performed_by",
        "comment",
        "created_at",
    )

    def has_add_permission(self, request, obj=None):
        """Disables manually adding records inside the inline table."""
        return False


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    """
    Admin interface for managing Approval Requests.
    """

    # Summary table columns
    list_display = (
        "id",
        "ticket",
        "requested_by",
        "approver",
        "status",
        "created_at",
    )

    # Filter sidebar by status and date
    list_filter = (
        "status",
        "created_at",
    )

    # Search bar targets
    search_fields = (
        "ticket__subject",
        "requested_by__username",
        "approver__username",
        "reason",
    )

    # Automatic audit timestamps
    readonly_fields = (
        "created_at",
        "updated_at",
    )

    # Inline audit records
    inlines = [
        ApprovalRecordInline,
    ]

    # Pre-fetch foreign key relationships to prevent N+1 query overhead
    list_select_related = (
        "ticket",
        "requested_by",
        "approver",
    )


@admin.register(ApprovalRecord)
class ApprovalRecordAdmin(admin.ModelAdmin):
    """
    Admin interface for viewing standalone Approval Audit Records.
    Strictly read-only to prevent tampering with decision history.
    """

    list_display = (
        "approval_request",
        "action",
        "performed_by",
        "created_at",
    )

    list_filter = (
        "action",
        "created_at",
    )

    search_fields = (
        "approval_request__ticket__subject",
        "performed_by__username",
        "comment",
    )

    readonly_fields = (
        "approval_request",
        "action",
        "performed_by",
        "comment",
        "created_at",
    )

    def has_add_permission(self, request):
        """Prevent manually creating approval records through Django Admin."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent altering recorded approval decisions."""
        return False

