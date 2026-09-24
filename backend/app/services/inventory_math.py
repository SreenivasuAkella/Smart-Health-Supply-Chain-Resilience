"""
Unified Clinical Inventory Math & Days-of-Supply (DOS) Engine for Sanjeevani AI.
Standardized across WHO, UNICEF, and MoHFW e-Aushadhi guidelines:
- Evaluates multi-drug Vital/Essential (VEN) bottlenecks.
- Dynamically integrates BigQuery IMD weather & Gemini epidemiological multipliers.
- Normalizes thresholds against facility geographic resupply lead times.
"""

from typing import Dict, Any, List, Optional, Tuple

# Core Life-Saving Vital Medicines (VEN Category V)
VITAL_DRUG_KEYWORDS = [
    "SNAKE", "ANTIVENIN", "ANTIVENOM",
    "RABIES", "IMMUNOGLOBULIN",
    "INSULIN",
    "OXYTOCIN",
    "SODIUM CHLORIDE", "SALINE", "NORMAL SALINE",
    "ARTESUNATE", "ARTEMETHER"
]

def is_vital_medicine(generic_or_name: str) -> bool:
    """Classifies whether a medicine is life-saving non-substitutable (VEN Category V)."""
    text = (generic_or_name or "").upper()
    return any(k in text for k in VITAL_DRUG_KEYWORDS)


def compute_effective_burn_rate(
    drug_name: str,
    daily_footfall: int,
    epidemic_multipliers: Optional[Dict[str, float]] = None
) -> float:
    """
    Computes effective daily consumption burn rate factoring in patient footfall
    and real-time epidemic/weather multipliers from Gemini vector forecasts.
    """
    d_name = (drug_name or "").upper()
    multipliers = epidemic_multipliers or {}

    # Clinical consumption baseline per 100 patient visits
    if any(k in d_name for k in ["SALINE", "SODIUM CHLORIDE", "ORS"]):
        clinical_coef = 1.2
    elif any(k in d_name for k in ["PARACETAMOL", "AZITHROMYCIN", "AMOXICILLIN"]):
        clinical_coef = 1.0
    elif any(k in d_name for k in ["INSULIN", "OXYTOCIN"]):
        clinical_coef = 0.4
    elif any(k in d_name for k in ["SNAKE", "ANTIVENOM", "RABIES"]):
        clinical_coef = 0.15
    else:
        clinical_coef = 0.5

    base_burn = max(0.2, (daily_footfall / 100.0) * clinical_coef)

    # Dynamic epidemic surge scaling
    surge_multiplier = 1.0
    if any(k in d_name for k in ["DENGUE", "SALINE", "ORS", "PARACETAMOL"]):
        surge_multiplier = multipliers.get("dengue", 1.0)
    elif any(k in d_name for k in ["SNAKE", "ANTIVENIN"]):
        surge_multiplier = multipliers.get("flood", 1.0)
    elif any(k in d_name for k in ["MALARIA", "ARTESUNATE"]):
        surge_multiplier = multipliers.get("malaria", 1.0)

    return round(base_burn * surge_multiplier, 2)


def compute_facility_days_of_supply(
    facility: Dict[str, Any],
    medicines: List[Dict[str, Any]],
    epidemic_multipliers: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Computes unified Days of Supply (DOS) and operational status for a facility.
    Identifies the bottleneck vital drug and evaluates lead-time normalized safety ratio.
    """
    fac_id = facility.get("id", "")
    fac_type = facility.get("type", "Primary Health Centre")
    daily_footfall = facility.get("dailyPatientFootfall") or max(10, int(facility.get("bedCapacity", 20) * 8))

    # Lead time: Regional Depots = 0.5d, Urban = 1.0d, Rural PHC = 2.0d, Islands/Remote = 4.5d
    lead_time_days = float(facility.get("resupply_lead_time_days") or (
        4.5 if any(k in (facility.get("district") or "").lower() for k in ["nicobar", "andaman", "ladakh", "leh"]) else
        (0.5 if "hospital" in fac_type.lower() or "depot" in fac_type.lower() else 2.0)
    ))

    # Regional Depots (District Civil Hospitals) maintain statutory regional depot reserves
    if "hospital" in fac_type.lower() or facility.get("status") == "Regional Depot":
        return {
            "status": "Regional Depot",
            "medicine_days_of_supply": 18.5,
            "safety_ratio": round(18.5 / max(0.5, lead_time_days), 2),
            "bottleneck_drug_id": None,
            "bottleneck_drug_name": None,
            "lead_time_days": lead_time_days
        }

    vital_items = []
    general_items = []

    for med in medicines:
        med_id = med.get("id", "")
        med_name = med.get("name", "Medicine")
        stock = med.get("inventoryByFacility", {}).get(fac_id, 0)
        
        burn = compute_effective_burn_rate(med_name, daily_footfall, epidemic_multipliers)
        dos = round(stock / max(0.1, burn), 1)

        item_summary = {
            "medicine_id": med_id,
            "medicine_name": med_name,
            "stock": stock,
            "burn_rate": burn,
            "days_of_supply": dos,
            "is_vital": is_vital_medicine(med_name)
        }

        if item_summary["is_vital"]:
            vital_items.append(item_summary)
        else:
            general_items.append(item_summary)

    # Bottleneck vital item governs the facility health index
    candidates = vital_items if vital_items else general_items
    if candidates:
        bottleneck = min(candidates, key=lambda x: x["days_of_supply"])
        facility_dos = bottleneck["days_of_supply"]
        bottleneck_id = bottleneck["medicine_id"]
        bottleneck_name = bottleneck["medicine_name"]
    else:
        facility_dos = float(facility.get("medicine_days_of_supply", 14.0))
        bottleneck_id = None
        bottleneck_name = None

    # Lead-time normalized safety ratio: DOS / Lead_Time
    safety_ratio = round(facility_dos / max(0.5, lead_time_days), 2)

    # Dynamic status classification
    if safety_ratio <= 1.2 or facility_dos <= 3.0:
        status = "Critical Deficit"   # 🔴 Red
    elif safety_ratio <= 2.5 or facility_dos <= 7.0:
        status = "Warning"            # 🟡 Yellow
    else:
        status = "Optimal"            # 🟢 Green

    return {
        "status": status,
        "medicine_days_of_supply": facility_dos,
        "safety_ratio": safety_ratio,
        "bottleneck_drug_id": bottleneck_id,
        "bottleneck_drug_name": bottleneck_name,
        "lead_time_days": lead_time_days
    }
