/* Обмін дошками — для решти кабінету.

   Уся робота — у boardops.js: там журнал дій, з якого складається дошка на
   кожному пристрої. Тут лише звичні назви, якими кабінет користувався й
   раніше: «дошка змінилась», «забери свіже», «відправ, що не поїхало».

   Колись тут жила окрема синхронізація дошок цілком: з номерами версій,
   правилом «повніша перемагає» й рятуванням слайдів. Вона й була причиною
   дивних повернень стертого та зникнень: дві цілі версії однієї дошки не
   вміють злитися, їх можна лише обрати. Тепер цілих версій немає — лише
   дії, і зливаються вони самі. */

(function () {
  'use strict';

  var S = window.S;
  var B = {};
  var PUSH_DELAY = 900;
  var FAST_DELAY = 250;       // відкрита дошка: штрих їде за чверть секунди
  var timers = {};
  var started = false;

  function O() { return window.BoardOps; }

  B.onChange = function (fn) { return O() ? O().onChange(fn) : function () {}; };
  B.state = function (id) { return O() ? O().state(id) : { mode: 'idle' }; };
  B.stats = function () { return O() ? O().stats() : { pending: 0, failed: 0, ids: [], why: '' }; };
  B.available = function () { return !!(O() && O().ready()); };

  /* Дошка знову жива (той самий номер уроку повернувся — у шаблону він
     сталий): її видалення в черзі вже не актуальне, інакше воно стерло б
     свіжий знімок. */
  function revive(boardId) {
    var list = delQueue();
    if (list.indexOf(boardId) >= 0) saveDelQueue(list.filter(function (id) { return id !== boardId; }));
  }

  /** Дошка змінилася — відправити, коли вщухне. */
  B.mark = function (boardId) {
    if (!boardId || !O()) return;
    revive(boardId);
    var b = S.getBoard(boardId);
    if (b) O().prepare(b);
    if (timers[boardId]) clearTimeout(timers[boardId]);
    timers[boardId] = setTimeout(function () {
      timers[boardId] = null;
      O().record(boardId);
    }, PUSH_DELAY);
  };

  /* Відкрита дошка — відправити майже одразу. Досі штрих чекав двічі:
     0,7 с на запис у браузер і ще 0,9 с на відправку, — і на іншому
     пристрої зʼявлявся секунд через п'ять. Відправка не мусить чекати на
     запис у браузер: вона бере дошку просто з памʼяті. */
  B.soon = function (boardId) {
    if (!boardId || !O()) return;
    revive(boardId);
    var b = S.getBoard(boardId);
    if (b) O().prepare(b);
    if (timers[boardId]) clearTimeout(timers[boardId]);
    timers[boardId] = setTimeout(function () {
      timers[boardId] = null;
      O().record(boardId);
    }, FAST_DELAY);
  };

  /** Відправити одну дошку зараз. true — дошка на сервері й збігається. */
  B.push = function (boardId) {
    if (!O()) return Promise.resolve(false);
    return O().record(boardId).then(function () {
      var st = O().state(boardId);
      return st.mode === 'sent' || st.mode === 'idle';
    });
  };

  /** Забрати свіже для однієї дошки. true — щось змінилось. */
  B.pull = function (boardId) {
    if (!O()) return Promise.resolve(false);
    return O().pull(boardId).then(function (n) { return n > 0; });
  };

  B.flush = function () { return O() ? O().flush() : Promise.resolve(0); };

  /** Усі дошки: яких тут немає — забрати, змінені деінде — освіжити. */
  B.pullAll = function () {
    if (!O() || !O().ready()) return Promise.resolve(0);
    return O().fetchMissing().then(function (r) {
      if (r.stale.length) O().refresh(r.stale);
      return r.added;
    }).catch(function (e) {
      console.warn('Дошки не вдалося прочитати:', e && e.message);
      return 0;
    });
  };

  /* Знімки дошок, які треба прибрати з сервера. Черга на диску: видалення
     без мережі досі пропадало назавжди, і знімок видаленого уроку
     повертався на кожен пристрій. */
  var DEL_KEY = 'mathhub.board.del';
  function delQueue() {
    try { return JSON.parse(localStorage.getItem(DEL_KEY) || '[]') || []; } catch (e) { return []; }
  }
  function saveDelQueue(list) {
    try {
      if (list.length) localStorage.setItem(DEL_KEY, JSON.stringify(list));
      else localStorage.removeItem(DEL_KEY);
    } catch (e) {}
  }
  /** Дошки, чиє видалення ще не дійшло до сервера (їх не можна довантажувати). */
  B.pendingDeletes = function () { return delQueue(); };

  function sendDelete(boardId) {
    return Cloud.request('/rest/v1/boards?board_id=eq.' + encodeURIComponent(boardId),
      { method: 'DELETE' }).then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }

  /** Спробувати ще раз усе, що не пішло. */
  B.flushDeletes = function () {
    var list = delQueue();
    if (!list.length || !O() || !O().ready()) return Promise.resolve(0);
    return list.reduce(function (chain, id) {
      return chain.then(function (done) {
        return sendDelete(id).then(function (ok) { return ok ? done.concat(id) : done; });
      });
    }, Promise.resolve([])).then(function (done) {
      saveDelQueue(delQueue().filter(function (id) { return done.indexOf(id) < 0; }));
      return done.length;
    });
  };

  /* Дошки, пропущені як сироти, бо їхнього уроку тут ще не було: читання
     дошок і записів ідуть паралельно. Щойно урок приїхав — довантажити. */
  var recheckTimer = null;
  B.recheckOrphans = function () {
    if (!O() || !O().skippedOrphans || recheckTimer) return;
    var ids = O().skippedOrphans();
    if (!ids.some(function (id) { return S.get('lessons', id) || S.get('desk', id); })) return;
    recheckTimer = setTimeout(function () { recheckTimer = null; B.pullAll(); }, 300);
  };

  /** Видалено урок — прибрати й знімок його дошки. Журнал лишається. */
  B.remove = function (boardId) {
    if (O()) O().drop(boardId);
    if (!boardId) return Promise.resolve(false);
    var list = delQueue();
    if (list.indexOf(boardId) < 0) { list.push(boardId); saveDelQueue(list); }
    if (!O() || !O().ready()) return Promise.resolve(false);   // поїде, щойно зʼявиться вхід і мережа
    return sendDelete(boardId).then(function (ok) {
      if (ok) saveDelQueue(delQueue().filter(function (id) { return id !== boardId; }));
      return ok;
    });
  };

  /** Що про дошки знає сервер — для панелі «Чи все ціле». */
  B.serverBoards = function () {
    if (!window.Cloud || !Cloud.available()) return Promise.resolve({ off: 'Синхронізація не налаштована' });
    if (!Cloud.signedIn()) return Promise.resolve({ off: 'Немає входу' });
    return Cloud.request('/rest/v1/boards?select=board_id,rev,updated_at', { method: 'GET' })
      .then(function (res) {
        if (res.status === 404) throw new Error('на сервері немає таблиці дошок');
        if (!res.ok) throw new Error('сервер відповів ' + res.status);
        return res.json();
      })
      .then(function (rows) { return { rows: rows || [] }; })
      .catch(function (e) { return { err: (e && e.message) || 'сервер не відповів' }; });
  };

  /** Дошки з вмістом, яких сервер не знає, — відправити. */
  B.syncMissing = function () {
    if (!O() || !O().ready()) return Promise.resolve(0);
    return B.serverBoards().then(function (srv) {
      if (!srv || srv.err || srv.off) return 0;
      var known = {};
      (srv.rows || []).forEach(function (r) { known[r.board_id] = 1; });
      var ids = (S.db().boards || []).filter(function (b) {
        return b.lessonId && !known[b.lessonId] &&
          (b.slides || []).some(function (sl) { return (sl.items || []).length; });
      }).map(function (b) { return b.lessonId; });
      return ids.reduce(function (chain, id) {
        return chain.then(function () { return O().record(id); });
      }, Promise.resolve()).then(function () { return ids.length; });
    });
  };

  /* Звірка дошок, що мінялися останнім часом, — у фоні, коли все інше
     вже зроблено. Кожна дошка — не частіше ніж раз на добу. */
  var sweeping = false;
  function sweepLater(ms) {
    if (sweeping || !O() || !O().verifySweep) return;
    sweeping = true;
    setTimeout(function () {
      O().verifySweep(45).catch(function () {}).then(function () { sweeping = false; });
    }, ms);
  }

  B.start = function () {
    if (started || !O() || !O().ready()) return;
    started = true;
    // спершу віддаємо своє, потім забираємо чуже
    O().flush()
      .then(function () { return B.flushDeletes(); })
      .then(function () { return B.pullAll(); })
      .then(function () { return B.syncMissing(); })
      .then(function () { sweepLater(20000); })
      .catch(function (e) { console.warn('Дошки:', e && e.message); });

    /* Щойно записи звірено з сервером, ще раз дивимось на дошки: тепер
       відомо, які уроки справжні, і сиріт не довантажуємо (fetchMissing). */
    if (window.RecSync && RecSync.afterFirstPull) RecSync.afterFirstPull(function () { B.pullAll(); });

    window.addEventListener('online', function () { O().flush(); B.flushDeletes(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') O().flush();
      else { B.pullAll(); sweepLater(15000); }
    });
  };

  window.BoardSync = B;
})();
