/* Перевірка сховища: розклад, архів, гроші.

   Запуск:  node tools/store-test.js

   Справжні utils.js, store.js і components.js на демо-даних, без браузера.
   Сценарії — ті, на яких раніше губилися чи псувалися дані й гроші:
   двійники уроків постійного розкладу, повернення видалених уроків,
   урок із темою, прибраний зміною розкладу, діра в розкладі після архіву,
   «$40» що ставало «40 ₴», оплата архівного учня, що переїжджала до іншого,
   курс чужого дня, записаний назавжди. */

'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
function src(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

var USD = 40;                          // «курс» у цих перевірках

function freshStore(opts) {
  opts = opts || {};
  var ls = {};
  var marks = {};
  var el = function () {
    return { appendChild: function () {}, remove: function () {}, style: {}, setAttribute: function () {} };
  };
  var ctx = {
    console: { log: console.log, warn: function () {}, info: function () {}, error: console.error },
    setTimeout: function () { return 0; }, clearTimeout: function () {},
    setInterval: function () { return 0; }, clearInterval: function () {},
    Promise: Promise, JSON: JSON, Math: Math, Date: Date, Object: Object, Array: Array,
    String: String, Number: Number, RegExp: RegExp, Error: Error, Intl: Intl,
    isNaN: isNaN, parseFloat: parseFloat, parseInt: parseInt,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    localStorage: {
      getItem: function (k) { return k in ls ? ls[k] : null; },
      setItem: function (k, v) { ls[k] = String(v); },
      removeItem: function (k) { delete ls[k]; },
      key: function (i) { return Object.keys(ls)[i] || null; },
      get length() { return Object.keys(ls).length; }
    },
    navigator: { onLine: true },
    document: {
      addEventListener: function () {}, querySelector: function () { return null; },
      getElementById: el, createElement: el
    },
    addEventListener: function () {},
    icon: function () { return ''; }
  };
  ctx.window = ctx;
  ctx.RecSync = {
    KINDS: ['students', 'lessons', 'payments', 'homeworks', 'progress', 'roadmap', 'desk',
            'materials', 'notes', 'mathmap', 'stumap', 'meta'],
    mark: function (k, id) { if (marks[k + '/' + id] !== 'del') marks[k + '/' + id] = 'mark'; },
    markDeleted: function (k, id) { marks[k + '/' + id] = 'del'; }
  };
  var fresh = opts.fresh !== false;
  ctx.Rates = {
    get: function (c) { return c === 'USD' ? USD : c === 'EUR' ? 45 : 0; },
    forDate: function (c) { return c === 'UAH' ? 1 : (c === 'USD' ? USD : c === 'EUR' ? 45 : 0); },
    isHistoric: function (c, d) {
      if (c === 'UAH') return true;
      return opts.historic ? opts.historic(c, d) : true;
    },
    isFresh: function () { return fresh; }
  };
  vm.createContext(ctx);
  vm.runInContext(src('assets/js/utils.js'), ctx, { filename: 'utils.js' });
  vm.runInContext(src('assets/js/store.js'), ctx, { filename: 'store.js' });
  vm.runInContext(src('assets/js/components.js'), ctx, { filename: 'components.js' });
  ctx.S.load();
  return { S: ctx.S, C: ctx.C, U: ctx.U, marks: marks };
}

var fails = 0, passes = 0;
function ok(cond, msg) {
  if (cond) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); }
}
function same(a, b, msg) {
  ok(a === b, msg + (a === b ? '' : '   (є ' + JSON.stringify(a) + ', має бути ' + JSON.stringify(b) + ')'));
}
function scenario(name, fn) {
  console.log('\n• ' + name);
  try { fn(); } catch (e) { fails++; console.log('  ✗ впало: ' + (e && e.stack || e)); }
}

function pad(n) { return ('0' + n).slice(-2); }
function isoIn(days, hhmm) {
  var d = new Date(); d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + hhmm;
}
function weekday(iso) { var d = new Date(iso); return d.getDay() === 0 ? 7 : d.getDay(); }

