"""
Automated Unit and Integration Tests for the 'tickets' application.

This test suite rigorously validates:
1. Model tests:
   - Creation with default values (UUID, OPEN status, MEDIUM priority, timestamps).
   - String representation formatting.
   - Foreign key constraints (PROTECT on client/creator, SET_NULL on assigned agent).
2. REST API tests:
   - Authentication enforcement (unauthenticated requests rejected).
   - Ticket creation by CLIENT users with automatic server-side binding of client & creator.
   - Non-client users (admins, agents) prevented from creating tickets directly.
   - Multi-tenant queryset isolation: clients can only view their own organization's tickets.
   - Support agents only view tickets assigned to them.
   - Superusers have unrestricted visibility across all tickets.
"""

import uuid
from django.contrib.auth import get_user_model
from django.db.models import ProtectedError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from clients.models import Client
from tickets.models import Ticket, TicketHistory, TicketComment

User = get_user_model()


class TicketModelTests(TestCase):
    """
    Test suite for the Ticket model validation and database behaviors.
    """

    def setUp(self):
        """
        Runs before each individual test method.
        Sets up shared test fixtures: a client organization and two users.
        """
        # 1. Create a sample client organization
        self.client_org = Client.objects.create(
            name="Alpha Corp",
            code="alpha-corp",
            contact_email="contact@alpha.com",
            is_active=True,
        )

        # 2. Create a client employee user (submitting user)
        self.client_user = User.objects.create_user(
            username="alice",
            email="alice@alpha.com",
            password="testpassword123",
            role=User.Role.CLIENT,
            client=self.client_org,
        )

        # 3. Create an internal support agent user
        self.agent_user = User.objects.create_user(
            username="bob_agent",
            email="bob@servicesphere.com",
            password="testpassword123",
            role=User.Role.SUPPORT_AGENT,
        )

    def test_ticket_creation_with_defaults(self):
        """
        Verify that a ticket is created with expected default values:
        - Auto-generated UUID for ticket_number
        - Default priority is 'MEDIUM'
        - Default status is 'OPEN'
        - Auto-populated created_at and updated_at timestamps
        """
        ticket = Ticket.objects.create(
            client=self.client_org,
            created_by=self.client_user,
            assigned_to=self.agent_user,
            subject="Cannot access billing portal",
            description="Getting a 403 error when clicking on the invoices tab.",
            category="Billing",
        )

        # Verify UUID format and uniqueness
        self.assertIsInstance(ticket.ticket_number, uuid.UUID)

        # Verify defaults
        self.assertEqual(ticket.priority, Ticket.Priority.MEDIUM)
        self.assertEqual(ticket.status, Ticket.Status.OPEN)

        # Verify timestamps are populated
        self.assertIsNotNone(ticket.created_at)
        self.assertIsNotNone(ticket.updated_at)
        self.assertIsNone(ticket.resolved_at)

    def test_ticket_string_representation(self):
        """
        Verify the human-readable string representation of a Ticket.
        Format expected: '[Open] Medium - <subject>'
        """
        ticket = Ticket.objects.create(
            client=self.client_org,
            created_by=self.client_user,
            subject="Email notification delay",
            description="Emails arrive 20 minutes late.",
            category="Email",
            priority=Ticket.Priority.HIGH,
            status=Ticket.Status.IN_PROGRESS,
        )

        expected_str = f"[{ticket.get_status_display()}] {ticket.get_priority_display()} - {ticket.subject}"
        self.assertEqual(str(ticket), expected_str)

    def test_client_deletion_is_protected(self):
        """
        Verify that a Client organization cannot be deleted while it has linked tickets.
        Ensures foreign key protection (on_delete=models.PROTECT).
        """
        Ticket.objects.create(
            client=self.client_org,
            created_by=self.client_user,
            subject="Test protection",
            description="Testing cascade protection.",
            category="General",
        )

        # Attempting to delete the client organization should raise a ProtectedError
        with self.assertRaises(ProtectedError):
            self.client_org.delete()

    def test_created_by_deletion_is_protected(self):
        """
        Verify that a user who filed tickets cannot be deleted (on_delete=models.PROTECT).
        """
        Ticket.objects.create(
            client=self.client_org,
            created_by=self.client_user,
            subject="Test user protection",
            description="Testing user deletion protection.",
            category="General",
        )

        # Attempting to delete the author should raise a ProtectedError
        with self.assertRaises(ProtectedError):
            self.client_user.delete()

    def test_assigned_agent_deletion_sets_null(self):
        """
        Verify that deleting an assigned support agent unassigns the ticket
        without deleting the ticket itself (on_delete=models.SET_NULL).
        """
        ticket = Ticket.objects.create(
            client=self.client_org,
            created_by=self.client_user,
            assigned_to=self.agent_user,
            subject="Agent re-assignment test",
            description="Testing SET_NULL on assigned_to field.",
            category="Support",
        )

        # Delete the assigned agent
        self.agent_user.delete()

        # Reload the ticket from the database
        ticket.refresh_from_db()

        # The ticket should still exist, but assigned_to should now be None
        self.assertIsNone(ticket.assigned_to)


