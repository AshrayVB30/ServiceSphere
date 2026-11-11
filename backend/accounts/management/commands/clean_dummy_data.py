"""
Django Management Command: clean_dummy_data

Purges all non-admin data from the database so only the primary administrator
account remains. Wipes all tickets, clients, non-admin users, approval workflows,
notifications, comments, histories, and knowledge base entries.

Usage:
    python manage.py clean_dummy_data
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import User
from clients.models import Client
from tickets.models import Ticket, TicketComment, TicketHistory
from approvals.models import ApprovalRequest, ApprovalRecord
from sla.models import SLATracking, SLAEscalation
from notifications.models import Notification
from knowledge_base.models import Category, Article, ArticleRevision, ArticleTicket


class Command(BaseCommand):
    help = "Purges all non-admin data, retaining only the primary administrator account."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("==> Purging all non-admin data from database..."))

        with transaction.atomic():
            # 1. Knowledge Base
            ArticleTicket.objects.all().delete()
            ArticleRevision.objects.all().delete()
            art_count = Article.objects.all().delete()[0]
            cat_count = Category.objects.all().delete()[0]
            self.stdout.write(self.style.SUCCESS(f"  [-] Removed {art_count} articles and {cat_count} categories."))

            # 2. Approvals
            ApprovalRecord.objects.all().delete()
            app_count = ApprovalRequest.objects.all().delete()[0]
            self.stdout.write(self.style.SUCCESS(f"  [-] Removed {app_count} approval requests & decision logs."))

            # 3. SLA Tracking & Escalations
            SLAEscalation.objects.all().delete()
            sla_t_count = SLATracking.objects.all().delete()[0]
            self.stdout.write(self.style.SUCCESS(f"  [-] Removed {sla_t_count} SLA tracking records."))

            # 4. Tickets, Comments, History
            TicketComment.objects.all().delete()
            TicketHistory.objects.all().delete()
            t_count = Ticket.objects.all().delete()[0]
            self.stdout.write(self.style.SUCCESS(f"  [-] Removed {t_count} tickets."))

            # 5. Notifications
            n_count = Notification.objects.all().delete()[0]
            self.stdout.write(self.style.SUCCESS(f"  [-] Removed {n_count} notifications."))

            # 6. Non-Admin Users (keep only username='admin')
            admin_user = User.objects.filter(username="admin").first()
            if admin_user:
                # Ensure admin has no client linked
                admin_user.client = None
                admin_user.save()
                u_count = User.objects.exclude(id=admin_user.id).delete()[0]
            else:
                u_count = User.objects.exclude(role=User.Role.ADMIN).delete()[0]
            self.stdout.write(self.style.SUCCESS(f"  [-] Removed {u_count} non-admin user accounts."))

            # 7. Clients / Organizations
            c_count = Client.objects.all().delete()[0]
            self.stdout.write(self.style.SUCCESS(f"  [-] Removed {c_count} client organizations."))

        self.stdout.write(self.style.SUCCESS("\n==> Database purged! Only administrator account remains."))
        remaining_users = list(User.objects.values("id", "username", "email", "role"))
        self.stdout.write(self.style.NOTICE(f"Remaining Users: {remaining_users}"))
        self.stdout.write(self.style.NOTICE(f"Remaining Clients: {Client.objects.count()}"))
        self.stdout.write(self.style.NOTICE(f"Remaining Tickets: {Ticket.objects.count()}"))
