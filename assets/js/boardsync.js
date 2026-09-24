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
  var timers = {};
  var started = false;

  function O() { return window.BoardOps; }

  B.onChange = function (fn) { return O() ? O().onChange(fn) : function () {}; };
  B.state = function (id) { return O() ? O().state(id) : { mode: 'idle' }; };
  B.stats = function () { return O() ? O().stats() : { pending: 0, failed: 0, ids: [], why: '' }; };
  B.available = function () { return !!(O() && O().ready()); };

  /* Раніше тут дозволяли дошці «схуднути». Тепер стирання — звичайна дія
     в журналі, і дозволу воно не потребує. */
  B.allow = function () {};

  /** Дошка змінилася — відправити, коли вщухне. */
  B.mark = function (boardId) {
    if (!boardId || !O()) return;
    var b = S.getBoard(boardId);
    if (b) O().prepare(b);
    if (timers[boardId]) clearTimeout(timers[boardId]);
    timers[boardId] = setTimeout(function () {
      timers[boardId] = null;
      O().record(boardId);
    }, PUSH_DELAY);
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

  /** Видалено урок — прибрати й знімок його дошки. Журнал лишається. */
  B.remove = function (boardId) {
    if (O()) O().drop(boardId);
    if (!O() || !O().ready() || !boardId) return Promise.resolve(false);
    return Cloud.request('/rest/v1/boards?board_id=eq.' + encodeURIComponent(boardId),
      { method: 'DELETE' }).then(function (res) { return res.ok; })
      .catch(function () { return false; });
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
      .then(function () { return B.pullAll(); })
      .then(function () { return B.syncMissing(); })
      .then(function () { sweepLater(20000); })
      .catch(function (e) { console.warn('Дошки:', e && e.message); });

    window.addEventListener('online', function () { O().flush(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') O().flush();
      else { B.pullAll(); sweepLater(15000); }
    });
  };

  window.BoardSync = B;
})();
