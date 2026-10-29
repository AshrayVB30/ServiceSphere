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
        "127.0.0.1,localhost",
    ).split(",")
    if host.strip()
]


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
# For local development, prints outgoing emails to the console instead of sending real emails.
MAILERS = {
    "default": {
        "BACKEND": "django.core.mail.backends.console.EmailBackend",
    },
}
