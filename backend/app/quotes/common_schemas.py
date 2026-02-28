from __future__ import annotations

from pydantic import BaseModel


class QuoteItemOut(BaseModel):
    insurer_code: str
    premium: float | None = None
    final_premium: float | None = None
    gst: float | None = None
    idv: float | None = None
    min_idv: float | None = None
    max_idv: float | None = None
    success: bool = False
    error_message: str | None = None


class QuoteResultOut(BaseModel):
    quotes: list[QuoteItemOut]
    best_value_insurer: str | None = None
    disclaimer: str
