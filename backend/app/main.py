import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncIterator
from urllib.parse import quote

import httpx
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import DateTime, Integer, String, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

APP_NAME = os.getenv("APP_NAME", "LocalDocs")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://localdocs:localdocs_dev_password@localhost:5432/localdocs",
)
# SQLAlchemy's async driver is asyncpg.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
SEAWEEDFS_MASTER_URL = os.getenv("SEAWEEDFS_MASTER_URL", "http://seaweed-master:9333").rstrip("/")
SEAWEEDFS_VOLUME_URL = os.getenv("SEAWEEDFS_VOLUME_URL", "http://seaweed-volume:8080").rstrip("/")


class Base(DeclarativeBase):
    pass


class Document(Base):
    """Metadata only; the actual bytes live in SeaweedFS."""

    __tablename__ = "documents"

    file_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        yield session


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.http_client = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))
    try:
        # Convenient for this learning project. A later stage can replace create_all
        # with Alembic migrations as the schema evolves.
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        yield
    finally:
        await app.state.http_client.aclose()
        await engine.dispose()


app = FastAPI(
    title=APP_NAME,
    description="Local document management API. Stage 4 supports document listing, persistent metadata, and file content stored in SeaweedFS.",
    version="0.4.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


def document_to_dict(document: Document) -> dict[str, object]:
    return {
        "file_id": document.file_id,
        "filename": document.filename,
        "content_type": document.content_type,
        "size_bytes": document.size_bytes,
        "uploaded_at": document.uploaded_at,
        "download_url": f"/files/{quote(document.file_id, safe=',')}",
    }


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "app": app.title}


@app.get("/files", tags=["Files"])
async def list_files(session: AsyncSession = Depends(get_session)) -> list[dict[str, object]]:
    """List persisted document metadata, newest first."""
    result = await session.scalars(select(Document).order_by(Document.uploaded_at.desc()))
    return [document_to_dict(document) for document in result.all()]


@app.post("/files", status_code=status.HTTP_201_CREATED, tags=["Files"])
async def upload_file(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    """Store file bytes in SeaweedFS, then persist metadata in PostgreSQL."""
    client: httpx.AsyncClient = app.state.http_client
    content = await file.read()
    filename = file.filename or "upload.bin"
    content_type = file.content_type or "application/octet-stream"

    if not content:
        await file.close()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")

    file_id: str | None = None
    try:
        assign_response = await client.get(f"{SEAWEEDFS_MASTER_URL}/dir/assign")
        assign_response.raise_for_status()
        file_id = assign_response.json()["fid"]
        store_response = await client.post(
            f"{SEAWEEDFS_VOLUME_URL}/{file_id}",
            files={"file": (filename, content, content_type)},
        )
        store_response.raise_for_status()
    except (httpx.HTTPError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SeaweedFS could not store the uploaded file. Check that its master and volume services are running.",
        ) from exc
    finally:
        await file.close()

    document = Document(
        file_id=file_id,
        filename=filename,
        content_type=content_type,
        size_bytes=len(content),
    )
    try:
        session.add(document)
        await session.commit()
        await session.refresh(document)
    except SQLAlchemyError as exc:
        await session.rollback()
        # Avoid leaving an untracked object if the metadata insert fails.
        try:
            await client.delete(f"{SEAWEEDFS_VOLUME_URL}/{quote(file_id, safe=',')}")
        except httpx.HTTPError:
            pass
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The file was uploaded but its metadata could not be saved to PostgreSQL.",
        ) from exc

    return document_to_dict(document)


@app.get("/files/{file_id}", tags=["Files"])
async def download_file(
    file_id: str,
    download: bool = True,
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Look up metadata in PostgreSQL and retrieve bytes from SeaweedFS."""
    document = await session.get(Document, file_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    client: httpx.AsyncClient = app.state.http_client
    try:
        storage_response = await client.get(f"{SEAWEEDFS_VOLUME_URL}/{quote(file_id, safe=',')}")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Could not reach SeaweedFS.") from exc

    if storage_response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Metadata exists, but the file content is missing from SeaweedFS.")
    if storage_response.is_error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="SeaweedFS could not retrieve the file.")

    headers: dict[str, str] = {}
    if download:
        # RFC 5987 encoding supports filenames containing spaces and non-ASCII characters.
        safe_fallback = document.filename.replace('"', "")
        headers["Content-Disposition"] = f"attachment; filename=\"{safe_fallback.encode('ascii', 'ignore').decode() or 'download'}\"; filename*=UTF-8''{quote(document.filename)}"
    return Response(content=storage_response.content, media_type=document.content_type, headers=headers)


@app.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Files"])
async def delete_file(file_id: str, session: AsyncSession = Depends(get_session)) -> Response:
    """Delete the stored content and its metadata."""
    document = await session.get(Document, file_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    client: httpx.AsyncClient = app.state.http_client
    try:
        storage_response = await client.delete(f"{SEAWEEDFS_VOLUME_URL}/{quote(file_id, safe=',')}")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Could not reach SeaweedFS.") from exc

    if storage_response.status_code == status.HTTP_404_NOT_FOUND:
        # Remove stale metadata if the bytes are already gone.
        await session.delete(document)
        await session.commit()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content was missing from SeaweedFS; stale metadata was removed.")
    if storage_response.is_error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="SeaweedFS could not delete the file.")

    await session.delete(document)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
