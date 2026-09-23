/* Компоненти інтерфейсу */
(function () {
  'use strict';

  var U = window.U, S = window.S, icon = window.icon;
  var C = {};

  /* ============================================================
     Дрібні елементи
     ============================================================ */

  C.avatar = function (student, size) {
    var s = size || 40;
    var color = (student && student.color) || '#1358F5';
    var name = (student && student.name) || '?';
    return '<div class="avatar avatar--' + s + '" style="background:' + color + '">' +
      U.esc(U.initials(name)) + '</div>';
  };

  C.badge = function (text, kind, iconName) {
    return '<span class="badge' + (kind ? ' ' + kind : '') + '">' +
      (iconName ? icon(iconName, 13) : '') + U.esc(text) + '</span>';
  };

  C.lessonBadge = function (status) {
    var cfg = S.LESSON_STATUS[status] || S.LESSON_STATUS.planned;
    return C.badge(cfg.label, cfg.badge);
  };

  C.hwBadge = function (status) {
    var cfg = S.HW_STATUS[status] || S.HW_STATUS.assigned;
    return C.badge(cfg.label, cfg.badge);
  };

  /**
   * Бейдж балансу: борг червоним, запас зеленим.
   *
   * «Оплачено» тут — це гроші наперед, а не позначка на якомусь уроці.
   * Раніше писало просто «3 уроки оплачено», і це збивало: попереду урок,
   * за який не платили, а картка каже, що оплачено. Тепер сказано, що це
   * аванс; а якщо запас лише через уроки, які відбулись і не відмічені
   * проведеними, — так і написано, бо це не гроші наперед, а незакритий
   * облік.
   *
   * stat — те, що дає S.studentStats: беремо з нього credit і unmarked.
   */
  C.balanceBadge = function (balance, price, cur, stat) {
    if (balance < -0.005) return C.badge('Борг ' + U.money(-balance, cur), 'badge--red', 'alert');

    var credit = stat && stat.credit != null ? stat.credit : balance;
    var unmarked = (stat && stat.unmarked) || 0;

    if (price > 0 && credit >= price) {
      var left = Math.floor(credit / price);
      return C.badge('Наперед: ' + U.pl(left, 'урок', 'уроки', 'уроків'), 'badge--green', 'check');
    }
    if (unmarked) {
      return C.badge(U.pl(unmarked, 'урок не відмічено', 'уроки не відмічено', 'уроків не відмічено'),
        'badge--amber', 'alert');
    }
    return C.badge('Оплата вчасно', 'badge--grey');
  };

  C.bar = function (value, kind) {
    var v = U.clamp(Number(value) || 0, 0, 100);
    var k = kind || (v >= 75 ? 'bar--green' : v >= 45 ? '' : v >= 25 ? 'bar--amber' : 'bar--red');
    return '<div class="bar ' + k + '"><div class="bar__fill" style="width:' + v + '%"></div></div>';
  };

  /** Кільце прогресу. */
  /* Кольори секторів. Беремо не кольори учнів: два учні можуть мати
     однаковий, і на діаграмі сектори злилися б в один. */
  C.PIE_COLORS = ['#4B3FDB', '#9333EA', '#12A268', '#E07C0B', '#DC3F49',
                  '#6355EE', '#0EA5A5', '#B06A10', '#7C3AED', '#0F766E'];

  /**
   * Кільцева діаграма з підписами.
   * slices: [{label, value, color}] — від'ємні й нульові відкидаються.
   * Повертає '' , якщо показувати нема чого: порожнє коло гірше за
   * відсутність блоку.
   */
  C.donut = function (slices, opts) {
    opts = opts || {};
    var list = (slices || []).filter(function (s) { return Number(s.value) > 0; });
    if (!list.length) return '';

    var total = list.reduce(function (a, s) { return a + Number(s.value); }, 0);
    if (!(total > 0)) return '';

    /* Дрібні сектори не читаються й засмічують підписи, тому все, що менше
       за поріг, зводимо в одне «інші». */
    var minShare = opts.minShare == null ? 0.03 : opts.minShare;
    var big = list.filter(function (s) { return s.value / total >= minShare; });
    var small = list.filter(function (s) { return s.value / total < minShare; });
    big.sort(function (a, b) { return b.value - a.value; });
    if (small.length > 1) {
      big.push({
        label: 'Інші · ' + small.length,
        value: small.reduce(function (a, s) { return a + Number(s.value); }, 0),
        color: '#AAA8C2'
      });
    } else if (small.length === 1) {
      big.push(small[0]);
    }

    var sz = opts.size || 168;
    var sw = opts.stroke || 26;
    var r = (sz - sw) / 2;
    var circ = 2 * Math.PI * r;

    var at = 0;
    var arcs = big.map(function (s, i) {
      var frac = s.value / total;
      var col = s.color || C.PIE_COLORS[i % C.PIE_COLORS.length];
      var seg = '<circle cx="' + sz / 2 + '" cy="' + sz / 2 + '" r="' + r + '" fill="none" ' +
        'stroke="' + col + '" stroke-width="' + sw + '" ' +
        // проміжок між секторами — щоб сусідні кольори не зливалися
        'stroke-dasharray="' + Math.max(0, circ * frac - 2).toFixed(2) + ' ' + circ.toFixed(2) + '" ' +
        'stroke-dashoffset="' + (-circ * at).toFixed(2) + '" ' +
        'transform="rotate(-90 ' + sz / 2 + ' ' + sz / 2 + ')"><title>' +
        U.esc(s.label + ' — ' + (frac < 0.005 ? '<1' : Math.round(frac * 100)) + '%') +
        '</title></circle>';
      s._col = col;
      // «0%» читається як помилка, хоча сума є — тому дрібне пишемо як «<1%»
      s._pct = frac > 0 && frac < 0.005 ? '<1%' : Math.round(frac * 100) + '%';
      at += frac;
      return seg;
    }).join('');

    var legend = big.map(function (s) {
      return '<div class="pie__row">' +
        '<span class="pie__dot" style="background:' + s._col + '"></span>' +
        '<span class="pie__name">' + U.esc(s.label) + '</span>' +
        '<span class="pie__pct">' + s._pct + '</span>' +
        (opts.fmt ? '<span class="pie__val">' + U.esc(opts.fmt(s.value)) + '</span>' : '') +
        '</div>';
    }).join('');

    return '<div class="pie">' +
      '<div class="pie__chart" style="width:' + sz + 'px;height:' + sz + 'px">' +
      '<svg width="' + sz + '" height="' + sz + '" role="img">' + arcs + '</svg>' +
      (opts.centerTop || opts.center
        ? '<div class="pie__mid">' +
          (opts.centerTop ? '<b>' + U.esc(opts.centerTop) + '</b>' : '') +
          (opts.center ? '<span>' + U.esc(opts.center) + '</span>' : '') +
          '</div>'
        : '') +
      '</div>' +
      '<div class="pie__legend">' + legend + '</div>' +
      '</div>';
  };

  C.ring = function (value, size, stroke, color) {
    var v = U.clamp(Number(value) || 0, 0, 100);
    var sz = size || 74, sw = stroke || 8;
    var r = (sz - sw) / 2;
    var circ = 2 * Math.PI * r;
    var off = circ * (1 - v / 100);
    var col = color || (v >= 75 ? '#17B26A' : v >= 45 ? '#1358F5' : v >= 25 ? '#F79009' : '#E5484D');
    return '<div class="ring" style="width:' + sz + 'px;height:' + sz + 'px">' +
      '<svg width="' + sz + '" height="' + sz + '">' +
      '<circle cx="' + sz / 2 + '" cy="' + sz / 2 + '" r="' + r + '" fill="none" stroke="#E3EDFF" stroke-width="' + sw + '"/>' +
      '<circle cx="' + sz / 2 + '" cy="' + sz / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" ' +
      'stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg><div class="ring__val">' + Math.round(v) + '%</div></div>';
  };

  C.empty = function (iconName, title, text, actionHtml) {
    return '<div class="empty">' +
      '<div class="empty__icon">' + icon(iconName || 'info', 28) + '</div>' +
      '<div class="empty__title">' + U.esc(title) + '</div>' +
      (text ? '<div class="empty__text">' + U.esc(text) + '</div>' : '') +
      (actionHtml || '') + '</div>';
  };

  C.stat = function (label, value, note, iconName, tone) {
    var bg = { green: 'var(--green-bg)', amber: 'var(--amber-bg)', red: 'var(--red-bg)', violet: 'var(--violet-bg)' }[tone] || 'var(--blue-50)';
    var fg = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', violet: 'var(--violet)' }[tone] || 'var(--blue-600)';
    return '<div class="stat">' +
      (iconName ? '<div class="stat__icon" style="background:' + bg + ';color:' + fg + '">' + icon(iconName, 20) + '</div>' : '') +
      '<div class="stat__label">' + U.esc(label) + '</div>' +
      '<div class="stat__value">' + value + '</div>' +
      (note ? '<div class="stat__note">' + note + '</div>' : '') +
      '</div>';
  };

  /* ============================================================
     Математичний патерн на банері
     ============================================================ */

  var FORMULAS = [
    ['a²+b²=c²', 10, 34, 27], ['sin²x+cos²x=1', 168, 62, 18],
    ['∫f(x)dx', 44, 96, 24], ['π', 300, 40, 34],
    ['D=b²−4ac', 200, 126, 20], ['√x+1', 22, 158, 22],
    ['Σ', 138, 176, 30], ['e', 268, 152, 26],
    ['x₁,₂=−b±√D/2a', 40, 216, 17], ['log₂8=3', 244, 206, 19],
    ['f′(x)', 118, 30, 21], ['lim', 336, 106, 22],
    ['y=kx+b', 158, 232, 18], ['∞', 96, 128, 26],
    ['α β γ', 292, 244, 20], ['n!', 6, 122, 22],
    ['V=πr²h', 236, 84, 17], ['C(n,k)', 320, 178, 18],
    ['tg x', 88, 196, 20], ['≠ ≤ ≥', 176, 100, 19],
    ['Δ', 8, 250, 26], ['S=½ab·sinγ', 108, 262, 17]
  ];

  var patId = 0;

  C.mathPattern = function () {
    var id = 'mp' + (++patId);
    var txt = FORMULAS.map(function (f) {
      return '<text x="' + f[1] + '" y="' + f[2] + '" font-size="' + f[3] + '">' + f[0] + '</text>';
    }).join('');
    return '<svg class="hero__pattern" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><pattern id="' + id + '" width="380" height="290" patternUnits="userSpaceOnUse">' +
      '<g fill="#ffffff" fill-opacity="0.085" font-family="Georgia, \'Times New Roman\', serif" font-style="italic">' +
      txt + '</g></pattern></defs>' +
      '<rect width="100%" height="100%" fill="url(#' + id + ')"/></svg>';
  };

  /* ============================================================
     Hero
     ============================================================ */

  /**
   * opts: { back, title, sub, avatar, actions:[{label,icon,act,solid}], short }
   */
  C.hero = function (opts) {
    var a = (opts.actions || []).map(function (b) {
      return '<button class="hero-btn' + (b.solid ? ' hero-btn--solid' : '') + '" data-act="' + b.act + '"' +
        (b.arg ? ' data-arg="' + U.esc(b.arg) + '"' : '') + '>' +
        (b.icon ? icon(b.icon, 17) : '') + U.esc(b.label) + '</button>';
    }).join('');

    return '<div class="hero' + (opts.short ? ' hero--short' : '') +
      (opts.tight ? ' hero--tight' : '') + '">' +
      C.mathPattern() +
      '<div class="hero__inner">' +
      (opts.back ? '<button class="hero__back" data-act="' + opts.back.act + '"' +
        (opts.back.arg ? ' data-arg="' + U.esc(opts.back.arg) + '"' : '') + '>' +
        icon('arrowLeft', 18) + U.esc(opts.back.label) + '</button>' : '') +
      '<div class="hero__row">' +
      (opts.avatar || '') +
      '<div><h1 class="hero__title">' + U.esc(opts.title) + '</h1>' +
      (opts.sub ? '<div class="hero__sub">' + U.esc(opts.sub) + '</div>' : '') + '</div>' +
      (a ? '<div class="hero__actions">' + a + '</div>' : '') +
      '</div></div></div>';
  };

  /* ============================================================
     Рядок уроку
     ============================================================ */

  /** opts: {showStudent} */
  C.lessonRow = function (lesson, num, opts) {
    opts = opts || {};
    var st = S.get('students', lesson.studentId);
    var hw = S.db().homeworks.filter(function (h) { return h.lessonId === lesson.id; });

    var meta = [C.lessonBadge(lesson.status)];
    if (opts.showStudent && st) {
      meta.push('<span class="badge" style="background:' + st.color + '1a;color:' + st.color + '">' +
        U.esc(st.name) + '</span>');
    }
    if (hw.length) meta.push(C.hwBadge(hw[0].status));
    if (lesson.notes) meta.push(C.badge('є конспект', 'badge--grey', 'note'));

    var bst = S.boardStats(lesson.id);
    if (bst && !bst.empty) {
      meta.push('<span class="board-chip">' + icon('board', 13) +
        U.pl(bst.slides, 'слайд', 'слайди', 'слайдів') + '</span>');
    }

    var row = '<div class="lesson-row" data-lesson="' + lesson.id + '">' +
      '<div class="lesson-row__num">' + (num != null ? num : icon('book', 24)) + '</div>' +
      '<div class="lesson-row__body">' +
      '<div class="lesson-row__date">' + icon('clock', 14) + U.fmtDateTime(lesson.date) +
      ' <span class="muted">· ' + U.fmtRelative(lesson.date) + '</span></div>' +
      '<div class="lesson-row__title">' + U.esc(lesson.topic || 'Урок без теми') + '</div>' +
      '<div class="lesson-row__meta">' + meta.join('') + '</div>' +
      '</div>' +
      '<button class="btn ' + (bst && !bst.empty ? 'btn--primary' : 'btn--ghost') +
      '" data-act="board-open" data-arg="' + lesson.id + '" title="Дошка уроку">' +
      icon('board', 16) + 'Дошка</button>' +
      '<button class="btn btn--soft" data-act="lesson-open" data-arg="' + lesson.id + '">' +
      'Деталі' + icon('chevronR', 16) + '</button>' +
      '</div>';

    if (!opts.withHw) return row;

    /* Домашнє завдання показуємо просто в уроці: окремої вкладки для нього
       немає, бо завдання дають саме на уроці, а не «взагалі». */
    var hwHtml = hw.map(function (h) {
      var overdue = h.status === 'assigned' && U.daysBetween(U.today(), h.dueDate) < 0;
      var sol = (h.solutions || []).length;
      return '<button class="les-hw__r" data-act="hw-edit" data-arg="' + h.id + '">' +
        '<span class="les-hw__t">' + U.esc(h.title) + '</span>' +
        '<span class="small muted">до ' + U.esc(U.fmtDate(h.dueDate)) + '</span>' +
        // головне тут — чи надіслав учень розвʼязання, а не скільки фото в завданні
        (sol ? '<span class="sol-chip">' + icon('image', 12) + sol + '</span>' : '') +
        '<span class="spacer">' + C.hwBadge(overdue ? 'skipped' : h.status) + '</span>' +
      '</button>';
    }).join('');

    return '<div class="les-wrap">' + row +
      '<div class="les-hw">' + hwHtml +
        '<button class="les-hw__add" data-act="hw-add-lesson" data-arg="' + lesson.id + '">' +
        icon('plus', 14) + (hw.length ? 'Ще завдання' : 'Задати домашнє') + '</button>' +
      '</div>' +
    '</div>';
  };

  /* ============================================================
     Модалки
     ============================================================ */

  var modalStack = [];

  /**
   * opts: { title, sub, body, wide, buttons: [{label, kind, act, close}], onMount(root, close) }
   * Повертає функцію закриття.
   */
  C.modal = function (opts) {
    var root = document.getElementById('modal-root');
    root.hidden = false;

    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;padding:24px';

    var btns = (opts.buttons || []).map(function (b) {
      return '<button class="btn ' + (b.kind || 'btn--ghost') + '" data-mb="' + U.esc(b.act || '') + '">' +
        (b.icon ? icon(b.icon, 16) : '') + U.esc(b.label) + '</button>';
    }).join('');

    wrap.innerHTML =
      '<div class="modal__scrim" data-close="1"></div>' +
      '<div class="modal' + (opts.wide ? ' modal--wide' : '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal__head"><div style="flex:1;min-width:0">' +
      '<h2 class="modal__title">' + U.esc(opts.title) + '</h2>' +
      (opts.sub ? '<div class="modal__sub">' + U.esc(opts.sub) + '</div>' : '') +
      '</div><button class="icon-btn" data-close="1" aria-label="Закрити">' + icon('x', 20) + '</button></div>' +
      '<div class="modal__body">' + (opts.body || '') + '</div>' +
      (btns ? '<div class="modal__foot">' + btns + '</div>' : '') +
      '</div>';

    root.appendChild(wrap);

    function close() {
      wrap.remove();
      var i = modalStack.indexOf(close);
      if (i >= 0) modalStack.splice(i, 1);
      if (!root.children.length) root.hidden = true;
    }
    modalStack.push(close);

    U.$$('[data-close]', wrap).forEach(function (el) {
      el.addEventListener('click', close);
    });

    (opts.buttons || []).forEach(function (b) {
      var el = wrap.querySelector('[data-mb="' + (b.act || '') + '"]');
      if (!el) return;
      el.addEventListener('click', function () {
        var keep = b.onClick ? b.onClick(wrap, close) : undefined;
        if (b.close !== false && keep !== false) close();
      });
    });

    if (opts.onMount) opts.onMount(wrap, close);

    var first = wrap.querySelector('input, textarea, select');
    if (first) setTimeout(function () { first.focus(); }, 60);

    return close;
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalStack.length) {
      modalStack[modalStack.length - 1]();
    }
  });

  /** Підтвердження дії. */
  C.confirm = function (title, text, onYes, yesLabel) {
    C.modal({
      title: title,
      body: '<p style="line-height:1.6;color:var(--ink-2);margin:6px 0 18px">' + U.esc(text) + '</p>',
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'no' },
        { label: yesLabel || 'Так, видалити', kind: 'btn--danger', act: 'yes', onClick: onYes }
      ]
    });
  };

  /* ============================================================
     Форми — збирання значень
     ============================================================ */

  /** Зчитати всі [name] всередині контейнера у простий об'єкт. */
  C.readForm = function (root) {
    var out = {};
    U.$$('[name]', root).forEach(function (el) {
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'number') out[el.name] = el.value === '' ? null : Number(el.value);
      else out[el.name] = el.value.trim();
    });
    return out;
  };

  C.field = function (label, inputHtml, hint) {
    return '<div class="field"><label class="field__label">' + U.esc(label) + '</label>' +
      inputHtml + (hint ? '<div class="field__hint">' + U.esc(hint) + '</div>' : '') + '</div>';
  };

  C.input = function (name, value, attrs) {
    return '<input class="input" name="' + name + '" value="' + U.esc(value == null ? '' : value) + '" ' +
      (attrs || '') + '>';
  };

  C.textarea = function (name, value, attrs) {
    return '<textarea class="textarea" name="' + name + '" ' + (attrs || '') + '>' +
      U.esc(value == null ? '' : value) + '</textarea>';
  };

  C.select = function (name, value, options, attrs) {
    var opts = options.map(function (o) {
      var v = typeof o === 'string' ? o : o.value;
      var l = typeof o === 'string' ? o : o.label;
      return '<option value="' + U.esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' +
        U.esc(l) + '</option>';
    }).join('');
    return '<select class="select" name="' + name + '" ' + (attrs || '') + '>' + opts + '</select>';
  };

  C.studentSelect = function (name, value) {
    return C.select(name, value, S.students().map(function (s) {
      return { value: s.id, label: s.name + ' · ' + s.grade };
    }));
  };

  window.C = C;
})();
