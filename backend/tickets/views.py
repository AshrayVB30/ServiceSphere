"""
API Views for the 'tickets' application.

Exposes RESTful endpoints for viewing, creating, assigning, and advancing
the status of help desk tickets.
Enforces multi-tenant isolation, Role-Based Access Control (RBAC),
and state-machine transition rules:
- Admins: View all tickets and assign tickets to support agents.
- Support Agents: View tickets assigned to them and update their statuses.
- Clients: View their company's tickets and raise new tickets.
- All assignment and status modifications generate immutable TicketHistory audit records.
"""

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
# Shared admin check utility (avoids duplicating the same logic in tickets, approvals, and sla)
from accounts.utils import is_system_admin
from .comment_serializers import TicketCommentSerializer
from .models import Ticket, TicketHistory, TicketComment
from .serializers import TicketSerializer


class TicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing support tickets with multi-tenancy and controlled workflows.

    Standard Endpoints:
    - GET  /api/tickets/       -> List visible tickets (filtered by user role)
    - POST /api/tickets/       -> Create a new ticket (Client users only)
    - GET  /api/tickets/{id}/   -> Retrieve details of a specific ticket

    Workflow Action Endpoints:
    - POST /api/tickets/{id}/assign/        -> Assign ticket to an agent (Admin only)
    - POST /api/tickets/{id}/change_status/ -> Transition ticket status (Admin or assigned Agent)
    """

    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    # Limit standard HTTP methods (PUT, PATCH, DELETE are omitted to protect workflow integrity)
    http_method_names = ["get", "post", "head", "options"]

    # Allowed status transition map (State Machine rules)
    ALLOWED_TRANSITIONS = {
        Ticket.Status.OPEN: [Ticket.Status.IN_PROGRESS],
        Ticket.Status.IN_PROGRESS: [Ticket.Status.AWAITING_CUSTOMER, Ticket.Status.RESOLVED],
        Ticket.Status.AWAITING_CUSTOMER: [Ticket.Status.IN_PROGRESS, Ticket.Status.RESOLVED],
        Ticket.Status.RESOLVED: [Ticket.Status.IN_PROGRESS, Ticket.Status.CLOSED],
        Ticket.Status.CLOSED: [],  # Closed tickets cannot transition further
    }

    def get_queryset(self):
        """
        Dynamically filters tickets based on the authenticated user's role and organization.
        
        Rules:
        - System Admin: Sees all tickets across the platform.
        - Support Agent: Sees only tickets specifically assigned to them.
        - Client / Approver: Sees only tickets belonging to their own active company.
        - Other / Inactive: Empty list.
        """
        user = self.request.user

        # Pre-fetch related foreign key models to optimize database performance
        queryset = Ticket.objects.select_related(
            "client",
            "created_by",
            "assigned_to",
        )

        # 1. System administrators see all tickets
        if is_system_admin(user):
            return queryset

        # 2. Support agents see tickets assigned to them or created by them
        if user.role == User.Role.SUPPORT_AGENT:
            from django.db.models import Q
            return queryset.filter(Q(assigned_to=user) | Q(created_by=user))

        # 3. Client employees and approvers see only their organization's tickets
        if user.role in (User.Role.CLIENT, User.Role.APPROVER):
            if not user.client or not user.client.is_active:
                return Ticket.objects.none()
            return queryset.filter(client=user.client)

        # Fallback for unrecognized roles
        return Ticket.objects.none()

    def perform_create(self, serializer):
        """
        Creates a new support ticket and logs an initial CREATED audit history entry.
        Supports ticket creation by client users, support agents, and administrators.
        """
        user = self.request.user
        client = None

        if user.role == User.Role.CLIENT:
            client = user.client
            if not client:
                from clients.models import Client
                client = Client.objects.filter(is_active=True).first()
            if not client or not client.is_active:
                raise PermissionDenied("You must belong to an active client organization to submit a ticket.")
        else:
            # Admins, Agents, Approvers creating tickets
            from clients.models import Client
            client_id = self.request.data.get("client") or self.request.data.get("client_id")
            if client_id:
                try:
                    if str(client_id).isdigit():
                        client = Client.objects.filter(id=int(client_id), is_active=True).first()
                    else:
                        client = Client.objects.filter(code=client_id, is_active=True).first()
                except Exception:
                    pass

            if not client and user.client and user.client.is_active:
                client = user.client

            if not client:
                client = Client.objects.filter(is_active=True).first()

            if not client:
                raise ValidationError({"client": "No active client organization exists. Please onboard a client first."})

        # Save ticket and record initial audit history atomically
        with transaction.atomic():
            ticket = serializer.save(
                created_by=user,
                client=client,
            )
            TicketHistory.objects.create(
                ticket=ticket,
                action=TicketHistory.Action.CREATED,
                performed_by=user,
                new_status=ticket.status,
            )
            # Deferred imports below prevent circular dependency chains at module load time:
            # tickets → sla → tickets would cause an ImportError if imported at the top.

            # Automatically assign active SLA policy and calculate initial deadlines
            from sla.services import assign_sla_to_ticket  # noqa: PLC0415
            assign_sla_to_ticket(ticket)

            # Dispatch ticket creation notifications
            from notifications.services import notify_ticket_created  # noqa: PLC0415
            notify_ticket_created(ticket)

    @action(detail=True, methods=["get", "post"], url_path="assign")
    def assign(self, request, pk=None):
        """
        Assigns or reassigns a ticket to a support agent.
        
        GET: Displays current assignment and instructions (convenient for DRF Browsable API).
        POST: Executes the assignment.
        
        Endpoint: /api/tickets/{id}/assign/
        Authorization: System Administrators only.
        Payload:
        {
            "assigned_to": 2,
            "note": "Assigned for investigation"
        }
        """
        # Security: Only administrators can assign tickets
        if not is_system_admin(request.user):
            raise PermissionDenied("Only administrators can assign tickets to support agents.")

        ticket = self.get_object()

        # Handle GET requests (allows viewing endpoint details in the browser UI)
        if request.method == "GET":
            return Response({
                "ticket_id": ticket.id,
                "subject": ticket.subject,
                "current_assignee": ticket.assigned_to.username if ticket.assigned_to else None,
                "instructions": "Submit a POST request with JSON payload: {'assigned_to': <agent_user_id>, 'note': 'optional'}",
            })

        # Validate that 'assigned_to' ID was provided
        assigned_to_id = request.data.get("assigned_to")
        if not assigned_to_id:
            raise ValidationError({"assigned_to": "This field is required."})

        # Look up the target user
        try:
            agent = User.objects.get(id=assigned_to_id, is_active=True)
        except (User.DoesNotExist, ValueError):
            raise ValidationError({"assigned_to": "User not found or is currently inactive."})

        # Validate that the target user is a support agent or system admin
        if agent.role not in (User.Role.SUPPORT_AGENT, User.Role.ADMIN) and not agent.is_superuser:
            raise ValidationError({"assigned_to": "Tickets can only be assigned to support agents or administrators."})

        # Perform assignment and record history atomically
        with transaction.atomic():
            previous_agent = ticket.assigned_to
            ticket.assigned_to = agent
            ticket.save(update_fields=["assigned_to", "updated_at"])

            TicketHistory.objects.create(
                ticket=ticket,
                action=TicketHistory.Action.ASSIGNED,
                performed_by=request.user,
                previous_assignee=previous_agent,
                new_assignee=agent,
                note=request.data.get("note", ""),
            )

            # Dispatch ticket assignment notification
            from notifications.services import notify_ticket_assigned  # noqa: PLC0415
            notify_ticket_assigned(ticket, previous_assignee=previous_agent)

        return Response(TicketSerializer(ticket).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"], url_path="change_status")
    def change_status(self, request, pk=None):
        """
        Transitions a ticket to a new lifecycle status according to defined state machine rules.
        
        GET: Displays current status, allowed transitions, and instructions.
        POST: Executes the status change.
        
        Endpoint: /api/tickets/{id}/change_status/
        Authorization: System Administrators OR the currently assigned Support Agent.
        Payload:
        {
            "status": "IN_PROGRESS",
            "note": "Beginning diagnosis"
        }
        """
        ticket = self.get_object()
        user = request.user

        # Security: Only admins or the assigned support agent can change ticket status
        has_permission = is_system_admin(user) or (
            user.role == User.Role.SUPPORT_AGENT and ticket.assigned_to == user
        )
        if not has_permission:
            raise PermissionDenied("Only administrators or the assigned support agent can change ticket status.")

        # Handle GET requests (allows viewing available transitions in the browser UI)
        allowed_next_statuses = self.ALLOWED_TRANSITIONS.get(ticket.status, [])
        if request.method == "GET":
            return Response({
                "ticket_id": ticket.id,
                "current_status": ticket.status,
                "current_status_display": ticket.get_status_display(),
                "allowed_next_statuses": allowed_next_statuses,
                "instructions": "Submit a POST request with JSON payload: {'status': '<NEW_STATUS>', 'note': 'optional'}",
            })

        # Validate that 'status' was provided
        new_status = request.data.get("status")
        if not new_status:
            raise ValidationError({"status": "This field is required."})

        # Validate that 'status' is a recognized choice
        if new_status not in Ticket.Status.values:
            raise ValidationError({"status": f"Invalid status '{new_status}'."})

        # Validate status transition according to state machine rules
        if new_status not in allowed_next_statuses:
            allowed_labels = [dict(Ticket.Status.choices).get(s, s) for s in allowed_next_statuses]
            raise ValidationError({
                "status": f"Cannot transition ticket from '{ticket.get_status_display()}' to '{dict(Ticket.Status.choices).get(new_status, new_status)}'. Allowed transitions: {allowed_labels}"
            })

        # Perform status update, lifecycle timestamp updates, and audit logging atomically
        with transaction.atomic():
            previous_status = ticket.status
            ticket.status = new_status
            update_fields = ["status", "updated_at"]

            # If resolved, record timestamp
            if new_status == Ticket.Status.RESOLVED:
                ticket.resolved_at = timezone.now()
                update_fields.append("resolved_at")
            # If reopened from resolved back to in-progress, clear the resolved timestamp
            elif new_status == Ticket.Status.IN_PROGRESS and previous_status == Ticket.Status.RESOLVED:
                ticket.resolved_at = None
                update_fields.append("resolved_at")

            ticket.save(update_fields=update_fields)

            # Evaluate SLA resolution / reopened metrics
            from sla.services import record_ticket_resolution, record_ticket_reopened  # noqa: PLC0415
            if new_status in (Ticket.Status.RESOLVED, Ticket.Status.CLOSED):
                record_ticket_resolution(ticket)
            elif new_status == Ticket.Status.IN_PROGRESS and previous_status in (Ticket.Status.RESOLVED, Ticket.Status.CLOSED):
                record_ticket_reopened(ticket)

            # Record audit history
            TicketHistory.objects.create(
                ticket=ticket,
                action=TicketHistory.Action.STATUS_CHANGED,
                performed_by=user,
                previous_status=previous_status,
                new_status=new_status,
                note=request.data.get("note", ""),
            )

            # Dispatch ticket status update notification
            from notifications.services import notify_ticket_status_changed  # noqa: PLC0415
            notify_ticket_status_changed(
                ticket=ticket,
                previous_status=previous_status,
                new_status=new_status,
                performed_by=user,
            )

        return Response(TicketSerializer(ticket).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="change_priority")
    def change_priority(self, request, pk=None):
        """
        Updates the priority of a ticket and automatically recalculates SLA deadlines.
        POST /api/tickets/{id}/change_priority/
        """
        ticket = self.get_object()
        user = request.user
        if not (is_system_admin(user) or (user.role == User.Role.SUPPORT_AGENT and ticket.assigned_to == user)):
            raise PermissionDenied("Only administrators or the assigned agent can change ticket priority.")

        new_priority = request.data.get("priority")
        if not new_priority or new_priority not in Ticket.Priority.values:
            raise ValidationError({"priority": f"Invalid priority. Choices are {Ticket.Priority.values}."})

        previous_priority = ticket.priority
        if new_priority != previous_priority:
            ticket.priority = new_priority
            ticket.save(update_fields=["priority", "updated_at"])
            from sla.services import assign_sla_to_ticket  # noqa: PLC0415
            assign_sla_to_ticket(ticket, recalculated=True, previous_priority=previous_priority)

        return Response(TicketSerializer(ticket).data, status=status.HTTP_200_OK)



def can_access_ticket(user, ticket):
    """
    Determines whether a user has permission to access a specific ticket conversation.

    Access Control Rules:
    - System Administrators: Unrestricted access to all tickets.
    - Support Agents: Can only access tickets specifically assigned to them.
    - Clients and Approvers: Can only access tickets belonging to their own active organization.
    - Anyone else: Access denied.
    """
    if is_system_admin(user):
        return True

    if user.role == User.Role.SUPPORT_AGENT:
        return ticket.assigned_to_id == user.id or ticket.created_by_id == user.id

    if user.role in (User.Role.CLIENT, User.Role.APPROVER):
        return bool(
            user.client_id is not None
            and user.client_id == ticket.client_id
            and user.client.is_active
        )

    return False


def can_view_internal_comments(user):
    """
    Determines whether a user has clearance to view or author internal staff notes.

    Clearance Rules:
    - System Administrators and Support Agents: Permitted.
    - Clients, Approvers, and external users: Strictly forbidden.
    """
    return bool(
        is_system_admin(user)
        or user.role == User.Role.SUPPORT_AGENT
    )


class TicketCommentView(APIView):
    """
    API View for retrieving and adding comments on a specific ticket.

    Endpoints:
    - GET  /api/tickets/{ticket_id}/comments/ -> Retrieve chronological conversation history
    - POST /api/tickets/{ticket_id}/comments/ -> Post a new comment or internal note

    Security Features:
    1. Tenant isolation: Clients only see comments on their own company's tickets.
    2. Agent isolation: Agents only see comments on tickets assigned to them.
    3. Confidentiality: Internal staff notes (`is_internal=True`) are stripped from responses to clients.
    4. Author integrity: The comment author is always derived from the authenticated session.
    5. Approver role: Approvers can view conversation history, but cannot post comments.
    """

    permission_classes = [IsAuthenticated]

    def get_ticket(self, request, ticket_id):
        """
        Retrieves the ticket by primary key while validating that the requesting
        user has permission to view the ticket. Raises 404 if not found, or 403 if forbidden.
        """
        ticket = get_object_or_404(
            Ticket.objects.select_related("client", "assigned_to"),
            pk=ticket_id,
        )

        if not can_access_ticket(request.user, ticket):
            raise PermissionDenied("You do not have permission to access this ticket's conversation.")

        return ticket

    def get(self, request, ticket_id):
        """
        Retrieve all comments for a ticket in chronological order.
        Hides internal notes if the requesting user does not have internal staff clearance.
        """
        ticket = self.get_ticket(request, ticket_id)

        # Pre-fetch author relations for optimal query efficiency
        comments = ticket.comments.select_related("author").all()

        # If user is not internal staff, hide all internal notes
        if not can_view_internal_comments(request.user):
            comments = comments.filter(is_internal=False)

        serializer = TicketCommentSerializer(comments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, ticket_id):
        """
        Add a new comment or internal note to the ticket conversation.
        """
        ticket = self.get_ticket(request, ticket_id)
        user = request.user

        # Business Rule: Approvers can monitor discussions but cannot post comments
        if user.role == User.Role.APPROVER:
            raise PermissionDenied("Approvers can view ticket comments but cannot add comments.")

        # Robustly parse is_internal flag (handles JSON booleans, strings 'true'/'false', or integers 0/1)
        raw_internal = request.data.get("is_internal", False)
        if isinstance(raw_internal, str):
            is_internal = raw_internal.strip().lower() in ("true", "1", "yes", "t")
        else:
            is_internal = bool(raw_internal)

        # Security check: Clients cannot create internal notes
        if is_internal and not can_view_internal_comments(user):
            raise PermissionDenied("Only authorized support staff can create internal notes.")

        # Ensure clients can never post internal notes
        if user.role == User.Role.CLIENT:
            is_internal = False

        serializer = TicketCommentSerializer(data=request.data)
        if serializer.is_valid():
            # Securely attach the ticket, author, and internal status on the server
            comment = serializer.save(
                ticket=ticket,
                author=user,
                is_internal=is_internal,
            )
            # Evaluate qualifying first public response for SLA tracking
            from sla.services import record_first_response
            record_first_response(comment)

            # Dispatch comment notification (respects internal staff privacy)
            from notifications.services import notify_new_comment
            notify_new_comment(comment)

            return Response(TicketCommentSerializer(comment).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
