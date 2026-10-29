"""
Custom Permissions for the 'clients' application.

Enforces Role-Based Access Control (RBAC) to ensure multi-tenant security:
ordinary client users or support agents must NEVER have permission to list,
create, or alter other client organizations.
"""

from rest_framework.permissions import BasePermission


class IsSystemAdmin(BasePermission):
    """
    Custom permission class that restricts client management operations
    strictly to system administrators.
    """

    # Custom error message returned in the JSON payload when permission is denied (HTTP 403)
    message = "Only authorized system administrators can manage clients."

    def has_permission(self, request, view):
        """
        Determines whether the requesting user has permission to access the view.
        
        Returns True if:
        1. The user object exists and is authenticated (logged in).
        2. AND either:
           a) The user is a Django superuser (full system override).
           b) OR the user is a staff member whose ServiceSphere role is explicitly 'ADMIN'.
        """
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or (user.is_staff and user.role == "ADMIN")
            )
        )
