"""
Django settings for ServiceSphere project.

This configuration file defines all project-wide settings, including:
- Installed apps & middleware
- Database connection (PostgreSQL)
- Custom user authentication model
- Security, localization, and static files handling
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# BASE_DIR represents the root directory of the Django project ('backend/').
# Path(__file__) is this file (config/settings.py).
# .parent is 'config/', and .parent.parent is 'backend/'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from the .env file.
# We check both 'backend/.env' and the repository root '.env' for maximum flexibility.
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")


# ==============================================================================
# SECURITY CONFIGURATION
# ==============================================================================

# SECRET_KEY is used for cryptographic signing (sessions, password resets, tokens).
# In production, this must remain secret and loaded strictly from environment variables.
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe-development-key")

# DEBUG mode enables detailed error traceback pages in the browser.
# MUST always be False in production to prevent leaking sensitive code and data.
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() == "true"

# ALLOWED_HOSTS defines which host/domain names this Django site can serve.
# This prevents HTTP Host header attacks.
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        "127.0.0.1,localhost,testserver",
    ).split(",")
    if host.strip()
]
# Ensure testserver is always allowed for testing and APIClient in shell
if "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")


# ==============================================================================
# APPLICATION DEFINITION
# ==============================================================================

INSTALLED_APPS = [
    # Built-in Django core applications:
    "django.contrib.admin",          # Web-based administration interface
    "django.contrib.auth",           # Core authentication framework
    "django.contrib.contenttypes",   # Allows permissions and generic relations to track models
    "django.contrib.sessions",       # Manages user sessions across requests
    "django.contrib.messages",       # Messaging framework for one-time notifications
    "django.contrib.staticfiles",    # Manages static files (CSS, JavaScript, Images)

    # Third-party applications:
    "rest_framework",                # Django REST Framework for building RESTful APIs
    "corsheaders",                   # Cross-Origin Resource Sharing (CORS) headers for frontend integration

    # Custom ServiceSphere local apps:
    "core",                          # Shared utilities, health-checks, base models
    "accounts",                      # Custom User model, authentication, and role management
    "clients",                       # Client organization management and tenancy
    "tickets",                       # Help desk ticket management, workflows, and assignment
    "approvals",                     # Ticket approvals, decision history, and authorization workflows
    "sla",                           # Service Level Agreements, deadline monitoring, and escalations
    "notifications",                 # In-app and email notification management and delivery
]


# ==============================================================================
# MIDDLEWARE PIPELINE
# ==============================================================================
# Middleware components process incoming HTTP requests and outgoing HTTP responses in order.
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",            # Security hardening headers
    "corsheaders.middleware.CorsMiddleware",                    # Evaluates CORS headers for cross-origin requests
    "django.contrib.sessions.middleware.SessionMiddleware",      # Handles user sessions between HTTP requests
    "django.middleware.common.CommonMiddleware",                # Handles URL rewrites (like adding trailing slashes)
    "django.middleware.csrf.CsrfViewMiddleware",                # Protects against Cross-Site Request Forgery attacks
    "django.contrib.auth.middleware.AuthenticationMiddleware",  # Associates the user with the request using sessions
    "django.contrib.messages.middleware.MessageMiddleware",      # Stores temporary messages in cookie/session
    "django.middleware.clickjacking.XFrameOptionsMiddleware",    # Protects against clickjacking by denying iframe embedding
]

# Specifies the root URL configuration Python module.
ROOT_URLCONF = "config.urls"

# Configuration for HTML template rendering.
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],                   # Additional custom template directories (if any)
        "APP_DIRS": True,             # Automatically look for a 'templates/' folder inside each installed app
        "OPTIONS": {
            "context_processors": [
                # Context processors inject default variables into every rendered template.
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# WSGI (Web Server Gateway Interface) entry point for synchronous web servers.
WSGI_APPLICATION = "config.wsgi.application"


# ==============================================================================
# DATABASE CONFIGURATION (PostgreSQL)
# ==============================================================================
# ServiceSphere uses PostgreSQL for production-ready relational data persistence.
# Credentials are read safely from the .env file.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),                  # Database name (e.g. servicesphere_db)
        "USER": os.getenv("DB_USER"),                  # Database username (e.g. postgres)
        "PASSWORD": os.getenv("DB_PASSWORD"),          # Database password
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),      # Server host IP address
        "PORT": os.getenv("DB_PORT", "5433"),          # Port number (configured for port 5433)
        "CONN_MAX_AGE": 60,                            # Reusable database connection pool timeout (seconds)
    }
}


# ==============================================================================
# CUSTOM AUTHENTICATION MODEL
# ==============================================================================
# We tell Django to use our custom User model in 'accounts' instead of the default auth.User.
# This allows us to add custom fields such as 'role', 'phone_number', and 'client'.
AUTH_USER_MODEL = "accounts.User"


# ==============================================================================
# PASSWORD VALIDATION
# ==============================================================================
# Rules enforced whenever a user creates or changes their password.
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# ==============================================================================
# INTERNATIONALIZATION & LOCALIZATION
# ==============================================================================

LANGUAGE_CODE = "en-us"

# Store and process all database datetimes in universal UTC.
TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

# When enabled, Django uses time zone-aware datetimes internally.
USE_TZ = True


# ==============================================================================
# STATIC FILES (CSS, JavaScript, Images)
# ==============================================================================
# Base URL path used in HTML templates to refer to static files.
STATIC_URL = "static/"


# ==============================================================================
# EMAIL NOTIFICATIONS CONFIGURATION
# ==============================================================================
# Master toggle: Delivery is disabled by default during development and demonstrations.
EMAIL_NOTIFICATIONS_ENABLED = os.getenv("EMAIL_NOTIFICATIONS_ENABLED", "False").lower() == "true"

# Django email backend: Console backend prints outgoing emails to the terminal for local testing
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")

# SMTP Server connection configuration (read safely from environment variables)
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "support@servicesphere.local")

# ==============================================================================
# DJANGO REST FRAMEWORK (DRF) CONFIGURATION
# ==============================================================================
REST_FRAMEWORK = {
    # Authentication schemes used to identify the user making the API request.
    # Evaluated in order:
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # SessionAuthentication: Authenticates requests using Django's session cookie.
        # This enables testing directly via the browser and the DRF Browsable API.
        "rest_framework.authentication.SessionAuthentication",

        # BasicAuthentication: Authenticates requests using HTTP Basic Authorization header.
        # Convenient for local command-line testing (curl, Postman, automated test suites).
        "rest_framework.authentication.BasicAuthentication",
    ],

    # Default permission policy applied to all REST endpoints across the project.
    "DEFAULT_PERMISSION_CLASSES": [
        # Requires the user to be logged in (authenticated) for all API endpoints
        # unless an individual view explicitly declares different permissions.
        "rest_framework.permissions.IsAuthenticated",
    ],
}


# ==============================================================================
# AUTHENTICATION REDIRECT URLS
# ==============================================================================
# Where to redirect users after successful login via /api-auth/login/
LOGIN_REDIRECT_URL = "/api/tickets/"

# Where to redirect users after logging out via /api-auth/logout/
LOGOUT_REDIRECT_URL = "/api-auth/login/"


# ==============================================================================
# CELERY & REDIS CONFIGURATION (SLA Monitoring & Periodic Tasks)
# ==============================================================================
# Redis message broker URL for Celery background tasks
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")

# Redis database for storing Celery task results
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/0")

# Supported data formats for task payloads and results
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

# Timezone matching the Django application timezone
CELERY_TIMEZONE = TIME_ZONE

# Automatically discover and register asynchronous tasks in installed apps
CELERY_BEAT_SCHEDULE = {
    # Periodically run SLA monitoring and breach detection every 5 minutes (300 seconds)
    "monitor-sla-deadlines-every-5-minutes": {
        "task": "sla.tasks.monitor_sla_deadlines_task",
        "schedule": 300.0,
    },
}
