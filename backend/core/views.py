"""
API Views for the 'core' application.

Provides enterprise-ready health check and system status endpoints:
- GET /api/health/          -> Deep readiness check probing PostgreSQL and Redis dependencies.
- GET /api/health/liveness/ -> Fast liveness check verifying the HTTP application worker is responsive.
"""

import logging
from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

logger = logging.getLogger("servicesphere")


@require_GET
def health_check(request):
    """
    Deep Readiness Health Check: GET /api/health/

    Validates that:
    1. The Django web application is alive and responding.
    2. The primary PostgreSQL database connection is operational.
    3. The Redis Celery broker is reachable (if configured).

    Returns:
    - HTTP 200 OK if all critical infrastructure dependencies are healthy.
    - HTTP 503 Service Unavailable if any critical component is offline.
    """
    checks = {
        "database": "unknown",
        "cache_broker": "unknown",
    }
    overall_healthy = True

    # 1. Probe PostgreSQL Database Connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            row = cursor.fetchone()
            if row and row[0] == 1:
                checks["database"] = "healthy"
            else:
                checks["database"] = "unexpected_response"
                overall_healthy = False
    except Exception as db_exc:
        logger.error(f"Health check database probe failed: {str(db_exc)}", exc_info=True)
        checks["database"] = "unhealthy"
        checks["database_error"] = str(db_exc)
        overall_healthy = False

    # 2. Probe Redis / Celery Broker Connectivity
    try:
        import redis
        broker_url = getattr(settings, "CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")
        client = redis.Redis.from_url(broker_url, socket_connect_timeout=2)
        if client.ping():
            checks["cache_broker"] = "healthy"
        else:
            checks["cache_broker"] = "unresponsive"
    except Exception as redis_exc:
        # Non-critical warning in local environments if Redis is optional
        checks["cache_broker"] = "unreachable"
        checks["cache_broker_error"] = str(redis_exc)

    status_code = 200 if overall_healthy else 503

    return JsonResponse(
        {
            "status": "healthy" if overall_healthy else "unhealthy",
            "service": "ServiceSphere API",
            "version": "1.0.0",
            "timestamp": timezone.now().isoformat(),
            "dependencies": checks,
        },
        status=status_code,
    )


@require_GET
def liveness_check(request):
    """
    Lightweight Liveness Check: GET /api/health/liveness/

    Used by orchestrators (Kubernetes, AWS ECS, Docker healthcheck)
    to confirm the container process is accepting HTTP traffic.
    """
    return JsonResponse(
        {
            "status": "alive",
            "timestamp": timezone.now().isoformat(),
        },
        status=200,
    )
