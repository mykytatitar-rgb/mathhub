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

    /* Центр фігури. Для кола це те саме O, від якого йдуть радіуси, і без
       нього не побудувати ні радіус у точку дотику, ні діагоналі квадрата
       з їхнього перетину. Місце рахуємо щоразу, тож фігуру можна тягати. */
    if (pt.on.kind === 'center') {
      if (sh.round) {
        var cb = B.itemBounds(host);
        if (!cb) return pt.p ? pt.p.slice() : null;
        return [(cb.x1 + cb.x2) / 2, (cb.y1 + cb.y2) / 2];
      }
      var cp = B.shapePoints(host);
      if (!cp || !cp.length) return pt.p ? pt.p.slice() : null;
      var sx = 0, sy = 0;
      cp.forEach(function (v) { sx += v[0]; sy += v[1]; });
      return [sx / cp.length, sy / cp.length];
    }

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

        /* Центр — така сама ціль, як вершина, і навіть частіша: радіус,
           діаметр і відстань до хорди всі починаються звідти. */
        offer({ on: { pid: it.id, kind: 'center' }, p: [cx, cy] }, dist([x, y], [cx, cy]), 1);

        var ang = Math.atan2(-(y - cy) / ry, (x - cx) / rx);
        var on = [cx + rx * Math.cos(ang), cy - ry * Math.sin(ang)];
        offer({ on: { pid: it.id, kind: 'circle', t: Math.round(ang * 180 / Math.PI * 10) / 10 },
                p: on }, dist([x, y], on), 2);
        return;
      }

      var pts = B.shapePoints(it);
      if (!pts) return;

      // центр многокутника: звідти йдуть радіуси описаного кола й апофеми
      var mx = 0, my = 0;
      pts.forEach(function (v) { mx += v[0]; my += v[1]; });
      mx /= pts.length; my /= pts.length;
      offer({ on: { pid: it.id, kind: 'center' }, p: [mx, my] }, dist([x, y], [mx, my]), 1);

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

  /**
   * Імʼя для щойно поставленої точки.
   *
   * Центр кола в задачах називають O, а не «наступною вільною літерою» —
   * і саме так його підписано на самій фігурі. Коли O вже зайняте, беремо
   * звичайну чергу: двох центрів з однією назвою бути не має.
   */
  P.nameFor = function (snap, items) {
    if (snap && snap.on && snap.on.kind === 'center') {
      var taken = (items || []).some(function (it) { return it.t === 'o' && it.n === 'O'; });
      if (!taken) return 'O';
    }
    return P.nextName(items);
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

  /* ============================================================
     Дотичні
     ============================================================ */

  /**
   * Коло як центр і радіус — або null, якщо це не коло.
   *
   * Еліпс сюди не потрапляє навмисно: у нього дотичні з однієї точки
   * різної довжини, і теорема про рівність відрізків дотичних для нього
   * просто неправильна.
   */
  P.circleOf = function (host) {
    var B = window.Board;
    if (!B || !host || host.t !== 'g') return null;
    var sh = B.SHAPES[host.sh] || {};
    if (!sh.round) return null;

    var b = B.itemBounds(host);
    if (!b) return null;
    var rx = (b.x2 - b.x1) / 2, ry = (b.y2 - b.y1) / 2;
    if (rx < 2 || ry < 2) return null;
    if (Math.abs(rx - ry) > Math.max(rx, ry) * 0.02) return null;   // це еліпс

    return { cx: (b.x1 + b.x2) / 2, cy: (b.y1 + b.y2) / 2, r: (rx + ry) / 2 };
  };

  /**
   * Два кути на колі, у яких його торкаються дотичні з точки B.
   *
   * Кут рахуємо в тій самій системі, що й P.at: проти годинникової,
   * від правого краю, з віссю y догори. Тому знак y перевернутий.
   */
  P.tangentAngles = function (circle, B) {
    if (!circle || !B) return null;
    var dx = B[0] - circle.cx, dy = -(B[1] - circle.cy);
    var d = Math.hypot(dx, dy);
    if (d <= circle.r * 1.001) return null;            // точка не зовні кола

    var base = Math.atan2(dy, dx);
    var half = Math.acos(circle.r / d);
    var deg = 180 / Math.PI;
    return [(base + half) * deg, (base - half) * deg];
  };

  /** Різниця кутів у межах ±180°. */
  function angDiff(a, b) {
    var d = (a - b) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  /**
   * Якщо точка на колі майже стоїть у місці дотику — повертає точний кут.
   *
   * Від руки дотичну не проводять: лінія або трішки січе коло, або не
   * достає до нього. Тому точку підводимо до справжнього місця дотику —
   * і тоді креслення стає правдивим, а не просто підписаним як правильне.
   * Далі рівність відрізків виходить сама собою, бо вони справді рівні.
   */
  P.tangentSnap = function (pt, host, other, tolDeg) {
    if (!pt || !pt.on || pt.on.kind !== 'circle') return null;
    var circle = P.circleOf(host);
    if (!circle) return null;

    var angs = P.tangentAngles(circle, other);
    if (!angs) return null;

    var cur = pt.on.t || 0;
    var best = null;
    angs.forEach(function (a) {
      var d = Math.abs(angDiff(a, cur));
      if (!best || d < best.d) best = { a: a, d: d };
    });
    if (!best || best.d > (tolDeg || 6)) return null;

    return Math.round(best.a * 10) / 10;
  };

  /**
   * Якщо вільна точка стоїть майже в центрі кола — повертає сам центр.
   *
   * Центр ставлять на око, і тоді він ні до чого не привʼязаний: радіуси
   * виходять різної довжини, рисочок рівності немає, а коло не можна
   * посунути — точка лишиться на місці. Привʼязка лагодить усе одразу.
   */
  P.centerSnap = function (pt, host) {
    if (!pt || (pt.on && pt.on.pid)) return null;        // вже кудись привʼязана
    var circle = P.circleOf(host);
    if (!circle) return null;

    var p = pt.p;
    if (!p) return null;
    if (dist(p, [circle.cx, circle.cy]) > Math.max(6, circle.r * 0.06)) return null;
    return { pid: host.id, kind: 'center' };
  };

  /**
   * Усе, що випливає з проведених дотичних.
   *
   * Дотична дає одразу дві теореми, і розпізнавати їх треба разом, одним
   * рішенням. Раніше рівність відрізків і прямий кут перевірялися нарізно
   * й різними допусками — і креслення потрапляло у проміжок: рисочки
   * рівності стояли, а квадратика прямого кута не було, хоча обидві
   * позначки кажуть про ту саму дотичну.
   *
   * equal — групи відрізків дотичних, проведених з однієї точки до одного
   * кола: вони рівні. Окремо від вимірювання довжин тому, що дотичну часто
   * проводять променем або прямою, а нескінченність ні з чим не дорівняєш.
   *
   * right — прямі кути в точках дотику з тими радіусами, які справді
   * проведені. Радіус шукаємо серед намальованого: позначати кут із лінією,
   * якої на кресленні немає, не можна.
   */
  P.tangents = function (segs, byId) {
    var B = window.Board;
    var out = { equal: [], right: [] };
    if (!B) return out;

    var touch = [];      // {id, pid, vid, at, dir}
    (segs || []).forEach(function (s) {
      if (!s.p1 || !s.p2) return;
      [[s.p1, s.p2], [s.p2, s.p1]].forEach(function (pair) {
        var on = pair[0], outer = pair[1];
        if (!on.on || on.on.kind !== 'circle') return;
        if (outer.on && outer.on.pid === on.on.pid) return;   // хорда, не дотична
        var host = byId[on.on.pid];
        var circle = P.circleOf(host);
        if (!circle) return;

        var op = P.at(outer, byId), tp = P.at(on, byId);
        if (!op || !tp) return;

        // дотична: радіус у точці дотику перпендикулярний до лінії
        var rv = [tp[0] - circle.cx, tp[1] - circle.cy];
        var lv = [op[0] - tp[0], op[1] - tp[1]];
        var lr = Math.hypot(rv[0], rv[1]), ll = Math.hypot(lv[0], lv[1]);
        if (lr < 2 || ll < 6) return;
        var cos = (rv[0] * lv[0] + rv[1] * lv[1]) / (lr * ll);
        if (Math.abs(cos) > 0.03) return;

        touch.push({ id: s.id, pid: on.on.pid, vid: outer.id,
                     tid: on.id, at: tp,
                     dir: [lv[0] / ll, lv[1] / ll] });
      });
    });

    // рівні лише ті, що вийшли з однієї точки до одного кола
    var buckets = {};
    touch.forEach(function (t) {
      if (!t.vid) return;
      var k = t.pid + '|' + t.vid;
      (buckets[k] = buckets[k] || []).push(t.id);
    });
    out.equal = Object.keys(buckets)
      .map(function (k) { return buckets[k]; })
      .filter(function (g) { return g.length > 1; });

    /* Прямий кут ставимо там, де радіус проведено. Напрямок беремо з самих
       відрізків, а не з теорії: якщо рука схибила на півтора градуса,
       квадратик має стояти так само трохи скошено — інакше позначка
       сперечалася б із лінією, під якою стоїть. */
    touch.forEach(function (t) {
      var circle = P.circleOf(byId[t.pid]);
      if (!circle) return;
      /* Центр упізнаємо по місцю, а не лише по привʼязці. Точку центра
         часто ставлять на око — і тоді формально вона ні до чого не
         привʼязана, хоча відрізок із неї все одно радіус. Допуск беремо
         часткою радіуса: на великому колі похибка в кілька пікселів нічого
         не означає, на дрібному — означає все. */
      var near = Math.max(6, circle.r * 0.06);

      (segs || []).forEach(function (s) {
        if (s.id === t.id || !s.p1 || !s.p2) return;
        [[s.p1, s.p2], [s.p2, s.p1]].forEach(function (e) {
          if (!e[0] || e[0].id !== t.tid) return;

          var cp = P.at(e[1], byId);
          if (!cp) return;
          if (dist(cp, [circle.cx, circle.cy]) > near) return;

          var rx = cp[0] - t.at[0], ry = cp[1] - t.at[1];
          var rl = Math.hypot(rx, ry);
          if (rl < 6) return;

          out.right.push({ owner: s.id, at: t.at.slice(),
                           d1: [rx / rl, ry / rl], d2: t.dir.slice() });
        });
      });
    });

    return out;
  };

  P.EPS = EPS;
  window.Points = P;
})();
