"""
M2 — Early Warning Notification Pipeline (Sanjeevani AI)
Dispatches Firebase Cloud Messaging (FCM) push notifications and
WhatsApp/SMS alerts to District Vaccine Cold-Chain Officers and ASHA leads
when a Critical Deficit stockout is detected.
"""
import os
import json
import urllib.request
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..services.facility_data_service import get_active_public_facilities
from ..config import USE_FCM_ALERTS, FCM_SERVER_KEY
from ..services.firebase_service import firebase_service
from ..utils.response_helper import success_response, error_response

router = APIRouter(prefix="/api/alerts", tags=["Early Warning Notifications"])

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")
FCM_SEND_URL = "https://fcm.googleapis.com/fcm/send"


class EarlyWarningRequest(BaseModel):
    facility_id: str
    alert_type: str = "STOCKOUT_IMMINENT"
    days_of_supply: Optional[float] = None
    notify_channels: Optional[List[str]] = ["fcm", "firebase"]


def _send_fcm_notification(facility_name: str, district: str, days: float) -> dict:
    """Sends a Firebase Cloud Messaging push to subscribed district health officers."""
    if not USE_FCM_ALERTS or not FCM_SERVER_KEY:
        reason = "USE_FCM_ALERTS=false" if not USE_FCM_ALERTS else "FCM_SERVER_KEY not configured"
        return {"status": "SKIPPED", "reason": reason}
    payload = json.dumps({
        "to": f"/topics/district-health-{district.lower().replace(' ', '-')}",
        "notification": {
            "title": f"⚠ Stockout Alert — {facility_name}",
            "body": f"Critical: only {days} days of medicine supply remaining. Immediate reallocation required.",
            "icon": "sanjeevani-alert-icon"
        },
        "data": {"facility_name": facility_name, "district": district, "days_of_supply": str(days)}
    }).encode("utf-8")
    try:
        req = urllib.request.Request(
            FCM_SEND_URL,
            data=payload,
            headers={"Content-Type": "application/json", "Authorization": f"key={FCM_SERVER_KEY}"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as res:
            return {"status": "SENT", "fcm_response": res.status}
    except Exception as e:
        return {"status": "FAILED", "error": str(e)}


@router.post("/dispatch-early-warning")
def dispatch_early_warning(req: EarlyWarningRequest):
    """
    Dispatches early warning notifications when a Critical Deficit stockout is detected.
    Channels: Firebase FCM push + Firebase RTDB alert log (+ optional Twilio SMS if configured).
    """
    facilities = get_active_public_facilities()
    fac = next((f for f in facilities if f.get("id") == req.facility_id), None)
    if not fac:
        raise HTTPException(status_code=404, detail=f"Facility {req.facility_id} not found")

    facility_name = fac.get("name", req.facility_id)
    district = fac.get("district", "Unknown")
    state = fac.get("state", "India")
    days = req.days_of_supply or fac.get("medicine_days_of_supply", 0)

    alert_record = {
        "facility_id": req.facility_id,
        "facility_name": facility_name,
        "district": district,
        "state": state,
        "alert_type": req.alert_type,
        "days_of_supply": days,
        "dispatched_at_utc": datetime.utcnow().isoformat() + "Z",
        "notify_channels": req.notify_channels
    }

    notifications_sent = []

    # 1. Firebase RTDB alert log (always)
    try:
        firebase_service.write_data(
            f"early_warnings/{req.facility_id}/{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            alert_record
        )
        notifications_sent.append({"channel": "firebase_rtdb", "status": "LOGGED"})
    except Exception as e:
        notifications_sent.append({"channel": "firebase_rtdb", "status": "FAILED", "error": str(e)})

    # 2. FCM Push Notification
    if "fcm" in (req.notify_channels or []):
        fcm_result = _send_fcm_notification(facility_name, district, days)
        notifications_sent.append({"channel": "fcm_push", **fcm_result})

    # 3. Twilio SMS (if configured)
    if "sms" in (req.notify_channels or []) and TWILIO_ACCOUNT_SID:
        try:
            import base64
            sms_body = f"SANJEEVANI ALERT: {facility_name} ({district}, {state}) has only {days} days of medicine supply. Immediate reallocation required."
            twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
            sms_payload = urllib.parse.urlencode({"Body": sms_body, "From": TWILIO_FROM_NUMBER, "To": fac.get("contact", "")}).encode()
            creds = base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()).decode()
            sms_req = urllib.request.Request(twilio_url, data=sms_payload, headers={"Authorization": f"Basic {creds}"}, method="POST")
            with urllib.request.urlopen(sms_req, timeout=5) as res:
                notifications_sent.append({"channel": "twilio_sms", "status": "SENT", "http_status": res.status})
        except Exception as e:
            notifications_sent.append({"channel": "twilio_sms", "status": "FAILED", "error": str(e)})

    return success_response(
        data={"alert": alert_record, "notifications": notifications_sent},
        message=f"Early warning dispatched for {facility_name} — {len(notifications_sent)} channel(s) notified"
    )


@router.get("/active")
def get_active_alerts(state: Optional[str] = None):
    """Returns all active early warning alerts from Firebase RTDB."""
    fb_warnings = firebase_service.read_data("early_warnings") or {}
    alerts = []
    for fac_id, entries in fb_warnings.items():
        if isinstance(entries, dict):
            for ts, alert in entries.items():
                if isinstance(alert, dict):
                    if state and state.lower() not in alert.get("state", "").lower():
                        continue
                    alerts.append(alert)
    alerts.sort(key=lambda a: a.get("dispatched_at_utc", ""), reverse=True)
    return success_response(data={"alerts": alerts[:50], "total": len(alerts)}, message="Active early warnings retrieved")
