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
from django.conf import settings
from django.contrib.auth import login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import User
from .serializers import (
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
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


class RegisterAPIView(APIView):
    """
    POST /api/auth/register/

    Registers a new client or approver account, establishes a secure session cookie,
    and returns authenticated user identity metadata.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Establish Django session and bind session ID cookie
        login(request, user)

        client_ip = request.META.get("REMOTE_ADDR", "unknown")
        logger.info(
            f"New user registration: '{user.username}' (Role: {user.role}, Org: {user.client}) from IP {client_ip}"
        )

        return Response(
            {
                "detail": "Account registered successfully.",
                "user": UserDetailSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class PasswordResetRequestAPIView(APIView):
    """
    POST /api/auth/password-reset/

    Generates a secure, cryptographically signed one-time token and emails password
    recovery instructions with a self-service link to the requesting user.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()

        try:
            user = User.objects.get(email__iexact=email, is_active=True)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            # Derive frontend base URL from incoming origin header or fallback to localhost
            frontend_url = request.headers.get("origin") or "http://localhost:5173"
            reset_url = f"{frontend_url}/reset-password/{uid}/{token}"

            subject = "ServiceSphere — Password Reset Instructions"
            message = (
                f"Hello {user.first_name or user.username},\n\n"
                f"We received a request to reset your password for your ServiceSphere account.\n\n"
                f"Click the link below (or paste it into your browser) to choose a new password:\n"
                f"{reset_url}\n\n"
                f"This password reset link will expire in 24 hours.\n\n"
                f"If you did not request a password reset, you can safely disregard this email.\n\n"
                f"— ServiceSphere Security Team"
            )

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            logger.info(f"Password reset token generated and dispatched for user '{user.username}' ({email})")
        except User.DoesNotExist:
            # Prevent email enumeration: Return uniform success even if account does not exist
            logger.info(f"Password recovery requested for non-existent or inactive email: {email}")

        return Response(
            {
                "detail": f"If an account with {email} exists, password recovery instructions have been dispatched.",
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmAPIView(APIView):
    """
    POST /api/auth/password-reset-confirm/

    Validates the one-time token, validates password complexity, and sets the new password.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid_b64 = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"detail": "Invalid or expired password reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "This password reset link has expired or has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Enforce all configured Django AUTH_PASSWORD_VALIDATORS
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {"detail": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        logger.info(f"Password successfully reset via token for user '{user.username}'")

        return Response(
            {"detail": "Your password has been successfully reset. You may now sign in with your new password."},
            status=status.HTTP_200_OK,
        )
