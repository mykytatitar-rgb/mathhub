/* Перевірка запису в Google Календар (gcal.js) без справжнього Google.

     node tools/gcal-test.js

   Справжні utils.js, store.js і gcal.js — у vm на демо-даних. Скрипт для
   Google, який кабінет видає репетиторові (GCal.scriptCode), виконується
   тут же проти імітації Apps Script (CalendarApp, PropertiesService…),
   а fetch кабінету веде просто в його doPost. Так перевіряється весь шлях:
   підключення, перший запис, перенесення картки, скасування, повтор без
   змін, чужий секрет. */

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var crypto = require('crypto');

var ROOT = path.join(__dirname, '..');
function src(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

/* ---------- Імітація Apps Script ---------- */

function appsScript() {
  var cals = {}, seq = 0, props = {};
  function Cal(name) {
    var id = 'cal' + (++seq) + '@group.calendar.google.com';
    var events = {};
    var c = {
      events: events,
      getId: function () { return id; },
      getName: function () { return name; },
      createEvent: function (title, s, e, o) {
        var eid = 'ev' + (++seq) + '@google.com';
        var ev = {
          title: title, start: s, end: e, desc: (o && o.description) || '', loc: (o && o.location) || '',
          getId: function () { return eid; },
          setTime: function (a, b) { ev.start = a; ev.end = b; },
          setTitle: function (t) { ev.title = t; },
          setDescription: function (d) { ev.desc = d; },
          setLocation: function (l) { ev.loc = l; },
          deleteEvent: function () { delete events[eid]; }
        };
        events[eid] = ev;
        return ev;
      },
      getEventById: function (eid) { return events[eid] || null; }
    };
    cals[id] = c;
    return c;
  }
  var g = {
    CalendarApp: {
      getCalendarById: function (id) { return cals[id] || null; },
      createCalendar: function (name) { return Cal(name); }
    },
    PropertiesService: {
      getScriptProperties: function () {
        return {
          getProperty: function (k) { return k in props ? props[k] : null; },
          setProperty: function (k, v) { props[k] = String(v); },
          deleteProperty: function (k) { delete props[k]; },
          getProperties: function () { return Object.assign({}, props); }
        };
      }
    },
    LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: function (s) { return { content: s, setMimeType: function () { return this; } }; }
    },
    Utilities: {
      DigestAlgorithm: { MD5: 'md5' }, Charset: { UTF_8: 'utf8' },
      computeDigest: function (alg, s) { return Array.from(crypto.createHash('md5').update(s, 'utf8').digest()); },
      base64Encode: function (bytes) { return Buffer.from(bytes.map(function (b) { return b & 255; })).toString('base64'); }
    },
    JSON: JSON, Date: Date, Object: Object, Number: Number, String: String
  };
  g.cals = cals;
  g.props = props;
  return g;
}

/* ---------- Кабінет ---------- */

function cabinet() {
  var ls = {};
  var el = function () { return { appendChild: function () {}, remove: function () {}, style: {}, setAttribute: function () {} }; };
  var ctx = {
    console: { log: console.log, warn: function () {}, info: function () {}, error: console.error },
    setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: function () { return 0; }, clearInterval: function () {},
    Promise: Promise, JSON: JSON, Math: Math, Date: Date, Object: Object, Array: Array, Uint8Array: Uint8Array,
    String: String, Number: Number, RegExp: RegExp, Error: Error, Intl: Intl,
    isNaN: isNaN, parseFloat: parseFloat, parseInt: parseInt,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    crypto: crypto.webcrypto,
    localStorage: {
      getItem: function (k) { return k in ls ? ls[k] : null; },
      setItem: function (k, v) { ls[k] = String(v); },
      removeItem: function (k) { delete ls[k]; },
      key: function (i) { return Object.keys(ls)[i] || null; },
      get length() { return Object.keys(ls).length; }
    },
    navigator: { onLine: true },
    document: { addEventListener: function () {}, querySelector: function () { return null; }, getElementById: el, createElement: el },
    addEventListener: function () {},
    icon: function () { return ''; }
  };
  ctx.window = ctx;
  ctx.RecSync = { KINDS: ['students', 'lessons', 'payments', 'homeworks', 'progress', 'roadmap', 'desk', 'materials', 'notes', 'mathmap', 'stumap', 'meta'],
                  mark: function () {}, markDeleted: function () {} };
  ctx.Rates = { get: function () { return 40; }, forDate: function () { return 40; }, isHistoric: function () { return true; }, isFresh: function () { return true; } };
  vm.createContext(ctx);
  vm.runInContext(src('assets/js/utils.js'), ctx, { filename: 'utils.js' });
  vm.runInContext(src('assets/js/store.js'), ctx, { filename: 'store.js' });
  vm.runInContext(src('assets/js/gcal.js'), ctx, { filename: 'gcal.js' });
  ctx.S.load();
  return ctx;
}

