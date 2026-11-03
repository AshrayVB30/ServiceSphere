"""
Comprehensive Unit and Integration Test Suite for the 'analytics' application.

Covers:
1. Security & Role-Based Permissions (Admin, Agent, Client isolation).
2. Ticket Analytics Calculations (status breakdown, priority, category, timeline trends).
3. Agent Performance Analytics (workload distribution, resolution velocity, personal scorecard).
4. SLA Adherence Analytics (governed count, compliance percentage, overdue tickets, breaches).
5. KPI & KRA Management (CRUD, agent validation, effective targets, directional achievement).
6. Automated KPI Evaluation Workflow.
7. RFC 4180 CSV Report Export Streaming.
8. Zero-Division & Edge Case Robustness (empty database, 0-target metrics).
"""

# Import datetime and timezone utilities
from datetime import date, timedelta
# Import Decimal for metric precision
from decimal import Decimal

# Import Django test client and TestCase
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

# Import client organization model
from clients.models import Client
# Import tickets and SLA models
from tickets.models import Ticket
from sla.models import SLAPolicy, SLATracking
# Import analytics models
from analytics.models import (
    KRA,
    KPI,
    KRAAssignment,
    KPIAssignment,
    KPIPerformanceRecord,
)
# Import calculation engine
from analytics.services import calculate_kpi_achievement

# Resolve custom User model
User = get_user_model()


