from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def health_check(request):
    return JsonResponse({
        "status": "success",
        "message": "ServiceSphere backend is running",
        "service": "help-desk-api",
    })