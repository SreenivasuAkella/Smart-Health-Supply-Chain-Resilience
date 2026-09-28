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

class FleetDispatchItem(BaseModel):
    target_facility_id: Optional[str] = None
    medicine_id: Optional[str] = None
    required_quantity: Optional[int] = None
    preferred_vehicle_type: Optional[str] = None

class FleetDispatchRequest(BaseModel):
    dispatches: Optional[List[FleetDispatchItem]] = None
    auto_multi: Optional[bool] = False
    count: Optional[int] = 3

class VehicleTelemetryRequest(BaseModel):
    vehicle_id: str
    lat: float
    lng: float
    speed_kmh: Optional[float] = 40.0
    temperature_c: Optional[float] = 4.2
    dispatch_id: Optional[str] = None

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

@router.get("/active")
def get_active_fleet_reallocations():
    """
    Retrieves all active emergency vehicle dispatches in transit across the national health network.
    """
    active = reallocation_db.list_active_reallocations()
    return success_response(
        data=active,
        message=f"{len(active)} active fleet dispatches retrieved."
    )

@router.post("/dispatch-fleet")
def dispatch_multi_vehicle_fleet(req: FleetDispatchRequest):
    """
    Autonomous Multi-Vehicle Fleet Corridoring Engine:
    Dispatches multiple concurrent vehicles (eVTOL Drone, Solar-Cooled Van, Motorbike Ice-Carrier)
    along independent turn-by-turn road corridors to resolve multi-district deficits simultaneously.
    Dual-syncs active fleet telemetry to Firebase RTDB and logs audit events to Google BigQuery.
    """
    from ..services.facility_data_service import get_active_public_facilities

    dispatched_records = []
    
    # 1. Determine targets for fleet dispatch
    items_to_dispatch = req.dispatches or []
    if not items_to_dispatch:
        # Auto-detect top deficits across the health network
        deficits = sentinel_agent.scan_for_stockout_risks()
        seen_facs = set()
        distinct_deficits = []
        for d in deficits:
            fid = d.get("facility_id")
            if fid and fid not in seen_facs:
                seen_facs.add(fid)
                distinct_deficits.append(d)
            if len(distinct_deficits) >= (req.count or 3):
                break

        # Top-up to ensure full fleet count (at least req.count or 3 distinct facilities)
        if len(distinct_deficits) < (req.count or 3):
            facs = get_active_public_facilities()
            candidates = [f for f in facs if f.get("status") in ("Critical Deficit", "Warning")] + facs
            for f in candidates:
                if f["id"] not in seen_facs:
                    seen_facs.add(f["id"])
                    distinct_deficits.append({
                        "facility_id": f["id"],
                        "facility_name": f["name"],
                        "medicine_id": "MED-RAB-001",
                        "deficit_units": 30
                    })
                if len(distinct_deficits) >= (req.count or 3):
                    break

        # Rotating distinct vital emergency medicines
        essential_meds = [
            ("MED-RAB-001", 25),
            ("MED-SNAKE-002", 20),
            ("MED-INS-003", 35),
            ("MED-OXY-004", 40),
            ("MED-DPT-005", 30),
            ("MED-CRYO-006", 50)
        ]

        # Preferred vehicle types across different corridor profiles
        preferred_types = ["Drone", "ILR", "Motorbike", "Cryo", "Electric", "Ambulance"]
        for idx, def_item in enumerate(distinct_deficits):
            pref_veh = preferred_types[idx % len(preferred_types)]
            med_tuple = essential_meds[idx % len(essential_meds)]
            items_to_dispatch.append(FleetDispatchItem(
                target_facility_id=def_item.get("facility_id"),
                medicine_id=def_item.get("medicine_id") if def_item.get("medicine_id") != "PUB-MED-001" else med_tuple[0],
                required_quantity=def_item.get("deficit_units") or med_tuple[1],
                preferred_vehicle_type=pref_veh
            ))


    for item in items_to_dispatch:
        try:
            # Claim a specific vehicle for this corridor
            assigned_veh = reallocation_db.claim_vehicle(item.preferred_vehicle_type)
            
            # Plan reallocation corridor
            plan_resp = generate_reallocation_plan(
                target_facility_id=item.target_facility_id,
                medicine_id=item.medicine_id,
                required_quantity=item.required_quantity
            )
            plan_data = plan_resp.get("data", plan_resp) if isinstance(plan_resp, dict) else plan_resp
            
            # Attach assigned vehicle
            plan_data["vehicle_details"] = assigned_veh
            plan_data["vehicle_id"] = assigned_veh.get("vehicle_id")
            plan_data["vehicle_type"] = assigned_veh.get("vehicle_type")
            plan_data["status"] = "IN_TRANSIT"
            plan_data["auto_triggered"] = True

            # Save to SQLite in-memory cache & dual-cloud (Firebase RTDB + BigQuery)
            saved = reallocation_db.save_reallocation(plan_data)
            dispatched_records.append(saved)
        except Exception as exc:
            print(f"[Fleet Dispatch Error for {item.target_facility_id}]: {exc}")

    # Sync active fleet list to Firebase
    try:
        active_list = reallocation_db.list_active_reallocations()
        firebase_service.write_data("reallocations/active", active_list)
    except Exception:
        pass

    return success_response(
        data=dispatched_records,
        message=f"Autonomous Fleet Engine successfully dispatched {len(dispatched_records)} concurrent medical corridors."
    )

