"""Critical FSM engine tests.

These 7 scenarios cover the non-obvious edge cases in the flow engine.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.schemas import CompletionResult, TransitionResult
from app.chat.models import Chat, ChatFlowStepAttempt, Message
from app.flow.engine import (
    ProcessResult,
    check_acceptance_criteria,
    process_message,
    resolve_active_step,
    route_next_step,
)
from app.flow.models import Flow, FlowScript, FlowScriptStep
from tests.conftest import MockAIProvider


async def _create_flow_with_scripts(db: AsyncSession) -> tuple[Flow, FlowScript, FlowScript]:
    """Helper: create flow with 2 scripts and steps."""
    flow = Flow(name="Test Flow", is_active=True)
    db.add(flow)
    await db.flush()

    main_script = FlowScript(
        flow_id=flow.id,
        name="Main",
        is_starting_script=True,
        priority=0,
    )
    db.add(main_script)
    await db.flush()

    objection_script = FlowScript(
        flow_id=flow.id,
        name="Objection Handling",
        transition_criteria="Client expresses frustration or negativity",
        is_starting_script=False,
        priority=1,
    )
    db.add(objection_script)
    await db.flush()

    # Main script steps
    step1 = FlowScriptStep(
        flow_script_id=main_script.id,
        title="Welcome",
        task="Greet the client",
        completion_criteria="Client responded to greeting",
        max_attempts=2,
        order=1,
    )
    step2 = FlowScriptStep(
        flow_script_id=main_script.id,
        title="Qualify",
        task="Ask about budget",
        completion_criteria="Client named budget",
        max_attempts=3,
        order=2,
    )
    db.add_all([step1, step2])
    await db.flush()

    # Objection script steps
    obj_step = FlowScriptStep(
        flow_script_id=objection_script.id,
        title="Empathize",
        task="Show understanding",
        completion_criteria="Client calmed down",
        max_attempts=2,
        order=1,
    )
    db.add(obj_step)
    await db.flush()

    # Set cross-script routing: step1 fail -> objection step
    step1.fail_step_id = obj_step.id
    # Set step1 success -> step2
    step1.success_step_id = step2.id
    await db.flush()

    await db.refresh(flow, ["scripts"])
    await db.refresh(main_script, ["steps"])
    await db.refresh(objection_script, ["steps"])

    return flow, main_script, objection_script


async def _create_chat(db: AsyncSession, script_id: int) -> Chat:
    """Helper: create a chat with assigned script."""
    chat = Chat(source="test", flow_script_id=script_id, is_test=True)
    db.add(chat)
    await db.flush()
    return chat


# ── Test 1: Step completion → success routing ──────────────────────


@pytest.mark.asyncio
async def test_step_completion_success_routing(db: AsyncSession, mock_ai: MockAIProvider) -> None:
    """When step finishes with success, route to success_step_id."""
    _, main_script, _ = await _create_flow_with_scripts(db)
    chat = await _create_chat(db, main_script.id)

    steps = sorted(main_script.steps, key=lambda s: s.order)
    step1 = steps[0]
    step2 = steps[1]

    next_step = await route_next_step(db, chat, step1, "success")

    assert next_step is not None
    assert next_step.id == step2.id


# ── Test 2: Step completion → fail routing ─────────────────────────


@pytest.mark.asyncio
async def test_step_completion_fail_routing(db: AsyncSession, mock_ai: MockAIProvider) -> None:
    """When step finishes with fail, route to fail_step_id (cross-script)."""
    _, main_script, objection_script = await _create_flow_with_scripts(db)
    chat = await _create_chat(db, main_script.id)

    steps = sorted(main_script.steps, key=lambda s: s.order)
    step1 = steps[0]
    obj_step = sorted(objection_script.steps, key=lambda s: s.order)[0]

    next_step = await route_next_step(db, chat, step1, "fail")

    assert next_step is not None
    assert next_step.id == obj_step.id
    # Chat should be updated to new script
    assert chat.flow_script_id == objection_script.id


# ── Test 3: Max attempts exceeded ──────────────────────────────────


@pytest.mark.asyncio
async def test_max_attempts_exceeded(db: AsyncSession, mock_ai: MockAIProvider) -> None:
    """When attempts >= max_attempts, trigger fail routing even without AI completion."""
    _flow, main_script, _ = await _create_flow_with_scripts(db)
    chat = await _create_chat(db, main_script.id)

    # Configure mock: step never completes
    mock_ai.completion_result = CompletionResult(
        is_step_finished=False,
        finish_type=None,
        reason="Not completed",
        extracted_data=None,
    )

    # Process 2 messages (max_attempts=2 for step1)
    msg1 = Message(chat_id=chat.id, sender_type="visitor", content="Hi")
    msg2 = Message(chat_id=chat.id, sender_type="visitor", content="Hello again")
    db.add_all([msg1, msg2])
    await db.flush()

    # First attempt
    await process_message(db, mock_ai, chat.id, "Hi")  # type: ignore[arg-type]
    # Second attempt — should trigger max attempts
    await process_message(db, mock_ai, chat.id, "Hello again")  # type: ignore[arg-type]

    # Check that attempt was marked as finished with fail
    from sqlalchemy import select

    steps = sorted(main_script.steps, key=lambda s: s.order)
    result = await db.execute(
        select(ChatFlowStepAttempt).where(
            ChatFlowStepAttempt.chat_id == chat.id,
            ChatFlowStepAttempt.flow_script_step_id == steps[0].id,
        )
    )
    attempt = result.scalar_one_or_none()
    assert attempt is not None
    assert attempt.attempts >= 2
    assert attempt.is_finished is True
    assert attempt.finish_type == "fail"


# ── Test 4: Acceptance criteria triggers script switch ─────────────


@pytest.mark.asyncio
async def test_acceptance_criteria_triggers_transition(
    db: AsyncSession, mock_ai: MockAIProvider
) -> None:
    """When AI detects acceptance criteria match with confidence >= 0.7, switch script."""
    flow, main_script, objection_script = await _create_flow_with_scripts(db)

    # Configure mock: high confidence transition
    mock_ai.transition_result = TransitionResult(
        selected_script_id=objection_script.id,
        reason="Client is frustrated",
        confidence=0.85,
    )

    result = await check_acceptance_criteria(
        mock_ai,
        flow,
        await _create_chat(db, main_script.id),  # type: ignore[arg-type]
        [{"role": "user", "content": "This is terrible!"}],
    )

    assert result is not None
    assert result.selected_script_id == objection_script.id
    assert result.confidence >= 0.7


# ── Test 5: Acceptance criteria below threshold ────────────────────


@pytest.mark.asyncio
async def test_acceptance_criteria_below_threshold(
    db: AsyncSession, mock_ai: MockAIProvider
) -> None:
    """When confidence < 0.7, do NOT transition."""
    flow, main_script, objection_script = await _create_flow_with_scripts(db)

    # Configure mock: low confidence
    mock_ai.transition_result = TransitionResult(
        selected_script_id=objection_script.id,
        reason="Maybe frustrated",
        confidence=0.5,
    )

    result = await check_acceptance_criteria(
        mock_ai,
        flow,
        await _create_chat(db, main_script.id),  # type: ignore[arg-type]
        [{"role": "user", "content": "Hmm not sure"}],
    )

    assert result is None  # No transition


# ── Test 6: Operator takeover prevents AI response ─────────────────


@pytest.mark.asyncio
async def test_operator_takeover_prevents_ai_response(
    db: AsyncSession, mock_ai: MockAIProvider
) -> None:
    """When operator disables bot, engine should return None and NOT call LLM."""
    _flow, main_script, _ = await _create_flow_with_scripts(db)
    chat = await _create_chat(db, main_script.id)

    # Disable bot
    chat.is_controlled_by_bot = False
    await db.flush()

    result: ProcessResult = await process_message(db, mock_ai, chat.id, "I want to buy")  # type: ignore[arg-type]

    assert result.response is None
    assert mock_ai.generate_call_count == 0  # LLM never called


# ── Test 7: Resolve active step skips finished steps ───────────────


@pytest.mark.asyncio
async def test_resolve_active_step_skips_finished(
    db: AsyncSession, mock_ai: MockAIProvider
) -> None:
    """Resolve should return first UNFINISHED step, skipping completed ones."""
    _flow, main_script, _ = await _create_flow_with_scripts(db)
    chat = await _create_chat(db, main_script.id)

    steps = sorted(main_script.steps, key=lambda s: s.order)
    step1 = steps[0]
    step2 = steps[1]

    # Mark step1 as finished
    attempt = ChatFlowStepAttempt(
        chat_id=chat.id,
        flow_script_step_id=step1.id,
        attempts=1,
        is_finished=True,
        finish_type="success",
    )
    db.add(attempt)
    await db.flush()

    active = await resolve_active_step(db, chat)

    assert active is not None
    assert active.id == step2.id
