from __future__ import annotations

# 4W uses the same input schema as 2W motor.
# This file exists so routes.py has a clear per-product import path.
from app.quotes.motor_2w_schemas import (  # noqa: F401
    CoverageOptionsIn,
    PolicyHistoryIn,
    ProposerIn,
    QuoteRequestIn as Motor4WQuoteRequestIn,
    VehicleDetailsIn,
)
