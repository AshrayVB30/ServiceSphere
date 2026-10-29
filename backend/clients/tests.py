"""
Automated Unit and Integration Tests for the 'clients' application.

Tests should verify:
1. Client model creation, default active status, and string representation.
2. Unauthenticated access to /api/clients/ returns HTTP 401 or 403.
3. Ordinary client users cannot view or create other organizations.
4. System administrators can create, list, and update organizations.
"""

from django.test import TestCase

# Unit and API integration tests using DRF's APITestCase can be implemented here.
