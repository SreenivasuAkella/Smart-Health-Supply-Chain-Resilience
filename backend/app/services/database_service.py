import sqlite3
import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from .firebase_service import firebase_service
from .bigquery_service import bigquery_service

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "reallocations.db")

class ReallocationDatabaseService:
    """
    Persistent SQLite Database & Firebase Dual-Sync Service for Sanjeevani AI Reallocations.
    Stores complete reallocation details, vehicle fleet telemetry, road distance metrics,
    route waypoints, and AI agent rationale.
    """
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
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
                driver_name TEXT NOT NULL,
                driver_contact TEXT NOT NULL,
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
                        "Rajesh Kumar Verma",
                        "+91 94501 28471",
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
                        "Sachin Shinde",
                        "+91 98220 91823",
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
                        "K. Murugan",
                        "+91 94432 66201",
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
                        "Amitabh Sharma",
                        "+91 98110 54329",
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
                        "V. Venkatesh",
                        "+91 98480 12398",
                        17.3850,
                        78.4867,
                        300,
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
                vehicle.get("driver_name") or "Rajesh Kumar Verma",
                vehicle.get("driver_contact") or "+91 94501 28471",
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
        """Updates status of a dispatch (e.g. IN_TRANSIT, DELIVERED)."""
        now_str = datetime.utcnow().isoformat() + "Z"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE reallocations SET status = ?, updated_at = ? WHERE dispatch_id = ?", (new_status, now_str, dispatch_id))
            conn.commit()
            updated = cursor.rowcount > 0

        if updated:
            rec = self.get_reallocation(dispatch_id)
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
        """Returns all registered emergency logistics vehicles."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM vehicle_fleet ORDER BY vehicle_id ASC")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

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
                "vehicle_type": row["vehicle_type"],
                "driver_name": row["driver_name"],
                "driver_contact": row["driver_contact"]
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
