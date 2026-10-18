from typing import Annotated
from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.schemas.document import DocumentResponse
from app.services.document_service import DocumentService
from app.storage.seaweedfs import SeaweedFSStorage
router = APIRouter(prefix="/files", tags=["Files"])

def make_service(request: Request) -> DocumentService:
    return DocumentService(SeaweedFSStorage(request.app.state.http_client))

@router.get("", response_model=list[DocumentResponse])
async def list_files(session: Annotated[AsyncSession, Depends(get_session)]) -> list[DocumentResponse]:
    return await DocumentService().list_documents(session)

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(request: Request, file: Annotated[UploadFile, File(...)], session: Annotated[AsyncSession, Depends(get_session)]) -> DocumentResponse:
    return await make_service(request).upload_document(file=file, session=session)

@router.get("/{file_id}")
async def download_file(file_id: str, request: Request, session: Annotated[AsyncSession, Depends(get_session)], download: Annotated[bool, Query()] = True) -> Response:
    content, content_type, headers = await make_service(request).get_document_content(file_id=file_id, download=download, session=session)
    return Response(content=content, media_type=content_type, headers=headers)

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(file_id: str, request: Request, session: Annotated[AsyncSession, Depends(get_session)]) -> Response:
    await make_service(request).delete_document(file_id=file_id, session=session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
