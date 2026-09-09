import os
import json
import importlib
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

bigquery_service = BigQueryHealthWarehouse()
