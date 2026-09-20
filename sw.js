/* ═══════════════════════════════════════════════════════════════════════════
   Service worker de Tasty Poke — Horarios
   ───────────────────────────────────────────────────────────────────────────
   Hace dos cosas:
     1) Permite que Android ofrezca "Instalar aplicación".
     2) Deja la app funcionando sin cobertura: guarda una copia de la página y
        de la librería de Excel la primera vez, y la sirve si no hay red.

   Criterios:
     · La PÁGINA se pide siempre primero a la red (así una versión nueva llega
       enseguida) y solo se tira de la copia si no hay conexión.
     · La LIBRERÍA de Excel se sirve de la copia (no cambia nunca).
     · Las llamadas a la NUBE (jsonbin) y al lector de imágenes nunca se
       guardan: deben ir siempre a la red o fallar limpiamente.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

// Sube este número cuando publiques una versión: fuerza a renovar la copia.
const VERSION = 'tasty-poke-v1';
const ESENCIALES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
const LIBRERIA = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';

// ── Instalación: guardamos lo imprescindible ──────────────────────────────
self.addEventListener('install', ev => {
  ev.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // addAll falla entero si un archivo da error; los añadimos de uno en uno
    await Promise.all(ESENCIALES.map(u => cache.add(u).catch(() => {})));
    await cache.add(LIBRERIA).catch(() => {});
    self.skipWaiting();          // la versión nueva entra sin esperar
  })());
});

// ── Activación: borramos copias de versiones anteriores ───────────────────
self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter(n => n !== VERSION).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// ── Peticiones ────────────────────────────────────────────────────────────
self.addEventListener('fetch', ev => {
  const req = ev.request;

  // Solo tocamos lecturas normales; lo demás pasa de largo
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // La nube y el lector de imágenes SIEMPRE a la red, nunca desde copia:
  // los horarios compartidos no pueden servirse desactualizados.
  if (url.hostname.indexOf('jsonbin.io') >= 0) return;
  if (url.pathname.indexOf('tesseract') >= 0) return;
  if (url.pathname.indexOf('openholidaysapi') >= 0) return;
  if (url.hostname.indexOf('openholidaysapi') >= 0) return;

  // La librería de Excel: primero la copia, que no cambia nunca
  if (req.url === LIBRERIA) {
    ev.respondWith((async () => {
      const guardada = await caches.match(req);
      if (guardada) return guardada;
      try {
        const res = await fetch(req);
        if (res && res.ok) (await caches.open(VERSION)).put(req, res.clone());
        return res;
      } catch (e) {
        return new Response('', { status: 504, statusText: 'sin conexión' });
      }
    })());
    return;
  }

  // Todo lo demás de nuestro sitio: red primero, copia si no hay conexión
  if (url.origin === self.location.origin) {
    ev.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) (await caches.open(VERSION)).put(req, res.clone());
        return res;
      } catch (e) {
        const guardada = await caches.match(req);
        if (guardada) return guardada;
        // si piden una página y no la tenemos, devolvemos la principal
        if (req.mode === 'navigate') {
          const inicio = await caches.match('./index.html') || await caches.match('./');
          if (inicio) return inicio;
        }
        return new Response('Sin conexión y sin copia guardada.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
  }
});
