"""
API Views for the 'analytics' application.

Exposes RESTful endpoints for:
1. Executive Analytics Dashboard
2. Ticket Statistics, Category Distributions, and Daily Timelines
3. Agent Performance Leaderboards, Scorecards, and Workload Distribution
4. SLA Compliance, Breach Loggers, and Deadline Overdues
5. KRA and KPI Configuration, Assignments, and Automated Evaluations
6. Dynamic RFC 4180 CSV Export Generation
"""

# Import Decimal formatting utilities
from decimal import Decimal

# Import Django REST Framework views and status codes
from rest_framework import status, viewsets
from rest_framework.renderers import BrowsableAPIRenderer, JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView
from .renderers import PassthroughCSVRenderer

# Import ticket and account models
from accounts.models import User
from tickets.models import Ticket

# Import permissions
from .permissions import (
    CanManageKPIs,
    CanViewAgentAnalytics,
    IsAnalyticsAdmin,
    IsInternalStaffUser,
)

# Import models
from .models import (
    KRA,
    KPI,
    KRAAssignment,
    KPIAssignment,
    KPIPerformanceRecord,
)

# Import serializers
from .serializers import (
    KRAAssignmentSerializer,
    KPISerializer,
    KRASerializer,
    KPIAssignmentSerializer,
    KPIEvaluationRequestSerializer,
    KPIPerformanceRecordSerializer,
)

# Import business logic calculation services
from .services import (
    evaluate_agent_kpis,
    export_to_csv,
    get_agent_leaderboard,
    get_agent_performance,
    get_sla_breaches,
    get_sla_breakdown_by_agent,
    get_sla_breakdown_by_priority,
    get_sla_summary,
    get_ticket_summary,
    get_ticket_trends,
    get_tickets_by_category,
    get_tickets_by_priority,
    parse_date_boundaries,
)


# ==============================================================================
# 1. CONSOLIDATED ANALYTICS DASHBOARD
# ==============================================================================

class DashboardSummaryView(APIView):
    """
    GET /api/analytics/dashboard/
    Consolidated operational dashboard providing executive overview:
    - Ticket volume and completion rate
    - SLA compliance percentage and overdue count
    - Active support workload
    - Top performing agents
    """
    permission_classes = [IsInternalStaffUser]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        # Fetch summaries from analytical services
        ticket_summary = get_ticket_summary(start_date, end_date)
        sla_summary = get_sla_summary(start_date, end_date)
        leaderboard_data = get_agent_leaderboard(start_date, end_date)

        # Extract top 3 performing agents
        top_agents = leaderboard_data["leaderboard"][:3]

        return Response(
            {
                "tickets": ticket_summary,
                "sla": {
                    "total_governed_tickets": sla_summary["total_governed_tickets"],
                    "compliance_percentage": sla_summary["compliance_percentage"],
                    "breached_tickets": sla_summary["breached_tickets"],
                    "overdue_tickets_count": sla_summary["overdue_tickets_count"],
                    "avg_response_time_hours": sla_summary["avg_response_time_hours"],
                    "avg_resolution_time_hours": sla_summary["avg_resolution_time_hours"],
                },
                "workload": {
                    "total_active_workload": leaderboard_data["total_active_workload"],
                    "active_agents_count": leaderboard_data["agents_count"],
                },
                "top_agents": top_agents,
                "period": {
                    "start_date": start_date,
                    "end_date": end_date,
                },
            },
            status=status.HTTP_200_OK,
        )


# ==============================================================================
# 2. TICKET ANALYTICS VIEWS
# ==============================================================================

