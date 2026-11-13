"""
Serializers for the 'accounts' application.

Handles validation and data shaping for:
- User Authentication (Login)
- User Profile Details
- Secure Password Change with Django Validator Compliance
"""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
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


class UserManagementSerializer(serializers.ModelSerializer):
    """
    Full CRUD serializer for administrative user directory management.
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
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
        ]
        read_only_fields = ["id", "client_name", "role_display", "date_joined"]

    def create(self, validated_data):
        password = validated_data.pop("password", None) or "Password123!"
        user = User(**validated_data)
        user.set_password(password)
        if user.role in (User.Role.ADMIN, User.Role.SUPPORT_AGENT):
            user.is_staff = True
        if user.role == User.Role.ADMIN:
            user.is_superuser = True
        user.save()
        return user

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if instance.role in (User.Role.ADMIN, User.Role.SUPPORT_AGENT):
            instance.is_staff = True
        if instance.role == User.Role.ADMIN:
            instance.is_superuser = True
        instance.save()
        return instance


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


class RegisterSerializer(serializers.ModelSerializer):
    """
    Validates and registers new user accounts in ServiceSphere.
    Supports organization linkage and enforces password complexity policies.
    """
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
        help_text="Account password conforming to security policies.",
    )
    password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
        help_text="Re-type password for confirmation.",
    )
    client_name = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Optional company name for multi-tenant organization association.",
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "client",
            "client_name",
            "password",
            "password_confirm",
        ]
        extra_kwargs = {
            "first_name": {"required": True, "allow_blank": False},
            "email": {"required": True, "allow_blank": False},
            "role": {"required": False},
            "client": {"required": False, "allow_null": True},
        }

    def validate_email(self, value):
        val = value.strip().lower()
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return val

    def validate_username(self, value):
        val = value.strip()
        if User.objects.filter(username__iexact=val).exists():
            raise serializers.ValidationError("This username is already taken. Please choose another.")
        return val

    def validate_role(self, value):
        # Public self-registration permits CLIENT or APPROVER roles.
        # Staff roles (ADMIN, SUPPORT_AGENT) require administrative provisioning.
        allowed_public_roles = [User.Role.CLIENT, User.Role.APPROVER]
        if value and value not in allowed_public_roles:
            raise serializers.ValidationError(
                "Self-registration is restricted to Client or Approver accounts. "
                "Staff roles must be provisioned by a system administrator."
            )
        return value or User.Role.CLIENT

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        # Validate password using Django's password validators with DRF-compliant error formatting
        try:
            validate_password(attrs["password"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm", None)
        client_name = validated_data.pop("client_name", "").strip()
        client = validated_data.get("client")
        password = validated_data.pop("password")
        role = validated_data.get("role") or User.Role.CLIENT

        # If client was not explicitly selected by ID, link or create client organization
        if not client:
            from clients.models import Client
            from django.utils.text import slugify

            if not client_name:
                display_name = validated_data.get("first_name") or validated_data.get("username", "Member")
                client_name = f"{display_name}'s Workspace"

            existing = Client.objects.filter(name__iexact=client_name).first()
            if existing:
                client = existing
            else:
                base_code = slugify(client_name) or "org"
                code = base_code
                count = 1
                while Client.objects.filter(code=code).exists():
                    code = f"{base_code}-{count}"
                    count += 1

                client = Client.objects.create(
                    name=client_name,
                    code=code,
                    contact_email=validated_data.get("email", ""),
                    is_active=True,
                )
            validated_data["client"] = client

        validated_data["role"] = role
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Validates email for initiating password recovery workflow.
    """
    email = serializers.EmailField(
        required=True,
        help_text="Registered email address to receive password reset link.",
    )


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Validates base64 uid, cryptographic token, and new password matching rules.
    """
    uid = serializers.CharField(
        required=True,
        help_text="Base64-encoded user ID.",
    )
    token = serializers.CharField(
        required=True,
        help_text="Cryptographic one-time password reset token.",
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
        help_text="New replacement password conforming to security policies.",
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
        help_text="Re-type new password for confirmation.",
    )

    def validate(self, attrs):
        if attrs.get("new_password") != attrs.get("new_password_confirm"):
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        return attrs

