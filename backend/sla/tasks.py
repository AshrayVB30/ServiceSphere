"""
Celery Periodic Background Tasks for the 'sla' application.

Executes automated SLA deadline auditing, overdue detection,
and multi-tier escalation triggering on a periodic schedule (e.g. every 5 minutes).
"""

import logging
try:
    from celery import shared_task
except ImportError:
    # Fallback dummy decorator so task functions can still be invoked directly
    def shared_task(*d_args, **d_kwargs):
        def decorator(func):
            def wrapper(*args, **kwargs):
                return func(None, *args, **kwargs)
            wrapper.delay = wrapper
            return wrapper
        if d_args and callable(d_args[0]):
            return decorator(d_args[0])
        return decorator
from .services import evaluate_sla_monitoring_and_escalations

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def monitor_sla_deadlines_task(self):
    """
    Celery background task that monitors all active tickets against SLA deadlines.
    Identifies approaching and breached response and resolution deadlines,
    generates escalation records, and dispatches notification alerts.
    """
    try:
        logger.info("Executing scheduled SLA deadline monitoring task...")
        escalations = evaluate_sla_monitoring_and_escalations()
        count = len(escalations)
        logger.info(f"SLA monitoring run completed successfully. Triggered {count} new escalation(s).")
        return {
            "status": "success",
            "escalations_triggered": count,
        }
    except Exception as exc:
        logger.error(f"Error during SLA monitoring task execution: {exc}")
        # Retry with exponential backoff on transient errors
        raise self.retry(exc=exc)
