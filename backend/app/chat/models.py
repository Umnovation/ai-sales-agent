from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="web_chat")
    external_chat_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    flow_script_id: Mapped[int | None] = mapped_column(
        ForeignKey("flow_scripts.id", ondelete="SET NULL"), nullable=True
    )
    is_controlled_by_bot: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    termination_reason: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_test: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    metadata_: Mapped[dict[str, object] | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        index=True,
    )

    messages: Mapped[list[Message]] = relationship(
        "Message",
        back_populates="chat",
        cascade="all, delete-orphan",
        order_by="Message.created_at, Message.id",
    )
    step_attempts: Mapped[list[ChatFlowStepAttempt]] = relationship(
        "ChatFlowStepAttempt",
        back_populates="chat",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("idx_chats_updated_at", "updated_at"),)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    sender_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "bot" | "visitor" | "user" | "system"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="text"
    )  # "text" | "system_event"
    metadata_: Mapped[dict[str, object] | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    chat: Mapped[Chat] = relationship("Chat", back_populates="messages")

    __table_args__ = (Index("idx_messages_chat_id_created_at", "chat_id", "created_at"),)


class ChatFlowStepAttempt(Base):
    __tablename__ = "chat_flow_step_attempts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    flow_script_step_id: Mapped[int] = mapped_column(
        ForeignKey("flow_script_steps.id", ondelete="CASCADE"), nullable=False
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_finished: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    finish_type: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # "success" | "fail" | "skipped"
    ai_result: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    chat: Mapped[Chat] = relationship("Chat", back_populates="step_attempts")

    __table_args__ = (
        UniqueConstraint("chat_id", "flow_script_step_id", name="uq_chat_step"),
        Index("idx_step_attempts_chat_step", "chat_id", "flow_script_step_id"),
    )
