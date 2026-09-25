/* Тихий журнал: що пішло не так — у базу, а не в консоль.

   Дошки два дні не читалися з сервера: у ролі «увійшов» не було права
   читати таблицю. Кабінет про це знав від першого ж запиту — і мовчки
   писав у консоль, яку ніхто не бачить. Звідси й «розсинхрон», і пошук
   навпомацки.

   Тепер такі речі лягають у таблицю client_log вашого акаунта:
     server — сервер відмовив (статус і перші рядки відповіді);
     error  — програма впала (повідомлення й місце);
     check  — щоденна самоперевірка: кожен пристрій раз на добу пробує
              прочитати все, без чого кабінет не працює, і записує
              результат разом з версією коду й типом пристрою.
   Людині на екрані нічого не показується. Читає журнал той, хто лагодить
   (Journal.recent()).

   Однакове повідомлення — не частіше ніж раз на пів години з пристрою.
   Без мережі чи входу записи чекають у браузері й доїжджають пізніше. */

(function () {
  'use strict';

  var J = {};
  var BUF = 'mathhub.journal.buf';
  var SEEN = 'mathhub.journal.seen';
  var CHECKED = 'mathhub.journal.checked';
  var QUIET_MS = 30 * 60000;
  var MAX_BUF = 60;
  var KEEP_DAYS = 60;

  /* Без чого кабінет не працює: таблиці, які він читає напряму. */
  var TABLES = ['records', 'boards', 'board_ops', 'shares', 'share_contributions', 'portals', 'snapshots', 'state'];

  function load(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
  function keep(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* не критично */ } }

  var buf = load(BUF, []);
  var seen = load(SEEN, {});
  var sending = false;
  var timer = null;
  var off = false;            // таблиці журналу немає — не молотимо сервер

  function device() {
    var ua = navigator.userAgent || '';
    var os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' :
             /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : 'інше';
    var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    return os + (standalone ? ' · застосунок' : ' · браузер') + ' · ' + window.innerWidth + 'px';
  }

  function ready() {
    return !!(window.Cloud && Cloud.available() && Cloud.signedIn() && navigator.onLine);
  }

  /** Записати подію. kind: server | error | check. */
  J.add = function (kind, msg, detail) {
    msg = String(msg || '').slice(0, 300);
    var key = kind + '|' + msg;
    var now = Date.now();
    if (seen[key] && now - seen[key] < QUIET_MS) return;
    seen[key] = now;
    Object.keys(seen).forEach(function (k) { if (now - seen[k] > 86400000) delete seen[k]; });
    keep(SEEN, seen);

    buf.push({
      at: new Date(now).toISOString(),
      kind: kind,
      msg: msg,
      detail: detail || null,
      build: window.APP_BUILD || '',
      device: device(),
      page: String(location.hash || '').slice(0, 80)
    });
    if (buf.length > MAX_BUF) buf = buf.slice(-MAX_BUF);
    keep(BUF, buf);
    flushSoon();
  };

  function flushSoon() {
    if (timer || off) return;
    timer = setTimeout(function () { timer = null; flush(); }, 4000);
  }

  function flush() {
    if (sending || off || !buf.length || !ready()) return;
    var batch = buf.slice(0, 20);
    sending = true;
    Cloud.request('/rest/v1/client_log', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify(batch)
    }).then(function (res) {
      sending = false;
      if (res.ok) {
        buf = buf.slice(batch.length);
        keep(BUF, buf);
        if (buf.length) flushSoon();
        return;
      }
      // таблиці ще немає або немає прав — лишаємо в браузері, спробуємо в інший запуск
      if (res.status === 404 || res.status === 403) {
        off = true;
        console.error('Журнал: сервер не приймає записи (' + res.status + ') — таблиця client_log?');
      }
    }, function () { sending = false; });
  }

  /* ---------- відмови сервера (виклик із cloud.js) ---------- */

  function expected(path, method, status) {
    if (path.indexOf('/rest/v1/client_log') === 0) return true;          // сам журнал — без кола
    if (path.indexOf('/storage/v1/object/') === 0) {
      if ((status === 404 || status === 400) && method === 'GET') return true;   // картинки ще немає — це нормально
      if (status === 409) return true;                                   // уже є
    }
    return false;
  }

  J.server = function (path, method, res) {
    try {
      method = method || 'GET';
      var base = String(path || '').split('?')[0];
      if (expected(base, method, res.status)) return;
      var query = String(path || '').split('?')[1] || '';
      res.clone().text().then(function (body) {
        J.add('server', method + ' ' + base + ' → ' + res.status, {
          query: query.slice(0, 160),
          body: String(body || '').slice(0, 400)
        });
      }, function () {
        J.add('server', method + ' ' + base + ' → ' + res.status, { query: query.slice(0, 160) });
      });
    } catch (e) { /* журнал не має валити запит */ }
  };

  /* ---------- збої програми ---------- */

  window.addEventListener('error', function (e) {
    var src = e.filename || '';
    if (src && src.indexOf(location.origin) !== 0) return;               // розширення браузера — не наше
    if (/ResizeObserver loop/.test(e.message || '')) return;
    J.add('error', e.message || 'помилка', {
      at: src.replace(location.origin, '') + ':' + (e.lineno || 0) + ':' + (e.colno || 0),
      stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 1200) : ''
    });
  });

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    var msg = r && r.message ? r.message : String(r || 'відмова без причини');
    if (/Failed to fetch|NetworkError|Load failed/.test(msg)) return;    // немає мережі — не новина
    J.add('error', 'обіцянка: ' + msg, { stack: r && r.stack ? String(r.stack).slice(0, 1200) : '' });
  });

  /* ---------- самоперевірка раз на добу ---------- */

  J.check = function (force) {
    if (!ready()) return Promise.resolve(null);
    // раз на добу — і ще раз щоразу, як пристрій отримав нову версію коду
    var today = new Date().toISOString().slice(0, 10) + '|' + (window.APP_BUILD || '');
    if (!force && localStorage.getItem(CHECKED) === today) return Promise.resolve(null);

    var bad = [];
    return TABLES.reduce(function (chain, t) {
      return chain.then(function () {
        return Cloud.request('/rest/v1/' + t + '?select=*&limit=1', { method: 'GET' })
          .then(function (res) {
            if (res.ok) return;
            return res.text().then(function (body) {
              bad.push(t + ' → ' + res.status + ' ' + String(body || '').slice(0, 160));
            });
          }, function (e) { bad.push(t + ' → ' + (e && e.message)); });
      });
    }, Promise.resolve()).then(function () {
      var local = [];
      if (window.S && S.readFailed) {
        var rf = S.readFailed();
        if (rf.doc) local.push('база в браузері не прочиталась');
        if (rf.boards) local.push('дошки в браузері не прочитались');
      }
      if (window.S && S.lastSaveFailed && S.lastSaveFailed()) local.push('запис у браузер не вдається');
      if (window.Disk && Disk.broken && Disk.broken()) local.push('IndexedDB не читається');
      var stats = window.BoardOps && BoardOps.stats ? BoardOps.stats() : null;
      if (stats && stats.failed) local.push('дошок, що не відправились: ' + stats.failed);

      J.add('check', bad.length || local.length ? 'є проблеми' : 'усе гаразд', {
        server: bad, local: local,
        boards: window.S && S.db ? (S.db().boards || []).length : null,
        pending: stats ? stats.pending : null
      });
      try { localStorage.setItem(CHECKED, today); } catch (e) {}

      // старе прибираємо, щоб журнал не ріс вічно
      var cut = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString();
      Cloud.request('/rest/v1/client_log?at=lt.' + encodeURIComponent(cut), { method: 'DELETE' })
        .catch(function () {});
      return { server: bad, local: local };
    });
  };

  /** Останні записи — для того, хто лагодить. */
  J.recent = function (n) {
    return Cloud.request('/rest/v1/client_log?select=at,kind,msg,detail,build,device,page&order=at.desc&limit=' + (n || 50),
      { method: 'GET' }).then(function (res) { return res.ok ? res.json() : res.text(); });
  };

  J.pending = function () { return buf.length; };

  /* ---------- старт ---------- */

  window.addEventListener('online', flushSoon);
  window.addEventListener('load', function () {
    setTimeout(function () { J.check().catch(function () {}); flush(); }, 5000);
  });
  // вхід відбувся — те, що чекало, їде
  setInterval(function () { if (buf.length) flush(); }, 60000);

  window.Journal = J;
})();
