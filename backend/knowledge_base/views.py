"""
API Views for the 'knowledge_base' application.

Exposes RESTful endpoints for:
1. CategoryViewSet: Category CRUD, activation, deactivation, and article counters.
2. ArticleViewSet: Article CRUD, search, filtering, and publishing workflow actions.
3. TicketArticleViewSet: Associating and dissociating articles with support tickets.
4. ArticleRevisionViewSet: Auditing historical article content revisions.

Enforces:
- Strict role-based queryset filtering (clients cannot see drafts, archived, or internal articles).
- Controlled lifecycle state transitions (Draft -> Published -> Archived).
- Complete isolation and authorization on ticket-article linkages.
"""

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import User
from tickets.models import Ticket
from .models import Category, Article, ArticleTicket, ArticleRevision
from .permissions import (
    IsAdminOrReadOnly,
    CanManageArticle,
    CanPublishArticle,
    IsInternalStaff,
    is_system_admin,
    is_internal_staff,
)
from .pagination import StandardResultsSetPagination
from .serializers import (
    CategorySerializer,
    ArticleListSerializer,
    ArticleDetailSerializer,
    ArticleCreateUpdateSerializer,
    ArticleRevisionSerializer,
    ArticleTicketSerializer,
)
from .services import (
    create_category,
    update_category,
    deactivate_category,
    activate_category,
    delete_category,
    create_article,
    update_article,
    publish_article,
    unpublish_article,
    archive_article,
    restore_article,
    link_article_to_ticket,
    unlink_article_from_ticket,
)


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Knowledge Base Category management.

    Endpoints:
    - GET    /api/knowledge/categories/              -> List categories (active only for users; all for admins)
    - POST   /api/knowledge/categories/              -> Create category (Admin only)
    - GET    /api/knowledge/categories/{id}/         -> Retrieve category details
    - PATCH  /api/knowledge/categories/{id}/         -> Update category (Admin only)
    - PUT    /api/knowledge/categories/{id}/         -> Full replace category (Admin only)
    - DELETE /api/knowledge/categories/{id}/         -> Delete category (only if no articles reference it)
    - POST   /api/knowledge/categories/{id}/activate/   -> Activate category (Admin only)
    - POST   /api/knowledge/categories/{id}/deactivate/ -> Deactivate category (Admin only)
    """

    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """
        Admins view all categories (including inactive ones).
        Non-admin users only view active categories.
        """
        user = self.request.user
        if is_system_admin(user):
            return Category.objects.all().prefetch_related("articles")
        return Category.objects.filter(is_active=True).prefetch_related("articles")

    def perform_create(self, serializer):
        """Delegates category creation to the service layer."""
        category = create_category(
            name=serializer.validated_data["name"],
            description=serializer.validated_data.get("description", ""),
            is_active=serializer.validated_data.get("is_active", True),
        )
        serializer.instance = category

    def perform_update(self, serializer):
        """Delegates category modification to the service layer."""
        category = update_category(
            category=serializer.instance,
            **serializer.validated_data,
        )
        serializer.instance = category

    def perform_destroy(self, instance):
        """Delegates deletion to the service layer, enforcing referential safety."""
        delete_category(instance)

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        """Endpoint to activate a category."""
        category = self.get_object()
        activate_category(category)
        return Response(CategorySerializer(category).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        """Endpoint to deactivate a category."""
        category = self.get_object()
        deactivate_category(category)
        return Response(CategorySerializer(category).data, status=status.HTTP_200_OK)


class ArticleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Knowledge Base Article management and search.

    Endpoints:
    - GET   /api/knowledge/articles/                -> List articles (visibility-filtered)
    - POST  /api/knowledge/articles/                -> Create draft article (Staff only)
    - GET   /api/knowledge/articles/{id}/           -> Retrieve article details
    - PATCH /api/knowledge/articles/{id}/           -> Update article (Creates revision snapshot)
    - POST  /api/knowledge/articles/{id}/publish/   -> Publish draft article (Staff only)
    - POST  /api/knowledge/articles/{id}/unpublish/ -> Revert to draft (Staff only)
    - POST  /api/knowledge/articles/{id}/archive/   -> Archive article (Staff only)
    - POST  /api/knowledge/articles/{id}/restore/   -> Restore archived article to draft (Staff only)
    """

    permission_classes = [IsAuthenticated, CanManageArticle]
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["title", "summary", "content"]
    ordering_fields = ["created_at", "updated_at", "published_at", "title"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        """Selects appropriate serializer based on the action."""
        if self.action == "retrieve":
            return ArticleDetailSerializer
        elif self.action in ("create", "update", "partial_update"):
            return ArticleCreateUpdateSerializer
        return ArticleListSerializer

    def get_queryset(self):
        """
        Dynamically scopes articles based on user role and visibility tier:
        - Clients: strictly PUBLISHED and PUBLIC articles.
        - Staff (Admin, Agent, Approver): all visibility tiers and statuses.
        - Query parameters support filtering by category, status, visibility, and author.
        """
        user = self.request.user
        queryset = Article.objects.select_related("category", "author").prefetch_related("revisions", "ticket_links")

        # 1. Base Security Access Filtering
        if user.role == User.Role.CLIENT:
            queryset = queryset.filter(
                status=Article.Status.PUBLISHED,
                visibility=Article.Visibility.PUBLIC,
            )
        else:
            # Internal staff can filter by status or visibility if supplied
            status_param = self.request.query_params.get("status")
            if status_param and status_param in Article.Status.values:
                queryset = queryset.filter(status=status_param)

            visibility_param = self.request.query_params.get("visibility")
            if visibility_param and visibility_param in Article.Visibility.values:
                queryset = queryset.filter(visibility=visibility_param)

        # 2. Category filtering
        category_param = self.request.query_params.get("category")
        if category_param:
            queryset = queryset.filter(category_id=category_param)

        # 3. Author filtering
        author_param = self.request.query_params.get("author")
        if author_param:
            queryset = queryset.filter(author_id=author_param)

        return queryset

    def perform_create(self, serializer):
        """Creates article draft via the service layer, assigning author automatically."""
        article = create_article(
            author=self.request.user,
            category=serializer.validated_data["category"],
            title=serializer.validated_data["title"],
            summary=serializer.validated_data["summary"],
            content=serializer.validated_data["content"],
            visibility=serializer.validated_data.get("visibility", Article.Visibility.PUBLIC),
        )
        serializer.instance = article

    def perform_update(self, serializer):
        """Updates article via the service layer (captures ArticleRevision snapshot)."""
        article = update_article(
            article=serializer.instance,
            user=self.request.user,
            **serializer.validated_data,
        )
        serializer.instance = article

    def destroy(self, request, *args, **kwargs):
        """Permanently deleting articles is prohibited. Archival is required."""
        return Response(
            {"detail": "Direct permanent deletion is prohibited. Use the archive endpoint (/archive/) instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    # --------------------------------------------------------------------------
    # PUBLISHING STATE MACHINE ACTIONS
    # --------------------------------------------------------------------------

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, CanPublishArticle], url_path="publish")
    def publish(self, request, pk=None):
        """Transitions an article from DRAFT to PUBLISHED."""
        article = self.get_object()
        publish_article(article, user=request.user)
        return Response(ArticleDetailSerializer(article).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, CanPublishArticle], url_path="unpublish")
    def unpublish(self, request, pk=None):
        """Transitions an article from PUBLISHED back to DRAFT."""
        article = self.get_object()
        unpublish_article(article, user=request.user)
        return Response(ArticleDetailSerializer(article).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, CanPublishArticle], url_path="archive")
    def archive(self, request, pk=None):
        """Transitions an article to ARCHIVED status."""
        article = self.get_object()
        archive_article(article, user=request.user)
        return Response(ArticleDetailSerializer(article).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, CanPublishArticle], url_path="restore")
    def restore(self, request, pk=None):
        """Restores an ARCHIVED article back to DRAFT status."""
        article = self.get_object()
        restore_article(article, user=request.user)
        return Response(ArticleDetailSerializer(article).data, status=status.HTTP_200_OK)


