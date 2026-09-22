/* Історія дошки: локальні знімки, які можна відкотити.

   Навіщо окремо від решти. Резервні копії на сервері знімаються не частіше
   ніж раз на п'ять хвилин і зберігають базу цілком — щоб дістати з них одну
   дошку, треба відкотити геть усе. Для роботи на уроці це не рятунок: зникло
   тут і зараз, а повертати доводиться разом із рештою змін.

   Тому кожна дошка веде власну коротку історію просто в браузері. Вона не
   залежить ні від мережі, ні від входу в акаунт, ні від того, чи хтось
   помітив втрату вчасно.

   Своя база даних, а не сусідство зі сховищем картинок: підняти версію тієї
   бази означало б зачепити вже збережені картинки, а їх чіпати не варто. */
(function () {
  'use strict';

  var DB_NAME = 'vektor-history';
  var STORE = 'versions';
  var KEEP = 40;              // скільки знімків тримаємо на одну дошку
  var dbPromise = null;

  var H = {};

  H.available = function () { return !!window.indexedDB; };

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('Немає IndexedDB')); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var s = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          s.createIndex('board', 'board', { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Сховище історії не відкрилося')); };
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var store = t.objectStore(STORE);
        var out;
        fn(store, function (v) { out = v; });
        t.oncomplete = function () { resolve(out); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  /** Коротко про вміст — щоб у списку було видно, що саме повертаєш. */
  function describe(board) {
    var slides = (board.slides || []).length;
    var items = 0, images = 0;
    (board.slides || []).forEach(function (s) {
      (s.items || []).forEach(function (it) {
        items++;
        if (it.t === 'i') images++;
      });
    });
    return { slides: slides, items: items, images: images };
  }

  /**
   * Зберегти знімок. Однакові поспіль не пишемо: інакше історія забилася б
   * копіями того самого, і в ній не лишилося б місця для справжніх версій.
   */
  H.save = function (boardKey, board) {
    if (!H.available() || !boardKey || !board) return Promise.resolve(false);

    /* Знімаємо стан синхронно, до першого await. Інакше дошку встигли б
       змінити (наприклад, під час самого відкату), і опис у списку описував
       би вже не той знімок, що збережений поруч. */
    var json, d;
    /* Службове поле обміну (_sync) у версію не кладемо: воно вдвічі
       збільшило б кожен знімок і змінювалось би без жодної зміни дошки. */
    try {
      json = JSON.stringify(board, function (k, v) { return k === '_sync' ? undefined : v; });
      d = describe(board);
    } catch (e) { return Promise.resolve(false); }

    return H.list(boardKey).then(function (rows) {
      if (rows.length && rows[0].size === json.length && rows[0].hash === hash(json)) {
        return false;                       // нічого не змінилося
      }
      return tx('readwrite', function (store) {
        store.add({
          board: boardKey,
          at: new Date().toISOString(),
          size: json.length,
          hash: hash(json),
          slides: d.slides, items: d.items, images: d.images,
          json: json
        });
      }).then(function () { return trim(boardKey); }).then(function () { return true; });
    }).catch(function () { return false; });
  };

  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h;
  }

  /** Знімки однієї дошки, найновіші спершу. */
  H.list = function (boardKey) {
    if (!H.available()) return Promise.resolve([]);
    return tx('readonly', function (store, done) {
      var out = [];
      var req = store.index('board').openCursor(IDBKeyRange.only(boardKey));
      req.onsuccess = function () {
        var c = req.result;
        if (c) {
          var v = c.value;
          // сам JSON у список не тягнемо — він великий і тут не потрібен
          out.push({ id: v.id, at: v.at, size: v.size, hash: v.hash,
                     slides: v.slides, items: v.items, images: v.images });
          c.continue();
        } else {
          out.sort(function (a, b) { return (a.at < b.at) ? 1 : -1; });
          done(out);
        }
      };
    }).catch(function () { return []; });
  };

  /** Повний знімок за номером. */
  H.get = function (id) {
    return tx('readonly', function (store, done) {
      var req = store.get(id);
      req.onsuccess = function () {
        var v = req.result;
        if (!v) { done(null); return; }
        try { done(JSON.parse(v.json)); } catch (e) { done(null); }
      };
    }).catch(function () { return null; });
  };

  /** Лишаємо тільки останні KEEP на дошку. */
  function trim(boardKey) {
    return H.list(boardKey).then(function (rows) {
      if (rows.length <= KEEP) return 0;
      var old = rows.slice(KEEP).map(function (r) { return r.id; });
      return tx('readwrite', function (store) {
        old.forEach(function (id) { store.delete(id); });
      }).then(function () { return old.length; });
    });
  }

  /** Прибрати історію дошки, якої більше немає. */
  H.drop = function (boardKey) {
    if (!H.available()) return Promise.resolve(0);
    return H.list(boardKey).then(function (rows) {
      return tx('readwrite', function (store) {
        rows.forEach(function (r) { store.delete(r.id); });
      }).then(function () { return rows.length; });
    }).catch(function () { return 0; });
  };

  /** Скільки всього знімків і на скільки дошок — для панелі стану. */
  H.stats = function () {
    if (!H.available()) return Promise.resolve({ total: 0, boards: 0 });
    return tx('readonly', function (store, done) {
      var boards = {}, total = 0;
      var req = store.openCursor();
      req.onsuccess = function () {
        var c = req.result;
        if (c) { total++; boards[c.value.board] = 1; c.continue(); }
        else done({ total: total, boards: Object.keys(boards).length });
      };
    }).catch(function () { return { total: 0, boards: 0 }; });
  };

  window.BoardHistory = H;
})();
