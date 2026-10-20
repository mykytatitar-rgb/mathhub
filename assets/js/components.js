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
        color: '#AAA8C2',
        act: opts.othersAct, arg: opts.othersArg
      });
    } else if (small.length === 1) {
      big.push(small[0]);
    }

    var sz = opts.size || 168;
    var sw = opts.stroke || 26;
    var r = (sz - sw) / 2;
    var circ = 2 * Math.PI * r;

    /* Сектор чи рядок легенди з act — натискається (деталі за ним): той
       самий спільний диспетчер data-act, що й для кнопок. */
    function actAttrs(s) {
      return s.act ? ' data-act="' + U.esc(s.act) + '" data-arg="' + U.esc(s.arg || '') + '"' : '';
    }

    var at = 0;
    var arcs = big.map(function (s, i) {
      var frac = s.value / total;
      var col = s.color || C.PIE_COLORS[i % C.PIE_COLORS.length];
      var seg = '<circle' + (s.act ? ' class="pie__seg"' + actAttrs(s) : '') +
        ' cx="' + sz / 2 + '" cy="' + sz / 2 + '" r="' + r + '" fill="none" ' +
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
      var tag = s.act ? 'button' : 'div';
      return '<' + tag + (s.act ? ' type="button"' : '') +
        ' class="pie__row' + (s.act ? ' pie__row--btn' : '') + '"' + actAttrs(s) + '>' +
        '<span class="pie__dot" style="background:' + s._col + '"></span>' +
        '<span class="pie__name">' + U.esc(s.label) + '</span>' +
        '<span class="pie__pct">' + s._pct + '</span>' +
        (opts.fmt ? '<span class="pie__val">' + U.esc(opts.fmt(s.value)) + '</span>' : '') +
        '</' + tag + '>';
    }).join('');

    return '<div class="pie' + (big.some(function (s) { return s.act; }) ? ' pie--live' : '') + '">' +
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
    /* Телефон бачить ті самі кнопки трохи інакше, а компʼютер — як було:
       bar — якою кнопка стане у верхній смузі ('solid' — з підписом,
       'plain' — значком); m — порядок і вигляд у рядку банера на телефоні
       ({ order, solid, only }: only — лише на телефоні). */
    var a = (opts.actions || []).map(function (b) {
      var m = b.m || {};
      var cls = (b.solid ? ' hero-btn--solid' : '') +
        (m.solid === true ? ' hero-btn--msolid' : m.solid === false ? ' hero-btn--mplain' : '') +
        (m.only ? ' hero-btn--monly' : '');
      return '<button class="hero-btn' + cls + '" data-act="' + b.act + '"' +
        (b.arg ? ' data-arg="' + U.esc(b.arg) + '"' : '') +
        (b.bar ? ' data-bar="' + U.esc(b.bar) + '"' : '') +
        (m.order != null ? ' style="--mo:' + Number(m.order) + '"' : '') + '>' +
        (b.icon ? icon(b.icon, 17) : '') + U.esc(b.label) + '</button>';
    }).join('');

    return '<div class="hero' + (opts.short ? ' hero--short' : '') +
      (opts.tight ? ' hero--tight' : '') + '">' +
      C.mathPattern() +
      '<div class="hero__inner">' +
      // back.phone — «назад» лише для стрілки у верхній смузі телефона; на компʼютері його не видно
      (opts.back ? '<button class="hero__back' + (opts.back.phone ? ' hero__back--m' : '') +
        '" data-act="' + opts.back.act + '"' +
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
      /* На телефоні вся картка — під пальцем: торкнутись опису й відкрити
         урок, а не цілитися в кнопку. Миша на компʼютері — як було. */
      '<div class="lesson-row__body"' +
        (C.touchy() ? ' data-act="lesson-open" data-arg="' + lesson.id + '"' : '') + '>' +
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
  var modalSeq = 0;

  /** Телефон чи інший екран, де працюють пальцем. */
  C.touchy = function () {
    try { return window.matchMedia('(max-width: 640px), (pointer: coarse)').matches; }
    catch (e) { return window.innerWidth <= 640; }
  };

  /** Вузький екран телефона: там вікна — шторки знизу (див. app.css). */
  C.phone = function () {
    try { return window.matchMedia('(max-width: 640px)').matches; }
    catch (e) { return window.innerWidth <= 640; }
  };

  /* ============================================================
     Системне «Назад»: шторки й історія переходів
     ============================================================

     На телефоні «Назад» (кнопка Android, жест у встановленому застосунку) —
     найчастіший спосіб закрити шторку. Досі він гортав сторінку під нею або
     виходив із застосунку, а шторка лишалась на екрані. Тепер відкрита
     шторка має свій запис в історії: «Назад» знімає саме його й закриває
     шторку, а сторінка лишається там, де була.

     Кожен запис сторінки ще й знає свою глибину d — скільки наших сторінок
     під ним. З нею стрілка ← у верхній смузі вирішує, чи є куди
     повертатися «Назад», чи треба йти на батьківську сторінку: інакше
     ← з першої ж сторінки виводила б із застосунку. */

  var ovEntry = false;      // наш запис «відкрита шторка» зараз нагорі історії
  var skipPop = false;      // наступний popstate — від нашого ж history.back()
  var backT = null;
  var lastD = 0;            // глибина поточного запису
  var replaceTo = null;     // перехід на цю адресу замінює поточний запис, а не додає новий
  var poppedTo = null;      // адреса, куди щойно повернулись кнопкою «Назад»
  var trail = [];           // адреси наших сторінок за глибиною — щоб повертатись до вже відкритої
  var others = [];          // інші шторки, крім вікон (шухляда теми на карті)
  var under = null;         // { url, d }: нова адреса для сторінки під шторкою (див. C.hist.note)
  var thenGo = null;        // після нашого history.back() — замінити сторінку цією адресою
  var TRAIL_KEY = 'vektor.trail';

  function hist() { return window.history; }

  function anyOpen() {
    if (modalStack.length) return true;
    for (var i = 0; i < others.length; i++) if (others[i].open()) return true;
    return false;
  }

  function ovOpen() {
    if (backT) { clearTimeout(backT); backT = null; }
    if (ovEntry) return;
    try {
      hist().pushState({ ov: 1, d: lastD + 1 }, '');
      lastD += 1;
      ovEntry = true;
    } catch (e) { /* без історії шторка просто закривається хрестиком, як раніше */ }
  }

  /* Шторку закрили хрестиком чи кнопкою, а не «Назад», — її запис в історії
     прибираємо самі. Не одразу: картка уроку → «Редагувати» закриває одну
     шторку й за 60 мс відкриває іншу, і та має сісти на той самий запис,
     а не смикати історію туди й назад. */
  function ovClosed(fromPop) {
    if (fromPop) { ovEntry = false; return; }
    if (backT) clearTimeout(backT);
    backT = setTimeout(function () {
      backT = null;
      if (anyOpen()) return;
      var st = hist().state;
      if (ovEntry && st && st.ov) { ovEntry = false; skipPop = true; hist().back(); }
      else ovEntry = false;
    }, 120);
  }

  function saveTrail() {
    try { sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail)); } catch (e) {}
  }

  function pathOf(hash) {
    var h = String(hash || '').replace(/^#/, '') || '/';
    var q = h.indexOf('?');
    return q >= 0 ? h.slice(0, q) : h;
  }

  window.addEventListener('popstate', function (e) {
    var st = e.state;
    if (st && st.d != null) lastD = st.d;
    /* Повернулись на сторінку, чию адресу міняли, поки над нею була
       шторка (вигляд карти з шухляди теми): адреса жила в записі шторки і
       зникла б разом із ним, а hashchange, що вже в черзі, намалював би
       сторінку за старою. Тепер він малює ту, що людина щойно бачила. */
    if (under && st && st.d != null && st.d <= under.d) {
      if (st.d === under.d && !st.ov && location.hash !== under.url) {
        try { hist().replaceState(st, '', under.url); } catch (err) {}
      }
      under = null;
    }
    if (skipPop) {
      skipPop = false;
      if (thenGo !== null) {
        var to = thenGo;
        thenGo = null;
        replaceTo = to;
        location.replace(to);
      }
      return;
    }
    /* Перехід за адресою (location.hash = …) теж шле popstate, але з
       порожнім станом: це не «Назад», і шторок він не стосується. */
    if (!st) return;
    ovEntry = false;                       // запис, з якого пішли, уже позаду
    if (modalStack.length) {
      modalStack[modalStack.length - 1].request(true);
      if (anyOpen()) ovOpen();             // під нею ще одна шторка — їй теж потрібен запис
      return;
    }
    for (var i = 0; i < others.length; i++) {
      if (others[i].open()) {
        others[i].close(true);
        if (anyOpen()) ovOpen();
        return;
      }
    }
    /* Запис шторки, що лишився під сторінкою, на яку з неї перейшли: сам
       нічого не показує — тож крок далі, до самої сторінки. */
    if (st.ov) { hist().back(); return; }
    poppedTo = location.hash;
  });

  /** Закрити всі вікна. keepHistory — сторінка вже змінилась, історію не чіпати. */
  C.closeAll = function (keepHistory) {
    var keep = keepHistory === true;
    if (keep && backT) { clearTimeout(backT); backT = null; }
    while (modalStack.length) modalStack[modalStack.length - 1](keep);
    others.forEach(function (o) { if (o.open()) o.close(keep); });
    if (keep) ovEntry = false;
  };

  /* Інші шторки (шухляда теми на карті) — на тому самому записі історії.
     add({ open: () => bool, close: (fromPop) => … }) */
  C.overlay = {
    open: ovOpen,
    closed: ovClosed,
    add: function (o) { others.push(o); }
  };

  C.hist = {
    /** На старті: позначити поточний запис як сторінку глибини 0 (або ту, що вже записана). */
    boot: function () {
      var h = hist(), st = h.state, leaving = false;
      try {
        if (!st || st.d == null) h.replaceState({ d: 0 }, '');
        else if (st.ov && st.d >= 1 && h.length > 1) {
          /* Перезавантажились із відкритою шторкою (Android вивантажив
             вкладку, кабінет оновився). Самої шторки вже немає, а під її
             записом лежить та сама сторінка — тож перше «Назад» нічого б не
             робило. Сходимо з запису шторки одразу, ще до першого «Назад»;
             адресу, яку людина бачила, сторінка під ним отримає (див. popstate). */
          under = { url: location.hash, d: st.d - 1 };
          skipPop = true;
          h.back();
          leaving = true;
        }
        // запис шторки без сторінки під ним — тепер це просто сторінка
        else if (st.ov) h.replaceState({ d: st.d }, '');
      } catch (e) { skipPop = false; under = null; }
      lastD = leaving ? st.d - 1 : (h.state && h.state.d) || 0;
      try { trail = JSON.parse(sessionStorage.getItem(TRAIL_KEY) || '[]') || []; } catch (e) { trail = []; }
      trail[lastD] = location.hash;
      trail.length = lastD + 1;
      saveTrail();
    },

    /** Після кожної зміни адреси: новий запис отримує свою глибину. */
    stamp: function () {
      var h = hist(), st = h.state;
      var rep = replaceTo !== null && replaceTo === location.hash;
      replaceTo = null;
      if (!st || st.d == null) {
        var d = rep ? lastD : lastD + 1;
        try { h.replaceState({ d: d }, ''); } catch (e) {}
        lastD = d;
      } else {
        lastD = st.d;
        if (st.ov) return;                 // запис шторки — не сторінка, у слід не пишемо
      }
      // на цій глибині вже інша сторінка — відкладена адреса їй не належить
      if (under && lastD <= under.d) under = null;
      trail[lastD] = location.hash;
      trail.length = lastD + 1;
      saveTrail();
    },

    /** Адреса поточного запису змінилась без переходу (фільтр, пошук). */
    note: function () {
      var st = hist().state;
      /* Змінили, поки нагорі запис шторки (вигляд карти з шухляди теми):
         нова адреса потрапила в її запис, а сторінка під ним лишилась зі
         старою. Запамʼятовуємо — popstate віддасть адресу сторінці, щойно
         шторка закриється, інакше закриття скасувало б вибір. */
      if (st && st.ov && st.d >= 1) {
        under = { url: location.hash, d: st.d - 1 };
        trail[st.d - 1] = location.hash;
      } else {
        trail[lastD] = location.hash;
      }
      saveTrail();
    },

    depth: function () { return lastD; },

    /** Наступний перехід на hash замінить поточний запис. */
    replacing: function (hash) { replaceTo = hash; },

    /* Замінити саму сторінку під шторкою, а не запис шторки. Перенесення
       на іншу дошку: нова дошка стає на місце старої, і «Вийти» веде туди,
       звідки на дошку прийшли, а не на дошку, з якої переносили. Спершу
       сходимо з запису шторки, а заміняємо вже в popstate. */
    replacePage: function (hash) {
      var st = hist().state;
      if (st && st.ov) {
        if (backT) { clearTimeout(backT); backT = null; }
        ovEntry = false;
        thenGo = hash;
        skipPop = true;
        try { hist().back(); return; } catch (e) { thenGo = null; skipPop = false; }
      }
      replaceTo = hash;
      location.replace(hash);
    },

    /** Чи на цю сторінку щойно повернулись «Назад» (питання одноразове). */
    popped: function () {
      var p = poppedTo !== null && poppedTo === location.hash;
      poppedTo = null;
      return p;
    },

    /** На скільки кроків назад лежить наша сторінка з таким шляхом (0 — немає). */
    find: function (path) {
      for (var k = lastD - 1; k >= 0; k--) {
        if (trail[k] != null && pathOf(trail[k]) === path) return k - lastD;
      }
      return 0;
    }
  };

  /* Шторку на телефоні можна стягнути пальцем донизу, як системну: за
     шапку — завжди, за вміст — коли він прокручений до самого верху
     (інакше той самий рух гортає вміст). Повертає функцію «на місце». */
  function bindSwipe(sheet, tryClose) {
    var head = sheet.querySelector('.modal__head');
    var body = sheet.querySelector('.modal__body');
    var g = null;

    function back(animate) {
      sheet.style.transition = animate ? 'transform .2s cubic-bezier(.2,.9,.3,1)' : '';
      sheet.style.transform = '';
    }

    sheet.addEventListener('touchstart', function (e) {
      g = null;
      if (e.touches.length !== 1 || !C.phone()) return;
      var t = e.target;
      if (!(head && head.contains(t))) {
        if (!body || !body.contains(t) || body.scrollTop > 0) return;
        // у полі палець виділяє текст чи рухає повзунок, а не тягне шторку
        if (t.closest && t.closest('input, textarea, select, [contenteditable="true"], .no-swipe')) return;
        for (var el = t; el && el !== body; el = el.parentElement) {
          if (el.scrollTop > 0) return;    // внутрішній список гортає себе
        }
      }
      var p = e.touches[0];
      g = { x: p.clientX, y: p.clientY, on: false, dy: 0, vy: 0, ly: p.clientY, lt: Date.now() };
    }, { passive: true });

    sheet.addEventListener('touchmove', function (e) {
      if (!g) return;
      var p = e.touches[0];
      var dx = p.clientX - g.x, dy = p.clientY - g.y;
      if (!g.on) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        // угору чи вбік — це прокрутка; і якщо браузер уже гортає сам — теж не наше
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || !e.cancelable) { g = null; return; }
        g.on = true;
        sheet.style.transition = 'none';
      }
      if (e.cancelable) e.preventDefault();
      var now = Date.now();
      if (now > g.lt) { g.vy = (p.clientY - g.ly) / (now - g.lt); g.ly = p.clientY; g.lt = now; }
      g.dy = Math.max(0, dy);
      sheet.style.transform = 'translateY(' + g.dy + 'px)';
    }, { passive: false });

    sheet.addEventListener('touchend', function () {
      var s = g; g = null;
      if (!s || !s.on) return;
      // далеко або швидко — закрити; трохи — повернути на місце
      if (s.dy > 90 || (s.vy > 0.5 && s.dy > 24)) tryClose(); else back(true);
    });
    sheet.addEventListener('touchcancel', function () {
      var s = g; g = null;
      if (s && s.on) back(true);
    });
    return back;
  }

  /**
   * opts: { title, sub, body, wide, autofocus, buttons: [{label, kind, act, close}], onMount(root, close) }
   * Повертає функцію закриття.
   */
  C.modal = function (opts) {
    var root = document.getElementById('modal-root');
    root.hidden = false;
    // на телефоні сторінка під шторкою не гортається (див. html.modal-open у CSS)
    document.documentElement.classList.add('modal-open');

    var wrap = document.createElement('div');
    // розкладка — у CSS: на телефоні вікно стає шторкою знизу
    wrap.className = 'modal-wrap';

    /* Видалення (і все, що позначено menu) — не поруч зі «Зберегти», а в
       меню «⋯» у шапці вікна. Червона кнопка на відстані пальця від
       головної — це запрошення промахнутися, особливо на телефоні. */
    var inMenu = function (b) { return b && (b.menu || b.act === 'del'); };
    var buttons = (opts.buttons || []).filter(Boolean);
    // head — значок у шапці (як олівець у картці події Google Calendar):
    // часта дія, але не головна, і в нижньому ряду їй не вистачає місця
    var heads = buttons.filter(function (b) { return b.head && !inMenu(b); }).map(function (b) {
      return '<button class="icon-btn" data-mb="' + U.esc(b.act || '') + '" aria-label="' + U.esc(b.label) +
        '" title="' + U.esc(b.label) + '">' + icon(b.icon, 19) + '</button>';
    }).join('');
    var btns = buttons.filter(function (b) { return !inMenu(b) && !b.head; }).map(function (b) {
      return '<button class="btn ' + (b.kind || 'btn--ghost') + '" data-mb="' + U.esc(b.act || '') + '">' +
        (b.icon ? icon(b.icon, 16) : '') + U.esc(b.label) + '</button>';
    }).join('');
    var menuItems = buttons.filter(inMenu).map(function (b) {
      var danger = b.act === 'del' || /danger/.test(b.kind || '');
      return '<button class="modal__mi' + (danger ? ' is-danger' : '') + '" data-mb="' + U.esc(b.act || '') + '">' +
        icon(b.icon || (danger ? 'trash' : 'folder'), 16) + U.esc(b.label) + '</button>';
    }).join('');

    wrap.innerHTML =
      '<div class="modal__scrim" data-close="1"></div>' +
      '<div class="modal' + (opts.wide ? ' modal--wide' : '') + '" role="dialog" aria-modal="true" ' +
        'aria-labelledby="mt-' + (++modalSeq) + '">' +
      '<div class="modal__head"><div style="flex:1;min-width:0">' +
      '<h2 class="modal__title" id="mt-' + modalSeq + '">' + U.esc(opts.title) + '</h2>' +
      (opts.sub ? '<div class="modal__sub">' + U.esc(opts.sub) + '</div>' : '') +
      '</div>' + heads +
      (menuItems
        ? '<div class="modal__more"><button class="icon-btn" data-mmore aria-label="Ще дії" aria-expanded="false">' +
          icon('dots', 20) + '</button><div class="modal__menu" hidden>' + menuItems + '</div></div>'
        : '') +
      '<button class="icon-btn" data-close="1" aria-label="Закрити">' + icon('x', 20) + '</button></div>' +
      '<div class="modal__body">' + (opts.body || '') + '</div>' +
      (btns ? '<div class="modal__foot">' + btns + '</div>' : '') +
      '</div>';

    root.appendChild(wrap);

    var closed = false;
    // fromPop — закрили кнопкою «Назад»: її запис в історії вже знято
    function close(fromPop) {
      if (closed) return;
      closed = true;
      wrap.remove();
      var i = modalStack.indexOf(close);
      if (i >= 0) modalStack.splice(i, 1);
      if (!root.children.length) {
        root.hidden = true;
        document.documentElement.classList.remove('modal-open');
      }
      if (!modalStack.length) ovClosed(fromPop === true);
    }

    /* Введене не зникає від випадкового дотику. На телефоні затемнення
       навколо шторки й «Назад» — це півекрана під пальцем, і досі промах
       мовчки стирав усе набране. Питаємо, лише якщо людина справді щось
       змінила (подія input/change), а не коли поле заповнилось само. */
    var initial = null, touched = false;
    /* anyScreen — питати й на компʼютері. «Назад» браузера (бічна кнопка
       миші, Alt+←) тепер теж закриває вікно, бо воно має свій запис в
       історії, — і випадковий дотик до неї не має стирати заповнену форму.
       Хрестик, Esc і затемнення на компʼютері закривають, як і раніше. */
    function dirty(anyScreen) {
      if (closed || !touched || initial === null || (!anyScreen && !C.touchy())) return false;
      try { return JSON.stringify(C.readForm(wrap)) !== initial; } catch (e) { return false; }
    }
    function requestClose(fromPop) {
      if (dirty(fromPop === true)) {
        C.confirm('Скасувати зміни?', 'Введене не збережеться.', function () { close(); },
          'Не зберігати', 'Повернутися', 'btn--danger');
        return false;
      }
      close(fromPop);
      return true;
    }
    close.request = requestClose;

    modalStack.push(close);
    ovOpen();

    U.$$('[data-close]', wrap).forEach(function (el) {
      el.addEventListener('click', function () { requestClose(false); });
    });

    var moreBtn = wrap.querySelector('[data-mmore]');
    if (moreBtn) {
      var menuEl = wrap.querySelector('.modal__menu');
      moreBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        menuEl.hidden = !menuEl.hidden;
        moreBtn.setAttribute('aria-expanded', String(!menuEl.hidden));
      });
      // дотик поза меню — згорнути його
      wrap.addEventListener('click', function (e) {
        if (!menuEl.hidden && !e.target.closest('.modal__more')) menuEl.hidden = true;
      });
    }

    buttons.forEach(function (b) {
      var el = wrap.querySelector('[data-mb="' + (b.act || '') + '"]');
      if (!el) return;
      el.addEventListener('click', function () {
        var keep = b.onClick ? b.onClick(wrap, close) : undefined;
        if (b.close !== false && keep !== false) close();
      });
    });

    if (opts.onMount) opts.onMount(wrap, close);

    if (wrap.querySelector('[name]')) {
      initial = JSON.stringify(C.readForm(wrap));
      var touch = function () { touched = true; };
      wrap.addEventListener('input', touch);
      wrap.addEventListener('change', touch);
    }

    var sheet = wrap.querySelector('.modal');
    var scrim = wrap.querySelector('.modal__scrim');
    var putBack = bindSwipe(sheet, function () {
      if (dirty()) { putBack(true); requestClose(false); return; }
      sheet.style.transition = 'transform .18s ease-in';
      sheet.style.transform = 'translateY(105%)';
      if (scrim) { scrim.style.transition = 'opacity .18s'; scrim.style.opacity = '0'; }
      var done = false;
      var fin = function () { if (!done) { done = true; close(); } };
      sheet.addEventListener('transitionend', function (e) { if (e.target === sheet) fin(); });
      setTimeout(fin, 260);
    });

    /* Курсор у перше поле — лише там, де є миша. На телефоні фокус одразу
       піднімає клавіатуру посеред появи шторки: вона накриває пів форми ще
       до того, як людина вирішила, що заповнювати. */
    var fine = true;
    try { fine = window.matchMedia('(pointer: fine)').matches; } catch (e) {}
    var first = fine
      ? wrap.querySelector('input, textarea, select')
      : opts.autofocus && wrap.querySelector('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), textarea, select');
    if (first) setTimeout(function () { first.focus(); }, 60);

    return close;
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalStack.length) {
      modalStack[modalStack.length - 1]();
    }
  });

  /** Підтвердження дії. */
  // yesKind — для незруйнівних питань («Оновити»): червона кнопка там лякала б
  C.confirm = function (title, text, onYes, yesLabel, noLabel, yesKind) {
    C.modal({
      title: title,
      body: '<p style="line-height:1.6;color:var(--ink-2);margin:6px 0 18px">' + U.esc(text) + '</p>',
      buttons: [
        { label: noLabel || 'Скасувати', kind: 'btn--ghost', act: 'no' },
        { label: yesLabel || 'Так, видалити', kind: yesKind || 'btn--danger', act: 'yes', onClick: onYes }
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
      else if (el.getAttribute && el.getAttribute('inputmode') === 'decimal') {
        // «12,5», «12.5» і «1 500» — те саме число, що дало б поле type=number
        var raw = String(el.value).replace(/[\s ]/g, '').replace(',', '.');
        var n = raw === '' ? null : Number(raw);
        out[el.name] = n === null || isFinite(n) ? n : null;
      }
      else out[el.name] = el.value.trim();
    });
    return out;
  };

  /* Атрибути поля суми. На телефоні — текстове поле з цифровою
     клавіатурою: type=number там то відкриває повну клавіатуру (iPhone),
     то не приймає кому, яку ставить українська розкладка, — і «12,5»
     мовчки ставало порожнім. На компʼютері — як було, зі стрілками.
     readForm читає обидва однаково. */
  C.numAttrs = function (desktop) {
    return C.touchy() ? 'type="text" inputmode="decimal" autocomplete="off"' : desktop;
  };

  /* Підпис привʼязаний до поля: клік по ньому ставить курсор у поле, а
     браузер і програми читання з екрана знають, як поле зветься. Доти
     підпис стояв поруч сам по собі. */
  var fieldSeq = 0;

  C.field = function (label, inputHtml, hint) {
    var forId = '';
    var html = String(inputHtml).replace(/<(input|select|textarea)\b[^>]*>/, function (tag) {
      var had = /\sid="([^"]+)"/.exec(tag);
      if (had) { forId = had[1]; return tag; }
      forId = 'fld-' + (++fieldSeq);
      return tag.replace(/^<(input|select|textarea)\b/, '<$1 id="' + forId + '"');
    });
    return '<div class="field"><label class="field__label"' + (forId ? ' for="' + forId + '"' : '') + '>' +
      U.esc(label) + '</label>' +
      html + (hint ? '<div class="field__hint">' + U.esc(hint) + '</div>' : '') + '</div>';
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
    var list = S.students().slice();
    /* Учень запису, навіть якщо він уже в архіві. Без нього в списку браузер
       мовчки обирав першого активного, і збереження уроку чи оплати
       архівного учня перекидало запис на іншу людину — разом із грошима. */
    var own = value && S.get('students', value);
    if (own && list.indexOf(own) < 0) list.unshift(own);
    return C.select(name, value, list.map(function (s) {
      return { value: s.id, label: s.name + ' · ' + s.grade + (s.archived ? ' · архів' : '') };
    }));
  };

  window.C = C;
})();
