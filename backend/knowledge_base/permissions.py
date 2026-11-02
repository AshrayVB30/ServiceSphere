"""
Custom Permissions for the 'knowledge_base' application.

Enforces Role-Based Access Control (RBAC):
- Category Management: Only Administrators can create, update, or deactivate categories.
- Article Creation/Management: Administrators and Support Agents can author and modify articles.
- Article Deletion: Hard deletion is disabled; articles are managed via archival.
- Article Visibility: Public published articles are open to all authenticated users.
  Internal articles are restricted strictly to staff (Admin, Support Agent, Approver).
- Ticket Linking: Only internal support staff can associate articles with tickets.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS
from accounts.models import User


def is_system_admin(user):
    """
    Checks if a user has platform administrator privileges.
    Returns True for Django superusers or staff users with role 'ADMIN'.
    """
    return bool(
        user
        and user.is_authenticated
        and (
            user.is_superuser
            or (user.is_staff and user.role == User.Role.ADMIN)
        )
    )


def is_support_agent(user):
    """Checks if a user is an active Support Agent."""
    return bool(
        user
        and user.is_authenticated
        and user.role == User.Role.SUPPORT_AGENT
    )


def is_internal_staff(user):
    """
    Checks if a user has internal staff access clearance.
    Grants access to Admins, Support Agents, and Approvers (excludes Clients).
    """
    return bool(
        user
        and user.is_authenticated
        and (
            is_system_admin(user)
            or user.role in (User.Role.SUPPORT_AGENT, User.Role.APPROVER)
        )
    )


class IsAdminOrReadOnly(BasePermission):
    """
    Permission class allowing read-only access for authenticated users,
    while restricting write actions (create, update, delete) to administrators.
    Used for Category management.
    """

    message = "Only system administrators are authorized to modify knowledge base categories."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        # Read permissions are allowed to any authenticated user
        if request.method in SAFE_METHODS:
            return True

        # Write permissions require administrator privileges
        return is_system_admin(request.user)


class CanManageArticle(BasePermission):
    """
    Object-level and view-level permission class governing Article operations:
    - View/Read: Authenticated users can view articles conforming to their visibility tier.
    - Create: Admins and Support Agents can author articles.
    - Update: Admins can edit any article; Support Agents can edit articles they authored.
    - Delete: Hard deletion is rejected (articles must be archived instead).
    """

    message = "You do not have permission to modify this knowledge base article."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        # Viewing / Listing is governed by querysets and object permissions
        if request.method in SAFE_METHODS:
            return True

        # Allow DELETE to reach view.destroy() which explicitly returns 405 Method Not Allowed
        if request.method == "DELETE":
            return True

        # Creating articles is restricted to Admins and Support Agents
        if request.method == "POST":
            return is_system_admin(user) or is_support_agent(user)

        # Updates (PUT/PATCH) are evaluated at the object level
        return is_system_admin(user) or is_support_agent(user)

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Allow DELETE to reach view.destroy() which returns 405 Method Not Allowed
        if request.method == "DELETE":
            return True

        # Read permission: check visibility against user role
        if request.method in SAFE_METHODS:
            # Internal articles cannot be viewed by clients
            if obj.is_internal and user.role == User.Role.CLIENT:
                return False
            # Draft or archived articles cannot be viewed by clients
            if not obj.is_published and user.role == User.Role.CLIENT:
                return False
            return True

        # Admins can edit any article
        if is_system_admin(user):
            return True

        # Support Agents can edit their own authored articles
        if is_support_agent(user):
            return obj.author_id == user.id

        return False


class CanPublishArticle(BasePermission):
    """
    Permission class governing workflow transitions:
    Publish, Unpublish, Archive, and Restore.
    Restricted to Administrators and Support Agents.
    """

    message = "Only authorized support staff or administrators can publish or archive articles."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (is_system_admin(user) or is_support_agent(user)))

    def has_object_permission(self, request, view, obj):
        user = request.user
        if is_system_admin(user):
            return True
        if is_support_agent(user):
            # Agents can manage publication lifecycle for their own articles
            return obj.author_id == user.id
        return False


class IsInternalStaff(BasePermission):
    """
    Permission granting access only to internal personnel (Admin, Agent, Approver).
    Used to protect Article Revision History and internal documentation.
    """

    message = "Access restricted to authorized internal staff members only."

    def has_permission(self, request, view):
        return is_internal_staff(request.user)

