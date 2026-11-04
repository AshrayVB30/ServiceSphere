"""
Django Admin registration for the 'core' application.

The core app contains shared infrastructure utilities (health checks, base models).
No database models are currently registered here; this file is kept for future use.
"""

from django.contrib import admin

# No core models require admin registration at this time.
# If shared abstract models are promoted to concrete models in future phases,
# register them here using @admin.register(ModelName) decorators.
