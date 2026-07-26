/* Геометричні побудови: висота, медіана, бісектриса, діагоналі, дотична,
   вписане й описане коло тощо.

   Побудова НЕ копіює координати, а посилається на батьківську фігуру
   (`pid`) і перераховується щоразу під час малювання. Тому коли ви тягнете
   трикутник, висота їде разом із ним і лишається висотою.

   Формат: {t:'d', pid:<id фігури>, k:<вид>, i:<номер вершини/сторони>,
            a1,a2:<кути для кола>, c:<колір>, w:<товщина>} */
(function () {
  'use strict';

  var C = {};
  var TOL = 1e-3;

  /* ============================================================
     Дрібна геометрія
     ============================================================ */

  function len(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k]; }
  function norm(a) { var l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }

  /** Основа перпендикуляра з точки p на пряму (a, b). */
  function foot(p, a, b) {
    var d = sub(b, a);
    var l2 = d[0] * d[0] + d[1] * d[1];
    if (!l2) return a.slice();
    var t = ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / l2;
    return [a[0] + d[0] * t, a[1] + d[1] * t];
  }

  /** Відстань від точки до прямої (a, b). */
  function distToLine(p, a, b) {
    var f = foot(p, a, b);
    return len(p, f);
  }

  /** Точка, де внутрішня бісектриса з A перетинає BC: BD/DC = AB/AC. */
  function bisectorFoot(A, B, C2) {
    var ab = len(A, B), ac = len(A, C2);
    var k = ab / ((ab + ac) || 1);
    return add(B, mul(sub(C2, B), k));
  }

  function circumcenter(A, B, C2) {
    var d = 2 * (A[0] * (B[1] - C2[1]) + B[0] * (C2[1] - A[1]) + C2[0] * (A[1] - B[1]));
    if (Math.abs(d) < 1e-9) return null;
    var a2 = A[0] * A[0] + A[1] * A[1];
    var b2 = B[0] * B[0] + B[1] * B[1];
    var c2 = C2[0] * C2[0] + C2[1] * C2[1];
    return [
      (a2 * (B[1] - C2[1]) + b2 * (C2[1] - A[1]) + c2 * (A[1] - B[1])) / d,
      (a2 * (C2[0] - B[0]) + b2 * (A[0] - C2[0]) + c2 * (B[0] - A[0])) / d
    ];
  }

  function incenterTri(A, B, C2) {
    var a = len(B, C2), b = len(C2, A), c = len(A, B);
    var s = a + b + c;
    if (!s) return null;
    return [(a * A[0] + b * B[0] + c * C2[0]) / s, (a * A[1] + b * B[1] + c * C2[1]) / s];
  }

  function polyCentroid(pts) {
    var x = 0, y = 0;
    pts.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / pts.length, y / pts.length];
  }

  /** Найменша відстань від точки до всіх сторін многокутника. */
  function minSideDist(p, pts) {
    var m = Infinity;
    for (var i = 0; i < pts.length; i++) {
      var d = distToLine(p, pts[i], pts[(i + 1) % pts.length]);
      if (d < m) m = d;
    }
    return m;
  }

  /**
   * Центр найбільшого вписаного кола (чебишевський центр) — простим
   * підйомом на гору. Потрібен, щоб перевірити, чи в фігуру взагалі
   * можна вписати коло.
   */
  function chebyshevCenter(pts) {
    var p = polyCentroid(pts);
    var best = minSideDist(p, pts);
    var span = 0;
    pts.forEach(function (q) { span = Math.max(span, len(p, q)); });
    var step = span / 4;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]];
    for (var it = 0; it < 60 && step > span * 1e-5; it++) {
      var moved = false;
      for (var d = 0; d < dirs.length; d++) {
        var cand = [p[0] + dirs[d][0] * step, p[1] + dirs[d][1] * step];
        var v = minSideDist(cand, pts);
        if (v > best + 1e-9) { p = cand; best = v; moved = true; }
      }
      if (!moved) step /= 2;
    }
    return { c: p, r: best };
  }

  /** Опуклість: усі повороти контуру в один бік. */
  function isConvex(pts) {
    var n = pts.length, sign = 0;
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n], c = pts[(i + 2) % n];
      var cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) < 1e-9) continue;
      var s = cr > 0 ? 1 : -1;
      if (!sign) sign = s;
      else if (s !== sign) return false;
    }
    return true;
  }

  function pointInPolygon(p, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > p[1]) !== (yj > p[1])) &&
          (p[0] < (xj - xi) * (p[1] - yi) / ((yj - yi) || 1e-12) + xi)) inside = !inside;
    }
    return inside;
  }

  C.isConvex = isConvex;

  /**
   * Чи можна вписати коло. Для трикутника — завжди. Для многокутника
   * вимагаємо опуклості, центра всередині й однакових відстаней до сторін:
   * інакше «вписане» коло виявиться поза фігурою (напр. у неопуклого).
   */
  C.tangentialCircle = function (pts) {
    if (pts.length === 3) {
      var A = pts[0], B = pts[1], D = pts[2];
      var o = incenterTri(A, B, D);
      if (!o) return null;
      return { c: o, r: distToLine(o, A, B) };
    }
    if (!isConvex(pts)) return null;
    var res = chebyshevCenter(pts);
    if (!(res.r > 0) || !pointInPolygon(res.c, pts)) return null;
    var mn = Infinity, mx = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      var d = distToLine(res.c, pts[i], pts[(i + 1) % pts.length]);
      if (d < mn) mn = d;
      if (d > mx) mx = d;
    }
    // якщо відстані до сторін помітно різні — кола не вписати
    if ((mx - mn) / (mx || 1) > 0.02) return null;
    return { c: res.c, r: (mx + mn) / 2 };
  };

  /** Чи можна описати коло: усі вершини на однаковій відстані від центра. */
  C.cyclicCircle = function (pts) {
    if (pts.length < 3) return null;
    // вершини на колі, взяті по порядку, завжди дають опуклий контур
    if (pts.length > 3 && !isConvex(pts)) return null;
    var o = circumcenter(pts[0], pts[1], pts[2]);
    if (!o) return null;
    var r = len(o, pts[0]);
    for (var i = 3; i < pts.length; i++) {
      if (Math.abs(len(o, pts[i]) - r) / (r || 1) > 0.02) return null;
    }
    return { c: o, r: r };
  };

  /** Індекс сторони, паралельної стороні i (або -1). */
  function parallelSide(pts, i) {
    var n = pts.length;
    var d1 = norm(sub(pts[(i + 1) % n], pts[i]));
    for (var j = 0; j < n; j++) {
      if (j === i) continue;
      var d2 = norm(sub(pts[(j + 1) % n], pts[j]));
      var cross = Math.abs(d1[0] * d2[1] - d1[1] * d2[0]);
      if (cross < 0.02) return j;
    }
    return -1;
  }

  C.parallelSide = parallelSide;

  /* ============================================================
     Точки на колі / еліпсі
     ============================================================ */

  /** Кут відкладаємо як у школі: 0° — праворуч, 90° — вгору. */
  function onEllipse(cx, cy, rx, ry, deg) {
    var t = deg * Math.PI / 180;
    return [cx + rx * Math.cos(t), cy - ry * Math.sin(t)];
  }

  function ellipseTangentDir(rx, ry, deg) {
    var t = deg * Math.PI / 180;
    return norm([-rx * Math.sin(t), -ry * Math.cos(t)]);
  }

  /* ============================================================
     Види побудов
     ============================================================ */

  C.KINDS = {
    height:   { label: 'Висота',                 per: 'vertex' },
    median:   { label: 'Медіана',                per: 'vertex' },
    bisector: { label: 'Бісектриса',             per: 'vertex' },
    midline:  { label: 'Середня лінія',          per: 'side' },
    perpbis:  { label: 'Серединний перпендикуляр', per: 'side' },
    diagonal: { label: 'Діагоналі з вершини',    per: 'vertex' },
    incircle: { label: 'Вписане коло',           per: 'none' },
    circum:   { label: 'Описане коло',           per: 'none' },
    radius:   { label: 'Радіус',                 per: 'angle' },
    diameter: { label: 'Діаметр',                per: 'angle' },
    chord:    { label: 'Хорда',                  per: 'angle2' },
    tangent:  { label: 'Дотична',                per: 'angle' },
    secant:   { label: 'Січна',                  per: 'angle2' }
  };

  /**
   * Які побудови доступні для цієї фігури. Повертає масив
   * {k, label, per, count, hint} — лише математично коректні.
   */
  C.availableFor = function (parent, pts) {
    var out = [];
    var B = window.Board;
    var sh = B.SHAPES[parent.sh] || {};

    if (sh.round) {
      var isCircle = parent.sh === 'circle';
      if (isCircle) out.push({ k: 'radius', label: C.KINDS.radius.label, per: 'angle' });
      out.push({ k: 'diameter', label: C.KINDS.diameter.label, per: 'angle' });
      out.push({ k: 'chord', label: C.KINDS.chord.label, per: 'angle2' });
      out.push({ k: 'tangent', label: C.KINDS.tangent.label, per: 'angle' });
      out.push({ k: 'secant', label: C.KINDS.secant.label, per: 'angle2' });
      if (!isCircle) {
        out.forEach(function (o) { o.hint = 'для еліпса'; });
      }
      return out;
    }

    if (!pts) return out;
    var n = pts.length;

    if (n === 3) {
      out.push({ k: 'height', label: C.KINDS.height.label, per: 'vertex', count: 3 });
      out.push({ k: 'median', label: C.KINDS.median.label, per: 'vertex', count: 3 });
      out.push({ k: 'bisector', label: C.KINDS.bisector.label, per: 'vertex', count: 3 });
      out.push({ k: 'midline', label: C.KINDS.midline.label, per: 'side', count: 3 });
      out.push({ k: 'perpbis', label: C.KINDS.perpbis.label, per: 'side', count: 3 });
    } else {
      out.push({ k: 'diagonal', label: C.KINDS.diagonal.label, per: 'vertex', count: n });
      out.push({ k: 'perpbis', label: C.KINDS.perpbis.label, per: 'side', count: n });
      // висота має сенс там, де є пара паралельних сторін
      var hasPar = false;
      for (var i = 0; i < n; i++) if (parallelSide(pts, i) >= 0) { hasPar = true; break; }
      if (hasPar) {
        out.push({ k: 'height', label: C.KINDS.height.label, per: 'vertex', count: n,
                   hint: 'до паралельної сторони' });
      }
    }

    if (C.tangentialCircle(pts)) {
      out.push({ k: 'incircle', label: C.KINDS.incircle.label, per: 'none' });
    }
    if (C.cyclicCircle(pts)) {
      out.push({ k: 'circum', label: C.KINDS.circum.label, per: 'none' });
    }
    return out;
  };

  /**
   * Обчислити геометрію побудови.
   * Повертає {segs:[[x1,y1,x2,y2]…], circles:[{c,r}], right:[{at,d1,d2}],
   *           ticks:[[x,y,dx,dy]…], dots:[[x,y]…]} або null.
   */
  C.resolve = function (item, parent) {
    var B = window.Board;
    if (!parent || parent.t !== 'g') return null;
    var sh = B.SHAPES[parent.sh] || {};
    var out = { segs: [], circles: [], right: [], ticks: [], dots: [] };

    if (sh.round) {
      var b = B.itemBounds(parent);
      var cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
      var rx = (b.x2 - b.x1) / 2, ry = (b.y2 - b.y1) / 2;
      var a1 = item.a1 == null ? 35 : item.a1;
      var a2 = item.a2 == null ? 160 : item.a2;
      var P = onEllipse(cx, cy, rx, ry, a1);

      if (item.k === 'radius') {
        out.segs.push([cx, cy, P[0], P[1]]);
        out.dots.push([cx, cy]);
      } else if (item.k === 'diameter') {
        var Q = onEllipse(cx, cy, rx, ry, a1 + 180);
        out.segs.push([Q[0], Q[1], P[0], P[1]]);
        out.dots.push([cx, cy]);
      } else if (item.k === 'chord') {
        var R = onEllipse(cx, cy, rx, ry, a2);
        out.segs.push([P[0], P[1], R[0], R[1]]);
      } else if (item.k === 'secant') {
        var R2 = onEllipse(cx, cy, rx, ry, a2);
        var d = norm(sub(R2, P));
        var ext = Math.max(rx, ry) * 0.55;
        out.segs.push([P[0] - d[0] * ext, P[1] - d[1] * ext,
                       R2[0] + d[0] * ext, R2[1] + d[1] * ext]);
        out.dots.push(P); out.dots.push(R2);
      } else if (item.k === 'tangent') {
        var td = ellipseTangentDir(rx, ry, a1);
        var half = Math.max(rx, ry) * 1.1;
        out.segs.push([P[0] - td[0] * half, P[1] - td[1] * half,
                       P[0] + td[0] * half, P[1] + td[1] * half]);
        out.dots.push(P);
        // прямий кут між дотичною й радіусом
        out.right.push({ at: P, d1: td, d2: norm(sub([cx, cy], P)) });
        out.segs.push([cx, cy, P[0], P[1]]);
      } else return null;
      return out;
    }

    var pts = B.shapePoints(parent);
    if (!pts) return null;
    var n = pts.length;
    var i = ((item.i || 0) % n + n) % n;

    if (item.k === 'median') {
      var A = pts[i], M = mid(pts[(i + 1) % n], pts[(i + 2) % n]);
      if (n !== 3) return null;
      out.segs.push([A[0], A[1], M[0], M[1]]);
      // рисочки на рівних половинах основи
      out.ticks.push(tickAt(mid(pts[(i + 1) % n], M), sub(M, pts[(i + 1) % n])));
      out.ticks.push(tickAt(mid(M, pts[(i + 2) % n]), sub(pts[(i + 2) % n], M)));
      out.dots.push(M);
      return out;
    }

    if (item.k === 'bisector') {
      if (n !== 3) return null;
      var A2 = pts[i], B2 = pts[(i + 1) % n], C3 = pts[(i + 2) % n];
      var D = bisectorFoot(A2, B2, C3);
      out.segs.push([A2[0], A2[1], D[0], D[1]]);
      out.dots.push(D);
      return out;
    }

    if (item.k === 'height') {
      var V = pts[i], S1, S2;
      if (n === 3) {
        S1 = pts[(i + 1) % n]; S2 = pts[(i + 2) % n];
      } else {
        // шукаємо сторону, паралельну тій, на якій лежить вершина
        var side = -1;
        for (var s = 0; s < n; s++) {
          if (s === i || (s + 1) % n === i) {
            var par = parallelSide(pts, s);
            if (par >= 0) { side = par; break; }
          }
        }
        if (side < 0) return null;
        S1 = pts[side]; S2 = pts[(side + 1) % n];
      }
      var F = foot(V, S1, S2);
      out.segs.push([V[0], V[1], F[0], F[1]]);
      // якщо основа впала за межі сторони — показуємо продовження
      var t = projParam(F, S1, S2);
      if (t < 0) out.segs.push([S1[0], S1[1], F[0], F[1]]);
      else if (t > 1) out.segs.push([S2[0], S2[1], F[0], F[1]]);
      out.right.push({ at: F, d1: norm(sub(S2, S1)), d2: norm(sub(V, F)) });
      out.dots.push(F);
      return out;
    }

    if (item.k === 'midline') {
      if (n !== 3) return null;
      // середня лінія, паралельна стороні i (від pts[i] до pts[i+1])
      var M1 = mid(pts[i], pts[(i + 2) % n]);
      var M2 = mid(pts[(i + 1) % n], pts[(i + 2) % n]);
      out.segs.push([M1[0], M1[1], M2[0], M2[1]]);
      out.dots.push(M1); out.dots.push(M2);
      return out;
    }

    if (item.k === 'perpbis') {
      var P1 = pts[i], P2 = pts[(i + 1) % n];
      var Mm = mid(P1, P2);
      var dd = norm(sub(P2, P1));
      var nn = [-dd[1], dd[0]];
      var half = len(P1, P2) * 0.9;
      out.segs.push([Mm[0] - nn[0] * half, Mm[1] - nn[1] * half,
                     Mm[0] + nn[0] * half, Mm[1] + nn[1] * half]);
      out.right.push({ at: Mm, d1: dd, d2: nn });
      out.ticks.push(tickAt(mid(P1, Mm), dd));
      out.ticks.push(tickAt(mid(Mm, P2), dd));
      return out;
    }

    if (item.k === 'diagonal') {
      if (n < 4) return null;
      for (var j = 0; j < n; j++) {
        if (j === i || j === (i + 1) % n || (j + 1) % n === i) continue;
        out.segs.push([pts[i][0], pts[i][1], pts[j][0], pts[j][1]]);
      }
      if (!out.segs.length) return null;
      return out;
    }

    if (item.k === 'incircle') {
      var ic = C.tangentialCircle(pts);
      if (!ic) return null;
      out.circles.push(ic);
      out.dots.push(ic.c);
      return out;
    }

    if (item.k === 'circum') {
      var cc = C.cyclicCircle(pts);
      if (!cc) return null;
      out.circles.push(cc);
      out.dots.push(cc.c);
      return out;
    }

    return null;
  };

  function projParam(p, a, b) {
    var d = sub(b, a);
    var l2 = d[0] * d[0] + d[1] * d[1];
    if (!l2) return 0;
    return ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / l2;
  }

  function tickAt(p, dir) {
    var d = norm(dir);
    return [p[0], p[1], -d[1], d[0]];   // точка + напрям рисочки (перпендикуляр)
  }

  /** Коротка позначка виду побудови — для підпису на полотні. */
  C.shortLabel = function (item) {
    var m = { height: 'h', median: 'm', bisector: 'l', midline: 'сер.л.',
              perpbis: '⊥', diagonal: 'd', incircle: 'впис.', circum: 'опис.',
              radius: 'R', diameter: 'd', chord: 'хорда', tangent: 'дот.', secant: 'січна' };
    return m[item.k] || '';
  };

  window.Constructions = C;
})();
