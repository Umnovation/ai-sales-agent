from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import service as auth_service
from app.auth.schemas import InstallRequest, LoginRequest, TokenResponse, UserResponse
from app.auth.security import create_access_token
from app.common.schemas import ApiResponse
from app.dependencies import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/install", status_code=201)
async def install(
    payload: InstallRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TokenResponse]:
    user_count: int = await auth_service.get_user_count(db)
    if user_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Installation already completed. A user already exists.",
        )

    user = await auth_service.create_user(
        db, email=payload.email, password=payload.password, name=payload.name
    )
    token: str = create_access_token(user.id)

    return ApiResponse.ok(
        data=TokenResponse(
            token=token,
            user=UserResponse.model_validate(user),
        ),
        message="Installation successful. User created.",
    )


@router.post("/login")
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TokenResponse]:
    user = await auth_service.authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token: str = create_access_token(user.id)

    return ApiResponse.ok(
        data=TokenResponse(
            token=token,
            user=UserResponse.model_validate(user),
        ),
        message="Login successful",
    )
