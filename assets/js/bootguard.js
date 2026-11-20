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

  function check() {
    var main = document.querySelector('#main');
    if (main && main.children.length) return;          // кабінет намалювався
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
})();
