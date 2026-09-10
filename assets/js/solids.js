/* Стереометрія: многогранники й тіла обертання в аксонометрії.

   Каркас, а не затінена модель, — і це не спрощення, а вимога предмету.
   У підручнику й у завданнях НМТ тіло малюють саме так: видимі ребра
   суцільні, невидимі пунктиром. Затінена поверхня приховала б і те, і
   друге, тобто саме те, заради чого малюнок роблять.

   Видимість ребра рахується, а не задається списком: у кожної грані є
   зовнішня нормаль, грань обернена до нас або від нас, і ребро видиме,
   якщо хоч одна з двох сусідніх граней обернена до нас. Для опуклих тіл —
   а всі шкільні саме такі — це точний критерій, а не наближення.

   Тіла обертання рахуються інакше: у циліндра й конуса межа видимості —
   не ребро, а лінія дотику, тож для них будуються еліпси й твірні. */
(function () {
  'use strict';

  var S = {};

  /* ============================================================
     Заготовки тіл: вершини та грані
     ============================================================

     Грані записані проти годинникової стрілки, якщо дивитися ЗЗОВНІ. Саме
     на цьому тримається визначення видимості, тож порядок тут не
     косметичний. */

  function boxLike(rx, ry) {
    return {
      v: [[-rx, -ry, -1], [rx, -ry, -1], [rx, ry, -1], [-rx, ry, -1],
          [-rx, -ry, 1], [rx, -ry, 1], [rx, ry, 1], [-rx, ry, 1]],
      f: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]],
      names: ['A', 'B', 'C', 'D', 'A₁', 'B₁', 'C₁', 'D₁']
    };
  }

  /** Правильна n-кутна призма. */
  function prism(n) {
    var v = [], f = [], i;
    for (i = 0; i < n; i++) {
      var a = Math.PI * 2 * i / n + Math.PI / n;
      v.push([Math.cos(a), Math.sin(a), -1]);
    }
    for (i = 0; i < n; i++) v.push([v[i][0], v[i][1], 1]);

    var bottom = [], top = [];
    for (i = n - 1; i >= 0; i--) bottom.push(i);          // знизу — у зворотному порядку
    for (i = 0; i < n; i++) top.push(n + i);
    f.push(bottom); f.push(top);
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n;
      f.push([i, j, n + j, n + i]);
    }
    return { v: v, f: f, names: namesFor(n, true) };
  }

  /** Правильна n-кутна піраміда. */
  function pyramid(n) {
    var v = [], f = [], i;
    for (i = 0; i < n; i++) {
      var a = Math.PI * 2 * i / n + Math.PI / n;
      v.push([Math.cos(a), Math.sin(a), -1]);
    }
    v.push([0, 0, 1.15]);                                  // вершина

    var bottom = [];
    for (i = n - 1; i >= 0; i--) bottom.push(i);
    f.push(bottom);
    for (i = 0; i < n; i++) f.push([i, (i + 1) % n, n]);

    var nm = namesFor(n, false);
    nm.push('S');
    return { v: v, f: f, names: nm };
  }

  /** Зрізана піраміда: те саме, тільки верх не сходиться в точку. */
  function frustum(n, k) {
    var v = [], f = [], i;
    for (i = 0; i < n; i++) {
      var a = Math.PI * 2 * i / n + Math.PI / n;
      v.push([Math.cos(a), Math.sin(a), -1]);
    }
    for (i = 0; i < n; i++) v.push([v[i][0] * k, v[i][1] * k, 1]);

    var bottom = [], top = [];
    for (i = n - 1; i >= 0; i--) bottom.push(i);
    for (i = 0; i < n; i++) top.push(n + i);
    f.push(bottom); f.push(top);
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n;
      f.push([i, j, n + j, n + i]);
    }
    return { v: v, f: f, names: namesFor(n, true) };
  }

  /* Підписи як у підручнику: основа — латиниця по колу, верх — та сама
     літера з одиничкою. Літери «I» уникаємо: поруч із одиничкою її не
     відрізнити. */
  var LETTERS = 'ABCDEFGHKLMN'.split('');

  function namesFor(n, twoLevels) {
    var out = [], i;
    for (i = 0; i < n; i++) out.push(LETTERS[i % LETTERS.length]);
    if (twoLevels) for (i = 0; i < n; i++) out.push(LETTERS[i % LETTERS.length] + '₁');
    return out;
  }

  /* yaw0 — кут, під яким тіло виглядає найзрозуміліше. Він різний, і це не
     примха: у тіла з трикутною основою грані розвернуті через 120°, тож із
     того самого напрямку, під яким куб показує три грані, тетраедр показує
     одну — і перетворюється на плаский трикутник із пунктиром усередині. */
  S.KINDS = {
    cube:    { label: 'Куб', yaw0: 28,          make: function () { return boxLike(1, 1); } },
    box:     { label: 'Прямокутний паралелепіпед', yaw0: 28, make: function () { return boxLike(1.35, 0.75); } },
    prism3:  { label: 'Трикутна призма', yaw0: 65, make: function () { return prism(3); } },
    prism6:  { label: 'Шестикутна призма', yaw0: 25, make: function () { return prism(6); } },
    pyr3:    { label: 'Трикутна піраміда', yaw0: 65, make: function () { return pyramid(3); } },
    pyr4:    { label: 'Чотирикутна піраміда', yaw0: 28, make: function () { return pyramid(4); } },
    pyr6:    { label: 'Шестикутна піраміда', yaw0: 25, make: function () { return pyramid(6); } },
    frust4:  { label: 'Зрізана піраміда', yaw0: 28, make: function () { return frustum(4, 0.55); } },
    cyl:     { label: 'Циліндр', yaw0: 0,       round: true },
    cone:    { label: 'Конус', yaw0: 0,         round: true },
    sphere:  { label: 'Куля', yaw0: 0,          round: true }
  };

  /* ============================================================
     Проєкція
     ============================================================ */

  /**
   * Обертання навколо вертикалі, потім нахил — і паралельна проєкція.
   *
   * Паралельна, а не перспективна: у стереометрії паралельні ребра мають
   * лишатися паралельними, інакше побудова перерізу перестає працювати.
   */
  function project(p, yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var x1 = p[0] * cy - p[1] * sy;
    var y1 = p[0] * sy + p[1] * cy;

    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var y2 = y1 * cp - p[2] * sp;
    var z2 = y1 * sp + p[2] * cp;

    return [x1, -z2, y2];              // x, екранний y (вгору — вгору), глибина
  }

  /**
   * З екрана назад у простір.
   *
   * Двовимірна миша не може задати три координати, і вдавати протилежне —
   * означає щоразу зміщувати вершину туди, куди її не вели. Тому глибину
   * лишаємо ту, що була: миша рухає вершину в площині екрана, а вгору-вниз
   * по самому тілу — окремо, з Shift.
   */
  S.unproject = function (sx, sy, depth, yaw, pitch) {
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var z2 = -sy, y2 = depth;
    var y1 = y2 * cp + z2 * sp;
    var pz = -y2 * sp + z2 * cp;

    var cy = Math.cos(yaw), sy2 = Math.sin(yaw);
    var px = sx * cy + y1 * sy2;
    var py = -sx * sy2 + y1 * cy;
    return [px, py, pz];
  };

  /** Куди потрапить точка простору на екрані. Потрібно для маркерів. */
  S.project = function (p, yaw, pitch) { return project(p, yaw, pitch); };

  /** Площа проєкції грані зі знаком — за нею й видно, куди грань обернена. */
  function signedArea(face, pts) {
    var s = 0;
    for (var i = 0; i < face.length; i++) {
      var a = pts[face[i]], b = pts[face[(i + 1) % face.length]];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  }

  /**
   * Каркас тіла: видимі ребра, невидимі ребра й місця для підписів.
   *
   * Усе в умовних координатах приблизно від −1.5 до 1.5; переносити на
   * дошку — справа того, хто малює.
   */
  S.build = function (kind, yaw, pitch, moved) {
    var def = S.KINDS[kind];
    if (!def || def.round) return null;

    var m = def.make();
    /* Зрушені вершини. Тіло лишається тим самим набором граней — міняються
       лише координати. Тому воно перестає бути правильним, але не
       перестає бути тілом: грані, ребра й видимість рахуються так само. */
    if (moved) {
      Object.keys(moved).forEach(function (i) {
        var q = Number(i);
        if (m.v[q]) m.v[q] = moved[i].slice();
      });
    }
    var pts = m.v.map(function (p) { return project(p, yaw, pitch); });

    /* Грань обернена до нас, якщо її проєкція обходиться за годинниковою
       стрілкою: екранна вісь y дивиться вниз, тож обхід «проти годинника
       ззовні» стає обходом за годинником на екрані. */
    var front = m.f.map(function (face) { return signedArea(face, pts) < 0; });

    var seen = {}, edges = [];
    m.f.forEach(function (face, fi) {
      for (var i = 0; i < face.length; i++) {
        var a = face[i], b = face[(i + 1) % face.length];
        var key = Math.min(a, b) + '-' + Math.max(a, b);
        if (!seen[key]) seen[key] = { a: a, b: b, vis: false };
        if (front[fi]) seen[key].vis = true;
      }
    });
    Object.keys(seen).forEach(function (k) { edges.push(seen[k]); });

    var visible = [], hidden = [];
    edges.forEach(function (e) {
      var seg = [pts[e.a][0], pts[e.a][1], pts[e.b][0], pts[e.b][1]];
      (e.vis ? visible : hidden).push(seg);
    });

    /* Підпис відсуваємо від центра тіла: інакше літера лягає просто на
       ребро й зливається з ним. */
    var labels = pts.map(function (p, i) {
      var d = Math.hypot(p[0], p[1]) || 1;
      return { name: m.names[i] || '', x: p[0] + p[0] / d * 0.16, y: p[1] + p[1] / d * 0.16 };
    });

    return { visible: visible, hidden: hidden, labels: labels, pts: pts };
  };

  /**
   * Тіла обертання.
   *
   * Тут межа видимості не ребро, а лінія дотику погляду до поверхні, тож
   * замість граней рахуємо еліпси основ і твірні. Задня половина основи
   * пунктиром — саме так її і малюють на дошці.
   */
  S.buildRound = function (kind, pitch, rsec) {
    var k = Math.abs(Math.sin(pitch));          // сплюснутість основи від нахилу
    var ry = Math.max(0.06, k);
    var out = { visible: [], hidden: [], labels: [], ellipses: [], fill: null };

    function ellipse(cy, rx, ryy, dashedBack) {
      var N = 64, i, a, prev = null;
      for (i = 0; i <= N; i++) {
        a = Math.PI * 2 * i / N;
        var p = [Math.cos(a) * rx, cy + Math.sin(a) * ryy];
        if (prev) {
          // задня половина — та, де точка вище центра (від нас)
          var back = Math.sin(a) < 0 && Math.sin(Math.PI * 2 * (i - 1) / N) < 0;
          (dashedBack && back ? out.hidden : out.visible).push([prev[0], prev[1], p[0], p[1]]);
        }
        prev = p;
      }
    }

    if (kind === 'cyl') {
      ellipse(-1, 1, ry, true);                 // нижня основа
      ellipse(1, 1, ry, false);                 // верхня видна повністю
      out.visible.push([-1, -1, -1, 1]);
      out.visible.push([1, -1, 1, 1]);
      out.labels.push({ name: 'O₁', x: 0.06, y: 1 }, { name: 'O', x: 0.06, y: -1 });
    } else if (kind === 'cone') {
      ellipse(-1, 1, ry, true);
      out.visible.push([-1, -1, 0, 1.15]);
      out.visible.push([1, -1, 0, 1.15]);
      out.labels.push({ name: 'S', x: 0.08, y: 1.25 }, { name: 'O', x: 0.08, y: -1 });
    } else if (kind === 'sphere') {
      var N = 72, i, prev = null;
      for (i = 0; i <= N; i++) {
        var a = Math.PI * 2 * i / N;
        var p = [Math.cos(a), Math.sin(a)];
        if (prev) out.visible.push([prev[0], prev[1], p[0], p[1]]);
        prev = p;
      }
      ellipse(0, 1, ry, true);                  // екватор
      out.labels.push({ name: 'O', x: 0.08, y: 0 });
    } else return null;

    /* ---- перерізи круглих тіл

       У них немає граней, тож алгоритм для многогранників тут не працює.
       Зате в школі потрібні рівно два: осьовий і паралельний основі. Обидва
       рахуються прямо, з тих самих розмірів.

       Осьовий збігається з обрисом тіла — так і має бути, і саме тому його
       не досить обвести: він читається лише залитим. */
    if (rsec && rsec.k) {
      var t = typeof rsec.t === 'number' ? Math.max(0.02, Math.min(0.98, rsec.t)) : 0.5;

      if (rsec.k === 'parallel') {
        var cy2, rr;
        if (kind === 'cyl') { cy2 = -1 + 2 * t; rr = 1; }
        else if (kind === 'cone') { cy2 = -1 + 2.15 * t; rr = 1 - t; }
        else { cy2 = -1 + 2 * t; rr = Math.sqrt(Math.max(0, 1 - cy2 * cy2)); }

        if (rr > 0.01) {
          var poly = [], N2 = 64;
          for (var q = 0; q <= N2; q++) {
            var aa = Math.PI * 2 * q / N2;
            poly.push([Math.cos(aa) * rr, cy2 + Math.sin(aa) * ry * rr]);
          }
          out.fill = poly;
          // передню половину малюємо суцільною, задню пунктиром — як основу
          for (var q2 = 1; q2 <= N2; q2++) {
            var a0 = Math.PI * 2 * (q2 - 1) / N2, a1 = Math.PI * 2 * q2 / N2;
            var back = Math.sin(a0) < 0 && Math.sin(a1) < 0;
            (back ? out.hidden : out.visible).push(
              [poly[q2 - 1][0], poly[q2 - 1][1], poly[q2][0], poly[q2][1]]);
          }
        }
      } else if (rsec.k === 'axial') {
        if (kind === 'cyl') {
          out.fill = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        } else if (kind === 'cone') {
          out.fill = [[-1, -1], [1, -1], [0, 1.15]];
        } else {
          var poly2 = [], N3 = 64;
          for (var q3 = 0; q3 <= N3; q3++) {
            var a3 = Math.PI * 2 * q3 / N3;
            poly2.push([Math.cos(a3), Math.sin(a3)]);
          }
          out.fill = poly2;                     // великий круг у кулі — сам обрис
        }
        if (out.fill) {
          for (var q4 = 0; q4 < out.fill.length; q4++) {
            var p1 = out.fill[q4], p2 = out.fill[(q4 + 1) % out.fill.length];
            out.visible.push([p1[0], p1[1], p2[0], p2[1]]);
          }
        }
      }
    }

    return out;
  };

  S.RSEC = { axial: 'Осьовий переріз', parallel: 'Переріз, паралельний основі' };

  /* ============================================================
     Побудови на тілі
     ============================================================

     Усе рахується в просторі, а не на картинці. Тому висота лишається
     висотою під будь-яким кутом, а переріз — справжнім перерізом, а не
     чотирикутником, домальованим на око. Проєкція застосовується в самому
     кінці, одна на все. */

  function centroid(list) {
    var c = [0, 0, 0];
    list.forEach(function (p) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; });
    return [c[0] / list.length, c[1] / list.length, c[2] / list.length];
  }

  function mid3(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; }

  /** Усі ребра тіла, кожне один раз. */
  function edgesOf(m) {
    var seen = {}, out = [];
    m.f.forEach(function (face) {
      for (var i = 0; i < face.length; i++) {
        var a = face[i], b = face[(i + 1) % face.length];
        var key = Math.min(a, b) + '-' + Math.max(a, b);
        if (seen[key]) continue;
        seen[key] = 1;
        out.push([Math.min(a, b), Math.max(a, b)]);
      }
    });
    return out;
  }

  /**
   * Точки, через які має сенс проводити переріз: вершини й середини ребер.
   *
   * Саме ці дві множини й трапляються в задачах. Довільна точка в просторі
   * теоретично можлива, але задати її мишею на плоскому екрані неможливо
   * без здогадок, а здогадки в геометрії гірші за відсутність можливості.
   */
  S.pointsOf = function (kind, moved) {
    var def = S.KINDS[kind];
    if (!def || def.round) return [];

    var m = def.make();
    if (moved) Object.keys(moved).forEach(function (i) {
      if (m.v[Number(i)]) m.v[Number(i)] = moved[i].slice();
    });
    var out = m.v.map(function (p, i) {
      return { id: 'v' + i, name: m.names[i] || ('P' + i), p: p };
    });

    edgesOf(m).forEach(function (e) {
      out.push({
        id: 'm' + e[0] + '_' + e[1],
        name: 'сер. ' + (m.names[e[0]] || '') + (m.names[e[1]] || ''),
        p: mid3(m.v[e[0]], m.v[e[1]])
      });
    });
    return out;
  };

  function pointById(kind, id, moved) {
    var all = S.pointsOf(kind, moved);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i].p;
    return null;
  }

  /**
   * Переріз тіла площиною через три точки.
   *
   * Для кожної грані дивимось, з якого боку від площини лежать її вершини,
   * і беремо ребра, які площину перетинають. Для опуклого тіла кожна грань
   * дає рівно один відрізок, а разом вони складаються в многокутник —
   * точний, а не намальований на око.
   */
  S.section = function (kind, ids, moved) {
    var def = S.KINDS[kind];
    if (!def || def.round || !ids || ids.length < 3) return null;

    var A = pointById(kind, ids[0], moved), B = pointById(kind, ids[1], moved),
        C = pointById(kind, ids[2], moved);
    if (!A || !B || !C) return null;

    var u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    var w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    var n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    var len = Math.hypot(n[0], n[1], n[2]);
    if (len < 1e-9) return null;                 // три точки на одній прямій
    n = [n[0] / len, n[1] / len, n[2] / len];

    function dist(p) {
      return n[0] * (p[0] - A[0]) + n[1] * (p[1] - A[1]) + n[2] * (p[2] - A[2]);
    }

    var m = def.make();
    if (moved) Object.keys(moved).forEach(function (i) {
      if (m.v[Number(i)]) m.v[Number(i)] = moved[i].slice();
    });
    var d = m.v.map(dist);
    var EPS = 1e-9;
    var segs = [];

    m.f.forEach(function (face) {
      var hit = [];
      for (var i = 0; i < face.length; i++) {
        var a = face[i], b = face[(i + 1) % face.length];
        var da = d[a], db = d[b];

        if (Math.abs(da) < EPS) { hit.push(m.v[a]); continue; }   // вершина на площині
        if ((da < 0) !== (db < 0) && Math.abs(db) >= EPS) {
          var t = da / (da - db);
          hit.push([m.v[a][0] + (m.v[b][0] - m.v[a][0]) * t,
                    m.v[a][1] + (m.v[b][1] - m.v[a][1]) * t,
                    m.v[a][2] + (m.v[b][2] - m.v[a][2]) * t]);
        }
      }
      // прибираємо збіги: вершину на площині ловлять обидва суміжні ребра
      var uniq = [];
      hit.forEach(function (p) {
        for (var i = 0; i < uniq.length; i++) {
          if (Math.hypot(p[0] - uniq[i][0], p[1] - uniq[i][1], p[2] - uniq[i][2]) < 1e-7) return;
        }
        uniq.push(p);
      });
      if (uniq.length === 2) segs.push([uniq[0], uniq[1]]);
    });

    if (segs.length < 3) return null;

    /* Зшиваємо відрізки в многокутник: кожен наступний починається там, де
       скінчився попередній. Без цього заливка виглядала б як зірка. */
    var poly = [segs[0][0], segs[0][1]];
    var used = { 0: 1 };
    for (var step = 1; step < segs.length; step++) {
      var tail = poly[poly.length - 1], found = -1;
      for (var i = 0; i < segs.length; i++) {
        if (used[i]) continue;
        var s0 = segs[i][0], s1 = segs[i][1];
        if (Math.hypot(tail[0] - s0[0], tail[1] - s0[1], tail[2] - s0[2]) < 1e-6) { found = i; poly.push(s1); break; }
        if (Math.hypot(tail[0] - s1[0], tail[1] - s1[1], tail[2] - s1[2]) < 1e-6) { found = i; poly.push(s0); break; }
      }
      if (found < 0) break;
      used[found] = 1;
    }
    // кінець зійшовся з початком — замикання не дублюємо
    if (poly.length > 2) {
      var f0 = poly[0], fl = poly[poly.length - 1];
      if (Math.hypot(f0[0] - fl[0], f0[1] - fl[1], f0[2] - fl[2]) < 1e-6) poly.pop();
    }

    /* Точки посеред прямої сторони прибираємо. Вони зʼявляються там, де
       площина проходить рівно через ребро: сусідні грані дають два
       відрізки на одній прямій, і переріз ABC₁ у куба виглядав би
       шестикутником, хоча це чотирикутник ABC₁D₁. */
    var clean = [];
    for (var q = 0; q < poly.length; q++) {
      var pv = poly[(q - 1 + poly.length) % poly.length];
      var cv = poly[q];
      var nv = poly[(q + 1) % poly.length];
      var e1 = [cv[0] - pv[0], cv[1] - pv[1], cv[2] - pv[2]];
      var e2 = [nv[0] - cv[0], nv[1] - cv[1], nv[2] - cv[2]];
      var cr = [e1[1] * e2[2] - e1[2] * e2[1],
                e1[2] * e2[0] - e1[0] * e2[2],
                e1[0] * e2[1] - e1[1] * e2[0]];
      if (Math.hypot(cr[0], cr[1], cr[2]) > 1e-7) clean.push(cv);
    }
    if (clean.length >= 3) poly = clean;

    return { poly: poly, normal: n };
  };

  /**
   * Висота, діагоналі, апофема — у просторі.
   *
   * Повертає відрізки в тривимірних координатах; куди вони ляжуть на
   * екрані, вирішує та сама проєкція, що й для ребер.
   */
  S.cons = function (kind, spec, moved) {
    var def = S.KINDS[kind];
    if (!def || def.round || !spec) return [];

    var m = def.make();
    if (moved) Object.keys(moved).forEach(function (i) {
      if (m.v[Number(i)]) m.v[Number(i)] = moved[i].slice();
    });
    var base = m.f[0].slice().reverse();          // нижня грань, у прямому порядку
    var nb = base.length;
    var bc = centroid(base.map(function (i) { return m.v[i]; }));

    if (spec.k === 'height') {
      var apex = m.names[m.v.length - 1] === 'S'
        ? m.v[m.v.length - 1]
        : centroid(m.f[1].map(function (i) { return m.v[i]; }));
      return [[apex, bc]];
    }

    if (spec.k === 'apothem') {
      if (m.names[m.v.length - 1] !== 'S') return [];
      var i0 = (spec.i || 0) % nb;
      var mp = mid3(m.v[base[i0]], m.v[base[(i0 + 1) % nb]]);
      return [[m.v[m.v.length - 1], mp], [bc, mp]];
    }

    if (spec.k === 'basediag') {
      var out = [];
      for (var i = 0; i < nb; i++) {
        for (var j = i + 2; j < nb; j++) {
          if (i === 0 && j === nb - 1) continue;   // це сторона, а не діагональ
          out.push([m.v[base[i]], m.v[base[j]]]);
        }
      }
      return out;
    }

    if (spec.k === 'diag') {
      /* Просторова діагональ є лише там, де верх повторює низ: у призми чи
         паралелепіпеда. У піраміди її немає, і вигадувати нічого не будемо. */
      if (m.v.length !== nb * 2) return [];
      var k = Math.floor(nb / 2);
      return [[m.v[base[0]], m.v[nb + ((base[0] + k) % nb)]]];
    }

    return [];
  };

  S.CONS = {
    height:   'Висота',
    apothem:  'Апофема',
    basediag: 'Діагоналі основи',
    diag:     'Просторова діагональ'
  };

  /** Спроєктувати довільні відрізки простору тими самими кутами, що й тіло. */
  S.projectSegs = function (segs, yaw, pitch) {
    return segs.map(function (s) {
      var a = project(s[0], yaw, pitch), b = project(s[1], yaw, pitch);
      return [a[0], a[1], b[0], b[1]];
    });
  };

  S.projectPoly = function (poly, yaw, pitch) {
    return poly.map(function (p) {
      var q = project(p, yaw, pitch);
      return [q[0], q[1]];
    });
  };

  window.Solids = S;
})();
