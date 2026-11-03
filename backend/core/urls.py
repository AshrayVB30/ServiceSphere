"""
URL Routing for the 'core' app.

Maps core system URLs to their corresponding Python view functions.
Included under the '/api/' prefix in config/urls.py.
"""

from django.urls import path
from .views import health_check, liveness_check

urlpatterns = [
    # Maps GET /api/health/ to the deep health check view function.
    path("health/", health_check, name="health-check"),

    # Maps GET /api/health/liveness/ to the lightweight liveness probe.
    path("health/liveness/", liveness_check, name="health-liveness"),
]
