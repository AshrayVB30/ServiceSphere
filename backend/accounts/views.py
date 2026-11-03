"""
API Views for the 'accounts' application.

Provides enterprise-grade authentication and session management REST endpoints:
- POST /api/auth/login/           -> Authenticates user, establishes session, returns profile.
- POST /api/auth/logout/          -> Flushes user session and logs security sign-out event.
- GET  /api/auth/me/              -> Returns authenticated user identity, role, and client.
- GET  /api/auth/csrf/            -> Issues and sets secure CSRF cookie for React/SPA clients.
- POST /api/auth/change-password/ -> Secure password change with policy enforcement.
"""

import logging
from django.contrib.auth import login, logout, update_session_auth_hash
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import (
    LoginSerializer,
    PasswordChangeSerializer,
    UserDetailSerializer,
)

logger = logging.getLogger("django.security")


class LoginAPIView(APIView):
    """
    POST /api/auth/login/

    Authenticates user credentials, binds session cookie, and returns user metadata.
    Protected with brute-force rate-limiting ('auth' scope: 20 attempts/minute).
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            client_ip = request.META.get("REMOTE_ADDR", "unknown")
            user_identifier = request.data.get("username", "unknown")
            logger.warning(
                f"Failed authentication attempt for '{user_identifier}' from IP {client_ip}"
            )
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = serializer.validated_data["user"]
        # Establish Django session and bind session ID cookie
        login(request, user)

        client_ip = request.META.get("REMOTE_ADDR", "unknown")
        logger.info(
            f"Successful authentication for user '{user.username}' (Role: {user.role}) from IP {client_ip}"
        )

        return Response(
            {
                "detail": "Successfully authenticated.",
                "user": UserDetailSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class LogoutAPIView(APIView):
    """
    POST /api/auth/logout/

    Flushes the user session and invalidates session cookies.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        username = request.user.username
        client_ip = request.META.get("REMOTE_ADDR", "unknown")
        logout(request)
        logger.info(f"User '{username}' logged out from IP {client_ip}")

        return Response(
            {"detail": "Successfully logged out."},
            status=status.HTTP_200_OK,
        )


class UserProfileView(APIView):
    """
    GET /api/auth/me/

    Returns the authenticated user's profile, role, client organization, and permissions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CSRFTokenView(APIView):
    """
    GET /api/auth/csrf/

    Sets and returns the CSRF token in the response cookie and body.
    Critical for single-page applications (React) before submitting state-changing requests.
    """
    permission_classes = [permissions.AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        csrf_token = get_token(request)
        return Response(
            {
                "detail": "CSRF cookie set.",
                "csrfToken": csrf_token,
            },
            status=status.HTTP_200_OK,
        )


class PasswordChangeAPIView(APIView):
    """
    POST /api/auth/change-password/

    Permits an authenticated user to change their password safely.
    Enforces current password verification and Django password complexity rules.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        new_password = serializer.validated_data["new_password"]
        user.set_password(new_password)
        user.save()

        # Update session auth hash to prevent logging the user out upon password change
        update_session_auth_hash(request, user)

        client_ip = request.META.get("REMOTE_ADDR", "unknown")
        logger.info(f"Password changed successfully for user '{user.username}' from IP {client_ip}")

        return Response(
            {"detail": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )
