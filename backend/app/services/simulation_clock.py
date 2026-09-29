"""
Virtual Simulation Clock & Supply Chain Decay Engine for Sanjeevani AI.
Orchestrates:
1. Daily patient consumption decay across frontline PHCs (Green -> Yellow -> Red).
2. Autonomous Sentinel trigger upon Critical Deficit threshold breaches.
3. Central State Healthcare Warehouse periodic bulk procurement push to Regional Depots.
4. Safe thread-controlled background tick loop with sub-second state queries.
"""

import time
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional
from .firebase_service import firebase_service
from .facility_data_service import get_active_public_facilities
from .medicine_data_service import get_active_essential_medicines, generate_public_modeled_inventory
from .inventory_math import compute_facility_days_of_supply, compute_effective_burn_rate

class SimulationClockService:
    def __init__(self, tick_interval_seconds: float = 60.0):
        self.tick_interval_seconds = tick_interval_seconds  # 60s real-time = 1 virtual day
        self.virtual_day = 1
        self.is_running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self.last_tick_timestamp: Optional[str] = None
        self.central_push_interval_days = 30  # Restock Regional Depots every 30 virtual days

        # High-performance in-memory cache for instant ticks
        self._cached_facilities: Optional[List[Dict[str, Any]]] = None
        self._cached_medicines: Optional[List[Dict[str, Any]]] = None
        self._is_ticking = False
        self._sync_thread: Optional[threading.Thread] = None
        self._sentinel_thread: Optional[threading.Thread] = None

    def _ensure_data_loaded(self):
        """Ensures facilities and medicines are loaded into in-memory cache."""
        if self._cached_facilities is None or self._cached_medicines is None:
            try:
                fb_facs = firebase_service.read_data("inventory/facilities")
                self._cached_facilities = fb_facs if (fb_facs and isinstance(fb_facs, list)) else get_active_public_facilities()
            except Exception as e:
                print(f"[Simulation Clock Cache Facilities Warning]: {e}")
                self._cached_facilities = get_active_public_facilities()

            try:
                fb_meds = firebase_service.read_data("inventory/medicines")
                self._cached_medicines = fb_meds if (fb_meds and isinstance(fb_meds, list)) else generate_public_modeled_inventory({}, self._cached_facilities)
            except Exception as e:
                print(f"[Simulation Clock Cache Medicines Warning]: {e}")
                self._cached_medicines = generate_public_modeled_inventory({}, self._cached_facilities)

    def refresh_cache(self):
        """Force refreshes in-memory cache from Firebase or live sources."""
        with self._lock:
            self._cached_facilities = None
            self._cached_medicines = None
            self._ensure_data_loaded()

    def start_clock(self):
        with self._lock:
            if not self.is_running:
                self.is_running = True
                self._thread = threading.Thread(target=self._run_loop, daemon=True)
                self._thread.start()
                print(f"[Simulation Clock]: Started with 1 virtual day = {self.tick_interval_seconds}s")

    def stop_clock(self):
        with self._lock:
            self.is_running = False
            print("[Simulation Clock]: Stopped/Paused.")

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "is_running": self.is_running,
                "virtual_day": self.virtual_day,
                "tick_interval_seconds": self.tick_interval_seconds,
                "last_tick_timestamp": self.last_tick_timestamp,
                "next_central_bulk_push_day": ((self.virtual_day // self.central_push_interval_days) + 1) * self.central_push_interval_days
            }

    def _async_persist_to_firebase(self, facilities_copy: List[Dict], medicines_copy: List[Dict]):
        """Persists updated snapshot to Firebase asynchronously without blocking clock ticks."""
        try:
            firebase_service.write_data("inventory/facilities", facilities_copy)
            firebase_service.write_data("inventory/medicines", medicines_copy)
        except Exception as e:
            print(f"[Simulation Clock Background Firebase Sync Notice]: {e}")

    def _async_run_sentinel_dispatches(self, crit_facilities: List[Dict]):
        """Executes multi-agent AI auto-reallocations in a background thread."""
        try:
            from .ai_agents_service import run_auto_relocation_pipeline
            for crit_fac in crit_facilities:
                try:
                    order = run_auto_relocation_pipeline(
                        target_facility_id=crit_fac["id"],
                        medicine_id=crit_fac.get("bottleneck_drug_id"),
                        required_quantity=25,
                        auto_triggered=True
                    )
                    print(f"[Auto-Sentinel Sentinel (Background)]: Order {order.get('dispatch_id')} created for {crit_fac.get('name')}")
                except Exception as auto_err:
                    print(f"[Auto-Sentinel Trigger Notice (Background)]: {auto_err}")
        except Exception as e:
            print(f"[Auto-Sentinel Pipeline Init Warning]: {e}")

    def trigger_tick(self) -> Dict[str, Any]:
        """
        Executes a single virtual day step in sub-second time:
        1. Fast in-memory consumption decay on Frontline PHCs.
        2. In-memory periodic central bulk push.
        3. Non-blocking asynchronous Firebase persistence.
        4. Non-blocking asynchronous AI Sentinel emergency reallocation.
        """
        start_time = time.time()

        with self._lock:
            if self._is_ticking:
                return {
                    "virtual_day": self.virtual_day,
                    "is_running": self.is_running,
                    "status": "in_progress",
                    "message": "Previous tick still finalizing in memory."
                }
            self._is_ticking = True
            self.virtual_day += 1
            now_iso = datetime.utcnow().isoformat() + "Z"
            self.last_tick_timestamp = now_iso

        try:
            # 1. Ensure in-memory data availability
            self._ensure_data_loaded()
            facilities = self._cached_facilities
            medicines = self._cached_medicines

            # 2. Consumption Decay on Frontline PHCs (pure CPU in-memory, ~1-3ms)
            decayed_count = 0
            newly_critical_facilities = []

            for fac in facilities:
                fac_id = fac.get("id", "")
                fac_type = fac.get("type", "")
                
                # Regional Depots (District Hospitals) do not decay frontline retail style
                if "hospital" in fac_type.lower() or fac.get("status") == "Regional Depot":
                    continue

                footfall = fac.get("dailyPatientFootfall") or max(10, int(fac.get("bedCapacity", 20) * 8))
                
                # Consume stock for all tracked medicines
                for med in medicines:
                    med_name = med.get("name", "")
                    inv = med.setdefault("inventoryByFacility", {})
                    curr_stock = inv.get(fac_id, 0)
                    
                    burn = compute_effective_burn_rate(med_name, footfall)
                    # Subtract daily burn (ensure non-negative)
                    new_stock = max(0, int(curr_stock - max(1, int(round(burn)))))
                    inv[fac_id] = new_stock
                    med["currentTotal"] = sum(inv.values())

                # Recalculate facility status and Days of Supply
                health = compute_facility_days_of_supply(fac, medicines)
                old_status = fac.get("status")
                fac["status"] = health["status"]
                fac["medicine_days_of_supply"] = health["medicine_days_of_supply"]
                fac["bottleneck_drug_id"] = health.get("bottleneck_drug_id")
                fac["bottleneck_drug_name"] = health.get("bottleneck_drug_name")
                decayed_count += 1

                if old_status != "Critical Deficit" and health["status"] == "Critical Deficit":
                    newly_critical_facilities.append(dict(fac))

            # 3. Periodic Central State Warehouse Push (Every 30 virtual days)
            central_push_triggered = False
            if self.virtual_day % self.central_push_interval_days == 0:
                print(f"[Central State Warehouse]: Executing Scheduled Bulk Inflow (+150 units to Regional Depots)...")
                central_push_triggered = True
                for fac in facilities:
                    if "hospital" in fac.get("type", "").lower() or fac.get("status") == "Regional Depot":
                        hosp_id = fac["id"]
                        for med in medicines:
                            inv = med.setdefault("inventoryByFacility", {})
                            inv[hosp_id] = inv.get(hosp_id, 80) + 150
                            med["currentTotal"] = sum(inv.values())

            # 4. Offload Firebase persistence to a background thread only if previous sync finished
            if self._sync_thread is None or not self._sync_thread.is_alive():
                import copy
                fac_snapshot = copy.deepcopy(facilities)
                med_snapshot = copy.deepcopy(medicines)
                self._sync_thread = threading.Thread(
                    target=self._async_persist_to_firebase,
                    args=(fac_snapshot, med_snapshot),
                    daemon=True
                )
                self._sync_thread.start()

            # 5. Offload AI Sentinel Auto-Reallocations to a background thread only if previous run finished
            queued_dispatches = []
            if newly_critical_facilities and (self._sentinel_thread is None or not self._sentinel_thread.is_alive()):
                targets_to_reallocate = newly_critical_facilities[:2]
                queued_dispatches = [f.get("id") for f in targets_to_reallocate]
                self._sentinel_thread = threading.Thread(
                    target=self._async_run_sentinel_dispatches,
                    args=(targets_to_reallocate,),
                    daemon=True
                )
                self._sentinel_thread.start()

            import gc
            gc.collect()

            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            print(f"[Simulation Clock]: Day {self.virtual_day} tick completed in {elapsed_ms}ms (Decayed: {decayed_count}, Critical: {len(newly_critical_facilities)})")

            return {
                "virtual_day": self.virtual_day,
                "is_running": self.is_running,
                "tick_interval_seconds": self.tick_interval_seconds,
                "facilities_decayed": decayed_count,
                "newly_critical_count": len(newly_critical_facilities),
                "central_bulk_push_executed": central_push_triggered,
                "autonomous_dispatches_queued": queued_dispatches,
                "timestamp": self.last_tick_timestamp,
                "elapsed_ms": elapsed_ms,
                "status": "success"
            }

        finally:
            with self._lock:
                self._is_ticking = False

    def _run_loop(self):
        while self.is_running:
            time.sleep(self.tick_interval_seconds)
            if not self.is_running:
                break
            try:
                self.trigger_tick()
            except Exception as e:
                print(f"[Simulation Clock Loop Error]: {e}")

# Singleton Instance
simulation_clock = SimulationClockService(tick_interval_seconds=60.0)
