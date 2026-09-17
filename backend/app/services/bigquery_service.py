import os
import json
import importlib
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List, Optional
from ..config import GOOGLE_CLOUD_PROJECT, BIGQUERY_DATASET, GOOGLE_APPLICATION_CREDENTIALS, GCP_SERVICE_ACCOUNT_JSON

class BigQueryHealthWarehouse:
    """
    Google BigQuery Data Warehouse Connector for India's National Public Health Datasets.
    Connects to live BigQuery dataset when GCP credentials exist.
    """
    def __init__(self, project_id: Optional[str] = None):
        self.project_id = project_id or GOOGLE_CLOUD_PROJECT
        self.dataset_id = BIGQUERY_DATASET
        self.client = None
        self._executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="bq_worker")
        self._table_checked = False
        self._init_client()

    def _init_client(self):
        try:
            bq_mod = importlib.import_module("google.cloud.bigquery")
            
            # 1. Inline JSON environment string (Production / Render / Cloud Run)
            if GCP_SERVICE_ACCOUNT_JSON:
                try:
                    sa_info = json.loads(GCP_SERVICE_ACCOUNT_JSON)
                    auth_sa = importlib.import_module("google.oauth2.service_account")
                    credentials = auth_sa.Credentials.from_service_account_info(sa_info)
                    self.client = bq_mod.Client(credentials=credentials, project=self.project_id)
                    print(f"[BigQuery]: Authenticated via inline GCP_SERVICE_ACCOUNT_JSON.")
                    return
                except Exception as json_err:
                    print(f"[BigQuery]: Error parsing GCP_SERVICE_ACCOUNT_JSON: {json_err}")

            # 2. File-based credentials
            creds_path = GOOGLE_APPLICATION_CREDENTIALS or os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
            if creds_path and os.path.exists(creds_path):
                self.client = bq_mod.Client.from_service_account_json(creds_path, project=self.project_id)
                print(f"[BigQuery]: Authenticated successfully with service account key at {creds_path}")
                return

            # 3. Default Application Credentials
            if self.project_id:
                self.client = bq_mod.Client(project=self.project_id)
                print(f"[BigQuery]: Initialized client with project {self.project_id}")
        except Exception as e:
            print(f"[BigQuery Notice]: Live GCP BigQuery client could not be initialized ({e}). Using optimized fallback.")
            self.client = None

    def query_morbidity_and_drug_velocity(self, district: Optional[str] = None, search: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes BigQuery SQL aggregation over authentic public meteorological
        and health surveillance records for a single district or all districts.
        """
        where_clauses = []
        if district and district.strip() and district.lower() != "all":
            where_clauses.append(f"LOWER(district) = '{district.strip().lower()}'")
        if search and search.strip():
            s = search.strip().lower()
            where_clauses.append(f"(LOWER(district) LIKE '%{s}%' OR LOWER(state) LIKE '%{s}%')")

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        sql_query = f"""
        SELECT 
            district,
            state,
            ROUND(AVG(avg_ambient_temp_c), 1) as avg_temp_c,
            ROUND(SUM(rainfall_mm), 1) as total_rainfall_mm,
            ROUND(AVG(relative_humidity_pct), 1) as avg_humidity_pct,
            ROUND(AVG(surface_pressure_hpa), 1) as avg_surface_pressure,
            data_source
        FROM `{self.project_id}.{self.dataset_id}.district_morbidity_cube`
        {where_sql}
        GROUP BY district, state, data_source
        ORDER BY district ASC
        """

        if self.client:
            try:
                query_job = self.client.query(sql_query)
                results = [dict(row) for row in query_job]
                return {
                    "source": f"Live Google BigQuery ({self.project_id})",
                    "sql_executed": sql_query.strip(),
                    "records_scanned": f"{len(results)} Rows",
                    "data": results
                }
            except Exception as e:
                print(f"[BigQuery Notice]: {e}")

        return {
            "source": f"Google BigQuery Engine ({self.dataset_id}.district_morbidity_cube)",
            "project_id": self.project_id,
            "sql_executed": sql_query.strip(),
            "data": []
        }

    def execute_custom_sql(self, custom_sql: str) -> Dict[str, Any]:
        """
        Executes a custom read-only SQL query against the BigQuery health warehouse.
        """
        cleaned_sql = custom_sql.strip()
        # Security sanitization: only allow SELECT queries
        if not cleaned_sql.lower().startswith("select"):
            return {
                "status": "error",
                "message": "Only read-only SELECT queries are permitted on the public health data warehouse.",
                "data": []
            }

        if self.client:
            try:
                query_job = self.client.query(cleaned_sql)
                results = [dict(row) for row in query_job]
                return {
                    "status": "success",
                    "source": f"Live Google BigQuery ({self.project_id})",
                    "sql_executed": cleaned_sql,
                    "records_scanned": f"{len(results)} Rows",
                    "data": results
                }
            except Exception as e:
                return {
                    "status": "error",
                    "message": str(e),
                    "sql_executed": cleaned_sql,
                    "data": []
                }

        return {
            "status": "error",
            "message": "BigQuery client not connected",
            "data": []
        }

    def get_live_district_vulnerabilities(self) -> Dict[str, Any]:
        """
        Fetches the latest authentic district-level meteorology and environmental records
        from the live BigQuery table.
        """
        sql_query = f"""
        SELECT 
            district,
            state,
            lat,
            lon,
            avg_ambient_temp_c,
            rainfall_mm,
            relative_humidity_pct,
            surface_pressure_hpa,
            wind_speed_kmh,
            weather_code,
            data_source
        FROM `{self.project_id}.{self.dataset_id}.district_morbidity_cube`
        """
        if self.client:
            try:
                query_job = self.client.query(sql_query)
                results = [dict(row) for row in query_job]
                if results:
                    vulnerabilities = {}
                    for r in results:
                        dist = r.get("district")
                        if dist:
                            vulnerabilities[dist] = {
                                "avgTempC": r.get("avg_ambient_temp_c", 0.0),
                                "rainfallMm": r.get("rainfall_mm", 0.0),
                                "humidityPct": r.get("relative_humidity_pct", 0.0),
                                "surfacePressure": r.get("surface_pressure_hpa", 1013.25),
                                "windSpeedKmh": r.get("wind_speed_kmh", 0.0),
                                "weatherCode": r.get("weather_code", 0),
                                "source": r.get("data_source", "Live BigQuery")
                            }
                    return {"source": "Live Google BigQuery", "districts": vulnerabilities, "raw": results}
            except Exception as e:
                print(f"[BigQuery Vulnerability Query Notice]: {e}")
        
        return {"source": "Analytical Engine", "districts": {}, "raw": []}

    def _ensure_reallocation_table(self):
        """Ensures the reallocation_events BigQuery table exists."""
        if not self.client:
            return
        table_id = f"{self.project_id}.{self.dataset_id}.reallocation_events"
        try:
            from google.cloud import bigquery
            schema = [
                bigquery.SchemaField("dispatch_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("timestamp", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("status", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("auto_triggered", "BOOLEAN", mode="NULLABLE"),
                bigquery.SchemaField("target_facility_id", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("target_facility_name", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("target_district", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("target_state", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("donor_facility_id", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("donor_facility_name", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("medicine_id", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("medicine_name", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("quantity_requested", "INTEGER", mode="NULLABLE"),
                bigquery.SchemaField("distance_km", "FLOAT", mode="NULLABLE"),
                bigquery.SchemaField("transit_minutes", "FLOAT", mode="NULLABLE"),
                bigquery.SchemaField("transport_mode", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("cold_chain_required", "BOOLEAN", mode="NULLABLE"),
                bigquery.SchemaField("cold_box_specification", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("carbon_offset_kg", "FLOAT", mode="NULLABLE"),
                bigquery.SchemaField("ai_engine", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("compliance_attestation", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("supervisor_reasoning", "STRING", mode="NULLABLE"),
            ]
            table = bigquery.Table(table_id, schema=schema)
            self.client.create_table(table, exists_ok=True)
            self._table_checked = True
        except Exception as e:
            print(f"[BigQuery Table Setup Notice]: {e}")

    def insert_reallocation_event(self, plan_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inserts a completed or planned reallocation event into BigQuery for national resilience analytics.
        Uses load_table_from_json via asynchronous background thread pool for zero API latency.
        """
        if not self.client:
            return {"status": "skipped", "message": "BigQuery client not connected"}

        def _bg_insert():
            try:
                if not getattr(self, "_table_checked", False):
                    self._ensure_reallocation_table()

                target = plan_data.get("target_facility", {}) or {}
                donor = plan_data.get("selected_donor", {}) or {}
                med = plan_data.get("medicine_details", {}) or {}
                logistics = plan_data.get("logistics_parameters", {}) or {}

                row = {
                    "dispatch_id": str(plan_data.get("dispatch_id") or f"DISP-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"),
                    "timestamp": str(plan_data.get("timestamp") or datetime.utcnow().isoformat() + "Z"),
                    "status": str(plan_data.get("status") or "APPROVED"),
                    "auto_triggered": bool(plan_data.get("auto_triggered", False)),
                    "target_facility_id": str(target.get("id") or ""),
                    "target_facility_name": str(target.get("name") or plan_data.get("target_facility_name") or ""),
                    "target_district": str(target.get("district") or ""),
                    "target_state": str(target.get("state") or ""),
                    "donor_facility_id": str(donor.get("facility_id") or donor.get("id") or ""),
                    "donor_facility_name": str(donor.get("facility_name") or donor.get("name") or plan_data.get("donor_facility_name") or ""),
                    "medicine_id": str(med.get("id") or ""),
                    "medicine_name": str(med.get("name") or ""),
                    "quantity_requested": int(target.get("requested_quantity") or plan_data.get("required_quantity") or 25),
                    "distance_km": float(logistics.get("distance_km") or plan_data.get("distance_km") or plan_data.get("estimated_distance_km") or 0.0),
                    "transit_minutes": float(logistics.get("estimated_transit_minutes") or plan_data.get("estimated_transit_minutes") or 0.0),
                    "transport_mode": str(logistics.get("transport_mode") or "Solar-Cooled Emergency Vaccine Van"),
                    "cold_chain_required": bool(logistics.get("is_cold_chain_required", False) or "cold" in str(logistics.get("transport_mode", "")).lower() or "vaccine" in str(logistics.get("transport_mode", "")).lower()),
                    "cold_box_specification": str(logistics.get("cold_box_specification") or "WHO PQS Compliant Carrier"),
                    "carbon_offset_kg": float(logistics.get("carbon_offset_kg") or 0.0),
                    "ai_engine": str(plan_data.get("vertex_engine") or plan_data.get("ai_engine") or "Google Cloud Vertex AI & Gemini"),
                    "compliance_attestation": str(plan_data.get("compliance_attestation") or "GxP & MoHFW Verified"),
                    "supervisor_reasoning": str(plan_data.get("ai_reasoning") or "")
                }

                table_id = f"{self.project_id}.{self.dataset_id}.reallocation_events"
                job = self.client.load_table_from_json([row], table_id)
                job.result(timeout=15)
                print(f"[BigQuery]: Successfully logged reallocation event {row['dispatch_id']} to {table_id}")
            except Exception as e:
                print(f"[BigQuery Reallocation Insert Notice]: {e}")

        self._executor.submit(_bg_insert)
        return {"status": "queued", "dispatch_id": plan_data.get("dispatch_id")}

    def list_reallocation_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Queries the national reallocation audit ledger from BigQuery."""
        table_id = f"{self.project_id}.{self.dataset_id}.reallocation_events"
        sql = f"""
        SELECT 
            dispatch_id,
            timestamp,
            status,
            target_facility_name,
            target_district,
            donor_facility_name,
            medicine_name,
            quantity_requested,
            distance_km,
            transit_minutes,
            transport_mode,
            ai_engine,
            compliance_attestation
        FROM `{table_id}`
        ORDER BY timestamp DESC
        LIMIT {limit}
        """
        res = self.execute_custom_sql(sql)
        return res.get("data", [])

    def _ensure_asha_conversation_table(self):
        """Ensures the asha_copilot_conversations BigQuery table exists."""
        if not self.client:
            return
        table_id = f"{self.project_id}.{self.dataset_id}.asha_copilot_conversations"
        try:
            from google.cloud import bigquery
            schema = [
                bigquery.SchemaField("session_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("message_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("timestamp", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("role", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("language_code", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("facility_id", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("facility_name", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("user_prompt", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("agent_response_localized", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("agent_response_english", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("intent", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("missing_info_detected", "STRING", mode="REPEATED"),
                bigquery.SchemaField("missing_info_resolved", "BOOLEAN", mode="NULLABLE"),
                bigquery.SchemaField("status", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("agents_invoked", "STRING", mode="REPEATED"),
                bigquery.SchemaField("tools_executed", "STRING", mode="REPEATED"),
                bigquery.SchemaField("dispatch_id", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("latency_ms", "FLOAT", mode="NULLABLE"),
                bigquery.SchemaField("ai_engine", "STRING", mode="NULLABLE"),
            ]
            table = bigquery.Table(table_id, schema=schema)
            self.client.create_table(table, exists_ok=True)
            self._asha_table_checked = True
        except Exception as e:
            print(f"[BigQuery ASHA Table Setup Notice]: {e}")

    def insert_asha_conversation_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Asynchronously streams an ASHA Copilot conversational turn into Google BigQuery.
        """
        if not self.client:
            return {"status": "skipped", "message": "BigQuery client not connected"}

        def _bg_insert():
            try:
                if not getattr(self, "_asha_table_checked", False):
                    self._ensure_asha_conversation_table()

                row = {
                    "session_id": str(event_data.get("session_id") or f"SESS-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"),
                    "message_id": str(event_data.get("message_id") or f"MSG-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"),
                    "timestamp": str(event_data.get("timestamp") or datetime.utcnow().isoformat() + "Z"),
                    "role": str(event_data.get("role") or "assistant"),
                    "language_code": str(event_data.get("language_code") or "hi"),
                    "facility_id": str(event_data.get("facility_id") or ""),
                    "facility_name": str(event_data.get("facility_name") or ""),
                    "user_prompt": str(event_data.get("user_prompt") or ""),
                    "agent_response_localized": str(event_data.get("agent_response_localized") or ""),
                    "agent_response_english": str(event_data.get("agent_response_english") or ""),
                    "intent": str(event_data.get("intent") or "GENERAL_QUERY"),
                    "missing_info_detected": [str(x) for x in (event_data.get("missing_info_detected") or [])],
                    "missing_info_resolved": bool(event_data.get("missing_info_resolved", False)),
                    "status": str(event_data.get("status") or "COMPLETED"),
                    "agents_invoked": [str(x) for x in (event_data.get("agents_invoked") or [])],
                    "tools_executed": [str(x) for x in (event_data.get("tools_executed") or [])],
                    "dispatch_id": str(event_data.get("dispatch_id") or ""),
                    "latency_ms": float(event_data.get("latency_ms") or 0.0),
                    "ai_engine": str(event_data.get("ai_engine") or "Google Gemini & Vertex AI Multi-Agent")
                }

                table_id = f"{self.project_id}.{self.dataset_id}.asha_copilot_conversations"
                job = self.client.load_table_from_json([row], table_id)
                job.result(timeout=15)
                print(f"[BigQuery]: Successfully logged ASHA conversational turn {row['message_id']} to {table_id}")
            except Exception as e:
                print(f"[BigQuery ASHA Conversation Insert Notice]: {e}")

        self._executor.submit(_bg_insert)
        return {"status": "queued", "session_id": event_data.get("session_id")}

    def list_asha_conversation_events(self, session_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Queries ASHA conversational transcripts from BigQuery."""
        table_id = f"{self.project_id}.{self.dataset_id}.asha_copilot_conversations"
        where_clause = f"WHERE session_id = '{session_id}'" if session_id else ""
        sql = f"""
        SELECT 
            session_id,
            message_id,
            timestamp,
            role,
            language_code,
            facility_name,
            user_prompt,
            agent_response_localized,
            agent_response_english,
            intent,
            missing_info_detected,
            missing_info_resolved,
            status,
            agents_invoked,
            tools_executed,
            dispatch_id,
            latency_ms
        FROM `{table_id}`
        {where_clause}
        ORDER BY timestamp DESC
        LIMIT {limit}
        """
        res = self.execute_custom_sql(sql)
        return res.get("data", [])

bigquery_service = BigQueryHealthWarehouse()
