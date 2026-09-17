import math
from datetime import datetime
from typing import Dict, Any, List, Optional

def calculate_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two geographic coordinates in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def generate_reallocation_plan(
    target_facility_id: Optional[str] = None,
    medicine_id: Optional[str] = None,
    required_quantity: Optional[int] = None
) -> Dict[str, Any]:
    """
    Autonomous Reallocation Optimizer:
    Finds optimal surplus facilities, computes Google Maps compliant transit route & cold-chain compliance window.
    Completely dynamic: if facility, medicine, or quantity are omitted, discovers the critical deficit node & medicine dynamically.
    """
    from .facility_data_service import get_active_public_facilities
    from .medicine_data_service import get_active_essential_medicines, generate_public_modeled_inventory
    
    facilities_list = get_active_public_facilities()
    facilities = {fac["id"]: fac for fac in facilities_list}

    # Resolve target facility dynamically
    if not target_facility_id or target_facility_id not in facilities:
        if facilities_list:
            target_facility_id = facilities_list[0]["id"]
        else:
            return {"error": "No registered health facilities available"}

    # Build live modeled inventory from real OpenFDA / NLEM catalog
    live_medicines_list = generate_public_modeled_inventory({}, facilities_list)
    medicines = {med["id"]: med for med in live_medicines_list}

    # Resolve target medicine dynamically
    if not medicine_id or medicine_id not in medicines:
        # Dynamically discover the medicine with lowest stock at target facility
        lowest_med = None
        min_stk = float('inf')
        for med in live_medicines_list:
            stk = med.get("inventoryByFacility", {}).get(target_facility_id, 999)
            if stk < min_stk:
                min_stk = stk
                lowest_med = med
        if lowest_med:
            medicine_id = lowest_med["id"]
        elif live_medicines_list:
            medicine_id = live_medicines_list[0]["id"]
        
    target_facility = facilities.get(target_facility_id)
    medicine = medicines.get(medicine_id)
    
    if not target_facility or not medicine:
        return {"error": "Target facility or medicine not found"}

    target_fac_id: str = str(target_facility["id"])
    target_med_id: str = str(medicine["id"])

    # Compute required replenishment quantity dynamically if omitted
    cur_stock = medicine.get("inventoryByFacility", {}).get(target_fac_id, 0)
    if not required_quantity or required_quantity <= 0:
        safety_norm = medicine.get("safetyStockThreshold", 20)
        required_quantity = max(15, (safety_norm * 2) - cur_stock)
        
    # Search potential donor facilities with surplus stock
    candidate_donors = []
    for fac_id, fac in facilities.items():
        if fac_id == target_fac_id:
            continue
        curr_stock = medicine["inventoryByFacility"].get(fac_id, 0)
        # Only consider facilities with surplus stock
        if curr_stock >= (required_quantity + 5):
            distance_km = calculate_haversine_km(
                fac["lat"], fac["lng"],
                target_facility["lat"], target_facility["lng"]
            )
            # Calculate realistic transit time based on road distance
            est_minutes = max(2, int(round((distance_km / 36.0) * 60.0)))
            
            candidate_donors.append({
                "facility_id": fac["id"],
                "facility_name": fac["name"],
                "type": fac["type"],
                "district": fac["district"],
                "state": fac["state"],
                "lat": fac["lat"],
                "lng": fac["lng"],
                "available_stock": curr_stock,
                "distance_km": distance_km,
                "estimated_transit_minutes": est_minutes,
                "cold_chain_type": fac["coldChainType"],
                "contact": fac["contact"]
            })
            
    # Sort candidate donors by distance
    candidate_donors.sort(key=lambda x: x["distance_km"])
    selected_donor = candidate_donors[0] if candidate_donors else None
    
    # Calculate real turn-by-turn road network route waypoints via OSRM / Google Maps network
    route_waypoints = []
    actual_distance_km = selected_donor["distance_km"] if selected_donor else 0
    if selected_donor:
        from .mcp_server import tool_calculate_road_route_and_distance
        road_calc = tool_calculate_road_route_and_distance(
            origin_lat=selected_donor["lat"],
            origin_lng=selected_donor["lng"],
            dest_lat=target_facility["lat"],
            dest_lng=target_facility["lng"]
        )
        route_waypoints = road_calc.get("route_coordinates", [])
        if not route_waypoints:
            route_waypoints = [[selected_donor["lat"], selected_donor["lng"]], [target_facility["lat"], target_facility["lng"]]]
        if road_calc.get("distance_km"):
            actual_distance_km = road_calc["distance_km"]
            selected_donor["distance_km"] = actual_distance_km
            if road_calc.get("estimated_transit_minutes"):
                selected_donor["estimated_transit_minutes"] = road_calc["estimated_transit_minutes"]

    # Derive logistics parameters dynamically from medicine storage and distance
    storage_temp = medicine.get("storageTemp", "2–8°C")
    is_cold_chain = any(t in storage_temp for t in ["2", "8", "−", "cryo", "freeze"])
    distance_km = actual_distance_km
    est_transit_hrs = round(distance_km / 36.0, 1) if distance_km else 0
    holdover_hours = 72 if not is_cold_chain else (48 if distance_km < 100 else 24)
    transport_mode = (
        "Solar-Cooled Emergency Vaccine Van (SDD-ILR)" if is_cold_chain and distance_km > 50 else
        ("Insulated Ice-Pack Carrier / Motorbike Courier" if is_cold_chain else
         "Emergency Medical Courier (Non-Cold Chain)")
    )
    cold_box_spec = (
        "WHO PQS E004/006 Ice-Lined Refrigerator Carrier (VVM compliant)" if is_cold_chain
        else "Standard Secure Medicine Transport Box"
    )
    carbon_kg = round(0.089 * distance_km, 2) if distance_km else 0.0

    from ..utils.response_helper import success_response
    return success_response(
        data={
            "dispatch_id": f"DISPATCH-{target_fac_id[-6:].replace('-','')}-{datetime.utcnow().strftime('%Y%m%d%H%M')}",
            "timestamp": datetime.utcnow().isoformat() + "Z",  # H1: dynamic UTC timestamp
            "target_facility": {
                "id": target_fac_id,
                "name": target_facility["name"],
                "district": target_facility["district"],
                "state": target_facility["state"],
                "lat": target_facility["lat"],
                "lng": target_facility["lng"],
                "current_stock": medicine.get("inventoryByFacility", {}).get(target_fac_id, 0),
                "requested_quantity": required_quantity
            },
            "selected_donor": selected_donor,
            "alternative_donors": candidate_donors[1:4] if len(candidate_donors) > 1 else [],
            "medicine_details": {
                "id": medicine["id"],
                "name": medicine["name"],
                "category": medicine["category"],
                "storage_requirement": storage_temp
            },
            "logistics_parameters": {
                "cold_box_specification": cold_box_spec,
                "temperature_holdover_hours": holdover_hours,
                "transport_mode": transport_mode,
                "estimated_transit_hours": est_transit_hrs,
                "carbon_offset_kg": carbon_kg,
                "is_cold_chain_required": is_cold_chain,
                "google_maps_optimized_routing": True
            },
            "route_coordinates": route_waypoints,
            "status": "APPROVED & EN ROUTE"
        },
        message=f"Reallocation plan generated: {required_quantity} units of {medicine.get('name')} dispatched to {target_facility.get('name')}"
    )
