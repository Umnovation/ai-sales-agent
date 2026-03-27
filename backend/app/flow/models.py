from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Flow(Base):
    __tablename__ = "flows"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    scripts: Mapped[list[FlowScript]] = relationship(
        "FlowScript",
        back_populates="flow",
        cascade="all, delete-orphan",
        order_by="FlowScript.priority",
    )


class FlowScript(Base):
    __tablename__ = "flow_scripts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    flow_id: Mapped[int] = mapped_column(ForeignKey("flows.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    transition_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_starting_script: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    position_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    position_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    flow: Mapped[Flow] = relationship("Flow", back_populates="scripts")
    steps: Mapped[list[FlowScriptStep]] = relationship(
        "FlowScriptStep",
        back_populates="script",
        cascade="all, delete-orphan",
        order_by="FlowScriptStep.order",
        foreign_keys="FlowScriptStep.flow_script_id",
    )


class FlowScriptStep(Base):
    __tablename__ = "flow_script_steps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    flow_script_id: Mapped[int] = mapped_column(
        ForeignKey("flow_scripts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    task: Mapped[str] = mapped_column(Text, nullable=False)
    completion_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    success_step_id: Mapped[int | None] = mapped_column(
        ForeignKey("flow_script_steps.id", ondelete="SET NULL"), nullable=True
    )
    fail_step_id: Mapped[int | None] = mapped_column(
        ForeignKey("flow_script_steps.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    script: Mapped[FlowScript] = relationship(
        "FlowScript",
        back_populates="steps",
        foreign_keys=[flow_script_id],
    )
    success_step: Mapped[FlowScriptStep | None] = relationship(
        "FlowScriptStep",
        foreign_keys=[success_step_id],
        remote_side="FlowScriptStep.id",
    )
    fail_step: Mapped[FlowScriptStep | None] = relationship(
        "FlowScriptStep",
        foreign_keys=[fail_step_id],
        remote_side="FlowScriptStep.id",
    )
