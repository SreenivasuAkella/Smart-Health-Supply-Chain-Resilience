import sqlite3
import os
import json
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from .firebase_service import firebase_service
from .bigquery_service import bigquery_service

# Persistent SQLite Database Path with fast WAL journaling
DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "reallocations.db")
DB_PATH = os.getenv("SQLITE_DB_PATH", DEFAULT_DB_PATH)
USE_MEMORY_DB = os.getenv("USE_MEMORY_DB", "false").strip().lower() in ("true", "1", "yes")

CACHE_URI = "file:realloc_cache?mode=memory&cache=shared" if USE_MEMORY_DB else DB_PATH

class ReallocationDatabaseService:
    """
    High-Speed Local SQLite Persistence & Dual-Cloud Sync Service for Sanjeevani AI Reallocations.
    Persists fleet dispatches and vehicle registry locally to data/reallocations.db,
    while synchronizing audit ledgers to Google BigQuery and live state to Firebase RTDB.
    """
    def __init__(self, db_target: str = CACHE_URI):
        self.db_target = db_target
        self.is_memory = USE_MEMORY_DB or ("mode=memory" in str(db_target))
        if not self.is_memory and not str(db_target).startswith("file:"):
            os.makedirs(os.path.dirname(os.path.abspath(db_target)), exist_ok=True)
        # Persistent anchor
        self._anchor = sqlite3.connect(self.db_target, uri=self.is_memory, check_same_thread=False)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_target, uri=self.is_memory, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        if not self.is_memory:
            try:
                conn.execute("PRAGMA journal_mode=WAL;")
            except Exception:
                pass
        return conn

    def _init_db(self):
        """Initializes tables and seeds initial vehicle fleet if empty."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Reallocations Master Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS reallocations (
                dispatch_id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'APPROVED',
                auto_triggered INTEGER NOT NULL DEFAULT 0,
                target_facility_id TEXT NOT NULL,
                target_facility_name TEXT NOT NULL,
                target_lat REAL,
                target_lng REAL,
                target_district TEXT,
                target_state TEXT,
                donor_facility_id TEXT NOT NULL,
                donor_facility_name TEXT NOT NULL,
                donor_lat REAL,
                donor_lng REAL,
                donor_district TEXT,
                donor_state TEXT,
                medicine_id TEXT NOT NULL,
                medicine_name TEXT NOT NULL,
                medicine_category TEXT,
                storage_requirement TEXT,
                quantity INTEGER NOT NULL,
                vehicle_id TEXT,
                vehicle_type TEXT,
                driver_name TEXT,
                driver_contact TEXT,
                distance_km REAL NOT NULL,
                estimated_transit_minutes INTEGER NOT NULL,
                safe_transit_window_hours REAL,
                carbon_kg REAL,
                route_coordinates TEXT,
                ai_reasoning TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)

            # Vehicle Fleet Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS vehicle_fleet (
                vehicle_id TEXT PRIMARY KEY,
                vehicle_name TEXT NOT NULL,
                vehicle_type TEXT NOT NULL,
                registration_no TEXT NOT NULL,
                base_facility_id TEXT,
                status TEXT NOT NULL DEFAULT 'AVAILABLE',
                cold_chain_type TEXT NOT NULL,
                temperature_range TEXT NOT NULL,
                driver_name TEXT,
                driver_contact TEXT,
                current_lat REAL,
                current_lng REAL,
                capacity_units INTEGER NOT NULL DEFAULT 500,
                updated_at TEXT NOT NULL
            );
            """)

            # Seed Vehicle Fleet if empty
            cursor.execute("SELECT COUNT(*) FROM vehicle_fleet")
            if cursor.fetchone()[0] == 0:
                fleet_seeds = [
                    (
                        "VEH-SDD-01",
                        "Solar-Cooled Emergency Vaccine Van (SDD-ILR)",
                        "Solar-Cooled ILR Van",
                        "UP-65-MED-8492",
                        "DH-VAR-001",
                        "AVAILABLE",
                        "ILR_SOLAR",
                        "2°C to 8°C",
                        None,
                        None,
                        25.3176,
                        82.9739,
                        600,
                        datetime.utcnow().isoformat() + "Z"
                    ),
                    (
                        "VEH-CRYO-02",
                        "Deep-Cold Cryo Carrier (Ultra-Low Temp)",
                        "Insulated Cryo Van",
                        "MH-12-MED-4310",
                        "DH-PUNE-01",
                        "AVAILABLE",
                        "CRYO_ULTRA_LOW",
                        "-20°C to -80°C",
                        None,
                        None,
                        18.5204,
                        73.8567,
                        400,
                        datetime.utcnow().isoformat() + "Z"
                    ),
                    (
                        "VEH-MOTO-03",
                        "Rapid Response Motorbike Ice-Carrier",
                        "Insulated Motorbike Carrier",
                        "TN-23-MED-7719",
                        "DH-VEL-001",
                        "AVAILABLE",
                        "INSULATED_ICEPACK",
                        "2°C to 8°C",
                        None,
                        None,
                        12.9165,
                        79.1325,
                        80,
                        datetime.utcnow().isoformat() + "Z"
                    ),
                    (
                        "VEH-ELEC-04",
                        "Zero-Emission High-Speed Electric Medical Courier",
                        "Electric Medical Van",
                        "DL-01-MED-3392",
                        "DH-DEL-001",
                        "AVAILABLE",
                        "TEMPERATURE_CONTROLLED",
                        "15°C to 25°C",
                        None,
                        None,
                        28.6139,
                        77.2090,
                        500,
                        datetime.utcnow().isoformat() + "Z"
                    ),
                    (
                        "VEH-AMB-05",
                        "District Ambulance Medical Cargo Transfer",
                        "Insulated Ambulance",
                        "TS-07-MED-9941",
                        "DH-MED-001",
                        "AVAILABLE",
                        "INSULATED_BOX",
                        "2°C to 8°C",
                        None,
                        None,
                        17.3850,
                        78.4867,
                        300,
                        datetime.utcnow().isoformat() + "Z"
                    ),
                    (
                        "VEH-DRONE-06",
                        "Autonomous Long-Range Medical eVTOL Drone",
                        "Autonomous Medical Drone",
                        "IND-DGCA-UAS-8812",
                        "DH-VAR-001",
                        "AVAILABLE",
                        "THERMAL_PAYLOAD_BAY",
                        "2°C to 8°C",
                        None,
                        None,
                        25.3176,
                        82.9739,
                        150,
                        datetime.utcnow().isoformat() + "Z"
                    )
                ]
                cursor.executemany("""
                INSERT INTO vehicle_fleet (
                    vehicle_id, vehicle_name, vehicle_type, registration_no, base_facility_id,
                    status, cold_chain_type, temperature_range, driver_name, driver_contact,
                    current_lat, current_lng, capacity_units, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, fleet_seeds)

            # Strict Privacy Enforcement: Never retain personal driver names or telephone numbers
            cursor.execute("UPDATE vehicle_fleet SET driver_name = NULL, driver_contact = NULL")
            cursor.execute("UPDATE reallocations SET driver_name = NULL, driver_contact = NULL")
            conn.commit()

    def save_reallocation(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persists a complete reallocation order to SQLite database and mirrors to Firebase RTDB.
        """
        now_str = datetime.utcnow().isoformat() + "Z"
        dispatch_id = record.get("dispatch_id") or f"DISP-{int(datetime.utcnow().timestamp())}"
        
        target = record.get("target_facility", {})
        donor = record.get("selected_donor", {})
        medicine = record.get("medicine_details", {})
        logistics = record.get("logistics_parameters", {})
        vehicle = record.get("vehicle_details", {})

        route_coords = record.get("route_coordinates", [])
        v_type = str(record.get("vehicle_type") or vehicle.get("vehicle_type") or "").lower()
        v_id = str(record.get("vehicle_id") or vehicle.get("vehicle_id") or "").lower()
        is_drone_rec = record.get("is_drone") or record.get("is_aerial") or "drone" in v_type or "vtol" in v_type or "drone" in v_id
        if is_drone_rec and isinstance(route_coords, list) and len(route_coords) > 20:
            origin = route_coords[0]
            dest = route_coords[-1]
            num_pts = 15
            route_coords = [[round(origin[0] + (dest[0] - origin[0]) * i / 14.0, 6), round(origin[1] + (dest[1] - origin[1]) * i / 14.0, 6)] for i in range(num_pts)]
            record["route_coordinates"] = route_coords
        route_coords_json = json.dumps(route_coords) if isinstance(route_coords, list) else str(route_coords)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO reallocations (
                dispatch_id, timestamp, status, auto_triggered,
                target_facility_id, target_facility_name, target_lat, target_lng, target_district, target_state,
                donor_facility_id, donor_facility_name, donor_lat, donor_lng, donor_district, donor_state,
                medicine_id, medicine_name, medicine_category, storage_requirement, quantity,
                vehicle_id, vehicle_type, driver_name, driver_contact,
                distance_km, estimated_transit_minutes, safe_transit_window_hours, carbon_kg,
                route_coordinates, ai_reasoning, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                dispatch_id,
                record.get("timestamp", now_str),
                record.get("status", "APPROVED & EN ROUTE"),
                1 if record.get("auto_triggered") else 0,
                target.get("id", ""),
                target.get("name", ""),
                target.get("lat"),
                target.get("lng"),
                target.get("district", ""),
                target.get("state", ""),
                donor.get("facility_id", ""),
                donor.get("facility_name", ""),
                donor.get("lat"),
                donor.get("lng"),
                donor.get("district", ""),
                donor.get("state", ""),
                medicine.get("id", ""),
                medicine.get("name", ""),
                medicine.get("category", ""),
                medicine.get("storage_requirement", ""),
                target.get("requested_quantity") or record.get("quantity") or 25,
                vehicle.get("vehicle_id") or "VEH-SDD-01",
                vehicle.get("vehicle_type") or logistics.get("transport_mode") or "Solar-Cooled Emergency Vaccine Van",
                None,
                None,
                record.get("estimated_distance_km") or record.get("distance_km") or donor.get("distance_km") or logistics.get("distance_km") or 0.0,
                logistics.get("estimated_transit_minutes") or record.get("estimated_transit_minutes") or donor.get("estimated_transit_minutes") or max(2, int(round(((record.get("distance_km") or 10.0) / 36.0) * 60))),
                logistics.get("temperature_holdover_hours") or record.get("safe_transit_window_hours") or 48.0,
                logistics.get("carbon_offset_kg") or record.get("carbon_kg") or 0.0,
                route_coords_json,
                record.get("ai_reasoning") or "Autonomous stockout prevention transfer triggered by Sanjeevani AI Sentinel.",
                record.get("created_at", now_str),
                now_str
            ))
            conn.commit()

        # 1. Dual-sync to Firebase Realtime Database (Live operational state & UI sync)
        try:
            fb_payload = {
                "dispatch_id": dispatch_id,
                "timestamp": now_str,
                "status": record.get("status", "APPROVED & EN ROUTE"),
                "auto_triggered": bool(record.get("auto_triggered")),
                "target_facility": target,
                "donor_facility": donor,
                "medicine": medicine,
                "distance_km": donor.get("distance_km") or record.get("distance_km"),
                "vehicle": vehicle,
                "route_coordinates": route_coords
            }
            firebase_service.write_data(f"reallocations/{dispatch_id}", fb_payload)
            firebase_service.write_data("reallocations/latest", fb_payload)
        except Exception as fb_err:
            print(f"[Firebase Reallocation Dual-Sync Notice]: {fb_err}")

        # 2. Dual-sync to Google BigQuery (National-scale analytical audit log)
        try:
            bigquery_service.insert_reallocation_event(record)
        except Exception as bq_err:
            print(f"[BigQuery Reallocation Dual-Sync Notice]: {bq_err}")

        return self.get_reallocation(dispatch_id) or record

    def get_reallocation(self, dispatch_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single reallocation record with parsed route coordinates."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM reallocations WHERE dispatch_id = ?", (dispatch_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_reallocation_dict(dict(row))

    def list_reallocations(self, limit: int = 50, status: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists reallocations ordered by newest first with optional status or text filters."""
        query = "SELECT * FROM reallocations"
        params = []
        where_clauses = []
        
        if status and status.upper() != "ALL":
            where_clauses.append("status LIKE ?")
            params.append(f"%{status}%")
            
        if search:
            s = f"%{search.lower()}%"
            where_clauses.append("(LOWER(dispatch_id) LIKE ? OR LOWER(target_facility_name) LIKE ? OR LOWER(donor_facility_name) LIKE ? OR LOWER(medicine_name) LIKE ?)")
            params.extend([s, s, s, s])

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [self._row_to_reallocation_dict(dict(r)) for r in rows]

    def update_reallocation_status(self, dispatch_id: str, new_status: str) -> bool:
        """Updates status of a dispatch (e.g. IN_TRANSIT, DELIVERED) and releases vehicle upon arrival."""
        now_str = datetime.utcnow().isoformat() + "Z"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE reallocations SET status = ?, updated_at = ? WHERE dispatch_id = ?", (new_status, now_str, dispatch_id))
            conn.commit()
            updated = cursor.rowcount > 0

        if updated:
            rec = self.get_reallocation(dispatch_id)
            if rec and new_status in ('DELIVERED', 'COMPLETED', 'CANCELLED'):
                veh_id = rec.get("vehicle_id")
                tgt = rec.get("target_facility", {})
                target_lat = tgt.get("lat") or rec.get("target_lat")
                target_lng = tgt.get("lng") or rec.get("target_lng")
                target_fac_id = tgt.get("id") or rec.get("target_facility_id")
                if veh_id:
                    self.release_vehicle(veh_id, new_lat=target_lat, new_lng=target_lng, new_facility_id=target_fac_id)
            try:
                firebase_service.write_data(f"reallocations/{dispatch_id}/status", new_status)
                if rec:
                    firebase_service.write_data(f"reallocations/{dispatch_id}", rec)
                    firebase_service.write_data("reallocations/latest", rec)
            except Exception:
                pass
            try:
                if rec:
                    bigquery_service.insert_reallocation_event(rec)
            except Exception:
                pass
        return updated

    def get_vehicle_fleet(self) -> List[Dict[str, Any]]:
        """Returns all registered emergency logistics vehicles with driver PII omitted for privacy."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM vehicle_fleet ORDER BY vehicle_id ASC")
            rows = cursor.fetchall()
            fleet = []
            for r in rows:
                item = dict(r)
                item.pop("driver_name", None)
                item.pop("driver_contact", None)
                fleet.append(item)
            return fleet

    def list_active_reallocations(self) -> List[Dict[str, Any]]:
        """Returns all reallocations that are currently active (not DELIVERED, COMPLETED, or CANCELLED)."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM reallocations WHERE status NOT IN ('DELIVERED', 'COMPLETED', 'CANCELLED') ORDER BY created_at DESC"
            )
            rows = cursor.fetchall()
            return [self._row_to_reallocation_dict(dict(r)) for r in rows]

    def claim_vehicle(self, preferred_type: Optional[str] = None, exclude_vehicle_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Allocates an available vehicle from the fleet and marks it IN_TRANSIT.
        Guarantees that no two active concurrent corridors ever share the same vehicle ID.
        Auto-reconciles vehicles whose dispatches are completed and generates distinct vehicle IDs.
        Dual-syncs vehicle status to Firebase RTDB.
        """
        now_str = datetime.utcnow().isoformat() + "Z"
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 1. Auto-reconcile only concluded corridors (where updated_at is older than 3 minutes)
            # This prevents race conditions where vehicles claimed in a batch loop get reset before save_reallocation
            cutoff_time = (datetime.utcnow() - timedelta(minutes=3)).isoformat() + "Z"
            cursor.execute("""
                UPDATE vehicle_fleet SET status = 'AVAILABLE', updated_at = ?
                WHERE status = 'IN_TRANSIT'
                AND updated_at < ?
                AND vehicle_id NOT IN (
                    SELECT DISTINCT vehicle_id FROM reallocations 
                    WHERE status NOT IN ('DELIVERED', 'COMPLETED', 'CANCELLED')
                    AND vehicle_id IS NOT NULL
                )
            """, (now_str, cutoff_time))
            conn.commit()

            # 2. Identify all vehicles currently active in transit across the entire network
            cursor.execute("""
                SELECT DISTINCT vehicle_id FROM reallocations 
                WHERE status NOT IN ('DELIVERED', 'COMPLETED', 'CANCELLED')
                AND vehicle_id IS NOT NULL
            """)
            busy_ids = {r[0] for r in cursor.fetchall()}
            if exclude_vehicle_ids:
                busy_ids.update(exclude_vehicle_ids)

            # Query all registered vehicles in fleet
            cursor.execute("SELECT * FROM vehicle_fleet ORDER BY vehicle_id ASC")
            all_fleet = [dict(r) for r in cursor.fetchall()]
            existing_ids = {v["vehicle_id"] for v in all_fleet}

            # Filter vehicles that are strictly AVAILABLE and not currently assigned to any active corridor
            available = [v for v in all_fleet if v["status"] == "AVAILABLE" and v["vehicle_id"] not in busy_ids]

            assigned = None
            if preferred_type and available:
                pref = preferred_type.lower()
                pref_words = [w for w in pref.replace('-', ' ').split() if len(w) > 2]
                for v in available:
                    v_type = v.get("vehicle_type", "").lower()
                    v_name = v.get("vehicle_name", "").lower()
                    if pref in v_type or pref in v_name or v_type in pref:
                        assigned = v
                        break
                    if any(w in v_type or w in v_name for w in pref_words):
                        assigned = v
                        break

            if not assigned and not preferred_type and available:
                assigned = available[0]

            if assigned:
                cursor.execute(
                    "UPDATE vehicle_fleet SET status = 'IN_TRANSIT', updated_at = ? WHERE vehicle_id = ?",
                    (now_str, assigned["vehicle_id"])
                )
                conn.commit()
                assigned["status"] = "IN_TRANSIT"
                assigned["updated_at"] = now_str
                # Privacy protection: strip personal driver information
                assigned.pop("driver_name", None)
                assigned.pop("driver_contact", None)

                # Sync to Firebase
                try:
                    firebase_service.write_data(f"fleet/vehicles/{assigned['vehicle_id']}/status", "IN_TRANSIT")
                    firebase_service.write_data(f"fleet/vehicles/{assigned['vehicle_id']}/updated_at", now_str)
                except Exception as fb_err:
                    print(f"[Firebase Vehicle Claim Notice]: {fb_err}")

                is_d = "drone" in assigned.get("vehicle_type", "").lower() or "vtol" in assigned.get("vehicle_type", "").lower()
                assigned["is_drone"] = is_d
                assigned["is_aerial"] = is_d
                return assigned

            # 3. Dynamic vehicle provisioning: Generate a dedicated vehicle tailored to preferred type
            pref = (preferred_type or "van").lower()
            rand_suffix = random.randint(10, 99)
            if "drone" in pref or "vtol" in pref:
                fallback = {
                    "vehicle_id": f"VEH-DRONE-{rand_suffix}",
                    "vehicle_name": "Autonomous Long-Range Medical eVTOL Drone",
                    "vehicle_type": "Autonomous Medical Drone",
                    "registration_no": f"IND-DGCA-UAS-{rand_suffix}0",
                    "status": "IN_TRANSIT",
                    "cold_chain_type": "THERMAL_PAYLOAD_BAY",
                    "temperature_range": "2°C to 8°C",
                    "capacity_units": 150,
                    "updated_at": now_str
                }
            elif "cryo" in pref:
                fallback = {
                    "vehicle_id": f"VEH-CRYO-{rand_suffix}",
                    "vehicle_name": "Deep-Cold Cryo Carrier (Ultra-Low Temp)",
                    "vehicle_type": "Insulated Cryo Van",
                    "registration_no": f"MH-12-MED-{rand_suffix}2",
                    "status": "IN_TRANSIT",
                    "cold_chain_type": "CRYO_ULTRA_LOW",
                    "temperature_range": "-20°C to -80°C",
                    "capacity_units": 400,
                    "updated_at": now_str
                }
            elif "bike" in pref or "moto" in pref:
                fallback = {
                    "vehicle_id": f"VEH-MOTO-{rand_suffix}",
                    "vehicle_name": "Rapid Response Motorbike Ice-Carrier",
                    "vehicle_type": "Insulated Motorbike Carrier",
                    "registration_no": f"TN-23-MED-{rand_suffix}1",
                    "status": "IN_TRANSIT",
                    "cold_chain_type": "INSULATED_ICEPACK",
                    "temperature_range": "2°C to 8°C",
                    "capacity_units": 80,
                    "updated_at": now_str
                }
            elif "amb" in pref:
                fallback = {
                    "vehicle_id": f"VEH-AMB-{rand_suffix}",
                    "vehicle_name": "District Ambulance Emergency Medical Transfer",
                    "vehicle_type": "Insulated Ambulance",
                    "registration_no": f"TS-07-MED-{rand_suffix}4",
                    "status": "IN_TRANSIT",
                    "cold_chain_type": "INSULATED_BOX",
                    "temperature_range": "2°C to 8°C",
                    "capacity_units": 300,
                    "updated_at": now_str
                }
            elif "elec" in pref or "ev" in pref:
                fallback = {
                    "vehicle_id": f"VEH-ELEC-{rand_suffix}",
                    "vehicle_name": "Zero-Emission High-Speed Electric Medical Courier",
                    "vehicle_type": "Electric Medical Van",
                    "registration_no": f"DL-01-MED-{rand_suffix}9",
                    "status": "IN_TRANSIT",
                    "cold_chain_type": "TEMPERATURE_CONTROLLED",
                    "temperature_range": "15°C to 25°C",
                    "capacity_units": 500,
                    "updated_at": now_str
                }
            # Guarantee uniquely numbered vehicle identifier that never collides with active vehicles
            prefix = "SDD"
            if "drone" in pref or "vtol" in pref:
                prefix = "DRONE"
            elif "cryo" in pref:
                prefix = "CRYO"
            elif "bike" in pref or "moto" in pref:
                prefix = "MOTO"
            elif "amb" in pref:
                prefix = "AMB"
            elif "elec" in pref or "ev" in pref:
                prefix = "ELEC"

            while fallback["vehicle_id"] in busy_ids or fallback["vehicle_id"] in existing_ids:
                rand_suffix = random.randint(10, 99)
                fallback["vehicle_id"] = f"VEH-{prefix}-{rand_suffix}"
                fallback["registration_no"] = f"IND-MED-{prefix}-{rand_suffix}"

            cursor.execute("""
                INSERT OR REPLACE INTO vehicle_fleet (
                    vehicle_id, vehicle_name, vehicle_type, registration_no, base_facility_id,
                    status, cold_chain_type, temperature_range, driver_name, driver_contact,
                    current_lat, current_lng, capacity_units, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                fallback["vehicle_id"], fallback["vehicle_name"], fallback["vehicle_type"],
                fallback["registration_no"], "DH-AUTO-01", "IN_TRANSIT",
                fallback["cold_chain_type"], fallback["temperature_range"],
                None, None,
                22.5937, 78.9629, fallback["capacity_units"], now_str
            ))
            conn.commit()
            is_d = "drone" in fallback.get("vehicle_type", "").lower() or "vtol" in fallback.get("vehicle_type", "").lower()
            fallback["is_drone"] = is_d
            fallback["is_aerial"] = is_d
            return fallback


    def release_vehicle(
        self,
        vehicle_id: str,
        new_lat: Optional[float] = None,
        new_lng: Optional[float] = None,
        new_facility_id: Optional[str] = None
    ) -> bool:
        """
        Releases an in-transit vehicle back to AVAILABLE status upon delivery arrival.
        Updates vehicle's current location and base facility to the delivery destination so it can be re-dispatched.
        Dual-syncs to Firebase RTDB.
        """
        if not vehicle_id:
            return False
        now_str = datetime.utcnow().isoformat() + "Z"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if new_lat is not None and new_lng is not None:
                cursor.execute("""
                    UPDATE vehicle_fleet 
                    SET status = 'AVAILABLE',
                        current_lat = ?,
                        current_lng = ?,
                        base_facility_id = COALESCE(?, base_facility_id),
                        updated_at = ?
                    WHERE vehicle_id = ?
                """, (new_lat, new_lng, new_facility_id, now_str, vehicle_id))
            else:
                cursor.execute(
                    "UPDATE vehicle_fleet SET status = 'AVAILABLE', updated_at = ? WHERE vehicle_id = ?",
                    (now_str, vehicle_id)
                )
            conn.commit()
            updated = cursor.rowcount > 0

        if updated:
            try:
                firebase_service.write_data(f"fleet/vehicles/{vehicle_id}/status", "AVAILABLE")
                firebase_service.write_data(f"fleet/vehicles/{vehicle_id}/updated_at", now_str)
                if new_lat is not None and new_lng is not None:
                    firebase_service.write_data(f"fleet/vehicles/{vehicle_id}/current_lat", new_lat)
                    firebase_service.write_data(f"fleet/vehicles/{vehicle_id}/current_lng", new_lng)
                    if new_facility_id:
                        firebase_service.write_data(f"fleet/vehicles/{vehicle_id}/base_facility_id", new_facility_id)
            except Exception as fb_err:
                print(f"[Firebase Vehicle Release Notice]: {fb_err}")

        return updated

    def update_vehicle_telemetry(
        self,
        vehicle_id: str,
        lat: float,
        lng: float,
        speed_kmh: float = 40.0,
        temp_c: float = 4.2,
        dispatch_id: Optional[str] = None
    ) -> bool:
        """
        Updates live GPS telemetry in SQLite cache and dual-syncs to Firebase Realtime DB and BigQuery.
        """
        now_str = datetime.utcnow().isoformat() + "Z"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE vehicle_fleet SET current_lat = ?, current_lng = ?, updated_at = ? WHERE vehicle_id = ?",
                (lat, lng, now_str, vehicle_id)
            )
            conn.commit()
            updated = cursor.rowcount > 0

        telemetry_payload = {
            "vehicle_id": vehicle_id,
            "dispatch_id": dispatch_id,
            "lat": lat,
            "lng": lng,
            "current_lat": lat,
            "current_lng": lng,
            "speed_kmh": speed_kmh,
            "temperature_c": temp_c,
            "cold_chain_status": "OPTIMAL (2-8°C)" if 2.0 <= temp_c <= 8.0 else "EXCURSION WARNING",
            "battery_or_fuel_pct": 85,
            "timestamp": now_str
        }

        # Sub-second Firebase telemetry sync
        try:
            firebase_service.write_data(f"fleet/vehicles/{vehicle_id}/telemetry", telemetry_payload)
            firebase_service.write_data(f"fleet/vehicles/{vehicle_id}/current_lat", lat)
            firebase_service.write_data(f"fleet/vehicles/{vehicle_id}/current_lng", lng)
        except Exception:
            pass

        # BigQuery compliance audit
        try:
            bigquery_service.insert_fleet_telemetry(telemetry_payload)
        except Exception:
            pass

        return updated

    def _row_to_reallocation_dict(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Formats flat SQL row into structured JSON matching frontend map expectations."""
        route_coords = []
        if row.get("route_coordinates"):
            try:
                route_coords = json.loads(row["route_coordinates"])
            except Exception:
                route_coords = []

        return {
            "dispatch_id": row["dispatch_id"],
            "timestamp": row["timestamp"],
            "status": row["status"],
            "auto_triggered": bool(row["auto_triggered"]),
            "target_facility": {
                "id": row["target_facility_id"],
                "name": row["target_facility_name"],
                "lat": row["target_lat"],
                "lng": row["target_lng"],
                "district": row["target_district"],
                "state": row["target_state"],
                "requested_quantity": row["quantity"]
            },
            "selected_donor": {
                "facility_id": row["donor_facility_id"],
                "facility_name": row["donor_facility_name"],
                "lat": row["donor_lat"],
                "lng": row["donor_lng"],
                "district": row["donor_district"],
                "state": row["donor_state"],
                "distance_km": row["distance_km"],
                "estimated_transit_minutes": row["estimated_transit_minutes"]
            },
            "medicine_details": {
                "id": row["medicine_id"],
                "name": row["medicine_name"],
                "category": row["medicine_category"],
                "storage_requirement": row["storage_requirement"]
            },
            "vehicle_details": {
                "vehicle_id": row["vehicle_id"],
                "vehicle_type": row["vehicle_type"]
            },
            "logistics_parameters": {
                "distance_km": row["distance_km"],
                "estimated_transit_minutes": row["estimated_transit_minutes"],
                "estimated_transit_hours": round(row["estimated_transit_minutes"] / 60.0, 1),
                "ai_average_speed_kmh": round((row["distance_km"] / max(0.01, row["estimated_transit_minutes"] / 60.0)), 1) if row.get("distance_km") else 36.0,
                "simulation_step_delay_ms": max(150, min(500, int(round(18000 / max(2, len(route_coords)))))) if route_coords else 220,
                "temperature_holdover_hours": row["safe_transit_window_hours"],
                "carbon_offset_kg": row["carbon_kg"],
                "transport_mode": row["vehicle_type"]
            },
            # Top-level helper properties for seamless frontend consumption
            "is_drone": "drone" in (row.get("vehicle_type") or "").lower() or "vtol" in (row.get("vehicle_type") or "").lower(),
            "is_aerial": "drone" in (row.get("vehicle_type") or "").lower() or "vtol" in (row.get("vehicle_type") or "").lower(),
            "vehicle_id": row["vehicle_id"],
            "vehicle_type": row["vehicle_type"],
            "target_facility_name": row["target_facility_name"],
            "donor_facility_name": row["donor_facility_name"],
            "estimated_distance_km": row["distance_km"],
            "distance_km": row["distance_km"],
            "estimated_transit_minutes": row["estimated_transit_minutes"],
            "ai_average_speed_kmh": round((row["distance_km"] / max(0.01, row["estimated_transit_minutes"] / 60.0)), 1) if row.get("distance_km") else 36.0,
            "simulation_step_delay_ms": max(150, min(500, int(round(18000 / max(2, len(route_coords)))))) if route_coords else 220,
            "safe_transit_window_hours": row["safe_transit_window_hours"],
            "route_coordinates": route_coords,
            "ai_reasoning": row["ai_reasoning"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }

reallocation_db = ReallocationDatabaseService()
