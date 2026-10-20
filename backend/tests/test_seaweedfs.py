from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

from app.storage import seaweedfs as seaweedfs_module
from app.storage.seaweedfs import SeaweedFSStorage


@pytest.mark.asyncio
async def test_upload_assigns_id_then_posts_file(monkeypatch):
    monkeypatch.setattr(seaweedfs_module, "settings", SimpleNamespace(SEAWEEDFS_MASTER_URL="http://master", SEAWEEDFS_VOLUME_URL="http://volume"))
    monkeypatch.setattr(seaweedfs_module, "settings", SimpleNamespace(SEAWEEDFS_MASTER_URL="http://master", SEAWEEDFS_VOLUME_URL="http://volume"))
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.method == "GET":
            return httpx.Response(200, json={"fid": "3,abc123"})
        return httpx.Response(201)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await SeaweedFSStorage(client).upload(
            filename="hello.txt", content_type="text/plain", content=b"hello"
        )

    assert result == "3,abc123"
    assert calls[0].url.path == "/dir/assign"
    assert calls[1].method == "POST"
    assert calls[1].url.path == "/3,abc123"


@pytest.mark.asyncio
async def test_upload_maps_http_failure_to_503(monkeypatch):
    monkeypatch.setattr(seaweedfs_module, "settings", SimpleNamespace(SEAWEEDFS_MASTER_URL="http://master", SEAWEEDFS_VOLUME_URL="http://volume"))

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(HTTPException) as error:
            await SeaweedFSStorage(client).upload(
                filename="a.txt", content_type="text/plain", content=b"x"
            )
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_upload_maps_invalid_assignment_json_to_503(monkeypatch):
    monkeypatch.setattr(seaweedfs_module, "settings", SimpleNamespace(SEAWEEDFS_MASTER_URL="http://master", SEAWEEDFS_VOLUME_URL="http://volume"))

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"missing_fid": "x"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(HTTPException) as error:
            await SeaweedFSStorage(client).upload(
                filename="a.txt", content_type="text/plain", content=b"x"
            )
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_download_returns_success_response(monkeypatch):
    monkeypatch.setattr(seaweedfs_module, "settings", SimpleNamespace(SEAWEEDFS_MASTER_URL="http://master", SEAWEEDFS_VOLUME_URL="http://volume"))

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"payload", headers={"content-type": "text/plain"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        response = await SeaweedFSStorage(client).download("3,abc")
    assert response.content == b"payload"


@pytest.mark.asyncio
async def test_download_missing_content_maps_to_502(monkeypatch):
    monkeypatch.setattr(seaweedfs_module, "settings", SimpleNamespace(SEAWEEDFS_MASTER_URL="http://master", SEAWEEDFS_VOLUME_URL="http://volume"))

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(HTTPException) as error:
            await SeaweedFSStorage(client).download("missing")
    assert error.value.status_code == 502


@pytest.mark.asyncio
async def test_download_server_error_maps_to_502(monkeypatch):
    monkeypatch.setattr(seaweedfs_module, "settings", SimpleNamespace(SEAWEEDFS_MASTER_URL="http://master", SEAWEEDFS_VOLUME_URL="http://volume"))

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(HTTPException) as error:
            await SeaweedFSStorage(client).download("3,abc")
    assert error.value.status_code == 502


@pytest.mark.asyncio
async def test_delete_returns_seaweedfs_status_code(monkeypatch):
    monkeypatch.setattr(seaweedfs_module, "settings", SimpleNamespace(SEAWEEDFS_MASTER_URL="http://master", SEAWEEDFS_VOLUME_URL="http://volume"))

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(204)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        status = await SeaweedFSStorage(client).delete("3,abc")
    assert status == 204


@pytest.mark.asyncio
async def test_cleanup_ignores_http_error(monkeypatch):
    monkeypatch.setattr(seaweedfs_module, "settings", SimpleNamespace(SEAWEEDFS_MASTER_URL="http://master", SEAWEEDFS_VOLUME_URL="http://volume"))

    def handler(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("unavailable")

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        await SeaweedFSStorage(client).cleanup("3,abc")  # best-effort; should not raise
