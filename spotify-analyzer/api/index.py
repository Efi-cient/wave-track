from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LASTFM_API_KEY = os.getenv("LASTFM_API_KEY")
LASTFM_BASE_URL = "http://ws.audioscrobbler.com/2.0/"

@app.get("/api/proxy")
async def proxy_lastfm(method: str, user: str = None, limit: int = 10, period: str = "7day", artist: str = None):
    """
    Proxy requests to Last.fm API to hide the API Key.
    """
    if not LASTFM_API_KEY:
        raise HTTPException(status_code=500, detail="LASTFM_API_KEY is not set in server environment.")

    params = {
        "method": method,
        "api_key": LASTFM_API_KEY,
        "format": "json"
    }

    if user:
        params["user"] = user
    if limit:
        params["limit"] = limit
    if period:
        params["period"] = period
    if artist:
        params["artist"] = artist

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(LASTFM_BASE_URL, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "SoundStats API"}

# --- Static File Serving (For Local Dev) ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount static directories
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")

@app.get("/")
async def read_index():
    return FileResponse('index.html')

@app.get("/manifest.json")
async def read_manifest():
    return FileResponse('manifest.json')

@app.get("/sw.js")
async def read_sw():
    return FileResponse('sw.js')
