const CACHE_NAME = 'spotify-analyzer-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install Event: Cache App Shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching App Shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// Fetch Event: Cache-First for Assets, Network-Only for API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Handle API Requests (Network Only)
    if (url.pathname.startsWith('/api') || url.hostname === 'api.spotify.com') {
        event.respondWith(fetch(event.request));
        return;
    }

    // 2. Handle Login/Auth (Network Only)
    if (url.pathname.startsWith('/login') || url.pathname.startsWith('/callback')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // 3. Handle Static Assets (Cache First)
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Clone the request because it's a stream and can only be consumed once
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    (response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});
