// Last.fm Client via Vercel Proxy
const PROXY_URL = '/api/proxy';

export class LastFmClient {
    constructor() { }

    async _fetch(method, params = {}) {
        const url = new URL(PROXY_URL, window.location.origin);
        url.searchParams.append('method', method);

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    async getUserInfo(user) {
        return this._fetch('user.getInfo', { user });
    }

    async getRecentTracks(user, limit = 10) {
        return this._fetch('user.getRecentTracks', { user, limit });
    }

    async getTopArtists(user, period = '7day', limit = 10) {
        return this._fetch('user.getTopArtists', { user, period, limit });
    }

    async getTopTracks(user, period = '7day', limit = 10) {
        return this._fetch('user.getTopTracks', { user, period, limit });
    }

    async getArtistTags(artist) {
        return this._fetch('artist.getTopTags', { artist });
    }

    // Note: getListeningHistory is not a direct API method, 
    // it requires processing recent tracks over time. 
    // For now we'll stick to what we have in app.js which calculates it from recent tracks.
}
