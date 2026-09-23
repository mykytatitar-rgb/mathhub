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
  App.BUILD = 'v106';
  window.APP_BUILD = App.BUILD;

  var NAV = [
    { hash: '#/',          icon: 'grid',      label: 'Огляд' },
    { hash: '#/students',  icon: 'users',     label: 'Учні',      count: function () { return S.students().length; } },
    { hash: '#/schedule',  icon: 'calendar',  label: 'Розклад',   count: function () {
        return S.lessonsOnDay(U.today()).filter(function (l) { return l.status === 'planned'; }).length; } },
    { hash: '#/finance',   icon: 'wallet',    label: 'Фінанси' },
    { hash: '#/materials', icon: 'folder',    label: 'Матеріали' },
    /* Довідник окремим пунктом, а не всередині матеріалів: до нього
       заглядають посеред уроку, і зайвий крок тут дорого коштує. */
    { hash: '#/reference', icon: 'book',      label: 'Довідник',  count: function () {
        return S.db().materials.filter(function (m) { return m.type === 'theory'; }).length; } },
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

  function setQuery(patch) {
    var r = parseRoute();
    Object.keys(patch).forEach(function (k) {
      if (patch[k] === '' || patch[k] == null) delete r.query[k];
      else r.query[k] = patch[k];
    });
    var qs = Object.keys(r.query).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(r.query[k]);
    }).join('&');
    location.hash = '#' + r.path + (qs ? '?' + qs : '');
  }

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

  /** На вузьких екранах сайдбар згорнутий примусово, незалежно від вибору. */
  function applySidebar() {
    var app = document.querySelector('.app');
    if (!app) return;
    var collapsed = window.innerWidth < 900 || sidebarState.collapsed;
    app.classList.toggle('is-collapsed', collapsed);
    document.documentElement.style.setProperty('--sidebar-w', sidebarState.width + 'px');
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

  function renderSidebar(route) {
    var students = S.students();
    var activeStudent = route.parts[0] === 'student' ? route.parts[1] : null;
    var path = '#' + (route.path === '/' ? '/' : route.path);

    var nav = navOrder().map(function (n) {
      var active = n.hash === '#/' ? (path === '#/' || path === '#') : path.indexOf(n.hash) === 0;
      if (n.hash === '#/students' && activeStudent) active = false;
      var cnt = n.count ? n.count() : 0;
      return '<button class="nav-item' + (active ? ' is-active' : '') + '" data-act="nav" data-arg="' + n.hash +
        '" title="' + U.esc(n.label) + ' · перетягніть, щоб переставити">' +
        icon(n.icon, 19) + '<span>' + n.label + '</span>' +
        (cnt ? '<span class="nav-item__count">' + cnt + '</span>' : '') + '</button>';
    }).join('');

    var stuList = students.map(function (s) {
      var stat = S.studentStats(s.id);
      var dot = stat.balance < 0 ? 'var(--red)' : stat.hwPending ? 'var(--amber)' : 'transparent';
      var next = stat.nextLesson;
      return '<button class="stu-item' + (activeStudent === s.id ? ' is-active' : '') +
        '" data-act="student-open" data-arg="' + s.id + '" title="' + U.esc(s.name + ' · ' + s.grade) + '">' +
        C.avatar(s, 32) +
        '<div style="min-width:0;flex:1">' +
        '<div class="stu-item__name truncate">' + U.esc(s.name) + '</div>' +
        '<div class="stu-item__sub truncate">' +
        (next ? U.fmtDate(next.date) + ' · ' + U.fmtTime(next.date) : s.grade) + '</div></div>' +
        '<span class="stu-item__dot" style="background:' + dot + '"></span>' +
        '</button>';
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
        '<div class="side-label"><span>Мої учні</span>' +
        '<button data-act="student-add" title="Додати учня">' + icon('plus', 14) + '</button></div>' +
        (stuList || '<div class="small muted" style="padding:6px 14px 12px;line-height:1.5">' +
          'Ще нікого немає.<br>Натисніть «+», щоб додати.</div>') +
      '</div>' +

      '<div class="side-foot">' +
        '<button class="nav-item' + (path.indexOf('#/settings') === 0 ? ' is-active' : '') +
        '" data-act="nav" data-arg="#/settings">' +
        icon('settings', 19) + '<span>Налаштування</span></button>' +
      '</div>';
  }

  /* ============================================================
     Рендер
     ============================================================ */

  App.render = function () {
    // база ще не прочитана (disk.js підтягує дошки) — малювати нічого
    if (!S.db()) return;
    var route = parseRoute();
    var main = document.getElementById('main');
    var side = document.getElementById('sidebar');
    var app = document.querySelector('.app');

    /* Дошка живе поза звичайним циклом рендеру: перемалювати її розмітку —
       означало б знищити полотно разом із незбереженим малюнком. */
    if (route.parts[0] === 'board') {
      if (V.boardMountedFor() === route.parts[1]) return;
      V.unmountBoard();
      app.classList.add('is-board');
      main.innerHTML = V.board(route.parts[1]);
      V.mountBoard(route.parts[1]);
      window.scrollTo(0, 0);
      return;
    }
    if (V.boardMountedFor()) V.unmountBoard();
    app.classList.remove('is-board');

    // зберегти фокус пошуку
    var act = document.activeElement;
    var restore = act && act.id === 'stu-search'
      ? { id: act.id, pos: act.selectionStart } : null;

    /* Поки розділ тягнуть під рукою, панель не перемальовуємо: інакше
       перемальовування посеред руху викинуло б той самий пункт з-під пальця. */
    if (!document.body.classList.contains('is-navdrag')) {
      side.innerHTML = renderSidebar(route);
      var navBox = side.querySelector('.side-scroll');
      if (navBox) bindNavDrag(navBox);
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
        case 'sheet':
        case 'reference':
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

    main.innerHTML = html;
    if (V.afterRender) V.afterRender(route);
    if (route.parts[0] !== 'students') window.scrollTo(0, 0);

    if (restore) {
      var el = document.getElementById(restore.id);
      if (el) { el.focus(); try { el.setSelectionRange(restore.pos, restore.pos); } catch (e) {} }
    }
  };

  App.refresh = function () { App.render(); };

  /* ============================================================
     Дії
     ============================================================ */

  var ACTIONS = {
    'nav': function (arg) { location.hash = arg; },

    'sidebar-toggle': function () {
      sidebarState.collapsed = !sidebarState.collapsed;
      saveSidebar();
      applySidebar();
    },

    'student-open': function (arg) { location.hash = '#/student/' + arg; },
    'student-add': function () { F.student(null); },
    'student-edit': function (arg) { F.student(arg); },
    'student-restore': function (arg) { S.update('students', arg, { archived: false }); U.toast('Учня повернуто', 'ok'); App.render(); },

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
    'board-open': function (arg) { location.hash = '#/board/' + arg; },

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
      location.hash = '#/board/' + arg;
    },
    'desk-status': function (arg) { V.deskCycle(arg); },
    'gen-week': function () { F.generateWeek(); },

    'tab': function (arg) {
      var r = parseRoute();
      if (r.parts[0] === 'student') location.hash = '#/student/' + r.parts[1] + '/' + arg;
    },
    'filter-goal': function (arg) { setQuery({ goal: arg }); },
    'filter-topic': function (arg) { setQuery({ topic: arg }); },
    'filter-tag': function (arg) { setQuery({ tag: arg }); },
    'filter-cur': function (arg) { setQuery({ cur: arg }); },
    'week': function (arg) { setQuery({ w: arg === '0' ? '' : arg }); },
    'cal-view': function (arg) { setQuery({ v: arg === 'week' ? '' : arg, off: '' }); },
    'cal-nav': function (arg) { setQuery({ off: arg === '0' ? '' : arg }); },
    'cal-panel': function () { V.toggleCalPanel(); App.render(); },
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
      S.db().tutor = {
        name: v.name || 'Репетитор',
        subject: v.subject || 'Математика',
        defaultPrice: v.defaultPrice || 500,
        currency: v.currency || 'UAH',
        defaultDuration: v.defaultDuration || 60,
        meetUrl: v.meetUrl || ''
      };
      S.save();
      U.toast('Профіль збережено', 'ok');
      App.render();
    },

    'export': function () {
      U.toast('Готую резервну копію…');
      // exportBundle асинхронний, бо збирає ще й картинки дошок з IndexedDB
      S.exportBundle().then(function (json) {
        var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'mathhub-backup-' + U.ymd(new Date()) + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
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
            location.hash = '#/';
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
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (meta && meta.name) || 'файл';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
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
            location.hash = '#/';
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
    'sheet-open': function (id) { location.hash = '#/sheet/' + id; },

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
      C.confirm('Видалити «' + (m.title || 'тему') + '»?',
        U.pl((m.rules || []).length, 'Блок', 'Блоки', 'Блоків') +
        ' цієї теми зникнуть. Інші теми не зачепить.',
        function () {
          S.remove('materials', id);
          U.toast('Тему видалено');
          location.hash = '#/reference';
          App.render();
        },
        'Видалити');
    },
    'sheet-print': function () { window.print(); },

    'desk-file': function (key) {
      if (!window.ImgStore || !key) return;
      ImgStore.get(key).then(function (blob) {
        if (!blob) { U.toast('Файл не знайшовся', 'err'); return; }

        var name = 'файл';
        (S.deskItems() || []).forEach(function (d) {
          (d.files || []).forEach(function (f) { if (f.key === key && f.name) name = f.name; });
        });

        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
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
            location.hash = '#/';
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
            location.hash = '#/';
            App.render();
          }).catch(function (e) {
            U.toast('Не вдалося відновити: ' + (e && e.message ? e.message : e), 'err');
          });
        },
        'Відновити');
    },

    'reset-demo': function () {
      C.confirm('Повернути демо-дані?',
        'Поточні дані буде замінено демонстраційними. Якщо там є реальні учні — спершу зробіть експорт.',
        function () { S.reset(); U.toast('Демо-дані відновлено', 'ok'); location.hash = '#/'; App.render(); },
        'Так, замінити');
    },

    'wipe': function () {
      C.confirm('Очистити всі дані?',
        'Буде видалено всіх учнів, уроки, домашні завдання, оплати, нотатки й матеріали. Відновити не вийде.',
        function () { S.wipe(); U.toast('Дані очищено'); location.hash = '#/'; App.render(); },
        'Так, видалити все');
    }
  };

  // Дії дошки живуть у views-board.js — підмішуємо їх у спільний диспетчер
  Object.keys(V.boardActions).forEach(function (k) { ACTIONS[k] = V.boardActions[k]; });
  if (V.olympActions) Object.keys(V.olympActions).forEach(function (k) { ACTIONS[k] = V.olympActions[k]; });
  if (V.bankActions) Object.keys(V.bankActions).forEach(function (k) { ACTIONS[k] = V.bankActions[k]; });

  /* ============================================================
     Слухачі
     ============================================================ */

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

  window.addEventListener('hashchange', App.render);

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
      else { location.hash = '#/students'; }
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
  try {
    if (window.Cloud && Cloud.housekeeping) Cloud.housekeeping(S.autoFillTemplates);
    else S.autoFillTemplates();
  } catch (e) { console.warn('autoFill:', e); }
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

  function quietMoment() {
    if (document.hidden) return true;
    var ae = document.activeElement;
    if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable)) return false;
    if (document.querySelector('.modal-backdrop, .modal')) return false;
    return Date.now() - lastInput > 60000;
  }

  function reloadNow() {
    var jobs = [];
    try { if (window.Cloud && Cloud.flush) jobs.push(Cloud.flush()); } catch (e) {}
    try { if (window.RecSync && RecSync.flush) jobs.push(RecSync.flush()); } catch (e) {}
    try { if (window.BoardSync && BoardSync.flush) jobs.push(BoardSync.flush()); } catch (e) {}
    if (reloadHard) {
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
  App.staleCodeBar = function () { App.autoReload(true); };

  setInterval(maybeReload, 5000);
  document.addEventListener('visibilitychange', maybeReload);

  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data === 'assets-updated') App.autoReload(false);
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
        '<form id="ask-signin" class="stack" onsubmit="return false">' +
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
