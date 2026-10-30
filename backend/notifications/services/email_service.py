"""
Email Notification Service for ServiceSphere.

Provides helper functions to validate recipient settings, check user email preferences,
and trigger asynchronous background email dispatch via Celery.
Ensures email delivery failure never blocks or rolls back core business operations.
"""

import logging
from django.conf import settings
from notifications.models import NotificationPreference
from notifications.tasks import send_email_notification_task

logger = logging.getLogger(__name__)


def is_email_notifications_enabled():
    """
    Checks the global application configuration toggle.
    Returns True only when EMAIL_NOTIFICATIONS_ENABLED=True in settings.
    """
    return getattr(settings, "EMAIL_NOTIFICATIONS_ENABLED", False)


def can_receive_email(user, category="ticket"):
    """
    Checks if a user is eligible and willing to receive email notifications.

    Criteria:
    1. Global EMAIL_NOTIFICATIONS_ENABLED toggle is True.
    2. User account is active and has a valid, non-empty email.
    3. User's NotificationPreference has email_enabled=True.
    4. User's NotificationPreference has the specific category enabled (ticket, approval, or sla).
    """
    if not is_email_notifications_enabled():
        return False

    if not user or not user.is_active or not user.email or "@" not in user.email:
        return False

    # Retrieve or provision user preferences
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)

    if not prefs.email_enabled:
        return False

    # Check category preference
    category_lower = category.lower()
    if category_lower == "ticket" and not prefs.ticket_notifications:
        return False
    elif category_lower == "approval" and not prefs.approval_notifications:
        return False
    elif category_lower == "sla" and not prefs.sla_notifications:
        return False

    return True


def send_email_notification(recipient, subject, message, category="ticket", force=False):
    """
    Dispatches an email notification safely.

    Parameters:
    - recipient: User instance who will receive the email.
    - subject: Subject line for the email.
    - message: Plain text body of the email.
    - category: Category string ('ticket', 'approval', 'sla', 'system').
    - force: If True, bypasses user preference check (for critical security/system alerts).

    Returns:
    - True if scheduled / dispatched / intentionally skipped, False if an error occurred.
    """
    if not recipient or not recipient.email:
        logger.debug("Cannot send email: Recipient has no email address.")
        return False

    # Unless forced, respect global toggle and user preferences
    if not force and not can_receive_email(recipient, category):
        logger.debug(
            f"Email delivery skipped for {recipient.username}: "
            f"Global enabled={is_email_notifications_enabled()}, User preferences checked."
        )
        return False

    try:
        # Offload delivery to background Celery task
        # If Celery worker is active, task runs in the background.
        # If Celery is in eager mode (e.g. testing), it runs synchronously.
        send_email_notification_task.delay(
            recipient_email=recipient.email,
            subject=subject,
            message_body=message,
        )
        return True

    except Exception as exc:
        # If queuing to Celery fails (e.g. Redis is down during dev or unit testing),
        # gracefully fall back to direct sending via Django's configured mail backend
        logger.warning(
            f"Failed to queue email notification via Celery to {recipient.email} ({exc}). "
            f"Falling back to direct dispatch."
        )
        try:
            from django.core.mail import send_mail
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "support@servicesphere.local")
            sent_count = send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[recipient.email],
                fail_silently=True,
            )
            return sent_count > 0
        except Exception as fallback_exc:
            logger.error(f"Fallback email delivery failed for {recipient.email}: {fallback_exc}")
            return False

