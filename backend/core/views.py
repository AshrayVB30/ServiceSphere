"""
API Views for the 'core' app.

Contains system-level views that do not belong to a specific business domain,
such as health checks, ping endpoints, and system status monitors.
"""

from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def health_check(request):
    """
    Health check endpoint: GET /api/health/
    
    This view returns a simple JSON response confirming that the backend server
    is alive, reachable, and ready to accept incoming traffic.
    
    Decorated with @require_GET to guarantee it only answers HTTP GET requests;
    POST, PUT, DELETE, etc. will automatically receive HTTP 405 Method Not Allowed.
    """
    return JsonResponse({
        "status": "success",
        "message": "ServiceSphere backend is running",
        "service": "help-desk-api",
    })
