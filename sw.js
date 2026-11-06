/* 산박지도 v58: always revalidate navigation HTML online; retain cached fallback offline. */
const CACHE_NAME = 'sanbakmap-v58-fresh-1';
const APP_SHELL = ['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
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
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('./index.html', fresh)));
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