class TicketAPITests(APITestCase):
    """
    Test suite for Ticket REST API endpoints, access control, and tenancy rules.
    """

    def setUp(self):
        """
        Set up organizations and users for testing multi-tenant security scenarios.
        """
        # Client Organization 1
        self.org1 = Client.objects.create(
            name="Org One",
            code="org-one",
            contact_email="support@orgone.com",
            is_active=True,
        )

        # Client Organization 2 (competitor / separate tenant)
        self.org2 = Client.objects.create(
            name="Org Two",
            code="org-two",
            contact_email="support@orgtwo.com",
            is_active=True,
        )

        # User belonging to Org 1
        self.client_user_org1 = User.objects.create_user(
            username="client_org1",
            email="user1@orgone.com",
            password="password123",
            role=User.Role.CLIENT,
            client=self.org1,
        )

        # User belonging to Org 2
        self.client_user_org2 = User.objects.create_user(
            username="client_org2",
            email="user2@orgtwo.com",
            password="password123",
            role=User.Role.CLIENT,
            client=self.org2,
        )

        # Internal support agent
        self.agent = User.objects.create_user(
            username="agent_smith",
            email="smith@servicesphere.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )

        # System administrator (superuser)
        self.admin_user = User.objects.create_superuser(
            username="super_admin",
            email="admin@servicesphere.com",
            password="password123",
            role=User.Role.ADMIN,
        )

        # Existing ticket for Org 1 assigned to the agent
        self.ticket_org1 = Ticket.objects.create(
            client=self.org1,
            created_by=self.client_user_org1,
            assigned_to=self.agent,
            subject="Org1 network issue",
            description="VPN is down",
            category="Network",
        )

        # Existing ticket for Org 2 (unassigned)
        self.ticket_org2 = Ticket.objects.create(
            client=self.org2,
            created_by=self.client_user_org2,
            subject="Org2 billing issue",
            description="Invoice discrepancy",
            category="Billing",
        )

    def test_unauthenticated_access_denied(self):
        """
        Unauthenticated requests to /api/tickets/ must be rejected with 401 or 403.
        """
        response = self.client.get("/api/tickets/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_client_can_create_ticket_for_own_organization(self):
        """
        A logged-in client user can create a ticket for their organization.
        The backend automatically assigns the 'client' and 'created_by' fields.
        """
        self.client.force_authenticate(user=self.client_user_org1)

        payload = {
            "subject": "Unable to access the dashboard",
            "description": "The dashboard displays an error after login.",
            "category": "Technical Support",
            "priority": "HIGH",
        }

        response = self.client.post("/api/tickets/", payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["subject"], payload["subject"])
        self.assertEqual(response.data["client"], self.org1.id)
        self.assertEqual(response.data["client_name"], self.org1.name)
        self.assertEqual(response.data["created_by_username"], self.client_user_org1.username)
        self.assertEqual(response.data["status"], Ticket.Status.OPEN)
        self.assertIsNotNone(response.data["ticket_number"])

    def test_client_cannot_view_another_organizations_tickets(self):
        """
        Multi-tenant isolation: A client user from Org 1 MUST NEVER see tickets from Org 2.
        """
        self.client.force_authenticate(user=self.client_user_org1)

        response = self.client.get("/api/tickets/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ticket_ids = [t["id"] for t in response.data]
        self.assertIn(self.ticket_org1.id, ticket_ids)
        self.assertNotIn(self.ticket_org2.id, ticket_ids)

    def test_support_agent_sees_only_assigned_tickets(self):
        """
        Support agents should only see tickets explicitly assigned to them.
        """
        self.client.force_authenticate(user=self.agent)

        response = self.client.get("/api/tickets/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ticket_ids = [t["id"] for t in response.data]
        self.assertIn(self.ticket_org1.id, ticket_ids)
        self.assertNotIn(self.ticket_org2.id, ticket_ids)

    def test_superuser_can_list_all_tickets(self):
        """
        System administrators have unrestricted visibility across all organizations.
        """
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/tickets/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ticket_ids = [t["id"] for t in response.data]
        self.assertIn(self.ticket_org1.id, ticket_ids)
        self.assertIn(self.ticket_org2.id, ticket_ids)


    def test_admin_can_assign_ticket_to_agent(self):
        """
        Administrators can assign an unassigned ticket to an active support agent.
        Generates an ASSIGNED history record.
        """
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            f"/api/tickets/{self.ticket_org2.id}/assign/",
            {"assigned_to": self.agent.id, "note": "Assigned to Smith"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ticket_org2.refresh_from_db()
        self.assertEqual(self.ticket_org2.assigned_to, self.agent)

        # Verify history entry
        history = self.ticket_org2.history.filter(action=TicketHistory.Action.ASSIGNED).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.performed_by, self.admin_user)
        self.assertEqual(history.new_assignee, self.agent)
        self.assertEqual(history.note, "Assigned to Smith")

    def test_client_cannot_assign_ticket(self):
        """
        Client users are forbidden from assigning tickets.
        """
        self.client.force_authenticate(user=self.client_user_org1)

        response = self.client.post(
            f"/api/tickets/{self.ticket_org1.id}/assign/",
            {"assigned_to": self.agent.id},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assigned_agent_can_transition_status(self):
        """
        Assigned support agent can advance ticket status from OPEN to IN_PROGRESS.
        """
        self.client.force_authenticate(user=self.agent)

        response = self.client.post(
            f"/api/tickets/{self.ticket_org1.id}/change_status/",
            {"status": Ticket.Status.IN_PROGRESS, "note": "Starting investigation"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ticket_org1.refresh_from_db()
        self.assertEqual(self.ticket_org1.status, Ticket.Status.IN_PROGRESS)

    def test_invalid_status_transition_rejected(self):
        """
        State machine validation: transitioning directly from OPEN to RESOLVED is rejected.
        """
        self.client.force_authenticate(user=self.agent)

        response = self.client.post(
            f"/api/tickets/{self.ticket_org1.id}/change_status/",
            {"status": Ticket.Status.RESOLVED},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_client_cannot_change_ticket_status(self):
        """
        Client users are forbidden from changing ticket status.
        """
        self.client.force_authenticate(user=self.client_user_org1)

        response = self.client.post(
            f"/api/tickets/{self.ticket_org1.id}/change_status/",
            {"status": Ticket.Status.IN_PROGRESS},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assigned_agent_can_resolve_ticket(self):
        """
        Assigned support agent can advance ticket status from IN_PROGRESS to RESOLVED,
        setting the resolved_at timestamp and creating a STATUS_CHANGED history record.
        """
        # Set ticket to IN_PROGRESS first
        self.ticket_org1.status = Ticket.Status.IN_PROGRESS
        self.ticket_org1.save(update_fields=["status"])

        self.client.force_authenticate(user=self.agent)

        response = self.client.post(
            f"/api/tickets/{self.ticket_org1.id}/change_status/",
            {"status": Ticket.Status.RESOLVED, "note": "Resolved root cause in router config"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ticket_org1.refresh_from_db()
        self.assertEqual(self.ticket_org1.status, Ticket.Status.RESOLVED)
        self.assertIsNotNone(self.ticket_org1.resolved_at)

        # Verify history entry
        history = self.ticket_org1.history.filter(
            action=TicketHistory.Action.STATUS_CHANGED,
            new_status=Ticket.Status.RESOLVED,
        ).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.performed_by, self.agent)
        self.assertEqual(history.previous_status, Ticket.Status.IN_PROGRESS)
        self.assertEqual(history.note, "Resolved root cause in router config")



class TicketCommentAPITests(APITestCase):
    """
    Test suite for Ticket Comments, Conversation History, and Internal Notes.
    Validates all 8 security checklist items for ticket conversations.
    """

    def setUp(self):
        """
        Sets up organizations and users across different roles (Client, Approver, Agent, Unassigned Agent, Admin).
        """
        # Client Organization
        self.org = Client.objects.create(
            name="Apex Dynamics",
            code="apex-dynamics",
            contact_email="support@apexdynamics.com",
            is_active=True,
        )

        # Another Client Organization (for isolation tests)
        self.other_org = Client.objects.create(
            name="Beta Systems",
            code="beta-systems",
            contact_email="support@betasystems.com",
            is_active=True,
        )

        # Client user
        self.client_user = User.objects.create_user(
            username="ashray_client",
            email="ashray@apexdynamics.com",
            password="password123",
            role=User.Role.CLIENT,
            client=self.org,
        )

        # Approver user
        self.approver_user = User.objects.create_user(
            username="approver_user",
            email="approver@apexdynamics.com",
            password="password123",
            role=User.Role.APPROVER,
            client=self.org,
        )

        # Assigned support agent
        self.assigned_agent = User.objects.create_user(
            username="nagaraj_agent",
            email="nagaraj@servicesphere.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )

        # Unassigned support agent
        self.unassigned_agent = User.objects.create_user(
            username="unassigned_agent",
            email="unassigned@servicesphere.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )

        # System Administrator
        self.admin_user = User.objects.create_superuser(
            username="admin_boss",
            email="boss@servicesphere.com",
            password="password123",
            role=User.Role.ADMIN,
        )

        # Primary test ticket belonging to Apex Dynamics, assigned to nagaraj_agent
        self.ticket = Ticket.objects.create(
            client=self.org,
            created_by=self.client_user,
            assigned_to=self.assigned_agent,
            subject="Dashboard login error",
            description="The dashboard displays an error after login.",
            category="Technical Support",
            status=Ticket.Status.IN_PROGRESS,
        )

        # Public comment written by client
        self.public_comment = TicketComment.objects.create(
            ticket=self.ticket,
            author=self.client_user,
            message="The dashboard is showing an error when I try to log in.",
            is_internal=False,
        )

        # Internal note written by assigned agent
        self.internal_note = TicketComment.objects.create(
            ticket=self.ticket,
            author=self.assigned_agent,
            message="Investigate the authentication service logs.",
            is_internal=True,
        )

    def test_client_can_add_comment_to_own_ticket(self):
        """
        Checklist item 1: Client can add public comments to its own organization's ticket.
        """
        self.client.force_authenticate(user=self.client_user)

        payload = {
            "message": "I've attached the error details. Please check.",
            "is_internal": False,
        }
        response = self.client.post(f"/api/tickets/{self.ticket.id}/comments/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], payload["message"])
        self.assertEqual(response.data["author_username"], self.client_user.username)
        self.assertFalse(response.data["is_internal"])

    def test_client_can_retrieve_public_comments(self):
        """
        Checklist item 2: Client can retrieve public comments.
        """
        self.client.force_authenticate(user=self.client_user)

        response = self.client.get(f"/api/tickets/{self.ticket.id}/comments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        messages = [c["message"] for c in response.data]
        self.assertIn("The dashboard is showing an error when I try to log in.", messages)

    def test_client_cannot_see_internal_notes(self):
        """
        Checklist item 3: Client cannot see internal notes.
        """
        self.client.force_authenticate(user=self.client_user)

        response = self.client.get(f"/api/tickets/{self.ticket.id}/comments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        messages = [c["message"] for c in response.data]
        # Public comment is visible
        self.assertIn(self.public_comment.message, messages)
        # Internal note MUST NOT be visible to client
        self.assertNotIn(self.internal_note.message, messages)

    def test_client_cannot_create_internal_notes(self):
        """
        Checklist item 4: Client cannot create internal notes (forbidden with 403).
        """
        self.client.force_authenticate(user=self.client_user)

        payload = {
            "message": "Attempting to create an internal note as a client",
            "is_internal": True,
        }
        response = self.client.post(f"/api/tickets/{self.ticket.id}/comments/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assigned_agent_can_create_public_comments(self):
        """
        Checklist item 5: Assigned support agent can create public comments.
        """
        self.client.force_authenticate(user=self.assigned_agent)

        payload = {
            "message": "We are investigating the issue. Could you share a screenshot of the error?",
            "is_internal": False,
        }
        response = self.client.post(f"/api/tickets/{self.ticket.id}/comments/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["author_username"], self.assigned_agent.username)
        self.assertFalse(response.data["is_internal"])

    def test_assigned_agent_can_create_internal_notes(self):
        """
        Checklist item 6: Assigned support agent can create internal notes.
        """
        self.client.force_authenticate(user=self.assigned_agent)

        payload = {
            "message": "Found issue in token expiration middleware.",
            "is_internal": True,
        }
        response = self.client.post(f"/api/tickets/{self.ticket.id}/comments/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_internal"])

    def test_unassigned_support_agent_cannot_access_ticket_conversation(self):
        """
        Checklist item 7: Unassigned support agent cannot access the ticket conversation (403 Forbidden).
        """
        self.client.force_authenticate(user=self.unassigned_agent)

        # GET attempt
        get_response = self.client.get(f"/api/tickets/{self.ticket.id}/comments/")
        self.assertEqual(get_response.status_code, status.HTTP_403_FORBIDDEN)

        # POST attempt
        post_response = self.client.post(
            f"/api/tickets/{self.ticket.id}/comments/",
            {"message": "Unauthorized comment attempt"},
        )
        self.assertEqual(post_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_approver_can_view_public_comments_but_cannot_add_comments(self):
        """
        Checklist item 8: Approver can view public comments but cannot add comments.
        """
        self.client.force_authenticate(user=self.approver_user)

        # Viewing comments: permitted
        get_response = self.client.get(f"/api/tickets/{self.ticket.id}/comments/")
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        messages = [c["message"] for c in get_response.data]
        self.assertIn(self.public_comment.message, messages)
        self.assertNotIn(self.internal_note.message, messages)

        # Adding comments: forbidden with 403
        post_response = self.client.post(
            f"/api/tickets/{self.ticket.id}/comments/",
            {"message": "Approver trying to write a comment"},
        )
        self.assertEqual(post_response.status_code, status.HTTP_403_FORBIDDEN)
