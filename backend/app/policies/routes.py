# backend/app/policies/routes.py
import uuid
from datetime import datetime, timezone, date
from typing import Optional
import logging

from fastapi import APIRouter, Depends, File, Query, UploadFile, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from redis import Redis
from rq import Queue, Retry
from sqlalchemy.orm import Session

from app.core.auth import get_current_posp_application_id
from app.core.config import settings
from app.core.db import get_db
from app.policies.models import Job, Policy, JobStatus
from app.policies.storage import save_pdf_bytes
from app.policies.worker import process_extraction_job
from app.policies.export_utils import json_to_csv_bytes, json_to_xlsx_bytes, policies_to_xlsx_bytes
from app.partners.models import PospApplication

router = APIRouter(tags=["Policies"])
logger = logging.getLogger(__name__)

redis_conn = Redis.from_url(settings.redis_url)
queue = Queue(settings.rq_queue_name, connection=redis_conn)


def _get_current_approved_posp_application(
    posp_application_id: str = Depends(get_current_posp_application_id),
    db: Session = Depends(get_db),
) -> PospApplication:
    posp_application = db.query(PospApplication).filter(PospApplication.id == posp_application_id).first()
    if not posp_application:
        raise HTTPException(status_code=401, detail="Invalid partner session")
    if posp_application.status != "approved":
        raise HTTPException(status_code=403, detail="Partner account is not approved")
    return posp_application


@router.post("/v1/policies/extract")
async def extract_policy(
    file: UploadFile = File(...),
    posp_application: PospApplication = Depends(_get_current_approved_posp_application),
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
        user_id=f"partner:{posp_application.id}",
        original_filename=file.filename,
        pdf_storage_key=pdf_path,
        schema_version="v1",
        extracted_json=None,
    )
    db.add(policy)
    db.commit()

    job = Job(
        id=uuid.uuid4(),
        user_id=f"partner:{posp_application.id}",
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


def _apply_policy_scope(query, posp_application: PospApplication):
    return query.filter(Policy.user_id == f"partner:{posp_application.id}")


@router.get("/v1/jobs/{job_id}")
def get_job(job_id: uuid.UUID, posp_application: PospApplication = Depends(_get_current_approved_posp_application), db: Session = Depends(get_db)):
    job_query = db.query(Job).filter(Job.id == job_id)
    job_query = job_query.filter(Job.user_id == f"partner:{posp_application.id}")
    job = job_query.first()
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


@router.get("/v1/policies")
def list_policies(
    start_date: Optional[date] = Query(default=None, description="Filter policies created on or after this date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(default=None, description="Filter policies created on or before this date (YYYY-MM-DD)"),
    posp_application: PospApplication = Depends(_get_current_approved_posp_application),
    db: Session = Depends(get_db),
):
    q = _apply_policy_scope(db.query(Policy), posp_application)
    
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


@router.get("/v1/policies/download/bulk")
def download_policies_bulk(
    start_date: Optional[date] = Query(default=None, description="Filter policies created on or after this date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(default=None, description="Filter policies created on or before this date (YYYY-MM-DD)"),
    posp_application: PospApplication = Depends(_get_current_approved_posp_application),
    db: Session = Depends(get_db),
):
    """Download all policies with extracted data as a single Excel file (one row per policy)."""
    q = _apply_policy_scope(db.query(Policy), posp_application).filter(Policy.extracted_json.isnot(None))
    
    if start_date:
        start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        q = q.filter(Policy.created_at >= start_datetime)
    
    if end_date:
        end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
        q = q.filter(Policy.created_at <= end_datetime)
    
    policies = q.order_by(Policy.created_at.desc()).limit(500).all()
    
    if not policies:
        raise HTTPException(status_code=404, detail="No extracted policies found for the given date range")
    
    # Fetch partner info from principal ids of the form "partner:<posp_application_id>".
    posp_applications_map = {}
    user_ids = list(set(p.user_id for p in policies))
    logger.info("Fetching partner info for user_ids: %s", user_ids)
    for uid in user_ids:
        if not uid.startswith("partner:"):
            continue
        partner_id = uid.split("partner:", 1)[1]
        posp_application_row = db.query(PospApplication).filter(PospApplication.id == partner_id).first()
        if posp_application_row:
            posp_applications_map[uid] = posp_application_row
    
    xlsx_bytes = policies_to_xlsx_bytes(policies, posp_applications_map)
    
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
        headers={"Content-Disposition": f'attachment; filename=\"{filename}\"'},
    )


@router.get("/v1/policies/{policy_id}")
def get_policy(policy_id: uuid.UUID, posp_application: PospApplication = Depends(_get_current_approved_posp_application), db: Session = Depends(get_db)):
    q = _apply_policy_scope(db.query(Policy).filter(Policy.id == policy_id), posp_application)
    policy = q.first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    return {
        "policy_id": str(policy.id),
        "original_filename": policy.original_filename,
        "created_at": policy.created_at.isoformat(),
        "schema_version": policy.schema_version,
        "extracted_json": policy.extracted_json,
    }


@router.get("/v1/policies/{policy_id}/download")
def download_policy(
    policy_id: uuid.UUID,
    format: str = Query(default="json", pattern="^(json|csv|xlsx)$"),
    posp_application: PospApplication = Depends(_get_current_approved_posp_application),
    db: Session = Depends(get_db),
):
    q = _apply_policy_scope(db.query(Policy).filter(Policy.id == policy_id), posp_application)
    policy = q.first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    if policy.extracted_json is None:
        raise HTTPException(status_code=409, detail="Extraction not completed yet")

    if format == "json":
        return JSONResponse(
            content=policy.extracted_json,
            headers={"Content-Disposition": f'attachment; filename=\"{policy_id}.json\"'},
        )

    if format == "csv":
        csv_bytes = json_to_csv_bytes(policy.extracted_json)
        return StreamingResponse(
            iter([csv_bytes]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename=\"{policy_id}.csv\"'},
        )

    # format == "xlsx"
    xlsx_bytes = json_to_xlsx_bytes(policy.extracted_json)
    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename=\"{policy_id}.xlsx\"'},
    )
