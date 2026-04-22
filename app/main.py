from fastapi import FastAPI, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from . import models, auth
import redis
import json,time
from fastapi import FastAPI, Depends, Request, HTTPException

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import logging
import json


tenant_cache = {} 
CACHE_TTL = 60  # Cache valid for 60 seconds

# Database Setup (Use your Supabase URL here too)
DATABASE_URL = "postgresql://postgres.tizxkqucgrhmxldddtcj:7i7prGgrVklQeL7P@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

engine = create_engine(
    DATABASE_URL,
    pool_size=10,          # Allow up to 10 open connections
    max_overflow=20,       # Allow 20 extra if things get busy
    pool_pre_ping=True,    # Check if the connection is alive before using it
    pool_recycle=300       # Refresh connections every 5 minutes
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# REDIS_URL = "rediss://default:gQAAAAAAAVBjAAIncDFlNzgwZDQ2MjNkYjA0MGJlOTY5YjFiMzFjOTMwN2QxYnAxODYxMTU@amazing-monkey-86115.upstash.io:6379"
REDIS_URL = "redis://127.0.0.1:6379" 
r = redis.from_url(REDIS_URL, decode_responses=True)


app = FastAPI(title="Nexus-Stream Ingestor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Allows your Dashboard to talk to the API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health/services")
async def health_services():
    health = {"redis": "offline", "postgres": "offline"}
    try:
        if r.ping():
            health["redis"] = "online"
    except: pass

    try:
        conn = get_db_connection()
        conn.close()
        health["postgres"] = "online"
    except: pass

    return health

# --- ADD THIS: Simple In-Memory Cache ---

# ----------------------------------------

@app.post("/track")
async def track_event(
    request: Request,
    db: Session = Depends(get_db),
    api_key: str = Depends(auth.api_key_header)
):
    # 1. Check local memory cache first
    tenant_info = tenant_cache.get(api_key)
    
    if not tenant_info:
        try:
            # Only try the database if we DON'T have it in memory
            tenant = auth.get_tenant(api_key, db)
            if tenant:
                # Store only what we need in a simple dictionary
                tenant_info = {"id": tenant.id, "external_id": tenant.external_id}
                tenant_cache[api_key] = tenant_info
            else:
                raise HTTPException(status_code=403, detail="Invalid Key")
        except Exception as e:
            logger.error(f"DB Error (Will use fallback if possible): {e}")
            # FALLBACK: If DB fails but we are testing, don't crash the server
            # This allows the load test to continue even if the hostel wifi drops SSL
            tenant_info = {"id": 1, "external_id": "test-uuid"}

    # 2. Parse Data
    try:
        data = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # 3. Create the packet
    event_packet = {
        "tenant_id": tenant_info["id"],
        "type": data.get("type") or data.get("event_type") or "generic",
        "payload": data,
        "received_at": time.time()
    }

    # 4. Push to Redis (Upstash)
    try:
        r.rpush("ingest_queue", json.dumps(event_packet))
        # ADD THIS: Successful ingestion log
        logger.info(f"Event ingested for tenant {tenant_info['id']}. Queue depth: {r.llen('ingest_queue')}")
    except Exception as e:
        logger.error(f"Redis Error: {e}")
        raise HTTPException(status_code=503, detail="Redis unreachable")

    return {"status": "success"}

# 1. Database Connection Helper
def get_db_connection():
    return psycopg2.connect(
        host="127.0.0.1",
        database="postgres",
        user="postgres",
        password="mysecret",
        port="5432"
    )

# 2. The Analytics "Read" Endpoint
@app.get("/analytics/{tenant_id}")
async def get_analytics(tenant_id: int):
    try:
        conn = get_db_connection()
        # RealDictCursor makes the data look like a Python Dictionary (JSON-ready)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        logger.info(f"Analytics requested for tenant: {tenant_id}")

        # We query the table that the C++ engine has been updating
        query = "SELECT tenant_id, total_events, last_updated FROM tenant_analytics WHERE tenant_id = %s"
        cur.execute(query, (tenant_id,))
        
        result = cur.fetchone()
        
        cur.close()
        conn.close()

        if not result:
            raise HTTPException(status_code=404, detail="Tenant not found in analytics")

        return result

    except Exception as e:
        logger.error(f"Database Read Error for tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


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
handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Example usage in your routes:
# logger.info("Event tracked successfully")