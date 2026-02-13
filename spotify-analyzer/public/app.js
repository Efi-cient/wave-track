/**
 * Spotify Analyzer PWA - Frontend Logic
 * Handles authentication, API requests, and UI rendering.
 */

// State Management
const state = {
    accessToken: null,
    refreshToken: null,
    user: null,
    topArtists: [],
    audioFeatures: []
};

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const artistList = document.getElementById('artist-list');

/**
 * entry point
 */
async function init() {
    // Check for tokens in URL (Auth Callback)
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken) {
        // Save tokens (In memory for security, or session storage if needed, but per requirements we use variables + refresh)
        state.accessToken = accessToken;
        state.refreshToken = refreshToken;

        // Clean URL
        window.history.pushState({}, document.title, window.location.pathname);

        // Load App
        await loadDashboard();
    } else {
        // Show Login
        showLogin();
    }
}

function showLogin() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
}

function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
}

/**
 * Main Data Fetching & Rendering Orchestrator
 */
async function loadDashboard() {
    try {
        await fetchUserProfile();
        showDashboard(); // Show dashboard as soon as profile loads

        await fetchTopArtists();
        await fetchTopTracksAndFeatures();
    } catch (error) {
        console.error("Error loading dashboard:", error);
        if (error.status === 401) {
            // Token expired or invalid
            alert("Session expired. Please login again.");
            showLogin();
        }
    }
}

/**
 * Spotify API Helper
 */
async function spotifyFetch(url) {
    const response = await fetch(`https://api.spotify.com/v1${url}`, {
        headers: {
            'Authorization': `Bearer ${state.accessToken}`
        }
    });

    if (!response.ok) {
        // Simple error handling
        const error = new Error('Spotify API Error');
        error.status = response.status;
        throw error;
    }

    return response.json();
}

/**
 * 1. Fetch User Profile
 */
async function fetchUserProfile() {
    const data = await spotifyFetch('/me');
    state.user = data;

    userName.textContent = `Welcome, ${data.display_name}!`;
    if (data.images && data.images.length > 0) {
        userAvatar.src = data.images[0].url;
        userAvatar.classList.remove('hidden');
    }
}

/**
 * 2. Fetch Top Artists (Short Term)
 */
async function fetchTopArtists() {
    const data = await spotifyFetch('/me/top/artists?time_range=medium_term&limit=5');
    state.topArtists = data.items;

    renderTopArtists();
}

function renderTopArtists() {
    artistList.innerHTML = '';
    state.topArtists.forEach(artist => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${artist.name}</span>
            <span style="opacity:0.7">Popularity: ${artist.popularity}%</span>
        `;
        artistList.appendChild(li);
    });
}

/**
 * 3. Fetch Top Tracks & Audio Features -> Render Charts
 */
async function fetchTopTracksAndFeatures() {
    // A. Get Top Tracks
    const tracksData = await spotifyFetch('/me/top/tracks?time_range=medium_term&limit=10');
    const tracks = tracksData.items;

    // B. Get IDs for Audio Features
    const ids = tracks.map(t => t.id).join(',');
    const featuresData = await spotifyFetch(`/audio-features?ids=${ids}`);
    const features = featuresData.audio_features;

    renderPopularityChart(tracks);
    renderMoodChart(features);
}

/**
 * Visualization: Bar Chart for Popularity
 */
function renderPopularityChart(tracks) {
    const ctx = document.getElementById('popularityChart').getContext('2d');
    const labels = tracks.map(t => t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name);
    const data = tracks.map(t => t.popularity);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Popularity (0-100)',
                data: data,
                backgroundColor: 'rgba(29, 185, 84, 0.6)', // Spotify Green
                borderColor: 'rgba(29, 185, 84, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, max: 100 },
                x: { ticks: { color: 'white' } }
            },
            plugins: {
                legend: { labels: { color: 'white' } }
            }
        }
    });
}

/**
 * Visualization: Radar Chart for Mood
 */
function renderMoodChart(features) {
    // Calculate Averages
    const avg = (key) => features.reduce((sum, f) => sum + f[key], 0) / features.length;

    const data = [
        avg('danceability'),
        avg('energy'),
        avg('valence'), // Happiness
        avg('acousticness'),
        avg('instrumentalness')
    ];

    const ctx = document.getElementById('moodChart').getContext('2d');

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Danceability', 'Energy', 'Happiness', 'Acoustic', 'Instrumental'],
            datasets: [{
                label: 'Average Mood',
                data: data,
                fill: true,
                backgroundColor: 'rgba(0, 210, 255, 0.2)', // Blue-ish
                borderColor: 'rgba(0, 210, 255, 1)',
                pointBackgroundColor: 'rgba(0, 210, 255, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(0, 210, 255, 1)'
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' },
                    pointLabels: { color: 'white' },
                    suggestedMin: 0,
                    suggestedMax: 1
                }
            },
            plugins: {
                legend: { labels: { color: 'white' } }
            }
        }
    });
}

// Start App
init();

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

