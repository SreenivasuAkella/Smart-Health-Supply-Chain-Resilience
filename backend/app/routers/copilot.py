from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services.gemini_copilot import process_copilot_query

router = APIRouter(tags=["Gemini Multilingual Copilot"])

class CopilotQueryRequest(BaseModel):
    query: Optional[str] = None
    user_prompt: Optional[str] = None
    language: Optional[str] = None
    language_code: Optional[str] = None
    facility_id: Optional[str] = "PHC-BARAGAON-03"
    facility_name: Optional[str] = "Primary Health Centre Baragaon"
    custom_api_key: Optional[str] = None
    api_key: Optional[str] = None

@router.post("/api/copilot/ask")
@router.post("/api/copilot/query")
@router.post("/api/ai/copilot/query")
@router.post("/api/ai/copilot/ask")
def copilot_query(req: CopilotQueryRequest):
    try:
        prompt_text = req.query or req.user_prompt or "ASV shortage emergency"
        lang_code = req.language or req.language_code or "hi"
        key = req.custom_api_key or req.api_key

        result = process_copilot_query(
            user_prompt=prompt_text,
            language_code=lang_code,
            facility_id=req.facility_id or "PHC-BARAGAON-03",
            facility_name=req.facility_name or "Primary Health Centre Baragaon",
            custom_api_key=key
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
