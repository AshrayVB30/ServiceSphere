#!/usr/bin/env python
"""
Django's command-line utility for administrative tasks.
This script acts as the entry point for running administrative commands like:
- Starting the development server ('python manage.py runserver')
- Creating database migrations ('python manage.py makemigrations')
- Applying database migrations ('python manage.py migrate')
- Creating superuser accounts ('python manage.py createsuperuser')
"""
import os
import sys


def main():
    """Run administrative tasks."""
    # Tell Django which configuration settings module to load for the project.
    # In our project, all global settings live inside 'config/settings.py'.
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    
    try:
        # Import the command-line executor from Django core.
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        # Provide a helpful error message if Django is missing or virtualenv isn't active.
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    # Pass command-line arguments (e.g. 'runserver', 'migrate') to Django's execution runner.
    execute_from_command_line(sys.argv)


# This standard Python boilerplate ensures main() only executes when this file is run directly.
if __name__ == "__main__":
    main()
