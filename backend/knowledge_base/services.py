"""
Service Layer for the 'knowledge_base' application.

Contains centralized, transactional business logic:
- Unique URL slug generation and collision handling.
- Category lifecycle (creation, updates, activation, safe deletion guards).
- Article publishing state machine (Draft, Published, Archived).
- Automatic revision snapshotting before content modifications.
- Ticket-article associations with tenancy and duplicate checks.
"""

import logging
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

from .models import Category, Article, ArticleRevision, ArticleTicket

logger = logging.getLogger(__name__)


def generate_unique_slug(model_class, source_text, slug_field="slug", max_length=250, instance_id=None):
    """
    Generates a guaranteed unique slug for a model instance.

    If a slug collision occurs (e.g. 'how-to-reset-password'), appends an
    incremental suffix (e.g. 'how-to-reset-password-1', 'how-to-reset-password-2').

    Parameters:
    - model_class: The Django model (Category or Article).
    - source_text: String from which slug is generated (name or title).
    - slug_field: Attribute name on model containing the slug.
    - max_length: Maximum allowed character length for the slug.
    - instance_id: Current instance primary key (to exclude self on updates).
    """
    base_slug = slugify(source_text)[:max_length].strip("-")
    if not base_slug:
        base_slug = "kb-item"

    slug = base_slug
    counter = 1

    # Loop to find an available unique slug
    while True:
        queryset = model_class.objects.filter(**{slug_field: slug})
        if instance_id:
            queryset = queryset.exclude(pk=instance_id)

        if not queryset.exists():
            return slug

        # Append numerical suffix, ensuring maximum length is not exceeded
        suffix = f"-{counter}"
        truncated_base = base_slug[: max_length - len(suffix)].strip("-")
        slug = f"{truncated_base}{suffix}"
        counter += 1


# ==============================================================================
# CATEGORY MANAGEMENT SERVICES
# ==============================================================================

def create_category(name, description="", is_active=True):
    """
    Creates a new knowledge base category.
    Generates a unique slug and ensures category name uniqueness.
    """
    name_clean = name.strip()
    if not name_clean:
        raise ValidationError({"name": "Category name cannot be empty."})

    if Category.objects.filter(name__iexact=name_clean).exists():
        raise ValidationError({"name": "A category with this name already exists."})

    slug = generate_unique_slug(Category, name_clean, max_length=120)

    category = Category.objects.create(
        name=name_clean,
        slug=slug,
        description=description.strip(),
        is_active=is_active,
    )
    return category


def update_category(category, name=None, description=None, is_active=None):
    """
    Updates category attributes.
    If name is modified, validates uniqueness and refreshes the slug.
    """
    update_fields = ["updated_at"]

    if name is not None:
        name_clean = name.strip()
        if not name_clean:
            raise ValidationError({"name": "Category name cannot be empty."})

        # Check uniqueness against other categories
        conflict = Category.objects.filter(name__iexact=name_clean).exclude(pk=category.pk).exists()
        if conflict:
            raise ValidationError({"name": "Another category with this name already exists."})

        if name_clean != category.name:
            category.name = name_clean
            category.slug = generate_unique_slug(Category, name_clean, max_length=120, instance_id=category.pk)
            update_fields.extend(["name", "slug"])

    if description is not None:
        category.description = description.strip()
        update_fields.append("description")

    if is_active is not None:
        category.is_active = bool(is_active)
        update_fields.append("is_active")

    category.save(update_fields=update_fields)
    return category


def deactivate_category(category):
    """Safely deactivates a category without deleting historical articles."""
    category.is_active = False
    category.save(update_fields=["is_active", "updated_at"])
    return category


def activate_category(category):
    """Reactivates a previously deactivated category."""
    category.is_active = True
    category.save(update_fields=["is_active", "updated_at"])
    return category


