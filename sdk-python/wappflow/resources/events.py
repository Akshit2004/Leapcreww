from __future__ import annotations

from typing import Optional

from .._client import HttpClient
from .._types import EventType, ListEventsResult


class EventsResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(
        self,
        *,
        type: Optional[EventType] = None,
        after: Optional[str] = None,
        limit: int = 20,
    ) -> ListEventsResult:
        """Poll recent events.

        Pass the returned ``nextAfter`` value back as ``after`` on the next
        call to receive only newer events (cursor-based pagination).

        Requires scope ``contacts:read``.

        Event types:
            - ``"message.received"`` — inbound WhatsApp messages
            - ``"message.status"``   — delivery / read receipts
            - ``"order.placed"``     — WhatsApp store orders
            - ``"contact.created"``  — new CRM contacts

        Example::

            next_after = None
            while True:
                result = client.events.list(type="message.received", after=next_after)
                for event in result["events"]:
                    handle(event)
                next_after = result["nextAfter"]
                time.sleep(60)
        """
        return self._http.get(
            "/events",
            params={"type": type, "after": after, "limit": limit},
        )
