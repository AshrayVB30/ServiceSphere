"""
Automated Unit and Integration Tests for the 'core' application.

Tests should verify:
1. Health check endpoint (GET /api/health/) returns HTTP 200 with status="success".
2. Disallowed HTTP methods on health check (POST, PUT, DELETE) return HTTP 405.
"""

from django.test import TestCase

# System health and shared utility tests can be implemented here.
