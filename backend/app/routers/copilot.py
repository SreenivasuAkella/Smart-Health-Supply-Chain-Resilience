from fastapi import APIRouter, HTTPException, Request
from typing import Optional, Any, Dict
from ..services.gemini_copilot import process_copilot_query, get_copilot_dispatch_history

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
    return {"status": "ONLINE", "model": "gemini-1.5-flash", "supported_languages": 8}

@router.get("/api/copilot/history")
@router.get("/api/copilot/dispatches")
def copilot_history():
    history = get_copilot_dispatch_history()
    return {"success": True, "dispatches": history, "count": len(history)}

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

        # H4: Resolve default facility from live registry, not hardcoded string
        default_fac = _get_default_facility()
        facility_id = body.get("facility_id") or default_fac["id"]
        facility_name = body.get("facility_name") or default_fac["name"]
        key = body.get("apiKey") or body.get("custom_api_key") or body.get("api_key")

        result = process_copilot_query(
            user_prompt=str(prompt_text),
            language_code=str(lang_code),
            facility_id=str(facility_id),
            facility_name=str(facility_name),
            custom_api_key=key
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
