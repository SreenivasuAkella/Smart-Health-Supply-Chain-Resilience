import json
import os
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/simulation", tags=["Crisis Stress-Testing Sandbox"])

MEDICINES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "medicines.json")

class CrisisScenarioRequest(BaseModel):
    scenario_type: str  # "DENGUE_OUTBREAK_UP", "BRAHMAPUTRA_FLOOD_ASSAM", "POWER_GRID_FAILURE_PATNA", "HEATWAVE_SURGE_MAHARASHTRA"

@router.post("/trigger-crisis")
def trigger_crisis_scenario(req: CrisisScenarioRequest):
    if req.scenario_type == "DENGUE_OUTBREAK_UP":
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
    elif req.scenario_type == "BRAHMAPUTRA_FLOOD_ASSAM":
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
