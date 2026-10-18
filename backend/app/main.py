from contextlib import asynccontextmanager
from typing import AsyncIterator
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db import models as _models  # Register models before create_all().
from app.db.base import Base
from app.db.session import engine
from app.api.routes.files import router as files_router
from app.api.routes.health import router as health_router

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.http_client = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))
    try:
        # Convenient for this learning project; use Alembic as the schema evolves.
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        yield
    finally:
        await app.state.http_client.aclose()
        await engine.dispose()

app = FastAPI(
    title=settings.APP_NAME,
    description="Local document management API with PostgreSQL metadata and SeaweedFS file content.",
    version="0.4.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(files_router)
