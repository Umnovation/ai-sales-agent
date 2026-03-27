from __future__ import annotations

from pydantic import BaseModel


class CompletionResult(BaseModel):
    """Result of evaluating whether a step's completion criteria is met."""

    is_step_finished: bool
    finish_type: str | None = None  # "success" | "fail" | None
    reason: str
    extracted_data: str | None = None


class TransitionResult(BaseModel):
    """Result of evaluating which script to transition to."""

    selected_script_id: int | None = None
    reason: str
    confidence: float  # 0.0 - 1.0


SCRIPT_SWITCH_MIN_CONFIDENCE: float = 0.7
