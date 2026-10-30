"""
SLA Calculation, Monitoring, and Escalation Services for ServiceSphere.

Provides business logic for:
1. assign_sla_to_ticket: Automatically assigns priority-based SLA deadlines to tickets.
2. record_first_response: Detects qualifying public agent responses and updates response SLA status.
3. record_ticket_resolution: Captures resolution time and evaluates whether resolution met the deadline.
4. record_ticket_reopened: Handles SLA recalculation when a resolved ticket is reopened.
5. evaluate_sla_monitoring_and_escalations: Scheduled background task logic that audits active tickets,
   detects approaching and breached thresholds (75%, 90%, 100%+), creates escalation records,
   and dispatches notifications without duplicate alerts.
"""

from datetime import timedelta
import logging
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from tickets.models import Ticket, TicketHistory
from .models import SLAPolicy, SLATracking, SLAEscalation

logger = logging.getLogger(__name__)


def assign_sla_to_ticket(ticket, recalculated=False, previous_priority=None):
    """
    Identifies the active SLA policy matching the ticket's priority,
    calculates response and resolution deadlines, and creates or updates
    the ticket's SLATracking record.
    """
    # Look up the active SLA policy for this ticket's priority
    policy = SLAPolicy.objects.filter(priority=ticket.priority, is_active=True).first()

    base_time = ticket.created_at or timezone.now()

    if policy:
        response_deadline = base_time + timedelta(hours=float(policy.response_time_hours))
        resolution_deadline = base_time + timedelta(hours=float(policy.resolution_time_hours))
    else:
        response_deadline = None
        resolution_deadline = None

    tracking, created = SLATracking.objects.get_or_create(
        ticket=ticket,
        defaults={
            "policy": policy,
            "response_deadline": response_deadline,
            "resolution_deadline": resolution_deadline,
            "response_status": SLATracking.SLAStatus.WITHIN_SLA,
            "resolution_status": SLATracking.SLAStatus.WITHIN_SLA,
        },
    )

    if not created and (recalculated or tracking.policy != policy):
        # Update existing tracking record with recalculated deadlines
        tracking.policy = policy
        tracking.response_deadline = response_deadline
        tracking.resolution_deadline = resolution_deadline

        # Re-evaluate statuses if not already completed
        now = timezone.now()
        if not tracking.actual_response_at:
            if response_deadline and now > response_deadline:
                tracking.response_status = SLATracking.SLAStatus.BREACHED
            else:
                tracking.response_status = SLATracking.SLAStatus.WITHIN_SLA

        if not tracking.actual_resolution_at:
            if resolution_deadline and now > resolution_deadline:
                tracking.resolution_status = SLATracking.SLAStatus.BREACHED
            else:
                tracking.resolution_status = SLATracking.SLAStatus.WITHIN_SLA

        tracking.save()

        # Log SLA recalculation in TicketHistory audit log
        if previous_priority:
            TicketHistory.objects.create(
                ticket=ticket,
                action=TicketHistory.Action.STATUS_CHANGED,
                performed_by=ticket.created_by,
                note=f"SLA deadlines recalculated due to priority change from {previous_priority} to {ticket.priority}.",
            )

    return tracking


def record_first_response(comment):
    """
    Evaluates whether a new comment qualifies as a first public agent response.
    Qualifying criteria:
    - Not an internal note (is_internal == False).
    - Author is a SUPPORT_AGENT or ADMIN.
    - actual_response_at has not been recorded yet.
    """
    # Internal staff notes or customer comments do not satisfy the first public agent response requirement
    if comment.is_internal:
        return

    author = comment.author
    if author.role not in (User.Role.SUPPORT_AGENT, User.Role.ADMIN) and not author.is_superuser:
        return

    ticket = comment.ticket
    tracking = getattr(ticket, "sla_tracking", None)
    if not tracking or tracking.actual_response_at is not None:
        return

    # Mark actual response time
    response_time = comment.created_at or timezone.now()
    tracking.actual_response_at = response_time

    # Determine if response met the SLA target
    if tracking.response_deadline and response_time <= tracking.response_deadline:
        tracking.response_status = SLATracking.SLAStatus.COMPLETED
    else:
        tracking.response_status = SLATracking.SLAStatus.BREACHED

    tracking.save(update_fields=["actual_response_at", "response_status", "updated_at"])


