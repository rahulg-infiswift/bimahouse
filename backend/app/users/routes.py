# backend/app/users/routes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_record, require_roles
from app.core.db import get_db
from app.users.models import Role, User

router = APIRouter()

class UserOut(BaseModel):
    user_id: str
    primary_email: str | None
    email_verified: bool
    role: str
    created_at: str
    updated_at: str


class UserRoleUpdateIn(BaseModel):
    role: str


@router.get("/v1/users/me", response_model=UserOut, tags=["Users"])
def get_current_user_profile(
    user: User = Depends(get_current_user_record),
):
    return UserOut(
        user_id=user.id,
        primary_email=user.primary_email,
        email_verified=bool(user.email_verified),
        role=user.role,
        created_at=user.created_at.isoformat(),
        updated_at=user.updated_at.isoformat(),
    )


@router.get("/v1/admin/users", response_model=list[UserOut], tags=["Admin"])
def list_users(
    role: str | None = None,
    limit: int = 100,
    offset: int = 0,
    _: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    users = q.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return [
        UserOut(
            user_id=u.id,
            primary_email=u.primary_email,
            email_verified=bool(u.email_verified),
            role=u.role,
            created_at=u.created_at.isoformat(),
            updated_at=u.updated_at.isoformat(),
        )
        for u in users
    ]


@router.patch("/v1/admin/users/{user_id}/role", tags=["Admin"])
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
