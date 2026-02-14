const API_KEY = '3f2d0e5b7955fb66d23d30485c3e88c1'; // User provided
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export class LastFmClient {
    constructor() {
        this.apiKey = API_KEY;
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    async _fetch(method, params) {
        if (!this.apiKey) {
            console.error('API Key missing');
            return null;
        }

        const url = new URL(BASE_URL);
        url.searchParams.append('method', method);
        url.searchParams.append('api_key', this.apiKey);
        url.searchParams.append('format', 'json');

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value);
        }

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                console.error('API HTTP Error:', response.status, data);
                throw new Error(data.message || `API Error: ${response.status}`);
            }

            if (data.error) {
                console.error('API Application Error:', data.error, data.message);
                throw new Error(data.message || 'Last.fm API Error');
            }

            return data;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error; // Re-throw to be caught by app.js
        }
    }

    async getUserInfo(user) {
        return this._fetch('user.getinfo', { user });
    }

    async getRecentTracks(user, limit = 10) {
        return this._fetch('user.getrecenttracks', { user, limit });
    }

    async getTopArtists(user, period = '7day', limit = 10) {
        return this._fetch('user.gettopartists', { user, period, limit });
    }

    async getTopTracks(user, period = '7day', limit = 10) {
        return this._fetch('user.gettoptracks', { user, period, limit });
    }

    async getArtistTags(artist) {
        return this._fetch('artist.gettoptags', { artist });
    }

    async getTrackInfo(artist, track) {
        return this._fetch('track.getinfo', { artist, track, autocorrect: 1 });
    }
}
