from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Optional, Any, Dict, List
import time
from pydantic import BaseModel
from ..services.gemini_copilot import (
    process_copilot_query,
    process_copilot_chat,
    process_copilot_chat_streaming,
    save_copilot_response,
    get_copilot_dispatch_history,
    get_copilot_session_by_id,
    list_recent_copilot_sessions
)
from ..services.ai_logger import log_ai_response, SOURCE_COPILOT, STATUS_SUCCESS, STATUS_ERROR

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


def _extract_user_role(request: Request, body_or_params: Optional[Dict[str, Any]] = None) -> str:
    """
    Extracts the authenticated user's role from the Authorization header Bearer token.
    Falls back to payload user_role/role, or defaults to 'PHC_OFFICER'.
    """
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            from ..services.auth_service import auth_service
            payload = auth_service.verify_access_token(token)
            if payload and payload.get("role"):
                return str(payload.get("role")).upper()
        except Exception:
            pass
    if body_or_params and isinstance(body_or_params, dict):
        role = body_or_params.get("user_role") or body_or_params.get("role")
        if role:
            return str(role).upper()
    return "PHC_OFFICER"

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
    prompt_text: str | None = None
    session_id: str | None = None
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

        image_base64 = body.get("image_base64") or body.get("imageBase64")
        image_mime_type = body.get("image_mime_type") or body.get("mimeType") or "image/jpeg"

        user_role = _extract_user_role(request, body)

        _t0 = time.monotonic()
        result = process_copilot_chat(
            prompt=str(prompt_text),
            session_id=str(session_id) if session_id else None,
            language_code=str(lang_code),
            facility_id=facility_id,
            facility_name=facility_name,
            source_facility_id=str(source_facility_id) if source_facility_id and str(source_facility_id) != "AUTO_NEAREST_SURPLUS" else None,
            source_facility_name=str(source_facility_name) if source_facility_name else None,
            conversation_history=conversation_history,
            custom_api_key=key,
            image_base64=str(image_base64) if image_base64 else None,
            image_mime_type=str(image_mime_type),
            user_role=user_role
        )
        log_ai_response(
            source=SOURCE_COPILOT,
            prompt=str(prompt_text),
            response=result,
            model_used=result.get("model_used") if isinstance(result, dict) else None,
            status=STATUS_SUCCESS,
            latency_ms=(time.monotonic() - _t0) * 1000,
            session_id=str(session_id) if session_id else None,
            metadata={"language": lang_code, "facility_id": facility_id},
        )
        return {"success": True, "data": result}
    except Exception as e:
        log_ai_response(
            source=SOURCE_COPILOT,
            prompt=str(prompt_text) if prompt_text is not None else None,
            status=STATUS_ERROR,
            error_message=str(e),
            session_id=str(session_id) if session_id else None,
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/copilot/chat/stream")
@router.get("/api/ai/copilot/chat/stream")
async def copilot_chat_stream(request: Request):
    """
    Server-Sent Events (SSE) streaming endpoint for Copilot chat.
    Emits incremental progress events as the agentic pipeline runs,
    then delivers the final result event — eliminating the blank spinner.

    Query params mirror the POST /chat body fields for GET-based SSE.
    Also accepts POST body if called as POST.
    """
    try:
        # Accept query params for GET-based EventSource
        params = dict(request.query_params)
        prompt_text = params.get("prompt") or params.get("query") or ""
        session_id = params.get("session_id") or params.get("sessionId")
        lang_code = params.get("language") or params.get("language_code") or "hi"
        raw_fac_id = params.get("facility_id") or params.get("target_facility_id")
        raw_fac_name = params.get("facility_name") or params.get("target_facility_name")
        facility_id = str(raw_fac_id).strip() if raw_fac_id and str(raw_fac_id).strip() not in ["null", "undefined", "AUTO", ""] else None
        facility_name = str(raw_fac_name).strip() if raw_fac_name and str(raw_fac_name).strip() not in ["null", "undefined", "AUTO", ""] else None
        source_facility_id = params.get("source_facility_id")
        source_facility_name = params.get("source_facility_name")
        key = params.get("apiKey") or params.get("api_key")
        image_base64 = params.get("image_base64")
        image_mime_type = params.get("image_mime_type") or "image/jpeg"
        user_role = _extract_user_role(request, params)

        generator = process_copilot_chat_streaming(
            prompt=prompt_text,
            session_id=str(session_id) if session_id else None,
            language_code=str(lang_code),
            facility_id=facility_id,
            facility_name=facility_name,
            source_facility_id=str(source_facility_id) if source_facility_id else None,
            source_facility_name=str(source_facility_name) if source_facility_name else None,
            custom_api_key=key,
            image_base64=str(image_base64) if image_base64 else None,
            image_mime_type=str(image_mime_type),
            user_role=user_role
        )

        return StreamingResponse(
            generator,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/copilot/chat/stream")
@router.post("/api/ai/copilot/chat/stream")
async def copilot_chat_stream_post(request: Request):
    """
    POST variant of the SSE streaming endpoint — used when the request payload
    includes image_base64 or other large fields not suitable for query params.
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
        source_facility_id = body.get("source_facility_id") or body.get("sourceFacilityId")
        source_facility_name = body.get("source_facility_name") or body.get("sourceFacilityName")
        key = body.get("apiKey") or body.get("custom_api_key") or body.get("api_key")
        image_base64 = body.get("image_base64") or body.get("imageBase64")
        image_mime_type = body.get("image_mime_type") or body.get("mimeType") or "image/jpeg"
        conversation_history = body.get("conversation_history") or body.get("history") or []
        user_role = _extract_user_role(request, body)

        generator = process_copilot_chat_streaming(
            prompt=str(prompt_text),
            session_id=str(session_id) if session_id else None,
            language_code=str(lang_code),
            facility_id=facility_id,
            facility_name=facility_name,
            source_facility_id=str(source_facility_id) if source_facility_id else None,
            source_facility_name=str(source_facility_name) if source_facility_name else None,
            conversation_history=conversation_history,
            custom_api_key=key,
            image_base64=str(image_base64) if image_base64 else None,
            image_mime_type=str(image_mime_type),
            user_role=user_role
        )

        return StreamingResponse(
            generator,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SaveResponseRequest(BaseModel):
    session_id: Optional[str] = None
    message_id: Optional[str] = None
    user_prompt: str = ""
    language_code: str = "hi"
    facility_id: Optional[str] = None
    facility_name: Optional[str] = None
    response_text_localized: str = ""
    response_text_english: str = ""
    intent: str = "GENERAL_QUERY"
    status: str = "COMPLETED"
    agents_invoked: Optional[List[str]] = None
    tools_executed: Optional[List[str]] = None
    recommended_action: Optional[Dict[str, Any]] = None
    ai_engine: str = "Google Gemini & Vertex AI"


@router.post("/api/copilot/save-response")
@router.post("/api/ai/copilot/save-response")
async def copilot_save_response(req: SaveResponseRequest):
    """
    Explicitly persists a single Copilot response to Firebase + BigQuery.
    Called by the frontend 'Save to DB' button after the user reviews the AI response.
    """
    try:
        result = save_copilot_response(
            session_id=req.session_id,
            message_id=req.message_id,
            user_prompt=req.user_prompt,
            language_code=req.language_code,
            facility_id=req.facility_id,
            facility_name=req.facility_name,
            response_text_localized=req.response_text_localized,
            response_text_english=req.response_text_english,
            intent=req.intent,
            status=req.status,
            agents_invoked=req.agents_invoked,
            tools_executed=req.tools_executed,
            recommended_action=req.recommended_action,
            ai_engine=req.ai_engine
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/api/copilot/preempt-dispatch")
@router.post("/api/ai/copilot/preempt-dispatch")
async def copilot_preempt_dispatch(request: Request):
    """
    Supervisory Fleet Pre-emption & Override Endpoint.
    Allows District Health Officers to reroute in-transit delivery drones/EVs to emergency PHCs.
    """
    try:
        body = await request.json()
        if not isinstance(body, dict):
            body = {}
        
        dispatch_id = body.get("dispatch_id") or body.get("dispatchId") or "VOX-DISP-0841"
        target_fac_id = body.get("target_facility_id") or body.get("targetFacilityId") or "PHC-BARAGAON-03"
        target_fac_name = body.get("target_facility_name") or body.get("targetFacilityName") or "Emergency Facility"
        supervisor_id = body.get("supervisor_id") or body.get("supervisorId") or "DHO-OFFICER-COMMAND"
        reason = body.get("reason") or "EMERGENCY_OVERRIDE"

        from ..services.ai_agents_service import preempt_active_dispatch
        result = preempt_active_dispatch(
            dispatch_id=dispatch_id,
            target_facility_id=target_fac_id,
            target_facility_name=target_fac_name,
            supervisor_id=supervisor_id,
            reason=reason
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
        user_role = _extract_user_role(request, body)

        result = process_copilot_query(
            user_prompt=str(prompt_text),
            language_code=str(lang_code),
            facility_id=facility_id or "PHC-BARAGAON-03",
            facility_name=facility_name or "Primary Health Centre Baragaon",
            source_facility_id=str(source_facility_id) if source_facility_id and str(source_facility_id) != "AUTO_NEAREST_SURPLUS" else None,
            source_facility_name=str(source_facility_name) if source_facility_name else None,
            custom_api_key=key,
            user_role=user_role
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
