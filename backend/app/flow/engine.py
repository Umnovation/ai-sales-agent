"""FSM Engine — core conversation processing logic.

Handles the full cycle: acceptance criteria → resolve step → execute → evaluate → route.
"""

from __future__ import annotations

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.prompts.loader import load_prompt
from app.ai.provider import AIProvider
from app.ai.schemas import SCRIPT_SWITCH_MIN_CONFIDENCE, CompletionResult, TransitionResult
from app.chat.models import Chat, ChatFlowStepAttempt, Message
from app.flow.models import Flow, FlowScript, FlowScriptStep
from app.settings.models import CompanySettings, Context

logger: structlog.stdlib.BoundLogger = structlog.get_logger()


async def check_acceptance_criteria(
    ai_provider: AIProvider,
    flow: Flow,
    chat: Chat,
    message_history: list[dict[str, str]],
) -> TransitionResult | None:
    """Check if conversation should transition to a different script.

    Evaluates acceptance criteria of ALL non-starting scripts in the flow.
    Returns TransitionResult if a transition should happen, None otherwise.
    """
    candidates: list[FlowScript] = [
        s
        for s in flow.scripts
        if not s.is_starting_script and s.transition_criteria and s.id != chat.flow_script_id
    ]

    if not candidates:
        return None

    scripts_text: str = "\n".join(
        f"- Script ID {s.id} ({s.name}): {s.transition_criteria}" for s in candidates
    )

    prompt: str = load_prompt(
        "check_transition",
        {
            "scripts_with_criteria": scripts_text,
        },
    )

    # Use only last 12 messages for context (matching Dialogex behavior)
    recent_messages: list[dict[str, str]] = message_history[-12:]

    result: TransitionResult = await ai_provider.generate_structured(
        messages=recent_messages,
        system_prompt=prompt,
        response_schema=TransitionResult,
    )

    if result.selected_script_id is not None and result.confidence >= SCRIPT_SWITCH_MIN_CONFIDENCE:
        logger.info(
            "script_transition",
            from_script_id=chat.flow_script_id,
            to_script_id=result.selected_script_id,
            reason=result.reason,
            confidence=result.confidence,
        )
        return result

    return None


async def resolve_active_step(
    db: AsyncSession,
    chat: Chat,
) -> FlowScriptStep | None:
    """Find the first unfinished step in the current script."""
    if chat.flow_script_id is None:
        return None

    result = await db.execute(
        select(FlowScriptStep)
        .where(FlowScriptStep.flow_script_id == chat.flow_script_id)
        .order_by(FlowScriptStep.order)
    )
    steps: list[FlowScriptStep] = list(result.scalars().all())

    for step in steps:
        attempt: ChatFlowStepAttempt | None = await _get_or_create_attempt(db, chat.id, step.id)
        if not attempt.is_finished:
            return step

    return None  # All steps finished


async def execute_step(
    ai_provider: AIProvider,
    step: FlowScriptStep,
    message_history: list[dict[str, str]],
    company_settings: CompanySettings,
    contexts: list[Context],
    rag_context: str = "",
) -> str:
    """Generate AI response for the current step."""
    rules: str = (
        "\n".join(f"- {c.text}" for c in contexts if c.type == "rule" and c.is_active)
        or "No specific rules."
    )

    restrictions: str = (
        "\n".join(f"- {c.text}" for c in contexts if c.type == "restriction" and c.is_active)
        or "No specific restrictions."
    )

    prompt: str = load_prompt(
        "generate_response",
        {
            "company_name": company_settings.company_name,
            "company_description": company_settings.company_description or "",
            "script_name": step.script.name if step.script else "",
            "script_description": step.script.description or "" if step.script else "",
            "step_title": step.title,
            "step_task": step.task,
            "completion_criteria": step.completion_criteria or "No specific criteria.",
            "rules": rules,
            "restrictions": restrictions,
            "rag_context": rag_context or "No additional knowledge base context.",
        },
    )

    response: str = await ai_provider.generate(
        messages=message_history,
        system_prompt=prompt,
    )

    return response


async def evaluate_completion(
    ai_provider: AIProvider,
    step: FlowScriptStep,
    message_history: list[dict[str, str]],
) -> CompletionResult:
    """Evaluate whether the current step's completion criteria is met."""
    prompt: str = load_prompt(
        "check_completion",
        {
            "step_title": step.title,
            "step_task": step.task,
            "completion_criteria": step.completion_criteria or "No specific criteria defined.",
        },
    )

    result: CompletionResult = await ai_provider.generate_structured(
        messages=message_history,
        system_prompt=prompt,
        response_schema=CompletionResult,
    )

    return result


async def route_next_step(
    db: AsyncSession,
    chat: Chat,
    step: FlowScriptStep,
    finish_type: str,
) -> FlowScriptStep | None:
    """Determine next step based on success/fail routing."""
    target_step_id: int | None = (
        step.success_step_id if finish_type == "success" else step.fail_step_id
    )

    if target_step_id is not None:
        result = await db.execute(
            select(FlowScriptStep)
            .options(selectinload(FlowScriptStep.script))
            .where(FlowScriptStep.id == target_step_id)
        )
        target: FlowScriptStep | None = result.scalar_one_or_none()
        if target is not None:
            # If target is in a different script, update chat's current script
            if target.flow_script_id != chat.flow_script_id:
                chat.flow_script_id = target.flow_script_id
                logger.info(
                    "step_routed_cross_script",
                    chat_id=chat.id,
                    from_step_id=step.id,
                    to_step_id=target.id,
                    to_script_id=target.flow_script_id,
                )
            return target

    # Default: next step by order in same script
    result = await db.execute(
        select(FlowScriptStep)
        .where(
            FlowScriptStep.flow_script_id == step.flow_script_id,
            FlowScriptStep.order > step.order,
        )
        .order_by(FlowScriptStep.order)
        .limit(1)
    )
    return result.scalar_one_or_none()


