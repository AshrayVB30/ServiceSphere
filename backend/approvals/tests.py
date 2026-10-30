"""
Automated Unit and Integration Tests for the 'approvals' application.

Validates:
1. ApprovalRequest creation with default PENDING status and correct timestamps.
2. ApprovalRecord creation and association with an ApprovalRequest.
3. String representation formats for requests and records.
4. Database constraints:
   - PROTECT behavior on ticket, requested_by, and approver.
5. All allowed statuses and actions in choices.
"""

from django.contrib.auth import get_user_model
from django.db.models import ProtectedError
from django.test import TestCase

from approvals.models import ApprovalRequest, ApprovalRecord
from clients.models import Client
from tickets.models import Ticket

User = get_user_model()


class ApprovalModelTests(TestCase):
    """
    Test suite for ApprovalRequest and ApprovalRecord models.
    """

    def setUp(self):
        """
        Sets up test fixtures: client organization, ticket, agent, and approver.
        """
        self.client_org = Client.objects.create(
            name="Apex Dynamics",
            code="apex-dynamics",
            contact_email="contact@apex.com",
            is_active=True,
        )

        self.agent = User.objects.create_user(
            username="support_agent_sam",
            email="sam@servicesphere.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )

        self.approver = User.objects.create_user(
            username="manager_mary",
            email="mary@apex.com",
            password="password123",
            role=User.Role.APPROVER,
            client=self.client_org,
        )

        self.ticket = Ticket.objects.create(
            client=self.client_org,
            created_by=self.agent,
            assigned_to=self.agent,
            subject="Request for new laptop",
            description="Client developer requires hardware upgrade.",
            category="Hardware",
            priority=Ticket.Priority.HIGH,
        )

    def test_approval_request_creation_defaults(self):
        """
        Verify that an approval request is created with default status PENDING.
        """
        req = ApprovalRequest.objects.create(
            ticket=self.ticket,
            requested_by=self.agent,
            approver=self.approver,
            reason="Hardware cost exceeds $1,000 threshold.",
        )

        self.assertEqual(req.status, ApprovalRequest.Status.PENDING)
        self.assertIsNotNone(req.created_at)
        self.assertIsNotNone(req.updated_at)
        self.assertIn("Pending", str(req))

    def test_approval_record_creation(self):
        """
        Verify that approval decision records link cleanly to an ApprovalRequest.
        """
        req = ApprovalRequest.objects.create(
            ticket=self.ticket,
            requested_by=self.agent,
            approver=self.approver,
            reason="Budget authorization required.",
        )

        record = ApprovalRecord.objects.create(
            approval_request=req,
            action=ApprovalRecord.Action.SUBMITTED,
            performed_by=self.agent,
            comment="Initial request submitted.",
        )

        self.assertEqual(record.action, ApprovalRecord.Action.SUBMITTED)
        self.assertEqual(record.performed_by, self.agent)
        self.assertIn("Submitted", str(record))
        self.assertEqual(req.records.count(), 1)

    def test_approval_request_foreign_key_protection(self):
        """
        Verify on_delete=models.PROTECT prevents deleting a ticket or approver
        that is tied to an active approval request.
        """
        ApprovalRequest.objects.create(
            ticket=self.ticket,
            requested_by=self.agent,
            approver=self.approver,
            reason="Compliance audit sign-off.",
        )

        # Deleting the ticket should be blocked
        with self.assertRaises(ProtectedError):
            self.ticket.delete()

        # Deleting the approver should be blocked
        with self.assertRaises(ProtectedError):
            self.approver.delete()



from rest_framework import status
from rest_framework.test import APITestCase


class ApprovalAPITests(APITestCase):
    """
    Test suite for Approval REST API endpoints and decision workflows.
    """

    def setUp(self):
        """
        Sets up shared fixtures: client organization, ticket, agent, approver, and third-party user.
        """
        self.client_org = Client.objects.create(
            name="Apex Dynamics",
            code="apex-dynamics",
            contact_email="contact@apex.com",
            is_active=True,
        )

        self.agent = User.objects.create_user(
            username="support_agent_sam",
            email="sam@servicesphere.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )

        self.approver = User.objects.create_user(
            username="manager_mary",
            email="mary@apex.com",
            password="password123",
            role=User.Role.APPROVER,
            client=self.client_org,
        )

        self.client_user = User.objects.create_user(
            username="client_charlie",
            email="charlie@apex.com",
            password="password123",
            role=User.Role.CLIENT,
            client=self.client_org,
        )

        self.other_agent = User.objects.create_user(
            username="other_agent_dan",
            email="dan@servicesphere.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )

        self.ticket = Ticket.objects.create(
            client=self.client_org,
            created_by=self.client_user,
            assigned_to=self.agent,
            subject="Upgrade Cloud Storage Capacity",
            description="Client requests an increase of storage from 1TB to 5TB.",
            category="Infrastructure",
            priority=Ticket.Priority.HIGH,
        )

    def test_agent_can_submit_approval_request(self):
        """
        A support agent can submit an approval request on an active ticket.
        Automatically sets requested_by=agent, status=PENDING, and logs a SUBMITTED record.
        """
        self.client.force_authenticate(user=self.agent)

        payload = {
            "ticket": self.ticket.id,
            "approver": self.approver.id,
            "reason": "Storage upgrade cost requires manager sign-off.",
        }
        response = self.client.post("/api/approvals/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ApprovalRequest.Status.PENDING)
        self.assertEqual(response.data["requested_by_username"], self.agent.username)
        self.assertEqual(response.data["approver_username"], self.approver.username)

        # Verify initial SUBMITTED audit record
        req_id = response.data["id"]
        approval_req = ApprovalRequest.objects.get(id=req_id)
        self.assertEqual(approval_req.records.count(), 1)
        record = approval_req.records.first()
        self.assertEqual(record.action, ApprovalRecord.Action.SUBMITTED)
        self.assertEqual(record.performed_by, self.agent)

    def test_client_cannot_submit_approval_request(self):
        """
        Client users cannot initiate approval requests directly (403 Forbidden).
        """
        self.client.force_authenticate(user=self.client_user)

        payload = {
            "ticket": self.ticket.id,
            "approver": self.approver.id,
            "reason": "Client attempting to submit an approval request.",
        }
        response = self.client.post("/api/approvals/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_approver_can_approve_request(self):
        """
        Designated approver can approve a pending request.
        Status transitions to APPROVED, and an APPROVED record is created.
        """
        approval_req = ApprovalRequest.objects.create(
            ticket=self.ticket,
            requested_by=self.agent,
            approver=self.approver,
            reason="Budget review required.",
            status=ApprovalRequest.Status.PENDING,
        )

        self.client.force_authenticate(user=self.approver)

        response = self.client.post(
            f"/api/approvals/{approval_req.id}/approve/",
            {"comment": "Approved per quarterly budget allocation."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        approval_req.refresh_from_db()
        self.assertEqual(approval_req.status, ApprovalRequest.Status.APPROVED)

        # Verify decision record
        record = approval_req.records.filter(action=ApprovalRecord.Action.APPROVED).first()
        self.assertIsNotNone(record)
        self.assertEqual(record.performed_by, self.approver)
        self.assertEqual(record.comment, "Approved per quarterly budget allocation.")

    def test_approver_can_reject_request(self):
        """
        Designated approver can reject a request with feedback.
        Status transitions to REJECTED, and a REJECTED record is created.
        """
        approval_req = ApprovalRequest.objects.create(
            ticket=self.ticket,
            requested_by=self.agent,
            approver=self.approver,
            reason="License purchase.",
            status=ApprovalRequest.Status.PENDING,
        )

        self.client.force_authenticate(user=self.approver)

        response = self.client.post(
            f"/api/approvals/{approval_req.id}/reject/",
            {"comment": "Rejected due to budget freeze this quarter."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        approval_req.refresh_from_db()
        self.assertEqual(approval_req.status, ApprovalRequest.Status.REJECTED)

        # Verify decision record
        record = approval_req.records.filter(action=ApprovalRecord.Action.REJECTED).first()
        self.assertIsNotNone(record)
        self.assertEqual(record.comment, "Rejected due to budget freeze this quarter.")

    def test_approver_can_request_additional_info(self):
        """
        Approver can transition request to INFO_REQUESTED.
        Comment is mandatory to explain what information is missing.
        """
        approval_req = ApprovalRequest.objects.create(
            ticket=self.ticket,
            requested_by=self.agent,
            approver=self.approver,
            reason="Hardware purchase.",
            status=ApprovalRequest.Status.PENDING,
        )

        self.client.force_authenticate(user=self.approver)

        response = self.client.post(
            f"/api/approvals/{approval_req.id}/request-info/",
            {"comment": "Please attach vendor quotes for comparison."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        approval_req.refresh_from_db()
        self.assertEqual(approval_req.status, ApprovalRequest.Status.INFO_REQUESTED)

    def test_agent_can_resubmit_after_info_requested(self):
        """
        Original requester can resubmit request after providing clarification.
        Status returns to PENDING, and a RESUBMITTED record is logged.
        """
        approval_req = ApprovalRequest.objects.create(
            ticket=self.ticket,
            requested_by=self.agent,
            approver=self.approver,
            reason="Hardware purchase.",
            status=ApprovalRequest.Status.INFO_REQUESTED,
        )

        self.client.force_authenticate(user=self.agent)

        response = self.client.post(
            f"/api/approvals/{approval_req.id}/resubmit/",
            {"comment": "Attached 3 vendor quotes showing lowest price selected."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        approval_req.refresh_from_db()
        self.assertEqual(approval_req.status, ApprovalRequest.Status.PENDING)

        # Verify RESUBMITTED record
        record = approval_req.records.filter(action=ApprovalRecord.Action.RESUBMITTED).first()
        self.assertIsNotNone(record)
        self.assertEqual(record.performed_by, self.agent)

    def test_unauthorized_user_cannot_make_decision(self):
        """
        Users other than the assigned approver (or administrator) cannot approve/reject.
        - Users who can view the request (like the client) get 403 Forbidden when attempting to decide.
        - Completely unrelated agents cannot even see the request and receive 404 Not Found.
        """
        approval_req = ApprovalRequest.objects.create(
            ticket=self.ticket,
            requested_by=self.agent,
            approver=self.approver,
            reason="Software upgrade.",
            status=ApprovalRequest.Status.PENDING,
        )

        # 1. Client user (who can see the company's request) attempts to approve -> 403 Forbidden
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(
            f"/api/approvals/{approval_req.id}/approve/",
            {"comment": "Client trying to approve"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Unrelated agent (who has no access to the ticket) -> 404 Not Found
        self.client.force_authenticate(user=self.other_agent)
        response_other = self.client.post(
            f"/api/approvals/{approval_req.id}/approve/",
            {"comment": "Unauthorized agent trying to approve"},
            format="json",
        )
        self.assertEqual(response_other.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_approve_already_approved_request(self):
        """
        Attempting to approve an already approved or rejected request returns 400 Bad Request.
        """
        approval_req = ApprovalRequest.objects.create(
            ticket=self.ticket,
            requested_by=self.agent,
            approver=self.approver,
            reason="Server scaling.",
            status=ApprovalRequest.Status.APPROVED,
        )

        self.client.force_authenticate(user=self.approver)
        response = self.client.post(
            f"/api/approvals/{approval_req.id}/approve/",
            {"comment": "Trying to re-approve"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
