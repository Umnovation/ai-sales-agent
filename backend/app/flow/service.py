from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.flow.models import Flow, FlowScript, FlowScriptStep
from app.flow.schemas import (
    FlowUpdate,
    ScriptCreate,
    ScriptPositionUpdate,
    ScriptUpdate,
    StepCreate,
    StepReorderRequest,
    StepUpdate,
)


# ── Flow ──────────────────────────────────────────────────────────


async def get_flow(db: AsyncSession) -> Flow:
    result = await db.execute(
        select(Flow)
        .options(selectinload(Flow.scripts).selectinload(FlowScript.steps))
        .limit(1)
    )
    flow: Flow | None = result.scalar_one_or_none()
    if flow is None:
        flow = Flow(name="Main Flow", description="Default sales flow")
        db.add(flow)
        await db.commit()
        await db.refresh(flow, ["scripts"])
    return flow


async def update_flow(db: AsyncSession, payload: FlowUpdate) -> Flow:
    flow: Flow = await get_flow(db)
    update_data: dict[str, object] = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(flow, field, value)
    await db.commit()
    await db.refresh(flow, ["scripts"])
    return flow


# ── Script ────────────────────────────────────────────────────────


async def get_script_by_id(db: AsyncSession, script_id: int) -> FlowScript:
    result = await db.execute(
        select(FlowScript)
        .options(selectinload(FlowScript.steps))
        .where(FlowScript.id == script_id)
    )
    script: FlowScript | None = result.scalar_one_or_none()
    if script is None:
        raise HTTPException(status_code=404, detail="Script not found")
    return script


async def create_script(db: AsyncSession, payload: ScriptCreate) -> FlowScript:
    flow: Flow = await get_flow(db)
    script = FlowScript(flow_id=flow.id, **payload.model_dump())
    db.add(script)
    await db.commit()
    await db.refresh(script, ["steps"])
    return script


async def update_script(
    db: AsyncSession, script_id: int, payload: ScriptUpdate
) -> FlowScript:
    script: FlowScript = await get_script_by_id(db, script_id)
    update_data: dict[str, object] = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(script, field, value)
    await db.commit()
    await db.refresh(script, ["steps"])
    return script


async def update_script_position(
    db: AsyncSession, script_id: int, payload: ScriptPositionUpdate
) -> FlowScript:
    script: FlowScript = await get_script_by_id(db, script_id)
    script.position_x = payload.position_x
    script.position_y = payload.position_y
    await db.commit()
    await db.refresh(script, ["steps"])
    return script


async def delete_script(db: AsyncSession, script_id: int) -> None:
    script: FlowScript = await get_script_by_id(db, script_id)
    await db.delete(script)
    await db.commit()


# ── Step ──────────────────────────────────────────────────────────


async def get_step_by_id(db: AsyncSession, step_id: int) -> FlowScriptStep:
    result = await db.execute(
        select(FlowScriptStep).where(FlowScriptStep.id == step_id)
    )
    step: FlowScriptStep | None = result.scalar_one_or_none()
    if step is None:
        raise HTTPException(status_code=404, detail="Step not found")
    return step


async def create_step(
    db: AsyncSession, script_id: int, payload: StepCreate
) -> FlowScriptStep:
    # Verify script exists
    await get_script_by_id(db, script_id)
    step = FlowScriptStep(flow_script_id=script_id, **payload.model_dump())
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return step


async def update_step(
    db: AsyncSession, step_id: int, payload: StepUpdate
) -> FlowScriptStep:
    step: FlowScriptStep = await get_step_by_id(db, step_id)
    update_data: dict[str, object] = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(step, field, value)
    await db.commit()
    await db.refresh(step)
    return step


async def delete_step(db: AsyncSession, step_id: int) -> None:
    step: FlowScriptStep = await get_step_by_id(db, step_id)
    await db.delete(step)
    await db.commit()


async def reorder_steps(
    db: AsyncSession, script_id: int, payload: StepReorderRequest
) -> list[FlowScriptStep]:
    # Verify script exists
    await get_script_by_id(db, script_id)

    for item in payload.steps:
        step: FlowScriptStep = await get_step_by_id(db, item.id)
        if step.flow_script_id != script_id:
            raise HTTPException(
                status_code=400,
                detail=f"Step {item.id} does not belong to script {script_id}",
            )
        step.order = item.order

    await db.commit()

    script: FlowScript = await get_script_by_id(db, script_id)
    return list(script.steps)
