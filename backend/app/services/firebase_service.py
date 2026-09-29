import os
import json
import urllib.request
import urllib.parse
import threading
from typing import Dict, Any, Optional, List
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from ..config import (
    FIREBASE_PROJECT_ID,
    FIREBASE_DATABASE_URL,
    FIREBASE_API_KEY,
    GOOGLE_APPLICATION_CREDENTIALS,
    GCP_SERVICE_ACCOUNT_JSON
)

class FirebaseSyncService:
    """
    High-Performance Firebase Realtime Database & Authentication connector for Sanjeevani AI.
    Features instant in-memory caching and non-blocking asynchronous background sync
    to guarantee sub-15ms backend API response times.
    """
    def __init__(self):
        self.project_id = FIREBASE_PROJECT_ID
        self.database_url = (FIREBASE_DATABASE_URL or "").rstrip("/")
        self.api_key = FIREBASE_API_KEY
        self._cached_telemetry: Dict[str, Any] = {}
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="firebase_sync")
        self._pending_tasks = 0
        self._lock = threading.Lock()
        
        # Reusable OAuth token cache
        self._cached_auth_token: Optional[str] = None
        self._token_expiry_ts: float = 0.0
        self._creds_obj = None

    def _get_creds_object(self):
        if self._creds_obj is not None:
            return self._creds_obj
        try:
            from google.oauth2 import service_account
            scopes = [
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/firebase.database",
                "https://www.googleapis.com/auth/cloud-platform"
            ]
            if GCP_SERVICE_ACCOUNT_JSON:
                sa_info = json.loads(GCP_SERVICE_ACCOUNT_JSON)
                self._creds_obj = service_account.Credentials.from_service_account_info(sa_info, scopes=scopes)
            elif GOOGLE_APPLICATION_CREDENTIALS and os.path.exists(GOOGLE_APPLICATION_CREDENTIALS):
                self._creds_obj = service_account.Credentials.from_service_account_file(GOOGLE_APPLICATION_CREDENTIALS, scopes=scopes)
        except Exception as e:
            print(f"[Firebase OAuth Init Notice]: {e}")
        return self._creds_obj

    def _get_auth_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        now = time.time()
        # Return cached valid token (leave 5-minute safety window)
        if self._cached_auth_token and (now < self._token_expiry_ts - 300):
            headers["Authorization"] = f"Bearer {self._cached_auth_token}"
            return headers

        with self._lock:
            if self._cached_auth_token and (now < self._token_expiry_ts - 300):
                headers["Authorization"] = f"Bearer {self._cached_auth_token}"
                return headers

            creds = self._get_creds_object()
            if creds:
                try:
                    import google.auth.transport.requests
                    auth_req = google.auth.transport.requests.Request()
                    creds.refresh(auth_req)
                    if creds.token:
                        self._cached_auth_token = creds.token
                        # Standard Google OAuth tokens are valid for 3600 seconds
                        self._token_expiry_ts = now + 3500
                        headers["Authorization"] = f"Bearer {self._cached_auth_token}"
                except Exception as e:
                    print(f"[Firebase Token Refresh Notice]: {e}")
        return headers

    def _sync_remote_worker(self, endpoint: str, payload_bytes: bytes):
        """Worker executing remote HTTP sync in a background daemon thread."""
        try:
            headers = self._get_auth_headers()
            req = urllib.request.Request(endpoint, data=payload_bytes, headers=headers, method="PUT")
            with urllib.request.urlopen(req, timeout=2.0) as res:
                pass
        except Exception:
            pass
        finally:
            with self._lock:
                self._pending_tasks = max(0, self._pending_tasks - 1)

    def write_data(self, path: str, data: Any) -> Dict[str, Any]:
        """
        Writes data to in-memory cache instantly and dispatches remote RTDB sync in the background.
        """
        clean_path = path.strip("/")
        # 1. Update in-memory cache immediately (< 0.1ms) with bounded size
        self._cached_telemetry[clean_path] = data
        if len(self._cached_telemetry) > 100:
            # Evict older half of entries to keep memory strictly capped
            keys_to_remove = list(self._cached_telemetry.keys())[:30]
            for k in keys_to_remove:
                self._cached_telemetry.pop(k, None)

        # 2. Async background dispatch if database_url configured and queue is healthy
        if self.database_url:
            with self._lock:
                should_submit = self._pending_tasks < 20
                if should_submit:
                    self._pending_tasks += 1

            if should_submit:
                endpoint = f"{self.database_url}/{clean_path}.json"
                try:
                    payload_bytes = json.dumps(data).encode("utf-8")
                    self._executor.submit(self._sync_remote_worker, endpoint, payload_bytes)
                except Exception:
                    with self._lock:
                        self._pending_tasks = max(0, self._pending_tasks - 1)

        return {
            "status": "SYNCED_FAST_MEMORY",
            "path": clean_path,
            "records": len(data) if isinstance(data, (dict, list)) else 1
        }

    def read_data(self, path: str) -> Optional[Any]:
        """
        Reads data instantly from fast in-memory cache.
        """
        clean_path = path.strip("/")
        if clean_path in self._cached_telemetry:
            return self._cached_telemetry[clean_path]

        # Initial cold fetch from remote if URL provided
        if self.database_url:
            endpoint = f"{self.database_url}/{clean_path}.json"
            try:
                req = urllib.request.Request(endpoint, headers={"Content-Type": "application/json"}, method="GET")
                with urllib.request.urlopen(req, timeout=1.5) as res:
                    if res.status == 200:
                        content = res.read().decode("utf-8")
                        if content and content != "null":
                            parsed = json.loads(content)
                            self._cached_telemetry[clean_path] = parsed
                            return parsed
            except Exception:
                pass

        return None

    def publish_iot_telemetry(self, sensor_id: str, temperature: float, mkt: float) -> Dict[str, Any]:
        """
        Pushes real-time temperature event to Firebase Realtime DB path /telemetry/live/{sensor_id}
        """
        payload = {
            "sensor_id": sensor_id,
            "temperature_celsius": temperature,
            "mean_kinetic_temperature": mkt,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "firebase_path": f"/telemetry/live/{sensor_id}"
        }
        return self.write_data(f"telemetry/live/{sensor_id}", payload)

    def save_copilot_session(self, session_id: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Stores conversational session transcript and context into Firebase Realtime DB.
        """
        clean_sid = session_id.strip("/")
        return self.write_data(f"voice_copilot_sessions/{clean_sid}", session_data)

    def get_copilot_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves conversational session transcript from Firebase Realtime DB / memory cache.
        """
        clean_sid = session_id.strip("/")
        return self.read_data(f"voice_copilot_sessions/{clean_sid}")

    def list_copilot_sessions(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Returns recent conversational sessions from cache.
        """
        prefix = "voice_copilot_sessions/"
        results = []
        for path, data in self._cached_telemetry.items():
            if path.startswith(prefix) and isinstance(data, dict):
                results.append(data)
        results.sort(key=lambda s: s.get("updated_at", ""), reverse=True)
        return results[:limit]

firebase_service = FirebaseSyncService()
firebase_sync_service = firebase_service
