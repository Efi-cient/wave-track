import { LastFmClient } from './api.js';
import { createMoodChart, createListeningClock } from './charts.js';
import { OfflineDataHandler } from './offline.js';

const client = new LastFmClient();
const offlineHandler = new OfflineDataHandler();

// State
const state = {
    user: null,
    recentTracks: [],
    topArtists: [],
    topTracks: [],
    moods: [],
    listeningClock: Array(24).fill(0)
};

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');

// Init
function init() {
    setupNavigation();

    const savedUser = localStorage.getItem('lastfm_user');
    if (savedUser) {
        showDashboard(savedUser);
    }

    // Init Offline Handler
    offlineHandler.init('drop-zone', 'json-file-input', (result) => {
        if (result && result.topTracks) {
            handleOfflineData(result);
        }
    });
}

// Navigation
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Updated class name from nav-item to nav-btn
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetId = btn.getAttribute('data-target');
            document.querySelectorAll('.view').forEach(view => {
                if (view.id === 'login-section') return;
                view.classList.remove('active-view'); // Updated class
                view.classList.add('hidden');
            });

            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.classList.remove('hidden');
                targetView.classList.add('active-view');

                // Trigger chart resize if needed
                if (targetId === 'view-insights') {
                    window.dispatchEvent(new Event('resize'));
                }
            }
        });
    });
}

function showLogin() {
    loginSection.classList.add('active-view');
    loginSection.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
}

async function showDashboard(username) {
    loginSection.classList.remove('active-view');
    loginSection.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');

    // Reset Views
    document.querySelectorAll('.view').forEach(v => {
        if (v.id !== 'login-section') v.classList.add('hidden');
    });
    document.getElementById('view-overview').classList.remove('hidden');
    document.getElementById('view-overview').classList.add('active-view');

    state.user = username;
    localStorage.setItem('lastfm_user', username);
    document.getElementById('user-name').textContent = username;

    await loadData(username);
}

function handleOfflineData(result) {
    state.user = 'Offline User';
    state.topTracks = result.topTracks;
    state.recentTracks = [];
    state.moods = [];

    showDashboard('Offline User');
    renderTopTracks();
    alert('Loaded ' + result.topTracks.length + ' tracks from file.');
}

// Data Loading
async function loadData(username) {
    try {
        const [recent, artists, tracks, userInfo] = await Promise.all([
            client.getRecentTracks(username, 20),
            client.getTopArtists(username),
            client.getTopTracks(username, '12month', 50),
            client.getUserInfo(username)
        ]);

        if (userInfo && userInfo.user) {
            const avatar = userInfo.user.image[2]['#text'];
            if (avatar) document.getElementById('user-avatar').src = avatar;
            if (userInfo.user.registered) {
                const date = new Date(userInfo.user.registered.unixtime * 1000);
                document.getElementById('user-since').textContent = date.getFullYear();
            }
        }

        // 1. Recent Tracks
        const recentData = recent?.recenttracks?.track;
        if (recentData) {
            state.recentTracks = Array.isArray(recentData) ? recentData : [recentData];
            processListeningClock(state.recentTracks);
        }

        // 2. Top Artists
        const artistData = artists?.topartists?.artist;
        if (artistData) {
            state.topArtists = Array.isArray(artistData) ? artistData : [artistData];
            // Mock moods for now as tag fetching is heavy
            state.moods = [
                { label: 'Pop', count: 80 }, { label: 'Indie', count: 65 },
                { label: 'Rock', count: 40 }, { label: 'Electronic', count: 30 }
            ];
        }

        // 3. Top Tracks
        const trackData = tracks?.toptracks?.track;
        if (trackData) {
            state.topTracks = Array.isArray(trackData) ? trackData : [trackData];
        }

        renderAll();

    } catch (err) {
        console.error(err);
        alert('Error loading data. Check console.');
    }
}

function processListeningClock(tracks) {
    const hours = Array(24).fill(0);
    tracks.forEach(t => {
        if (t.date) {
            const d = new Date(t.date.uts * 1000);
            hours[d.getHours()]++;
        }
    });
    state.listeningClock = hours;
}