class TicketArticleViewSet(viewsets.ViewSet):
    """
    ViewSet for managing links between Knowledge Base Articles and Support Tickets.

    Endpoints:
    - GET    /api/knowledge/tickets/{ticket_id}/articles/              -> List articles linked to ticket
    - POST   /api/knowledge/tickets/{ticket_id}/articles/              -> Link an article to ticket (Staff only)
    - DELETE /api/knowledge/tickets/{ticket_id}/articles/{article_id}/ -> Unlink an article (Staff only)
    """

    permission_classes = [IsAuthenticated]

    def _get_ticket_with_permission(self, user, ticket_id):
        """
        Retrieves ticket while validating user access according to multi-tenant rules.
        """
        ticket = get_object_or_404(Ticket.objects.select_related("client"), pk=ticket_id)

        # System admins can access any ticket
        if is_system_admin(user):
            return ticket

        # Support agents can access tickets assigned to them
        if user.role == User.Role.SUPPORT_AGENT:
            return ticket

        # Clients and Approvers can only access tickets belonging to their active client organization
        if user.role in (User.Role.CLIENT, User.Role.APPROVER):
            if not user.client or ticket.client_id != user.client.id:
                raise PermissionDenied("You do not have access to this support ticket.")
            return ticket

        raise PermissionDenied("Access denied.")

    def list(self, request, ticket_id=None):
        """Lists all knowledge base articles linked to a specific ticket."""
        ticket = self._get_ticket_with_permission(request.user, ticket_id)

        queryset = ArticleTicket.objects.filter(ticket=ticket).select_related(
            "article",
            "article__category",
            "ticket",
            "linked_by",
        )

        # Clients cannot see linked internal or non-published articles
        if request.user.role == User.Role.CLIENT:
            queryset = queryset.filter(
                article__status=Article.Status.PUBLISHED,
                article__visibility=Article.Visibility.PUBLIC,
            )

        serializer = ArticleTicketSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, ticket_id=None):
        """Links an article to the ticket. (Restricted to internal staff)."""
        if not is_internal_staff(request.user):
            raise PermissionDenied("Only authorized support staff can link articles to tickets.")

        ticket = self._get_ticket_with_permission(request.user, ticket_id)

        article_id = request.data.get("article_id")
        if not article_id:
            raise ValidationError({"article_id": "This field is required."})

        article = get_object_or_404(Article, pk=article_id)

        link = link_article_to_ticket(article=article, ticket=ticket, user=request.user)
        return Response(ArticleTicketSerializer(link).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, ticket_id=None, pk=None):
        """
        Unlinks an article from the ticket.
        pk in this route represents the article_id to unlink.
        """
        if not is_internal_staff(request.user):
            raise PermissionDenied("Only authorized support staff can unlink articles from tickets.")

        ticket = self._get_ticket_with_permission(request.user, ticket_id)
        article = get_object_or_404(Article, pk=pk)

        unlink_article_from_ticket(article=article, ticket=ticket, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ArticleRevisionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for inspecting historical revisions of an article.
    Protected strictly for internal staff auditing.

    Endpoints:
    - GET /api/knowledge/articles/{article_id}/revisions/     -> List revisions
    - GET /api/knowledge/articles/{article_id}/revisions/{id}/ -> Retrieve specific revision
    """

    serializer_class = ArticleRevisionSerializer
    permission_classes = [IsAuthenticated, IsInternalStaff]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Fetches historical revisions for the specific article."""
        article_id = self.kwargs.get("article_id")
        return ArticleRevision.objects.filter(article_id=article_id).select_related("revised_by")

