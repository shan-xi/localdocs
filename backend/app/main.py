import os

from fastapi import FastAPI

app = FastAPI(
    title=os.getenv("APP_NAME", "LocalDocs"),
    description="Local document management API",
    version="0.1.0",
)


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "app": app.title}
