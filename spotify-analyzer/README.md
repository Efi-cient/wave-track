# SoundStats - Mobile-First Last.fm Analyzer

SoundStats is a Progressive Web App (PWA) that visualizes your Last.fm listening history with a modern, glassmorphic UI.

## Features
- **Overview**: Recent tracks, top stats.
- **Tracks**: Top tracks for various periods.
- **Artists**: Top artists.
- **Insights**: Listening clock, mood charts, and genre distribution.
- **Offline Mode**: Analyze your Spotify `StreamingHistory.json` files offline.
- **PWA**: Installable on mobile and desktop.

## Tech Stack
- **Frontend**: HTML, CSS, Vanilla JavaScript, Chart.js
- **Backend**: Python (Flask) for serverless Last.fm API proxy
- **Deployment**: Vercel

## Local Development

1.  **Clone the repository**.
2.  **Install Python dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Set up Environment Variables**:
    - Create a `.env` file (optional for local, but recommended).
    - You need a Last.fm API Key.
    - Set `LASTFM_API_KEY=your_api_key_here`.
4.  **Run the Backend**:
    ```bash
    # On Windows
    $env:LASTFM_API_KEY="your_api_key"; python api/index.py
    
    # Or just run it if you hardcoded for testing (not recommended)
    python api/index.py
    ```
    The server runs on `http://localhost:5000`.
5.  **Run the Frontend**:
    - You can use any static file server, but it needs to proxy `/api/lastfm` to `http://localhost:5000`.
    - Alternatively, for simple testing without proxy, you can modify `js/api.js` to point to `http://localhost:5000/api/lastfm` directly (and handle CORS).
    - **Recommended**: Use Vercel CLI for local development.

### Using Vercel CLI (Recommended)
1.  Install Vercel CLI: `npm i -g vercel`
2.  Run `vercel dev`.
3.  Open `http://localhost:3000`.

## Deployment on Vercel

1.  Push this code to a GitHub repository.
2.  Import the project into Vercel.
3.  **Environment Variables**:
    - Add `LASTFM_API_KEY` with your Last.fm API key in the Vercel project settings.
4.  Deploy!
    - Vercel will automatically detect `api/index.py` and set up the serverless function.
    - `vercel.json` handles the routing.

## Privacy
- Last.fm data is fetched via the public API.
- Spotify `StreamingHistory.json` files are processed entirely in your browser (Client-Side). No data is uploaded.
