from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import json
import http

from .routers import auth, inventory, ai_vision, copilot, forecasting, reallocation, telemetry, simulation, analytics, federated, stream, bootstrap, attendance, alerts, speech, routing, mcp, logs

app = FastAPI(
    title="Sanjeevani AI - Smart Health & Supply Chain Resilience API",
    description="Backend API powered by Google Gemini, Vertex AI Predictive Modeling, and Indian Healthcare Datasets",
    version="1.0.0"
)

# Enable CORS for frontend development server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from starlette.exceptions import HTTPException as StarletteHTTPException

# Global Exception Handlers enforcing standardized API format
@app.exception_handler(StarletteHTTPException)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    try:
        phrase = http.HTTPStatus(exc.status_code).phrase
    except Exception:
        phrase = "Error"
    
    err_detail = exc.detail
    if isinstance(err_detail, dict) and "data" in err_detail:
        err_msg = err_detail["data"]
    elif isinstance(err_detail, str):
        err_msg = err_detail
    else:
        err_msg = str(err_detail)

    err_code = exc.status_code
    if exc.status_code == status.HTTP_403_FORBIDDEN or "role" in err_msg.lower() or "permission" in err_msg.lower():
        err_code = 4007
        phrase = "Role Permission Denied"

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "data": err_msg,
            "status": {
                "code": err_code,
                "message": phrase
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_err = "Invalid request format."
    if errors:
        loc = errors[0].get("loc", [])
        field = loc[-1] if len(loc) > 1 else "parameter"
        first_err = f"Invalid {field}."
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "data": first_err,
            "status": {
                "code": 400,
                "message": "Bad Request"
            }
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "data": str(exc) or "Internal server error.",
            "status": {
                "code": 500,
                "message": "Internal Server Error"
            }
        }
    )





# Register routers
app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(ai_vision.router)
app.include_router(copilot.router)
app.include_router(forecasting.router)
app.include_router(reallocation.router)
app.include_router(telemetry.router)
app.include_router(simulation.router)
app.include_router(analytics.router)
app.include_router(federated.router)
app.include_router(stream.router)
app.include_router(bootstrap.router)
# M1: Personnel attendance tracking
app.include_router(attendance.router)
# M2: Early warning notification pipeline
app.include_router(alerts.router)
# M5: Cloud Speech-to-Text & Text-to-Speech
app.include_router(speech.router)
# M6: Google Maps road routing
app.include_router(routing.router)
# MCP: Model Context Protocol Tool Server
app.include_router(mcp.router)
# AI Response Logs
app.include_router(logs.router)

