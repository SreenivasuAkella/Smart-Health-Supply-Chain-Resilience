from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ..services.reallocation import generate_reallocation_plan
from ..services.database_service import reallocation_db
from ..services.ai_agents_service import run_auto_relocation_pipeline, sentinel_agent
from ..utils.response_helper import success_response, error_response

router = APIRouter(prefix="/api/reallocation", tags=["Autonomous Reallocation & Route Optimizer"])

class ReallocationRequest(BaseModel):
    target_facility_id: Optional[str] = "PHC-BARAGAON-03"
    medicine_id: Optional[str] = "MED-ASV-001"
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
    qty = req.requested_quantity or req.required_quantity or 25
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
        plan = generate_reallocation_plan(
            target_facility_id=req.target_facility_id or "PHC-BARAGAON-03",
            medicine_id=req.medicine_id or "MED-ASV-001",
            required_quantity=qty
        )
        return plan

@router.post("/dispatch")
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

@router.post("/auto-relocate")
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
    search: Optional[str] = Query(None, description="Search by facility, dispatch ID, or drug")
):
    """
    Retrieves historical and active reallocations from persistent SQLite database.
    """
    history = reallocation_db.list_reallocations(limit=limit, status=status, search=search)
    return success_response(
        data=history,
        message=f"Retrieved {len(history)} reallocation records from database."
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
    """
    success = reallocation_db.update_reallocation_status(dispatch_id, req.status)
    if not success:
        raise HTTPException(status_code=404, detail=f"Dispatch ID {dispatch_id} not found.")
    record = reallocation_db.get_reallocation(dispatch_id)
    return success_response(data=record, message=f"Dispatch {dispatch_id} status updated to {req.status}")
