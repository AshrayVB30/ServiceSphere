"""
Database Models for the 'clients' application.

Represents client organizations (companies) subscribing to ServiceSphere.
Each client organization acts as a tenant that groups its own employees (users)
and support tickets, ensuring strict isolation between different companies.
"""

from django.db import models


class Client(models.Model):
    """
    Client Organization Model.
    
    Stores company profile data and status. Inactive clients (`is_active=False`)
    can be blocked system-wide from logging in or creating new support tickets.
    """

    # Official business name of the client organization (e.g., 'Acme Corporation')
    name = models.CharField(
        max_length=200,
        help_text="Official name of the client organization.",
    )

    # Unique URL-friendly slug identifier (e.g., 'acme-corp').
    # Used in URLs, API references, or tenant domain matching.
    code = models.SlugField(
        max_length=50,
        unique=True,
        help_text="Unique lowercase identifier/slug (e.g., 'acme-corp').",
    )

    # Primary contact email for administrative or billing correspondence
    contact_email = models.EmailField(
        blank=True,
        help_text="Main contact email for this organization.",
    )

    # Primary telephone contact number
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        help_text="Contact phone number.",
    )

    # Physical mailing or headquarters address
    address = models.TextField(
        blank=True,
        help_text="Physical or billing address.",
    )

    # Soft-deletion / activation flag:
    # Instead of deleting a client (which could destroy historical tickets and audit logs),
    # set is_active=False to instantly suspend their access.
    is_active = models.BooleanField(
        default=True,
        help_text="Controls whether this organization is active or suspended.",
    )

    # Timestamp recorded automatically when the client organization is first created
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the organization was onboarded.",
    )

    # Timestamp automatically updated whenever this client record is saved or modified
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of the most recent modification.",
    )

    class Meta:
        # Default alphabetical sorting by company name in queries and Django Admin
        ordering = ["name"]

        # Composite database index on (is_active, name) to ensure queries like
        # `Client.objects.filter(is_active=True).order_by('name')` execute with maximum speed.
        indexes = [
            models.Index(fields=["is_active", "name"]),
        ]

    def __str__(self):
        """
        Returns the company name as the string representation.
        Example output: 'Acme Corporation'
        """
        return self.name
