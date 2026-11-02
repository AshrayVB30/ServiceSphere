"""
Database Models for the 'knowledge_base' application.

Defines:
1. Category: Organizational taxonomy for grouping knowledge base articles.
2. Article: Documentation articles supporting Draft, Published, and Archived lifecycles.
3. ArticleTicket: Intermediary association between support tickets and relevant articles.
4. ArticleRevision: Immutable historical snapshot captured before article content modifications.
"""

from django.conf import settings
from django.db import models


class Category(models.Model):
    """
    Knowledge Base Category Model.

    Organizes articles into structured functional domains (e.g., Billing, Network, Troubleshooting).
    Supports safe deactivation (soft toggle) so categories referencing articles are never abruptly deleted.
    """

    # Unique category name displayed across support portals and dashboards
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique name of the category (e.g., 'Technical Support').",
    )

    # URL-safe identifier derived from the category name
    slug = models.SlugField(
        max_length=120,
        unique=True,
        db_index=True,
        help_text="URL-friendly slug generated from category name.",
    )

    # Descriptive overview explaining the scope and intent of the category
    description = models.TextField(
        blank=True,
        help_text="Optional summary or description of the category.",
    )

    # Active status toggle allowing administrators to archive categories without breaking existing links
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Designates whether this category is active and selectable for new articles.",
    )

    # Audit timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the category was created.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the category was last updated.",
    )

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "name"], name="kb_cat_active_name_idx"),
        ]

    def __str__(self):
        """String representation of the category."""
        status_label = "Active" if self.is_active else "Inactive"
        return f"{self.name} ({status_label})"


class Article(models.Model):
    """
    Knowledge Base Article Model.

    Represents a documentation article created by staff, supporting:
    - Controlled publication status transitions (DRAFT -> PUBLISHED -> ARCHIVED).
    - Granular visibility tiers (PUBLIC for all authenticated users; INTERNAL for staff only).
    - Relational integrity with categories and authors.
    """

    class Status(models.TextChoices):
        """Lifecycle states for knowledge articles."""
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        ARCHIVED = "ARCHIVED", "Archived"

    class Visibility(models.TextChoices):
        """Access visibility tiers."""
        PUBLIC = "PUBLIC", "Public"
        INTERNAL = "INTERNAL", "Internal"

    # Category linkage: on_delete=models.PROTECT prevents deleting categories containing articles
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="articles",
        help_text="Category to which this article belongs.",
    )

    # Author linkage: on_delete=models.PROTECT ensures author account retention for historical accountability
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="kb_articles",
        help_text="Support agent or administrator who authored this article.",
    )

    # Main title of the article
    title = models.CharField(
        max_length=255,
        help_text="Article title or headline.",
    )

    # Unique URL-friendly slug
    slug = models.SlugField(
        max_length=280,
        unique=True,
        db_index=True,
        help_text="Unique URL slug generated from the article title.",
    )

    # Short summary or excerpt displayed in search listings and card previews
    summary = models.TextField(
        help_text="Concise summary or overview of the article.",
    )

    # Full narrative body of the article (markdown or formatted text)
    content = models.TextField(
        help_text="Comprehensive article body and solution instructions.",
    )

    # Publishing lifecycle stage
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
        help_text="Current publication lifecycle stage of the article.",
    )

    # Audience visibility level
    visibility = models.CharField(
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.PUBLIC,
        db_index=True,
        help_text="Access tier: PUBLIC (all users) or INTERNAL (authorized staff only).",
    )

    # Lifecycle timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when the article draft was created.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the article was last modified.",
    )
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Timestamp when the article was transitioned to PUBLISHED status.",
    )

    class Meta:
        verbose_name = "Article"
        verbose_name_plural = "Articles"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "visibility"], name="kb_art_status_vis_idx"),
            models.Index(fields=["category", "status"], name="kb_art_cat_status_idx"),
            models.Index(fields=["author", "status"], name="kb_art_author_status_idx"),
        ]

    def __str__(self):
        """String representation of an article."""
        return f"[{self.status}] {self.title} ({self.visibility})"

    @property
    def is_published(self):
        """Helper checking if article is in PUBLISHED state."""
        return self.status == self.Status.PUBLISHED

    @property
    def is_internal(self):
        """Helper checking if article visibility is restricted to staff."""
        return self.visibility == self.Visibility.INTERNAL


class ArticleTicket(models.Model):
    """
    Intermediary Model linking Knowledge Base Articles to Support Tickets.

    Enables agents to associate relevant resolution articles with support tickets.
    Enforces uniqueness to prevent duplicate linkages between the same article and ticket.
    """

    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name="ticket_links",
        help_text="The linked knowledge base article.",
    )

    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="kb_article_links",
        help_text="The support ticket associated with this article.",
    )

    linked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="linked_kb_articles",
        help_text="User who linked this article to the ticket.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the link was created.",
    )

    class Meta:
        verbose_name = "Article Ticket Link"
        verbose_name_plural = "Article Ticket Links"
        ordering = ["-created_at"]
        unique_together = ("article", "ticket")
        indexes = [
            models.Index(fields=["ticket", "article"], name="kb_link_ticket_art_idx"),
        ]

    def __str__(self):
        """String representation of the ticket-article link."""
        return f"Article #{self.article_id} linked to Ticket #{self.ticket_id}"


class ArticleRevision(models.Model):
    """
    Article Revision History Model.

    Captures an immutable snapshot of previous article content, title, and summary
    before any meaningful update is committed, enabling audit trails and rollback capabilities.
    """

    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name="revisions",
        help_text="The article that this revision belongs to.",
    )

    revised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kb_revisions",
        help_text="Staff member who performed the revision.",
    )

    # Sequential revision number per article (1, 2, 3...)
    revision_number = models.PositiveIntegerField(
        help_text="Incremental sequence number for this article's revision history.",
    )

    # Historical content snapshot
    previous_title = models.CharField(
        max_length=255,
        help_text="Article title before this revision was applied.",
    )
    previous_summary = models.TextField(
        help_text="Article summary before this revision was applied.",
    )
    previous_content = models.TextField(
        help_text="Article body content before this revision was applied.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when this historical snapshot was recorded.",
    )

    class Meta:
        verbose_name = "Article Revision"
        verbose_name_plural = "Article Revisions"
        ordering = ["-revision_number"]
        unique_together = ("article", "revision_number")

    def __str__(self):
        """String representation of an article revision."""
        return f"Article #{self.article_id} (Rev #{self.revision_number})"

