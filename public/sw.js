/**
 * Service Worker for caching and offline functionality
 *
 * @description This service worker implements a basic caching strategy:
 * - On install: Caches the root path "/" and "/login" page in cache storage (v1)
 * - On fetch: Attempts to serve requests from cache first, falls back to network if not cached
 *
 * This enables the application to work offline for cached routes and improves performance
 * by serving cached assets without network requests when available.
 */
// public/sw.js
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("v1").then((cache) => cache.addAll(["/", "/login"])));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
