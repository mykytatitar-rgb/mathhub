/* Банк задач — зашифровані файли.

   Задачі з підручників — чужі тексти, у відкритому доступі їм не місце.
   Раніше їх ховав Cloudflare Access разом з усім сайтом, і за це
   доводилося щоразу вводити код із пошти. Тепер сайт відкритий, а файли
   банку лежать зашифрованими (їх готує tools/bank_seal.js). Ключ — лише
   в акаунті репетитора: полем bankKey у базі, тож він сам доїжджає на
   всі пристрої разом з учнями й розкладом.

   Потрапляє ключ у базу один раз — посиланням #/bank-key/<ключ> (див.
   app.js). На localhost його ще можна взяти з tools/books/bank.key:
   там сайт і файл лежать поруч.

   Файл: 12 байтів вектора, далі шифр AES-256-GCM. JSON усередині
   стиснутий gzip — розтискаємо вбудованим у браузер DecompressionStream.

   Кеш. Адреса кожного файлу несе його відбиток із manifest.json
   (?h=…), і service worker тримає такі файли в окремому кеші, який не
   чиститься з кожною новою версією кабінету: чотири мегабайти банку
   качаються наново лише тоді, коли змінився сам банк. */

(function () {
  'use strict';

  var BASE = 'assets/bank/';
  var PLAIN = 'assets/data/';          // відкриті файли — лише на комп'ютері, де збирають банк
  var B = {};

  var manifest = null;
  var manifestWait = null;
  var keyPromise = null;
  var keyText = null;
  var state = 'idle';                  // idle | ok | nokey | badkey | offline

  B.state = function () { return state; };

  function validKey(s) { return typeof s === 'string' && /^[A-Za-z0-9_-]{43}$/.test(s); }

  function fromB64url(s) {
    var b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4));
    var out = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
    return out;
  }

  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (x) {
      return ('0' + x.toString(16)).slice(-2);
    }).join('');
  }

  function isLocal() { return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); }

  /** Ключ із бази; на localhost — ще й із файлу поруч (читаємо його раз). */
  var localKey = null;

  function currentKeyText() {
    var db = window.S && S.db && S.db();
    if (db && validKey(db.bankKey)) return Promise.resolve(db.bankKey);
    if (!isLocal()) return Promise.resolve(null);
    if (!localKey) {
      localKey = fetch('tools/books/bank.key', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) { t = String(t || '').trim(); return validKey(t) ? t : null; })
        .catch(function () { return null; });
    }
    return localKey;
  }

  function getKey() {
    return currentKeyText().then(function (t) {
      if (!t) return null;
      if (keyPromise && keyText === t) return keyPromise;
      keyText = t;
      keyPromise = crypto.subtle.importKey('raw', fromB64url(t), 'AES-GCM', false, ['decrypt'])
        .then(function (k) {
          return crypto.subtle.digest('SHA-256', fromB64url(t)).then(function (d) {
            return { key: k, kid: hex(d).slice(0, 12) };
          });
        });
      return keyPromise;
    });
  }

  function getManifest() {
    if (manifest) return Promise.resolve(manifest);
    if (manifestWait) return manifestWait;
    manifestWait = fetch(BASE + 'manifest.json', { cache: 'no-cache' })
      .then(function (r) {
        var ct = r.headers.get('content-type') || '';
        if (!r.ok || ct.indexOf('json') < 0) throw new Error('немає покажчика банку');
        return r.json();
      })
      .then(function (m) { manifest = m; setTimeout(prune, 8000); return m; })
      .catch(function (e) { manifestWait = null; throw e; });
    return manifestWait;
  }

  /* Після перебудови банку в кеші лишаються файли зі старими відбитками —
     прибираємо їх, щоб чотири мегабайти не накопичувалися з кожною версією. */
  function prune() {
    if (!manifest || !window.caches) return;
    caches.open('vektor-bank').then(function (c) {
      return c.keys().then(function (reqs) {
        reqs.forEach(function (r) {
          var u = new URL(r.url);
          var rel = u.pathname.replace(/^.*\/assets\/bank\//, '').replace(/\.bin$/, '');
          if (manifest.files[rel] !== u.searchParams.get('h')) c.delete(r);
        });
      });
    }).catch(function () {});
  }

  function decrypt(k, buf) {
    var bytes = new Uint8Array(buf);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, k, bytes.subarray(12));
  }

  function gunzipText(buf) {
    var stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  /** Сирі байти файлу банку: rel — шлях на кшталт «book/alg.json». */
  function sealedBytes(rel) {
    return Promise.all([getManifest(), getKey()]).then(function (res) {
      var m = res[0], k = res[1];
      if (!k) { state = 'nokey'; throw new Error('немає ключа банку'); }
      if (m.kid && m.kid !== k.kid) { state = 'badkey'; throw new Error('ключ банку не той'); }
      var h = m.files && m.files[rel];
      if (!h) throw new Error('у банку немає ' + rel);
      return fetch(BASE + rel + '.bin?h=' + h).then(function (r) {
        if (!r.ok) throw new Error('файл не прочитався (' + r.status + ')');
        return r.arrayBuffer();
      }).then(function (buf) {
        return decrypt(k.key, buf).catch(function () {
          state = 'badkey';
          throw new Error('файл банку не розшифрувався');
        });
      }).then(function (plain) { state = 'ok'; return plain; });
    });
  }

  /** Відкритий файл поруч — лише там, де збирають банк. */
  function plainJson(rel) {
    return fetch(PLAIN + rel, { cache: 'no-cache' }).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (!r.ok || ct.indexOf('json') < 0) throw new Error('файл не прочитався (' + r.status + ')');
      return r.json();
    });
  }

  /** JSON з банку. Спершу — зашифрований; відкритий — лише як запасний на localhost. */
  B.json = function (rel) {
    return sealedBytes(rel)
      .then(gunzipText)
      .then(function (t) { return JSON.parse(t); })
      .catch(function (e) {
        if (isLocal()) return plainJson(rel);
        throw e;
      });
  };

  /* Малюнки до задач: розшифровані тримаємо як адреси blob:, щоб не
     розшифровувати той самий малюнок щоразу, як картка перемалюється. */
  var imgUrls = {};
  var imgWait = {};

  var BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  B.imageSrc = function (name) {
    if (imgUrls[name]) return imgUrls[name];
    loadImage(name);
    return BLANK;
  };

  function loadImage(name) {
    if (imgWait[name]) return;
    var rel = 'book/img/' + name;
    imgWait[name] = sealedBytes(rel).then(function (plain) {
      var type = /\.jpe?g$/i.test(name) ? 'image/jpeg' : /\.webp$/i.test(name) ? 'image/webp' : 'image/png';
      return URL.createObjectURL(new Blob([plain], { type: type }));
    }).catch(function () {
      return isLocal() ? PLAIN + rel : null;
    }).then(function (url) {
      delete imgWait[name];
      if (!url) return;
      imgUrls[name] = url;
      // картка вже намальована з порожнім місцем — ставимо малюнок на місце
      Array.prototype.forEach.call(document.querySelectorAll('img[data-bank-img]'), function (im) {
        if (im.getAttribute('data-bank-img') === name) im.src = url;
      });
    });
  }

  /** Прийняти ключ (з посилання). Повертає false, якщо рядок на ключ не схожий. */
  B.setKey = function (t) {
    if (!validKey(t)) return false;
    var db = window.S && S.db && S.db();
    if (!db) return false;
    if (db.bankKey !== t) {
      db.bankKey = t;
      S.save();
    }
    keyPromise = null;
    if (state === 'nokey' || state === 'badkey') state = 'idle';
    return true;
  };

  /** Чи вміє браузер те, без чого банк не прочитати. */
  B.supported = function () {
    return !!(window.crypto && crypto.subtle && window.DecompressionStream);
  };

  window.BankSeal = B;
})();
