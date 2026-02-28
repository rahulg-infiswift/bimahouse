from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class TravelTripIn(BaseModel):
    destination_type: Literal["domestic", "international"] = "international"
    destination_country: str | None = Field(None, description="ISO country code for international trips")
    trip_duration_days: int = Field(7, ge=1, le=365)
    trip_purpose: Literal["leisure", "business", "student"] = "leisure"


class TravelTravellersIn(BaseModel):
    count: int = Field(1, ge=1, le=10)
    ages: list[int] = Field(default_factory=lambda: [30], description="Age of each traveller")


class TravelCoverageIn(BaseModel):
    coverage_amount_usd: float = Field(
        50000.0, description="Sum insured in USD for international, or INR for domestic"
    )
    medical_cover: bool = True
    trip_cancellation: bool = False
    baggage_loss: bool = False


class TravelQuoteRequestIn(BaseModel):
    trip: TravelTripIn = Field(default_factory=TravelTripIn)
    travellers: TravelTravellersIn = Field(default_factory=TravelTravellersIn)
    coverage: TravelCoverageIn = Field(default_factory=TravelCoverageIn)
