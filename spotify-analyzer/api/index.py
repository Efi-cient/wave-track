from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import sys
from unittest.mock import MagicMock

# --- SPOTAPI SHIM (Embedded) ---
sys.modules["pymongo"] = MagicMock()
sys.modules["redis"] = MagicMock()
sys.modules["websockets"] = MagicMock()
sys.modules["websockets.sync.client"] = MagicMock()
# -------------------------------

try:
    import spotapi
    from spotapi.utils.saver import SqliteSaver
    # Use /tmp for Vercel ephemeral storage
    # Note: Sessions will be lost on cold boot/redeployment
    session_path = "/tmp/spotify_session.db" if os.environ.get("VERCEL") else "spotify_session.db"
    session_saver = SqliteSaver(session_path)
    USE_SPOTAPI = True
except ImportError:
    USE_SPOTAPI = False

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vercel needs absolute paths or handling for static files
# We'll just define the API routes here. File serving is handled by Vercel's output system usually,
# but for a Python runtime, we might need to serve them if they are in the same repo.
# However, standard Vercel usage puts static files in /public or root.
# Since we are in /api, we focus on API.

@app.get("/api/user/{username}/overview")
def get_user_overview(username: str):
    # Mock data for now as we don't have login
    return {
        "username": username,
        "total_songs": 1250, 
        "unique_artists": 340,
        "image": "assets/default-avatar.svg"
    }

@app.get("/api/user/{username}/recent")
def get_recent_tracks(username: str):
    # Mock data
    return {"recenttracks": {"track": []}}

@app.get("/api/stats/history")
def get_listening_history():
    return {
        "months": [],
        "counts": []
    }

@app.get("/api/stats/top-artists")
def get_top_artists():
    return {"topartists": {"artist": []}}

@app.get("/api/stats/top-tracks")
def get_top_tracks():
    return {"toptracks": {"track": []}}
