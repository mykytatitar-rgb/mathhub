// Відправка файлів дошок у сховище.  node tools/cloudimages-test.js
'use strict';
var fs = require('fs'), vm = require('vm'), path = require('path');
var SRC = fs.readFileSync(path.join(__dirname, '../assets/js/cloudimages.js'), 'utf8');

var fails = 0, passes = 0;
function ok(c, m) { if (c) { passes++; console.log('  ✓ ' + m); } else { fails++; console.log('  ✗ ' + m); } }

var MB = 1048576;

// годинник, таймери й сервер у руках тесту
function world(files, answer) {
  var now = Date.parse('2026-11-25T16:00:00Z'), timers = [], ls = {};
  var sent = [];
  var win = {
    ImgStore: {
      available: function () { return true; },
      get: function (k) { return Promise.resolve(files[k] || null); },
      put: function () { return Promise.resolve(); }
    },
    Cloud: {
      available: function () { return true; }, signedIn: function () { return true; },
      userId: function () { return 'u1'; },
      request: function (p, o) {
        if ((o && o.method) === 'POST' && p.indexOf('/object/list/') < 0) sent.push(p.split('/').pop());
        var a = answer(p.split('/').pop());
        return Promise.resolve({ ok: a.status === 200, status: a.status,
          text: function () { return Promise.resolve(a.body || ''); } });
      }
    },
    S: { db: function () { return {}; }, usedImageKeys: function () { return Object.keys(files); } },
    addEventListener: function () {}
  };
  function timer(fn, ms, rep) { timers.push({ fn: fn, ms: ms, next: now + ms, rep: rep, on: true }); return timers.length; }
  var ctx = {
    window: win, Cloud: win.Cloud, S: win.S, console: { warn: function () {}, info: function () {} },
    localStorage: { getItem: function (k) { return ls[k] || null; }, setItem: function (k, v) { ls[k] = v; } },
    navigator: { onLine: true },
    document: { readyState: 'complete', addEventListener: function () {} },
    Date: { now: function () { return now; } },
    setTimeout: function (fn, ms) { return timer(fn, ms, false); },
    setInterval: function (fn, ms) { return timer(fn, ms, true); },
    JSON: JSON, Object: Object, Math: Math, Promise: Promise, Error: Error
  };
  vm.runInNewContext(SRC, ctx);
  function flush() { return new Promise(function (r) { setImmediate(r); }).then(function () { return new Promise(function (r) { setImmediate(r); }); }); }
  return {
    CI: win.CloudImages, sent: sent, flush: flush,
    // прокрутити годинник, виконуючи таймери й даючи промісам доїхати
    pass: function (ms) {
      var end = now + ms;
      function step() {
        var t = timers.filter(function (x) { return x.on && x.next <= end; }).sort(function (a, b) { return a.next - b.next; })[0];
        if (!t) { now = end; return Promise.resolve(); }
        now = t.next;
        if (t.rep) t.next += t.ms; else t.on = false;
        t.fn();
        return flush().then(step);
      }
      return step();
    }
  };
}

function blob(size) { return { size: size, type: 'application/pdf' }; }

Promise.resolve().then(function () {
  console.log('• Книжка більша за стелю сервера — не відправляється взагалі');
  var w = world({ file_book: blob(94 * MB), file_pic: blob(200000) }, function () { return { status: 200 }; });
  return w.flush().then(function () { return w.pass(10 * 60000); }).then(function () {
    ok(w.sent.indexOf('file_book') < 0, 'файл на 94 МБ жодного разу не читався й не слався');
    ok(w.sent.indexOf('file_pic') >= 0, 'звичайна картинка поїхала');
    ok(w.CI.tooBig().indexOf('file_book') >= 0, 'книжка в списку «сервер не бере» — видно в «Чи все ціле»');
  });
}).then(function () {
  console.log('• Сервер відмовляє (402 — квота): повтори рідшають, а не йдуть кожні 20 с');
  var w = world({ file_a: blob(3 * MB) }, function () { return { status: 402 }; });
  return w.flush().then(function () { return w.pass(30 * 60000); }).then(function () {
    ok(w.sent.length >= 2, 'спроби тривають (' + w.sent.length + ')');
    ok(w.sent.length <= 6, 'за 30 хв не більше 6 спроб, а не 90 (було ' + w.sent.length + ')');
  });
}).then(function () {
  console.log('• Сервер каже «завеликий» кодом 400 з 413 усередині — більше не пробуємо');
  var w = world({ file_b: blob(30 * MB) }, function () {
    return { status: 400, body: '{"statusCode":"413","error":"Payload too large","message":"The object exceeded the maximum allowed size"}' };
  });
  return w.flush().then(function () { return w.pass(30 * 60000); }).then(function () {
    ok(w.sent.length === 1, 'одна спроба, не по колу (' + w.sent.length + ')');
    ok(w.CI.tooBig().indexOf('file_b') >= 0, 'файл у списку «сервер не бере»');
  });
}).then(function () {
  console.log('• Після вдалої відправки пауза скидається');
  var n = 0;
  var w = world({ file_c: blob(1000), file_d: blob(1000) }, function () { n++; return { status: n <= 3 ? 402 : 200 }; });
  return w.flush().then(function () { return w.pass(60 * 60000); }).then(function () {
    ok(w.CI.pending() === 0, 'усе зрештою відправлено');
  });
}).then(function () {
  console.log('\n' + passes + ' пройшло, ' + fails + ' впало');
  process.exit(fails ? 1 : 0);
});
