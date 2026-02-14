import { LastFmClient } from './api.js';
import { createMoodChart, createListeningClock, generateVibrantColors } from './charts.js';

const client = new LastFmClient();

// State
const state = {
    user: null,
    recentTracks: [],
    topArtists: [],
    topTracks: [],
    moods: [], // { label, count }
    listeningClock: Array(24).fill(0) // [0..23] hour counts
};

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');

// Init
function init() {
    const savedUser = localStorage.getItem('lastfm_user');
    if (savedUser) {
        showDashboard(savedUser);
    } else {
        showLogin();
    }
    setupNavigation();
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const targetId = item.getAttribute('data-target');
            document.querySelectorAll('.view').forEach(view => {
                if (view.id === 'login-section') return;
                view.classList.remove('active');
                view.classList.add('hidden');
            });

            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.classList.remove('hidden');
                targetView.classList.add('active');
            }
        });
    });
}

function showLogin() {
    loginSection.classList.add('active');
    loginSection.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
}

async function showDashboard(username) {
    // Optimistic UI update
    loginSection.classList.remove('active');
    loginSection.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    dashboardContainer.classList.add('active'); // content was hidden without this!

    // Set User
    state.user = username;
    localStorage.setItem('lastfm_user', username);
    document.getElementById('user-name').textContent = `Hi, ${username}`;

    await loadData(username);
}

