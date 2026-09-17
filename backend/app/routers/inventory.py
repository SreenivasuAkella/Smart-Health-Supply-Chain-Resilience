import json
import os
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from ..services.firebase_service import firebase_service
from ..services.bigquery_service import bigquery_service
from ..services.medicine_data_service import generate_public_modeled_inventory, NLEM_ESSENTIAL_DRUGS
from ..services.facility_data_service import get_active_public_facilities
from ..utils.response_helper import paginated_response, success_response, error_response

router = APIRouter(prefix="/api/inventory", tags=["Inventory & Facilities"])

MEDICINES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "medicines.json")
CONNECTORS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "public_data_connectors.json")

class StockUpdateRequest(BaseModel):
    facility_id: str
    medicine_id: str
    quantity_change: int
    reason: str


@router.get("/facilities")
def get_all_facilities(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=5000, description="Records per page"),
    state: Optional[str] = Query(None, description="Filter by state"),
    district: Optional[str] = Query(None, description="Filter by district"),
    search: Optional[str] = Query(None, description="Search by facility name"),
    status: Optional[str] = Query(None, description="Filter by status (CRITICAL, MODERATE, BED_SURGE)")
):
    # 1. Fetch from Firebase cache if available, or fallback to OSM directory
    fb_facs = firebase_service.read_data("inventory/facilities")
    facs = fb_facs if (fb_facs and isinstance(fb_facs, list) and len(fb_facs) > 0) else get_active_public_facilities()

    # Precalculate national aggregates from the complete 1,188 facility network
    total_facs_count = len(facs)
    national_aggregates = {
        "total_facilities": total_facs_count,
        "critical_deficits": sum(1 for f in facs if f.get("status") == "Critical Deficit"),
        "moderate_deficits": sum(1 for f in facs if f.get("status") == "Moderate Deficit"),
        "total_beds": sum(f.get("bedCapacity", 20) for f in facs),
        "occupied_beds": sum(f.get("bedsOccupied", 15) for f in facs),
        "oxygen_beds": sum(f.get("oxygenBedsAvailable", 5) for f in facs),
        "icu_beds": sum(f.get("icuBedsAvailable", 2) for f in facs),
        "doctors_on_duty": sum(f.get("doctorsOnDuty", 1) for f in facs),
        "doctors_total": sum(f.get("doctorsTotal", 2) for f in facs),
        "nurses_on_duty": sum(f.get("nursesOnDuty", 3) for f in facs),
        "asha_active": sum(f.get("ashaActiveCount", 10) for f in facs),
        "daily_patient_footfall": sum(f.get("dailyPatientFootfall", 120) for f in facs)
    }

    # Apply filters
    filtered = facs
    if state:
        filtered = [f for f in filtered if state.lower() in f.get("state", "").lower()]
    if district:
        filtered = [f for f in filtered if district.lower() in f.get("district", "").lower()]
    if search:
        s = search.lower()
        filtered = [
            f for f in filtered 
            if s in f.get("name", "").lower() or s in f.get("id", "").lower() or s in f.get("district", "").lower() or s in f.get("state", "").lower()
        ]
    if status and status != 'ALL':
        st = status.upper()
        if st in ('CRITICAL', 'CRITICAL DEFICIT'):
            filtered = [f for f in filtered if f.get("status") == "Critical Deficit"]
        elif st in ('MODERATE', 'MODERATE DEFICIT'):
            filtered = [f for f in filtered if f.get("status") == "Moderate Deficit"]
        elif st == 'BED_SURGE':
            filtered = [f for f in filtered if f.get("bedCapacity") and (f.get("bedsOccupied", 0) / max(1, f.get("bedCapacity", 1))) > 0.85]

    return paginated_response(
        items=filtered,
        page=page,
        page_size=page_size,
        message="Healthcare facilities retrieved successfully",
        metadata={
            "source": "OpenStreetMap / National Health Registry (BigQuery & Firebase)",
            "state_filter": state,
            "district_filter": district,
            "search_query": search,
            "status_filter": status,
            "national_aggregates": national_aggregates
        }
    )


@router.get("/medicines")
def get_all_medicines(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=5000, description="Records per page"),
    search: Optional[str] = Query(None, description="Search medicine or active ingredient")
):
    # 1. Attempt to fetch live from Firebase Realtime Database
    fb_medicines = firebase_service.read_data("inventory/medicines")
    if fb_medicines and isinstance(fb_medicines, list) and len(fb_medicines) > 0:
        medicines = fb_medicines
    else:
        facilities = get_active_public_facilities()
        bq_vuln = bigquery_service.get_live_district_vulnerabilities()
        live_districts = bq_vuln.get("districts", {})
        medicines = generate_public_modeled_inventory(live_districts, facilities)
        firebase_service.write_data("inventory/medicines", medicines)

    filtered = medicines
    if search:
        filtered = [
            m for m in filtered
            if search.lower() in m.get("name", "").lower() or
               search.lower() in m.get("generic_name", "").lower() or
               search.lower() in m.get("brand_name", "").lower()
        ]

    return paginated_response(
        items=filtered,
        page=page,
        page_size=page_size,
        message="Essential medicines catalog retrieved successfully",
        metadata={
            "source": "Live OpenFDA Drug Label Registry analyzed by Google Gemini AI",
            "search_query": search
        }
    )


@router.get("/public-connectors")
def get_public_data_connectors():
    if os.path.exists(CONNECTORS_PATH):
        with open(CONNECTORS_PATH, "r") as f:
            connectors = json.load(f)
    else:
        connectors = {}
    return success_response(data=connectors, message="Public data connectors status retrieved")


@router.post("/update-stock")
def update_stock(req: StockUpdateRequest):
    fb_medicines = firebase_service.read_data("inventory/medicines")
    medicines = fb_medicines if (fb_medicines and isinstance(fb_medicines, list)) else []
        
    found = False
    new_val = 0
    updated_med = None
    for med in medicines:
        if med.get("id") == req.medicine_id:
            curr = med.get("inventoryByFacility", {}).get(req.facility_id, 0)
            new_val = max(0, curr + req.quantity_change)
            if "inventoryByFacility" not in med:
                med["inventoryByFacility"] = {}
            med["inventoryByFacility"][req.facility_id] = new_val
            med["currentTotal"] = sum(med["inventoryByFacility"].values())
            found = True
            updated_med = med
            break
            
    if not found:
        return error_response(message=f"Medicine {req.medicine_id} not found in active inventory", error_code="NOT_FOUND")
        
    firebase_service.write_data("inventory/medicines", medicines)
    return success_response(
        data={
            "facility_id": req.facility_id,
            "medicine_id": req.medicine_id,
            "new_stock": new_val,
            "reason": req.reason,
            "medicine": updated_med
        },
        message="Stock level updated in Firebase Realtime Database"
    )
