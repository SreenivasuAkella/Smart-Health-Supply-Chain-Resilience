"""
M6 — Google Directions API Real Road Routing (Sanjeevani AI)
Replaces Haversine air-line distance with actual road-network routing.
Uses Google Maps Directions API for accurate ETA and distance for medicine dispatch routes.
"""
import os
import urllib.request
import urllib.parse
import json
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime
from ..config import USE_GOOGLE_MAPS_API, GOOGLE_MAPS_API_KEY
from ..utils.response_helper import success_response

router = APIRouter(prefix="/api/routing", tags=["Google Maps Road Routing"])

DIRECTIONS_API_URL = "https://maps.googleapis.com/maps/api/directions/json"


def _calculate_haversine_route(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float, reason: str) -> dict:
    """Mathematical road dispatch estimate (100% free, zero external calls)."""
    import math
    R = 6371.0
    dlat = math.radians(dest_lat - origin_lat)
    dlon = math.radians(dest_lng - origin_lng)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(origin_lat)) * math.cos(math.radians(dest_lat)) * math.sin(dlon / 2) ** 2
    dist_km = round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)
    eta_mins = int((dist_km / 35.0) * 60)
    return {
        "distance_km": dist_km,
        "duration_minutes": max(15, eta_mins),
        "route_source": f"Haversine Free Fallback ({reason})",
        "polyline": None
    }


def get_road_route(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> dict:
    """
    Calls Google Maps Directions API if USE_GOOGLE_MAPS_API is true and key is set.
    Otherwise safely falls back to mathematical Haversine dispatch (100% free mode).
    """
    if not USE_GOOGLE_MAPS_API or not GOOGLE_MAPS_API_KEY:
        reason = "USE_GOOGLE_MAPS_API=false" if not USE_GOOGLE_MAPS_API else "no GOOGLE_MAPS_API_KEY configured"
        return _calculate_haversine_route(origin_lat, origin_lng, dest_lat, dest_lng, reason)

    params = {
        "origin": f"{origin_lat},{origin_lng}",
        "destination": f"{dest_lat},{dest_lng}",
        "mode": "driving",
        "key": GOOGLE_MAPS_API_KEY
    }
    url = f"{DIRECTIONS_API_URL}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url, timeout=5) as res:
            data = json.loads(res.read().decode())
        if data.get("status") == "OK":
            leg = data["routes"][0]["legs"][0]
            dist_km = round(leg["distance"]["value"] / 1000.0, 2)
            dur_mins = round(leg["duration"]["value"] / 60.0, 1)
            polyline = data["routes"][0].get("overview_polyline", {}).get("points", "")
            return {
                "distance_km": dist_km,
                "duration_minutes": dur_mins,
                "route_source": "Google Maps Directions API",
                "polyline": polyline,
                "start_address": leg.get("start_address"),
                "end_address": leg.get("end_address")
            }
        else:
            return _calculate_haversine_route(origin_lat, origin_lng, dest_lat, dest_lng, f"Google Maps API status: {data.get('status')}")
    except Exception as e:
        return _calculate_haversine_route(origin_lat, origin_lng, dest_lat, dest_lng, f"Google Maps API error: {e}")


@router.get("/medicine-dispatch")
def get_dispatch_route(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
    medicine: Optional[str] = Query(None)
):
    """
    Returns real road distance and ETA for a medicine dispatch from donor to target facility.
    Uses Google Maps Directions API; falls back to Haversine if no API key configured.
    """
    route = get_road_route(origin_lat, origin_lng, dest_lat, dest_lng)
    return success_response(
        data={
            **route,
            "medicine": medicine,
            "transport_mode": "Emergency Vaccine Van / Medical Courier",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        },
        message="Road routing computed"
    )
