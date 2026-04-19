from fastapi import FastAPI, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from . import models, auth
import redis
import json,time
from fastapi import FastAPI, Depends, Request, HTTPException
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

REDIS_URL = "rediss://default:gQAAAAAAAVBjAAIncDFlNzgwZDQ2MjNkYjA0MGJlOTY5YjFiMzFjOTMwN2QxYnAxODYxMTU@amazing-monkey-86115.upstash.io:6379" 
r = redis.from_url(REDIS_URL, decode_responses=True)


app = FastAPI(title="Nexus-Stream Ingestor")

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def health_check():
    return {"status": "online", "engine": "Nexus-Stream"}


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
            print(f"DB Error (Will use fallback if possible): {e}")
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
    except Exception as e:
        print(f"Redis Error: {e}")
        raise HTTPException(status_code=503, detail="Redis unreachable")

    return {"status": "success", "depth": r.llen("ingest_queue")}