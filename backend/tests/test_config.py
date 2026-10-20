from app.core.config import normalize_database_url


def test_normalize_plain_postgresql_url_adds_asyncpg_driver():
    assert normalize_database_url("postgresql://user:pass@localhost/db") == (
        "postgresql+asyncpg://user:pass@localhost/db"
    )


def test_normalize_does_not_change_already_async_url():
    value = "postgresql+asyncpg://user:pass@localhost/db"
    assert normalize_database_url(value) == value


def test_normalize_leaves_non_postgresql_urls_unchanged():
    assert normalize_database_url("sqlite+aiosqlite:///test.db") == "sqlite+aiosqlite:///test.db"
