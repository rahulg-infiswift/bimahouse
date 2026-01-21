# backend/app/policies/worker.py
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from rq import Worker, Queue, Connection
from redis import Redis

from app.core.config import settings
from app.core.db import SessionLocal
from app.policies.models import Job, Policy, JobStatus
from app.policies.openai_extract import extract_policy_json_from_pdf

logger = logging.getLogger("worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")

redis_conn = Redis.from_url(settings.redis_url)

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _log(event: str, **fields: Any) -> None:
    payload: Dict[str, Any] = {"event": event, **fields}
    logger.info(json.dumps(payload, default=str))

def process_extraction_job(job_id: str) -> None:
    start_ts = time.perf_counter()
    db = SessionLocal()

    _log("job_start", job_id=job_id, queue=settings.rq_queue_name, model=settings.openai_model)

    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            _log("job_missing", job_id=job_id)
            return

        job.status = JobStatus.RUNNING
        job.updated_at = _now_utc()
        db.commit()

        policy = db.query(Policy).filter(Policy.id == job.policy_id).first()
        if not policy:
            job.status = JobStatus.FAILED
            job.error_message = "Policy not found for this job"
            job.updated_at = _now_utc()
            db.commit()
            _log("policy_missing", job_id=job_id, policy_id=str(job.policy_id))
            return

        _log(
            "extraction_begin",
            job_id=job_id,
            policy_id=str(policy.id),
            pdf_storage_key=policy.pdf_storage_key,
            original_filename=getattr(policy, "original_filename", None),
        )

        t0 = time.perf_counter()
        extracted = extract_policy_json_from_pdf(policy.pdf_storage_key)
        t1 = time.perf_counter()

        policy.extracted_json = extracted
        job.status = JobStatus.DONE
        job.error_message = None
        job.updated_at = _now_utc()
        db.commit()

        _log(
            "extraction_done",
            job_id=job_id,
            policy_id=str(policy.id),
            seconds_openai=round(t1 - t0, 3),
            seconds_total=round(time.perf_counter() - start_ts, 3),
            extracted_top_keys=list(extracted.keys())[:25] if isinstance(extracted, dict) else None,
        )

    except Exception as e:
        # best-effort mark failed + log
        try:
            job2 = db.query(Job).filter(Job.id == job_id).first()
            if job2:
                job2.status = JobStatus.FAILED
                job2.error_message = f"{type(e).__name__}: {str(e)}"
                job2.updated_at = _now_utc()
                db.commit()
        except Exception:
            pass

        _log(
            "job_failed",
            job_id=job_id,
            error_type=type(e).__name__,
            error=str(e),
            seconds_total=round(time.perf_counter() - start_ts, 3),
        )
        raise

    finally:
        db.close()
        _log("job_end", job_id=job_id)

def run_worker():
    with Connection(redis_conn):
        q = Queue(settings.rq_queue_name)
        w = Worker([q])
        w.work(with_scheduler=False)

if __name__ == "__main__":
    run_worker()
