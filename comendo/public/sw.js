// public/sw.js
// Service Worker para Comendo PWA
// Estrategia Cache First para assets estáticos
// Estrategia Network First para datos de Supabase

const CACHE_NAME = 'comendo-v1';

// Archivos que se cachean inmediatamente al instalar
const ASSETS_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Instalación ───────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-cacheando assets base');
      return cache.addAll(ASSETS_PRECACHE);
    })
  );
  self.skipWaiting();
});

// ── Activación — limpia caches viejos ─────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — estrategia según tipo de request ──────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network First para Supabase (datos siempre frescos)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache First para assets estáticos (JS, CSS, imágenes)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network First para el resto
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});