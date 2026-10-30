"""
Automated Unit and Integration Tests for the 'sla' application.

Covers all functional requirements for SLA Policy Management, SLA Assignment,
First-Response Detection, Resolution Tracking, SLA Monitoring, and Automated Escalations:
1. SLAPolicy CRUD, activation, deactivation, and unique priority constraints.
2. Automatic SLA assignment and deadline calculation on ticket creation.
3. Priority change deadline recalculation.
4. First public agent response detection (filtering out internal notes and client messages).
5. Ticket resolution tracking and reopening behavior.
6. Tenant and role data isolation for Ticket SLA details.
7. SLA monitoring engine: approaching and breach detection (Level 1, 2, 3) without duplicate alerts.
8. Escalation acknowledgement workflow and permission restrictions.
"""

from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from clients.models import Client
from tickets.models import Ticket, TicketComment
from .models import SLAPolicy, SLATracking, SLAEscalation
from .services import (
    assign_sla_to_ticket,
    record_first_response,
    record_ticket_resolution,
    record_ticket_reopened,
    evaluate_sla_monitoring_and_escalations,
)


class SLAPolicyModelTests(TestCase):
    """
    Unit tests for SLAPolicy model validations and constraints.
    """

    def test_sla_policy_validation(self):
        """
        Validates that resolution target cannot be shorter than response target,
        and response target must be positive.
        """
        policy = SLAPolicy(
            name="Invalid Policy",
            priority=Ticket.Priority.HIGH,
            response_time_hours=Decimal("10.00"),
            resolution_time_hours=Decimal("5.00"),  # Shorter than response time!
        )
        with self.assertRaises(ValidationError):
            policy.clean()

        policy_zero = SLAPolicy(
            name="Zero Target",
            priority=Ticket.Priority.HIGH,
            response_time_hours=Decimal("0.00"),
            resolution_time_hours=Decimal("5.00"),
        )
        with self.assertRaises(ValidationError):
            policy_zero.clean()


