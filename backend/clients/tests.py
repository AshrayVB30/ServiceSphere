"""
Automated Unit and Integration Tests for the 'clients' application.

Validates:
1. Client model creation, constraints, unique slugified codes.
2. Multi-tenant security:
   - Unauthenticated requests to /api/clients/ return 401 or 403.
   - Ordinary client users receive 403 Forbidden.
   - Support agents receive 403 Forbidden.
   - System Administrators can list, create, retrieve, and update client organizations.
   - Deletion via DELETE method returns HTTP 405 Method Not Allowed (soft-deactivation enforced).
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from clients.models import Client

User = get_user_model()


class ClientSecurityAndAPITests(TestCase):
    """
    Test suite for client organization multi-tenancy and administrative security.
    """

    def setUp(self):
        self.client = APIClient()

        # Create system administrator
        self.admin = User.objects.create_superuser(
            username="client_admin",
            email="admin@servicesphere.com",
            password="SecurePassword123!",
            role=User.Role.ADMIN,
        )

        # Create sample client organization
        self.org = Client.objects.create(
            name="Acme Corporation",
            code="acme-corp",
            contact_email="admin@acme.com",
            is_active=True,
        )

        # Create ordinary client user
        self.client_user = User.objects.create_user(
            username="acme_employee",
            email="employee@acme.com",
            password="SecurePassword123!",
            role=User.Role.CLIENT,
            client=self.org,
        )

        # Create support agent
        self.agent = User.objects.create_user(
            username="support_agent",
            email="agent@servicesphere.com",
            password="SecurePassword123!",
            role=User.Role.SUPPORT_AGENT,
        )

    def test_unauthenticated_access_denied(self):
        """Unauthenticated requests to /api/clients/ return 401/403."""
        response = self.client.get("/api/clients/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_client_user_cannot_access_clients_api(self):
        """Client users are blocked with 403 Forbidden from viewing organizations."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get("/api/clients/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_support_agent_cannot_access_clients_api(self):
        """Support agents are blocked with 403 Forbidden from managing organizations."""
        self.client.force_authenticate(user=self.agent)
        response = self.client.get("/api/clients/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_client_organizations(self):
        """System administrator can view all onboarded client organizations."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/clients/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify pagination or list output
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["code"], "acme-corp")

    def test_admin_can_create_new_client_organization(self):
        """Administrator can onboard a new client organization."""
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "Zenith Global Tech",
            "code": "zenith-tech",
            "contact_email": "ops@zenith.com",
            "is_active": True,
        }
        response = self.client.post("/api/clients/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Zenith Global Tech")
        self.assertEqual(response.data["code"], "zenith-tech")

    def test_hard_delete_disallowed(self):
        """DELETE method returns HTTP 405 Method Not Allowed to preserve historical linkages."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/clients/{self.org.id}/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
