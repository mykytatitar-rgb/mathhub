/* Прибирання після «Справ», що недовго жили в /tasks/ зі своїм service worker.

   Браузер, де той лишився, при першій же перевірці оновлення отримає цей
   файл: він стирає свій кеш, знімає сам себе й відкриває у вікні кабінет
   замість старої сторінки. Після цього в /tasks/ нічого не працює окремо. */

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  var home = new URL('../', self.registration.scope).href;
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k.indexOf('spravy-') === 0; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (clients) {
        return self.registration.unregister().then(function () {
          clients.forEach(function (c) { try { c.navigate(home); } catch (err) {} });
        });
      })
  );
});
