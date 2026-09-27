/* База формул — кожна з доведенням.

   Раніше тут був «Довідник»: перенесена англомовна шпаргалка, де формули
   просто стоять стовпчиком. Для репетитора цього мало. Учень питає не
   «яка формула», а «звідки вона взялась» — і відповідь має бути під рукою
   посеред уроку, а не в пам'яті чи в підручнику на полиці.

   Тому кожна формула тут — картка: сама формула, коли її можна
   застосовувати, приклад і доведення кроками, яке розгортається одним
   дотиком. Доведення спираються одне на одне («синус подвійного кута —
   з синуса суми»), і ці звʼязки клікабельні: можна пройти ланцюжок аж до
   першооснови. Кожна формула прив'язана до теми на карті математики й до
   задач у банку.

   Зміст лежить в окремих файлах assets/js/formulas-*.js і вантажиться,
   лише коли розділ відкривають: це кількасот кілобайт тексту, і на старті
   кабінету вони не потрібні. Старі англійські шпаргалки нікуди не ділись —
   вони в «Матеріалах» і відкриваються кнопкою в шапці. */

(function () {
  'use strict';

  var U = window.U, C = window.C, icon = window.icon;
  var V = window.V;
  var MAP = window.MATH_MAP;

  /* ============================================================
     Мова
     ============================================================

     База двомовна: українська або англійська (для учнів Cambridge і
     Precalculus). Перемкнувшись, бачиш усе однією мовою — написи, назви,
     умови, доведення й навіть позначення: tan замість tg, крапка замість
     коми в десяткових дробах. Англійський текст лежить окремо, у
     formulas-en-*.js, і вантажиться, лише коли його вибрали. Вибір — річ
     одного пристрою, тож живе в localStorage. */

  var LANG_KEY = 'mathhub.fx.lang';
  var lang = 'uk';
  try { if (localStorage.getItem(LANG_KEY) === 'en') lang = 'en'; } catch (e) { /* приватне вікно */ }

  function en() { return lang === 'en'; }
  function T(uk, eng) { return en() ? eng : uk; }
  /** Кількість зі словом: укр. — трьома формами, англ. — однина/множина. */
  function N(n, uk1, uk2, uk5, en1, enN) { return en() ? n + ' ' + (n === 1 ? en1 : enN) : U.pl(n, uk1, uk2, uk5); }

  // англійські назви кнопки доведення, коли вона називається інакше, ніж «Доведення»
  var PT_EN = {
    'Чому саме так': 'Why it is so',
    'Доведення від супротивного': 'Proof by contradiction',
    'Доведення (прийом Гаусса)': 'Proof (Gauss’s trick)',
    'Доведення (індукція)': 'Proof by induction',
    'Чому такі обмеження': 'Why these restrictions',
    'Доведення (через скалярний добуток)': 'Proof via the dot product',
    'Чому саме такі проміжки': 'Why these intervals',
    'Доведення (геометричне)': 'Geometric proof',
    'Звідки це береться': 'Where it comes from',
    'Доведення (через площі)': 'Proof by areas',
    'Чому відношення не залежить від трикутника': 'Why the ratio does not depend on the triangle',
    'Звідки': 'Where it comes from',
    'Ідея доведення': 'Idea of the proof'
  };

  /* Позначення англійською: tg → tan, ctg → cot, arctg → arctan, кома в
     десятковому дробі (0{,}5) → крапка. */
  function enTex(s) {
    return String(s)
      .replace(/\\arcctg(?![a-zA-Z])/g, '\\arccot').replace(/\\arctg(?![a-zA-Z])/g, '\\arctan')
      .replace(/\\ctg(?![a-zA-Z])/g, '\\cot').replace(/\\tg(?![a-zA-Z])/g, '\\tan')
      .replace(/\{,\}/g, '.');
  }

  var DOMAINS = [
    ['alg', 'Алгебра', 'Algebra'],
    ['trig', 'Тригонометрія', 'Trigonometry'],
    ['an', 'Початки аналізу', 'Calculus'],
    ['prob', 'Комбінаторика та ймовірність', 'Combinatorics & probability'],
    ['plane', 'Планіметрія', 'Plane geometry'],
    ['coord', 'Координати й вектори', 'Coordinates & vectors'],
    ['space', 'Стереометрія', 'Solid geometry']
  ];

  var topicName = {};
  if (MAP) MAP.topics.forEach(function (t) { topicName[t.id] = t.name; });

  var state = 'idle';           // idle | loading | ready | failed — сама база
  var stateEn = 'idle';         // те саме для англійського перекладу
  var open = {};                // розгорнуті доведення: id → true
  var byId = null, secById = null, usedBy = null;
  var placedFor = null;         // адреса, для якої вже прокрутили до формули

  function fmt(t) {
    if (t == null || t === '') return '';
    if (en()) t = enTex(t);
    return window.MathFmt ? MathFmt.text(t) : U.esc(t);
  }
  function tex(t) {
    if (en()) t = enTex(t);
    return window.MathFmt ? MathFmt.render(t) : U.esc(t);
  }

  /** Формула вибраною мовою. Англійський переклад заміняє всі тексти:
      чого в ньому немає, того й не показуємо — щоб не змішувати мови
      (повноту перекладу стереже tools/formulas-check.js). */
  function L(it) {
    if (!en()) return it;
    var e = (window.FORMULAS_EN && window.FORMULAS_EN.items[it.id]) || {};
    var o = {};
    Object.keys(it).forEach(function (k) { o[k] = it[k]; });
    ['w', 'ex', 'note', 'err', 'p'].forEach(function (k) { o[k] = e[k]; });
    o.t = e.t || it.en || it.t;
    o.f = e.f || it.f;
    o.pt = e.pt || (it.pt ? PT_EN[it.pt] || 'Proof' : '');
    return o;
  }
  function secTitle(s) {
    var e = en() && window.FORMULAS_EN && window.FORMULAS_EN.sections[s.id];
    return e ? e.title : s.title;
  }
  function secNote(s) {
    if (!en()) return s.note;
    var e = window.FORMULAS_EN && window.FORMULAS_EN.sections[s.id];
    return e ? e.note || '' : '';
  }

  function onPage() { return /^#\/reference/.test(location.hash); }

  /* Перший рендер іде ще під час виконання app.js, а window.App
     зʼявляється лише в кінці файлу. Тому звертаємось до нього на мить
     пізніше — коли файл уже виконано. */
  function need(group) {
    return new Promise(function (res) { setTimeout(res, 0); })
      .then(function () { return window.App.need(group || 'formulas'); });
  }
  function rerender() { if (onPage() && window.App) window.App.render(); }

  function ensure() {
    if (state === 'idle') {
      state = 'loading';
      need('formulas').then(function () { state = 'ready'; rerender(); },
                            function () { state = 'failed'; rerender(); });
    }
    if (en() && stateEn === 'idle') {
      stateEn = 'loading';
      need('formulas-en').then(function () { stateEn = 'ready'; rerender(); },
                               function () { stateEn = 'failed'; rerender(); });
    }
  }
  function isReady() { return state === 'ready' && (!en() || stateEn === 'ready'); }
  function isFailed() { return state === 'failed' || (en() && stateEn === 'failed'); }

  function index() {
    if (byId) return;
    var D = window.FORMULAS;
    byId = {}; secById = {}; usedBy = {};
    D.sections.forEach(function (s) { secById[s.id] = s; s.items = []; });
    D.items.forEach(function (it) {
      byId[it.id] = it;
      if (secById[it.sec]) secById[it.sec].items.push(it);
    });
    D.items.forEach(function (it) {
      (it.uses || []).forEach(function (u) {
        if (!byId[u]) { console.warn('formulas: невідоме посилання', it.id, '→', u); return; }
        (usedBy[u] = usedBy[u] || []).push(it.id);
      });
    });
  }

  function topicOf(it) { return it.map || (secById[it.sec] && secById[it.sec].map) || ''; }

  /* ============================================================
     Малюнки
     ============================================================

     Геометричне доведення без малюнка — це вправа на уяву, а не пояснення.
     Малюнки тут описані даними (точки, відрізки, кути), а не готовим SVG:
     так усі вони виглядають однаково, їх легко виправити й доповнити, і
     вони важать кілька десятків байтів кожен.

     Опис: v — розмір, p — точки {A:[x,y]}, s — відрізки «AB BC»,
     d — пунктирні, h — виділені кольором, vec — вектори зі стрілкою,
     c — кола [центр, радіус або точка на колі], e — еліпси [x,y,rx,ry,'half'],
     r — прямі кути «CHB» (вершина посередині), a — кути [[B,A,C,'α']],
     tk — рівні відрізки [['A','B',1]], fill — зафарбовані многокутники,
     q — точки без підпису, n — інші підписи {A1:'A₁'}, lp — зсув підпису,
     t — вільні написи [[x,y,'текст']] ([x,y,'a²','m'] — курсивом, як
     позначення). Назви з кількох знаків пишуть через
     дефіс: «A1-B». */

  function pair(tok) { return tok.indexOf('-') >= 0 ? tok.split('-') : tok.split(''); }
  function list(v) { return !v ? [] : Array.isArray(v) ? v : String(v).split(/\s+/).filter(Boolean); }
  function r1(x) { return Math.round(x * 10) / 10; }

  function figure(F) {
    var W = F.v[0], H = F.v[1], P = F.p || {};
    var names = Object.keys(P);
    var out = '';

    var cx = 0, cy = 0;
    names.forEach(function (n) { cx += P[n][0]; cy += P[n][1]; });
    if (names.length) { cx /= names.length; cy /= names.length; }

    function pt(n) { return P[n]; }
    function line(a, b, cls) {
      var A = pt(a), B = pt(b);
      if (!A || !B) return '';
      return '<line x1="' + A[0] + '" y1="' + A[1] + '" x2="' + B[0] + '" y2="' + B[1] + '" class="' + cls + '"/>';
    }

    (F.fill || []).forEach(function (poly) {
      var ps = (Array.isArray(poly) ? poly : pair(poly)).map(function (n) { return pt(n); }).filter(Boolean);
      out += '<polygon points="' + ps.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '" class="fxg-fill"/>';
    });

    (F.c || []).forEach(function (c) {
      var O = typeof c[0] === 'string' ? pt(c[0]) : [c[0], c[1]];
      var rr = typeof c[0] === 'string'
        ? (typeof c[1] === 'string' ? Math.hypot(pt(c[1])[0] - O[0], pt(c[1])[1] - O[1]) : c[1])
        : c[2];
      out += '<circle cx="' + O[0] + '" cy="' + O[1] + '" r="' + r1(rr) + '" class="fxg-l' + (c[3] === 'd' || c[2] === 'd' ? ' fxg-d' : '') + '"/>';
    });

    // еліпс тіла обертання: передня половина суцільна, задня пунктиром
    (F.e || []).forEach(function (e) {
      var x = e[0], y = e[1], rx = e[2], ry = e[3];
      if (e[4] === 'half') {
        out += '<path d="M' + (x - rx) + ',' + y + ' A' + rx + ',' + ry + ' 0 0 0 ' + (x + rx) + ',' + y + '" class="fxg-l"/>' +
               '<path d="M' + (x - rx) + ',' + y + ' A' + rx + ',' + ry + ' 0 0 1 ' + (x + rx) + ',' + y + '" class="fxg-l fxg-d"/>';
      } else {
        out += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" class="fxg-l"/>';
      }
    });

    // дуга кола: [центр, від, до] — коротшим шляхом, радіус до першої точки
    (F.arc || []).forEach(function (a) {
      var O = pt(a[0]), A = pt(a[1]), B = pt(a[2]);
      if (!O || !A || !B) return;
      var R = Math.hypot(A[0] - O[0], A[1] - O[1]);
      var a1 = Math.atan2(A[1] - O[1], A[0] - O[0]), a2 = Math.atan2(B[1] - O[1], B[0] - O[0]);
      var dl = a2 - a1;
      while (dl > Math.PI) dl -= 2 * Math.PI;
      while (dl <= -Math.PI) dl += 2 * Math.PI;
      out += '<path d="M' + A[0] + ',' + A[1] + ' A' + r1(R) + ',' + r1(R) + ' 0 0 ' + (dl > 0 ? 1 : 0) + ' ' +
        r1(O[0] + R * Math.cos(a2)) + ',' + r1(O[1] + R * Math.sin(a2)) + '" class="fxg-l"/>';
    });

    list(F.s).forEach(function (t) { var q = pair(t); out += line(q[0], q[1], 'fxg-l'); });
    list(F.d).forEach(function (t) { var q = pair(t); out += line(q[0], q[1], 'fxg-l fxg-d'); });
    list(F.h).forEach(function (t) { var q = pair(t); out += line(q[0], q[1], 'fxg-l fxg-h'); });
    list(F.vec).forEach(function (t) {
      var q = pair(t);
      var A = pt(q[0]), B = pt(q[1]);
      if (!A || !B) return;
      var L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
      var ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
      var bx = B[0] - ux * 9, by = B[1] - uy * 9;
      out += '<line x1="' + A[0] + '" y1="' + A[1] + '" x2="' + r1(bx) + '" y2="' + r1(by) + '" class="fxg-l fxg-h"/>' +
        '<polygon class="fxg-arrow" points="' + B[0] + ',' + B[1] + ' ' +
          r1(bx - uy * 4.5) + ',' + r1(by + ux * 4.5) + ' ' + r1(bx + uy * 4.5) + ',' + r1(by - ux * 4.5) + '"/>';
    });

    list(F.r).forEach(function (t) {
      var q = pair(t);
      var A = pt(q[0]), O = pt(q[1]), B = pt(q[2]);
      if (!A || !O || !B) return;
      var la = Math.hypot(A[0] - O[0], A[1] - O[1]) || 1, lb = Math.hypot(B[0] - O[0], B[1] - O[1]) || 1;
      var ux = (A[0] - O[0]) / la * 8, uy = (A[1] - O[1]) / la * 8;
      var wx = (B[0] - O[0]) / lb * 8, wy = (B[1] - O[1]) / lb * 8;
      out += '<path d="M' + r1(O[0] + ux) + ',' + r1(O[1] + uy) + ' L' + r1(O[0] + ux + wx) + ',' + r1(O[1] + uy + wy) +
        ' L' + r1(O[0] + wx) + ',' + r1(O[1] + wy) + '" class="fxg-l fxg-thin"/>';
    });

    (F.a || []).forEach(function (a) {
      var A = pt(a[0]), O = pt(a[1]), B = pt(a[2]);
      if (!A || !O || !B) return;
      var R = a[4] || 17;
      var a1 = Math.atan2(A[1] - O[1], A[0] - O[0]);
      var a2 = Math.atan2(B[1] - O[1], B[0] - O[0]);
      var dl = a2 - a1;
      while (dl > Math.PI) dl -= 2 * Math.PI;
      while (dl <= -Math.PI) dl += 2 * Math.PI;
      out += '<path d="M' + r1(O[0] + R * Math.cos(a1)) + ',' + r1(O[1] + R * Math.sin(a1)) +
        ' A' + R + ',' + R + ' 0 0 ' + (dl > 0 ? 1 : 0) + ' ' +
        r1(O[0] + R * Math.cos(a2)) + ',' + r1(O[1] + R * Math.sin(a2)) + '" class="fxg-l fxg-arc"/>';
      if (a[3]) {
        var am = a1 + dl / 2;
        out += '<text x="' + r1(O[0] + (R + 10) * Math.cos(am)) + '" y="' + r1(O[1] + (R + 10) * Math.sin(am) + 4) +
          '" class="fxg-t fxg-t--a">' + U.esc(a[3]) + '</text>';
      }
    });

    (F.tk || []).forEach(function (t) {
      var A = pt(t[0]), B = pt(t[1]), k = t[2] || 1;
      if (!A || !B) return;
      var L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
      var ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
      var mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
      for (var i = 0; i < k; i++) {
        var off = (i - (k - 1) / 2) * 4;
        var x = mx + ux * off, y = my + uy * off;
        out += '<line x1="' + r1(x - uy * 5) + '" y1="' + r1(y + ux * 5) + '" x2="' + r1(x + uy * 5) + '" y2="' + r1(y - ux * 5) + '" class="fxg-l fxg-thin"/>';
      }
    });

    var hidden = {};
    list(F.q).forEach(function (n) { hidden[n] = 1; });
    names.forEach(function (n) {
      if (hidden[n]) return;
      var p = P[n];
      out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.4" class="fxg-dot"/>';
      var dx, dy;
      if (F.lp && F.lp[n]) { dx = F.lp[n][0]; dy = F.lp[n][1]; }
      else {
        dx = p[0] - cx; dy = p[1] - cy;
        var L = Math.hypot(dx, dy);
        if (L < 1) { dx = 0; dy = -1; L = 1; }
        dx = dx / L * 12; dy = dy / L * 12;
      }
      out += '<text x="' + r1(p[0] + dx) + '" y="' + r1(p[1] + dy + 4.5) + '" class="fxg-t">' +
        U.esc((F.n && F.n[n]) || n) + '</text>';
    });

    // напис: четвертий елемент 'm' — позначення курсивом, як підписи точок
    (F.t || []).forEach(function (t) {
      out += '<text x="' + t[0] + '" y="' + t[1] + '" class="fxg-t' + (t[3] === 'm' ? '' : ' fxg-t--s') + '">' +
        U.esc(t[2]) + '</text>';
    });

    return '<svg class="fxg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H +
      '" role="img" aria-label="' + T('Малюнок до доведення', 'Proof diagram') + '">' + out + '</svg>';
  }

  /* ============================================================
     Картка формули
     ============================================================ */

  function chip(id) {
    var x = byId[id];
    if (!x) return '';
    return '<button class="fx-chip" data-act="fx-go" data-arg="' + id + '">' + fmt(L(x).t) + '</button>';
  }

  function card(raw, opts) {
    opts = opts || {};
    var it = L(raw);
    var steps = it.p || [];
    var isOpen = !!open[it.id];
    var topic = topicOf(it);
    var back = usedBy[it.id] || [];

    /* Англійська назва поруч з українською прибрана: у кожній мові — лише
       своя. Англійською формулу й так знаходить пошук. */
    return '<article class="fx' + (isOpen ? ' is-open' : '') + '" id="fx-' + it.id + '">' +
      '<div class="fx__head">' +
        '<h3 class="fx__t">' + fmt(it.t) + '</h3>' +
        (opts.withSec && secById[it.sec]
          ? '<button class="fx__sec" data-act="fx-go" data-arg="' + it.id + '">' + U.esc(secTitle(secById[it.sec])) + '</button>'
          : '') +
      '</div>' +
      '<div class="fx__f">' + tex(it.f) + '</div>' +
      (it.w ? '<div class="fx__w">' + icon('info', 14) + '<span>' + fmt(it.w) + '</span></div>' : '') +
      (it.ex ? '<div class="fx__ex"><b>' + T('Приклад.', 'Example.') + '</b> ' + fmt(it.ex) + '</div>' : '') +
      (it.fig && !steps.length ? '<div class="fx__fig">' + figure(it.fig) + '</div>' : '') +

      '<div class="fx__acts">' +
        (steps.length
          ? '<button class="fx__proofbtn" data-act="fx-proof" data-arg="' + it.id + '" aria-expanded="' + isOpen + '">' +
            icon('chevronR', 15) + '<span>' + U.esc(it.pt || T('Доведення', 'Proof')) + '</span></button>'
          : '') +
        '<span class="fx__links">' +
          (topic && topicName[topic]
            ? '<button class="fx__link" data-act="nav" data-arg="#/mathmap?t=' + topic + '"' +
                (en() ? '' : ' title="' + U.esc(topicName[topic]) + '"') + '>' +
              icon('mathmap', 14) + T('Тема на карті', 'Map topic') + '</button>' +
              '<button class="fx__link" data-act="nav" data-arg="#/bank?topic=' + topic + '">' +
              icon('layers', 14) + T('Задачі', 'Problems') + '</button>'
            : '') +
        '</span>' +
      '</div>' +

      (steps.length
        ? '<div class="fx__proof">' +
            (it.fig ? '<div class="fx__fig">' + figure(it.fig) + '</div>' : '') +
            ((it.uses || []).length
              ? '<div class="fx__rel"><span>' + T('Спирається на:', 'Relies on:') + '</span>' + it.uses.map(chip).join('') + '</div>'
              : '') +
            '<ol class="fx__steps">' + steps.map(function (s) { return '<li>' + fmt(s) + '</li>'; }).join('') + '</ol>' +
            '<div class="fx__qed">∎</div>' +
          '</div>'
        : '') +

      (it.note ? '<div class="blk-info fx__note">' + fmt(it.note) + '</div>' : '') +
      (it.err ? '<div class="blk-warn fx__note">' + icon('alert', 15) + '<span><b>' +
        T('Типова помилка.', 'Common mistake.') + '</b> ' + fmt(it.err) + '</span></div>' : '') +
      (back.length
        ? '<div class="fx__rel fx__rel--back"><span>' + T('На ній тримаються:', 'Used in:') + '</span>' + back.map(chip).join('') + '</div>'
        : '') +
    '</article>';
  }

  /* ============================================================
     Сторінка
     ============================================================ */

  function bar(count, q, proofs) {
    var sheets = S.db().materials.filter(function (m) { return m.type === 'theory'; });
    return '<div class="ref__bar">' +
      '<div class="ref__title">' + T('База формул', 'Formula base') + '</div>' +
      '<div class="ref__count">' + (count
        ? N(count, 'формула', 'формули', 'формул', 'formula', 'formulas') + ' · ' +
          N(proofs, 'доведення', 'доведення', 'доведень', 'proof', 'proofs')
        : T('з доведеннями', 'with proofs')) + '</div>' +
      /* Мову видно й перемкнути одним дотиком; кожна кнопка підписана
         своєю мовою — так її знайде й той, хто іншої не читає. */
      '<div class="fx-lang" role="group" aria-label="' + T('Мова', 'Language') + '">' +
        '<button class="' + (en() ? '' : 'is-on') + '" data-act="fx-lang" data-arg="uk" lang="uk">УКР</button>' +
        '<button class="' + (en() ? 'is-on' : '') + '" data-act="fx-lang" data-arg="en" lang="en">ENG</button>' +
      '</div>' +
      '<input class="ref__q" data-ref-q type="search" placeholder="' + T('Знайти формулу…', 'Find a formula…') + '" ' +
        'value="' + U.esc(q || '') + '" autocomplete="off">' +
      '<button class="btn btn--ghost btn--sm" data-act="sheet-print">' + icon('download', 15) + T('Друк', 'Print') + '</button>' +
      /* Англійські шпаргалки — лише в англійському режимі: в українському
         це була б єдина англійська річ на сторінці. */
      (sheets.length && en()
        ? '<button class="btn btn--ghost btn--sm" data-act="nav" data-arg="#/sheet/' + sheets[0].id + '" ' +
          'title="Cheat sheets for Cambridge and Precalculus">' + icon('book', 15) + 'Cheat sheets</button>'
        : '') +
    '</div>';
  }

  function nav(cur) {
    var D = window.FORMULAS;
    return DOMAINS.map(function (d) {
      var secs = D.sections.filter(function (s) { return s.dom === d[0]; });
      if (!secs.length) return '';
      return '<div class="fxn__dom">' + T(d[1], d[2]) + '</div>' + secs.map(function (s) {
        return '<button class="ref__t' + (s.id === cur ? ' is-on' : '') + '" data-act="fx-sec" data-arg="' + s.id + '">' +
          '<span class="truncate">' + U.esc(secTitle(s)) + '</span>' +
          '<span class="fxn__n">' + s.items.length + '</span></button>';
      }).join('');
    }).join('');
  }

  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е'); }

  /* Пошук — вибраною мовою: українською в назвах, ключових словах і
     умовах, англійською — в англійських. Сам запис формули — однаковий. */
  function search(q) {
    var ql = norm(q), qs = ql.replace(/\s+/g, '');
    return window.FORMULAS.items.filter(function (raw) {
      var it = L(raw);
      var s = secById[raw.sec];
      var hay = norm((en()
        ? [it.t, raw.en, s && secTitle(s), it.w]
        : [it.t, raw.k, s && s.title, it.w]).join(' '));
      if (hay.indexOf(ql) >= 0) return true;
      return norm(raw.f).replace(/\s+/g, '').indexOf(qs) >= 0;
    });
  }

  V.formulas = function (query) {
    query = query || {};
    var q = String(query.q || '').trim();

    if (window.FORMULAS && state === 'idle') state = 'ready';
    if (window.FORMULAS_EN && stateEn === 'idle') stateEn = 'ready';
    if (!isReady()) {
      ensure();
      return '<div class="ref">' + bar(0, q) +
        (isFailed()
          ? '<div class="page"><div class="card">' +
              C.empty('alert', T('База формул не відкрилась', 'The formula base did not open'),
                T('Немає звʼязку, а на пристрої її ще немає.', 'No connection, and it is not on this device yet.'),
                '<button class="btn btn--primary" data-act="fx-retry">' + T('Спробувати ще', 'Try again') + '</button>') +
            '</div></div>'
          : '<div class="board-wait"></div>') +
        '</div>';
    }
    index();

    var D = window.FORMULAS;
    var sec = secById[query.s] || (query.f && byId[query.f] && secById[byId[query.f].sec]) || D.sections[0];
    var topic = query.topic && topicName[query.topic] ? query.topic : '';

    var head, body;
    if (q.length > 1) {
      var found = search(q);
      head = U.esc(q) + '<span class="ref__sub">' + N(found.length, 'знахідка', 'знахідки', 'знахідок', 'result', 'results') + '</span>';
      body = found.length
        ? found.slice(0, 60).map(function (it) { return card(it, { withSec: true }); }).join('')
        : '<div class="card">' + C.empty('search', T('Нічого не знайшлося', 'Nothing found'),
            T('Шукається в назвах, ключових словах і в самому записі формули: «синус суми», «a^2-b^2», «Герон».',
              'Search looks in titles, conditions and the formula itself: “sine of a sum”, “a^2-b^2”, “Heron”.')) + '</div>';
    } else if (topic) {
      var inTopic = D.items.filter(function (it) { return topicOf(it) === topic; });
      // назви тем карти — українські; англійською показуємо лише кількість
      head = T(U.esc(topicName[topic]), 'Map topic') + '<span class="ref__sub">' +
        N(inTopic.length, 'формула', 'формули', 'формул', 'formula', 'formulas') + T(' теми', '') + '</span>';
      body = '<div class="fx-topicbar"><button class="btn btn--ghost btn--sm" data-act="fx-sec" data-arg="' + sec.id + '">' +
          icon('arrowLeft', 15) + T('Усі розділи', 'All sections') + '</button></div>' +
        (inTopic.length
          ? inTopic.map(function (it) { return card(it, { withSec: true }); }).join('')
          : '<div class="card">' + C.empty('book', T('До цієї теми формул ще немає', 'No formulas for this topic yet'), '') + '</div>');
    } else {
      var allOpen = sec.items.every(function (it) { return !(it.p || []).length || open[it.id]; });
      var note = secNote(sec);
      head = U.esc(secTitle(sec)) + '<span class="ref__sub">' +
        N(sec.items.length, 'формула', 'формули', 'формул', 'formula', 'formulas') + '</span>' +
        '<button class="fx-all" data-act="fx-all" data-arg="' + sec.id + '">' +
          (allOpen ? T('Згорнути доведення', 'Collapse proofs') : T('Розгорнути всі доведення', 'Expand all proofs')) + '</button>';
      body = (note ? '<div class="fx-intro">' + fmt(note) + '</div>' : '') +
        sec.items.map(function (it) { return card(it); }).join('');
    }

    var proofs = D.items.filter(function (it) { return (it.p || []).length; }).length;
    return '<div class="ref ref--fx"' + (en() ? ' lang="en"' : '') + '>' + bar(D.items.length, q, proofs) +
      '<div class="ref__body">' +
        '<nav class="ref__nav fxn">' + nav(q.length > 1 || topic ? '' : sec.id) + '</nav>' +
        '<div class="ref__main" data-fx-main>' +
          '<div class="ref__h">' + head + '</div>' +
          '<div class="fx-list">' + body + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  };

  /** Після показу: прокрутити до формули з адреси й підсвітити її. */
  V.mountFormulas = function (query) {
    if (!query || !query.f || placedFor === location.hash) return;
    var el = document.getElementById('fx-' + query.f);
    var main = document.querySelector('[data-fx-main]');
    if (!el || !main) return;
    placedFor = location.hash;
    main.scrollTop = Math.max(0, el.offsetTop - main.offsetTop - 12);
    el.classList.add('is-hit');
    setTimeout(function () { el.classList.remove('is-hit'); }, 1600);
  };

  window.addEventListener('hashchange', function () { if (!onPage()) placedFor = null; });

  /** Формули теми карти — для шухляди теми. Порожньо, поки база не приїхала. */
  V.formulasForTopic = function (topicId, cb) {
    function give() {
      index();
      cb(window.FORMULAS.items.filter(function (it) { return topicOf(it) === topicId; })
        .map(function (it) { return { id: it.id, t: it.t, f: it.f }; }));
    }
    // завжди після поточного рендеру: місце для блоку ще тільки вставляють у сторінку
    if (window.FORMULAS && state !== 'loading') { state = 'ready'; setTimeout(give, 0); return; }
    need().then(function () { state = 'ready'; give(); }, function () {});
  };

  V.formulaActions = {
    'fx-proof': function (id) {
      open[id] = !open[id];
      var el = document.getElementById('fx-' + id);
      if (!el) return;
      el.classList.toggle('is-open', !!open[id]);
      var b = el.querySelector('.fx__proofbtn');
      if (b) b.setAttribute('aria-expanded', String(!!open[id]));
    },
    'fx-all': function (secId) {
      index();
      var s = secById[secId];
      if (!s) return;
      var withProof = s.items.filter(function (it) { return (it.p || []).length; });
      var allOpen = withProof.every(function (it) { return open[it.id]; });
      withProof.forEach(function (it) { open[it.id] = !allOpen; });
      window.App.render();
    },
    'fx-sec': function (id) { location.hash = '#/reference?s=' + id; },
    'fx-go': function (id) {
      index();
      var it = byId[id];
      if (!it) return;
      open[id] = true;
      var h = '#/reference?s=' + it.sec + '&f=' + id;
      if (location.hash === h) { placedFor = null; V.mountFormulas({ f: id }); }
      else location.hash = h;
    },
    'fx-retry': function () {
      if (state === 'failed') state = 'idle';
      if (stateEn === 'failed') stateEn = 'idle';
      window.App.render();
    },
    'fx-lang': function (l) {
      lang = l === 'en' ? 'en' : 'uk';
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* приватне вікно — лише до перезавантаження */ }
      window.App.render();
    }
  };

  /** Назва розділу у верхній смузі телефона — тією ж мовою, що й сама база. */
  V.formulasTitle = function () { return T('Формули', 'Formulas'); };
})();
