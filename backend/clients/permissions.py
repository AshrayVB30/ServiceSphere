from rest_framework.permissions import BasePermission


class IsSystemAdmin(BasePermission):
    message = "Only authorized system administrators can manage clients."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or (user.is_staff and user.role == "ADMIN")
            )
        )

