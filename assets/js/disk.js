/* Велике сховище: IndexedDB замість localStorage для важких записів.

   localStorage дає сайту близько п'яти мегабайтів на все разом. Туди лягали
   і база, і всі дошки з формулами, і три страхові копії бази, і знімки
   дошок для синхронізації. Коли дошок стало багато, місце скінчилось, і
   браузер почав відмовляти в записі самої бази: «exceeded the quota».

   Важкі записи тепер живуть в IndexedDB, де місця в сотні разів більше.
   Решта програми про це майже не знає: до першого показу сторінки Disk
   підтягує ці записи в пам'ять, а далі Disk.get віддає їх так само
   миттєво, як localStorage. Запис іде в IndexedDB у фоні, останнім
   значенням. Інші вкладки дізнаються про зміну одразу, через
   BroadcastChannel, — як раніше дізнавались із події storage.

   Перший запуск переносить ці ключі з localStorage і прибирає їх звідти —
   так звільняється місце для самої бази. Прибираємо лише після того, як
   IndexedDB підтвердив запис: копія ніколи не зникає раніше, ніж з'явилась
   нова. */

(function () {
  'use strict';

  var D = {};

  var DB_NAME = 'vektor-disk';
  var STORE = 'kv';

  /* Що переїжджає. База учнів лишається в localStorage: вона невелика,
     і на її подію storage тримається синхронізація вкладок у cloud.js. */
  var BIG = ['mathhub.boards.v1', 'mathhub.before-sync', 'mathhub.ops.base'];
  var MOVED_FLAG = 'mathhub.disk.moved';      // перенесення вже було — localStorage більше не джерело

  var mem = {};           // ключ → рядок (null — запису немає)
  var ready = false;
  var fallback = false;   // IndexedDB недоступний — працюємо по-старому
  var broken = false;     // записи переїхали, а IndexedDB не читається: дошки невідомі
  var waiters = [];
  var idb = null;
  var channel = null;

  function isBig(key) { return BIG.indexOf(key) >= 0; }

  function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  function open() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('Немає IndexedDB')); return; }
      var req;
      try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB не відкрився')); };
      req.onblocked = function () { /* інша вкладка оновлює схему — чекаємо */ };
    });
  }

  function idbGet(key) {
    return new Promise(function (resolve, reject) {
      var tx = idb.transaction(STORE, 'readonly');
      var r = tx.objectStore(STORE).get(key);
      r.onsuccess = function () { resolve(r.result == null ? null : r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }

  function idbPut(key, value) {
    return new Promise(function (resolve, reject) {
      var tx = idb.transaction(STORE, 'readwrite');
      if (value == null) tx.objectStore(STORE).delete(key);
      else tx.objectStore(STORE).put(value, key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error('запис перервано')); };
    });
  }

  /* ---------- запис у фоні: на кожен ключ — лише останнє значення ---------- */

  var pending = {};       // ключ → значення, що ще не лягло
  var writing = {};       // ключ → true, поки йде транзакція

  function flushKey(key) {
    if (writing[key] || !(key in pending)) return;
    var value = pending[key];
    delete pending[key];
    writing[key] = true;
    idbPut(key, value).then(function () {
      writing[key] = false;
      flushKey(key);
    }, function (e) {
      writing[key] = false;
      console.warn('Disk: запис «' + key + '» не вдався:', e);
      // повторимо, якщо поки що не прийшло новішого значення
      if (!(key in pending)) pending[key] = value;
      setTimeout(function () { flushKey(key); }, 2000);
    });
  }

  /** Чи все записане вже лягло на диск (для «Чи все ціле» й перед закриттям). */
  D.idle = function () {
    return !Object.keys(pending).length && !Object.keys(writing).some(function (k) { return writing[k]; });
  };

  /* ---------- відкритий інтерфейс ---------- */

  /** Викликати cb, коли важкі записи вже в пам'яті. */
  D.ready = function (cb) {
    if (ready) { cb(); return; }
    waiters.push(cb);
  };

  D.isReady = function () { return ready; };

  /** Важкі записи переїхали, але прочитати їх не вдалося — писати поверх не можна. */
  D.broken = function () { return broken; };
  D.usesIndexedDB = function () { return ready && !fallback; };

  D.get = function (key) {
    if (!isBig(key) || fallback) return lsGet(key);
    if (!ready) {
      // до готовності важкі записи ще не прочитані — чесно кажемо «не знаю»
      console.warn('Disk.get до готовності:', key);
      return lsGet(key);
    }
    return key in mem ? mem[key] : null;
  };

  /** Записати. Кидає виняток лише в старому режимі, коли повний сам localStorage. */
  D.set = function (key, value) {
    if (isBig(key) && broken) return;          // нечитане не перезаписуємо
    if (!isBig(key) || fallback || !ready) {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      return;
    }
    mem[key] = value == null ? null : String(value);
    pending[key] = mem[key];
    flushKey(key);
    if (channel) {
      try { channel.postMessage({ key: key, value: mem[key] }); } catch (e) { /* завеликий лист — інші вкладки перечитають */ }
    }
  };

  D.remove = function (key) { D.set(key, null); };

  /* ---------- старт ---------- */

  function finish() {
    ready = true;
    var list = waiters;
    waiters = [];
    list.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }

  function startFallback(reason) {
    console.warn('Disk: працюємо через localStorage —', reason);
    fallback = true;
    finish();
  }

  function listen() {
    if (!window.BroadcastChannel) return;
    try {
      channel = new BroadcastChannel('vektor-disk');
      channel.onmessage = function (e) {
        var m = e.data || {};
        if (isBig(m.key)) mem[m.key] = m.value;
      };
    } catch (e) { channel = null; }
  }

  function boot() {
    var moved = lsGet(MOVED_FLAG) === '1';

    /* Якщо IndexedDB мовчить, а перенесення ще не було — працюємо
       по-старому: усе ще лежить у localStorage. Якщо перенесення вже було,
       по-старому не можна: у localStorage цих записів більше немає, і
       програма вирішила б, що дошок нема. Тоді чекаємо далі. */
    var timer = setTimeout(function () {
      if (ready) return;
      if (!moved) { startFallback('IndexedDB не відповідає'); return; }
      /* Записи вже в IndexedDB, а він мовчить. Відкриваємо програму, але
         дошки вважаємо непрочитаними: краще їх не показати, ніж затерти. */
      broken = true;
      finish();
      if (window.U && U.toast) U.toast('Сховище браузера не відповідає — дошки не прочиталися. Перезавантажте сторінку.', 'err');
    }, 8000);

    open().then(function (db) {
      idb = db;
      return Promise.all(BIG.map(function (key) {
        return idbGet(key).then(function (v) { return [key, v]; });
      }));
    }).then(function (pairs) {
      if (ready) return;           // уже пішли старим шляхом — не змішуємо
      var migrate = [];
      pairs.forEach(function (p) {
        var key = p[0], v = p[1];
        var ls = lsGet(key);
        if (v != null) {
          mem[key] = v;
          if (ls != null) migrate.push([key, null]);      // лишок у localStorage — прибрати
        } else if (ls != null) {
          mem[key] = ls;
          migrate.push([key, ls]);                        // перенести
        } else {
          mem[key] = null;
        }
      });
      clearTimeout(timer);
      listen();
      finish();

      // перенесення — у фоні, прибирання — лише після підтвердженого запису
      Promise.all(migrate.map(function (m) {
        return (m[1] != null ? idbPut(m[0], m[1]) : Promise.resolve()).then(function () {
          try { localStorage.removeItem(m[0]); } catch (e) { /* нехай лишається */ }
        });
      })).then(function () {
        try { localStorage.setItem(MOVED_FLAG, '1'); } catch (e) { /* позначка не критична */ }
      }, function (e) { console.warn('Disk: перенесення не завершилось:', e); });
    }, function (e) {
      clearTimeout(timer);
      if (!moved) { startFallback(e && e.message); return; }
      broken = true;
      finish();
      if (window.U && U.toast) {
        U.toast('Сховище браузера недоступне, дошки не прочиталися. Перезавантажте сторінку.', 'err');
      }
    });
  }

  boot();

  window.Disk = D;
})();
