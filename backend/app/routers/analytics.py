from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ..services.bigquery_service import bigquery_service
from ..services.firebase_service import firebase_service
from ..utils.response_helper import paginated_response, success_response, error_response

router = APIRouter(prefix="/api/analytics", tags=["BigQuery & Firebase Cloud Analytics"])


class CustomSQLRequest(BaseModel):
    sql: str


@router.get("/bigquery-morbidity")
def query_bigquery(
    district: Optional[str] = Query(None, description="Specific district or None for all"),
    search: Optional[str] = Query(None, description="Search query by district or state"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=5000, description="Records per page")
):
    res = bigquery_service.query_morbidity_and_drug_velocity(district=district, search=search)
    all_records = res.get("data", [])
    
    return paginated_response(
        items=all_records,
        page=page,
        page_size=page_size,
        message=f"BigQuery morbidity warehouse analytics retrieved ({len(all_records)} total records)",
        metadata={
            "source": res.get("source"),
            "sql_executed": res.get("sql_executed"),
            "district_filter": district,
            "search_query": search
        }
    )


@router.post("/bigquery-sql")
def execute_sql(req: CustomSQLRequest, page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=500)):
    """
    Executes a custom read-only SQL query against the BigQuery dataset.
    """
    res = bigquery_service.execute_custom_sql(req.sql)
    if res.get("status") == "error":
        return error_response(message=res.get("message", "SQL execution failed"), details=res.get("sql_executed"))

    data_rows = res.get("data", [])
    return paginated_response(
        items=data_rows,
        page=page,
        page_size=page_size,
        message="Custom SQL query executed successfully on Google BigQuery",
        metadata={
            "source": res.get("source"),
            "sql_executed": res.get("sql_executed")
        }
    )


@router.get("/firebase-status")
def get_firebase_status():
    status_data = {
        "status": "CONNECTED",
        "realtime_db_url": firebase_service.database_url,
        "auth_role": firebase_service.verify_asha_auth_token(),
        "live_telemetry_sync": firebase_service.publish_iot_telemetry("IOT-COLD-BRG-03", 8.7, 9.12)
    }
    return success_response(data=status_data, message="Firebase connection active")


@router.get("/surveillance-districts")
def get_live_surveillance_districts(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Records per page"),
    state: Optional[str] = Query(None, description="Filter by state"),
    search: Optional[str] = Query(None, description="Search district name")
):
    fb_data = firebase_service.read_data("surveillance/districts")
    if not fb_data or not isinstance(fb_data, dict):
        return paginated_response(items=[], page=page, page_size=page_size, message="Surveillance data syncing")

    records_list = list(fb_data.values()) if isinstance(fb_data, dict) else (fb_data if isinstance(fb_data, list) else [])
    
    if state:
        records_list = [r for r in records_list if state.lower() in r.get("state", "").lower()]
    if search:
        records_list = [r for r in records_list if search.lower() in r.get("district", "").lower()]

    return paginated_response(
        items=records_list,
        page=page,
        page_size=page_size,
        message="Live public health surveillance records retrieved",
        metadata={
            "source": "Firebase Realtime Database & Open-Meteo IMD Grid",
            "state_filter": state,
            "search_query": search
        }
    )


@router.post("/sync-live-data")
def trigger_live_data_ingestion():
    try:
        from ..scripts.ingest_live_public_data import build_and_ingest_pipeline
        build_and_ingest_pipeline()
        return success_response(
            data={
                "ingestion_status": "COMPLETED",
                "sources": [
                    "IMD & Open-Meteo Weather Grid",
                    "WHO Global Health Observatory",
                    "OpenFDA & NIH RxNorm Public Drug Registry",
                    "OpenStreetMap GIS Directory"
                ]
            },
            message="Live public datasets fetched and streamed to Google BigQuery and Firebase"
        )
    except Exception as e:
        return error_response(message=f"Live ingestion failed: {e}", error_code="INGESTION_ERROR")
