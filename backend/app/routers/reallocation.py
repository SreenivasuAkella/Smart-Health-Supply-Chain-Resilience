from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ..services.reallocation import generate_reallocation_plan

router = APIRouter(prefix="/api/reallocation", tags=["Geospatial Reallocation Optimizer"])

class ReallocationRequest(BaseModel):
    target_facility_id: str = "PHC-BARAGAON-03"
    medicine_id: str = "MED-ASV-001"
    required_quantity: int = 25

@router.post("/optimize")
def optimize_reallocation(req: ReallocationRequest):
    return generate_reallocation_plan(
        target_facility_id=req.target_facility_id,
        medicine_id=req.medicine_id,
        required_quantity=req.required_quantity
    )
