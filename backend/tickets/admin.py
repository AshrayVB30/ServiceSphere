"""
Django Admin Configuration for the 'tickets' application.

Registers the Ticket and TicketHistory models in the Django Admin interface:
- TicketAdmin: Central dashboard to inspect, filter, search, and update help desk tickets.
- TicketHistoryAdmin: Immutable, read-only audit log viewer tracking who changed what and when.
"""

from django.contrib import admin
from .models import Ticket, TicketHistory, TicketComment


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    """
    Admin interface options for managing Help Desk Tickets.
    """

    # Columns displayed in the main tickets table view
    list_display = (
        "ticket_number",  # Unique ticket UUID
        "subject",        # Ticket summary title
        "client",         # Client organization
        "created_by",     # Submitting user
        "assigned_to",    # Assigned support agent
        "priority",       # Priority level (Low, Medium, High, Urgent)
        "status",         # Current status (Open, In Progress, Resolved, etc.)
        "created_at",     # Creation timestamp
    )

    # Right-sidebar filters to allow narrowing tickets by status, priority, or category
    list_filter = (
        "status",
        "priority",
        "category",
    )

    # Search bar enabled across subject, detailed description, ticket UUID, and client company name
    search_fields = (
        "subject",
        "description",
        "ticket_number",
        "client__name",
    )

    # Fields that cannot be manually edited in the form to ensure data integrity
    readonly_fields = (
        "ticket_number",
        "created_at",
        "updated_at",
    )

    # Performance optimization: pre-fetch foreign key relationships using SQL JOINs
    # This prevents the 'N+1 queries' problem when listing hundreds of tickets.
    list_select_related = (
        "client",
        "created_by",
        "assigned_to",
    )

    def save_model(self, request, obj, form, change):
        """
        Overrides the admin save action to automatically record TicketHistory entries
        whenever a ticket is created, assigned, or has its status changed in Django Admin.
        """
        if change:
            # Ticket is being updated: retrieve original record to detect what changed
            original = Ticket.objects.get(pk=obj.pk)
            super().save_model(request, obj, form, change)

            # Record history if the assigned agent changed
            if original.assigned_to != obj.assigned_to:
                TicketHistory.objects.create(
                    ticket=obj,
                    action=TicketHistory.Action.ASSIGNED,
                    performed_by=request.user,
                    previous_assignee=original.assigned_to,
                    new_assignee=obj.assigned_to,
                    note="Assigned via Django Admin",
                )

            # Record history if the lifecycle status changed
            if original.status != obj.status:
                TicketHistory.objects.create(
                    ticket=obj,
                    action=TicketHistory.Action.STATUS_CHANGED,
                    performed_by=request.user,
                    previous_status=original.status,
                    new_status=obj.status,
                    note="Status updated via Django Admin",
                )
        else:
            # Brand new ticket created directly through Django Admin
            super().save_model(request, obj, form, change)
            TicketHistory.objects.create(
                ticket=obj,
                action=TicketHistory.Action.CREATED,
                performed_by=request.user,
                new_status=obj.status,
                note="Created via Django Admin",
            )


@admin.register(TicketHistory)
class TicketHistoryAdmin(admin.ModelAdmin):
    """
    Admin interface for viewing Ticket Audit History.
    This interface is strictly read-only to prevent tampering with historical records.
    """

    # Columns displayed in the history logs table
    list_display = (
        "ticket",           # Related ticket
        "action",           # Event type (CREATED, ASSIGNED, STATUS_CHANGED)
        "performed_by",     # User who triggered the event
        "previous_status",  # Old status (if applicable)
        "new_status",       # New status (if applicable)
        "created_at",       # Event timestamp
    )

    # Sidebar filter by action type or date
    list_filter = (
        "action",
        "created_at",
    )

    # Search by ticket subject, acting username, or audit note
    search_fields = (
        "ticket__subject",
        "performed_by__username",
        "note",
    )

    # All fields are read-only: audit logs must never be edited through Django Admin
    readonly_fields = (
        "ticket",
        "action",
        "performed_by",
        "previous_status",
        "new_status",
        "previous_assignee",
        "new_assignee",
        "note",
        "created_at",
    )

    def has_add_permission(self, request):
        """
        Disables the '+ Add Ticket history' button.
        Audit records must strictly be created by system workflows, never manually created by staff.
        """
        return False



@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    """
    Admin interface for inspecting Ticket Conversation Comments and Internal Notes.
    Comments are read-only in the admin to preserve the integrity of communication records.
    """

    # Columns displayed in the comments table view
    list_display = (
        "ticket",        # Related ticket
        "author",        # Author user
        "is_internal",   # Private internal note flag
        "created_at",    # Timestamp
    )

    # Sidebar filters to separate internal notes from public comments
    list_filter = (
        "is_internal",
        "created_at",
    )

    # Search bar across ticket subject, author username, and comment message body
    search_fields = (
        "ticket__subject",
        "author__username",
        "message",
    )

    # Prevent editing existing comments in the admin interface to protect communication history
    readonly_fields = (
        "ticket",
        "author",
        "message",
        "is_internal",
        "created_at",
    )

    def has_add_permission(self, request):
        """
        Disables the '+ Add Ticket comment' button in Django Admin.
        Comments must be posted through the official ticket conversation API.
        """
        return False

    def has_change_permission(self, request, obj=None):
        """
        Disables editing existing comments to keep message history immutable.
        """
        return False
