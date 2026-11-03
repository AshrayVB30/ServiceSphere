"""
Root URL Configuration for ServiceSphere.

The `urlpatterns` list routes URLs to views.
When a user visits a URL, Django searches through these patterns in order:
1. 'admin/'    -> Built-in Django administration panel (staff only).
2. 'api-auth/' -> DRF browsable API login and logout views (for all users).
3. 'api/'      -> Core system endpoints (e.g. /api/health/).
4. 'api/'      -> Client organization management endpoints (e.g. /api/clients/).
5. 'api/'      -> Help desk ticket management endpoints (e.g. /api/tickets/).
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Built-in administrative dashboard (requires is_staff=True)
    path("admin/", admin.site.urls),

    # Django REST Framework login and logout views for the browsable API.
    # Allows non-staff users (e.g. Clients, Approvers) to log in directly via the browser.
    path("api-auth/", include("rest_framework.urls")),

    # Dedicated REST authentication endpoints (login, logout, me, csrf, password-change)
    path("api/auth/", include("accounts.urls")),

    # Core shared endpoints (health-check, system status)
    path("api/", include("core.urls")),

    # Client organization management REST APIs
    path("api/", include("clients.urls")),

    # Help desk ticket management REST APIs
    path("api/", include("tickets.urls")),

    # Ticket approval workflows and decision history REST APIs
    path("api/", include("approvals.urls")),

    # SLA policy management, deadline tracking, and automated escalations
    path("api/sla/", include("sla.urls")),

    # In-app and email notifications, preferences, and counters
    path("api/notifications/", include("notifications.urls")),

    # Knowledge Base categories, articles, ticket linking, and revision auditing
    path("api/knowledge/", include("knowledge_base.urls")),

    # Analytics, agent performance, SLA metrics, KPI & KRA tracking, and reports
    path("api/analytics/", include("analytics.urls")),
]
