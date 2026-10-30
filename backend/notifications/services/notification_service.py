"""
Centralized Notification Service for ServiceSphere.

Orchestrates in-app notification creation and email dispatching across:
- Tickets (creation, assignment, status change, comments)
- Approvals (submission, decision, resubmission)
- SLA Policies (approaching warnings, breaches, escalations)

Ensures:
- Client privacy (internal notes are NEVER sent to clients)
- User preference compliance (in-app and email preferences respected)
- Deduplication of identical active alerts
"""

import logging
from datetime import timedelta
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from notifications.models import Notification, NotificationPreference
from .email_service import send_email_notification

logger = logging.getLogger(__name__)


def create_notification(
    recipient,
    title,
    message,
    notification_type=Notification.NotificationType.SYSTEM,
    related_ticket=None,
    related_approval=None,
    force_in_app=False,
    force_email=False,
):
    """
    Core primitive: Dispatches in-app and email notifications to a single user.

    Respects user preferences and prevents duplicate unread notifications.
    """
    if not recipient or not recipient.is_active:
        return None

    # Retrieve or provision user notification preferences
    prefs, _ = NotificationPreference.objects.get_or_create(user=recipient)

    # Check category preferences (ticket, approval, sla)
    if not force_in_app and not force_email:
        if notification_type == Notification.NotificationType.TICKET and not prefs.ticket_notifications:
            return None
        elif notification_type == Notification.NotificationType.APPROVAL and not prefs.approval_notifications:
            return None
        elif notification_type == Notification.NotificationType.SLA and not prefs.sla_notifications:
            return None

    notification = None

    # 1. In-App Notification Delivery
    if force_in_app or prefs.in_app_enabled:
        # Deduplication check: Avoid spamming identical active unread alerts created in last 2 minutes
        recent_threshold = timezone.now() - timedelta(minutes=2)
        duplicate_exists = Notification.objects.filter(
            recipient=recipient,
            title=title,
            notification_type=notification_type,
            related_ticket=related_ticket,
            related_approval=related_approval,
            is_read=False,
            created_at__gte=recent_threshold,
        ).exists()

        if not duplicate_exists:
            try:
                notification = Notification.objects.create(
                    recipient=recipient,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    related_ticket=related_ticket,
                    related_approval=related_approval,
                )
            except Exception as exc:
                logger.error(f"Failed to create in-app notification for {recipient.username}: {exc}")

    # 2. Email Delivery (delegates to email service which evaluates global toggle and preferences)
    category_map = {
        Notification.NotificationType.TICKET: "ticket",
        Notification.NotificationType.APPROVAL: "approval",
        Notification.NotificationType.SLA: "sla",
        Notification.NotificationType.SYSTEM: "system",
    }
    category_name = category_map.get(notification_type, "system")

    send_email_notification(
        recipient=recipient,
        subject=title,
        message=message,
        category=category_name,
        force=force_email,
    )

    return notification


# ==============================================================================
# TICKET NOTIFICATION HANDLERS
# ==============================================================================

def notify_ticket_created(ticket):
    """
    Notifies relevant parties when a new support ticket is opened.
    - Client creator receives confirmation.
    - Support staff / admins receive alert of new incoming request.
    """
    # 1. Acknowledge client creator
    create_notification(
        recipient=ticket.created_by,
        title=f"Ticket Received: #{ticket.id} - {ticket.subject}",
        message=(
            f"Hello {ticket.created_by.first_name or ticket.created_by.username},\n\n"
            f"Your support ticket #{ticket.id} ('{ticket.subject}') has been received.\n"
            f"Priority: {ticket.get_priority_display()}\n"
            f"Status: {ticket.get_status_display()}\n\n"
            f"A support agent will review your issue shortly."
        ),
        notification_type=Notification.NotificationType.TICKET,
        related_ticket=ticket,
    )

    # 2. Notify system administrators
    admins = User.objects.filter(role=User.Role.ADMIN, is_active=True)
    for admin in admins:
        create_notification(
            recipient=admin,
            title=f"New Ticket #{ticket.id}: {ticket.subject}",
            message=(
                f"A new ticket #{ticket.id} has been submitted by {ticket.created_by.username} "
                f"({ticket.client.name if ticket.client else 'No Client'}).\n"
                f"Priority: {ticket.get_priority_display()}."
            ),
            notification_type=Notification.NotificationType.TICKET,
            related_ticket=ticket,
        )


