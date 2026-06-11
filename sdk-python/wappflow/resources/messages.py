from __future__ import annotations

from typing import Optional, Union

from .._client import HttpClient
from .._types import MediaParams, SendMessageResult, TemplateParams


class MessagesResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def send(
        self,
        *,
        to: str,
        text: Optional[str] = None,
        template: Optional[Union[str, TemplateParams]] = None,
        media: Optional[MediaParams] = None,
        idempotency_key: Optional[str] = None,
    ) -> SendMessageResult:
        """Send a WhatsApp message to a phone number.

        Requires scope ``messages:send``.

        At least one of *text*, *template*, or *media* must be provided.

        Args:
            to:              Destination phone in E.164 format (e.g. ``"+919876543210"``).
            text:            Free-form text. Requires an active 24-hour customer session.
            template:        Template name string or ``TemplateParams`` dict.
            media:           Media attachment dict with ``type``, ``url``, and optional ``caption``.
            idempotency_key: Unique string to make the send safe to retry (max 255 chars).

        Examples::

            # Free-form text
            client.messages.send(to="+919876543210", text="Your order is ready!")

            # Approved template with variables
            client.messages.send(
                to="+919876543210",
                template={"name": "order_confirmation", "variables": ["Rahul", "₹499"]},
            )

            # Image with caption
            client.messages.send(
                to="+919876543210",
                media={"type": "image", "url": "https://cdn.example.com/r.jpg", "caption": "Receipt"},
            )
        """
        # Normalise shorthand template string → dict
        normalised_template: Optional[TemplateParams] = None
        if isinstance(template, str):
            normalised_template = {"name": template}
        elif template is not None:
            normalised_template = template

        body: dict = {"to": to}
        if text is not None:
            body["text"] = text
        if normalised_template is not None:
            body["template"] = normalised_template
        if media is not None:
            body["media"] = media

        extra_headers = {"Idempotency-Key": idempotency_key} if idempotency_key else None
        return self._http.post("/messages", json=body, headers=extra_headers)