// учень із постійним розкладом на один день, щоб дати було легко рахувати
function studentWithSlot(S, days, hhmm, extra) {
  var iso = isoIn(days, hhmm);
  var st = S.add('students', Object.assign({
    name: 'Тест ' + hhmm, grade: '9 клас', price: 500, currency: 'UAH',
    schedule: [{ day: weekday(iso), time: hhmm }]
  }, extra || {}));
  return { st: st, iso: iso };
}
function lessonsAt(S, studentId, iso) {
  return S.db().lessons.filter(function (l) { return l.studentId === studentId && l.date === iso; });
}

/* ============================================================ */

scenario('Заповнення розкладу пишеться в окреме поле й не чіпає профіль', function () {
  var t = freshStore();
  var S = t.S;
  S.db().tutor.calToken = 'cal-123';
  S.db().tutor.nav = ['schedule', 'students'];
  var before = JSON.stringify(S.db().tutor);
  S.db().fillUntil = undefined;
  S.autoFillTemplates();
  same(JSON.stringify(S.db().tutor), before, 'профіль (з calToken і nav) лишився як був');
  ok(!!S.db().fillUntil, 'межа заповнення — у db.fillUntil');
});

scenario('Той самий слот на двох пристроях — той самий номер уроку', function () {
  var a = freshStore(), b = freshStore();
  // один і той самий учень на обох
  var x = studentWithSlot(a.S, 3, '10:11');
  b.S.add('students', JSON.parse(JSON.stringify(x.st)));
  a.S.fillStudentTemplate(x.st.id, 7);
  b.S.fillStudentTemplate(x.st.id, 7);
  var la = lessonsAt(a.S, x.st.id, x.iso)[0], lb = lessonsAt(b.S, x.st.id, x.iso)[0];
  ok(la && lb, 'обидва пристрої створили урок');
  ok(la && lb && la.id === lb.id, 'номери однакові — обмін зіллє їх в один');
});

scenario('Звільнене рукою місце не заповнюється знову', function () {
  var S = freshStore().S;
  var x = studentWithSlot(S, 3, '10:13');
  S.fillStudentTemplate(x.st.id, 7);
  var l = lessonsAt(S, x.st.id, x.iso)[0];
  ok(!!l, 'урок з розкладу створено');
  S.removeLesson(l.id);                           // видалили (канікули)
  ok(S.get('students', x.st.id).slotGone.indexOf(x.iso) >= 0, 'місце позначено звільненим');
  S.fillStudentTemplate(x.st.id, 7);
  same(lessonsAt(S, x.st.id, x.iso).length, 0, 'видалений урок не повернувся');
  // перенесений урок: старе місце теж не заповнюється
  var y = studentWithSlot(S, 4, '11:17');
  S.fillStudentTemplate(y.st.id, 7);
  var m = lessonsAt(S, y.st.id, y.iso)[0];
  S.update('lessons', m.id, { date: isoIn(5, '12:00') });
  S.fillStudentTemplate(y.st.id, 7);
  same(lessonsAt(S, y.st.id, y.iso).length, 0, 'на місці перенесеного уроку двійника немає');
});

scenario('Заповнення не створює уроків у минулому', function () {
  var S = freshStore().S;
  var x = studentWithSlot(S, -2, '09:19');
  S.fillStudentTemplate(x.st.id, 14, isoIn(-5, '00:00').slice(0, 10));
  same(lessonsAt(S, x.st.id, x.iso).length, 0, 'урок позавчора не створено');
});

scenario('Зміна розкладу не прибирає урок із вписаною темою', function () {
  var S = freshStore().S;
  var x = studentWithSlot(S, 3, '14:21');
  S.fillStudentTemplate(x.st.id, 7);
  var l = lessonsAt(S, x.st.id, x.iso)[0];
  S.update('lessons', l.id, { topic: 'Логарифмічні нерівності' });
  var other = isoIn(4, '14:21');
  S.update('students', x.st.id, { schedule: [{ day: weekday(other), time: '14:21' }] });
  S.pruneStudentTemplate(x.st.id);
  ok(!!S.get('lessons', l.id), 'урок із темою лишився');
  // а порожній — прибирається, як і раніше
  var y = studentWithSlot(S, 3, '15:23');
  S.fillStudentTemplate(y.st.id, 7);
  var e = lessonsAt(S, y.st.id, y.iso)[0];
  S.update('students', y.st.id, { schedule: [{ day: weekday(isoIn(4, '15:23')), time: '15:23' }] });
  S.pruneStudentTemplate(y.st.id);
  ok(!S.get('lessons', e.id), 'порожній урок старого дня прибрано');
});