class TicketAnalyticsView(APIView):
    """
    GET /api/analytics/tickets/
    Ticket analytics including lifecycle status breakdown, priority distribution,
    and category grouping. Supports CSV export via ?format=csv.
    """
    permission_classes = [IsInternalStaffUser]
    renderer_classes = [JSONRenderer, BrowsableAPIRenderer, PassthroughCSVRenderer]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        fmt = request.query_params.get("format", "json").lower()

        # Generate ticket summary data
        summary = get_ticket_summary(start_date, end_date)
        by_priority = get_tickets_by_priority(start_date, end_date)
        by_category = get_tickets_by_category(start_date, end_date)

        # Handle CSV export request
        if fmt == "csv":
            rows = []
            # Append status breakdown rows
            for st, count in summary["status_breakdown"].items():
                rows.append({
                    "Section": "Status Breakdown",
                    "Metric": st.replace("_", " ").title(),
                    "Count": count,
                    "Percentage": round((count / summary["total_tickets"] * 100), 2) if summary["total_tickets"] > 0 else 0,
                })
            # Append priority rows
            for p in by_priority:
                rows.append({
                    "Section": "Priority Breakdown",
                    "Metric": p["priority_display"],
                    "Count": p["count"],
                    "Percentage": p["percentage"],
                })
            # Append category rows
            for c in by_category:
                rows.append({
                    "Section": "Category Breakdown",
                    "Metric": c["category"],
                    "Count": c["count"],
                    "Percentage": c["percentage"],
                })

            fieldnames = ["Section", "Metric", "Count", "Percentage"]
            return export_to_csv(rows, fieldnames, filename="ticket_analytics_report.csv")

        # Standard JSON API response
        return Response(
            {
                "summary": summary,
                "by_priority": by_priority,
                "by_category": by_category,
            },
            status=status.HTTP_200_OK,
        )


class TicketTrendsView(APIView):
    """
    GET /api/analytics/tickets/trends/
    Returns daily timeline series of created vs. resolved tickets.
    """
    permission_classes = [IsInternalStaffUser]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        timeline = get_ticket_trends(start_date, end_date)
        return Response({"timeline": timeline}, status=status.HTTP_200_OK)


# ==============================================================================
# 3. AGENT PERFORMANCE ANALYTICS VIEWS
# ==============================================================================

class AgentLeaderboardView(APIView):
    """
    GET /api/analytics/agents/
    Agent performance leaderboard comparing ticket velocity, resolution rate,
    response duration, SLA compliance, and workload distribution.
    Only accessible by Administrators. Supports CSV export (?format=csv).
    """
    permission_classes = [CanViewAgentAnalytics]
    renderer_classes = [JSONRenderer, BrowsableAPIRenderer, PassthroughCSVRenderer]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        fmt = request.query_params.get("format", "json").lower()

        data = get_agent_leaderboard(start_date, end_date)

        # Handle CSV streaming export
        if fmt == "csv":
            rows = []
            for item in data["leaderboard"]:
                rows.append({
                    "Username": item["username"],
                    "Full Name": item["full_name"],
                    "Email": item["email"],
                    "Assigned Tickets": item["total_assigned"],
                    "Resolved Tickets": item["resolved_tickets"],
                    "Pending Tickets": item["pending_tickets"],
                    "Resolution Rate (%)": item["resolution_rate_percentage"],
                    "Avg Response (Hours)": item["avg_first_response_hours"] or "N/A",
                    "Avg Resolution (Hours)": item["avg_resolution_hours"] or "N/A",
                    "SLA Compliance (%)": item["sla_compliance_rate_percentage"],
                    "Workload Share (%)": item["workload_distribution_percentage"],
                })

            fieldnames = [
                "Username",
                "Full Name",
                "Email",
                "Assigned Tickets",
                "Resolved Tickets",
                "Pending Tickets",
                "Resolution Rate (%)",
                "Avg Response (Hours)",
                "Avg Resolution (Hours)",
                "SLA Compliance (%)",
                "Workload Share (%)",
            ]
            return export_to_csv(rows, fieldnames, filename="agent_performance_leaderboard.csv")

        return Response(data, status=status.HTTP_200_OK)


