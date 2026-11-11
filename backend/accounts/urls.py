"""
URL Routing for the 'accounts' application.

Maps authentication, profile, CSRF, and credential management endpoints under /api/auth/.
"""

from django.urls import path
from .views import (
    CSRFTokenView,
    LoginAPIView,
    LogoutAPIView,
    PasswordChangeAPIView,
    PasswordResetConfirmAPIView,
    PasswordResetRequestAPIView,
    RegisterAPIView,
    UserProfileView,
)

urlpatterns = [
    # REST Registration: Creates account and establishes session
    path("register/", RegisterAPIView.as_view(), name="auth-register"),

    # REST Login: Authenticates and establishes session
    path("login/", LoginAPIView.as_view(), name="auth-login"),

    # REST Logout: Invalidates current session
    path("logout/", LogoutAPIView.as_view(), name="auth-logout"),

    # Current User Profile
    path("me/", UserProfileView.as_view(), name="auth-me"),

    # CSRF Token Initialization
    path("csrf/", CSRFTokenView.as_view(), name="auth-csrf"),

    # Password Change (Authenticated)
    path("change-password/", PasswordChangeAPIView.as_view(), name="auth-change-password"),

    # Password Recovery (Public / Unauthenticated)
    path("password-reset/", PasswordResetRequestAPIView.as_view(), name="auth-password-reset"),
    path("password-reset-confirm/", PasswordResetConfirmAPIView.as_view(), name="auth-password-reset-confirm"),
]

