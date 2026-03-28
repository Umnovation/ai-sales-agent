"""Tests for context (rules & restrictions) management."""

from __future__ import annotations

from fastapi import HTTPException
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.flow.engine import fill_step_prompt
from app.flow.models import FlowScriptStep
from app.settings.models import CompanySettings, Context
from app.settings.schemas import ContextCreate
from app.settings.service import create_context, delete_context, list_contexts


async def test_create_rule_and_restriction(db: AsyncSession) -> None:
    """Creating a rule and a restriction stores both in DB."""
    rule = ContextCreate(type="rule", text="You are a helpful assistant")
    restriction = ContextCreate(type="restriction", text="You are not allowed to talk about politics")

    await create_context(db, rule)
    await create_context(db, restriction)

    contexts = await list_contexts(db)
    assert len(contexts) == 2
    assert contexts[0].text == "You are a helpful assistant"
    assert contexts[1].text == "You are not allowed to talk about politics"


async def test_delete_context(db: AsyncSession) -> None:
    """Deleting a context removes it from DB completely."""
    rule = ContextCreate(type="rule", text="Temporary rule")
    created = await create_context(db, rule)

    await delete_context(db, created.id)

    contexts = await list_contexts(db)
    assert len(contexts) == 0


async def test_delete_nonexistent_context_raises_404(db: AsyncSession) -> None:
    """Deleting a context that doesn't exist raises 404."""
    with pytest.raises(HTTPException) as exc_info:
        await delete_context(db, 999999)
    assert exc_info.value.status_code == 404


async def test_step_prompt_contains_active_contexts(db: AsyncSession) -> None:
    """Active rules and restrictions appear in the generated step prompt."""
    await create_context(db, ContextCreate(type="rule", text="Always be polite"))
    await create_context(db, ContextCreate(type="restriction", text="Never discuss competitors"))

    contexts_result = await db.execute(select(Context).where(Context.is_active.is_(True)))
    contexts: list[Context] = list(contexts_result.scalars().all())

    company_settings = CompanySettings(
        company_name="Test Company",
        company_description="Test Company Description",
    )
    step = FlowScriptStep(
        title="Test Step",
        task="Test Task",
        completion_criteria="Test Completion Criteria",
    )

    prompt: str = fill_step_prompt(company_settings, step, contexts, "")
    assert "Always be polite" in prompt
    assert "Never discuss competitors" in prompt


async def test_inactive_context_excluded_from_prompt(db: AsyncSession) -> None:
    """Deactivated contexts must NOT appear in the step prompt."""
    created = await create_context(db, ContextCreate(type="rule", text="Secret rule"))

    # Deactivate directly
    result = await db.execute(select(Context).where(Context.id == created.id))
    context: Context = result.scalar_one()
    context.is_active = False
    await db.flush()

    contexts_result = await db.execute(select(Context).where(Context.is_active.is_(True)))
    contexts: list[Context] = list(contexts_result.scalars().all())

    company_settings = CompanySettings(
        company_name="Test Company",
        company_description="Test Description",
    )
    step = FlowScriptStep(title="Step", task="Task", completion_criteria="Criteria")

    prompt: str = fill_step_prompt(company_settings, step, contexts, "")
    assert "Secret rule" not in prompt


async def test_empty_contexts_produce_fallback_text(db: AsyncSession) -> None:
    """When no contexts exist, prompt contains 'No specific' fallback strings."""
    company_settings = CompanySettings(
        company_name="Test Company",
        company_description="Test Description",
    )
    step = FlowScriptStep(title="Step", task="Task", completion_criteria="Criteria")

    prompt: str = fill_step_prompt(company_settings, step, [], "")
    assert "No specific rules." in prompt
    assert "No specific restrictions." in prompt
