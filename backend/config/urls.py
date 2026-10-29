"""
Root URL Configuration for ServiceSphere.

The `urlpatterns` list routes URLs to views.
When a user visits a URL, Django searches through these patterns in order:
1. 'admin/' -> Routes to Django's built-in administration panel.
2. 'api/'   -> Includes endpoints from 'core.urls' (e.g. /api/health/).
3. 'api/'   -> Includes endpoints from 'clients.urls' (e.g. /api/clients/).
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Built-in administrative dashboard
    path("admin/", admin.site.urls),

    # Core shared endpoints (health-check, system status)
    path("api/", include("core.urls")),

    # Client organization management REST APIs
    path("api/", include("clients.urls")),
]
