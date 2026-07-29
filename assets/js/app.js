/* Роутер, сайдбар, обробка дій */
(function () {
  'use strict';

  var U = window.U, S = window.S, C = window.C, V = window.V, F = window.F, icon = window.icon;
  var App = {};

  var NAV = [
    { hash: '#/',          icon: 'grid',      label: 'Огляд' },
    { hash: '#/students',  icon: 'users',     label: 'Учні',      count: function () { return S.students().length; } },
    { hash: '#/schedule',  icon: 'calendar',  label: 'Розклад',   count: function () {
        return S.lessonsOnDay(U.today()).filter(function (l) { return l.status === 'planned'; }).length; } },
    { hash: '#/finance',   icon: 'wallet',    label: 'Фінанси' },
    { hash: '#/materials', icon: 'folder',    label: 'Матеріали' }
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

  function renderSidebar(route) {
    var students = S.students();
    var activeStudent = route.parts[0] === 'student' ? route.parts[1] : null;
    var path = '#' + (route.path === '/' ? '/' : route.path);

    var nav = NAV.map(function (n) {
      var active = n.hash === '#/' ? (path === '#/' || path === '#') : path.indexOf(n.hash) === 0;
      if (n.hash === '#/students' && activeStudent) active = false;
      var cnt = n.count ? n.count() : 0;
      return '<button class="nav-item' + (active ? ' is-active' : '') + '" data-act="nav" data-arg="' + n.hash +
        '" title="' + U.esc(n.label) + '">' +
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

    side.innerHTML = renderSidebar(route);

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
        case 'settings':
          html = V.settings(); break;
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

    'note-add': function (arg) { F.note(null, { studentId: arg }); },
    'note-edit': function (arg) { F.note(arg); },

    'mat-add': function () { F.material(null); },
    'mat-edit': function (arg) { F.material(arg); },

    'progress-edit': function (arg) { F.progress(arg); },
    'contacts': function (arg) { V.contactsModal(arg); },
    'student-portal': function (arg) { V.portalModal(arg); },
    'gen-week': function () { F.generateWeek(); },

    'tab': function (arg) {
      var r = parseRoute();
      if (r.parts[0] === 'student') location.hash = '#/student/' + r.parts[1] + '/' + arg;
    },
    'filter-goal': function (arg) { setQuery({ goal: arg }); },
    'filter-topic': function (arg) { setQuery({ topic: arg }); },
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
        U.toast('Синхронізація увімкнена', 'ok');
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
        if (entered) U.toast('Акаунт створено, синхронізація увімкнена', 'ok');
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

  /* ============================================================
     Слухачі
     ============================================================ */

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    // не перехоплюємо звичайні посилання
    if (el.tagName === 'A' && el.href) return;
    var fn = ACTIONS[el.dataset.act];
    if (!fn) return;
    e.preventDefault();
    fn(el.dataset.arg || '', el, e);
  });

  document.addEventListener('input', function (e) {
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

  S.load();
  // тримаємо постійний розклад заповненим наперед — інакше уроки з шаблону
  // довелось би щоразу генерувати вручну
  try { S.autoFillTemplates(); } catch (e) { console.warn('autoFill:', e); }
  App.render();
  applySidebar();

  /* Рядок стану синхронізації оновлюємо на місці, без перемальовування сторінки:
     інакше він застигає таким, яким був у момент рендеру. */
  if (window.Cloud && window.Cloud.onChange) {
    window.Cloud.onChange(function () {
      var el = document.querySelector('[data-sync-state]');
      if (el && V.syncStatusHtml) el.innerHTML = V.syncStatusHtml();
    });
  }

  /* Оновлення застосунку. Файли з кешу віддаються миттєво, а свіжі
     підтягуються у фоні — тож без цієї смужки зміни з'являлися б аж
     наступного разу, і здавалося б, що їх немає. */
  function updateBar() {
    if (document.querySelector('.update-bar')) return;
    var bar = document.createElement('div');
    bar.className = 'update-bar';
    bar.innerHTML = '<span>Вийшла нова версія кабінету.</span>' +
      '<button class="btn btn--primary btn--sm" data-reload>Оновити</button>' +
      '<button class="update-bar__x" data-later title="Пізніше">' + icon('x', 15) + '</button>';
    document.body.appendChild(bar);
    bar.querySelector('[data-reload]').onclick = function () { location.reload(); };
    bar.querySelector('[data-later]').onclick = function () { bar.remove(); };
  }

  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data === 'assets-updated') updateBar();
    });
  }

  window.App = App;
})();
