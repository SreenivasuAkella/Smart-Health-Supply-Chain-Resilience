import uvicorn
import os
from app.config import PORT, HOST

if __name__ == "__main__":
    print(f"Starting Sanjeevani AI Backend on {HOST}:{PORT}...")
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
