import os
from contextlib import asynccontextmanager
from typing import AsyncIterator
from urllib.parse import quote

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

APP_NAME = os.getenv("APP_NAME", "LocalDocs")
SEAWEEDFS_MASTER_URL = os.getenv("SEAWEEDFS_MASTER_URL", "http://seaweed-master:9333").rstrip("/")
SEAWEEDFS_VOLUME_URL = os.getenv("SEAWEEDFS_VOLUME_URL", "http://seaweed-volume:8080").rstrip("/")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.http_client = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))
    try:
        yield
    finally:
        await app.state.http_client.aclose()


app = FastAPI(
    title=APP_NAME,
    description="Local document management API. Stage 2 adds file upload and download via SeaweedFS.",
    version="0.2.0",
    lifespan=lifespan,
)

# Vite runs on port 5173 and the API runs on port 8000 during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "app": app.title}


@app.post("/files", status_code=status.HTTP_201_CREATED, tags=["Files"])
async def upload_file(file: UploadFile = File(...)) -> dict[str, object]:
    """Upload a file to SeaweedFS and return its storage ID."""
    client: httpx.AsyncClient = app.state.http_client

    try:
        # Ask the SeaweedFS master to allocate a file ID.
        assign_response = await client.get(f"{SEAWEEDFS_MASTER_URL}/dir/assign")
        assign_response.raise_for_status()
        assignment = assign_response.json()
        file_id = assignment["fid"]
    except (httpx.HTTPError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not allocate storage in SeaweedFS. Check that the master and volume services are running.",
        ) from exc

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")

    filename = file.filename or "upload.bin"
    content_type = file.content_type or "application/octet-stream"

    try:
        # In this local setup, all assigned file IDs are stored on our one volume server.
        store_response = await client.post(
            f"{SEAWEEDFS_VOLUME_URL}/{file_id}",
            files={"file": (filename, content, content_type)},
        )
        store_response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SeaweedFS could not store the uploaded file.",
        ) from exc
    finally:
        await file.close()

    return {
        "file_id": file_id,
        "filename": filename,
        "content_type": content_type,
        "size_bytes": len(content),
        "download_url": f"/files/{quote(file_id, safe=',')}?download=true",
    }


@app.get("/files/{file_id}", tags=["Files"])
async def download_file(file_id: str, download: bool = True) -> Response:
    """Retrieve a file from SeaweedFS by the ID returned from POST /files."""
    client: httpx.AsyncClient = app.state.http_client
    try:
        storage_response = await client.get(f"{SEAWEEDFS_VOLUME_URL}/{quote(file_id, safe=',')}")
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach SeaweedFS.",
        ) from exc

    if storage_response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    if storage_response.is_error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="SeaweedFS could not retrieve the file.",
        )

    content_type = storage_response.headers.get("content-type", "application/octet-stream")
    headers: dict[str, str] = {}
    if download:
        # This first iteration uses the file ID as the download name; metadata storage comes later.
        headers["Content-Disposition"] = f'attachment; filename="{file_id.replace(chr(34), "")}"'
    return Response(content=storage_response.content, media_type=content_type, headers=headers)


@app.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Files"])
async def delete_file(file_id: str) -> Response:
    """Delete a stored file. PostgreSQL metadata tracking is intentionally deferred."""
    client: httpx.AsyncClient = app.state.http_client
    try:
        storage_response = await client.delete(f"{SEAWEEDFS_VOLUME_URL}/{quote(file_id, safe=',')}")
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach SeaweedFS.",
        ) from exc

    if storage_response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    if storage_response.is_error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="SeaweedFS could not delete the file.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
