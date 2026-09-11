/* Геометричні точки, відрізки між ними й автоматичні позначки.

   Точка — не просто кружечок у координатах. Вона може належати фігурі:
   стояти у вершині, на стороні чи на колі. Тоді її місце рахується з самої
   фігури, і коли фігуру тягнуть, точка лишається там, де була, — на
   середині сторони, а не «приблизно там, де середина була раніше».

   Відрізок так само не зберігає координат: він знає два імені точок і
   щоразу питає в них, де вони. Тому нічого не може розійтися.

   Позначки — рисочки рівності й прямий кут — не ставляться руками. Вони
   обчислюються з того, що намальовано: якщо два відрізки справді рівні,
   вони отримують однакову кількість рисочок. У цьому й сенс: позначка
   каже правду про креслення, а не про наміри. */
(function () {
  'use strict';

  var P = {};
  var EPS = 0.6;                    // пікселів: усе точніше за це вважаємо збігом

  /* ============================================================
     Де саме стоїть точка
     ============================================================ */

  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  function dist(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }

  /**
   * Місце точки в координатах дошки.
   *
   * Вільна точка знає свої координати сама. Прив'язана питає їх у фігури —
   * щоразу наново. Якщо фігури вже немає, точка лишається там, де була
   * востаннє: зникнути вона не має права.
   */
  P.at = function (pt, byId) {
    if (!pt) return null;
    if (!pt.on || !pt.on.pid) return pt.p ? pt.p.slice() : null;

    var host = byId && byId[pt.on.pid];
    var B = window.Board;
    if (!host || !B) return pt.p ? pt.p.slice() : null;

    var sh = B.SHAPES[host.sh] || {};

    if (sh.round) {
      var b = B.itemBounds(host);
      if (!b) return pt.p ? pt.p.slice() : null;
      var cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
      var rx = (b.x2 - b.x1) / 2, ry = (b.y2 - b.y1) / 2;
      var a = (pt.on.t || 0) * Math.PI / 180;
      return [cx + rx * Math.cos(a), cy - ry * Math.sin(a)];
    }

    var pts = B.shapePoints(host);
    if (!pts || !pts.length) return pt.p ? pt.p.slice() : null;
    var n = pts.length;
    var i = ((pt.on.i || 0) % n + n) % n;

    if (pt.on.kind === 'vertex') return pts[i].slice();
    return lerp(pts[i], pts[(i + 1) % n], pt.on.t || 0);
  };

  /**
   * Куди «прилипне» точка, якщо відпустити мишу тут.
   *
   * Спершу вершини, потім сторони й кола, і лише тоді вільне місце.
   * Порядок саме такий, бо вершина — це точка, яку люди мають на увазі
   * найчастіше, і промахнутися повз неї в кресленні найприкріше.
   */
  P.snap = function (x, y, items, tol) {
    tol = tol || 14;
    var B = window.Board;
    if (!B) return { p: [x, y] };

    var best = null;

    function offer(cand, d, rank) {
      if (d > tol) return;
      if (!best || rank < best.rank || (rank === best.rank && d < best.d)) {
        best = { on: cand.on, p: cand.p, d: d, rank: rank };
      }
    }

    (items || []).forEach(function (it) {
      if (it.t !== 'g' || !it.id) return;
      var sh = B.SHAPES[it.sh] || {};

      if (sh.round) {
        var b = B.itemBounds(it);
        if (!b) return;
        var cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
        var rx = (b.x2 - b.x1) / 2 || 1, ry = (b.y2 - b.y1) / 2 || 1;
        var ang = Math.atan2(-(y - cy) / ry, (x - cx) / rx);
        var on = [cx + rx * Math.cos(ang), cy - ry * Math.sin(ang)];
        offer({ on: { pid: it.id, kind: 'circle', t: Math.round(ang * 180 / Math.PI * 10) / 10 },
                p: on }, dist([x, y], on), 2);
        return;
      }

      var pts = B.shapePoints(it);
      if (!pts) return;

      pts.forEach(function (v, i) {
        offer({ on: { pid: it.id, kind: 'vertex', i: i }, p: v.slice() }, dist([x, y], v), 1);
      });

      pts.forEach(function (v, i) {
        var w = pts[(i + 1) % pts.length];
        var dx = w[0] - v[0], dy = w[1] - v[1];
        var L2 = dx * dx + dy * dy;
        if (!L2) return;
        var t = ((x - v[0]) * dx + (y - v[1]) * dy) / L2;
        if (t <= 0.02 || t >= 0.98) return;          // краї — це вже вершини
        /* Середина сторони притягує сильніше за інші її місця: саме вона
           потрібна для медіани й середньої лінії, і ловити її на око
           безглуздо. */
        if (Math.abs(t - 0.5) < 0.06) t = 0.5;
        var q = lerp(v, w, t);
        offer({ on: { pid: it.id, kind: 'side', i: i, t: Math.round(t * 1e4) / 1e4 }, p: q },
              dist([x, y], q), 2);
      });
    });

    return best ? { on: best.on, p: best.p } : { p: [x, y] };
  };

  /** Наступне вільне імʼя: A, B, C… далі A₁, B₁… */
  P.nextName = function (items) {
    var used = {};
    (items || []).forEach(function (it) { if (it.t === 'o' && it.n) used[it.n] = 1; });
    var letters = 'ABCDEFGHKLMNPQRST'.split('');
    for (var round = 0; round < 10; round++) {
      for (var i = 0; i < letters.length; i++) {
        var nm = letters[i] + (round ? String(round).replace(/\d/g, function (d) {
          return '₀₁₂₃₄₅₆₇₈₉'.charAt(Number(d));
        }) : '');
        if (!used[nm]) return nm;
      }
    }
    return 'X';
  };

  /* ============================================================
     Позначки: рівні відрізки й прямі кути
     ============================================================ */

  /**
   * Розкласти відрізки на групи однакової довжини.
   *
   * Допуск — у пікселях, не у відсотках: на кресленні рівність видно оком,
   * і те, що відрізняється на півпікселя, людина вважає рівним. Відсоток
   * дав би різний допуск для довгих і коротких, а це не те, як дивляться.
   */
  P.equalGroups = function (segs) {
    var groups = [];
    segs.forEach(function (s) {
      var L = s.len;
      for (var i = 0; i < groups.length; i++) {
        if (Math.abs(groups[i].len - L) <= EPS) { groups[i].items.push(s); return; }
      }
      groups.push({ len: L, items: [s] });
    });
    // групи з одного відрізка нічого не позначають: рівність — це про пару
    return groups.filter(function (g) { return g.items.length > 1; })
                 .sort(function (a, b) { return a.len - b.len; });
  };

  /**
   * Прямі кути між відрізками, що мають спільний кінець.
   *
   * Перевіряємо скалярний добуток, а не кут у градусах: біля 90° косинус
   * міняється найшвидше, тож саме він і дає найчесніший допуск.
   */
  P.rightAngles = function (segs) {
    var out = [];
    for (var i = 0; i < segs.length; i++) {
      for (var j = i + 1; j < segs.length; j++) {
        var a = segs[i], b = segs[j];
        var shared = null, ua = null, ub = null;

        [[a.a, a.b], [a.b, a.a]].forEach(function (pa) {
          [[b.a, b.b], [b.b, b.a]].forEach(function (pb) {
            if (shared) return;
            if (dist(pa[0], pb[0]) <= EPS) { shared = pa[0]; ua = pa[1]; ub = pb[1]; }
          });
        });
        if (!shared) continue;

        var v1 = [ua[0] - shared[0], ua[1] - shared[1]];
        var v2 = [ub[0] - shared[0], ub[1] - shared[1]];
        var l1 = Math.hypot(v1[0], v1[1]), l2 = Math.hypot(v2[0], v2[1]);
        if (l1 < 6 || l2 < 6) continue;
        var cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2);
        if (Math.abs(cos) > 0.02) continue;          // приблизно 88.9°…91.1°

        /* Позначку малює перший із пари. Інакше в куті, де сходяться три
           відрізки, той самий квадратик намалювався б двічі й потовщав. */
        out.push({ owner: a.id, at: shared,
                   d1: [v1[0] / l1, v1[1] / l1],
                   d2: [v2[0] / l2, v2[1] / l2] });
      }
    }
    return out;
  };

  P.EPS = EPS;
  window.Points = P;
})();
