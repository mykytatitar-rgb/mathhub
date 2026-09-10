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
  S.build = function (kind, yaw, pitch) {
    var def = S.KINDS[kind];
    if (!def || def.round) return null;

    var m = def.make();
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
  S.buildRound = function (kind, pitch) {
    var k = Math.abs(Math.sin(pitch));          // сплюснутість основи від нахилу
    var ry = Math.max(0.06, k);
    var out = { visible: [], hidden: [], labels: [], ellipses: [] };

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

    return out;
  };

  window.Solids = S;
})();