def notify_ticket_assigned(ticket, previous_assignee=None):
    """
    Notifies a support agent when a ticket is assigned or reassigned to them.
    If reassigned, also notifies previous assignee.
    """
    # Notify newly assigned agent
    if ticket.assigned_to:
        create_notification(
            recipient=ticket.assigned_to,
            title=f"Ticket Assigned: #{ticket.id} - {ticket.subject}",
            message=(
                f"You have been assigned to Ticket #{ticket.id}.\n"
                f"Client: {ticket.client.name if ticket.client else 'N/A'}\n"
                f"Priority: {ticket.get_priority_display()}\n"
                f"Status: {ticket.get_status_display()}"
            ),
            notification_type=Notification.NotificationType.TICKET,
            related_ticket=ticket,
        )

    # Notify previous assignee if reassigned
    if previous_assignee and previous_assignee != ticket.assigned_to:
        create_notification(
            recipient=previous_assignee,
            title=f"Ticket Reassigned: #{ticket.id} - {ticket.subject}",
            message=(
                f"Ticket #{ticket.id} previously assigned to you has been reassigned to "
                f"{ticket.assigned_to.username if ticket.assigned_to else 'unassigned'}."
            ),
            notification_type=Notification.NotificationType.TICKET,
            related_ticket=ticket,
        )


def notify_ticket_status_changed(ticket, previous_status, new_status, performed_by=None):
    """
    Notifies client and assigned agent when a ticket's status changes.
    Special messaging for Resolved and Closed states.
    """
    status_label = ticket.get_status_display()

    # Determine message specifics
    if new_status == "RESOLVED":
        title = f"Ticket Resolved: #{ticket.id} - {ticket.subject}"
        body_suffix = "Our team has resolved your ticket. If your issue persists, you may reply or reopen it."
    elif new_status == "CLOSED":
        title = f"Ticket Closed: #{ticket.id} - {ticket.subject}"
        body_suffix = "This ticket is now officially closed."
    else:
        title = f"Ticket #{ticket.id} Status Updated: {status_label}"
        body_suffix = f"The ticket status has transitioned from {previous_status} to {new_status}."

    # 1. Notify client creator
    if ticket.created_by and ticket.created_by != performed_by:
        create_notification(
            recipient=ticket.created_by,
            title=title,
            message=(
                f"Hello {ticket.created_by.first_name or ticket.created_by.username},\n\n"
                f"Update on Ticket #{ticket.id} ('{ticket.subject}'):\n"
                f"Status: {status_label}\n\n"
                f"{body_suffix}"
            ),
            notification_type=Notification.NotificationType.TICKET,
            related_ticket=ticket,
        )

    # 2. Notify assigned support agent (if status was changed by admin or client)
    if ticket.assigned_to and ticket.assigned_to != performed_by:
        create_notification(
            recipient=ticket.assigned_to,
            title=f"Ticket #{ticket.id} Status Changed to {status_label}",
            message=(
                f"Ticket #{ticket.id} was updated by {performed_by.username if performed_by else 'System'}.\n"
                f"Previous: {previous_status} -> New: {new_status}."
            ),
            notification_type=Notification.NotificationType.TICKET,
            related_ticket=ticket,
        )


