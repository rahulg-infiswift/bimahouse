from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class HomePropertyIn(BaseModel):
    property_type: Literal["owned", "rented"] = "owned"
    construction_type: Literal["rcc", "load_bearing", "prefab"] = "rcc"
    built_up_area_sqft: float = Field(1000.0, gt=0, description="Built-up area in sq. ft.")
    property_value: float = Field(5000000.0, description="Market value of property in INR")
    age_of_building_years: int = Field(5, ge=0, le=100)


class HomeLocationIn(BaseModel):
    city: str = ""
    pincode: str = ""
    flood_zone: bool = False
    earthquake_zone: Literal["I", "II", "III", "IV"] = "II"


class HomeCoverageIn(BaseModel):
    building_cover: bool = True
    contents_value: float = Field(500000.0, description="Value of contents/belongings in INR")
    contents_cover: bool = True
    temporary_resettlement: bool = False


class HomeQuoteRequestIn(BaseModel):
    property: HomePropertyIn = Field(default_factory=HomePropertyIn)
    location: HomeLocationIn = Field(default_factory=HomeLocationIn)
    coverage: HomeCoverageIn = Field(default_factory=HomeCoverageIn)
