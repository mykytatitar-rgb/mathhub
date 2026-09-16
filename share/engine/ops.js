/* Дії над дошкою — спільна мова кабінету й сторінки учня.

   Дошку не пересилають цілком: пересилають «що змінилось» — додано обʼєкт,
   змінено, стерто, зʼявився чи зник слайд. Кожна дія називає свій обʼєкт
   за номером, тому дві людини, що пишуть одночасно, не затирають одна одну,
   а повторити вже застосовану дію безпечно.

   Тут лише чиста логіка без мережі й сховища: порахувати різницю між двома
   станами дошки й застосувати дію до стану. Кабінет і сторінка учня
   користуються однією реалізацією — і розійтися у трактуванні не можуть. */

(function () {
  'use strict';

  var K = {};

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function byId(list) {
    var m = {};
    (list || []).forEach(function (x) { if (x && x.id) m[x.id] = x; });
    return m;
  }

  /** Поля слайда, що не стосуються вмісту, — назва, фон, вид, видимість. */
  function meta(sl) {
    return { title: sl.title, bg: sl.bg, kind: sl.kind, hidden: sl.hidden, view: sl.view };
  }

  /** Чим стан now відрізняється від was. Повертає список дій, можливо порожній. */
  K.diff = function (was, now) {
    var ops = [];
    if (!now) return ops;
    was = was || { slides: [] };

    var wasSlides = byId(was.slides);
    var nowSlides = byId(now.slides);

    (was.slides || []).forEach(function (sl) {
      if (sl.id && !nowSlides[sl.id]) ops.push({ t: 's-', s: sl.id });
    });

    (now.slides || []).forEach(function (sl, index) {
      var old = sl.id ? wasSlides[sl.id] : null;
      if (!old) {
        ops.push({ t: 's+', sl: clone(sl), i: index });
        return;
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
        if (!it || !it.id) return;
        var before = wasItems[it.id];
        if (!before) ops.push({ t: 'i+', s: sl.id, it: clone(it) });
        else if (JSON.stringify(before) !== JSON.stringify(it)) ops.push({ t: 'i~', s: sl.id, it: clone(it) });
      });
    });

    return ops;
  };

  /** Застосувати дію до стану дошки. Повертає true, якщо щось змінилось. */
  K.apply = function (board, op) {
    if (!board || !op) return false;
    board.slides = board.slides || [];

    function slide(id) {
      for (var i = 0; i < board.slides.length; i++) if (board.slides[i].id === id) return board.slides[i];
      return null;
    }

    if (op.t === 's+') {
      if (!op.sl || slide(op.sl.id)) return false;
      var at = typeof op.i === 'number' ? op.i : board.slides.length;
      board.slides.splice(Math.min(at, board.slides.length), 0, clone(op.sl));
      return true;
    }

    if (op.t === 's-') {
      var idx = -1;
      for (var j = 0; j < board.slides.length; j++) if (board.slides[j].id === op.s) idx = j;
      if (idx < 0) return false;
      board.slides.splice(idx, 1);
      return true;
    }

    var sl = slide(op.s);
    if (!sl) return false;
    sl.items = sl.items || [];

    if (op.t === 's~') {
      Object.keys(op.p || {}).forEach(function (k) {
        if (op.p[k] === undefined || op.p[k] === null) delete sl[k]; else sl[k] = op.p[k];
      });
      return true;
    }

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
      sl.items.push(it);
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
