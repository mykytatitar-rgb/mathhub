/* Сховище страхових копій бази.

   Навіщо окремо від тих трьох копій, що лежать у localStorage.

   По-перше, місце. localStorage дає близько п'яти мегабайтів на весь сайт,
   а сама база вже під мегабайт — тобто більше трьох копій туди фізично не
   влізе, і кожна нова відбирає місце в самої бази. IndexedDB дає гігабайти,
   тож копій може бути тридцять і вони нікому не заважають.

   По-друге, привід. Ті копії робляться лише перед прийняттям серверної версії.
   Тут — ще й щодня при відкритті. Найгірші втрати трапляються не в момент
   синхронізації, а тихо, і виявляються за кілька днів.

   Окрема база, а не нова таблиця в сховищі картинок: підвищення версії тієї
   бази зачепило б дошки, а їх чіпати не можна.

   Тут же живе прохання про постійне сховище. Без нього браузер має право
   стерти дані сайту, коли на диску стає тісно, — мовчки й без питань. */

(function () {
  'use strict';

  var DB_NAME = 'mathhub-vault';
  var STORE = 'copies';
  var KEEP = 30;
  var V = {};

  V.available = function () {
    try { return !!window.indexedDB; } catch (e) { return false; }
  };

  function open() {
    return new Promise(function (resolve, reject) {
      if (!V.available()) return reject(new Error('IndexedDB недоступна'));
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var req = fn(t.objectStore(STORE));
        t.oncomplete = function () { db.close(); resolve(req && req.result); };
        t.onerror = function () { db.close(); reject(t.error); };
        t.onabort = function () { db.close(); reject(t.error); };
      });
    });
  }

  /** Коротка вибірка з бази — щоб у списку було видно, що саме в копії. */
  function summarize(text) {
    var out = { students: 0, lessons: 0, boards: 0, slides: 0, items: 0 };
    try {
      var db = JSON.parse(text);
      out.students = (db.students || []).length;
      out.lessons = (db.lessons || []).length;
      out.boards = (db.boards || []).length;
      (db.boards || []).forEach(function (b) {
        out.slides += (b.slides || []).length;
        (b.slides || []).forEach(function (s) { out.items += (s.items || []).length; });
      });
    } catch (e) { /* пошкоджена копія — покажемо нулі, але не втратимо */ }
    return out;
  }

  /**
   * Покласти копію. Однакові поспіль не множимо: за день без правок вийшло б
   * тридцять однакових копій, і вони витіснили б справді різні.
   */
  V.put = function (reason, text) {
    if (!text) return Promise.resolve(false);
    var sum = summarize(text);

    return V.list().then(function (list) {
      var last = list[0];
      if (last && last.bytes === text.length && last.sum &&
          last.sum.items === sum.items && last.sum.lessons === sum.lessons) {
        return false;
      }
      return tx('readwrite', function (s) {
        return s.add({ at: new Date().toISOString(), reason: reason || '', bytes: text.length, sum: sum, data: text });
      }).then(function () { return V.trim(); }).then(function () { return true; });
    }).catch(function (e) {
      console.warn('копія не збереглася:', e);
      return false;
    });
  };

  V.list = function () {
    return tx('readonly', function (s) { return s.getAll(); }).then(function (all) {
      return (all || []).map(function (r) {
        return { id: r.id, at: r.at, reason: r.reason, bytes: r.bytes, sum: r.sum };
      }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    }).catch(function () { return []; });
  };

  V.get = function (id) {
    return tx('readonly', function (s) { return s.get(Number(id)); });
  };

  V.del = function (id) {
    return tx('readwrite', function (s) { return s.delete(Number(id)); });
  };

  V.trim = function () {
    return V.list().then(function (list) {
      var extra = list.slice(KEEP);
      return Promise.all(extra.map(function (r) { return V.del(r.id); }));
    });
  };

  /* ============================================================
     Постійне сховище
     ============================================================ */

  /**
   * Попросити браузер не викидати дані цього сайту.
   *
   * Без цього дозволу Chrome вважає сховище «найкращим зусиллям»: коли на
   * диску стає тісно, він має право стерти його цілком, без попередження.
   * З дозволом — не має. Питати варто один раз; повторні виклики нічого
   * не ламають і повертають той самий стан.
   */
  V.persist = function () {
    if (!navigator.storage || !navigator.storage.persist) {
      return Promise.resolve({ supported: false, persisted: false });
    }
    return navigator.storage.persisted().then(function (already) {
      if (already) return { supported: true, persisted: true, asked: false };
      return navigator.storage.persist().then(function (ok) {
        return { supported: true, persisted: !!ok, asked: true };
      });
    }).catch(function () {
      return { supported: true, persisted: false, error: true };
    });
  };

  V.usage = function () {
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
    return navigator.storage.estimate().then(function (e) {
      return { used: e.usage || 0, quota: e.quota || 0 };
    }).catch(function () { return null; });
  };

  window.Vault = V;
})();
