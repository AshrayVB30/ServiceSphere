"""
Django Admin Configuration for the 'tickets' application.

Registers the Ticket model in the Django Admin interface, providing
support agents and administrators with a centralized dashboard to inspect,
assign, filter, search, and update help desk tickets.
"""

from django.contrib import admin
from .models import Ticket


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
