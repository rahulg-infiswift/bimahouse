from __future__ import annotations

from app.providers.base import QuoteProvider

# Motor 2W (existing)
from app.providers.icici_motor_2w import IciciMotor2WProvider
from app.providers.tata_agi_motor_2w import TataAgiMotor2WProvider

# Motor 4W
from app.providers.hdfc_ergo_motor_4w import HdfcErgoMotor4WProvider
from app.providers.icici_motor_4w import IciciMotor4WProvider
from app.providers.tata_agi_motor_4w import TataAgiMotor4WProvider

# Health
from app.providers.care_health import CareHealthProvider
from app.providers.hdfc_ergo_health import HdfcErgoHealthProvider
from app.providers.star_health import StarHealthProvider

# Travel
from app.providers.bajaj_allianz_travel import BajajAllianzTravelProvider
from app.providers.icici_travel import IciciTravelProvider
from app.providers.tata_agi_travel import TataAgiTravelProvider

# Home
from app.providers.bajaj_allianz_home import BajajAllianzHomeProvider
from app.providers.hdfc_ergo_home import HdfcErgoHomeProvider
from app.providers.icici_home import IciciHomeProvider


def get_motor_2w_providers() -> list[QuoteProvider]:
    return [
        IciciMotor2WProvider(),
        TataAgiMotor2WProvider(),
    ]


def get_motor_4w_providers() -> list[QuoteProvider]:
    return [
        IciciMotor4WProvider(),
        TataAgiMotor4WProvider(),
        HdfcErgoMotor4WProvider(),
    ]


def get_health_providers() -> list[QuoteProvider]:
    return [
        StarHealthProvider(),
        HdfcErgoHealthProvider(),
        CareHealthProvider(),
    ]


def get_travel_providers() -> list[QuoteProvider]:
    return [
        IciciTravelProvider(),
        TataAgiTravelProvider(),
        BajajAllianzTravelProvider(),
    ]


def get_home_providers() -> list[QuoteProvider]:
    return [
        IciciHomeProvider(),
        HdfcErgoHomeProvider(),
        BajajAllianzHomeProvider(),
    ]