scenario('Двійники: лишається той, у якому робота', function () {
  var S = freshStore().S;
  var st = S.db().students[0];
  var iso = isoIn(6, '16:27');
  var bare = S.add('lessons', { studentId: st.id, date: iso, status: 'planned', fromTemplate: 1, createdAt: '2026-01-01' });
  var work = S.add('lessons', { studentId: st.id, date: iso, status: 'planned', fromTemplate: 1, topic: 'Тема', createdAt: '2026-02-01' });
  same(S.dedupeTemplateLessons(), 1, 'прибрано одного двійника');
  ok(!S.get('lessons', bare.id) && !!S.get('lessons', work.id), 'лишився урок із темою');
  // два порожні — лишається старший
  var a = S.add('lessons', { studentId: st.id, date: isoIn(7, '16:29'), status: 'planned', fromTemplate: 1, createdAt: '2026-01-01' });
  var b = S.add('lessons', { studentId: st.id, date: isoIn(7, '16:29'), status: 'planned', fromTemplate: 1, createdAt: '2026-03-01' });
  S.dedupeTemplateLessons();
  ok(!!S.get('lessons', a.id) && !S.get('lessons', b.id), 'з двох порожніх лишився старший');
});

scenario('Архів: майбутні порожні прибираються, після повернення розклад заповнюється', function () {
  var S = freshStore().S;
  var x = studentWithSlot(S, 3, '17:31');
  S.fillStudentTemplate(x.st.id, 7);
  var l = lessonsAt(S, x.st.id, x.iso)[0];
  var kept = S.add('lessons', { studentId: x.st.id, date: isoIn(3, '18:00'), status: 'planned', fromTemplate: 1, topic: 'Своє' });
  S.setArchived(x.st.id, true);
  ok(!S.get('lessons', l.id), 'порожній майбутній урок шаблону прибрано');
  ok(!!S.get('lessons', kept.id), 'урок із темою лишився');
  ok(!!S.get('students', x.st.id).archivedAt, 'запамʼятовано, відколи в архіві');

  // поки учень в архіві, у минулому лишився порожній урок (наприклад, прийшов з іншого пристрою)
  var past = S.add('lessons', { studentId: x.st.id, date: isoIn(-1, '17:31'), status: 'planned', fromTemplate: 1 });
  S.get('students', x.st.id).archivedAt = isoIn(-3, '00:00').slice(0, 10);
  S.setArchived(x.st.id, false);
  ok(!S.get('lessons', past.id), 'порожній урок часу відсутності прибрано');
  same(lessonsAt(S, x.st.id, x.iso).length, 1, 'розклад заповнено знову');
  ok(!S.get('students', x.st.id).archived, 'учень активний');
});

scenario('Повернення без дати архіву не чіпає минуле, де учень ще ходив', function () {
  var S = freshStore().S;
  var x = studentWithSlot(S, 3, '17:37');
  S.add('lessons', { studentId: x.st.id, date: isoIn(-10, '17:37'), status: 'done', price: 500 });
  var real = S.add('lessons', { studentId: x.st.id, date: isoIn(-12, '17:37'), status: 'planned', fromTemplate: 1 });
  var gone = S.add('lessons', { studentId: x.st.id, date: isoIn(-2, '17:37'), status: 'planned', fromTemplate: 1 });
  S.update('students', x.st.id, { archived: true });           // стара версія: без archivedAt
  S.setArchived(x.st.id, false);
  ok(!!S.get('lessons', real.id), 'невідмічений урок до останнього проведеного лишився');
  ok(!S.get('lessons', gone.id), 'порожній урок після нього прибрано');
});

