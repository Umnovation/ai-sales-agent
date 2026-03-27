# Transactional Integrity

## Isolation Level

PostgreSQL default `READ COMMITTED`. No need for `SERIALIZABLE`.

## Critical Sections

### 1. Message Processing (Celery task)

Single transaction for the entire cycle. `SELECT ... FOR UPDATE` on Chat row:

```python
async with db.begin():
    chat = await session.execute(
        select(Chat).where(Chat.id == chat_id).with_for_update()
    )
    if not chat.is_controlled_by_bot:
        return  # operator took over, skip

    message = await save_message(chat_id, content)
    step_result = await engine.process(chat, message)
    await update_state(chat, step_result)
    bot_message = await save_message(chat_id, step_result.response, sender="bot")
# full commit or full rollback
```

### 2. Operator Takeover

`FOR UPDATE` on Chat prevents race with Celery worker:

```python
async with db.begin():
    chat = await session.execute(
        select(Chat).where(Chat.id == chat_id).with_for_update()
    )
    chat.is_controlled_by_bot = False
    chat.termination_reason = "operator_takeover"
    await add_system_message(chat, "Operator took control")
```

### 3. Concurrent Messages

Same `FOR UPDATE` on Chat + idempotency check by message_id prevents double processing.

### 4. Flow Editor Batch Save

Standard transaction for batch step creation/update. Rollback if any step fails.

## Where Strict Isolation Is NOT Needed

- Dashboard analytics (read-only, eventual consistency OK)
- RAG document processing (idempotent, can restart)
- Settings updates (single user, no contention)
