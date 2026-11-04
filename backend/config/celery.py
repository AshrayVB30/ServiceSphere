"""
Celery Application Configuration for ServiceSphere.

Initializes the Celery distributed task queue, binding it to Django's settings.
Supports background workers and the Celery Beat scheduler for recurring SLA monitoring tasks.
"""

import os

try:
    from celery import Celery

    # Set the default Django settings module for the 'celery' program.
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    # Create the main Celery application instance
    app = Celery("servicesphere")

    # Load configuration from Django settings, where all Celery settings start with 'CELERY_'
    app.config_from_object("django.conf:settings", namespace="CELERY")

    # Automatically discover tasks.py files in all installed apps (e.g. 'sla.tasks')
    app.autodiscover_tasks()
except ImportError:
    app = None


if app is not None:
    @app.task(bind=True, ignore_result=True)
    def debug_task(self):
        """Debug task to test Celery worker connectivity."""
        print(f"Request: {self.request!r}")
