import logging
import json
import time
import redis
from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# Import your local modules
try:
    from . import models, auth
except ImportError:
    import models, auth

# --- Logging Setup (Moved to top so logger is available everywhere) ---
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module
        }
        return json.dumps(log_record)

logger = logging.getLogger("nexus_logger")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# --- Configuration ---
DATABASE_URL = "postgresql://postgres:mysecret@db:5432/postgres"
REDIS_URL = "redis://redis:6379"
CACHE_TTL = 60 
tenant_cache = {} 

# --- Database & Redis Initialization ---
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
r = redis.from_url(REDIS_URL, decode_responses=True)

app = FastAPI(title="Nexus-Stream Ingestor")

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, use ["http://localhost:3000"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependencies ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Routes ---

@app.get("/health/services")
async def health_services():
    health = {"redis": "offline", "postgres": "offline"}
    # Check Redis
    try:
        if r.ping():
            health["redis"] = "online"
    except Exception as e:
        logger.error(f"Health Check Redis Failed: {e}")

    # Check Postgres using SQLAlchemy engine
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            health["postgres"] = "online"
    except Exception as e:
        logger.error(f"Health Check Postgres Failed: {e}")

    return health

@app.post("/track")
async def track_event(
    request: Request,
    db: Session = Depends(get_db),
    api_key: str = Depends(auth.api_key_header)
):
    # 1. Check local memory cache
    tenant_info = tenant_cache.get(api_key)
    
    if not tenant_info:
        try:
            tenant = auth.get_tenant(api_key, db)
            if tenant:
                tenant_info = {"id": tenant.id, "external_id": tenant.external_id}
                tenant_cache[api_key] = tenant_info
            else:
                raise HTTPException(status_code=403, detail="Invalid Key")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"DB Error: {e}")
            # Fallback for testing/recovery
            tenant_info = {"id": 1, "external_id": "test-uuid"}

    # 2. Parse Data
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # 3. Create the packet
    event_packet = {
        "tenant_id": tenant_info["id"],
        "type": data.get("type") or data.get("event_type") or "generic",
        "payload": data,
        "received_at": time.time()
    }

    # 4. Push to Redis
    try:
        r.rpush("ingest_queue", json.dumps(event_packet))
        logger.info(f"Ingested for tenant {tenant_info['id']}. Queue: {r.llen('ingest_queue')}")
    except Exception as e:
        logger.error(f"Redis Push Failed: {e}")
        raise HTTPException(status_code=503, detail="Queue unreachable")

    return {"status": "success"}

@app.get("/analytics/{tenant_id}")
async def get_analytics(tenant_id: int, db: Session = Depends(get_db)):
    try:
        # Optimized: Using SQLAlchemy text instead of raw psycopg2 for consistency
        query = text("SELECT tenant_id, total_events, last_updated FROM tenant_analytics WHERE tenant_id = :tid")
        result = db.execute(query, {"tid": tenant_id}).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Tenant data not found")

        # Map row to dictionary for JSON output
        return {
            "tenant_id": result[0],
            "total_events": result[1],
            "last_updated": result[2].isoformat() if result[2] else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database Read Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")