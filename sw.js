/* 산박지도 v83: always revalidate navigation HTML online; retain cached fallback offline. */
const CACHE_NAME = 'sanbakmap-v117-knps-exact-contacts';
const APP_SHELL = ['./index.html','./national.html','./national_data.js','./national_routes.js','./ganwol-review.html','./yeongnam-gpx-connect.html','./yeongnam-osm.html','./yeongnam-course-v72.js','./national-parks-trails.html','./national-parks-basemap.js','./seorak-v76-extra.js','./seorak-v77-extra.js','./seorak-v78-extra.js','./seorak-v83-gpx-tracks.js','./seorak-v95-pois.js','./seorak-v96-plan.js','./core/trail-visibility.js','./data/knps-seorak-2018.geojson','./nationwide-official.html','./nationwide-full.html','./nationwide-topology.html','./nationwide-plan.html','./core/nationwide-route-preview-v104.js','./core/nationwide-pois-v105.js','./core/nationwide-map-v106.js','./core/nationwide-map-view-v106.js','./core/nationwide-knps-contacts-v117.js','./core/nationwide-elevation-v107.js','./core/nationwide-elevation-chart-v107.js','./core/nationwide-elevation-pack-v108.js','./core/nationwide-elevation-archive-v110.js','./data/nationwide-elevation/index.json','./data/nationwide-elevation/online-v110.json','./data/nationwide-elevation/seorak-knps-v108.json','./data/nationwide-elevation/seorak-forest-v109.json','./data/nationwide-elevation/odae-forest-v109.json','./data/nationwide-elevation/gyeryong-forest-v109.json','./data/nationwide-pois/index.json','./core/nationwide-source-loader.js','./core/nationwide-app.js','./data/nationwide/index.json','./ganwol-review-data.js','./ganwol-verify.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
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
  // Always refresh the generated online DEM manifest; offline falls back to prior verified cache.
  if (url.pathname.endsWith('/data/nationwide-elevation/online-v110.json')) {
    event.respondWith(fetch(req, {cache:'no-store'}).then(res => {
      if (res.ok) {
        const fresh = res.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(req, fresh)));
      }
      return res;
    }).catch(async () => await caches.match(req) || Response.error()));
    return;
  }
  // Network-first for the map modules. Cached older JS can lack a newer
  // optional planner API and must not be mixed with newly fetched HTML.
  if (url.pathname.endsWith('/core/nationwide-map-v106.js') ||
      url.pathname.endsWith('/core/nationwide-map-view-v106.js') ||
      url.pathname.endsWith('/core/nationwide-knps-contacts-v117.js')) {
    event.respondWith(fetch(req, {cache:'no-store'}).then(res => {
      if (res.ok) {
        const fresh = res.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(req, fresh)));
      }
      return res;
    }).catch(async () => await caches.match(req, {ignoreSearch:true}) || Response.error()));
    return;
  }
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
