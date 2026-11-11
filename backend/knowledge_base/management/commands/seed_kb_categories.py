"""
Management command to seed default Knowledge Base categories.

Seeds the standard ServiceSphere documentation taxonomy so that
the Knowledge Base article authoring modal has categories available
in its dropdown selector.

Usage:
    python manage.py seed_kb_categories
"""

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from knowledge_base.models import Category


# Default category definitions: (name, description)
DEFAULT_CATEGORIES = [
    (
        "Technical Support",
        "Troubleshooting guides, diagnostic procedures, and system configuration references.",
    ),
    (
        "Billing & Invoicing",
        "Payment processing, invoice reconciliation, and subscription management documentation.",
    ),
    (
        "Account Access",
        "User provisioning, SSO/SAML configuration, MFA setup, and access control policies.",
    ),
    (
        "Network & Infrastructure",
        "DNS, load balancing, firewall rules, VPN connectivity, and cloud infrastructure runbooks.",
    ),
    (
        "API & Integrations",
        "REST API usage guides, webhook configuration, rate limiting, and third-party integration references.",
    ),
    (
        "Security & Compliance",
        "Incident response procedures, vulnerability remediation, and regulatory compliance checklists.",
    ),
]


class Command(BaseCommand):
    help = "Seeds default Knowledge Base categories for the article authoring modal."

    def handle(self, *args, **options):
        self.stdout.write("==> Seeding Knowledge Base Categories...")

        created_count = 0
        for name, description in DEFAULT_CATEGORIES:
            slug = slugify(name)
            category, created = Category.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "description": description,
                    "is_active": True,
                },
            )
            status_label = "Created" if created else "Exists"
            if created:
                created_count += 1
            self.stdout.write(f"  [{status_label}] {category.name} (slug: {slug})")

        self.stdout.write(
            self.style.SUCCESS(
                f"\n==> Done. {created_count} new categories seeded, "
                f"{len(DEFAULT_CATEGORIES) - created_count} already existed."
            )
        )

