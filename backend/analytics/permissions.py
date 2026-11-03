"""
Custom Permission Classes for the 'analytics' application.

Enforces strict role-based access control (RBAC) across analytics dashboards,
agent performance tracking, SLA metrics, KPI/KRA management, and data exports.
"""

# Import permissions primitives from Django REST Framework
from rest_framework import permissions
# Import the custom User model to reference Role choices
from accounts.models import User


class IsAnalyticsAdmin(permissions.BasePermission):
    """
    Permission check: Grants access exclusively to System Administrators.
    Used for global administrative actions such as configuring KRAs, defining KPIs,
    and modifying agent targets.
    """

    def has_permission(self, request, view):
        # User must be logged in and possess the ADMIN role or superuser status
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == User.Role.ADMIN or request.user.is_superuser)
        )


class IsInternalStaffUser(permissions.BasePermission):
    """
    Permission check: Grants access to internal operations staff (Admins and Support Agents).
    Completely denies access to external client accounts and non-staff approvers.
    """

    def has_permission(self, request, view):
        # Verify user is authenticated
        if not (request.user and request.user.is_authenticated):
            return False
        # Only ADMIN and SUPPORT_AGENT qualify as internal staff
        return request.user.role in [User.Role.ADMIN, User.Role.SUPPORT_AGENT] or request.user.is_superuser


class CanViewAgentAnalytics(permissions.BasePermission):
    """
    Permission check for Agent Performance Analytics:
    - Admins can view any agent's performance and the collective leaderboard.
    - Support Agents can only inspect their own personal scorecard.
    - Clients and Approvers receive 403 Forbidden.
    """

    def has_permission(self, request, view):
        # Must be authenticated internal staff
        if not (request.user and request.user.is_authenticated):
            return False
        # Clients and Approvers are explicitly barred from viewing internal performance
        if request.user.role not in [User.Role.ADMIN, User.Role.SUPPORT_AGENT] and not request.user.is_superuser:
            return False
        # If requesting the collective agent leaderboard, only Admins are authorized
        # (Agents can only view their own detail scorecard)
        # Safely extract lookup keyword arguments (APIView instances do not declare lookup_url_kwarg)
        lookup_url_kwarg = (
            getattr(view, "lookup_url_kwarg", None)
            or getattr(view, "lookup_field", None)
            or "agent_id"
        )
        view_kwargs = getattr(view, "kwargs", {}) or {}
        agent_id_in_url = (
            view_kwargs.get(lookup_url_kwarg)
            or view_kwargs.get("agent_id")
            or view_kwargs.get("pk")
        )
        
        # If there is no specific agent in the URL (i.e. leaderboard/list endpoint), only Admin can access
        if not agent_id_in_url:
            return request.user.role == User.Role.ADMIN or request.user.is_superuser

        # If inspecting a specific agent, Admins can inspect anyone; Agents can inspect only themselves
        if request.user.role == User.Role.ADMIN or request.user.is_superuser:
            return True

        # Check if the requested agent_id matches the authenticated user's ID
        return str(request.user.id) == str(agent_id_in_url)

    def has_object_permission(self, request, view, obj):
        # Admins can view any object
        if request.user.role == User.Role.ADMIN or request.user.is_superuser:
            return True
        # If the object is a User instance, ensure it is the requesting agent
        if isinstance(obj, User):
            return obj.id == request.user.id
        # If the object has an 'agent' foreign key, verify ownership
        if hasattr(obj, "agent"):
            return obj.agent_id == request.user.id
        # Otherwise deny by default
        return False


class CanManageKPIs(permissions.BasePermission):
    """
    Permission check for KPI and KRA management:
    - Read-only operations (GET, HEAD, OPTIONS): Accessible to internal staff (Admins & Agents).
    - Write/mutating operations (POST, PUT, PATCH, DELETE): Accessible ONLY to System Administrators.
    - Clients & Approvers: Denied all access (403 Forbidden).
    """

    def has_permission(self, request, view):
        # User must be authenticated
        if not (request.user and request.user.is_authenticated):
            return False

        # Disallow clients and customer approvers unconditionally
        if request.user.role not in [User.Role.ADMIN, User.Role.SUPPORT_AGENT] and not request.user.is_superuser:
            return False

        # Read methods are permitted for all internal staff
        if request.method in permissions.SAFE_METHODS:
            return True

        # Mutating methods require administrator privileges
        return request.user.role == User.Role.ADMIN or request.user.is_superuser

