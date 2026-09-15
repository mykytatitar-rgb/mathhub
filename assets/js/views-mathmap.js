/* Карта математики — моя, а не учнівська.

   Три погляди на те саме:
     «Де я»    — на якому рівні я зараз і що вже можна брати далі;
     «Карта»   — уся математика колом: у центрі основи, назовні вершини;
     «Роудмап» — рівні один за одним, від лічби до досліджень.

   Позначка теми — чотири стани: не вивчено, вивчаю, знаю, можу пояснити.
   Останній не прикраса: репетитору важливо не лише знати тему, а й уміти
   її донести, і це різні речі.

   Сама карта — у mathmap-data.js, однакова для всіх. Позначки — у сховищі,
   запис на тему, і синхронізуються так само, як учні й уроки. */

(function () {
  'use strict';

  var U = window.U, S = window.S, C = window.C, icon = window.icon;
  var V = window.V;
  var MAP = window.MATH_MAP;
  if (!MAP) return;

  function $(sel, root) { return (root || document).querySelector(sel); }
  var esc = U.esc;
  var pl = U.pl;

  /* ============================================================
     Покажчики й перевірка даних
     ============================================================ */

  var byId = {}, secById = {}, domById = {}, unlocks = {};
  MAP.domains.forEach(function (d) { domById[d.id] = d; });
  MAP.sections.forEach(function (s, i) { s.order = i; secById[s.id] = s; });
  MAP.topics.forEach(function (t, i) { t.order = i; byId[t.id] = t; unlocks[t.id] = []; });
  MAP.topics.forEach(function (t) {
    t.req.forEach(function (r) { if (unlocks[r]) unlocks[r].push(t.id); });
  });

  function secOf(t) { return secById[t.section]; }
  function domOf(t) { return domById[secOf(t).domain]; }
  function stageOf(k) { return MAP.stages[k - 1]; }

  /* Карта — вручну написані дані, і одна описка тихо ламала б звʼязки.
     Тому перевіряємо один раз при завантаженні й кажемо про помилку вголос. */
  var ERRORS = (function () {
    var errs = [];
    MAP.topics.forEach(function (t) {
      if (!secById[t.section]) errs.push('тема «' + t.id + '» посилається на невідомий розділ');
      t.req.forEach(function (r) {
        if (!byId[r]) errs.push('тема «' + t.id + '» спирається на невідому «' + r + '»');
        else if (byId[r].stage > t.stage) errs.push('«' + t.id + '» спирається на вищий рівень «' + r + '»');
      });
    });
    var mark = {};
    function walk(id, depth) {
      if (depth > 400 || mark[id] === 1) return true;
      if (mark[id] === 2) return false;
      mark[id] = 1;
      var bad = (byId[id] ? byId[id].req : []).some(function (r) { return walk(r, depth + 1); });
      mark[id] = 2;
      return bad;
    }
    MAP.topics.forEach(function (t) { if (walk(t.id, 0)) errs.push('цикл залежностей через «' + t.id + '»'); });
    if (errs.length) console.error('Карта математики:', errs);
    return errs;
  })();

  /* ============================================================
     Стан і прогрес
     ============================================================ */

  var STATUS = S.MAP_STATUS;
  var WEIGHT = [0, 0.35, 1, 1];        // «вивчаю» — уже рух, але ще не знання
  var PASS = 0.8;                      // рівень пройдено, коли покрито 80%

  function st(id) { return S.mapStatus(id); }
  function known(id) { return st(id) >= 2; }
  function open(t) { return t.req.every(known); }

  function statsOf(list) {
    var c = [0, 0, 0, 0], w = 0;
    list.forEach(function (t) { var s = st(t.id); c[s]++; w += WEIGHT[s]; });
    return { n: list.length, c: c, known: c[2] + c[3], pct: list.length ? w / list.length : 0 };
  }

  function stageTopics(k) { return MAP.topics.filter(function (t) { return t.stage === k; }); }

  /** Рівень, на якому я зараз: перший, що ще не покритий на 80%. 7 — усе пройдено. */
  function currentStage() {
    for (var k = 1; k <= 6; k++) if (statsOf(stageTopics(k)).pct < PASS) return k;
    return 7;
  }

  /** Що можна брати наступним: ще не почате, а все, на що спирається, — знаю. */
  function frontier() {
    return MAP.topics.filter(function (t) { return st(t.id) === 0 && open(t); })
      .sort(function (a, b) {
        return a.stage - b.stage || unlocks[b.id].length - unlocks[a.id].length || a.order - b.order;
      });
  }

  /* ============================================================
     Значок стану
     ============================================================

     Колір — домен, заповнення — стан. Так на карті видно водночас і де
     тема живе, і наскільки вона моя, без другої веселки кольорів. */

  function glyphInner(s, c) {
    if (s === 1) return '<circle cx="8" cy="8" r="5.6" fill="#fff" stroke="' + c + '" stroke-width="1.8"/>' +
                        '<path d="M8 2.4A5.6 5.6 0 0 0 8 13.6Z" fill="' + c + '"/>';
    if (s === 2) return '<circle cx="8" cy="8" r="6.4" fill="' + c + '"/>';
    if (s === 3) return '<circle cx="8" cy="8" r="7.1" fill="none" stroke="' + c + '" stroke-width="1.6"/>' +
                        '<circle cx="8" cy="8" r="4.3" fill="' + c + '"/>';
    return '<circle cx="8" cy="8" r="5.6" fill="#fff" stroke="' + c + '" stroke-width="1.8" stroke-opacity=".6"/>';
  }
  function glyph(s, c, size) {
    size = size || 15;
    return '<svg class="mm-g" viewBox="0 0 16 16" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      glyphInner(s, c) + '</svg>';
  }

  /* ============================================================
     Сторінка
     ============================================================ */

  var selected = null;
  var lastQuery = {};

  function tabOf(query) {
    var v = query && query.v;
    return v === 'map' || v === 'road' ? v : 'home';
  }

  V.mathmap = function (query) {
    lastQuery = query || {};
    var tab = tabOf(lastQuery);

    var tabs = [['home', 'Де я'], ['map', 'Карта'], ['road', 'Роудмап']].map(function (x) {
      return '<button class="tab' + (tab === x[0] ? ' is-active' : '') + '" data-mm="tab" data-arg="' + x[0] + '">' +
        x[1] + '</button>';
    }).join('');

    var body = tab === 'map' ? mapShell() : tab === 'road' ? roadHtml() : homeHtml();

    return C.hero({
      short: true,
      title: 'Карта математики',
      sub: 'уся математика — і де в ній я'
    }) +
    '<div class="page mm mm--' + tab + '">' +
      (ERRORS.length
        ? '<div class="card mm-err"><b>У даних карти є помилки</b> — частина звʼязків може показуватися неправильно:<br>' +
          ERRORS.slice(0, 6).map(esc).join('<br>') + '</div>'
        : '') +
      '<div class="mm-bar">' +
        '<div class="tabs">' + tabs + '</div>' +
        '<div class="mm-search">' + icon('search', 16) +
          '<input id="mm-q" type="search" placeholder="Знайти тему…  ( / )" autocomplete="off" spellcheck="false">' +
          '<div class="mm-qlist" id="mm-qlist" hidden></div>' +
        '</div>' +
      '</div>' +
      body +
    '</div>' +
    '<aside class="mm-drawer" id="mm-drawer" hidden></aside>';
  };

  /** Перемалювати лише свою сторінку — без сайдбара й без стрибка догори. */
  function rerender() {
    var main = document.getElementById('main');
    if (!main || !$('.mm', main)) return;
    var y = window.scrollY;
    main.innerHTML = V.mathmap(lastQuery);
    V.mountMathmap();
    window.scrollTo(0, y);
    navCount();
  }

  /* Лічильник у меню — теми, які зараз вивчаю. Сайдбар тут не
     перемальовуємо, тож число підправляємо на місці, щоб воно не
     відставало до наступного переходу. */
  function navCount() {
    var btn = document.querySelector('.nav-item[data-arg="#/mathmap"]');
    if (!btn) return;
    var n = (S.db().mathmap || []).filter(function (m) { return Number(m.s) === 1; }).length;
    var el = btn.querySelector('.nav-item__count');
    if (!n) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('span'); el.className = 'nav-item__count'; btn.appendChild(el); }
    el.textContent = n;
  }

  /* ============================================================
     Де я
     ============================================================ */

  function progressBar(stats) {
    var k = stats.n ? stats.known / stats.n * 100 : 0;
    var l = stats.n ? stats.c[1] / stats.n * 100 : 0;
    return '<div class="mm-progress"><i style="width:' + k + '%;background:var(--ink)"></i>' +
           '<i style="width:' + l + '%;background:var(--amber)"></i></div>';
  }

  function topicRow(t, tag) {
    var d = domOf(t);
    return '<button class="mm-row" data-mm="open" data-arg="' + t.id + '">' + glyph(st(t.id), d.color, 17) +
      '<span class="mm-row__name">' + esc(t.name) +
        '<small>' + esc(d.name) + ' · ' + esc(secOf(t).name) + '</small></span>' +
      (tag ? '<span class="mm-row__tag">' + tag + '</span>' : '') + '</button>';
  }

  function homeHtml() {
    var cs = currentStage();
    var all = statsOf(MAP.topics);
    var stats = MAP.stages.map(function (s) { return statsOf(stageTopics(s.id)); });
    var marked = MAP.topics.filter(function (t) { return st(t.id) > 0; }).length;

    /* ---- Я тут ---- */
    var here;
    if (cs === 7) {
      here = '<div class="mm-here__eyebrow">Я тут</div>' +
        '<div class="mm-here__title">Усі шість рівнів пройдено</div>' +
        '<div class="mm-here__hint">Далі — глибина: вершини, які ще не мої.</div>';
    } else {
      var Sg = stageOf(cs), ss = stats[cs - 1];
      var need = Math.max(0, Math.ceil(PASS * ss.n - (ss.known + ss.c[1] * WEIGHT[1])));
      here = '<div class="mm-here__eyebrow">Я тут · рівень ' + cs + ' з 6</div>' +
        '<div class="mm-here__title">' + esc(Sg.name) + '</div>' +
        '<div class="mm-here__hint">' + esc(Sg.hint) + '</div>' +
        '<div class="mm-here__row">' + progressBar(ss) +
          '<span class="mm-here__pct">' + Math.round(ss.pct * 100) + '%</span></div>' +
        '<div class="mm-here__note">Знаю ' + ss.known + ' з ' + pl(ss.n, 'теми', 'тем', 'тем') + ' цього рівня' +
          (ss.c[1] ? ', ще ' + ss.c[1] + ' вивчаю' : '') + '. ' +
          (need ? 'Рівень пройдено від 80% — бракує приблизно ' + pl(need, 'теми', 'тем', 'тем') + '.'
                : 'Ще трохи — і рівень пройдено.') + '</div>';
    }

    /* ---- Кільце загального прогресу ---- */
    var R = 46, CIRC = 2 * Math.PI * R;
    var kLen = all.known / all.n * CIRC, lLen = all.c[1] / all.n * CIRC;
    var ring = '<svg width="116" height="116" viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="#EEEDF6" stroke-width="12"/>' +
      '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="#E07C0B" stroke-width="12"' +
        ' stroke-dasharray="' + (kLen + lLen) + ' ' + CIRC + '" transform="rotate(-90 60 60)"/>' +
      '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="#17163A" stroke-width="12"' +
        ' stroke-dasharray="' + kLen + ' ' + CIRC + '" transform="rotate(-90 60 60)"/>' +
      '</svg>';
    var legend = [3, 2, 1, 0].map(function (s) {
      return '<div>' + glyph(s, '#17163A', 14) + esc(STATUS[s]) + '<b>' + all.c[s] + '</b></div>';
    }).join('');

    /* ---- Лінія рівнів ---- */
    var fill = cs === 7 ? 100 : (cs - 1) / 5 * 100;
    var stations = MAP.stages.map(function (s, i) {
      var p = stats[i].pct;
      var cls = (p >= PASS ? ' is-done' : '') + (s.id === cs ? ' is-here' : '');
      return '<button class="mm-station' + cls + '" data-mm="stage" data-arg="' + s.id + '">' +
        (s.id === cs ? '<span class="mm-station__here">я тут</span>' : '') +
        '<span class="mm-station__dot">' + (p >= PASS ? '✓' : s.id) + '</span>' +
        '<span class="mm-station__name">' + esc(s.name) + '</span>' +
        '<span class="mm-station__pct">' + Math.round(p * 100) + '%</span></button>';
    }).join('');

    /* ---- Швидкий старт ---- */
    var quick = '';
    if (marked === 0) {
      quick = '<div class="card mm-quick"><h3 class="mm-h3">Швидкий старт</h3>' +
        '<div class="mm-sub">Щоб карта показала, де я, варто відмітити рівні, які вже пройдено. Окремі теми потім ' +
        'уточню — позначка на рівні лише перший начерк.</div>' +
        MAP.stages.map(function (s) {
          return '<div class="mm-qrow"><div class="mm-qrow__name"><b>' + s.id + ' · ' + esc(s.name) + '</b>' +
            '<small>' + esc(s.hint) + ' · ' + pl(stats[s.id - 1].n, 'тема', 'теми', 'тем') + '</small></div>' +
            '<button class="btn btn--soft btn--sm" data-mm="bulk" data-arg="' + s.id + ':2">Знаю все</button>' +
            '<button class="btn btn--soft btn--sm" data-mm="bulk" data-arg="' + s.id + ':3">Можу пояснити все</button></div>';
        }).join('') + '</div>';
    }

    /* ---- Наступні кроки й поточне ---- */
    var next = frontier().slice(0, 8);
    var nextHtml = next.length
      ? next.map(function (t) {
          var u = unlocks[t.id].length;
          return topicRow(t, 'рівень ' + t.stage + (u ? ' · відкриє ' + u : ''));
        }).join('')
      : '<div class="mm-empty">Відкритих, але не почато тем немає — або все пройдено, або бракує позначок на попередніх темах.</div>';

    var learning = MAP.topics.filter(function (t) { return st(t.id) === 1; })
      .sort(function (a, b) {
        return String((S.mapEntry(b.id) || {}).at || '').localeCompare(String((S.mapEntry(a.id) || {}).at || ''));
      });
    var learnHtml = learning.length
      ? learning.slice(0, 10).map(function (t) { return topicRow(t, 'рівень ' + t.stage); }).join('') +
        (learning.length > 10 ? '<div class="mm-empty">і ще ' + (learning.length - 10) + '</div>' : '')
      : '<div class="mm-empty">Тема з позначкою «Вивчаю» зʼявиться тут, щоб не губилась.</div>';

    /* ---- Домени ---- */
    var doms = MAP.domains.map(function (d) {
      var list = MAP.topics.filter(function (t) { return domOf(t) === d; });
      var s = statsOf(list);
      return '<div class="mm-drow"><div class="mm-drow__name"><span class="mm-drow__sw" style="background:' + d.color + '"></span>' +
        esc(d.name) + '</div>' +
        '<div class="mm-progress"><i style="width:' + (s.known / s.n * 100) + '%;background:' + d.color + '"></i>' +
        '<i style="width:' + (s.c[1] / s.n * 100) + '%;background:' + d.color + ';opacity:.35"></i></div>' +
        '<div class="mm-drow__n">' + s.known + ' / ' + s.n + '</div></div>';
    }).join('');

    return '<div class="mm-hero">' +
        '<div class="card mm-here">' + here + '</div>' +
        '<div class="card"><h3 class="mm-h3">Уся математика</h3><div class="mm-sub">' + pl(all.n, 'тема', 'теми', 'тем') +
          ' на шести рівнях</div>' +
          '<div class="mm-ring">' + ring + '<div><div class="mm-ring__big">' + Math.round(all.known / all.n * 100) + '%</div>' +
          '<div class="muted small" style="margin-bottom:10px">знаю</div><div class="mm-ring__legend">' + legend + '</div></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="card mm-metro"><div class="mm-metro__track"><div class="mm-metro__line"><div class="mm-metro__fill" style="width:' +
        fill + '%"></div></div>' + stations + '</div></div>' +
      quick +
      '<div class="grid grid--2">' +
        '<div class="card"><h3 class="mm-h3">Наступні кроки</h3><div class="mm-sub">Теми, для яких уже все є: жодна не спирається на незнане.</div>' +
          '<div class="mm-list">' + nextHtml + '</div></div>' +
        '<div class="card"><h3 class="mm-h3">Зараз вивчаю</h3><div class="mm-sub">Позначене «Вивчаю» — найсвіжіше вгорі.</div>' +
          '<div class="mm-list">' + learnHtml + '</div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:18px"><h3 class="mm-h3">За доменами</h3><div class="mm-sub">Темне — знаю, світле — вивчаю.</div>' +
        doms + '</div>';
  }

  /* ============================================================
     Роудмап
     ============================================================ */

  function roadHtml() {
    var cs = currentStage();
    var legend = '<div class="mm-legend">' +
      [0, 1, 2, 3].map(function (s) { return '<span>' + glyph(s, '#17163A', 15) + esc(STATUS[s]) + '</span>'; }).join('') +
      '<span><span class="mm-chip is-next">можна брати</span></span>' +
      '<span><span class="mm-chip is-locked">ще закрита</span></span></div>';

    var lanes = MAP.stages.map(function (Sg) {
      var list = stageTopics(Sg.id);
      var s = statsOf(list);
      var cls = (s.pct >= PASS ? ' is-done' : '') + (Sg.id === cs ? ' is-here' : '');

      var groups = MAP.domains.map(function (d) {
        var mine = list.filter(function (t) { return domOf(t) === d; })
          .sort(function (a, b) { return secOf(a).order - secOf(b).order || a.order - b.order; });
        if (!mine.length) return '';
        return '<div class="mm-dom"><div class="mm-dom__name" style="color:' + d.color + '">' + esc(d.name) + '</div>' +
          '<div class="mm-chips">' + mine.map(function (t) {
            var sv = st(t.id), op = open(t);
            var c = (sv === 0 && !op ? ' is-locked' : '') + (sv === 0 && op ? ' is-next' : '') +
                    (selected === t.id ? ' is-sel' : '');
            var title = sv === 0 && !op
              ? 'Спершу: ' + t.req.filter(function (r) { return !known(r); }).map(function (r) { return byId[r].name; }).join(', ')
              : t.inside;
            return '<button class="mm-chip' + c + '" data-mm="open" data-arg="' + t.id + '" title="' + esc(title) + '">' +
              glyph(sv, selected === t.id ? '#fff' : d.color, 14) + esc(t.name) + '</button>';
          }).join('') + '</div></div>';
      }).join('');

      return '<section class="mm-lane' + cls + '" id="mm-lane-' + Sg.id + '">' +
        '<div class="mm-lane__rail"><div class="mm-lane__dot">' + (s.pct >= PASS ? '✓' : Sg.id) + '</div></div>' +
        '<div class="card">' +
          '<div class="mm-lane__head">' +
            '<span class="mm-lane__title">Рівень ' + Sg.id + ' · ' + esc(Sg.name) + '</span>' +
            '<span class="mm-lane__hint">' + esc(Sg.hint) + '</span>' +
            (Sg.id === cs ? '<span class="mm-lane__here">я тут</span>' : '') +
            '<span class="mm-lane__prog">' + progressBar(s) + '<b>' + s.known + ' / ' + s.n + '</b></span>' +
          '</div>' +
          '<div class="mm-lane__acts">' +
            '<button class="btn btn--ghost btn--sm" data-mm="bulk" data-arg="' + Sg.id + ':2">Позначити все «Знаю»</button>' +
            '<button class="btn btn--ghost btn--sm" data-mm="bulk" data-arg="' + Sg.id + ':3">…«Можу пояснити»</button>' +
            '<button class="btn btn--ghost btn--sm" data-mm="bulk" data-arg="' + Sg.id + ':0">Скинути рівень</button>' +
          '</div>' +
          '<div class="mm-doms">' + groups + '</div>' +
        '</div></section>';
    }).join('');

    return legend + '<div class="mm-road">' + lanes + '</div>';
  }

  /* ============================================================
     Карта
     ============================================================

     Уся математика колом. У центрі — «Математика», навколо неї кільце
     доменів, далі розділи, а теми лежать на концентричних колах за рівнями:
     ближче до центру основи, далі — вершини. Тому межа того, що я знаю,
     на карті видна як кільце, і «де я» читається одним поглядом.

     Кут відраховуємо від півночі за годинниковою стрілкою. Нагорі лишається
     порожній клин — туди стають підписи рівнів. */

  var ORDER = ['arith', 'alg', 'top', 'geo', 'nt', 'an', 'found', 'prob', 'app', 'disc'];
  var TOP_GAP = 20, DOM_GAP = 3, SEC_GAP = 1.2;
  var R_ROOT = 150, R_BAND = 330, BAND_W = 64, R_SEC = 640;
  var BAND_FONT_MIN = 17, BAND_FONT_MAX = 28;
  function rTopic(stage) { return 900 + (stage - 1) * 100; }

  var LAYOUT = null;

  function polar(r, deg) {
    var a = deg * Math.PI / 180;
    return [r * Math.sin(a), -r * Math.cos(a)];
  }
  function f1(n) { return Math.round(n * 10) / 10; }

  function layout() {
    if (LAYOUT) return LAYOUT;
    var doms = ORDER.map(function (id) { return domById[id]; }).filter(Boolean);
    MAP.domains.forEach(function (d) { if (doms.indexOf(d) < 0) doms.push(d); });   // нові домени не губимо

    /* Скільки дуги дістається кожному домену.

       Пропорційно кількості тем — але не менше, ніж треба, щоб на кільці
       вмістилася назва. Інакше «Топологія» з шістьма темами мала б дугу
       завширшки з палець, і підпис на ній не прочитати. Решту кута ділять
       між собою великі домени. */
    var avail = 360 - TOP_GAP - DOM_GAP * (doms.length - 1);
    var degPerPx = 180 / (Math.PI * R_BAND);
    var info = doms.map(function (d) {
      var nSec = MAP.sections.filter(function (s) { return s.domain === d.id; }).length;
      var nT = MAP.topics.filter(function (t) { return secById[t.section].domain === d.id; }).length;
      var label = (d.short || d.name).length * 0.6 * BAND_FONT_MIN + 34;
      return { d: d, nT: nT, secGaps: SEC_GAP * Math.max(0, nSec - 1), min: label * degPerPx, fixed: false, span: 0 };
    });
    for (var pass = 0; pass < 8; pass++) {
      var free = avail, count = 0;
      info.forEach(function (x) { if (x.fixed) free -= x.span; else { free -= x.secGaps; count += x.nT; } });
      var base = free / Math.max(1, count);
      var changed = false;
      info.forEach(function (x) {
        if (x.fixed) return;
        x.span = x.nT * base + x.secGaps;
        if (x.span < x.min) { x.span = x.min; x.fixed = true; changed = true; }
      });
      if (!changed) break;
    }

    var L = { dom: {}, sec: {}, t: {} };
    var cursor = TOP_GAP / 2;
    info.forEach(function (x, di) {
      var d = x.d;
      var per = (x.span - x.secGaps) / Math.max(1, x.nT);
      if (di) cursor += DOM_GAP;
      var a0 = cursor;
      MAP.sections.filter(function (s) { return s.domain === d.id; }).forEach(function (s, si) {
        if (si) cursor += SEC_GAP;
        var s0 = cursor;
        MAP.topics.filter(function (t) { return t.section === s.id; })
          .sort(function (a, b) { return a.stage - b.stage || a.order - b.order; })
          .forEach(function (t) {
            L.t[t.id] = { a: cursor + per / 2, r: rTopic(t.stage) };
            cursor += per;
          });
        L.sec[s.id] = { a: (s0 + cursor) / 2, a0: s0, a1: cursor };
      });
      L.dom[d.id] = { a0: a0, a1: cursor, a: (a0 + cursor) / 2 };
    });
    LAYOUT = L;
    return L;
  }

  /* Дуга для підпису домену. Унизу кола текст ішов би догори ногами,
     тому там дугу ведемо у зворотний бік. */
  function arcPath(r, a0, a1, reverse) {
    var p0 = polar(r, reverse ? a1 : a0), p1 = polar(r, reverse ? a0 : a1);
    var large = (a1 - a0) > 180 ? 1 : 0;
    return 'M' + f1(p0[0]) + ' ' + f1(p0[1]) + ' A' + r + ' ' + r + ' 0 ' + large + ' ' + (reverse ? 0 : 1) +
      ' ' + f1(p1[0]) + ' ' + f1(p1[1]);
  }

  var VIEW = null;           // {tx, ty, k} — живе між перемальовками
  var svgEl = null, worldEl = null;

  function mapShell() {
    return '<div class="card mm-mapwrap">' +
        '<svg id="mm-svg" xmlns="http://www.w3.org/2000/svg"><g id="mm-world"></g></svg>' +
        '<div class="mm-mapui">' +
          '<div class="mm-zoom">' +
            '<button data-mm="zoom" data-arg="in" title="Наблизити">+</button>' +
            '<button data-mm="zoom" data-arg="out" title="Віддалити">−</button>' +
            '<button data-mm="zoom" data-arg="home" title="До центру">◎</button>' +
            '<button data-mm="zoom" data-arg="all" title="Показати всю карту">⤢</button>' +
          '</div>' +
          '<div class="mm-maplegend">' +
            [0, 1, 2, 3].map(function (s) { return '<div>' + glyph(s, '#17163A', 14) + esc(STATUS[s]) + '</div>'; }).join('') +
          '</div>' +
        '</div>' +
        '<div class="mm-maphint">Колесо — масштаб · тягни — рух · клік по темі — деталі</div>' +
      '</div>';
  }

  function mapBox() {
    var el = $('.mm-mapwrap');
    return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 1000, h: 640 };
  }

  function drawerSpace(b) { return selected && b.w > 900 ? 430 : 0; }

  function homeView() {
    var b = mapBox();
    var free = b.w - drawerSpace(b);
    var k = Math.min(free, b.h) / 2 / 640;
    return { tx: free / 2, ty: b.h / 2, k: Math.max(0.2, Math.min(k, 0.9)) };
  }

  function applyView() {
    if (!worldEl) return;
    worldEl.setAttribute('transform', 'translate(' + f1(VIEW.tx) + ',' + f1(VIEW.ty) + ') scale(' + VIEW.k.toFixed(4) + ')');
    svgEl.classList.toggle('lod-1', VIEW.k < 0.6);
    svgEl.classList.toggle('lod-2', VIEW.k < 0.22);
  }

  function worldMarkup() {
    var L = layout();
    var cs = currentStage();
    var out = [];

    out.push('<defs><marker id="mm-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">' +
      '<path d="M0 0L10 5L0 10z" fill="#17163A"/></marker></defs>');

    /* кільця рівнів */
    MAP.stages.forEach(function (Sg) {
      out.push('<circle class="mm-stagering' + (Sg.id === cs ? ' is-here' : '') + '" r="' + rTopic(Sg.id) + '"/>');
    });
    MAP.stages.forEach(function (Sg) {
      var r = rTopic(Sg.id), here = Sg.id === cs;
      var label = (here ? 'Я тут · ' : '') + Sg.id + ' · ' + Sg.name;
      var w = label.length * 9.6 + 28;
      out.push('<g class="mm-ringlbl' + (here ? ' is-here' : '') + '" transform="translate(0,' + (-r) + ')">' +
        '<rect x="' + f1(-w / 2) + '" y="-17" width="' + f1(w) + '" height="34" rx="17"/>' +
        '<text text-anchor="middle" dy="6">' + esc(label) + '</text></g>');
    });

    /* ребра: розділ → тема */
    MAP.topics.forEach(function (t) {
      var sp = L.sec[t.section], tp = L.t[t.id], d = domOf(t);
      var rm = (R_SEC + tp.r) / 2;
      var p0 = polar(R_SEC + 12, sp.a), c1 = polar(rm, sp.a), c2 = polar(rm, tp.a), p1 = polar(tp.r - 11, tp.a);
      out.push('<path class="mm-edge" data-e="' + t.id + '" stroke="' + d.color + '" d="M' + f1(p0[0]) + ' ' + f1(p0[1]) +
        ' C' + f1(c1[0]) + ' ' + f1(c1[1]) + ' ' + f1(c2[0]) + ' ' + f1(c2[1]) + ' ' + f1(p1[0]) + ' ' + f1(p1[1]) + '"/>');
    });

    /* спиці: кільце доменів → розділ, центр → домен */
    MAP.sections.forEach(function (s) {
      var sp = L.sec[s.id], d = domById[s.domain];
      var p0 = polar(R_BAND + BAND_W / 2, sp.a), p1 = polar(R_SEC - 12, sp.a);
      out.push('<path class="mm-edge" stroke="' + d.color + '" stroke-width="2.4" d="M' + f1(p0[0]) + ' ' +
        f1(p0[1]) + ' L' + f1(p1[0]) + ' ' + f1(p1[1]) + '"/>');
    });
    MAP.domains.forEach(function (d) {
      var dp = L.dom[d.id];
      var p0 = polar(R_ROOT, dp.a), p1 = polar(R_BAND - BAND_W / 2, dp.a);
      out.push('<path class="mm-edge" stroke="' + d.color + '" stroke-width="5" d="M' + f1(p0[0]) + ' ' + f1(p0[1]) +
        ' L' + f1(p1[0]) + ' ' + f1(p1[1]) + '"/>');
    });

    /* кільце доменів із підписами по дузі */
    MAP.domains.forEach(function (d) {
      var dp = L.dom[d.id];
      var span = dp.a1 - dp.a0;
      out.push('<path class="mm-band" data-dom="' + d.id + '" stroke="' + d.color + '" d="' +
        arcPath(R_BAND, dp.a0 - 0.2, dp.a1 + 0.2, false) + '"><title>' + esc(d.name) + '</title></path>');
      var mid = ((dp.a % 360) + 360) % 360;
      var rev = mid > 90 && mid < 270;
      var name = d.short || d.name;
      var arcLen = R_BAND * span * Math.PI / 180 - 30;
      var fs = Math.max(BAND_FONT_MIN, Math.min(BAND_FONT_MAX, arcLen / (name.length * 0.6)));
      out.push('<path id="mm-arc-' + d.id + '" fill="none" d="' + arcPath(R_BAND, dp.a0, dp.a1, rev) + '"/>');
      out.push('<text class="mm-bandlbl" style="font-size:' + f1(fs) + 'px" dy="' + f1(fs * 0.35) + '">' +
        '<textPath href="#mm-arc-' + d.id + '" startOffset="50%" text-anchor="middle">' + esc(name) + '</textPath></text>');
    });

    /* центр */
    var all = statsOf(MAP.topics);
    out.push('<g data-root="1" style="cursor:pointer"><circle class="mm-root" r="' + R_ROOT + '"/>' +
      '<text class="mm-roottxt" y="-8" style="font-size:34px">Математика</text>' +
      '<text class="mm-roottxt" y="30" style="font-size:19px;font-weight:600;opacity:.75">' +
        all.known + ' з ' + all.n + ' тем</text></g>');

    /* розділи */
    MAP.sections.forEach(function (s) {
      var sp = L.sec[s.id], d = domById[s.domain];
      var p = polar(R_SEC, sp.a);
      var phi = sp.a - 90;
      var right = ((sp.a % 360) + 360) % 360 < 180;
      var lbl = right
        ? '<text class="mm-seclbl" fill="' + d.color + '" text-anchor="end" dy="0.35em" transform="rotate(' + f1(phi) + ') translate(-20,0)">'
        : '<text class="mm-seclbl" fill="' + d.color + '" text-anchor="start" dy="0.35em" transform="rotate(' + f1(phi + 180) + ') translate(20,0)">';
      out.push('<g class="mm-sec" data-sec="' + s.id + '" transform="translate(' + f1(p[0]) + ',' + f1(p[1]) + ')">' +
        '<circle r="12" fill="' + d.color + '"/>' + lbl + esc(s.name) + '</text></g>');
    });

    /* теми */
    MAP.topics.forEach(function (t) {
      var tp = L.t[t.id], d = domOf(t);
      var p = polar(tp.r, tp.a);
      var phi = tp.a - 90;
      var right = ((tp.a % 360) + 360) % 360 < 180;
      var s = st(t.id);
      var lbl = right
        ? '<text class="mm-tlbl" text-anchor="start" dy="0.35em" transform="rotate(' + f1(phi) + ') translate(16,0)">'
        : '<text class="mm-tlbl" text-anchor="end" dy="0.35em" transform="rotate(' + f1(phi + 180) + ') translate(-16,0)">';
      out.push('<g class="mm-t' + (selected === t.id ? ' is-cur' : '') + '" data-id="' + t.id + '" transform="translate(' +
        f1(p[0]) + ',' + f1(p[1]) + ')">' +
        '<circle class="mm-hit" r="15"/>' +
        '<g transform="translate(-11,-11) scale(1.375)">' + glyphInner(s, d.color) + '</g>' +
        (selected === t.id ? '<circle class="mm-focusring" r="17"/>' : '') +
        lbl + esc(t.name) + '</text><title>' + esc(t.name + ' — ' + STATUS[s]) + '</title></g>');
    });

    out.push('<g id="mm-links"></g>');
    return out.join('');
  }

  /* Фокус на обраній темі: її звʼязки промальовуються, решта відходить. */
  function applyFocus() {
    if (!svgEl || !worldEl) return;
    var links = $('#mm-links');
    if (links) links.innerHTML = '';
    Array.prototype.forEach.call(worldEl.querySelectorAll('.hl'), function (el) { el.classList.remove('hl'); });

    if (!selected || !byId[selected]) { svgEl.classList.remove('is-focus'); return; }

    var L = layout(), t = byId[selected];
    var rel = [selected].concat(t.req, unlocks[selected]);
    svgEl.classList.add('is-focus');

    rel.forEach(function (id) {
      var n = worldEl.querySelector('.mm-t[data-id="' + id + '"]');
      if (n) n.classList.add('hl');
      var e = worldEl.querySelector('.mm-edge[data-e="' + id + '"]');
      if (e) e.classList.add('hl');
      var s = worldEl.querySelector('.mm-sec[data-sec="' + byId[id].section + '"]');
      if (s) s.classList.add('hl');
    });

    function link(fromId, toId, cls, color) {
      var a = L.t[fromId], b = L.t[toId];
      var p0 = polar(a.r, a.a), p1 = polar(b.r, b.a);
      // дуга прогинається до центру — так звʼязки не зливаються з радіальними ребрами
      var mx = (p0[0] + p1[0]) / 2 * 0.62, my = (p0[1] + p1[1]) / 2 * 0.62;
      var dx = p1[0] - mx, dy = p1[1] - my, dl = Math.hypot(dx, dy) || 1;
      var e1 = [p1[0] - dx / dl * 20, p1[1] - dy / dl * 20];
      var ex = p0[0] - mx, ey = p0[1] - my, el = Math.hypot(ex, ey) || 1;
      var s0 = [p0[0] - ex / el * 14, p0[1] - ey / el * 14];
      return '<path class="mm-link ' + cls + '"' + (color ? ' stroke="' + color + '"' : '') +
        (cls === 'mm-link--req' ? ' marker-end="url(#mm-arr)"' : '') +
        ' d="M' + f1(s0[0]) + ' ' + f1(s0[1]) + ' Q' + f1(mx) + ' ' + f1(my) + ' ' + f1(e1[0]) + ' ' + f1(e1[1]) + '"/>';
    }

    var html = t.req.map(function (r) { return link(r, selected, 'mm-link--req'); }).join('') +
      unlocks[selected].map(function (u) { return link(selected, u, 'mm-link--next', domOf(byId[u]).color); }).join('');
    if (links) links.innerHTML = html;
  }

  function redrawWorld() {
    if (!worldEl) return;
    worldEl.innerHTML = worldMarkup();
    applyView();
    applyFocus();
  }

  function zoomAt(mx, my, factor) {
    var k2 = Math.max(0.1, Math.min(3, VIEW.k * factor));
    var wx = (mx - VIEW.tx) / VIEW.k, wy = (my - VIEW.ty) / VIEW.k;
    VIEW.tx = mx - wx * k2;
    VIEW.ty = my - wy * k2;
    VIEW.k = k2;
    applyView();
  }

  /** Вмістити частину кола (кут від a0 до a1, радіус від r0 до r1) у вікно. */
  function fitSector(a0, a1, r0, r1) {
    var xs = [], ys = [];
    for (var i = 0; i <= 12; i++) {
      var a = a0 + (a1 - a0) * i / 12;
      [r0, r1].forEach(function (r) { var p = polar(r, a); xs.push(p[0]); ys.push(p[1]); });
    }
    var b = mapBox(), free = b.w - drawerSpace(b);
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var k = Math.min((free - 80) / (x1 - x0 || 1), (b.h - 80) / (y1 - y0 || 1));
    VIEW.k = Math.max(0.1, Math.min(k, 1.4));
    VIEW.tx = free / 2 - (x0 + x1) / 2 * VIEW.k;
    VIEW.ty = b.h / 2 - (y0 + y1) / 2 * VIEW.k;
    applyView();
  }

  function centerOnTopic(id) {
    var tp = layout().t[id];
    if (!tp || !VIEW) return;
    var p = polar(tp.r + 120, tp.a);             // трохи назовні — щоб і підпис уміщався
    var b = mapBox(), free = b.w - drawerSpace(b);
    VIEW.k = Math.max(VIEW.k, 0.85);
    VIEW.tx = free / 2 - p[0] * VIEW.k;
    VIEW.ty = b.h / 2 - p[1] * VIEW.k;
    applyView();
  }

  function bindMap() {
    var drag = null;

    svgEl.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = svgEl.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016));
    }, { passive: false });

    svgEl.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, tx: VIEW.tx, ty: VIEW.ty, moved: false, target: e.target };
      try { svgEl.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
    });
    svgEl.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      svgEl.classList.add('is-drag');
      VIEW.tx = drag.tx + dx;
      VIEW.ty = drag.ty + dy;
      applyView();
    });
    svgEl.addEventListener('pointerup', function () {
      if (!drag) return;
      var d = drag;
      drag = null;
      svgEl.classList.remove('is-drag');
      if (d.moved) return;

      var el = d.target;
      var t = el.closest && el.closest('[data-id]');
      if (t) { openTopic(t.getAttribute('data-id'), { keepView: true }); return; }

      var band = el.closest && el.closest('[data-dom]');
      if (band) {
        var dp = layout().dom[band.getAttribute('data-dom')];
        fitSector(dp.a0, dp.a1, R_BAND - 40, rTopic(6) + 260);
        return;
      }
      var sec = el.closest && el.closest('[data-sec]');
      if (sec) {
        var sp = layout().sec[sec.getAttribute('data-sec')];
        fitSector(sp.a0 - 1, sp.a1 + 1, R_SEC - 260, rTopic(6) + 300);
        return;
      }
      if (el.closest && el.closest('[data-root]')) { VIEW = homeView(); applyView(); return; }
      if (selected) closeDrawer();
    });
  }

  /** Після кожного рендеру сторінки: оживити карту й шухляду. */
  V.mountMathmap = function () {
    var root = $('.mm');
    if (!root) return;

    svgEl = $('#mm-svg');
    worldEl = $('#mm-world');
    if (svgEl && worldEl) {
      bindMap();
      if (!VIEW) VIEW = homeView();
      redrawWorld();
      var hint = $('.mm-maphint');
      if (hint) setTimeout(function () { hint.hidden = true; }, 6000);
    } else {
      svgEl = worldEl = null;
    }

    if (selected && byId[selected]) renderDrawer();
  };

  /* ============================================================
     Шухляда теми
     ============================================================ */

  var noteTimer = null;

  function openTopic(id, opts) {
    if (!byId[id]) return;
    selected = id;
    renderDrawer();
    if (svgEl && worldEl) {
      redrawWorld();
      if (!(opts && opts.keepView)) centerOnTopic(id);
    } else {
      rerender();
    }
  }

  function closeDrawer() {
    selected = null;
    var dr = $('#mm-drawer');
    if (dr) dr.hidden = true;
    if (svgEl && worldEl) redrawWorld();
    else if (tabOf(lastQuery) === 'road') rerender();
  }

  function renderDrawer() {
    var dr = $('#mm-drawer');
    var t = byId[selected];
    if (!dr) return;
    if (!t) { dr.hidden = true; return; }
    var d = domOf(t), Sg = stageOf(t.stage), s = st(t.id), e = S.mapEntry(t.id) || {};
    var tab = tabOf(lastQuery);

    function list(ids, empty) {
      if (!ids.length) return '<div class="mm-empty">' + empty + '</div>';
      return '<div class="mm-list">' + ids.map(function (id) {
        var x = byId[id], dx = domOf(x);
        return '<button class="mm-row" data-mm="open" data-arg="' + id + '">' + glyph(st(id), dx.color, 17) +
          '<span class="mm-row__name">' + esc(x.name) + '<small>' + esc(dx.name) + ' · рівень ' + x.stage + '</small></span></button>';
      }).join('') + '</div>';
    }

    var missing = t.req.filter(function (r) { return !known(r); });
    var hint = '';
    if (missing.length && s < 2) {
      hint = '<div class="mm-lock">Спершу варто закрити: ' +
        missing.map(function (r) { return '<b>' + esc(byId[r].name) + '</b>'; }).join(', ') + '.</div>';
    } else if (!missing.length && s === 0 && t.req.length) {
      hint = '<div class="mm-ok">Усе, на що ця тема спирається, я вже знаю — можна брати.</div>';
    }

    var when = e.at ? U.fmtDate(e.at) : '';

    dr.innerHTML =
      '<div class="mm-dr__head" style="--c:' + d.color + '">' +
        '<div class="mm-dr__crumb">' + esc(d.name) + ' › ' + esc(secOf(t).name) + '</div>' +
        '<button class="mm-dr__close" data-mm="close" title="Закрити (Esc)">' + icon('x', 18) + '</button>' +
        '<h2 class="mm-dr__title">' + esc(t.name) + '</h2>' +
        '<div class="mm-dr__stage">Рівень ' + t.stage + ' · ' + esc(Sg.name) + ' · ' + esc(Sg.hint) + '</div>' +
      '</div>' +
      '<div class="mm-dr__body">' +
        '<p class="mm-dr__inside">' + esc(t.inside) + '</p>' +
        '<div class="mm-seg">' + [0, 1, 2, 3].map(function (v) {
          return '<button class="' + (v === s ? 'is-on' : '') + '" data-mm="status" data-arg="' + v + '">' +
            glyph(v, v === s ? '#fff' : d.color, 18) + esc(STATUS[v]) + '</button>';
        }).join('') + '</div>' +
        hint +
        '<div class="mm-dr__h">Спирається на · ' + t.req.length + '</div>' +
        list(t.req, 'Ні на що — з цієї теми все починається.') +
        '<div class="mm-dr__h">Відкриває · ' + unlocks[t.id].length + '</div>' +
        list(unlocks[t.id], 'Далі на карті нічого — це одна з вершин.') +
        '<div class="mm-dr__h">Нотатка</div>' +
        '<textarea class="textarea mm-note" id="mm-note" placeholder="Що саме тут іще не моє, джерела, як пояснювати учням…">' +
          esc(e.note || '') + '</textarea>' +
        (when ? '<div class="mm-dr__meta">Змінено ' + esc(when) + '</div>' : '') +
        '<div class="mm-dr__foot">' +
          (tab !== 'map' ? '<button class="btn btn--soft btn--sm" data-mm="showmap">' + icon('target', 15) + 'Показати на карті</button>' : '') +
          (tab !== 'road' ? '<button class="btn btn--ghost btn--sm" data-mm="showroad">У роудмапі</button>' : '') +
        '</div>' +
      '</div>';
    dr.hidden = false;
  }

  /* ============================================================
     Масові позначки й «скасувати»
     ============================================================ */

  function bulk(stage, s) {
    var list = stageTopics(stage).filter(function (t) {
      if (s === 2) return st(t.id) < 2;          // «знаю все» не знижує тих, що «можу пояснити»
      return st(t.id) !== s;
    });
    if (!list.length) { U.toast('На цьому рівні вже все так позначено'); return; }

    var prev = list.map(function (t) {
      var e = S.mapEntry(t.id);
      return { id: t.id, s: e ? (Number(e.s) | 0) : 0, note: e ? (e.note || '') : '' };
    });
    S.setMapTopics(list.map(function (t) { return { id: t.id, s: s }; }));
    rerender();

    var what = s === 0 ? 'Скинуто' : 'Позначено «' + STATUS[s] + '»';
    showUndo(what + ': ' + pl(list.length, 'тема', 'теми', 'тем'), function () {
      S.setMapTopics(prev);
      rerender();
    });
  }

  /* Власне повідомлення з кнопкою: масова позначка чіпає десятки тем,
     і шлях назад має бути одним натисканням, а не сорока. */
  var undoTimer = null;
  function showUndo(msg, act) {
    var el = document.getElementById('mm-undo');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mm-undo';
      el.className = 'mm-undo';
      document.body.appendChild(el);
    }
    el.innerHTML = '<span>' + esc(msg) + '</span><button>Скасувати</button>';
    el.hidden = false;
    el.querySelector('button').onclick = function () { el.hidden = true; act(); };
    clearTimeout(undoTimer);
    undoTimer = setTimeout(function () { el.hidden = true; }, 8000);
  }

  /* ============================================================
     Пошук
     ============================================================ */

  function norm(s) { return String(s).toLowerCase().replace(/[’'`]/g, 'ʼ'); }
  MAP.topics.forEach(function (t) {
    t.hay = norm(t.name + ' ' + t.inside + ' ' + secOf(t).name + ' ' + domOf(t).name);
    t.nname = norm(t.name);
  });

  var qIndex = -1, qResults = [];

  function runSearch(input) {
    var q = norm(input.value.trim());
    var box = $('#mm-qlist');
    if (!box) return;
    if (!q) { box.hidden = true; qResults = []; return; }
    var words = q.split(/\s+/);
    qResults = MAP.topics.filter(function (t) {
      return words.every(function (w) { return t.hay.indexOf(w) >= 0; });
    }).sort(function (a, b) {
      function rank(t) { return t.nname.indexOf(q) === 0 ? 0 : t.nname.indexOf(q) >= 0 ? 1 : 2; }
      return rank(a) - rank(b) || a.stage - b.stage || a.order - b.order;
    }).slice(0, 12);
    qIndex = qResults.length ? 0 : -1;
    box.innerHTML = qResults.length
      ? qResults.map(function (t, i) {
          var d = domOf(t);
          return '<button class="mm-qitem' + (i === qIndex ? ' is-on' : '') + '" data-mm="pick" data-arg="' + t.id + '">' +
            glyph(st(t.id), d.color, 16) + '<span>' + esc(t.name) +
            '<small>' + esc(d.name) + ' · рівень ' + t.stage + '</small></span></button>';
        }).join('')
      : '<div class="mm-qempty">Нічого не знайдено</div>';
    box.hidden = false;
  }

  function pickSearch(id) {
    var box = $('#mm-qlist'), q = $('#mm-q');
    if (box) box.hidden = true;
    if (q) { q.value = ''; q.blur(); }
    openTopic(id);
  }

  /* ============================================================
     Події — делеговано, лише в межах цієї сторінки
     ============================================================ */

  function onPage() { return !!$('.mm'); }

  document.addEventListener('click', function (e) {
    if (!onPage()) return;
    var t = e.target;
    var b = t.closest && t.closest('[data-mm]');

    if (!b) {
      if (!t.closest('.mm-search')) { var box = $('#mm-qlist'); if (box) box.hidden = true; }
      return;
    }

    var act = b.getAttribute('data-mm'), arg = b.getAttribute('data-arg');

    if (act === 'tab') { window.App.setQuery({ v: arg === 'home' ? '' : arg }); return; }
    if (act === 'open') { openTopic(arg); return; }
    if (act === 'pick') { pickSearch(arg); return; }
    if (act === 'close') { closeDrawer(); return; }
    if (act === 'bulk') { var p = arg.split(':'); bulk(+p[0], +p[1]); return; }

    if (act === 'status' && selected) {
      S.setMapTopic(selected, { s: +arg });
      if (svgEl && worldEl) { redrawWorld(); renderDrawer(); navCount(); }
      else rerender();
      return;
    }

    if (act === 'stage') {
      window.App.setQuery({ v: 'road' });
      setTimeout(function () {
        var lane = document.getElementById('mm-lane-' + arg);
        if (lane) lane.scrollIntoView({ block: 'start' });
      }, 30);
      return;
    }

    if (act === 'showmap') {
      var id = selected;
      window.App.setQuery({ v: 'map' });
      setTimeout(function () { if (id) { selected = id; redrawWorld(); centerOnTopic(id); renderDrawer(); } }, 30);
      return;
    }
    if (act === 'showroad') {
      var sid = selected;
      window.App.setQuery({ v: 'road' });
      setTimeout(function () {
        var lane = sid && document.getElementById('mm-lane-' + byId[sid].stage);
        if (lane) lane.scrollIntoView({ block: 'start' });
      }, 30);
      return;
    }

    if (act === 'zoom' && VIEW) {
      var box2 = mapBox();
      if (arg === 'in') zoomAt(box2.w / 2, box2.h / 2, 1.35);
      if (arg === 'out') zoomAt(box2.w / 2, box2.h / 2, 1 / 1.35);
      if (arg === 'home') { VIEW = homeView(); applyView(); }
      if (arg === 'all') fitSector(0, 360, 0, rTopic(6) + 330);
    }
  });

  document.addEventListener('input', function (e) {
    if (!onPage()) return;
    if (e.target.id === 'mm-q') { runSearch(e.target); return; }
    if (e.target.id === 'mm-note' && selected) {
      var id = selected, text = e.target.value;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(function () { S.setMapTopic(id, { note: text }); }, 450);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!onPage()) return;
    var tag = (e.target && e.target.tagName) || '';
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable);
    if (document.querySelector('.modal-root:not([hidden])')) return;

    if (e.key === '/' && !typing) { e.preventDefault(); var q = $('#mm-q'); if (q) q.focus(); return; }

    if (e.target.id === 'mm-q') {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!qResults.length) return;
        qIndex = (qIndex + (e.key === 'ArrowDown' ? 1 : -1) + qResults.length) % qResults.length;
        Array.prototype.forEach.call(document.querySelectorAll('.mm-qitem'), function (el, i) {
          el.classList.toggle('is-on', i === qIndex);
        });
        return;
      }
      if (e.key === 'Enter' && qIndex >= 0) { e.preventDefault(); pickSearch(qResults[qIndex].id); return; }
      if (e.key === 'Escape') { var box = $('#mm-qlist'); if (box) box.hidden = true; e.target.blur(); return; }
    }
    if (e.key === 'Escape' && selected && !typing) closeDrawer();
  });

  /* Коли йдемо зі сторінки, обрана тема не має чекати на повернення:
     відкриваєш карту знову — і бачиш карту, а не вчорашню шухляду. */
  window.addEventListener('hashchange', function () {
    if (location.hash.indexOf('#/mathmap') !== 0) {
      selected = null;
      var dr = document.getElementById('mm-drawer');
      if (dr) dr.hidden = true;
      var u = document.getElementById('mm-undo');
      if (u) u.hidden = true;
    }
  });

  /** Для «Огляду» й перевірок: де я зараз. */
  V.mathmapSummary = function () {
    var cs = currentStage();
    return { stage: cs, name: cs === 7 ? 'Усе пройдено' : stageOf(cs).name, all: statsOf(MAP.topics) };
  };

  window.V = V;
})();