def notify_new_comment(comment):
    """
    Notifies participants about a new comment on a ticket.
    
    CRITICAL SECURITY RULE:
    - Internal notes (is_internal=True) are NEVER sent or notified to client users.
    - Internal notes are only notified to authorized support staff (assigned agent / admins).
    """
    ticket = comment.ticket
    author = comment.author

    if comment.is_internal:
        # Internal Note: Staff only
        recipients = set()
        if ticket.assigned_to and ticket.assigned_to != author:
            recipients.add(ticket.assigned_to)

        # Notify admins if they are not the author
        admins = User.objects.filter(role=User.Role.ADMIN, is_active=True).exclude(id=author.id)
        recipients.update(admins)

        for recipient in recipients:
            create_notification(
                recipient=recipient,
                title=f"[Internal Note] Ticket #{ticket.id}: {ticket.subject}",
                message=(
                    f"Staff member {author.username} added an internal note to Ticket #{ticket.id}:\n\n"
                    f"\"{comment.message}\""
                ),
                notification_type=Notification.NotificationType.TICKET,
                related_ticket=ticket,
            )
    else:
        # Public Comment
        # 1. If author is client -> notify assigned agent (or admins if unassigned)
        if author.role == User.Role.CLIENT:
            if ticket.assigned_to:
                create_notification(
                    recipient=ticket.assigned_to,
                    title=f"New Customer Reply on Ticket #{ticket.id}",
                    message=(
                        f"Client {author.username} commented on Ticket #{ticket.id}:\n\n"
                        f"\"{comment.message}\""
                    ),
                    notification_type=Notification.NotificationType.TICKET,
                    related_ticket=ticket,
                )
            else:
                admins = User.objects.filter(role=User.Role.ADMIN, is_active=True)
                for admin in admins:
                    create_notification(
                        recipient=admin,
                        title=f"New Reply on Unassigned Ticket #{ticket.id}",
                        message=f"Client {author.username} commented on Ticket #{ticket.id}:\n\n\"{comment.message}\"",
                        notification_type=Notification.NotificationType.TICKET,
                        related_ticket=ticket,
                    )

        # 2. If author is support staff -> notify client creator
        else:
            if ticket.created_by and ticket.created_by != author:
                create_notification(
                    recipient=ticket.created_by,
                    title=f"New Support Reply on Ticket #{ticket.id}",
                    message=(
                        f"Hello {ticket.created_by.first_name or ticket.created_by.username},\n\n"
                        f"Support agent {author.username} replied to your ticket #{ticket.id}:\n\n"
                        f"\"{comment.message}\""
                    ),
                    notification_type=Notification.NotificationType.TICKET,
                    related_ticket=ticket,
                )


# ==============================================================================
# APPROVAL WORKFLOW NOTIFICATION HANDLERS
# ==============================================================================

def notify_approval_submitted(approval_request):
    """Notifies designated approver when a new approval request is submitted."""
    approver = approval_request.approver
    ticket = approval_request.ticket

    create_notification(
        recipient=approver,
        title=f"Approval Requested: Ticket #{ticket.id}",
        message=(
            f"Hello {approver.first_name or approver.username},\n\n"
            f"A new approval request has been submitted for Ticket #{ticket.id} ('{ticket.subject}').\n"
            f"Requester: {approval_request.requested_by.username}\n"
            f"Reason: {approval_request.reason}\n\n"
            f"Please review and submit your decision in ServiceSphere."
        ),
        notification_type=Notification.NotificationType.APPROVAL,
        related_ticket=ticket,
        related_approval=approval_request,
    )


def notify_approval_decided(approval_request, decision, comment=""):
    """
    Notifies the requester and assigned agent when an approval request is
    Approved, Rejected, or Information is Requested.
    """
    ticket = approval_request.ticket
    requester = approval_request.requested_by

    create_notification(
        recipient=requester,
        title=f"Approval Request {decision}: Ticket #{ticket.id}",
        message=(
            f"Your approval request for Ticket #{ticket.id} has been {decision.lower()}.\n"
            f"Approver: {approval_request.approver.username}\n"
            f"Notes/Comments: {comment or 'No comment provided.'}"
        ),
        notification_type=Notification.NotificationType.APPROVAL,
        related_ticket=ticket,
        related_approval=approval_request,
    )

    # If ticket is assigned to a different agent, notify them as well
    if ticket.assigned_to and ticket.assigned_to != requester:
        create_notification(
            recipient=ticket.assigned_to,
            title=f"Approval {decision} on Ticket #{ticket.id}",
            message=f"Approval request for Ticket #{ticket.id} was {decision.lower()} by {approval_request.approver.username}.",
            notification_type=Notification.NotificationType.APPROVAL,
            related_ticket=ticket,
            related_approval=approval_request,
        )


