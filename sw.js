const CACHE_NAME = 'brailleflex-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('BrailleFlex Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('BrailleFlex Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('BrailleFlex Service Worker: Installation complete');
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('BrailleFlex Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('BrailleFlex Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('BrailleFlex Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('BrailleFlex Service Worker: Activation complete');
        // Ensure the service worker takes control of all pages immediately
        return self.clients.claim();
      })
      .catch(error => {
        console.error('BrailleFlex Service Worker: Activation failed', error);
      })
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', event => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('BrailleFlex Service Worker: Serving from cache', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        console.log('BrailleFlex Service Worker: Fetching from network', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.error('BrailleFlex Service Worker: Fetch failed', error);
            
            // Return a basic offline page if available
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            throw error;
          });
      })
  );
});

// Handle background sync for settings
self.addEventListener('sync', event => {
  if (event.tag === 'save-settings') {
    console.log('BrailleFlex Service Worker: Background sync for settings');
    // Settings are already saved to localStorage by the main app
    // This is just for logging/monitoring
  }
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('BrailleFlex Service Worker: Received skip waiting message');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Notification for PWA updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Simple update check mechanism
    fetch('./manifest.json', { cache: 'no-cache' })
      .then(response => response.json())
      .then(manifest => {
        event.ports[0].postMessage({
          type: 'UPDATE_AVAILABLE',
          version: manifest.version
        });
      })
      .catch(() => {
        event.ports[0].postMessage({
          type: 'UPDATE_CHECK_FAILED'
        });
      });
  }
});
