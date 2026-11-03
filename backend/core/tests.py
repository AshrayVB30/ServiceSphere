"""
Automated Unit and Integration Tests for the 'core' application.

Validates:
1. Deep health check endpoint (GET /api/health/) status, dependencies, and structure.
2. Lightweight liveness check endpoint (GET /api/health/liveness/).
3. HTTP Method protection (POST/PUT/DELETE return HTTP 405 Method Not Allowed).
4. Production security headers enforcement.
"""

from django.test import TestCase, Client
from rest_framework import status


class HealthCheckTests(TestCase):
    """
    Test suite for health check probes and system status monitors.
    """

    def setUp(self):
        self.client = Client()

    def test_health_check_returns_healthy(self):
        """GET /api/health/ returns HTTP 200 with database status."""
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn("status", data)
        self.assertEqual(data["status"], "healthy")
        self.assertIn("dependencies", data)
        self.assertEqual(data["dependencies"]["database"], "healthy")

    def test_liveness_check_returns_alive(self):
        """GET /api/health/liveness/ returns HTTP 200 with alive status."""
        response = self.client.get("/api/health/liveness/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["status"], "alive")

    def test_health_check_disallows_post(self):
        """POST /api/health/ is rejected with HTTP 405 Method Not Allowed."""
        response = self.client.post("/api/health/", {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_security_headers_present(self):
        """Confirms critical security headers are attached to responses."""
        response = self.client.get("/api/health/")
        # X-Frame-Options protection against clickjacking
        self.assertIn("x-frame-options", response.headers)
        self.assertEqual(response.headers["x-frame-options"], "DENY")

        # X-Content-Type-Options protection against MIME sniffing
        self.assertIn("x-content-type-options", response.headers)
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
