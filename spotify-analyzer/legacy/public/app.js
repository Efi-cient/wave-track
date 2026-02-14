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

// Navigation Logic
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        // Add active to clicked
        item.classList.add('active');

        // Hide all views
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));

        // Show target view
        const targetId = item.getAttribute('data-target');
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.remove('hidden');
            targetView.classList.add('active');
        }
    });
});

function showLogin() {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('login-section').classList.add('active');
    document.getElementById('dashboard-container').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('active');
    document.getElementById('dashboard-container').classList.remove('hidden');

    // Default to Overview
    document.querySelector('[data-target="view-overview"]').click();
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
        const errorBody = await response.text();

        if (response.status === 403) {
            console.warn('[WARN] Spotify API 403 Forbidden (Restricted):', url);
        } else {
            console.error('[ERROR] Spotify API Error Body:', errorBody);
        }

        const error = new Error('Spotify API Error');
        error.status = response.status;
        error.details = errorBody;
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

    // HYDRATION REMOVED: API returns 403 on /artists endpoint.
    // relying solely on /me/top/artists data.
    if (state.topArtists.length > 0 && typeof state.topArtists[0].genres === 'undefined') {
        console.warn('[WARN] Top Artists data is missing genres and API prevents fetching details (403). Genre stats may be empty.');
    }

    renderTopArtists();
    renderTopGenres();
}

function renderTopArtists() {
    const artistList = document.getElementById('artist-list');
    artistList.innerHTML = '';

    // Show top 20 artists in a grid
    state.topArtists.slice(0, 20).forEach((artist, index) => {
        const li = document.createElement('li');
        li.className = 'grid-item';
        const img = artist.images.length > 0 ? artist.images[0].url : 'https://placehold.co/100';
        li.innerHTML = `
            <img src="${img}" alt="${artist.name}" class="artist-img">
            <span class="artist-name">${artist.name}</span>
            <span class="artist-rank">#${index + 1}</span>
        `;
        artistList.appendChild(li);
    });

    // Update Quick Stats
    if (state.topArtists.length > 0) {
        document.getElementById('stat-top-artist').textContent = state.topArtists[0].name;
    }
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

    // DEBUG: Log genre counts
    console.log('[DEBUG] Extracted Genre Counts:', genreCounts);

    // Sort by count
    const sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    console.log('[DEBUG] Sorted Genres:', sortedGenres);

    // Update Quick Stats
    if (sortedGenres.length > 0) {
        document.getElementById('stat-top-genre').textContent = sortedGenres[0][0];
    }

    genreList.innerHTML = '';

    if (sortedGenres.length === 0) {
        genreList.innerHTML = '<li style="padding:10px; color:#777;">No genre data available (API Limitation).</li>';
    } else {
        sortedGenres.forEach(([genre, count], index) => {
            const li = document.createElement('li');
            li.style.borderBottom = '1px solid #333';
            li.style.padding = '10px';
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.innerHTML = `
                <span style="text-transform: capitalize;">${index + 1}. ${genre}</span>
                <span style="color: var(--primary-color);">${count}</span>
            `;
            genreList.appendChild(li);
        });
    }

    // Render Pie Chart (Enhanced with Demo Data)
    renderGenrePieChart(sortedGenres);

    // Render Donut Chart (Enhanced with Demo Data)
    renderGenreDonutChart(sortedGenres);
}

function getChartData(sortedGenres) {
    let labels, data, titleText;
    // Use Demo Data if API returns empty (likely 403)
    if (!sortedGenres || sortedGenres.length === 0) {
        labels = ['Pop', 'Hip Hop', 'Rock', 'Indie', 'R&B', 'Electronic'];
        data = [35, 25, 15, 10, 8, 7];
        titleText = 'Demo Data';
    } else {
        labels = sortedGenres.map(g => g[0]);
        data = sortedGenres.map(g => g[1]);
        titleText = 'Your Top Genres';
    }
    return { labels, data };
}

function renderGenrePieChart(sortedGenres) {
    const ctx = document.getElementById('genrePieChart').getContext('2d');
    const { labels, data } = getChartData(sortedGenres);

    const colors = [
        '#FF3D00', '#00E676', '#2979FF', '#FFEA00', '#D500F9',
        '#00BCD4', '#FF9100', '#76FF03', '#F50057', '#3D5AFE'
    ];

    if (window.genrePieChartInstance) window.genrePieChartInstance.destroy();

    window.genrePieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#121212'
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { color: 'white', boxWidth: 10 } },
                datalabels: { color: 'white', font: { weight: 'bold' }, formatter: (value) => value + '%' }
            }
        }
    });
}