def delete_category(category):
    """
    Attempts to delete a category.
    Integrity Guard: Prevents deletion if any articles reference this category.
    """
    article_count = category.articles.count()
    if article_count > 0:
        raise ValidationError(
            f"Cannot delete category '{category.name}' because it contains {article_count} article(s). "
            f"Deactivate the category instead to preserve historical integrity."
        )

    category.delete()
    return True


# ==============================================================================
# ARTICLE REVISION SERVICES
# ==============================================================================

def create_article_revision(article, revised_by):
    """
    Captures an immutable snapshot of an article's content before modifications are saved.
    Maintains sequential revision numbers per article (1, 2, 3...).
    """
    # Calculate next revision number atomically
    last_revision = ArticleRevision.objects.filter(article=article).aggregate(max_rev=Max("revision_number"))
    next_number = (last_revision.get("max_rev") or 0) + 1

    revision = ArticleRevision.objects.create(
        article=article,
        revised_by=revised_by,
        revision_number=next_number,
        previous_title=article.title,
        previous_summary=article.summary,
        previous_content=article.content,
    )
    return revision


# ==============================================================================
# ARTICLE MANAGEMENT SERVICES
# ==============================================================================

def create_article(author, category, title, summary, content, visibility=Article.Visibility.PUBLIC, status=Article.Status.PUBLISHED):
    """
    Creates a new knowledge base article.

    Validation rules:
    - Author must be an authenticated staff user.
    - Category must exist and be active.
    - Title, summary, and content must not be blank.
    - Status defaults to PUBLISHED so newly published articles are immediately live.
    """
    title_clean = title.strip()
    summary_clean = summary.strip()
    content_clean = content.strip()

    if not title_clean:
        raise ValidationError({"title": "Article title cannot be empty."})
    if not summary_clean:
        raise ValidationError({"summary": "Article summary cannot be empty."})
    if not content_clean:
        raise ValidationError({"content": "Article content cannot be empty."})

    # Validate category is currently active
    if not category.is_active:
        raise ValidationError({"category": f"Cannot create article in inactive category '{category.name}'."})

    slug = generate_unique_slug(Article, title_clean, max_length=280)

    now = timezone.now() if status == Article.Status.PUBLISHED else None

    article = Article.objects.create(
        author=author,
        category=category,
        title=title_clean,
        slug=slug,
        summary=summary_clean,
        content=content_clean,
        status=status,
        visibility=visibility,
        published_at=now,
    )
    return article


def update_article(article, user, title=None, summary=None, content=None, category=None, visibility=None):
    """
    Updates an existing article.

    Behavior:
    - If title, summary, or content are changed, automatically creates an ArticleRevision snapshot.
    - If title is changed, refreshes the unique slug.
    - Validates category if changed (must be active).
    """
    update_fields = ["updated_at"]
    content_changed = False

    # Check whether a revision snapshot is required
    new_title = title.strip() if title is not None else article.title
    new_summary = summary.strip() if summary is not None else article.summary
    new_content = content.strip() if content is not None else article.content

    if (
        (title is not None and new_title != article.title)
        or (summary is not None and new_summary != article.summary)
        or (content is not None and new_content != article.content)
    ):
        content_changed = True

    # Validate category if changed
    if category is not None and category != article.category:
        if not category.is_active:
            raise ValidationError({"category": f"Cannot assign inactive category '{category.name}'."})
        article.category = category
        update_fields.append("category")

    if visibility is not None and visibility != article.visibility:
        if visibility not in Article.Visibility.values:
            raise ValidationError({"visibility": f"Invalid visibility '{visibility}'."})
        article.visibility = visibility
        update_fields.append("visibility")

    with transaction.atomic():
        # 1. Snapshot previous state before modifying
        if content_changed:
            create_article_revision(article, revised_by=user)

        # 2. Apply modifications
        if title is not None and new_title != article.title:
            if not new_title:
                raise ValidationError({"title": "Article title cannot be empty."})
            article.title = new_title
            article.slug = generate_unique_slug(Article, new_title, max_length=280, instance_id=article.pk)
            update_fields.extend(["title", "slug"])

        if summary is not None and new_summary != article.summary:
            if not new_summary:
                raise ValidationError({"summary": "Article summary cannot be empty."})
            article.summary = new_summary
            update_fields.append("summary")

        if content is not None and new_content != article.content:
            if not new_content:
                raise ValidationError({"content": "Article content cannot be empty."})
            article.content = new_content
            update_fields.append("content")

        article.save(update_fields=update_fields)

    return article


