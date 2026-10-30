"""
API Views for the 'sla' application.

Exposes RESTful endpoints for:
1. SLAPolicyViewSet: Admin management of SLA policies (List, Create, Retrieve, Partial Update, Activate, Deactivate).
2. TicketSLADetailView: Retrieving SLA tracking metrics for a specific ticket (Tenant & Role protected).
3. SLAMonitoringSummaryView: Global SLA health dashboard metrics (Admin only).
4. OverdueTicketsView: List of currently breached and overdue active tickets.
5. SLAEscalationViewSet: Viewing and acknowledging escalation records and alerts.
"""

from django.db import models, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from tickets.models import Ticket
from .models import SLAPolicy, SLATracking, SLAEscalation
from .permissions import IsSystemAdmin, CanViewTicketSLA
from .serializers import (
    SLAPolicySerializer,
    SLATrackingSerializer,
    SLAEscalationSerializer,
)


class SLAPolicyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing SLA Policies.
    Restricted strictly to system administrators.
    """

    queryset = SLAPolicy.objects.all()
    serializer_class = SLAPolicySerializer
    permission_classes = [IsAuthenticated, IsSystemAdmin]
    http_method_names = ["get", "post", "patch", "head", "options"]

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        """
        Activates an SLA policy after validating that no other active policy
        exists for the same priority.
        """
        policy = self.get_object()

        # Check for conflicting active policies
        conflict = SLAPolicy.objects.filter(priority=policy.priority, is_active=True).exclude(pk=policy.pk)
        if conflict.exists():
            return Response(
                {
                    "error": f"Cannot activate policy. Another active policy ('{conflict.first().name}') already exists for priority '{policy.priority}'."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        policy.is_active = True
        policy.save(update_fields=["is_active", "updated_at"])
        return Response(SLAPolicySerializer(policy).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        """
        Deactivates an active SLA policy.
        """
        policy = self.get_object()
        policy.is_active = False
        policy.save(update_fields=["is_active", "updated_at"])
        return Response(SLAPolicySerializer(policy).data, status=status.HTTP_200_OK)


class TicketSLADetailView(APIView):
    """
    Endpoint for inspecting the detailed SLA tracking metrics of an individual ticket.
    GET /api/sla/tickets/{ticket_id}/

    Security:
    - Admins: Access any ticket's SLA.
    - Support Agents: Only access SLA for tickets assigned to them.
    - Clients and Approvers: Only access SLA for tickets belonging to their active company.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, ticket_id):
        ticket = get_object_or_404(
            Ticket.objects.select_related("client", "assigned_to"),
            pk=ticket_id,
        )

        user = request.user
        is_admin = user.is_superuser or (user.is_staff and user.role == User.Role.ADMIN)

        if not is_admin:
            if user.role == User.Role.SUPPORT_AGENT and ticket.assigned_to_id != user.id:
                raise PermissionDenied("You do not have permission to view SLA details for this ticket.")

            if user.role in (User.Role.CLIENT, User.Role.APPROVER):
                if not (user.client_id and user.client_id == ticket.client_id and user.client.is_active):
                    raise PermissionDenied("You do not have permission to view SLA details for this ticket.")

        tracking = get_object_or_404(
            SLATracking.objects.select_related("ticket", "policy"),
            ticket=ticket,
        )

        serializer = SLATrackingSerializer(tracking)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SLAMonitoringSummaryView(APIView):
    """
    Endpoint providing aggregated SLA health metrics across all active tickets.
    GET /api/sla/monitoring/

    Authorization: System administrators only.
    """

    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def get(self, request):
        active_tickets = Ticket.objects.exclude(
            status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]
        )

        active_trackings = SLATracking.objects.filter(ticket__in=active_tickets)

        data = {
            "total_active_tickets": active_tickets.count(),
            "tickets_within_sla": active_trackings.filter(
                response_status=SLATracking.SLAStatus.WITHIN_SLA,
                resolution_status=SLATracking.SLAStatus.WITHIN_SLA,
            ).count(),
            "tickets_approaching_response": active_trackings.filter(
                response_status=SLATracking.SLAStatus.APPROACHING
            ).count(),
            "tickets_approaching_resolution": active_trackings.filter(
                resolution_status=SLATracking.SLAStatus.APPROACHING
            ).count(),
            "tickets_breached_response": active_trackings.filter(
                response_status=SLATracking.SLAStatus.BREACHED
            ).count(),
            "tickets_breached_resolution": active_trackings.filter(
                resolution_status=SLATracking.SLAStatus.BREACHED
            ).count(),
            "total_escalations": SLAEscalation.objects.count(),
            "unacknowledged_escalations": SLAEscalation.objects.filter(is_acknowledged=False).count(),
        }

        return Response(data, status=status.HTTP_200_OK)


