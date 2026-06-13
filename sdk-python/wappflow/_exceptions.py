from __future__ import annotations


class LeapCrewwError(Exception):
    """Raised whenever the LeapCreww API returns a non-2xx status code.

    Attributes:
        status:  HTTP status code (e.g. 402, 401, 403).
        message: Human-readable error description from the API.
        body:    Full parsed JSON body (dict) or empty dict on parse failure.

    Example::

        try:
            client.messages.send(to="+91...", text="hello")
        except LeapCrewwError as e:
            if e.status == 402:
                print("Top up your wallet:", e.message)
    """

    def __init__(self, message: str, status: int, body: object) -> None:
        super().__init__(message)
        self.message = message
        self.status = status
        self.body = body

    def __repr__(self) -> str:
        return f"LeapCrewwError(status={self.status}, message={self.message!r})"
