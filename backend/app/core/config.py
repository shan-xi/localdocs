import os
from dataclasses import dataclass

def normalize_database_url(value: str) -> str:
    # SQLAlchemy's async PostgreSQL driver is asyncpg.
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+asyncpg://", 1)
    return value

@dataclass(frozen=True)
class Settings:
    APP_NAME: str
    DATABASE_URL: str
    SEAWEEDFS_MASTER_URL: str
    SEAWEEDFS_VOLUME_URL: str
    CORS_ALLOW_ORIGINS: list[str]

settings = Settings(
    APP_NAME=os.getenv("APP_NAME", "LocalDocs"),
    DATABASE_URL=normalize_database_url(os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://localdocs:localdocs_dev_password@localhost:5432/localdocs",
    )),
    SEAWEEDFS_MASTER_URL=os.getenv("SEAWEEDFS_MASTER_URL", "http://seaweed-master:9333").rstrip("/"),
    SEAWEEDFS_VOLUME_URL=os.getenv("SEAWEEDFS_VOLUME_URL", "http://seaweed-volume:8080").rstrip("/"),
    CORS_ALLOW_ORIGINS=[x.strip() for x in os.getenv(
        "CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if x.strip()],
)
