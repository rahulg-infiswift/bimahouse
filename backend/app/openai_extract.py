# backend/app/openai_extract.py
import argparse
import json
from pathlib import Path
from typing import Any, Dict, Optional

from openai import OpenAI
import sys
sys.path.append(str(Path(__file__).resolve().parents[1]))  # noqa
from app.config import settings
from app.policy_models import PolicyExtractV1


def extract_policy_json_from_pdf(pdf_path: str, *, cleanup_file: bool = True) -> Dict[str, Any]:
    """
    Uses OpenAI Responses API with direct Pydantic parsing (text_format=PolicyExtractV1).

    Returns:
        dict suitable for JSONB storage / API response.

    Notes:
    - Requires OPENAI_API_KEY in env.
    """
    client = OpenAI(api_key=settings.openai_api_key)

    file_id: Optional[str] = None
    try:
        with open(pdf_path, "rb") as f:
            uploaded = client.files.create(file=f, purpose="assistants")
        file_id = uploaded.id

        instructions = (
            "You are an expert insurance policy document parser.\n"
            "Extract ALL relevant policy details from the provided PDF.\n"
            "Return only structured data that matches the schema.\n"
            "Rules:\n"
            "- Use null when a field is not present.\n"
            "- Normalize dates to YYYY-MM-DD when possible.\n"
            "- Preserve numbers as numbers (premiums, IDV, deductibles).\n"
            "- If a value is masked in the document, keep it masked as-is.\n"
            "- Do not hallucinate; only use what is in the PDF.\n"
        )

        resp = client.responses.parse(
            model=settings.openai_model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": instructions},
                        {"type": "input_file", "file_id": file_id},
                    ],
                }
            ],
            text_format=PolicyExtractV1,
            store=False,
        )

        parsed: PolicyExtractV1 = resp.output_parsed
        return parsed.model_dump()

    finally:
        # Keep your OpenAI Files area clean
        if cleanup_file and file_id:
            try:
                client.files.delete(file_id)
            except Exception:
                pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Local test for policy extraction")
    parser.add_argument("--pdf", required=True, help="Path to policy PDF")
    parser.add_argument("--no-cleanup", action="store_true", help="Do not delete uploaded OpenAI file")
    args = parser.parse_args()

    pdf_path = args.pdf
    if not Path(pdf_path).exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    data = extract_policy_json_from_pdf(pdf_path, cleanup_file=not args.no_cleanup)

    # Print to console
    print(json.dumps(data, indent=2, ensure_ascii=False))

    # Determine output path: use PDF name with .json extension in outputs folder

    pdf_name = Path(pdf_path).stem + "_" + settings.openai_model.replace("-", "_")
    out_dir = Path("outputs")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Find next available version number
    base_name = f"{pdf_name}"
    out_path = out_dir / f"{base_name}.json"
    version = 1
    while out_path.exists():
        out_path = out_dir / f"{base_name}_v{version}.json"
        version += 1
    
    out_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved: {out_path}")

