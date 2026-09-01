import json
import os
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["Crisis Stress-Testing Sandbox"])

class CrisisScenarioRequest(BaseModel):
    scenario_type: Optional[str] = None
    crisis_type: Optional[str] = None
    target_facility_id: Optional[str] = "PHC-BARAGAON-03"
    severity: Optional[str] = "HIGH"
    grid_failure: Optional[bool] = True

@router.post("/api/simulation/crisis-sandbox")
@router.post("/api/simulation/trigger-crisis")
def trigger_crisis_scenario(req: CrisisScenarioRequest):
    stype = req.crisis_type or req.scenario_type or "DENGUE_OUTBREAK_UP"
    if "DENGUE" in stype.upper() or "VECTOR" in stype.upper():
        return {
            "scenario": "Dengue Surge Crisis in Eastern UP (Varanasi/Chandauli)",
            "impact_summary": "450% surge in pediatric hospital admissions. Ringer Lactate & IV fluids daily burn increased 5x.",
            "affected_facilities": ["PHC-BARAGAON-03", "PHC-PINDRA-04", "CHC-CHOLAPUR-02"],
            "critical_shortage_items": ["MED-IVF-004 (Ringer Lactate)", "MED-ORS-005 (ORS Sachets)"],
            "ai_action_plan": [
                "Reallocated 2,000 IV infusion bottles from NMCH Patna buffer repository",
                "Automated fast-track green corridor route via NH-19 (ETA 3.2 hrs)",
                "Dispatched WhatsApp/SMS advisories to 140 ASHA cluster leaders in Bhojpuri & Hindi"
            ]
        }
    elif "FLOOD" in stype.upper() or "ASSAM" in stype.upper():
        return {
            "scenario": "Severe Monsoon Inundation in Morigaon & Brahmaputra Basin",
            "impact_summary": "Submerged road access to riverine PHCs. High risk of snake bites & waterborne gastroenteritis.",
            "affected_facilities": ["PHC-MORIGAON-08"],
            "critical_shortage_items": ["MED-ASV-001 (Anti-Snake Venom)", "MED-ART-006 (Artesunate Malaria)"],
            "ai_action_plan": [
                "Emergency drone / mechanized boat dispatch of 40 ASV vials from Guwahati State Depot",
                "Solar Direct Drive (SDD) cold-chain protocol activated for flood relief camps",
                "ISRO Bhuvan satellite flood boundary overlay fed to route dispatch agent"
            ]
        }
    else:
        return {
            "scenario": "Cold Storage Power Grid Disruption",
            "impact_summary": "Thermal excursion event detected. Ambient temp 41°C. ILR battery reserve at 38%.",
            "affected_facilities": ["PHC-BARAGAON-03"],
            "critical_shortage_items": ["MED-ARV-002 (Rabies Vaccines)", "MED-INS-003 (Insulin)"],
            "ai_action_plan": [
                "Dispatched district mobile refrigeration van from DH Varanasi",
                "Triggered Mean Kinetic Temperature degradation watchdog alert",
                "Automated transfer of temperature-sensitive biologics to CHC Cholapur"
            ]
        }
