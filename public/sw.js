// Service Worker for CivicAlert PWA & Web Push Notifications

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  let data = { title: 'CivicAlert Update', body: 'New civic report submitted.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'CivicAlert Update', body: event.data.text() };
    }
  }

  const title = data.title;
  const options = {
    body: data.body,
    icon: '/logo-192.png',
    badge: '/badge-72.png',
    data: data.data || {},
    actions: [
      { action: 'view', title: 'View Report' },
      { action: 'close', title: 'Close' }
    ],
    vibrate: [200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.', event.notification.data);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(windowClients) {
        // If an App window is already open, focus it and notify navigation
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url.indexOf(location.origin) === 0 && 'focus' in client) {
            client.postMessage({ type: 'navigate', url: urlToOpen });
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Simple offline assets caching
const CACHE_NAME = 'civicalert-c-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache).catch(() => {});
      })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
