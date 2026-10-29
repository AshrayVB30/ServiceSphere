"""
API Views for the 'clients' application.

Exposes RESTful endpoints for onboarding, listing, retrieving, and updating
client organizations using Django REST Framework's ModelViewSet.
"""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Client
from .permissions import IsSystemAdmin
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and managing client organizations.

    Supported Operations:
    - GET /api/clients/       -> List all client organizations
    - POST /api/clients/      -> Onboard/create a new client organization
    - GET /api/clients/{id}/   -> Retrieve details of a specific client
    - PATCH /api/clients/{id}/ -> Partially update client organization details
    - HEAD / OPTIONS          -> Retrieve API metadata and supported headers
    """

    # Base query: retrieve all Client records from the database
    queryset = Client.objects.all()

    # Serializer used to validate input data and render output JSON
    serializer_class = ClientSerializer

    # Security: Every request must be authenticated AND issued by a system administrator
    permission_classes = [
        IsAuthenticated,  # User must be logged in
        IsSystemAdmin,    # User must be an administrator
    ]

    # Explicitly limit allowed HTTP methods.
    # Note: 'delete' and 'put' are deliberately omitted. Rather than hard-deleting records
    # (which would break historical ticket linkages), organizations should be soft-deactivated
    # by sending a PATCH request with `{"is_active": false}`.
    http_method_names = [
        "get",
        "post",
        "patch",
        "head",
        "options",
    ]
