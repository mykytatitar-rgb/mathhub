/* Синхронізація дошок — кожної окремо від решти бази.

   Навіщо окремо. Досі вся база їхала на сервер одним документом, і дошки
   були його частиною. Кожен штрих означав «перепиши все цілком», тож дошку
   могла забрати помилка в зовсім іншому місці, а пристрій із давніми даними
   приносив старе про все одразу.

   Тепер у кожної дошки власний рядок на сервері й власний номер версії.
   Запис дошки не торкається учнів і фінансів, а запис бази не торкається
   дошок. Зіткнення двох пристроїв теж стає меншим: воно стосується однієї
   дошки, а не всього.

   Правило те саме, що й у решті синхронізації: інтерфейс ніколи не чекає на
   мережу. Дошка зберігається локально одразу, а сюди лише потрапляє
   позначка «цю треба відправити». Немає інтернету — позначка чекає й
   переживає перезавантаження сторінки. */

(function () {
  'use strict';

  var U = window.U, S = window.S;
  var B = {};

  var REVS = 'mathhub.boards.rev';       // {boardId: rev} — від якої версії ми відштовхуємось
  var PENDING = 'mathhub.boards.pending'; // що не встигло поїхати
  var PUSH_DELAY = 900;

  var revs = {};
  var pending = {};
  var timers = {};
  var busy = {};
  var started = false;

  /* ============================================================
     Дрібний облік
     ============================================================ */

  function loadState() {
    try { revs = JSON.parse(localStorage.getItem(REVS) || '{}') || {}; } catch (e) { revs = {}; }
    try { pending = JSON.parse(localStorage.getItem(PENDING) || '{}') || {}; } catch (e) { pending = {}; }
  }

  function saveState() {
    try {
      localStorage.setItem(REVS, JSON.stringify(revs));
      localStorage.setItem(PENDING, JSON.stringify(pending));
    } catch (e) { /* сховище переповнене — переживемо, дані вже в базі */ }
  }

  function ready() {
    return !!(window.Cloud && Cloud.available() && Cloud.signedIn());
  }

  /** Скільки об'єктів на дошці — тією ж міркою, що й на сервері. */
  function items(board) {
    var n = 0;
    ((board && board.slides) || []).forEach(function (s) { n += (s.items || []).length; });
    return n;
  }

  function device() {
    try { return (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || ''; }
    catch (e) { return ''; }
  }

  /* ============================================================
     Відправлення
     ============================================================ */

  /** Дошка змінилася — відправити її, коли вщухне. */
  B.mark = function (boardId) {
    if (!boardId) return;
    pending[boardId] = 1;
    saveState();
    if (!ready()) return;
    if (timers[boardId]) clearTimeout(timers[boardId]);
    timers[boardId] = setTimeout(function () {
      timers[boardId] = null;
      B.push(boardId);
    }, PUSH_DELAY);
  };

  /**
   * Відправити одну дошку.
   *
   * Відповідь -1 означає, що на сервері вже новіша версія: забираємо її й
   * пробуємо ще раз, один раз. -2 означає, що наш запис знищив би те, що
   * там лежить, — тоді перемагає сервер, а наша версія лишається в історії
   * дошки, звідки її можна повернути кнопкою.
   */
  B.push = function (boardId, retried) {
    if (!ready() || !boardId) return Promise.resolve(false);
    if (busy[boardId]) return busy[boardId];

    var board = S.getBoard(boardId);
    if (!board) return Promise.resolve(false);

    var p = Cloud.request('/rest/v1/rpc/save_board', {
      method: 'POST',
      body: JSON.stringify({
        p_board: boardId,
        p_rev: revs[boardId] || 0,
        p_data: board,
        p_device: device()
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('Сервер відповів ' + res.status);
      return res.json();
    }).then(function (rev) {
      busy[boardId] = null;

      if (rev === -1) {
        if (retried) return false;                 // не крутимося по колу
        return B.pull(boardId).then(function () { return B.push(boardId, true); });
      }

      if (rev === -2) {
        /* Сервер не пустив запис, бо він забрав би записане. Наша версія не
           зникає: вона вже лежить в історії дошки. */
        return keepThenTake(boardId, board);
      }

      revs[boardId] = rev;
      delete pending[boardId];
      saveState();
      return true;
    }).catch(function (e) {
      busy[boardId] = null;
      // лишаємо в черзі: поїде при наступній нагоді
      console.warn('Дошка не відправилась:', boardId, e && e.message);
      return false;
    });

    busy[boardId] = p;
    return p;
  };

  /** Відкласти свою версію в історію й узяти серверну. */
  function keepThenTake(boardId, mine) {
    var keep = (window.BoardHistory && BoardHistory.available())
      ? BoardHistory.save(boardId, mine) : Promise.resolve(false);
    return keep.then(function () {
      return B.pull(boardId, true);
    }).then(function () {
      delete pending[boardId];
      saveState();
      U.toast('На сервері була повніша версія дошки. Свою можна повернути через «Історія»', 'ok');
      return false;
    });
  }

  /** Усе, що чекає в черзі. Викликається при вході й коли зʼявляється мережа. */
  B.flush = function () {
    if (!ready()) return Promise.resolve(0);
    var ids = Object.keys(pending);
    var done = 0;
    return ids.reduce(function (chain, id) {
      return chain.then(function () {
        return B.push(id).then(function (ok) { if (ok) done++; });
      });
    }, Promise.resolve()).then(function () { return done; });
  };

  /* ============================================================
     Читання
     ============================================================ */

  /**
   * Забрати одну дошку з сервера.
   *
   * force — коли серверна версія має перемогти беззастережно (після -2).
   * Без нього діє правило: серверне не має права виявитися біднішим за наше.
   * Інакше давній рядок на сервері стирав би щойно намальоване.
   */
  B.pull = function (boardId, force) {
    if (!ready() || !boardId) return Promise.resolve(false);
    return Cloud.request('/rest/v1/boards?select=board_id,rev,data,updated_at&board_id=eq.' +
        encodeURIComponent(boardId), { method: 'GET' })
      .then(function (res) {
        if (!res.ok) throw new Error('Сервер відповів ' + res.status);
        return res.json();
      })
      .then(function (rows) { return apply(rows && rows[0], force); })
      .catch(function (e) {
        console.warn('Дошку не вдалося прочитати:', boardId, e && e.message);
        return false;
      });
  };

  /** Усі дошки з сервера — при вході й при старті. */
  B.pullAll = function () {
    if (!ready()) return Promise.resolve(0);
    return Cloud.request('/rest/v1/boards?select=board_id,rev,data,updated_at', { method: 'GET' })
      .then(function (res) {
        if (!res.ok) throw new Error('Сервер відповів ' + res.status);
        return res.json();
      })
      .then(function (rows) {
        var n = 0;
        (rows || []).forEach(function (row) { if (apply(row, false)) n++; });
        return n;
      })
      .catch(function (e) {
        console.warn('Дошки не вдалося прочитати:', e && e.message);
        return 0;
      });
  };

  /** Покласти серверний рядок у базу, якщо він має на це право. */
  function apply(row, force) {
    if (!row || !row.data) return false;
    var id = row.board_id;
    var mine = S.getBoard(id);

    // наша ще не поїхала — вона новіша за визначенням
    if (!force && pending[id] && mine) return false;

    if (mine && !force && items(row.data) < items(mine)) {
      /* Серверна бідніша за нашу. Не беремо: саме так виглядала б втрата.
         Натомість ставимо в чергу свою — хай сервер вирішує за своїм правилом. */
      pending[id] = 1;
      saveState();
      return false;
    }

    var incoming = row.data;
    incoming.lessonId = id;
    if (!incoming.id) incoming.id = (mine && mine.id) || U.uid('brd');

    var all = S.db().boards;
    var i = all.findIndex(function (b) { return b.lessonId === id; });
    if (i >= 0) all[i] = incoming; else all.push(incoming);

    revs[id] = row.rev;
    delete pending[id];
    saveState();
    S.touchBoards();
    S.save();
    return true;
  }

  /* ============================================================
     Видалення
     ============================================================ */

  B.remove = function (boardId) {
    delete pending[boardId];
    delete revs[boardId];
    saveState();
    if (!ready() || !boardId) return Promise.resolve(false);
    return Cloud.request('/rest/v1/boards?board_id=eq.' + encodeURIComponent(boardId),
      { method: 'DELETE' }).then(function (res) { return res.ok; })
      .catch(function () { return false; });
  };

  /* ============================================================
     Стан для панелі «Чи все ціле»
     ============================================================ */

  B.stats = function () {
    return { pending: Object.keys(pending).length, known: Object.keys(revs).length };
  };

  B.available = function () { return ready(); };

  /* ============================================================
     Старт
     ============================================================ */

  B.start = function () {
    if (started) return;
    started = true;
    loadState();

    if (!ready()) return;
    // спершу віддаємо своє, потім забираємо чуже: так свіже не перекривається
    B.flush().then(function () { return B.pullAll(); }).then(function (n) {
      if (n && window.V && V.boardReload) { try { V.boardReload(); } catch (e) {} }
    });

    window.addEventListener('online', function () { B.flush(); });
  };

  window.BoardSync = B;
})();
