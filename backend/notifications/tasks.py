"""
Asynchronous Celery Tasks for the 'notifications' application.

Offloads email delivery to background Celery workers so HTTP request cycles
(ticket creation, status updates, approval submissions) remain fast and responsive.
Includes resilient fallbacks for local development when Celery or Redis is not running.
"""

import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

# Attempt to import Celery's @shared_task decorator
try:
    from celery import shared_task
    CELERY_AVAILABLE = True
except ImportError:
    # Graceful fallback decorator if celery is not installed
    CELERY_AVAILABLE = False
    def shared_task(*args, **kwargs):
        def decorator(func):
            func.delay = lambda *a, **k: func(*a, **k)
            return func
        return decorator


@shared_task(
    bind=True,
    name="notifications.tasks.send_email_notification_task",
    max_retries=3,
    default_retry_delay=60,
)
def send_email_notification_task(self, recipient_email, subject, message_body):
    """
    Asynchronous Celery task that delivers an email notification.

    Parameters:
    - recipient_email: The target email address.
    - subject: The email subject line.
    - message_body: Plain-text email content.
    
    Behavior:
    - If EMAIL_NOTIFICATIONS_ENABLED is False (default in dev), logs and skips sending.
    - If sending fails, retries up to 3 times before logging an error.
    - Returns True if sent or simulated, False if failed.
    """
    if not getattr(settings, "EMAIL_NOTIFICATIONS_ENABLED", False):
        logger.info(
            f"[Notification Task] EMAIL_NOTIFICATIONS_ENABLED=False. "
            f"Email to '{recipient_email}' suppressed (Subject: '{subject}')."
        )
        return True

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "support@servicesphere.local")

    try:
        sent_count = send_mail(
            subject=subject,
            message=message_body,
            from_email=from_email,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info(f"[Notification Task] Successfully sent email to {recipient_email}. (Subject: {subject})")
        return sent_count > 0

    except Exception as exc:
        logger.warning(f"[Notification Task] Error delivering email to {recipient_email}: {exc}")
        # Retry with exponential backoff if running inside Celery
        if hasattr(self, "retry"):
            try:
                raise self.retry(exc=exc)
            except Exception:
                logger.error(f"[Notification Task] Max retries exceeded for email to {recipient_email}.")
                return False
        return False

