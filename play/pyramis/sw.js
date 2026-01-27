// ==============================================
// PYRAMIS - Service Worker (Phase 5)
// ==============================================

const CACHE_NAME = 'pyramis-v2';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './js/pyramis.js',
    './audio/pyramis.mp3',
    './audio/win.mp3',
    './audio/draw.mp3',
    './audio/pair.mp3',
    './audio/Invalid.mp3'
];

// Install event - cache assets
self.addEventListener('install', event => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching app assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] Install complete');
                return self.skipWaiting();
            })
            .catch(err => {
                console.log('[SW] Cache failed:', err);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone the response for caching
                const responseClone = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseClone);
                    });

                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Return offline fallback for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});
