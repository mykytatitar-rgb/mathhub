/* Синхронізація записів — кожного окремо.

   Раніше вся база їхала на сервер одним документом: «хай стане ось так».
   Такий запис завжди вміє стирати. Досить було програмі чогось не побачити
   — застарілий пристрій, непрочитане сховище, стара версія коду — і
   невидиме зникало разом із записом.

   Тут кожен запис їде окремо: «онови цього учня». Зачепити сусіда такий
   запис фізично не може. Два пристрої, що правлять різних учнів, більше не
   конфліктують узагалі, а не «конфліктують, але ми це владнаємо».

   Правило інтерфейсу лишається незмінним: він ніколи не чекає на мережу.
   Запис спершу лягає в localStorage, як і був, а сюди потрапляє лише
   позначка «це поїхало на сервер». Немає інтернету — позначка чекає й
   переживає перезавантаження сторінки.

   Локальний документ при цьому нікуди не дівається: він лишається повною
   копією всього. Немає жодного стану, у якому дані є тільки в одному
   новому місці. */

(function () {
  'use strict';

  var U = window.U, S = window.S;
  var R = {};

  /* Види записів, які живуть на сервері рядками. Дошки тут не згадані:
     у них своя таблиця, бо вони важкі й змінюються поштучно щосекунди. */
  R.KINDS = ['students', 'lessons', 'payments', 'homeworks', 'progress',
             'roadmap', 'desk', 'materials', 'notes', 'mathmap'];

  /* Який набір видів бачив цей пристрій минулого разу.

     Читання йде «усе новіше за мітку». Стара версія програми не знала
     про новий вид і пропускала його рядки — але мітку зсувала далі. Після
     оновлення коду ці рядки лишилися б позаду назавжди. Тому щойно набір
     видів змінився, один раз читаємо все з початку. */
  var KINDS_KEY = 'mathhub.rec.kinds';

  function kindsChanged() {
    try { return localStorage.getItem(KINDS_KEY) !== R.KINDS.join(','); } catch (e) { return false; }
  }

  var OUT = 'mathhub.rec.outbox';    // що не встигло поїхати: {"kind/id": 1|"del"}
  var SINCE = 'mathhub.rec.since';   // мітка часу останнього вдалого читання
  var DONE = 'mathhub.rec.migrated'; // чи перенесено початкові дані
  var PUSH_DELAY = 1200;

  var outbox = {};
  var since = null;
  var timer = null;
  var sending = false;
  var started = false;

  function loadState() {
    try { outbox = JSON.parse(localStorage.getItem(OUT) || '{}') || {}; } catch (e) { outbox = {}; }
    try { since = localStorage.getItem(SINCE) || null; } catch (e) { since = null; }
  }

  function saveState() {
    try {
      localStorage.setItem(OUT, JSON.stringify(outbox));
      if (since) localStorage.setItem(SINCE, since);
    } catch (e) { /* сховище повне — дані все одно в базі, черга відновиться */ }
  }

  function ready() {
    return !!(window.Cloud && Cloud.available() && Cloud.signedIn() &&
      !(Cloud.writesBlocked && Cloud.writesBlocked()));
  }

  function device() {
    try { return navigator.platform || ''; } catch (e) { return ''; }
  }

  R.pending = function () { return Object.keys(outbox).length; };
  R.available = function () { return ready(); };

  /* ============================================================
     Черга
     ============================================================ */

  /** Запис змінився. */
  R.mark = function (kind, id) {
    if (!kind || !id || R.KINDS.indexOf(kind) < 0) return;
    outbox[kind + '/' + id] = 1;
    saveState();
    schedule();
  };

  /** Запис видалено. На сервері це позначка, а не стирання. */
  R.markDeleted = function (kind, id) {
    if (!kind || !id || R.KINDS.indexOf(kind) < 0) return;
    outbox[kind + '/' + id] = 'del';
    saveState();
    schedule();
  };

  function schedule() {
    if (!ready()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = null; R.flush(); }, PUSH_DELAY);
  }

  /** Відправити все, що чекає. По одному: так зрозуміло, що саме не пройшло. */
  R.flush = function () {
    if (sending || !ready()) return Promise.resolve(0);
    var keys = Object.keys(outbox);
    if (!keys.length) return Promise.resolve(0);

    sending = true;
    var ok = 0;

    return keys.reduce(function (chain, key) {
      return chain.then(function () {
        var parts = key.split('/');
        var kind = parts[0], id = parts.slice(1).join('/');
        var op = outbox[key];

        if (op === 'del') {
          return call('delete_record', { p_kind: kind, p_id: id, p_device: device() })
            .then(function () { delete outbox[key]; ok++; });
        }

        var rec = findLocal(kind, id);
        if (!rec) { delete outbox[key]; return; }   // зник локально — нема чого слати

        return call('save_record', { p_kind: kind, p_id: id, p_data: rec, p_device: device() })
          .then(function () { delete outbox[key]; ok++; });
      }).catch(function (e) {
        // лишаємо в черзі: поїде при наступній нагоді
        console.warn('Запис не поїхав (' + key + '):', e && e.message);
      });
    }, Promise.resolve()).then(function () {
      sending = false;
      saveState();
      return ok;
    }, function () {
      sending = false;
      saveState();
      return ok;
    });
  };

  function call(fn, body) {
    return Cloud.request('/rest/v1/rpc/' + fn, {
      method: 'POST', body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) throw new Error('Сервер відповів ' + res.status);
      return res.json();
    });
  }

  function findLocal(kind, id) {
    var list = S.db()[kind];
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ============================================================
     Читання
     ============================================================ */

  /**
   * Забрати з сервера все, що змінилося після минулого разу.
   *
   * Своє відправляємо ПЕРЕД читанням: інакше свіжа локальна правка
   * перекрилася б старішою серверною, і виглядало б це як втрата.
   */
  R.pull = function (full) {
    if (!ready()) return Promise.resolve(0);

    var path = '/rest/v1/records?select=kind,id,data,rev,deleted,updated_at';
    if (!full && since) path += '&updated_at=gt.' + encodeURIComponent(since);

    return Cloud.request(path, { method: 'GET' })
      .then(function (res) {
        if (!res.ok) throw new Error('Сервер відповів ' + res.status);
        return res.json();
      })
      .then(function (rows) {
        if (!rows || !rows.length) {
          if (full) { try { localStorage.setItem(KINDS_KEY, R.KINDS.join(',')); } catch (e) {} }
          return 0;
        }

        var changed = 0;
        var newest = since;

        rows.forEach(function (row) {
          if (R.KINDS.indexOf(row.kind) < 0) return;
          // те, що зараз чекає в черзі, чіпати не можна: наше новіше
          if (outbox[row.kind + '/' + row.id]) return;
          if (apply(row)) changed++;
          if (!newest || row.updated_at > newest) newest = row.updated_at;
        });

        since = newest;
        saveState();
        if (full) { try { localStorage.setItem(KINDS_KEY, R.KINDS.join(',')); } catch (e) {} }
        if (changed) S.save();
        return changed;
      })
      .catch(function (e) {
        console.warn('Записи не вдалося прочитати:', e && e.message);
        return 0;
      });
  };

  function apply(row) {
    var list = S.db()[row.kind];
    if (!Array.isArray(list)) return false;

    var i = -1;
    for (var k = 0; k < list.length; k++) if (list[k].id === row.id) { i = k; break; }

    if (row.deleted) {
      if (i < 0) return false;
      list.splice(i, 1);
      return true;
    }

    var rec = row.data;
    rec.id = row.id;
    if (i >= 0) list[i] = rec; else list.push(rec);
    return true;
  }

  /* ============================================================
     Перенесення
     ============================================================ */

  /**
   * Одноразово перекласти те, що вже є локально, у таблицю записів.
   *
   * Зі старого місця нічого не стираємо: локальний документ і далі тримає
   * повну копію всього. Якщо з новим щось піде не так, є куди повернутися.
   */
  R.migrate = function () {
    if (!ready()) return Promise.resolve(0);
    try { if (localStorage.getItem(DONE)) return Promise.resolve(0); } catch (e) {}

    var db = S.db();
    var n = 0;
    R.KINDS.forEach(function (kind) {
      (db[kind] || []).forEach(function (rec) {
        if (rec && rec.id) { outbox[kind + '/' + rec.id] = 1; n++; }
      });
    });
    saveState();

    return R.flush().then(function (sent) {
      // позначку ставимо лише коли справді все поїхало
      if (!R.pending()) {
        try { localStorage.setItem(DONE, new Date().toISOString()); } catch (e) {}
      }
      return sent;
    });
  };

  R.migrated = function () {
    try { return !!localStorage.getItem(DONE); } catch (e) { return false; }
  };

  /* ============================================================
     Старт
     ============================================================ */

  R.start = function () {
    if (started) return;
    started = true;
    loadState();
    if (!ready()) return;

    /* Порядок важливий: спершу віддати своє, потім перенести те, чого на
       сервері ще немає, і лише тоді забирати чуже. */
    R.flush()
      .then(function () { return R.migrate(); })
      .then(function () { return R.pull(!since || kindsChanged()); })
      .then(function (n) {
        if (n && window.App && App.render) App.render();
      });

    window.addEventListener('online', function () { R.flush(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') R.pull();
    });
  };

  window.RecSync = R;
})();
