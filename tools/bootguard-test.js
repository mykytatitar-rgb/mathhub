/* Запобіжник старту кабінету.

   Запуск:  node tools/bootguard-test.js

   На телефоні кабінет перезавантажувався по колу й стояв білим. Звідси дві
   вимоги, перевірені тут на справжньому assets/js/bootguard.js:
   1. Самочинне перезавантаження (нова версія, оновлений код) — не частіше
      двох разів за 10 хвилин. Третє поспіль — уже коло, його не робимо.
   2. Якщо кабінет так і не намалювався, замість білого екрана — пояснення
      з текстом помилки й кнопкою скинути кеш. */

'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var fails = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); } }

function page(ls, opts) {
  opts = opts || {};
  var listeners = {}, timers = [], now = opts.now || 1000000;
  var main = { children: { length: opts.drawn ? 1 : 0 } };
  var shown = null;
  var body = { appendChild: function (el) { shown = el; } };
  var ctx = {
    Date: (function () { function D(t) { return new Date(t == null ? now : t); } D.now = function () { return now; }; return D; })(),
    JSON: JSON, Math: Math, String: String, Array: Array,
    console: { warn: function () {}, error: function () {} },
    navigator: { userAgent: 'test-phone' },
    localStorage: {
      getItem: function (k) { return k in ls ? ls[k] : null; },
      setItem: function (k, v) { ls[k] = String(v); }
    },
    setTimeout: function (fn) { timers.push(fn); },
    addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    document: {
      readyState: 'complete',
      body: body,
      querySelector: function (s) { return s === '#main' ? main : null; },
      createElement: function () {
        var el = { style: {}, innerHTML: '', addEventListener: function () {}, querySelector: function () { return null; } };
        return el;
      },
      addEventListener: function () {}
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/bootguard.js'), 'utf8'), ctx, { filename: 'bootguard.js' });
  return {
    G: ctx.BootGuard,
    fire: function (ev, e) { (listeners[ev] || []).forEach(function (fn) { fn(e); }); },
    wait: function () { var t = timers; timers = []; t.forEach(function (fn) { fn(); }); },
    tick: function (ms) { now += ms; },
    shown: function () { return shown; }
  };
}

console.log('\n• Самочинне перезавантаження: не по колу');
var ls = {};
var p = page(ls);
ok(p.G.mayAutoReload(), 'перше — можна');
p.G.noteAutoReload();
p.tick(30000);
ok(p.G.mayAutoReload(), 'друге за пів хвилини — ще можна (оновили двічі поспіль)');
p.G.noteAutoReload();
p.tick(30000);
ok(!p.G.mayAutoReload(), 'третє за хвилину — ні: це вже коло');
var p2 = page(ls, { now: 1000000 + 60000 });
ok(!p2.G.mayAutoReload(), 'і після самого перезавантаження памʼять про коло лишається');
var p3 = page(ls, { now: 1000000 + 11 * 60000 });
ok(p3.G.mayAutoReload(), 'за 10 хвилин — знову можна');

console.log('\n• Кабінет не намалювався — не білий екран, а пояснення');
var b = page({});
b.fire('error', { message: 'Unexpected token', filename: 'https://x/assets/js/app.js?v=1', lineno: 7 });
b.wait();
var el = b.shown();
ok(!!el, 'пояснення показано');
ok(el && /Unexpected token/.test(el.innerHTML) && /app\.js/.test(el.innerHTML), 'у ньому — текст помилки й файл');
ok(el && /data-bg-reset/.test(el.innerHTML), 'є кнопка скинути кеш і перезапустити');

var fine = page({}, { drawn: true });
fine.wait();
ok(!fine.shown(), 'кабінет намалювався — нічого зайвого не показуємо');

console.log('\n• «Чорна скринька»: сторінка впала («Aw, Snap!») — наступний запуск знає, що було перед тим');
var box = {};
var s1 = page(box);
s1.G.note('завантаження файлу 93 МБ');
s1.G.note('довге завдання 4200 мс');
// вкладка впала: pagehide не настав
var s2 = page(box, { drawn: true });
var crash = s2.G.lastCrash();
ok(crash && crash.length === 2, 'минулий запуск не закрився чисто — журнал його є');
ok(crash && /93 МБ/.test(crash.join('\n')), 'у журналі — що відбувалося перед падінням');
s2.wait();
ok(s2.shown() && /Минулого разу/.test(s2.shown().innerHTML), 'показано пояснення з журналом');
s2.fire('pagehide');
var s3 = page(box, { drawn: true });
ok(!s3.G.lastCrash(), 'після чистого закриття — жодних пояснень');
s3.wait();
ok(!s3.shown(), 'і нічого не показано');

console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
process.exit(fails ? 1 : 0);
