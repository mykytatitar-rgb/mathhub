/* Картинки дошок на сервері.

   Навіщо окремо від cloud.js: сама база — це один невеликий JSON-документ,
   а картинки важать на порядки більше й лежать в IndexedDB. Тягнути їх
   у той самий документ не можна — він просто не вмістився б у localStorage.

   Головне правило те саме, що й для бази: дошка НІКОЛИ не чекає на мережу.
   Малювання й вставка картинок працюють як раніше, а відправка йде у фоні,
   по одній картинці, щоб не забивати канал під час уроку.

   Зворотний бік — підвантаження на вимогу: якщо картинки немає локально
   (наприклад, дошку намалювали на комп'ютері, а відкриваємо на телефоні),
   вона тихо доїжджає з сервера. Для цього перехоплено ImgStore.get,
   тому решта програми — дошка, домашні завдання, експорт — працює без змін. */

(function () {
  'use strict';

  var BUCKET = 'boards';
  var SYNCED = 'mathhub.imgcloud';   // які ключі вже на сервері
  var IS = window.ImgStore;
  var CI = {};

  var synced = {};       // { ключ: true }
  var queue = [];        // ключі, що чекають відправки
  var busy = false;
  var missing = {};      // ключ → коли сервер сказав «немає»: не питати щосекунди
  var absent = {};       // ключ → коли файлу не було тут: відправимо, щойно зʼявиться
  var MISSING_MS = 60000;
  var ABSENT_MS = 120000;

  function loadSynced() {
    try {
      var raw = localStorage.getItem(SYNCED);
      if (raw) synced = JSON.parse(raw) || {};
    } catch (e) { synced = {}; }
  }

  function saveSynced() {
    try { localStorage.setItem(SYNCED, JSON.stringify(synced)); } catch (e) { /* не критично */ }
  }

  function ready() {
    return !!(window.Cloud && Cloud.available() && Cloud.signedIn() && Cloud.userId() && IS && IS.available());
  }

  function objectPath(key) {
    return '/storage/v1/object/' + BUCKET + '/' + encodeURIComponent(Cloud.userId()) + '/' + encodeURIComponent(key);
  }

  /* ============================================================
     Відправка
     ============================================================ */

  function uploadOne(key) {
    // getLocal з'являється лише після перехоплення — до того читаємо звичайним get
    var read = IS.getLocal || IS.get;
    return read.call(IS, key).then(function (blob) {
      /* Файлу тут поки немає — ні відправляти, ні вважати відправленим.
         Раніше тут ставилась позначка «на сервері», і фото учня, що в цю
         мить ще докачувалося, не відправлялося вже ніколи: на іншому
         пристрої слайд ДЗ лишався без фото. */
      if (!blob) { absent[key] = Date.now(); return; }
      delete absent[key];
      return Cloud.request(objectPath(key), {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true' },
        body: blob
      }).then(function (res) {
        // 200 — записано, 409 — вже є (обидва означають «на сервері воно є»)
        if (res.ok || res.status === 409) { synced[key] = true; saveSynced(); return; }

        /* 413 — сервер відмовився через розмір. Це не збій мережі й не
           мине саме собою, тож повторювати нескінченно нема сенсу: файл
           лишається лише тут, і про це має бути сказано вголос. */
        if (res.status === 413) {
          tooBig[key] = blob.size || 1;
          saveTooBig();
          console.warn('Файл завеликий для сервера:', key);
          return;
        }
        throw new Error('Сервер відповів ' + res.status);
      });
    });
  }

  /* Список того, що сервер не бере. Тримаємо між запусками: інакше кожне
     відкриття програми знову намагалося б відправити той самий файл. */
  var TOOBIG = 'mathhub.img.toobig';
  var tooBig = {};
  try { tooBig = JSON.parse(localStorage.getItem(TOOBIG) || '{}') || {}; } catch (e) { tooBig = {}; }
  function saveTooBig() {
    try { localStorage.setItem(TOOBIG, JSON.stringify(tooBig)); } catch (e) {}
  }

  function drain() {
    if (busy || !queue.length || !ready() || !navigator.onLine) return;
    busy = true;
    var key = queue.shift();
    uploadOne(key)
      .catch(function (e) {
        // не вдалося — повертаємо в кінець черги, спробуємо пізніше
        console.warn('Картинка не поїхала (' + key + '):', e.message);
        if (queue.indexOf(key) < 0) queue.push(key);
      })
      .then(function () {
        busy = false;
        if (queue.length) setTimeout(drain, 300);   // по одній, щоб не забивати канал
      });
  }

  /** Поставити в чергу все, що використовується дошками й домашніми, але ще не на сервері. */
  CI.sync = function () {
    if (!ready() || !window.S || !S.usedImageKeys) return;
    var used = S.usedImageKeys();
    var now = Date.now();
    used.forEach(function (k) {
      if (absent[k] && now - absent[k] < ABSENT_MS) return;
      if (!synced[k] && !tooBig[k] && queue.indexOf(k) < 0) queue.push(k);
    });
    drain();
  };

  /**
   * Звірка з тим, що справді лежить у сховищі. Позначка «на сервері» — лише
   * памʼять цього пристрою, і вона могла помилитися (див. uploadOne). Що
   * сервер має — позначаємо; чого не має, хоч позначене, — ставимо в чергу
   * знову, якщо файл тут є.
   */
  CI.verify = function () {
    if (!ready() || !window.S || !S.usedImageKeys) return Promise.resolve(0);
    return CI.listRemote().then(function (list) {
      if (!list || !list.length) return 0;          // перелік не прочитався — нічого не чіпаємо
      var remote = {};
      list.forEach(function (r) { remote[r.key] = 1; });
      var redo = 0;
      S.usedImageKeys().forEach(function (k) {
        if (remote[k]) { synced[k] = true; delete missing[k]; return; }
        if (synced[k]) { delete synced[k]; redo++; }
      });
      saveSynced();
      if (redo) console.warn('Картинки: ' + redo + ' позначені відправленими, але на сервері їх немає — відправляю');
      CI.sync();
      return redo;
    });
  };

  CI.pending = function () { return queue.length + (busy ? 1 : 0); };

  /** Файли, які сервер відмовився прийняти через розмір. */
  CI.tooBig = function () { return Object.keys(tooBig); };

  /**
   * Усе, що лежить у сховищі на сервері.
   *
   * Потрібно для пошуку загублених картинок. Картинку могли додати з іншого
   * пристрою — тоді в цьому браузері її немає взагалі, і місцевий пошук її
   * не побачить, хоч вона й ціла.
   *
   * Читаємо сторінками: у сховищі можуть бути тисячі файлів, а відповідь
   * обмежена.
   */
  CI.listRemote = function () {
    if (!ready() || !navigator.onLine) return Promise.resolve([]);

    var prefix = Cloud.userId() + '/';
    var out = [];
    var PAGE = 100;

    function page(offset) {
      return Cloud.request('/storage/v1/object/list/' + BUCKET, {
        method: 'POST',
        body: JSON.stringify({ prefix: prefix, limit: PAGE, offset: offset,
                               sortBy: { column: 'name', order: 'asc' } })
      }).then(function (res) {
        if (!res.ok) throw new Error('Сервер відповів ' + res.status);
        return res.json();
      }).then(function (rows) {
        if (!rows || !rows.length) return out;
        rows.forEach(function (r) {
          if (!r || !r.name || r.id === null) return;      // тека, а не файл
          out.push({ key: r.name, size: (r.metadata && r.metadata.size) || 0 });
        });
        return rows.length < PAGE ? out : page(offset + rows.length);
      });
    }

    return page(0).catch(function (e) {
      console.warn('Сховище картинок не перелічилось:', e && e.message);
      return out;
    });
  };

  /* ============================================================
     Підвантаження на вимогу
     ============================================================ */

  function download(key) {
    if (!ready() || !navigator.onLine) return Promise.resolve(null);
    if (missing[key] && Date.now() - missing[key] < MISSING_MS) return Promise.resolve(null);
    return Cloud.request(objectPath(key), { method: 'GET' }).then(function (res) {
      if (res.status === 404 || res.status === 400) { missing[key] = Date.now(); return null; }
      if (!res.ok) return null;
      return res.blob();
    }).catch(function () { return null; });
  }

  /* Перехоплюємо читання картинок. Так дошка, домашні завдання й експорт
     починають бачити картинки з інших пристроїв, і жоден із них
     не довелося змінювати. */
  function hookGet() {
    if (!IS || IS.getLocal) return;            // вже перехоплено
    IS.getLocal = IS.get;                      // початкове читання лишаємо доступним
    IS.get = function (key) {
      return IS.getLocal(key).then(function (blob) {
        if (blob) return blob;
        return download(key).then(function (fromCloud) {
          if (!fromCloud) return blob;
          synced[key] = true; saveSynced();
          return IS.put(key, fromCloud).then(function () { return fromCloud; })
                   .catch(function () { return fromCloud; });
        });
      });
    };
  }

  /* ============================================================
     Старт
     ============================================================ */

  CI.start = function () {
    if (!IS || !IS.available()) return;
    loadSynced();
    hookGet();

    window.addEventListener('online', function () { CI.sync(); });

    // при згортанні вкладки — щоб щойно вставлене фото не чекало на таймер
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') CI.sync();
    });

    // періодично перевіряємо, чи не з'явилося нових картинок
    setInterval(function () { CI.sync(); }, 20000);
    CI.sync();

    // раз на запуск — звірка зі сховищем, коли все інше вже вляглося
    setTimeout(function () { CI.verify().catch(function () {}); }, 30000);
  };

  window.CloudImages = CI;

  if (document.readyState === 'complete') CI.start();
  else window.addEventListener('load', function () { CI.start(); });
})();
