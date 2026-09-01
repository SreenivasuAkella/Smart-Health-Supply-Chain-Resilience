from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import inventory, ai_vision, copilot, forecasting, reallocation, telemetry, simulation

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

@app.get("/")
def root():
    return {
        "platform": "Sanjeevani AI (Smart Health & Supply Chain Resilience)",
        "track": "Track 3 — Code for Communities 2",
        "status": "ONLINE",
        "google_ai_services": {
            "generative_ai": "Google Gemini 1.5/2.0 Flash (Multimodal OCR & Multilingual NLU)",
            "predictive_ai": "Vertex AI Outbreak & Stockout Forecasting Engine",
            "voice_and_language": "Cloud Speech & Indian Language Translation (8+ languages)",
            "geospatial": "Google Maps Platform & Distance Routing",
            "data_layer": "BigQuery, Firebase Realtime IoT, data.gov.in & IMD Open Portals"
        },
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "HEALTHY", "version": "1.0.0"}
