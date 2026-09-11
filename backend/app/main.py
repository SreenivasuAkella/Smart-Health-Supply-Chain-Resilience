from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import inventory, ai_vision, copilot, forecasting, reallocation, telemetry, simulation, analytics, federated, stream, bootstrap, attendance, alerts, speech, routing

app = FastAPI(
    title="Sanjeevani AI - Smart Health & Supply Chain Resilience API",
    description="Backend API powered by Google Gemini, Vertex AI Predictive Modeling, and Indian Healthcare Datasets",
    version="1.0.0"
)

# Enable CORS for frontend Vite development server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
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

@app.get("/")
def root():
    return {
        "platform": "Sanjeevani AI (Smart Health & Supply Chain Resilience)",
        "track": "Track 3 — Code for Communities 2",
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
    return {"status": "HEALTHY", "version": "1.0.0"}