class AnalyticsBaseTestCase(TestCase):
    """
    Base test fixture setting up users, clients, tickets, SLA policies, and KPI definitions.
    """

    def setUp(self):
        # Initialize test REST API client
        self.client = APIClient()

        # 1. Create System Administrator
        self.admin_user = User.objects.create_user(
            username="admin_user",
            email="admin@example.com",
            password="SecurePassword123!",
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True,
        )

        # 2. Create Support Agent 1
        self.agent_1 = User.objects.create_user(
            username="agent_sarah",
            email="sarah@example.com",
            first_name="Sarah",
            last_name="Connor",
            password="SecurePassword123!",
            role=User.Role.SUPPORT_AGENT,
        )

        # 3. Create Support Agent 2
        self.agent_2 = User.objects.create_user(
            username="agent_john",
            email="john@example.com",
            first_name="John",
            last_name="Doe",
            password="SecurePassword123!",
            role=User.Role.SUPPORT_AGENT,
        )

        # 4. Create Client Organization
        self.client_org = Client.objects.create(
            name="Apex Dynamics Corp",
            code="apex-dynamics",
            contact_email="billing@apexdynamics.com",
            is_active=True,
        )

        # 5. Create External Client User
        self.client_user = User.objects.create_user(
            username="client_user",
            email="client@apexdynamics.com",
            password="SecurePassword123!",
            role=User.Role.CLIENT,
            client=self.client_org,
        )

        # 6. Create Approver User
        self.approver_user = User.objects.create_user(
            username="approver_user",
            email="approver@example.com",
            password="SecurePassword123!",
            role=User.Role.APPROVER,
        )

        # 7. Create SLA Policies for Priorities
        self.sla_policy_urgent = SLAPolicy.objects.create(
            name="Urgent SLA Policy",
            priority=Ticket.Priority.URGENT,
            response_time_hours=Decimal("1.00"),
            resolution_time_hours=Decimal("4.00"),
            is_active=True,
        )
        self.sla_policy_medium = SLAPolicy.objects.create(
            name="Medium SLA Policy",
            priority=Ticket.Priority.MEDIUM,
            response_time_hours=Decimal("4.00"),
            resolution_time_hours=Decimal("24.00"),
            is_active=True,
        )

        # 8. Create Sample Help Desk Tickets
        now = timezone.now()

        # Ticket 1: Urgent priority, assigned to Agent 1, resolved
        self.ticket_1 = Ticket.objects.create(
            client=self.client_org,
            created_by=self.client_user,
            assigned_to=self.agent_1,
            subject="Database cluster latency",
            description="High latency on production query pool.",
            category="Infrastructure",
            priority=Ticket.Priority.URGENT,
            status=Ticket.Status.RESOLVED,
            resolved_at=now - timedelta(hours=2),
        )
        # SLA Tracking for Ticket 1: Compliant
        self.sla_1 = SLATracking.objects.create(
            ticket=self.ticket_1,
            policy=self.sla_policy_urgent,
            response_deadline=now - timedelta(hours=3),
            actual_response_at=now - timedelta(hours=3, minutes=30),
            resolution_deadline=now + timedelta(hours=1),
            actual_resolution_at=now - timedelta(hours=2),
            response_status=SLATracking.SLAStatus.COMPLETED,
            resolution_status=SLATracking.SLAStatus.COMPLETED,
        )

        # Ticket 2: Medium priority, assigned to Agent 1, open
        self.ticket_2 = Ticket.objects.create(
            client=self.client_org,
            created_by=self.client_user,
            assigned_to=self.agent_1,
            subject="Billing invoice clarification",
            description="Requesting tax breakdown.",
            category="Billing",
            priority=Ticket.Priority.MEDIUM,
            status=Ticket.Status.OPEN,
        )
        # SLA Tracking for Ticket 2: Breached response
        self.sla_2 = SLATracking.objects.create(
            ticket=self.ticket_2,
            policy=self.sla_policy_medium,
            response_deadline=now - timedelta(hours=5),
            actual_response_at=None,
            resolution_deadline=now + timedelta(hours=19),
            actual_resolution_at=None,
            response_status=SLATracking.SLAStatus.BREACHED,
            resolution_status=SLATracking.SLAStatus.WITHIN_SLA,
        )

        # Ticket 3: Medium priority, assigned to Agent 2, in progress
        self.ticket_3 = Ticket.objects.create(
            client=self.client_org,
            created_by=self.client_user,
            assigned_to=self.agent_2,
            subject="Password reset malfunction",
            description="Users unable to reset via SSO link.",
            category="Authentication",
            priority=Ticket.Priority.MEDIUM,
            status=Ticket.Status.IN_PROGRESS,
        )
        # SLA Tracking for Ticket 3: Compliant so far
        self.sla_3 = SLATracking.objects.create(
            ticket=self.ticket_3,
            policy=self.sla_policy_medium,
            response_deadline=now + timedelta(hours=2),
            actual_response_at=now - timedelta(minutes=30),
            resolution_deadline=now + timedelta(hours=20),
            actual_resolution_at=None,
            response_status=SLATracking.SLAStatus.COMPLETED,
            resolution_status=SLATracking.SLAStatus.WITHIN_SLA,
        )

        # 9. Create KRA and KPI Fixtures
        self.kra_quality = KRA.objects.create(
            name="Customer Satisfaction & Quality",
            code="csat-quality",
            description="Delivering prompt, high-quality ticket responses.",
            measurable_objective="Maintain CSAT above 95% and response times under SLA thresholds.",
            weightage=40,
            is_active=True,
        )
        self.kpi_res_rate = KPI.objects.create(
            kra=self.kra_quality,
            name="Ticket Resolution Rate",
            code="RESOLUTION_RATE",
            description="Percentage of assigned tickets successfully resolved.",
            metric_type=KPI.MetricType.PERCENTAGE,
            target_direction=KPI.TargetDirection.HIGHER_IS_BETTER,
            default_target_value=Decimal("90.00"),
            evaluation_period=KPI.EvaluationPeriod.MONTHLY,
            is_active=True,
        )
        self.kpi_resp_time = KPI.objects.create(
            kra=self.kra_quality,
            name="Average First Response Time",
            code="AVG_RESPONSE_HOURS",
            description="Mean hours to deliver first response.",
            metric_type=KPI.MetricType.TIME_HOURS,
            target_direction=KPI.TargetDirection.LOWER_IS_BETTER,
            default_target_value=Decimal("2.00"),
            evaluation_period=KPI.EvaluationPeriod.MONTHLY,
            is_active=True,
        )

        # 10. Assign KPI to Agent 1
        self.assignment_1 = KPIAssignment.objects.create(
            kpi=self.kpi_res_rate,
            agent=self.agent_1,
            custom_target_value=Decimal("85.00"),
            assigned_by=self.admin_user,
            is_active=True,
        )


