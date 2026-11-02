"""
URL Routing for the 'knowledge_base' application.

Maps endpoints for:
- Categories: /api/knowledge/categories/
- Articles: /api/knowledge/articles/
- Article Revisions: /api/knowledge/articles/{article_id}/revisions/
- Ticket Integration: /api/knowledge/tickets/{ticket_id}/articles/
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    ArticleViewSet,
    TicketArticleViewSet,
    ArticleRevisionViewSet,
)

app_name = "knowledge_base"

# Router for top-level resources
router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"articles", ArticleViewSet, basename="article")

urlpatterns = [
    # --------------------------------------------------------------------------
    # Ticket-Article Association Endpoints
    # --------------------------------------------------------------------------
    # GET: List articles linked to ticket
    # POST: Link an article to ticket (payload: {"article_id": <id>})
    path(
        "tickets/<int:ticket_id>/articles/",
        TicketArticleViewSet.as_view({"get": "list", "post": "create"}),
        name="ticket-article-list-create",
    ),
    # DELETE: Unlink an article from ticket
    path(
        "tickets/<int:ticket_id>/articles/<int:pk>/",
        TicketArticleViewSet.as_view({"delete": "destroy"}),
        name="ticket-article-unlink",
    ),

    # --------------------------------------------------------------------------
    # Article Revision History Endpoints
    # --------------------------------------------------------------------------
    # GET: List all historical revisions of an article
    path(
        "articles/<int:article_id>/revisions/",
        ArticleRevisionViewSet.as_view({"get": "list"}),
        name="article-revisions-list",
    ),
    # GET: Retrieve single revision snapshot details
    path(
        "articles/<int:article_id>/revisions/<int:pk>/",
        ArticleRevisionViewSet.as_view({"get": "retrieve"}),
        name="article-revision-detail",
    ),

    # --------------------------------------------------------------------------
    # Standard ViewSet Router Endpoints
    # --------------------------------------------------------------------------
    path("", include(router.urls)),
]