def notify_approval_resubmitted(approval_request):
    """Notifies the approver when an approval request is resubmitted."""
    approver = approval_request.approver
    ticket = approval_request.ticket

    create_notification(
        recipient=approver,
        title=f"Approval Request Resubmitted: Ticket #{ticket.id}",
        message=(
            f"Requester {approval_request.requested_by.username} has updated and resubmitted "
            f"the approval request for Ticket #{ticket.id}.\n"
            f"Reason / Clarification: {approval_request.reason}\n\n"
            f"Please review the updated submission."
        ),
        notification_type=Notification.NotificationType.APPROVAL,
        related_ticket=ticket,
        related_approval=approval_request,
    )


# ==============================================================================
# SLA MANAGEMENT NOTIFICATION HANDLERS
# ==============================================================================

def notify_sla_warning(ticket, tracking, warning_type, deadline):
    """
    Notifies support agent and managers that an SLA deadline is approaching (75% time elapsed).
    """
    deadline_str = deadline.strftime("%Y-%m-%d %H:%M:%S UTC") if deadline else "Imminent"
    target = ticket.assigned_to or User.objects.filter(role=User.Role.ADMIN, is_active=True).first()

    if target:
        create_notification(
            recipient=target,
            title=f"[SLA WARNING] Ticket #{ticket.id} Approaching {warning_type} Deadline",
            message=(
                f"Attention: Ticket #{ticket.id} ('{ticket.subject}') is at 75% of its {warning_type.lower()} SLA target.\n"
                f"Target Deadline: {deadline_str}\n"
                f"Priority: {ticket.get_priority_display()}\n\n"
                f"Please take immediate action to avoid an SLA breach."
            ),
            notification_type=Notification.NotificationType.SLA,
            related_ticket=ticket,
        )


def notify_sla_breached(ticket, tracking, breach_type, deadline):
    """
    Notifies support staff and administrators when an SLA deadline is breached.
    """
    deadline_str = deadline.strftime("%Y-%m-%d %H:%M:%S UTC") if deadline else "Past"

    # Recipients: assigned agent and platform admins
    recipients = set()
    if ticket.assigned_to:
        recipients.add(ticket.assigned_to)
    admins = User.objects.filter(role=User.Role.ADMIN, is_active=True)
    recipients.update(admins)

    for recipient in recipients:
        create_notification(
            recipient=recipient,
            title=f"[SLA BREACHED] Ticket #{ticket.id} {breach_type} Overdue",
            message=(
                f"URGENT: Ticket #{ticket.id} ('{ticket.subject}') has breached its {breach_type.lower()} SLA.\n"
                f"Missed Deadline: {deadline_str}\n"
                f"Priority: {ticket.get_priority_display()}\n"
                f"Assigned Agent: {ticket.assigned_to.username if ticket.assigned_to else 'Unassigned'}\n\n"
                f"Immediate escalation and management intervention required."
            ),
            notification_type=Notification.NotificationType.SLA,
            related_ticket=ticket,
        )


def notify_sla_escalated(escalation):
    """
    Notifies the assigned recipient (Level 1, 2, or 3) when an escalation is triggered.
    """
    ticket = escalation.ticket
    recipient = escalation.assigned_recipient

    create_notification(
        recipient=recipient,
        title=f"[SLA ESCALATION {escalation.get_escalation_level_display()}] Ticket #{ticket.id}",
        message=(
            f"An SLA escalation ({escalation.get_escalation_level_display()}) has been triggered.\n\n"
            f"Ticket: #{ticket.id} - {ticket.subject}\n"
            f"Event: {escalation.get_event_type_display()}\n"
            f"Reason: {escalation.reason}\n"
            f"Priority: {ticket.get_priority_display()}\n"
            f"Client: {ticket.client.name if ticket.client else 'N/A'}\n\n"
            f"Please log in to ServiceSphere to acknowledge and take action."
        ),
        notification_type=Notification.NotificationType.SLA,
        related_ticket=ticket,
    )

