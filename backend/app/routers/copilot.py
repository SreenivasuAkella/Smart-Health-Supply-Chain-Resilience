from fastapi import APIRouter, HTTPException, Request
from typing import Optional, Any, Dict
from ..services.gemini_copilot import (
    process_copilot_query,
    process_copilot_chat,
    get_copilot_dispatch_history,
    get_copilot_session_by_id,
    list_recent_copilot_sessions
)

router = APIRouter(tags=["Gemini Multilingual Copilot"])

# Lazy-loaded default facility from live registry (resolved once on first call)
_DEFAULT_FACILITY: Dict[str, str] = {}

def _get_default_facility() -> Dict[str, str]:
    global _DEFAULT_FACILITY
    if _DEFAULT_FACILITY:
        return _DEFAULT_FACILITY
    try:
        from ..services.facility_data_service import get_active_public_facilities
        facs = get_active_public_facilities(limit=1)
        if facs:
            _DEFAULT_FACILITY = {"id": facs[0]["id"], "name": facs[0]["name"]}
            return _DEFAULT_FACILITY
    except Exception:
        pass
    return {"id": "PHC-AND-001", "name": "Andaman Islands Block Primary Health Centre"}

@router.get("/api/copilot/status")
def copilot_status():
    return {
        "status": "ONLINE",
        "model": "gemini-1.5-flash",
        "supported_languages": 8,
        "capabilities": ["multi-turn-conversational", "dynamic-agent-selection", "slot-clarification", "bigquery-firebase-sync"]
    }

@router.get("/api/copilot/history")
@router.get("/api/copilot/dispatches")
@router.get("/api/ai/copilot/history")
def copilot_history():
    history = get_copilot_dispatch_history()
    return {"success": True, "dispatches": history, "count": len(history)}

@router.get("/api/copilot/sessions")
@router.get("/api/copilot/conversations")
@router.get("/api/ai/copilot/sessions")
def copilot_sessions():
    sessions = list_recent_copilot_sessions()
    return {"success": True, "sessions": sessions, "count": len(sessions)}

@router.get("/api/copilot/sessions/{session_id}")
@router.get("/api/copilot/conversations/{session_id}")
@router.get("/api/ai/copilot/sessions/{session_id}")
def copilot_session_detail(session_id: str):
    sess = get_copilot_session_by_id(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return {"success": True, "session": sess}

@router.post("/api/copilot/chat")
@router.post("/api/ai/copilot/chat")
async def copilot_chat(request: Request):
    """
    Conversational GenAI Multi-Turn endpoint.
    Manages session memory, clarifies missing parameters, picks specialized agents/tools,
    and returns rich multimodal responses with dual BigQuery and Firebase sync.
    """
    try:
        body = await request.json()
        if not isinstance(body, dict):
            body = {}

        prompt_text = body.get("prompt") or body.get("query") or body.get("user_prompt") or ""
        if isinstance(prompt_text, dict):
            prompt_text = prompt_text.get("prompt") or prompt_text.get("query") or str(prompt_text)

        session_id = body.get("session_id") or body.get("sessionId")
        lang_code = body.get("language") or body.get("language_code") or "hi"

        raw_fac_id = body.get("target_facility_id") or body.get("facility_id")
        raw_fac_name = body.get("target_facility_name") or body.get("facility_name")
        facility_id = str(raw_fac_id).strip() if raw_fac_id and str(raw_fac_id).strip() not in ["null", "undefined", "AUTO", ""] else None
        facility_name = str(raw_fac_name).strip() if raw_fac_name and str(raw_fac_name).strip() not in ["null", "undefined", "AUTO", ""] else None

        source_facility_id = body.get("source_facility_id") or body.get("sourceFacilityId") or body.get("donor_facility_id")
        source_facility_name = body.get("source_facility_name") or body.get("sourceFacilityName") or body.get("donor_facility_name")
        conversation_history = body.get("conversation_history") or body.get("history") or []
        key = body.get("apiKey") or body.get("custom_api_key") or body.get("api_key")

        result = process_copilot_chat(
            prompt=str(prompt_text),
            session_id=str(session_id) if session_id else None,
            language_code=str(lang_code),
            facility_id=facility_id,
            facility_name=facility_name,
            source_facility_id=str(source_facility_id) if source_facility_id and str(source_facility_id) != "AUTO_NEAREST_SURPLUS" else None,
            source_facility_name=str(source_facility_name) if source_facility_name else None,
            conversation_history=conversation_history,
            custom_api_key=key
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/copilot/ask")
@router.post("/api/copilot/query")
@router.post("/api/ai/copilot/query")
@router.post("/api/ai/copilot/ask")
async def copilot_query(request: Request):
    try:
        body = await request.json()
        if not isinstance(body, dict):
            body = {}

        prompt_text = body.get("prompt") or body.get("query") or body.get("user_prompt") or "Emergency stock requisition"
        if isinstance(prompt_text, dict):
            prompt_text = prompt_text.get("prompt") or prompt_text.get("query") or str(prompt_text)

        lang_code = body.get("language") or body.get("language_code") or "hi"

        raw_fac_id = body.get("target_facility_id") or body.get("facility_id")
        raw_fac_name = body.get("target_facility_name") or body.get("facility_name")
        facility_id = str(raw_fac_id).strip() if raw_fac_id and str(raw_fac_id).strip() not in ["null", "undefined", "AUTO", ""] else None
        facility_name = str(raw_fac_name).strip() if raw_fac_name and str(raw_fac_name).strip() not in ["null", "undefined", "AUTO", ""] else None

        source_facility_id = body.get("source_facility_id") or body.get("sourceFacilityId") or body.get("donor_facility_id")
        source_facility_name = body.get("source_facility_name") or body.get("sourceFacilityName") or body.get("donor_facility_name")
        key = body.get("apiKey") or body.get("custom_api_key") or body.get("api_key")

        result = process_copilot_query(
            user_prompt=str(prompt_text),
            language_code=str(lang_code),
            facility_id=facility_id or "PHC-BARAGAON-03",
            facility_name=facility_name or "Primary Health Centre Baragaon",
            source_facility_id=str(source_facility_id) if source_facility_id and str(source_facility_id) != "AUTO_NEAREST_SURPLUS" else None,
            source_facility_name=str(source_facility_name) if source_facility_name else None,
            custom_api_key=key
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
