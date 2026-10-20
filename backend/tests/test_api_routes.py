from datetime import datetime, timezone
from types import ModuleType
from unittest.mock import AsyncMock, Mock
import sys

import httpx
import pytest

# These route tests do not need a real database driver or connection. Install a
# tiny session-module substitute before importing the app so test collection
# remains independent from PostgreSQL/asyncpg installation.
session_module = ModuleType("app.db.session")
session_module.engine = Mock()


async def get_session():
    yield AsyncMock()


session_module.get_session = get_session
sys.modules["app.db.session"] = session_module

from app.main import app
from app.db.session import get_session
from app.schemas.document import DocumentResponse
from app.api.routes import files as files_routes


@pytest.fixture
async def client():
    async def fake_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = fake_session
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client
    app.dependency_overrides.clear()


def response_record():
    return DocumentResponse(
        file_id="3,abc123",
        filename="sample.txt",
        content_type="text/plain",
        size_bytes=11,
        uploaded_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        download_url="/files/3,abc123",
    )


@pytest.mark.asyncio
async def test_health_endpoint_returns_application_status(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app": "LocalDocs"}


@pytest.mark.asyncio
async def test_list_files_endpoint_returns_document_array(client, monkeypatch):
    service = Mock()
    service.list_documents = AsyncMock(return_value=[response_record()])
    monkeypatch.setattr(files_routes, "DocumentService", lambda: service)

    response = await client.get("/files")

    assert response.status_code == 200
    assert response.json()[0]["filename"] == "sample.txt"
    service.list_documents.assert_awaited_once()


@pytest.mark.asyncio
async def test_upload_endpoint_returns_created_document(client, monkeypatch):
    service = Mock()
    service.upload_document = AsyncMock(return_value=response_record())
    monkeypatch.setattr(files_routes, "make_service", lambda _request: service)

    response = await client.post(
        "/files", files={"file": ("sample.txt", b"hello world", "text/plain")}
    )

    assert response.status_code == 201
    assert response.json()["file_id"] == "3,abc123"
    service.upload_document.assert_awaited_once()


@pytest.mark.asyncio
async def test_download_endpoint_returns_file_content_and_type(client, monkeypatch):
    service = Mock()
    service.get_document_content = AsyncMock(return_value=(b"hello", "text/plain", {}))
    monkeypatch.setattr(files_routes, "make_service", lambda _request: service)

    response = await client.get("/files/3,abc123?download=false")

    assert response.status_code == 200
    assert response.content == b"hello"
    assert response.headers["content-type"].startswith("text/plain")
    service.get_document_content.assert_awaited_once()
    kwargs = service.get_document_content.await_args.kwargs
    assert kwargs["file_id"] == "3,abc123"
    assert kwargs["download"] is False
    assert "session" in kwargs


@pytest.mark.asyncio
async def test_delete_endpoint_returns_204(client, monkeypatch):
    service = Mock()
    service.delete_document = AsyncMock(return_value=None)
    monkeypatch.setattr(files_routes, "make_service", lambda _request: service)

    response = await client.delete("/files/3,abc123")

    assert response.status_code == 204
    service.delete_document.assert_awaited_once()
