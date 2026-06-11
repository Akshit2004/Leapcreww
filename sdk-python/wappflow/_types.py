from __future__ import annotations

from typing import Any, Literal, Optional, Union
from typing_extensions import TypedDict, Required


class Contact(TypedDict, total=False):
    id: Required[str]
    name: Required[str]
    phone: Required[str]
    email: str
    tags: list[str]
    attributes: dict[str, Union[str, int, float, bool]]
    status: str
    source: str
    createdAt: str


class Template(TypedDict, total=False):
    id: Required[str]
    name: Required[str]
    category: Literal["Marketing", "Utility", "Authentication"]
    body: str
    metaStatus: Literal["pending", "approved", "rejected"]
    createdAt: str


EventType = Literal["message.received", "message.status", "order.placed", "contact.created"]


class Event(TypedDict):
    id: str
    type: str
    data: dict[str, Any]
    createdAt: str


class Me(TypedDict):
    organizationId: str
    name: str
    scopes: list[str]


class TemplateParams(TypedDict, total=False):
    name: Required[str]
    language: str
    variables: list[str]


class MediaParams(TypedDict, total=False):
    type: Required[Literal["image", "video", "document"]]
    url: Required[str]
    caption: str


class SendMessageResult(TypedDict):
    ok: bool
    waMessageId: Optional[str]
    error: Optional[str]


class UpsertContactResult(TypedDict):
    contact: Contact
    created: bool


class ListContactsResult(TypedDict):
    contacts: list[Contact]


class ListEventsResult(TypedDict):
    events: list[Event]
    nextAfter: Optional[str]
