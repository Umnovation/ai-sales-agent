from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.common.schemas import ApiResponse
from app.dependencies import get_current_user, get_db
from app.flow import service as flow_service
from app.flow.schemas import (
    FlowResponse,
    FlowUpdate,
    ScriptCreate,
    ScriptPositionUpdate,
    ScriptResponse,
    ScriptUpdate,
    StepCreate,
    StepReorderRequest,
    StepResponse,
    StepUpdate,
)

router = APIRouter(prefix="/api/flow", tags=["flow"])


# ── Flow ──────────────────────────────────────────────────────────


@router.get("")
async def get_flow(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[FlowResponse]:
    flow = await flow_service.get_flow(db)
    return ApiResponse.ok(data=FlowResponse.model_validate(flow))


@router.put("")
async def update_flow(
    payload: FlowUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[FlowResponse]:
    flow = await flow_service.update_flow(db, payload)
    return ApiResponse.ok(
        data=FlowResponse.model_validate(flow),
        message="Flow updated successfully",
    )


# ── Scripts ───────────────────────────────────────────────────────


@router.post("/scripts", status_code=201)
async def create_script(
    payload: ScriptCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[ScriptResponse]:
    script = await flow_service.create_script(db, payload)
    return ApiResponse.ok(
        data=ScriptResponse.model_validate(script),
        message="Script created successfully",
    )


@router.put("/scripts/{script_id}")
async def update_script(
    script_id: int,
    payload: ScriptUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[ScriptResponse]:
    script = await flow_service.update_script(db, script_id, payload)
    return ApiResponse.ok(
        data=ScriptResponse.model_validate(script),
        message="Script updated successfully",
    )


@router.patch("/scripts/{script_id}/position")
async def update_script_position(
    script_id: int,
    payload: ScriptPositionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[ScriptResponse]:
    script = await flow_service.update_script_position(db, script_id, payload)
    return ApiResponse.ok(data=ScriptResponse.model_validate(script))


@router.delete("/scripts/{script_id}")
async def delete_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[None]:
    await flow_service.delete_script(db, script_id)
    return ApiResponse.ok(data=None, message="Script deleted successfully")


# ── Steps ─────────────────────────────────────────────────────────


@router.post("/scripts/{script_id}/steps", status_code=201)
async def create_step(
    script_id: int,
    payload: StepCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[StepResponse]:
    step = await flow_service.create_step(db, script_id, payload)
    return ApiResponse.ok(
        data=StepResponse.model_validate(step),
        message="Step created successfully",
    )


@router.put("/scripts/{script_id}/steps/{step_id}")
async def update_step(
    script_id: int,
    step_id: int,
    payload: StepUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[StepResponse]:
    step = await flow_service.update_step(db, step_id, payload)
    return ApiResponse.ok(
        data=StepResponse.model_validate(step),
        message="Step updated successfully",
    )


@router.delete("/scripts/{script_id}/steps/{step_id}")
async def delete_step(
    script_id: int,
    step_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[None]:
    await flow_service.delete_step(db, step_id)
    return ApiResponse.ok(data=None, message="Step deleted successfully")


@router.patch("/scripts/{script_id}/steps/reorder")
async def reorder_steps(
    script_id: int,
    payload: StepReorderRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[list[StepResponse]]:
    steps = await flow_service.reorder_steps(db, script_id, payload)
    return ApiResponse.ok(
        data=[StepResponse.model_validate(s) for s in steps],
        message="Steps reordered successfully",
    )
