/**
 * Service Worker — estratégia segura para SPA (Vite):
 * - Nunca servir index.html antigo do cache (evita chunk JS 404 e tela carregando para sempre).
 * - Navegação: sempre rede primeiro.
 * - Precache só de assets estáveis (manifest, logo).
 */
const CACHE_STATIC = 'booknow-v3-static';
const PRECACHE_URLS = ['/manifest.webmanifest', '/brand-logo.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => (key !== CACHE_STATIC ? caches.delete(key) : Promise.resolve())))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegação / documento: sempre rede (index.html deve bater com /assets/* atuais)
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).catch(() => new Response('Sem conexão. Tente de novo.', { status: 503, statusText: 'Offline' }))
    );
    return;
  }

  // Demais recursos: rede primeiro; opcionalmente guarda cópia para uso offline leve
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_STATIC).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
