"""
LeapCreww Python SDK
===================

Official client library for the LeapCreww API.

Quick start::

    from leapcreww import LeapCreww

    client = LeapCreww(api_key="wf_live_...")

    # Verify connection
    me = client.me()
    print(f"Connected to {me['name']}")

    # Send a WhatsApp message
    client.messages.send(to="+919876543210", text="Hello from Python!")

    # Upsert a contact with tags
    client.contacts.upsert(
        phone="+919876543210",
        name="Rahul Verma",
        tags=["vip", "newsletter"],
    )

    # Poll for recent inbound messages
    result = client.events.list(type="message.received")
    for event in result["events"]:
        print(event["data"]["text"])
"""

from __future__ import annotations

from typing import Optional

from ._client import HttpClient
from ._exceptions import LeapCrewwError
from ._types import (
    Contact,
    Event,
    EventType,
    ListContactsResult,
    ListEventsResult,
    Me,
    MediaParams,
    SendMessageResult,
    Template,
    TemplateParams,
    UpsertContactResult,
)
from .resources.contacts import ContactsResource
from .resources.events import EventsResource
from .resources.messages import MessagesResource
from .resources.templates import TemplatesResource

__all__ = [
    "LeapCreww",
    "LeapCrewwError",
    # Types
    "Contact",
    "Event",
    "EventType",
    "ListContactsResult",
    "ListEventsResult",
    "Me",
    "MediaParams",
    "SendMessageResult",
    "Template",
    "TemplateParams",
    "UpsertContactResult",
]

_DEFAULT_BASE_URL = "https://app.leapcreww.com"
_DEFAULT_TIMEOUT = 30.0


class LeapCreww:
    """LeapCreww API client.

    Args:
        api_key:  Your LeapCreww API key (``wf_live_...``).
                  Find it in Settings → Developer → API Keys.
        base_url: Override the default API base URL.
                  Useful for self-hosted instances or local development.
        timeout:  HTTP request timeout in seconds. Defaults to 30.

    The client holds an ``httpx`` session. Call :meth:`close` (or use as a
    context manager) when finished to release the underlying connection pool.

    Example::

        # As a plain instance
        client = LeapCreww(api_key="wf_live_...")
        client.messages.send(to="+91...", text="hi")
        client.close()

        # As a context manager
        with LeapCreww(api_key="wf_live_...") as client:
            client.messages.send(to="+91...", text="hi")
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: Optional[str] = None,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> None:
        if not api_key:
            raise ValueError("api_key is required")
        self._http = HttpClient(base_url or _DEFAULT_BASE_URL, api_key, timeout)
        self.messages = MessagesResource(self._http)
        self.contacts = ContactsResource(self._http)
        self.templates = TemplatesResource(self._http)
        self.events = EventsResource(self._http)

    def me(self) -> Me:
        """Verify the API key and return workspace information.

        Useful as a health-check on startup::

            info = client.me()
            print(f"Connected to {info['name']} (scopes: {info['scopes']})")
        """
        return self._http.get("/me")

    def close(self) -> None:
        """Close the underlying HTTP session."""
        self._http.close()

    def __enter__(self) -> "LeapCreww":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
