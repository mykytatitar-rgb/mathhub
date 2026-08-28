/* Service worker: миттєве завантаження й робота без інтернету.

   Стратегія навмисно різна для різних типів запитів:
   - index.html — спершу мережа, щоб оновлення застосунку не «залипало»;
   - файли assets/ — віддаємо з кешу одразу, а свіжу версію тягнемо у фоні;
   - усе стороннє (курс НБУ) — не чіпаємо взагалі.

   Версію треба піднімати щоразу, коли змінюється склад файлів. */

var VERSION = 'vektor-v45';

var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/css/app.css',
  './assets/css/board.css',
  './assets/js/icons.js',
  './assets/js/utils.js',
  './assets/js/store.js',
  './assets/js/vault.js',
  './assets/js/cloudconfig.js',
  './assets/js/cloud.js',
  './assets/js/components.js',
  './assets/js/forms.js',
  './assets/js/rates.js',
  './assets/js/ics.js',
  './assets/js/mathfmt.js',
  './assets/js/sheets-data.js',
  './assets/js/imagestore.js',
  './assets/js/boardhistory.js',
  './assets/js/boardsync.js',
  './assets/js/boardops.js',
  './assets/js/recsync.js',
  './assets/js/cloudimages.js',
  './assets/js/shapefacts.js',
  './assets/js/constructions.js',
  './assets/js/board.js',
  './assets/js/views-main.js',
  './assets/js/views-schedule.js',
  './assets/js/views-student.js',
  './assets/js/views-board.js',
  './assets/js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      // один недоступний файл не має валити всю установку
      .then(function (c) { return Promise.allSettled(SHELL.map(function (u) { return c.add(u); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== VERSION; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // курс НБУ й інші зовнішні — повз кеш

  // Сторінка: свіжа версія важливіша за швидкість, кеш — запасний варіант
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
          return res;
        })
        .catch(function () { return caches.match(req).then(function (r) { return r || caches.match('./index.html'); }); })
    );
    return;
  }

  /* Код застосунку: спершу мережа, кеш — запасний варіант.

     Раніше було навпаки — кеш одразу, а свіже підтягувалося у фоні. Через це
     кожна зміна показувалася аж наступного відкриття, і збоку це виглядало
     так, ніби її не зробили. Пояснення й смужка «є оновлення» проблему не
     знімали: людина відкриває сторінку й бачить старе.

     Мережа з обмеженням часу: якщо інтернет повільний або його немає,
     за секунду з половиною беремо кеш і працюємо далі. */
  if (isCode(url)) {
    e.respondWith(
      fromNetworkFirst(req).catch(function () {
        return caches.match(req).then(function (r) {
          return r || Response.error();
        });
      })
    );
    return;
  }

  // Решта (картинки, іконки): кеш миттєво, оновлення у фоні
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});

var NET_TIMEOUT = 1500;

/** Мережа з обмеженням часу; вдале — одразу в кеш. */
function fromNetworkFirst(req) {
  return new Promise(function (resolve, reject) {
    var settled = false;
    var timer = setTimeout(function () {
      if (!settled) { settled = true; reject(new Error('timeout')); }
    }, NET_TIMEOUT);

    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        /* Вкладку могли не закривати годинами — тоді сторінка й далі
           виконує старий код. Помічаємо, що файл на сервері змінився,
           і пропонуємо оновитися. */
        caches.match(req).then(function (old) {
          if (old && stamp(old) !== stamp(res)) tellClients();
          return caches.open(VERSION).then(function (c) { c.put(req, copy); });
        });
      }
      if (!settled) { settled = true; clearTimeout(timer); resolve(res); }
    }).catch(function (err) {
      if (!settled) { settled = true; clearTimeout(timer); reject(err); }
    });
  });
}

function isCode(url) {
  return /\.(js|css)$/.test(url.pathname);
}

/** Ознака версії файлу — те, що дає сервер: ETag або дата зміни. */
function stamp(res) {
  return (res.headers.get('etag') || '') + '|' + (res.headers.get('last-modified') || '');
}

var told = false;
function tellClients() {
  if (told) return;          // одного повідомлення на завантаження досить
  told = true;
  self.clients.matchAll().then(function (cs) {
    cs.forEach(function (c) { c.postMessage('assets-updated'); });
  });
}

/* Дозволяє сторінці попросити негайне оновлення. */
self.addEventListener('message', function (e) {
  if (e.data === 'skip-waiting') self.skipWaiting();
});