// Data Loading
async function loadData(username) {
    renderSkeletons();

    try {
        console.log(`[DEBUG] Fetching data for user: ${username}`);

        // Parallel Fetching
        const [recent, artists, tracks, userInfo] = await Promise.all([
            client.getRecentTracks(username, 50),
            client.getTopArtists(username),
            client.getTopTracks(username, '12month', 50), // Default: Last Year, Top 50
            client.getUserInfo(username)
        ]);

        console.log('[DEBUG] Recent Tracks Response:', recent);
        console.log('[DEBUG] Top Artists Response:', artists);
        console.log('[DEBUG] Top Tracks Response:', tracks);
        console.log('[DEBUG] User Info Response:', userInfo);

        if (userInfo && userInfo.user) {
            const avatar = userInfo.user.image[2]['#text']; // Large image
            if (avatar) {
                document.getElementById('user-avatar').src = avatar;
            }
        }

        // Display Top Vibe
        if (state.moods.length > 0) {
            const topVibe = state.moods[0].label;
            const regDate = userInfo?.user?.registered?.['#text']
                ? new Date(userInfo.user.registered['#text'] * 1000).toLocaleDateString()
                : '';

            document.getElementById('user-name').innerHTML = `
                Hi, ${username} <br>
                <div style="font-size:0.6em; opacity:0.8; font-weight:normal; margin-top:4px;">
                    Vibe: ${topVibe.toUpperCase()} <span style="margin:0 5px">•</span> Since: ${regDate}
                </div>`;
        }

        let usingMockData = false;

        // 1. Recent Tracks & Listening Clock
        const recentTracksData = recent?.recenttracks?.track;
        if (recentTracksData && (Array.isArray(recentTracksData) ? recentTracksData.length > 0 : true)) {
            const tracks = Array.isArray(recentTracksData) ? recentTracksData : [recentTracksData];
            state.recentTracks = tracks;

            // Calculate Listening Clock
            const hourCounts = Array(24).fill(0);
            tracks.forEach(track => {
                if (track.date) {
                    const date = new Date(track.date['#text']); // Last.fm returns UTC string usually
                    // Use local hours
                    // Note: 'date' object in JS uses local time by default when parsing standard strings, 
                    // but Last.fm text is "3 Feb 2023, 10:00". Let's rely on timestamp if available or text.
                    // Better verify, but distinct hours is enough for now.
                    // Actually, Last.fm gives 'uts' (unix timestamp).
                    const uts = track.date.uts;
                    if (uts) {
                        const d = new Date(uts * 1000);
                        hourCounts[d.getHours()]++;
                    }
                }
            });
            state.listeningClock = hourCounts;

        } else {
            console.warn('[WARN] No recent tracks found, using Mock Data');
            state.recentTracks = getMockRecentTracks();
            state.listeningClock = [0, 2, 5, 1, 0, 0, 8, 15, 4, 2, 1, 0, 5, 10, 12, 8, 6, 4, 2, 1, 0, 0, 0, 0]; // Mock pattern
            usingMockData = true;
        }

        // 2. Top Artists & Moods
        const topArtistsData = artists?.topartists?.artist;
        if (topArtistsData && (Array.isArray(topArtistsData) ? topArtistsData.length > 0 : true)) {
            const artistList = Array.isArray(topArtistsData) ? topArtistsData : [topArtistsData];
            state.topArtists = artistList;

            // Fetch Tags for Top 5 Artists (Parallel)
            if (!usingMockData) {
                const top5 = artistList.slice(0, 5);
                const tagPromises = top5.map(artist => client.getArtistTags(artist.name).catch(() => null));
                const tagResults = await Promise.all(tagPromises);

                // Aggregate Tags
                const tagCounts = {};
                tagResults.forEach(res => {
                    if (res && res.toptags && res.toptags.tag) {
                        const tags = Array.isArray(res.toptags.tag) ? res.toptags.tag : [res.toptags.tag];
                        tags.slice(0, 3).forEach(t => { // Top 3 tags per artist
                            const label = t.name.toLowerCase();
                            tagCounts[label] = (tagCounts[label] || 0) + 1;
                        });
                    }
                });

                // Convert to array and sort
                state.moods = Object.entries(tagCounts)
                    .map(([label, count]) => ({ label, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8); // Top 8 moods
            } else {
                state.moods = getMockMoods();
            }

        } else {
            state.topArtists = getMockTopArtists();
            state.moods = getMockMoods();
            usingMockData = true;
        }

        // 3. Top Tracks
        const topTracksData = tracks?.toptracks?.track;
        if (topTracksData && (Array.isArray(topTracksData) ? topTracksData.length > 0 : true)) {
            state.topTracks = Array.isArray(topTracksData) ? topTracksData : [topTracksData];
        } else {
            console.warn('[WARN] No top tracks found, using Mock Data');
            state.topTracks = getMockTopTracks();
            usingMockData = true;
        }

        if (usingMockData) {
            alert(`Note: We couldn't find enough public data for "${username}". \n\nShowing DEMO DATA.`);
        }

        // Render all
        renderRecentTracks();
        renderTopArtists();
        renderTopTracks();
        renderListeningClock();
        renderMoodChart();

    } catch (err) {
        console.error('Error loading data:', err);
        alert(`Failed to load data: ${err.message}`);
    }
}

async function updateTopTracks(period) {
    if (!state.user) return;
    console.log(`[DEBUG] Updating top tracks for user: ${state.user}, period: ${period}`);
    const data = await client.getTopTracks(state.user, period, 50); // Top 50

    if (data && data.toptracks && data.toptracks.track) {
        state.topTracks = Array.isArray(data.toptracks.track) ? data.toptracks.track : [data.toptracks.track];

        // Ensure accurate slice if API returns more
        if (state.topTracks.length > 50) state.topTracks = state.topTracks.slice(0, 50);

        renderTopTracks();
    }
}

function renderSkeletons() {
    const trackList = document.getElementById('recent-tracks-list');
    const artistList = document.getElementById('artist-list');
    const topTracksList = document.getElementById('top-tracks-list');

    // Recent Tracks Skeleton
    trackList.innerHTML = Array(5).fill(0).map(() => `
        <li class="track-item">
            <div class="skeleton skeleton-img"></div>
            <div class="track-info" style="width: 100%">
                <div class="skeleton skeleton-text" style="width: 60%"></div>
                <div class="skeleton skeleton-text" style="width: 40%"></div>
            </div>
        </li>
    `).join('');

    // Artists Skeleton
    artistList.innerHTML = Array(6).fill(0).map(() => `
        <li class="grid-item">
            <div class="skeleton skeleton-img" style="width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 10px;"></div>
            <div class="skeleton skeleton-text" style="width: 80%; margin: 0 auto;"></div>
        </li>
    `).join('');

    // Top Tracks Skeleton
    topTracksList.innerHTML = `
        <div style="padding: 10px">
            ${Array(5).fill(0).map(() => `
                <div style="display:flex; justify-content:space-between; margin-bottom: 15px;">
                    <div class="skeleton skeleton-text" style="width: 10%"></div>
                    <div class="skeleton skeleton-text" style="width: 60%"></div>
                    <div class="skeleton skeleton-text" style="width: 15%"></div>
                </div>
            `).join('')}
        </div>
    `;
}

// Rendering
function renderRecentTracks() {
    const list = document.getElementById('recent-tracks-list');
    if (!list) {
        console.error('[ERROR] DOM Element "recent-tracks-list" NOT FOUND!');
        return;
    }
    console.log('[DEBUG] Rendering Recent Tracks to DOM...', state.recentTracks);

    // Check if empty or null
    if (!state.recentTracks || state.recentTracks.length === 0) {
        list.innerHTML = '<li style="padding:10px; text-align:center; color:#666;">No recent tracks found. Try playing a song!</li>';
        return;
    }

    list.innerHTML = state.recentTracks.map(track => {
        const isNowPlaying = track['@attr'] && track['@attr'].nowplaying;
        // Handle missing images safely
        const image = (track.image && track.image[1] && track.image[1]['#text']) ? track.image[1]['#text'] : 'assets/default-album.svg';

        return `
            <li class="track-item ${isNowPlaying ? 'now-playing' : ''}">
                <img src="${image}" alt="${track.name}" class="track-img">
                <div class="track-info">
                    <span class="track-name">${track.name}</span>
                    <span class="artist-name">${track.artist['#text']}</span>
                </div>
                ${isNowPlaying ? '<span class="status-badge">Playing</span>' : `<span class="timestamp">${formatTime(track.date ? track.date['#text'] : '')}</span>`}
            </li>
        `;
    }).join('');
}

function renderTopArtists() {
    const list = document.getElementById('artist-list');
    list.innerHTML = state.topArtists.slice(0, 12).map((artist, index) => {
        const image = (artist.image && artist.image[2] && artist.image[2]['#text']) ? artist.image[2]['#text'] : 'assets/default-artist.svg';
        return `
            <li class="grid-item">
                <img src="${image}" alt="${artist.name}" class="artist-img">
                <span class="artist-name">${artist.name}</span>
                <span class="artist-rank">#${index + 1}</span>
            </li>
        `;
    }).join('');

    renderArtistChart();
}

function renderTopTracks() {
    console.log('[DEBUG] re-rendering top tracks table with', state.topTracks.length, 'items');
    const list = document.getElementById('top-tracks-list');
    // Update Header 
    const header = document.querySelector('#view-tracks h3');
    if (header) header.textContent = `Top Tracks (Top ${state.topTracks.length})`;

    list.innerHTML = `
        <div class="table-container">
            <table class="data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Cover</th>
                    <th>Track</th>
                    <th>Plays</th>
                </tr>
            </thead>
            <tbody>
                ${state.topTracks.slice(0, 50).map((track, i) => {
        const image = (track.image && track.image[1] && track.image[1]['#text']) ? track.image[1]['#text'] : 'assets/default-album.svg';
        return `
                    <tr>
                        <td>${i + 1}</td>
                        <td><img src="${image}" alt="cover" style="width:40px; height:40px; border-radius:4px;"></td>
                        <td>
                            <div style="font-weight:bold">${track.name}</div>
                            <div style="font-size:0.8em;opacity:0.7">${track.artist.name}</div>
                        </td>
                        <td>${track.playcount}</td>
                    </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    </div>`;

    renderTrackChart();
}

function renderArtistChart() {
    const ctx = document.getElementById('genrePieChart'); // Reusing existing canvas ID from HTML
    if (!ctx) return;

    const top5 = state.topArtists.slice(0, 5);
    const labels = top5.map(a => a.name);
    const data = top5.map(a => a.playcount);

    if (window.artistChart) window.artistChart.destroy();

    window.artistChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#1db954', '#1ed760', '#1aa34a', '#178c3f', '#147535'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: 'white', boxWidth: 10 } }
            }
        }
    });
}

function renderTrackChart() {
    const ctx = document.getElementById('popularityChart');
    if (!ctx) return;

    const top10 = state.topTracks.slice(0, 10);
    const labels = top10.map(t => t.name.length > 10 ? t.name.substring(0, 10) + '...' : t.name);
    const data = top10.map(t => t.playcount);

    if (window.trackChart) window.trackChart.destroy();

    window.trackChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Plays',
                data: data,
                backgroundColor: '#1db954',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { display: false },
                x: { ticks: { color: '#b3b3b3', font: { size: 10 } }, grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderListeningClock() {
    const ctx = document.getElementById('listeningClock');
    if (!ctx) return;
    if (window.clockChart) window.clockChart.destroy();
    window.clockChart = createListeningClock(ctx, state.listeningClock);
}

function renderMoodChart() {
    const ctx = document.getElementById('moodChart');
    if (!ctx) return;
    if (window.moodChart && typeof window.moodChart.destroy === 'function') {
        window.moodChart.destroy();
    }
    window.moodChart = createMoodChart(ctx, state.moods);
}

// Helpers
function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000 / 60; // minutes

    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
}

// Event Listeners
// Event Listeners
// Filter Pills
const filterPills = document.querySelectorAll('.filter-pill');
filterPills.forEach(pill => {
    pill.addEventListener('click', async (e) => {
        // Remove active class from all
        filterPills.forEach(p => p.classList.remove('active'));
        // Add to clicked
        e.target.classList.add('active');

        const period = e.target.getAttribute('data-period');
        console.log(`[DEBUG] Filter clicked: ${period}`);

        // Visual feedback
        const countHeader = document.querySelector('#view-tracks h3');
        if (countHeader) countHeader.textContent = 'Loading...';
        const list = document.getElementById('top-tracks-list');
        if (list) list.style.opacity = '0.5'; // Dim list while loading

        try {
            await updateTopTracks(period);
        } catch (err) {
            console.error('[ERROR] Update failed:', err);
            alert('Failed to update tracks');
        } finally {
            if (list) list.style.opacity = '1';
        }
    });
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (username) showDashboard(username);
});



import { OfflineDataHandler } from './offline.js';

const offlineHandler = new OfflineDataHandler();

// Run Init
window.addEventListener('DOMContentLoaded', () => {
    init();

    // Init Offline Handler
    offlineHandler.init('drop-zone', 'json-file-input', (result) => {
        if (result && result.topTracks) {
            state.user = 'Offline User';
            state.topTracks = result.topTracks;
            state.recentTracks = [];
            state.moods = [];

            // Hide login, show dashboard
            showDashboard('Offline User');

            // Update UI
            renderTopTracks();
            document.querySelector('#view-tracks h3').textContent = 'Top Tracks (Files)';

            // Hide filters
            const filterDiv = document.querySelector('.filter-header');
            if (filterDiv) filterDiv.style.display = 'none';

            alert('Success! Loaded ' + result.topTracks.length + ' tracks from your file.');
        }
    });
});

// Mock Data Generators (Fallback)
function getMockRecentTracks() {
    return [
        { name: 'Blinding Lights', artist: { '#text': 'The Weeknd' }, date: { '#text': 'Just now' }, image: [{}, { '#text': 'assets/default-album.svg' }] },
        { name: 'As It Was', artist: { '#text': 'Harry Styles' }, date: { '#text': '10 mins ago' }, image: [{}, { '#text': 'assets/default-album.svg' }] },
        { name: 'Levitating', artist: { '#text': 'Dua Lipa' }, date: { '#text': '1 hour ago' }, image: [{}, { '#text': 'assets/default-album.svg' }] }
    ];
}

function getMockTopArtists() {
    return [
        { name: 'Taylor Swift', playcount: '1200', image: [{}, {}, { '#text': 'assets/default-artist.svg' }] },
        { name: 'Drake', playcount: '950', image: [{}, {}, { '#text': 'assets/default-artist.svg' }] },
        { name: 'Bad Bunny', playcount: '800', image: [{}, {}, { '#text': 'assets/default-artist.svg' }] }
    ];
}

function getMockTopTracks() {
    return [
        { name: 'Kill Bill', artist: { name: 'SZA' }, playcount: '150' },
        { name: 'Flowers', artist: { name: 'Miley Cyrus' }, playcount: '140' },
        { name: 'Creepin', artist: { name: 'Metro Boomin' }, playcount: '130' }
    ];
}

function getMockMoods() {
    return [
        { label: 'pop', count: 15 },
        { label: 'dance', count: 12 },
        { label: 'electronic', count: 8 },
        { label: 'r&b', count: 6 },
        { label: 'hip-hop', count: 5 },
        { label: 'rock', count: 4 }
    ];
}
