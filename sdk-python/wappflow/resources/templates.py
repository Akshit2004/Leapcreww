from __future__ import annotations

from .._client import HttpClient
from .._types import Template


class TemplatesResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(self) -> list[Template]:
        """List all WhatsApp templates (approved and pending).

        Requires scope ``templates:read``.
        """
        result = self._http.get("/templates")
        return result.get("templates", [])
