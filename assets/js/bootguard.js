/* Запобіжник старту кабінету. Іде першим, ще до решти коду.

   На телефоні кабінет перезавантажувався по колу й стояв білим. Кабінет
   сам себе перезавантажує, коли бачить новішу версію на сервері чи
   оновлений код (app.js, autoReload). Якщо причина не зникає, це коло:
   сторінка оновлюється знову й знову, і нею не скористатися.

   1. Самочинне перезавантаження — не частіше двох разів за 10 хвилин.
      Памʼять — у localStorage, бо саме перезавантаження стирає все інше.
   2. Якщо за 12 с кабінет так і не намалювався — замість білого екрана
      пояснення: текст помилки, файл і кнопка скинути кеш. Зі скріншотом
      цього екрана причину видно відразу. */
(function () {
  'use strict';
  var KEY = 'vektor.autoReloads';
  var WINDOW = 10 * 60000, MAX = 2;
  var errors = [];

  function recent() {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { list = []; }
    var now = Date.now();
    return list.filter(function (t) { return typeof t === 'number' && now - t < WINDOW; });
  }

  var G = {
    errors: errors,
    mayAutoReload: function () { return recent().length < MAX; },
    noteAutoReload: function () {
      var list = recent();
      list.push(Date.now());
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    }
  };
  window.BootGuard = G;

  /* «Чорна скринька». На телефоні вкладка падала («Aw, Snap!» — браузеру
     забракло памʼяті), і після того ніщо не розповідало, що відбувалося.
     Журнал важкого (великі файли, довгі завдання) пишемо в localStorage;
     запуск, що не закрився чисто, при наступному відкритті показує його. */
  var SESS = 'vektor.session';
  var prev = null;
  try { prev = JSON.parse(localStorage.getItem(SESS) || 'null'); } catch (e) { prev = null; }
  var crashed = prev && prev.clean === false && prev.log && prev.log.length ? prev.log.slice() : null;
  // останній пульс: коли сторінка ще жила й скільки памʼяті займала
  if (crashed && prev.beat) {
    var bd = new Date(prev.beat);
    crashed.push('останній пульс ' + ('0' + bd.getHours()).slice(-2) + ':' + ('0' + bd.getMinutes()).slice(-2) + ':' +
      ('0' + bd.getSeconds()).slice(-2) + (prev.mem ? ', памʼять ' + prev.mem : ''));
  }
  var sess = { clean: false, log: [] };
  function saveSess() { try { localStorage.setItem(SESS, JSON.stringify(sess)); } catch (e) {} }
  saveSess();

  G.lastCrash = function () { return crashed; };
  G.note = function (msg) {
    var d = new Date(Date.now());
    var t = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
    sess.log.push(t + ' ' + msg);
    if (sess.log.length > 30) sess.log.shift();
    saveSess();
  };
  /* Сліди: старт (з версією), сторінки, дотики, а раз на 2 с — пульс із
     памʼяттю. На телефоні вкладка падала без жодного великого файлу, і
     журнал лишався порожнім; тепер після падіння видно, що натиснули
     останнім і скільки памʼяті було зайнято. */
  function where() {
    var h = (window.location && window.location.hash) || '#/';
    return h.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '…').slice(0, 40);   // без довгих кодів
  }
  function ver() {
    var s = typeof document !== 'undefined' && document.currentScript && document.currentScript.src;
    return (String(s || '').match(/v=(\d+)/) || [])[1] || '?';
  }
  G.note('старт v' + ver() + ' ' + where());
  window.addEventListener('hashchange', function () { G.note('сторінка ' + where()); });
  window.addEventListener('click', function (e) {
    var t = e && e.target && e.target.closest && e.target.closest('[data-act], .m-tab, a, button');
    if (!t) return;
    var label = String(t.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    var act = t.getAttribute ? (t.getAttribute('data-act') || '') : '';
    G.note('дотик: ' + (label || act || 'кнопка') + (act && label ? ' (' + act + ')' : ''));
  }, true);
  function mem() {
    var m = typeof performance !== 'undefined' && performance.memory;
    return m ? Math.round(m.usedJSHeapSize / 1048576) + ' МБ' : '';
  }
  setInterval(function () {
    sess.beat = Date.now();
    sess.mem = mem();
    saveSess();
  }, 2000);

  // згорнули чи закрили — це не падіння; повернулись — знову «живий»
  window.addEventListener('pagehide', function () { sess.clean = true; saveSess(); });
  document.addEventListener('visibilitychange', function () {
    sess.clean = document.visibilityState === 'hidden';
    saveSess();
  });

  function mb(n) { return Math.round(n / 1048576) + ' МБ'; }
  var BIG = 5 * 1048576;
  if (window.fetch) {
    var plain = window.fetch;
    window.fetch = function (url, opts) {
      var body = opts && opts.body;
      var path = String((url && url.url) || url || '').replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '').slice(0, 80);
      if (body && body.size > BIG) G.note('відправка ' + mb(body.size) + ' ' + path);
      return plain.apply(this, arguments).then(function (res) {
        var len = Number(res && res.headers && res.headers.get && res.headers.get('content-length')) || 0;
        if (len > BIG) G.note('завантаження ' + mb(len) + ' ' + path);
        return res;
      });
    };
  }
  try {
    if (window.PerformanceObserver) {
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (e) {
          if (e.duration > 1000) G.note('сторінка зависла на ' + Math.round(e.duration) + ' мс');
        });
      }).observe({ entryTypes: ['longtask'] });
    }
  } catch (e) {}

  window.addEventListener('error', function (e) {
    if (!e) return;
    var file = String(e.filename || '').replace(/^.*\//, '').replace(/\?.*$/, '');
    errors.push((e.message || 'помилка') + (file ? ' — ' + file + (e.lineno ? ':' + e.lineno : '') : ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    errors.push('обіцянка: ' + (r && r.message ? r.message : String(r)));
  });

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  var crashShown = false;
  function showCrash() {
    if (crashShown || !document.body) return;
    crashShown = true;
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#fff;' +
      'color:#17163A;font:14px/1.45 system-ui,sans-serif;padding:16px;border-radius:16px;' +
      'box-shadow:0 10px 40px rgba(23,22,58,.25);max-height:60vh;overflow:auto';
    el.innerHTML =
      '<b>Минулого разу сторінка впала.</b> Зробіть скріншот і надішліть — ось що відбувалося перед тим:' +
      '<pre style="white-space:pre-wrap;font-size:12px;background:#F4F4FA;border-radius:10px;padding:10px;margin:8px 0">' +
        esc(crashed.join('\n')) + '</pre>' +
      '<button data-bg-close style="padding:10px 16px;border:0;border-radius:10px;background:#4B3FDB;' +
        'color:#fff;font:600 14px system-ui">Зрозуміло</button>';
    el.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('[data-bg-close]')) el.remove();
    });
    document.body.appendChild(el);
  }

  function check() {
    var main = document.querySelector('#main');
    if (main && main.children.length) {                // кабінет намалювався
      if (crashed) showCrash();
      return;
    }
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;color:#17163A;' +
      'font:15px/1.5 system-ui,sans-serif;padding:24px;overflow:auto';
    el.innerHTML =
      '<h2 style="margin:0 0 8px;font-size:20px">Кабінет не відкрився</h2>' +
      '<p style="margin:0 0 12px">Зробіть скріншот цього екрана й надішліть — за ним видно причину.</p>' +
      '<pre style="white-space:pre-wrap;background:#F4F4FA;border-radius:10px;padding:12px;font-size:12.5px">' +
        esc(errors.length ? errors.join('\n') : 'помилок не зафіксовано — код довго вантажиться або завис') +
        '\n\n' + esc((navigator && navigator.userAgent) || '') + '</pre>' +
      '<button data-bg-reset style="margin-top:12px;padding:12px 18px;border:0;border-radius:12px;' +
        'background:#4B3FDB;color:#fff;font:600 15px system-ui">Скинути кеш і перезапустити</button>' +
      '<p style="margin:12px 0 0;color:#6B6B8A;font-size:13px">Дані не зникнуть: скидається лише ' +
        'збережена копія сайту, а не ваша база.</p>';
    el.addEventListener('click', function (ev) {
      if (!ev.target || !ev.target.closest || !ev.target.closest('[data-bg-reset]')) return;
      var jobs = [];
      if (window.caches && caches.keys) {
        jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
      }
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.unregister(); }));
        }));
      }
      Promise.all(jobs).then(null, function () {}).then(function () { location.reload(); });
    });
    document.body.appendChild(el);
  }

  setTimeout(check, 12000);
  /* Падіння минулого разу — показати одразу: якщо причина повторюється на
     старті, за 12 с вкладка могла впасти знову, і панелі ніхто б не побачив. */
  if (crashed) setTimeout(showCrash, 1500);
})();
