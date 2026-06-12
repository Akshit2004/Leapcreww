from __future__ import annotations

from typing import Any, Optional

from .._client import HttpClient
from .._types import Contact, ListContactsResult, UpsertContactResult


class ContactsResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(
        self,
        *,
        phone: Optional[str] = None,
        tag: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> ListContactsResult:
        """List or search CRM contacts.

        Requires scope ``contacts:read``.
        """
        return self._http.get(
            "/contacts",
            params={"phone": phone, "tag": tag, "limit": limit, "offset": offset},
        )

    def upsert(
        self,
        *,
        phone: str,
        name: Optional[str] = None,
        email: Optional[str] = None,
        tags: Optional[list[str]] = None,
        attributes: Optional[dict[str, Any]] = None,
        source: Optional[str] = None,
    ) -> UpsertContactResult:
        """Create a new contact or update an existing one matched by phone.

        Tags and attributes are **merged** with existing data, not replaced.
        Requires scope ``contacts:write``.

        Example::

            result = client.contacts.upsert(
                phone="+919876543210",
                name="Rahul Verma",
                tags=["vip", "newsletter"],
                attributes={"plan": "pro", "mrr": 499},
            )
            print("Created:", result["created"])
        """
        body: dict[str, Any] = {"phone": phone}
        if name is not None:
            body["name"] = name
        if email is not None:
            body["email"] = email
        if tags is not None:
            body["tags"] = tags
        if attributes is not None:
            body["attributes"] = attributes
        if source is not None:
            body["source"] = source
        return self._http.post("/contacts", json=body)

    def tag(self, phone: str, *tags: str) -> Contact:
        """Add tags to a contact (creates the contact if not found).

        Shorthand for ``upsert(phone=..., tags=[...])``.

        Example::

            client.contacts.tag("+919876543210", "paid", "cohort-june")
        """
        result = self.upsert(phone=phone, tags=list(tags))
        return result["contact"]
