from fastapi import APIRouter, HTTPException, Request
from typing import Optional, Any, Dict
from ..services.gemini_copilot import process_copilot_query

router = APIRouter(tags=["Gemini Multilingual Copilot"])

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
        # If prompt_text is somehow an object/dict
        if isinstance(prompt_text, dict):
            prompt_text = prompt_text.get("prompt") or prompt_text.get("query") or str(prompt_text)
            
        lang_code = body.get("language") or body.get("language_code") or "hi"
        facility_id = body.get("facility_id") or "PHC-BARAGAON-03"
        facility_name = body.get("facility_name") or "Primary Health Centre Baragaon"
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
