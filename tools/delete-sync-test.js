/* Перевірка: усе, що зникає з бази, сервер отримує як «видалено».

   Запуск:  node tools/delete-sync-test.js

   Обмін записами (recsync.js) змін не пропускає, а видалень сам не бачить:
   зниклий запис не відрізнити від такого, що ще не доїхав з іншого
   пристрою. Тому кожне видалення мусить назвати себе через
   RecSync.markDeleted — інакше наступний обмін привозить запис назад.
   Так було зі справами в «Моє»: зникали тут і поверталися з сервера.

   Тут вантажимо справжні utils.js і store.js на демо-даних, самі
   знаходимо всі функції видалення S.remove*, S.prune* і перевіряємо:
   кожен запис, що після виклику зник, позначено видаленим. Нова функція
   видалення без сценарію тут — теж помилка: так її не забудуть. */

'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
function src(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

// види записів — з самого recsync.js, щоб перевірка не відстала від нього
var KINDS = JSON.parse(src('assets/js/recsync.js')
  .match(/R\.KINDS = (\[[^\]]*\])/)[1].replace(/'/g, '"').replace(/\s+/g, ''))
  .filter(function (k) { return k !== 'meta'; });

function freshStore() {
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
    KINDS: KINDS.concat('meta'),
    mark: function (k, id) { if (marks[k + '/' + id] !== 'del') marks[k + '/' + id] = 'mark'; },
    markDeleted: function (k, id) { marks[k + '/' + id] = 'del'; }
  };
  vm.createContext(ctx);
  vm.runInContext(src('assets/js/utils.js'), ctx, { filename: 'utils.js' });
  vm.runInContext(src('assets/js/store.js'), ctx, { filename: 'store.js' });
  ctx.S.load();
  return { S: ctx.S, marks: marks, reset: function () { Object.keys(marks).forEach(function (k) { delete marks[k]; }); } };
}

function ids(S) {
  var out = {};
  KINDS.forEach(function (k) {
    (S.db()[k] || []).forEach(function (r) { if (r && r.id) out[k + '/' + r.id] = 1; });
  });
  return out;
}

var fails = 0, passes = 0;
function ok(cond, msg) {
  if (cond) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); }
}

/* Одне видалення: що зникло — те й має бути позначене «видалено». */
function check(name, prepare, act, expectSome) {
  console.log('\n• ' + name);
  var st = freshStore();
  var arg = prepare(st.S);
  if (arg === null) { ok(false, 'демо-дані не мають потрібного запису'); return; }
  st.reset();
  var before = ids(st.S);
  act(st.S, arg);
  var after = ids(st.S);
  var gone = Object.keys(before).filter(function (k) { return !after[k]; });
  if (expectSome) ok(gone.length > 0, 'щось справді видалено (' + gone.length + ')');
  var missed = gone.filter(function (k) { return st.marks[k] !== 'del'; });
  ok(!missed.length, missed.length
    ? 'сервер не дізнається про видалення: ' + missed.join(', ')
    : 'кожне видалення позначене для сервера');
}

function first(S, kind, pred) {
  var r = (S.db()[kind] || []).filter(pred || function () { return true; })[0];
  return r ? r.id : null;
}

