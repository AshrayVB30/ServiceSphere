"""
Pagination configuration for the 'knowledge_base' application.

Provides consistent, configurable page-number pagination for article listings
and category browsing feeds.
"""

from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination class for Knowledge Base endpoints.

    Features:
    - Default page size: 10 items.
    - Client customizable via 'page_size' query parameter (e.g. ?page_size=20).
    - Maximum page size cap: 100 items to prevent resource exhaustion.
    """

    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100

