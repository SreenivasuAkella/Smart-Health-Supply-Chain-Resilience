import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List

router = APIRouter(prefix="/api/inventory", tags=["Inventory & Facilities"])

FACILITIES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "facilities.json")
MEDICINES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "medicines.json")
CONNECTORS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "public_data_connectors.json")

class StockUpdateRequest(BaseModel):
    facility_id: str
    medicine_id: str
    quantity_change: int
    reason: str

@router.get("/facilities")
def get_all_facilities():
    with open(FACILITIES_PATH, "r") as f:
        return json.load(f)

@router.get("/medicines")
def get_all_medicines():
    with open(MEDICINES_PATH, "r") as f:
        return json.load(f)

@router.get("/public-connectors")
def get_public_data_connectors():
    with open(CONNECTORS_PATH, "r") as f:
        return json.load(f)

@router.post("/update-stock")
def update_stock(req: StockUpdateRequest):
    with open(MEDICINES_PATH, "r") as f:
        medicines = json.load(f)
        
    found = False
    for med in medicines:
        if med["id"] == req.medicine_id:
            curr = med["inventoryByFacility"].get(req.facility_id, 0)
            new_val = max(0, curr + req.quantity_change)
            med["inventoryByFacility"][req.facility_id] = new_val
            med["currentTotal"] = sum(med["inventoryByFacility"].values())
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Medicine ID not found")
        
    with open(MEDICINES_PATH, "w") as f:
        json.dump(medicines, f, indent=2)
        
    return {"status": "SUCCESS", "message": f"Updated stock for {req.medicine_id} at {req.facility_id}", "new_balance": new_val}
