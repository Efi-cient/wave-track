# 🎵 SoundStats (Antigravity Edition)

> A futuristic, glassmorphism-styled Spotify analytics dashboard built with **FastAPI**, **Vanilla JS**, and **SpotAPI**.

![SoundStats Dashboard](assets/icon.svg)

## ✨ Features

-   **Antigravity Design**: High-fidelity dark mode UI with neon gradients and glassmorphism cards.
-   **Live Analytics**:
    -   **Deep Dive**: View your top artists and tracks with precise play counts.
    -   **Neon History**: Visualized listening history over time.
    -   **Listening Clock**: Circular visualization of your daily listening habits.
-   **SpotAPI Integration**:
    -   **"SpotAPI Lite" Shim**: Custom backend implementation that runs `spotapi` **without MongoDB**, using ephemeral storage (SQLite/Memory) for easy deployment.
    -   **No Database Required**: Zero-config setup.
-   **PWA Ready**: Installable on mobile and desktop via `manifest.json` and Service Workers.
-   **Vercel Ready**: Serverless-compatible backend structure (`api/index.py`).

## 🚀 Getting Started

### Prerequisites

-   Python 3.9+
-   Node.js (optional, for dev tools)

### 🛠️ Local Installation

1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/soundstats.git
    cd soundstats
    ```

2.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the Server**
    ```bash
    # If using the original server.py
    python server.py
    
    # OR using Uvicorn directly on the Vercel entry point
    uvicorn api.index:app --reload
    ```

4.  **Open the App**
    Visit `http://localhost:8000` in your browser.

## ☁️ Deployment (Vercel)

This project is optimized for **Vercel**.

1.  Install Vercel CLI: `npm i -g vercel`
2.  Run `vercel` in the project root.
3.  The `api/index.py` will automatically handle backend requests via the `vercel.json` rewrites.

**Note:** On Vercel's serverless environment, the `SpotAPI` session (login) is ephemeral. Users may need to re-authenticate or use "Simulation Mode" if no persistent storage is attached.

## 🏗️ Tech Stack

-   **Frontend**: HTML5, CSS3 (Variables + Glassmorphism), JavaScript (ES6+), Chart.js
-   **Backend**: Python (FastAPI), SpotAPI (Custom Shim)
-   **Infrastructure**: Vercel Serverless Functions

## 🎨 Design Philosophy

The "Antigravity" aesthetic focuses on:
-   **Depth**: Using shadows and blurs to create a sense of floating layers.
-   **Vibrancy**: Neon accents (`#1DB954` Green, `#00F0FF` Cyan) against deep dark backgrounds (`#121212`).
-   **Motion**: Smooth transitions and hover effects.

## 📄 License

MIT License.