scenario('Зміна валюти: історія лишається, баланс — у новій валюті', function () {
  var S = freshStore().S;
  var st = S.add('students', { name: 'Доларовий', grade: '11 клас', price: 40, currency: 'USD', schedule: [] });
  // старі записи без поля currency — брали валюту з учня
  S.add('payments', { studentId: st.id, date: isoIn(-20, '00:00').slice(0, 10), amount: 120, rate: USD });
  S.add('lessons', { studentId: st.id, date: isoIn(-15, '10:00'), status: 'done', price: 40, rate: USD });
  S.add('lessons', { studentId: st.id, date: isoIn(-8, '10:00'), status: 'done', price: 40, rate: USD });
  same(S.balance(st.id), 40, 'до зміни: $120 − 2×$40 = $40');

  same(S.setStudentCurrency(st.id, 'UAH'), true, 'валюту змінено');
  S.update('students', st.id, { currency: 'UAH', price: 1600 });
  var pays = S.paymentsOf(st.id);
  same(S.paymentCur(pays[0]), 'USD', 'стара оплата лишилась у доларах');
  ok(S.lessonsOf(st.id).every(function (l) { return S.lessonCur(l) === 'USD'; }), 'проведені уроки — у доларах');
  same(S.balance(st.id), 40 * USD, 'баланс у гривнях = $40 × курс');
  same(S.paidOf(st.id), 120 * USD, '«сплачено» у гривнях');
  // нова оплата вже в гривнях — баланс складає обидві валюти
  S.add('payments', { studentId: st.id, date: isoIn(0, '00:00').slice(0, 10), amount: 1600, currency: 'UAH' });
  same(S.balance(st.id), 40 * USD + 1600, 'нова оплата в ₴ додалася до балансу');
  same(S.setStudentCurrency(st.id, 'UAH'), false, 'повторна «зміна» на ту саму валюту нічого не робить');
});

scenario('Список учнів у формі містить учня запису, навіть архівного', function () {
  var t = freshStore();
  var S = t.S, C = t.C;
  var st = S.add('students', { name: 'Яяархівний', grade: '10 клас', price: 500, archived: true });
  var html = C.studentSelect('studentId', st.id);
  ok(html.indexOf('value="' + st.id + '" selected') >= 0, 'архівний учень є й обраний');
  ok(html.indexOf('· архів') >= 0, 'позначено «архів»');
  var active = S.students()[0];
  ok(C.studentSelect('studentId', active.id).indexOf('· архів') < 0, 'для активного учня архівних у списку немає');
});

scenario('Курс заморожується лише справжній курс того дня', function () {
  var t = freshStore({ historic: function () { return false; } });   // архівного ще немає
  var S = t.S;
  var st = S.add('students', { name: 'Курс', grade: '11 клас', price: 40, currency: 'USD', schedule: [] });
  var l = S.add('lessons', { studentId: st.id, date: isoIn(-4, '10:00'), status: 'planned', price: 40, currency: 'USD' });
  S.completeLesson(l.id, true);
  ok(!(S.get('lessons', l.id).rate > 0), 'урок без архівного курсу лишився без замороженого курсу');
  var pay = S.db().payments.filter(function (p) { return p.lessonId === l.id; })[0];
  ok(pay && !(pay.rate > 0), 'оплата за урок — теж без чужого курсу');

  var t2 = freshStore();                                              // архівний є
  var st2 = t2.S.add('students', { name: 'Курс2', grade: '11 клас', price: 40, currency: 'USD', schedule: [] });
  var l2 = t2.S.add('lessons', { studentId: st2.id, date: isoIn(-4, '10:00'), status: 'planned', price: 40, currency: 'USD' });
  t2.S.completeLesson(l2.id, true);
  same(t2.S.get('lessons', l2.id).rate, USD, 'з архівним курсом — заморожено');

  var t3 = freshStore({ fresh: false });                             // сьогоднішній ще не оновлено
  same(t3.S.exactRate({ date: isoIn(0, '10:00') }, 'USD'), 0, 'сьогоднішній неоновлений курс не заморожується');
});

console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
process.exit(fails ? 1 : 0);
