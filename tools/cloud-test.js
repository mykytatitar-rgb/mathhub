/* Перевірка мережевого шару кабінету без браузера.

   Запуск:  node tools/cloud-test.js

   Справжній assets/js/cloud.js, мережа — заглушка. Сценарій — той, на якому
   обмін мовчки вмирав до перезапуску: запит, що не відповідає ніколи
   (телефон згорнули чи ноутбук заснув посеред запиту). */

'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
function src(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

var fails = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); } }

/* Годинник у руках сценарію: таймери спрацьовують, коли час «минув». */
function cabinet(server) {
  var ls = { 'mathhub.auth': JSON.stringify({ access_token: 'a.b.c', refresh_token: 'r', email: 'x@y' }) };
  var timers = [], now = 0, calls = [];
  var ctx = {
    console: { log: function () {}, warn: function () {}, info: function () {}, error: console.error },
    Promise: Promise, JSON: JSON, Math: Math, Date: Date, Object: Object, Array: Array, String: String,
    Number: Number, RegExp: RegExp, Error: Error, TypeError: TypeError, isNaN: isNaN,
    parseInt: parseInt, parseFloat: parseFloat, encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent, escape: escape, atob: function (s) { return Buffer.from(s, 'base64').toString('binary'); },
    AbortController: AbortController, Blob: function () {},
    setTimeout: function (fn, ms) { timers.push({ at: now + (ms || 0), fn: fn }); return timers.length; },
    clearTimeout: function (id) { if (timers[id - 1]) timers[id - 1].fn = null; },
    setInterval: function () { return 0; }, clearInterval: function () {},
    localStorage: {
      getItem: function (k) { return k in ls ? ls[k] : null; },
      setItem: function (k, v) { ls[k] = String(v); },
      removeItem: function (k) { delete ls[k]; }
    },
    navigator: { onLine: true, userAgent: 'node' },
    document: { addEventListener: function () {}, visibilityState: 'visible' },
    addEventListener: function () {},
    CLOUD_CONFIG: { url: 'https://db.example', anonKey: 'k' },
    U: {}, S: {},
    // сервер, що не відповідає: обіцянка чекає вічно, хіба що запит скасують
    fetch: function (url, opts) {
      calls.push(url);
      if (server) return Promise.resolve(server(url, opts));
      return new Promise(function (resolve, reject) {
        var sig = opts && opts.signal;
        if (sig) sig.addEventListener('abort', function () { reject(new Error('aborted')); });
      });
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src('assets/js/cloud.js'), ctx, { filename: 'cloud.js' });
  return {
    Cloud: ctx.Cloud, calls: calls, ls: ls, ctx: ctx,
    pass: function (ms) {
      now += ms;
      timers.forEach(function (t) { if (t.fn && t.at <= now) { var f = t.fn; t.fn = null; f(); } });
    }
  };
}

function settle() { return new Promise(function (r) { setImmediate(r); }); }

console.log('\n• Запит, на який сервер не відповідає, закінчується відмовою, а не висить вічно');
var c = cabinet();
var state = 'чекає';
c.Cloud.request('/rest/v1/records?select=id', { method: 'GET' })
  .then(function () { state = 'відповів'; }, function () { state = 'відмова'; });

settle().then(function () {
  ok(c.calls.length === 1, 'запит пішов');
  c.pass(10000);
  return settle();
}).then(function () {
  ok(state === 'чекає', 'десять секунд — ще чекаємо (повільний звʼязок — не збій)');
  c.pass(120000);
  return settle();
}).then(function () {
  ok(state === 'відмова', 'дві хвилини без відповіді — відмова: обмін може спробувати знову (є: ' + state + ')');
  console.log('\n• Поновлення входу: тимчасова відмова сервера — це не «вийти з кабінету»');
  return refreshCase(503, true, 'сервер входу тимчасово відмовив (503) — вхід лишається, обмін спробує пізніше');
}).then(function () {
  return refreshCase(429, true, 'забагато запитів (429) — вхід лишається');
}).then(function () {
  return refreshCase(400, false, 'ключ поновлення справді недійсний (400) — вхід знято, кабінет попросить увійти');
}).then(function () {
  /* Розпізнавання TeX і сцени: Claude думає хвилину-дві. Загальна межа
     45 с обривала їх, і кабінет писав «розпізнавання не відповідає». */
  console.log('\n• Функції Claude (TeX, сцени): чекаємо довше, ніж звичайний запит');
  var f = cabinet();
  var st = 'чекає';
  f.Cloud.request('/functions/v1/board-latex', { method: 'POST', body: '{}' })
    .then(function () { st = 'відповів'; }, function () { st = 'відмова'; });
  return settle().then(function () {
    f.pass(90000);
    return settle();
  }).then(function () {
    ok(st === 'чекає', 'півтори хвилини — ще чекаємо відповіді Claude (є: ' + st + ')');
    f.pass(200000);
    return settle();
  }).then(function () {
    ok(st === 'відмова', 'але не вічно: за кілька хвилин — відмова (є: ' + st + ')');
  });
}).then(function () {
  /* Перевидання уроку з телефона тягнуло кожну книжку матеріалів (90 МБ)
     у памʼять лише для того, щоб дізнатися, що вона вже на сервері. */
  console.log('\n• Файл уроку вже на сервері — дізнаємося без завантаження самого файлу');
  var methods = [];
  var h = cabinet(function (url, opts) {
    methods.push((opts && opts.method) || 'GET');
    return { ok: /book/.test(url), status: /book/.test(url) ? 200 : 404,
             json: function () { return Promise.resolve({}); }, text: function () { return Promise.resolve(''); } };
  });
  return h.Cloud.shareHas('tok', 'book', 'mat').then(function (has) {
    ok(has === true, 'файл на сервері — так');
    ok(methods.length === 1 && methods[0] === 'HEAD', 'спитали лише заголовок, без самого файлу (є: ' + methods.join(',') + ')');
    return h.Cloud.shareHas('tok', 'book', 'mat');
  }).then(function (again) {
    ok(again === true && methods.length === 1, 'вдруге — з памʼяті, без запиту');
    return h.Cloud.shareHas('tok', 'nope', 'mat');
  }).then(function (none) {
    ok(none === false, 'файлу немає — ні');
    return ensureCases();
  });
}).then(function () {
  /* Стан обміну питають на кожну зміну — і щоразу розбирали всі три
     страхові копії бази (на телефоні мегабайти на старті, кілька разів). */
  console.log('\n• Стан обміну не розбирає страхові копії щоразу');
  var k = cabinet();
  k.ls['mathhub.before-sync'] = JSON.stringify([{ at: '2026-11-01', reason: 'r', data: JSON.stringify({ students: [{ id: 1 }] }) }]);
  var big = 0;
  k.ctx.JSON = { stringify: JSON.stringify, parse: function (s) { if (String(s).length > 40) big++; return JSON.parse(s); } };
  var first = k.Cloud.status().backups;
  k.Cloud.status(); k.Cloud.status();
  ok(first === 1, 'копію видно (є: ' + first + ')');
  ok(big <= 2, 'три запити стану — копії розібрано один раз (розборів: ' + big + ')');
  k.ls['mathhub.before-sync'] = '[]';
  ok(k.Cloud.status().backups === 0, 'копії змінились — стан свіжий');
}).then(function () {
  console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
  process.exit(fails ? 1 : 0);
});

/* Портал учня оновлювався після КОЖНОГО збереження бази й діставав кожен
   файл матеріалів цілим — на телефоні завантажуючи з сервера книжки по
   90 МБ, усі разом і по колу. Вкладка падала («Aw, Snap!»). */
function ensureCases() {
  console.log('\n• Файл для учня: на сервері — не читаємо; лише тут — відправляємо; ніде — не тягнемо');
  var reads = [], posts = 0;
  var k = cabinet(function (url, opts) {
    var m = (opts && opts.method) || 'GET';
    if (m === 'POST') posts++;
    var there = /onserver/.test(url);
    return { ok: m === 'POST' || there, status: m === 'POST' || there ? 200 : 404,
             json: function () { return Promise.resolve({}); }, text: function () { return Promise.resolve(''); } };
  });
  function local(key) { reads.push(key); return Promise.resolve(/here/.test(key) ? { size: 9, type: 'application/pdf' } : null); }
  return k.Cloud.ensureShareFile('tok', 'onserver', 'mat', local).then(function (url) {
    ok(!!url && reads.length === 0, 'вже на сервері — адреса є, файл не читали');
    return k.Cloud.ensureShareFile('tok', 'here', 'mat', local);
  }).then(function (url) {
    ok(!!url && posts === 1, 'є лише на цьому пристрої — відправили (є відправок: ' + posts + ')');
    return k.Cloud.ensureShareFile('tok', 'absent', 'mat', local);
  }).then(function (url) {
    ok(url === null && posts === 1, 'ні тут, ні на сервері — нічого не тягнемо й не шлемо');
  });
}

/* Ключ доступу сплив (401), кабінет іде по новий — а сервер входу відповідає status. */
function refreshCase(status, staysIn, msg) {
  function res(st) {
    return { ok: st >= 200 && st < 300, status: st,
             json: function () { return Promise.resolve({}); }, text: function () { return Promise.resolve(''); } };
  }
  var k = cabinet(function (url) { return /\/auth\/v1\/token/.test(url) ? res(status) : res(401); });
  return k.Cloud.request('/rest/v1/records?select=id', { method: 'GET' })
    .then(function () {}, function () {}).then(settle).then(function () {
      ok(k.Cloud.signedIn() === staysIn, msg + ' (увійшли: ' + k.Cloud.signedIn() + ')');
    });
}
