from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import requests


class QuoteProvider(ABC):
    insurer_code: str

    @abstractmethod
    def get_quote(self, canonical_request: dict[str, Any], *, is_live: bool) -> dict[str, Any]:
        raise NotImplementedError

    def _post_or_fallback(
        self,
        url: str | None,
        payload: dict[str, Any],
        fallback: dict[str, Any],
        *,
        is_live: bool,
    ) -> dict[str, Any]:
        """POST to provider URL; on any failure or if is_live=False, return fallback."""
        if not is_live or not url:
            return dict(fallback)
        try:
            resp = requests.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=20,
            )
            body = resp.json() if resp.content else {}
            if resp.ok and body:
                return body
        except Exception:
            pass
        return dict(fallback)
