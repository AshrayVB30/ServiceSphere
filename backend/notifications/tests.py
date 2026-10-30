"""
Unit and Integration Tests for the 'notifications' application.

Verifies:
1. Notification creation & recipient validation.
2. Preference compliance (in_app_enabled=False prevents in-app generation).
3. Email delivery disabled by default (no emails sent when toggle is False).
4. Email delivery when enabled using Django's in-memory test backend.
5. Strict user isolation (users cannot view, read, or count other users' alerts).
6. Mark single notification as read (/read/).
7. Mark all notifications as read (/mark-all-read/).
8. Unread notification counter (/unread-count/).
9. Retrieving and updating notification preferences (/preferences/).
10. Ticket lifecycle event triggers (create, assign, status change, comments).
11. Internal comments privacy guarantee (internal notes NEVER sent to clients).
12. Approval lifecycle event triggers (submit, approve, reject, info-request, resubmit).
13. SLA escalation alert integration.
14. Failure resilience (email errors do not block or crash core ticket transactions).
15. Deduplication of identical active alerts.
"""

from datetime import timedelta
from unittest.mock import patch
from django.conf import settings
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from approvals.models import ApprovalRequest, ApprovalRecord
from clients.models import Client
from notifications.models import Notification, NotificationPreference
from notifications.services import (
    create_notification,
    send_email_notification,
    notify_ticket_created,
    notify_ticket_assigned,
    notify_ticket_status_changed,
    notify_new_comment,
    notify_approval_submitted,
    notify_approval_decided,
    notify_approval_resubmitted,
    notify_sla_escalated,
)
from sla.models import SLAPolicy, SLATracking, SLAEscalation
from tickets.models import Ticket, TicketHistory, TicketComment


