"""
ServiceSphere Django Project Initialization.

Ensures that the Celery app is loaded when Django starts (if Celery is installed),
so that @shared_task decorators will use this app instance.
"""

try:
    from .celery import app as celery_app
    __all__ = ("celery_app",)
except ImportError:
    # Allows Django management commands to run even if Celery is not yet installed
    pass