/* Скрипт, який кабінет видає репетиторові, — у його власному «Google». */
function deploy(code, g) {
  var sb = Object.assign({}, g);
  vm.createContext(sb);
  vm.runInContext(code, sb, { filename: 'apps-script.gs' });
  return sb;
}

function wire(ctx, script) {
  var calls = 0;
  ctx.fetch = function (url, opts) {
    calls++;
    var out = script.doPost({ postData: { contents: opts.body } });
    return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.resolve(out.content); } });
  };
  return function () { return calls; };
}

var fails = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); } }
function same(a, b, msg) { ok(a === b, msg + (a === b ? '' : '   (є ' + JSON.stringify(a) + ', має бути ' + JSON.stringify(b) + ')')); }
var queue = [];
function scenario(name, fn) { queue.push({ name: name, fn: fn }); }

function pad(n) { return ('0' + n).slice(-2); }
function isoIn(days, hhmm) {
  var d = new Date(); d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + hhmm;
}
function weekday(iso) { var d = new Date(iso); return d.getDay() === 0 ? 7 : d.getDay(); }
function events(g) {
  var all = [];
  Object.keys(g.cals).forEach(function (id) {
    var c = g.cals[id];
    Object.keys(c.events).forEach(function (k) { all.push(c.events[k]); });
  });
  return all;
}
var URL = 'https://script.google.com/macros/s/TEST123/exec';

/* ============================================================ */

scenario('Що їде в календар: уроки у вікні, постійний розклад далі за заповнене, без скасованих', function () {
  var c = cabinet(), S = c.S;
  var iso = isoIn(50, '16:20');                        // далі за межу заповнення (28 днів)
  var st = S.add('students', { name: 'Слот', grade: '9 клас', price: 500, currency: 'UAH',
    schedule: [{ day: weekday(iso), time: '16:20' }] });
  var cancelled = S.add('lessons', { studentId: st.id, date: isoIn(3, '12:00'), status: 'cancelled' });
  var b = c.GCal.build();
  var ids = b.events.map(function (e) { return e.id; });
  ok(ids.indexOf(cancelled.id) < 0, 'скасованого немає');
  var tpl = b.events.filter(function (e) { return e.id.indexOf('tpl_' + st.id + '_') === 0; });
  ok(tpl.length >= 10, 'постійний розклад — на 12 тижнів уперед (' + tpl.length + ')');
  ok(tpl.every(function (e) { return e.title === 'Слот'; }), 'назва — імʼя учня');
  // коли урок слота справді створиться — номер той самий: у календарі не задвоїться
  S.fillStudentTemplate(st.id, 60);
  var made = S.db().lessons.filter(function (l) { return l.studentId === st.id && l.fromTemplate; })
    .map(function (l) { return l.id; });
  ok(made.length > 0 && made.every(function (id) { return ids.indexOf(id) >= 0; }), 'створені уроки — ті самі події');
  same(c.GCal.build().events.length, b.events.length, 'після заповнення подій стільки ж');
});

scenario('Скрипт для Google: чужий секрет не пускає, свій — створює календар', function () {
  var c = cabinet();
  var g = appsScript();
  var script = deploy(c.GCal.scriptCode(), g);
  var bad = JSON.parse(script.doPost({ postData: { contents: JSON.stringify({ secret: 'nope', action: 'ping' }) } }).content);
  same(bad.ok, false, 'чужий секрет — відмова');
  same(bad.error, 'secret', 'з поясненням');
  var good = JSON.parse(script.doPost({ postData: { contents: JSON.stringify({ secret: c.GCal.secret(), action: 'ping' }) } }).content);
  same(good.ok, true, 'свій секрет — ок');
  same(good.calendar, 'Уроки · Вектор', 'окремий календар «Уроки · Вектор»');
  var get = JSON.parse(script.doGet().content);
  same(get.ok, true, 'відкриття адреси в браузері — відповідь, а не помилка');
});

