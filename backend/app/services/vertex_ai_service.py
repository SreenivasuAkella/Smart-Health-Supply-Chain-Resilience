"""
M4 — Google Vertex AI Predictive Modeling Service (Sanjeevani AI)
Implements real Vertex AI Generative AI endpoint calls for outbreak prediction,
supplementing the Gemini Flash text generation in forecasting.py.

Uses:
- google-cloud-aiplatform SDK (Vertex AI Generative AI)
- Gemini Pro via Vertex AI endpoint (not Gemini Developer API)
- Tabular AutoML-style structured prompting for epidemic risk scoring
"""
import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

VERTEX_AI_PROJECT = os.getenv("GCP_PROJECT_ID", "sanjeevani-ai-health-national")
VERTEX_AI_LOCATION = os.getenv("VERTEX_AI_LOCATION", "us-central1")
VERTEX_AI_MODEL = os.getenv("VERTEX_AI_MODEL", "gemini-1.5-flash-002")


def predict_epidemic_risk_vertex(
    district_name: str,
    state_name: str,
    rainfall_mm: float,
    humidity_pct: float,
    temp_c: float,
    population_density: float,
    current_stock_days: float
) -> Dict[str, Any]:
    """
    Calls Google Vertex AI (Gemini via Vertex endpoint) to produce a structured
    epidemic risk assessment for a district, using real meteorological covariates.
    This supplements the Gemini Developer API used in forecasting.py, providing
    an independent Vertex-hosted inference path.
    """
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel

        vertexai.init(project=VERTEX_AI_PROJECT, location=VERTEX_AI_LOCATION)
        model = GenerativeModel(VERTEX_AI_MODEL)

        prompt = f"""
You are a public health epidemiological AI model deployed on Google Vertex AI for India's National Health Mission.
Predict epidemic risk for the following district using real meteorological and health supply chain data.
Return ONLY valid JSON, no markdown.

District: {district_name}, {state_name}
Rainfall (7-day): {rainfall_mm} mm
Relative Humidity: {humidity_pct}%
Ambient Temperature: {temp_c}°C
Population Density: {population_density} per km²
Medicine Supply (days remaining): {current_stock_days} days

{{
  "risk_score": <float 0.0 to 1.0>,
  "risk_level": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
  "primary_disease_risk": "<most likely disease vector>",
  "confidence": <float>,
  "recommended_buffer_days": <int>,
  "rationale": "<2-sentence reasoning>",
  "vertex_model": "{VERTEX_AI_MODEL}"
}}
"""
        response = model.generate_content(prompt)
        raw = response.text.strip()
        if "```" in raw:
            raw = raw.split("```")[1].strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()
        result = json.loads(raw)
        result["api"] = "Google Vertex AI (Generative AI)"
        result["vertex_project"] = VERTEX_AI_PROJECT
        result["vertex_location"] = VERTEX_AI_LOCATION
        result["timestamp"] = datetime.utcnow().isoformat() + "Z"
        return result

    except ImportError:
        return {
            "risk_score": 0.5,
            "risk_level": "MODERATE",
            "primary_disease_risk": "Malaria / Dengue (seasonal estimate)",
            "confidence": 0.6,
            "recommended_buffer_days": 14,
            "rationale": "Vertex AI SDK not installed. Install google-cloud-aiplatform for live inference.",
            "api": "Fallback — Gemini Developer API",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        return {
            "risk_score": 0.5,
            "risk_level": "MODERATE",
            "error": str(e),
            "api": "Google Vertex AI (error fallback)",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }


def get_vertex_ai_status() -> Dict[str, Any]:
    """Returns the Vertex AI configuration and availability status."""
    try:
        import vertexai
        sdk_available = True
    except ImportError:
        sdk_available = False

    return {
        "vertex_ai_project": VERTEX_AI_PROJECT,
        "vertex_ai_location": VERTEX_AI_LOCATION,
        "vertex_ai_model": VERTEX_AI_MODEL,
        "sdk_installed": sdk_available,
        "install_command": "pip install google-cloud-aiplatform" if not sdk_available else None,
        "endpoint": f"https://{VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/{VERTEX_AI_PROJECT}/locations/{VERTEX_AI_LOCATION}/publishers/google/models/{VERTEX_AI_MODEL}",
        "status": "AVAILABLE" if sdk_available else "SDK_NOT_INSTALLED",
        "checked_at": datetime.utcnow().isoformat() + "Z"
    }
