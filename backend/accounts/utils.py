"""
Shared utility helpers for the 'accounts' application.

Provides reusable role-checking functions that are imported across multiple
Django apps (tickets, approvals, sla) to avoid duplicating the same logic.

Having a single authoritative implementation means that if the administrator
privilege rules ever change, only this file needs to be updated.
"""

from accounts.models import User


def is_system_admin(user):
    """
    Determines whether a user possesses platform-level administrator privileges.

    A user is considered a system administrator if they meet either condition:
    1. ``user.is_superuser`` is True — Django's built-in unrestricted superuser flag.
    2. ``user.is_staff`` is True AND ``user.role == 'ADMIN'`` — a ServiceSphere
       staff account explicitly granted the ADMIN role.

    This dual check ensures that:
    - Django superusers (e.g., created via ``createsuperuser``) always have admin access.
    - Regular admin accounts created through the application API also qualify.

    Args:
        user: The ``accounts.User`` instance from ``request.user``.

    Returns:
        bool: True if the user is an administrator, False otherwise.
              Always returns False for anonymous or unauthenticated users.
    """
    return bool(
        user
        and user.is_authenticated
        and (
            user.is_superuser
            or (user.is_staff and user.role == User.Role.ADMIN)
        )
    )

