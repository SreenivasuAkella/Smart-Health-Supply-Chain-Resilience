import os
from dotenv import load_dotenv

load_dotenv()

# Google Gemini API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# Google Cloud Platform & BigQuery Configuration
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "sanjeevani-ai-health-national")
BIGQUERY_DATASET = os.getenv("BIGQUERY_DATASET", "indian_public_health_surveillance")

# Firebase Configuration
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "sanjeevani-health-iot")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL", "https://sanjeevani-health-iot-default-rtdb.firebaseio.com")
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "")

# Server Configuration
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")
