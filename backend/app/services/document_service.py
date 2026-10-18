from urllib.parse import quote
from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Document
from app.schemas.document import DocumentResponse
from app.storage.seaweedfs import SeaweedFSStorage

class DocumentService:
    """Coordinates document workflows across PostgreSQL and SeaweedFS."""
    def __init__(self, storage: SeaweedFSStorage | None = None) -> None:
        self.storage = storage

    async def list_documents(self, session: AsyncSession) -> list[DocumentResponse]:
        result = await session.scalars(select(Document).order_by(Document.uploaded_at.desc()))
        return [self._to_response(item) for item in result.all()]

    async def upload_document(self, *, file: UploadFile, session: AsyncSession) -> DocumentResponse:
        if self.storage is None:
            raise RuntimeError("Storage client is required for upload operations.")
        try:
            content = await file.read()
            filename = file.filename or "upload.bin"
            content_type = file.content_type or "application/octet-stream"
            if not content:
                raise HTTPException(status_code=400, detail="The uploaded file is empty.")
            file_id = await self.storage.upload(filename=filename, content_type=content_type, content=content)
        finally:
            await file.close()

        document = Document(file_id=file_id, filename=filename, content_type=content_type, size_bytes=len(content))
        try:
            session.add(document)
            await session.commit()
            await session.refresh(document)
        except SQLAlchemyError as exc:
            await session.rollback()
            await self.storage.cleanup(file_id)
            raise HTTPException(status_code=503, detail="The file was uploaded but its metadata could not be saved to PostgreSQL.") from exc
        return self._to_response(document)

    async def get_document_content(self, *, file_id: str, download: bool, session: AsyncSession) -> tuple[bytes, str, dict[str, str]]:
        if self.storage is None:
            raise RuntimeError("Storage client is required for download operations.")
        document = await session.get(Document, file_id)
        if document is None:
            raise HTTPException(status_code=404, detail="File not found.")
        response = await self.storage.download(file_id)
        headers: dict[str, str] = {}
        if download:
            fallback = document.filename.replace('"', '')
            ascii_name = fallback.encode("ascii", "ignore").decode() or "download"
            headers["Content-Disposition"] = f'attachment; filename="{ascii_name}"; filename*=UTF-8''{quote(document.filename)}'
        return response.content, document.content_type, headers

    async def delete_document(self, *, file_id: str, session: AsyncSession) -> None:
        if self.storage is None:
            raise RuntimeError("Storage client is required for delete operations.")
        document = await session.get(Document, file_id)
        if document is None:
            raise HTTPException(status_code=404, detail="File not found.")
        storage_status = await self.storage.delete(file_id)
        if storage_status == 404:
            await session.delete(document)
            await session.commit()
            raise HTTPException(status_code=404, detail="File content was missing from SeaweedFS; stale metadata was removed.")
        if storage_status >= 400:
            raise HTTPException(status_code=502, detail="SeaweedFS could not delete the file.")
        try:
            await session.delete(document)
            await session.commit()
        except SQLAlchemyError as exc:
            await session.rollback()
            raise HTTPException(status_code=503, detail="The file content was deleted, but its metadata could not be deleted from PostgreSQL.") from exc

    @staticmethod
    def _to_response(document: Document) -> DocumentResponse:
        return DocumentResponse(
            file_id=document.file_id,
            filename=document.filename,
            content_type=document.content_type,
            size_bytes=document.size_bytes,
            uploaded_at=document.uploaded_at,
            download_url=f"/files/{quote(document.file_id, safe=',')}",
        )
