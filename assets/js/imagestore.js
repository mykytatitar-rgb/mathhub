/* Сховище картинок дошки.
   Картинки навмисно лежать не в localStorage (там ~5 МБ на весь застосунок),
   а в IndexedDB — там квота на порядки більша. У самій дошці зберігається
   лише ключ картинки, а не її вміст. */
(function () {
  'use strict';

  var DB_NAME = 'mathhub-images';
  var STORE = 'imgs';
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('Браузер не підтримує IndexedDB')); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Не вдалося відкрити сховище картинок')); };
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var store = t.objectStore(STORE);
        var out;
        try { out = fn(store); } catch (e) { reject(e); return; }
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('Запис скасовано')); };
      });
    });
  }

  var IS = {};

  IS.available = function () { return !!window.indexedDB; };

  IS.put = function (key, blob) { return tx('readwrite', function (s) { return s.put(blob, key); }); };

  IS.get = function (key) { return tx('readonly', function (s) { return s.get(key); }); };

  IS.del = function (key) { return tx('readwrite', function (s) { return s.delete(key); }); };

  IS.keys = function () { return tx('readonly', function (s) { return s.getAllKeys(); }); };

  /** Скільки місця займають картинки, у байтах. */
  IS.usage = function () {
    return tx('readonly', function (s) { return s.getAll(); }).then(function (all) {
      return (all || []).reduce(function (a, b) { return a + (b && b.size ? b.size : 0); }, 0);
    });
  };

  /** Прибрати картинки, на які вже ніхто не посилається. */
  IS.gc = function (usedKeys) {
    var used = {};
    (usedKeys || []).forEach(function (k) { used[k] = true; });
    return IS.keys().then(function (keys) {
      var dead = (keys || []).filter(function (k) { return !used[k]; });
      return Promise.all(dead.map(function (k) { return IS.del(k); })).then(function () { return dead.length; });
    });
  };

  /* ---------- Перетворення ---------- */

  IS.toDataURL = function (blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result)); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsDataURL(blob);
    });
  };

  IS.fromDataURL = function (dataURL) {
    return fetch(dataURL).then(function (r) { return r.blob(); });
  };

  /* ---------- Прийом файлу ---------- */

  var MAX_SIDE = 1800;

  function canWebp() {
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 1;
      return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) { return false; }
  }
  var WEBP = null;

  /**
   * Приймає File/Blob із картинкою, зменшує завеликі, стискає й кладе у сховище.
   * Повертає {key, w, h, bytes}.
   */
  IS.ingest = function (file) {
    if (WEBP === null) WEBP = canWebp();
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error('Це не картинка'));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { URL.revokeObjectURL(url); reject(new Error('Порожнє зображення')); return; }

        var k = Math.min(1, MAX_SIDE / Math.max(w, h));
        var tw = Math.max(1, Math.round(w * k)), th = Math.max(1, Math.round(h * k));

        var cv = document.createElement('canvas');
        cv.width = tw; cv.height = th;
        var ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, tw, th);
        URL.revokeObjectURL(url);

        var type = WEBP ? 'image/webp' : 'image/jpeg';
        cv.toBlob(function (blob) {
          if (!blob) { reject(new Error('Не вдалося стиснути картинку')); return; }
          // якщо стиснення не допомогло, лишаємо оригінал (буває з простою графікою)
          var chosen = (file.size && blob.size > file.size && k === 1) ? file : blob;
          var key = 'img_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
          IS.put(key, chosen).then(function () {
            resolve({ key: key, w: tw, h: th, bytes: chosen.size });
          }).catch(reject);
        }, type, 0.85);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Не вдалося прочитати файл'));
      };
      img.src = url;
    });
  };

  window.ImgStore = IS;
})();
