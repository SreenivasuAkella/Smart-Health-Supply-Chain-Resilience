import base64
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ..services.gemini_vision import analyze_medicine_image
from .auth import require_role

router = APIRouter(
    tags=["Gemini Multimodal Vision"],
    dependencies=[Depends(require_role(["NATIONAL_DIRECTOR", "PHC_OFFICER"]))]
)

class VisionBase64Request(BaseModel):
    image_base64: str
    mime_type: Optional[str] = "image/jpeg"
    api_key: Optional[str] = None
    custom_api_key: Optional[str] = None
    prompt: Optional[str] = None
    user_context_hint: Optional[str] = None

@router.post("/api/ai/vision/scan-medicine")
async def scan_medicine_upload(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    user_context_hint: Optional[str] = Form(None)
):
    try:
        contents = await file.read()
        mime_type = file.content_type or "image/jpeg"
        result = analyze_medicine_image(contents, mime_type, api_key, user_context_hint=user_context_hint)
        return {"success": True, "data": result, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/ai/vision-scan")
@router.post("/api/ai/vision/scan-medicine-base64")
def scan_medicine_base64(req: VisionBase64Request):
    try:
        b64_data = req.image_base64
        if "," in b64_data:
            b64_data = b64_data.split(",")[1]
        b64_data = b64_data.strip()
        image_bytes = base64.b64decode(b64_data)
        key = req.custom_api_key or req.api_key
        hint = req.user_context_hint or req.prompt
        result = analyze_medicine_image(image_bytes, req.mime_type or "image/jpeg", key, user_context_hint=hint)
        return {"success": True, "data": result, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