@app.get("/")
def root():
    return {
        "platform": "Sanjeevani AI — BRICS Health & Supply Chain Resilience Platform",
        "track": "BRICS Theme: Resilience — Code for Communities 2",
        "status": "ONLINE",
        "google_ai_services": {
            "generative_ai": "Google Gemini 1.5/2.0 Flash (Multimodal OCR & Multilingual NLU)",
            "predictive_ai": "Vertex AI Generative AI (gemini-1.5-flash-002 via google-cloud-aiplatform SDK)",
            "voice_and_language": "Google Cloud Speech-to-Text V1 + Text-to-Speech V1 (8 Indian languages)",
            "geospatial": "Google Maps Directions API + Leaflet/OSM Visualization",
            "data_layer": "BigQuery, Firebase Realtime IoT, OpenFDA NLEM, WHO GHO, IMD/NOAA Open Portals",
            "notifications": "Firebase Cloud Messaging (FCM) + Twilio SMS Early Warning Pipeline",
            "attendance": "WHO HWF_0001/HWF_0006 + NHSRC HRMIS 2023 PHC Personnel Attendance"
        },
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {
        "data": {
            "service": "Sanjeevani AI Engine (BRICS Resilience)",
            "status": "HEALTHY",
            "version": "1.0.0"
        },
        "status": {
            "code": 2000,
            "message": "Success"
        }
    }


# Automatically wrap EVERY API route in the application with the standardized envelope
from fastapi.routing import APIRoute

def apply_standard_envelope_to_all_routes(fastapi_app: FastAPI):
    """
    Wraps every registered API route handler to guarantee standard output format:
    Success: { "data": ..., "status": { "code": 2000, "message": "Success" } }
    Error:   { "data": "...", "status": { "code": <status_code>, "message": "<phrase>" } }
    """
    for route in fastapi_app.routes:
        if isinstance(route, APIRoute):
            path = route.path
            # Bypass root, swagger docs, and streaming SSE endpoints
            if (
                path in ["/", "/docs", "/redoc", "/openapi.json"]
                or path.startswith("/api/stream")
                or path.startswith("/static")
            ):
                continue

            orig_app = route.app

            def make_wrapper(app_to_wrap):
                async def asgi_wrapper(scope, receive, send):
                    if scope["type"] != "http":
                        await app_to_wrap(scope, receive, send)
                        return

                    status_code = 200
                    headers = []
                    body_parts = []

                    async def custom_send(message):
                        nonlocal status_code, headers, body_parts
                        if message["type"] == "http.response.start":
                            status_code = message["status"]
                            headers = list(message.get("headers", []))
                        elif message["type"] == "http.response.body":
                            body_parts.append(message.get("body", b""))
                            if not message.get("more_body", False):
                                raw = b"".join(body_parts)
                                content_type = ""
                                for k, v in headers:
                                    if k.lower() == b"content-type":
                                        content_type = v.decode("latin1")
                                        break

                                if "application/json" in content_type:
                                    try:
                                        payload = json.loads(raw.decode("utf-8"))
                                        is_wrapped = (
                                            isinstance(payload, dict)
                                            and "status" in payload
                                            and isinstance(payload["status"], dict)
                                            and "code" in payload["status"]
                                            and "message" in payload["status"]
                                            and "data" in payload
                                        )
                                        if is_wrapped:
                                            data_val = payload["data"]
                                            while isinstance(data_val, dict) and "data" in data_val:
                                                data_val = data_val["data"]
                                            st = payload["status"]
                                            if status_code == 403 or st.get("code") == 403 or (status_code >= 400 and ("role" in str(data_val).lower() or "permission" in str(data_val).lower())):
                                                st["code"] = 4007
                                                st["message"] = "Role Permission Denied"
                                            envelope = {
                                                "data": data_val,
                                                "status": st
                                            }
                                            if isinstance(payload, dict):
                                                if "pagination" in payload:
                                                    envelope["pagination"] = payload["pagination"]
                                                if "metadata" in payload:
                                                    envelope["metadata"] = payload["metadata"]
                                            raw = json.dumps(envelope).encode("utf-8")
                                        else:
                                            if 200 <= status_code < 300:
                                                if isinstance(payload, dict):
                                                    if "data" in payload:
                                                        data_val = payload["data"]
                                                    elif "dispatches" in payload:
                                                        data_val = payload["dispatches"]
                                                    elif "sessions" in payload:
                                                        data_val = payload["sessions"]
                                                    elif "session" in payload:
                                                        data_val = payload["session"]
                                                    elif "vehicles" in payload:
                                                        data_val = payload["vehicles"]
                                                    elif "facilities" in payload:
                                                        data_val = payload["facilities"]
                                                    elif "medicines" in payload:
                                                        data_val = payload["medicines"]
                                                    elif "districts" in payload:
                                                        data_val = payload["districts"]
                                                    elif "alerts" in payload:
                                                        data_val = payload["alerts"]
                                                    else:
                                                        cleaned = {k: v for k, v in payload.items() if k not in ["status", "success", "message", "timestamp"]}
                                                        data_val = cleaned if cleaned else payload
                                                else:
                                                    data_val = payload

                                                # Ensure data is never nested as data.data
                                                while isinstance(data_val, dict) and "data" in data_val:
                                                    data_val = data_val["data"]

                                                envelope = {
                                                    "data": data_val,
                                                    "status": {
                                                        "code": 2000,
                                                        "message": "Success"
                                                    }
                                                }
                                                if isinstance(payload, dict):
                                                    if "pagination" in payload:
                                                        envelope["pagination"] = payload["pagination"]
                                                    if "metadata" in payload:
                                                        envelope["metadata"] = payload["metadata"]
                                            else:
                                                try:
                                                    phrase = http.HTTPStatus(status_code).phrase
                                                except Exception:
                                                    phrase = "Error"
                                                if isinstance(payload, dict):
                                                    err_data = payload.get("data") or payload.get("detail") or payload.get("message") or phrase
                                                elif isinstance(payload, str):
                                                    err_data = payload
                                                else:
                                                    err_data = phrase

                                                if isinstance(err_data, list):
                                                    if len(err_data) > 0 and isinstance(err_data[0], dict):
                                                        loc = err_data[0].get("loc", [])
                                                        field = loc[-1] if len(loc) > 1 else "parameter"
                                                        msg = err_data[0].get("msg", "Invalid value")
                                                        err_data = f"Invalid {field}: {msg}"
                                                    else:
                                                        err_data = str(err_data)
                                                elif isinstance(err_data, dict):
                                                    err_data = err_data.get("msg") or str(err_data)

                                                err_code = status_code
                                                if status_code == 403 or "role" in str(err_data).lower() or "permission" in str(err_data).lower():
                                                    err_code = 4007
                                                    phrase = "Role Permission Denied"

                                                envelope = {
                                                    "data": str(err_data),
                                                    "status": {
                                                        "code": err_code,
                                                        "message": phrase
                                                    }
                                                }
                                            raw = json.dumps(envelope).encode("utf-8")
                                    except Exception:
                                        pass

                                new_headers = [(k, v) for k, v in headers if k.lower() != b"content-length"]
                                new_headers.append((b"content-length", str(len(raw)).encode("latin1")))
                                await send({"type": "http.response.start", "status": status_code, "headers": new_headers})
                                await send({"type": "http.response.body", "body": raw, "more_body": False})
                        else:
                            await send(message)

                    await app_to_wrap(scope, receive, custom_send)
                return asgi_wrapper

            route.app = make_wrapper(orig_app)

# Activate route wrapper across all endpoints
apply_standard_envelope_to_all_routes(app)

