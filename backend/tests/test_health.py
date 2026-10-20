from types import SimpleNamespace
from app.api.routes.health import health_check


async def test_health_check_returns_status_and_app_name():
    request = SimpleNamespace(app=SimpleNamespace(title="LocalDocs"))
    assert await health_check(request) == {"status": "ok", "app": "LocalDocs"}
