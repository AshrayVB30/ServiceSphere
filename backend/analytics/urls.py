"""
URL Routing for the 'analytics' application.

Maps RESTful API endpoints for:
- Executive Analytics Dashboard
- Ticket Statistics and Historical Trends
- Agent Performance Leaderboards and Personal Scorecards
- SLA Adherence and Breach Tracking
- KRA and KPI Management, Target Assignments, and Automated Evaluations
- Tabular CSV Data Reports
"""

# Import path and include tools for URL pattern declaration
from django.urls import include, path

# Import DRF DefaultRouter for ModelViewSet registrations
from rest_framework.routers import DefaultRouter

# Import API Views and ViewSets
from .views import (
    AgentLeaderboardView,
    AgentPerformanceDetailView,
    AgentWorkloadView,
    DashboardSummaryView,
    ExportAgentPerformanceReportView,
    ExportKPIReportView,
    ExportKRAReportView,
    ExportSLAReportView,
    ExportTicketsReportView,
    KPIAssignmentViewSet,
    KPIEvaluateView,
    KPIPerformanceRecordViewSet,
    KPIViewSet,
    KRAAssignmentViewSet,
    KRAViewSet,
    SLAAnalyticsView,
    SLABreachesView,
    SLAComplianceView,
    SLASummaryView,
    TicketAnalyticsView,
    TicketByCategoryView,
    TicketByPriorityView,
    TicketSummaryView,
    TicketTrendsView,
)

# Initialize standard DRF DefaultRouter for RESTful ModelViewSets
router = DefaultRouter()

# Register KRA endpoints (/api/analytics/kras/)
router.register(r"kras/assignments", KRAAssignmentViewSet, basename="analytics-kra-assignment")
router.register(r"kras", KRAViewSet, basename="analytics-kra")

# Register KPI assignment and performance record endpoints before generic kpi pk pattern
router.register(r"kpis/assignments", KPIAssignmentViewSet, basename="analytics-kpi-assignment")
router.register(r"kpis/records", KPIPerformanceRecordViewSet, basename="analytics-kpi-record")
router.register(r"kpis", KPIViewSet, basename="analytics-kpi")

urlpatterns = [
    # Executive dashboard summary (/api/analytics/dashboard/)
    path("dashboard/", DashboardSummaryView.as_view(), name="analytics-dashboard"),

    # Ticket volume, priority, and category metrics (/api/analytics/tickets/)
    path("tickets/", TicketAnalyticsView.as_view(), name="analytics-tickets"),
    path("tickets/summary/", TicketSummaryView.as_view(), name="analytics-tickets-summary"),
    path("tickets/by-priority/", TicketByPriorityView.as_view(), name="analytics-tickets-by-priority"),
    path("tickets/by-category/", TicketByCategoryView.as_view(), name="analytics-tickets-by-category"),

    # Daily ticket creation vs resolution timeline trends (/api/analytics/tickets/trends/)
    path("tickets/trends/", TicketTrendsView.as_view(), name="analytics-tickets-trends"),

    # Support agent performance leaderboard & workload (/api/analytics/agents/)
    path("agents/", AgentLeaderboardView.as_view(), name="analytics-agents-leaderboard"),
    path("agents/workload/", AgentWorkloadView.as_view(), name="analytics-agents-workload"),

    # Individual support agent performance scorecard
    path("agents/<int:agent_id>/", AgentPerformanceDetailView.as_view(), name="analytics-agent-detail"),
    path("agents/<int:agent_id>/performance/", AgentPerformanceDetailView.as_view(), name="analytics-agent-detail-perf"),

    # SLA compliance summary and breakdowns (/api/analytics/sla/)
    path("sla/", SLAAnalyticsView.as_view(), name="analytics-sla"),
    path("sla/summary/", SLASummaryView.as_view(), name="analytics-sla-summary"),
    path("sla/compliance/", SLAComplianceView.as_view(), name="analytics-sla-compliance"),

    # Granular list of tickets that breached SLA deadlines (/api/analytics/sla/breaches/)
    path("sla/breaches/", SLABreachesView.as_view(), name="analytics-sla-breaches"),

    # Automated KPI evaluation action (/api/analytics/kpis/evaluate/)
    path("kpis/evaluate/", KPIEvaluateView.as_view(), name="analytics-kpi-evaluate"),

    # Granular CSV report download endpoints (/api/analytics/reports/*)
    path("reports/tickets/", ExportTicketsReportView.as_view(), name="analytics-export-tickets"),
    path("reports/agents/", ExportAgentPerformanceReportView.as_view(), name="analytics-export-agents"),
    path("reports/sla/", ExportSLAReportView.as_view(), name="analytics-export-sla"),
    path("reports/kpis/", ExportKPIReportView.as_view(), name="analytics-export-kpis"),
    path("reports/kras/", ExportKRAReportView.as_view(), name="analytics-export-kras"),

    # ModelViewSet routes (KRAs, KPIs, Assignments, Records)
    path("", include(router.urls)),
]
