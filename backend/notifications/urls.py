"""
URL Routing for the 'notifications' application.

Maps endpoints for:
- User notification feeds and unread counters (/api/notifications/, /api/notifications/unread/)
- Read acknowledgements (/api/notifications/{id}/read/, /api/notifications/mark-all-read/)
- Delivery and category preferences (/api/notifications/preferences/)
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, NotificationPreferenceView

app_name = "notifications"

# Set up REST framework router for NotificationViewSet
router = DefaultRouter()
router.register(r"", NotificationViewSet, basename="notification")

urlpatterns = [
    # Explicit preferences endpoint (placed before router wildcards to avoid conflict with /{id}/)
    path("preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),

    # RESTful ViewSet endpoints
    path("", include(router.urls)),
]

