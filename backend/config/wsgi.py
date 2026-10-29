"""
WSGI (Web Server Gateway Interface) configuration for ServiceSphere.

This file exposes the WSGI callable as a module-level variable named `application`.
It serves as the bridge between standard synchronous Python web servers
(such as Gunicorn, uWSGI, or Apache mod_wsgi) and the Django application.
"""

import os
from django.core.wsgi import get_wsgi_application

# Specify the default settings module for the WSGI environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Create the WSGI application callable that handles incoming requests
application = get_wsgi_application()
