"""
API Views for the 'approvals' application.

Exposes RESTful endpoints for:
1. Submitting an approval request for a ticket (POST /api/approvals/)
2. Listing and viewing authorized requests (GET /api/approvals/ & GET /api/approvals/{id}/)
3. Approving a request (POST /api/approvals/{id}/approve/)
4. Rejecting a request (POST /api/approvals/{id}/reject/)
5. Requesting additional information (POST /api/approvals/{id}/request-info/)
6. Resubmitting an updated request (POST /api/approvals/{id}/resubmit/)

Enforces Role-Based Access Control (RBAC):
- Only Support Agents and Admins can submit approval requests.
- Only the assigned Approver (or Admin) can decide (Approve, Reject, Request Info).
- Every decision or resubmission is atomically recorded in ApprovalRecord.
"""

from django.db import models, transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from .models import ApprovalRequest, ApprovalRecord
from .serializers import ApprovalRequestSerializer


def is_system_admin(user):
    """
    Helper function checking if a user has platform administrator privileges.
    Returns True for Django superusers and staff with role='ADMIN'.
    """
    return bool(
        user
        and user.is_authenticated
        and (
            user.is_superuser
            or (user.is_staff and user.role == User.Role.ADMIN)
        )
    )


class ApprovalRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing, creating, and transitioning Approval Requests.

    Endpoints:
    - GET    /api/approvals/               -> List authorized approval requests
    - POST   /api/approvals/               -> Submit a new approval request
    - GET    /api/approvals/{id}/          -> Retrieve details and audit trail
    - POST   /api/approvals/{id}/approve/  -> Approve the request (Approver only)
    - POST   /api/approvals/{id}/reject/   -> Reject the request (Approver only)
    - POST   /api/approvals/{id}/request-info/ -> Request more info (Approver only)
    - POST   /api/approvals/{id}/resubmit/ -> Resubmit after providing info (Requester only)
    """

    serializer_class = ApprovalRequestSerializer
    permission_classes = [IsAuthenticated]

    # Limit standard HTTP methods (PUT, PATCH, DELETE are disabled to protect workflow auditability)
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        """
        Dynamically scopes approval requests based on the user's role and organization.

        Queryset Rules:
        - System Admin: All approval requests.
        - Approver: Requests where they are the designated approver, or requests belonging to their client company.
        - Support Agent: Requests they submitted, or requests on tickets assigned to them.
        - Client: Requests tied to tickets belonging to their active client organization.
        """
        user = self.request.user

        queryset = ApprovalRequest.objects.select_related(
            "ticket",
            "requested_by",
            "approver",
        ).prefetch_related(
            "records__performed_by",
        )

        # 1. System administrators see all requests
        if is_system_admin(user):
            return queryset

        # 2. Approver: see requests assigned to them or tied to their company
        if user.role == User.Role.APPROVER:
            if user.client_id:
                return queryset.filter(
                    models.Q(approver=user) | models.Q(ticket__client_id=user.client_id)
                )
            return queryset.filter(approver=user)

        # 3. Support Agent: see requests they submitted or where they are assigned to the ticket
        if user.role == User.Role.SUPPORT_AGENT:
            return queryset.filter(
                models.Q(requested_by=user) | models.Q(ticket__assigned_to=user)
            )

        # 4. Client: see requests tied to their company's tickets
        if user.role == User.Role.CLIENT:
            if not user.client or not user.client.is_active:
                return ApprovalRequest.objects.none()
            return queryset.filter(ticket__client=user.client)

        return ApprovalRequest.objects.none()

    def perform_create(self, serializer):
        """
        Handles creation of an approval request.
        Security: Only Support Agents and Administrators can initiate approval requests.
        """
        user = self.request.user

        # Only internal staff (agents and admins) can submit an approval request
        if not (is_system_admin(user) or user.role == User.Role.SUPPORT_AGENT):
            raise PermissionDenied("Only support agents or administrators can request approval.")

        # Ensure the creating user is recorded as requested_by and status starts at PENDING
        with transaction.atomic():
            approval_req = serializer.save(
                requested_by=user,
                status=ApprovalRequest.Status.PENDING,
            )

            # Record initial submission audit record
            ApprovalRecord.objects.create(
                approval_request=approval_req,
                action=ApprovalRecord.Action.SUBMITTED,
                performed_by=user,
                comment=approval_req.reason,
            )

            # Dispatch approval request notification
            from notifications.services import notify_approval_submitted
            notify_approval_submitted(approval_req)

    @action(detail=True, methods=["get", "post"], url_path="approve")
    def approve(self, request, pk=None):
        """
        Approve the request.

        Authorization: Only the designated approver or a system administrator.
        Allowed states: PENDING, INFO_REQUESTED.
        """
        approval_req = self.get_object()
        user = request.user

        # Authorization check
        if not (is_system_admin(user) or approval_req.approver_id == user.id):
            raise PermissionDenied("Only the designated approver can approve this request.")

        # State check
        if approval_req.status not in (ApprovalRequest.Status.PENDING, ApprovalRequest.Status.INFO_REQUESTED):
            raise ValidationError(
                f"Cannot approve request with current status '{approval_req.get_status_display()}'."
            )

        comment = request.data.get("comment", "")

        with transaction.atomic():
            approval_req.status = ApprovalRequest.Status.APPROVED
            approval_req.save(update_fields=["status", "updated_at"])

            ApprovalRecord.objects.create(
                approval_request=approval_req,
                action=ApprovalRecord.Action.APPROVED,
                performed_by=user,
                comment=comment,
            )

            # Dispatch approval decision notification
            from notifications.services import notify_approval_decided
            notify_approval_decided(approval_req, decision="Approved", comment=comment)

        return Response(ApprovalRequestSerializer(approval_req).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"], url_path="reject")
    def reject(self, request, pk=None):
        """
        Reject the request.

        Authorization: Only the designated approver or a system administrator.
        Allowed states: PENDING, INFO_REQUESTED.
        """
        approval_req = self.get_object()
        user = request.user

        # Authorization check
        if not (is_system_admin(user) or approval_req.approver_id == user.id):
            raise PermissionDenied("Only the designated approver can reject this request.")

        # State check
        if approval_req.status not in (ApprovalRequest.Status.PENDING, ApprovalRequest.Status.INFO_REQUESTED):
            raise ValidationError(
                f"Cannot reject request with current status '{approval_req.get_status_display()}'."
            )

        comment = request.data.get("comment", "")

        with transaction.atomic():
            approval_req.status = ApprovalRequest.Status.REJECTED
            approval_req.save(update_fields=["status", "updated_at"])

            ApprovalRecord.objects.create(
                approval_request=approval_req,
                action=ApprovalRecord.Action.REJECTED,
                performed_by=user,
                comment=comment,
            )

            # Dispatch rejection notification
            from notifications.services import notify_approval_decided
            notify_approval_decided(approval_req, decision="Rejected", comment=comment)

        return Response(ApprovalRequestSerializer(approval_req).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"], url_path="request-info")
    def request_info(self, request, pk=None):
        """
        Request additional information before making a final decision.

        Authorization: Only the designated approver or a system administrator.
        Allowed states: PENDING.
        Comment: Required to explain what information is missing.
        """
        approval_req = self.get_object()
        user = request.user

        # Authorization check
        if not (is_system_admin(user) or approval_req.approver_id == user.id):
            raise PermissionDenied("Only the designated approver can request more information.")

        # State check
        if approval_req.status != ApprovalRequest.Status.PENDING:
            raise ValidationError(
                f"Can only request information on pending requests. Current status: '{approval_req.get_status_display()}'."
            )

        comment = request.data.get("comment", "").strip()
        if not comment:
            raise ValidationError({"comment": "Please provide an explanation of the information needed."})

        with transaction.atomic():
            approval_req.status = ApprovalRequest.Status.INFO_REQUESTED
            approval_req.save(update_fields=["status", "updated_at"])

            ApprovalRecord.objects.create(
                approval_request=approval_req,
                action=ApprovalRecord.Action.INFO_REQUESTED,
                performed_by=user,
                comment=comment,
            )

            # Dispatch information requested notification
            from notifications.services import notify_approval_decided
            notify_approval_decided(approval_req, decision="Information Requested", comment=comment)

        return Response(ApprovalRequestSerializer(approval_req).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"], url_path="resubmit")
    def resubmit(self, request, pk=None):
        """
        Resubmit an approval request after clarifying or providing requested information.

        Authorization: Only the requesting user or a system administrator.
        Allowed states: INFO_REQUESTED.
        """
        approval_req = self.get_object()
        user = request.user

        # Authorization check: only original requester or admin can resubmit
        if not (is_system_admin(user) or approval_req.requested_by_id == user.id):
            raise PermissionDenied("Only the user who initiated the request can resubmit it.")

        # State check
        if approval_req.status != ApprovalRequest.Status.INFO_REQUESTED:
            raise ValidationError(
                f"Can only resubmit requests with 'Information Requested' status. Current status: '{approval_req.get_status_display()}'."
            )

        comment = request.data.get("comment", "").strip()
        if not comment:
            raise ValidationError({"comment": "Please provide details or clarification for resubmission."})

        # Optionally update the reason if updated
        new_reason = request.data.get("reason")

        with transaction.atomic():
            approval_req.status = ApprovalRequest.Status.PENDING
            update_fields = ["status", "updated_at"]
            if new_reason:
                approval_req.reason = new_reason
                update_fields.append("reason")
            approval_req.save(update_fields=update_fields)

            ApprovalRecord.objects.create(
                approval_request=approval_req,
                action=ApprovalRecord.Action.RESUBMITTED,
                performed_by=user,
                comment=comment,
            )

            # Dispatch resubmission notification
            from notifications.services import notify_approval_resubmitted
            notify_approval_resubmitted(approval_req)

        return Response(ApprovalRequestSerializer(approval_req).data, status=status.HTTP_200_OK)
