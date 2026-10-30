"""
URL Routing for the 'tickets' application.

Registers endpoints for:
1. Ticket management ViewSet routes:
   - /api/tickets/                         -> List & create tickets
   - /api/tickets/{id}/                    -> Retrieve individual ticket details
   - /api/tickets/{id}/assign/             -> Assign ticket to an agent
   - /api/tickets/{id}/change_status/      -> Advance ticket status
2. Ticket conversation comment routes:
   - /api/tickets/{ticket_id}/comments/    -> Retrieve & add comments/internal notes
"""

from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import TicketViewSet, TicketCommentView

# Instantiate DefaultRouter for automatic ViewSet URL routing
router = DefaultRouter()
router.register(
    "tickets",
    TicketViewSet,
    basename="ticket",
)

# Custom URL patterns for ticket sub-resources (comments)
urlpatterns = [
    # Maps GET (list comments) and POST (add comment) to the TicketCommentView
    path(
        "tickets/<int:ticket_id>/comments/",
        TicketCommentView.as_view(),
        name="ticket-comments",
    ),
]

# Append the standard router URLs
urlpatterns += router.urls
