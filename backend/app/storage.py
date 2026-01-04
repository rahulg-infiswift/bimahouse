from datetime import datetime
import os
from pathlib import Path
from typing import Tuple
import uuid
from .config import settings

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

def save_partner_doc_bytes(lead_id: str, doc_type: str, filename: str, content: bytes) -> Tuple[str, str]:
    """
    Returns (storage_path, stored_filename)
    Writes to: {STORAGE_DIR}/partners/{lead_id}/...
    """
    base_dir = Path(settings.storage_dir)  # you already mount /app/storage/pdfs in compose; adjust if needed
    # For partners, nest under a separate folder:
    out_dir = base_dir.parent / "partners" / str(lead_id)
    out_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(filename).name
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    stored = f"{doc_type}_{ts}_{uuid.uuid4().hex}_{safe_name}"

    out_path = out_dir / stored
    out_path.write_bytes(content)

    return str(out_path), stored