import asyncio
import json
import time
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from ..services.cold_chain import get_live_telemetry_stream
from ..services.facility_data_service import get_active_public_facilities
from ..services.medicine_data_service import generate_public_modeled_inventory
from ..services.firebase_service import firebase_service

router = APIRouter(prefix="/api/stream", tags=["Server-Sent Events (SSE)"])

# ─── Module-level caches ────────────────────────────────────────────────────
# Refreshed every 30 s in executor threads — never inside the async loop tick
_CACHE_TTL = 30.0
_facilities_cache: list = []
_medicines_cache: list = []
_facilities_ts: float = 0.0
_medicines_ts: float = 0.0
_cache_lock = asyncio.Lock()

async def _get_facilities() -> list:
    """Returns cached facilities; refreshes in executor thread every 30 s."""
    global _facilities_cache, _facilities_ts
    now = time.monotonic()
    if now - _facilities_ts > _CACHE_TTL:
        loop = asyncio.get_event_loop()
        try:
            facs = await loop.run_in_executor(None, get_active_public_facilities)
            if facs:
                _facilities_cache = facs
                _facilities_ts = now
        except Exception:
            pass
    return _facilities_cache


async def _get_medicines(facilities: list) -> list:
    """Returns cached medicines; refreshes in executor thread every 30 s."""
    global _medicines_cache, _medicines_ts
    now = time.monotonic()
    if now - _medicines_ts > _CACHE_TTL:
        loop = asyncio.get_event_loop()
        try:
            meds = await loop.run_in_executor(
                None, generate_public_modeled_inventory, {}, facilities
            )
            if meds:
                _medicines_cache = meds
                _medicines_ts = now
        except Exception:
            pass
    return _medicines_cache


def _run_reallocation_sync(facility_id: str, medicine_id: Optional[str]) -> Optional[dict]:
    """Runs reallocation pipeline synchronously — called via executor."""
    try:
        from ..services.ai_agents_service import run_auto_relocation_pipeline
        plan = run_auto_relocation_pipeline(
            target_facility_id=facility_id,
            medicine_id=medicine_id,
            auto_triggered=True
        )
        if plan and plan.get("selected_donor"):
            return plan
    except Exception:
        pass
    return None


