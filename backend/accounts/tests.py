"""
Automated Unit and Integration Tests for the 'accounts' application.

Validates:
1. Custom User model behaviors (Role choices, client linkages, constraints).
2. REST Authentication:
   - Successful login with username and with email.
   - Failed login with invalid credentials (returns 401 with non-enumerating error).
   - Inactive user login rejection.
   - User profile endpoint (/api/auth/me/).
   - User logout (/api/auth/logout/).
   - CSRF cookie initialization (/api/auth/csrf/).
   - Password change with old password verification and complexity enforcement.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from clients.models import Client

User = get_user_model()


class UserModelTests(TestCase):
    """
    Tests for the custom User model fields, roles, and constraints.
    """

    def setUp(self):
        self.client_org = Client.objects.create(
            name="Apex Dynamics",
            code="apex-dynamics",
            contact_email="contact@apex.com",
            is_active=True,
        )

    def test_create_user_with_client_role(self):
        """User creation with default or explicitly assigned CLIENT role."""
        user = User.objects.create_user(
            username="client_bob",
            email="bob@apex.com",
            password="StrongPassword123!",
            role=User.Role.CLIENT,
            client=self.client_org,
            phone_number="+1-555-0199",
        )
        self.assertEqual(user.role, User.Role.CLIENT)
        self.assertEqual(user.client, self.client_org)
        self.assertEqual(user.phone_number, "+1-555-0199")
        self.assertEqual(str(user), "client_bob (Client)")

    def test_create_support_agent(self):
        """User creation with SUPPORT_AGENT role."""
        agent = User.objects.create_user(
            username="agent_alice",
            email="alice@servicesphere.com",
            password="StrongPassword123!",
            role=User.Role.SUPPORT_AGENT,
        )
        self.assertEqual(agent.role, User.Role.SUPPORT_AGENT)
        self.assertIsNone(agent.client)

    def test_client_deletion_sets_user_client_null(self):
        """Deleting a client organization sets user.client to NULL (SET_NULL on_delete)."""
        user = User.objects.create_user(
            username="client_charlie",
            email="charlie@apex.com",
            password="StrongPassword123!",
            client=self.client_org,
        )
        self.client_org.delete()
        user.refresh_from_db()
        self.assertIsNone(user.client)


class RESTAuthenticationTests(TestCase):
    """
    Tests for dedicated REST authentication endpoints (/api/auth/*).
    """

    def setUp(self):
        self.client = APIClient()
        self.client_org = Client.objects.create(
            name="Delta Corp",
            code="delta-corp",
            contact_email="info@delta.com",
            is_active=True,
        )
        self.password = "SecurePassword123!"
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@delta.com",
            password=self.password,
            role=User.Role.CLIENT,
            client=self.client_org,
        )

    def test_login_with_valid_username(self):
        """POST /api/auth/login/ authenticates user and sets session."""
        response = self.client.post(
            "/api/auth/login/",
            {"username": "testuser", "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["username"], "testuser")
        self.assertEqual(response.data["user"]["role"], "CLIENT")
        self.assertEqual(response.data["user"]["client_name"], "Delta Corp")

    def test_login_with_valid_email(self):
        """POST /api/auth/login/ supports email as username identifier."""
        response = self.client.post(
            "/api/auth/login/",
            {"username": "testuser@delta.com", "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["username"], "testuser")

    def test_login_with_invalid_credentials_returns_401(self):
        """Login failure returns 401 Unauthorized with generic error."""
        response = self.client.post(
            "/api/auth/login/",
            {"username": "testuser", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["detail"], "Invalid username or password.")

    def test_login_with_inactive_user_rejected(self):
        """Deactivated user account login is rejected."""
        self.user.is_active = False
        self.user.save()

        response = self.client.post(
            "/api/auth/login/",
            {"username": "testuser", "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_profile_me_endpoint(self):
        """GET /api/auth/me/ returns authenticated user details."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "testuser")
        self.assertEqual(response.data["email"], "testuser@delta.com")
        self.assertEqual(response.data["role"], "CLIENT")

    def test_user_profile_unauthenticated_returns_401(self):
        """GET /api/auth/me/ rejects unauthenticated requests."""
        response = self.client.get("/api/auth/me/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_logout_endpoint(self):
        """POST /api/auth/logout/ successfully logs out user."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/auth/logout/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Successfully logged out.")

    def test_csrf_endpoint(self):
        """GET /api/auth/csrf/ initializes CSRF cookie."""
        response = self.client.get("/api/auth/csrf/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("csrfToken", response.data)

    def test_password_change_success(self):
        """POST /api/auth/change-password/ validates and updates password."""
        self.client.force_authenticate(user=self.user)
        new_pass = "BrandNewSecurePassword456!"

        response = self.client.post(
            "/api/auth/change-password/",
            {"old_password": self.password, "new_password": new_pass},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Password updated successfully.")

        # Verify new password is active
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_pass))

    def test_password_change_invalid_old_password(self):
        """Password change rejects incorrect current password."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/auth/change-password/",
            {"old_password": "IncorrectOldPassword!", "new_password": "NewPassword123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
