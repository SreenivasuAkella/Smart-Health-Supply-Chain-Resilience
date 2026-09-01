from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services.gemini_copilot import process_copilot_query

router = APIRouter(prefix="/api/ai/copilot", tags=["Gemini Multilingual Copilot"])

class CopilotQueryRequest(BaseModel):
    user_prompt: str
    language_code: Optional[str] = "hi"
    facility_id: Optional[str] = "PHC-BARAGAON-03"
    facility_name: Optional[str] = "Primary Health Centre Baragaon"
    api_key: Optional[str] = None

@router.post("/query")
def copilot_query(req: CopilotQueryRequest):
    try:
        result = process_copilot_query(
            user_prompt=req.user_prompt,
            language_code=req.language_code or "hi",
            facility_id=req.facility_id or "PHC-BARAGAON-03",
            facility_name=req.facility_name or "Primary Health Centre Baragaon",
            custom_api_key=req.api_key
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