/* Сценарії для кожної функції видалення. Нова функція — новий рядок тут. */
var CASES = {
  remove: function () {
    KINDS.forEach(function (kind) {
      check('S.remove(\'' + kind + '\')',
        function (S) {
          if (!(S.db()[kind] || []).length) S.add(kind, { studentId: first(S, 'students'), title: 'тест' });
          return first(S, kind);
        },
        function (S, id) { S.remove(kind, id); }, true);
    });
  },
  removeStudent: function () {
    check('S.removeStudent — учень разом з уроками, оплатами, домашніми',
      function (S) {
        // учень, на якому найбільше висить
        var best = null, most = -1;
        S.db().students.forEach(function (s) {
          var n = 0;
          KINDS.forEach(function (k) { (S.db()[k] || []).forEach(function (r) { if (r.studentId === s.id) n++; }); });
          if (n > most) { most = n; best = s.id; }
        });
        return best;
      },
      function (S, id) { S.removeStudent(id); }, true);
  },
  removeLesson: function () {
    check('S.removeLesson — урок разом з оплатою',
      function (S) {
        var paid = S.db().payments.filter(function (p) { return p.lessonId; })[0];
        return paid ? paid.lessonId : first(S, 'lessons');
      },
      function (S, id) { S.removeLesson(id); }, true);
  },
  removeDeskItem: function () {
    check('S.removeDeskItem — справа з «Моє»',
      function (S) { return S.addDeskItem({ title: 'Тест' }).id; },
      function (S, id) { S.removeDeskItem(id); }, true);
  },
  removeBoard: function () {
    // дошки — не записи: у них власний журнал; тут лише щоб записи не зачіпались мовчки
    check('S.removeBoard — дошка уроку',
      function (S) { var id = first(S, 'lessons'); S.ensureBoard(id); return id; },
      function (S, id) { S.removeBoard(id); }, false);
  },
  dedupeTemplateLessons: function () {
    check('S.dedupeTemplateLessons — двійники уроків шаблону',
      function (S) {
        var st = S.db().students[0];
        if (!st) return null;
        var d = new Date(); d.setDate(d.getDate() + 5);
        var iso = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
          ('0' + d.getDate()).slice(-2) + 'T08:07';
        S.add('lessons', { studentId: st.id, date: iso, status: 'planned', fromTemplate: 1 });
        S.add('lessons', { studentId: st.id, date: iso, status: 'planned', fromTemplate: 1 });
        return st.id;
      },
      function (S) { S.dedupeTemplateLessons(); }, true);
  },
  setArchived: function () {
    check('S.setArchived — в архів і назад (порожні уроки шаблону)',
      function (S) {
        var st = S.db().students[0];
        if (!st) return null;
        var d = new Date(); d.setDate(d.getDate() + 4);
        var iso = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
          ('0' + d.getDate()).slice(-2) + 'T08:09';
        S.add('lessons', { studentId: st.id, date: iso, status: 'planned', fromTemplate: 1 });
        return st.id;
      },
      function (S, id) { S.setArchived(id, true); S.setArchived(id, false); }, true);
  },
  pruneStudentTemplate: function () {
    check('S.pruneStudentTemplate — зайві уроки шаблону',
      function (S) {
        var st = S.db().students[0];
        if (!st) return null;
        var d = new Date(); d.setDate(d.getDate() + 3); d.setHours(9, 13, 0, 0);
        var iso = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
          ('0' + d.getDate()).slice(-2) + 'T09:13';
        S.add('lessons', { studentId: st.id, date: iso, status: 'planned', fromTemplate: true });
        return st.id;
      },
      function (S, id) { S.pruneStudentTemplate(id); }, true);
  }
};

/* Усі функції, що можуть прибрати запис. reset, wipe, import* — заміна всієї
   бази за прямим наказом людини; вони в обміні мають власні правила. */
var probe = freshStore().S;
var found = Object.keys(probe).filter(function (k) {
  return typeof probe[k] === 'function' && /^(remove|prune|purge|drop|delete|dedupe)/.test(k) &&
    k !== 'purgeUnusedImages';          // картинки — не записи бази
});
// прибирають і ті, що звуться інакше: архів чистить порожні уроки шаблону
['setArchived'].forEach(function (k) { if (typeof probe[k] === 'function') found.push(k); });

found.forEach(function (fn) {
  if (!CASES[fn]) {
    console.log('\n• S.' + fn);
    ok(false, 'нова функція видалення без перевірки — додайте сценарій у tools/delete-sync-test.js');
  }
});
Object.keys(CASES).forEach(function (fn) {
  if (found.indexOf(fn) < 0) {
    console.log('\n• S.' + fn);
    ok(false, 'такої функції в store.js більше немає — приберіть сценарій');
    return;
  }
  CASES[fn]();
});

console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
process.exit(fails ? 1 : 0);