scenario('Підключення, перший запис, перенесення картки, скасування, повтор без змін', function () {
  var c = cabinet(), S = c.S;
  var g = appsScript();
  var script = deploy(c.GCal.scriptCode(), g);
  var calls = wire(c, script);
  var st = S.add('students', { name: 'Роман', grade: '9 клас', price: 500, currency: 'UAH', schedule: [] });
  var l = S.add('lessons', { studentId: st.id, date: isoIn(2, '18:00'), status: 'planned', duration: 60 });
  var rounds = 0;
  // за раз скрипт робить не більше 60 змін — решту кабінет дошле наступними запитами
  function drain(r) {
    if (r && r.more && rounds++ < 10) return c.GCal.push(true).then(drain);
    return r;
  }
  return c.GCal.connect(URL).then(drain).then(function () {
    ok(rounds >= 2, 'перший запис — кількома порціями (' + (rounds + 1) + ')');
    var n = c.GCal.build().events.length;
    same(events(g).length, n, 'усі уроки вікна — у календарі (' + n + ')');
    ok(c.GCal.enabled(), 'увімкнено');
    var ev = events(g).filter(function (e) { return e.title === 'Роман'; })[0];
    ok(ev && ev.start.getTime() === new Date(isoIn(2, '18:00')).getTime(), 'урок Романа на своєму місці');

    // перетягнули картку на інший день і час
    S.update('lessons', l.id, { date: isoIn(3, '19:00') });
    return c.GCal.push();
  }).then(function () {
    var ev = events(g).filter(function (e) { return e.title === 'Роман'; });
    same(ev.length, 1, 'перенесений урок — одна подія, а не дві');
    ok(ev[0] && ev[0].start.getTime() === new Date(isoIn(3, '19:00')).getTime(), 'і вже на новому місці');
    var before = calls();
    return c.GCal.push().then(function () {
      same(calls(), before, 'нічого не змінилось — у Google нічого не шлемо');
    });
  }).then(function () {
    S.update('lessons', l.id, { status: 'cancelled' });
    return c.GCal.push();
  }).then(function () {
    same(events(g).filter(function (e) { return e.title === 'Роман'; }).length, 0, 'скасований урок зник із календаря');
  });
});

scenario('Скрипт не чіпає незмінене й не прибирає історію поза вікном', function () {
  var c = cabinet();
  var g = appsScript();
  var script = deploy(c.GCal.scriptCode(), g);
  var secret = c.GCal.secret();
  function post(body) { return JSON.parse(script.doPost({ postData: { contents: JSON.stringify(body) } }).content); }
  var now = Date.now(), day = 86400000;
  var from = new Date(now - 7 * day).toISOString(), to = new Date(now + 84 * day).toISOString();
  function evAt(id, offsetDays, title) {
    var s = new Date(now + offsetDays * day);
    return { id: id, start: s.toISOString(), end: new Date(s.getTime() + 3600000).toISOString(), title: title, desc: '', location: '' };
  }
  var r1 = post({ secret: secret, action: 'sync', from: from, to: to, events: [evAt('a', 1, 'A'), evAt('b', 2, 'B')] });
  same(r1.created, 2, 'створено дві');
  var r2 = post({ secret: secret, action: 'sync', from: from, to: to, events: [evAt('a', 1, 'A'), evAt('b', 2, 'B')] });
  same(r2.created + r2.updated + r2.deleted, 0, 'повтор — жодної зміни');
  var r3 = post({ secret: secret, action: 'sync', from: from, to: to, events: [evAt('a', 1, 'A2'), evAt('b', 2, 'B')] });
  same(r3.updated, 1, 'змінена назва — одна правка');
  // тиждень минув: «a» тепер поза вікном (історія) — лишається
  var later = now + 20 * day;
  var r4 = post({ secret: secret, action: 'sync', from: new Date(later - 7 * day).toISOString(),
                  to: new Date(later + 84 * day).toISOString(), events: [] });
  same(r4.deleted, 0, 'давні уроки поза вікном не прибираються');
  same(events(g).length, 2, 'обидві події на місці');
});

function drainAll(c, first) {
  var n = 0;
  function step(r) { return (r && r.more && n++ < 15) ? c.GCal.push(true).then(step) : r; }
  return Promise.resolve(first).then(step);
}

scenario('Календар видалили в Google — після «Оновити зараз» усе на місці знову', function () {
  var c = cabinet();
  var g = appsScript();
  wire(c, deploy(c.GCal.scriptCode(), g));
  var total = 0;
  return drainAll(c, c.GCal.connect(URL)).then(function () {
    total = events(g).length;
    ok(total > 0, 'спершу події є (' + total + ')');
    Object.keys(g.cals).forEach(function (id) { delete g.cals[id]; });     // календар прибрали в Google
    return drainAll(c, c.GCal.push(true, true));
  }).then(function () {
    same(events(g).length, total, 'новий календар — з усіма подіями');
    // одну подію видалили руками
    var cal0 = g.cals[Object.keys(g.cals)[0]];
    delete cal0.events[Object.keys(cal0.events)[0]];
    return c.GCal.push(true).then(function () {
      same(events(g).length, total - 1, 'звичайна відправка зниклу не бачить (і не мусить — це дорого)');
      return drainAll(c, c.GCal.push(true, true));
    });
  }).then(function () {
    same(events(g).length, total, '«Оновити зараз» повертає видалену руками');
  });
});

