"""
ASGI (Asynchronous Server Gateway Interface) configuration for ServiceSphere.

This file exposes the ASGI callable as a module-level variable named `application`.
It serves as the entry point for asynchronous web servers (such as Uvicorn or Daphne),
enabling support for asynchronous requests, WebSockets, and background real-time messaging.
"""

import os
from django.core.asgi import get_asgi_application

# Specify the default settings module for the ASGI environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Create the ASGI application callable that handles incoming async connections
application = get_asgi_application()
