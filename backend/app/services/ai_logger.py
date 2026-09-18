"""
ai_logger.py — Centralized AI Response Logger for Sanjeevani AI Platform.

Logs every AI call (Gemini Vision, Copilot, OpenFDA, Agents) to:
  - A rotating JSONL file: backend/app/data/logs/ai_responses.jsonl
  - In-memory ring buffer (last 500 entries) for fast /api/logs/ai reads.

Log record fields:
  timestamp, session_id, source (vision|copilot|openfda|agents|forecasting),
  model_used, prompt_preview (first 300 chars), response_preview (first 300 chars),
  status (success|fallback|error), latency_ms, error_message, metadata (dict)
"""

import json
import os
import time
import uuid
from collections import deque
from datetime import datetime
from typing import Any, Dict, List, Optional

# ── Storage paths ──────────────────────────────────────────────────────────────
_LOG_DIR  = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "logs")
_LOG_FILE = os.path.join(_LOG_DIR, "ai_responses.jsonl")

os.makedirs(_LOG_DIR, exist_ok=True)

# ── In-memory ring buffer (last 500 records) ───────────────────────────────────
_RING: deque = deque(maxlen=500)

# ── Source labels ─────────────────────────────────────────────────────────────
SOURCE_VISION      = "vision"
SOURCE_COPILOT     = "copilot"
SOURCE_OPENFDA     = "openfda"
SOURCE_AGENTS      = "agents"
SOURCE_FORECASTING = "forecasting"

# ── Status labels ─────────────────────────────────────────────────────────────
STATUS_SUCCESS  = "success"
STATUS_FALLBACK = "fallback"
STATUS_ERROR    = "error"


def log_ai_response(
    *,
    source: str,
    prompt: Optional[str] = None,
    response: Optional[Any] = None,
    model_used: Optional[str] = None,
    status: str = STATUS_SUCCESS,
    latency_ms: Optional[float] = None,
    error_message: Optional[str] = None,
    session_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> str:
    """Write one AI log record. Returns the generated log_id."""
    log_id = f"LOG-{uuid.uuid4().hex[:8].upper()}"
    ts     = datetime.utcnow().isoformat() + "Z"

    def _preview(val: Any, limit: int = 300) -> Optional[str]:
        if val is None:
            return None
        if isinstance(val, dict):
            try:
                val = json.dumps(val, ensure_ascii=False)
            except Exception:
                val = str(val)
        return str(val)[:limit]

    record: Dict[str, Any] = {
        "log_id":           log_id,
        "timestamp":        ts,
        "session_id":       session_id or "anonymous",
        "source":           source,
        "model_used":       model_used or "unknown",
        "status":           status,
        "latency_ms":       round(latency_ms, 1) if latency_ms is not None else None,
        "prompt_preview":   _preview(prompt),
        "response_preview": _preview(response),
        "error_message":    error_message,
        "metadata":         metadata or {},
    }

    # Append to JSONL file
    try:
        with open(_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception as write_err:
        print(f"[AILogger] Failed to write log: {write_err}")

    # Add to ring buffer
    _RING.appendleft(record)

    # Console output
    status_icon = {"success": "✅", "fallback": "⚠️", "error": "❌"}.get(status, "ℹ️")
    latency_str = f"{latency_ms:.0f}ms" if latency_ms is not None else "?"
    print(
        f"[AI LOG] {status_icon} [{ts}] [{source.upper()}] "
        f"model={model_used or 'unknown'} status={status} latency={latency_str} id={log_id}"
    )

    return log_id


def get_recent_logs(
    limit: int = 100,
    source: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Return recent log records from in-memory buffer."""
    records = list(_RING)
    if source:
        records = [r for r in records if r.get("source") == source]
    if status:
        records = [r for r in records if r.get("status") == status]
    return records[:limit]


def get_logs_from_file(
    limit: int = 200,
    source: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Read logs from JSONL file (newest-first)."""
    if not os.path.exists(_LOG_FILE):
        return get_recent_logs(limit=limit, source=source, status=status)

    records: List[Dict[str, Any]] = []
    try:
        with open(_LOG_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()
        for line in reversed(lines):
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                if source and rec.get("source") != source:
                    continue
                if status and rec.get("status") != status:
                    continue
                records.append(rec)
                if len(records) >= limit:
                    break
            except json.JSONDecodeError:
                continue
    except Exception as read_err:
        print(f"[AILogger] File read error: {read_err}")
        return get_recent_logs(limit=limit, source=source, status=status)

    return records


def get_log_stats() -> Dict[str, Any]:
    """Aggregate stats from the ring buffer."""
    all_records = list(_RING)
    if not all_records:
        return {"total": 0, "by_source": {}, "by_status": {}, "avg_latency_ms": None}

    by_source: Dict[str, int] = {}
    by_status: Dict[str, int] = {}
    latencies: List[float] = []

    for r in all_records:
        src = r.get("source", "unknown")
        st  = r.get("status", "unknown")
        lat = r.get("latency_ms")
        by_source[src] = by_source.get(src, 0) + 1
        by_status[st]  = by_status.get(st, 0) + 1
        if lat is not None:
            latencies.append(lat)

    return {
        "total":            len(all_records),
        "by_source":        by_source,
        "by_status":        by_status,
        "avg_latency_ms":   round(sum(latencies) / len(latencies), 1) if latencies else None,
        "success_rate_pct": round(100 * by_status.get("success", 0) / len(all_records), 1),
    }


class AILogContext:
    """
    Context manager for timed, structured AI call logging.

    Usage:
        with AILogContext(source=SOURCE_VISION, prompt=prompt) as ctx:
            result = call_gemini(...)
            ctx.set_result(result, model_used="gemini-3.5-flash")
    """
    def __init__(self, source: str, prompt: Optional[str] = None,
                 session_id: Optional[str] = None, metadata: Optional[Dict] = None):
        self.source     = source
        self.prompt     = prompt
        self.session_id = session_id
        self.metadata   = metadata or {}
        self._t0: float  = 0.0
        self._model: Optional[str]  = None
        self._response: Optional[Any] = None
        self._status: str = STATUS_SUCCESS
        self._error: Optional[str] = None

    def __enter__(self):
        self._t0 = time.monotonic()
        return self

    def set_result(self, response: Any, model_used: Optional[str] = None):
        self._response = response
        self._model = model_used

    def set_fallback(self, response: Any = None, model_used: Optional[str] = None):
        self._response = response
        self._model = model_used or "fallback"
        self._status = STATUS_FALLBACK

    def set_error(self, error: str, model_used: Optional[str] = None):
        self._error = error
        self._model = model_used or "error"
        self._status = STATUS_ERROR

    def __exit__(self, exc_type, exc_val, exc_tb):
        latency_ms = (time.monotonic() - self._t0) * 1000
        if exc_type is not None and self._status == STATUS_SUCCESS:
            self._status = STATUS_ERROR
            self._error  = str(exc_val)
        log_ai_response(
            source=self.source,
            prompt=self.prompt,
            response=self._response,
            model_used=self._model,
            status=self._status,
            latency_ms=latency_ms,
            error_message=self._error,
            session_id=self.session_id,
            metadata=self.metadata,
        )
        return False  # don't suppress exceptions
