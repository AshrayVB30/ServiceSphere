"""
Configuration for the 'approvals' application.

The 'approvals' app manages ticket authorization workflows, approver assignments,
decision recording (Approve, Reject, Request Information), and audit trails.
"""

from django.apps import AppConfig


class ApprovalsConfig(AppConfig):
    # Default primary key field type for auto-generated model IDs
    default_auto_field = "django.db.models.BigAutoField"

    # Full Python module path for this application
    name = "approvals"

