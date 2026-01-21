# Policy Extractor (MVP)

Upload insurance policy PDFs → extract structured details using OpenAI → store results in Postgres (JSONB) → view in a Next.js web portal → download as **JSON / CSV / XLSX**.

---

## What’s Included

- **Frontend (Next.js App Router + Clerk)**
  - Login / Signup
  - Upload PDF
  - Policies list
  - Policy details (table view)
  - Downloads: JSON / CSV / XLSX

- **Backend (FastAPI + RQ + Redis + Postgres)**
  - Upload endpoint queues extraction jobs
  - Worker extracts + stores output in Postgres
  - Download endpoint supports JSON / CSV / XLSX

---

## Prerequisites

- Docker + Docker Compose
- OpenAI API key
- Clerk app keys (Publishable + Secret) + Clerk Issuer/JWKS URL

---

# Quick Start (Docker)

## 1) Create local env files (do NOT commit)

### Backend: `backend/.env`
```

OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-5-nano

CLERK_ISSUER=YOUR_CLERK_ISSUER
CLERK_JWKS_URL=YOUR_CLERK_JWKS_URL

```

### Frontend: `frontend/.env.local`
```

NEXT_PUBLIC_API_BASE_URL=[http://localhost:8000](http://localhost:8000)

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CLERK_SECRET_KEY=YOUR_SECRET_KEY

````

> Important:
- `NEXT_PUBLIC_API_BASE_URL` should be `http://localhost:8000` because requests are made from the **browser**.
- Ensure `backend/.env` and `frontend/.env.local` are in `.gitignore`.

## 2) Start the app (all services)

From the directory containing `docker-compose.yml`:

```bash
docker-compose up --build
````

## 3) Open in browser

* Frontend: [http://localhost:3000](http://localhost:3000)
* Backend Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)

## 4) Stop

```bash
docker-compose down
```

---

# Run From Terminal (without Docker for app code)

This is useful if you want to run backend/worker locally while keeping Postgres/Redis in Docker.

## 1) Start Postgres + Redis

```bash
docker-compose up -d postgres redis
```

## 2) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Export env vars (same values you would put in `backend/.env` + DB/Redis settings):

```bash
export ENV=dev
export DATABASE_URL="postgresql+psycopg2://postgres:postgres@localhost:5432/policydb"
export REDIS_URL="redis://localhost:6379/0"
export RQ_QUEUE_NAME="policy-extract"
export STORAGE_DIR="./backend_storage/pdfs"

export OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
export OPENAI_MODEL="gpt-5-nano"
export CLERK_ISSUER="YOUR_CLERK_ISSUER"
export CLERK_JWKS_URL="YOUR_CLERK_JWKS_URL"
export ALLOW_DEV_USER_HEADER="true"
```

Run backend:

```bash
uvicorn app.main:app --reload
```

Backend:

* [http://localhost:8000](http://localhost:8000)
* Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)

## 3) Worker (new terminal)

```bash
cd backend
source .venv/bin/activate

# ensure the same env vars are available here too
python -m app.policies.worker
```

## 4) Frontend (local)

```bash
cd frontend
npm install
npm run dev
```

Frontend:

* [http://localhost:3000](http://localhost:3000)

---

# Main API Endpoints

All routes are under `/v1`.

* `POST /v1/policies/extract` (upload PDF → returns `job_id`, `policy_id`)
* `GET /v1/jobs/{job_id}` (poll job status)
* `GET /v1/policies` (list policies)
* `GET /v1/policies/{policy_id}` (policy details + extracted JSON)
* `GET /v1/policies/{policy_id}/download?format=json|csv|xlsx` (download)

---

# Where Extracted Data Is Stored

* DB: Postgres
* Table: `policies`
* Column: `extracted_json` (JSONB)
* `user_id` is the Clerk user `sub` claim (stable for a user across sessions)

## Inspect Postgres (Docker)

1. Check container names:

```bash
docker ps
```

2. Open psql (container name may differ; commonly `postgres-1`):

```bash
docker exec -it postgres-1 psql -U postgres -d policydb
```

3. Query:

```sql
select id, user_id, original_filename, created_at
from policies
order by created_at desc
limit 10;

select extracted_json
from policies
where id = '<policy_uuid>';
```

---

# Notes / Tips

* If you see `401 Invalid token (issuer mismatch)`:

  * Ensure `CLERK_ISSUER` and `CLERK_JWKS_URL` are set for **both backend and worker** (via `backend/.env`).
* If uploads succeed but jobs don’t process:

  * Ensure the worker is running and `REDIS_URL` / `RQ_QUEUE_NAME` match.
* Keep secrets out of Git:

  * Commit `.env.example` templates, but never commit real `.env` files.