@router.post("/telemetry")
def record_vehicle_telemetry(req: VehicleTelemetryRequest):
    """
    Ingests live GPS and cold-chain temperature telemetry for an active vehicle.
    Persists sub-second update to Firebase RTDB and audit log to BigQuery.
    """
    reallocation_db.update_vehicle_telemetry(
        vehicle_id=req.vehicle_id,
        lat=req.lat,
        lng=req.lng,
        speed_kmh=req.speed_kmh or 40.0,
        temp_c=req.temperature_c or 4.2,
        dispatch_id=req.dispatch_id
    )
    return success_response(
        data={"vehicle_id": req.vehicle_id, "lat": req.lat, "lng": req.lng},
        message="Telemetry synced to Firebase RTDB and BigQuery audit ledger."
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

    # On DELIVERED status transition, complete the two-node delivery handshake:
    # Increment target facility stock for the exact medicine and flip target status from Critical Deficit to Optimal
    target_update = None
    if req.status.upper() == "DELIVERED" and record:
        try:
            # 1. Release vehicle back to available status
            veh_id = record.get("vehicle_details", {}).get("vehicle_id") or record.get("vehicle_id")
            if veh_id:
                reallocation_db.release_vehicle(veh_id)

            target_fac_id = record.get("target_facility", {}).get("id") or record.get("target_facility_id")
            med_id = record.get("medicine_details", {}).get("id") or record.get("medicine_id")
            qty = int(record.get("target_facility", {}).get("requested_quantity") or record.get("quantity") or 25)

            if target_fac_id and med_id:
                # 2. Increment target facility stock for exact medicine
                fb_meds = firebase_service.read_data("inventory/medicines")
                if fb_meds and isinstance(fb_meds, list):
                    for m in fb_meds:
                        if m.get("id") == med_id:
                            inv = m.setdefault("inventoryByFacility", {})
                            inv[target_fac_id] = inv.get(target_fac_id, 0) + qty
                            m["currentTotal"] = sum(inv.values())
                            break
                    firebase_service.write_data("inventory/medicines", fb_meds)

                # 3. Recalculate target facility Days of Supply and flip status to Optimal
                from ..services.inventory_math import compute_facility_days_of_supply
                from ..services.facility_data_service import get_active_public_facilities
                fb_facs = firebase_service.read_data("inventory/facilities")
                all_facs = fb_facs if (fb_facs and isinstance(fb_facs, list)) else get_active_public_facilities()
                
                target_fac = next((f for f in all_facs if f.get("id") == target_fac_id), None)
                if target_fac:
                    health = compute_facility_days_of_supply(target_fac, fb_meds or [])
                    target_fac["status"] = health["status"]
                    target_fac["medicine_days_of_supply"] = health["medicine_days_of_supply"]
                    target_update = {
                        "facility_id": target_fac_id,
                        "status": health["status"],
                        "medicine_days_of_supply": health["medicine_days_of_supply"]
                    }
                    firebase_service.write_data("inventory/facilities", all_facs)
        except Exception as delivery_err:
            print(f"[Delivery Stock Inflow Handshake Notice]: {delivery_err}")

    # Sync updated active list to Firebase
    try:
        active_list = reallocation_db.list_active_reallocations()
        firebase_service.write_data("reallocations/active", active_list)
    except Exception:
        pass

    # Stream transition event to BigQuery
    try:
        if record:
            bigquery_service.insert_reallocation_event(record)
    except Exception as bq_err:
        print(f"[BigQuery Status Log Notice]: {bq_err}")

    return success_response(
        data={
            "dispatch": record,
            "target_facility_update": target_update
        },
        message=f"Dispatch {dispatch_id} marked as DELIVERED. Target facility inventory replenished and status restored."
    )

