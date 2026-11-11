"""
Management command to publish all draft Knowledge Base articles.

Transitions all articles currently in DRAFT status to PUBLISHED status,
ensuring they are visible to client portal users.

Usage:
    python manage.py publish_all_articles
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from knowledge_base.models import Article


class Command(BaseCommand):
    help = "Publishes all draft Knowledge Base articles so they are visible to clients."

    def handle(self, *args, **options):
        self.stdout.write("==> Scanning for draft Knowledge Base articles...")

        draft_articles = Article.objects.filter(status=Article.Status.DRAFT)
        count = draft_articles.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("All articles are already published."))
            return

        now = timezone.now()
        for article in draft_articles:
            article.status = Article.Status.PUBLISHED
            article.visibility = Article.Visibility.PUBLIC
            if not article.published_at:
                article.published_at = now
            article.save(update_fields=["status", "visibility", "published_at", "updated_at"])
            self.stdout.write(f"  [Published] #{article.id} '{article.title}' ({article.category.name})")

        self.stdout.write(
            self.style.SUCCESS(f"\n==> Successfully published {count} article(s). All articles are now live in the client portal!")
        )

