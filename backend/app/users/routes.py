# backend/app/users/routes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.db import get_db
from app.users.models import Role, User

router = APIRouter(tags=["Admin"])


class UserRoleUpdateIn(BaseModel):
    role: str


@router.patch("/v1/admin/users/{user_id}/role")
def update_user_role(
    user_id: str,
    payload: UserRoleUpdateIn,
    _: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    allowed_roles = {
        Role.CUSTOMER,
        Role.PARTNER,
        Role.SALES,
        Role.ARM_RM,
        Role.MANAGER,
        Role.AREA_MANAGER,
        Role.ZONAL_HEAD,
        Role.ADMIN,
    }
    if payload.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Allowed: {sorted(allowed_roles)}")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = payload.role
    db.commit()
    return {"user_id": user.id, "role": user.role}
