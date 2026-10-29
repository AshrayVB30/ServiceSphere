"""
REST API Serializers for the 'clients' application.

Serializers perform two essential functions in Django REST Framework:
1. Serialization: Converts complex Client model instances into native Python datatypes,
   which are then rendered into JSON for API clients (frontends, mobile apps, third parties).
2. Deserialization & Validation: Parses incoming JSON request payloads, validates input
   constraints (e.g., uniqueness of 'code', valid email format), and converts valid data
   back into database model instances.
"""

from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    """
    ModelSerializer for the Client organization model.
    """

    class Meta:
        # Link this serializer directly to the Client model
        model = Client

        # Explicit list of all fields exposed in the JSON API representation
        fields = [
            "id",             # Primary key (auto-generated integer)
            "name",           # Company name
            "code",           # Unique slug identifier (e.g. 'acme-corp')
            "contact_email",  # Contact email address
            "phone_number",   # Contact phone number
            "address",        # Organization address
            "is_active",      # Active/Inactive status boolean
            "created_at",     # Creation timestamp
            "updated_at",     # Last update timestamp
        ]

        # Fields that clients can read but CANNOT modify via POST or PATCH requests.
        # These are generated and maintained automatically by the database/backend.
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]
