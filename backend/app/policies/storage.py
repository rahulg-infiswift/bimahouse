import os
import uuid
from app.core.config import settings

def ensure_storage_dir() -> str:
    os.makedirs(settings.storage_dir, exist_ok=True)
    return settings.storage_dir

def save_pdf_bytes(filename: str, content: bytes) -> str:
    ensure_storage_dir()
    safe_name = filename.replace("/", "_").replace("\\", "_")
    key = f"{uuid.uuid4()}__{safe_name}"
    path = os.path.join(settings.storage_dir, key)
    with open(path, "wb") as f:
        f.write(content)
    return path
