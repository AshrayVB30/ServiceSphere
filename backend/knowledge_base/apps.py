"""
Application configuration for 'knowledge_base'.

Registers the Knowledge Base application in ServiceSphere.
"""

from django.apps import AppConfig


class KnowledgeBaseConfig(AppConfig):
    """Configuration class for the Knowledge Base application."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "knowledge_base"
    verbose_name = "Knowledge Base & Documentation Management"