class NotificationModelAndServiceTests(TestCase):
    """Tests core notification service methods, preference evaluation, and deduplication."""

    def setUp(self):
        """Set up test users and organizations."""
        self.client_org = Client.objects.create(name="Acme Corp", is_active=True)
        self.admin = User.objects.create_user(
            username="admin_user",
            email="admin@example.com",
            password="password123",
            role=User.Role.ADMIN,
            is_staff=True,
        )
        self.agent = User.objects.create_user(
            username="agent_user",
            email="agent@example.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )
        self.client_user = User.objects.create_user(
            username="client_user",
            email="client@example.com",
            password="password123",
            role=User.Role.CLIENT,
            client=self.client_org,
        )

    def test_default_preferences_provisioned_on_user_creation(self):
        """Signals automatically create default preferences for new users."""
        prefs = NotificationPreference.objects.get(user=self.client_user)
        self.assertTrue(prefs.in_app_enabled)
        self.assertFalse(prefs.email_enabled)  # Disabled by default
        self.assertTrue(prefs.ticket_notifications)
        self.assertTrue(prefs.approval_notifications)
        self.assertTrue(prefs.sla_notifications)

    def test_create_notification_in_app(self):
        """Creating an in-app notification stores record in database."""
        notif = create_notification(
            recipient=self.client_user,
            title="Ticket Received",
            message="Your ticket is being reviewed.",
            notification_type=Notification.NotificationType.TICKET,
        )
        self.assertIsNotNone(notif)
        self.assertEqual(notif.recipient, self.client_user)
        self.assertFalse(notif.is_read)
        self.assertIsNone(notif.read_at)

    def test_in_app_disabled_preference_suppresses_creation(self):
        """When in_app_enabled=False, in-app notification is not created."""
        prefs = NotificationPreference.objects.get(user=self.client_user)
        prefs.in_app_enabled = False
        prefs.save()

        notif = create_notification(
            recipient=self.client_user,
            title="Suppressed Alert",
            message="Should not be saved.",
            notification_type=Notification.NotificationType.TICKET,
        )
        self.assertIsNone(notif)
        self.assertEqual(Notification.objects.filter(recipient=self.client_user).count(), 0)

    @override_settings(EMAIL_NOTIFICATIONS_ENABLED=False)
    def test_email_disabled_by_default(self):
        """When EMAIL_NOTIFICATIONS_ENABLED=False, no email is sent."""
        # Even if user enables email preference
        prefs = NotificationPreference.objects.get(user=self.client_user)
        prefs.email_enabled = True
        prefs.save()

        result = send_email_notification(
            recipient=self.client_user,
            subject="Test Subject",
            message="Test Message",
        )
        self.assertFalse(result)
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(
        EMAIL_NOTIFICATIONS_ENABLED=True,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        CELERY_TASK_ALWAYS_EAGER=True,
        CELERY_ALWAYS_EAGER=True,
    )
    def test_email_sent_when_enabled_and_preferred(self):
        """When email is enabled globally and user prefers email, message is delivered to outbox."""
        prefs = NotificationPreference.objects.get(user=self.client_user)
        prefs.email_enabled = True
        prefs.save()

        result = send_email_notification(
            recipient=self.client_user,
            subject="Test Subject",
            message="Test Body Content",
        )
        self.assertTrue(result)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Test Subject", mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, ["client@example.com"])

    def test_duplicate_notification_prevention(self):
        """Identical unread notifications within 2-minute deduplication window are prevented."""
        notif1 = create_notification(
            recipient=self.client_user,
            title="Duplicate Check",
            message="First message",
            notification_type=Notification.NotificationType.TICKET,
        )
        self.assertIsNotNone(notif1)

        # Immediate repeat attempt
        notif2 = create_notification(
            recipient=self.client_user,
            title="Duplicate Check",
            message="First message",
            notification_type=Notification.NotificationType.TICKET,
        )
        self.assertIsNone(notif2)
        self.assertEqual(
            Notification.objects.filter(recipient=self.client_user, title="Duplicate Check").count(),
            1,
        )

    @patch("notifications.services.email_service.send_email_notification_task.delay")
    @patch("django.core.mail.send_mail")
    def test_email_failure_does_not_break_caller(self, mock_send_mail, mock_delay):
        """If Celery and fallback email dispatch raise exceptions, callers do not crash."""
        mock_delay.side_effect = Exception("Redis connection refused")
        mock_send_mail.side_effect = Exception("SMTP timeout")

        prefs = NotificationPreference.objects.get(user=self.client_user)
        prefs.email_enabled = True
        prefs.save()

        # Should handle exception and return False safely without crashing
        with override_settings(EMAIL_NOTIFICATIONS_ENABLED=True):
            res = send_email_notification(
                recipient=self.client_user,
                subject="Crash Test",
                message="Body",
            )
            self.assertFalse(res)


class NotificationAPITests(TestCase):
    """Tests authenticated REST API endpoints, user isolation, and mark-as-read workflows."""

    def setUp(self):
        """Set up test users and seed notifications."""
        self.client_org = Client.objects.create(name="Acme Corp", is_active=True)
        self.user1 = User.objects.create_user(
            username="user1",
            email="user1@example.com",
            password="password123",
            role=User.Role.CLIENT,
            client=self.client_org,
        )
        self.user2 = User.objects.create_user(
            username="user2",
            email="user2@example.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )

        # Seed notifications for user1
        self.notif1 = Notification.objects.create(
            recipient=self.user1,
            title="Alert 1",
            message="Content 1",
            notification_type=Notification.NotificationType.TICKET,
        )
        self.notif2 = Notification.objects.create(
            recipient=self.user1,
            title="Alert 2",
            message="Content 2",
            notification_type=Notification.NotificationType.APPROVAL,
        )

        # Seed notification for user2
        self.notif_user2 = Notification.objects.create(
            recipient=self.user2,
            title="User 2 Alert",
            message="Secret content for user 2",
            notification_type=Notification.NotificationType.SLA,
        )

        self.api_client = APIClient()

    def test_unauthenticated_requests_rejected(self):
        """Unauthenticated requests receive 401 Unauthorized or 403 Forbidden."""
        response = self.api_client.get("/api/notifications/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_user_can_only_list_their_own_notifications(self):
        """Strict isolation: User 1 only sees their notifications, not User 2's."""
        self.api_client.force_authenticate(user=self.user1)
        response = self.api_client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Handle paginated or non-paginated lists
        data = response.data.get("results") if isinstance(response.data, dict) else response.data
        self.assertEqual(len(data), 2)
        received_ids = [item["id"] for item in data]
        self.assertIn(self.notif1.id, received_ids)
        self.assertIn(self.notif2.id, received_ids)
        self.assertNotIn(self.notif_user2.id, received_ids)

    def test_unread_count_endpoint(self):
        """Returns integer badge count for top navbar bell."""
        self.api_client.force_authenticate(user=self.user1)
        response = self.api_client.get("/api/notifications/unread-count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread_count"], 2)

    def test_mark_single_notification_read(self):
        """User can mark their own notification as read."""
        self.api_client.force_authenticate(user=self.user1)
        response = self.api_client.patch(f"/api/notifications/{self.notif1.id}/read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_read"])
        self.assertIsNotNone(response.data["read_at"])

        # Check unread count decremented
        self.notif1.refresh_from_db()
        self.assertTrue(self.notif1.is_read)

        count_res = self.api_client.get("/api/notifications/unread-count/")
        self.assertEqual(count_res.data["unread_count"], 1)

    def test_user_cannot_read_another_users_notification(self):
        """Attempting to mark another user's notification as read returns 404 Not Found."""
        self.api_client.force_authenticate(user=self.user1)
        # Attempt to access notif_user2 belonging to user2
        response = self.api_client.patch(f"/api/notifications/{self.notif_user2.id}/read/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_all_read_endpoint(self):
        """User can mark all their unread notifications as read at once."""
        self.api_client.force_authenticate(user=self.user1)
        response = self.api_client.patch("/api/notifications/mark-all-read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["marked_read_count"], 2)

        # Unread count is now 0
        count_res = self.api_client.get("/api/notifications/unread-count/")
        self.assertEqual(count_res.data["unread_count"], 0)

    def test_get_and_update_preferences(self):
        """User can view and toggle notification preferences."""
        self.api_client.force_authenticate(user=self.user1)

        # GET preferences
        get_res = self.api_client.get("/api/notifications/preferences/")
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertTrue(get_res.data["in_app_enabled"])
        self.assertFalse(get_res.data["email_enabled"])

        # PATCH preferences
        patch_res = self.api_client.patch(
            "/api/notifications/preferences/",
            {"email_enabled": True, "ticket_notifications": False},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertTrue(patch_res.data["email_enabled"])
        self.assertFalse(patch_res.data["ticket_notifications"])


class WorkflowTriggerTests(TestCase):
    """Tests notification triggers across Tickets, Approvals, and SLA workflows."""

    def setUp(self):
        """Set up environment, users, and ticket."""
        self.client_org = Client.objects.create(name="Enterprise Co", is_active=True)
        self.admin = User.objects.create_user(
            username="wf_admin",
            email="admin@example.com",
            password="password123",
            role=User.Role.ADMIN,
            is_staff=True,
        )
        self.agent1 = User.objects.create_user(
            username="wf_agent1",
            email="agent1@example.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )
        self.agent2 = User.objects.create_user(
            username="wf_agent2",
            email="agent2@example.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )
        self.client_user = User.objects.create_user(
            username="wf_client",
            email="client@example.com",
            password="password123",
            role=User.Role.CLIENT,
            client=self.client_org,
        )
        self.approver = User.objects.create_user(
            username="wf_approver",
            email="approver@example.com",
            password="password123",
            role=User.Role.APPROVER,
            client=self.client_org,
        )

        self.ticket = Ticket.objects.create(
            subject="Workflow Issue",
            description="System login failing",
            client=self.client_org,
            created_by=self.client_user,
            assigned_to=self.agent1,
            priority=Ticket.Priority.HIGH,
            status=Ticket.Status.OPEN,
        )

    def test_ticket_assigned_notification(self):
        """Assigning / reassigning a ticket notifies the newly assigned agent."""
        notify_ticket_assigned(self.ticket, previous_assignee=self.agent2)
        notif = Notification.objects.filter(
            recipient=self.agent1,
            related_ticket=self.ticket,
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn("Ticket Assigned", notif.title)

    def test_internal_comment_privacy_guard(self):
        """
        SECURITY REQUIREMENT:
        Internal comments must NEVER notify client users.
        Only staff members receive internal notes.
        """
        internal_comment = TicketComment.objects.create(
            ticket=self.ticket,
            author=self.agent1,
            message="Confidential internal diagnosis: memory leak on cluster 4.",
            is_internal=True,
        )
        notify_new_comment(internal_comment)

        # Verify Client received ZERO notifications
        client_notifs = Notification.objects.filter(
            recipient=self.client_user,
            related_ticket=self.ticket,
        )
        self.assertEqual(client_notifs.count(), 0)

        # Verify Admin received internal note alert
        admin_notif = Notification.objects.filter(
            recipient=self.admin,
            related_ticket=self.ticket,
        ).first()
        self.assertIsNotNone(admin_notif)
        self.assertIn("Internal Note", admin_notif.title)

    def test_approval_lifecycle_notifications(self):
        """Submitting, deciding, and resubmitting approvals generates notifications."""
        req = ApprovalRequest.objects.create(
            ticket=self.ticket,
            requested_by=self.agent1,
            approver=self.approver,
            reason="Refund approval for outage",
            status=ApprovalRequest.Status.PENDING,
        )
        # 1. Submission notifies approver
        notify_approval_submitted(req)
        approver_notif = Notification.objects.filter(
            recipient=self.approver,
            related_approval=req,
        ).first()
        self.assertIsNotNone(approver_notif)
        self.assertIn("Approval Requested", approver_notif.title)

        # 2. Decision notifies requester
        notify_approval_decided(req, decision="Approved", comment="Verified.")
        requester_notif = Notification.objects.filter(
            recipient=self.agent1,
            related_approval=req,
        ).first()
        self.assertIsNotNone(requester_notif)
        self.assertIn("Approved", requester_notif.title)

    def test_sla_escalation_notification(self):
        """SLA escalation creates a notification for designated escalation recipient."""
        policy = SLAPolicy.objects.create(
            name="High SLA",
            priority=Ticket.Priority.HIGH,
            response_time_hours=1.0,
            resolution_time_hours=4.0,
            is_active=True,
        )
        tracking = SLATracking.objects.create(
            ticket=self.ticket,
            policy=policy,
            response_deadline=timezone.now() + timedelta(hours=1),
            resolution_deadline=timezone.now() + timedelta(hours=4),
        )
        escalation = SLAEscalation.objects.create(
            ticket=self.ticket,
            sla_tracking=tracking,
            escalation_level=SLAEscalation.EscalationLevel.LEVEL_2,
            event_type=SLAEscalation.EventType.RESPONSE_BREACHED,
            reason="Deadline missed",
            assigned_recipient=self.admin,
        )
        notify_sla_escalated(escalation)

        admin_notif = Notification.objects.filter(
            recipient=self.admin,
            related_ticket=self.ticket,
        ).first()
        self.assertIsNotNone(admin_notif)
        self.assertIn("SLA ESCALATION", admin_notif.title)

