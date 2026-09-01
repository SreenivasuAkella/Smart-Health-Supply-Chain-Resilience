from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ..services.reallocation import generate_reallocation_plan

router = APIRouter(tags=["Geospatial Reallocation Optimizer"])

class ReallocationRequest(BaseModel):
    target_facility_id: Optional[str] = "PHC-BARAGAON-03"
    medicine_id: Optional[str] = "MED-ASV-001"
    required_quantity: Optional[int] = None
    requested_quantity: Optional[int] = None
    urgency: Optional[str] = "CRITICAL"

@router.post("/api/reallocation/optimize")
@router.post("/api/reallocation/plan")
def optimize_reallocation(req: ReallocationRequest):
    qty = req.requested_quantity or req.required_quantity or 25
    return generate_reallocation_plan(
        target_facility_id=req.target_facility_id or "PHC-BARAGAON-03",
        medicine_id=req.medicine_id or "MED-ASV-001",
        required_quantity=qty
    )
