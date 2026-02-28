from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class HealthMembersIn(BaseModel):
    self_age: int = Field(30, ge=18, le=80, description="Age of primary insured")
    spouse: bool = False
    spouse_age: int | None = None
    children_count: int = Field(0, ge=0, le=4)
    children_ages: list[int] = Field(default_factory=list, description="Age of each child")


class HealthCoverageIn(BaseModel):
    sum_insured: float = Field(500000.0, description="Sum insured in INR")
    room_type: Literal["shared", "single", "suite"] = "single"
    pre_existing_conditions: bool = False
    maternity_cover: bool = False


class HealthProposerIn(BaseModel):
    city_tier: Literal["metro", "tier1", "tier2", "rural"] = "metro"
    pincode: str = ""


class HealthQuoteRequestIn(BaseModel):
    members: HealthMembersIn = Field(default_factory=HealthMembersIn)
    coverage: HealthCoverageIn = Field(default_factory=HealthCoverageIn)
    proposer: HealthProposerIn = Field(default_factory=HealthProposerIn)
