from __future__ import annotations

from pydantic import BaseModel, Field


class VehicleDetailsIn(BaseModel):
    registration_no: str = ""
    make_code: int = 10
    model_code: int = 11846
    rto_code: int = 12621
    registration_date: str = "2017-03-31T18:30:00Z"
    owner_type: int = Field(1, description="1=individual, 2=company")


class PolicyHistoryIn(BaseModel):
    previous_policy_claimed: bool = False
    previous_policy_ncb_percentage: int = Field(0, description="0/20/25/35/45/50")
    previous_policy_expiry_date: str = "2024-09-30T18:30:00Z"
    previous_policy_type: int = Field(1, description="1=comprehensive, 2=TP only, 3=standalone OD")
    previous_policy_has_zd_cover: bool = False
    previous_insurer_code: str = ""
    previous_policy_number: str = ""
    active_tp_start_date: str = "2023-04-30T18:30:00Z"
    active_tp_end_date: str = "2026-04-29T18:30:00Z"
    active_tp_insurer_code: str | None = None
    active_tp_policy_number: str | None = None


class CoverageOptionsIn(BaseModel):
    idv_type: int = Field(1, description="1=market value")
    idv: float = 208966.0
    addons: list[str] = Field(default_factory=lambda: ["RSA", "ZD"])
    has_existing_pa_cover: bool = True
    number_of_driver: int = 0
    number_of_employee: int = 0
    electrical_accessories_si: float = 3000.0
    non_electrical_accessories_si: float = 3000.0
    unnamed_pa_cover: float = 0.0
    named_pa_cover: float = 0.0
    has_anti_theft_device: bool = False
    automobile_association_membership_number: str | None = None
    driving_accessories_si: float = 0.0
    key_protect_si: float = 0.0


class ProposerIn(BaseModel):
    pincode: str = ""
    age: int | None = None
    city: str | None = None


class QuoteRequestIn(BaseModel):
    vehicle: VehicleDetailsIn = Field(default_factory=VehicleDetailsIn)
    policy_history: PolicyHistoryIn = Field(default_factory=PolicyHistoryIn)
    coverage: CoverageOptionsIn = Field(default_factory=CoverageOptionsIn)
    proposer: ProposerIn = Field(default_factory=ProposerIn)


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
