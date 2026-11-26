/* Множення й ділення дробів — наочно, предметами на вибір.

   Готова сцена «Візуалізувати», без Claude і без мережі: тут лише план
   (скільки клітинок, порцій, одиниць) і підписи кроків, а малює
   sceneMain — вона передається в ізольоване вікно сцени текстом, як і
   код від Claude (scene-runtime.js), тож живе й в учня так само.

   Три картинки:
   - ділення a : b — «скільки порцій по b у a»: кожну одиницю ділимо на
     клітинки, порції по b розфарбовуємо по черзі й нумеруємо;
   - множення на ціле n × f — n порцій по f, потім збираємо їх у цілі;
   - множення двох дробів — модель площі: смуга a, смуга b, перетин. */

(function (root) {
  'use strict';

  var F = {};

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function lcm(a, b) { return a / gcd(a, b) * b; }
  // dec — рахували десятковими: тоді й відповідь десятковим (2,16, а не 2 4/25)
  function reduce(p, q, dec) { var g = gcd(p, q); return { p: p / g, q: q / g, dec: !!dec }; }

  /* Число так, як його записали: 0,36 — це 36 сотих (не 9/25), бо
     показуємо саме соті; 2/3 — треті. Лише невідʼємні. */
  F.parse = function (s) {
    s = String(s == null ? '' : s).trim().replace(/\s+/g, ' ').replace(',', '.');
    var m;
    if ((m = /^(\d+)$/.exec(s))) return { p: +m[1], q: 1, t: String(+m[1]) };
    if ((m = /^(\d*)\.(\d{1,3})$/.exec(s))) {
      var q = Math.pow(10, m[2].length);
      return { p: (+(m[1] || 0)) * q + (+m[2]), q: q, t: String(+(m[1] || 0)) + ',' + m[2] };
    }
    if ((m = /^(\d+)\/(\d+)$/.exec(s)) && +m[2] > 0) return { p: +m[1], q: +m[2], t: +m[1] + '/' + +m[2] };
    if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(s)) && +m[3] > 0) {
      return { p: +m[1] * +m[3] + +m[2], q: +m[3], t: +m[1] + ' ' + +m[2] + '/' + +m[3] };
    }
    return null;
  };

  /** Клітинки однієї одиниці: соті — 10×10, решта — майже квадрат, ширший за висоту. */
  F.grid = function (D) {
    if (D <= 1) return { cols: 1, rows: 1 };
    if (/^10+$/.test(String(D))) return { cols: 10, rows: D / 10 };
    for (var c = Math.ceil(Math.sqrt(D)); c <= D; c++) if (D % c === 0) return { cols: c, rows: D / c };
    return { cols: D, rows: 1 };
  };

  var MAX_D = 400, MAX_UNITS = 30;

  F.plan = function (aStr, op, bStr) {
    var a = F.parse(aStr), b = F.parse(bStr);
    if (!a) return { error: 'Не схоже на число: «' + aStr + '»' };
    if (!b) return { error: 'Не схоже на число: «' + bStr + '»' };
    var dec = /,/.test(a.t + b.t);
    var div = /^[:\/÷]$/.test(String(op).trim());
    if (div) {
      if (b.p === 0) return { error: 'На нуль ділити не можна' };
      if (a.p === 0) return { error: 'Ділене — нуль: ділити нічого' };
      var D = lcm(a.q, b.q);
      if (D > MAX_D) return { error: 'Надто дрібні частини (' + D + ' в одиниці) — візьміть простіші числа' };
      var A = a.p * D / a.q, B = b.p * D / b.q, units = Math.ceil(A / D);
      if (units > MAX_UNITS) return { error: 'Забагато цілих (' + units + ') — візьміть менше ділене' };
      var full = Math.floor(A / B);
      return { kind: 'div', a: a, b: b, D: D, grid: F.grid(D), A: A, B: B, units: units,
               full: full, rem: A - full * B, res: reduce(A, B, dec), dec: dec };
    }
    if (a.p === 0 || b.p === 0) return { error: 'Множник — нуль: добуток нуль, показувати нічого' };
    if (a.q === 1 || b.q === 1) {
      var n = a.q === 1 ? a : b, f = n === a ? b : a;
      if (n.p > 12) return { error: 'Забагато порцій (' + n.p + ') — до 12' };
      if (f.q > MAX_D) return { error: 'Надто дрібні частини (' + f.q + ') — візьміть простіше число' };
      var upg = Math.ceil(f.p / f.q), total = n.p * f.p, resUnits = Math.ceil(total / f.q);
      if (upg > 6 || resUnits > MAX_UNITS) return { error: 'Завелике число — до 6 цілих у порції й 30 разом' };
      return { kind: 'groups', a: a, b: b, n: n, f: f, D: f.q, grid: F.grid(f.q), per: f.p, upg: upg,
               total: total, resUnits: resUnits, res: reduce(total, f.q, dec), dec: dec };
    }
    var W = Math.ceil(a.p / a.q), H = Math.ceil(b.p / b.q);
    if (W * H > 16) return { error: 'Завеликі множники — до 16 цілих клітин' };
    if (W * a.q + H * b.q > 600) return { error: 'Надто дрібні частини — візьміть простіші дроби' };
    return { kind: 'area', a: a, b: b, W: W, H: H, cells: a.p * b.p, cell: a.q * b.q,
             res: reduce(a.p * b.p, a.q * b.q, dec), dec: dec };
  };

  function onlyTwosFives(q) { while (q % 2 === 0) q /= 2; while (q % 5 === 0) q /= 5; return q === 1; }
  function decimal(p, q, digits) {
    var s = (p / q).toFixed(digits).replace(/\.?0+$/, '');
    return s.replace('.', ',');
  }

  /** Відповідь: ціле; точний десятковий, якщо й рахували десятковими; інакше дріб (≈ десятковий). */
  F.answer = function (res, dec) {
    var p = res.p, q = res.q;
    if (dec == null) dec = !!res.dec;
    if (q === 1) return String(p);
    var whole = Math.floor(p / q), r = p - whole * q;
    var frac = (whole ? whole + ' ' : '') + r + '/' + q;
    if (onlyTwosFives(q)) return dec ? decimal(p, q, 6) : frac;
    return frac + ' ≈ ' + decimal(p, q, 2);
  };

  function pl(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }

  F.SKINS = {
    melon: { label: 'Кавуни', emoji: '🍉', one: 'кавун', few: 'кавуни', many: 'кавунів', gen: 'кавуна',
             rind: '#2F9E44', fill: '#FF6B6B', alt: '#C92A2A', empty: '#FFF0F0' },
    money: { label: 'Гроші (гривні)', emoji: '💵', one: 'гривня', few: 'гривні', many: 'гривень', gen: 'гривні',
             rind: '#2B8A3E', fill: '#51CF66', alt: '#2B8A3E', empty: '#F1FBF3', cents: true },
    choco: { label: 'Шоколадки', emoji: '🍫', one: 'шоколадка', few: 'шоколадки', many: 'шоколадок', gen: 'шоколадки',
             rind: '#5C3317', fill: '#B07A4E', alt: '#7A4A26', empty: '#F3E6DA' },
    pizza: { label: 'Піци', emoji: '🍕', one: 'піца', few: 'піци', many: 'піц', gen: 'піци',
             rind: '#C2410C', fill: '#FFA94D', alt: '#E8590C', empty: '#FFF8F0' }
  };

  function amount(x, K) {
    return x.t + ' ' + (x.q === 1 ? pl(x.p, K.one, K.few, K.many) : K.gen);
  }
  function parts(n) { return n + ' ' + pl(n, 'частина', 'частини', 'частин'); }

  /** Назви кроків і підписи до них — для плану й предмета. */
  F.captions = function (P, K) {
    var ans = F.answer(P.res);
    if (P.kind === 'div') {
      var cents = K.cents && P.D === 100;
      return {
        titles: ['Що маємо', 'Ділимо на частини', 'Відкладаємо порції', 'Відповідь'],
        caps: [
          'Маємо ' + amount(P.a, K) + '. Скільки порцій по ' + P.b.t + ' з них вийде?',
          P.D === 1 ? 'Порція — ' + amount(P.b, K) + '.'
            : cents ? 'Кожна гривня — це 100 копійок. Порція ' + P.b.t + ' грн = ' + P.B + ' коп.'
            : 'Ділимо кожну одиницю на ' + parts(P.D) + '. Порція ' + P.b.t + ' = ' + parts(P.B) + '.',
          'Відкладаємо порції по ' + P.B + ': ' + P.full + ' ' + pl(P.full, 'повна', 'повні', 'повних') +
            (P.rem ? ' і ще ' + P.rem + ' з ' + P.B + ' — це ' + reduce(P.rem, P.B).p + '/' + reduce(P.rem, P.B).q + ' порції' : '') + '.',
          P.a.t + ' : ' + P.b.t + ' = ' + ans
        ]
      };
    }
    if (P.kind === 'groups') {
      var whole = Math.floor(P.total / P.D), left = P.total - whole * P.D;
      return {
        titles: ['Порції', 'Заповнюємо', 'Збираємо в цілі', 'Відповідь'],
        caps: [
          P.n.p + ' ' + pl(P.n.p, 'порція', 'порції', 'порцій') + ' по ' + amount(P.f, K) + '.',
          P.D === 1 ? 'У кожній — ' + amount(P.f, K) + '.'
            : 'У кожній — ' + P.f.t + ': ' + P.per + ' з ' + parts(P.D) + '.',
          P.D === 1 ? 'Разом — ' + amount({ p: P.total, q: 1, t: String(P.total) }, K) + '.'
            : 'Збираємо разом: ' + parts(P.total) + ' = ' + whole + ' ' + pl(whole, 'ціла', 'цілі', 'цілих') +
              (left ? ' і ' + left + ' з ' + P.D : '') + '.',
          P.a.t + ' × ' + P.b.t + ' = ' + ans
        ]
      };
    }
    return {
      titles: ['Перший множник', 'Другий множник', 'Перетин', 'Відповідь'],
      caps: [
        'По горизонталі — ' + P.a.t + (P.a.q > 1 ? ': кожну одиницю ділимо на ' + P.a.q + ' смуг' : '') + '.',
        'По вертикалі — ' + P.b.t + (P.b.q > 1 ? ': на ' + P.b.q + ' смуг' : '') + '.',
        'Перетин — ' + P.cells + ' ' + pl(P.cells, 'клітинка', 'клітинки', 'клітинок') +
          ', кожна — 1/' + P.cell + ' ' + K.gen + '.',
        P.a.t + ' × ' + P.b.t + ' = ' + ans
      ]
    };
  };

  F.title = function (P) {
    return P.a.t + (P.kind === 'div' ? ' : ' : ' × ') + P.b.t;
  };

  /* ============================================================
     Сцена. Самодостатня: передається текстом у вікно сцени, тож
     жодних імен ззовні — лише S, THREE, P і document того вікна.
     ============================================================ */

  function sceneMain(S, THREE, P) {
    var K = P.skin, GAP = 0.3, EM = 0.5, REST = '#CED4DA', LINE = '#FFFFFF';

    function rects(list) {                          // [x1, y1, x2, y2, колір, z] — однією сіткою
      if (!list.length) return;
      var pos = [], cl = [], c = new THREE.Color();
      list.forEach(function (r) {
        c.set(r[4]);
        var z = r[5] || 0;
        pos.push(r[0], r[1], z, r[2], r[1], z, r[2], r[3], z, r[0], r[1], z, r[2], r[3], z, r[0], r[3], z);
        for (var i = 0; i < 6; i++) cl.push(c.r, c.g, c.b);
      });
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
      S.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    }
    function lines(segs, color, z) {
      if (!segs.length) return;
      var pts = [];
      segs.forEach(function (s) { pts.push(new THREE.Vector3(s[0], s[1], z), new THREE.Vector3(s[2], s[3], z)); });
      S.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: color })));
    }
    var tex = null;
    function emoji(x, y, s) {
      if (!tex) {
        var cv = document.createElement('canvas');
        cv.width = cv.height = 128;
        var g = cv.getContext('2d');
        g.font = '100px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(K.emoji, 64, 70);
        tex = new THREE.CanvasTexture(cv);
        if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      }
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sp.position.set(x, y, 0.05); sp.scale.set(s, s, 1);
      S.add(sp);
    }
    // одиниця: шкірка (рамка кольору предмета) і порожнє «тіло»; x, y — лівий верхній кут
    function unit(list, x, y) {
      list.push([x - 0.05, y - 1.05, x + 1.05, y + 0.05, K.rind, 0], [x, y - 1, x + 1, y, K.empty, 0.004]);
    }
    function cell(x, y, j, cols, rows, color) {
      var r = Math.floor(j / cols), c = j - r * cols;
      return [x + c / cols, y - (r + 1) / rows, x + (c + 1) / cols, y - r / rows, color, 0.01];
    }
    function gridOf(segs, x, y, cols, rows) {
      for (var c = 1; c < cols; c++) segs.push([x + c / cols, y - 1, x + c / cols, y]);
      for (var r = 1; r < rows; r++) segs.push([x, y - r / rows, x + 1, y - r / rows]);
    }
    function fit(x1, x2, y1, y2) {
      var el = document.getElementById('sc-root');
      var asp = el && el.clientWidth && el.clientHeight ? el.clientWidth / el.clientHeight : 1.6;
      var w = x2 - x1, h = y2 - y1;
      var H = Math.max(h, w / asp) * 1.2 + 0.6;
      var cy = (y1 + y2) / 2 - H * 0.06;               // трохи місця знизу — там кроки
      S.view2d({ x: [x1, x2], y: [cy - H / 2, cy + H / 2] });
    }

    var cols = P.grid ? P.grid.cols : 1, rows = P.grid ? P.grid.rows : 1;
    S.steps(P.titles);

    if (P.kind === 'div') {
      var per = Math.min(P.units, 6), rowsU = Math.ceil(P.units / per);
      var at = function (u) { return { x: (u % per) * (1 + GAP), y: -Math.floor(u / per) * (1 + GAP + EM) }; };
      fit(-0.2, per * (1 + GAP) - GAP + 0.2, -(rowsU - 1) * (1 + GAP + EM) - 1.2, EM + 0.1);
      S.build(function (p) {
        var st = p.step, list = [], segs = [];
        for (var u = 0; u < P.units; u++) { var o = at(u); unit(list, o.x, o.y); emoji(o.x + 0.5, o.y + EM * 0.55, EM * 0.85); }
        for (var k = 0; k < P.A; k++) {
          var q = at(Math.floor(k / P.D)), g = Math.floor(k / P.B);
          var color = st < 2 ? K.fill : g < P.full ? (g % 2 ? K.alt : K.fill) : REST;
          list.push(cell(q.x, q.y, k % P.D, cols, rows, color));
        }
        rects(list);
        if (st >= 1 && P.D > 1) for (u = 0; u < P.units; u++) { var w = at(u); gridOf(segs, w.x, w.y, cols, rows); }
        lines(segs, LINE, 0.02);
        var groups = P.full + (P.rem ? 1 : 0);
        if (st >= 2 && groups <= 60) {
          for (var gi = 0; gi < groups; gi++) {
            var len = Math.min(P.B, P.A - gi * P.B), mid = gi * P.B + Math.floor((len - 1) / 2);
            var m = at(Math.floor(mid / P.D)), c = cell(m.x, m.y, mid % P.D, cols, rows, '');
            S.label(gi < P.full ? String(gi + 1) : P.rem + '/' + P.B,
              [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2, 0.1], { size: 12, color: '#17163A' });
          }
        }
        S.caption(P.caps[st]);
      });
      return;
    }

    if (P.kind === 'groups') {
      /* Порції — рядами (а не стовпчиком: шість одна під одною виходили
         дрібними), між порціями ширший проміжок; зібране — нижче. */
      var GW = P.upg * (1 + GAP) + 0.35;              // ширина порції з проміжком
      var gPer = Math.max(1, Math.min(P.n.p, Math.floor(7 / P.upg))), gRows = Math.ceil(P.n.p / gPer);
      var gx = function (r) { return (r % gPer) * GW; };
      var gy = function (r) { return -Math.floor(r / gPer) * (1 + GAP + EM); };
      var Y0 = gy(P.n.p - 1) - 1 - 0.7;               // зібране — нижче за порції
      var resPer = Math.min(P.resUnits, 8), resRows = Math.ceil(P.resUnits / resPer);
      var ra = function (u) { return { x: (u % resPer) * (1 + GAP), y: Y0 - EM - Math.floor(u / resPer) * (1 + GAP + EM) }; };
      var right = Math.max(gPer * GW - 0.35 - GAP, resPer * (1 + GAP) - GAP);
      fit(-0.2, right + 0.2, Y0 - EM - (resRows - 1) * (1 + GAP + EM) - 1.2, EM + 0.1);
      S.build(function (p) {
        var st = p.step, list = [], segs = [];
        for (var r = 0; r < P.n.p; r++) {
          for (var u = 0; u < P.upg; u++) {
            unit(list, gx(r) + u * (1 + GAP), gy(r));
            emoji(gx(r) + u * (1 + GAP) + 0.5, gy(r) + EM * 0.55, EM * 0.85);
          }
          if (st >= 1) {
            for (var k = 0; k < P.per; k++) {
              list.push(cell(gx(r) + Math.floor(k / P.D) * (1 + GAP), gy(r), k % P.D, cols, rows, r % 2 ? K.alt : K.fill));
            }
          }
          if (P.D > 1) for (u = 0; u < P.upg; u++) gridOf(segs, gx(r) + u * (1 + GAP), gy(r), cols, rows);
        }
        if (st >= 2) {
          for (var v = 0; v < P.resUnits; v++) { var o = ra(v); unit(list, o.x, o.y); emoji(o.x + 0.5, o.y + EM * 0.55, EM * 0.85); }
          for (k = 0; k < P.total; k++) {
            var q = ra(Math.floor(k / P.D));
            list.push(cell(q.x, q.y, k % P.D, cols, rows, Math.floor(k / P.per) % 2 ? K.alt : K.fill));
          }
          if (P.D > 1) for (v = 0; v < P.resUnits; v++) { var w = ra(v); gridOf(segs, w.x, w.y, cols, rows); }
        }
        rects(list);
        lines(segs, LINE, 0.02);
        S.caption(P.caps[st]);
      });
      return;
    }

    // модель площі: одиниці — квадрати W×H, смуга a — зліва, смуга b — знизу
    var G2 = 0.08;
    var ax = P.a.p / P.a.q, by = P.b.p / P.b.q;
    var pos = function (i, j) { return { x: i * (1 + G2), y: j * (1 + G2) }; };
    var aw = ax + Math.max(0, Math.ceil(ax) - 1) * G2, bh = by + Math.max(0, Math.ceil(by) - 1) * G2;
    fit(-0.6, P.W * (1 + G2), -0.5, P.H * (1 + G2) + EM);
    S.build(function (p) {
      var st = p.step, list = [], segs = [];
      for (var i = 0; i < P.W; i++) for (var j = 0; j < P.H; j++) {
        var o = pos(i, j), wa = Math.max(0, Math.min(1, ax - i)), hb = Math.max(0, Math.min(1, by - j));
        list.push([o.x - 0.04, o.y - 0.04, o.x + 1.04, o.y + 1.04, K.rind, 0], [o.x, o.y, o.x + 1, o.y + 1, K.empty, 0.004]);
        if (wa) list.push([o.x, o.y, o.x + wa, o.y + 1, '#D0EBFF', 0.006]);
        if (st >= 1 && hb) list.push([o.x, o.y, o.x + 1, o.y + hb, '#FFF3BF', 0.007]);
        if (st >= 2 && wa && hb) list.push([o.x, o.y, o.x + wa, o.y + hb, K.fill, 0.008]);
        for (var c = 1; c < P.a.q; c++) segs.push([o.x + c / P.a.q, o.y, o.x + c / P.a.q, o.y + 1]);
        for (var r = 1; r < P.b.q; r++) segs.push([o.x, o.y + r / P.b.q, o.x + 1, o.y + r / P.b.q]);
      }
      for (i = 0; i < P.W; i++) emoji(pos(i, P.H - 1).x + 0.5, P.H * (1 + G2) + EM * 0.4, EM * 0.8);
      rects(list);
      lines(segs, '#ADB5BD', 0.02);
      S.label(P.a.t, [aw / 2, -0.25, 0.1], { size: 14, color: '#1C7ED6' });
      if (st >= 1) S.label(P.b.t, [-0.35, bh / 2, 0.1], { size: 14, color: '#E67700' });
      S.caption(P.caps[st]);
    });
  }

  /** Код сцени для плану й предмета — текстом, для вікна сцени. */
  F.code = function (P, skinKey) {
    var K = F.SKINS[skinKey] || F.SKINS.melon;
    var c = F.captions(P, K);
    var data = {};
    Object.keys(P).forEach(function (k) { data[k] = P[k]; });
    data.skin = K; data.titles = c.titles; data.caps = c.caps;
    return '/* Дроби: ' + F.title(P) + ' (assets/js/fracviz.js) */\n' +
      '(' + sceneMain.toString() + ')(S, THREE, ' + JSON.stringify(data) + ');';
  };

  root.FracViz = F;
})(window);
