// Service Worker para PWA
const CACHE_NAME = 'barberpro-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone da requisição
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Verifica se resposta é válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone da resposta
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Offline fallback
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});