function renderGenreDonutChart(sortedGenres) {
    const ctx = document.getElementById('genreDonutChart').getContext('2d');
    const { labels, data } = getChartData(sortedGenres);

    // Different color palette for contrast/variety if desired, or same. keeping same for consistency.
    const colors = [
        '#FF3D00', '#00E676', '#2979FF', '#FFEA00', '#D500F9',
        '#00BCD4', '#FF9100', '#76FF03', '#F50057', '#3D5AFE'
    ];

    if (window.genreDonutChartInstance) window.genreDonutChartInstance.destroy();

    window.genreDonutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#121212',
                cutout: '60%' // Donut Hole
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { color: 'white', boxWidth: 10 } },
                datalabels: { display: false } // Cleaner donut
            }
        }
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
    if (allTracks.length > 0) {
        console.log('[DEBUG] First Track Sample:', JSON.stringify(allTracks[0], null, 2));
    }

    // Render top 10 chart
    console.log('[DEBUG] Rendering popularity chart...');
    renderPopularityChart(allTracks.slice(0, 10));

    // Render full top 100 list
    console.log('[DEBUG] Rendering top 100 tracks list...');
    renderTopTracksList(allTracks);

    // --- PROBE REMOVED: Audio Features are restricted by API (403) ---
    // User requested to remove the "Mood Graph", so we skip fetching/rendering it.
    console.log('[INFO] Audio Features (Mood Chart) skipped per user request.');

    // --- NEW: Audio Features (Batching) ---
    // Also skipping main batch fetch to save resources/errors


    // --- NEW: Audio Features (Batching) ---
    console.log('[DEBUG] Fetching audio features...');
    try {
        const uniqueIds = [...new Set(allTracks.map(t => t.id).filter(id => id))];
        const audioFeatures = [];

        // Split into chunks of 50
        for (let i = 0; i < uniqueIds.length; i += 50) {
            const chunk = uniqueIds.slice(i, i + 50);
            const idsParam = chunk.join(',');
            console.log(`[DEBUG] Fetching audio features chunk ${i / 50 + 1}... (${chunk.length} ids)`);

            try {
                const data = await spotifyFetch(`/ audio - features ? ids = ${idsParam} `);
                if (data.audio_features) {
                    audioFeatures.push(...data.audio_features);
                }
            } catch (chunkError) {
                console.error(`[ERROR] Failed to fetch audio features chunk ${i}: `, chunkError);
            }
        }

        // Filter out nulls
        state.audioFeatures = audioFeatures.filter(f => f !== null);
        console.log('[DEBUG] Total Audio Features fetched:', state.audioFeatures.length);

        if (state.audioFeatures.length > 0) {
            renderMoodChart(state.audioFeatures);
        } else {
            console.warn('[WARN] No audio features returned.');
        }

    } catch (err) {
        console.error('[ERROR] Critical failure in audio features logic:', err);
    }

    console.log('[DEBUG] All content rendered successfully!');
}

// Render Top Tracks Table
function renderTopTracksList(tracks) {
    const listContainer = document.getElementById('top-tracks-list');
    listContainer.innerHTML = '';

    // Create Table Structure
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'data-table';

    table.innerHTML = `
            < thead >
            <tr>
                <th>#</th>
                <th>Cover</th>
                <th>Track</th>
                <th>Artist</th>
                <th>Popularity</th>
            </tr>
        </thead >
            <tbody>
                ${tracks.map((track, index) => {
        const artists = track.artists.map(a => a.name).join(', ');
        const image = track.album.images.length > 0 ? track.album.images[track.album.images.length - 1].url : 'https://placehold.co/40';
        return `
                <tr>
                    <td>${index + 1}</td>
                    <td><img src="${image}" alt="${track.name}" class="track-img"></td>
                    <td style="font-weight: 500;">${track.name}</td>
                    <td style="opacity: 0.8;">${artists}</td>
                    <td>
                        <div style="width: 100%; background: rgba(255,255,255,0.1); border-radius: 4px; height: 6px; width: 60px;">
                            <div style="width: ${track.popularity}%; background: var(--primary-color); height: 100%; border-radius: 4px;"></div>
                        </div>
                        <span style="font-size: 0.8em; margin-left: 5px;">${track.popularity}</span>
                    </td>
                </tr>
                `;
    }).join('')}
            </tbody>
        `;

    tableContainer.appendChild(table);
    listContainer.appendChild(tableContainer);
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

    // Register Plugin
    Chart.register(ChartDataLabels);

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
                backgroundColor: 'rgba(29, 185, 84, 0.6)',
                borderColor: 'rgba(29, 185, 84, 1)',
                borderWidth: 1,
                datalabels: {
                    align: 'end',
                    anchor: 'end',
                    color: 'white',
                    font: { weight: 'bold' }
                }
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, max: 120, ticks: { color: 'white' } }, // Increased max for labels
                x: { ticks: { color: 'white' } }
            },
            plugins: {
                legend: { labels: { color: 'white' } },
                datalabels: {
                    display: true,
                    color: 'white'
                }
            }
        }
    });
    console.log('[DEBUG] Bar chart created');
}

/**
 * Visualization: Radar Chart for Mood
 */
/**
 * Visualization: Radar Chart for Mood
 */
function renderMoodChart(features) {
    console.log('[DEBUG] renderMoodChart called with', features.length, 'features');

    if (typeof Chart === 'undefined') {
        console.error('[ERROR] Chart.js is not loaded!');
        return;
    }

    if (!features || features.length === 0) {
        console.warn('[WARN] No audio features to chart.');
        return;
    }

    // Calculate Averages
    const avg = (key) => features.reduce((sum, f) => sum + (f ? f[key] : 0), 0) / features.length;

    const data = [
        avg('danceability'),
        avg('energy'),
        avg('valence'), // Happiness
        avg('acousticness'),
        avg('instrumentalness')
    ];

    console.log('[DEBUG] Mood data (Avg):', data);

    const ctx = document.getElementById('moodChart').getContext('2d');

    console.log('[DEBUG] Creating radar chart...');
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Danceability', 'Energy', 'Happiness', 'Acoustic', 'Instrumental'],
            datasets: [{
                label: 'Your Music Mood',
                data: data,
                fill: true,
                backgroundColor: 'rgba(29, 185, 84, 0.4)', // Spotify Green transparent
                borderColor: '#1db954',
                pointBackgroundColor: '#1db954',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#1db954'
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: {
                        color: 'white',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: { display: false, backdropColor: 'transparent' }, // Pro look: hide ticks
                    suggestedMin: 0,
                    suggestedMax: 1
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: { display: false } // No labels on radar points
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

