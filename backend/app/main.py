# backend/app/api/main.py
from datetime import datetime, timezone
from pathlib import Path
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

sys.path.append(str(Path(__file__).resolve().parents[2]))  # noqa

from app.partners.routes import router as partner_router
from app.policies.routes import router as policy_router
from app.users.routes import router as users_router
from app.employees.routes import router as employees_router
from app.advisor.conv_routes import router as advisor_conv_router
from app.quotes.routes import router as quotes_router


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


app = FastAPI(title="Policy Extractor API", version="1.0.0")

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

# Include domain routes
app.include_router(partner_router)
app.include_router(policy_router)
app.include_router(users_router)
app.include_router(employees_router)
app.include_router(advisor_conv_router)
app.include_router(quotes_router)


@app.get("/v1/health", tags=["Health"])
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
