import uvicorn
import os
from app.config import PORT, HOST

if __name__ == "__main__":
    reload_enabled = os.environ.get("UVICORN_RELOAD", "false").lower() in ("true", "1")
    print(f"Starting Sanjeevani AI Backend on {HOST}:{PORT} (reload={reload_enabled})...")
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=reload_enabled)
