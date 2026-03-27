from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

# ── Step ──────────────────────────────────────────────────────────


class StepResponse(BaseModel):
    id: int
    flow_script_id: int
    order: int
    title: str
    task: str
    completion_criteria: str | None
    max_attempts: int
    success_step_id: int | None
    fail_step_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StepCreate(BaseModel):
    title: str
    task: str
    order: int = 1
    completion_criteria: str | None = None
    max_attempts: int = 2
    success_step_id: int | None = None
    fail_step_id: int | None = None


class StepUpdate(BaseModel):
    title: str | None = None
    task: str | None = None
    order: int | None = None
    completion_criteria: str | None = None
    max_attempts: int | None = None
    success_step_id: int | None = None
    fail_step_id: int | None = None


class StepReorderItem(BaseModel):
    id: int
    order: int


class StepReorderRequest(BaseModel):
    steps: list[StepReorderItem]


# ── Script ────────────────────────────────────────────────────────


class ScriptResponse(BaseModel):
    id: int
    flow_id: int
    name: str
    description: str | None
    transition_criteria: str | None
    is_starting_script: bool
    priority: int
    position_x: float | None
    position_y: float | None
    steps: list[StepResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScriptCreate(BaseModel):
    name: str
    description: str | None = None
    transition_criteria: str | None = None
    is_starting_script: bool = False
    priority: int = 0
    position_x: float | None = None
    position_y: float | None = None


class ScriptUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    transition_criteria: str | None = None
    is_starting_script: bool | None = None
    priority: int | None = None


class ScriptPositionUpdate(BaseModel):
    position_x: float
    position_y: float


# ── Flow ──────────────────────────────────────────────────────────


class FlowResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    scripts: list[ScriptResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FlowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
