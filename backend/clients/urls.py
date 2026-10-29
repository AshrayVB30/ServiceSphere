"""
URL Routing for the 'clients' application.

Uses Django REST Framework's DefaultRouter to automatically generate the standard
RESTful URL routes for the ClientViewSet:
- /api/clients/       (GET: list, POST: create)
- /api/clients/{id}/   (GET: retrieve, PATCH: partial update)
"""

from rest_framework.routers import DefaultRouter
from .views import ClientViewSet

# Instantiate the DefaultRouter which auto-generates RESTful URL patterns and root API views
router = DefaultRouter()

# Register the ClientViewSet under the 'clients' prefix.
# 'basename="client"' provides the base name for generating URL lookup names (e.g., 'client-list', 'client-detail').
router.register("clients", ClientViewSet, basename="client")

# Expose the generated URL patterns for Django's root URL dispatcher in config/urls.py
urlpatterns = router.urls
