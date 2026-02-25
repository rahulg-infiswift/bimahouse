from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class QuoteProvider(ABC):
    insurer_code: str

    @abstractmethod
    def get_quote(self, canonical_request: dict[str, Any], *, is_live: bool) -> dict[str, Any]:
        raise NotImplementedError