scenario('Збій запису про подію не плодить копій', function () {
  var c = cabinet(), S = c.S;
  var g = appsScript();
  var script = deploy(c.GCal.scriptCode(), g);
  wire(c, script);
  var props = g.PropertiesService.getScriptProperties();
  var real = g.PropertiesService.getScriptProperties;
  var failOnce = true;
  g.PropertiesService.getScriptProperties = function () {
    var p = real();
    var set = p.setProperty;
    p.setProperty = function (k, v) {
      if (failOnce && k.indexOf('e:') === 0) { failOnce = false; throw new Error('Service invoked too many times'); }
      return set(k, v);
    };
    return p;
  };
  return drainAll(c, c.GCal.connect(URL)).then(function () {
    var titles = events(g).map(function (e) { return e.title + '@' + e.start.getTime(); });
    var dup = titles.filter(function (t, i) { return titles.indexOf(t) !== i; });
    same(dup.length, 0, 'жодної події двічі');
    same(events(g).length, c.GCal.build().events.length, 'і всі на місці');
    void props;
  });
});

scenario('Урок, створений руками на час слота й перенесений, не лишає фантома на старому місці', function () {
  var c = cabinet(), S = c.S;
  var iso = isoIn(3, '16:40');
  var st = S.add('students', { name: 'Ручний', grade: '9 клас', price: 500, currency: 'UAH', schedule: [] });
  var l = S.add('lessons', { studentId: st.id, date: iso, status: 'planned' });     // без fromTemplate
  S.update('students', st.id, { schedule: [{ day: weekday(iso), time: '16:40' }] });
  S.db().fillUntil = undefined;
  S.autoFillTemplates();                                                            // межа заповнення
  S.update('lessons', l.id, { date: isoIn(4, '17:00') });                           // перетягнули
  var at = c.GCal.build().events.filter(function (e) { return e.start === new Date(iso).toISOString(); });
  same(at.length, 0, 'на старому місці в календарі нічого');
});

scenario('Заплановане архівного учня в календар не йде', function () {
  var c = cabinet(), S = c.S;
  var st = S.add('students', { name: 'Архівний', grade: '9 клас', price: 500, currency: 'UAH', schedule: [] });
  var l = S.add('lessons', { studentId: st.id, date: isoIn(5, '10:00'), status: 'planned', topic: 'Тема' });
  S.update('students', st.id, { archived: true });
  ok(c.GCal.build().events.every(function (e) { return e.id !== l.id; }), 'урок архівного — не в календарі');
});

scenario('Помилка Google — зрозумілим текстом, а не «перевірте адресу»', function () {
  var c = cabinet();
  var g = appsScript();
  g.LockService = { getScriptLock: function () { return { waitLock: function () { throw new Error('Lock timeout'); }, releaseLock: function () {} }; } };
  wire(c, deploy(c.GCal.scriptCode(), g));
  return c.GCal.ping(URL).then(function () {
    var t = c.S.db().tutor; t.gcal = { secret: c.GCal.secret(), url: URL };
    return c.GCal.push(true);
  }).then(function (r) {
    same(r, null, 'відправка не вдалась');
    ok(/Google: .*Lock timeout/.test(c.GCal.state().err), 'причина — як є: ' + c.GCal.state().err);
  });
});

scenario('Адреса скрипта з Google Workspace (…/a/macros/<домен>/…) — приймається', function () {
  var c = cabinet();
  ok(c.GCal.validUrl('https://script.google.com/macros/s/AKfy123/exec'), 'звичайна адреса');
  ok(c.GCal.validUrl('https://script.google.com/a/macros/tituha.com/s/AKfy123/exec'), 'адреса Workspace з доменом');
  ok(!c.GCal.validUrl('https://script.google.com/macros/s/AKfy123/dev'), '/dev — ні (лише розгорнута /exec)');
  ok(!c.GCal.validUrl('https://evil.example/macros/s/AKfy123/exec'), 'чужий сайт — ні');
});

scenario('Запит не дійшов («Failed to fetch») — пояснення й кроки, а не загадка', function () {
  var c = cabinet();
  c.fetch = function () { return Promise.reject(new TypeError('Failed to fetch')); };
  var t = c.S.db().tutor; t.gcal = { secret: c.GCal.secret(), url: URL };
  return c.GCal.push(true).then(function (r) {
    same(r, null, 'відправка не вдалась');
    ok(/не пускає кабінет до скрипта/.test(c.GCal.state().err), 'причина зрозуміла: ' + c.GCal.state().err);
    same(c.GCal.state().access, true, 'картка покаже кроки виправлення доступу');
  });
});

/* ============================================================ */

queue.reduce(function (chain, s) {
  return chain.then(function () {
    console.log('\n• ' + s.name);
    return Promise.resolve().then(s.fn).catch(function (e) { fails++; console.log('  ✗ впало: ' + (e && e.stack || e)); });
  });
}, Promise.resolve()).then(function () {
  console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
  process.exit(fails ? 1 : 0);
});
