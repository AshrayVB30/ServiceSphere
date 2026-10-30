"""
URL Routing for the 'approvals' application.

Registers endpoints for Approval Requests and Action workflows:
- GET  /api/approvals/                    -> List authorized approval requests
- POST /api/approvals/                    -> Submit a new approval request
- GET  /api/approvals/{id}/               -> Retrieve approval request details & audit history
- POST /api/approvals/{id}/approve/       -> Approve the request (Approver only)
- POST /api/approvals/{id}/reject/        -> Reject the request (Approver only)
- POST /api/approvals/{id}/request-info/  -> Request additional info (Approver only)
- POST /api/approvals/{id}/resubmit/      -> Resubmit after providing info (Requester only)
"""

from rest_framework.routers import DefaultRouter
from .views import ApprovalRequestViewSet

# Auto-generate RESTful URL patterns for the approval ViewSet
router = DefaultRouter()
router.register("approvals", ApprovalRequestViewSet, basename="approval")

# Expose generated URLs for inclusion in root config/urls.py
urlpatterns = router.urls

