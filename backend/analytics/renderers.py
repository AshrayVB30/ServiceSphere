"""
Custom Renderers for the 'analytics' application.

Provides PassthroughCSVRenderer to support RFC 4180 CSV streaming downloads
and format suffix negotiation (?format=csv) in Django REST Framework.
"""

# Import BaseRenderer from DRF
from rest_framework.renderers import BaseRenderer


class PassthroughCSVRenderer(BaseRenderer):
    """
    Passthrough renderer for CSV exports.
    Registers 'csv' format with DRF so ?format=csv does not raise 404 NotFound.
    If views return an HttpResponse directly, this renderer is bypassed;
    if a Response object is returned, it ensures bytes/strings are passed through cleanly.
    """
    media_type = "text/csv"
    format = "csv"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        """
        Renders data into CSV bytes.
        """
        if data is None:
            return b""
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return data.encode(self.charset)
        return str(data).encode(self.charset)

