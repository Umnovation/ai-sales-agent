from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class CompletionResult(BaseModel):
    """Result of evaluating whether a step's completion criteria is met."""

    model_config = ConfigDict(extra="forbid")

    is_step_finished: bool
    finish_type: str | None
    reason: str
    extracted_data: str | None


class TransitionResult(BaseModel):
    """Result of evaluating which script to transition to."""

    model_config = ConfigDict(extra="forbid")

    selected_script_id: int | None
    reason: str
    confidence: float  # 0.0 - 1.0


SCRIPT_SWITCH_MIN_CONFIDENCE: float = 0.7
