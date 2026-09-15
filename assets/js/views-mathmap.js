/* Карта математики — моя й кожного учня.

   Три погляди на те саме:
     «Де я»    — на якому рівні зараз і що вже можна брати далі;
     «Карта»   — уся математика колом: у центрі основи, назовні вершини;
     «Роудмап» — рівні один за одним, від лічби до досліджень.

   Карта одна для всіх — у mathmap-data.js. Різниться лише те, чиї позначки
   на ній стоять: мої (розділ «Карта математики») чи учня (вкладка «Карта»
   в його картці). Тому весь код нижче питає не «який статус теми», а «який
   статус теми в того, чию карту зараз показано».

   Позначка — чотири стани. Для мене: не вивчено, вивчаю, знаю, можу
   пояснити — репетитору знати тему й уміти її донести не одне й те саме.
   Для учня: не вивчали, вивчаємо, знає, впевнено.

   Учнівська карта за замовчуванням обмежена шкільною програмою: для
   восьмикласника «знає 20% математики», порахованих разом із теорією
   Галуа, нічого не каже. Усю математику можна ввімкнути одним перемикачем. */

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
     Чия карта
     ============================================================ */

  var who = null;            // null — моя, інакше id учня
  var cache = null;          // позначки поточного власника: {тема: запис}

  function student() { return who ? S.get('students', who) : null; }
  function entries() { if (!cache) cache = S.mapEntries(who); return cache; }
  function entry(id) { return entries()[id] || null; }
  function st(id) { var e = entries()[id]; return e ? (Number(e.s) | 0) : 0; }
  function invalidate() { cache = null; }

  function setTopics(changes) {
    S.setMapTopics(changes, who);
    invalidate();
  }

  /** Слова, що залежать від того, чия це карта. */
  function T() {
    if (who) {
      var s = student();
      var first = s ? String(s.name || '').split(' ')[0] : 'учень';
      return {
        status: S.STUMAP_STATUS,
        here: 'Зараз тут',
        allDone: 'Намічену математику пройдено',
        allDoneHint: 'Можна розширити карту до всієї математики — перемикач угорі.',
        know: 'знає', learn: 'вивчає',
        learningTitle: 'Зараз вивчає',
        learningSub: 'Позначене «Вивчаємо» — найсвіжіше вгорі.',
        learningEmpty: 'Тема з позначкою «Вивчаємо» зʼявиться тут, щоб не губилась.',
        nextSub: 'Теми, для яких у ' + esc(first) + ' уже все є: жодна не спирається на незнане.',
        bulkKnow: 'Знає все', bulkSure: 'Впевнено все',
        laneKnow: 'Позначити все «Знає»', laneSure: '…«Впевнено»',
        quickSub: 'Щоб карта показала, де ' + esc(first) + ', відмітьте рівні, які вже пройдено. Окремі теми потім ' +
          'уточните — позначка на рівні лише перший начерк.',
        okHint: 'Усе, на що ця тема спирається, учень уже знає — можна брати.',
        notePh: 'Де плутається, які задачі давали, що повторити…',
        ringDark: 'Темне — знає, світле — вивчає.',
        rootWord: 'знає'
      };
    }
    return {
      status: S.MAP_STATUS,
      here: 'Я тут',
      allDone: 'Усі шість рівнів пройдено',
      allDoneHint: 'Далі — глибина: вершини, які ще не мої.',
      know: 'знаю', learn: 'вивчаю',
      learningTitle: 'Зараз вивчаю',
      learningSub: 'Позначене «Вивчаю» — найсвіжіше вгорі.',
      learningEmpty: 'Тема з позначкою «Вивчаю» зʼявиться тут, щоб не губилась.',
      nextSub: 'Теми, для яких уже все є: жодна не спирається на незнане.',
      bulkKnow: 'Знаю все', bulkSure: 'Можу пояснити все',
      laneKnow: 'Позначити все «Знаю»', laneSure: '…«Можу пояснити»',
      quickSub: 'Щоб карта показала, де я, варто відмітити рівні, які вже пройдено. Окремі теми потім ' +
        'уточню — позначка на рівні лише перший начерк.',
      okHint: 'Усе, на що ця тема спирається, я вже знаю — можна брати.',
      notePh: 'Що саме тут іще не моє, джерела, як пояснювати учням…',
      ringDark: 'Темне — знаю, світле — вивчаю.',
      rootWord: 'знаю'
    };
  }

  /* Межа карти. Для учня за замовчуванням — шкільна програма й НМТ (рівні
     1–3), для мене — уся математика. */
  function maxStage() {
    var s = student();
    if (!s) return 6;
    return Number(s.mapScope) === 6 ? 6 : 3;
  }
  function inScope(t) { return t.stage <= maxStage(); }
  function scopeTopics() { return MAP.topics.filter(inScope); }

  /* ============================================================
     Прогрес
     ============================================================ */

  var WEIGHT = [0, 0.35, 1, 1];        // «вивчаю» — уже рух, але ще не знання
  var PASS = 0.8;                      // рівень пройдено, коли покрито 80%

  function known(id) { return st(id) >= 2; }
  function open(t) { return t.req.every(known); }

  function statsOf(list) {
    var c = [0, 0, 0, 0], w = 0;
    list.forEach(function (t) { var s = st(t.id); c[s]++; w += WEIGHT[s]; });
    return { n: list.length, c: c, known: c[2] + c[3], pct: list.length ? w / list.length : 0 };
  }

  function stageTopics(k) { return MAP.topics.filter(function (t) { return t.stage === k; }); }

  /** Рівень, на якому зараз: перший у межах карти, що ще не покритий на 80%. */
  function currentStage() {
    var max = maxStage();
    for (var k = 1; k <= max; k++) if (statsOf(stageTopics(k)).pct < PASS) return k;
    return max + 1;
  }

  /** Що можна брати наступним: ще не почате, а все, на що спирається, — знає. */
  function frontier() {
    return scopeTopics().filter(function (t) { return st(t.id) === 0 && open(t); })
      .sort(function (a, b) {
        return a.stage - b.stage || unlocks[b.id].length - unlocks[a.id].length || a.order - b.order;
      });
  }

  /* ============================================================
     Значок стану
     ============================================================

     Колір — домен, заповнення — стан. Так на карті видно водночас і де
     тема живе, і наскільки вона засвоєна, без другої веселки кольорів. */

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
     Панель
     ============================================================ */

  var selected = null;

  /** Вкладка — з адреси: і в моєму розділі, і в картці учня це «?v=». */
  function currentView() {
    var m = /[?&]v=(map|road)\b/.exec(location.hash);
    return m ? m[1] : 'home';
  }

  function panelHtml() {
    invalidate();
    var view = currentView();

    var tabs = [['home', who ? 'Де зараз' : 'Де я'], ['map', 'Карта'], ['road', 'Роудмап']].map(function (x) {
      return '<button class="tab' + (view === x[0] ? ' is-active' : '') + '" data-mm="tab" data-arg="' + x[0] + '">' +
        x[1] + '</button>';
    }).join('');

    var scope = '';
    if (who) {
      var max = maxStage();
      scope = '<div class="seg mm-scope" title="Які рівні рахувати">' +
        '<button class="seg__btn' + (max === 3 ? ' is-active' : '') + '" data-mm="scope" data-arg="3">Школа й НМТ</button>' +
        '<button class="seg__btn' + (max === 6 ? ' is-active' : '') + '" data-mm="scope" data-arg="6">Уся математика</button>' +
        '</div>';
    }

    var body = view === 'map' ? mapShell() : view === 'road' ? roadHtml() : homeHtml();

    return '<div class="mm mm--' + view + '" data-who="' + esc(who || '') + '">' +
      (ERRORS.length
        ? '<div class="card mm-err"><b>У даних карти є помилки</b> — частина звʼязків може показуватися неправильно:<br>' +
          ERRORS.slice(0, 6).map(esc).join('<br>') + '</div>'
        : '') +
      '<div class="mm-bar">' +
        '<div class="tabs">' + tabs + '</div>' +
        scope +
        '<div class="mm-search">' + icon('search', 16) +
          '<input id="mm-q" type="search" placeholder="Знайти тему…  ( / )" autocomplete="off" spellcheck="false">' +
          '<div class="mm-qlist" id="mm-qlist" hidden></div>' +
        '</div>' +
      '</div>' +
      body +
    '</div>';
  }

  function switchTo(newWho) {
    if (newWho !== who) { selected = null; hideDrawer(); }
    who = newWho;
    invalidate();
  }

  /** Мій розділ «Карта математики». */
  V.mathmap = function () {
    switchTo(null);
    return C.hero({
      short: true,
      title: 'Карта математики',
      sub: 'уся математика — і де в ній я'
    }) + '<div class="page">' + panelHtml() + '</div>';
  };

  /** Вкладка «Карта» в картці учня. */
  V.studentMap = function (stu) {
    if (!stu) return '';
    switchTo(stu.id);
    return panelHtml();
  };

  /** Скільки тем учень знає в межах своєї карти — для лічильника вкладки. */
  V.studentMapCount = function (stuId) {
    var s = S.get('students', stuId);
    var max = s && Number(s.mapScope) === 6 ? 6 : 3;
    var all = S.mapEntries(stuId);
    return Object.keys(all).filter(function (k) {
      return byId[k] && byId[k].stage <= max && Number(all[k].s) >= 2;
    }).length;
  };

  /** Перемалювати лише панель карти — без решти сторінки й без стрибка догори. */
  function rerender() {
    var el = $('.mm');
    if (!el) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = panelHtml();
    el.parentNode.replaceChild(tmp.firstChild, el);
    V.mountMathmap();
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
     Де зараз
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
    var tx = T();
    var max = maxStage();
    var cs = currentStage();
    var scopeList = scopeTopics();
    var all = statsOf(scopeList);
    var stats = MAP.stages.map(function (s) { return statsOf(stageTopics(s.id)); });
    var marked = scopeList.filter(function (t) { return st(t.id) > 0; }).length;

    /* ---- Тут ---- */
    var here;
    if (cs > max) {
      here = '<div class="mm-here__eyebrow">' + tx.here + '</div>' +
        '<div class="mm-here__title">' + tx.allDone + '</div>' +
        '<div class="mm-here__hint">' + tx.allDoneHint + '</div>';
    } else {
      var Sg = stageOf(cs), ss = stats[cs - 1];
      var need = Math.max(0, Math.ceil(PASS * ss.n - (ss.known + ss.c[1] * WEIGHT[1])));
      var subj = who ? 'Знає' : 'Знаю';
      here = '<div class="mm-here__eyebrow">' + tx.here + ' · рівень ' + cs + ' з ' + max + '</div>' +
        '<div class="mm-here__title">' + esc(Sg.name) + '</div>' +
        '<div class="mm-here__hint">' + esc(Sg.hint) + '</div>' +
        '<div class="mm-here__row">' + progressBar(ss) +
          '<span class="mm-here__pct">' + Math.round(ss.pct * 100) + '%</span></div>' +
        '<div class="mm-here__note">' + subj + ' ' + ss.known + ' з ' + pl(ss.n, 'теми', 'тем', 'тем') + ' цього рівня' +
          (ss.c[1] ? ', ще ' + ss.c[1] + ' ' + tx.learn : '') + '. ' +
          (need ? 'Рівень пройдено від 80% — бракує приблизно ' + pl(need, 'теми', 'тем', 'тем') + '.'
                : 'Ще трохи — і рівень пройдено.') + '</div>';
    }

    /* ---- Кільце загального прогресу ---- */
    var R = 46, CIRC = 2 * Math.PI * R;
    var kLen = all.n ? all.known / all.n * CIRC : 0, lLen = all.n ? all.c[1] / all.n * CIRC : 0;
    var ring = '<svg width="116" height="116" viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="#EEEDF6" stroke-width="12"/>' +
      '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="#E07C0B" stroke-width="12"' +
        ' stroke-dasharray="' + (kLen + lLen) + ' ' + CIRC + '" transform="rotate(-90 60 60)"/>' +
      '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="#17163A" stroke-width="12"' +
        ' stroke-dasharray="' + kLen + ' ' + CIRC + '" transform="rotate(-90 60 60)"/>' +
      '</svg>';
    var legend = [3, 2, 1, 0].map(function (s) {
      return '<div>' + glyph(s, '#17163A', 14) + esc(tx.status[s]) + '<b>' + all.c[s] + '</b></div>';
    }).join('');

    /* ---- Лінія рівнів ---- */
    var fill = cs > max ? (max - 1) / 5 * 100 : (cs - 1) / 5 * 100;
    var stations = MAP.stages.map(function (s, i) {
      var p = stats[i].pct;
      var out = s.id > max;
      var cls = (p >= PASS && !out ? ' is-done' : '') + (s.id === cs ? ' is-here' : '') + (out ? ' is-out' : '');
      return '<button class="mm-station' + cls + '" data-mm="stage" data-arg="' + s.id + '"' +
        (out ? ' title="За межами карти учня — перемкніть на «Уся математика»"' : '') + '>' +
        (s.id === cs ? '<span class="mm-station__here">' + tx.here.toLowerCase() + '</span>' : '') +
        '<span class="mm-station__dot">' + (p >= PASS && !out ? '✓' : s.id) + '</span>' +
        '<span class="mm-station__name">' + esc(s.name) + '</span>' +
        '<span class="mm-station__pct">' + (out ? 'поза картою' : Math.round(p * 100) + '%') + '</span></button>';
    }).join('');

    /* ---- Швидкий старт ---- */
    var quick = '';
    if (marked === 0) {
      quick = '<div class="card mm-quick"><h3 class="mm-h3">Швидкий старт</h3>' +
        '<div class="mm-sub">' + tx.quickSub + '</div>' +
        MAP.stages.filter(function (s) { return s.id <= max; }).map(function (s) {
          return '<div class="mm-qrow"><div class="mm-qrow__name"><b>' + s.id + ' · ' + esc(s.name) + '</b>' +
            '<small>' + esc(s.hint) + ' · ' + pl(stats[s.id - 1].n, 'тема', 'теми', 'тем') + '</small></div>' +
            '<button class="btn btn--soft btn--sm" data-mm="bulk" data-arg="' + s.id + ':2">' + tx.bulkKnow + '</button>' +
            '<button class="btn btn--soft btn--sm" data-mm="bulk" data-arg="' + s.id + ':3">' + tx.bulkSure + '</button></div>';
        }).join('') + '</div>';
    }

    /* ---- Наступні кроки й поточне ---- */
    var next = frontier().slice(0, 8);
    var nextHtml = next.length
      ? next.map(function (t) {
          var u = unlocks[t.id].filter(function (x) { return inScope(byId[x]); }).length;
          return topicRow(t, 'рівень ' + t.stage + (u ? ' · відкриє ' + u : ''));
        }).join('')
      : '<div class="mm-empty">Відкритих, але не почато тем немає — або все пройдено, або бракує позначок на попередніх темах.</div>';

    var learning = scopeList.filter(function (t) { return st(t.id) === 1; })
      .sort(function (a, b) {
        return String((entry(b.id) || {}).at || '').localeCompare(String((entry(a.id) || {}).at || ''));
      });
    var learnHtml = learning.length
      ? learning.slice(0, 10).map(function (t) { return topicRow(t, 'рівень ' + t.stage); }).join('') +
        (learning.length > 10 ? '<div class="mm-empty">і ще ' + (learning.length - 10) + '</div>' : '')
      : '<div class="mm-empty">' + tx.learningEmpty + '</div>';

    /* ---- Домени ---- */
    var doms = MAP.domains.map(function (d) {
      var list = scopeList.filter(function (t) { return domOf(t) === d; });
      if (!list.length) return '';                // у шкільній карті топології ще немає
      var s = statsOf(list);
      return '<div class="mm-drow"><div class="mm-drow__name"><span class="mm-drow__sw" style="background:' + d.color + '"></span>' +
        esc(d.name) + '</div>' +
        '<div class="mm-progress"><i style="width:' + (s.known / s.n * 100) + '%;background:' + d.color + '"></i>' +
        '<i style="width:' + (s.c[1] / s.n * 100) + '%;background:' + d.color + ';opacity:.35"></i></div>' +
        '<div class="mm-drow__n">' + s.known + ' / ' + s.n + '</div></div>';
    }).join('');

    var totalTitle = who ? (max === 3 ? 'Школа й НМТ' : 'Уся математика') : 'Уся математика';
    var totalSub = pl(all.n, 'тема', 'теми', 'тем') + (max === 6 ? ' на шести рівнях' : ' на рівнях 1–3');

    return '<div class="mm-hero">' +
        '<div class="card mm-here">' + here + '</div>' +
        '<div class="card"><h3 class="mm-h3">' + totalTitle + '</h3><div class="mm-sub">' + totalSub + '</div>' +
          '<div class="mm-ring">' + ring + '<div><div class="mm-ring__big">' +
            (all.n ? Math.round(all.known / all.n * 100) : 0) + '%</div>' +
          '<div class="muted small" style="margin-bottom:10px">' + tx.rootWord + '</div><div class="mm-ring__legend">' + legend + '</div></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="card mm-metro"><div class="mm-metro__track"><div class="mm-metro__line"><div class="mm-metro__fill" style="width:' +
        fill + '%"></div></div>' + stations + '</div></div>' +
      quick +
      '<div class="grid grid--2">' +
        '<div class="card"><h3 class="mm-h3">Наступні кроки</h3><div class="mm-sub">' + tx.nextSub + '</div>' +
          '<div class="mm-list">' + nextHtml + '</div></div>' +
        '<div class="card"><h3 class="mm-h3">' + tx.learningTitle + '</h3><div class="mm-sub">' + tx.learningSub + '</div>' +
          '<div class="mm-list">' + learnHtml + '</div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:18px"><h3 class="mm-h3">За доменами</h3><div class="mm-sub">' + tx.ringDark + '</div>' +
        doms + '</div>';
  }

  /* ============================================================
     Роудмап
     ============================================================ */

  function roadHtml() {
    var tx = T();
    var max = maxStage();
    var cs = currentStage();
    var legend = '<div class="mm-legend">' +
      [0, 1, 2, 3].map(function (s) { return '<span>' + glyph(s, '#17163A', 15) + esc(tx.status[s]) + '</span>'; }).join('') +
      '<span><span class="mm-chip is-next">можна брати</span></span>' +
      '<span><span class="mm-chip is-locked">ще закрита</span></span></div>';

    var lanes = MAP.stages.filter(function (Sg) { return Sg.id <= max; }).map(function (Sg) {
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
            (Sg.id === cs ? '<span class="mm-lane__here">' + tx.here.toLowerCase() + '</span>' : '') +
            '<span class="mm-lane__prog">' + progressBar(s) + '<b>' + s.known + ' / ' + s.n + '</b></span>' +
          '</div>' +
          '<div class="mm-lane__acts">' +
            '<button class="btn btn--ghost btn--sm" data-mm="bulk" data-arg="' + Sg.id + ':2">' + tx.laneKnow + '</button>' +
            '<button class="btn btn--ghost btn--sm" data-mm="bulk" data-arg="' + Sg.id + ':3">' + tx.laneSure + '</button>' +
            '<button class="btn btn--ghost btn--sm" data-mm="bulk" data-arg="' + Sg.id + ':0">Скинути рівень</button>' +
          '</div>' +
          '<div class="mm-doms">' + groups + '</div>' +
        '</div></section>';
    }).join('');

    /* Учневі університет не потрібен щодня, але знати, що він є, корисно:
       одна картка замість трьох порожніх смуг. */
    var beyond = '';
    if (max < 6) {
      var rest = MAP.topics.filter(function (t) { return t.stage > max; }).length;
      beyond = '<section class="mm-lane is-out">' +
        '<div class="mm-lane__rail"><div class="mm-lane__dot">…</div></div>' +
        '<div class="card mm-beyond">' +
          '<div><div class="mm-lane__title">Далі — університетська математика</div>' +
          '<div class="mm-lane__hint">Рівні ' + (max + 1) + '–6 · ' + pl(rest, 'тема', 'теми', 'тем') +
            ' — від матаналізу до досліджень</div></div>' +
          '<button class="btn btn--soft btn--sm" data-mm="scope" data-arg="6">Показати всю математику</button>' +
        '</div></section>';
    }

    return legend + '<div class="mm-road">' + lanes + beyond + '</div>';
  }

  /* ============================================================
     Карта
     ============================================================

     Уся математика колом. У центрі — «Математика», навколо неї кільце
     доменів, далі розділи, а теми лежать на концентричних колах за рівнями:
     ближче до центру основи, далі — вершини. Тому межа того, що знаєш,
     на карті видна як кільце, і «де зараз» читається одним поглядом.

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
    var tx = T();
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
            [0, 1, 2, 3].map(function (s) { return '<div>' + glyph(s, '#17163A', 14) + esc(tx.status[s]) + '</div>'; }).join('') +
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
    var tx = T();
    var L = layout();
    var max = maxStage();
    var cs = currentStage();
    var out = [];

    out.push('<defs><marker id="mm-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">' +
      '<path d="M0 0L10 5L0 10z" fill="#17163A"/></marker></defs>');

    /* кільця рівнів */
    MAP.stages.forEach(function (Sg) {
      out.push('<circle class="mm-stagering' + (Sg.id === cs ? ' is-here' : '') + (Sg.id > max ? ' is-out' : '') +
        '" r="' + rTopic(Sg.id) + '"/>');
    });
    MAP.stages.forEach(function (Sg) {
      var r = rTopic(Sg.id), here = Sg.id === cs;
      var label = (here ? tx.here + ' · ' : '') + Sg.id + ' · ' + Sg.name;
      var w = label.length * 9.6 + 28;
      out.push('<g class="mm-ringlbl' + (here ? ' is-here' : '') + (Sg.id > max ? ' is-out' : '') +
        '" transform="translate(0,' + (-r) + ')">' +
        '<rect x="' + f1(-w / 2) + '" y="-17" width="' + f1(w) + '" height="34" rx="17"/>' +
        '<text text-anchor="middle" dy="6">' + esc(label) + '</text></g>');
    });

    /* ребра: розділ → тема */
    MAP.topics.forEach(function (t) {
      var sp = L.sec[t.section], tp = L.t[t.id], d = domOf(t);
      var rm = (R_SEC + tp.r) / 2;
      var p0 = polar(R_SEC + 12, sp.a), c1 = polar(rm, sp.a), c2 = polar(rm, tp.a), p1 = polar(tp.r - 11, tp.a);
      out.push('<path class="mm-edge' + (t.stage > max ? ' is-out' : '') + '" data-e="' + t.id + '" stroke="' + d.color +
        '" d="M' + f1(p0[0]) + ' ' + f1(p0[1]) +
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
    var all = statsOf(scopeTopics());
    var s0 = student();
    out.push('<g data-root="1" style="cursor:pointer"><circle class="mm-root" r="' + R_ROOT + '"/>' +
      '<text class="mm-roottxt" y="' + (s0 ? -22 : -8) + '" style="font-size:34px">Математика</text>' +
      (s0 ? '<text class="mm-roottxt" y="16" style="font-size:22px;font-weight:650;opacity:.9">' +
        esc(String(s0.name || '').split(' ')[0]) + '</text>' : '') +
      '<text class="mm-roottxt" y="' + (s0 ? 50 : 30) + '" style="font-size:19px;font-weight:600;opacity:.75">' +
        tx.rootWord + ' ' + all.known + ' з ' + all.n + '</text></g>');

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
      out.push('<g class="mm-t' + (selected === t.id ? ' is-cur' : '') + (t.stage > max ? ' is-out' : '') +
        '" data-id="' + t.id + '" transform="translate(' + f1(p[0]) + ',' + f1(p[1]) + ')">' +
        '<circle class="mm-hit" r="15"/>' +
        '<g transform="translate(-11,-11) scale(1.375)">' + glyphInner(s, d.color) + '</g>' +
        (selected === t.id ? '<circle class="mm-focusring" r="17"/>' : '') +
        lbl + esc(t.name) + '</text><title>' + esc(t.name + ' — ' + tx.status[s]) + '</title></g>');
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

  /** Після кожного рендеру: оживити карту й шухляду — або прибрати їх, якщо карти на сторінці немає. */
  V.mountMathmap = function () {
    var root = $('.mm');
    if (!root) {
      svgEl = worldEl = null;
      selected = null;
      hideDrawer();
      return;
    }

    var w = root.getAttribute('data-who') || null;
    if (w !== who) switchTo(w);
    invalidate();

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

  /* Шухляда живе поза сторінкою: у картці учня панель карти — лише одна
     з вкладок, і вбудована в неї шухляда обрізалася б краями картки. */
  function drawerEl() {
    var d = document.getElementById('mm-drawer');
    if (!d) {
      d = document.createElement('aside');
      d.id = 'mm-drawer';
      d.className = 'mm-drawer';
      d.hidden = true;
      document.body.appendChild(d);
    }
    return d;
  }

  function hideDrawer() {
    var d = document.getElementById('mm-drawer');
    if (d) d.hidden = true;
    var u = document.getElementById('mm-undo');
    if (u) u.hidden = true;
  }

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
    hideDrawer();
    if (svgEl && worldEl) redrawWorld();
    else if (currentView() === 'road') rerender();
  }

  function renderDrawer() {
    var dr = drawerEl();
    var t = byId[selected];
    if (!t) { dr.hidden = true; return; }
    var tx = T();
    var d = domOf(t), Sg = stageOf(t.stage), s = st(t.id), e = entry(t.id) || {};
    var view = currentView();
    var stu = student();

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
      hint = '<div class="mm-ok">' + tx.okHint + '</div>';
    }

    var when = e.at ? U.fmtDate(e.at) : '';

    dr.innerHTML =
      '<div class="mm-dr__head" style="--c:' + d.color + '">' +
        '<div class="mm-dr__crumb">' + (stu ? esc(stu.name) + ' · ' : '') + esc(d.name) + ' › ' + esc(secOf(t).name) + '</div>' +
        '<button class="mm-dr__close" data-mm="close" title="Закрити (Esc)">' + icon('x', 18) + '</button>' +
        '<h2 class="mm-dr__title">' + esc(t.name) + '</h2>' +
        '<div class="mm-dr__stage">Рівень ' + t.stage + ' · ' + esc(Sg.name) + ' · ' + esc(Sg.hint) + '</div>' +
      '</div>' +
      '<div class="mm-dr__body">' +
        '<p class="mm-dr__inside">' + esc(t.inside) + '</p>' +
        '<div class="mm-seg">' + [0, 1, 2, 3].map(function (v) {
          return '<button class="' + (v === s ? 'is-on' : '') + '" data-mm="status" data-arg="' + v + '">' +
            glyph(v, v === s ? '#fff' : d.color, 18) + esc(tx.status[v]) + '</button>';
        }).join('') + '</div>' +
        hint +
        '<div class="mm-dr__h">Спирається на · ' + t.req.length + '</div>' +
        list(t.req, 'Ні на що — з цієї теми все починається.') +
        '<div class="mm-dr__h">Відкриває · ' + unlocks[t.id].length + '</div>' +
        list(unlocks[t.id], 'Далі на карті нічого — це одна з вершин.') +
        '<div class="mm-dr__h">Нотатка</div>' +
        '<textarea class="textarea mm-note" id="mm-note" placeholder="' + esc(tx.notePh) + '">' +
          esc(e.note || '') + '</textarea>' +
        (when ? '<div class="mm-dr__meta">Змінено ' + esc(when) + '</div>' : '') +
        '<div class="mm-dr__foot">' +
          (view !== 'map' ? '<button class="btn btn--soft btn--sm" data-mm="showmap">' + icon('target', 15) + 'Показати на карті</button>' : '') +
          (view !== 'road' ? '<button class="btn btn--ghost btn--sm" data-mm="showroad">У роудмапі</button>' : '') +
        '</div>' +
      '</div>';
    dr.hidden = false;
  }

  /* ============================================================
     Масові позначки й «скасувати»
     ============================================================ */

  function bulk(stage, s) {
    var tx = T();
    var list = stageTopics(stage).filter(function (t) {
      if (s === 2) return st(t.id) < 2;          // «знає все» не знижує тих, що «впевнено»
      return st(t.id) !== s;
    });
    if (!list.length) { U.toast('На цьому рівні вже все так позначено'); return; }

    var owner = who;
    var prev = list.map(function (t) {
      var e = entry(t.id);
      return { id: t.id, s: e ? (Number(e.s) | 0) : 0, note: e ? (e.note || '') : '' };
    });
    setTopics(list.map(function (t) { return { id: t.id, s: s }; }));
    rerender();

    var what = s === 0 ? 'Скинуто' : 'Позначено «' + tx.status[s] + '»';
    showUndo(what + ': ' + pl(list.length, 'тема', 'теми', 'тем'), function () {
      S.setMapTopics(prev, owner);
      invalidate();
      if (who === owner) rerender();
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
     Події — делеговано, лише коли карта є на сторінці
     ============================================================ */

  function onPage() { return !!$('.mm'); }

  function scrollToLane(k) {
    setTimeout(function () {
      var lane = document.getElementById('mm-lane-' + k);
      if (lane) lane.scrollIntoView({ block: 'start' });
    }, 30);
  }

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

    if (act === 'scope' && who) {
      S.update('students', who, { mapScope: +arg === 6 ? 6 : 3 });
      if (selected && byId[selected] && byId[selected].stage > maxStage()) { selected = null; hideDrawer(); }
      rerender();
      return;
    }

    if (act === 'status' && selected) {
      S.setMapTopic(selected, { s: +arg }, who);
      invalidate();
      if (svgEl && worldEl) { redrawWorld(); renderDrawer(); navCount(); }
      else rerender();
      return;
    }

    if (act === 'stage') {
      var k = +arg;
      if (who && k > maxStage()) S.update('students', who, { mapScope: 6 });
      window.App.setQuery({ v: 'road' });
      scrollToLane(k);
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
      if (who && sid && byId[sid].stage > maxStage()) S.update('students', who, { mapScope: 6 });
      window.App.setQuery({ v: 'road' });
      if (sid) scrollToLane(byId[sid].stage);
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
      var id = selected, owner = who, text = e.target.value;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(function () {
        S.setMapTopic(id, { note: text }, owner);
        if (who === owner) invalidate();
      }, 450);
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

  /** Для «Огляду» й перевірок: де зараз той, чию карту показано. */
  V.mathmapSummary = function (studentId) {
    var keep = who;
    who = studentId || null;
    invalidate();
    var cs = currentStage(), max = maxStage();
    var res = { stage: cs, max: max, name: cs > max ? 'Пройдено' : stageOf(cs).name, all: statsOf(scopeTopics()) };
    who = keep;
    invalidate();
    return res;
  };

  window.V = V;
})();