class AgentPerformanceDetailView(APIView):
    """
    GET /api/analytics/agents/<int:agent_id>/
    Detailed performance scorecard for an individual support agent.
    Support Agents can only view their own scorecards; Admins can view any agent.
    """
    permission_classes = [CanViewAgentAnalytics]

    def get(self, request, agent_id):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        data = get_agent_performance(agent_id, start_date, end_date)
        if not data:
            return Response(
                {"detail": "Support agent not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(data, status=status.HTTP_200_OK)


# ==============================================================================
# 4. SLA ANALYTICS VIEWS
# ==============================================================================

class SLAAnalyticsView(APIView):
    """
    GET /api/analytics/sla/
    SLA metrics summary, compliance ratios, overdue ticket counts,
    and priority/agent breakdowns. Supports CSV export (?format=csv).
    """
    permission_classes = [IsInternalStaffUser]
    renderer_classes = [JSONRenderer, BrowsableAPIRenderer, PassthroughCSVRenderer]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        fmt = request.query_params.get("format", "json").lower()

        summary = get_sla_summary(start_date, end_date)
        by_priority = get_sla_breakdown_by_priority(start_date, end_date)
        by_agent = get_sla_breakdown_by_agent(start_date, end_date)

        # Handle CSV export
        if fmt == "csv":
            rows = []
            # Priority breakdown rows
            for p in by_priority:
                rows.append({
                    "Grouping": "Priority",
                    "Segment": p["priority_display"],
                    "Total Governed": p["total_tickets"],
                    "Compliant": p["compliant_tickets"],
                    "Breached": p["breached_tickets"],
                    "Compliance Rate (%)": p["compliance_percentage"],
                })
            # Agent breakdown rows
            for a in by_agent:
                rows.append({
                    "Grouping": "Agent",
                    "Segment": a["username"],
                    "Total Governed": a["total_governed_tickets"],
                    "Compliant": a["compliant_tickets"],
                    "Breached": a["breached_tickets"],
                    "Compliance Rate (%)": a["compliance_percentage"],
                })

            fieldnames = ["Grouping", "Segment", "Total Governed", "Compliant", "Breached", "Compliance Rate (%)"]
            return export_to_csv(rows, fieldnames, filename="sla_analytics_report.csv")

        return Response(
            {
                "summary": summary,
                "by_priority": by_priority,
                "by_agent": by_agent,
            },
            status=status.HTTP_200_OK,
        )


class SLABreachesView(APIView):
    """
    GET /api/analytics/sla/breaches/
    Returns list of all tickets that breached SLA response or resolution deadlines.
    Supports CSV export (?format=csv).
    """
    permission_classes = [IsInternalStaffUser]
    renderer_classes = [JSONRenderer, BrowsableAPIRenderer, PassthroughCSVRenderer]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        fmt = request.query_params.get("format", "json").lower()

        breaches = get_sla_breaches(start_date, end_date)

        if fmt == "csv":
            rows = []
            for b in breaches:
                rows.append({
                    "Ticket ID": b["ticket_id"],
                    "Subject": b["subject"],
                    "Client": b["client_name"],
                    "Priority": b["priority"],
                    "Status": b["status"],
                    "Assigned Agent": b["assigned_to"] or "Unassigned",
                    "Response Status": b["response_status"],
                    "Resolution Status": b["resolution_status"],
                    "Created At": b["created_at"],
                })
            fieldnames = [
                "Ticket ID",
                "Subject",
                "Client",
                "Priority",
                "Status",
                "Assigned Agent",
                "Response Status",
                "Resolution Status",
                "Created At",
            ]
            return export_to_csv(rows, fieldnames, filename="sla_breached_tickets.csv")

        return Response(
            {"breaches_count": len(breaches), "breaches": breaches},
            status=status.HTTP_200_OK,
        )


# ==============================================================================
# 5. KPI & KRA MANAGEMENT VIEWSETS
# ==============================================================================

class KRAViewSet(viewsets.ModelViewSet):
    """
    CRUD management for Key Result Areas (KRAs).
    - Read: Admins and Support Agents.
    - Write: Administrators only.
    """
    queryset = KRA.objects.all().order_by("name")
    serializer_class = KRASerializer
    permission_classes = [CanManageKPIs]

    def get_queryset(self):
        qs = super().get_queryset()
        active = self.request.query_params.get("is_active")
        if active is not None:
            is_act = active.lower() in ["true", "1"]
            qs = qs.filter(is_active=is_act)
        return qs


class KPIViewSet(viewsets.ModelViewSet):
    """
    CRUD management for Key Performance Indicators (KPIs).
    - Read: Admins and Support Agents.
    - Write: Administrators only.
    """
    queryset = KPI.objects.select_related("kra").order_by("kra", "name")
    serializer_class = KPISerializer
    permission_classes = [CanManageKPIs]

    def get_queryset(self):
        qs = super().get_queryset()
        kra_id = self.request.query_params.get("kra")
        if kra_id:
            qs = qs.filter(kra_id=kra_id)
        metric_type = self.request.query_params.get("metric_type")
        if metric_type:
            qs = qs.filter(metric_type=metric_type)
        active = self.request.query_params.get("is_active")
        if active is not None:
            is_act = active.lower() in ["true", "1"]
            qs = qs.filter(is_active=is_act)
        return qs


class KRAAssignmentViewSet(viewsets.ModelViewSet):
    """
    Assigns KRAs to Support Agents.
    Admins can manage all; Agents can view their own assignments.
    """
    queryset = KRAAssignment.objects.select_related("kra", "agent", "assigned_by").order_by("-created_at")
    serializer_class = KRAAssignmentSerializer
    permission_classes = [CanManageKPIs]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # If user is a Support Agent, restrict view to own assignments
        if user.role == User.Role.SUPPORT_AGENT and not user.is_superuser:
            qs = qs.filter(agent=user)
        else:
            agent_id = self.request.query_params.get("agent")
            if agent_id:
                qs = qs.filter(agent_id=agent_id)
        return qs

    def perform_create(self, serializer):
        # Automatically record who made the assignment
        serializer.save(assigned_by=self.request.user)


class KPIAssignmentViewSet(viewsets.ModelViewSet):
    """
    Assigns KPIs to Support Agents with optional target customization.
    Admins can manage all; Agents can view their own assignments.
    """
    queryset = KPIAssignment.objects.select_related("kpi", "kpi__kra", "agent", "assigned_by").order_by("-created_at")
    serializer_class = KPIAssignmentSerializer
    permission_classes = [CanManageKPIs]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # If user is a Support Agent, restrict view to own assignments
        if user.role == User.Role.SUPPORT_AGENT and not user.is_superuser:
            qs = qs.filter(agent=user)
        else:
            agent_id = self.request.query_params.get("agent")
            if agent_id:
                qs = qs.filter(agent_id=agent_id)
        return qs

    def perform_create(self, serializer):
        # Automatically record who made the assignment
        serializer.save(assigned_by=self.request.user)


class KPIPerformanceRecordViewSet(viewsets.ModelViewSet):
    """
    Historical evaluation log records.
    Admins can create/edit evaluations; Agents can view their own.
    """
    queryset = KPIPerformanceRecord.objects.select_related(
        "assignment",
        "assignment__agent",
        "assignment__kpi",
        "evaluated_by",
    ).order_by("-period_end")
    serializer_class = KPIPerformanceRecordSerializer
    permission_classes = [CanManageKPIs]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.SUPPORT_AGENT and not user.is_superuser:
            qs = qs.filter(assignment__agent=user)
        else:
            agent_id = self.request.query_params.get("agent")
            if agent_id:
                qs = qs.filter(assignment__agent_id=agent_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(evaluated_by=self.request.user)


class KPIEvaluateView(APIView):
    """
    POST /api/analytics/kpis/evaluate/
    Executes automated KPI performance evaluation for an agent over a review period.
    Only accessible by Administrators.
    """
    permission_classes = [IsAnalyticsAdmin]

    def post(self, request):
        serializer = KPIEvaluationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agent = serializer.validated_data["agent"]
        period_start = serializer.validated_data["period_start"]
        period_end = serializer.validated_data["period_end"]
        save_records = serializer.validated_data.get("save_records", True)

        evaluation_result = evaluate_agent_kpis(
            agent_id=agent.id,
            period_start=period_start,
            period_end=period_end,
            evaluated_by=request.user,
            save_records=save_records,
        )

        return Response(evaluation_result, status=status.HTTP_200_OK)


# ==============================================================================
# 6. CSV REPORT EXPORT ENDPOINTS
# ==============================================================================

class ExportTicketsReportView(APIView):
    """
    GET /api/analytics/reports/tickets/
    Exports granular ticket dataset with priority, category, status, and resolution timestamps.
    """
    permission_classes = [IsInternalStaffUser]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        start_dt, end_dt = parse_date_boundaries(start_date, end_date)

        qs = Ticket.objects.select_related("client", "assigned_to", "created_by").all()
        if start_dt:
            qs = qs.filter(created_at__gte=start_dt)
        if end_dt:
            qs = qs.filter(created_at__lte=end_dt)

        rows = []
        for t in qs:
            rows.append({
                "Ticket ID": t.id,
                "Ticket Number": str(t.ticket_number),
                "Client": t.client.name if t.client else "",
                "Subject": t.subject,
                "Category": t.category,
                "Priority": t.priority,
                "Status": t.status,
                "Assigned Agent": t.assigned_to.username if t.assigned_to else "Unassigned",
                "Created By": t.created_by.username,
                "Created At": t.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "Resolved At": t.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if t.resolved_at else "",
            })

        fieldnames = [
            "Ticket ID",
            "Ticket Number",
            "Client",
            "Subject",
            "Category",
            "Priority",
            "Status",
            "Assigned Agent",
            "Created By",
            "Created At",
            "Resolved At",
        ]
        return export_to_csv(rows, fieldnames, filename="tickets_export_report.csv")


class ExportAgentPerformanceReportView(APIView):
    """
    GET /api/analytics/reports/agents/
    Exports agent performance leaderboard and workload distribution to CSV.
    """
    permission_classes = [IsAnalyticsAdmin]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        data = get_agent_leaderboard(start_date, end_date)
        rows = []
        for item in data["leaderboard"]:
            rows.append({
                "Username": item["username"],
                "Full Name": item["full_name"],
                "Email": item["email"],
                "Assigned Tickets": item["total_assigned"],
                "Resolved Tickets": item["resolved_tickets"],
                "Pending Tickets": item["pending_tickets"],
                "Resolution Rate (%)": item["resolution_rate_percentage"],
                "Avg Response (Hours)": item["avg_first_response_hours"] or "N/A",
                "Avg Resolution (Hours)": item["avg_resolution_hours"] or "N/A",
                "SLA Compliance (%)": item["sla_compliance_rate_percentage"],
                "Workload Share (%)": item["workload_distribution_percentage"],
            })

        fieldnames = [
            "Username",
            "Full Name",
            "Email",
            "Assigned Tickets",
            "Resolved Tickets",
            "Pending Tickets",
            "Resolution Rate (%)",
            "Avg Response (Hours)",
            "Avg Resolution (Hours)",
            "SLA Compliance (%)",
            "Workload Share (%)",
        ]
        return export_to_csv(rows, fieldnames, filename="agent_performance_report.csv")


class ExportSLAReportView(APIView):
    """
    GET /api/analytics/reports/sla/
    Exports SLA compliance summary and breakdown to CSV.
    """
    permission_classes = [IsInternalStaffUser]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        by_priority = get_sla_breakdown_by_priority(start_date, end_date)
        rows = []
        for p in by_priority:
            rows.append({
                "Priority Level": p["priority_display"],
                "Total Tickets": p["total_tickets"],
                "Compliant Tickets": p["compliant_tickets"],
                "Breached Tickets": p["breached_tickets"],
                "Compliance Rate (%)": p["compliance_percentage"],
            })

        fieldnames = ["Priority Level", "Total Tickets", "Compliant Tickets", "Breached Tickets", "Compliance Rate (%)"]
        return export_to_csv(rows, fieldnames, filename="sla_compliance_report.csv")


class ExportKPIReportView(APIView):
    """
    GET /api/analytics/reports/kpis/
    Exports historical KPI evaluation records to CSV.
    """
    permission_classes = [IsInternalStaffUser]

    def get(self, request):
        user = request.user
        qs = KPIPerformanceRecord.objects.select_related("assignment__agent", "assignment__kpi", "evaluated_by").all()
        if user.role == User.Role.SUPPORT_AGENT and not user.is_superuser:
            qs = qs.filter(assignment__agent=user)

        rows = []
        for r in qs:
            rows.append({
                "Agent": r.assignment.agent.username,
                "KPI": r.assignment.kpi.name,
                "Period Start": str(r.period_start),
                "Period End": str(r.period_end),
                "Target Value": r.target_value,
                "Actual Value": r.actual_value,
                "Achievement (%)": r.achievement_percentage,
                "Evaluated By": r.evaluated_by.username if r.evaluated_by else "System",
                "Created At": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            })

        fieldnames = [
            "Agent",
            "KPI",
            "Period Start",
            "Period End",
            "Target Value",
            "Actual Value",
            "Achievement (%)",
            "Evaluated By",
            "Created At",
        ]
        return export_to_csv(rows, fieldnames, filename="kpi_performance_records.csv")

