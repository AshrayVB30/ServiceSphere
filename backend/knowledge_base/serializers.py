"""
Django REST Framework Serializers for the 'knowledge_base' application.

Provides serializers for:
1. CategorySerializer: Category details and live article counts.
2. ArticleListSerializer: Lightweight summaries for article lists and search feeds.
3. ArticleDetailSerializer: Full article view with content, author, and statistics.
4. ArticleCreateUpdateSerializer: Validates incoming payloads for article authoring and editing.
5. ArticleRevisionSerializer: Historical snapshots for audit reviews.
6. ArticleTicketSerializer: Representations for ticket-article associations.
"""

from rest_framework import serializers
from .models import Category, Article, ArticleRevision, ArticleTicket


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Knowledge Base Categories."""

    articles_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "articles_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "articles_count",
            "created_at",
            "updated_at",
        ]

    def get_articles_count(self, obj):
        """Returns the number of published articles currently associated with this category."""
        return obj.articles.filter(status=Article.Status.PUBLISHED).count()


class ArticleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer designed for article list views, search queries, and cards."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    author_username = serializers.CharField(source="author.username", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    visibility_display = serializers.CharField(source="get_visibility_display", read_only=True)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "category",
            "category_name",
            "author",
            "author_username",
            "status",
            "status_display",
            "visibility",
            "visibility_display",
            "published_at",
            "created_at",
        ]
        read_only_fields = fields


class ArticleDetailSerializer(serializers.ModelSerializer):
    """Comprehensive serializer including complete article content, metrics, and relationships."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    author_username = serializers.CharField(source="author.username", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    visibility_display = serializers.CharField(source="get_visibility_display", read_only=True)
    revisions_count = serializers.SerializerMethodField(read_only=True)
    linked_tickets_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "content",
            "category",
            "category_name",
            "author",
            "author_username",
            "status",
            "status_display",
            "visibility",
            "visibility_display",
            "published_at",
            "created_at",
            "updated_at",
            "revisions_count",
            "linked_tickets_count",
        ]
        read_only_fields = fields

    def get_revisions_count(self, obj):
        """Returns total historical revisions recorded for this article."""
        return obj.revisions.count()

    def get_linked_tickets_count(self, obj):
        """Returns count of support tickets currently referencing this article."""
        return obj.ticket_links.count()


class ArticleCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating articles.
    Enforces that 'status' and 'author' cannot be manipulated arbitrarily via normal POST/PATCH.
    """

    author_username = serializers.CharField(source="author.username", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Article
        fields = [
            "id",
            "category",
            "title",
            "slug",
            "summary",
            "content",
            "status",
            "status_display",
            "visibility",
            "author",
            "author_username",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "status",
            "status_display",
            "author",
            "author_username",
            "published_at",
            "created_at",
            "updated_at",
        ]

    def validate_category(self, value):
        """Validates that the selected category is active."""
        if not value.is_active:
            raise serializers.ValidationError(
                f"Selected category '{value.name}' is inactive. Articles can only be placed in active categories."
            )
        return value

    def validate_title(self, value):
        """Ensures title is non-empty."""
        clean = value.strip()
        if not clean:
            raise serializers.ValidationError("Title cannot be blank.")
        return clean

    def validate_summary(self, value):
        """Ensures summary is non-empty."""
        clean = value.strip()
        if not clean:
            raise serializers.ValidationError("Summary cannot be blank.")
        return clean

    def validate_content(self, value):
        """Ensures content is non-empty."""
        clean = value.strip()
        if not clean:
            raise serializers.ValidationError("Content cannot be blank.")
        return clean


class ArticleRevisionSerializer(serializers.ModelSerializer):
    """Serializer for Article Revision Snapshots."""

    revised_by_username = serializers.CharField(source="revised_by.username", read_only=True)

    class Meta:
        model = ArticleRevision
        fields = [
            "id",
            "article",
            "revision_number",
            "previous_title",
            "previous_summary",
            "previous_content",
            "revised_by",
            "revised_by_username",
            "created_at",
        ]
        read_only_fields = fields


class ArticleTicketSerializer(serializers.ModelSerializer):
    """Serializer for Article-Ticket linkages."""

    article_title = serializers.CharField(source="article.title", read_only=True)
    article_slug = serializers.CharField(source="article.slug", read_only=True)
    article_summary = serializers.CharField(source="article.summary", read_only=True)
    article_visibility = serializers.CharField(source="article.visibility", read_only=True)
    ticket_subject = serializers.CharField(source="ticket.subject", read_only=True)
    linked_by_username = serializers.CharField(source="linked_by.username", read_only=True)

    class Meta:
        model = ArticleTicket
        fields = [
            "id",
            "article",
            "article_title",
            "article_slug",
            "article_summary",
            "article_visibility",
            "ticket",
            "ticket_subject",
            "linked_by",
            "linked_by_username",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "article_title",
            "article_slug",
            "article_summary",
            "article_visibility",
            "ticket_subject",
            "linked_by_username",
            "created_at",
        ]

