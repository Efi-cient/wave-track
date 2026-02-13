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
    console.log('[DEBUG] App initializing...');
    // Check for tokens in URL (Auth Callback)
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');

    if (error) {
        console.error('[ERROR] Auth error:', error);
        alert(`Login failed: ${error}`);
        showLogin();
        return;
    }

    if (accessToken) {
        console.log('[DEBUG] Access token found, loading dashboard...');
        // Save tokens (In memory for security, or session storage if needed, but per requirements we use variables + refresh)
        state.accessToken = accessToken;
        state.refreshToken = refreshToken;

        // Clean URL
        window.history.pushState({}, document.title, window.location.pathname);

        // Load App
        await loadDashboard();
    } else {
        console.log('[DEBUG] No access token, showing login...');
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
        console.log('[DEBUG] Loading dashboard...');
        await fetchUserProfile();
        console.log('[DEBUG] User profile loaded');
        showDashboard(); // Show dashboard as soon as profile loads

        await fetchTopArtists();
        console.log('[DEBUG] Top artists loaded');
        await fetchTopTracksAndFeatures();
        console.log('[DEBUG] Dashboard fully loaded!');
    } catch (error) {
        console.error("[ERROR] Error loading dashboard:", error);
        if (error.status === 401) {
            // Token expired or invalid
            alert("Session expired. Please login again.");
            showLogin();
        } else {
            alert("Error loading dashboard. Check console for details.");
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
 * 2. Fetch Top Artists (Medium Term)
 */
async function fetchTopArtists() {
    const data = await spotifyFetch('/me/top/artists?time_range=medium_term&limit=50');
    state.topArtists = data.items;

    renderTopArtists();
    renderTopGenres();
}

function renderTopArtists() {
    const artistList = document.getElementById('artist-list');
    artistList.innerHTML = '';
    // Show top 20 artists
    state.topArtists.slice(0, 20).forEach((artist, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span><strong>#${index + 1}</strong> ${artist.name}</span>
            <span style="opacity:0.7">Popularity: ${artist.popularity}%</span>
        `;
        artistList.appendChild(li);
    });
}

function renderTopGenres() {
    const genreList = document.getElementById('genre-list');

    // Extract all genres from artists
    const genreCounts = {};
    state.topArtists.forEach(artist => {
        // Check if genres exist (some artists may not have genres)
        if (artist.genres && Array.isArray(artist.genres)) {
            artist.genres.forEach(genre => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
        }
    });

    // Sort by count
    const sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

    genreList.innerHTML = '';
    sortedGenres.forEach(([genre, count]) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${genre}</span>
            <span style="opacity:0.7">${count} artists</span>
        `;
        genreList.appendChild(li);
    });
}

/**
 * 3. Fetch Top Tracks -> Render Charts and Lists
 */
async function fetchTopTracksAndFeatures() {
    console.log('[DEBUG] Fetching top 100 tracks...');

    // Fetch in batches (Spotify limits to 50 per request)
    const batch1 = await spotifyFetch('/me/top/tracks?time_range=medium_term&limit=50&offset=0');
    const batch2 = await spotifyFetch('/me/top/tracks?time_range=medium_term&limit=50&offset=50');

    const allTracks = [...batch1.items, ...batch2.items];
    console.log('[DEBUG] Total tracks fetched:', allTracks.length);

    // Render top 10 chart
    console.log('[DEBUG] Rendering popularity chart...');
    renderPopularityChart(allTracks.slice(0, 10));

    // Render full top 100 list
    console.log('[DEBUG] Rendering top 100 tracks list...');
    renderTopTracksList(allTracks);

    console.log('[DEBUG] All content rendered successfully!');
}

function renderTopTracksList(tracks) {
    const listContainer = document.getElementById('top-tracks-list');
    listContainer.innerHTML = '<ol style="color: white; padding-left: 20px; line-height: 1.8;">' +
        tracks.map((track, index) => {
            const artists = track.artists.map(a => a.name).join(', ');
            return `<li><strong>${track.name}</strong> - ${artists} <span style="opacity: 0.6;">(${track.popularity}% popularity)</span></li>`;
        }).join('') +
        '</ol>';
}

/**
 * Visualization: Bar Chart for Popularity
 */
function renderPopularityChart(tracks) {
    console.log('[DEBUG] renderPopularityChart called with', tracks.length, 'tracks');

    if (typeof Chart === 'undefined') {
        console.error('[ERROR] Chart.js is not loaded!');
        alert('Chart.js failed to load. Charts will not display.');
        return;
    }

    const ctx = document.getElementById('popularityChart').getContext('2d');
    const labels = tracks.map(t => t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name);
    const data = tracks.map(t => t.popularity);

    console.log('[DEBUG] Creating bar chart...');
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
    console.log('[DEBUG] Bar chart created');
}

/**
 * Visualization: Radar Chart for Mood
 */
function renderMoodChart(features) {
    console.log('[DEBUG] renderMoodChart called with', features.length, 'features');

    if (typeof Chart === 'undefined') {
        console.error('[ERROR] Chart.js is not loaded!');
        return;
    }

    // Calculate Averages
    const avg = (key) => features.reduce((sum, f) => sum + f[key], 0) / features.length;

    const data = [
        avg('danceability'),
        avg('energy'),
        avg('valence'), // Happiness
        avg('acousticness'),
        avg('instrumentalness')
    ];

    console.log('[DEBUG] Mood data:', data);

    const ctx = document.getElementById('moodChart').getContext('2d');

    console.log('[DEBUG] Creating radar chart...');
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
    console.log('[DEBUG] Radar chart created');
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

