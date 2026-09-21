from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ..services.reallocation import generate_reallocation_plan
from ..services.database_service import reallocation_db
from ..services.ai_agents_service import run_auto_relocation_pipeline, sentinel_agent
from ..services.firebase_service import firebase_service
from ..services.bigquery_service import bigquery_service
from ..utils.response_helper import success_response, error_response
from .auth import require_role

router = APIRouter(prefix="/api/reallocation", tags=["Autonomous Reallocation & Route Optimizer"])

class ReallocationRequest(BaseModel):
    target_facility_id: Optional[str] = None
    medicine_id: Optional[str] = None
    required_quantity: Optional[int] = None
    requested_quantity: Optional[int] = None
    urgency: Optional[str] = "CRITICAL"

class StatusUpdateRequest(BaseModel):
    status: str

@router.post("/optimize")
@router.post("/plan")
def optimize_reallocation(req: ReallocationRequest):
    """
    Computes an optimal reallocation proposal between surplus donor and target node.
    Runs the multi-agent AI pipeline (Sentinel -> Strategist -> Fleet -> Supervisor)
    with turn-by-turn road navigation, Vertex AI velocity analysis, and cold-chain safety.
    """
    qty = req.requested_quantity or req.required_quantity
    try:
        record = run_auto_relocation_pipeline(
            target_facility_id=req.target_facility_id,
            medicine_id=req.medicine_id,
            required_quantity=qty,
            auto_triggered=False
        )
        return success_response(
            data=record,
            message=f"Autonomous AI agent route and reallocation plan generated for {record.get('target_facility_name', 'Emergency Node')}."
        )
    except Exception as e:
        # Fallback to local road planner
        # generate_reallocation_plan returns a success_response wrapper — unwrap data
        plan_resp = generate_reallocation_plan(
            target_facility_id=req.target_facility_id,
            medicine_id=req.medicine_id,
            required_quantity=qty
        )
        plan_data = plan_resp.get("data", plan_resp) if isinstance(plan_resp, dict) else plan_resp
        if isinstance(plan_data, dict) and "dispatch_id" in plan_data:
            reallocation_db.save_reallocation(plan_data)
            try:
                firebase_service.write_data(f"reallocations/{plan_data['dispatch_id']}", plan_data)
                firebase_service.write_data("reallocations/latest", plan_data)
            except Exception:
                pass
            try:
                bigquery_service.insert_reallocation_event(plan_data)
            except Exception:
                pass
        return success_response(
            data=plan_data,
            message=f"Reallocation plan generated (local engine fallback)."
        )

@router.post("/dispatch", dependencies=[Depends(require_role(["NATIONAL_DIRECTOR", "LOGISTICS_COORDINATOR"]))])
def confirm_dispatch(req: ReallocationRequest):
    """
    Confirms and authorizes emergency dispatch.
    Runs the multi-agent pipeline, decrements donor inventory, and persists full details to SQLite DB.
    """
    qty = req.requested_quantity or req.required_quantity or 25
    record = run_auto_relocation_pipeline(
        target_facility_id=req.target_facility_id,
        medicine_id=req.medicine_id,
        required_quantity=qty,
        auto_triggered=False
    )
    return success_response(
        data=record,
        message=f"Dispatch {record.get('dispatch_id')} authorized and logged to database."
    )

@router.post("/auto-relocate", dependencies=[Depends(require_role(["NATIONAL_DIRECTOR", "LOGISTICS_COORDINATOR"]))])
def run_autonomous_relocation():
    """
    Autonomous AI Sentinel Trigger:
    Scans entire healthcare facility network for critical deficits, detects highest-risk facility,
    matches nearest surplus donor, calculates road route and vehicle distance, and commits record to DB.
    """
    record = run_auto_relocation_pipeline(auto_triggered=True)
    return success_response(
        data=record,
        message="Autonomous AI Sentinel triggered: emergency stock corridor dispatched."
    )

@router.get("/history")
def get_reallocation_history(
    limit: int = Query(50, ge=1, le=200, description="Max records to retrieve"),
    status: Optional[str] = Query(None, description="Filter by status (e.g. APPROVED, IN_TRANSIT, DELIVERED)"),
    search: Optional[str] = Query(None, description="Search by facility, dispatch ID, or drug"),
    source: Optional[str] = Query("sqlite", description="Storage source: 'sqlite' (local cache) or 'bigquery' (national audit warehouse)")
):
    """
    Retrieves historical and active reallocations from persistent SQLite database
    or live Google BigQuery national health data warehouse.
    """
    if source == "bigquery":
        bq_records = bigquery_service.list_reallocation_events(limit=limit)
        return success_response(
            data=bq_records,
            message=f"Retrieved {len(bq_records)} national reallocation audit records from Google BigQuery."
        )

    history = reallocation_db.list_reallocations(limit=limit, status=status, search=search)
    return success_response(
        data=history,
        message=f"Retrieved {len(history)} reallocation records from local database."
    )

@router.get("/vehicles")
def get_vehicle_fleet():
    """
    Retrieves the registered emergency medical vehicle fleet and status telemetry.
    """
    fleet = reallocation_db.get_vehicle_fleet()
    return success_response(
        data=fleet,
        message="Active emergency vehicle fleet retrieved."
    )

@router.get("/sentinel-risks")
def get_sentinel_risks():
    """
    Returns live facilities identified by the Stockout Sentinel Agent as high stockout risk.
    """
    risks = sentinel_agent.scan_for_stockout_risks()
    return success_response(
        data=risks,
        message=f"Sentinel Agent scanned {len(risks)} active facilities at stockout risk."
    )

@router.get("/{dispatch_id}")
def get_single_reallocation(dispatch_id: str):
    """
    Retrieves full details of a single dispatch by ID including complete road route coordinates.
    """
    record = reallocation_db.get_reallocation(dispatch_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Dispatch ID {dispatch_id} not found in database.")
    return success_response(data=record, message="Reallocation record retrieved.")

@router.patch("/{dispatch_id}/status")
def update_status(dispatch_id: str, req: StatusUpdateRequest):
    """
    Updates delivery lifecycle status (e.g. IN_TRANSIT, DELIVERED).
    Synchronizes instantly with Firebase Realtime Database for live frontend map tracking
    and logs the status transition to BigQuery.
    """
    success = reallocation_db.update_reallocation_status(dispatch_id, req.status)
    if not success:
        raise HTTPException(status_code=404, detail=f"Dispatch ID {dispatch_id} not found.")
    record = reallocation_db.get_reallocation(dispatch_id)

    # Sync status transition to Firebase Realtime DB
    try:
        firebase_service.write_data(f"reallocations/{dispatch_id}/status", req.status)
        if record:
            firebase_service.write_data(f"reallocations/{dispatch_id}", record)
            firebase_service.write_data("reallocations/latest", record)
    except Exception as fb_err:
        print(f"[Firebase Status Sync Notice]: {fb_err}")

    # Stream transition event to BigQuery
    try:
        if record:
            bigquery_service.insert_reallocation_event(record)
    except Exception as bq_err:
        print(f"[BigQuery Status Log Notice]: {bq_err}")

    return success_response(data=record, message=f"Dispatch {dispatch_id} status updated to {req.status}")
