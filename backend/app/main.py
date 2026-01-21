# backend/app/api/main.py
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(str(Path(__file__).resolve().parents[2]))  # noqa

from app.core.config import settings
from app.core.db import engine, Base
from app.partners.routes import router as partner_router
from app.policies.routes import router as policy_router

from app.partners import models as partner_models  # noqa: F401
from app.policies import models as policy_models  # noqa: F401
from app.users import models as user_models  # noqa: F401

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

# Include domain routes
app.include_router(partner_router)
app.include_router(policy_router)


@app.get("/v1/health", tags=["Health"])
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
