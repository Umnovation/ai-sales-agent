# API Specification

## Response Format

All API endpoints return a standardized response envelope.

### Response Schema

```python
# backend/app/common/schemas.py
from pydantic import BaseModel
from typing import Generic, TypeVar

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: T | None = None
    errors: dict[str, list[str]] | None = None
```

### Success Response

```json
{
  "success": true,
  "message": "Flow retrieved successfully",
  "data": {
    "id": 1,
    "name": "CRM Sales Flow",
    "scripts": [...]
  }
}
```

HTTP status codes: `200` (OK), `201` (Created).

### Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": ["Name is required"],
    "task": ["Task must be at least 10 characters"]
  }
}
```

HTTP status codes: `400` (Bad Request), `401` (Unauthorized), `403` (Forbidden), `404` (Not Found), `422` (Validation Error), `500` (Internal Server Error).

## Backend Usage

```python
from app.common.schemas import ApiResponse

@router.get("/flow")
async def get_flow(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[FlowResponse]:
    flow: Flow | None = await flow_service.get_active_flow(db)
    if flow is None:
        raise HTTPException(status_code=404, detail="Flow not found")
    return ApiResponse(
        success=True,
        message="",
        data=FlowResponse.model_validate(flow),
    )

@router.post("/flow/scripts", status_code=201)
async def create_script(
    payload: ScriptCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[ScriptResponse]:
    script: FlowScript = await flow_service.create_script(db, payload)
    return ApiResponse(
        success=True,
        message="Script created successfully",
        data=ScriptResponse.model_validate(script),
    )
```

## Error Handling

Centralized exception handler converts all errors to ApiResponse format:

```python
# backend/app/common/exceptions.py
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors: dict[str, list[str]] = {}
    for error in exc.errors():
        field: str = ".".join(str(loc) for loc in error["loc"][1:])  # skip "body"
        errors.setdefault(field, []).append(str(error["msg"]))
    return JSONResponse(
        status_code=422,
        content=ApiResponse[None](
            success=False,
            message="Validation failed",
            errors=errors,
        ).model_dump(),
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse[None](
            success=False,
            message=str(exc.detail),
        ).model_dump(),
    )
```

## Frontend Types

```typescript
// frontend/src/api/types/common.ts
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly message: string;
  readonly data?: T;
  readonly errors?: Readonly<Record<string, readonly string[]>>;
}
```

## Frontend Usage

```typescript
// frontend/src/api/endpoints/flow.ts
import type { ApiResponse } from "@/api/types/common";
import type { Flow } from "@/api/types/flow";
import { apiClient } from "@/api/client";

export async function getFlow(): Promise<ApiResponse<Flow>> {
  const { data } = await apiClient.get<ApiResponse<Flow>>("/flow");
  return data;
}

export async function createScript(
  payload: ScriptCreateRequest
): Promise<ApiResponse<FlowScript>> {
  const { data } = await apiClient.post<ApiResponse<FlowScript>>(
    "/flow/scripts",
    payload
  );
  return data;
}
```

## Axios Interceptor (Error Handling)

```typescript
// frontend/src/api/client.ts
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const payload = error.response?.data;

    if (payload?.message) {
      error.message = payload.message;
    }

    if (error.response?.status === 401) {
      authStore.logout();
    }

    return Promise.reject(error);
  }
);
```

## Validation Errors in Forms

Frontend can map `errors` field directly to form fields:

```typescript
function handleSubmit(formData: StepFormData): void {
  try {
    await createStep(scriptId, formData);
  } catch (err) {
    const axiosError = err as AxiosError<ApiResponse<unknown>>;
    const fieldErrors = axiosError.response?.data?.errors;
    if (fieldErrors) {
      // fieldErrors = { "task": ["Task is required"], "order": ["Must be positive"] }
      setFormErrors(fieldErrors);
    }
  }
}
```

## Pagination

All list endpoints use cursor/offset pagination with a standard response format.

### Response Format

```python
class PaginatedResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: list[T]
    total: int
    page: int
    per_page: int
    has_more: bool
```

```json
{
  "success": true,
  "message": "",
  "data": [...],
  "total": 150,
  "page": 1,
  "per_page": 20,
  "has_more": true
}
```

### Frontend Type

```typescript
export interface PaginatedResponse<T> {
  readonly success: boolean;
  readonly message: string;
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly per_page: number;
  readonly has_more: boolean;
}
```

### Paginated Endpoints

| Endpoint | Default per_page | Max per_page |
|----------|-----------------|--------------|
| `GET /api/chats` | 20 | 50 |
| `GET /api/chats/{id}/messages` | 50 | 100 |
| `GET /api/documents` | 20 | 50 |
| `GET /api/analytics/conversations` | 30 | 90 |

Query parameters: `?page=1&per_page=20`
