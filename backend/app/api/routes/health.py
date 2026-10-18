from fastapi import APIRouter, Request
router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check(request: Request) -> dict[str, str]:
    return {"status": "ok", "app": request.app.title}
