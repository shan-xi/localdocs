from urllib.parse import quote
import httpx
from fastapi import HTTPException
from app.core.config import settings

class SeaweedFSStorage:
    """Adapter containing SeaweedFS HTTP API calls."""
    def __init__(self, client: httpx.AsyncClient) -> None:
        self.client = client

    async def upload(self, *, filename: str, content_type: str, content: bytes) -> str:
        try:
            assigned = await self.client.get(f"{settings.SEAWEEDFS_MASTER_URL}/dir/assign")
            assigned.raise_for_status()
            file_id = assigned.json()["fid"]
            stored = await self.client.post(
                f"{settings.SEAWEEDFS_VOLUME_URL}/{quote(file_id, safe=',')}",
                files={"file": (filename, content, content_type)},
            )
            stored.raise_for_status()
            return file_id
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            raise HTTPException(status_code=503, detail="SeaweedFS could not store the uploaded file. Check that its master and volume services are running.") from exc

    async def download(self, file_id: str) -> httpx.Response:
        try:
            response = await self.client.get(f"{settings.SEAWEEDFS_VOLUME_URL}/{quote(file_id, safe=',')}")
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Could not reach SeaweedFS.") from exc
        if response.status_code == 404:
            raise HTTPException(status_code=502, detail="Metadata exists, but the file content is missing from SeaweedFS.")
        if response.is_error:
            raise HTTPException(status_code=502, detail="SeaweedFS could not retrieve the file.")
        return response

    async def delete(self, file_id: str) -> int:
        try:
            response = await self.client.delete(f"{settings.SEAWEEDFS_VOLUME_URL}/{quote(file_id, safe=',')}")
            return response.status_code
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Could not reach SeaweedFS.") from exc

    async def cleanup(self, file_id: str) -> None:
        try:
            await self.client.delete(f"{settings.SEAWEEDFS_VOLUME_URL}/{quote(file_id, safe=',')}")
        except httpx.HTTPError:
            # Best-effort cleanup; preserve the original database exception.
            pass
