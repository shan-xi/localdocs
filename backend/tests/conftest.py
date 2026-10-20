from datetime import datetime, timezone
from unittest.mock import AsyncMock, Mock

import pytest

from app.db.models import Document


@pytest.fixture
def document():
    """A simple SQLAlchemy model instance for service unit tests."""
    return Document(
        file_id="3,abc123",
        filename="sample.txt",
        content_type="text/plain",
        size_bytes=12,
        uploaded_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )


@pytest.fixture
def session():
    """AsyncSession-shaped mock; no database is required."""
    session = AsyncMock()
    session.scalars = AsyncMock()
    session.get = AsyncMock()
    session.commit = AsyncMock()
    async def refresh_with_server_default(obj):
        if getattr(obj, "uploaded_at", None) is None:
            obj.uploaded_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    session.refresh = AsyncMock(side_effect=refresh_with_server_default)
    session.rollback = AsyncMock()
    session.delete = AsyncMock()
    session.add = Mock()
    return session
