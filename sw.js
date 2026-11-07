/* 산박지도 v83: always revalidate navigation HTML online; retain cached fallback offline. */
const CACHE_NAME = 'sanbakmap-v96-poi-plan-1';
const APP_SHELL = ['./index.html','./national.html','./national_data.js','./national_routes.js','./ganwol-review.html','./yeongnam-gpx-connect.html','./yeongnam-osm.html','./yeongnam-course-v72.js','./national-parks-trails.html','./national-parks-basemap.js','./seorak-v76-extra.js','./seorak-v77-extra.js','./seorak-v78-extra.js','./seorak-v83-gpx-tracks.js','./seorak-v95-pois.js','./seorak-v96-plan.js','./ganwol-review-data.js','./ganwol-verify.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(name => name.startsWith('sanbakmap-') && name !== CACHE_NAME).map(name => caches.delete(name)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url), scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, {cache:'no-store'}).then(res => {
      if (res.ok) {
        const fresh = res.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(req, fresh)));
      }
      return res;
    }).catch(async () => await caches.match(req,{ignoreSearch:true}) || await caches.match('./index.html') || Response.error()));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    if (res.ok) {
      const fresh = res.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(req,fresh)));
    }
    return res;
  })));
});