async def process_message(
    db: AsyncSession,
    ai_provider: AIProvider,
    chat_id: int,
    user_content: str,
    rag_context: str = "",
) -> str | None:
    """Full message processing cycle with transactional integrity.

    Returns the bot's response text, or None if bot is disabled.
    """
    # Lock chat row to prevent race conditions
    result = await db.execute(select(Chat).where(Chat.id == chat_id).with_for_update())
    chat: Chat | None = result.scalar_one_or_none()

    if chat is None:
        logger.error("chat_not_found", chat_id=chat_id)
        return None

    if not chat.is_controlled_by_bot:
        logger.info("bot_disabled_skipping", chat_id=chat_id)
        return None

    log = logger.bind(chat_id=chat_id)

    # Load flow with scripts
    flow_result = await db.execute(
        select(Flow).options(selectinload(Flow.scripts).selectinload(FlowScript.steps)).limit(1)
    )
    flow: Flow | None = flow_result.scalar_one_or_none()

    if flow is None or not flow.is_active:
        log.info("no_active_flow")
        return None

    # Set starting script if not set
    if chat.flow_script_id is None:
        starting: FlowScript | None = next((s for s in flow.scripts if s.is_starting_script), None)
        if starting is None and flow.scripts:
            starting = flow.scripts[0]
        if starting is not None:
            chat.flow_script_id = starting.id

    # Build message history
    msg_result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id, Message.message_type == "text")
        .order_by(Message.created_at)
    )
    db_messages: list[Message] = list(msg_result.scalars().all())

    message_history: list[dict[str, str]] = [
        {
            "role": "assistant" if m.sender_type == "bot" else "user",
            "content": m.content,
        }
        for m in db_messages
    ]
    # Add the new user message
    message_history.append({"role": "user", "content": user_content})

    # 1. Check acceptance criteria
    transition: TransitionResult | None = await check_acceptance_criteria(
        ai_provider, flow, chat, message_history
    )
    if transition is not None and transition.selected_script_id is not None:
        chat.flow_script_id = transition.selected_script_id

        # Add system message about transition
        system_msg = Message(
            chat_id=chat_id,
            sender_type="system",
            content=f"Transitioned to script: {transition.reason}",
            message_type="system_event",
        )
        db.add(system_msg)

    # 2. Resolve active step
    step: FlowScriptStep | None = await resolve_active_step(db, chat)

    if step is None:
        log.info("all_steps_completed")
        return None

    log = log.bind(step_id=step.id, step_title=step.title)

    # Get or create attempt
    attempt: ChatFlowStepAttempt = await _get_or_create_attempt(db, chat_id, step.id)
    attempt.attempts += 1

    # 3. Load settings & contexts
    settings_result = await db.execute(select(CompanySettings).limit(1))
    company_settings: CompanySettings | None = settings_result.scalar_one_or_none()
    if company_settings is None:
        company_settings = CompanySettings()

    contexts_result = await db.execute(select(Context).where(Context.is_active.is_(True)))
    contexts: list[Context] = list(contexts_result.scalars().all())

    # Load step with script relationship
    step_result = await db.execute(
        select(FlowScriptStep)
        .options(selectinload(FlowScriptStep.script))
        .where(FlowScriptStep.id == step.id)
    )
    step = step_result.scalar_one()

    # 4. Execute step (generate response)
    log.info("step_executing", attempt=attempt.attempts)
    response: str = await execute_step(
        ai_provider, step, message_history, company_settings, contexts, rag_context
    )

    # Add bot message to history for completion check
    message_history.append({"role": "assistant", "content": response})

    # 5. Evaluate completion
    completion: CompletionResult = await evaluate_completion(ai_provider, step, message_history)

    log.info(
        "step_evaluated",
        is_finished=completion.is_step_finished,
        finish_type=completion.finish_type,
        reason=completion.reason,
    )

    # 6. Update state
    should_advance: bool = False
    finish_type: str = "fail"

    if completion.is_step_finished:
        should_advance = True
        finish_type = completion.finish_type or "success"
    elif step.max_attempts != -1 and attempt.attempts >= step.max_attempts:
        should_advance = True
        finish_type = "fail"
        log.info("max_attempts_exceeded", max_attempts=step.max_attempts)

    if should_advance:
        attempt.is_finished = True
        attempt.finish_type = finish_type
        attempt.ai_result = completion.model_dump()

        next_step: FlowScriptStep | None = await route_next_step(db, chat, step, finish_type)
        if next_step is not None:
            log.info(
                "step_routed",
                from_step_id=step.id,
                to_step_id=next_step.id,
                finish_type=finish_type,
            )

    await db.flush()

    return response


async def _get_or_create_attempt(
    db: AsyncSession, chat_id: int, step_id: int
) -> ChatFlowStepAttempt:
    """Get existing attempt or create new one."""
    result = await db.execute(
        select(ChatFlowStepAttempt).where(
            ChatFlowStepAttempt.chat_id == chat_id,
            ChatFlowStepAttempt.flow_script_step_id == step_id,
        )
    )
    attempt: ChatFlowStepAttempt | None = result.scalar_one_or_none()

    if attempt is None:
        attempt = ChatFlowStepAttempt(
            chat_id=chat_id,
            flow_script_step_id=step_id,
        )
        db.add(attempt)
        await db.flush()

    return attempt
