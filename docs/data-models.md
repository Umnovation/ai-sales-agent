# Data Models

## Flow Domain

```
Flow (single per instance)
├── id: int (PK)
├── name: str
├── description: str | None
├── is_active: bool (default: True)
├── created_at: datetime
├── updated_at: datetime
│
└── scripts: list[FlowScript]
    ├── id: int (PK)
    ├── flow_id: int (FK -> Flow)
    ├── name: str
    ├── description: str | None
    ├── transition_criteria: str | None      # Natural language criteria for AI
    │                                        # (e.g., "Client expresses negativity")
    │                                        # Checked on EVERY message across ALL scripts
    ├── is_starting_script: bool             # Entry point for new conversations
    ├── priority: int (default: 0)
    ├── position_x: float | None             # Canvas position for editor
    ├── position_y: float | None
    ├── created_at: datetime
    ├── updated_at: datetime
    │
    └── steps: list[FlowScriptStep]
        ├── id: int (PK)
        ├── flow_script_id: int (FK -> FlowScript)
        ├── order: int                           # Sequential order within script
        ├── title: str                           # Display name
        ├── task: str                            # Instruction for AI
        │                                        # (e.g., "Greet the client, introduce
        │                                        #  yourself as a CRM specialist...")
        ├── completion_criteria: str | None      # What counts as step completion
        │                                        # (e.g., "Client named a specific budget")
        ├── max_attempts: int (default: 2)       # Max AI evaluations for this step
        │                                        # (-1 = unlimited)
        ├── success_step_id: int | None (FK -> FlowScriptStep, self-ref)
        │                                        # Where to go on success
        │                                        # None = next step by order
        │                                        # Can point to step in ANOTHER script
        ├── fail_step_id: int | None (FK -> FlowScriptStep, self-ref)
        │                                        # Where to go on failure/max attempts
        │                                        # None = next step by order
        ├── created_at: datetime
        └── updated_at: datetime
```

## Chat Domain

```
Chat
├── id: int (PK)
├── source: str                          # Channel identifier (e.g., "web_chat", "telegram")
├── external_chat_id: str | None         # External ID for channel integration
├── flow_script_id: int | None (FK)      # Current active script
├── is_controlled_by_bot: bool (True)    # False = operator takeover
├── termination_reason: str | None       # Why bot stopped (operator_takeover,
│                                        #  user_negative, goal_achieved, etc.)
├── metadata: dict | None                # Visitor info, channel-specific data
├── created_at: datetime
├── updated_at: datetime
│
├── messages: list[Message]
│   ├── id: int (PK)
│   ├── chat_id: int (FK -> Chat)
│   ├── sender_type: str                 # "bot" | "user" | "visitor" | "system"
│   ├── content: str
│   ├── message_type: str (default: "text")  # "text" | "system_event"
│   ├── metadata: dict | None
│   ├── created_at: datetime
│   └── updated_at: datetime
│
└── step_attempts: list[ChatFlowStepAttempt]
    ├── id: int (PK)
    ├── chat_id: int (FK -> Chat)
    ├── flow_script_step_id: int (FK -> FlowScriptStep)
    │                                    # Unique constraint: (chat_id, flow_script_step_id)
    ├── attempts: int (default: 0)       # Number of AI evaluations
    ├── is_finished: bool (False)
    ├── finish_type: str | None          # "success" | "fail" | "skipped"
    ├── ai_result: dict | None           # { is_step_finished, finish_type,
    │                                    #   reason, extracted_data }
    ├── created_at: datetime
    └── updated_at: datetime
```

## Settings Domain

```
CompanySettings (single row)
├── id: int (PK)
├── company_name: str
├── company_description: str | None
├── ai_provider: str (default: "openai")
├── ai_model: str (default: "gpt-4o")
├── created_at: datetime
└── updated_at: datetime

Context
├── id: int (PK)
├── type: str                            # "rule" | "restriction"
│                                        # rule = flexible guideline for AI
│                                        # restriction = hard constraint
├── text: str                            # Natural language instruction
│                                        # (e.g., "Never discuss competitor pricing")
├── is_active: bool (True)
├── created_at: datetime
└── updated_at: datetime
```

## RAG Domain

```
Document
├── id: int (PK)
├── filename: str
├── file_type: str                       # "docx" | "pdf" | "txt"
├── file_size: int                       # bytes
├── chunk_count: int
├── created_at: datetime
└── updated_at: datetime

DocumentChunk
├── id: int (PK)
├── document_id: int (FK -> Document)
├── content: str                         # Chunk text
├── embedding: Vector(1536)              # pgvector column (OpenAI ada-002 = 1536 dims)
├── chunk_index: int                     # Order within document
├── metadata: dict | None                # Page number, section, etc.
├── created_at: datetime
└── updated_at: datetime
```

## Auth Domain

```
User (single user, created by install script)
├── id: int (PK)
├── email: str (unique)
├── password_hash: str
├── name: str
├── created_at: datetime
└── updated_at: datetime
```
