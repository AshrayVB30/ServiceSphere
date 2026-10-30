"""
Service layer package for 'notifications'.

Exports:
- notification_service: Core orchestration for in-app and email event dispatching.
- email_service: Helper utilities for validating and delivering email notifications.
"""

from .email_service import send_email_notification
from .notification_service import (
    create_notification,
    notify_ticket_created,
    notify_ticket_assigned,
    notify_ticket_status_changed,
    notify_new_comment,
    notify_approval_submitted,
    notify_approval_decided,
    notify_approval_resubmitted,
    notify_sla_warning,
    notify_sla_breached,
    notify_sla_escalated,
)

__all__ = [
    "send_email_notification",
    "create_notification",
    "notify_ticket_created",
    "notify_ticket_assigned",
    "notify_ticket_status_changed",
    "notify_new_comment",
    "notify_approval_submitted",
    "notify_approval_decided",
    "notify_approval_resubmitted",
    "notify_sla_warning",
    "notify_sla_breached",
    "notify_sla_escalated",
]

