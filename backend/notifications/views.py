"""
API Views for the 'notifications' application.

Exposes RESTful endpoints for:
- Viewing authenticated user's notification list and unread notifications.
- Fetching unread badge counter for React navigation bell.
- Marking individual or all notifications as read.
- Retrieving and updating personal notification preferences.

Enforces strict tenant and user isolation:
Every user can ONLY access and modify their own notifications and preferences.
"""

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing and reading notifications.

    Endpoints:
    - GET   /api/notifications/               -> List current user's notifications (newest first)
    - GET   /api/notifications/unread/        -> List unread notifications only
    - GET   /api/notifications/unread-count/  -> Get unread notification badge count
    - PATCH /api/notifications/{id}/read/     -> Mark single notification as read
    - PATCH /api/notifications/mark-all-read/ -> Mark all user's notifications as read
    - GET   /api/notifications/{id}/          -> Retrieve details of a specific notification
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Guarantees strict user isolation.
        Users can only ever see notifications addressed directly to them.
        """
        return (
            Notification.objects.filter(recipient=self.request.user)
            .select_related("related_ticket", "related_approval")
            .order_by("-created_at")
        )

    @action(detail=False, methods=["get"], url_path="unread")
    def unread(self, request):
        """
        Returns only unread notifications for the authenticated user.
        Convenient for populating the quick dropdown panel in React.
        """
        unread_notifications = self.get_queryset().filter(is_read=False)
        page = self.paginate_queryset(unread_notifications)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(unread_notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """
        Returns the integer count of unread notifications.
        Designed for fast badge counter rendering in the React top navbar.
        """
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["patch", "post"], url_path="read")
    def mark_read(self, request, pk=None):
        """
        Marks an individual notification as read.
        Endpoint: PATCH /api/notifications/{id}/read/
        """
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["patch", "post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """
        Marks all active unread notifications for the authenticated user as read.
        Endpoint: PATCH /api/notifications/mark-all-read/
        """
        now = timezone.now()
        updated_count = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=now,
        )
        return Response(
            {
                "marked_read_count": updated_count,
                "message": f"Successfully marked {updated_count} notifications as read.",
            },
            status=status.HTTP_200_OK,
        )


class NotificationPreferenceView(APIView):
    """
    API View for inspecting and updating user notification preferences.

    Endpoints:
    - GET   /api/notifications/preferences/ -> Retrieve preferences for current user
    - PATCH /api/notifications/preferences/ -> Update preferences for current user
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Returns the authenticated user's notification preferences."""
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        """
        Partially updates the authenticated user's notification preferences.
        Accepts any combination of:
        - in_app_enabled: boolean
        - email_enabled: boolean
        - ticket_notifications: boolean
        - approval_notifications: boolean
        - sla_notifications: boolean
        """
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

