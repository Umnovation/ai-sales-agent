from __future__ import annotations

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.common.schemas import ApiResponse
from app.dependencies import get_current_user, get_db
from app.rag import service as rag_service
from app.rag.schemas import DocumentResponse

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[DocumentResponse]:
    document = await rag_service.upload_document(db, file)
    return ApiResponse.ok(
        data=DocumentResponse.model_validate(document),
        message="Document uploaded and processed successfully",
    )


@router.get("")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[list[DocumentResponse]]:
    documents = await rag_service.list_documents(db)
    return ApiResponse.ok(
        data=[DocumentResponse.model_validate(d) for d in documents]
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[None]:
    await rag_service.delete_document(db, document_id)
    return ApiResponse.ok(data=None, message="Document deleted successfully")
