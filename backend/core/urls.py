"""
URL Routing for the 'core' app.

Maps core system URLs to their corresponding Python view functions.
Included under the '/api/' prefix in config/urls.py.
"""

from django.urls import path
from .views import health_check

urlpatterns = [
    # Maps GET /api/health/ to the health_check view function.
    # name="health-check" allows referencing this URL dynamically via reverse("health-check").
    path("health/", health_check, name="health-check"),
]
