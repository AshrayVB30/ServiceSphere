"""
Automated Unit and Integration Tests for the 'tickets' application.

This test suite rigorously validates:
1. Ticket model creation, UUID generation, default status, and default priority.
2. String representation format of tickets.
3. Database constraints:
   - PROTECT behavior: prevents deleting a client or submitting user if tickets exist.
   - SET_NULL behavior: unassigns tickets safely if an assigned agent is deleted.
"""

import uuid
from django.contrib.auth import get_user_model
from django.db.models import ProtectedError
from django.test import TestCase

from clients.models import Client
from tickets.models import Ticket

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
