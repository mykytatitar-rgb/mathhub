// Облік відвідувань дошки.  node tools/visits-test.js
'use strict';
var fs = require('fs'), vm = require('vm'), path = require('path');
var SRC = fs.readFileSync(path.join(__dirname, '../share/engine/visits.js'), 'utf8');

var fails = 0, passes = 0;
function ok(c, m) { if (c) { passes++; console.log('  ✓ ' + m); } else { fails++; console.log('  ✗ ' + m); } }

// годинник і таймери в руках тесту
function world() {
  var now = Date.parse('2026-11-25T16:00:00Z'), timers = [], seq = 0, listeners = {};
  var doc = {
    visibilityState: 'visible',
    addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    removeEventListener: function (ev, fn) { listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; }); }
  };
  var win = {
    document: doc, addEventListener: doc.addEventListener, removeEventListener: doc.removeEventListener,
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' },
    crypto: { randomUUID: function () { return 'v' + (++seq); } }
  };
  var ctx = {
    window: win, document: doc, navigator: win.navigator, crypto: win.crypto, console: console,
    Date: { now: function () { return now; }, parse: Date.parse },
    setInterval: function (fn, ms) { timers.push({ fn: fn, ms: ms, next: now + ms, on: true }); return timers.length; },
    clearInterval: function (id) { if (timers[id - 1]) timers[id - 1].on = false; },
    Math: Math, Promise: Promise
  };
  vm.runInNewContext(SRC, ctx);
  return {
    V: win.Visits,
    pass: function (ms) {
      var end = now + ms;
      for (;;) {
        var t = timers.filter(function (x) { return x.on && x.next <= end; }).sort(function (a, b) { return a.next - b.next; })[0];
        if (!t) break;
        now = t.next; t.next += t.ms; t.fn();
      }
      now = end;
    },
    hide: function (h) {
      doc.visibilityState = h ? 'hidden' : 'visible';
      (listeners.visibilitychange || []).forEach(function (f) { f(); });
    }
  };
}

console.log('• Візит: позначка при вході й раз на хвилину');
var w = world(), sent = [];
var stop = w.V.track(function (id, device) { sent.push(id + ':' + device); return Promise.resolve(); });
ok(sent.length === 1 && sent[0] === 'v1:телефон', 'при вході — одразу, з пристроєм (є: ' + sent.join() + ')');
w.pass(3 * 60000);
ok(sent.length === 4 && sent.every(function (s) { return s.indexOf('v1:') === 0; }), '3 хв — ще три позначки того самого візиту');

console.log('• Сховали ненадовго — той самий візит; надовго — новий');
w.hide(true);
var before = sent.length;
w.pass(5 * 60000);
ok(sent.length === before, 'поки сторінка схована — позначок немає (час не набігає)');
w.hide(false);
ok(sent[sent.length - 1].indexOf('v2:') === 0, 'повернулись за 5+ хв — новий візит');
w.hide(true); w.pass(60000); w.hide(false);
ok(sent[sent.length - 1].indexOf('v2:') === 0, 'повернулись за хвилину — той самий візит');

console.log('• Вийшли з дошки — більше нічого не шле');
stop();
before = sent.length;
w.pass(10 * 60000); w.hide(true); w.hide(false);
ok(sent.length === before, 'після stop — тиша');

console.log('• Пристрій і тривалість');
ok(w.V.deviceOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') === 'компʼютер', 'Windows — компʼютер');
ok(w.V.deviceOf('Mozilla/5.0 (iPad; CPU OS 17_0)') === 'планшет', 'iPad — планшет');
ok(w.V.minutes('2026-11-25T16:00:00Z', '2026-11-25T16:49:30Z') === 50, 'тривалість у хвилинах, з округленням');
ok(w.V.minutes('2026-11-25T16:00:00Z', '2026-11-25T16:00:00Z') === 1, 'зайшов і вийшов — щонайменше хвилина');

console.log('• Підсумок для картки учня');
var rows = [
  { lesson_id: 'L2', who: 'student', device: 'телефон', started_at: '2026-11-24T16:02:00Z', last_at: '2026-11-24T16:51:00Z' },
  { lesson_id: 'L2', who: 'tutor', device: 'компʼютер', started_at: '2026-11-24T15:58:00Z', last_at: '2026-11-24T16:52:00Z' },
  { lesson_id: 'L1', who: 'student', device: 'телефон', started_at: '2026-10-01T10:00:00Z', last_at: '2026-10-01T10:10:00Z' },
  { lesson_id: 'X', who: 'student', device: 'телефон', started_at: '2026-11-24T10:00:00Z', last_at: '2026-11-24T11:00:00Z' }
];
var s = w.V.summary(rows, ['L1', 'L2'], Date.parse('2026-11-25T12:00:00Z'));
ok(s.lessons.length === 2 && s.lessons[0].id === 'L2', 'лише уроки цього учня, свіжіші вище');
ok(s.lessons[0].visits[0].who === 'tutor' && s.lessons[0].visits[1].who === 'student', 'у межах уроку — за часом входу');
ok(s.lessons[0].visits[1].min === 49, 'тривалість візиту учня (є: ' + s.lessons[0].visits[1].min + ')');
ok(s.month.student === 49 && s.month.studentVisits === 1, 'за 30 днів учень — 49 хв, 1 візит (давній і чужий не рахуються)');
ok(s.month.tutor === 54, 'за 30 днів ви — 54 хв');

console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
process.exit(fails ? 1 : 0);