async def event_generator(request: Request):
    """
    Async SSE generator. All blocking I/O runs in executor threads.
    Yields events without blocking the Uvicorn event loop.
    """
    yield (
        f"event: connected\n"
        f"data: {json.dumps({'status': 'CONNECTED', 'timestamp': datetime.utcnow().isoformat() + 'Z'})}\n\n"
    )
    await asyncio.sleep(0)  # yield control immediately

    last_stockout_alert_time: float = 0.0
    last_reallocation_time: float = 0.0
    ALERT_COOLDOWN_SECONDS = 90.0
    REALLOCATION_COOLDOWN_SECONDS = 300.0

    loop = asyncio.get_event_loop()
    _realloc_task: Optional[asyncio.Future] = None  # track background reallocation

    while True:
        if await request.is_disconnected():
            break

        try:
            now_ts = time.time()

            # ── 1. Cold-Chain IoT Telemetry (blocking I/O → executor) ──────
            telemetry = await loop.run_in_executor(None, get_live_telemetry_stream)
            telemetry_payload = {
                "active_sensors_count": telemetry.get("active_sensors_count", 6),
                "critical_excursions": telemetry.get("critical_excursions", 0),
                "sensors": telemetry.get("sensors", []),
                "alerts": telemetry.get("alerts", []),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            yield f"event: telemetry\ndata: {json.dumps(telemetry_payload)}\n\n"
            await asyncio.sleep(0)

            # ── 2. Bed & Staff Stats (from cache — no external I/O) ─────────
            facilities = await _get_facilities()
            total_beds = sum(f.get("bedCapacity", 0) for f in facilities) or 300
            occupied_beds = sum(f.get("bedsOccupied", 0) for f in facilities) or 210
            doctors_duty = sum(f.get("doctorsOnDuty", 0) for f in facilities) or 12
            doctors_total = sum(f.get("doctorsTotal", 0) for f in facilities) or 15
            avg_duty = round(
                sum(f.get("duty_adherence_pct", 70) for f in facilities)
                / max(1, len(facilities)), 1
            )
            stats_payload = {
                "totalBeds": total_beds,
                "occupiedBeds": occupied_beds,
                "occupancyPct": round((occupied_beds / max(1, total_beds)) * 100, 1),
                "doctorsOnDuty": doctors_duty,
                "doctorsTotal": doctors_total,
                "avgDutyAdherencePct": avg_duty,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            yield f"event: stats\ndata: {json.dumps(stats_payload)}\n\n"
            await asyncio.sleep(0)

            # ── 3. Stockout Alert (rate-limited, uses cache) ────────────────
            critical_phcs = [
                f for f in facilities
                if f.get("status") == "Critical Deficit"
                and f.get("type") == "Primary Health Centre"
            ]
            if critical_phcs and (now_ts - last_stockout_alert_time >= ALERT_COOLDOWN_SECONDS):
                cycle_idx = int(now_ts / ALERT_COOLDOWN_SECONDS) % len(critical_phcs)
                alert_fac = critical_phcs[cycle_idx]

                medicines = await _get_medicines(facilities)
                target_med = None
                for med in medicines:
                    stock = med.get("inventoryByFacility", {}).get(alert_fac.get("id"), 0)
                    if stock <= 5:
                        target_med = med
                        break
                if not target_med and medicines:
                    target_med = medicines[0]

                stockout_payload = {
                    "facility_id": alert_fac.get("id"),
                    "facility_name": alert_fac.get("name"),
                    "district": alert_fac.get("district"),
                    "state": alert_fac.get("state"),
                    "medicine_id": target_med.get("id") if target_med else "MED-ASV-001",
                    "medicine_name": target_med.get("name") if target_med else "Anti-Snake Venom (ASV)",
                    "medicine_days_of_supply": alert_fac.get("medicine_days_of_supply"),
                    "status": alert_fac.get("status"),
                    "dataSource": alert_fac.get("dataSource"),
                    "alert_type": "STOCKOUT_IMMINENT",
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
                yield f"event: stockout_alert\ndata: {json.dumps(stockout_payload)}\n\n"
                await asyncio.sleep(0)
                last_stockout_alert_time = now_ts

                # ── 4. Auto-reallocation — run in executor, non-blocking ────
                if (
                    now_ts - last_reallocation_time >= REALLOCATION_COOLDOWN_SECONDS
                    and (_realloc_task is None or _realloc_task.done())
                ):
                    fac_id = alert_fac.get("id")
                    med_id = target_med.get("id") if target_med else None

                    _realloc_task = loop.run_in_executor(
                        None, _run_reallocation_sync, fac_id, med_id
                    )
                    last_reallocation_time = now_ts

            # ── 5. Check if a completed reallocation plan is ready ──────────
            if _realloc_task is not None and _realloc_task.done():
                try:
                    plan = _realloc_task.result()
                    if plan:
                        yield f"event: reallocation\ndata: {json.dumps(plan, default=str)}\n\n"
                        await asyncio.sleep(0)
                except Exception:
                    pass
                _realloc_task = None

            # ── 6. Heartbeat ping ──────────────────────────────────────────
            yield (
                f"event: ping\n"
                f"data: {json.dumps({'ping': 'alive', 'time': datetime.utcnow().isoformat() + 'Z'})}\n\n"
            )
            await asyncio.sleep(0)

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            await asyncio.sleep(0)

        await asyncio.sleep(3.5)


@router.get("/events")
async def sse_live_stream(request: Request):
    """
    Standard Server-Sent Events (SSE) HTTP endpoint for persistent live data streaming.
    All blocking I/O is off-loaded to executor threads; the event loop never stalls.
    """
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*"
        }
    )
