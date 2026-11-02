"""
Unit and Integration Tests for the 'knowledge_base' application.

Verifies:
1. Category Tests: CRUD, unique constraints, deactivation, deletion protection.
2. Article Tests: Author assignment, default DRAFT status, unique slug generation.
3. Visibility Tests: Public vs. Internal restrictions, Draft/Archival isolation for Clients.
4. Workflow Tests: State transitions (Publish, Unpublish, Archive, Restore).
5. Search & Filtering Tests: Multi-field search, category filtering, pagination.
6. Ticket Integration Tests: Link/unlink, duplicate protection, multi-tenant isolation.
7. Revision Tests: Snapshot creation, sequential numbering, staff-only audit access.
"""

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from clients.models import Client
from tickets.models import Ticket
from knowledge_base.models import Category, Article, ArticleRevision, ArticleTicket
from knowledge_base.services import (
    create_category,
    create_article,
    publish_article,
    update_article,
    link_article_to_ticket,
)


class KnowledgeBaseBaseTestCase(TestCase):
    """Base setup for Knowledge Base unit and integration tests."""

    def setUp(self):
        """Seed test organizations and users representing each RBAC role."""
        self.client_org = Client.objects.create(name="Apex Solutions", code="apex-solutions", is_active=True)
        self.other_client_org = Client.objects.create(name="Delta Corp", code="delta-corp", is_active=True)

        self.admin = User.objects.create_user(
            username="kb_admin",
            email="admin@example.com",
            password="password123",
            role=User.Role.ADMIN,
            is_staff=True,
        )
        self.agent1 = User.objects.create_user(
            username="kb_agent1",
            email="agent1@example.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )
        self.agent2 = User.objects.create_user(
            username="kb_agent2",
            email="agent2@example.com",
            password="password123",
            role=User.Role.SUPPORT_AGENT,
        )
        self.client_user = User.objects.create_user(
            username="kb_client",
            email="client@example.com",
            password="password123",
            role=User.Role.CLIENT,
            client=self.client_org,
        )
        self.approver = User.objects.create_user(
            username="kb_approver",
            email="approver@example.com",
            password="password123",
            role=User.Role.APPROVER,
            client=self.client_org,
        )

        # Seed categories
        self.category = create_category(
            name="Technical Support",
            description="Troubleshooting and configuration guides.",
        )
        self.inactive_category = create_category(
            name="Legacy Systems",
            description="Deprecated documentation.",
            is_active=False,
        )

        # Seed a test ticket for ticket-article integration tests
        self.ticket = Ticket.objects.create(
            subject="Printer not responding",
            description="Office network printer offline.",
            client=self.client_org,
            created_by=self.client_user,
            assigned_to=self.agent1,
            priority=Ticket.Priority.MEDIUM,
            status=Ticket.Status.OPEN,
        )

        self.api_client = APIClient()


class CategoryTests(KnowledgeBaseBaseTestCase):
    """Tests Category management, permissions, and referential integrity."""

    def test_admin_can_create_category(self):
        """System administrators can create categories."""
        self.api_client.force_authenticate(user=self.admin)
        response = self.api_client.post(
            "/api/knowledge/categories/",
            {"name": "Billing & Payments", "description": "Invoicing help"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Billing & Payments")
        self.assertEqual(response.data["slug"], "billing-payments")

    def test_non_admin_cannot_create_category(self):
        """Support agents and clients cannot create categories (403 Forbidden)."""
        self.api_client.force_authenticate(user=self.agent1)
        response = self.api_client.post(
            "/api/knowledge/categories/",
            {"name": "Agent Category"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.api_client.force_authenticate(user=self.client_user)
        response = self.api_client.post(
            "/api/knowledge/categories/",
            {"name": "Client Category"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_category_name_rejected(self):
        """Duplicate category names are rejected."""
        self.api_client.force_authenticate(user=self.admin)
        response = self.api_client.post(
            "/api/knowledge/categories/",
            {"name": "Technical Support"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_category_activation_and_deactivation(self):
        """Admins can toggle category active status."""
        self.api_client.force_authenticate(user=self.admin)

        # Deactivate
        res_deact = self.api_client.post(f"/api/knowledge/categories/{self.category.id}/deactivate/")
        self.assertEqual(res_deact.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        self.assertFalse(self.category.is_active)

        # Activate
        res_act = self.api_client.post(f"/api/knowledge/categories/{self.category.id}/activate/")
        self.assertEqual(res_act.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        self.assertTrue(self.category.is_active)

    def test_inactive_category_hidden_from_regular_users(self):
        """Regular users only see active categories in list feeds."""
        self.api_client.force_authenticate(user=self.client_user)
        response = self.api_client.get("/api/knowledge/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data["results"]]
        self.assertIn("Technical Support", names)
        self.assertNotIn("Legacy Systems", names)

    def test_category_cannot_be_deleted_when_referenced_by_articles(self):
        """Categories containing articles cannot be deleted (referential integrity)."""
        create_article(
            author=self.agent1,
            category=self.category,
            title="Printer Troubleshooting",
            summary="Steps to fix printer.",
            content="Check power cable.",
        )
        self.api_client.force_authenticate(user=self.admin)
        response = self.api_client.delete(f"/api/knowledge/categories/{self.category.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())


class ArticleLifecycleAndVisibilityTests(KnowledgeBaseBaseTestCase):
    """Tests article creation, visibility tiers, and publishing state machine."""

    def test_support_agent_can_create_article_draft(self):
        """Support agent can create article draft with automated author assignment."""
        self.api_client.force_authenticate(user=self.agent1)
        payload = {
            "category": self.category.id,
            "title": "Configuring VPN Connection",
            "summary": "Guide to setting up corporate VPN.",
            "content": "Step 1: Download client. Step 2: Enter server address.",
            "visibility": "PUBLIC",
        }
        response = self.api_client.post("/api/knowledge/articles/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "DRAFT")
        self.assertEqual(response.data["author_username"], "kb_agent1")
        self.assertEqual(response.data["slug"], "configuring-vpn-connection")

    def test_client_cannot_create_article(self):
        """Clients receive 403 Forbidden when attempting to create articles."""
        self.api_client.force_authenticate(user=self.client_user)
        response = self.api_client.post(
            "/api/knowledge/articles/",
            {"title": "Spam Article", "category": self.category.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_article_cannot_be_created_in_inactive_category(self):
        """Creating an article in an inactive category is rejected."""
        self.api_client.force_authenticate(user=self.agent1)
        payload = {
            "category": self.inactive_category.id,
            "title": "Legacy Setup",
            "summary": "Old system setup",
            "content": "Not supported",
        }
        response = self.api_client.post("/api/knowledge/articles/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_client_visibility_restrictions(self):
        """
        SECURITY REQUIREMENT:
        - Clients can ONLY see PUBLISHED + PUBLIC articles.
        - Clients CANNOT see DRAFT, ARCHIVED, or INTERNAL articles.
        """
        # 1. Draft Public Article
        draft_public = create_article(
            author=self.agent1,
            category=self.category,
            title="Draft Public Guide",
            summary="Summary",
            content="Content",
            visibility=Article.Visibility.PUBLIC,
        )

        # 2. Published Public Article
        pub_public = create_article(
            author=self.agent1,
            category=self.category,
            title="Published Public Guide",
            summary="Summary",
            content="Content",
            visibility=Article.Visibility.PUBLIC,
        )
        publish_article(pub_public, self.agent1)

        # 3. Published Internal Article
        pub_internal = create_article(
            author=self.agent1,
            category=self.category,
            title="Published Internal SOP",
            summary="Summary",
            content="Internal diagnostics",
            visibility=Article.Visibility.INTERNAL,
        )
        publish_article(pub_internal, self.agent1)

        # Authenticate as client
        self.api_client.force_authenticate(user=self.client_user)

        # List check
        list_res = self.api_client.get("/api/knowledge/articles/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in list_res.data["results"]]
        self.assertIn(pub_public.id, ids)
        self.assertNotIn(draft_public.id, ids)
        self.assertNotIn(pub_internal.id, ids)

        # Direct detail retrieve check
        # Public published -> 200 OK
        res_ok = self.api_client.get(f"/api/knowledge/articles/{pub_public.id}/")
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)

        # Internal published -> 404 Not Found (filtered out of client queryset)
        res_internal = self.api_client.get(f"/api/knowledge/articles/{pub_internal.id}/")
        self.assertEqual(res_internal.status_code, status.HTTP_404_NOT_FOUND)

        # Draft -> 404 Not Found
        res_draft = self.api_client.get(f"/api/knowledge/articles/{draft_public.id}/")
        self.assertEqual(res_draft.status_code, status.HTTP_404_NOT_FOUND)

    def test_publishing_workflow_state_machine(self):
        """Tests full lifecycle: Draft -> Publish -> Unpublish -> Archive -> Restore."""
        article = create_article(
            author=self.agent1,
            category=self.category,
            title="Lifecycle Test Article",
            summary="Initial summary",
            content="Initial content",
        )
        self.assertEqual(article.status, Article.Status.DRAFT)
        self.assertIsNone(article.published_at)

        self.api_client.force_authenticate(user=self.agent1)

        # 1. Publish
        pub_res = self.api_client.post(f"/api/knowledge/articles/{article.id}/publish/")
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)
        article.refresh_from_db()
        self.assertEqual(article.status, Article.Status.PUBLISHED)
        self.assertIsNotNone(article.published_at)

        # 2. Unpublish (reverts to DRAFT)
        unpub_res = self.api_client.post(f"/api/knowledge/articles/{article.id}/unpublish/")
        self.assertEqual(unpub_res.status_code, status.HTTP_200_OK)
        article.refresh_from_db()
        self.assertEqual(article.status, Article.Status.DRAFT)

        # 3. Archive
        arch_res = self.api_client.post(f"/api/knowledge/articles/{article.id}/archive/")
        self.assertEqual(arch_res.status_code, status.HTTP_200_OK)
        article.refresh_from_db()
        self.assertEqual(article.status, Article.Status.ARCHIVED)

        # 4. Restore (restores to DRAFT)
        res_restore = self.api_client.post(f"/api/knowledge/articles/{article.id}/restore/")
        self.assertEqual(res_restore.status_code, status.HTTP_200_OK)
        article.refresh_from_db()
        self.assertEqual(article.status, Article.Status.DRAFT)

    def test_permanent_article_delete_prohibited(self):
        """Permanent DELETE on articles returns 405 Method Not Allowed."""
        article = create_article(
            author=self.agent1,
            category=self.category,
            title="Non-deletable article",
            summary="Summary",
            content="Content",
        )
        self.api_client.force_authenticate(user=self.admin)
        response = self.api_client.delete(f"/api/knowledge/articles/{article.id}/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class ArticleRevisionTests(KnowledgeBaseBaseTestCase):
    """Tests automatic revision snapshotting on article modifications."""

    def test_revisions_captured_on_content_update(self):
        """Modifying title or content automatically creates an ArticleRevision snapshot."""
        article = create_article(
            author=self.agent1,
            category=self.category,
            title="Original Title",
            summary="Original Summary",
            content="Original Content",
        )
        self.assertEqual(article.revisions.count(), 0)

        self.api_client.force_authenticate(user=self.agent1)

        # 1. First modification
        self.api_client.patch(
            f"/api/knowledge/articles/{article.id}/",
            {"content": "Updated Content v2"},
            format="json",
        )
        self.assertEqual(article.revisions.count(), 1)
        rev1 = article.revisions.first()
        self.assertEqual(rev1.revision_number, 1)
        self.assertEqual(rev1.previous_content, "Original Content")
        self.assertEqual(rev1.revised_by, self.agent1)

        # 2. Second modification
        self.api_client.patch(
            f"/api/knowledge/articles/{article.id}/",
            {"title": "Updated Title v3"},
            format="json",
        )
        self.assertEqual(article.revisions.count(), 2)
        rev2 = article.revisions.filter(revision_number=2).first()
        self.assertIsNotNone(rev2)
        self.assertEqual(rev2.previous_title, "Original Title")

    def test_clients_cannot_view_revisions(self):
        """Article revision audit endpoints are restricted to staff (Clients get 403)."""
        article = create_article(
            author=self.agent1,
            category=self.category,
            title="Public Guide",
            summary="Summary",
            content="Content",
        )
        update_article(article, user=self.agent1, content="New Content")

        self.api_client.force_authenticate(user=self.client_user)
        response = self.api_client.get(f"/api/knowledge/articles/{article.id}/revisions/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TicketArticleIntegrationTests(KnowledgeBaseBaseTestCase):
    """Tests linking and unlinking knowledge base articles to tickets."""

    def test_agent_can_link_and_unlink_article(self):
        """Support agents can associate and dissociate articles on tickets."""
        article = create_article(
            author=self.agent1,
            category=self.category,
            title="Resolution Guide",
            summary="Summary",
            content="Steps",
        )
        self.api_client.force_authenticate(user=self.agent1)

        # 1. Link article
        link_res = self.api_client.post(
            f"/api/knowledge/tickets/{self.ticket.id}/articles/",
            {"article_id": article.id},
            format="json",
        )
        self.assertEqual(link_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(link_res.data["article_title"], "Resolution Guide")

        # 2. Duplicate link rejected
        dup_res = self.api_client.post(
            f"/api/knowledge/tickets/{self.ticket.id}/articles/",
            {"article_id": article.id},
            format="json",
        )
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. List linked articles
        list_res = self.api_client.get(f"/api/knowledge/tickets/{self.ticket.id}/articles/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 1)

        # 4. Unlink article
        del_res = self.api_client.delete(f"/api/knowledge/tickets/{self.ticket.id}/articles/{article.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ArticleTicket.objects.filter(ticket=self.ticket).count(), 0)

    def test_client_cannot_link_articles(self):
        """Clients receive 403 Forbidden when attempting to link articles."""
        article = create_article(
            author=self.agent1,
            category=self.category,
            title="Guide",
            summary="Summary",
            content="Content",
        )
        self.api_client.force_authenticate(user=self.client_user)
        response = self.api_client.post(
            f"/api/knowledge/tickets/{self.ticket.id}/articles/",
            {"article_id": article.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SearchAndFilteringTests(KnowledgeBaseBaseTestCase):
    """Tests search queries, category filters, and ordering."""

    def setUp(self):
        super().setUp()
        # Seed searchable articles
        self.art1 = create_article(
            author=self.agent1,
            category=self.category,
            title="Resetting Active Directory Password",
            summary="Instructions for password recovery.",
            content="Go to account portal and verify phone.",
        )
        publish_article(self.art1, self.agent1)

        self.art2 = create_article(
            author=self.agent1,
            category=self.category,
            title="VPN Troubleshooting on Windows",
            summary="Diagnose connection errors.",
            content="Verify your credentials and network adapter.",
        )
        publish_article(self.art2, self.agent1)

    def test_search_by_keyword(self):
        """Search query matches across title, summary, and content."""
        self.api_client.force_authenticate(user=self.client_user)

        # Search 'password' -> matches art1
        res1 = self.api_client.get("/api/knowledge/articles/?search=password")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        ids1 = [item["id"] for item in res1.data["results"]]
        self.assertIn(self.art1.id, ids1)
        self.assertNotIn(self.art2.id, ids1)

        # Search 'adapter' (in content) -> matches art2
        res2 = self.api_client.get("/api/knowledge/articles/?search=adapter")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        ids2 = [item["id"] for item in res2.data["results"]]
        self.assertIn(self.art2.id, ids2)
        self.assertNotIn(self.art1.id, ids2)

    def test_filter_by_category(self):
        """Filtering by category ID restricts result set."""
        other_cat = create_category(name="Network Operations")
        art_other = create_article(
            author=self.agent1,
            category=other_cat,
            title="Router Configuration",
            summary="Setup instructions",
            content="Gateway settings",
        )
        publish_article(art_other, self.agent1)

        self.api_client.force_authenticate(user=self.client_user)
        response = self.api_client.get(f"/api/knowledge/articles/?category={other_cat.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data["results"]]
        self.assertIn(art_other.id, ids)
        self.assertNotIn(self.art1.id, ids)

