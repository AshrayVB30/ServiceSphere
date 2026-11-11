"""
Django Management Command: seed_demo_users

Seeds the ServiceSphere database with initial demo accounts, organizations,
SLA policies, and sample support tickets so administrators, support agents,
client users, and approvers can immediately sign in and explore the platform.

Usage:
    python manage.py seed_demo_users
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import models
from django.utils import timezone
from accounts.models import User
from clients.models import Client
from sla.models import SLAPolicy
from sla.services import assign_sla_to_ticket
from tickets.models import Ticket
from approvals.models import ApprovalRequest, ApprovalRecord


class Command(BaseCommand):
    help = "Seeds standard demo accounts, clients, SLA policies, and sample tickets."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("==> Seeding ServiceSphere Demo Environment..."))

        # -----------------------------------------------------------------
        # 1. Seed Client Organizations
        # -----------------------------------------------------------------
        acme_corp, _ = Client.objects.update_or_create(
            code="acme-corp",
            defaults={
                "name": "Acme Global Corp",
                "contact_email": "support@acmecorp.com",
                "phone_number": "+1-555-0100",
                "address": "100 Innovation Way, Suite 400, San Francisco, CA 94105",
                "is_active": True,
            },
        )
        self.stdout.write(self.style.SUCCESS(f"  [+] Client: {acme_corp.name} ({acme_corp.code})"))

        cyberdyne, _ = Client.objects.update_or_create(
            code="cyberdyne",
            defaults={
                "name": "Cyberdyne Systems",
                "contact_email": "admin@cyberdyne.net",
                "phone_number": "+1-555-0200",
                "address": "200 Robotics Blvd, Austin, TX 78701",
                "is_active": True,
            },
        )
        self.stdout.write(self.style.SUCCESS(f"  [+] Client: {cyberdyne.name} ({cyberdyne.code})"))

        # -----------------------------------------------------------------
        # 2. Seed Demo User Accounts
        # -----------------------------------------------------------------
        demo_users_data = [
            {
                "email": "admin@servicesphere.io",
                "username": "admin",
                "first_name": "System",
                "last_name": "Administrator",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "client": None,
                "phone_number": "+1-555-9000",
            },
            {
                "email": "agent@servicesphere.io",
                "username": "agent_sarah",
                "first_name": "Sarah",
                "last_name": "Connor",
                "role": User.Role.SUPPORT_AGENT,
                "is_staff": True,
                "is_superuser": False,
                "client": None,
                "phone_number": "+1-555-9001",
            },
            {
                "email": "client@acmecorp.com",
                "username": "client_john",
                "first_name": "John",
                "last_name": "Doe",
                "role": User.Role.CLIENT,
                "is_staff": False,
                "is_superuser": False,
                "client": acme_corp,
                "phone_number": "+1-555-9002",
            },
            {
                "email": "approver@acmecorp.com",
                "username": "approver_elena",
                "first_name": "Elena",
                "last_name": "Rostova",
                "role": User.Role.APPROVER,
                "is_staff": False,
                "is_superuser": False,
                "client": acme_corp,
                "phone_number": "+1-555-9003",
            },
        ]

        created_users = {}
        for udata in demo_users_data:
            email = udata["email"]
            username = udata["username"]

            # Match either by exact email or exact username to handle existing accounts
            user = User.objects.filter(models.Q(email__iexact=email) | models.Q(username__iexact=username)).first()
            created = False

            if not user:
                user = User(username=username, email=email)
                created = True

            user.email = email
            user.username = username
            user.first_name = udata["first_name"]
            user.last_name = udata["last_name"]
            user.role = udata["role"]
            user.is_staff = udata["is_staff"]
            user.is_superuser = udata["is_superuser"]
            user.client = udata["client"]
            user.phone_number = udata["phone_number"]
            user.set_password("Password123!")
            user.save()

            created_users[email] = user
            verb = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"  [+] {verb} user: {email} (username: {username}, {user.get_role_display()})"))

        # -----------------------------------------------------------------
        # 3. Seed Default SLA Policies
        # -----------------------------------------------------------------
        sla_policies = [
            {
                "name": "Standard Urgent SLA",
                "priority": Ticket.Priority.URGENT,
                "response_time_hours": Decimal("1.00"),
                "resolution_time_hours": Decimal("4.00"),
                "description": "Urgent tier for critical outages impacting core production workflows.",
            },
            {
                "name": "Standard High Priority SLA",
                "priority": Ticket.Priority.HIGH,
                "response_time_hours": Decimal("2.00"),
                "resolution_time_hours": Decimal("8.00"),
                "description": "High tier for major feature degradation without immediate full system outage.",
            },
            {
                "name": "Standard Medium Priority SLA",
                "priority": Ticket.Priority.MEDIUM,
                "response_time_hours": Decimal("4.00"),
                "resolution_time_hours": Decimal("24.00"),
                "description": "Medium tier for general operational inquiries, configuration questions, or bugs.",
            },
            {
                "name": "Standard Low Priority SLA",
                "priority": Ticket.Priority.LOW,
                "response_time_hours": Decimal("8.00"),
                "resolution_time_hours": Decimal("48.00"),
                "description": "Low tier for non-urgent tasks, cosmetic items, and minor adjustments.",
            },
        ]

        for sp in sla_policies:
            policy, _ = SLAPolicy.objects.update_or_create(
                priority=sp["priority"],
                defaults={
                    "name": sp["name"],
                    "response_time_hours": sp["response_time_hours"],
                    "resolution_time_hours": sp["resolution_time_hours"],
                    "description": sp["description"],
                    "is_active": True,
                },
            )
            self.stdout.write(self.style.SUCCESS(f"  [+] SLA Policy: {policy.name} ({policy.priority})"))

        # -----------------------------------------------------------------
        # 4. Seed Initial Tickets & Approval Workflows
        # -----------------------------------------------------------------
        client_user = created_users["client@acmecorp.com"]
        agent_user = created_users["agent@servicesphere.io"]
        approver_user = created_users["approver@acmecorp.com"]

        sample_tickets = [
            {
                "subject": "Production API rate limiting causing 429 timeouts on payment webhook",
                "description": "Our checkout workers are receiving HTTP 429 errors from the payment processing microservice during peak morning traffic bursts. Requesting immediate investigation into concurrency limits.",
                "category": "Bug",
                "priority": Ticket.Priority.HIGH,
                "status": Ticket.Status.IN_PROGRESS,
                "client": acme_corp,
                "created_by": client_user,
                "assigned_to": agent_user,
            },
            {
                "subject": "Security clearance request: AWS Production RDS read replica access",
                "description": "Lead data analyst requires read-only query credentials for the EU-West read replica to conduct quarterly audit reports. Requires manager sign-off.",
                "category": "Security & Access",
                "priority": Ticket.Priority.MEDIUM,
                "status": Ticket.Status.OPEN,
                "client": acme_corp,
                "created_by": client_user,
                "assigned_to": None,
                "has_approval": True,
            },
            {
                "subject": "Single Sign-On (SAML 2.0 / Okta) redirect loop on iOS mobile Safari",
                "description": "Mobile employees reporting redirect loop after authenticating via corporate Okta credentials on iOS 17+. Desktop Chrome and Firefox function normally.",
                "category": "Authentication",
                "priority": Ticket.Priority.URGENT,
                "status": Ticket.Status.OPEN,
                "client": acme_corp,
                "created_by": client_user,
                "assigned_to": agent_user,
            },
            {
                "subject": "Invoice reconciliation & tax credit adjustment for Q3 billing",
                "description": "Please review invoice #SS-2026-8819. The EU VAT exemption number was omitted from the automated line item calculation.",
                "category": "Billing",
                "priority": Ticket.Priority.LOW,
                "status": Ticket.Status.RESOLVED,
                "client": acme_corp,
                "created_by": client_user,
                "assigned_to": agent_user,
                "resolved_at": timezone.now(),
            },
        ]

        for tdata in sample_tickets:
            has_approval = tdata.pop("has_approval", False)
            resolved_at = tdata.pop("resolved_at", None)

            ticket, created = Ticket.objects.get_or_create(
                subject=tdata["subject"],
                defaults={
                    **tdata,
                    "resolved_at": resolved_at,
                },
            )

            # Assign SLA Tracking
            assign_sla_to_ticket(ticket)

            # Create an Approval Request if applicable
            if has_approval and not ApprovalRequest.objects.filter(ticket=ticket).exists():
                app_req = ApprovalRequest.objects.create(
                    ticket=ticket,
                    requested_by=agent_user,
                    approver=approver_user,
                    reason="Temporary 14-day read-only credential provisioning for quarterly compliance review.",
                    status=ApprovalRequest.Status.PENDING,
                )
                ApprovalRecord.objects.create(
                    approval_request=app_req,
                    action=ApprovalRecord.Action.SUBMITTED,
                    performed_by=agent_user,
                    comment="Initial access request submitted for compliance audit.",
                )
                self.stdout.write(self.style.SUCCESS(f"  [+] Approval Request created on ticket #{ticket.id}"))

            verb = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"  [+] {verb} ticket: #{ticket.id} '{ticket.subject[:45]}...'"))

        self.stdout.write(self.style.SUCCESS("\n==> Successfully seeded ServiceSphere demo database!"))
        self.stdout.write(self.style.NOTICE("Credentials for all demo accounts: Password123!"))
        self.stdout.write(self.style.NOTICE("  * Administrator: admin@servicesphere.io"))
        self.stdout.write(self.style.NOTICE("  * Support Agent: agent@servicesphere.io"))
        self.stdout.write(self.style.NOTICE("  * Client User:   client@acmecorp.com"))
        self.stdout.write(self.style.NOTICE("  * Approver:      approver@acmecorp.com"))