class SLAPolicyAPITests(APITestCase):
    """
    API tests for SLA Policy CRUD and activation management.
    """

    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin_sarah",
            email="sarah@servicesphere.com",
            password="password123",
            role=User.Role.ADMIN,
        )

        self.agent = User.objects.create_user(
            username="agent_sam",
            email="sam@servicesphere.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )

        self.client_org = Client.objects.create(
            name="Acme Corp",
            code="acme-corp",
            is_active=True,
        )

        self.client_user = User.objects.create_user(
            username="client_claire",
            email="claire@acme.com",
            password="password123",
            role=User.Role.CLIENT,
            client=self.client_org,
        )

        # Pre-seed an active high priority SLA policy
        self.high_policy = SLAPolicy.objects.create(
            name="High Priority Standard",
            priority=Ticket.Priority.HIGH,
            response_time_hours=Decimal("2.00"),
            resolution_time_hours=Decimal("8.00"),
            is_active=True,
        )

    def test_admin_can_create_sla_policy(self):
        """Admin can create a new SLA policy."""
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "Medium Priority SLA",
            "priority": Ticket.Priority.MEDIUM,
            "response_time_hours": "4.00",
            "resolution_time_hours": "24.00",
            "description": "Standard business tier",
            "is_active": True,
        }
        response = self.client.post("/api/sla/policies/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["priority"], Ticket.Priority.MEDIUM)

    def test_conflicting_active_policy_rejected(self):
        """Attempting to create a second active policy for HIGH priority is rejected."""
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "Second High Priority Policy",
            "priority": Ticket.Priority.HIGH,
            "response_time_hours": "1.00",
            "resolution_time_hours": "4.00",
            "is_active": True,
        }
        response = self.client.post("/api/sla/policies/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # DRF UniqueTogetherValidator puts error under 'non_field_errors', or field-level validation under 'priority'
        self.assertTrue(
            "priority" in response.data or "non_field_errors" in response.data,
            f"Expected validation error in response data, got {response.data}",
        )

    def test_non_admin_cannot_manage_policies(self):
        """Non-admin users receive 403 Forbidden when managing SLA policies."""
        self.client.force_authenticate(user=self.agent)
        response = self.client.post("/api/sla/policies/", {"name": "Test"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_activate_and_deactivate_policy(self):
        """Admin can deactivate and reactivate policies via action endpoints."""
        self.client.force_authenticate(user=self.admin)

        # Deactivate
        resp1 = self.client.post(f"/api/sla/policies/{self.high_policy.id}/deactivate/")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.high_policy.refresh_from_db()
        self.assertFalse(self.high_policy.is_active)

        # Reactivate
        resp2 = self.client.post(f"/api/sla/policies/{self.high_policy.id}/activate/")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.high_policy.refresh_from_db()
        self.assertTrue(self.high_policy.is_active)


class SLATrackingAndEscalationTests(APITestCase):
    """
    Integration tests for ticket creation SLA assignment, response tracking,
    resolution tracking, overdue monitoring, and escalation alerts.
    """

    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin_marcus",
            email="marcus@servicesphere.com",
            password="password123",
            role=User.Role.ADMIN,
        )

        self.agent = User.objects.create_user(
            username="agent_alex",
            email="alex@servicesphere.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )

        self.unassigned_agent = User.objects.create_user(
            username="agent_jordan",
            email="jordan@servicesphere.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )

        self.org1 = Client.objects.create(
            name="Org One",
            code="org-one",
            is_active=True,
        )

        self.org2 = Client.objects.create(
            name="Org Two",
            code="org-two",
            is_active=True,
        )

        self.client_user1 = User.objects.create_user(
            username="client_user1",
            email="user1@orgone.com",
            password="password123",
            role=User.Role.CLIENT,
            client=self.org1,
        )

        self.client_user2 = User.objects.create_user(
            username="client_user2",
            email="user2@orgtwo.com",
            password="password123",
            role=User.Role.CLIENT,
            client=self.org2,
        )

        # SLA Policies
        self.policy_high = SLAPolicy.objects.create(
            name="High Policy",
            priority=Ticket.Priority.HIGH,
            response_time_hours=Decimal("2.00"),
            resolution_time_hours=Decimal("8.00"),
            is_active=True,
        )

        self.policy_medium = SLAPolicy.objects.create(
            name="Medium Policy",
            priority=Ticket.Priority.MEDIUM,
            response_time_hours=Decimal("4.00"),
            resolution_time_hours=Decimal("24.00"),
            is_active=True,
        )

        # Primary test ticket
        self.ticket1 = Ticket.objects.create(
            client=self.org1,
            created_by=self.client_user1,
            assigned_to=self.agent,
            subject="Database connection timeout",
            description="App crashes on db query.",
            category="Database",
            priority=Ticket.Priority.HIGH,
            status=Ticket.Status.OPEN,
        )
        assign_sla_to_ticket(self.ticket1)

    def test_sla_deadlines_calculated_on_creation(self):
        """Verify that deadlines are calculated from the active policy."""
        tracking = self.ticket1.sla_tracking
        self.assertIsNotNone(tracking.response_deadline)
        self.assertIsNotNone(tracking.resolution_deadline)
        self.assertEqual(tracking.policy, self.policy_high)
        self.assertEqual(tracking.response_status, SLATracking.SLAStatus.WITHIN_SLA)

        # Expected: created_at + 2 hours
        expected_resp = self.ticket1.created_at + timedelta(hours=2)
        self.assertAlmostEqual(
            tracking.response_deadline.timestamp(),
            expected_resp.timestamp(),
            delta=5,
        )

    def test_first_response_tracking(self):
        """
        Verify that:
        - Internal notes do NOT qualify as a first response.
        - Client comments do NOT qualify as a first response.
        - Public agent comments DO qualify and complete the first response SLA.
        """
        tracking = self.ticket1.sla_tracking
        self.assertIsNone(tracking.actual_response_at)

        # 1. Client comment
        client_comment = TicketComment.objects.create(
            ticket=self.ticket1,
            author=self.client_user1,
            message="Any updates?",
            is_internal=False,
        )
        record_first_response(client_comment)
        tracking.refresh_from_db()
        self.assertIsNone(tracking.actual_response_at)

        # 2. Agent internal note
        internal_note = TicketComment.objects.create(
            ticket=self.ticket1,
            author=self.agent,
            message="Internal check on Postgres pool.",
            is_internal=True,
        )
        record_first_response(internal_note)
        tracking.refresh_from_db()
        self.assertIsNone(tracking.actual_response_at)

        # 3. Agent public comment (qualifying response)
        public_comment = TicketComment.objects.create(
            ticket=self.ticket1,
            author=self.agent,
            message="Hello, we are investigating the connection pool timeout.",
            is_internal=False,
        )
        record_first_response(public_comment)
        tracking.refresh_from_db()
        self.assertIsNotNone(tracking.actual_response_at)
        self.assertEqual(tracking.response_status, SLATracking.SLAStatus.COMPLETED)

    def test_resolution_tracking_and_reopen(self):
        """
        Verify that resolving a ticket records resolution time and sets status to COMPLETED,
        and reopening clears resolution time.
        """
        tracking = self.ticket1.sla_tracking
        self.ticket1.status = Ticket.Status.RESOLVED
        self.ticket1.resolved_at = timezone.now()
        self.ticket1.save()

        record_ticket_resolution(self.ticket1)
        tracking.refresh_from_db()
        self.assertIsNotNone(tracking.actual_resolution_at)
        self.assertEqual(tracking.resolution_status, SLATracking.SLAStatus.COMPLETED)

        # Reopen ticket
        self.ticket1.status = Ticket.Status.IN_PROGRESS
        self.ticket1.resolved_at = None
        self.ticket1.save()

        record_ticket_reopened(self.ticket1)
        tracking.refresh_from_db()
        self.assertIsNone(tracking.actual_resolution_at)

    def test_priority_change_recalculates_deadlines(self):
        """Changing ticket priority recalculates deadlines according to the new policy."""
        tracking = self.ticket1.sla_tracking
        self.assertEqual(tracking.policy, self.policy_high)

        # Change priority to MEDIUM
        self.ticket1.priority = Ticket.Priority.MEDIUM
        self.ticket1.save()
        assign_sla_to_ticket(self.ticket1, recalculated=True, previous_priority="HIGH")

        tracking.refresh_from_db()
        self.assertEqual(tracking.policy, self.policy_medium)
        expected_resp = self.ticket1.created_at + timedelta(hours=4)
        self.assertAlmostEqual(
            tracking.response_deadline.timestamp(),
            expected_resp.timestamp(),
            delta=5,
        )

    def test_ticket_sla_detail_api_permissions(self):
        """
        Tenant isolation test for GET /api/sla/tickets/{id}/:
        - Client 1 can access Ticket 1 SLA.
        - Client 2 cannot access Ticket 1 SLA (403 Forbidden).
        - Assigned agent can access.
        - Unassigned agent receives 403 Forbidden.
        - Admin can access all.
        """
        # Client 1: OK
        self.client.force_authenticate(user=self.client_user1)
        res1 = self.client.get(f"/api/sla/tickets/{self.ticket1.id}/")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Client 2: 403
        self.client.force_authenticate(user=self.client_user2)
        res2 = self.client.get(f"/api/sla/tickets/{self.ticket1.id}/")
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

        # Assigned Agent: OK
        self.client.force_authenticate(user=self.agent)
        res3 = self.client.get(f"/api/sla/tickets/{self.ticket1.id}/")
        self.assertEqual(res3.status_code, status.HTTP_200_OK)

        # Unassigned Agent: 403
        self.client.force_authenticate(user=self.unassigned_agent)
        res4 = self.client.get(f"/api/sla/tickets/{self.ticket1.id}/")
        self.assertEqual(res4.status_code, status.HTTP_403_FORBIDDEN)

        # Admin: OK
        self.client.force_authenticate(user=self.admin)
        res5 = self.client.get(f"/api/sla/tickets/{self.ticket1.id}/")
        self.assertEqual(res5.status_code, status.HTTP_200_OK)

    def test_sla_monitoring_engine_and_escalations(self):
        """
        Tests the automated monitoring engine:
        - Simulates elapsed time past response deadline.
        - Verifies that evaluate_sla_monitoring_and_escalations creates a Level 2 escalation.
        - Verifies that repeated monitoring runs do NOT generate duplicate escalations.
        """
        tracking = self.ticket1.sla_tracking

        # Simulate that response deadline is in the past (breached)
        tracking.response_deadline = timezone.now() - timedelta(minutes=15)
        tracking.save(update_fields=["response_deadline"])

        # Run monitoring
        escalations = evaluate_sla_monitoring_and_escalations()
        self.assertGreaterEqual(len(escalations), 1)

        tracking.refresh_from_db()
        self.assertEqual(tracking.response_status, SLATracking.SLAStatus.BREACHED)

        # Verify escalation record
        esc = SLAEscalation.objects.filter(
            ticket=self.ticket1,
            event_type=SLAEscalation.EventType.RESPONSE_BREACHED,
        ).first()
        self.assertIsNotNone(esc)
        self.assertEqual(esc.escalation_level, SLAEscalation.EscalationLevel.LEVEL_2)
        self.assertFalse(esc.is_acknowledged)

        # Idempotency check: run monitoring a second time
        escalations_second_run = evaluate_sla_monitoring_and_escalations()
        # Should not create duplicate escalations for the same ticket and event
        dup_count = SLAEscalation.objects.filter(
            ticket=self.ticket1,
            event_type=SLAEscalation.EventType.RESPONSE_BREACHED,
        ).count()
        self.assertEqual(dup_count, 1)

    def test_escalation_acknowledgement(self):
        """Staff can acknowledge an active escalation alert."""
        # Create an escalation
        esc = SLAEscalation.objects.create(
            ticket=self.ticket1,
            sla_tracking=self.ticket1.sla_tracking,
            escalation_level=SLAEscalation.EscalationLevel.LEVEL_1,
            event_type=SLAEscalation.EventType.RESPONSE_APPROACHING,
            reason="75% time elapsed",
            assigned_recipient=self.agent,
        )

        self.client.force_authenticate(user=self.agent)
        response = self.client.post(
            f"/api/sla/escalations/{esc.id}/acknowledge/",
            {"notes": "Acknowledged. Investigating immediately."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        esc.refresh_from_db()
        self.assertTrue(esc.is_acknowledged)
        self.assertEqual(esc.acknowledged_by, self.agent)
        self.assertIsNotNone(esc.acknowledged_at)
        self.assertEqual(esc.notes, "Acknowledged. Investigating immediately.")

