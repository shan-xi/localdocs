from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    file_id: str
    filename: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime
    download_url: str