def record_ticket_resolution(ticket):
    """
    Evaluates resolution SLA when a ticket moves to RESOLVED or CLOSED status.
    """
    tracking = getattr(ticket, "sla_tracking", None)
    if not tracking:
        return

    resolved_time = ticket.resolved_at or timezone.now()
    tracking.actual_resolution_at = resolved_time

    if tracking.resolution_deadline and resolved_time <= tracking.resolution_deadline:
        tracking.resolution_status = SLATracking.SLAStatus.COMPLETED
    else:
        tracking.resolution_status = SLATracking.SLAStatus.BREACHED

    tracking.save(update_fields=["actual_resolution_at", "resolution_status", "updated_at"])


def record_ticket_reopened(ticket):
    """
    Clears actual resolution time and resets resolution SLA evaluation when a ticket is reopened.
    """
    tracking = getattr(ticket, "sla_tracking", None)
    if not tracking:
        return

    tracking.actual_resolution_at = None

    # Re-evaluate resolution status
    now = timezone.now()
    if tracking.resolution_deadline and now > tracking.resolution_deadline:
        tracking.resolution_status = SLATracking.SLAStatus.BREACHED
    else:
        tracking.resolution_status = SLATracking.SLAStatus.WITHIN_SLA

    tracking.save(update_fields=["actual_resolution_at", "resolution_status", "updated_at"])


def get_escalation_recipient(ticket, level):
    """
    Identifies the appropriate staff recipient for an escalation alert.
    - Level 1: Assigned support agent (fallback to admin if unassigned).
    - Level 2: Support manager / admin.
    - Level 3: Platform administrator (superuser).
    """
    if level == SLAEscalation.EscalationLevel.LEVEL_1:
        if ticket.assigned_to and ticket.assigned_to.is_active:
            return ticket.assigned_to

    # Level 2 or fallback: find a support manager or system admin
    admin_user = User.objects.filter(role=User.Role.ADMIN, is_active=True).first()
    if admin_user:
        return admin_user

    superuser = User.objects.filter(is_superuser=True, is_active=True).first()
    if superuser:
        return superuser

    # Fallback to ticket creator or first active user
    return ticket.created_by


def trigger_escalation(ticket, tracking, event_type, level, reason):
    """
    Creates an SLAEscalation record if one does not already exist for this (ticket, event_type, level).
    Dispatches an email notification.
    """
    # Check for duplicate escalation (idempotency constraint)
    existing = SLAEscalation.objects.filter(
        ticket=ticket,
        event_type=event_type,
        escalation_level=level,
    ).first()
    if existing:
        return existing

    recipient = get_escalation_recipient(ticket, level)

    with transaction.atomic():
        escalation = SLAEscalation.objects.create(
            ticket=ticket,
            sla_tracking=tracking,
            escalation_level=level,
            event_type=event_type,
            reason=reason,
            assigned_recipient=recipient,
            previous_assignee=ticket.assigned_to,
            notification_status=SLAEscalation.NotificationStatus.SENT,
        )

    # Dispatch notification alert via centralized notification service
    try:
        from notifications.services import notify_sla_escalated
        notify_sla_escalated(escalation)
    except Exception as exc:
        logger.error(f"Failed to dispatch escalation notification for Ticket #{ticket.id}: {exc}")
        escalation.notification_status = SLAEscalation.NotificationStatus.FAILED
        escalation.save(update_fields=["notification_status"])

    return escalation


