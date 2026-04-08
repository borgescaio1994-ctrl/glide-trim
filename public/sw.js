/**
 * Service Worker — estratégia segura para SPA (Vite):
 * - Navegação com cache: 'no-store' para não usar a cache HTTP do browser (senão IP vs domínio
 *   podem mostrar index.html de versões diferentes por origem).
 * - Precache só do manifest.
 */
const CACHE_STATIC = 'booknow-v14-static';
// Manifest na mesma base que o SW (raiz do domínio quando Vite base é /)
const swDir = self.location.pathname.replace(/\/[^/]+$/, '');
const PRECACHE_URLS = [swDir ? `${swDir}/manifest.webmanifest` : '/manifest.webmanifest'];

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

  // Navegação / documento: rede sem cache HTTP do browser (evita index.html velho por host)
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(
        () => new Response('Sem conexão. Tente de novo.', { status: 503, statusText: 'Offline' })
      )
    );
    return;
  }

  // Demais recursos: rede primeiro; cache SW só como fallback offline (ficheiros /assets/* têm hash novo a cada build)
  event.respondWith(
    fetch(req, { cache: 'no-store' })
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