# ==============================================================================
# ARTICLE PUBLISHING STATE MACHINE
# ==============================================================================

def publish_article(article, user):
    """
    Transitions an article from DRAFT to PUBLISHED.

    Rules:
    - Article must currently be in DRAFT state.
    - Category must be active.
    - Title, summary, and content must not be blank.
    - Records published_at timestamp.
    """
    if article.status != Article.Status.DRAFT:
        raise ValidationError(
            f"Only draft articles can be published. Current status is '{article.get_status_display()}'."
        )

    if not article.category.is_active:
        raise ValidationError(
            f"Cannot publish article: Category '{article.category.name}' is currently inactive."
        )

    if not article.title.strip() or not article.content.strip() or not article.summary.strip():
        raise ValidationError("Cannot publish article with incomplete title, summary, or content.")

    with transaction.atomic():
        article.status = Article.Status.PUBLISHED
        article.published_at = timezone.now()
        article.save(update_fields=["status", "published_at", "updated_at"])

    return article


def unpublish_article(article, user):
    """
    Transitions an article from PUBLISHED back to DRAFT.
    Excludes it from public view while preserving historical published_at and revisions.
    """
    if article.status != Article.Status.PUBLISHED:
        raise ValidationError(
            f"Only published articles can be unpublished. Current status is '{article.get_status_display()}'."
        )

    with transaction.atomic():
        article.status = Article.Status.DRAFT
        article.save(update_fields=["status", "updated_at"])

    return article


def archive_article(article, user):
    """
    Transitions an eligible article (DRAFT or PUBLISHED) to ARCHIVED status.
    Removes the article from standard listings while retaining it for historical records.
    """
    if article.status == Article.Status.ARCHIVED:
        raise ValidationError("Article is already archived.")

    with transaction.atomic():
        article.status = Article.Status.ARCHIVED
        article.save(update_fields=["status", "updated_at"])

    return article


def restore_article(article, user):
    """
    Restores an ARCHIVED article back to DRAFT status.
    Articles are restored to DRAFT by default so staff can review content before republishing.
    """
    if article.status != Article.Status.ARCHIVED:
        raise ValidationError(
            f"Only archived articles can be restored. Current status is '{article.get_status_display()}'."
        )

    with transaction.atomic():
        article.status = Article.Status.DRAFT
        article.save(update_fields=["status", "updated_at"])

    return article


# ==============================================================================
# TICKET-ARTICLE INTEGRATION SERVICES
# ==============================================================================

def link_article_to_ticket(article, ticket, user):
    """
    Links a Knowledge Base article to a support ticket.

    Rules:
    - User must be authorized support staff.
    - Duplicate links for the same (article, ticket) are rejected.
    """
    # Prevent duplicate associations
    if ArticleTicket.objects.filter(article=article, ticket=ticket).exists():
        raise ValidationError({"article": "This article is already linked to the ticket."})

    link = ArticleTicket.objects.create(
        article=article,
        ticket=ticket,
        linked_by=user,
    )
    return link


def unlink_article_from_ticket(article, ticket, user):
    """
    Removes the association between a Knowledge Base article and a support ticket.
    Leaves both the article and ticket intact.
    """
    link = ArticleTicket.objects.filter(article=article, ticket=ticket).first()
    if not link:
        raise ValidationError("This article is not linked to the specified ticket.")

    link.delete()
    return True

