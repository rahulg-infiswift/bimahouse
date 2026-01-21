from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple
import uuid

from app.core.config import settings


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
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    stored = f"{doc_type}_{ts}_{uuid.uuid4().hex}_{safe_name}"

    out_path = out_dir / stored
    out_path.write_bytes(content)

    return str(out_path), stored
