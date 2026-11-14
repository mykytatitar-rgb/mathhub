/* Посилання учня має відкривати урок, а не кабінет репетитора.

   Запуск:  node tools/route-test.js

   Учень бачив кабінет із вікном входу замість дошки. Два шляхи, якими
   це стається, і обидва тут відтворені:
   1. sw.js — офлайн-копія сайту. Вона є в браузері, де хоч раз відкривали
      кабінет. На повільному інтернеті (понад 2,5 с) вона віддавала замість
      сторінки уроку збережений кабінет.
   2. Сервер віддає кабінет на будь-яку незнайому адресу (/Share, обрізане
      посилання з месенджера). Код уроку після # при цьому цілий — кабінет
      має сам відправити учня на сторінку уроку. */

'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
function src(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

var fails = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); } }
function settle() { return new Promise(function (r) { setImmediate(r); }); }

var SITE = 'https://site.example/';
var UID = '3f6a1c2e-9b7d-4e21-8c55-0a1b2c3d4e5f';
var TOKEN = '0123456789abcdef0123456789abcdef';

/* Service worker у пісочниці: мережа не відповідає (повільний інтернет),
   у кеші — лише кабінет, як у браузері, де його колись відкривали. */
function worker() {
  var handlers = {}, timers = [];
  var cache = { './': 'КАБІНЕТ' };
  var ctx = {
    URL: URL, Promise: Promise, console: console,
    setTimeout: function (fn) { timers.push(fn); return timers.length; },
    clearTimeout: function (id) { timers[id - 1] = null; },
    fetch: function () { return new Promise(function () {}); },
    caches: {
      match: function (r) {
        var key = typeof r === 'string' ? r : r.url;
        return Promise.resolve(cache[key] || null);
      },
      open: function () { return Promise.resolve({ put: function () {}, match: function () { return Promise.resolve(null); } }); },
      keys: function () { return Promise.resolve([]); }
    }
  };
  ctx.self = {
    location: { origin: 'https://site.example' },
    addEventListener: function (ev, fn) { handlers[ev] = fn; },
    clients: { claim: function () {}, matchAll: function () { return Promise.resolve([]); } },
    skipWaiting: function () {}
  };
  vm.createContext(ctx);
  vm.runInContext(src('sw.js'), ctx, { filename: 'sw.js' });
  return {
    open: function (url) {
      var got = { value: 'чекає' };
      handlers.fetch({
        request: { method: 'GET', url: url, mode: 'navigate' },
        respondWith: function (p) { p.then(function (r) { got.value = r; }); }
      });
      return got;
    },
    slowNetwork: function () { timers.forEach(function (fn) { if (fn) fn(); }); timers = []; }
  };
}

/* Кабінет, який сервер віддав на чужу адресу: чи відправить учня на урок. */
function cabinetAt(href) {
  var u = new URL(href), went = null;
  var ctx = {
    location: {
      href: href, hash: u.hash, pathname: u.pathname, origin: u.origin,
      replace: function (to) { went = to; }
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src('assets/js/sharejump.js'), ctx, { filename: 'sharejump.js' });
  return went;
}

console.log('\n• Повільний інтернет: офлайн-копія не підсовує учневі кабінет');
var w = worker();
var lesson = w.open(SITE + 'share#' + UID + '/' + TOKEN);
var home = w.open(SITE);
settle().then(function () {
  w.slowNetwork();
  return settle();
}).then(function () { return settle(); }).then(function () {
  ok(lesson.value !== 'КАБІНЕТ', 'сторінка уроку не підмінюється збереженим кабінетом (є: ' + lesson.value + ')');
  ok(home.value === 'КАБІНЕТ', 'сам кабінет без інтернету й далі відкривається з копії');

  console.log('\n• Сервер віддав кабінет на спотворену адресу — кабінет відправляє на урок');
  var to = cabinetAt(SITE + 'Share#' + UID + '/' + TOKEN);
  ok(to === SITE + 'share#' + UID + '/' + TOKEN, '/Share#… → сторінка уроку (є: ' + to + ')');
  to = cabinetAt(SITE + '#' + UID + '/' + TOKEN);
  ok(to === SITE + 'share#' + UID + '/' + TOKEN, 'посилання без «share» → сторінка уроку (є: ' + to + ')');
  ok(cabinetAt(SITE + '#/board/abc') === null, 'звичайний розділ кабінету (#/board/…) лишається кабінетом');
  ok(cabinetAt(SITE) === null, 'кабінет без адреси після # лишається кабінетом');

  console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
  process.exit(fails ? 1 : 0);
});
