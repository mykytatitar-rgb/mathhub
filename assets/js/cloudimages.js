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
  var missing = {};      // ключі, яких немає й на сервері — щоб не питати вічно

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
      // немає локально — нічого відправляти (ключ прийшов з іншого пристрою)
      if (!blob) { synced[key] = true; saveSynced(); return; }
      return Cloud.request(objectPath(key), {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true' },
        body: blob
      }).then(function (res) {
        // 200 — записано, 409 — вже є (обидва означають «на сервері воно є»)
        if (res.ok || res.status === 409) { synced[key] = true; saveSynced(); return; }
        throw new Error('Сервер відповів ' + res.status);
      });
    });
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
    used.forEach(function (k) {
      if (!synced[k] && queue.indexOf(k) < 0) queue.push(k);
    });
    drain();
  };

  CI.pending = function () { return queue.length + (busy ? 1 : 0); };

  /* ============================================================
     Підвантаження на вимогу
     ============================================================ */

  function download(key) {
    if (!ready() || missing[key] || !navigator.onLine) return Promise.resolve(null);
    return Cloud.request(objectPath(key), { method: 'GET' }).then(function (res) {
      if (res.status === 404 || res.status === 400) { missing[key] = true; return null; }
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
  };

  window.CloudImages = CI;

  if (document.readyState === 'complete') CI.start();
  else window.addEventListener('load', function () { CI.start(); });
})();
