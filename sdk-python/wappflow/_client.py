from __future__ import annotations

from typing import Any, Optional

import httpx

from ._exceptions import WappFlowError

_SDK_VERSION = "1.0.0"


class HttpClient:
    def __init__(self, base_url: str, api_key: str, timeout: float) -> None:
        self._base = base_url.rstrip("/")
        self._session = httpx.Client(
            base_url=f"{self._base}/api/v1",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": f"wappflow-python/{_SDK_VERSION}",
            },
            timeout=timeout,
        )

    def get(self, path: str, params: Optional[dict[str, Any]] = None) -> Any:
        return self._request("GET", path, params=params)

    def post(self, path: str, json: Any = None, headers: Optional[dict[str, str]] = None) -> Any:
        return self._request("POST", path, json=json, extra_headers=headers)

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[dict[str, Any]] = None,
        json: Any = None,
        extra_headers: Optional[dict[str, str]] = None,
    ) -> Any:
        # Filter out None values from query params
        clean_params = {k: str(v) for k, v in (params or {}).items() if v is not None}

        res = self._session.request(
            method,
            path,
            params=clean_params or None,
            json=json,
            headers=extra_headers,
        )

        try:
            body = res.json()
        except Exception:
            body = {}

        if res.is_error:
            message = body.get("error", f"HTTP {res.status_code}") if isinstance(body, dict) else f"HTTP {res.status_code}"
            raise WappFlowError(message, res.status_code, body)

        return body

    def close(self) -> None:
        self._session.close()

    def __enter__(self) -> "HttpClient":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()
