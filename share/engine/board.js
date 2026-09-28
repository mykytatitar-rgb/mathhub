/* Полотно дошки: нескінченна площина з масштабуванням, інструментами та історією.
   Координати об'єктів зберігаються у «світових» одиницях і не залежать від масштабу. */
(function () {
  'use strict';

  /* ============================================================
     Формат об'єктів (компактний, щоб не роздувати сховище)
     ------------------------------------------------------------
     {t:'p', c, w, d:[x,y,x,y,…]}                — крива від руки
     {t:'l'|'a', c, w, a:[x1,y1,x2,y2]}          — лінія / стрілка
     {t:'r'|'e', c, w, a:[…]}                    — старі прямокутник / еліпс
     {t:'g', c, w, sh:'hex', f:fill, a:[…]}      — геометрична фігура
     {t:'x', c, s, p:[x,y], v:'текст'}           — напис
     {t:'i', k:'img_…', r:aspect, a:[…]}         — картинка
     ============================================================ */

  var MIN_SCALE = 0.02, MAX_SCALE = 32;   // від 2% до 3200%
  var HANDLE_PX = 10;

  function round(n) { return Math.round(n * 10) / 10; }

  function uid(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* Стійкий номер у кожного об'єкта на дошці.

     Досі номер був лише у фігур. Поки дошка зберігалася цілком, цього
     вистачало: запис казав «ось усе, що тепер на слайді». Але такий запис
     завжди вміє стирати, і двоє одночасно малювати не можуть — другий
     затирає першого.

     З номером можна сказати «пересунули оцей об'єкт», не згадуючи решти.
     Тоді дії двох людей просто лягають поруч.

     Копія при вставці дістає новий номер: інакше вона була б тим самим
     об'єктом, і рухати їх довелося б разом. */
  function ided(it) { if (it && !it.id) it.id = uid('it'); return it; }
  function reided(it) { if (it) it.id = uid('it'); return it; }

  /* Геометрія побудов (висота, медіана…) не зберігається у файлі, а
     перераховується з батьківської фігури. Тримаємо її поза об'єктом,
     щоб вона не потрапляла ні в localStorage, ні в знімки історії. */
  var prims = new WeakMap();

  /* ============================================================
     Геометричні фігури: нормалізовані вершини у квадраті 0..1
     ============================================================ */

  function regular(n) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      pts.push([0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]);
    }
    return pts;
  }

  function star(n, inner) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) {
      var r = (i % 2) ? inner : 0.5;
      var a = -Math.PI / 2 + i * Math.PI / n;
      pts.push([0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]);
    }
    return pts;
  }

  /**
   * Розтягнути точки на весь квадрат 0..1 і повернути природне відношення
   * сторін рамки. Для правильних фігур це відношення треба тримати, інакше
   * «правильний шестикутник» вийде зі сторонами різної довжини.
   */
  function fitPts(pts) {
    var xs = pts.map(function (p) { return p[0]; });
    var ys = pts.map(function (p) { return p[1]; });
    var x1 = Math.min.apply(null, xs), x2 = Math.max.apply(null, xs);
    var y1 = Math.min.apply(null, ys), y2 = Math.max.apply(null, ys);
    var w = Math.max(1e-9, x2 - x1), h = Math.max(1e-9, y2 - y1);
    return {
      pts: pts.map(function (p) {
        return [Math.round((p[0] - x1) / w * 1e4) / 1e4, Math.round((p[1] - y1) / h * 1e4) / 1e4];
      }),
      ar: w / h
    };
  }

  /** Правильний n-кутник із зафіксованим відношенням сторін рамки. */
  function regularShape(label, n) {
    var f = fitPts(regular(n));
    return { label: label, pts: f.pts, lock: true, ar: f.ar };
  }

  function starShape(label, n, inner) {
    var f = fitPts(star(n, inner));
    return { label: label, pts: f.pts, lock: true, ar: f.ar };
  }

  var SHAPES = {
    /* --- трикутники --- */
    // рівносторонній: висота = a·√3/2, тому рамка мусить бути ширшою за висоту
    'tri-eq':    { label: 'Рівносторонній трикутник', pts: [[.5, 0], [1, 1], [0, 1]],
                   lock: true, ar: 2 / Math.sqrt(3) },
    'tri-iso':   { label: 'Рівнобедрений трикутник',  pts: [[.5, 0], [.88, 1], [.12, 1]] },
    'tri-right': { label: 'Прямокутний трикутник',    pts: [[0, 0], [0, 1], [1, 1]] },
    'tri-obt':   { label: 'Тупокутний трикутник',     pts: [[0, 0], [1, 1], [.35, 1]] },
    'tri-sca':   { label: 'Довільний (різнобічний) трикутник', pts: [[.32, 0], [1, .78], [0, 1]] },

    /* --- чотирикутники --- */
    'square':    { label: 'Квадрат',               pts: [[0, 0], [1, 0], [1, 1], [0, 1]],
                   lock: true, ar: 1 },
    'rect':      { label: 'Прямокутник',           pts: [[0, 0], [1, 0], [1, 1], [0, 1]] },
    'parallel':  { label: 'Паралелограм',          pts: [[.28, 0], [1, 0], [.72, 1], [0, 1]] },
    'rhombus':   { label: 'Ромб',                  pts: [[.5, 0], [1, .5], [.5, 1], [0, .5]] },
    'trap':      { label: 'Рівнобічна трапеція',   pts: [[.25, 0], [.75, 0], [1, 1], [0, 1]] },
    'trap-right':{ label: 'Прямокутна трапеція',   pts: [[0, 0], [.68, 0], [1, 1], [0, 1]] },
    'kite':      { label: 'Дельтоїд',              pts: [[.5, 0], [1, .38], [.5, 1], [0, .38]] },
    'quad-concave': { label: 'Неопуклий чотирикутник',
                      pts: [[0, 0], [.5, .42], [1, 0], [.5, 1]] },
    'quad-free': { label: 'Довільний чотирикутник',
                   pts: [[.12, .14], [.9, 0], [1, .8], [0, 1]] },
    'trap-free': { label: 'Довільна трапеція',
                   pts: [[.18, 0], [.62, 0], [1, 1], [0, 1]] },

    /* --- правильні багатокутники --- */
    'pent': regularShape("Правильний п'ятикутник", 5),
    'hex':  regularShape('Правильний шестикутник', 6),
    'hept': regularShape('Правильний семикутник', 7),
    'oct':  regularShape('Правильний восьмикутник', 8),

    /* --- неопуклі --- */
    // внутрішній радіус за канонічними пропорціями: пентаграма — 1/φ², зірка
    // Давида — 1/√3. З довільними числами вийшла б не зірка, а розетка.
    'star5':   starShape('Неопуклий: зірка п’ятикутна', 5, 0.5 / (1.6180339887 * 1.6180339887)),
    'star6':   starShape('Неопуклий: зірка шестикутна', 6, 0.5 / Math.sqrt(3)),
    'concave': { label: 'Неопуклий: Г-подібний',
                 pts: [[0, 0], [.42, 0], [.42, .58], [1, .58], [1, 1], [0, 1]] },
    // рівні третини — щоб усі дванадцять сторін були однакові (п'ять рівних квадратів)
    'cross':   { label: 'Неопуклий: хрест',
                 pts: [[1 / 3, 0], [2 / 3, 0], [2 / 3, 1 / 3], [1, 1 / 3], [1, 2 / 3], [2 / 3, 2 / 3],
                       [2 / 3, 1], [1 / 3, 1], [1 / 3, 2 / 3], [0, 2 / 3], [0, 1 / 3], [1 / 3, 1 / 3]],
                 lock: true, ar: 1 },
    'chevron': { label: 'Неопуклий: шеврон',
                 pts: [[0, 0], [.55, 0], [1, .5], [.55, 1], [0, 1], [.45, .5]] },

    /* --- круглі --- */
    'circle':  { label: 'Коло',   round: true, lock: true, ar: 1 },
    'ellipse': { label: 'Еліпс',  round: true }
  };

  var SHAPE_GROUPS = [
    { label: 'Трикутники',   ids: ['tri-eq', 'tri-iso', 'tri-right', 'tri-obt', 'tri-sca'] },
    { label: 'Чотирикутники', ids: ['square', 'rect', 'parallel', 'rhombus', 'trap', 'trap-right',
                                    'trap-free', 'kite', 'quad-concave', 'quad-free'] },
    { label: 'Багатокутники', ids: ['pent', 'hex', 'hept', 'oct'] },
    { label: 'Неопуклі',     ids: ['star5', 'star6', 'concave', 'cross', 'chevron'] },
    { label: 'Круглі',       ids: ['circle', 'ellipse'] }
  ];

  /**
   * Абсолютні вершини фігури за її рамкою.
   * `it.pts` (нормалізовані 0..1) перекриває типову форму — так зберігаються
   * фігури, побудовані за заданими сторонами.
   */
  function shapePoints(it) {
    var base = it.pts || (SHAPES[it.sh] && SHAPES[it.sh].pts);
    if (!base) return null;
    var x1 = Math.min(it.a[0], it.a[2]), y1 = Math.min(it.a[1], it.a[3]);
    var w = Math.abs(it.a[2] - it.a[0]), h = Math.abs(it.a[3] - it.a[1]);

    /* fx — дзеркало по горизонталі, fy — по вертикалі. Потрібне передусім
       прямокутному трикутнику: у задачах прямий кут буває і зліва, і справа.
       Робимо це для всіх фігур, бо коштує рівно нічого. */
    var out = base.map(function (p) {
      var px = it.fx ? (1 - p[0]) : p[0];
      var py = it.fy ? (1 - p[1]) : p[1];
      return [x1 + px * w, y1 + py * h];
    });

    /* Поворот застосовуємо тут, а не під час малювання. Тоді його бачать
       усі: влучання мишею, межі, підписи вершин і — головне — побудови.
       Висота поверненого трикутника лишається висотою, бо вона будується
       з тих самих точок, а не з рамки. */
    return rotatePts(out, it.rot, x1 + w / 2, y1 + h / 2);
  }

  /** Повернути набір точок навколо центра. Кут — у градусах, за годинником. */
  function rotatePts(pts, deg, cx, cy) {
    var a = (deg || 0) * Math.PI / 180;
    if (!a) return pts;
    var co = Math.cos(a), si = Math.sin(a);
    return pts.map(function (p) {
      var dx = p[0] - cx, dy = p[1] - cy;
      return [cx + dx * co - dy * si, cy + dx * si + dy * co];
    });
  }

  /** Нормалізувати набір абсолютних точок у квадрат 0..1 + рамку. */
  function normalizePoints(pts) {
    var xs = pts.map(function (p) { return p[0]; });
    var ys = pts.map(function (p) { return p[1]; });
    var x1 = Math.min.apply(null, xs), x2 = Math.max.apply(null, xs);
    var y1 = Math.min.apply(null, ys), y2 = Math.max.apply(null, ys);
    var w = Math.max(1e-6, x2 - x1), h = Math.max(1e-6, y2 - y1);
    return {
      pts: pts.map(function (p) {
        return [Math.round((p[0] - x1) / w * 1e4) / 1e4, Math.round((p[1] - y1) / h * 1e4) / 1e4];
      }),
      w: w, h: h
    };
  }

  /** Маленька SVG-іконка фігури для панелі вибору. */
  function shapeIcon(id, size) {
    var sh = SHAPES[id];
    if (!sh) return '';
    var s = size || 22, pad = 2.5, inner = s - pad * 2;
    var body;
    if (sh.round) {
      var rx = inner / 2, ry = id === 'ellipse' ? inner / 2.7 : inner / 2;
      body = '<ellipse cx="' + (s / 2) + '" cy="' + (s / 2) + '" rx="' + rx + '" ry="' + ry + '"/>';
    } else {
      body = '<polygon points="' + sh.pts.map(function (p) {
        return (pad + p[0] * inner).toFixed(1) + ',' + (pad + p[1] * inner).toFixed(1);
      }).join(' ') + '"/>';
    }
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + ' ' + s + '" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">' + body + '</svg>';
  }

  /* ============================================================
     Корекція почерку: прибрати дрижання й згладити лінію
     ============================================================ */

  /** Спрощення Рамера — Дугласа — Пекера: викидає точки, що майже на прямій. */
  function rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    var first = 0, last = pts.length - 1;
    var maxD = -1, idx = -1;
    for (var i = first + 1; i < last; i++) {
      var d = distToSegment(pts[i][0], pts[i][1],
        pts[first][0], pts[first][1], pts[last][0], pts[last][1]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD <= eps) return [pts[first], pts[last]];
    var left = rdp(pts.slice(first, idx + 1), eps);
    var right = rdp(pts.slice(idx), eps);
    return left.slice(0, left.length - 1).concat(right);
  }

  /** Згладжування Чайкіна: зрізає різкі злами, лінія стає плавною. */
  function chaikin(pts, keepEnds) {
    if (pts.length < 3) return pts.slice();
    var out = [pts[0]];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    return keepEnds === false ? out.slice(1, out.length - 1) : out;
  }

  /**
   * Виправити криву від руки. Спершу прибираємо дрижання (rdp), потім
   * згладжуємо (chaikin). Кінці лишаються на місці, тому лінія не «повзе».
   */
  /** Ковзне середнє: гасить саме дрижання руки, не змінюючи форму. */
  function movingAverage(pts, radius) {
    if (pts.length < 5) return pts;
    var out = [pts[0]];
    for (var i = 1; i < pts.length - 1; i++) {
      var sx = 0, sy = 0, n = 0;
      for (var k = -radius; k <= radius; k++) {
        var j = i + k;
        if (j < 0 || j >= pts.length) continue;
        sx += pts[j][0]; sy += pts[j][1]; n++;
      }
      out.push([sx / n, sy / n]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  /**
   * level: 1 — звичайна корекція, 2 — сильна.
   * Спершу гасимо дрижання ковзним середнім, потім прибираємо зайві точки
   * (rdp) і згладжуємо (chaikin). Кінці лишаються на місці.
   */
  function smoothStroke(flat, width, level) {
    if (!flat || flat.length < 8) return flat;      // надто короткий штрих не чіпаємо
    var lv = level == null ? 1 : level;
    if (!lv) return flat;

    var pts = [];
    for (var i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);

    var strong = lv >= 2;
    pts = movingAverage(pts, strong ? 2 : 1);

    /* Легкий рівень навмисно майже не спрощує лінію: саме викидання точок
       і подвійне згладжування перетворювало рукописний текст на друкований.
       Тепер він лише гасить дрижання руки, а форма букв лишається своєю.
       Сильний рівень — для схем і креслень, де потрібні рівні дуги. */
    var eps = strong
      ? Math.max(1.6, (width || 3) * 0.7)
      : Math.max(0.35, (width || 3) * 0.12);
    var simple = rdp(pts, eps);

    // якщо після спрощення лишилось дуже мало точок — це вже пряма, згладжувати нічого
    var smooth = simple;
    if (simple.length >= 3 && strong) {
      smooth = chaikin(chaikin(simple));
    }

    var out = [];
    for (var j = 0; j < smooth.length; j++) {
      out.push(round(smooth[j][0]), round(smooth[j][1]));
    }
    return out;
  }

  /* ============================================================
     Виміри фігур: умовні одиниці, довжини сторін, кути
     ============================================================ */

  var UNIT = 10;   // скільки пікселів полотна в одній умовній одиниці

  function fmtLen(worldLen) {
    var v = worldLen / UNIT;
    var s = (Math.round(v * 10) / 10).toFixed(1);
    if (s.slice(-2) === '.0') s = s.slice(0, -2);
    return s.replace('.', ',');
  }

  /** Сторони, кути, площа й периметр многокутника (абсолютні точки). */
  function polyMeasure(pts) {
    var n = pts.length, i;
    var cx = 0, cy = 0;
    for (i = 0; i < n; i++) { cx += pts[i][0]; cy += pts[i][1]; }
    cx /= n; cy /= n;

    // знак площі задає обхід — потрібен, щоб відрізнити рефлексні кути
    var area2 = 0;
    for (i = 0; i < n; i++) {
      var p1 = pts[i], p2 = pts[(i + 1) % n];
      area2 += p1[0] * p2[1] - p2[0] * p1[1];
    }
    var orient = area2 >= 0 ? 1 : -1;

    var sides = [], angles = [], perim = 0;
    for (i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      perim += len;
      sides.push({ i: i, len: len, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] });

      var prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
      var v1 = [prev[0] - a[0], prev[1] - a[1]];
      var v2 = [next[0] - a[0], next[1] - a[1]];
      var m1 = Math.hypot(v1[0], v1[1]) || 1, m2 = Math.hypot(v2[0], v2[1]) || 1;
      var cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (m1 * m2);
      var deg = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;

      var e1 = [a[0] - prev[0], a[1] - prev[1]];
      var e2 = [next[0] - a[0], next[1] - a[1]];
      if ((e1[0] * e2[1] - e1[1] * e2[0]) * orient < 0) deg = 360 - deg;   // рефлексний

      angles.push({ i: i, deg: deg, at: a });
    }

    return { sides: sides, angles: angles, centroid: [cx, cy],
             area: Math.abs(area2) / 2, perimeter: perim };
  }

  /** Виміри фігури у зручному для показу вигляді. */
  function shapeMeasure(it) {
    var sh = SHAPES[it.sh];
    var b = itemBounds(it);
    if (!b) return null;
    var w = b.x2 - b.x1, h = b.y2 - b.y1;

    if (sh && sh.round) {
      return { round: true, rx: w / 2, ry: h / 2, w: w, h: h,
               centroid: [(b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2] };
    }
    var pts = shapePoints(it);
    if (!pts) return null;
    var m = polyMeasure(pts);
    m.round = false;
    m.w = w; m.h = h;
    m.pts = pts;
    return m;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** Зібрати підписи вимірів у світових координатах (+ зсув у пікселях екрана). */
  function collectMeasureLabels(it, out) {
    var m = shapeMeasure(it);
    if (!m) return;

    if (m.round) {
      var text = Math.abs(m.rx - m.ry) < 0.5
        ? 'R = ' + fmtLen(m.rx)
        : 'a = ' + fmtLen(m.rx) + ' · b = ' + fmtLen(m.ry);
      out.push({ w: m.centroid, text: text, kind: 's' });
      return;
    }
    // понад 8 вершин — підписи злилися б у кашу
    if (m.pts.length > 8) return;

    var c = m.centroid;
    m.sides.forEach(function (s) {
      var dx = s.mid[0] - c[0], dy = s.mid[1] - c[1];
      var d = Math.hypot(dx, dy) || 1;
      out.push({ w: s.mid, off: [dx / d, dy / d], offPx: 15, text: fmtLen(s.len), kind: 's' });
    });
    m.angles.forEach(function (A) {
      var dx = c[0] - A.at[0], dy = c[1] - A.at[1];
      var d = Math.hypot(dx, dy) || 1;
      /* Кут можна підписати вручну. Потрібно на кресленнях до задачі:
         там кут «за умовою» 30°, а намальований від руки — 34°, і показувати
         треба саме умову. it.ang — {номер вершини: підпис}. */
      var man = it.ang && it.ang[A.i];
      var txt = (man == null || man === '')
        ? Math.round(A.deg) + '°'
        : (/^-?\d+([.,]\d+)?$/.test(String(man)) ? String(man) + '°' : String(man));
      out.push({ w: A.at, off: [dx / d, dy / d], offPx: 26,
                 text: txt, kind: 'a', manual: man != null && man !== '' });
    });
  }

  /* ============================================================
     Геометрія об'єктів
     ============================================================ */

  function itemBounds(it) {
    var xs = [], ys = [], i;
    if (it.t === 'd') {
      var g = prims.get(it);
      if (!g) return null;
      g.segs.forEach(function (s) { xs.push(s[0], s[2]); ys.push(s[1], s[3]); });
      (g.dashed || []).forEach(function (s) { xs.push(s[0], s[2]); ys.push(s[1], s[3]); });
      g.circles.forEach(function (c) {
        xs.push(c.c[0] - c.r, c.c[0] + c.r); ys.push(c.c[1] - c.r, c.c[1] + c.r);
      });
      if (!xs.length) return null;
      return {
        x1: Math.min.apply(null, xs), y1: Math.min.apply(null, ys),
        x2: Math.max.apply(null, xs), y2: Math.max.apply(null, ys)
      };
    }
    if (it.t === 'o') {
      var op = window.Points ? Points.at(it, drawMap || {}) : it.p;
      if (!op) return null;
      var orr = Math.max(6, pointR(it) * 2);
      return { x1: op[0] - orr, y1: op[1] - orr, x2: op[0] + orr, y2: op[1] + orr };
    }
    if (it.t === 'c') {
      var cm = drawMap || {};
      var ca = window.Points ? Points.at(cm[it.a1], cm) : null;
      var cb = window.Points ? Points.at(cm[it.a2], cm) : null;
      if (!ca || !cb) return null;
      /* Межі рахуємо по самих точках, а не по намальованих кінцях: інакше
         одна пряма розтягнула б рамку на пів екрана, і «вписати в екран»
         зробило б усе інше крапкою. */
      return { x1: Math.min(ca[0], cb[0]), y1: Math.min(ca[1], cb[1]),
               x2: Math.max(ca[0], cb[0]), y2: Math.max(ca[1], cb[1]) };
    }
    if (it.t === 'p') {
      for (i = 0; i < it.d.length; i += 2) { xs.push(it.d[i]); ys.push(it.d[i + 1]); }
    } else if (it.t === 'x') {
      var lines = String(it.v).split('\n');
      var wMax = 0;
      lines.forEach(function (ln) { wMax = Math.max(wMax, ln.length); });
      xs = [it.p[0], it.p[0] + wMax * it.s * 0.55];
      ys = [it.p[1] - it.s, it.p[1] + (lines.length - 1) * it.s * 1.25 + it.s * 0.3];
    } else if (it.t === 'g' && it.rot) {
      /* У повернутої фігури рамка вже не збігається з тим, що видно. Беремо
         справжні вершини, інакше виділення й вписування в екран рахувалися б
         по місцю, де фігури немає. */
      var rp = shapePoints(it);
      if (rp) {
        rp.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); });
      } else {
        // коло: описуємо його рамкою, повернутою навколо центра
        var cx0 = (it.a[0] + it.a[2]) / 2, cy0 = (it.a[1] + it.a[3]) / 2;
        var corners = rotatePts([[it.a[0], it.a[1]], [it.a[2], it.a[1]],
                                 [it.a[2], it.a[3]], [it.a[0], it.a[3]]], it.rot, cx0, cy0);
        corners.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); });
      }
    } else {
      xs = [it.a[0], it.a[2]]; ys = [it.a[1], it.a[3]];
    }
    if (!xs.length) return null;
    return {
      x1: Math.min.apply(null, xs), y1: Math.min.apply(null, ys),
      x2: Math.max.apply(null, xs), y2: Math.max.apply(null, ys)
    };
  }

  function unionBounds(items) {
    var b = null;
    (items || []).forEach(function (it) {
      var ib = itemBounds(it);
      if (!ib) return;
      if (!b) { b = { x1: ib.x1, y1: ib.y1, x2: ib.x2, y2: ib.y2 }; return; }
      b.x1 = Math.min(b.x1, ib.x1); b.y1 = Math.min(b.y1, ib.y1);
      b.x2 = Math.max(b.x2, ib.x2); b.y2 = Math.max(b.y2, ib.y2);
    });
    return b;
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var len2 = dx * dx + dy * dy;
    var t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    var cx = x1 + t * dx, cy = y1 + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  function nearPolyline(pts, x, y, tol, closed) {
    for (var i = 0; i < pts.length - 1; i++) {
      if (distToSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= tol) return true;
    }
    if (closed && pts.length > 2) {
      var a = pts[pts.length - 1], b = pts[0];
      if (distToSegment(x, y, a[0], a[1], b[0], b[1]) <= tol) return true;
    }
    return false;
  }

  function inBounds(b, x, y, tol) {
    return b && x >= b.x1 - tol && x <= b.x2 + tol && y >= b.y1 - tol && y <= b.y2 + tol;
  }

  /** Чи потрапляє точка (світові координати) в об'єкт. */
  function hitItem(it, x, y, tol) {
    var i, b;
    if (it.t === 'd') {
      var g = prims.get(it);
      if (!g) return false;
      var segs = g.dashed && g.dashed.length ? g.segs.concat(g.dashed) : g.segs;
      for (i = 0; i < segs.length; i++) {
        var s = segs[i];
        if (distToSegment(x, y, s[0], s[1], s[2], s[3]) <= tol + (it.w || 2) / 2) return true;
      }
      for (i = 0; i < g.circles.length; i++) {
        var c = g.circles[i];
        if (Math.abs(Math.hypot(x - c.c[0], y - c.c[1]) - c.r) <= tol + (it.w || 2)) return true;
      }
      return false;
    }
    if (it.t === 'p') {
      for (i = 0; i < it.d.length - 2; i += 2) {
        if (distToSegment(x, y, it.d[i], it.d[i + 1], it.d[i + 2], it.d[i + 3]) <= tol + it.w / 2) return true;
      }
      if (it.d.length === 2) return Math.hypot(x - it.d[0], y - it.d[1]) <= tol + it.w;
      return false;
    }
    if (it.t === 'l' || it.t === 'a') {
      return distToSegment(x, y, it.a[0], it.a[1], it.a[2], it.a[3]) <= tol + it.w / 2;
    }
    if (it.t === 'o') {
      var hp = window.Points ? Points.at(it, drawMap || {}) : it.p;
      if (!hp) return false;
      return Math.hypot(x - hp[0], y - hp[1]) <= Math.max(9, pointR(it) * 1.8) + tol;
    }
    if (it.t === 'c') {
      var hm = drawMap || {};
      var ha = window.Points ? Points.at(hm[it.a1], hm) : null;
      var hb = window.Points ? Points.at(hm[it.a2], hm) : null;
      if (!ha || !hb) return false;
      // тицяти можна в усю намальовану лінію, а не лише між точками
      var he = linkEnds(ha, hb, it.k || 'seg');
      return distToSegment(x, y, he[0][0], he[0][1], he[1][0], he[1][1]) <= tol + (it.w || 3) / 2;
    }

    // тіло й площина — прямокутники: тицяти можна будь-де всередині
    if (it.t === 's') {
      var sx1 = Math.min(it.a[0], it.a[2]), sx2 = Math.max(it.a[0], it.a[2]);
      var sy1 = Math.min(it.a[1], it.a[3]), sy2 = Math.max(it.a[1], it.a[3]);
      return x >= sx1 - tol && x <= sx2 + tol && y >= sy1 - tol && y <= sy2 + tol;
    }
    if (it.t === 'f') {
      var fx1 = Math.min(it.a[0], it.a[2]), fx2 = Math.max(it.a[0], it.a[2]);
      var fy1 = Math.min(it.a[1], it.a[3]), fy2 = Math.max(it.a[1], it.a[3]);
      return x >= fx1 - tol && x <= fx2 + tol && y >= fy1 - tol && y <= fy2 + tol;
    }
    /* Вісь ловимо ширшою смугою, ніж лінію: у неї є ділення й підписи під
       нею, і тицяти треба туди, де вона виглядає, а не в саму риску. */
    if (it.t === 'n') {
      var nx1 = Math.min(it.a[0], it.a[2]), nx2 = Math.max(it.a[0], it.a[2]);
      var band = Math.max(16, (it.w || 3) * 7);
      return x >= nx1 - tol && x <= nx2 + tol &&
             y >= it.a[1] - band && y <= it.a[1] + band;
    }
    if (it.t === 'i' || it.t === 'x') return inBounds(itemBounds(it), x, y, tol);

    if (it.t === 'g') {
      var sh = SHAPES[it.sh];
      b = itemBounds(it);
      if (!sh) return inBounds(b, x, y, tol);
      if (it.f) return inBounds(b, x, y, tol);            // із заливкою — уся площа
      if (sh.round) {
        var rx = (b.x2 - b.x1) / 2 || 1, ry = (b.y2 - b.y1) / 2 || 1;
        var cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
        var v = Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2);
        return v <= 1.18 && v >= 0.55;                    // близько до контуру
      }
      var pts = shapePoints(it);
      return pts ? nearPolyline(pts, x, y, tol + it.w / 2, true) : false;
    }

    b = itemBounds(it);
    if (!b) return false;
    if (it.t === 'e') {
      var erx = (b.x2 - b.x1) / 2 || 1, ery = (b.y2 - b.y1) / 2 || 1;
      var ecx = (b.x1 + b.x2) / 2, ecy = (b.y1 + b.y2) / 2;
      var ev = Math.pow((x - ecx) / erx, 2) + Math.pow((y - ecy) / ery, 2);
      return ev <= 1.15;
    }
    return inBounds(b, x, y, tol);
  }

  /* Значення осі з розумними запасними: користувач міг зберегти вісь ще до
     появи якогось із полів, і вона має малюватись, а не зникати. */
  function numFrom(it) { return typeof it.from === 'number' ? it.from : -5; }
  function numTo(it)   { return typeof it.to === 'number' ? it.to : 5; }
  function numStep(it) {
    var st = Number(it.step);
    return st > 0 ? st : 1;
  }

  /* ============================================================
     Координатна площина
     ============================================================

     Один обʼєкт, а не набір ліній: осі, сітка, графік і точки на ньому
     тримаються разом і перераховуються з тих самих чисел. Тому точку можна
     тягнути й усе решта — проєкції, січна, дотична, підпис h — їде за нею.

     Формула зберігається текстом і обчислюється власним розбором (plot.js),
     а не мовою: вона повертається з сервера, а виконувати те, що приїхало
     ззовні, програма не має права. */

  /**
   * Каркас тіла, вписаний у рамку обʼєкта.
   *
   * Модуль стереометрії рахує в умовних одиницях і нічого не знає про
   * дошку. Тут ми беремо готовий каркас і вписуємо його в рамку так, щоб
   * пропорції не попливли: масштаб один на обидві осі, інакше куб
   * перестав би бути кубом.
   */
  function solidFrame(it) {
    if (!window.Solids) return null;
    var kind = it.k || 'cube';
    var def = Solids.KINDS[kind];
    if (!def) return null;

    var yaw = (typeof it.yaw === 'number' ? it.yaw : (def.yaw0 || 28)) * Math.PI / 180;
    var pitch = (typeof it.pitch === 'number' ? it.pitch : 22) * Math.PI / 180;

    var raw = def.round ? Solids.buildRound(kind, pitch, it.rsec)
                        : Solids.build(kind, yaw, pitch, it.mv);
    if (!raw) return null;

    /* Побудови й переріз рахуються в просторі й проєктуються тими самими
       кутами. Тому вони не «домальовані поверх», а справді лежать на тілі:
       обернеш його — і висота обернеться разом із ним. */
    var cons = [];
    (it.cons || []).forEach(function (spec) {
      var segs3 = Solids.cons(kind, spec, it.mv);
      if (segs3.length) cons.push({ k: spec.k, segs: Solids.projectSegs(segs3, yaw, pitch) });
    });

    var sect = null;
    if (it.sec && it.sec.length === 3) {
      var got = Solids.section(kind, it.sec, it.mv);
      if (got) sect = Solids.projectPoly(got.poly, yaw, pitch);
    }

    /* Масштаб рахуємо за НЕЗМІНЕНИМ тілом, а не за поточним.

       Інакше кожен рух вершини перемасштабовував би всю картинку: вершина
       їде за курсором, а разом із нею — і саме тіло, і вершина знову не
       там, де курсор. Тепер перетворення стале, а зрушена вершина просто
       виходить за початкові межі — як їй і належить. */
    var fitSrc = it.mv && !def.round
      ? (Solids.build(kind, yaw, pitch) || raw)
      : raw;

    var xs = [], ys = [];
    fitSrc.visible.concat(fitSrc.hidden).forEach(function (e) {
      xs.push(e[0], e[2]); ys.push(e[1], e[3]);
    });
    (fitSrc.labels || []).forEach(function (L) { xs.push(L.x); ys.push(L.y); });
    if (!xs.length) return null;

    var mnx = Math.min.apply(null, xs), mxx = Math.max.apply(null, xs);
    var mny = Math.min.apply(null, ys), mxy = Math.max.apply(null, ys);

    var bx1 = Math.min(it.a[0], it.a[2]), bx2 = Math.max(it.a[0], it.a[2]);
    var by1 = Math.min(it.a[1], it.a[3]), by2 = Math.max(it.a[1], it.a[3]);
    var pad = Math.min(bx2 - bx1, by2 - by1) * 0.08;

    var kx = ((bx2 - bx1) - pad * 2) / Math.max(1e-6, mxx - mnx);
    var ky = ((by2 - by1) - pad * 2) / Math.max(1e-6, mxy - mny);
    var k = Math.min(kx, ky);
    var offX = (bx1 + bx2) / 2 - (mnx + mxx) / 2 * k;
    var offY = (by1 + by2) / 2 - (mny + mxy) / 2 * k;

    function mapSeg(e) { return [e[0] * k + offX, e[1] * k + offY, e[2] * k + offX, e[3] * k + offY]; }

    /* Те саме перетворення назовні: маркери вершин мають стояти рівно там,
       де вершини намальовані, а не там, де вони «приблизно». */
    var fit = {
      k: k, offX: offX, offY: offY, yaw: yaw, pitch: pitch,
      toBoard: function (p) { return [p[0] * k + offX, p[1] * k + offY]; },
      fromBoard: function (bx, by) { return [(bx - offX) / k, (by - offY) / k]; }
    };

    return {
      visible: raw.visible.map(mapSeg),
      hidden: raw.hidden.map(mapSeg),
      labels: (raw.labels || []).map(function (L) {
        return { name: L.name, x: L.x * k + offX, y: L.y * k + offY };
      }),
      fit: fit,
      cons: cons.map(function (c) { return { k: c.k, segs: c.segs.map(mapSeg) }; }),
      section: sect
        ? sect.map(function (p) { return [p[0] * k + offX, p[1] * k + offY]; })
        : (raw.fill ? raw.fill.map(function (p) { return [p[0] * k + offX, p[1] * k + offY]; }) : null)
    };
  }

  var planeCache = {};       // формула → готова функція; розбирати щоразу дорого

  function planeFn(it) {
    var src = it.ex || 'x^2';
    if (planeCache[src] !== undefined) return planeCache[src];
    var r = (window.Plot && Plot.compile) ? Plot.compile(src) : { f: null };
    planeCache[src] = r.f;
    return r.f;
  }

  /** Межі математичного вікна з розумними запасними. */
  function planeWin(it) {
    var xa = typeof it.xa === 'number' ? it.xa : -5;
    var xb = typeof it.xb === 'number' ? it.xb : 5;
    var ya = typeof it.ya === 'number' ? it.ya : -3;
    var yb = typeof it.yb === 'number' ? it.yb : 7;
    if (!(xb > xa)) { xa = -5; xb = 5; }
    if (!(yb > ya)) { ya = -3; yb = 7; }
    return { xa: xa, xb: xb, ya: ya, yb: yb };
  }

  /** Перетворення «математика → екран» і назад. */
  function planeMap(it) {
    var x1 = Math.min(it.a[0], it.a[2]), x2 = Math.max(it.a[0], it.a[2]);
    var y1 = Math.min(it.a[1], it.a[3]), y2 = Math.max(it.a[1], it.a[3]);
    var w = planeWin(it);
    var kx = (x2 - x1) / (w.xb - w.xa);
    var ky = (y2 - y1) / (w.yb - w.ya);
    return {
      x1: x1, y1: y1, x2: x2, y2: y2, win: w, kx: kx, ky: ky,
      sx: function (mx) { return x1 + (mx - w.xa) * kx; },
      sy: function (my) { return y2 - (my - w.ya) * ky; },
      mx: function (px) { return w.xa + (px - x1) / kx; },
      my: function (py) { return w.ya + (y2 - py) / ky; }
    };
  }

  /** Крок сітки: круглий і такий, щоб поділок було приблизно 5–10. */
  function niceStep(span) {
    var raw = span / 10;
    var pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));

    /* Округлення обовʼязкове: 0.35/0.1 у числах із комою дорівнює
       3.4999999999999996, і порівняння з 3.5 падає не в ту гілку. Через це
       на діапазоні 3.5 виходило вісімнадцять поділок замість семи. */
    var n = Math.round((raw / pow) * 1e6) / 1e6;
    var mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    var step = mult * pow;

    /* Крок мусить бути додатним скінченним числом. На виродженому діапазоні
       — нульовому, відʼємному чи нескінченному — звідси виходили 0, NaN або
       Infinity, і сітка бралася малюватися невідомо чим. */
    return (isFinite(step) && step > 0) ? step : 1;
  }

  /* Значення поділок сітки — готовим списком, а не циклом по числах.

     Цикл виду «поки k·крок ≤ межі» тримається на арифметиці з комою, і
     дивне число в кроці робить його поведінку непередбачуваною. Тут
     кількість рахується наперед і обмежена: гірше, ніж рідша сітка, з
     цього вийти не може. */
  function gridTicks(from, to, step) {
    var out = [];
    if (!(isFinite(from) && isFinite(to) && isFinite(step) && step > 0 && to > from)) return out;

    var total = Math.floor((to - from) / step) + 2;
    if (!(total > 0) || total > 2000) return out;     // такої сітки все одно не видно

    var k0 = Math.ceil(from / step);
    for (var i = 0; i < total; i++) {
      var k = k0 + i;
      var v = k * step;
      if (v > to + 1e-9) break;
      out.push({ k: k, v: v });
    }
    return out;
  }

  function planeP1(it) { return typeof it.p1 === 'number' ? it.p1 : 0.5; }
  function planeP2(it) { return typeof it.p2 === 'number' ? it.p2 : 2; }

  /**
   * Визначений інтеграл: заштрихована площа під кривою й саме число.
   *
   * Площа малюється до осі, а не до низу вікна: інтеграл — це площа між
   * графіком і віссю, і там, де крива йде нижче нуля, ця площа віднімається.
   * Тому нижня частина фарбується іншим кольором — інакше «мінус» у
   * відповіді виглядає як помилка обчислення.
   */
  function drawIntegral(ctx, it, m, fn, fsz) {
    var W = m.win;
    var a = typeof it.ia === 'number' ? it.ia : W.xa;
    var b = typeof it.ib === 'number' ? it.ib : W.xb;
    if (a > b) { var t = a; a = b; b = t; }
    a = Math.max(a, W.xa); b = Math.min(b, W.xb);
    if (!(b > a)) return;

    var y0 = m.sy(0);
    var N = 160;

    /* Малюємо двома смугами — над віссю й під нею. Ділимо в точках, де
       функція переходить через нуль: якщо цього не робити, одна смуга
       перекриє другу й обидві стануть однакового кольору. */
    var band = [], sign = 0;

    function flush() {
      if (band.length < 2) { band = []; return; }
      ctx.beginPath();
      ctx.moveTo(band[0][0], y0);
      band.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
      ctx.lineTo(band[band.length - 1][0], y0);
      ctx.closePath();
      ctx.fillStyle = sign < 0 ? 'rgba(229,72,77,.22)' : 'rgba(19,88,245,.20)';
      ctx.fill();
      band = [];
    }

    ctx.save();
    for (var i = 0; i <= N; i++) {
      var mx = a + (b - a) * i / N;
      var my = fn(mx);
      if (isNaN(my)) { flush(); sign = 0; continue; }
      var s2 = my < 0 ? -1 : 1;
      if (sign && s2 !== sign) { flush(); }
      sign = s2;
      band.push([m.sx(mx), m.sy(my)]);
    }
    flush();

    // межі — тонкі вертикальні риски від осі до кривої
    ctx.strokeStyle = '#1358F5';
    ctx.lineWidth = Math.max(1.2, (it.w || 2) * 0.7);
    [a, b].forEach(function (v) {
      var vy = fn(v);
      if (isNaN(vy)) return;
      ctx.beginPath();
      ctx.moveTo(m.sx(v), y0);
      ctx.lineTo(m.sx(v), m.sy(vy));
      ctx.stroke();
    });

    ctx.font = '600 ' + fsz + 'px "Source Serif 4", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#1358F5';
    ctx.fillText(numLabel(a, 0.01), m.sx(a), y0 + fsz * 0.3);
    ctx.fillText(numLabel(b, 0.01), m.sx(b), y0 + fsz * 0.3);

    /* Саме число. Без нього площа — просто пляма: учень бачить, що щось
       зафарбовано, але не бачить, скільки це. */
    if (window.Plot && Plot.integral) {
      var val = Plot.integral(fn, a, b);
      if (!isNaN(val)) {
        ctx.textAlign = 'left';
        ctx.fillText('∫ від ' + numLabel(a, 0.01) + ' до ' + numLabel(b, 0.01) +
                     ' = ' + numLabel(val, 0.001),
                     m.x1 + fsz * 0.6, m.y2 - fsz * 1.6);
      }
    }
    ctx.restore();
  }

  /**
   * Точки на графіку й усе, що з них випливає.
   *
   * Саме заради цього площина існує одним обʼєктом: січна, дотична,
   * проєкції та підпис h не зберігаються ніде — вони щоразу рахуються з
   * двох чисел. Тому вони не можуть відстати від точок.
   */
  function drawPlanePoints(ctx, it, m, fn, fsz) {
    if (it.pts === 0) return;

    var W = m.win;
    var G = '#17B26A', R = '#E5484D';          // як у підручнику: перша зелена, друга червона
    var x1 = planeP1(it), x2 = planeP2(it);
    var y1 = fn(x1), y2 = fn(x2);
    var dot = Math.max(3.5, (it.w || 2) * 1.7);

    function point(mx, my, color, name) {
      if (isNaN(my)) return null;
      var px = m.sx(mx), py = m.sy(my);

      // пунктирні проєкції на обидві осі — щоб було видно, звідки береться число
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.2, (it.w || 2) * 0.7);
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(px, py); ctx.lineTo(px, m.sy(0));
      ctx.moveTo(px, py); ctx.lineTo(m.sx(0), py);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, dot, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '600 ' + fsz + 'px "Source Serif 4", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(name, px + dot * 1.6, m.sy(0) + fsz * 0.3);
      ctx.textBaseline = 'middle';
      ctx.fillText('f(' + name + ')', m.sx(0) + fsz * 0.4, py - fsz * 0.75);
      ctx.restore();
      return [px, py];
    }

    var P1 = point(x1, y1, G, 'x₁');
    var P2 = point(x2, y2, R, 'x₂');

    // ---- січна через обидві точки
    if (it.sec && P1 && P2 && Math.abs(x2 - x1) > 1e-9) {
      var kSec = (y2 - y1) / (x2 - x1);
      ctx.save();
      ctx.strokeStyle = '#7A5AF8';
      ctx.lineWidth = Math.max(1.6, (it.w || 2) * 0.9);
      ctx.beginPath();
      ctx.moveTo(m.sx(W.xa), m.sy(y1 + kSec * (W.xa - x1)));
      ctx.lineTo(m.sx(W.xb), m.sy(y1 + kSec * (W.xb - x1)));
      ctx.stroke();
      ctx.restore();
    }

    // ---- дотична в першій точці
    if (it.tan && P1 && window.Plot && Plot.slopeAt) {
      var kTan = Plot.slopeAt(fn, x1);
      if (!isNaN(kTan)) {
        ctx.save();
        ctx.strokeStyle = '#F79009';
        ctx.lineWidth = Math.max(1.6, (it.w || 2) * 0.9);
        ctx.beginPath();
        ctx.moveTo(m.sx(W.xa), m.sy(y1 + kTan * (W.xa - x1)));
        ctx.lineTo(m.sx(W.xb), m.sy(y1 + kTan * (W.xb - x1)));
        ctx.stroke();
        ctx.restore();
      }
    }

    // ---- h під віссю: приріст аргументу, з якого й починається похідна
    if (it.hlab !== 0 && P1 && P2) {
      var hv = x2 - x1;
      ctx.save();
      ctx.strokeStyle = '#7A5AF8';
      ctx.fillStyle = '#7A5AF8';
      ctx.lineWidth = Math.max(1.4, (it.w || 2) * 0.8);
      var hy = m.sy(0) + fsz * 2.1;
      ctx.beginPath();
      ctx.moveTo(m.sx(x1), hy); ctx.lineTo(m.sx(x2), hy);
      ctx.stroke();
      ctx.font = '600 ' + fsz + 'px "Source Serif 4", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('h = ' + numLabel(hv, 0.01), (m.sx(x1) + m.sx(x2)) / 2, hy + fsz * 0.25);
      ctx.restore();
    }

    /* Різницеве відношення — те саме, що на дошці пишуть словами. Стоїть
       у кутку, щоб число мінялося на очах, поки тягнеш точку. */
    if (it.quot && P1 && P2 && Math.abs(x2 - x1) > 1e-9) {
      var q = (y2 - y1) / (x2 - x1);
      ctx.save();
      ctx.fillStyle = '#7A5AF8';
      ctx.font = '600 ' + (fsz * 1.05) + 'px "Source Serif 4", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      var tx = m.x1 + fsz * 0.6, ty = m.y1 + fsz * 0.5;
      ctx.fillText('( f(x₂) − f(x₁) ) / h = ' + numLabel(q, 0.01), tx, ty);
      if (it.tan && window.Plot && Plot.slopeAt) {
        var kt = Plot.slopeAt(fn, x1);
        ctx.fillStyle = '#F79009';
        if (!isNaN(kt)) ctx.fillText('f ′(x₁) = ' + numLabel(kt, 0.01), tx, ty + fsz * 1.5);
      }
      ctx.restore();
    }
  }

  /**
   * Метод інтервалів на числовій прямій.
   *
   * Три речі, які на дошці малюють крейдою: зафарбовані й виколоті точки,
   * плюси й мінуси між ними та жирна лінія над відповіддю. Разом вони і є
   * розвʼязком нерівності — окремо кожна з них нічого не доводить.
   */
  function drawIneq(ctx, it, px1, px2, y, from, to, fs, tick) {
    var marks = it.marks || [], spans = it.spans || [], signs = it.signs || [];
    if (!marks.length && !spans.length && !signs.length) return;

    var span = to - from;
    if (!(span > 0)) return;
    function sx(v) { return px1 + (v - from) / span * (px2 - px1); }
    function clamp(v) { return Math.max(from, Math.min(to, v)); }

    ctx.save();

    // ---- знаки між точками, над прямою
    if (it.showSigns !== 0 && signs.length) {
      ctx.font = '700 ' + (fs * 1.25) + 'px "Source Serif 4", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      signs.forEach(function (g) {
        var a = clamp(g.a), b = clamp(g.b);
        if (b - a < span * 0.004) return;
        ctx.fillStyle = g.s > 0 ? '#17B26A' : '#E5484D';
        ctx.fillText(g.s > 0 ? '+' : '−', (sx(a) + sx(b)) / 2, y - tick - fs * 0.5);
      });
    }

    // ---- відповідь: жирна лінія просто над віссю
    if (spans.length) {
      ctx.strokeStyle = '#4B3FDB';
      ctx.lineWidth = Math.max(4, (it.w || 3) * 1.8);
      ctx.lineCap = 'butt';
      var lift = tick * 0.9;
      spans.forEach(function (g) {
        var a = clamp(g.a), b = clamp(g.b);
        if (b - a < span * 0.002) return;
        ctx.beginPath();
        ctx.moveTo(sx(a), y - lift);
        ctx.lineTo(sx(b), y - lift);
        ctx.stroke();
      });
    }

    // ---- точки: зафарбована входить у відповідь, виколота — ні
    var r = Math.max(4.5, (it.w || 3) * 2.1);
    marks.forEach(function (m) {
      if (m.x < from - 1e-9 || m.x > to + 1e-9) return;
      var mx = sx(m.x);
      ctx.beginPath();
      ctx.arc(mx, y, r, 0, Math.PI * 2);
      if (m.o) {
        /* Виколоту заливаємо кольором тла, а не лишаємо прозорою: під нею
           проходить сама пряма, і без заливки коло на ній не читається. */
        ctx.fillStyle = it.bg || '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = it.c || '#17163A';
        ctx.lineWidth = Math.max(2, (it.w || 3) * 0.8);
        ctx.stroke();
      } else {
        ctx.fillStyle = it.c || '#17163A';
        ctx.fill();
      }
    });

    // ---- сама відповідь словами, під віссю
    if (it.ans) {
      ctx.fillStyle = '#4B3FDB';
      ctx.font = '600 ' + (fs * 1.15) + 'px "Source Serif 4", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(it.ans, px1, y + tick + fs * 2.1);
    }

    ctx.restore();
  }

  /* ============================================================
     Геометричні точки й відрізки між ними
     ============================================================ */

  /* Що саме проводять від точки до точки.

     Відрізок має кінці, промінь — один кінець, пряма не має жодного, а
     вектор має напрям. У геометрії це різні речі, і креслення, де пряму
     намалювали відрізком, читається неправильно. */
  var LINK_KINDS = {
    seg:  { label: 'Відрізок' },
    ray:  { label: 'Промінь' },
    line: { label: 'Пряма' },
    vec:  { label: 'Вектор' }
  };

  Board.LINK_KINDS = LINK_KINDS;

  /**
   * Кінці того, що малюємо: відрізок лишається собою, промінь тягнеться за
   * другу точку, пряма — за обидві.
   *
   * «Нескінченно» тут означає «достатньо далеко, щоб перетнути креслення».
   * Справжня нескінченність зіпсувала б і межі обʼєкта, і вписування дошки
   * в екран: одна пряма зробила б усе решта крапкою в кутку.
   */
  function linkEnds(A, B, kind) {
    if (kind !== 'ray' && kind !== 'line') return [A, B];

    var dx = B[0] - A[0], dy = B[1] - A[1];
    var L = Math.hypot(dx, dy);
    if (L < 1e-6) return [A, B];

    var ext = Math.max(700, L * 5);
    var ux = dx / L, uy = dy / L;

    var from = kind === 'line' ? [A[0] - ux * ext, A[1] - uy * ext] : A;
    var to = [B[0] + ux * ext, B[1] + uy * ext];
    return [from, to];
  }

  /**
   * Розмір точки.
   *
   * Власне поле, а не похідне від товщини пера: точка й лінія — різні речі.
   * На кресленні часто потрібні помітні точки й тонкі лінії між ними, а
   * спільна товщина такого не дозволяла — товста точка тягла за собою
   * товсті відрізки.
   */
  function pointR(it) {
    var r = Number(it && it.r);
    return r > 0 ? r : Math.max(3.5, ((it && it.w) || 3) * 1.5);
  }

  Board.pointR = pointR;

  /** Швидкий доступ до обʼєктів слайда за id — потрібен точкам. */
  function idMap(items) {
    var m = {};
    (items || []).forEach(function (it) { if (it.id) m[it.id] = it; });
    return m;
  }

  /**
   * Позначки для відрізків слайда: рисочки рівності й прямі кути.
   *
   * Рахуємо один раз на малювання й запамʼятовуємо за підписом із самих
   * координат. Без цього кожен відрізок перебирав би всі інші, і на
   * кресленні з двадцяти відрізків це чотириста перевірок на кадр.
   */
  var markCache = { sig: null, data: null };

  function linkMarks(items) {
    if (!window.Points) return { ticks: {}, right: [] };

    var by = idMap(items);
    var segs = [];
    (items || []).forEach(function (it) {
      if (it.t !== 'c' || !it.a1 || !it.a2) return;
      var A = Points.at(by[it.a1], by), B2 = Points.at(by[it.a2], by);
      if (!A || !B2) return;
      /* Рівність довжин стосується лише того, що має кінці. Промінь і
         пряма нескінченні, і порівнювати їх довжини безглуздо — але для
         прямого кута їхній напрям потрібен так само. */
      segs.push({ id: it.id, a: A, b: B2, kind: it.k || 'seg',
                  p1: by[it.a1], p2: by[it.a2],
                  len: Math.hypot(B2[0] - A[0], B2[1] - A[1]) });
    });

    var sig = segs.map(function (s) {
      return s.id + ':' + Math.round(s.a[0]) + ',' + Math.round(s.a[1]) +
             '-' + Math.round(s.b[0]) + ',' + Math.round(s.b[1]);
    }).join('|');
    if (markCache.sig === sig) return markCache.data;

    var ticks = {};
    var finite = segs.filter(function (s2) { return s2.kind === 'seg' || s2.kind === 'vec'; });
    var groups = Points.equalGroups(finite).map(function (g) {
      return g.items.map(function (s) { return s.id; });
    });

    /* Дотична дає дві теореми одразу: рівність відрізків і прямий кут із
       радіусом. Розпізнаємо їх одним рішенням, інакше креслення потрапляє
       у проміжок між двома допусками — рисочки стоять, а квадратика немає,
       хоча кажуть вони про ту саму дотичну. */
    var tang = Points.tangents(segs, by);

    /* Рівність, що випливає з побудови, а не з вимірювання: відрізки
       дотичних з однієї точки й радіуси одного кола. Обидві рівності
       очевидні тому, хто дивиться на креслення, але не збігаються до
       пікселя, бо центр і точку дотику ставлять рукою. */
    function merge(g) {
      var same = null;
      groups.forEach(function (ex, i) {
        if (same === null && g.some(function (id) { return ex.indexOf(id) >= 0; })) same = i;
      });
      if (same === null) { groups.push(g.slice()); return; }
      g.forEach(function (id) {
        if (groups[same].indexOf(id) < 0) groups[same].push(id);
      });
    }

    tang.equal.forEach(merge);
    Points.radiusGroups(segs, by).forEach(merge);

    groups.forEach(function (g, gi) {
      g.forEach(function (id) { ticks[id] = gi + 1; });
    });

    /* Прямі кути з дотичних додаємо до знайдених вимірюванням, але без
       повторів: той самий квадратик, намальований двічі, лише потовщав би. */
    var right = Points.rightAngles(segs);
    var seen = {};
    right.forEach(function (r) {
      seen[Math.round(r.at[0]) + ',' + Math.round(r.at[1])] = 1;
    });
    tang.right.forEach(function (r) {
      var k = Math.round(r.at[0]) + ',' + Math.round(r.at[1]);
      if (seen[k]) return;
      seen[k] = 1;
      right.push(r);
    });

    var data = { ticks: ticks, right: right, segs: segs };
    markCache = { sig: sig, data: data };
    return data;
  }

  Board.linkMarks = linkMarks;

  /** Як підписувати вісь. */
  function numFmt(it) {
    var f = it && it.fmt;
    return (f === 'frac' || f === 'both' || f === 'both-dec' ||
            f === 'pi' || f === 'root' || f === 'auto') ? f : 'dec';
  }

  /**
   * Число як частка π: «π/2», «3π/2», «−π», «2π».
   *
   * Тригонометрія без цього не читається: 1.5707963 на осі не каже нічого,
   * а π/2 каже все. Повертає null, коли число не кратне π із розумним
   * знаменником — тоді підпис лишається звичайним.
   */
  function piLabel(v) {
    if (!isFinite(v)) return null;
    if (Math.abs(v) < 1e-12) return '0';
    var f = toFraction(v / Math.PI, 24);
    if (!f) return null;

    var sign = f.n < 0 ? '−' : '';
    var n = Math.abs(f.n), d = f.d;
    var top = (n === 1 ? '' : String(n)) + 'π';
    return d === 1 ? sign + top : sign + top + '/' + d;
  }

  /**
   * Число як корінь: «√2», «2√3», «√5/2».
   *
   * Шукаємо серед підкорінних 2…30, бо саме вони й стоять у задачах.
   * Множник і знаменник — прості дроби; що не вкладається, лишається
   * десятковим.
   */
  function rootLabel(v) {
    if (!isFinite(v) || Math.abs(v) < 1e-12) return null;
    var sign = v < 0 ? '−' : '';
    var x = Math.abs(v);

    for (var r = 2; r <= 30; r++) {
      var sq = Math.sqrt(r);
      if (Math.abs(sq - Math.round(sq)) < 1e-12) continue;   // повний квадрат — це не корінь
      var f = toFraction(x / sq, 12);
      if (!f) continue;
      var n = f.n, d = f.d;
      var top = (n === 1 ? '' : String(n)) + '√' + r;
      return d === 1 ? sign + top : sign + top + '/' + d;
    }
    return null;
  }

  Board.piLabel = piLabel;
  Board.rootLabel = rootLabel;

  /**
   * Число як звичайний дріб.
   *
   * Через ланцюговий дріб, а не через «поділити на степінь десятки»: крок
   * ⅓ приходить сюди як 0.3333333333333333, і саме з нього має вийти 1/3,
   * а не 3333333333333333/10000000000000000.
   *
   * Знаменник обмежений: на осі потрібні дроби, які читаються вголос, а не
   * найточніше наближення. Що не наблизилось — не дріб, і підписується
   * десятковим.
   */
  function toFraction(v, maxDen) {
    maxDen = maxDen || 200;
    if (!isFinite(v)) return null;

    var sign = v < 0 ? -1 : 1, x = Math.abs(v);
    if (Math.abs(x - Math.round(x)) < 1e-10) return { n: sign * Math.round(x), d: 1 };

    var h0 = 0, h1 = 1, k0 = 1, k1 = 0, b = x;
    for (var i = 0; i < 30; i++) {
      var a = Math.floor(b);
      var h2 = a * h1 + h0, k2 = a * k1 + k0;
      if (k2 > maxDen) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (Math.abs(x - h1 / k1) < 1e-12) break;
      var rem = b - a;
      if (rem < 1e-12) break;
      b = 1 / rem;
    }

    /* Допуск вузький навмисно. Ширший перетворював би π на 355/113 —
       славетне наближення, але не той дріб, який мали на увазі. Число або
       справді дорівнює дробу (з точністю до похибки самих обчислень), або
       лишається десятковим. */
    if (!k1 || Math.abs(x - h1 / k1) > 1e-10) return null;
    return { n: sign * h1, d: k1 };
  }

  /**
   * Намалювати підпис ділення й повернути його ширину.
   *
   * measure === true означає «нічого не малюй, лише зміряй»: та сама
   * функція рахує ширину для розстановки підписів і малює їх, тож вони не
   * можуть розійтися.
   */
  function drawNumLabel(ctx, v, step, x, y, fs, mode, measure) {
    /* Кратні π і корені — окремим написом в один рядок: над «√2» дробової
       риски не буває, і зображати його стосом не треба.

       «Сама» пробує обидві форми й лише потім відступає до дробу чи
       десяткового. Саме цього й хочеться на уроці: числа стоять у тому
       вигляді, у якому вони справді записані в задачі. */
    if (mode === 'pi' || mode === 'root' || mode === 'auto') {
      // нуль лишається нулем: «0.00» серед √2 і √3 виглядає як недогляд
      var special = Math.abs(v) < 1e-12 ? '0' : null;
      if (!special && (mode === 'pi' || mode === 'auto')) special = piLabel(v);
      if (!special && (mode === 'root' || mode === 'auto')) special = rootLabel(v);

      if (special) {
        ctx.font = '600 ' + fs + 'px "Source Serif 4", Georgia, serif';
        if (!measure) ctx.fillText(special, x, y);
        return ctx.measureText(special).width;
      }
      // не вийшло — далі як звичайно: «сама» пробує дріб, решта десятковий
      mode = mode === 'auto' ? 'frac' : 'dec';
    }

    var bothFracTop = (mode === 'both');
    var bothDecTop = (mode === 'both-dec');
    var wantFrac = (mode === 'frac' || bothFracTop || bothDecTop);
    var fr = wantFrac ? toFraction(v) : null;

    var dec = numLabel(v, step);
    var ffs = fs * 0.86;                       // дріб трохи менший: він удвічі вищий

    /* Ціле число на осі дробів лишається цілим — і без десяткового хвоста.
       «2/1» виглядає як помилка, а «2.00» серед ⅓ і ⅔ — як недогляд: там,
       де підписи дробові, круглі точки мають бути найпростішими. */
    if (fr && fr.d === 1) {
      ctx.font = '600 ' + fs + 'px "Source Serif 4", Georgia, serif';
      var whole = String(fr.n);
      if (!measure) ctx.fillText(whole, x, y);
      return ctx.measureText(whole).width;
    }

    /* Десятковий потрібен не лише тоді, коли його попросили: у режимі дробу
       він рятує число, яке дробом не записується. Підпис не має зникати
       через те, що воно не поділилося. */
    var showDec = (mode === 'dec') || bothFracTop || bothDecTop || !fr;
    var w = 0, top = y;

    function putFrac() {
      var num = String(fr.n), den = String(fr.d);
      ctx.font = '600 ' + ffs + 'px "Source Serif 4", Georgia, serif';
      var barW = Math.max(ctx.measureText(num).width, ctx.measureText(den).width) + ffs * 0.24;
      w = Math.max(w, barW);

      if (!measure) {
        ctx.fillText(num, x, top);
        /* Риска дробу тонша за саму вісь: товщина пера тут завелика, і
           дріб перетворювався б на дві цифри з колодою між ними. */
        var barY = Math.round(top + ffs * 1.06) + 0.5;
        var wasW = ctx.lineWidth;
        ctx.lineWidth = Math.max(1, ffs * 0.075);
        ctx.beginPath();
        ctx.moveTo(x - barW / 2, barY);
        ctx.lineTo(x + barW / 2, barY);
        ctx.stroke();
        ctx.lineWidth = wasW;
        ctx.fillText(den, x, top + ffs * 1.2);
      }
      top += ffs * 2.35;
    }

    function putDec() {
      ctx.font = '600 ' + (fr ? fs * 0.82 : fs) + 'px "Source Serif 4", Georgia, serif';
      w = Math.max(w, ctx.measureText(dec).width);
      if (!measure) ctx.fillText(dec, x, top);
      top += fs * 1.15;
    }

    /* Порядок вибирає людина. Під поділкою стоїть той запис, який на цьому
       уроці головний, — і це не завжди дріб. */
    if (bothDecTop) {
      if (showDec) putDec();
      if (fr) putFrac();
    } else {
      if (fr) putFrac();
      if (showDec) putDec();
    }

    return w;
  }

  /* Підпис ділення. Дробовий крок вимагає десяткових, цілий — ні: «0.0»
     замість «0» на осі виглядає як помилка. */
  /**
   * Скільки знаків після коми потрібно, щоб крок записався точно.
   *
   * Крок 2.5 — один знак, 0.25 — два, 1 — жодного. Крок ⅓ не записується
   * точно жодною кількістю, і для нього беремо два: «0.33» читається, а
   * «0.3333333333333333» — ні. Саме це й малювалося на осі.
   */
  function decimalsFor(step) {
    for (var d = 0; d <= 6; d++) {
      var m = step * Math.pow(10, d);
      if (Math.abs(m - Math.round(m)) < 1e-9) return d;
    }
    return 2;
  }

  function numLabel(v, step) {
    var dec = decimalsFor(step);
    var out = dec ? v.toFixed(dec) : String(Math.round(v));
    // «-0.00» — це нуль; мінус перед ним на осі виглядає як помилка
    return /^-0(\.0*)?$/.test(out) ? out.slice(1) : out;
  }

  function moveItem(it, dx, dy) {
    var i;
    if (it.t === 'd') return;   // побудова їде разом із фігурою, окремо не рухається
    if (it.t === 'c') return;   // відрізок їде за своїми точками

    /* Точка, прив'язана до фігури, не рухається окремо від неї: вона ж і
       стоїть «на стороні», а не «поруч». Щоб зняти прив'язку, точку треба
       перетягнути своїм маркером. */
    if (it.t === 'o') {
      if (it.on && it.on.pid) return;
      it.p[0] = round(it.p[0] + dx);
      it.p[1] = round(it.p[1] + dy);
      return;
    }
    if (it.t === 'p') {
      for (i = 0; i < it.d.length; i += 2) { it.d[i] = round(it.d[i] + dx); it.d[i + 1] = round(it.d[i + 1] + dy); }
    } else if (it.t === 'x') {
      it.p[0] = round(it.p[0] + dx); it.p[1] = round(it.p[1] + dy);
    } else {
      it.a[0] = round(it.a[0] + dx); it.a[1] = round(it.a[1] + dy);
      it.a[2] = round(it.a[2] + dx); it.a[3] = round(it.a[3] + dy);
    }
  }

  /**
   * Масштабувати обʼєкт навколо точки (ax, ay) у k разів — від знімка src.
   *
   * Для виділення з кількох обʼєктів: усі збільшуються чи зменшуються як
   * одне ціле, пропорційно, разом із товщиною ліній і розміром тексту —
   * як група в Miro. Беремо від знімка на початку жесту, а не від поточного
   * стану: інакше похибка округлення накопичувалась би з кожним рухом миші.
   * Точки, прив'язані до фігури, і побудови їдуть за своїми фігурами самі.
   */
  function scaleItemFrom(it, src, k, ax, ay) {
    if (it.t === 'c' || it.t === 'd') return;
    if (it.t === 'o' && it.on && it.on.pid) return;
    function sx(x) { return round(ax + (x - ax) * k); }
    function sy(y) { return round(ay + (y - ay) * k); }

    if (it.t === 'o') {
      it.p = [sx(src.p[0]), sy(src.p[1])];
      return;
    }
    if (it.t === 'p' && src.d) {
      it.d = src.d.map(function (v, i) { return i % 2 ? sy(v) : sx(v); });
    } else if (it.t === 'x' && src.p) {
      // точка тексту — лінія основи; верх = p[1] − s, тож масштабується разом
      it.s = Math.max(6, Math.min(400, Math.round(src.s * k)));
      it.p = [sx(src.p[0]), sy(src.p[1])];
      return;
    } else if (src.a) {
      it.a = [sx(src.a[0]), sy(src.a[1]), sx(src.a[2]), sy(src.a[3])];
    }
    if (typeof src.w === 'number') it.w = Math.max(0.5, Math.round(src.w * k * 10) / 10);
  }

  /** Знімок геометрії для scaleItemFrom. */
  function geomOf(it) {
    return JSON.parse(JSON.stringify({ p: it.p, d: it.d, a: it.a, s: it.s, w: it.w }));
  }

  /* ============================================================
     Кеш картинок (файли лежать в IndexedDB)
     ============================================================ */

  var imgCache = {};

  /* Звідки брати файл картинки.

     У кабінеті файли лежать у сховищі браузера (IndexedDB). На сторінці
     учня такого сховища немає — там картинки приходять адресою з сервера.
     Тому рушій не знає, де вони: це каже той, хто його запускає, через
     Board.imageSource(ключ, обʼєкт) → обіцянка з файлом або адресою. */
  function sourceOf(key, item) {
    if (Board.imageSource) return Board.imageSource(key, item);
    if (window.ImgStore) return window.ImgStore.get(key);
    return null;
  }

  function loadImage(key, onReady, item) {
    if (imgCache[key]) return imgCache[key];
    var e = imgCache[key] = { state: 'loading', img: null };
    var src = sourceOf(key, item);
    if (!src) { e.state = 'fail'; return e; }

    function fail() { e.state = 'fail'; e.at = Date.now(); }

    Promise.resolve(src).then(function (got) {
      if (!got) { fail(); if (onReady) onReady(); return; }
      var own = typeof got !== 'string';
      var url = own ? URL.createObjectURL(got) : got;
      var img = new Image();
      if (!own) img.crossOrigin = 'anonymous';
      img.onload = function () { e.img = img; e.url = url; e.state = 'ok'; if (onReady) onReady(); };
      img.onerror = function () { fail(); if (own) URL.revokeObjectURL(url); if (onReady) onReady(); };
      img.src = url;
    }).catch(function () { fail(); if (onReady) onReady(); });

    return e;
  }

  /** Забути картинку, що не завантажилась, — наступне малювання спробує знову. */
  Board.forgetImage = function (key) {
    var e = imgCache[key];
    if (e && e.state !== 'ok') delete imgCache[key];
  };

  /* Картинки, які не завантажились давніше ніж olderMs тому, — забути,
     щоб наступне малювання спробувало ще раз. Раніше невдача була
     остаточною до перезапуску: фото, яке інший пристрій довантажив на
     сервер хвилиною пізніше, так і не зʼявлялося. Повертає, скільки забуто. */
  Board.retryFailedImages = function (olderMs) {
    var n = 0, now = Date.now();
    Object.keys(imgCache).forEach(function (k) {
      var e = imgCache[k];
      if (e && e.state === 'fail' && now - (e.at || 0) > (olderMs || 20000)) { delete imgCache[k]; n++; }
    });
    return n;
  };

  function imageKeysIn(slides) {
    var keys = [];
    (slides || []).forEach(function (s) {
      (s.items || []).forEach(function (it) {
        if (it.t === 'i' && it.k && keys.indexOf(it.k) < 0) keys.push(it.k);
      });
    });
    return keys;
  }

  /* ============================================================
     Малювання
     ============================================================ */

  /* Латиниця навмисно: у геометрії вершини підписують саме так,
     і в підручниках теж — A, B, C, а не А, Б, В. */
  var VERTEX_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /**
   * Підписи вершин. Літера ставиться назовні від центру фігури, щоб не
   * налазити на саму лінію. Розмір і відступ ділимо на масштаб — тоді
   * підпис лишається однаковим на екрані за будь-якого наближення.
   */
  function drawVertexLabels(ctx, it, scale) {
    var s = scale || 1;
    var sh = SHAPES[it.sh];
    var pts;

    if (sh && sh.round) {
      /* У кола вершин немає — підписуємо центр, як заведено. Але якщо в
         центрі вже стоїть справжня точка, літеру не малюємо: два підписи
         один на одному виглядають як брудна пляма. */
      var taken = (drawItems || []).some(function (x) {
        return x.t === 'o' && x.on && x.on.kind === 'center' && x.on.pid === it.id && x.n;
      });
      if (taken) return;
      pts = [[(it.a[0] + it.a[2]) / 2, (it.a[1] + it.a[3]) / 2]];
    } else {
      pts = shapePoints(it);
      if (!pts || !pts.length) return;
    }

    var cx = 0, cy = 0, i;
    for (i = 0; i < pts.length; i++) { cx += pts[i][0]; cy += pts[i][1]; }
    cx /= pts.length; cy /= pts.length;

    var size = 15 / s;
    var away = 13 / s;

    ctx.save();
    ctx.font = '700 ' + size + 'px Manrope, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3 / s;
    ctx.strokeStyle = '#fff';                 // світла обводка, щоб читалось на лінії
    ctx.fillStyle = it.c || '#0D2149';

    for (i = 0; i < pts.length && i < VERTEX_LETTERS.length; i++) {
      var dx = pts[i][0] - cx, dy = pts[i][1] - cy;
      var len = Math.hypot(dx, dy) || 1;
      var lx = pts[i][0] + (dx / len) * away;
      var ly = pts[i][1] + (dy / len) * away;
      var ch = (sh && sh.round) ? 'O' : VERTEX_LETTERS[i];
      ctx.strokeText(ch, lx, ly);
      ctx.fillText(ch, lx, ly);
    }
    ctx.restore();
  }

  /* Обгортка зі збереженням стану полотна. Потрібна тому, що всередині
     виставляються тінь, пунктир і прозорість, а виходів із функції багато —
     без цього налаштування одного об'єкта протікали б на наступний. */
  /* Що зараз малюється. Точка й відрізок посилаються на сусідів по слайду,
     тож їм потрібен весь список — а передавати його через кожен виклик
     означало б змінити підпис усього малювання заради двох видів. */
  var drawItems = null, drawMap = null;

  function setDrawScope(items) {
    drawItems = items || [];
    drawMap = idMap(drawItems);
  }

  Board.setDrawScope = setDrawScope;

  function drawItem(ctx, it, scale) {
    ctx.save();
    try { drawItemBody(ctx, it, scale); } finally { ctx.restore(); }
  }

  function drawItemBody(ctx, it, scale) {
    ctx.strokeStyle = it.c || '#0D2149';
    ctx.fillStyle = it.c || '#0D2149';
    ctx.lineWidth = it.w || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    /* Написане учнем видно як учнівське. Позначка by:'student' ставилася
       давно, але ніде не читалася, тож на дошці все виглядало однаково —
       і відрізнити свій запис від учнівського було неможливо.
       Не перефарбовуємо: колір міг обрати сам учень. Замість цього легкий
       ореол — його видно на будь-якому кольорі й він не заважає читати. */
    if (it.by === 'student') {
      ctx.shadowColor = 'rgba(147, 51, 234, .55)';
      ctx.shadowBlur = 9 / (scale || 1);
    }

    var i, x, y, w, h;

    if (it.t === 'd') {
      var g = prims.get(it);
      if (!g) return;
      var k = 1 / (scale || 1);          // позначки однакові на будь-якому масштабі
      ctx.lineWidth = it.w || 2;
      ctx.setLineDash(it.dash ? [7 * k, 5 * k] : []);
      g.segs.forEach(function (s) {
        ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
      });
      // допоміжні лінії (продовження сторони) — завжди пунктиром
      if (g.dashed && g.dashed.length) {
        ctx.setLineDash([6 * k, 5 * k]);
        g.dashed.forEach(function (s) {
          ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
        });
        ctx.setLineDash(it.dash ? [7 * k, 5 * k] : []);
      }
      g.circles.forEach(function (c) {
        ctx.beginPath(); ctx.arc(c.c[0], c.c[1], c.r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.setLineDash([]);

      // квадратик прямого кута
      var m = 11 * k;
      g.right.forEach(function (r) {
        var p1 = [r.at[0] + r.d1[0] * m, r.at[1] + r.d1[1] * m];
        var p2 = [r.at[0] + r.d2[0] * m, r.at[1] + r.d2[1] * m];
        var p3 = [p1[0] + r.d2[0] * m, p1[1] + r.d2[1] * m];
        ctx.lineWidth = Math.max(1, (it.w || 2) * 0.7);
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p3[0], p3[1]); ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      });

      // рисочки рівних відрізків
      var tl = 7 * k;
      ctx.lineWidth = Math.max(1, (it.w || 2) * 0.9);
      g.ticks.forEach(function (t) {
        ctx.beginPath();
        ctx.moveTo(t[0] - t[2] * tl, t[1] - t[3] * tl);
        ctx.lineTo(t[0] + t[2] * tl, t[1] + t[3] * tl);
        ctx.stroke();
      });

      // характерні точки
      g.dots.forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 3 * k, 0, Math.PI * 2); ctx.fill();
      });
      return;
    }

    if (it.t === 'p') {
      if (it.d.length < 4) {
        ctx.beginPath();
        ctx.arc(it.d[0], it.d[1], (it.w || 3) / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(it.d[0], it.d[1]);
      for (i = 2; i < it.d.length - 2; i += 2) {
        var mx = (it.d[i] + it.d[i + 2]) / 2, my = (it.d[i + 1] + it.d[i + 3]) / 2;
        ctx.quadraticCurveTo(it.d[i], it.d[i + 1], mx, my);
      }
      ctx.lineTo(it.d[it.d.length - 2], it.d[it.d.length - 1]);
      ctx.stroke();
      return;
    }

    if (it.t === 'l' || it.t === 'a') {
      ctx.beginPath();
      ctx.moveTo(it.a[0], it.a[1]);
      ctx.lineTo(it.a[2], it.a[3]);
      ctx.stroke();
      if (it.t === 'a') {
        var ang = Math.atan2(it.a[3] - it.a[1], it.a[2] - it.a[0]);
        var head = Math.max(10, (it.w || 3) * 3.4);
        ctx.beginPath();
        ctx.moveTo(it.a[2], it.a[3]);
        ctx.lineTo(it.a[2] - head * Math.cos(ang - 0.42), it.a[3] - head * Math.sin(ang - 0.42));
        ctx.moveTo(it.a[2], it.a[3]);
        ctx.lineTo(it.a[2] - head * Math.cos(ang + 0.42), it.a[3] - head * Math.sin(ang + 0.42));
        ctx.stroke();
      }
      return;
    }

    /* Стереометричне тіло.

       Каркас будується заново на кожному малюванні з двох кутів. Тому
       обертання не «перемальовує картинку», а справді повертає тіло:
       невидимі ребра перераховуються й міняються місцями з видимими. */
    if (it.t === 's') {
      var frame = solidFrame(it);
      if (!frame) return;

      var sw = Math.max(1.5, (it.w || 2));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.lineWidth = sw;
      ctx.beginPath();
      frame.visible.forEach(function (e) { ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); });
      ctx.stroke();

      if (it.hid !== 0 && frame.hidden.length) {
        /* Невидиме — тонше й пунктиром. Однакова товщина зробила б із
           каркаса плутанину: очей не розрізняє, що спереду, а що ззаду. */
        ctx.save();
        ctx.lineWidth = Math.max(1, sw * 0.62);
        ctx.setLineDash([7, 5]);
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        frame.hidden.forEach(function (e) { ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); });
        ctx.stroke();
        ctx.restore();
      }

      /* Переріз малюємо після ребер, але під підписами: заливка не має
         затуляти літери, якими його ж і називають. */
      if (frame.section && frame.section.length > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(frame.section[0][0], frame.section[0][1]);
        for (var q = 1; q < frame.section.length; q++) {
          ctx.lineTo(frame.section[q][0], frame.section[q][1]);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(75,63,219,.16)';
        ctx.fill();
        ctx.strokeStyle = '#4B3FDB';
        ctx.lineWidth = Math.max(2, sw * 1.15);
        ctx.stroke();
        ctx.restore();
      }

      if (frame.cons.length) {
        ctx.save();
        ctx.lineWidth = Math.max(1.4, sw * 0.85);
        frame.cons.forEach(function (c) {
          // висота — суцільна й помітна, решта тонша: інакше каркас губиться
          ctx.strokeStyle = c.k === 'height' ? '#F79009' : '#17B26A';
          ctx.setLineDash(c.k === 'height' ? [] : [6, 4]);
          ctx.beginPath();
          c.segs.forEach(function (e) { ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); });
          ctx.stroke();
        });
        ctx.restore();
      }

      if (it.lb !== 0 && frame.labels.length) {
        var lfs = Math.max(12, sw * 6);
        ctx.font = '600 ' + lfs + 'px "Source Serif 4", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        frame.labels.forEach(function (L) {
          if (L.name) ctx.fillText(L.name, L.x, L.y);
        });
      }
      return;
    }

    /* Координатна площина з графіком.

       Малюється кожного разу з нуля з тих самих чисел — тому досить
       посунути точку, і проєкції, січна, дотична й підпис h стають на нові
       місця самі. Нічого не «запамʼятовується» в координатах, бо все, що
       запамʼятали, рано чи пізно розходиться з тим, що показують. */
    if (it.t === 'f') {
      var m = planeMap(it);
      var W = m.win;
      var fn = planeFn(it);
      var thin = Math.max(1, (it.w || 2) * 0.5);
      var fsz = Math.max(10, (it.w || 2) * 4.5);

      var wasCap = ctx.lineCap, wasJoin = ctx.lineJoin;
      ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
      ctx.font = '600 ' + fsz + 'px "Source Serif 4", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      /* «Лише точки» потрібне для сторінки учня: там стала частина
         (осі, сітка, графік) запікається один раз, а рухома — окремими
         кадрами. Інакше кожне положення точки везло б із собою ще й увесь
         графік, і знімок уроку розпух би в десятки разів. */
      if (it.only === 'pts') {
        if (fn) drawPlanePoints(ctx, it, m, fn, fsz);
        ctx.lineCap = wasCap; ctx.lineJoin = wasJoin;
        return;
      }

      var stepX = niceStep(W.xb - W.xa), stepY = niceStep(W.yb - W.ya);

      // ---- сітка
      if (it.grid !== 0) {
        ctx.save();
        ctx.globalAlpha = 0.34;
        ctx.lineWidth = thin;
        ctx.beginPath();
        gridTicks(W.xa, W.xb, stepX).forEach(function (t) {
          var g = m.sx(t.v);
          ctx.moveTo(g, m.y1); ctx.lineTo(g, m.y2);
        });
        gridTicks(W.ya, W.yb, stepY).forEach(function (t) {
          var g = m.sy(t.v);
          ctx.moveTo(m.x1, g); ctx.lineTo(m.x2, g);
        });
        ctx.stroke();
        ctx.restore();
      }

      // ---- осі зі стрілками й підписами
      var ox = m.sx(0), oy = m.sy(0);
      var onX = oy >= m.y1 && oy <= m.y2;
      var onY = ox >= m.x1 && ox <= m.x2;
      var head = Math.max(7, (it.w || 2) * 3);

      ctx.lineWidth = Math.max(1.4, (it.w || 2) * 0.9);
      ctx.beginPath();
      if (onX) { ctx.moveTo(m.x1, oy); ctx.lineTo(m.x2, oy); }
      if (onY) { ctx.moveTo(ox, m.y2); ctx.lineTo(ox, m.y1); }
      ctx.stroke();

      if (onX) {
        ctx.beginPath();
        ctx.moveTo(m.x2, oy);
        ctx.lineTo(m.x2 - head, oy - head * 0.45);
        ctx.moveTo(m.x2, oy);
        ctx.lineTo(m.x2 - head, oy + head * 0.45);
        ctx.stroke();
      }
      if (onY) {
        ctx.beginPath();
        ctx.moveTo(ox, m.y1);
        ctx.lineTo(ox - head * 0.45, m.y1 + head);
        ctx.moveTo(ox, m.y1);
        ctx.lineTo(ox + head * 0.45, m.y1 + head);
        ctx.stroke();
      }

      /* Підписи осей ставимо через стільки поділок, скільки треба, щоб
         числа не наповзали, — тим самим правилом, що й на числовій осі. */
      if (it.nums !== 0) {
        var everyX = 1;
        while (m.kx * stepX * everyX < fsz * 2.4) everyX++;
        var everyY = 1;
        while (m.ky * stepY * everyY < fsz * 1.9) everyY++;

        ctx.save();
        ctx.globalAlpha = 0.85;
        var labY = onX ? oy : m.y2;
        gridTicks(W.xa, W.xb, stepX).forEach(function (t) {
          if (t.k % everyX || t.k === 0) return;
          var g = m.sx(t.v);
          if (g > m.x2 - head * 1.6) return;
          ctx.fillText(numLabel(t.v, stepX), g, labY + fsz * 0.34);
        });
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        var labX = onY ? ox : m.x1;
        gridTicks(W.ya, W.yb, stepY).forEach(function (t) {
          if (t.k % everyY || t.k === 0) return;
          var g = m.sy(t.v);
          if (g < m.y1 + head * 1.6) return;
          ctx.fillText(numLabel(t.v, stepY), labX - fsz * 0.34, g);
        });
        if (onX && onY) {
          ctx.textAlign = 'right'; ctx.textBaseline = 'top';
          ctx.fillText('0', ox - fsz * 0.28, oy + fsz * 0.3);
        }
        ctx.restore();
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      }

      // ---- графік
      var col = it.gc || '#1358F5';
      if (fn) {
        ctx.save();
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(2, (it.w || 2) * 1.15);
        ctx.beginPath();
        /* Понад дві сотні ланок крива вже не стає гладкішою, зате саме з
           них складається те, що їде на сторінку учня: там площина
           розкладається на окремі відрізки, і зайва тисяча — це зайва
           тисяча рядків у знімку уроку. */
        var steps = Math.max(120, Math.min(240, Math.round((m.x2 - m.x1) / 2)));
        var drawing = false;
        for (var q = 0; q <= steps; q++) {
          var mxv = W.xa + (W.xb - W.xa) * q / steps;
          var myv = fn(mxv);
          if (isNaN(myv) || myv < W.ya - (W.yb - W.ya) || myv > W.yb + (W.yb - W.ya)) {
            drawing = false; continue;      // розрив або далеко за вікном
          }
          var px = m.sx(mxv), py = m.sy(myv);
          if (drawing) ctx.lineTo(px, py); else { ctx.moveTo(px, py); drawing = true; }
        }
        ctx.stroke();
        ctx.restore();
      }

      // ---- визначений інтеграл: площа під кривою
      if (fn && it.integ) drawIntegral(ctx, it, m, fn, fsz);

      // ---- точки, проєкції, січна, дотична
      if (fn) drawPlanePoints(ctx, it, m, fn, fsz);

      ctx.lineCap = wasCap; ctx.lineJoin = wasJoin;
      return;
    }

    /* Геометрична точка. */
    if (it.t === 'o') {
      var pp = window.Points ? Points.at(it, drawMap) : (it.p || null);
      if (!pp) return;
      var pr = pointR(it);

      ctx.beginPath();
      ctx.arc(pp[0], pp[1], pr, 0, Math.PI * 2);
      ctx.fill();

      if (it.n && it.lb !== 0) {
        // літера росте разом із точкою: дрібний підпис біля великої крапки
        // виглядає загубленим
        var pfs = Math.max(12, pr * 2.6);
        ctx.font = '600 ' + pfs + 'px "Source Serif 4", Georgia, serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(it.n, pp[0] + pr * 1.5, pp[1] - pr * 0.8);
      }
      return;
    }

    /* Відрізок між двома точками.

       Своїх координат не має: щоразу питає їх у точок. Тому він не може
       відстати від них — ні коли точку тягнуть, ні коли рухається фігура,
       якій ця точка належить. */
    if (it.t === 'c') {
      var byc = drawMap || {};
      var A = window.Points ? Points.at(byc[it.a1], byc) : null;
      var B2 = window.Points ? Points.at(byc[it.a2], byc) : null;
      if (!A || !B2) return;

      var kd = it.k || 'seg';
      var ends = linkEnds(A, B2, kd);

      var wasDash = it.dash ? [7, 5] : [];
      ctx.save();
      ctx.setLineDash(wasDash);
      ctx.beginPath();
      ctx.moveTo(ends[0][0], ends[0][1]);
      ctx.lineTo(ends[1][0], ends[1][1]);
      ctx.stroke();
      ctx.setLineDash([]);

      // у вектора — вістря на другій точці
      if (kd === 'vec') {
        var an = Math.atan2(B2[1] - A[1], B2[0] - A[0]);
        var hd = Math.max(10, (it.w || 3) * 3.4);
        ctx.beginPath();
        ctx.moveTo(B2[0], B2[1]);
        ctx.lineTo(B2[0] - hd * Math.cos(an - 0.42), B2[1] - hd * Math.sin(an - 0.42));
        ctx.moveTo(B2[0], B2[1]);
        ctx.lineTo(B2[0] - hd * Math.cos(an + 0.42), B2[1] - hd * Math.sin(an + 0.42));
        ctx.stroke();
      }
      ctx.restore();

      if (it.marks === 0) return;
      var mk = linkMarks(drawItems || []);

      // рисочки рівності посередині
      var n2c = mk.ticks[it.id] || 0;
      if (n2c) {
        var mx = (A[0] + B2[0]) / 2, my = (A[1] + B2[1]) / 2;
        var dx2 = B2[0] - A[0], dy2 = B2[1] - A[1];
        var L2c = Math.hypot(dx2, dy2) || 1;
        var ux = dx2 / L2c, uy = dy2 / L2c;
        var nx = -uy, ny = ux;
        var half = Math.max(5, (it.w || 3) * 2.4);
        var gap = Math.max(3, (it.w || 3) * 1.6);

        ctx.beginPath();
        for (var q = 0; q < n2c; q++) {
          var off = (q - (n2c - 1) / 2) * gap;
          var bx = mx + ux * off, by2 = my + uy * off;
          ctx.moveTo(bx - nx * half, by2 - ny * half);
          ctx.lineTo(bx + nx * half, by2 + ny * half);
        }
        ctx.stroke();
      }

      // прямий кут малює той відрізок, який його «тримає»
      mk.right.forEach(function (r) {
        if (r.owner !== it.id) return;
        var m2 = Math.max(9, (it.w || 3) * 3.4);
        var p1 = [r.at[0] + r.d1[0] * m2, r.at[1] + r.d1[1] * m2];
        var p2 = [r.at[0] + r.d2[0] * m2, r.at[1] + r.d2[1] * m2];
        var p3 = [p1[0] + r.d2[0] * m2, p1[1] + r.d2[1] * m2];
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      });
      return;
    }

    /* Числова вісь.

       Малюємо горизонтально від першої точки до другої, незалежно від того,
       як тягнули: похила вісь не буває, а тремтіння руки не має ставати
       частиною побудови. Вертикальна координата береться з початку.

       Ділення рахуються від from до to з кроком step; підписи ставимо не
       під кожним, а через стільки, скільки влізає — інакше на дрібному
       кроці числа наповзають одне на одне й не читаються. */
    if (it.t === 'n') {
      var x1 = Math.min(it.a[0], it.a[2]), x2 = Math.max(it.a[0], it.a[2]);
      var y = it.a[1];
      var from = numFrom(it), to = numTo(it), step = numStep(it);
      var span = to - from;
      if (!(span > 0) || x2 - x1 < 4) return;

      var head = Math.max(9, (it.w || 3) * 3.2);

      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();

      // стрілка праворуч: вісь спрямована в бік зростання
      ctx.beginPath();
      ctx.moveTo(x2, y);
      ctx.lineTo(x2 - head * 0.9, y - head * 0.42);
      ctx.moveTo(x2, y);
      ctx.lineTo(x2 - head * 0.9, y + head * 0.42);
      ctx.stroke();

      var px = (x2 - x1 - head) / span;             // пікселів на одиницю
      var count = Math.round(span / step);
      if (count > 400) return;                      // безглуздо дрібний крок

      /* Крок більший за діапазон: жодне ділення в нього не вміщається, і
         вісь виходила голою рискою з однією поділкою на початку. Замість
         порожнечі показуємо хоча б кінці — з них видно, що вісь жива, а
         крок треба поправити. */
      if (count < 1) { count = 1; step = span; }

      var fs = Math.max(11, (it.w || 3) * 4.2);
      var tick = Math.max(5, (it.w || 3) * 2.2);
      var mode = numFmt(it);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      /* Скільки ділень пропускати між підписами: беремо перше, при якому
         сусідні числа не торкаються.

         Міряємо найширший підпис, а не розмір шрифту: «1000» удвічі ширше
         за «5», і осі на кшталт 0…1000 інакше злипаються в суцільну смугу.
         Міряє та сама функція, що й малює, — інакше вони розійшлися б,
         щойно підпис стане дробом. */
      var widest = 0;
      for (var w0 = 0; w0 <= count; w0++) {
        var lw = drawNumLabel(ctx, from + w0 * step, step, 0, 0, fs, mode, true);
        if (lw > widest) widest = lw;
      }
      var need = widest + fs * 0.7;                 // сам підпис плюс просвіт

      var everyN = 1;
      while (px * step * everyN < need && everyN < count) everyN++;

      for (var k = 0; k <= count; k++) {
        var v = from + k * step;
        var tx = x1 + (v - from) * px;
        var big = (k % everyN) === 0;

        ctx.beginPath();
        ctx.moveTo(tx, y - (big ? tick : tick * 0.55));
        ctx.lineTo(tx, y + (big ? tick : tick * 0.55));
        ctx.stroke();

        if (big) drawNumLabel(ctx, v, step, tx, y + tick + fs * 0.35, fs, mode, false);
      }

      drawIneq(ctx, it, x1, x2 - head, y, from, to, fs, tick);
      return;
    }

    if (it.t === 'r') {
      ctx.beginPath();
      ctx.rect(Math.min(it.a[0], it.a[2]), Math.min(it.a[1], it.a[3]),
               Math.abs(it.a[2] - it.a[0]), Math.abs(it.a[3] - it.a[1]));
      ctx.stroke();
      return;
    }

    if (it.t === 'e') {
      ctx.beginPath();
      ctx.ellipse((it.a[0] + it.a[2]) / 2, (it.a[1] + it.a[3]) / 2,
        Math.abs(it.a[2] - it.a[0]) / 2, Math.abs(it.a[3] - it.a[1]) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (it.t === 'g') {
      var sh = SHAPES[it.sh];
      if (!sh) return;
      ctx.beginPath();
      if (sh.round) {
        // еліпс повертати нема сенсу лише тоді, коли він коло; ellipse уміє сам
        ctx.ellipse((it.a[0] + it.a[2]) / 2, (it.a[1] + it.a[3]) / 2,
          Math.abs(it.a[2] - it.a[0]) / 2, Math.abs(it.a[3] - it.a[1]) / 2,
          (it.rot || 0) * Math.PI / 180, 0, Math.PI * 2);
      } else {
        var pts = shapePoints(it);
        if (!pts) return;
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
      }
      if (it.f) { ctx.fillStyle = it.f; ctx.fill(); }
      ctx.strokeStyle = it.c || '#0D2149';
      ctx.stroke();
      if (it.lb) drawVertexLabels(ctx, it, scale);
      return;
    }

    if (it.t === 'x') {
      ctx.font = '500 ' + it.s + 'px Manrope, "Segoe UI", system-ui, sans-serif';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      String(it.v).split('\n').forEach(function (line, n) {
        ctx.fillText(line, it.p[0], it.p[1] + n * it.s * 1.25);
      });
      return;
    }

    if (it.t === 'i') {
      x = Math.min(it.a[0], it.a[2]); y = Math.min(it.a[1], it.a[3]);
      w = Math.abs(it.a[2] - it.a[0]); h = Math.abs(it.a[3] - it.a[1]);
      var e = imgCache[it.k];
      if (e && e.state === 'ok') {
        if (!it.q) { ctx.drawImage(e.img, x, y, w, h); return; }
        /* Повернута на q чвертей: рамка вже рівна й помінялась сторонами,
           тож малюємо навколо її центра з розмірами «до повороту». */
        var odd = it.q % 2, dw = odd ? h : w, dh = odd ? w : h;
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(it.q * Math.PI / 2);
        ctx.drawImage(e.img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.fillStyle = '#F0F5FF';
      ctx.strokeStyle = '#8FB4FF';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, w, h);
      ctx.setLineDash([9, 7]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = '#7E90AE';
      ctx.font = '600 ' + Math.max(12, Math.min(20, h / 8)) + 'px Manrope, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e && e.state === 'fail' ? 'картинку не знайдено' : 'завантаження…', x + w / 2, y + h / 2);
      ctx.restore();
    }
  }

  function drawBackground(ctx, bg, cam, scale, w, h) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    if (bg === 'blank') return;

    var step = 40 * scale;
    while (step < 14) step *= 2;
    while (step > 150) step /= 2;

    var ox = (-cam.x * scale) % step;
    var oy = (-cam.y * scale) % step;
    if (ox < 0) ox += step;
    if (oy < 0) oy += step;

    var x, y;
    if (bg === 'dots') {
      ctx.fillStyle = '#C9D6EA';
      var r = Math.max(0.8, Math.min(1.8, scale * 1.2));
      for (x = ox; x < w; x += step) {
        for (y = oy; y < h; y += step) {
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      return;
    }

    ctx.strokeStyle = '#E8EEF8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (x = ox; x < w; x += step) { ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, h); }
    for (y = oy; y < h; y += step) { ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(w, Math.round(y) + .5); }
    ctx.stroke();
  }

  /* ============================================================
     Board
     ============================================================ */

  function Board(canvas, opts) {
    var self = this;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.readOnly = !!this.opts.readOnly;

    this.slide = null;
    this.cam = { x: 0, y: 0 };
    this.scale = 1;

    this.tool = 'pen';
    this.shape = 'rect';
    this.color = '#0D2149';
    this.width = 3;
    this.fontSize = 26;
    /* Розмір точки живе окремо від товщини пера. На кресленні вершини мають
       бути помітними, а відрізки між ними — тонкими, і одна спільна товщина
       такого поєднання не давала. */
    this.pointSize = 6;
    /* Товщина зʼєднань. 0 означає «рахуй від розміру точки».

       Розчепити розмір точки й товщину пера було правильно, але лишити
       їх без жодного звʼязку — ні: великі вершини й волосяна лінія між
       ними виглядають як помилка. Тож поки товщину не задали руками,
       вона йде за точкою; щойно задали — слухається тільки руки. */
    this.linkWidth = 0;
    this.fillOn = false;
    this.showMeasures = false;  // підписи сторін і кутів — лише за командою
    this.showLabels = true;     // підписи вершин A, B, C — як у підручнику
    this.flipX = false;         // наступна фігура дзеркальна (прямий кут справа)
    /* Корекція почерку вимкнена за замовчуванням: 0 вимк, 1 легка, 2 сильна.
       Раніше стояла сильна — і рукописний текст перетворювався на друкований,
       хоча людина хотіла бачити саме свій почерк. */
    this.smoothing = 0;

    this.selection = [];       // масив виділених об'єктів
    this.draft = null;
    this.band = null;          // рамка виділення
    this.lastPointer = null;   // де курсор був над полотном — туди вставляємо
    this.history = [];
    this.future = [];
    this.histories = {};

    this._raf = null;
    this._pointers = {};
    this._pinch = null;

    this._onDown = function (e) { self._pointerDown(e); };
    this._onMove = function (e) { self._pointerMove(e); };
    this._onUp = function (e) { self._pointerUp(e); };
    this._onWheel = function (e) { self._wheel(e); };
    this._onResize = function () { self.resize(); };
    this._onCtx = function (e) { e.preventDefault(); };

    canvas.addEventListener('pointerdown', this._onDown);
    canvas.addEventListener('pointermove', this._onMove);
    canvas.addEventListener('pointerup', this._onUp);
    canvas.addEventListener('pointercancel', this._onUp);
    canvas.addEventListener('wheel', this._onWheel, { passive: false });
    canvas.addEventListener('contextmenu', this._onCtx);
    window.addEventListener('resize', this._onResize);

    this.resize();
  }

  Board.prototype.destroy = function () {
    this.canvas.removeEventListener('pointerdown', this._onDown);
    this.canvas.removeEventListener('pointermove', this._onMove);
    this.canvas.removeEventListener('pointerup', this._onUp);
    this.canvas.removeEventListener('pointercancel', this._onUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('contextmenu', this._onCtx);
    window.removeEventListener('resize', this._onResize);
    if (this._raf) cancelAnimationFrame(this._raf);
  };

  /* ---------- Координати ---------- */

  Board.prototype.toWorld = function (sx, sy) {
    return { x: sx / this.scale + this.cam.x, y: sy / this.scale + this.cam.y };
  };

  Board.prototype.toScreen = function (wx, wy) {
    return { x: (wx - this.cam.x) * this.scale, y: (wy - this.cam.y) * this.scale };
  };

  Board.prototype.eventPos = function (e) {
    var r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  Board.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    this.cssW = r.width;
    this.cssH = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.dpr = dpr;
    this.render();
  };

  /* ---------- Слайд ---------- */

  Board.prototype.setSlide = function (slide, keepView) {
    // ідемо з цього слайда — закріплюємо, яким він був після останньої власної дії
    if (this.slide && this.slide !== slide && this.history) {
      var top = this.history[this.history.length - 1];
      if (top && typeof top === 'object' && top.open) {
        top.after = JSON.stringify(this.slide.items);
        top.open = false;
      }
    }
    this.slide = slide;
    this.clearSelection(true);
    this.draft = null;
    this.band = null;

    var id = slide ? slide.id : '_none';
    if (!this.histories[id]) this.histories[id] = { undo: [], redo: [] };
    this.history = this.histories[id].undo;
    this.future = this.histories[id].redo;

    this.ensureImages();
    this.syncConstructions();

    if (!keepView) {
      if (slide && slide.view) {
        // слайд відкривається саме там, де його залишили при створенні вмісту
        this.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, slide.view.s || 1));
        this.cam = { x: slide.view.x || 0, y: slide.view.y || 0 };
        this.viewChanged();
      } else if (slide && slide.items && slide.items.length) {
        this.fit();
      } else {
        this.resetView();
      }
    }
    this.render();
  };

  Board.prototype.items = function () { return (this.slide && this.slide.items) || []; };

  /** Перерахувати геометрію всіх побудов слайда з їхніх батьківських фігур. */
  Board.prototype.syncConstructions = function () {
    var items = this.items();
    var byId = {}, i, has = false;
    for (i = 0; i < items.length; i++) {
      if (items[i].id) byId[items[i].id] = items[i];
      if (items[i].t === 'd') has = true;
    }
    if (!has) return;
    var Cn = window.Constructions;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.t !== 'd') continue;
      var parent = byId[it.pid];
      prims.set(it, (parent && Cn) ? Cn.resolve(it, parent) : null);
    }
  };

  /**
   * Додати побудову до фігури. spec: {k, i, a1, a2}.
   * Повертає створений об'єкт або null, якщо побудова неможлива.
   */
  Board.prototype.addConstruction = function (parent, spec) {
    if (!this.slide || !parent || parent.t !== 'g' || !window.Constructions) return null;
    if (!parent.id) parent.id = uid('sh');

    var it = { t: 'd', pid: parent.id, k: spec.k, c: this.color, w: Math.max(2, this.width - 1) };
    if (spec.i != null) it.i = spec.i;
    if (spec.a1 != null) it.a1 = spec.a1;
    if (spec.a2 != null) it.a2 = spec.a2;
    // n — сторін у многокутнику, r2 — частка радіуса для концентричного кола
    if (spec.n != null) it.n = spec.n;
    if (spec.r2 != null) it.r2 = spec.r2;

    var g = window.Constructions.resolve(it, parent);
    if (!g || (!g.segs.length && !g.circles.length)) return null;

    /* Та сама побудова двічі — це просто друга лінія поверх першої: на вигляд
       нічого не змінилось, а прибирати доводиться двічі. Тому мовчки пропускаємо. */
    var dup = this.constructionsOf(parent).filter(function (x) {
      return window.Constructions.sameSpec(x, it);
    })[0];
    if (dup) return dup;

    this.snapshot();
    this.slide.items.push(ided(it));
    prims.set(it, g);
    this.rememberInitialView();
    this.changed();
    return it;
  };

  /** Побудови, прив'язані до цієї фігури. */
  Board.prototype.constructionsOf = function (parent) {
    if (!parent || !parent.id) return [];
    return this.items().filter(function (x) { return x.t === 'd' && x.pid === parent.id; });
  };

  Board.prototype.ensureImages = function () {
    var self = this;
    ((this.slide && this.slide.items) || []).forEach(function (it) {
      if (it.t === 'i' && it.k && !imgCache[it.k]) loadImage(it.k, function () { self.render(); }, it);
    });
  };

  /* Чи можна цей обʼєкт виділяти, рухати й стирати.

     У кабінеті — будь-який. На сторінці учня — лише написане самим учнем:
     дошку репетитора учень бачить і доповнює, але не зіпсує. Правило задає
     той, хто запускає рушій, через opts.canEdit(обʼєкт). */
  Board.prototype.editable = function (it) {
    return !this.opts.canEdit || !!this.opts.canEdit(it);
  };

  /* ---------- Історія ---------- */

  /* Як у Miro: «крок назад» скасовує лише власну дію, а не повертає весь
     слайд до знімка. Раніше повертав — і разом зі своєю дією стирав усе,
     що тим часом прийшло з іншого пристрою чи від учня.

     Кожен крок памʼятає, яким був слайд до дії (before) і одразу після неї
     (after). Скасування переносить на теперішній слайд лише різницю між
     ними; чуже, що з'явилось пізніше, лишається на місці. */

  Board.prototype.snapshot = function () {
    if (this.readOnly || !this.slide) return;
    this.history.push({ before: JSON.stringify(this.slide.items), after: null, ext: this._ext || 0 });
    if (this.history.length > 40) this.history.shift();
    this.future.length = 0;
  };

  /* Перенести на items зміну, якою стан from став станом to. Обʼєкти, яких
     ця зміна не стосується, не чіпаємо. */
  function carry(items, from, to) {
    var f = {}, t = {}, i;
    for (i = 0; i < from.length; i++) if (from[i] && from[i].id) f[from[i].id] = from[i];
    for (i = 0; i < to.length; i++) if (to[i] && to[i].id) t[to[i].id] = to[i];
    var out = items.filter(function (it) {
      return !(it && it.id && f[it.id] && !t[it.id]);          // дія додала — прибираємо
    });
    var at = {};
    out.forEach(function (it, n) { if (it && it.id) at[it.id] = n; });
    to.forEach(function (it, n) {
      if (!it || !it.id) return;
      var was = f[it.id];
      if (!was) {                                               // дія стерла — повертаємо
        if (at[it.id] == null) out.splice(Math.min(n, out.length), 0, JSON.parse(JSON.stringify(it)));
        return;
      }
      if (JSON.stringify(was) === JSON.stringify(it)) return;   // дія не чіпала
      if (at[it.id] != null) out[at[it.id]] = JSON.parse(JSON.stringify(it));
    });
    return out;
  }

  function stepOf(e, now) {
    if (typeof e === 'string') return { before: e, after: now };   // запис старого вигляду
    return { before: e.before, after: e.open ? now : (e.after || now) };
  }

  /**
   * Зараз на слайд ляже чуже (з іншого пристрою чи від учня). Спершу
   * запамʼятовуємо, яким слайд був одразу після власної дії, — інакше
   * «крок назад» вважав би чуже своїм.
   */
  Board.prototype.sealHistory = function () {
    var top = this.history[this.history.length - 1];
    if (top && typeof top === 'object' && top.open && this.slide) {
      top.after = JSON.stringify(this.slide.items);
      top.open = false;
    }
    this._ext = (this._ext || 0) + 1;
  };

  Board.prototype.undo = function () {
    if (!this.history.length || !this.slide) return false;
    var now = JSON.stringify(this.slide.items);
    var e = stepOf(this.history.pop(), now);
    this._replay = true;
    this.slide.items = carry(this.slide.items, JSON.parse(e.after), JSON.parse(e.before));
    this.future.push({ before: e.before, after: e.after });
    this.clearSelection(true);
    this.changed();
    this._replay = false;
    return true;
  };

  Board.prototype.redo = function () {
    if (!this.future.length || !this.slide) return false;
    var e = this.future.pop();
    this._replay = true;
    this.slide.items = carry(this.slide.items, JSON.parse(e.before), JSON.parse(e.after));
    this.history.push({ before: e.before, after: e.after, ext: this._ext || 0 });
    this.clearSelection(true);
    this.changed();
    this._replay = false;
    return true;
  };

  Board.prototype.canUndo = function () { return this.history.length > 0; };
  Board.prototype.canRedo = function () { return this.future.length > 0; };

  Board.prototype.changed = function () {
    this.syncConstructions();
    /* Стан одразу після власної дії — для «кроку назад». Лише поки між
       дією й цим моментом не приходило чуже: інакше скасування вважало б
       чуже своїм і прибрало б його. */
    if (!this._replay && this.slide) {
      var top = this.history[this.history.length - 1];
      if (top && typeof top === 'object' && top.ext === (this._ext || 0)) top.open = true;
    }
    this.render();
    if (this.opts.onChange) this.opts.onChange();
  };

  /* ---------- Вигляд ---------- */

  Board.prototype.resetView = function () {
    this.scale = 1;
    this.cam = { x: -this.cssW / 2, y: -this.cssH / 2 };
    this.viewChanged();
  };

  Board.prototype.viewChanged = function () {
    this.render();
    if (this.opts.onViewChange) this.opts.onViewChange();
  };

  Board.prototype.zoomAt = function (factor, sx, sy) {
    var before = this.toWorld(sx, sy);
    this.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.scale * factor));
    var after = this.toWorld(sx, sy);
    this.cam.x += before.x - after.x;
    this.cam.y += before.y - after.y;
    this.viewChanged();
  };

  Board.prototype.zoomBy = function (factor) {
    this.zoomAt(factor, this.cssW / 2, this.cssH / 2);
  };

  Board.prototype.fit = function () {
    var b = unionBounds(this.items());
    if (!b) { this.resetView(); return; }
    var pad = 60;
    var w = Math.max(1, b.x2 - b.x1), h = Math.max(1, b.y2 - b.y1);
    this.scale = Math.max(MIN_SCALE, Math.min(2,
      Math.min((this.cssW - pad * 2) / w, (this.cssH - pad * 2) / h)));
    this.cam.x = (b.x1 + b.x2) / 2 - this.cssW / (2 * this.scale);
    this.cam.y = (b.y1 + b.y2) / 2 - this.cssH / (2 * this.scale);
    this.viewChanged();
  };

  /* ---------- Виділення ---------- */

  Board.prototype.clearSelection = function (silent) {
    this.selection = [];
    if (!silent && this.opts.onSelect) this.opts.onSelect([]);
  };

  Board.prototype.setSelection = function (items) {
    this.selection = items || [];
    if (this.opts.onSelect) this.opts.onSelect(this.selection);
  };

  Board.prototype.selectAll = function () {
    if (this.readOnly) return;
    this.setTool('select');
    this.setSelection(this.items().slice());
    this.render();
  };

  /** Рамка виділення у світових координатах або null. */
  Board.prototype.selectionBounds = function () {
    this.syncConstructions();
    return unionBounds(this.selection);
  };

  /* Кути спільної рамки кількох виділених обʼєктів — за них група
     збільшується чи зменшується цілком. Рамка малюється з відступом, тож і
     маркери стоять на її кутах, а не всередині. */
  /* Обʼєкти зі своїми маркерами розміру (кути рамки, кінці лінії, вершини).
     Решту — насамперед рукописний штрих — один виділений обʼєкт масштабує
     тією самою рамкою, що й група: інакше його не було як збільшити. */
  var OWN_RESIZE = { o: 1, l: 1, a: 1, n: 1, r: 1, e: 1, i: 1, g: 1, s: 1, f: 1, x: 1 };
  var NO_SCALE = { c: 1, d: 1 };

  Board.prototype._framed = function () {
    var sel = this.selection;
    if (sel.length > 1) return true;
    return sel.length === 1 && !OWN_RESIZE[sel[0].t] && !NO_SCALE[sel[0].t];
  };

  Board.prototype._groupFrame = function () {
    if (!this._framed()) return null;
    var gb = unionBounds(this.selection);
    if (!gb) return null;
    var pad = 11 / this.scale;
    return { x1: gb.x1 - pad, y1: gb.y1 - pad, x2: gb.x2 + pad, y2: gb.y2 + pad };
  };

  /**
   * Збільшити чи зменшити все виділене в k разів навколо центра рамки —
   * для кнопок на панелі виділення: пальцем за кут не завжди влучиш, а
   * кроком по 10 % зручно підганяти точно.
   */
  Board.prototype.scaleSelection = function (k) {
    if (this.readOnly || !this.selection.length) return;
    var gb = unionBounds(this.selection);
    if (!gb) return;
    this.snapshot();
    var cx = (gb.x1 + gb.x2) / 2, cy = (gb.y1 + gb.y2) / 2;
    this.selection.forEach(function (it) { scaleItemFrom(it, geomOf(it), k, cx, cy); });
    this.syncConstructions();
    this.changed();
    if (this.opts.onSelect) this.opts.onSelect(this.selection);
  };

  /**
   * Повернути виділені картинки на чверть оберту: dir = 1 — за годинниковою
   * стрілкою, −1 — проти. Фото з телефона часто лягає боком. Рамка лишається
   * рівною — її сторони міняються місцями навколо центра, а it.q (0…3)
   * каже, скількома чвертями повернуто сам файл.
   */
  Board.prototype.rotateImages = function (dir) {
    if (this.readOnly) return;
    var imgs = this.selection.filter(function (it) { return it.t === 'i'; });
    if (!imgs.length) return;
    this.snapshot();
    imgs.forEach(function (it) {
      var q = (((it.q || 0) + dir) % 4 + 4) % 4;
      if (q) it.q = q; else delete it.q;
      var cx = (it.a[0] + it.a[2]) / 2, cy = (it.a[1] + it.a[3]) / 2;
      var w = Math.abs(it.a[2] - it.a[0]), h = Math.abs(it.a[3] - it.a[1]);
      it.a = [round(cx - h / 2), round(cy - w / 2), round(cx + h / 2), round(cy + w / 2)];
    });
    this.changed();
    if (this.opts.onSelect) this.opts.onSelect(this.selection);
  };

  Board.prototype._handles = function () {
    if (this._framed()) {
      var f = this._groupFrame();
      if (!f) return null;
      return [
        { id: 'gnw', x: f.x1, y: f.y1 }, { id: 'gne', x: f.x2, y: f.y1 },
        { id: 'gse', x: f.x2, y: f.y2 }, { id: 'gsw', x: f.x1, y: f.y2 }
      ];
    }
    if (this.selection.length !== 1) return null;
    var it = this.selection[0];
    /* У точки один маркер — вона сама. Тягнення ним не просто пересуває
       точку, а заново шукає, до чого вона липне: так її можна зняти з
       однієї сторони й посадити на іншу. */
    if (it.t === 'o') {
      var hp2 = window.Points ? Points.at(it, drawMap || {}) : it.p;
      return hp2 ? [{ id: 'pt', x: hp2[0], y: hp2[1] }] : null;
    }
    if (it.t === 'l' || it.t === 'a' || it.t === 'n') {
      return [{ id: 'p1', x: it.a[0], y: it.a[1] }, { id: 'p2', x: it.a[2], y: it.a[3] }];
    }
    if (it.t === 'r' || it.t === 'e' || it.t === 'i' || it.t === 'g') {
      var a = it.a;
      var box = [
        { id: 'nw', x: a[0], y: a[1] }, { id: 'ne', x: a[2], y: a[1] },
        { id: 'se', x: a[2], y: a[3] }, { id: 'sw', x: a[0], y: a[3] }
      ];
      if (it.t !== 'g') return box;

      /* У фігури маркерів більше: кут повороту й кожна вершина окремо.
         Кути рамки лишаються — ними міняють розмір. */
      var cx1 = (a[0] + a[2]) / 2, cy1 = (a[1] + a[3]) / 2;
      box = rotatePts(box.map(function (p) { return [p.x, p.y]; }), it.rot, cx1, cy1)
        .map(function (p, i) { return { id: ['nw', 'ne', 'se', 'sw'][i], x: p[0], y: p[1] }; });

      var top = Math.min(a[1], a[3]);
      var rh = rotatePts([[cx1, top - 34]], it.rot, cx1, cy1)[0];
      box.push({ id: 'rot', x: rh[0], y: rh[1] });

      var vp = shapePoints(it);
      if (vp && vp.length <= 12) {
        vp.forEach(function (p, i) { box.push({ id: 'v' + i, x: p[0], y: p[1] }); });
      }
      return box;
    }
    /* У тіла один додатковий маркер — обертання. Він робить одразу обидва
       кути: горизонталь крутить навколо вертикалі, вертикаль нахиляє.
       Двома окремими ручками цим було б неможливо користуватися. */
    if (it.t === 's') {
      var sa = it.a;
      var scx = (sa[0] + sa[2]) / 2;
      var stop = Math.min(sa[1], sa[3]);
      var hs3 = [
        { id: 'nw', x: sa[0], y: sa[1] }, { id: 'ne', x: sa[2], y: sa[1] },
        { id: 'se', x: sa[2], y: sa[3] }, { id: 'sw', x: sa[0], y: sa[3] },
        { id: 'spin', x: scx, y: stop - 34 }
      ];

      /* Вершини многогранника — теж маркери. У круглих тіл вершин немає,
         тож і тягати там нічого. */
      var fr3 = solidFrame(it);
      if (fr3 && fr3.fit && window.Solids && Solids.pointsOf) {
        var all3 = Solids.pointsOf(it.k || 'cube', it.mv);
        all3.forEach(function (p, i) {
          if (p.id.charAt(0) !== 'v') return;             // середини ребер не тягаємо
          var pr = Solids.project(p.p, fr3.fit.yaw, fr3.fit.pitch);
          var b3 = fr3.fit.toBoard(pr);
          hs3.push({ id: 'sv' + i, x: b3[0], y: b3[1] });
        });
      }
      return hs3;
    }

    /* У площини маркери двох сортів: кути змінюють розмір, а дві точки на
       графіку — те, заради чого вона й потрібна. Тягнення точок іде тим
       самим механізмом, що й тягнення кутів, тож нічого нового вчити не
       треба: взявся й повів. */
    if (it.t === 'f') {
      var fa = it.a;
      var hs = [
        { id: 'nw', x: fa[0], y: fa[1] }, { id: 'ne', x: fa[2], y: fa[1] },
        { id: 'se', x: fa[2], y: fa[3] }, { id: 'sw', x: fa[0], y: fa[3] }
      ];
      if (it.pts !== 0) {
        var pm = planeMap(it), pf = planeFn(it);
        if (pf) {
          [['fx1', planeP1(it)], ['fx2', planeP2(it)]].forEach(function (p) {
            var yv = pf(p[1]);
            if (!isNaN(yv)) hs.push({ id: p[0], x: pm.sx(p[1]), y: pm.sy(yv) });
          });
        }
      }
      return hs;
    }
    if (it.t === 'x') {
      // напис тягнеться за кути так само, як фігура — змінюється кегль
      var b = itemBounds(it);
      if (!b) return null;
      return [
        { id: 'nw', x: b.x1, y: b.y1 }, { id: 'ne', x: b.x2, y: b.y1 },
        { id: 'se', x: b.x2, y: b.y2 }, { id: 'sw', x: b.x1, y: b.y2 }
      ];
    }
    return null;
  };

  Board.prototype._handleAt = function (x, y) {
    var hs = this._handles();
    if (!hs) return null;
    var tol = HANDLE_PX / this.scale;

    /* Беремо НАЙБЛИЖЧИЙ, а не перший підхожий. На віддаленому масштабі
       допуск у світових одиницях великий, і в нього потрапляє одразу
       кілька маркерів — тоді завжди вигравав той, що стоїть першим у
       списку, тобто кут рамки, а не та вершина, за яку взялися. */
    var best = null, bestD = Infinity;
    for (var i = 0; i < hs.length; i++) {
      var d = Math.hypot(x - hs[i].x, y - hs[i].y);
      if (d <= tol && d < bestD) { bestD = d; best = hs[i]; }
    }
    return best;
  };

  /**
   * Масштабування напису за кутовий маркер. Кегль змінюється пропорційно,
   * протилежний кут лишається на місці — як у геометричної фігури.
   */
  function resizeText(it, id, wx, wy) {
    var b = itemBounds(it);
    if (!b) return;
    var w0 = Math.max(1e-6, b.x2 - b.x1), h0 = Math.max(1e-6, b.y2 - b.y1);

    var ax, ay;
    if (id === 'nw') { ax = b.x2; ay = b.y2; }
    else if (id === 'ne') { ax = b.x1; ay = b.y2; }
    else if (id === 'se') { ax = b.x1; ay = b.y1; }
    else { ax = b.x2; ay = b.y1; }

    // беремо більшу зміну, щоб текст не деформувався
    var f = Math.max(Math.abs(wx - ax) / w0, Math.abs(wy - ay) / h0);
    f = Math.max(0.1, Math.min(30, f));

    var ns = Math.max(6, Math.min(400, Math.round(it.s * f)));
    if (ns === it.s) return;
    var k = ns / it.s;
    it.s = ns;

    var nw = w0 * k, nh = h0 * k;
    var x1 = (id === 'nw' || id === 'sw') ? ax - nw : ax;
    var y1 = (id === 'nw' || id === 'ne') ? ay - nh : ay;
    it.p[0] = round(x1);
    it.p[1] = round(y1 + it.s);   // itemBounds відкладає верх як p[1] − s
  }

  var svFit = null;      // зафіксоване перетворення, поки тягнуть вершину тіла

  function resizeByHandle(it, id, wx, wy, free) {
    if (it.t === 'x') { resizeText(it, id, wx, wy); return; }

    /* Точка ходить лише вздовж графіка: вертикаль задає сама функція.
       Тому беремо з миші тільки x — інакше точка зʼїжджала б із кривої,
       а це вже не та побудова. */
    if (id === 'fx1' || id === 'fx2') {
      var pm = planeMap(it);
      var mv = pm.mx(wx);
      var lim = (pm.win.xb - pm.win.xa) * 0.002;
      mv = Math.max(pm.win.xa + lim, Math.min(pm.win.xb - lim, mv));
      mv = Math.round(mv * 1000) / 1000;
      if (id === 'fx1') it.p1 = mv; else it.p2 = mv;
      return;
    }

    /**
     * Вершина тіла в просторі.
     *
     * Мишею задаються дві координати з трьох, і третю вигадувати не можна:
     * вершина щоразу від'їжджала б у глибину сама собою. Тому глибину
     * лишаємо ту, що була, — миша рухає вершину в площині екрана. Рух
     * уздовж третьої осі є окремо: із Shift вертикаль миші стає висотою.
     */
    if (id.charAt(0) === 's' && id.charAt(1) === 'v' && it.t === 's') {
      var vi3 = Number(id.slice(2));
      /* Перетворення фіксуємо на весь час тягнення. Рух вершини змінює
         межі каркаса, а з ними масштаб і зсув — і вершина щоразу сідала б
         не туди, куди її ведуть, бо картинка під курсором уже інша. */
      if (!svFit) {
        var fr0 = solidFrame(it);
        if (!fr0 || !fr0.fit) return;
        svFit = fr0.fit;
      }
      var fr = { fit: svFit };
      if (!window.Solids) return;

      var all = Solids.pointsOf(it.k || 'cube', it.mv);
      var p0 = all[vi3];
      if (!p0 || p0.id.charAt(0) !== 'v') return;

      var yaw3 = fr.fit.yaw, pitch3 = fr.fit.pitch;
      var was3 = Solids.project(p0.p, yaw3, pitch3);
      var loc = fr.fit.fromBoard(wx, wy);

      var np;
      if (free) {
        // Shift: рухаємо лише по висоті, решта лишається
        np = [p0.p[0], p0.p[1], p0.p[2] + (was3[1] - loc[1])];
      } else {
        np = Solids.unproject(loc[0], loc[1], was3[2], yaw3, pitch3);
      }

      np = np.map(function (q) { return Math.max(-4, Math.min(4, Math.round(q * 1e4) / 1e4)); });
      it.mv = it.mv || {};
      it.mv[String(vi3)] = np;
      return;
    }

    /* Обертання тіла. Горизонтальний зсув — навколо вертикалі, вертикальний
       — нахил. Нахил обмежуємо: за межами приблизно ±80° тіло стає плоским
       і читати його неможливо. */
    if (id === 'spin' && it.t === 's') {
      var ccx = (it.a[0] + it.a[2]) / 2;
      var ctop = Math.min(it.a[1], it.a[3]);
      var base = window.Solids && Solids.KINDS[it.k || 'cube'];
      var y0 = typeof it.yaw === 'number' ? it.yaw : ((base && base.yaw0) || 28);
      it.yaw = Math.round((((wx - ccx) * 0.55) % 360 + 360) % 360 * 10) / 10;
      it.pitch = Math.max(-80, Math.min(80,
        Math.round((22 + (ctop - 34 - wy) * 0.35) * 10) / 10));
      return;
    }

    /* Поворот: кут рахуємо від центра до миші. Із Shift — кроками по 15°,
       щоб «рівно на 90» не доводилося ловити рукою. */
    if (id === 'rot') {
      var rcx = (it.a[0] + it.a[2]) / 2, rcy = (it.a[1] + it.a[3]) / 2;
      var ang = Math.atan2(wy - rcy, wx - rcx) * 180 / Math.PI + 90;
      if (!free) ang = Math.round(ang / 15) * 15;
      it.rot = Math.round(((ang % 360) + 360) % 360 * 10) / 10;
      return;
    }

    /* Тягнення однієї вершини. Фігура перестає бути «правильним
       трикутником із набору» й стає своєю власною: зберігаємо всі вершини
       як частки рамки, і далі вона живе цими числами. */
    if (id.charAt(0) === 'v' && it.t === 'g') {
      var vi = Number(id.slice(1));
      var raw = shapePoints(it);            // уже повернуті, у координатах дошки
      if (!raw || !(vi >= 0 && vi < raw.length)) return;

      raw = raw.slice();
      raw[vi] = [wx, wy];

      /* Поворот вбудовуємо у самі вершини й обнуляємо кут. Інакше після
         зміни вершин зсувається центр рамки, навколо якого крутиться
         фігура, — і точка сідає не туди, куди її вели. Фігура від цього
         нічого не втрачає: вона просто стає своєю власною. */
      it.rot = 0;

      var vxs = raw.map(function (p) { return p[0]; });
      var vys = raw.map(function (p) { return p[1]; });
      var bx1 = Math.min.apply(null, vxs), bx2 = Math.max.apply(null, vxs);
      var by1 = Math.min.apply(null, vys), by2 = Math.max.apply(null, vys);
      if (bx2 - bx1 < 8 || by2 - by1 < 8) return;    // вершини злиплися — не приймаємо

      it.pts = normalizePoints(raw).pts;
      it.a = [bx1, by1, bx2, by2];
      it.fx = 0; it.fy = 0;      // дзеркала вже враховані у збережених вершинах
      return;
    }

    if (id === 'pt' && it.t === 'o') {
      var snap = window.Points
        ? Points.snap(wx, wy, (drawItems || []).filter(function (x) { return x !== it; }))
        : { p: [wx, wy] };
      it.p = [round(snap.p[0]), round(snap.p[1])];
      if (snap.on) it.on = snap.on; else delete it.on;
      return;
    }

    if (id === 'p1') { it.a[0] = round(wx); it.a[1] = round(wy); return; }
    if (id === 'p2') { it.a[2] = round(wx); it.a[3] = round(wy); return; }

    var x1 = Math.min(it.a[0], it.a[2]), y1 = Math.min(it.a[1], it.a[3]);
    var x2 = Math.max(it.a[0], it.a[2]), y2 = Math.max(it.a[1], it.a[3]);

    var ax, ay;
    if (id === 'nw') { ax = x2; ay = y2; }
    else if (id === 'ne') { ax = x1; ay = y2; }
    else if (id === 'se') { ax = x1; ay = y1; }
    else { ax = x2; ay = y1; }

    var nw = Math.abs(wx - ax), nh = Math.abs(wy - ay);

    var aspect = 0;
    if (it.t === 'i' && it.r) aspect = it.q % 2 ? 1 / it.r : it.r;   // r — пропорції самого файлу
    else if (it.t === 'g' && SHAPES[it.sh] && SHAPES[it.sh].lock) aspect = SHAPES[it.sh].ar || 1;
    if (aspect && !free) {
      if (nw / aspect > nh) nh = nw / aspect; else nw = nh * aspect;
    }
    nw = Math.max(10, nw); nh = Math.max(10, nh);

    var sx = wx >= ax ? 1 : -1, sy = wy >= ay ? 1 : -1;
    it.a[0] = round(ax); it.a[1] = round(ay);
    it.a[2] = round(ax + sx * nw); it.a[3] = round(ay + sy * nh);
  }

  Board.prototype._hitTest = function (x, y) {
    this.syncConstructions();
    var tol = 8 / this.scale;
    var items = this.items();

    /* Точка виграє в лінії, що крізь неї проходить.
       Звичайне «зверху лежить — того й беремо» робило вершину недосяжною:
       відрізок додається після точок, отже накриває їх, і клік по вершині
       щоразу виділяв сторону. Точка — дрібніша ціль, і якщо палець потрапив
       у неї, людина цілилася саме в неї. */
    var best = null, bestD = Infinity, hitMap = null;
    for (var j = items.length - 1; j >= 0; j--) {
      var it = items[j];
      if (it.t !== 'o' || !this.editable(it) || !hitItem(it, x, y, tol)) continue;
      if (!hitMap) hitMap = idMap(items);
      var q = window.Points ? Points.at(it, hitMap) : it.p;
      if (!q) continue;
      var d = Math.hypot(x - q[0], y - q[1]);
      if (d < bestD) { bestD = d; best = it; }
    }
    if (best) return best;

    for (var i = items.length - 1; i >= 0; i--) {
      if (this.editable(items[i]) && hitItem(items[i], x, y, tol)) return items[i];
    }
    return null;
  };

  /** Об'єкти, чия рамка перетинається з прямокутником виділення. */
  Board.prototype._itemsInRect = function (r) {
    var x1 = Math.min(r.x0, r.x1), x2 = Math.max(r.x0, r.x1);
    var y1 = Math.min(r.y0, r.y1), y2 = Math.max(r.y0, r.y1);
    var self = this;
    return this.items().filter(function (it) {
      if (!self.editable(it)) return false;
      var b = itemBounds(it);
      return b && b.x1 <= x2 && b.x2 >= x1 && b.y1 <= y2 && b.y2 >= y1;
    });
  };

  /* ---------- Ввід ---------- */

  Board.prototype._pointerDown = function (e) {
    if (!this.slide) return;
    var p = this.eventPos(e);
    this.lastPointer = p;
    var w = this.toWorld(p.x, p.y);

    /* Текст: полотно не має ні захоплювати вказівник, ні дозволяти
       стандартну дію mousedown — інакше вона забирає фокус
       у щойно створеного поля введення, і воно закривається порожнім. */
    if (!this.readOnly && this.tool === 'text' && e.button === 0 && !this.spaceDown) {
      e.preventDefault();
      if (this.opts.onTextPlace) this.opts.onTextPlace(w, p);
      return;
    }

    try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* синтетичні події */ }
    this._pointers[e.pointerId] = p;

    var ids = Object.keys(this._pointers);
    if (ids.length === 2) {
      var a = this._pointers[ids[0]], b = this._pointers[ids[1]];
      this._pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
      this.draft = null;
      this.band = null;
      return;
    }

    if (e.button === 1 || e.button === 2 || this.tool === 'hand' || this.spaceDown) {
      this._pan = { sx: p.x, sy: p.y, camx: this.cam.x, camy: this.cam.y };
      this.canvas.style.cursor = 'grabbing';
      return;
    }
    if (this.readOnly) return;

    if (this.tool === 'eraser') {
      this.snapshot();
      this._erasing = true;
      this._erase(w.x, w.y);
      return;
    }

    if (this.tool === 'select') {
      var handle = this._handleAt(w.x, w.y);
      if (handle && handle.id.charAt(0) === 'g' && handle.id.length === 3) {
        // кут спільної рамки: уся група масштабується навколо протилежного кута
        var fr = this._groupFrame();
        if (fr) {
          this.snapshot();
          var c = handle.id.slice(1);
          this._gscale = {
            ax: c.indexOf('w') >= 0 ? fr.x2 : fr.x1,
            ay: c.indexOf('n') >= 0 ? fr.y2 : fr.y1,
            w0: Math.max(1e-6, fr.x2 - fr.x1),
            h0: Math.max(1e-6, fr.y2 - fr.y1),
            items: this.selection.slice(),
            src: this.selection.map(geomOf)
          };
        }
        return;
      }
      if (handle) {
        this.snapshot();
        this._resize = { id: handle.id, item: this.selection[0] };
        return;
      }
      var hit = this._hitTest(w.x, w.y);
      if (hit) {
        var idx = this.selection.indexOf(hit);
        if (e.shiftKey) {
          if (idx >= 0) this.selection.splice(idx, 1);
          else this.selection.push(hit);
          if (this.opts.onSelect) this.opts.onSelect(this.selection);
        } else if (idx < 0) {
          this.setSelection([hit]);
        }
        if (this.selection.length) {
          this.snapshot();
          this._drag = { x: w.x, y: w.y, items: this.selection.slice() };
        }
      } else {
        if (!e.shiftKey) this.clearSelection();
        this.band = { x0: w.x, y0: w.y, x1: w.x, y1: w.y, add: e.shiftKey };
      }
      this.render();
      return;
    }

    if (this.tool === 'pen') {
      this.snapshot();
      this.draft = { t: 'p', c: this.color, w: this.width, d: [round(w.x), round(w.y)] };
      return;
    }

    if (this.tool === 'shape') {
      this.snapshot();
      this.draft = {
        t: 'g', id: uid('sh'), sh: this.shape, c: this.color, w: this.width,
        f: this.fillOn ? fillFrom(this.color) : null,
        m: this.showMeasures ? 1 : 0,
        lb: this.showLabels ? 1 : 0,
        fx: this.flipX ? 1 : 0,
        a: [round(w.x), round(w.y), round(w.x), round(w.y)]
      };
      return;
    }

    /* Точка ставиться одним клацанням. Тягнути нічого не треба — і саме
       тому вона зручна: креслення будується швидше за розмову про нього. */
    if (this.tool === 'point') {
      this.snapshot();
      var snapP = window.Points
        ? Points.snap(w.x, w.y, this.items())
        : { p: [w.x, w.y] };
      var np = { t: 'o', id: uid('pt'), c: this.color, w: this.width,
                 r: this.pointSize || 0,
                 n: window.Points ? Points.nameFor(snapP, this.items()) : '',
                 p: [round(snapP.p[0]), round(snapP.p[1])] };
      if (snapP.on) np.on = snapP.on;
      this.slide.items.push(np);
      this.changed();
      return;
    }

    /* Зʼєднання: клацнули першу точку, клацнули другу — між ними відрізок.
       Проміжний стан живе в самому рушії, бо він скороминущий: перемкнули
       інструмент — і він зник, нічого по собі не лишивши. */
    if (this.tool === 'link') {
      var self = this;

      /* Радіус влучання — у пікселях екрана, а не в координатах дошки.
         Інакше на віддаленому масштабі точка стає недосяжною: вона на
         вигляд там само, а зона влучання зменшується разом із кресленням. */
      var grab = Math.max(14, this.width * 4) / this.scale;
      var byId = idMap(this.items());

      var hitP = null, bestD = Infinity;
      this.items().forEach(function (x) {
        if (x.t !== 'o') return;
        var q = window.Points ? Points.at(x, byId) : x.p;
        if (!q) return;
        var d = Math.hypot(w.x - q[0], w.y - q[1]);
        // у великої точки зона влучання не менша за саму точку
        var g = Math.max(grab, pointR(x) * 1.4);
        if (d <= g && d < bestD) { bestD = d; hitP = x; }
      });

      /* Точки поруч немає — ставимо її тут же й ведемо далі. Раніше клік
         повз точку мовчки скасовував початий звʼязок: людина клацала двічі
         й вирішувала, що інструмент не працює. Тепер провести лінію можна
         з порожнього місця, а точки зʼявляться самі. */
      if (!hitP) {
        var snapL = window.Points
          ? Points.snap(w.x, w.y, this.items())
          : { p: [w.x, w.y] };
        this.snapshot();
        hitP = { t: 'o', id: uid('pt'), c: this.color, w: this.width,
                 r: this.pointSize || 0,
                 n: window.Points ? Points.nameFor(snapL, this.items()) : '',
                 p: [round(snapL.p[0]), round(snapL.p[1])] };
        if (snapL.on) hitP.on = snapL.on;
        this.slide.items.push(hitP);
      }

      if (!this.linkFrom) { this.linkFrom = hitP.id; this.changed(); return; }
      if (this.linkFrom === hitP.id) { this.linkFrom = null; this.render(); return; }

      var pair = [this.linkFrom, hitP.id].sort().join('|');
      var dup = this.items().some(function (x) {
        return x.t === 'c' && [x.a1, x.a2].sort().join('|') === pair;
      });
      if (!dup) {
        this.snapshot();
        var aligned = this._alignTangent(byId[this.linkFrom], hitP, byId);
        var nl = { t: 'c', id: uid('ln'), c: this.color, w: this.linkW(),
                   a1: this.linkFrom, a2: hitP.id };
        if (this.linkKind && this.linkKind !== 'seg') nl.k = this.linkKind;
        if (this.linkDash) nl.dash = 1;
        this.slide.items.push(nl);
        this.linkFrom = null;
        this.changed();
        if (aligned && this.opts.onTangent) this.opts.onTangent(aligned);
      } else {
        this.linkFrom = null;
        this.changed();          // могла зʼявитися нова точка — її треба зберегти
      }
      return;
    }

    if (this.tool === 'solid') {
      this.snapshot();
      var sk = this.solidKind || 'cube';
      var sd = window.Solids && Solids.KINDS[sk];
      this.draft = { t: 's', id: uid('sl'), c: this.color, w: this.width,
                     k: sk, yaw: (sd && sd.yaw0) || 28, pitch: 22, lb: 1, hid: 1,
                     a: [round(w.x), round(w.y), round(w.x), round(w.y)] };
      return;
    }

    if (this.tool === 'plane') {
      this.snapshot();
      this.draft = { t: 'f', id: uid('pl'), c: this.color, w: this.width,
                     ex: 'x^2', xa: -3, xb: 5, ya: -2, yb: 8,
                     p1: 0.5, p2: 2, sec: 1, tan: 0, hlab: 1, quot: 1,
                     a: [round(w.x), round(w.y), round(w.x), round(w.y)] };
      return;
    }

    if (this.tool === 'numline') {
      this.snapshot();
      this.draft = { t: 'n', id: uid('nl'), c: this.color, w: this.width,
                     from: -5, to: 5, step: 1, fmt: 'dec',
                     a: [round(w.x), round(w.y), round(w.x), round(w.y)] };
      return;
    }

    var map = { line: 'l', arrow: 'a' };
    if (map[this.tool]) {
      this.snapshot();
      this.draft = { t: map[this.tool], c: this.color, w: this.width,
                     a: [round(w.x), round(w.y), round(w.x), round(w.y)] };
    }
  };

  /** Напівпрозора заливка з того ж кольору, що й контур. */
  function fillFrom(color) {
    var m = /^#([0-9a-f]{6})$/i.exec(color || '');
    if (!m) return 'rgba(75,63,219,.14)';
    var n = parseInt(m[1], 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',.15)';
  }

  Board.prototype._pointerMove = function (e) {
    if (!this.slide) return;
    var p = this.eventPos(e);
    this.lastPointer = p;
    if (this._pointers[e.pointerId]) this._pointers[e.pointerId] = p;

    var ids = Object.keys(this._pointers);
    if (ids.length === 2 && this._pinch) {
      var a = this._pointers[ids[0]], b = this._pointers[ids[1]];
      var d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this._pinch.dist > 0) this.zoomAt(d / this._pinch.dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      this._pinch.dist = d;
      return;
    }

    if (this._pan) {
      this.cam.x = this._pan.camx - (p.x - this._pan.sx) / this.scale;
      this.cam.y = this._pan.camy - (p.y - this._pan.sy) / this.scale;
      this.viewChanged();
      return;
    }

    var w = this.toWorld(p.x, p.y);

    if (this._erasing) { this._erase(w.x, w.y); return; }

    if (this._resize) {
      resizeByHandle(this._resize.item, this._resize.id, w.x, w.y, e.shiftKey);
      this.render();
      if (this.opts.onSelect) this.opts.onSelect(this.selection);
      return;
    }

    if (this._gscale) {
      var gs = this._gscale;
      // пропорційно: беремо більшу з двох змін, як у тексту
      var kf = Math.max(Math.abs(w.x - gs.ax) / gs.w0, Math.abs(w.y - gs.ay) / gs.h0);
      kf = Math.max(0.05, Math.min(40, kf));
      gs.items.forEach(function (it, i) { scaleItemFrom(it, gs.src[i], kf, gs.ax, gs.ay); });
      this.syncConstructions();
      this.render();
      if (this.opts.onSelect) this.opts.onSelect(this.selection);
      return;
    }

    if (this._drag) {
      var dx = w.x - this._drag.x, dy = w.y - this._drag.y;
      this._drag.items.forEach(function (it) { moveItem(it, dx, dy); });
      this._drag.x = w.x; this._drag.y = w.y;
      this.render();
      if (this.opts.onSelect) this.opts.onSelect(this.selection);
      return;
    }

    if (this.band) {
      this.band.x1 = w.x; this.band.y1 = w.y;
      var found = this._itemsInRect(this.band);
      this.selection = this.band.add
        ? this.selection.filter(function (x) { return found.indexOf(x) < 0; }).concat(found)
        : found;
      if (this.opts.onSelect) this.opts.onSelect(this.selection);
      this.render();
      return;
    }

    if (!this.draft) {
      if (this.tool === 'select' && !this.readOnly) {
        var h = this._handleAt(w.x, w.y);
        if (h) {
          var cs = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize',
                     sw: 'nesw-resize', p1: 'crosshair', p2: 'crosshair',
                     gnw: 'nwse-resize', gse: 'nwse-resize', gne: 'nesw-resize', gsw: 'nesw-resize' };
          this.canvas.style.cursor = cs[h.id] || 'pointer';
        } else {
          this.canvas.style.cursor = this._hitTest(w.x, w.y) ? 'move' : 'default';
        }
      }
      return;
    }

    if (this.draft.t === 'p') {
      var d2 = this.draft.d;
      var lx = d2[d2.length - 2], ly = d2[d2.length - 1];
      if (Math.hypot(w.x - lx, w.y - ly) * this.scale < 2) return;
      d2.push(round(w.x), round(w.y));
    } else {
      var pos = { x: w.x, y: w.y };
      var dsh = this.draft.t === 'g' ? SHAPES[this.draft.sh] : null;
      var lockShape = dsh && dsh.lock;
      if (e.shiftKey || lockShape) {
        var ddx = w.x - this.draft.a[0], ddy = w.y - this.draft.a[1];
        if (this.draft.t === 'l' || this.draft.t === 'a') {
          if (Math.abs(ddx) > Math.abs(ddy)) pos = { x: w.x, y: this.draft.a[1] };
          else pos = { x: this.draft.a[0], y: w.y };
        } else {
          // тримаємо природне відношення сторін фігури (для квадрата й кола це 1)
          var ar = (lockShape && dsh.ar) ? dsh.ar : 1;
          var aw = Math.abs(ddx), ah = Math.abs(ddy), nw2, nh2;
          if (aw / ar > ah) { nw2 = aw; nh2 = aw / ar; } else { nh2 = ah; nw2 = ah * ar; }
          pos = { x: this.draft.a[0] + (ddx < 0 ? -nw2 : nw2),
                  y: this.draft.a[1] + (ddy < 0 ? -nh2 : nh2) };
        }
      }
      this.draft.a[2] = round(pos.x);
      this.draft.a[3] = round(pos.y);
    }
    this.render();
  };

  Board.prototype._pointerUp = function (e) {
    delete this._pointers[e.pointerId];
    if (Object.keys(this._pointers).length < 2) this._pinch = null;

    if (this._pan) { this._pan = null; this.canvas.style.cursor = ''; this.applyCursor(); return; }
    if (this._erasing) { this._erasing = false; if (this.opts.onChange) this.opts.onChange(); return; }
    if (this._resize) {
      this._resize = null;
      svFit = null;                       // тягнення скінчилося — фіксація не потрібна
      if (this.opts.onChange) this.opts.onChange();
      return;
    }
    if (this._gscale) {
      this._gscale = null;
      if (this.opts.onChange) this.opts.onChange();
      return;
    }
    if (this._drag) { this._drag = null; if (this.opts.onChange) this.opts.onChange(); return; }

    if (this.band) {
      this.band = null;
      if (this.opts.onSelect) this.opts.onSelect(this.selection);
      this.render();
      return;
    }

    if (this.draft) {
      var d = this.draft;
      var keep = true;
      if (d.t !== 'p') keep = Math.hypot(d.a[2] - d.a[0], d.a[3] - d.a[1]) * this.scale > 4;
      /* Вісь завжди горизонтальна: похилої числової осі не буває, а тягнути
         мишею рівно неможливо. Вирівнюємо в мить відпускання. */
      if (d.t === 'n') d.a[3] = d.a[1];
      /* Площина, менша за долоню, — це не побудова, а пляма. Крихітну
         розтягуємо до придатного розміру замість того, щоб викидати. */
      if (d.t === 'f') {
        if (Math.abs(d.a[2] - d.a[0]) < 120) d.a[2] = d.a[0] + 560;
        if (Math.abs(d.a[3] - d.a[1]) < 90) d.a[3] = d.a[1] + 420;
        keep = true;
      }
      if (d.t === 's') {
        if (Math.abs(d.a[2] - d.a[0]) < 90) d.a[2] = d.a[0] + 340;
        if (Math.abs(d.a[3] - d.a[1]) < 90) d.a[3] = d.a[1] + 340;
        keep = true;
      }
      if (keep) {
        if (d.t === 'p' && this.smoothing) d.d = smoothStroke(d.d, d.w, this.smoothing);
        this.slide.items.push(ided(d));
        this.rememberInitialView();
      } else {
        this.history.pop();
      }
      this.draft = null;
      this.changed();
    }
  };

  /**
   * Запам'ятати вигляд слайда в момент, коли на ньому з'явився перший об'єкт.
   * Потім при кожному відкритті слайд показується саме так — як у момент,
   * коли на нього залили скріншот або почали писати.
   */
  Board.prototype.rememberInitialView = function () {
    if (!this.slide || this.slide.view) return;
    this.slide.view = { x: round(this.cam.x), y: round(this.cam.y), s: Math.round(this.scale * 1e4) / 1e4 };
  };

  /** Перезаписати збережений вигляд слайда поточним. */
  Board.prototype.saveCurrentView = function () {
    if (!this.slide) return false;
    this.slide.view = { x: round(this.cam.x), y: round(this.cam.y), s: Math.round(this.scale * 1e4) / 1e4 };
    if (this.opts.onChange) this.opts.onChange();
    return true;
  };

  Board.prototype._wheel = function (e) {
    e.preventDefault();
    if (e.shiftKey && !e.ctrlKey) {
      this.cam.x += e.deltaY / this.scale;
      this.viewChanged();
      return;
    }
    var p = this.eventPos(e);
    this.zoomAt(Math.pow(0.999, e.deltaY * (e.ctrlKey ? 2.4 : 1)), p.x, p.y);
  };

  /**
   * Користувач сам щось прибрав.
   *
   * Синхронізація боїться зменшення дошки — саме так виглядає втрата. Але
   * гумка й «видалити» — теж зменшення, і без цього сигналу захист відкочував
   * би назад стерте власною рукою. Тому дошка каже вголос, коли прибирання
   * навмисне.
   */
  Board.prototype._shrank = function () {
    if (this.opts && this.opts.onShrink) { try { this.opts.onShrink(); } catch (e) {} }
  };

  /* Гумка стирає лише написане від руки — штрихи олівця, як у Miro.
     Досі вона прибирала все, чого торкнулась, і разом із позначками на
     фото ДЗ зникало саме фото. Фото, текст, фігури й графіки — окремі
     обʼєкти: їх прибирають виділенням і Delete. */
  var ERASABLE = { p: 1 };

  Board.prototype._erase = function (x, y) {
    var r = Math.max(8, this.width * 3) / this.scale;
    var items = this.items();
    var before = items.length;
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (ERASABLE[it.t] && this.editable(it) && hitItem(it, x, y, r)) items.splice(i, 1);
    }
    if (items.length !== before) { this._shrank(); this.render(); }
  };

  /* ---------- Дії ---------- */

  Board.prototype.addText = function (world, value) {
    if (!value || !this.slide) return null;
    this.snapshot();
    var it = { t: 'x', c: this.color, s: this.fontSize,
               p: [round(world.x), round(world.y)], v: value };
    this.slide.items.push(ided(it));
    this.rememberInitialView();
    this.changed();
    return it;
  };

  /**
   * Точка у світових координатах, куди слід щось ставити:
   * позиція курсора над полотном, а якщо її немає — центр видимої області.
   */
  Board.prototype.dropPoint = function (at) {
    var p = at || this.lastPointer;
    var inside = p && p.x >= 0 && p.y >= 0 && p.x <= this.cssW && p.y <= this.cssH;
    if (inside) return this.toWorld(p.x, p.y);
    return {
      x: this.cam.x + this.cssW / (2 * this.scale),
      y: this.cam.y + this.cssH / (2 * this.scale)
    };
  };

  /** at — необов'язкова точка екрана (пікселі полотна), напр. місце відпускання файлу. */
  Board.prototype.addImage = function (meta, at) {
    if (!this.slide || !meta || !meta.key) return null;

    var maxW = (this.cssW * 0.7) / this.scale;
    var maxH = (this.cssH * 0.7) / this.scale;
    var k = Math.min(1, maxW / meta.w, maxH / meta.h);
    var w = Math.max(20, meta.w * k), h = Math.max(20, meta.h * k);

    var at0 = this.dropPoint(at);
    var cx = at0.x, cy = at0.y;

    var item = {
      t: 'i', k: meta.key, r: meta.w / meta.h,
      a: [round(cx - w / 2), round(cy - h / 2), round(cx + w / 2), round(cy + h / 2)]
    };

    this.snapshot();
    this.slide.items.push(ided(item));
    this.rememberInitialView();
    loadImage(meta.key, this.render.bind(this));
    this.setTool('select');
    this.setSelection([item]);
    this.changed();
    return item;
  };

  /**
   * Покласти картинку в задану рамку світових координат.
   * Для пакетної розкладки фото — знімок історії й перемалювання робить викликач.
   */
  Board.prototype.placeImage = function (meta, box) {
    if (!this.slide || !meta || !meta.key) return null;
    var item = {
      t: 'i', k: meta.key, r: meta.w / meta.h,
      a: [round(box.x), round(box.y), round(box.x + box.w), round(box.y + box.h)]
    };
    this.slide.items.push(ided(item));
    loadImage(meta.key, this.render.bind(this));
    return item;
  };

  Board.prototype.deleteSelection = function () {
    if (!this.selection.length || !this.slide) return false;
    this.snapshot();
    var sel = this.selection;
    this.slide.items = this.items().filter(function (it) { return sel.indexOf(it) < 0; });

    /* Відрізок без точки — це посилання в нікуди. Прибираємо разом: інакше
       він лишався б невидимим сміттям, яке ще й заважає позначкам. */
    var alive = {};
    this.slide.items.forEach(function (it) { if (it.t === 'o' && it.id) alive[it.id] = 1; });
    this.slide.items = this.slide.items.filter(function (it) {
      return it.t !== 'c' || (alive[it.a1] && alive[it.a2]);
    });

    this.clearSelection();
    this._shrank();
    this.changed();
    return true;
  };

  Board.prototype.copySelection = function () {
    if (!this.selection.length) return 0;
    Board.clipboard = JSON.parse(JSON.stringify(this.selection));
    return Board.clipboard.length;
  };

  Board.prototype.hasClipboard = function () {
    return !!(Board.clipboard && Board.clipboard.length);
  };

  /** Вставити з внутрішнього буфера в центр видимої області. */
  Board.prototype.pasteClipboard = function (at) {
    if (!this.hasClipboard() || !this.slide) return 0;
    var copies = JSON.parse(JSON.stringify(Board.clipboard));
    var b = unionBounds(copies);
    if (b) {
      var target = this.dropPoint(at);
      var dx = target.x - (b.x1 + b.x2) / 2, dy = target.y - (b.y1 + b.y2) / 2;
      copies.forEach(function (it) { moveItem(it, dx, dy); });
    }
    this.snapshot();
    var self = this;
    copies.forEach(function (it) {
      self.slide.items.push(reided(it));
      if (it.t === 'i' && it.k && !imgCache[it.k]) loadImage(it.k, self.render.bind(self));
    });
    this.setTool('select');
    this.setSelection(copies);
    this.changed();
    return copies.length;
  };

  Board.prototype.duplicateSelection = function () {
    if (!this.selection.length || !this.slide) return 0;
    var copies = JSON.parse(JSON.stringify(this.selection));
    var off = 24 / this.scale;
    copies.forEach(function (it) { moveItem(it, off, off); });
    this.snapshot();
    var self = this;
    copies.forEach(function (it) {
      self.slide.items.push(reided(it));
      if (it.t === 'i' && it.k && !imgCache[it.k]) loadImage(it.k, self.render.bind(self));
    });
    this.setTool('select');
    this.setSelection(copies);
    this.changed();
    return copies.length;
  };

  /**
   * Задати фігурі точні розміри в умовних одиницях. Центр лишається на місці.
   * spec — одне з:
   *   {w, h}                     рамка (працює для будь-якої фігури)
   *   {sides:[s1,s2,s3]}         трикутник за трьома сторонами
   *   {sas:{s1, s2, deg}}        трикутник: дві сторони й кут між ними
   *   {scaleToSide:{i, len}}     пропорційно, щоб сторона i стала len
   *   {r} | {rx, ry}             коло / еліпс
   * Повертає true, якщо застосовано.
   */
  Board.prototype.setShapeGeometry = function (it, spec) {
    if (!it || it.t !== 'g') return false;
    var b = itemBounds(it);
    if (!b) return false;
    var cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
    var shDef = SHAPES[it.sh] || {};

    function setBox(w, h) {
      it.a = [round(cx - w / 2), round(cy - h / 2), round(cx + w / 2), round(cy + h / 2)];
    }

    if (spec.sides) {
      var s1 = spec.sides[0] * UNIT, s2 = spec.sides[1] * UNIT, s3 = spec.sides[2] * UNIT;
      if (!(s1 > 0 && s2 > 0 && s3 > 0)) return false;
      // нерівність трикутника: інакше такого трикутника не існує
      if (s1 + s2 <= s3 || s1 + s3 <= s2 || s2 + s3 <= s1) return false;
      var A = [0, 0], B = [s1, 0];
      var x = (s3 * s3 - s2 * s2 + s1 * s1) / (2 * s1);
      var y = Math.sqrt(Math.max(0, s3 * s3 - x * x));
      var norm = normalizePoints([A, B, [x, y]]);
      it.pts = norm.pts;
      setBox(norm.w, norm.h);
      // тип трикутника міг змінитись — оновлюємо, щоб назва й властивості не брехали
      it.sh = classifyTriangle([s1, s2, s3]);
      return true;
    }

    if (spec.sas) {
      var a1 = spec.sas.s1 * UNIT, a2 = spec.sas.s2 * UNIT;
      var rad = (spec.sas.deg || 0) * Math.PI / 180;
      if (!(a1 > 0 && a2 > 0) || spec.sas.deg <= 0 || spec.sas.deg >= 180) return false;
      var P = [0, 0], Q = [a1, 0];
      var R = [Q[0] + a2 * Math.cos(Math.PI - rad), Q[1] + a2 * Math.sin(Math.PI - rad)];
      var n2 = normalizePoints([P, Q, R]);
      it.pts = n2.pts;
      setBox(n2.w, n2.h);
      var s3c = Math.hypot(R[0] - P[0], R[1] - P[1]);
      it.sh = classifyTriangle([a1, a2, s3c]);
      return true;
    }

    if (spec.scaleToSide) {
      var m = shapeMeasure(it);
      if (!m || m.round || !m.sides[spec.scaleToSide.i]) return false;
      var cLen = m.sides[spec.scaleToSide.i].len;
      var want = spec.scaleToSide.len * UNIT;
      if (!(cLen > 0) || !(want > 0)) return false;
      var f = want / cLen;
      setBox((b.x2 - b.x1) * f, (b.y2 - b.y1) * f);
      return true;
    }

    if (spec.r != null) { var d = spec.r * UNIT * 2; if (!(d > 0)) return false; setBox(d, d); return true; }

    if (spec.rx != null || spec.ry != null) {
      var rx = (spec.rx != null ? spec.rx : (b.x2 - b.x1) / 2 / UNIT) * UNIT;
      var ry = (spec.ry != null ? spec.ry : (b.y2 - b.y1) / 2 / UNIT) * UNIT;
      if (!(rx > 0 && ry > 0)) return false;
      setBox(rx * 2, ry * 2);
      return true;
    }

    if (spec.w != null || spec.h != null) {
      var nw = (spec.w != null ? spec.w : (b.x2 - b.x1) / UNIT) * UNIT;
      var nh = (spec.h != null ? spec.h : (b.y2 - b.y1) / UNIT) * UNIT;
      // у правильних фігур висота підбирається сама, інакше вони перестануть бути правильними
      if (shDef.lock) nh = nw / (shDef.ar || 1);
      if (!(nw > 0 && nh > 0)) return false;
      setBox(nw, nh);
      return true;
    }
    return false;
  };

  /** До якого типу належить трикутник із такими сторонами. */
  function classifyTriangle(sides) {
    var s = sides.slice().sort(function (a, b) { return a - b; });
    var a = s[0], b = s[1], c = s[2];
    var eps = Math.max(c * 0.005, 1e-6);
    if (Math.abs(a - b) < eps && Math.abs(b - c) < eps) return 'tri-eq';
    if (Math.abs(a * a + b * b - c * c) < Math.max(c * c * 0.01, 1e-6)) return 'tri-right';
    if (a * a + b * b < c * c) return 'tri-obt';
    if (Math.abs(a - b) < eps || Math.abs(b - c) < eps) return 'tri-iso';
    return 'tri-sca';
  }

  Board.classifyTriangle = classifyTriangle;
  Board.constructionPrims = function (it) { return prims.get(it) || null; };
  /**
   * Розкласти обʼєкт на прості лінії, кола й написи.
   *
   * Потрібно для сторінки учня: вона вміє лише кілька базових видів, і все
   * складніше — числова вісь, координатна площина — до неї просто не
   * доїжджало. Мовчки: обʼєкт їхав як є, а переглядач його не впізнавав.
   *
   * Замість того щоб писати друге малювання «для учня» (а потім щоразу
   * памʼятати про обидва), підставляємо замість полотна записувач. Крізь
   * нього проходить те саме малювання, тож учень бачить рівно те, що
   * репетитор, — розійтися вони не можуть у принципі.
   */
  Board.bakePrimitives = function (it) {
    var out = [];
    var st = { stroke: it.c || '#17163A', fill: it.c || '#17163A',
               lw: it.w || 2, font: '14px serif', align: 'left', base: 'alphabetic',
               alpha: 1, dash: false };
    var stack = [];
    var path = [];          // масив підшляхів: [[x,y], [x,y], …]
    var cur = null;

    function fontSize() {
      var m = /(\d+(?:\.\d+)?)px/.exec(st.font);
      return m ? Number(m[1]) : 14;
    }

    var rec = {
      set strokeStyle(v) { st.stroke = v; }, get strokeStyle() { return st.stroke; },
      set fillStyle(v) { st.fill = v; },     get fillStyle() { return st.fill; },
      set lineWidth(v) { st.lw = v; },       get lineWidth() { return st.lw; },
      set font(v) { st.font = v; },          get font() { return st.font; },
      set textAlign(v) { st.align = v; },    get textAlign() { return st.align; },
      set textBaseline(v) { st.base = v; },  get textBaseline() { return st.base; },
      set globalAlpha(v) { st.alpha = v; },  get globalAlpha() { return st.alpha; },
      set lineCap(v) {}, get lineCap() { return 'butt'; },
      set lineJoin(v) {}, get lineJoin() { return 'round'; },

      save: function () { stack.push(JSON.parse(JSON.stringify(st))); },
      restore: function () { var p = stack.pop(); if (p) st = p; },
      setLineDash: function (a) { st.dash = !!(a && a.length); },
      beginPath: function () { path = []; cur = null; },
      closePath: function () { if (cur && cur.length > 2) cur.push(cur[0].slice()); },
      moveTo: function (x, y) { cur = [[x, y]]; path.push(cur); },
      lineTo: function (x, y) { if (!cur) { cur = [[x, y]]; path.push(cur); } else cur.push([x, y]); },
      rect: function (x, y, w, h) {
        path.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]);
        cur = null;
      },
      arc: function (x, y, r) { path.push({ circle: [x, y, r] }); cur = null; },
      ellipse: function (x, y, rx, ry) { path.push({ ell: [x, y, rx, ry] }); cur = null; },

      stroke: function () {
        path.forEach(function (sub) {
          if (sub.circle) {
            var c = sub.circle;
            out.push({ t: 'e', c: st.stroke, w: st.lw, f: null,
                       a: [c[0] - c[2], c[1] - c[2], c[0] + c[2], c[1] + c[2]] });
            return;
          }
          if (sub.ell) {
            var el = sub.ell;
            out.push({ t: 'e', c: st.stroke, w: st.lw, f: null,
                       a: [el[0] - el[2], el[1] - el[3], el[0] + el[2], el[1] + el[3]] });
            return;
          }
          for (var i = 1; i < sub.length; i++) {
            out.push({ t: 'l', c: st.stroke, w: st.lw,
                       a: [sub[i - 1][0], sub[i - 1][1], sub[i][0], sub[i][1]] });
          }
        });
      },

      fill: function () {
        path.forEach(function (sub) {
          if (sub.circle) {
            var c = sub.circle;
            out.push({ t: 'e', c: st.fill, w: 1, f: st.fill,
                       a: [c[0] - c[2], c[1] - c[2], c[0] + c[2], c[1] + c[2]] });
          }
        });
      },

      /* Ширину міряємо на справжньому полотні: без неї не перерахувати
         вирівнювання по центру у вирівнювання ліворуч, яке лише й розуміє
         сторінка учня. */
      measureText: function (txt) {
        var c = Board._measureCtx || (Board._measureCtx =
          document.createElement('canvas').getContext('2d'));
        c.font = st.font;
        return c.measureText(txt);
      },

      fillText: function (txt, x, y) {
        var fs = fontSize();
        var w = rec.measureText(txt).width;
        var px = x;
        if (st.align === 'center') px = x - w / 2;
        else if (st.align === 'right') px = x - w;
        var py = y;
        if (st.base === 'top') py = y + fs * 0.82;
        else if (st.base === 'middle') py = y + fs * 0.34;
        out.push({ t: 'x', c: st.fill, v: String(txt), s: fs, p: [px, py] });
      },

      fillRect: function () {}, clearRect: function () {},
      translate: function () {}, scale: function () {}, rotate: function () {}
    };

    try { drawItemBody(rec, it, 1); } catch (e) { return []; }
    return out;
  };

  /**
   * Кадри для сторінки учня.
   *
   * Учень не має ні обчислювача формул, ні стереометрії — сторінка уроку
   * це один самодостатній файл, і вантажити в неї модулі не можна: сайт
   * за захистом, а учень не входить. Тому інтерактивність робиться інакше:
   * ми заздалегідь малюємо всі положення й кладемо їх у сторінку готовими.
   *
   * Стала частина окремо від рухомої, бо інакше кожне положення точки
   * везло б із собою весь графік із сіткою.
   */
  /* Округлення до десятої пікселя. На екрані різниці немає, а в знімку
     уроку кожен зайвий знак — це кілобайти, помножені на кількість кадрів. */
  function slimPrims(list) {
    return list.map(function (p) {
      var q = { t: p.t, c: p.c };
      if (p.w != null) q.w = Math.round(p.w * 10) / 10;
      if (p.f) q.f = p.f;
      if (p.a) q.a = p.a.map(function (n) { return Math.round(n * 10) / 10; });
      if (p.p) q.p = [Math.round(p.p[0] * 10) / 10, Math.round(p.p[1] * 10) / 10];
      if (p.v != null) q.v = p.v;
      if (p.s != null) q.s = Math.round(p.s * 10) / 10;
      return q;
    });
  }

  Board.bakeFrames = function (it) {
    if (it.t === 'f') {
      var fn0 = planeFn(it);
      if (!fn0) return null;
      var W = planeWin(it);

      var base = JSON.parse(JSON.stringify(it));
      base.pts = 0;
      var stat = slimPrims(Board.bakePrimitives(base));

      var N = 40, frames = [];
      for (var i = 0; i <= N; i++) {
        var v = W.xa + (W.xb - W.xa) * (i + 0.5) / (N + 1);
        var f2 = JSON.parse(JSON.stringify(it));
        f2.only = 'pts';
        f2.p2 = Math.round(v * 1000) / 1000;
        frames.push({ v: f2.p2, p: slimPrims(Board.bakePrimitives(f2)) });
      }
      return { kind: 'plane', stat: stat, frames: frames,
               box: it.a.slice(), xa: W.xa, xb: W.xb };
    }

    if (it.t === 's') {
      var frames2 = [];
      for (var y = 0; y < 360; y += 15) {
        var g2 = JSON.parse(JSON.stringify(it));
        g2.yaw = y;
        frames2.push({ v: y, p: slimPrims(Board.bakePrimitives(g2)) });
      }
      return { kind: 'solid', stat: [], frames: frames2, box: it.a.slice() };
    }

    return null;
  };

  Board.smoothStroke = smoothStroke;
  /* Потрібна діалогу осі: підказка має показувати той самий дріб, що
     й малюнок, а не власне наближення. */
  Board.toFraction = toFraction;
  Board.numLabel = numLabel;
  Board.MIN_SCALE = MIN_SCALE;
  Board.MAX_SCALE = MAX_SCALE;

  Board.prototype.clearSlide = function () {
    if (!this.slide || !this.slide.items.length) return false;
    this.snapshot();
    this.slide.items = [];
    this.clearSelection();
    this._shrank();
    this.changed();
    return true;
  };

  /* Панель тут не перемальовуємо: розмір тягнуть повзунком, а перемальовка
     вирвала б його з-під пальця посеред руху. Підпис і кружечок поруч
     оновлює сама панель. */
  Board.prototype.setPointSize = function (r) {
    this.pointSize = Math.max(2, Math.min(40, Number(r) || 0));
  };

  /* Відрізок удвічі тонший за радіус точки: діаметр виходить учетверо
     більшим за лінію — вершина помітна, сторона не губиться. При типовому
     розмірі точки 6 це дає звичні 3 пікселі, тож старі креслення
     виглядають як раніше. */
  /**
   * Підводить точку на колі до справжнього місця дотику.
   *
   * Від руки дотичну не проводять: лінія або трішки січе коло, або не
   * достає до нього. Виправляти це рисочками «вони рівні» було б обманом —
   * позначка каже правду про креслення, а не про наміри. Тому рухаємо саму
   * точку: щойно дотик справжній, рівність відрізків виходить сама.
   *
   * Ворушимо лише те, що вже майже стоїть на місці, і лише один кінець —
   * той, що на колі. Дію видно в історії, тож скасувати її просто.
   */
  Board.prototype._alignTangent = function (p1, p2, byId) {
    if (!window.Points || !p1 || !p2) return null;
    var moved = null;

    /* Спершу центр. Його ставлять на око, і поки він ні до чого не
       привʼязаний, радіуси виходять різної довжини: рисочок рівності
       немає, прямий кут біля дотичної під питанням, а коло не посунеш —
       «центр» лишиться стояти окремо. Привʼязка лагодить усе разом. */
    [[p1, p2], [p2, p1]].forEach(function (pair) {
      if (moved) return;
      var pt = pair[0], other = pair[1];
      if (!other.on || !other.on.pid) return;

      var chost = byId[other.on.pid];
      if (!chost) return;

      var con = Points.centerSnap(pt, chost);
      if (!con) return;

      pt.on = con;
      var cp = Points.at(pt, byId);
      if (cp) pt.p = [Math.round(cp[0]), Math.round(cp[1])];
      moved = { kind: 'center', name: pt.n || '·' };
    });
    if (moved) return moved;

    [[p1, p2], [p2, p1]].forEach(function (pair) {
      if (moved) return;
      var pt = pair[0], other = pair[1];
      if (!pt.on || pt.on.kind !== 'circle') return;

      var host = byId[pt.on.pid];
      var op = Points.at(other, byId);
      if (!host || !op) return;

      var t = Points.tangentSnap(pt, host, op);
      if (t === null || t === pt.on.t) return;

      pt.on.t = t;
      var np = Points.at(pt, byId);
      if (np) pt.p = [Math.round(np[0]), Math.round(np[1])];
      moved = { kind: 'tangent', name: pt.n || '·' };
    });

    return moved;
  };

  Board.prototype.linkW = function () {
    if (this.linkWidth) return this.linkWidth;
    return Math.max(2, Math.min(24, Math.round((this.pointSize || 6) / 2)));
  };

  Board.prototype.setLinkWidth = function (w) {
    this.linkWidth = Math.max(1, Math.min(24, Number(w) || 0));
  };

  Board.prototype.setLinkKind = function (k) {
    this.linkKind = Board.LINK_KINDS[k] ? k : 'seg';
    if (this.opts.onToolChange) this.opts.onToolChange(this.tool);
  };

  Board.prototype.setLinkDash = function (on) {
    this.linkDash = !!on;
    if (this.opts.onToolChange) this.opts.onToolChange(this.tool);
  };

  Board.prototype.setTool = function (tool) {
    // незавершене зʼєднання не має переживати перемикання інструмента
    if (tool !== 'link') this.linkFrom = null;
    this.tool = tool;
    if (tool !== 'select') this.clearSelection();
    this.band = null;
    this.applyCursor();
    this.render();
    if (this.opts.onToolChange) this.opts.onToolChange(tool);
  };

  Board.prototype.setShape = function (id) {
    if (!SHAPES[id]) return;
    this.shape = id;
    this.setTool('shape');
  };

  Board.prototype.applyCursor = function () {
    var c = 'crosshair';
    if (this.tool === 'hand') c = 'grab';
    else if (this.tool === 'select') c = 'default';
    else if (this.tool === 'text') c = 'text';
    if (this.readOnly) c = 'grab';
    this.canvas.style.cursor = c;
  };

  /* ---------- Рендер ---------- */

  Board.prototype.render = function () {
    var self = this;
    if (this._raf) return;
    this._raf = requestAnimationFrame(function () {
      self._raf = null;
      self._draw();
    });
  };

  Board.prototype._draw = function () {
    var ctx = this.ctx;
    var w = this.cssW, h = this.cssH;
    if (!w || !h) return;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawBackground(ctx, this.slide ? this.slide.bg : 'grid', this.cam, this.scale, w, h);

    ctx.save();
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.cam.x, -this.cam.y);

    this.syncConstructions();
    var items = this.items();
    setDrawScope(items);
    var self0 = this;
    for (var i = 0; i < items.length; i++) drawItem(ctx, items[i], this.scale);
    if (this.draft) drawItem(ctx, this.draft, this.scale);

    /* Перша обрана точка зʼєднання. Без цієї позначки незрозуміло, чи
       клацання взагалі влучило, — і друге клацання робиться навмання. */
    if (this.tool === 'link') {
      var lm = idMap(items);

      /* Поки інструмент активний, кожна точка обведена кільцем. Без цього
         незрозуміло, у що цілитися, — а точка на кресленні дрібна, і
         промахнутися легше, ніж влучити. */
      ctx.save();
      ctx.lineWidth = 1.6 / this.scale;
      ctx.strokeStyle = 'rgba(75,63,219,.45)';
      items.forEach(function (x) {
        if (x.t !== 'o') return;
        var q = window.Points ? Points.at(x, lm) : x.p;
        if (!q) return;
        ctx.beginPath();
        ctx.arc(q[0], q[1], Math.max(11, pointR(x) * 2), 0, Math.PI * 2);
        ctx.stroke();
      });

      // обрана перша точка — помітніше й іншим кольором
      var lf = this.linkFrom ? lm[this.linkFrom] : null;
      var lp = lf && window.Points ? Points.at(lf, lm) : null;
      if (lp) {
        ctx.strokeStyle = '#F79009';
        ctx.lineWidth = 2.5 / this.scale;
        ctx.beginPath();
        ctx.arc(lp[0], lp[1], Math.max(11, pointR(lf) * 2), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    var self = this;
    var k = 1 / this.scale;

    // підсвітка виділених
    if (this.selection.length) {
      ctx.strokeStyle = '#1358F5';
      ctx.lineWidth = 1.5 * k;
      ctx.setLineDash([5 * k, 4 * k]);
      this.selection.forEach(function (it) {
        var b = itemBounds(it);
        if (!b) return;
        var pad = 5 * k;
        ctx.strokeRect(b.x1 - pad, b.y1 - pad, (b.x2 - b.x1) + pad * 2, (b.y2 - b.y1) + pad * 2);
      });
      ctx.setLineDash([]);

      // спільна рамка групи (і одного обʼєкта без власних маркерів)
      if (this._framed()) {
        var gb = unionBounds(this.selection);
        if (gb) {
          var gp = 11 * k;
          ctx.strokeStyle = 'rgba(75,63,219,.55)';
          ctx.lineWidth = 1.2 * k;
          ctx.strokeRect(gb.x1 - gp, gb.y1 - gp, (gb.x2 - gb.x1) + gp * 2, (gb.y2 - gb.y1) + gp * 2);
        }
      }

      var hs = this._handles();
      if (hs) {
        ctx.lineWidth = 2 * k;
        hs.forEach(function (hd) {
          /* Маркери різні на вигляд, бо роблять різне: кут повороту —
             помаранчевий і більший, вершини — зелені. Інакше на фігурі
             стоїть десяток однакових кружечків і незрозуміло, за що братися. */
          var isRot = hd.id === 'rot';
          var isV = hd.id.charAt(0) === 'v' && hd.id.length > 1;
          ctx.beginPath();
          ctx.arc(hd.x, hd.y, (isRot ? 6.5 : 5) * k, 0, Math.PI * 2);
          ctx.fillStyle = isRot ? '#F79009' : (isV ? '#17B26A' : '#fff');
          ctx.fill();
          ctx.strokeStyle = isRot || isV ? '#fff' : '#1358F5';
          ctx.stroke();
        });
      }
    }

    // рамка виділення, яку зараз тягнуть
    if (this.band) {
      var bx = Math.min(this.band.x0, this.band.x1), by = Math.min(this.band.y0, this.band.y1);
      var bw = Math.abs(this.band.x1 - this.band.x0), bh = Math.abs(this.band.y1 - this.band.y0);
      ctx.fillStyle = 'rgba(75,63,219,.08)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#1358F5';
      ctx.lineWidth = 1.2 * k;
      ctx.setLineDash([6 * k, 4 * k]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
    }

    ctx.restore();

    /* Підписи вимірів. Малюємо вже без світового перетворення, щоб текст
       мав однаковий розмір на будь-якому масштабі. */
    var labels = [];
    if (this.draft && this.draft.t === 'g') collectMeasureLabels(this.draft, labels);
    for (i = 0; i < items.length; i++) {
      if (items[i].t === 'g' && items[i].m) collectMeasureLabels(items[i], labels);
    }
    if (labels.length) {
      ctx.save();
      ctx.font = '700 11.5px Manrope, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (i = 0; i < labels.length; i++) {
        var L = labels[i];
        var sp = this.toScreen(L.w[0], L.w[1]);
        var lx = sp.x + (L.off ? L.off[0] * L.offPx : 0);
        var ly = sp.y + (L.off ? L.off[1] * L.offPx : 0);
        if (lx < -60 || ly < -30 || lx > w + 60 || ly > h + 30) continue;
        var tw = ctx.measureText(L.text).width;
        ctx.fillStyle = 'rgba(255,255,255,.93)';
        roundRectPath(ctx, lx - tw / 2 - 4, ly - 9, tw + 8, 18, 5);
        ctx.fill();
        ctx.fillStyle = L.kind === 'a' ? '#7A5AF8' : '#0B4ED6';
        ctx.fillText(L.text, lx, ly);
      }
      ctx.restore();
    }

  };

  /* ---------- Статичний рендер для експорту ---------- */

  Board.renderToCanvas = function (slide, maxSide) {
    var items = slide.items || [];
    var b = unionBounds(items) || { x1: 0, y1: 0, x2: 800, y2: 600 };

    var pad = 40;
    var w = (b.x2 - b.x1) + pad * 2, h = (b.y2 - b.y1) + pad * 2;
    var scale = Math.min(2, (maxSide || 2000) / Math.max(w, h));
    if (!isFinite(scale) || scale <= 0) scale = 1;

    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * scale));
    cv.height = Math.max(1, Math.round(h * scale));
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.scale(scale, scale);
    ctx.translate(-b.x1 + pad, -b.y1 + pad);
    setDrawScope(items);
    items.forEach(function (it) { drawItem(ctx, it, scale); });
    return cv;
  };

  Board.preloadImages = function (slides) {
    var keys = imageKeysIn(slides);
    if (!keys.length) return Promise.resolve([]);
    return Promise.all(keys.map(function (k) {
      return new Promise(function (resolve) {
        var e = imgCache[k];
        if (e && e.state !== 'loading') { resolve(k); return; }
        if (e && e.state === 'loading') {
          var t = setInterval(function () {
            if (imgCache[k] && imgCache[k].state !== 'loading') { clearInterval(t); resolve(k); }
          }, 60);
          setTimeout(function () { clearInterval(t); resolve(k); }, 6000);
          return;
        }
        loadImage(k, function () { resolve(k); });
      });
    }));
  };

  Board.clipboard = null;
  Board.UNIT = UNIT;
  Board.fmtLen = fmtLen;
  Board.shapeMeasure = shapeMeasure;
  Board.polyMeasure = polyMeasure;
  Board.normalizePoints = normalizePoints;
  Board.SHAPES = SHAPES;
  Board.SHAPE_GROUPS = SHAPE_GROUPS;
  Board.shapeIcon = shapeIcon;
  Board.shapePoints = shapePoints;
  Board.VERTEX_LETTERS = VERTEX_LETTERS;
  Board.imageKeysIn = imageKeysIn;
  Board.itemBounds = itemBounds;
  Board.unionBounds = unionBounds;
  Board.drawItem = drawItem;
  Board.drawBackground = drawBackground;

  window.Board = Board;
})();
