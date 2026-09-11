import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BASE_DIR)

load_dotenv(os.path.join(ROOT_DIR, ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv()

# Google Gemini API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# Google Cloud Platform & BigQuery Configuration
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "sanjeevani-ai-health-national")
BIGQUERY_DATASET = os.getenv("BIGQUERY_DATASET", "indian_public_health_surveillance")

# GCP Credentials resolution for Local and Cloud Deployments (Render / Cloud Run / Docker)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GCP_SERVICE_ACCOUNT_JSON = os.getenv("GCP_SERVICE_ACCOUNT_JSON", os.getenv("GOOGLE_CREDENTIALS_JSON", ""))
GCP_CREDS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

resolved_key_path = None
if GCP_CREDS_PATH:
    candidate_paths = [
        GCP_CREDS_PATH if os.path.isabs(GCP_CREDS_PATH) else os.path.abspath(os.path.join(BASE_DIR, GCP_CREDS_PATH)),
        os.path.abspath(os.path.join(os.getcwd(), GCP_CREDS_PATH)),
        os.path.abspath(os.path.join(BASE_DIR, "gcp-key.json"))
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            resolved_key_path = p
            break
elif os.path.exists(os.path.join(BASE_DIR, "gcp-key.json")):
    resolved_key_path = os.path.join(BASE_DIR, "gcp-key.json")

if resolved_key_path:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = resolved_key_path
    GOOGLE_APPLICATION_CREDENTIALS = resolved_key_path
else:
    GOOGLE_APPLICATION_CREDENTIALS = ""

# Firebase Configuration
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "sanjeevani-health-iot")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL", "https://sanjeevani-health-iot-default-rtdb.asia-southeast1.firebasedatabase.app")
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "")
FIREBASE_AUTH_DOMAIN = os.getenv("FIREBASE_AUTH_DOMAIN", f"{FIREBASE_PROJECT_ID}.firebaseapp.com")

# Public Health, GIS & Meteorology APIs
OPEN_METEO_API_URL = os.getenv("OPEN_METEO_API_URL", "https://api.open-meteo.com/v1/forecast")
WHO_GHO_API_URL = os.getenv("WHO_GHO_API_URL", "https://ghoapi.azureedge.net/api/Dimension/COUNTRY/DimensionValues")
OPEN_DRUG_DATABASE_API_URL = os.getenv("OPEN_DRUG_DATABASE_API_URL", "https://api.fda.gov/drug/label.json")
PUBLIC_GEOCODING_API_URL = os.getenv("PUBLIC_GEOCODING_API_URL", "https://nominatim.openstreetmap.org/search")
ISRO_BHUVAN_OPEN_DATA_URL = os.getenv("ISRO_BHUVAN_OPEN_DATA_URL", "https://bhuvan-app1.nrsc.gov.in/api")
DATA_GOV_IN_API_URL = os.getenv("DATA_GOV_IN_API_URL", "https://api.data.gov.in/resource")
DATA_GOV_IN_API_KEY = os.getenv("DATA_GOV_IN_API_KEY", "")

# Server Configuration
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# Google Maps Platform Toggle (Set USE_GOOGLE_MAPS_API=true to enable paid Google Directions, or false for 100% free mode)
USE_GOOGLE_MAPS_API = os.getenv("USE_GOOGLE_MAPS_API", "false").strip().lower() in ("true", "1", "yes")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# FCM Alerts Toggle
USE_FCM_ALERTS = os.getenv("USE_FCM_ALERTS", "false").strip().lower() in ("true", "1", "yes")
FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY", "")

