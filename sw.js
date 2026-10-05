/* Service worker: миттєве завантаження й робота без інтернету.

   Стратегія навмисно різна для різних типів запитів:
   - index.html — спершу мережа, щоб оновлення застосунку не «залипало»;
   - файли assets/ — віддаємо з кешу одразу, а свіжу версію тягнемо у фоні;
   - усе стороннє (курс НБУ) — не чіпаємо взагалі.

   Версію треба піднімати щоразу, коли змінюється склад файлів. */

var VERSION = 'vektor-v154';

/* Банк задач — окремий кеш: він не залежить від версії кабінету й не
   чиститься з кожним оновленням. Кожен файл банку приходить з відбитком
   вмісту в адресі (?h=…), тож застаріти не може. */
var BANK = 'vektor-bank';

/* Код і стилі кешуються з номером версії в адресі (app.js?v=112) — той
   самий номер, що в index.html і App.BUILD; піднімає всі три tools/bump.js. */
var V = VERSION.replace(/\D/g, '');

var PAGES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg'
];

var CODE = [
  './assets/css/app.css',
  './assets/css/board.css',
  './assets/js/icons.js',
  './assets/js/utils.js',
  './assets/js/disk.js',
  './assets/js/store.js',
  './assets/js/vault.js',
  './assets/js/cloudconfig.js',
  './assets/js/cloud.js',
  './assets/js/journal.js',
  './assets/js/components.js',
  './assets/js/forms.js',
  './assets/js/rates.js',
  './assets/js/ics.js',
  './assets/js/mathfmt.js',
  './assets/js/sheets-data.js',
  './assets/js/imagestore.js',
  './assets/js/boardhistory.js',
  './assets/js/boardsync.js',
  './share/engine/ops.js',
  './assets/js/boardops.js',
  './assets/js/live.js',
  './assets/js/recsync.js',
  './assets/js/cloudimages.js',
  './assets/js/views-main.js',
  './assets/js/views-schedule.js',
  './assets/js/views-student.js',
  './assets/js/views-board.js',
  './assets/js/bankseal.js',
  './assets/js/olymp.js',
  './assets/js/views-olymp.js',
  './assets/js/views-bank.js',
  './assets/js/views-formulas.js',
  './assets/js/mathmap-data.js',
  './assets/js/mathmap-extras.js',
  './assets/js/views-mathmap.js',
  './assets/js/app.js',
  // вантажаться не на старті, а коли знадобляться, — але без інтернету теж мають бути
  './assets/js/mathmap-content.js',
  './assets/js/formulas-algebra.js',
  './assets/js/formulas-trig.js',
  './assets/js/formulas-analysis.js',
  './assets/js/formulas-prob.js',
  './assets/js/formulas-plane.js',
  './assets/js/formulas-space.js',
  './assets/js/formulas-en-algebra.js',
  './assets/js/formulas-en-trig.js',
  './assets/js/formulas-en-analysis.js',
  './assets/js/formulas-en-prob.js',
  './assets/js/formulas-en-plane.js',
  './assets/js/formulas-en-space.js',
  './assets/js/shapefacts.js',
  './share/engine/constructions.js',
  './share/engine/plot.js',
  './share/engine/solids.js',
  './share/engine/points.js',
  './share/engine/board.js'
];

var SHELL = PAGES.concat(CODE.map(function (u) { return u + '?v=' + V; }));

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
        return Promise.all(keys.filter(function (k) { return k !== VERSION && k !== BANK; })
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

  // Файл банку з відбитком: кеш банку, мережа — лише вперше
  if (url.pathname.indexOf('/assets/bank/') >= 0 && url.searchParams.has('h')) {
    e.respondWith(
      caches.open(BANK).then(function (c) {
        return c.match(req).then(function (hit) {
          return hit || fetch(req).then(function (res) {
            if (res && res.status === 200) c.put(req, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // Сторінка й покажчик банку: свіжа версія важливіша за швидкість, кеш — запасний варіант
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') ||
      url.pathname.endsWith('/assets/bank/manifest.json')) {
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

  /* Код із номером версії в адресі: кеш одразу, без жодного запиту.

     Такий файл не може застаріти — нова версія має нову адресу, бо
     index.html завжди береться свіжим (див. вище). Раніше кожне відкриття
     кабінету перепитувало сервер про всі сорок файлів і чекало відповіді
     до півтори секунди — на мобільному інтернеті це й була пауза на старті. */
  if (isCode(url) && url.searchParams.has('v')) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(VERSION).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  /* Код без номера версії (сторінка учня, старі вкладки): спершу мережа,
     кеш — запасний варіант.

     Раніше було навпаки — кеш одразу, а свіже підтягувалося у фоні. Через це
     кожна зміна показувалася аж наступного відкриття, і збоку це виглядало
     так, ніби її не зробили. Пояснення й смужка «є оновлення» проблему не
     знімали: людина відкриває сторінку й бачить старе.

     Мережа з обмеженням часу: якщо інтернет повільний або його немає,
     за секунду з половиною беремо кеш і працюємо далі. */
  if (isCode(url)) {
    e.respondWith(
      fromNetworkFirst(req).catch(function () {
        /* Кешу немає (перше відкриття на повільному інтернеті) — чекаємо
           мережу, а не віддаємо помилку: інакше сторінка учня без жодної
           причини падала на запасний, старий переглядач. */
        return caches.match(req).then(function (r) { return r || fetch(req); });
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