def evaluate_sla_monitoring_and_escalations():
    """
    Audit engine that scans all active (unresolved) tickets, detects approaching/breached
    deadlines, updates statuses, and triggers multi-tier escalations.
    """
    now = timezone.now()

    # Scan only active tickets that have SLA tracking
    active_trackings = SLATracking.objects.filter(
        ticket__status__in=[
            Ticket.Status.OPEN,
            Ticket.Status.IN_PROGRESS,
            Ticket.Status.AWAITING_CUSTOMER,
        ]
    ).select_related("ticket", "ticket__client", "ticket__assigned_to", "policy")

    escalations_created = []

    for tracking in active_trackings:
        ticket = tracking.ticket
        base_time = ticket.created_at or now

        # -------------------------------------------------------------
        # 1. Evaluate First Response SLA
        # -------------------------------------------------------------
        if tracking.actual_response_at is None and tracking.response_deadline:
            # Breach condition: Current time is at or past response deadline
            if now >= tracking.response_deadline:
                if tracking.response_status != SLATracking.SLAStatus.BREACHED:
                    tracking.response_status = SLATracking.SLAStatus.BREACHED
                    tracking.save(update_fields=["response_status", "updated_at"])

                esc = trigger_escalation(
                    ticket=ticket,
                    tracking=tracking,
                    event_type=SLAEscalation.EventType.RESPONSE_BREACHED,
                    level=SLAEscalation.EscalationLevel.LEVEL_2,
                    reason=f"First response deadline was breached on {tracking.response_deadline.strftime('%Y-%m-%d %H:%M:%S UTC')}.",
                )
                if esc:
                    escalations_created.append(esc)

            else:
                # Approaching deadline warning (75% time consumed)
                total_response_seconds = (tracking.response_deadline - base_time).total_seconds()
                elapsed_response_seconds = (now - base_time).total_seconds()

                if total_response_seconds > 0:
                    consumed_ratio = elapsed_response_seconds / total_response_seconds
                    if consumed_ratio >= 0.75:
                        if tracking.response_status == SLATracking.SLAStatus.WITHIN_SLA:
                            tracking.response_status = SLATracking.SLAStatus.APPROACHING
                            tracking.save(update_fields=["response_status", "updated_at"])

                        esc = trigger_escalation(
                            ticket=ticket,
                            tracking=tracking,
                            event_type=SLAEscalation.EventType.RESPONSE_APPROACHING,
                            level=SLAEscalation.EscalationLevel.LEVEL_1,
                            reason=f"75% of first response SLA target has elapsed. Deadline is {tracking.response_deadline.strftime('%Y-%m-%d %H:%M:%S UTC')}.",
                        )
                        if esc:
                            escalations_created.append(esc)

        # -------------------------------------------------------------
        # 2. Evaluate Resolution SLA
        # -------------------------------------------------------------
        if tracking.actual_resolution_at is None and tracking.resolution_deadline:
            # Breach condition: Current time is at or past resolution deadline
            if now >= tracking.resolution_deadline:
                if tracking.resolution_status != SLATracking.SLAStatus.BREACHED:
                    tracking.resolution_status = SLATracking.SLAStatus.BREACHED
                    tracking.save(update_fields=["resolution_status", "updated_at"])

                esc = trigger_escalation(
                    ticket=ticket,
                    tracking=tracking,
                    event_type=SLAEscalation.EventType.RESOLUTION_BREACHED,
                    level=SLAEscalation.EscalationLevel.LEVEL_3,
                    reason=f"Resolution deadline was breached on {tracking.resolution_deadline.strftime('%Y-%m-%d %H:%M:%S UTC')}.",
                )
                if esc:
                    escalations_created.append(esc)

            else:
                # Approaching deadline warning (75% time consumed)
                total_resolution_seconds = (tracking.resolution_deadline - base_time).total_seconds()
                elapsed_resolution_seconds = (now - base_time).total_seconds()

                if total_resolution_seconds > 0:
                    consumed_ratio = elapsed_resolution_seconds / total_resolution_seconds
                    if consumed_ratio >= 0.75:
                        if tracking.resolution_status == SLATracking.SLAStatus.WITHIN_SLA:
                            tracking.resolution_status = SLATracking.SLAStatus.APPROACHING
                            tracking.save(update_fields=["resolution_status", "updated_at"])

                        esc = trigger_escalation(
                            ticket=ticket,
                            tracking=tracking,
                            event_type=SLAEscalation.EventType.RESOLUTION_APPROACHING,
                            level=SLAEscalation.EscalationLevel.LEVEL_1,
                            reason=f"75% of resolution SLA target has elapsed. Deadline is {tracking.resolution_deadline.strftime('%Y-%m-%d %H:%M:%S UTC')}.",
                        )
                        if esc:
                            escalations_created.append(esc)

    return escalations_created

