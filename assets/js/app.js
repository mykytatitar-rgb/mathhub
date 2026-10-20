/* Роутер, сайдбар, обробка дій */
(function () {
  'use strict';

  var U = window.U, S = window.S, C = window.C, V = window.V, F = window.F, icon = window.icon;
  var App = {};

  /* Версія коду, який зараз виконується.

     Сайт оновлюється вручну — архівом. Через це буває стан, коли зміни вже
     на сервері, а сторінка й далі виконує старий код: із кеша браузера або
     тому, що архів ще не завантажили. Зовні це виглядає як «виправлення не
     працює», і на з'ясування щоразу йде окреме коло.

     Число підіймається разом із версією в sw.js. Панель «Чи все ціле»
     порівнює його з тим, що лежить на сервері, — і питання «я дивлюся на
     старе чи на нове» отримує відповідь на місці. */
  App.BUILD = 'v170';
  window.APP_BUILD = App.BUILD;

  /* Код, потрібний лише на дошці: сам рушій, побудови, графіки, тіла.
     Це третина всього кабінету, а відкривають дошку далеко не щоразу —
     тож на старті його не тягнемо. Вантажиться, коли дошку відкривають
     (або коли треба перевидати урок учневі), і ще раз мовчки у фоні, коли
     кабінет уже показався: тоді дошка відкривається так само миттєво.

     Номер версії в адресі — той самий, що в index.html: файл однієї версії
     браузер бере зі свого кешу, не питаючи сервер (див. sw.js). */
  var LAZY = {
    board: [
      'assets/js/shapefacts.js',
      'share/engine/constructions.js',
      'share/engine/plot.js',
      'share/engine/solids.js',
      'share/engine/points.js',
      'share/engine/board.js'
    ],
    /* Зміст бази формул: сотні доведень, потрібні лише в самій базі
       (і в шухляді теми на карті) */
    formulas: [
      'assets/js/formulas-algebra.js',
      'assets/js/formulas-trig.js',
      'assets/js/formulas-analysis.js',
      'assets/js/formulas-prob.js',
      'assets/js/formulas-plane.js',
      'assets/js/formulas-space.js'
    ],
    // рукопис на дошці → слайд Beamer: набір слайда й MathJax (2 МБ) — лише коли перетворюють
    beamer: [
      'assets/js/beamer.js',
      'assets/vendor/mathjax/tex-svg-full.js'
    ],
    // англійський переклад бази — лише коли перемкнулись на ENG
    'formulas-en': [
      'assets/js/formulas-en-algebra.js',
      'assets/js/formulas-en-trig.js',
      'assets/js/formulas-en-analysis.js',
      'assets/js/formulas-en-prob.js',
      'assets/js/formulas-en-plane.js',
      'assets/js/formulas-en-space.js'
    ]
  };
  var lazyDone = {};

  App.versioned = function (src) {
    return src + '?v=' + String(App.BUILD).replace(/\D/g, '');
  };

  /** Підвантажити групу файлів. Разом тягнуться паралельно, виконуються по черзі. */
  App.need = function (name) {
    if (lazyDone[name]) return lazyDone[name];
    var files = LAZY[name] || [];
    lazyDone[name] = new Promise(function (resolve, reject) {
      var left = files.length;
      if (!left) { resolve(); return; }
      files.forEach(function (src) {
        var el = document.createElement('script');
        el.src = App.versioned(src);
        el.async = false;                   // порядок виконання — як у списку
        el.onload = function () { if (--left === 0) resolve(); };
        el.onerror = function () { reject(new Error('не завантажився ' + src)); };
        document.head.appendChild(el);
      });
    });
    // невдача не має залипати: наступна спроба вантажить наново
    lazyDone[name].catch(function () { delete lazyDone[name]; });
    return lazyDone[name];
  };

  var NAV = [
    { hash: '#/',          icon: 'grid',      label: 'Огляд' },
    { hash: '#/students',  icon: 'users',     label: 'Учні',      count: function () { return S.students().length; } },
    { hash: '#/schedule',  icon: 'calendar',  label: 'Розклад',   count: function () {
        return S.lessonsOnDay(U.today()).filter(function (l) { return l.status === 'planned'; }).length; } },
    { hash: '#/finance',   icon: 'wallet',    label: 'Фінанси' },
    { hash: '#/materials', icon: 'folder',    label: 'Матеріали' },
    /* База формул окремим пунктом, а не всередині матеріалів: до неї
       заглядають посеред уроку, і зайвий крок тут дорого коштує. */
    { hash: '#/reference', icon: 'book',      label: 'Формули' },
    /* Власна математика окремо від учнівської: те, у чому розбираєшся сам,
       не має домішуватися в розклад, фінанси й портали. */
    /* Олімпіадні задачі поруч із картою: вони й прив'язані до її тем,
       і потрібні в той самий момент — коли шукаєш, що дати учневі далі. */
    /* Банк — усі задачі з усіх джерел, з фільтрами як у каталозі; олімпіади —
       окремо, бо це підготовка до змагань, а не пошук задачі на тему. */
    { hash: '#/bank',      icon: 'layers',    label: 'Банк задач' },
    { hash: '#/olymp',     icon: 'trophy',    label: 'Олімпіади' },
    { hash: '#/desk',      icon: 'compass',   label: 'Моє',       count: function () {
        return (S.deskItems() || []).filter(function (d) { return d.status !== 'done'; }).length; } },
    /* Карта всієї математики — теж моя, а не учнівська: де я в ній, що
       вже закрито й що можна брати далі. Лічильник — теми, які зараз
       вивчаю: саме вони й мають бути перед очима. */
    { hash: '#/mathmap',   icon: 'mathmap',   label: 'Карта математики', count: function () {
        return (S.db().mathmap || []).filter(function (m) { return Number(m.s) === 1; }).length; } }
  ];

  /* ============================================================
     Роут
     ============================================================ */

  function parseRoute() {
    var h = location.hash.replace(/^#/, '') || '/';
    var qi = h.indexOf('?');
    var query = {};
    if (qi >= 0) {
      h.slice(qi + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
      h = h.slice(0, qi);
    }
    var parts = h.split('/').filter(Boolean);
    return { parts: parts, query: query, path: h };
  }

  App.setQuery = function (patch) { setQuery(patch); };

  /* Те саме, але без перемальовування сторінки: її частину оновить сам
     розділ (пошук у довіднику). Повертає новий маршрут — або null, якщо
     адреса не змінилась чи сторінку однаково буде перемальовано. */
  App.quietQuery = function (patch) { return writeQuery(patch) ? parseRoute() : null; };

  /* Фільтр, пошук, тиждень, вигляд — це та сама сторінка, а не новий крок.
     Адреса змінюється на місці (replaceState), без нового запису в історії:
     інакше «Назад» після пошуку прокручував би «Ол», «Олек», «Олекс», а не
     повертав на попередню сторінку. */
  function setQuery(patch) {
    if (writeQuery(patch)) App.render();
  }

  /** Записати нові параметри в адресу. true — записано на місці. */
  function writeQuery(patch) {
    var r = parseRoute();
    Object.keys(patch).forEach(function (k) {
      if (patch[k] === '' || patch[k] == null) delete r.query[k];
      else r.query[k] = patch[k];
    });
    var qs = Object.keys(r.query).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(r.query[k]);
    }).join('&');
    var h = '#' + r.path + (qs ? '?' + qs : '');
    if (h === location.hash) return false;
    try {
      history.replaceState(history.state, '', h);
    } catch (e) {
      location.replace(h);               // без історії — хоча б не новий запис (сторінку намалює hashchange)
      return false;
    }
    C.hist.note();
    return true;
  }

  /** Той самий розділ, що вже відкритий («#/» і порожня адреса — одне й те саме). */
  function samePlace(hash) {
    var cur = location.hash;
    if (!cur || cur === '#') cur = '#/';
    return cur === hash;
  }

  /* Перехід усередині кабінету.
     Зі шторки (відкрите вікно має свій запис в історії) — замість її запису,
     а не поверх: інакше під новою сторінкою лишався б «порожній» запис, і
     перше «Назад» звідти нічого не робило б. replace — замінити поточну
     сторінку (вкладки нижньої панелі не накопичуються в історії);
     'page' — замінити сторінку навіть із шторки над нею (див. C.hist.replacePage). */
  App.go = function (hash, replace) {
    if (samePlace(hash)) { C.closeAll(); return; }
    if (replace === 'page') { C.hist.replacePage(hash); return; }
    var st = history.state;
    if (replace || (st && st.ov)) {
      C.hist.replacing(hash);
      location.replace(hash);
    } else {
      location.hash = hash;
    }
  };

  /* Стрілка «назад»: туди, звідки прийшли, якщо це наша сторінка; інакше —
     на батьківську (fallback). Досі ← додавала новий запис «Учні», і після
     неї «Назад» телефона вертав до того самого учня — по колу. */
  App.back = function (fallback) {
    if (C.hist.depth() > 0) history.back();
    else App.go(fallback || '#/', true);
  };

  /* ============================================================
     Ширина сайдбара: згортання та перетягування
     ============================================================ */

  var SIDEBAR_KEY = 'mathhub.sidebar';
  var SIDEBAR_DEFAULT = 274;
  var sidebarState = { collapsed: false, width: SIDEBAR_DEFAULT };

  try {
    var saved = JSON.parse(localStorage.getItem(SIDEBAR_KEY) || '{}');
    if (typeof saved.collapsed === 'boolean') sidebarState.collapsed = saved.collapsed;
    if (typeof saved.width === 'number') sidebarState.width = U.clamp(saved.width, 200, 460);
  } catch (e) { /* перший запуск або зіпсований запис — беремо типові значення */ }

  function saveSidebar() {
    try { localStorage.setItem(SIDEBAR_KEY, JSON.stringify(sidebarState)); } catch (e) {}
  }

  /** На вузьких екранах сайдбар згорнутий примусово, незалежно від вибору.
      На телефоні — навпаки, повний: там він не стоїть збоку, а виїжджає
      поверх сторінки з кнопки меню, тож місця не забирає. */
  var PHONE = 640;

  function applySidebar() {
    var app = document.querySelector('.app');
    if (!app) return;
    var w = window.innerWidth;
    var collapsed = w > PHONE && (w < 900 || sidebarState.collapsed);
    app.classList.toggle('is-collapsed', collapsed);
    if (w > PHONE) app.classList.remove('is-menu');
    document.documentElement.style.setProperty('--sidebar-w', sidebarState.width + 'px');
  }

  function closeMenu() {
    var app = document.querySelector('.app');
    if (app) app.classList.remove('is-menu');
  }

  function startResize(e) {
    e.preventDefault();
    var app = document.querySelector('.app');
    app.classList.add('is-resizing');

    function move(ev) {
      sidebarState.width = Math.round(U.clamp(ev.clientX, 200, 460));
      document.documentElement.style.setProperty('--sidebar-w', sidebarState.width + 'px');
    }
    function stop() {
      app.classList.remove('is-resizing');
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', stop);
      saveSidebar();
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
  }

  /* ============================================================
     Сайдбар
     ============================================================ */

  /* ---------- Порядок розділів ----------

     Розділи стоять так, як їх переставила людина: порядок лежить у самій
     базі (tutor.nav), отже однаковий на всіх пристроях — як усе інше.
     Нові розділи, яких у збереженому списку ще немає, стають на свої
     типові місця, а не зникають. */

  function navOrder() {
    var saved = (S.db().tutor && S.db().tutor.nav) || [];
    var rest = NAV.filter(function (n) { return saved.indexOf(n.hash) < 0; });
    var out = [];
    saved.forEach(function (h) {
      var n = NAV.filter(function (x) { return x.hash === h; })[0];
      if (n) out.push(n);
    });
    // новий розділ вставляємо туди, де він стоїть за задумом
    rest.forEach(function (n) {
      var at = NAV.indexOf(n);
      var i = out.length;
      for (var k = 0; k < out.length; k++) {
        if (NAV.indexOf(out[k]) > at) { i = k; break; }
      }
      out.splice(i, 0, n);
    });
    return out;
  }

  function saveNavOrder(box) {
    var order = Array.prototype.map.call(box.querySelectorAll('.nav-item'), function (el) {
      return el.dataset.arg;
    }).filter(Boolean);
    if (!order.length) return;
    var t = S.db().tutor || (S.db().tutor = {});
    if (JSON.stringify(t.nav || []) === JSON.stringify(order)) return;
    t.nav = order;
    S.save();
  }

  /* Перетягування розділів.

     Своє, а не HTML5 drag: той не працює пальцем на планшеті, а кабінет
     відкривають і з нього.

     Дві речі, на яких це ламалося:
     • рух і відпускання слухаємо на всій сторінці, а не лише на панелі.
       Інакше варто було відпустити кнопку над робочою частиною — і
       перетягування не завершувалось: панель лишалась «у руці» й далі
       не оновлювалась, тобто на вигляд кабінет зависав;
     • список під час тягання не перебудовується. Пункт їде за пальцем
       трансформацією, сусіди відсуваються на його висоту коротким
       переходом, і лише на відпускання порядок один раз лягає в розмітку. */
  var dragEndedAt = 0;

  function bindNavDrag(box) {
    var st = null;

    function begin(e) {
      var items = Array.prototype.slice.call(box.querySelectorAll('.nav-item'));
      var rects = items.map(function (el) { return el.getBoundingClientRect(); });
      var from = items.indexOf(st.el);
      if (from < 0) { st = null; return false; }

      st.items = items;
      st.rects = rects;
      st.from = from;
      st.step = items.length > 1 ? Math.abs(rects[1].top - rects[0].top) : rects[from].height;
      st.target = from;
      st.moved = true;

      st.el.classList.add('is-dragging');
      document.body.classList.add('is-navdrag');
      return true;
    }

    /* Куди пункт сяде, якщо відпустити просто зараз. Рахуємо за
       початковими місцями сусідів: вони лише зсунуті трансформацією, а
       насправді стоять там, де стояли. */
    function placeFor(dy) {
      var mid = st.rects[st.from].top + st.rects[st.from].height / 2 + dy;
      var n = 0;
      for (var i = 0; i < st.items.length; i++) {
        if (i === st.from) continue;
        if (st.rects[i].top + st.rects[i].height / 2 < mid) n++;
      }
      return n;
    }

    function shift() {
      for (var i = 0; i < st.items.length; i++) {
        if (i === st.from) continue;
        var j = i < st.from ? i : i - 1;          // місце серед решти
        var t = 0;
        if (j < st.target && i > st.from) t = -st.step;
        else if (j >= st.target && i < st.from) t = st.step;
        st.items[i].style.transform = t ? 'translateY(' + t + 'px)' : '';
      }
    }

    function onMove(e) {
      if (!st) return;
      var dy = e.clientY - st.y0;
      if (!st.moved) {
        if (Math.abs(dy) < 5) return;
        if (!begin(e)) { unlisten(); return; }
      }
      e.preventDefault();
      st.el.style.transform = 'translateY(' + dy + 'px)';
      var t = placeFor(dy);
      if (t !== st.target) { st.target = t; shift(); }
    }

    function unlisten() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    }

    function onUp() {
      unlisten();
      if (!st) return;
      var cur = st;
      st = null;
      cur.el.classList.remove('is-dragging');
      document.body.classList.remove('is-navdrag');
      if (!cur.moved) return;

      // тепер — один раз у розмітку, у тому порядку, який уже видно
      var others = cur.items.filter(function (_, i) { return i !== cur.from; });
      var ref = others[cur.target] || null;
      if (ref) box.insertBefore(cur.el, ref);
      else if (others.length) box.insertBefore(cur.el, others[others.length - 1].nextSibling);
      cur.items.forEach(function (el) { el.style.transform = ''; });

      dragEndedAt = Date.now();       // це було перетягування, а не перехід у розділ
      saveNavOrder(box);
    }

    box.addEventListener('pointerdown', function (e) {
      var el = e.target.closest && e.target.closest('.nav-item');
      if (!el || e.button) return;
      // якщо минулий раз чомусь не завершився — прибираємо за ним
      document.body.classList.remove('is-navdrag');
      unlisten();
      st = { el: el, y0: e.clientY, moved: false };
      document.addEventListener('pointermove', onMove, { passive: false });
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });

    // власний браузерний drag тут тільки заважає
    box.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  /* Телефон: головні розділи — панеллю внизу, як у Preply. Досі кожен
     перехід ішов через меню: відкрити, знайти, торкнутись — два дотики
     замість одного. Решта розділів — у «Ще», тобто в тому самому меню. */
  var TABS = [
    { hash: '#/',          icon: 'grid',     label: 'Огляд' },
    { hash: '#/schedule',  icon: 'calendar', label: 'Розклад' },
    { hash: '#/students',  icon: 'users',    label: 'Учні' },
    { hash: '#/reference', icon: 'book',     label: 'Формули' }
  ];

  function renderTabs(route) {
    var el = document.getElementById('m-tabs');
    if (!el) return;
    var path = '#' + (route.path === '/' ? '/' : route.path);
    function on(h) {
      if (h === '#/') return path === '#/';
      if (h === '#/students' && path.indexOf('#/student/') === 0) return true;
      if (h === '#/reference' && path.indexOf('#/sheet') === 0) return true;
      return path.indexOf(h) === 0;
    }
    var any = TABS.some(function (t) { return on(t.hash); });
    el.innerHTML = TABS.map(function (t) {
      return '<button class="m-tab' + (on(t.hash) ? ' is-on' : '') + '" data-act="tabnav" data-arg="' + t.hash + '">' +
        icon(t.icon, 22) + '<span>' + t.label + '</span></button>';
    }).join('') +
    '<button class="m-tab' + (any ? '' : ' is-on') + '" data-act="menu">' + icon('menu', 22) + '<span>Ще</span></button>';
  }

  /* «Ще» на телефоні — шторка знизу з плитками, а не бічне меню з лівого
     краю: кнопка «Ще» внизу праворуч, і рука тягнеться туди ж. Тут лише ті
     розділи, яких немає в нижній панелі, плюс налаштування. Закривається
     як будь-яка шторка — «Назад», хрестиком, донизу пальцем. */
  function moreSheet() {
    var path = parseRoute().path;
    var items = navOrder().filter(function (n) {
      return !TABS.some(function (t) { return t.hash === n.hash; });
    }).concat([{ hash: '#/settings', icon: 'settings', label: 'Налаштування' }]);

    C.modal({
      title: 'Ще',
      body: '<div class="more-grid">' + items.map(function (n) {
        var on = path === n.hash.replace(/^#/, '') || path.indexOf(n.hash.replace(/^#/, '') + '/') === 0;
        var cnt = n.count ? n.count() : 0;
        return '<button class="more-tile' + (on ? ' is-on' : '') + '" data-act="nav" data-arg="' + n.hash + '">' +
          '<span class="more-tile__top">' + icon(n.icon, 22) +
          (cnt ? '<span class="more-tile__n">' + cnt + '</span>' : '') + '</span>' +
          '<span class="more-tile__l">' + U.esc(n.label) + '</span></button>';
      }).join('') + '</div>' + installCard()
    });
  }

  /* ---------- Встановлення на телефон ----------

     Без адресного рядка й зі своєю іконкою кабінет відкривається як
     застосунок. Chrome на Android пропонує це сам (подія
     beforeinstallprompt) — ловимо її й показуємо тиху картку в «Ще» й у
     налаштуваннях, без смуг і спливних підказок. iPhone такої події не має:
     там лише через «Поділитися», тож картка це й підказує. */
  var installEvt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
  });
  window.addEventListener('appinstalled', function () {
    installEvt = null;
    if (S.db()) App.render();
  });

  /** Відкрито як встановлений застосунок, а не у вкладці браузера. */
  App.standalone = function () {
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) {}
    return window.navigator.standalone === true;
  };

  function isIOS() {
    var n = window.navigator;
    return /iPhone|iPad|iPod/.test(n.userAgent) || (n.platform === 'MacIntel' && n.maxTouchPoints > 1);
  }

  function installCard() {
    if (App.standalone() || !C.touchy()) return '';
    var ios = isIOS();
    if (!installEvt && !ios) return '';
    return '<div class="install-card">' +
      '<span class="install-card__i">' + icon('download', 20) + '</span>' +
      '<div class="install-card__t"><b>Застосунок на телефоні</b>' +
      '<span>' + (installEvt
        ? 'Своя іконка на екрані й повний екран без адресного рядка.'
        : 'Поділитися → «На початковий екран». Після встановлення увійдіть ще раз — у застосунку окреме сховище.') +
      '</span></div>' +
      (installEvt ? '<button class="btn btn--primary btn--sm" data-act="app-install">Встановити</button>' : '') +
    '</div>';
  }
  App.installCard = installCard;

  /* Телефон: назва сторінки — у верхній смузі, як у звичайних застосунках.
     Банер із великою назвою на телефоні ховається (див. app.css), а все,
     що в ньому було корисного, переїжджає сюди: назва, дрібний підпис під
     нею («Субота, 26 вересня»), «назад» і кнопки дій — головна з підписом,
     решта значками. Банер учня з аватаркою лишається: це вже зміст. */
  var TITLES = {
    '': 'Огляд', students: 'Учні', student: 'Учні', schedule: 'Розклад', finance: 'Фінанси',
    materials: 'Матеріали', reference: 'Формули', sheet: 'Cheat sheets', bank: 'Банк задач',
    olymp: 'Олімпіади', desk: 'Моє', mathmap: 'Карта математики', settings: 'Налаштування'
  };

  /* Дії смуги, що сховались під «⋯»: значки без підпису на дотиковому
     екрані не пояснюють себе, тож коли їх більше одного — список з назвами. */
  var barMore = [];

  function renderTopBar(route) {
    var bar = document.querySelector('.m-bar');
    if (!bar) return;
    var hero = document.querySelector('#main .hero');
    var person = hero && hero.querySelector('.avatar');
    var t = hero && hero.querySelector('.hero__title');
    // база формул двомовна — і назва в смузі тією мовою, що вибрана в ній;
    // на сторінці учня — його імʼя: банер із ним прокручується геть
    var title = route.parts[0] === 'reference' && V.formulasTitle ? V.formulasTitle()
      : route.parts[0] === 'student' && t ? t.textContent
      : TITLES[route.parts[0] || ''] || (t ? t.textContent : 'Вектор');
    var subEl = hero && !person && hero.querySelector('.hero__sub');
    var back = hero && hero.querySelector('.hero__back');
    var acts = hero && !person ? U.$$('.hero__actions .hero-btn', hero) : [];

    function attrs(el) {
      return ' data-act="' + U.esc(el.getAttribute('data-act') || '') + '"' +
        (el.getAttribute('data-arg') ? ' data-arg="' + U.esc(el.getAttribute('data-arg')) + '"' : '');
    }
    // смуга може показувати кнопку інакше, ніж банер (data-bar у C.hero)
    function solidOf(b) {
      var mode = b.getAttribute('data-bar');
      return mode ? mode === 'solid' : b.classList.contains('hero-btn--solid');
    }
    /* ← веде назад історією, а не додає новий запис «Учні» (див. App.back);
       куди йти, коли позаду нічого нашого, — з банера */
    var backAttrs = !back ? ''
      : back.getAttribute('data-act') === 'nav'
        ? ' data-act="back" data-arg="' + U.esc(back.getAttribute('data-arg') || '#/') + '"'
        : attrs(back);

    var plain = acts.filter(function (b) { return !solidOf(b); });
    barMore = plain.length > 1 ? plain.map(function (b) {
      var svg = b.querySelector('svg');
      return { act: b.getAttribute('data-act') || '', arg: b.getAttribute('data-arg') || '',
               label: b.textContent.trim(), svg: svg ? svg.outerHTML : '' };
    }) : [];

    bar.innerHTML =
      (back ? '<button class="m-bar__btn"' + backAttrs + ' aria-label="Назад">' + icon('arrowLeft', 22) + '</button>' : '') +
      '<div class="m-bar__t' + (back ? '' : ' m-bar__t--pad') + '">' +
        '<div class="m-bar__title">' + U.esc(title) + '</div>' +
        (subEl && subEl.textContent.trim() ? '<div class="m-bar__sub">' + U.esc(subEl.textContent.trim()) + '</div>' : '') +
      '</div>' +
      acts.filter(function (b) { return solidOf(b) || !barMore.length; }).map(function (b) {
        var solid = solidOf(b);
        var label = b.textContent.trim();
        var svg = b.querySelector('svg');
        return '<button class="m-act' + (solid ? ' m-act--solid' : '') + '"' + attrs(b) +
          ' aria-label="' + U.esc(label) + '" title="' + U.esc(label) + '">' +
          (svg ? svg.outerHTML : '') + (solid ? '<span>' + U.esc(label) + '</span>' : '') + '</button>';
      }).join('') +
      (barMore.length
        ? '<button class="m-act" data-act="bar-more" aria-label="Ще дії" title="Ще дії">' + icon('dots', 21) + '</button>'
        : '');
  }

  function renderSidebar(route) {
    var activeStudent = route.parts[0] === 'student' ? route.parts[1] : null;
    var path = '#' + (route.path === '/' ? '/' : route.path);

    var nav = navOrder().map(function (n) {
      var active = n.hash === '#/' ? (path === '#/' || path === '#') : path.indexOf(n.hash) === 0;
      // сторінка учня — частина розділу «Учні» (окремого списку учнів у панелі більше немає)
      if (n.hash === '#/students' && activeStudent) active = true;
      // англійські шпаргалки — частина бази формул, пункт той самий
      if (n.hash === '#/reference' && path.indexOf('#/sheet') === 0) active = true;
      var cnt = n.count ? n.count() : 0;
      return '<button class="nav-item' + (active ? ' is-active' : '') + '" data-act="nav" data-arg="' + n.hash +
        '" aria-label="' + U.esc(n.label) + '" title="' + U.esc(n.label) + ' · перетягніть, щоб переставити">' +
        icon(n.icon, 19) + '<span>' + n.label + '</span>' +
        (cnt ? '<span class="nav-item__count">' + cnt + '</span>' : '') + '</button>';
    }).join('');

    return '<button class="sidebar__toggle" data-act="sidebar-toggle" ' +
        'title="Згорнути або розгорнути панель (Ctrl+B)" aria-label="Згорнути панель">' +
        icon('chevronL', 15) + '</button>' +
      '<div class="sidebar__resize" title="Потягніть, щоб змінити ширину. Подвійний клік — типова ширина"></div>' +

      '<div class="logo" data-act="nav" data-arg="#/" title="Вектор — на головну">' +
        '<span class="logo__mark">→</span>' +
        '<span class="logo__text">Вектор<span class="logo__dot">.</span></span>' +
      '</div>' +

      '<div class="side-scroll">' +
        nav +
      '</div>' +

      '<div class="side-foot">' +
        '<button class="nav-item' + (path.indexOf('#/settings') === 0 ? ' is-active' : '') +
        '" data-act="nav" data-arg="#/settings" aria-label="Налаштування" title="Налаштування">' +
        icon('settings', 19) + '<span>Налаштування</span></button>' +
      '</div>';
  }

  /* ============================================================
     Рендер
     ============================================================ */

  App.render = function () {
    // база ще не прочитана (disk.js підтягує дошки) — малювати нічого
    if (!S.db()) return;
    // перемальовування тієї самої сторінки (приїхали зміни, курс НБУ) меню не згортає
    if (lastRendered !== location.hash) closeMenu();
    var route = parseRoute();

    /* Прокрутка кожної сторінки, з якої пішли, — щоб «Назад» повертав туди
       ж, де гортали (розклад → урок → дошка → назад), а не на початок. */
    var popped = C.hist.popped();
    if (lastRendered !== null && lastPath !== route.path) scrollByHash[lastRendered] = window.scrollY;

    /* Ярлик «Новий урок» на іконці застосунку (довге натискання): розклад і
       одразу шторка нового уроку. Позначку з адреси прибираємо, щоб
       оновлення сторінки не відкривало шторку вдруге. */
    if (route.query.new && route.parts[0] === 'schedule') {
      try { history.replaceState(history.state, '', location.pathname + location.search + '#/schedule'); C.hist.note(); } catch (e) {}
      route = parseRoute();
      setTimeout(function () { if (window.F && F.lesson) F.lesson(null, {}); }, 0);
    }

    /* Посилання з ключем банку задач (#/bank-key/…): ключ іде в базу — а з
       нею на всі пристрої, — а з адреси й історії браузера зникає одразу. */
    if (route.parts[0] === 'bank-key') {
      if (window.BankSeal) BankSeal.setKey(route.parts[1] || '');
      try {
        // стан запису (його глибину) лишаємо — міняється лише адреса
        history.replaceState(history.state, '', location.pathname + location.search + '#/bank');
        C.hist.note();
      } catch (e) {
        location.replace('#/bank');
        return;
      }
      route = parseRoute();
    }
    var main = document.getElementById('main');
    var side = document.getElementById('sidebar');
    var app = document.querySelector('.app');

    /* Дошка живе поза звичайним циклом рендеру: перемалювати її розмітку —
       означало б знищити полотно разом із незбереженим малюнком. */
    if (route.parts[0] === 'board') {
      if (V.boardMountedFor() === route.parts[1]) return;
      // уже тут, навіть поки рушій вантажиться: прокрутку попередньої сторінки записано вище
      lastRendered = location.hash;
      lastPath = route.path;
      V.unmountBoard();
      app.classList.add('is-board');
      if (!window.Board) {
        // рушій дошки ще не вантажився — тихе тло на мить, без написів
        main.innerHTML = '<div class="board-wait"></div>';
        var want = location.hash;
        App.need('board').then(function () {
          if (location.hash === want) App.render();
        }, function () {
          if (location.hash !== want) return;
          main.innerHTML = '<div class="page"><div class="card">' +
            C.empty('alert', 'Дошка не відкрилась', 'Немає звʼязку, а цієї версії дошки ще немає на пристрої.',
              '<button class="btn btn--primary" data-act="board-retry">Спробувати ще</button>') +
            '</div></div>';
        });
        return;
      }
      main.innerHTML = V.board(route.parts[1]);
      V.mountBoard(route.parts[1]);
      window.scrollTo(0, 0);
      return;
    }
    if (V.boardMountedFor()) V.unmountBoard();
    app.classList.remove('is-board');

    /* Зберегти фокус пошуку. Довідник шукає без перемальовування, але
       сторінка буває перемальована й посеред набору (приїхали зміни з
       іншого пристрою) — тоді поле стає на місце з курсором там, де був. */
    var act = document.activeElement;
    var restore = act && (act.id === 'stu-search' || (act.hasAttribute && act.hasAttribute('data-ref-q')))
      ? { sel: act.id === 'stu-search' ? '#stu-search' : '[data-ref-q]', pos: act.selectionStart } : null;

    /* Поки розділ тягнуть під рукою, панель не перемальовуємо: інакше
       перемальовування посеред руху викинуло б той самий пункт з-під пальця. */
    renderTabs(route);
    if (!document.body.classList.contains('is-navdrag')) {
      side.innerHTML = renderSidebar(route);
      var navBox = side.querySelector('.side-scroll');
      /* На телефоні бічної панелі не видно (розділи — у «Ще»), а
         перетягування там підхоплювало пункт раніше, ніж браузер розумів,
         що це прокрутка, і гортання переставляло розділи. */
      if (navBox && !C.phone()) bindNavDrag(navBox);
    }

    var html;
    try {
      switch (route.parts[0]) {
        case undefined:
          html = V.dashboard(); break;
        case 'students':
          html = V.students(route.query); break;
        case 'student':
          html = V.student(route.parts[1], route.parts[2]); break;
        case 'schedule':
          html = V.schedule(route.query); break;
        case 'finance':
          html = V.finance(route.query); break;
        case 'materials':
          html = V.materials(route.query); break;
        case 'reference':
          html = V.formulas(route.query); break;
        case 'sheet':
          html = V.sheet(route.parts[1], route.query); break;
        case 'desk':
          html = V.desk(route.query); break;
        case 'mathmap':
          html = V.mathmap ? V.mathmap(route.query) : ''; break;
        case 'olymp':
          html = V.olymp ? V.olymp(route.query) : ''; break;
        case 'bank':
          html = V.bank ? V.bank(route.query) : ''; break;
        case 'settings':
          html = route.parts[1] === 'tech' && V.settingsTech ? V.settingsTech() : V.settings(); break;
        default:
          html = '<div class="page"><div class="card">' +
            C.empty('alert', 'Сторінку не знайдено', 'Такого розділу немає.',
              '<button class="btn btn--primary" data-act="nav" data-arg="#/">На головну</button>') +
            '</div></div>';
      }
    } catch (e) {
      console.error(e);
      html = '<div class="page"><div class="card">' +
        C.empty('alert', 'Помилка відображення', String(e && e.message || e),
          '<button class="btn btn--primary" data-act="nav" data-arg="#/">На головну</button>') + '</div></div>';
    }

    /* Нагору — лише коли відкрили іншу сторінку. Перемальовування тієї самої
       (приїхали зміни, відмітили урок) лишає сторінку там, де її гортали:
       інакше після кожної галочки список уроків відлітав на початок. Те
       саме — пошук і фільтри списку учнів: літера в пошуку не кидає нагору.
       Повернулись «Назад» — туди, де сторінку залишили. */
    var sameRoute = lastRendered === location.hash ||
      (lastPath === route.path && (route.parts[0] === 'students' || onlySearchChanged(lastRendered, location.hash)));
    var keepY = window.scrollY;
    var backY = !sameRoute && popped ? scrollByHash[location.hash] : null;
    main.innerHTML = html;
    renderTopBar(route);
    window.scrollTo(0, sameRoute ? keepY : backY != null ? backY : 0);
    App.scrollRestored = backY != null;
    lastRendered = location.hash;
    lastPath = route.path;
    if (V.afterRender) V.afterRender(route);
    App.scrollRestored = false;

    if (restore) {
      var el = document.querySelector(restore.sel);
      if (el) { el.focus(); try { el.setSelectionRange(restore.pos, restore.pos); } catch (e) {} }
    }
  };

  var lastRendered = null;
  var lastPath = null;
  var scrollByHash = {};

  /** Між двома адресами тієї самої сторінки змінився лише пошук (q). */
  function onlySearchChanged(a, b) {
    function rest(h) {
      return String(h || '').replace(/([?&])q=[^&]*/, '$1').replace(/[?&]+$/, '').replace('?&', '?');
    }
    return rest(a) === rest(b);
  }

  App.refresh = function () { App.render(); };

  /* Файл зі сховища браузера — людині. На телефоні «завантажене» губиться в
     теці завантажень, а iPhone ще й відкривав файл поверх кабінету без
     дороги назад. Тож там — системне «Поділитися»: зберегти у «Файли»,
     надіслати учневі, відкрити в іншій програмі. Не вийшло (браузер не
     вміє чи минуло забагато часу від дотику) — звичайне завантаження. */
  function giveFile(blob, name) {
    var file = null;
    if (C.touchy() && navigator.share && navigator.canShare && window.File) {
      try { file = new File([blob], name, { type: blob.type || 'application/octet-stream' }); } catch (e) { file = null; }
    }
    if (file && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).catch(function (e) {
        if (!(e && e.name === 'AbortError')) saveFile(blob, name);   // відмовились у меню — нічого не робимо
      });
      return;
    }
    saveFile(blob, name);
  }

  function saveFile(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    /* Посилання живе хвилину, а не секунду: телефон відкриває файл не
       одразу, і за секунду його вже не було — «не вдалося завантажити». */
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
  }

  /* ============================================================
     Дії
     ============================================================ */

  var ACTIONS = {
    'nav': function (arg) { closeMenu(); App.go(arg); },

    /* Нижня панель телефона. Вкладки не накопичуються в історії: з Огляду —
       новий запис, з іншої вкладки — замість поточної. Тож «Назад» із
       будь-якої вкладки веде на Огляд, а звідти — із застосунку, як заведено
       на Android. Якщо цей розділ уже лежить позаду (учень → «Учні»), —
       повертаємось до нього, разом із прокруткою. Ще раз на свою ж вкладку —
       нагору сторінки, у розкладі — до лінії «Зараз». */
    'tabnav': function (arg) {
      closeMenu();
      var path = parseRoute().path;
      var target = arg.replace(/^#/, '') || '/';
      if (path === target) {
        var now = document.querySelector('[data-ag-now]');
        if (now && now.scrollIntoView) now.scrollIntoView({ block: 'center', behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      var steps = C.hist.find(target);
      if (steps) { history.go(steps); return; }
      App.go(arg, path !== '/');
    },

    'back': function (arg) { App.back(arg); },

    'board-retry': function () { App.render(); },

    'menu': function () {
      if (window.innerWidth <= PHONE) { moreSheet(); return; }
      var app = document.querySelector('.app');
      if (app) app.classList.toggle('is-menu');
    },

    'bar-more': function () {
      if (!barMore.length) return;
      C.modal({
        title: 'Дії',
        body: '<div class="act-list">' + barMore.map(function (b) {
          return '<button class="act-list__i" data-act="' + U.esc(b.act) + '"' +
            (b.arg ? ' data-arg="' + U.esc(b.arg) + '"' : '') + '>' + b.svg +
            '<span>' + U.esc(b.label) + '</span></button>';
        }).join('') + '</div>',
        onMount: function (wrap, close) {
          // спершу закрити список, потім виконати дію: вона часто відкриває свою шторку
          wrap.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('[data-act]')) close();
          });
        }
      });
    },

    'app-install': function () {
      if (!installEvt) return;
      var ev = installEvt;
      ev.prompt();
      ev.userChoice.then(function () {
        installEvt = null;
        // картка могла лишитися у відкритій шторці «Ще» — пропозиція вже використана
        U.$$('.install-card').forEach(function (el) { el.remove(); });
        App.render();
      }, function () {});
    },

    'sidebar-toggle': function () {
      sidebarState.collapsed = !sidebarState.collapsed;
      saveSidebar();
      applySidebar();
    },

    'student-open': function (arg) { closeMenu(); App.go('#/student/' + arg); },
    'student-add': function () { F.student(null); },
    'student-edit': function (arg) { F.student(arg); },
    // через S.setArchived: той прибирає уроки часу відсутності й заповнює розклад
    'student-restore': function (arg) { S.setArchived(arg, false); U.toast('Учня повернуто', 'ok'); App.render(); },

    'lesson-add': function () { F.lesson(null, {}); },
    'lesson-add-for': function (arg) { F.lesson(null, { studentId: arg, lockStudent: true }); },
    'lesson-add-day': function (arg) { F.lesson(null, { date: arg }); },
    'lesson-open': function (arg) { F.lessonView(arg); },
    'lesson-toggle-done': function (arg) {
      var l = S.get('lessons', arg);
      if (!l) return;
      if (l.status === 'done') {
        S.uncompleteLesson(arg);
        U.toast('Урок знову запланований');
      } else {
        S.completeLesson(arg, true);
        U.toast('Проведено й оплачено · ' + U.money(l.price || 0, S.lessonCur(l)), 'ok');
      }
      App.render();
    },
    'lesson-edit': function (arg) { F.lesson(arg); },
    'board-open': function (arg) { App.go('#/board/' + arg); },

    'hw-add': function (arg) { F.homework(null, { studentId: arg, lockStudent: true }); },
    'hw-edit': function (arg) { F.homework(arg); },
    /* Завдання просто з уроку: учень і урок уже відомі, тому питати їх не треба. */
    'hw-add-lesson': function (lessonId) {
      var l = S.get('lessons', lessonId);
      if (!l) return;
      F.homework(null, { studentId: l.studentId, lessonId: lessonId, lockStudent: true });
    },

    'pay-add': function (arg) { F.payment(null, arg ? { studentId: arg, lockStudent: true } : {}); },
    'pay-edit': function (arg) { F.payment(arg); },

    /* З чого склався дохід місяця. Відповідь має бути на відстані одного
       натискання на саму суму, а не в голові. */
    'income-what': function () {
      C.modal({
        title: 'З чого склався дохід',
        sub: 'кожна оплата цього місяця — усі валюти й усі учні',
        wide: true,
        body: V.incomeWhat(),
        buttons: [{ label: 'Закрити', kind: 'btn--ghost', act: 'cancel' }]
      });
    },

    'pay-drop': function (arg) {
      var p = S.get('payments', arg);
      if (!p) return;
      C.confirm('Видалити оплату?',
        U.money(p.amount, S.paymentCur(p)) + ' від ' + U.fmtDate(p.date) +
        '. Запис зникне на всіх пристроях, баланс учня перерахується.',
        function () {
          S.remove('payments', arg);
          var box = document.querySelector('.modal__body');
          if (box) box.innerHTML = V.incomeWhat();
          App.render();
        }, 'Видалити');
    },
    'pay-export': function () { F.exportPayments(); },

    'note-add': function (arg) { F.note(null, { studentId: arg }); },
    'note-edit': function (arg) { F.note(arg); },

    'mat-add': function () { F.material(null); },
    'mat-add-theory': function () { F.importSheets(); },
    'mat-edit': function (arg) { F.material(arg); },

    'contacts': function (arg) { V.contactsModal(arg); },
    'student-portal': function (arg) { V.portalModal(arg); },

    'desk-add':    function () { F.deskItem(null); },
    'desk-edit':   function (arg) { F.deskItem(arg); },
    'desk-open':   function (arg) {
      // дошка створюється на місці: справа без неї сенсу не має
      S.ensureBoard(arg);
      App.go('#/board/' + arg);
    },
    'desk-status': function (arg) { V.deskCycle(arg); },
    'gen-week': function () { F.generateWeek(); },

    // вкладки учня — та сама сторінка, тож без нового запису в історії
    'tab': function (arg) {
      var r = parseRoute();
      if (r.parts[0] === 'student') App.go('#/student/' + r.parts[1] + '/' + arg, true);
    },
    'filter-goal': function (arg) { setQuery({ goal: arg }); },
    'filter-topic': function (arg) { setQuery({ topic: arg }); },
    'filter-tag': function (arg) { setQuery({ tag: arg }); },
    'filter-cur': function (arg) { setQuery({ cur: arg }); },
    'week': function (arg) { setQuery({ w: arg === '0' ? '' : arg }); },
    // вигляд пишемо в адресу завжди: на телефоні без нього відкривається список
    'cal-view': function (arg) { setQuery({ v: arg, off: '' }); },
    'cal-nav': function (arg) { setQuery({ off: arg === '0' ? '' : arg }); },
    'cal-panel': function () { V.toggleCalPanel(); App.render(); },
    'cal-money': function () { V.toggleCalMoney(); App.render(); },
    'rates-refresh': function () {
      if (!window.Rates) return;
      U.toast('Питаю курс у НБУ…');
      window.Rates.refresh(true).then(function (ok) {
        U.toast(ok ? 'Курс НБУ оновлено' : 'Не вдалося: ' + (window.Rates.state().error || 'немає зв’язку'),
          ok ? 'ok' : 'err');
        App.render();
      });
    },
    'rates-save': function () {
      var root = document.getElementById('rates-form');
      if (!root || !window.Rates) return;
      var v = C.readForm(root);
      Object.keys(v).forEach(function (k) {
        if (k.indexOf('rate_') === 0) window.Rates.setManual(k.slice(5), v[k]);
      });
      U.toast('Курс збережено', 'ok');
      App.render();
    },

    'tutor-save': function () {
      var root = document.getElementById('tutor-form');
      var v = C.readForm(root);
      /* Поля — на місці, а не новий обʼєкт. У tutor живе й службове:
         код календаря (без нього підписаний Google Календар мовчки
         застигав), порядок розділів, межа заповненого розкладу. Заміна
         цілим обʼєктом стирала їх — і стирання їхало на всі пристрої. */
      var t = S.db().tutor || (S.db().tutor = {});
      Object.assign(t, {
        name: v.name || 'Репетитор',
        subject: v.subject || 'Математика',
        defaultPrice: v.defaultPrice || 500,
        currency: v.currency || 'UAH',
        defaultDuration: v.defaultDuration || 60,
        meetUrl: v.meetUrl || ''
      });
      S.save();
      U.toast('Профіль збережено', 'ok');
      App.render();
    },

    'export': function () {
      U.toast('Готую резервну копію…');
      // exportBundle асинхронний, бо збирає ще й картинки дошок з IndexedDB
      S.exportBundle().then(function (json) {
        var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        saveFile(blob, 'mathhub-backup-' + U.ymd(new Date()) + '.json');
        U.toast('Копію завантажено · ' + Math.max(1, Math.round(blob.size / 1024)) + ' КБ', 'ok');
      }).catch(function (e) {
        U.toast('Не вдалося зібрати копію: ' + (e && e.message ? e.message : e), 'err');
      });
    },

    'import': function () {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'application/json,.json';
      inp.addEventListener('change', function () {
        var file = inp.files && inp.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          S.importBundle(String(reader.result)).then(function (imgCount) {
            U.toast(imgCount ? 'Дані та ' + U.pl(imgCount, 'картинку', 'картинки', 'картинок') + ' імпортовано'
                             : 'Дані імпортовано', 'ok');
            App.go('#/');
            App.render();
          }).catch(function (e) {
            U.toast('Не вдалося прочитати файл: ' + (e && e.message ? e.message : e), 'err');
          });
        };
        reader.readAsText(file, 'utf-8');
      });
      inp.click();
    },

    'sync-signin': function () {
      var root = document.getElementById('sync-form');
      if (!root || !window.Cloud) return;
      var v = C.readForm(root);
      if (!v.email || !v.password) { U.toast('Вкажіть пошту й пароль', 'err'); return; }
      U.toast('Входжу…');
      window.Cloud.signIn(v.email, v.password).then(function () {
        U.toast('Ви увійшли', 'ok');
        App.render();
      }).catch(function (e) {
        U.toast(e && e.message ? e.message : 'Не вдалося увійти', 'err');
      });
    },

    /* Файл матеріалу лежить у сховищі браузера, тому «завантажити» —
       це дістати його звідти й віддати браузеру як звичайний файл. */
    'mat-file': function (key) {
      if (!window.ImgStore || !window.ImgStore.available()) {
        U.toast('Сховище файлів недоступне', 'err'); return;
      }
      var meta = null;
      S.db().materials.forEach(function (m) {
        (m.files || []).forEach(function (f) { if (f.key === key) meta = f; });
      });
      window.ImgStore.get(key).then(function (blob) {
        if (!blob) { U.toast('Файл не знайдено — можливо, його прибрали', 'err'); return; }
        giveFile(blob, (meta && meta.name) || 'файл');
      }).catch(function (e) {
        U.toast('Не вдалося відкрити файл: ' + (e && e.message ? e.message : e), 'err');
      });
    },

    'sync-signup': function () {
      var root = document.getElementById('sync-form');
      if (!root || !window.Cloud) return;
      var v = C.readForm(root);
      if (!v.email || !v.password) { U.toast('Вкажіть пошту й пароль', 'err'); return; }
      if (String(v.password).length < 6) { U.toast('Пароль — щонайменше 6 символів', 'err'); return; }
      U.toast('Створюю акаунт…');
      window.Cloud.signUp(v.email, v.password).then(function (entered) {
        if (entered) U.toast('Акаунт створено', 'ok');
        else U.toast('Перевірте пошту й перейдіть за посиланням, потім натисніть «Увійти»', 'ok');
        App.render();
      }).catch(function (e) {
        U.toast(e && e.message ? e.message : 'Не вдалося створити акаунт', 'err');
      });
    },

    /* Новий пароль прямо з кабінету, де вже виконано вхід. Поле пошти
       в формі — щоб браузер запропонував зберегти пару «пошта + пароль»
       і сам підставив її на телефоні. */
    'account-password': function () {
      if (!window.Cloud || !Cloud.signedIn()) return;
      var email = (Cloud.status() || {}).email || '';
      C.modal({
        title: 'Новий пароль',
        sub: 'старий знати не треба — ви вже в кабінеті',
        body:
          '<form id="acc-pass" class="stack" data-submit="save">' +
            '<label class="field"><span class="field__label">Пошта акаунта</span>' +
              '<input class="input" name="email" type="email" autocomplete="username" readonly value="' +
              U.esc(email) + '"></label>' +
            '<label class="field"><span class="field__label">Новий пароль</span>' +
              '<input class="input" name="p1" type="password" autocomplete="new-password" minlength="8"></label>' +
            '<label class="field"><span class="field__label">Ще раз</span>' +
              '<input class="input" name="p2" type="password" autocomplete="new-password"></label>' +
            '<div class="field__hint">Щонайменше 8 символів. Браузер запропонує його зберегти — ' +
              'погодьтеся: тоді на телефоні він підставиться сам.</div>' +
          '</form>',
        buttons: [
          { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
          {
            label: 'Зберегти', kind: 'btn--primary', act: 'save',
            onClick: function (wrap, close) {
              var v = C.readForm(wrap.querySelector('#acc-pass'));
              if (String(v.p1 || '').length < 8) { U.toast('Пароль — щонайменше 8 символів', 'err'); return false; }
              if (v.p1 !== v.p2) { U.toast('Паролі не збігаються', 'err'); return false; }
              Cloud.setPassword(v.p1).then(function () {
                close();
                U.toast('Пароль змінено', 'ok');
              }).catch(function (e) {
                U.toast(e && e.message ? e.message : 'Не вдалося змінити пароль', 'err');
              });
              return false;
            }
          }
        ]
      });
    },

    'sync-signout': function () {
      C.confirm('Вийти з синхронізації?',
        'Дані залишаться в цьому браузері, але оновлюватися з сервера перестануть. ' +
        'Увійти можна будь-коли.',
        function () { window.Cloud.signOut(); U.toast('Вихід виконано'); App.render(); },
        'Вийти');
    },

    'sync-now': function () {
      if (!window.Cloud) return;
      window.Cloud.syncNow().then(function () {
        var st = window.Cloud.status();
        if (st.state === 'idle') U.toast('Усе збережено', 'ok');
        else if (st.state !== 'syncing') U.toast(st.detail || 'Не вдалося зберегти', 'err');
        App.render();
      });
    },

    'sync-restore-local': function (i) {
      C.confirm('Повернути дані, що були до синхронізації?',
        'Поточні дані буде замінено цією копією, і вона поїде на сервер як актуальна. ' +
        'Поточна версія при цьому потрапить в історію на сервері, тому дію можна відкотити.',
        function () {
          U.toast('Повертаю…');
          window.Cloud.restoreBackup(Number(i)).then(function () {
            U.toast('Дані повернуто', 'ok');
            App.go('#/');
            App.render();
          }).catch(function (e) {
            U.toast('Не вдалося повернути: ' + (e && e.message ? e.message : e), 'err');
          });
        },
        'Повернути');
    },

    /* Чесна перевірка картинок: не «є ключ у сховищі», а справжня спроба
       прочитати файл. Читання перехоплене синхронізацією, тож те, що лежить
       на сервері, дорогою підтягнеться до себе — перевірка заразом і лікує. */
    /* Перезавантаження, яке справді бере свіжий код.

       Звичайне оновлення сторінки цього не гарантує: і кеш браузера, і
       service worker можуть віддати те саме старе. Тому спершу викидаємо
       їхні запаси, а вже потім перезавантажуємо. */
    'hard-reload': function (_a, el) {
      if (el) { el.disabled = true; el.textContent = 'Оновлюю…'; }
      var jobs = [];

      if (window.caches && caches.keys) {
        jobs.push(caches.keys().then(function (ks) {
          return Promise.all(ks.map(function (k) { return caches.delete(k); }));
        }).catch(function () {}));
      }
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.unregister(); }));
        }).catch(function () {}));
      }

      Promise.all(jobs).then(function () {
        location.reload();
      });
    },

    /* Полагодити «учень бачить старе» одним натисканням.

       Раніше тут писало «відкрийте дошку такого уроку». Це працює, але
       перекладає роботу на людину саме тоді, коли вона й так дізналася про
       чужу помилку — і на кожен урок треба окреме відкриття й очікування. */
    'fix-publish': function (_a, el) {
      if (!V.staleForStudents) return;
      var ids = V.staleForStudents();
      if (!ids.length) { U.toast('Усе вже відправлено', 'ok'); return; }

      if (el) { el.disabled = true; el.textContent = 'Надсилаю…'; }
      var ok = 0, fail = 0, lastErr = '';

      ids.reduce(function (chain, id) {
        return chain.then(function () {
          return V.republishLesson(id).then(function () { ok++; },
            function (e) { fail++; lastErr = (e && e.message) || 'немає звʼязку'; });
        });
      }, Promise.resolve()).then(function () {
        if (el) { el.disabled = false; el.textContent = 'Надіслати ще раз'; }
        if (ok && !fail) U.toast('Учні бачать свіже: ' + U.pl(ok, 'урок', 'уроки', 'уроків'), 'ok');
        else if (ok) U.toast('Відправлено ' + ok + ', не вийшло ' + fail + ': ' + lastErr, 'err');
        else U.toast('Не вдалося відправити: ' + lastErr, 'err');
        if (V.fillHealthAsync) V.fillHealthAsync();
      });
    },

    /* Відправити на сервер усі дошки, яких там немає.

       Черга й так повторює спроби сама, але коли людина вже побачила, що
       дошки немає на сервері, чекати наступного повтору вона не повинна. */
    'push-boards': function (_a, el) {
      if (!window.BoardSync) return;
      if (el) { el.disabled = true; el.textContent = 'Відправляю…'; }

      var boards = S.db().boards.filter(function (b) {
        return (b.slides || []).some(function (sl) { return (sl.items || []).length; });
      });
      var ok = 0, fail = 0;

      boards.reduce(function (chain, b) {
        return chain.then(function () {
          return BoardSync.push(b.lessonId).then(function (done) {
            if (done) ok++; else fail++;
          });
        });
      }, Promise.resolve()).then(function () {
        if (el) { el.disabled = false; el.textContent = 'Відправити дошки на сервер'; }
        if (ok && !fail) U.toast('На сервері тепер ' + U.pl(ok, 'дошка', 'дошки', 'дошок'), 'ok');
        else if (ok) U.toast('Відправлено ' + ok + ', не вийшло ' + fail, 'err');
        else U.toast('Не вдалося відправити жодної дошки', 'err');
        if (V.fillHealthAsync) V.fillHealthAsync();
      });
    },

    /* Відкрити вкладення справи. Файл лежить у сховищі браузера, тож
       спершу дістаємо його, і лише потім віддаємо системі. */
    'sheet-open': function (id) { App.go('#/sheet/' + id); },

    /* Видалення теми питає підтвердження й називає її поіменно: у довіднику
       теми схожі, і «ви впевнені?» без назви тут нічого не означає. */
    /* Календар. Вмикання створює код підписки й одразу викладає файл;
       вимикання видаляє його зі сховища — посилання перестає працювати. */
    'cal-on': function (_a, el) {
      if (el) { el.disabled = true; el.textContent = 'Вмикаю…'; }
      ICS.enable().then(function () {
        U.toast('Календар готовий — скопіюйте посилання', 'ok');
        App.render();
      }).catch(function (e) {
        if (el) { el.disabled = false; el.textContent = 'Увімкнути'; }
        U.toast('Не вийшло: ' + (e && e.message ? e.message : e), 'err');
      });
    },

    'cal-off': function () {
      C.confirm('Вимкнути календар?',
        'Посилання перестане працювати, і підписані календарі більше нічого ' +
        'не побачать. Уроки в самій програмі лишаться недоторканими.',
        function () {
          ICS.disable().then(function () { U.toast('Вимкнено'); App.render(); });
        },
        'Вимкнути');
    },

    'cal-copy': function () {
      var url = ICS.url();
      if (!url) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
          .then(function () { U.toast('Посилання скопійовано', 'ok'); })
          .catch(function () { U.toast('Скопіюйте вручну з поля', 'err'); });
      }
    },

    /* Google Календар напряму (gcal.js). Код скрипта — уже з секретом. */
    'gcal-code': function () {
      if (!window.GCal) return;
      var code = GCal.scriptCode();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code)
          .then(function () { U.toast('Код скопійовано — вставте його в новий проєкт Apps Script', 'ok'); })
          .catch(function () { U.toast('Не вдалося скопіювати — браузер не дозволив', 'err'); });
      } else {
        U.toast('Браузер не вміє копіювати — оновіть його', 'err');
      }
    },

    'gcal-connect': function (_a, el) {
      var inp = document.querySelector('[data-gcal-url]');
      if (!inp || !window.GCal) return;
      if (el) { el.disabled = true; el.textContent = 'Перевіряю…'; }
      GCal.connect(inp.value).then(function () {
        U.toast('Підключено — розклад іде в Google', 'ok');
        App.render();
      }).catch(function (e) {
        if (el) { el.disabled = false; el.textContent = 'Підключити'; }
        U.toast((e && e.message) || 'Не вдалося підключити', 'err');
      });
    },

    'gcal-now': function (_a, el) {
      if (!window.GCal) return;
      if (el) el.disabled = true;
      // і перевірити, чи події справді на місці: їх могли видалити в самому Google
      GCal.push(true, true).then(function (r) {
        if (r && GCal.state().ok) U.toast('Google Календар оновлено', 'ok');
        else U.toast('Не вийшло: ' + (GCal.state().err || 'немає звʼязку'), 'err');
        App.render();
      });
    },

    'gcal-off': function () {
      C.confirm('Вимкнути запис у Google?',
        'Кабінет перестане оновлювати календар «Уроки · Вектор». Події, що вже там, лишаться — ' +
        'календар можна прибрати в самому Google.',
        function () { GCal.disconnect(); U.toast('Вимкнено'); App.render(); },
        'Вимкнути');
    },

    'cal-now': function () {
      ICS.publish(true).then(function () { U.toast('Календар оновлено', 'ok'); App.render(); })
        .catch(function (e) { U.toast('Не вийшло: ' + (e && e.message ? e.message : e), 'err'); });
    },

    /* Разова дія: відкрити Google з уже заповненою подією. Потрібна тоді,
       коли урок має бути в календарі зараз, а не коли Google перечитає
       підписку. */
    'cal-add-one': function (lessonId) {
      var l = S.get('lessons', lessonId);
      var url = window.ICS ? ICS.googleUrl(l) : '';
      if (!url) { U.toast('Не вдалося зібрати подію', 'err'); return; }
      window.open(url, '_blank', 'noopener');
    },

    'sheet-refresh': function (id) { F.refreshSheet(id); },
    'sheets-refresh-all': function () { F.refreshAllSheets(); },

    'sheet-del': function (id) {
      var m = S.get('materials', id);
      if (!m) return;
      // сторінка шпаргалок англійська — і питання про видалення теж
      var nr = (m.rules || []).length;
      C.confirm('Delete “' + (m.title || 'topic') + '”?',
        nr + (nr === 1 ? ' block' : ' blocks') + ' of this topic will be removed. Other topics stay untouched.',
        function () {
          S.remove('materials', id);
          U.toast('Topic deleted');
          App.go('#/sheet');
          App.render();
        },
        'Delete', 'Cancel');
    },
    'sheet-print': function () { window.print(); },

    // «Ще N файлів» — показати решту переліку на місці
    'more-rows': function (_a, el) {
      var box = el && el.previousElementSibling;
      if (box && box.classList.contains('more-rows')) box.hidden = false;
      if (el) el.remove();
    },
    // згорнута нотатка справи: дотик розгортає й згортає
    'note-more': function (_a, el) {
      if (el && el.classList.contains('is-clamped')) el.classList.toggle('is-open');
    },

    'desk-file': function (key) {
      if (!window.ImgStore || !key) return;
      ImgStore.get(key).then(function (blob) {
        if (!blob) { U.toast('Файл не знайшовся', 'err'); return; }

        var name = 'файл';
        (S.deskItems() || []).forEach(function (d) {
          (d.files || []).forEach(function (f) { if (f.key === key && f.name) name = f.name; });
        });

        giveFile(blob, name);
      }).catch(function () { U.toast('Не вдалося відкрити файл', 'err'); });
    },

    'tg-test': function (_a, el) {
      if (el) { el.disabled = true; el.textContent = 'Надсилаю…'; }
      window.Cloud.request('/rest/v1/rpc/tg_test', { method: 'POST', body: '{}' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (r) {
          if (el) { el.disabled = false; el.textContent = 'Надіслати пробне'; }
          if (r === 'надіслано') U.toast('Надіслано — подивіться в Telegram', 'ok');
          else U.toast('Нагадування ще не підʼєднані', 'err');
          if (V.fillTelegramAsync) V.fillTelegramAsync();
        })
        .catch(function (e) {
          if (el) { el.disabled = false; el.textContent = 'Надіслати пробне'; }
          U.toast('Не вийшло: ' + (e && e.message ? e.message : e), 'err');
        });
    },

    'check-images': function (_a, el) {
      if (!window.ImgStore || !ImgStore.available()) return;
      var keys = S.usedImageKeys();
      if (el) { el.disabled = true; el.textContent = 'Перевіряю…'; }

      var missing = [];
      var i = 0;
      function step() {
        if (i >= keys.length) {
          if (el) { el.disabled = false; el.textContent = 'Перевірити картинки'; }
          if (!missing.length) U.toast('Усі ' + keys.length + ' картинок на місці', 'ok');
          else U.toast('Не знайшлося: ' + U.pl(missing.length, 'картинка', 'картинки', 'картинок') +
            ' з ' + keys.length + '. Спробуйте імпорт з файлу резервної копії', 'err');
          if (V.fillHealthAsync) V.fillHealthAsync();
          return;
        }
        var k = keys[i++];
        ImgStore.get(k).then(function (blob) {
          if (!blob) missing.push(k);
          step();
        }, function () { missing.push(k); step(); });
      }
      step();
    },

    'vault-restore': function (id) {
      C.confirm('Повернути цю копію?',
        'Поточні дані буде замінено копією з памʼяті браузера. Перед заміною теперішня ' +
        'версія теж відкладеться в копії, тому дію можна відкотити.',
        function () {
          U.toast('Повертаю…');
          window.Cloud.restoreVault(id).then(function () {
            U.toast('Копію повернуто', 'ok');
            App.go('#/');
            App.render();
          }).catch(function (e) {
            U.toast('Не вдалося повернути: ' + (e && e.message ? e.message : e), 'err');
          });
        },
        'Повернути');
    },

    'sync-restore': function (id) {
      C.confirm('Відновити цю версію?',
        'Поточні дані буде замінено вибраною копією. Сама поточна версія при цьому ' +
        'теж потрапить в історію, тому цю дію можна відкотити.',
        function () {
          U.toast('Відновлюю…');
          window.Cloud.restoreSnapshot(id).then(function () {
            U.toast('Версію відновлено', 'ok');
            App.go('#/');
            App.render();
          }).catch(function (e) {
            U.toast('Не вдалося відновити: ' + (e && e.message ? e.message : e), 'err');
          });
        },
        'Відновити');
    },

    'reset-demo': function () {
      // з входом кнопки немає; це — на випадок, якщо сторінку не перемалювали після входу
      if (window.Cloud && Cloud.available() && Cloud.signedIn()) {
        U.toast('З увімкненим обміном демо-дані недоступні: вони змішалися б зі справжніми', 'err');
        return;
      }
      C.confirm('Повернути демо-дані?',
        'Поточні дані буде замінено демонстраційними. Якщо там є реальні учні — спершу зробіть експорт.',
        function () { S.reset(); U.toast('Демо-дані відновлено', 'ok'); App.go('#/'); App.render(); },
        'Так, замінити');
    },

    'wipe': function () {
      C.confirm('Очистити всі дані?',
        'Буде видалено всіх учнів, уроки, домашні завдання, оплати, нотатки й матеріали' +
        (window.Cloud && Cloud.available() && Cloud.signedIn() ? ' — на всіх ваших пристроях' : '') +
        '. Профіль і налаштування лишаться. Відновити не вийде.',
        function () { S.wipe(); U.toast('Дані очищено'); App.go('#/'); App.render(); },
        'Так, видалити все');
    }
  };

  // Дії дошки живуть у views-board.js — підмішуємо їх у спільний диспетчер
  Object.keys(V.boardActions).forEach(function (k) { ACTIONS[k] = V.boardActions[k]; });
  if (V.olympActions) Object.keys(V.olympActions).forEach(function (k) { ACTIONS[k] = V.olympActions[k]; });
  if (V.bankActions) Object.keys(V.bankActions).forEach(function (k) { ACTIONS[k] = V.bankActions[k]; });
  if (V.formulaActions) Object.keys(V.formulaActions).forEach(function (k) { ACTIONS[k] = V.formulaActions[k]; });

  /* ============================================================
     Слухачі
     ============================================================ */

  /* Відкрите меню на телефоні: дотик будь-де поза ним — закрити. Сторінка
     під затемненням у цю мить не має реагувати, тож клік далі не йде. */
  document.addEventListener('click', function (e) {
    var app = document.querySelector('.app');
    if (!app || !app.classList.contains('is-menu')) return;
    if (e.target.closest('.sidebar')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    closeMenu();
  }, true);

  // поле з посиланням: клік виділяє його цілим, щоб одразу скопіювати
  document.addEventListener('click', function (e) {
    var f = e.target.closest && e.target.closest('[data-selectall]');
    if (f && f.select) f.select();
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    // щойно переставляли розділи — це не клік по розділу
    if (Date.now() - dragEndedAt < 350 && el.classList.contains('nav-item')) return;
    // не перехоплюємо звичайні посилання
    if (el.tagName === 'A' && el.href) return;
    var fn = ACTIONS[el.dataset.act];
    if (!fn) return;
    e.preventDefault();
    fn(el.dataset.arg || '', el, e);
  });

  document.addEventListener('input', function (e) {
    /* Пошук по конспектах фільтрує вже намальований список, а не перебудовує
       сторінку: інакше кожна літера скидала б фокус і позицію прокрутки. */
    if (e.target.matches && e.target.matches('[data-lesson-find]')) {
      var q = e.target.value.trim().toLowerCase();
      var shown = 0;
      U.$$('[data-hay]').forEach(function (el) {
        var hit = !q || el.dataset.hay.indexOf(q) > -1;
        el.hidden = !hit;
        if (hit) shown++;
      });
      var n = document.querySelector('[data-lesson-found]');
      if (n) n.textContent = q ? U.pl(shown, 'урок', 'уроки', 'уроків') : '';
      return;
    }

    if (e.target.id === 'stu-search') {
      clearTimeout(App._searchTimer);
      var val = e.target.value;
      App._searchTimer = setTimeout(function () { setQuery({ q: val }); }, 220);
    }
  });

  /* Нова адреса — нова сторінка: вікна старої закриваються (інакше шторка
     лишалась би над чужою сторінкою), а новий запис історії отримує свою
     глибину (див. C.hist). */
  C.hist.boot();
  window.addEventListener('hashchange', function () {
    C.closeAll(true);
    C.hist.stamp();
    App.render();
  });

  /* Пошук на телефоні: «Знайти» на клавіатурі ховає її — результати вже
     на екрані, а клавіатура закривала пів списку. Те саме в банку, в
     олімпіадах і в довіднику. Пошук на карті тут не рахується: там Enter
     відкриває першу знайдену тему (див. views-mathmap.js). */
  var SEARCHES = '#stu-search, #bk-q, #ol-q, [data-ref-q]';
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key !== 'Enter' || !t || !t.matches || !t.matches(SEARCHES) || !C.touchy()) return;
    e.preventDefault();
    t.blur();
  });

  /* Клавіатура телефона. iPhone, а з версії 108 і Chrome на Android, не
     зменшують сторінку під клавіатуру — вона просто наїжджає згори, разом
     зі шторкою, її полями й «Зберегти». Видима частина екрана
     (visualViewport) знає правду: її висоту й зсув передаємо в CSS
     (--vvh, --vvt), і шторка стоїть над клавіатурою. Поки клавіатура
     відкрита (html.kb-open), нижня панель і «+ Урок» ховаються. */
  (function () {
    var de = document.documentElement;
    var vv = window.visualViewport;
    if (vv) {
      var sync = function () {
        de.style.setProperty('--vvh', Math.round(vv.height) + 'px');
        de.style.setProperty('--vvt', Math.round(vv.offsetTop) + 'px');
      };
      vv.addEventListener('resize', function () {
        sync();
        // клавіатура зʼявилась — поле, в якому пишуть, не лишається під нею
        var a = document.activeElement;
        if (C.phone() && a && a.closest && a.closest('.modal') && a.scrollIntoView) {
          requestAnimationFrame(function () { a.scrollIntoView({ block: 'nearest' }); });
        }
      });
      vv.addEventListener('scroll', sync);
      sync();
    }
    /* Лише поля, що піднімають клавіатуру. Список (select) і дата з часом
       відкривають свій вибір, а після нього фокус лишається на полі, і
       focusout не приходить — нижня панель і «+ Урок» висіли б схованими
       без жодної клавіатури. */
    var TYPING = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file])' +
      ':not([type=button]):not([type=submit]):not([type=color])' +
      ':not([type=date]):not([type=time]):not([type=datetime-local]):not([type=month]):not([type=week]),' +
      ' textarea, [contenteditable="true"]';
    document.addEventListener('focusin', function (e) {
      if (e.target && e.target.matches && e.target.matches(TYPING)) de.classList.add('kb-open');
    });
    document.addEventListener('focusout', function () {
      setTimeout(function () {
        var a = document.activeElement;
        if (!a || !a.matches || !a.matches(TYPING)) de.classList.remove('kb-open');
      }, 50);
    });
  })();

  /* Прокрутку веде сам кабінет (див. App.render і розклад, що відкривається
     на «Зараз»). Браузер після оновлення сторінки повертав стару позицію
     вже після нас — і список розкладу стрибав на початок. */
  try { history.scrollRestoration = 'manual'; } catch (e) {}

  document.addEventListener('mousedown', function (e) {
    if (e.target.closest('.sidebar__resize')) startResize(e);
  });

  document.addEventListener('dblclick', function (e) {
    if (!e.target.closest('.sidebar__resize')) return;
    sidebarState.width = SIDEBAR_DEFAULT;
    saveSidebar();
    applySidebar();
  });

  window.addEventListener('resize', applySidebar);

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И')) {
      e.preventDefault();
      sidebarState.collapsed = !sidebarState.collapsed;
      saveSidebar();
      applySidebar();
      return;
    }
    if (e.target && e.target.matches && e.target.matches('input, textarea, select')) return;
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); F.lesson(null, {});
    }
    if (e.key === '/' ) {
      var s = document.getElementById('stu-search');
      if (s) { e.preventDefault(); s.focus(); }
      else { App.go('#/students'); }
    }
  });

  /* ============================================================
     Старт
     ============================================================ */

  /* Старт — коли важкі записи (дошки, страхові копії) вже в пам'яті:
     вони живуть в IndexedDB, і читаються асинхронно (див. disk.js). */
  function boot() {
  S.load();
  /* Тримаємо постійний розклад заповненим наперед — інакше уроки з шаблону
     довелось би щоразу генерувати вручну.

     Робимо це як службову дію: саме відкриття програми не має вважатися
     правкою. Інакше пристрій, який тиждень лежав із давніми даними,
     після запуску виглядав «новішим» і затирав те, що з'явилося потім. */
  function fillAhead() {
    var made = 0;
    try {
      // уроки з дошками, намальованими ще до позначки hasBoard, — позначити, щоб їх не вважали порожніми
      if (S.markDrawnLessons) S.markDrawnLessons();
      // двійники, що лишилися з часів, коли пристрої заповнювали розклад наосліп
      made += S.dedupeTemplateLessons();
      // прибирання, відкладене, поки дошки сервера були невідомі
      if (S.runTidy) made += S.runTidy();
      made += (window.Cloud && Cloud.housekeeping)
        ? Cloud.housekeeping(S.autoFillTemplates) : S.autoFillTemplates();
    } catch (e) { console.warn('autoFill:', e); }
    return made;
  }
  /* З обміном — лише після першого читання з сервера. Пристрій, що
     прокинувся з давніми даними, не бачить уроків, уже створених іншим, і
     заповнював би ті самі дні вдруге. Без обміну чекати нема на що. */
  if (window.Cloud && Cloud.available() && Cloud.signedIn() && window.RecSync && RecSync.afterFirstPull) {
    RecSync.afterFirstPull(function () {
      var go = function () {
        if (fillAhead() && !(window.V && V.boardMountedFor && V.boardMountedFor())) App.render();
      };
      /* І після дошок: прибирання двійників судить, чи урок порожній, а
         дошку, намальовану на іншому пристрої, треба спершу побачити. */
      if (window.BoardSync && BoardSync.pullAll) BoardSync.pullAll().then(go, go);
      else go();
    });
  } else {
    fillAhead();
  }
  App.render();
  applySidebar();

  /* Захист сховища. Дві дії, обидві мовчазні.

     Перша: просимо браузер вважати дані цього сайту постійними. Без такого
     дозволу він має право стерти їх цілком, коли на диску стає тісно, —
     без попередження й без можливості повернути.

     Друга: раз на добу відкладаємо копію бази в IndexedDB. Найгірші втрати
     трапляються не в момент синхронізації, а тихо, і виявляються за кілька
     днів — коли трьох копій «перед синхронізацією» вже давно немає. */
  try {
    if (window.ICS && ICS.watch) ICS.watch();
    // Google Календар напряму: перенесений урок — у календарі за кілька секунд
    if (window.GCal && GCal.start) GCal.start();

    if (window.Vault && Vault.available()) {
      Vault.persist();

      var DAILY = 'mathhub.vault.daily';
      var today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(DAILY) !== today) {
        Vault.put('щоденна копія', S.exportJSON()).then(function () {
          try { localStorage.setItem(DAILY, today); } catch (e) {}
        });
      }
    }
  } catch (e) { console.warn('vault:', e); }
  }

  if (window.Disk) Disk.ready(boot); else boot();

  /* Рушій дошки готуємо заздалегідь, але вже після того, як кабінет
     показався й ожив: тоді й старт швидкий, і дошка потім відкривається
     без паузи. */
  setTimeout(function () {
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1); };
    idle(function () { App.need('board').catch(function () {}); });
  }, 4000);

  /* Рядок стану синхронізації оновлюємо на місці, без перемальовування сторінки:
     інакше він застигає таким, яким був у момент рендеру. */
  if (window.Cloud && window.Cloud.onChange) {
    window.Cloud.onChange(function () {
      var el = document.querySelector('[data-sync-state]');
      if (el && V.syncStatusHtml) el.innerHTML = V.syncStatusHtml();
    });
  }

  /* Оновлення — як у Miro: саме й непомітно.

     Раніше висіли смуги «Вийшла нова версія» й «Ця вкладка працює на
     старому коді — Оновити зараз», і кожне оновлення сайту перетворювалось
     на дію для людини. Тепер сторінка перезавантажується сама, але лише
     в тиху мить: коли вкладка у фоні або хвилину ніхто нічого не робить,
     не набирає текст і не тримає відкрите вікно. Перед цим усе незбережене
     відправляється. */
  var reloadWanted = false;
  var reloadHard = false;
  var lastInput = Date.now();

  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true, capture: true });
  });

  /* Відкрита шторка, поле з текстом, дошка — не тиха мить, навіть коли
     застосунок у фоні. На телефоні «у фоні» — це щохвилини: перемкнулись у
     Telegram чи на зустріч, і досі напівзаповнену шторку перезавантаження
     стирало. Тепер — лише коли нічого не почато. */
  function quietMoment() {
    if (document.querySelector('.modal-backdrop, .modal')) return false;
    var ae = document.activeElement;
    if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable)) return false;
    if (window.V && V.boardMountedFor && V.boardMountedFor()) return false;
    if (document.hidden) return true;
    return Date.now() - lastInput > 60000;
  }
  // повернулись у застосунок — це теж дія: не перезавантажувати під пальцем
  document.addEventListener('visibilitychange', function () { if (!document.hidden) lastInput = Date.now(); });

  function reloadNow() {
    var jobs = [];
    try { if (window.Cloud && Cloud.flush) jobs.push(Cloud.flush()); } catch (e) {}
    try { if (window.RecSync && RecSync.flush) jobs.push(RecSync.flush()); } catch (e) {}
    try { if (window.BoardSync && BoardSync.flush) jobs.push(BoardSync.flush()); } catch (e) {}
    if (reloadHard) {
      /* Запамʼятати, через яку розбіжність перезавантажуємось: якщо й після
         цього вона лишиться, справа не в кеші, і по колу не підемо (див.
         checkVersion у cloud.js). */
      if (staleInfo) {
        try {
          localStorage.setItem('mathhub.hardReload', JSON.stringify({
            here: staleInfo.here, there: staleInfo.there, at: Date.now()
          }));
        } catch (e) {}
      }
      // код на сервері новіший за кеш — кеш прибираємо, інакше знову відкрився б старий
      if (window.caches && caches.keys) {
        jobs.push(caches.keys().then(function (ks) {
          return Promise.all(ks.map(function (k) { return caches.delete(k); }));
        }).catch(function () {}));
      }
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.unregister(); }));
        }).catch(function () {}));
      }
    }
    var done = false;
    function go() { if (!done) { done = true; location.reload(); } }
    Promise.all(jobs.map(function (j) { return Promise.resolve(j).catch(function () {}); })).then(go);
    setTimeout(go, 4000);           // мережа зависла — не чекаємо вічно
  }

  function maybeReload() {
    if (reloadWanted && quietMoment()) { reloadWanted = false; reloadNow(); }
  }

  /** Перезавантажити на свіжий код у першу тиху мить. hard — повз кеш. */
  App.autoReload = function (hard) {
    reloadWanted = true;
    reloadHard = reloadHard || !!hard;
    maybeReload();
  };

  // старі виклики лишаються сумісними: замість смуги — тихе оновлення
  var staleInfo = null;
  App.staleCodeBar = function (here, there) {
    if (here != null && there != null) staleInfo = { here: here, there: there };
    App.autoReload(true);
  };

  setInterval(maybeReload, 5000);
  document.addEventListener('visibilitychange', maybeReload);

  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data === 'assets-updated') App.autoReload(false);
    });
  }

  /* Service worker вмикаємо лише на справжньому сайті (https).
     На localhost і при відкритті файлу напряму він не реєструється —
     інакше кеш заважав би бачити щойно внесені зміни.
     Раніше це стояло окремим скриптом прямо в index.html; захист сторінки
     від чужих скриптів (CSP) такого не виконує, тож тепер воно тут. */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) {
        console.warn('SW не зареєструвався:', e);
      });
    });
  }

  /* Вхід — одним вікном на початку, а не написами по всіх кутах.

     Без входу дошки живуть лише в цьому браузері, і досі про це нагадували
     жовті написи на кожній дошці. Miro робить простіше: спершу вхід, далі
     про нього ніхто не думає. Тут так само — вікно зʼявляється, коли
     відкривають кабінет без входу, і більше не заважає. «Пізніше» ховає
     його до закриття вкладки. */
  var ASK_KEY = 'vektor.askedSignIn';

  function askSignIn() {
    if (!window.Cloud || !Cloud.available() || Cloud.signedIn()) return;
    try { if (sessionStorage.getItem(ASK_KEY)) return; } catch (e) {}
    try { sessionStorage.setItem(ASK_KEY, '1'); } catch (e) {}

    C.modal({
      title: 'Увійдіть у кабінет',
      sub: 'щоб дошки, учні й розклад були на всіх пристроях і в учнів',
      body:
        '<form id="ask-signin" class="stack" data-submit="signin">' +
          '<label class="field"><span class="field__label">Пошта</span>' +
            '<input class="input" name="email" type="email" autocomplete="username"></label>' +
          '<label class="field"><span class="field__label">Пароль</span>' +
            '<input class="input" name="password" type="password" autocomplete="current-password"></label>' +
        '</form>',
      buttons: [
        { label: 'Пізніше', kind: 'btn--ghost' },
        {
          label: 'Увійти', kind: 'btn--primary', act: 'signin',
          onClick: function (wrap, close) {
            var v = C.readForm(wrap.querySelector('#ask-signin'));
            if (!v.email || !v.password) { U.toast('Вкажіть пошту й пароль', 'err'); return false; }
            Cloud.signIn(v.email, v.password).then(function () {
              close();
              App.render();
            }).catch(function (e) {
              U.toast(e && e.message ? e.message : 'Не вдалося увійти', 'err');
            });
            return false;
          }
        }
      ]
    });
  }

  window.addEventListener('load', function () { setTimeout(askSignIn, 400); });

  /* Enter у формі вікна — те саме, що його головна кнопка (data-submit
     каже, яка саме). Обробник тут, а не атрибутом onsubmit у розмітці:
     захист сторінки від чужих скриптів (CSP) не виконує жодного коду,
     вписаного прямо в HTML. */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.hasAttribute || !form.hasAttribute('data-submit')) return;
    e.preventDefault();
    var wrap = form.closest('.modal');
    var btn = wrap && wrap.querySelector('[data-mb="' + form.getAttribute('data-submit') + '"]');
    if (btn) btn.click();
  });

  /* Сесія закінчилась посеред роботи (пароль змінили деінде, вийшли з іншого
     пристрою). Мовчки працювати далі не можна: усе нове лишалося б лише
     тут. Тому те саме одне вікно входу — одразу, як у Miro. */
  if (window.Cloud && Cloud.onChange) {
    var wasIn = Cloud.available() && Cloud.signedIn();
    Cloud.onChange(function (st) {
      var nowIn = st.state !== 'signedout' && st.state !== 'off';
      if (wasIn && !nowIn) {
        try { sessionStorage.removeItem(ASK_KEY); } catch (e) {}
        setTimeout(askSignIn, 200);
      }
      wasIn = nowIn;
    });
  }

  window.App = App;
})();
