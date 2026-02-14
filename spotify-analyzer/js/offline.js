
export class OfflineDataHandler {
    constructor() {
        this.fileInput = null;
        this.dropZone = null;
    }

    init(dropZoneId, fileInputId, callback) {
        this.dropZone = document.getElementById(dropZoneId);
        this.fileInput = document.getElementById(fileInputId);
        this.callback = callback;

        if (!this.dropZone || !this.fileInput) return;

        this.setupListeners();
    }

    setupListeners() {
        // Drag Information
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        // Highlight
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => {
                this.dropZone.classList.add('highlight');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => {
                this.dropZone.classList.remove('highlight');
            }, false);
        });

        // Handle Drop
        this.dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });

        // Handle Click (Select File)
        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }

    handleFiles(files) {
        if (!files.length) return;
        const file = files[0];

        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            alert('Please upload a valid JSON file (StreamingHistory.json)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.processData(data);
            } catch (err) {
                console.error('JSON Parse Error:', err);
                alert('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
    }

    processData(historyData) {
        // Standardize Input (Handle both 'StreamingHistory' and 'ExtendedStreamingHistory' formats)
        // Format A: { "artistName", "trackName", "msPlayed", "endTime" }
        // Format B: { "master_metadata_album_artist_name", "master_metadata_track_name", "ms_played", "ts" }

        const trackMap = new Map();
        const artistMap = new Map();
        const hourCounts = Array(24).fill(0);

        historyData.forEach(entry => {
            const artist = entry.artistName || entry.master_metadata_album_artist_name;
            const track = entry.trackName || entry.master_metadata_track_name;
            const ms = entry.msPlayed || entry.ms_played;
            const dateStr = entry.endTime || entry.ts;

            if (!track || !artist || ms < 30000) return; // Skip <30s

            // 1. Top Tracks
            const trackKey = `${track} - ${artist}`;
            if (!trackMap.has(trackKey)) {
                trackMap.set(trackKey, { name: track, artist: { name: artist }, playcount: 0 });
            }
            trackMap.get(trackKey).playcount++;

            // 2. Top Artists
            if (!artistMap.has(artist)) {
                artistMap.set(artist, { name: artist, playcount: 0, image: [{}, {}, { '#text': '' }] });
            }
            artistMap.get(artist).playcount++;

            // 3. Listening Clock
            if (dateStr) {
                try {
                    const date = new Date(dateStr);
                    hourCounts[date.getHours()]++;
                } catch (e) { }
            }
        });

        // Sort & Slice
        const sortedTracks = Array.from(trackMap.values())
            .sort((a, b) => b.playcount - a.playcount)
            .slice(0, 50);

        const sortedArtists = Array.from(artistMap.values())
            .sort((a, b) => b.playcount - a.playcount)
            .slice(0, 20);

        // Usage Callback
        if (this.callback) {
            this.callback({
                topTracks: sortedTracks,
                topArtists: sortedArtists,
                listeningClock: hourCounts,
                source: 'Offline File'
            });
        }
    }
}
