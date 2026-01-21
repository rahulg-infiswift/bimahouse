# backend/app/main.py
from contextlib import asynccontextmanager
import uuid
from datetime import datetime, timezone, date
from typing import Optional

from fastapi import FastAPI, Depends, File, Query, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from rq import Queue, Retry
from redis import Redis
from sqlalchemy.orm import Session, joinedload
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))  # noqa

from app.auth import get_current_user
from app.config import settings
from app.db import get_db, engine
from app.models import Job, Policy, JobStatus, Base
from app.storage import save_pdf_bytes
from app.worker import process_extraction_job
from app.export_utils import json_to_csv_bytes, json_to_xlsx_bytes, policies_to_xlsx_bytes
from app.clerk_client import get_primary_email_and_verified

from app import partner_models # Attach partner tables to Base.metadata.tables
from app.partner_models import PartnerLead
from app.partner_routes import router as partner_router

import logging
Path("logs").mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(filename)s:%(lineno)d - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/main.log"),
        logging.StreamHandler(),
    ],
    force=True,
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.env == "dev":
        Base.metadata.create_all(bind=engine)
    yield

redis_conn = Redis.from_url(settings.redis_url)
queue = Queue(settings.rq_queue_name, connection=redis_conn)

app = FastAPI(title="Policy Extractor API", version="1.0.0", lifespan=lifespan)

# CORS (tighten in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://13.200.229.222",
        "https://bimahouseinsurance.in",
        "https://www.bimahouseinsurance.in",
        "http://bimahouseinsurance.in",
        "http://www.bimahouseinsurance.in",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Routes (all under /v1)
# -----------------------------


# Include partner leads routes
app.include_router(partner_router)

@app.get("/v1/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

@app.post("/v1/policies/extract")
async def extract_policy(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF too large (max 20MB for Phase 1).")

    pdf_path = save_pdf_bytes(file.filename, content)

    policy = Policy(
        id=uuid.uuid4(),
        user_id=user_id,
        original_filename=file.filename,
        pdf_storage_key=pdf_path,
        schema_version="v1",
        extracted_json=None,
    )
    db.add(policy)
    db.commit()

    job = Job(
        id=uuid.uuid4(),
        user_id=user_id,
        status=JobStatus.QUEUED,
        error_message=None,
        policy_id=policy.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(job)
    db.commit()

    queue.enqueue(process_extraction_job, str(job.id), job_timeout=600, retry=Retry(max=3))
    return {"job_id": str(job.id), "policy_id": str(policy.id)}

@app.get("/v1/jobs/{job_id}")
def get_job(job_id: uuid.UUID, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": str(job.id),
        "status": job.status,
        "policy_id": str(job.policy_id) if job.policy_id else None,
        "error": job.error_message,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }

@app.get("/v1/policies")
def list_policies(
    start_date: Optional[date] = Query(default=None, description="Filter policies created on or after this date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(default=None, description="Filter policies created on or before this date (YYYY-MM-DD)"),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Policy).filter(Policy.user_id == user_id)
    
    if start_date:
        start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        q = q.filter(Policy.created_at >= start_datetime)
    
    if end_date:
        end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
        q = q.filter(Policy.created_at <= end_datetime)
    
    policies = q.order_by(Policy.created_at.desc()).limit(200).all()
    
    return {
        "items": [
            {
                "policy_id": str(p.id),
                "original_filename": p.original_filename,
                "created_at": p.created_at.isoformat(),
                "has_extracted_json": p.extracted_json is not None,
                "schema_version": p.schema_version,
            }
            for p in policies
        ]
    }


@app.get("/v1/policies/download/bulk")
def download_policies_bulk(
    start_date: Optional[date] = Query(default=None, description="Filter policies created on or after this date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(default=None, description="Filter policies created on or before this date (YYYY-MM-DD)"),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download all policies with extracted data as a single Excel file (one row per policy)."""
    q = db.query(Policy).filter(Policy.user_id == user_id, Policy.extracted_json.isnot(None))
    
    if start_date:
        start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        q = q.filter(Policy.created_at >= start_datetime)
    
    if end_date:
        end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
        q = q.filter(Policy.created_at <= end_datetime)
    
    policies = q.order_by(Policy.created_at.desc()).limit(500).all()
    
    if not policies:
        raise HTTPException(status_code=404, detail="No extracted policies found for the given date range")
    
    # Fetch partner info by looking up the user's email from Clerk, then matching to partner_leads.email
    partners_map = {}
    user_ids = list(set(p.user_id for p in policies))
    logger.info(f"Fetching partner info for user_ids: {user_ids}")
    for uid in user_ids:
        # First try to find partner by clerk_user_id (if already linked)
        partner = (
            db.query(PartnerLead)
            .options(joinedload(PartnerLead.profile_data))
            .filter(PartnerLead.clerk_user_id == uid)
            .first()
        )
        
        if not partner:
            # Fall back to email matching via Clerk API
            try:
                email, _ = get_primary_email_and_verified(uid)
                logger.info(f"Fetched email for user {uid}: {email}")
                if email:
                    partner = (
                        db.query(PartnerLead)
                        .options(joinedload(PartnerLead.profile_data))
                        .filter(PartnerLead.lead_email == email)
                        .first()
                    )
                    logger.info(f"Matched partner for email {email}: {partner}")
                    # Optionally update clerk_user_id for future lookups
                    if partner and not partner.clerk_user_id:
                        partner.clerk_user_id = uid
                        db.commit()
            except Exception:
                # If Clerk API fails, continue without partner info
                pass
        
        if partner:
            partners_map[uid] = partner
    
    xlsx_bytes = policies_to_xlsx_bytes(policies, partners_map)
    
    # Generate filename with date range
    filename_parts = ["policies"]
    if start_date:
        filename_parts.append(f"from_{start_date.isoformat()}")
    if end_date:
        filename_parts.append(f"to_{end_date.isoformat()}")
    filename = "_".join(filename_parts) + ".xlsx"
    
    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/v1/policies/{policy_id}")
def get_policy(policy_id: uuid.UUID, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    policy = db.query(Policy).filter(Policy.id == policy_id, Policy.user_id == user_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    return {
        "policy_id": str(policy.id),
        "original_filename": policy.original_filename,
        "created_at": policy.created_at.isoformat(),
        "schema_version": policy.schema_version,
        "extracted_json": policy.extracted_json,
    }

@app.get("/v1/policies/{policy_id}/download")
def download_policy(
    policy_id: uuid.UUID,
    format: str = Query(default="json", pattern="^(json|csv|xlsx)$"),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    policy = db.query(Policy).filter(Policy.id == policy_id, Policy.user_id == user_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    if policy.extracted_json is None:
        raise HTTPException(status_code=409, detail="Extraction not completed yet")

    if format == "json":
        return JSONResponse(
            content=policy.extracted_json,
            headers={"Content-Disposition": f'attachment; filename="{policy_id}.json"'},
        )

    if format == "csv":
        csv_bytes = json_to_csv_bytes(policy.extracted_json)
        return StreamingResponse(
            iter([csv_bytes]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{policy_id}.csv"'},
        )

    # format == "xlsx"
    xlsx_bytes = json_to_xlsx_bytes(policy.extracted_json)
    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{policy_id}.xlsx"'},
    )

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
