from __future__ import annotations

from app.providers.base import QuoteProvider
from app.providers.icici_motor import IciciMotor2WProvider
from app.providers.tata_agi_motor import TataAgiMotor2WProvider


def get_motor_2w_providers() -> list[QuoteProvider]:
    return [
        IciciMotor2WProvider(),
        TataAgiMotor2WProvider(),
    ]
