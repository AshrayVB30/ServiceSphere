"""
REST API Serializers for Ticket Comments.

This module handles serialization and deserialization of the TicketComment model:
1. Serialization: Transforms comment model instances into JSON representations,
   enriching them with the author's username and role for frontend conversation feeds.
2. Deserialization & Security: Restricts writable fields so that users cannot forge the
   comment author, change the associated ticket, or modify timestamps.
"""

from rest_framework import serializers
from .models import TicketComment


class TicketCommentSerializer(serializers.ModelSerializer):
    """
    ModelSerializer for Ticket Comments.
    """

    # Read-only author username for convenient display in chat / conversation feeds
    author_username = serializers.CharField(
        source="author.username",
        read_only=True,
        help_text="Username of the comment author.",
    )

    # Read-only author role (e.g., CLIENT, SUPPORT_AGENT, ADMIN) to render badges in the UI
    author_role = serializers.CharField(
        source="author.role",
        read_only=True,
        help_text="Role of the comment author.",
    )

    class Meta:
        model = TicketComment

        # All fields included in the JSON representation
        fields = [
            "id",               # Unique integer primary key of the comment
            "ticket",           # ID of the associated ticket
            "author",           # ID of the user author
            "author_username",  # Username string of the author
            "author_role",      # Role string of the author
            "message",          # Text content of the comment
            "is_internal",      # Boolean flag: True for private staff notes, False for public messages
            "created_at",       # Timestamp when the comment was posted
        ]

        # Security-critical read-only fields:
        # These fields cannot be supplied or manipulated by the API client.
        # The backend derives 'ticket' from the URL and 'author' from the authenticated session.
        read_only_fields = [
            "id",
            "ticket",
            "author",
            "author_username",
            "author_role",
            "created_at",
        ]

