from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import Document
from app.services.document_service import DocumentService


@pytest.fixture
def storage():
    result = Mock()
    result.upload = AsyncMock(return_value="3,abc123")
    result.download = AsyncMock(return_value=SimpleNamespace(content=b"hello world"))
    result.delete = AsyncMock(return_value=204)
    result.cleanup = AsyncMock()
    return result


def make_document(file_id="3,abc123", filename="sample.txt", content_type="text/plain", size_bytes=11):
    return Document(
        file_id=file_id,
        filename=filename,
        content_type=content_type,
        size_bytes=size_bytes,
        uploaded_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )


@pytest.mark.asyncio
async def test_list_documents_maps_database_rows_to_response(session):
    first = make_document(filename="new.txt")
    second = make_document(file_id="4,xyz", filename="old.pdf", content_type="application/pdf")
    scalar_result = Mock()
    scalar_result.all.return_value = [first, second]
    session.scalars.return_value = scalar_result

    result = await DocumentService().list_documents(session)

    assert [item.filename for item in result] == ["new.txt", "old.pdf"]
    assert result[0].download_url == "/files/3,abc123"
    session.scalars.assert_awaited_once()


@pytest.mark.asyncio
async def test_upload_document_stores_content_then_commits_metadata(session, storage):
    file = AsyncMock(spec=UploadFile)
    file.read.return_value = b"hello world"
    file.filename = "sample.txt"
    file.content_type = "text/plain"

    result = await DocumentService(storage).upload_document(file=file, session=session)

    storage.upload.assert_awaited_once_with(
        filename="sample.txt", content_type="text/plain", content=b"hello world"
    )
    file.close.assert_awaited_once()
    session.add.assert_called_once()
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once()
    assert result.file_id == "3,abc123"
    assert result.size_bytes == 11


@pytest.mark.asyncio
async def test_upload_document_uses_fallback_name_and_content_type(session, storage):
    file = AsyncMock(spec=UploadFile)
    file.read.return_value = b"x"
    file.filename = None
    file.content_type = None

    result = await DocumentService(storage).upload_document(file=file, session=session)

    assert result.filename == "upload.bin"
    assert result.content_type == "application/octet-stream"
    storage.upload.assert_awaited_once_with(
        filename="upload.bin", content_type="application/octet-stream", content=b"x"
    )


@pytest.mark.asyncio
async def test_upload_rejects_empty_file_and_closes_upload(session, storage):
    file = AsyncMock(spec=UploadFile)
    file.read.return_value = b""
    file.filename = "empty.txt"
    file.content_type = "text/plain"

    with pytest.raises(HTTPException) as error:
        await DocumentService(storage).upload_document(file=file, session=session)

    assert error.value.status_code == 400
    assert error.value.detail == "The uploaded file is empty."
    file.close.assert_awaited_once()
    storage.upload.assert_not_awaited()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_upload_requires_storage(session):
    file = AsyncMock(spec=UploadFile)
    with pytest.raises(RuntimeError, match="Storage client is required"):
        await DocumentService().upload_document(file=file, session=session)


@pytest.mark.asyncio
async def test_upload_rolls_back_and_cleans_storage_if_metadata_commit_fails(session, storage):
    file = AsyncMock(spec=UploadFile)
    file.read.return_value = b"content"
    file.filename = "a.txt"
    file.content_type = "text/plain"
    session.commit.side_effect = SQLAlchemyError("database unavailable")

    with pytest.raises(HTTPException) as error:
        await DocumentService(storage).upload_document(file=file, session=session)

    assert error.value.status_code == 503
    session.rollback.assert_awaited_once()
    storage.cleanup.assert_awaited_once_with("3,abc123")


@pytest.mark.asyncio
async def test_get_document_content_returns_bytes_type_and_download_headers(session, storage):
    document = make_document(filename="report final.txt")
    session.get.return_value = document

    content, content_type, headers = await DocumentService(storage).get_document_content(
        file_id=document.file_id, download=True, session=session
    )

    assert content == b"hello world"
    assert content_type == "text/plain"
    assert "attachment" in headers["Content-Disposition"]
    assert 'filename="report final.txt"' in headers["Content-Disposition"]
    storage.download.assert_awaited_once_with(document.file_id)


@pytest.mark.asyncio
async def test_get_document_content_can_be_inline(session, storage):
    session.get.return_value = make_document()
    _, _, headers = await DocumentService(storage).get_document_content(
        file_id="3,abc123", download=False, session=session
    )
    assert headers == {}


@pytest.mark.asyncio
async def test_get_document_content_404_when_metadata_is_missing(session, storage):
    session.get.return_value = None
    with pytest.raises(HTTPException) as error:
        await DocumentService(storage).get_document_content(
            file_id="missing", download=True, session=session
        )
    assert error.value.status_code == 404
    storage.download.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_document_content_requires_storage(session):
    with pytest.raises(RuntimeError, match="Storage client is required"):
        await DocumentService().get_document_content(file_id="x", download=True, session=session)


@pytest.mark.asyncio
async def test_delete_removes_storage_then_metadata(session, storage):
    document = make_document()
    session.get.return_value = document

    await DocumentService(storage).delete_document(file_id=document.file_id, session=session)

    storage.delete.assert_awaited_once_with(document.file_id)
    session.delete.assert_awaited_once_with(document)
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_missing_metadata_returns_404_without_storage_call(session, storage):
    session.get.return_value = None
    with pytest.raises(HTTPException) as error:
        await DocumentService(storage).delete_document(file_id="missing", session=session)
    assert error.value.status_code == 404
    storage.delete.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_missing_storage_content_removes_stale_metadata(session, storage):
    document = make_document()
    session.get.return_value = document
    storage.delete.return_value = 404

    with pytest.raises(HTTPException) as error:
        await DocumentService(storage).delete_document(file_id=document.file_id, session=session)

    assert error.value.status_code == 404
    assert "stale metadata was removed" in error.value.detail
    session.delete.assert_awaited_once_with(document)
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_storage_server_error_returns_502_without_deleting_metadata(session, storage):
    session.get.return_value = make_document()
    storage.delete.return_value = 500

    with pytest.raises(HTTPException) as error:
        await DocumentService(storage).delete_document(file_id="3,abc123", session=session)

    assert error.value.status_code == 502
    session.delete.assert_not_awaited()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_rolls_back_if_metadata_delete_fails(session, storage):
    session.get.return_value = make_document()
    session.commit.side_effect = SQLAlchemyError("database unavailable")

    with pytest.raises(HTTPException) as error:
        await DocumentService(storage).delete_document(file_id="3,abc123", session=session)

    assert error.value.status_code == 503
    session.rollback.assert_awaited_once()


def test_to_response_encodes_file_id_in_download_url():
    document = make_document(file_id="folder id,abc")
    response = DocumentService._to_response(document)
    assert response.download_url == "/files/folder%20id,abc"