class OverdueTicketsView(APIView):
    """
    Lists all active tickets that have breached either their first-response or resolution SLA.
    GET /api/sla/overdue-tickets/

    Filters supported via query parameters:
    - ?priority=HIGH
    - ?client_id=1
    - ?assigned_to=2
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        is_admin = user.is_superuser or (user.is_staff and user.role == User.Role.ADMIN)

        # Clients cannot access global overdue lists
        if user.role == User.Role.CLIENT:
            raise PermissionDenied("Clients cannot access global SLA overdue reports.")

        queryset = SLATracking.objects.filter(
            ticket__status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS, Ticket.Status.AWAITING_CUSTOMER]
        ).filter(
            models.Q(response_status=SLATracking.SLAStatus.BREACHED)
            | models.Q(resolution_status=SLATracking.SLAStatus.BREACHED)
        ).select_related("ticket", "ticket__client", "ticket__assigned_to", "policy")

        # Agents only see their assigned overdue tickets
        if not is_admin and user.role == User.Role.SUPPORT_AGENT:
            queryset = queryset.filter(ticket__assigned_to=user)

        # Apply query parameter filters
        priority = request.query_params.get("priority")
        if priority:
            queryset = queryset.filter(ticket__priority=priority)

        client_id = request.query_params.get("client_id")
        if client_id:
            queryset = queryset.filter(ticket__client_id=client_id)

        assigned_to = request.query_params.get("assigned_to")
        if assigned_to:
            queryset = queryset.filter(ticket__assigned_to_id=assigned_to)

        serializer = SLATrackingSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SLAEscalationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing and acknowledging SLA Escalation records.
    GET   /api/sla/escalations/
    GET   /api/sla/escalations/{id}/
    POST  /api/sla/escalations/{id}/acknowledge/
    """

    serializer_class = SLAEscalationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        is_admin = user.is_superuser or (user.is_staff and user.role == User.Role.ADMIN)

        if is_admin:
            queryset = SLAEscalation.objects.all()
        elif user.role == User.Role.SUPPORT_AGENT:
            queryset = SLAEscalation.objects.filter(
                models.Q(assigned_recipient=user) | models.Q(ticket__assigned_to=user)
            )
        else:
            # Clients cannot access internal escalation history
            return SLAEscalation.objects.none()

        # Query filters
        priority = self.request.query_params.get("priority")
        if priority:
            queryset = queryset.filter(ticket__priority=priority)

        level = self.request.query_params.get("level")
        if level:
            queryset = queryset.filter(escalation_level=level)

        acknowledged = self.request.query_params.get("is_acknowledged")
        if acknowledged is not None:
            queryset = queryset.filter(is_acknowledged=acknowledged.lower() in ("true", "1"))

        return queryset.select_related(
            "ticket", "assigned_recipient", "acknowledged_by", "sla_tracking"
        )

    @action(detail=True, methods=["post"], url_path="acknowledge")
    def acknowledge(self, request, pk=None):
        """
        Formally acknowledge an SLA escalation alert.
        POST /api/sla/escalations/{id}/acknowledge/
        """
        escalation = self.get_object()
        user = request.user

        is_admin = user.is_superuser or (user.is_staff and user.role == User.Role.ADMIN)

        # Only the notified recipient or an admin can acknowledge
        if not (is_admin or escalation.assigned_recipient_id == user.id):
            raise PermissionDenied("Only the designated recipient or an administrator can acknowledge this escalation.")

        if escalation.is_acknowledged:
            raise ValidationError("This escalation has already been acknowledged.")

        notes = request.data.get("notes", "")

        escalation.is_acknowledged = True
        escalation.acknowledged_by = user
        escalation.acknowledged_at = timezone.now()
        if notes:
            escalation.notes = notes

        escalation.save(update_fields=["is_acknowledged", "acknowledged_by", "acknowledged_at", "notes"])

        return Response(SLAEscalationSerializer(escalation).data, status=status.HTTP_200_OK)

