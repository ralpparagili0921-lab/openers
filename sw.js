// Service worker for OR/PACU Opener Readiness App.
// Purpose: let the app be opened fresh — not just kept running — with zero
// internet connection, by caching the app shell (index.html) itself.
//
// Bump CACHE_NAME every time APP_VERSION changes in index.html, so a deployed
// update actually reaches devices instead of serving a stale cached shell forever.
var CACHE_NAME = 'or-opener-shell-v2026.08.06.04';
var SHELL_URLS = [
  './', './index.html',
  './Cera_Pro_Regular.woff2', './Cera_Pro_Regular_Italic.woff2',
  './Cera_Pro_Medium.woff2', './Cera_Pro_Bold.woff2', './Cera_Pro_Black.woff2'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_URLS);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Same-origin requests (the app shell itself): serve from cache immediately if
// available, and refresh the cache in the background when online. Cross-origin
// requests (Google Fonts, the Supabase CDN script) are left alone — the browser's
// own HTTP cache handles those, and the app already degrades gracefully if they
// don't load (falls back to system fonts; Supabase client simply stays offline
// and the existing sync queue takes over).
self.addEventListener('fetch', function(event){
  var url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function(cached){
      var networkFetch = fetch(event.request).then(function(response){
        if(response && response.status===200){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){ return cached; });
      return cached || networkFetch;
    })
  );
});
