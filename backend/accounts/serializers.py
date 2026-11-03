"""
Serializers for the 'accounts' application.

Handles validation and data shaping for:
- User Authentication (Login)
- User Profile Details
- Secure Password Change with Django Validator Compliance
"""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class LoginSerializer(serializers.Serializer):
    """
    Validates user credentials for REST authentication.
    Supports either username or email as the login identifier.
    """
    username = serializers.CharField(
        required=True,
        help_text="Username or registered email address.",
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
        help_text="Account password.",
    )

    def validate(self, attrs):
        username_or_email = attrs.get("username", "").strip()
        password = attrs.get("password")

        # Resolve by email if an '@' is present
        target_username = username_or_email
        if "@" in username_or_email:
            try:
                user_obj = User.objects.get(email__iexact=username_or_email)
                target_username = user_obj.username
            except User.DoesNotExist:
                # Do not raise different error to prevent email enumeration
                target_username = username_or_email

        # Authenticate using Django's credentials backend
        request = self.context.get("request")
        user = authenticate(request=request, username=target_username, password=password)

        if not user:
            raise serializers.ValidationError("Invalid username/email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This user account is currently deactivated.")

        attrs["user"] = user
        return attrs


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializes authenticated user identity, role, and client association.
    """
    client_name = serializers.CharField(source="client.name", read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "phone_number",
            "client",
            "client_name",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields


class PasswordChangeSerializer(serializers.Serializer):
    """
    Validates old password and enforces Django password complexity rules on new password.
    """
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
        help_text="Current account password.",
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
        help_text="New replacement password conforming to security policies.",
    )

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is not correct.")
        return value

    def validate_new_password(self, value):
        user = self.context["request"].user
        # Enforce all configured Django AUTH_PASSWORD_VALIDATORS
        validate_password(value, user=user)
        return value

    def validate(self, attrs):
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": "New password cannot be identical to the current password."})
        return attrs

