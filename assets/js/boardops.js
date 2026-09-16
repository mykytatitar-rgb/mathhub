/* Журнал дій на дошці.

   Дошка й досі зберігається цілком — це швидкий спосіб її відкрити. Але
   збереження цілком завжди означає «хай стане ось так», а отже вміє
   стирати: досить одному пристроєві мати неповну картину.

   Тут навпаки — тільки дописування. «Додано лінію», «пересунуто фігуру»,
   «видалено картинку». Щоб щось зникло, потрібен окремий запис про це, і
   він теж лишається в журналі назавжди.

   Звідси дві речі, яких не було. Перша: два пристрої, що малюють одночасно,
   більше не забирають роботу один в одного — їхні дії лягають поруч, бо
   кожна називає свій об'єкт. Друга: учень бачить малювання наживо.

   Дії не збираються всередині малювального рушія — вони виводяться
   порівнянням. Ми тримаємо копію того стану дошки, який уже відомий
   серверу, і при кожному збереженні дивимось, чим теперішній стан від неї
   відрізняється. Так журнал не залежить від того, скількома способами в
   рушії можна намалювати лінію, і не ламається, коли з'явиться новий. */

(function () {
  'use strict';

  var U = window.U, S = window.S;
  var O = {};

  var BASE = 'mathhub.ops.base';   // {boardId: JSON стану, відомого серверу}
  var SEEN = 'mathhub.ops.seen';   // {boardId: номер останньої прочитаної дії}
  var KEPT = 'mathhub.ops.kept';   // {slideId: 1} — слайди, повернуті вручну

  var base = {};
  var seen = {};
  var kept = {};
  var loaded = false;

  function load() {
    if (loaded) return;
    loaded = true;
    try { base = JSON.parse(localStorage.getItem(BASE) || '{}') || {}; } catch (e) { base = {}; }
    try { seen = JSON.parse(localStorage.getItem(SEEN) || '{}') || {}; } catch (e) { seen = {}; }
    try { kept = JSON.parse(localStorage.getItem(KEPT) || '{}') || {}; } catch (e) { kept = {}; }
  }

  function persist() {
    try {
      localStorage.setItem(BASE, JSON.stringify(base));
      localStorage.setItem(SEEN, JSON.stringify(seen));
      localStorage.setItem(KEPT, JSON.stringify(kept));
    } catch (e) { /* сховище повне — журнал переживе, дошка збережена окремо */ }
  }

  /**
   * Слайд, який людина свідомо повернула з журналу.
   *
   * У журналі лишається й та дія, якою слайд зник. Без цієї позначки вона
   * програвалася б знову при першому ж читанні — і слайд зникав би вдруге,
   * тільки-но його врятували. Тепер видалення такого слайда журнал
   * пропускає: воля людини сильніша за старий запис.
   */
  O.keep = function (slideId) {
    if (!slideId) return;
    load();
    kept[slideId] = 1;
    persist();
  };

  /** Людина видалила слайд сама — захист більше не потрібен. */
  O.unkeep = function (slideId) {
    if (!slideId) return;
    load();
    delete kept[slideId];
    persist();
  };

  function ready() {
    return !!(window.Cloud && Cloud.available() && Cloud.signedIn() &&
      !(Cloud.writesBlocked && Cloud.writesBlocked()));
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function byId(list) {
    var m = {};
    (list || []).forEach(function (x) { if (x && x.id) m[x.id] = x; });
    return m;
  }

  /* ============================================================
     Порівняння
     ============================================================ */

  /** Поля слайда, що не стосуються вмісту, — назва, фон, видимість. */
  function meta(sl) {
    return { title: sl.title, bg: sl.bg, kind: sl.kind, hidden: sl.hidden, view: sl.view };
  }

  /**
   * Чим теперішня дошка відрізняється від тієї, що відома серверу.
   * Повертає список дій — можливо, порожній.
   */
  O.diff = function (was, now) {
    var ops = [];
    if (!now) return ops;
    was = was || { slides: [] };

    var wasSlides = byId(was.slides);
    var nowSlides = byId(now.slides);

    // слайди, яких більше немає
    (was.slides || []).forEach(function (sl) {
      if (sl.id && !nowSlides[sl.id]) ops.push({ t: 's-', s: sl.id });
    });

    (now.slides || []).forEach(function (sl, index) {
      var old = sl.id ? wasSlides[sl.id] : null;

      if (!old) {
        ops.push({ t: 's+', sl: clone(sl), i: index });
        return;                                   // новий слайд їде цілком
      }

      if (JSON.stringify(meta(sl)) !== JSON.stringify(meta(old))) {
        ops.push({ t: 's~', s: sl.id, p: meta(sl) });
      }

      var wasItems = byId(old.items);
      var nowItems = byId(sl.items);

      var gone = [];
      (old.items || []).forEach(function (it) {
        if (it && it.id && !nowItems[it.id]) gone.push(it.id);
      });
      if (gone.length) ops.push({ t: 'i-', s: sl.id, ids: gone });

      (sl.items || []).forEach(function (it) {
        if (!it || !it.id) return;                // без номера дію не назвати
        var before = wasItems[it.id];
        if (!before) ops.push({ t: 'i+', s: sl.id, it: clone(it) });
        else if (JSON.stringify(before) !== JSON.stringify(it)) {
          ops.push({ t: 'i~', s: sl.id, it: clone(it) });
        }
      });
    });

    return ops;
  };

  /* ============================================================
     Застосування
     ============================================================ */

  /** Виконати одну дію над дошкою. Повертає true, якщо щось змінилось. */
  O.apply = function (board, op) {
    if (!board || !op) return false;
    board.slides = board.slides || [];

    function slide(id) {
      for (var i = 0; i < board.slides.length; i++) {
        if (board.slides[i].id === id) return board.slides[i];
      }
      return null;
    }

    if (op.t === 's+') {
      if (slide(op.sl && op.sl.id)) return false;          // уже є
      var at = (typeof op.i === 'number') ? op.i : board.slides.length;
      board.slides.splice(Math.min(at, board.slides.length), 0, clone(op.sl));
      return true;
    }

    if (op.t === 's-') {
      load();
      if (kept[op.s]) return false;          // цей слайд повернули вручну
      var i = board.slides.findIndex(function (x) { return x.id === op.s; });
      if (i < 0) return false;
      board.slides.splice(i, 1);
      if (!board.slides.length) board.slides.push(S.newSlide());
      return true;
    }

    var sl = slide(op.s);
    if (!sl) return false;
    sl.items = sl.items || [];

    if (op.t === 's~') {
      Object.keys(op.p || {}).forEach(function (k) {
        if (op.p[k] === undefined) delete sl[k]; else sl[k] = op.p[k];
      });
      return true;
    }

    if (op.t === 'i-') {
      var kill = {};
      (op.ids || []).forEach(function (id) { kill[id] = 1; });
      var before = sl.items.length;
      sl.items = sl.items.filter(function (it) { return !kill[it && it.id]; });
      return sl.items.length !== before;
    }

    if (op.t === 'i+' || op.t === 'i~') {
      var it = clone(op.it);
      if (!it || !it.id) return false;
      var at2 = sl.items.findIndex(function (x) { return x && x.id === it.id; });
      if (at2 >= 0) sl.items[at2] = it; else sl.items.push(it);
      return true;
    }

    return false;
  };

  /* ============================================================
     Відправлення
     ============================================================ */

  /**
   * Записати в журнал те, чим дошка відрізняється від відомої серверу.
   *
   * Копію «відомого» оновлюємо лише після вдалої відправки: якщо зв'язку
   * немає, наступного разу різниця порахується від того самого місця, і
   * жодна дія не загубиться.
   */
  O.record = function (boardId, board) {
    load();
    if (!boardId || !board) return Promise.resolve(0);

    var was = base[boardId] ? JSON.parse(base[boardId]) : null;

    /* Першої копії ще немає — це не привід оголошувати всю дошку новою.
       Просто запам'ятовуємо теперішній стан як відправну точку. */
    if (!was) {
      base[boardId] = JSON.stringify(strip(board));
      persist();
      return Promise.resolve(0);
    }

    var ops = O.diff(was, board);
    if (!ops.length) return Promise.resolve(0);

    /* Живий канал отримує різницю одразу, ще до запису в журнал: учень
       бачить штрих у ту ж мить. Дії в каналі безпечно отримати й двічі —
       кожна називає свій обʼєкт, тож повтор нічого не подвоює. */
    if (O.onDiff) {
      try { O.onDiff(boardId, ops); } catch (e) { console.warn('onDiff:', e); }
    }

    if (!ready()) return Promise.resolve(0);      // без зв'язку різниця почекає

    var snapshot = JSON.stringify(strip(board));
    return Cloud.request('/rest/v1/rpc/append_board_ops', {
      method: 'POST',
      body: JSON.stringify({ p_board: boardId, p_ops: ops })
    }).then(function (res) {
      if (!res.ok) throw new Error('Сервер відповів ' + res.status);
      return res.json();
    }).then(function (lastId) {
      base[boardId] = snapshot;
      if (lastId) seen[boardId] = Math.max(seen[boardId] || 0, lastId);
      persist();
      return ops.length;
    }).catch(function (e) {
      console.warn('Дії не потрапили в журнал:', e && e.message);
      return 0;
    });
  };

  /** Для порівняння потрібен лише вміст: службові поля тільки заважають. */
  function strip(board) {
    return { slides: (board.slides || []).map(function (sl) {
      return { id: sl.id, title: sl.title, bg: sl.bg, kind: sl.kind, hidden: sl.hidden,
               view: sl.view, items: sl.items || [] };
    }) };
  }

  /* ============================================================
     Читання
     ============================================================ */

  /**
   * Забрати чужі дії й накласти їх на дошку.
   *
   * Свої дії теж повертаються з сервера, але вони вже застосовані —
   * повторне накладання нічого не змінює, бо дія називає кінцевий стан
   * об'єкта, а не зсув від попереднього.
   */
  O.pull = function (boardId, board) {
    load();
    if (!ready() || !boardId || !board) return Promise.resolve(0);

    var after = seen[boardId] || 0;
    return Cloud.request('/rest/v1/board_ops?select=id,op,author&board=eq.' +
        encodeURIComponent(boardId) + '&id=gt.' + after + '&order=id.asc&limit=2000',
        { method: 'GET' })
      .then(function (res) {
        if (!res.ok) throw new Error('Сервер відповів ' + res.status);
        return res.json();
      })
      .then(function (rows) {
        if (!rows || !rows.length) return 0;

        /* Ті самі дії накладаємо двічі: на дошку перед очима і на копію
           «що відомо серверу».

           Спокусливо було б після цього просто оголосити теперішню дошку
           відомою серверу — але тоді все, що людина намалювала й ще не
           встигла зберегти, вважалося б уже відправленим і не поїхало б
           ніколи. Тому копія живе своїм життям і знає рівно те, що справді
           лежить у журналі. */
        var known = base[boardId] ? JSON.parse(base[boardId]) : { slides: [] };

        var changed = 0;
        rows.forEach(function (row) {
          if (O.apply(board, row.op)) changed++;
          O.apply(known, row.op);
          seen[boardId] = Math.max(seen[boardId] || 0, row.id);
        });

        base[boardId] = JSON.stringify(strip(known));
        persist();
        return changed;
      })
      .catch(function (e) {
        console.warn('Журнал дошки не прочитався:', e && e.message);
        return 0;
      });
  };

  /**
   * Зібрати дошку з усього журналу — від найпершої дії.
   *
   * Це рятувальний інструмент, а не звичайне читання. Журнал на сервері
   * лише дописується, тож у ньому лежить кожен слайд, який колись існував,
   * разом із вмістом. Тому видалення тут навмисно пропускаються: питання не
   * «як дошка виглядає зараз», а «що на ній колись було».
   *
   * Саме це рятує випадок, коли слайд зник не від руки людини: у журналі
   * лишився і його «народився», і все, що на ньому малювали.
   */
  O.rebuild = function (boardId) {
    if (!ready() || !boardId) return Promise.resolve(null);

    var out = { slides: [] };
    var seenOps = 0;

    function page(after) {
      return Cloud.request('/rest/v1/board_ops?select=id,op&board=eq.' +
          encodeURIComponent(boardId) + '&id=gt.' + after + '&order=id.asc&limit=2000',
          { method: 'GET' })
        .then(function (res) {
          if (!res.ok) throw new Error('Сервер відповів ' + res.status);
          return res.json();
        })
        .then(function (rows) {
          if (!rows || !rows.length) return out;
          var last = after;
          rows.forEach(function (row) {
            var op = row.op;
            last = row.id;
            seenOps++;
            if (!op || op.t === 's-' || op.t === 'i-') return;   // втрачене не ховаємо
            O.apply(out, op);
          });
          return rows.length < 2000 ? out : page(last);
        });
    }

    return page(0)
      .then(function (b) {
        b.ops = seenOps;
        return b;
      })
      .catch(function (e) {
        console.warn('Журнал не зібрався:', e && e.message);
        return null;
      });
  };

  /** Забути дошку, якої більше немає. */
  O.drop = function (boardId) {
    load();
    delete base[boardId];
    delete seen[boardId];
    persist();
  };

  /** Скільки дій прочитано — для панелі стану. */
  O.seenAt = function (boardId) { load(); return seen[boardId] || 0; };

  window.BoardOps = O;
})();
