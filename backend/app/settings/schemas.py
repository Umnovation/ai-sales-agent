from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CompanySettingsResponse(BaseModel):
    id: int
    company_name: str
    company_description: str | None
    ai_provider: str
    ai_model: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CompanySettingsUpdate(BaseModel):
    company_name: str | None = None
    company_description: str | None = None
    ai_provider: str | None = None
    ai_model: str | None = None


class ContextResponse(BaseModel):
    id: int
    type: Literal["rule", "restriction"]
    text: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContextCreate(BaseModel):
    type: Literal["rule", "restriction"]
    text: str
    is_active: bool = True


class ContextUpdate(BaseModel):
    type: Literal["rule", "restriction"] | None = None
    text: str | None = None
    is_active: bool | None = None
