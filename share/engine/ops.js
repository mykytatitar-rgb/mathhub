/* Дії над дошкою — спільна мова кабінету й сторінки учня.

   Дошку не пересилають цілком: пересилають «що змінилось» — додано обʼєкт,
   змінено, стерто, зʼявився чи зник слайд, змінився порядок. Кожна дія
   називає свій обʼєкт за номером і кінцевий стан, а не зсув від
   попереднього. Тому дві людини, що пишуть одночасно, не затирають одна
   одну, а повторити вже застосовану дію безпечно.

   Тут лише чиста логіка без мережі й сховища: порахувати різницю між двома
   станами дошки й застосувати дію до стану. Кабінет і сторінка учня
   користуються однією реалізацією — і розійтися у трактуванні не можуть.

   Види дій:
     s+ / s- / s~  — слайд зʼявився, зник, змінив назву, фон чи видимість;
     so            — новий порядок слайдів;
     i+ / i~ / i-  — обʼєкт на слайді додано, змінено, стерто;
     io            — новий порядок обʼєктів на слайді (що над чим);
     b~            — властивості самої дошки (посилання для учня тощо).
   Невідомий вид старіша сторінка просто пропускає. */

(function () {
  'use strict';

  var K = {};

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  K.clone = clone;

  function byId(list) {
    var m = {};
    (list || []).forEach(function (x) { if (x && x.id) m[x.id] = x; });
    return m;
  }

  /* Поля дошки, що не є її вмістом: номери, службові мітки, час запису.
     Усе інше на рівні дошки (посилання для учня тощо) — вміст, і його
     зміна теж іде дією. */
  var NOT_PROPS = { slides: 1, id: 1, lessonId: 1, createdAt: 1, updatedAt: 1 };
  function isProp(k) { return !NOT_PROPS[k] && k.charAt(0) !== '_'; }
  K.isProp = isProp;

  /** Вміст дошки без службового: слайди й властивості. */
  K.strip = function (board) {
    var out = { slides: [] };
    if (!board) return out;
    Object.keys(board).forEach(function (k) { if (isProp(k)) out[k] = clone(board[k]); });
    out.slides = (board.slides || []).map(function (sl) {
      var s = clone(sl);
      s.items = s.items || [];
      return s;
    });
    return out;
  };

  /** Поля слайда, що не стосуються вмісту, — назва, фон, вид, видимість. */
  function meta(sl) {
    return { title: sl.title, bg: sl.bg, kind: sl.kind, hidden: sl.hidden, view: sl.view };
  }

  /** Чи йдуть спільні елементи двох списків в одному порядку. */
  function sameOrder(a, b, inA, inB) {
    var x = a.filter(function (v) { return v && v.id && inB[v.id]; });
    var y = b.filter(function (v) { return v && v.id && inA[v.id]; });
    if (x.length !== y.length) return false;
    for (var i = 0; i < x.length; i++) if (x[i].id !== y[i].id) return false;
    return true;
  }

  /** Чим стан now відрізняється від was. Повертає список дій, можливо порожній. */
  K.diff = function (was, now) {
    var ops = [];
    if (!now) return ops;
    was = was || { slides: [] };
    var wasList = was.slides || [], nowList = now.slides || [];

    // властивості самої дошки
    var p = {}, pn = 0;
    var keys = {};
    Object.keys(was).forEach(function (k) { if (isProp(k)) keys[k] = 1; });
    Object.keys(now).forEach(function (k) { if (isProp(k)) keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      if (JSON.stringify(was[k]) === JSON.stringify(now[k])) return;
      p[k] = now[k] === undefined ? null : clone(now[k]);
      pn++;
    });
    if (pn) ops.push({ t: 'b~', p: p });

    var wasSlides = byId(wasList);
    var nowSlides = byId(nowList);

    wasList.forEach(function (sl) {
      if (sl && sl.id && !nowSlides[sl.id]) ops.push({ t: 's-', s: sl.id });
    });

    nowList.forEach(function (sl, index) {
      if (!sl) return;
      var old = sl.id ? wasSlides[sl.id] : null;
      if (!old) {
        ops.push({ t: 's+', sl: clone(sl), i: index });
        return;
      }

      if (JSON.stringify(meta(sl)) !== JSON.stringify(meta(old))) {
        // null, а не undefined: інакше «прибрав вигляд» губився б при пересиланні
        var m = meta(sl);
        Object.keys(m).forEach(function (k) { if (m[k] === undefined) m[k] = null; });
        ops.push({ t: 's~', s: sl.id, p: m });
      }

      var oldItems = old.items || [], nowItems = sl.items || [];
      var wasItems = byId(oldItems);
      var hasItems = byId(nowItems);

      var gone = [];
      oldItems.forEach(function (it) {
        if (it && it.id && !hasItems[it.id]) gone.push(it.id);
      });
      if (gone.length) ops.push({ t: 'i-', s: sl.id, ids: gone });

      nowItems.forEach(function (it, at) {
        if (!it || !it.id) return;
        var before = wasItems[it.id];
        if (!before) ops.push({ t: 'i+', s: sl.id, it: clone(it), at: at });
        else if (JSON.stringify(before) !== JSON.stringify(it)) ops.push({ t: 'i~', s: sl.id, it: clone(it) });
      });

      // що над чим: без цього «на передній план» лишався б лише тут
      if (!sameOrder(oldItems, nowItems, wasItems, hasItems)) {
        ops.push({ t: 'io', s: sl.id, ids: nowItems.map(function (it) { return it && it.id; }).filter(Boolean) });
      }
    });

    // порядок слайдів: перетягнутий слайд має стати на те саме місце всюди
    if (!sameOrder(wasList, nowList, wasSlides, nowSlides)) {
      ops.push({ t: 'so', ids: nowList.map(function (s) { return s && s.id; }).filter(Boolean) });
    }

    return ops;
  };

  /* Переставити елементи списку за порядком ids. Ті, кого в ids немає
     (додані деінде), лишаються на своїх місцях. */
  function reorder(list, ids) {
    var pos = {};
    (ids || []).forEach(function (id, i) { pos[id] = i; });
    var named = list.filter(function (x) { return x && pos[x.id] != null; });
    named.sort(function (a, b) { return pos[a.id] - pos[b.id]; });
    var k = 0, changed = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && pos[list[i].id] != null) {
        if (list[i] !== named[k]) changed = true;
        list[i] = named[k++];
      }
    }
    return changed;
  }

  /** Застосувати дію до стану дошки. Повертає true, якщо щось змінилось. */
  K.apply = function (board, op) {
    if (!board || !op) return false;
    board.slides = board.slides || [];

    function slide(id) {
      for (var i = 0; i < board.slides.length; i++) if (board.slides[i] && board.slides[i].id === id) return board.slides[i];
      return null;
    }

    if (op.t === 'b~') {
      var any = false;
      Object.keys(op.p || {}).forEach(function (k) {
        if (!isProp(k)) return;
        var v = op.p[k];
        if (v === null || v === undefined) { if (k in board) { delete board[k]; any = true; } }
        else if (JSON.stringify(board[k]) !== JSON.stringify(v)) { board[k] = clone(v); any = true; }
      });
      return any;
    }

    if (op.t === 's+') {
      if (!op.sl) return false;
      var have = slide(op.sl.id);
      if (!have) {
        var at = typeof op.i === 'number' ? op.i : board.slides.length;
        var fresh = clone(op.sl);
        fresh.items = fresh.items || [];
        board.slides.splice(Math.max(0, Math.min(at, board.slides.length)), 0, fresh);
        return true;
      }
      /* Такий слайд уже є: його створили на двох пристроях одночасно (так
         буває з першим слайдом нової дошки). Не відкидаємо — зливаємо:
         усе, що принесла ця дія, лягає поруч із тим, що вже є. */
      var got = false;
      have.items = have.items || [];
      (op.sl.items || []).forEach(function (it, n) {
        if (K.apply(board, { t: 'i+', s: have.id, it: it, at: n })) got = true;
      });
      return got;
    }

    if (op.t === 's-') {
      var idx = -1;
      for (var j = 0; j < board.slides.length; j++) if (board.slides[j] && board.slides[j].id === op.s) idx = j;
      if (idx < 0) return false;
      board.slides.splice(idx, 1);
      return true;
    }

    if (op.t === 'so') return reorder(board.slides, op.ids);

    var sl = slide(op.s);
    if (!sl) return false;
    sl.items = sl.items || [];

    if (op.t === 's~') {
      var ch = false;
      Object.keys(op.p || {}).forEach(function (k) {
        var v = op.p[k];
        if (v === undefined || v === null) { if (k in sl) { delete sl[k]; ch = true; } }
        else if (JSON.stringify(sl[k]) !== JSON.stringify(v)) { sl[k] = clone(v); ch = true; }
      });
      return ch;
    }

    if (op.t === 'io') return reorder(sl.items, op.ids);

    if (op.t === 'i-') {
      var kill = {};
      (op.ids || []).forEach(function (id) { kill[id] = 1; });
      var n0 = sl.items.length;
      sl.items = sl.items.filter(function (it) { return !kill[it && it.id]; });
      return sl.items.length !== n0;
    }

    if (op.t === 'i+' || op.t === 'i~') {
      var it = clone(op.it);
      if (!it || !it.id) return false;
      for (var q = 0; q < sl.items.length; q++) {
        if (sl.items[q] && sl.items[q].id === it.id) {
          if (JSON.stringify(sl.items[q]) === JSON.stringify(it)) return false;
          sl.items[q] = it;
          return true;
        }
      }
      if (typeof op.at === 'number' && op.at < sl.items.length) sl.items.splice(Math.max(0, op.at), 0, it);
      else sl.items.push(it);
      return true;
    }

    return false;
  };

  /**
   * Чи може ця дія належати учневі.
   *
   * Учень додає, змінює й стирає лише власне. Сервер перевіряє це сам, але
   * й кабінет не вірить журналу наосліп: стара база без перевірки чи чуже
   * посилання не мають змоги зіпсувати дошку репетитора.
   * owned(id) — чи є обʼєкт із таким номером учнівським у поточному стані.
   */
  K.studentAllowed = function (op, owned) {
    if (!op) return false;
    if (op.t === 'i+' || op.t === 'i~') {
      return !!(op.it && op.it.id && op.it.by === 'student' && owned(op.it.id) !== false);
    }
    if (op.t === 'i-') {
      return (op.ids || []).every(function (id) { return owned(id) !== false; });
    }
    return false;
  };

  window.BoardCore = K;
})();