class PermissionsAndSecurityTests(AnalyticsBaseTestCase):
    """
    Verifies that external clients and approvers cannot access internal analytics,
    and support agents can only view authorized resources.
    """

    def test_client_cannot_access_analytics_dashboard(self):
        """External client accounts receive 403 Forbidden on dashboard."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get("/api/analytics/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_client_cannot_access_ticket_analytics(self):
        """External client accounts receive 403 Forbidden on ticket analytics."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get("/api/analytics/tickets/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_client_cannot_access_agent_leaderboard(self):
        """External client accounts receive 403 Forbidden on agent leaderboard."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get("/api/analytics/agents/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_approver_cannot_access_sla_analytics(self):
        """Approvers receive 403 Forbidden on internal SLA analytics."""
        self.client.force_authenticate(user=self.approver_user)
        response = self.client.get("/api/analytics/sla/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_agent_can_view_own_performance_scorecard(self):
        """Support agents can view their own personal scorecard."""
        self.client.force_authenticate(user=self.agent_1)
        response = self.client.get(f"/api/analytics/agents/{self.agent_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["agent_id"], self.agent_1.id)
        self.assertEqual(response.data["username"], self.agent_1.username)

    def test_agent_cannot_view_other_agent_scorecard(self):
        """Support agents receive 403 Forbidden when requesting another agent's scorecard."""
        self.client.force_authenticate(user=self.agent_1)
        response = self.client.get(f"/api/analytics/agents/{self.agent_2.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_agent_cannot_view_leaderboard(self):
        """Support agents receive 403 Forbidden when accessing the full leaderboard."""
        self.client.force_authenticate(user=self.agent_1)
        response = self.client.get("/api/analytics/agents/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_has_full_access_to_leaderboard(self):
        """System Administrators can access the full agent leaderboard."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/analytics/agents/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("leaderboard", response.data)
        self.assertEqual(len(response.data["leaderboard"]), 2)


class TicketAnalyticsTests(AnalyticsBaseTestCase):
    """
    Verifies ticket summary, priority breakdown, category breakdown, and trends.
    """

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin_user)

    def test_ticket_summary_metrics(self):
        """Ticket summary correctly aggregates counts and status breakdown."""
        response = self.client.get("/api/analytics/tickets/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data["summary"]

        self.assertEqual(summary["total_tickets"], 3)
        self.assertEqual(summary["active_tickets"], 2)  # 1 OPEN + 1 IN_PROGRESS
        self.assertEqual(summary["completed_tickets"], 1)  # 1 RESOLVED
        self.assertEqual(summary["status_breakdown"]["open"], 1)
        self.assertEqual(summary["status_breakdown"]["in_progress"], 1)
        self.assertEqual(summary["status_breakdown"]["resolved"], 1)
        self.assertAlmostEqual(summary["completion_rate_percentage"], 33.33, places=2)

    def test_tickets_grouped_by_priority(self):
        """Tickets grouped by priority returns valid counts and percentages."""
        response = self.client.get("/api/analytics/tickets/")
        by_priority = response.data["by_priority"]

        # Medium: 2 tickets, Urgent: 1 ticket
        med_entry = next((item for item in by_priority if item["priority"] == "MEDIUM"), None)
        urg_entry = next((item for item in by_priority if item["priority"] == "URGENT"), None)

        self.assertIsNotNone(med_entry)
        self.assertEqual(med_entry["count"], 2)
        self.assertAlmostEqual(med_entry["percentage"], 66.67, places=2)

        self.assertIsNotNone(urg_entry)
        self.assertEqual(urg_entry["count"], 1)
        self.assertAlmostEqual(urg_entry["percentage"], 33.33, places=2)

    def test_tickets_grouped_by_category(self):
        """Tickets grouped by category returns distinct category counts."""
        response = self.client.get("/api/analytics/tickets/")
        by_cat = response.data["by_category"]

        categories = {item["category"]: item["count"] for item in by_cat}
        self.assertEqual(categories.get("Infrastructure"), 1)
        self.assertEqual(categories.get("Billing"), 1)
        self.assertEqual(categories.get("Authentication"), 1)

    def test_ticket_trends_timeline(self):
        """Ticket trends endpoint returns chronological created and resolved counts."""
        response = self.client.get("/api/analytics/tickets/trends/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("timeline", response.data)
        self.assertTrue(len(response.data["timeline"]) >= 1)

    def test_ticket_analytics_date_filtering(self):
        """Date filtering limits ticket analytics to specified window."""
        yesterday = (timezone.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")

        response = self.client.get(f"/api/analytics/tickets/?start_date={yesterday}&end_date={tomorrow}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["total_tickets"], 3)


class AgentPerformanceAnalyticsTests(AnalyticsBaseTestCase):
    """
    Verifies agent workload, resolution rate, and scorecard metrics.
    """

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin_user)

    def test_agent_performance_scorecard(self):
        """Agent 1 scorecard correctly reports assigned, resolved, and pending counts."""
        response = self.client.get(f"/api/analytics/agents/{self.agent_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(data["total_assigned"], 2)
        self.assertEqual(data["resolved_tickets"], 1)
        self.assertEqual(data["pending_tickets"], 1)
        self.assertEqual(data["resolution_rate_percentage"], 50.0)
        self.assertEqual(data["sla_governed_tickets"], 2)
        self.assertEqual(data["sla_breached_tickets"], 1)
        self.assertEqual(data["sla_compliant_tickets"], 1)
        self.assertEqual(data["sla_compliance_rate_percentage"], 50.0)

    def test_agent_leaderboard_workload_distribution(self):
        """Leaderboard computes workload distribution percentages across agents."""
        response = self.client.get("/api/analytics/agents/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        leaderboard = response.data["leaderboard"]

        # Total active tickets = 2 (1 assigned to Sarah, 1 assigned to John)
        self.assertEqual(response.data["total_active_workload"], 2)

        for agent_entry in leaderboard:
            self.assertEqual(agent_entry["pending_tickets"], 1)
            self.assertEqual(agent_entry["workload_distribution_percentage"], 50.0)


class SLAAnalyticsTests(AnalyticsBaseTestCase):
    """
    Verifies SLA compliance percentage, overdue tickets, and breach listings.
    """

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin_user)

    def test_sla_summary_compliance_calculation(self):
        """SLA summary calculates governed, compliant, breached, and compliance %."""
        response = self.client.get("/api/analytics/sla/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data["summary"]

        self.assertEqual(summary["total_governed_tickets"], 3)
        self.assertEqual(summary["breached_tickets"], 1)  # Ticket 2 breached response
        self.assertEqual(summary["compliant_tickets"], 2)  # Tickets 1 and 3 compliant
        self.assertAlmostEqual(summary["compliance_percentage"], 66.67, places=2)

    def test_sla_breaches_list(self):
        """SLA breaches endpoint lists tickets that breached response or resolution targets."""
        response = self.client.get("/api/analytics/sla/breaches/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["breaches_count"], 1)
        self.assertEqual(response.data["breaches"][0]["ticket_id"], self.ticket_2.id)
        self.assertEqual(response.data["breaches"][0]["response_status"], "BREACHED")

    def test_sla_breakdown_by_priority(self):
        """SLA breakdown by priority reports compliance for each tier."""
        response = self.client.get("/api/analytics/sla/")
        by_priority = response.data["by_priority"]

        urg_tier = next(item for item in by_priority if item["priority"] == "URGENT")
        med_tier = next(item for item in by_priority if item["priority"] == "MEDIUM")

        self.assertEqual(urg_tier["total_tickets"], 1)
        self.assertEqual(urg_tier["compliance_percentage"], 100.0)

        self.assertEqual(med_tier["total_tickets"], 2)
        self.assertEqual(med_tier["breached_tickets"], 1)
        self.assertEqual(med_tier["compliance_percentage"], 50.0)


class KPIAndKRAManagementTests(AnalyticsBaseTestCase):
    """
    Verifies KRA and KPI CRUD operations, agent assignments, and directional calculations.
    """

    def test_admin_can_create_kra(self):
        """Administrator can create a new Key Result Area."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Incident Resolution Velocity",
            "description": "Accelerating ticket turnover without sacrificing quality.",
            "measurable_objective": "Average resolution time under 12 hours.",
            "weightage": 30,
            "is_active": True,
        }
        response = self.client.post("/api/analytics/kras/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], payload["name"])
        self.assertEqual(response.data["weightage"], 30)

    def test_agent_cannot_create_kra(self):
        """Support agents receive 403 Forbidden when creating a KRA."""
        self.client.force_authenticate(user=self.agent_1)
        payload = {
            "name": "Unauthorized KRA",
            "measurable_objective": "Test",
            "weightage": 20,
        }
        response = self.client.post("/api/analytics/kras/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_effective_target_inheritance(self):
        """KPIAssignment uses custom target when provided, or inherits KPI default."""
        # Assignment 1 has custom target 85.00
        self.assertEqual(self.assignment_1.effective_target, Decimal("85.00"))

        # Assignment 2 without custom target inherits default target 2.00
        assignment_2 = KPIAssignment.objects.create(
            kpi=self.kpi_resp_time,
            agent=self.agent_2,
            assigned_by=self.admin_user,
        )
        self.assertEqual(assignment_2.effective_target, Decimal("2.00"))

    def test_kpi_cannot_be_assigned_to_client(self):
        """Assigning a KPI to a user with CLIENT role fails validation with 400."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "kpi": self.kpi_res_rate.id,
            "agent": self.client_user.id,
        }
        response = self.client.post("/api/analytics/kpis/assignments/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("agent", response.data)

    def test_kpi_achievement_calculation_directions(self):
        """Directional achievement percentages calculate correctly for higher and lower targets."""
        # 1. Higher is better: Target = 90, Actual = 95 -> 105.56%
        ach_higher = calculate_kpi_achievement(
            target_value=Decimal("90.00"),
            actual_value=Decimal("95.00"),
            target_direction=KPI.TargetDirection.HIGHER_IS_BETTER,
        )
        self.assertEqual(ach_higher, Decimal("105.56"))

        # 2. Lower is better: Target = 2.00 hours, Actual = 1.00 hour -> 200.00%
        ach_lower = calculate_kpi_achievement(
            target_value=Decimal("2.00"),
            actual_value=Decimal("1.00"),
            target_direction=KPI.TargetDirection.LOWER_IS_BETTER,
        )
        self.assertEqual(ach_lower, Decimal("200.00"))

        # 3. Lower is better: Target = 2.00 hours, Actual = 4.00 hours -> 50.00%
        ach_lower_miss = calculate_kpi_achievement(
            target_value=Decimal("2.00"),
            actual_value=Decimal("4.00"),
            target_direction=KPI.TargetDirection.LOWER_IS_BETTER,
        )
        self.assertEqual(ach_lower_miss, Decimal("50.00"))

        # 4. Zero division guard on target=0
        ach_zero_target = calculate_kpi_achievement(
            target_value=Decimal("0.00"),
            actual_value=Decimal("10.00"),
            target_direction=KPI.TargetDirection.HIGHER_IS_BETTER,
        )
        self.assertEqual(ach_zero_target, Decimal("0.00"))

    def test_automated_kpi_evaluation_endpoint(self):
        """Admin can trigger automated KPI evaluation for an agent over a date window."""
        self.client.force_authenticate(user=self.admin_user)
        start_d = (timezone.now() - timedelta(days=30)).date()
        end_d = timezone.now().date()

        payload = {
            "agent_id": self.agent_1.id,
            "period_start": str(start_d),
            "period_end": str(end_d),
            "save_records": True,
        }
        response = self.client.post("/api/analytics/kpis/evaluate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["agent_id"], self.agent_1.id)
        self.assertTrue(response.data["kpis_evaluated_count"] >= 1)

        # Verify persistent performance record was created
        record = KPIPerformanceRecord.objects.filter(
            assignment=self.assignment_1,
            period_start=start_d,
            period_end=end_d,
        ).first()
        self.assertIsNotNone(record)
        self.assertEqual(record.evaluated_by, self.admin_user)


class CSVExportTests(AnalyticsBaseTestCase):
    """
    Verifies dynamic RFC 4180 CSV export generation across endpoints.
    """

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin_user)

    def test_ticket_analytics_csv_format(self):
        """Ticket analytics returns text/csv streaming response with ?format=csv."""
        response = self.client.get("/api/analytics/tickets/?format=csv")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8")
        self.assertIn("attachment; filename=", response["Content-Disposition"])

        content = response.content.decode("utf-8")
        self.assertIn("Section,Metric,Count,Percentage", content)
        self.assertIn("Status Breakdown", content)

    def test_agent_leaderboard_csv_format(self):
        """Agent leaderboard returns CSV with agent metrics with ?format=csv."""
        response = self.client.get("/api/analytics/agents/?format=csv")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8")

        content = response.content.decode("utf-8")
        self.assertIn("Username,Full Name,Email,Assigned Tickets", content)
        self.assertIn("agent_sarah", content)

    def test_sla_analytics_csv_format(self):
        """SLA analytics returns CSV with breakdown by priority and agent."""
        response = self.client.get("/api/analytics/sla/?format=csv")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8")

        content = response.content.decode("utf-8")
        self.assertIn("Grouping,Segment,Total Governed,Compliant,Breached,Compliance Rate (%)", content)

    def test_reports_tickets_export(self):
        """Direct report endpoint /api/analytics/reports/tickets/ returns CSV."""
        response = self.client.get("/api/analytics/reports/tickets/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8")

        content = response.content.decode("utf-8")
        self.assertIn("Ticket ID,Ticket Number,Client,Subject", content)
        self.assertIn("Database cluster latency", content)


class EdgeCasesAndZeroDivisionTests(TestCase):
    """
    Verifies that system behaves gracefully when database is completely empty
    or zero-division conditions arise.
    """

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="empty_admin",
            email="empty_admin@example.com",
            password="SecurePassword123!",
            role=User.Role.ADMIN,
            is_superuser=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_empty_database_ticket_summary(self):
        """Empty ticket database returns zeros without raising ZeroDivisionError."""
        response = self.client.get("/api/analytics/tickets/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data["summary"]

        self.assertEqual(summary["total_tickets"], 0)
        self.assertEqual(summary["active_tickets"], 0)
        self.assertEqual(summary["completed_tickets"], 0)
        self.assertEqual(summary["completion_rate_percentage"], 0.0)

    def test_empty_database_sla_summary(self):
        """Empty SLA database returns 100% compliance without division error."""
        response = self.client.get("/api/analytics/sla/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data["summary"]

        self.assertEqual(summary["total_governed_tickets"], 0)
        self.assertEqual(summary["compliance_percentage"], 100.0)

    def test_empty_database_agent_leaderboard(self):
        """Empty agent roster returns 0 agents without failure."""
        response = self.client.get("/api/analytics/agents/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["agents_count"], 0)
        self.assertEqual(response.data["leaderboard"], [])

