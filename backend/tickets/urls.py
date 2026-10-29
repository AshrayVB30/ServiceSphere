"""
URL Routing for the 'tickets' application.

Registers the TicketViewSet with a DefaultRouter to automatically expose
standard RESTful endpoints for tickets:
- GET  /api/tickets/       -> List visible tickets
- POST /api/tickets/       -> Create a new ticket (for Client users)
- GET  /api/tickets/{id}/   -> Retrieve individual ticket details
"""

from rest_framework.routers import DefaultRouter
from .views import TicketViewSet

# Create the router to automatically generate RESTful URL patterns
router = DefaultRouter()

# Register the TicketViewSet under the 'tickets' path prefix.
# 'basename="ticket"' generates internal URL names like 'ticket-list' and 'ticket-detail'.
router.register("tickets", TicketViewSet, basename="ticket")

# Expose the generated URL patterns to be included in the project's root config/urls.py
urlpatterns = router.urls

