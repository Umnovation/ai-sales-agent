from __future__ import annotations

from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM: str = "HS256"


def hash_password(password: str) -> str:
    result: str = pwd_context.hash(password)
    return result


def verify_password(plain_password: str, hashed_password: str) -> bool:
    result: bool = pwd_context.verify(plain_password, hashed_password)
    return result


def create_access_token(user_id: int) -> str:
    expire: datetime = datetime.now(UTC) + timedelta(days=settings.jwt_expiration_days)
    payload: dict[str, str | datetime] = {
        "sub": str(user_id),
        "exp": expire,
    }
    token: str = jwt.encode(payload, settings.app_secret_key, algorithm=ALGORITHM)
    return token


def decode_access_token(token: str) -> int | None:
    try:
        payload: dict[str, object] = jwt.decode(
            token, settings.app_secret_key, algorithms=[ALGORITHM]
        )
        user_id: object = payload.get("sub")
        if user_id is None:
            return None
        if not isinstance(user_id, (str, int)):
            return None
        return int(user_id)
    except JWTError:
        return None
