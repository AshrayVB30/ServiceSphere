"""
URL Routing for the 'sla' application.

Registers endpoints for:
1. SLA Policy Management (Admin only):
   - /api/sla/policies/
   - /api/sla/policies/{id}/
   - /api/sla/policies/{id}/activate/
   - /api/sla/policies/{id}/deactivate/
2. Ticket SLA Metrics:
   - /api/sla/tickets/{ticket_id}/
3. SLA Monitoring & Health Dashboard:
   - /api/sla/monitoring/
   - /api/sla/overdue-tickets/
4. SLA Escalation Incidents & Acknowledgements:
   - /api/sla/escalations/
   - /api/sla/escalations/{id}/
   - /api/sla/escalations/{id}/acknowledge/
"""

from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    SLAPolicyViewSet,
    TicketSLADetailView,
    SLAMonitoringSummaryView,
    OverdueTicketsView,
    SLAEscalationViewSet,
)

router = DefaultRouter()
router.register("policies", SLAPolicyViewSet, basename="sla-policy")
router.register("escalations", SLAEscalationViewSet, basename="sla-escalation")

urlpatterns = [
    # Individual ticket SLA tracking metrics
    path("tickets/<int:ticket_id>/", TicketSLADetailView.as_view(), name="ticket-sla-detail"),

    # Global SLA monitoring aggregate dashboard metrics
    path("monitoring/", SLAMonitoringSummaryView.as_view(), name="sla-monitoring-summary"),

    # List of overdue/breached active tickets
    path("overdue-tickets/", OverdueTicketsView.as_view(), name="sla-overdue-tickets"),
]

urlpatterns += router.urls

