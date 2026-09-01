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

@router.post("/sync-live-data")
def trigger_live_data_ingestion():
    """
    Triggers live ingestion from IMD/Open-Meteo, WHO GHO, and data.gov.in into BigQuery.
    """
    try:
        from ..scripts.ingest_live_public_data import build_and_ingest_pipeline
        build_and_ingest_pipeline()
        return {
            "status": "SUCCESS",
            "message": "Live public datasets fetched and streamed to Google BigQuery.",
            "sources": [
                "IMD & Open-Meteo Weather Grid",
                "WHO Global Health Observatory",
                "data.gov.in (OGD India)"
            ]
        }
    except Exception as e:
        return {"status": "ERROR", "detail": str(e)}
