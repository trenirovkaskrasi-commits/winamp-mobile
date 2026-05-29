self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
      }
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      return self.registration.unregister();
    })
  );
});

self.addEventListener('fetch', function(e) {
  // Pass through all requests
});
