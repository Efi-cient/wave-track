// SpotAPI Backend Client
const BASE_URL = '/api';

export class LastFmClient {
    // Keeping class name for compatibility with app.js
    constructor() { }

    async _fetch(endpoint) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`);
            if (!response.ok) {
                throw new Error(`Backend Error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    async getUserInfo(user) {
        return this._fetch(`/user/${user}/overview`);
    }

    async getRecentTracks(user, limit = 10) {
        return this._fetch(`/user/${user}/recent`);
    }

    async getTopArtists(user, period = '7day', limit = 10) {
        return this._fetch('/stats/top-artists');
    }

    async getTopTracks(user, period = '7day', limit = 10) {
        return this._fetch('/stats/top-tracks');
    }

    async getArtistTags(artist) {
        return null;
    }

    async getListeningHistory() {
        return this._fetch('/stats/history');
    }
}
