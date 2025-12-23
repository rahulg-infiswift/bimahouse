from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

class Product(BaseModel):
    model_config = ConfigDict(extra="forbid")
    product_code: Optional[str] = None
    uin: Optional[str] = None

class Document(BaseModel):
    model_config = ConfigDict(extra="forbid")
    insurer: Optional[str] = None
    document_types: List[str] = Field(default_factory=list)
    reference_number: Optional[str] = None
    policy_number: Optional[str] = None
    covernote_number: Optional[str] = None
    policy_issued_on: Optional[str] = None
    # letter_date: Optional[str] = None
    # invoice_number: Optional[str] = None
    # e_policy_number: Optional[str] = None
    # product: Product = Field(default_factory=Product)
    # geographical_area: Optional[str] = None

class Address(BaseModel):
    model_config = ConfigDict(extra="forbid")
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None

class Nominee(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nominee_name: Optional[str] = None
    relationship: Optional[str] = None
    age: Optional[int] = None

class Insured(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = None
    address: Address = Field(default_factory=Address)
    mobile: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pep_or_close_relative_of_pep: Optional[str] = None
    # nominee: Nominee = Field(default_factory=Nominee)

class PolicyPeriod(BaseModel):
    model_config = ConfigDict(extra="forbid")
    start: Optional[str] = None
    end: Optional[str] = None
    display: Optional[str] = None

class ServicingBranch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = None
    address: Address = Field(default_factory=Address)

class Trailer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    trailer_chassis_number: Optional[str] = None
    trailer_registration_number: Optional[str] = None

class Vehicle(BaseModel):
    model_config = ConfigDict(extra="forbid")
    vehicle_class: Optional[str] = None
    registration_number: Optional[str] = None
    rto_location: Optional[str] = None
    registration_date: Optional[str] = None
    make: Optional[str] = None
    subclass: Optional[str] = None
    model: Optional[str] = None
    build: Optional[str] = None
    body_type: Optional[str] = None
    gvw: Optional[float] = None
    manufacturing_year: Optional[int] = None
    carrying_capacity: Optional[int] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    trailer: Trailer = Field(default_factory=Trailer)
    usage: Optional[str] = None
    hypothecated_to: Optional[str] = None

class PreviousPolicyPeriod(BaseModel):
    model_config = ConfigDict(extra="forbid")
    start: Optional[str] = None
    end: Optional[str] = None
    display: Optional[str] = None

class PreviousPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")
    previous_policy_number: Optional[str] = None
    previous_policy_period: PreviousPolicyPeriod = Field(default_factory=PreviousPolicyPeriod)
    previous_year_ncb_percent: Optional[float] = None
    claims_made_under_previous_policy: Optional[int] = None
    previous_insurer_name: Optional[str] = None
    previous_policy_type: Optional[str] = None
    current_year_ncb_percent: Optional[float] = None

class IDV(BaseModel):
    model_config = ConfigDict(extra="forbid")
    body_idv: Optional[float] = None
    chassis_idv: Optional[float] = None
    trailer_idv: Optional[float] = None
    electrical_electronic_accessories_idv: Optional[float] = None
    non_electrical_accessories_idv: Optional[float] = None
    cng_lpg_unit_idv: Optional[float] = None
    total_idv: Optional[float] = None
    # currency: Optional[str] = None

class OwnDamageA(BaseModel):
    model_config = ConfigDict(extra="forbid")
    basic_od_premium: Optional[float] = None
    zero_depreciation_addon: Optional[float] = None
    imt_23_loading: Optional[float] = None
    subtotal: Optional[float] = None
    no_claim_bonus_percent: Optional[float] = None
    ncb_amount_deducted: Optional[float] = None
    subtotal_deductions: Optional[float] = None
    total_own_damage_premium: Optional[float] = None

class LiabilityB(BaseModel):
    model_config = ConfigDict(extra="forbid")
    basic_third_party_liability: Optional[float] = None
    legal_liability_to_paid_driver: Optional[float] = None
    subtotal: Optional[float] = None
    total_liability_premium: Optional[float] = None

class Taxes(BaseModel):
    model_config = ConfigDict(extra="forbid")
    premium_taxable_at_12_percent_basic_tp_liability: Optional[float] = None
    cgst_6_percent: Optional[float] = None
    sgst_6_percent: Optional[float] = None
    premium_taxable_at_18_percent_other_than_basic_tp: Optional[float] = None
    cgst_9_percent: Optional[float] = None
    sgst_9_percent: Optional[float] = None
    total_tax_payable: Optional[float] = None

class Collection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    premium_collection_number: Optional[str] = None
    premium_amount: Optional[float] = None
    receipt_date: Optional[str] = None

class Premium(BaseModel):
    model_config = ConfigDict(extra="forbid")
    own_damage_A: OwnDamageA = Field(default_factory=OwnDamageA)
    liability_B: LiabilityB = Field(default_factory=LiabilityB)
    total_package_premium_A_plus_B: Optional[float] = None
    taxes: Taxes = Field(default_factory=Taxes)
    total_premium_payable: Optional[float] = None
    currency: Optional[str] = None
    collection: Collection = Field(default_factory=Collection)

class DeductiblesAndClauses(BaseModel):
    model_config = ConfigDict(extra="forbid")
    compulsory_deductible: Optional[float] = None
    voluntary_deductible: Optional[float] = None
    applicable_imt_clauses: List[str] = Field(default_factory=list)

class AddOnCover(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = None
    uin_details: Optional[str] = None
    notes: Optional[str] = None

class LimitsAndPACover(BaseModel):
    model_config = ConfigDict(extra="forbid")
    liability_section_II: Optional[str] = None
    pa_cover_owner_driver_csi: Optional[float] = None
    pa_cover_not_opted_reason: Optional[str] = None

class POSDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pos_number: Optional[str] = None
    pos_name: Optional[str] = None
    contact_details: Optional[str] = None
    pan_card_number: Optional[str] = None

class InsurerGSTINAndService(BaseModel):
    model_config = ConfigDict(extra="forbid")
    insurer_gstin_reg_no: Optional[str] = None
    hsn_sac_code: Optional[str] = None
    service_description: Optional[str] = None

class PolicyExtractV1(BaseModel):
    """
    Phase 1 canonical extraction model.

    NOTE:
    - Using `extra="forbid"` keeps shape tight.
    - Allowing Optional fields prevents failures when documents omit certain fields.
    """
    model_config = ConfigDict(extra="forbid")

    document: Document = Field(default_factory=Document)
    insured: Insured = Field(default_factory=Insured)
    policy_period: PolicyPeriod = Field(default_factory=PolicyPeriod)
    servicing_branch: ServicingBranch = Field(default_factory=ServicingBranch)
    vehicle: Vehicle = Field(default_factory=Vehicle)
    previous_policy: PreviousPolicy = Field(default_factory=PreviousPolicy)
    idv: IDV = Field(default_factory=IDV)
    # premium: Premium = Field(default_factory=Premium)
    # deductibles_and_clauses: DeductiblesAndClauses = Field(default_factory=DeductiblesAndClauses)
    # add_on_covers: List[AddOnCover] = Field(default_factory=list)
    # limits_and_pa_cover: LimitsAndPACover = Field(default_factory=LimitsAndPACover)
    # key_notices_and_conditions: List[str] = Field(default_factory=list)
    pos_details: POSDetails = Field(default_factory=POSDetails)
    # insurer_gstin_and_service: InsurerGSTINAndService = Field(default_factory=InsurerGSTINAndService)
