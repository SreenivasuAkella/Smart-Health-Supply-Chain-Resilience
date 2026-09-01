from fastapi import APIRouter
from typing import Optional
from ..services.bigquery_service import bigquery_service
from ..services.firebase_service import firebase_service

router = APIRouter(prefix="/api/analytics", tags=["BigQuery & Firebase Cloud Analytics"])

@router.get("/bigquery-morbidity")
def query_bigquery(district: Optional[str] = "Varanasi"):
    return bigquery_service.query_morbidity_and_drug_velocity(district or "Varanasi")

@router.get("/firebase-status")
def get_firebase_status():
    return {
        "status": "CONNECTED",
        "realtime_db_url": firebase_service.database_url,
        "auth_role": firebase_service.verify_asha_auth_token(),
        "live_telemetry_sync": firebase_service.publish_iot_telemetry("IOT-COLD-BRG-03", 8.7, 9.12)
    }
