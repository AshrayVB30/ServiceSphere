"""
Custom Permissions for the 'sla' application.

Enforces:
1. IsSystemAdmin: Only administrators can create, modify, activate, or deactivate SLA policies.
2. CanViewTicketSLA: Users can only inspect SLA tracking data for tickets they are authorized to view.
"""

from rest_framework.permissions import BasePermission
from accounts.models import User


class IsSystemAdmin(BasePermission):
    """
    Grants access only to platform administrators (superusers or staff with role 'ADMIN').
    Used to protect SLA policy management and global escalation monitoring.
    """

    message = "Only system administrators are authorized to perform this operation."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or (user.is_staff and user.role == User.Role.ADMIN)
            )
        )


class CanViewTicketSLA(BasePermission):
    """
    Object-level permission granting access to SLA tracking data:
    - Admins: Access any ticket's SLA data.
    - Support Agents: Only access SLA data for tickets assigned to them.
    - Clients and Approvers: Only access SLA data for tickets belonging to their active company.
    """

    message = "You do not have permission to view SLA details for this ticket."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.is_superuser or (user.is_staff and user.role == User.Role.ADMIN):
            return True

        ticket = getattr(obj, "ticket", obj)

        if user.role == User.Role.SUPPORT_AGENT:
            return ticket.assigned_to_id == user.id

        if user.role in (User.Role.CLIENT, User.Role.APPROVER):
            return bool(
                user.client_id is not None
                and user.client_id == ticket.client_id
                and user.client.is_active
            )

        return False

