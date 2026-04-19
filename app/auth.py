from fastapi import HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session
from .models import Tenant
# We'll set up a 'get_db' helper in main.py soon

API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

def get_tenant(api_key: str, db: Session):
    # In production, we'd hash the key before comparing!
    tenant = db.query(Tenant).filter(Tenant.api_key_hash == api_key).first()
    if not tenant:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return tenant