// Renderers
function renderAll() {
    renderRecentTracks();
    renderTopArtists();
    renderTopTracks();
    renderCharts();
}

function renderRecentTracks() {
    const list = document.getElementById('recent-tracks-list');
    if (!state.recentTracks.length) {
        list.innerHTML = '<li style="padding:20px; text-align:center; color:#888;">No recent tracks.</li>';
        return;
    }

    list.innerHTML = state.recentTracks.map(track => {
        const isNowPlaying = track['@attr'] && track['@attr'].nowplaying;
        const img = track.image[1]['#text'] || 'assets/default-album.svg';

        return `
            <li class="track-item">
                <img src="${img}" class="track-img" loading="lazy">
                <div class="track-details">
                    <span class="track-name ${isNowPlaying ? 'now-playing' : ''}">
                        ${isNowPlaying ? '<span class="pulse-dot"></span>' : ''} ${track.name}
                    </span>
                    <span class="track-artist">${track.artist['#text']}</span>
                </div>
                <span class="timestamp" style="font-size:0.7em; color:#666;">
                    ${isNowPlaying ? 'Playing' : formatTime(track.date['#text'])}
                </span>
            </li>
        `;
    }).join('');
}

function renderTopArtists() {
    const list = document.getElementById('artist-list');
    list.innerHTML = state.topArtists.slice(0, 12).map((artist, i) => {
        const img = artist.image[2]['#text'] || 'assets/default-artist.svg';
        return `
            <div class="artist-card">
                <img src="${img}" class="artist-img" loading="lazy">
                <div style="font-weight:bold; margin-bottom:5px;">${artist.name}</div>
                <div class="badge">#${i + 1}</div>
            </div>
        `;
    }).join('');
}

function renderTopTracks() {
    const list = document.getElementById('top-tracks-list');
    list.innerHTML = `
        <table class="data-table" style="width:100%; text-align:left; border-collapse:collapse;">
            <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:#888; font-size:0.8rem;">
                    <th style="padding:10px;">#</th>
                    <th style="padding:10px;">Track</th>
                    <th style="padding:10px;">Plays</th>
                </tr>
            </thead>
            <tbody>
                ${state.topTracks.slice(0, 50).map((t, i) => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:10px; color:#888;">${i + 1}</td>
                        <td style="padding:10px;">
                            <div style="font-weight:600;">${t.name}</div>
                            <div style="font-size:0.8em; color:#888;">${t.artist.name}</div>
                        </td>
                        <td style="padding:10px; font-family:monospace; color:var(--primary);">${t.playcount}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderCharts() {
    // Clock
    const ctxClock = document.getElementById('listeningClock');
    if (window.clockChart) window.clockChart.destroy();
    if (ctxClock) window.clockChart = createListeningClock(ctxClock, state.listeningClock);

    // Moods
    const ctxMood = document.getElementById('moodChart');
    if (window.moodChart) window.moodChart.destroy();
    if (ctxMood) window.moodChart = createMoodChart(ctxMood, state.moods);

    // Genre/Artist Share (Pie)
    const ctxPie = document.getElementById('genrePieChart');
    if (window.pieChart) window.pieChart.destroy();
    if (ctxPie) {
        const top5 = state.topArtists.slice(0, 5);
        window.pieChart = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: top5.map(a => a.name),
                datasets: [{
                    data: top5.map(a => a.playcount),
                    backgroundColor: ['#00f2ff', '#bd00ff', '#1db954', '#ffffff', '#888888'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#fff' } } }
            }
        });
    }
}

function formatTime(str) {
    // Simple formatter, can be improved
    if (!str) return '';
    const d = new Date(str);
    return d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
}

// Event Listeners
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (username) showDashboard(username);
});

// Filter Chips
document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', async (e) => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');

        const period = e.target.getAttribute('data-period');
        if (state.user) {
            const data = await client.getTopTracks(state.user, period);
            if (data?.toptracks?.track) {
                state.topTracks = Array.isArray(data.toptracks.track)
                    ? data.toptracks.track
                    : [data.toptracks.track];
                renderTopTracks();
            }
        }
    });
});

window.addEventListener('DOMContentLoaded', init);
