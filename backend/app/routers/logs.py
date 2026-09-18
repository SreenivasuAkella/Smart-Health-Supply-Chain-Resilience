"""
logs.py — REST API router for AI response log retrieval.

Endpoints:
  GET /api/logs/ai            — recent logs (ring buffer, fast)
  GET /api/logs/ai/file       — logs from JSONL file (persisted across restarts)
  GET /api/logs/ai/stats      — aggregate stats (count, by_source, by_status, avg_latency)
  DELETE /api/logs/ai/clear   — clear the ring buffer (file retained)
"""

from fastapi import APIRouter, Query
from typing import Optional
from ..services.ai_logger import (
    get_recent_logs,
    get_logs_from_file,
    get_log_stats,
    _RING,
    _LOG_FILE,
    SOURCE_VISION, SOURCE_COPILOT, SOURCE_OPENFDA, SOURCE_AGENTS, SOURCE_FORECASTING,
    STATUS_SUCCESS, STATUS_FALLBACK, STATUS_ERROR,
)
import os

router = APIRouter(tags=["AI Response Logs"])


@router.get("/api/logs/ai")
def list_ai_logs(
    limit:  int            = Query(default=100, ge=1, le=500, description="Max records to return"),
    source: Optional[str]  = Query(default=None, description="Filter by source: vision|copilot|openfda|agents|forecasting"),
    status: Optional[str]  = Query(default=None, description="Filter by status: success|fallback|error"),
):
    """Return recent AI logs from the in-memory ring buffer (fast, session-scoped)."""
    records = get_recent_logs(limit=limit, source=source, status=status)
    return {
        "success": True,
        "count":   len(records),
        "source":  "ring_buffer",
        "logs":    records,
    }


@router.get("/api/logs/ai/file")
def list_ai_logs_file(
    limit:  int            = Query(default=200, ge=1, le=1000, description="Max records to return"),
    source: Optional[str]  = Query(default=None, description="Filter by source"),
    status: Optional[str]  = Query(default=None, description="Filter by status"),
):
    """Return AI logs from the persisted JSONL file (survives server restarts)."""
    records = get_logs_from_file(limit=limit, source=source, status=status)
    file_size_kb = round(os.path.getsize(_LOG_FILE) / 1024, 1) if os.path.exists(_LOG_FILE) else 0
    return {
        "success":     True,
        "count":       len(records),
        "source":      "jsonl_file",
        "file_path":   _LOG_FILE,
        "file_size_kb": file_size_kb,
        "logs":        records,
    }


@router.get("/api/logs/ai/stats")
def ai_log_stats():
    """Return aggregate stats for the current session's AI calls."""
    stats = get_log_stats()
    return {
        "success":   True,
        "log_file":  _LOG_FILE,
        "ring_size": len(_RING),
        "stats":     stats,
        "sources":   [SOURCE_VISION, SOURCE_COPILOT, SOURCE_OPENFDA, SOURCE_AGENTS, SOURCE_FORECASTING],
        "statuses":  [STATUS_SUCCESS, STATUS_FALLBACK, STATUS_ERROR],
    }


@router.delete("/api/logs/ai/clear")
def clear_ai_logs_buffer():
    """Clear the in-memory ring buffer (JSONL file on disk is preserved)."""
    count = len(_RING)
    _RING.clear()
    return {"success": True, "message": f"Cleared {count} records from ring buffer. JSONL file preserved."}
