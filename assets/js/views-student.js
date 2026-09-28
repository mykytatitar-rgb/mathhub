/* Екран учня — серце системи */
(function () {
  'use strict';

  var U = window.U, S = window.S, C = window.C, icon = window.icon;
  var V = window.V;

  /* Окремої вкладки «Домашка» немає навмисно: завдання дають на уроці,
     тому вони й живуть усередині уроку — і в списку, і на дошці. */
  /* Окремого «Шляху» теж немає. Він відповідав на те саме питання, що й
     карта, — що вже пройдено й що попереду, — тільки грубіше: дванадцять
     великих тем замість двохсот зі звʼязками між ними. Два списки про одне
     доводилося вести двічі, тож лишилася карта. */
  var TABS = [
    { id: 'overview', label: 'Огляд' },
    { id: 'lessons',  label: 'Уроки' },
    { id: 'map',      label: 'Карта' },
    { id: 'payments', label: 'Оплати' },
    { id: 'notes',    label: 'Нотатки' }
  ];

  V.student = function (id, tab) {
    var st = S.get('students', id);
    if (!st) {
      return '<div class="page"><div class="card">' +
        C.empty('alert', 'Учня не знайдено', 'Можливо, його було видалено.',
          '<button class="btn btn--primary" data-act="nav" data-arg="#/students">До списку учнів</button>') +
        '</div></div>';
    }

    tab = tab || 'overview';
    // старі адреси вкладок ще можуть бути в закладках або історії
    if (tab === 'homework') tab = 'lessons';
    if (tab === 'roadmap' || tab === 'progress' || tab === 'path') tab = 'map';
    var stat = S.studentStats(id);
    var next = stat.nextLesson;
    var cur = S.curOf(id);

    var counts = {
      lessons: stat.total,
      map: V.studentMapCount ? V.studentMapCount(id) : 0,
      payments: S.paymentsOf(id).length,
      notes: S.notesOf(id).length
    };

    var tabsHtml = TABS.map(function (t) {
      var n = counts[t.id];
      return '<button class="tab' + (tab === t.id ? ' is-active' : '') + '" data-act="tab" data-arg="' + t.id + '">' +
        U.esc(t.label) + (n ? '<span class="tab__count">' + n + '</span>' : '') + '</button>';
    }).join('');

    var bodies = {
      overview: overview, lessons: lessons,
      map: function (s) { return V.studentMap ? V.studentMap(s) : ''; },
      payments: payments, notes: notes
    };
    var body = (bodies[tab] || overview)(st, stat);

    return C.hero({
      back: { label: 'Усі учні', act: 'nav', arg: '#/students' },
      avatar: '<div class="avatar avatar--76" style="background:' + st.color + '">' +
        U.esc(U.initials(st.name)) + '</div>',
      title: st.name,
      // архівного учня видно одразу, інакше незрозуміло, чому його немає в розкладі
      sub: st.grade + ' · ' + st.goal + (st.archived ? ' · в архіві' : ''),
      actions: [
        { label: 'Контакти', icon: 'phone', act: 'contacts', arg: id },
        { label: 'Портал учня', icon: 'share', act: 'student-portal', arg: id },
        { label: 'Записати урок', icon: 'plus', act: 'lesson-add-for', arg: id },
        { label: 'Редагувати', icon: 'edit', act: 'student-edit', arg: id, solid: true }
      ]
    }) +

    '<div class="page page--overlap">' +
      '<div class="quick-row mb-3">' +
        /* Окремої картки «Домашка» тут немає навмисно: завдання живуть в уроках,
           тому те, що чекає на перевірку, показуємо просто в картці уроку. */
        '<button class="quick" data-act="tab" data-arg="lessons">' +
          '<div class="quick__icon">' + icon('calendar', 21) + '</div>' +
          '<div style="min-width:0"><div class="quick__title">Наступний урок' +
          (stat.hwPending ? '<span class="quick__badge" style="background:var(--violet)">' +
            stat.hwPending + '</span>' : '') +
          '</div>' +
          '<div class="small muted truncate" style="margin-top:2px">' +
          (next ? U.fmtDateTime(next.date) + ' · ' + U.fmtRelative(next.date) : 'не запланований') +
          (stat.hwPending ? ' · ' + U.pl(stat.hwPending, 'домашнє чекає', 'домашні чекають', 'домашніх чекають') : '') +
          '</div></div><span class="quick__arrow">' + icon('chevronR', 18) + '</span></button>' +

        '<button class="quick" data-act="tab" data-arg="payments">' +
          '<div class="quick__icon" style="background:' + (stat.balance < 0 ? 'var(--red-bg)' : 'var(--green-bg)') +
          ';color:' + (stat.balance < 0 ? 'var(--red)' : 'var(--green)') + '">' + icon('wallet', 21) + '</div>' +
          '<div style="min-width:0"><div class="quick__title">' +
          (stat.balance < 0 ? 'Борг' : 'Баланс') + '</div>' +
          '<div class="small muted truncate" style="margin-top:2px">' +
          U.money(Math.abs(stat.balance), cur) +
          (st.price > 0 && (stat.credit != null ? stat.credit : stat.balance) >= st.price
            ? ' · наперед ' + U.pl(Math.floor((stat.credit != null ? stat.credit : stat.balance) / st.price),
                'урок', 'уроки', 'уроків') : '') +
          '</div></div><span class="quick__arrow">' + icon('chevronR', 18) + '</span></button>' +
      '</div>' +

      '<div class="tabs mb-3">' + tabsHtml + '</div>' +
      body +
    '</div>';
  };

  /* ============================================================
     Огляд
     ============================================================ */

  function overview(st, stat) {
    var boards = S.boardsOf(st.id);
    var recent = S.lessonsOf(st.id).filter(function (l) { return l.status === 'done'; }).slice(0, 4);
    var prog = U.sortBy(S.progressOf(st.id), function (p) { return p.level; }, true);
    var weak = prog.slice(-3).reverse();
    var strong = prog.slice(0, 3);

    var contacts = [
      st.phone ? { i: 'phone', l: 'Учень', v: st.phone } : null,
      st.parent ? { i: 'users', l: 'Батьки', v: st.parent } : null,
      st.telegram ? { i: 'send', l: 'Telegram', v: st.telegram } : null
    ].filter(Boolean);

    return '<div class="grid grid--main">' +
      '<div class="stack">' +

        /* Окремої картки про домашні тут немає: завдання живуть в уроці,
           і те, що чекає на перевірку, видно значком у картці уроку. */
        '<div class="grid grid--2">' +
          C.stat('Проведено', stat.done, U.pl(stat.planned, 'попереду', 'попереду', 'попереду'), 'book') +
          C.stat('Пропуски', stat.missed, stat.missed ? 'варто обговорити' : 'жодного', 'alert',
            stat.missed ? 'red' : 'green') +
        '</div>' +

        (st.target ? '<div class="card">' +
          '<div class="card-head"><div><h2 class="card-title">Ціль і контекст</h2></div>' +
          '<button class="icon-btn spacer" data-act="student-edit" data-arg="' + st.id + '">' + icon('edit', 16) + '</button></div>' +
          '<div class="pre-wrap" style="color:var(--ink-2)">' + U.esc(st.target) + '</div>' +
          '</div>' : '') +

        '<div class="card card--pad0">' +
          '<div class="card-head" style="padding:22px 24px 14px;margin:0">' +
            '<div><h2 class="card-title">Останні уроки</h2>' +
            '<div class="card-sub">що проходили нещодавно</div></div>' +
            '<button class="btn btn--ghost btn--sm spacer" data-act="tab" data-arg="lessons">Усі уроки</button>' +
          '</div>' +
          '<div class="list">' +
          (recent.length ? recent.map(function (l) {
            return '<button class="list__item list__item--btn" data-act="lesson-open" data-arg="' + l.id + '">' +
              '<div style="width:44px;text-align:center;flex:0 0 auto">' +
              '<div style="font-size:16px;font-weight:800;line-height:1">' + U.toDate(l.date).getDate() + '</div>' +
              '<div class="muted" style="font-size:10.5px;text-transform:uppercase;font-weight:700">' +
              U.MONTHS_GEN[U.toDate(l.date).getMonth()].slice(0, 3) + '</div></div>' +
              '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:650;font-size:14px" class="truncate">' + U.esc(l.topic || 'Без теми') + '</div>' +
              '<div class="small muted truncate" style="margin-top:2px">' +
              U.esc(l.notes ? l.notes : 'конспект не заповнений') + '</div></div>' +
              icon('chevronR', 16, 'style="color:var(--muted-2)"') + '</button>';
          }).join('') : C.empty('book', 'Проведених уроків ще немає', '')) +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="stack">' +
        /* Де учень у математиці: на огляді досить одного погляду — скільки
           вже на місці, на якому він рівні й що брати далі. */
        (function () {
          var p = V.studentMapProgress ? V.studentMapProgress(st.id) : null;
          if (!p) return '';
          return '<button class="card card--btn center" data-act="tab" data-arg="map">' +
            '<div class="card-head" style="justify-content:center"><div><h2 class="card-title">Карта математики</h2>' +
            '<div class="card-sub">' + U.esc(p.scopeLabel) + ' · знає ' + p.known + ' з ' + p.n + '</div></div></div>' +
            '<div style="display:grid;place-items:center;padding:6px 0 14px">' + C.ring(p.pct, 128, 12) + '</div>' +
            (p.marked
              ? '<div class="small muted" style="line-height:1.55">Зараз тут: <b style="color:var(--ink)">' +
                U.esc(p.stageName) + '</b>' +
                (p.next ? '<br>Можна брати: <b style="color:var(--ink)">' + U.esc(p.next) + '</b>' : '') + '</div>'
              : '<div class="small muted" style="line-height:1.55">Ще нічого не позначено. Відкрийте карту й відмітьте, ' +
                'що учень уже знає, — тоді тут буде видно, де він.</div>') +
            '</button>';
        })() +

        (boards.length ? '<div class="card card--pad0">' +
          '<div class="card-head" style="padding:22px 24px 12px;margin:0">' +
            '<div><h2 class="card-title">Архів дошок</h2>' +
            '<div class="card-sub">' + U.pl(boards.length, 'урок із записами', 'уроки із записами', 'уроків із записами') +
            '</div></div>' +
            '<button class="btn btn--ghost btn--sm spacer" data-act="tab" data-arg="lessons">Усі</button>' +
          '</div>' +
          '<div class="list">' +
          boards.slice(0, 5).map(function (l) {
            var bs = S.boardStats(l.id);
            return '<button class="list__item list__item--btn" data-act="board-open" data-arg="' + l.id + '">' +
              '<div style="width:34px;height:34px;border-radius:11px;background:var(--violet-bg);' +
              'color:var(--violet);display:grid;place-items:center;flex:0 0 auto">' + icon('board', 17) + '</div>' +
              '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:650;font-size:13.5px" class="truncate">' +
              U.esc(l.topic || 'Без теми') + '</div>' +
              '<div class="small muted">' + U.fmtDate(l.date) + ' · ' +
              U.pl(bs.slides, 'слайд', 'слайди', 'слайдів') + '</div></div>' +
              icon('chevronR', 16, 'style="color:var(--muted-2)"') + '</button>';
          }).join('') + '</div></div>' : '') +

        (strong.length ? '<div class="card">' +
          '<div class="card-head"><div><h2 class="card-title">Сильні теми</h2></div></div>' +
          strong.map(function (p) {
            return '<div style="margin-bottom:14px">' +
              '<div class="row small" style="margin-bottom:6px"><span style="font-weight:600">' + U.esc(p.topic) + '</span>' +
              '<span class="spacer bold">' + p.level + '%</span></div>' + C.bar(p.level) + '</div>';
          }).join('') + '</div>' : '') +

        (weak.length ? '<div class="card">' +
          '<div class="card-head"><div><h2 class="card-title">Над чим працювати</h2>' +
          '<div class="card-sub">найнижчі рівні</div></div></div>' +
          weak.map(function (p) {
            return '<div style="margin-bottom:14px">' +
              '<div class="row small" style="margin-bottom:6px"><span style="font-weight:600">' + U.esc(p.topic) + '</span>' +
              '<span class="spacer bold">' + p.level + '%</span></div>' + C.bar(p.level) + '</div>';
          }).join('') + '</div>' : '') +

        (contacts.length ? '<div class="card">' +
          '<div class="card-head"><div><h2 class="card-title">Контакти</h2></div></div>' +
          contacts.map(function (c) {
            return '<div class="row" style="gap:11px;padding:9px 0;border-bottom:1px solid var(--line)">' +
              '<span style="color:var(--muted)">' + icon(c.i, 17) + '</span>' +
              '<div style="min-width:0"><div class="small muted">' + c.l + '</div>' +
              '<div style="font-weight:600;font-size:13.5px">' + U.esc(c.v) + '</div></div></div>';
          }).join('') + '</div>' : '') +

        '<div class="card">' +
          '<div class="card-head"><div><h2 class="card-title">Умови</h2></div></div>' +
          '<div class="row" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)">' +
            '<span class="small muted">Ціна уроку</span><span class="bold">' +
            U.money(st.price, S.curOf(st.id)) + '</span></div>' +
          '<div class="row" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)">' +
            '<span class="small muted">Тривалість</span><span class="bold">' + (st.duration || 60) + ' хв</span></div>' +
          '<div class="row" style="justify-content:space-between;padding:8px 0">' +
            '<span class="small muted">Розклад</span><span class="bold small" style="text-align:right">' +
            ((st.schedule || []).map(function (x) { return U.DAYS_SHORT[x.day % 7] + ' ' + x.time; }).join('<br>') || '—') +
            '</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ============================================================
     Уроки
     ============================================================ */

  function lessons(st) {
    var all = S.lessonsOf(st.id);           // новіші зверху
    var chrono = all.slice().reverse();     // для нумерації
    var numberOf = {};
    chrono.forEach(function (l, i) { numberOf[l.id] = i + 1; });

    if (!all.length) {
      return '<div class="card">' + C.empty('book', 'Уроків ще немає',
        'Запишіть перший урок — далі вся історія й статистика збиратимуться самі.',
        '<button class="btn btn--primary" data-act="lesson-add-for" data-arg="' + st.id + '">' +
        icon('plus', 16) + 'Записати урок</button>') + '</div>';
    }

    var future = all.filter(function (l) { return l.status === 'planned' && U.toDate(l.date) >= U.today(); });
    var past = all.filter(function (l) { return future.indexOf(l) < 0; });

    return (future.length ? '<h2 class="card-title mb-2">Заплановані</h2>' +
      '<div class="stack mb-3">' +
      U.sortBy(future, function (l) { return l.date; }).map(function (l) {
        return C.lessonRow(l, numberOf[l.id], { withHw: true });
      }).join('') + '</div>' : '') +

      '<div class="row mb-2"><h2 class="card-title">Історія</h2>' +
      '<button class="btn btn--soft btn--sm spacer" data-act="lesson-add-for" data-arg="' + st.id + '">' +
      icon('plus', 15) + 'Додати урок</button></div>' +

      /* Пошук по темах і конспектах. Історія швидко стає довгою, і питання
         «на якому уроці ми це розбирали» інакше вирішується гортанням. */
      (past.length > 4
        ? '<div class="search-line mb-2">' + icon('search', 16) +
          '<input class="input" data-lesson-find placeholder="Знайти в темах і конспектах…">' +
          '<span class="search-line__n" data-lesson-found></span></div>'
        : '') +

      '<div class="stack" data-lesson-list>' +
      past.map(function (l) {
        /* Шукане тримаємо в самому рядку: так фільтрування — це показати
           або сховати, без перемальовування списку й втрати позиції. */
        var hay = [l.topic, l.notes, U.fmtDate(l.date)].join(' ').toLowerCase();
        return '<div data-hay="' + U.esc(hay) + '">' +
          C.lessonRow(l, numberOf[l.id], { withHw: true }) + '</div>';
      }).join('') +
      '</div>';
  }


  /* ============================================================
     Прогрес
     ============================================================ */


  /* ============================================================
     Оплати
     ============================================================ */

  function payments(st, stat) {
    var cur = S.curOf(st.id);
    var list = S.paymentsOf(st.id);
    // у валюті учня: давні оплати в іншій валюті зводяться за своїм курсом
    var paid = S.paidOf(st.id);
    var doneLessons = S.lessonsOf(st.id).filter(function (l) { return l.status === 'done'; });
    var used = S.chargedOf(st.id);
    /* Рахуємо за справжнім запасом: уроки, які вже відбулися, але не
       відмічені проведеними, ще не списані з балансу — і без цього
       «вистачить ще на 3 уроки» було б неправдою. */
    var left = st.price > 0 ? Math.floor((stat.credit != null ? stat.credit : stat.balance) / st.price) : 0;

    var rows = list.length ? list.map(function (p) {
      return '<tr><td class="nowrap">' + U.fmtDate(p.date) + '</td>' +
        '<td>' + C.badge(p.method || '—', 'badge--grey') + '</td>' +
        '<td class="muted small">' + U.esc(p.note || '') + '</td>' +
        '<td class="num" style="color:var(--green-ink)">+' + U.money(p.amount, S.paymentCur(p)) + '</td>' +
        '<td class="right"><button class="icon-btn" data-act="pay-edit" data-arg="' + p.id + '">' +
        icon('edit', 16) + '</button></td></tr>';
    }).join('') : '<tr><td colspan="5" class="center muted" style="padding:34px">Оплат ще не було</td></tr>';

    return '<div class="grid grid--main">' +
      '<div class="card card--pad0">' +
        '<div class="card-head" style="padding:22px 24px 8px;margin:0">' +
          '<div><h2 class="card-title">Історія оплат</h2></div>' +
          '<button class="btn btn--primary btn--sm spacer" data-act="pay-add" data-arg="' + st.id + '">' +
          icon('plus', 15) + 'Записати</button>' +
        '</div>' +
        '<div style="overflow-x:auto" tabindex="0"><table class="tbl tbl--pays">' +
        '<thead><tr><th>Дата</th><th>Спосіб</th><th>Коментар</th><th class="num">Сума</th><th><span class="sr-only">Дії</span></th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' +
      '</div>' +

      '<div class="stack">' +
        '<div class="card" style="background:' +
          (stat.balance < 0 ? 'linear-gradient(135deg,#F3676B,#E5484D)' : 'linear-gradient(135deg,#22C97D,#0E9F5B)') +
          ';color:#fff">' +
          '<div class="small" style="opacity:.85;font-weight:650;text-transform:uppercase;letter-spacing:.6px">' +
          (stat.balance < 0 ? 'Заборгованість' : 'Баланс') + '</div>' +
          '<div style="font-size:34px;font-weight:800;letter-spacing:-1.5px;margin-top:8px">' +
          U.money(Math.abs(stat.balance), cur) + '</div>' +
          '<div class="small" style="opacity:.9;margin-top:8px">' +
          (stat.balance < 0
            ? 'Проведено уроків на більшу суму, ніж сплачено'
            : left >= 1 ? 'Вистачить ще на ' + U.pl(left, 'урок', 'уроки', 'уроків')
            : stat.unmarked ? U.pl(stat.unmarked, 'урок уже відбувся, але не відмічений',
                'уроки вже відбулися, але не відмічені', 'уроків уже відбулися, але не відмічені')
            : 'Наступний урок потребує оплати') +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="row" style="justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line)">' +
            '<span class="small muted">Усього сплачено</span><span class="bold">' + U.money(paid, cur) + '</span></div>' +
          '<div class="row" style="justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line)">' +
            '<span class="small muted">Проведено уроків</span><span class="bold">' + doneLessons.length + '</span></div>' +
          '<div class="row" style="justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line)">' +
            '<span class="small muted">Нараховано за уроки</span><span class="bold">' + U.money(used, cur) + '</span></div>' +
          '<div class="row" style="justify-content:space-between;padding:9px 0">' +
            '<span class="small muted">Ціна за урок</span><span class="bold">' + U.money(st.price, cur) + '</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ============================================================
     Нотатки
     ============================================================ */

  function notes(st) {
    var list = S.notesOf(st.id);

    var cards = list.length ? list.map(function (n) {
      return '<div class="card" style="padding:18px 22px">' +
        '<div class="row mb-1">' +
          '<span class="badge badge--grey">' + U.fmtDateLong(n.date) + '</span>' +
          '<span class="small muted">' + U.fmtRelative(n.date) + '</span>' +
          '<button class="icon-btn spacer" data-act="note-edit" data-arg="' + n.id + '">' + icon('edit', 16) + '</button>' +
        '</div>' +
        '<div class="pre-wrap" style="color:var(--ink-2)">' + U.esc(n.text) + '</div>' +
        '</div>';
    }).join('') : C.empty('note', 'Нотаток ще немає',
        'Сюди зручно писати спостереження, домовленості з батьками й те, що не варто забути до наступного уроку.',
        '<button class="btn btn--primary" data-act="note-add" data-arg="' + st.id + '">' +
        icon('plus', 16) + 'Додати нотатку</button>');

    return '<div class="row mb-2"><h2 class="card-title">Нотатки про учня</h2>' +
      '<button class="btn btn--soft btn--sm spacer" data-act="note-add" data-arg="' + st.id + '">' +
      icon('plus', 15) + 'Нова нотатка</button></div>' +
      '<div class="stack" style="max-width:820px">' + cards + '</div>';
  }

  /* ============================================================
     Контакти — модалка
     ============================================================ */

  V.contactsModal = function (id) {
    var st = S.get('students', id);
    if (!st) return;

    function line(iconName, label, value, href) {
      if (!value) return '';
      var inner = href
        ? '<a href="' + U.esc(href) + '" target="_blank" rel="noopener" style="color:var(--blue-600);font-weight:650">' +
          U.esc(value) + '</a>'
        : '<span style="font-weight:650">' + U.esc(value) + '</span>';
      return '<div class="row" style="gap:12px;padding:13px 0;border-bottom:1px solid var(--line)">' +
        '<span style="color:var(--blue-600)">' + icon(iconName, 18) + '</span>' +
        '<div style="min-width:0"><div class="small muted">' + label + '</div>' +
        '<div style="margin-top:2px">' + inner + '</div></div></div>';
    }

    var tgHandle = (st.telegram || '').replace(/^@/, '');
    var body =
      '<div class="row mb-2" style="gap:14px">' + C.avatar(st, 48) +
      '<div><div style="font-weight:750;font-size:16px">' + U.esc(st.name) + '</div>' +
      '<div class="small muted">' + U.esc(st.grade + ' · ' + st.goal) + '</div></div></div>' +
      line('phone', 'Телефон учня', st.phone, st.phone ? 'tel:' + st.phone.replace(/[^\d+]/g, '') : '') +
      line('users', 'Батьки', st.parent, '') +
      line('send', 'Telegram', st.telegram, tgHandle ? 'https://t.me/' + tgHandle : '') +
      (!st.phone && !st.parent && !st.telegram
        ? '<div class="field__hint mt-2">Контакти не заповнені. Додайте їх у картці учня.</div>' : '');

    C.modal({
      title: 'Контакти',
      body: body,
      buttons: [
        { label: 'Редагувати учня', kind: 'btn--ghost', act: 'edit', icon: 'edit',
          onClick: function () { setTimeout(function () { window.F.student(id); }, 60); } },
        { label: 'Закрити', kind: 'btn--primary', act: 'ok' }
      ]
    });
  };

  /* ============================================================
     Портал учня
     ============================================================

     Постійний вхід для учня: свій розклад і матеріали, які йому відкрили.
     Грошей там немає взагалі — не сховані в інтерфейсі, а відсутні в даних,
     які ми відправляємо. Нижче складається окремий документ, і в нього
     потрапляє тільки перелічене поіменно. */

  /**
   * Уроки для порталу. Якщо withBoards — до кожного уроку, на дошці якого
   * щось є, додаємо посилання, щоб учень міг зайти в сам урок, а не лише
   * побачити його в розкладі. Дошка публікується один раз; далі вона
   * оновлюється сама, поки репетитор на ній працює.
   */
  function portalLessons(studentId, withBoards) {
    var rows = S.lessonsOf(studentId).map(function (l) {
      return {
        id: l.id,
        date: l.date,
        // поле зветься duration, а не dur — через dur тут завжди стояло 60
        dur: l.duration || l.dur || 60,
        topic: l.topic || '',
        status: l.status || 'planned',
        // конспект показуємо: він для учня й писався
        notes: l.notes || '',
        url: ''
      };
    });

    if (!withBoards || !V.publishLessonBoard) return Promise.resolve(rows);

    return Promise.all(rows.map(function (row) {
      return V.publishLessonBoard(row.id)
        .then(function (u) { row.url = u || ''; })
        .catch(function () { /* один урок, що не опублікувався, не має валити портал */ });
    })).then(function () { return rows; });
  }

  /** Матеріали в тому вигляді, у якому їх побачить учень. */
  function portalMaterials(ids, token) {
    var jobs = [];
    var out = (ids || []).map(function (mid) {
      var m = S.get('materials', mid);
      if (!m) return null;
      var row = { title: m.title || '', note: m.note || '', url: m.url || '', files: [] };
      (m.files || []).forEach(function (f) {
        var file = { name: f.name || 'файл', size: f.size || 0, url: '' };
        row.files.push(file);
        // вкладення кладемо в те саме публічне сховище, що й файли уроків
        jobs.push(
          window.ImgStore.get(f.key)
            .then(function (blob) {
              if (!blob) return null;
              return window.Cloud.publishShareImage(token, f.key, blob, 'mat');
            })
            .then(function (url) { if (url) file.url = url; })
            .catch(function () { /* один файл, що не доїхав, не має валити портал */ })
        );
      });
      return row;
    }).filter(Boolean);

    return Promise.all(jobs).then(function () {
      // посилання, які так і не завантажились, учневі показувати нема сенсу
      out.forEach(function (r) {
        r.files = r.files.filter(function (f) { return f.url; });
      });
      return out;
    });
  }

  /** Чи відкривати учневі самі уроки. За замовчуванням так. */
  function wantsBoards(st) {
    return st.portalBoards !== false;
  }

  /* Скільки уроків учень зможе відкрити. Без цього рядка незрозуміло, чому
     кнопок у розкладі немає: порожній урок не публікується, і зовні це
     виглядає як поламана функція. */
  function boardsHint(st) {
    var all = S.lessonsOf(st.id);
    if (!all.length) return 'Уроків ще немає — відкривати нічого.';

    var ready = V.lessonHasContent
      ? all.filter(function (l) { return V.lessonHasContent(l.id); }).length
      : 0;

    if (!ready) {
      return 'Зараз відкривати нічого: у цих уроків порожні дошки й не задано ' +
        'домашнє. Щойно ви щось напишете на дошці або зададете завдання — ' +
        'у розкладі в учня з\'явиться кнопка «Відкрити урок».';
    }
    return 'Учень зможе відкрити ' + U.pl(ready, 'урок', 'уроки', 'уроків') +
      ' із ' + all.length + ' — ті, де є записи на дошці або задане домашнє. ' +
      'Приховані слайди не публікуються.';
  }

  /** Вміст порталу без позначки часу — щоб його можна було порівнювати. */
  function buildPortalBody(st, matIds, token) {
    return Promise.all([
      portalMaterials(matIds, token),
      portalLessons(st.id, wantsBoards(st))
    ]).then(function (r) {
      return {
        student: st.name,
        goal: st.goal || '',
        grade: st.grade || '',
        lessons: r[1],
        materials: r[0]
      };
    });
  }

  function buildPortalData(st, matIds, token) {
    return buildPortalBody(st, matIds, token).then(function (body) {
      body.updated = new Date().toISOString();
      return JSON.stringify(body);
    });
  }

  /* ---------- Автооновлення ----------

     Портал — це знімок даних на сервері. Спершу він оновлювався лише
     кнопкою, і додані потім уроки учень не бачив: у нього лишався той
     розклад, який був у мить створення. Тепер портал переробляється сам,
     коли змінюється те, що в ньому показано.

     Порівнюємо вміст, а не час: інакше кожне збереження бази — а воно
     буває щосекунди під час уроку — слало б на сервер той самий документ. */

  var PORTAL_HASH = 'vektor.portalHash';
  var PORTAL_DELAY = 6000;

  function portalHashes() {
    try { return JSON.parse(localStorage.getItem(PORTAL_HASH) || '{}'); } catch (e) { return {}; }
  }

  function rememberPortalHash(token, h) {
    var m = portalHashes();
    m[token] = h;
    try { localStorage.setItem(PORTAL_HASH, JSON.stringify(m)); } catch (e) {}
  }

  function hashOf(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return String(h) + ':' + s.length;
  }

  var portalTimer = null;

  function schedulePortalSync() {
    if (portalTimer) clearTimeout(portalTimer);
    portalTimer = setTimeout(runPortalSync, PORTAL_DELAY);
  }

  function runPortalSync() {
    portalTimer = null;
    if (!window.Cloud || !Cloud.available() || !Cloud.signedIn()) return;

    S.students().forEach(function (st) {
      if (!st.portalToken) return;
      buildPortalBody(st, st.portalMaterials || [], st.portalToken).then(function (body) {
        var json = JSON.stringify(body);
        var h = hashOf(json);
        if (portalHashes()[st.portalToken] === h) return;   // нічого не змінилось
        body.updated = new Date().toISOString();
        return Cloud.publishPortal(st.id, st.portalToken, JSON.stringify(body), null)
          .then(function () { rememberPortalHash(st.portalToken, h); });
      }).catch(function (e) {
        // мовчки: портал наздожене наступного разу, лякати репетитора нема чого
        console.warn('portal sync:', e);
      });
    });
  }

  S.onSave(schedulePortalSync);

  V.portalModal = function (id) {
    var st = S.get('students', id);
    if (!st) return;

    if (!window.Cloud || !window.Cloud.available() || !window.Cloud.signedIn()) {
      C.modal({
        title: 'Портал учня',
        body: '<div class="field__hint">Портал працює через синхронізацію: дані має де ' +
          'зберігатися, щоб учень бачив їх зі свого пристрою. Увімкніть синхронізацію ' +
          'в Налаштуваннях і поверніться сюди.</div>',
        buttons: [{ label: 'Зрозуміло', kind: 'btn--primary', act: 'ok' }]
      });
      return;
    }

    window.Cloud.portalOf(id).then(function (row) {
      var token = (row && row.token) || window.Cloud.newShareToken();
      var url = window.Cloud.portalUrl(token);
      var chosen = (st.portalMaterials || []).slice();
      var exists = !!row;

      // портали, створені до появи автооновлення, токена в картці не мали
      if (exists && st.portalToken !== token) {
        S.update('students', st.id, { portalToken: token });
      }

      C.modal({
        title: 'Портал ' + st.name,
        sub: exists ? 'Портал уже відкрито' : 'Учень ще не має доступу',
        wide: true,
        body:
          '<div class="field__hint">Учень побачить свій розклад і теми уроків — ' +
          'лише перегляд, без можливості щось змінити. Оплат, цін і боргів у порталі ' +
          'немає взагалі: вони не потрапляють у те, що йому надсилається.</div>' +

          (exists
            ? '<div class="mt-3"><div class="board-opts__label">Посилання для учня</div>' +
              '<input class="input" readonly data-portal-url value="' + U.esc(url) + '"></div>'
            : '') +

          '<div class="mt-3"><div class="board-opts__label">Код входу</div>' +
          '<input class="input" data-portal-pin inputmode="numeric" maxlength="8" ' +
          'placeholder="' + (row && row.pin ? 'код задано — введіть новий, щоб змінити' : 'напр. 2408') + '">' +
          '<div class="field__hint mt-1">Необов\'язковий. Саме посилання вже є ключем, ' +
          'але код рятує, якщо його побачить хтось сторонній — наприклад на спільному ' +
          'комп\'ютері. Після десяти невдалих спроб портал закриється, поки не задасте код наново.</div></div>' +

          '<div class="mt-3"><label class="mat-pick__r" style="padding-left:0">' +
          '<input type="checkbox" data-portal-boards' + (wantsBoards(st) ? ' checked' : '') + '>' +
          '<span>Відкривати учневі дошки уроків</span></label>' +
          '<div class="field__hint">' + boardsHint(st) + '</div></div>' +

          (window.V.materialPicker ? window.V.materialPicker(chosen) : '') +

          /* Перевірка очима учня. Без неї переконатися, що портал справді
             працює і що в ньому немає зайвого, можна лише відкривши
             посилання в іншому браузері й повіривши очам. */
          (exists
            ? '<div class="dim-sep" style="margin:16px 0 12px"></div>' +
              '<button class="btn btn--ghost btn--sm" data-portal-check>' +
              icon('eye', 15) + 'Перевірити очима учня</button>' +
              '<div class="field__hint mt-1">Звернемось до бази без вашого входу — ' +
              'точно як його сторінка — і покажемо, що саме він побачить.</div>' +
              '<div data-portal-check-out></div>'
            : ''),

        buttons: [
          { label: 'Закрити', kind: 'btn--ghost', act: 'cancel' }
        ].concat(exists ? [{
          label: 'Закрити доступ', kind: 'btn--danger', act: 'revoke',
          onClick: function () {
            window.Cloud.revokePortal(token).then(function () {
              // без токена автооновленню нема чого шукати
              S.update('students', st.id, { portalToken: '' });
              U.toast('Портал закрито — посилання більше не працює', 'ok');
            }).catch(function (e) {
              U.toast('Не вдалося закрити: ' + (e && e.message ? e.message : e), 'err');
            });
          }
        }] : []).concat([{
          label: exists ? 'Оновити' : 'Відкрити портал', kind: 'btn--primary', act: 'save',
          onClick: function (root, close) {
            var pinEl = root.querySelector('[data-portal-pin]');
            var pin = pinEl ? pinEl.value.trim() : '';
            var mats = window.V.readPickedMaterials ? window.V.readPickedMaterials(root) : [];
            var boardsEl = root.querySelector('[data-portal-boards]');
            var boards = boardsEl ? boardsEl.checked : true;

            /* Токен тримаємо в картці учня: за ним автооновлення знає,
               кому саме є що переробляти, і не питає щоразу сервер. */
            S.update('students', st.id, {
              portalMaterials: mats, portalToken: token, portalBoards: boards
            });

            U.toast('Готую портал…');
            buildPortalData(st, mats, token)
              .then(function (json) {
                /* Порожній рядок означає «лишити код як був», а не «прибрати»:
                   інакше кожне оновлення розкладу мовчки знімало б захист. */
                return window.Cloud.publishPortal(st.id, token, json, pin ? pin : null);
              })
              .then(function (link) {
                // копіюємо одразу: людина щойно натиснула кнопку, отже дозвіл є
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  return navigator.clipboard.writeText(link).then(function () {
                    U.toast('Портал готовий, посилання скопійовано', 'ok');
                  }, function () {
                    U.toast('Портал готовий. Скопіюйте посилання з вікна', 'ok');
                  });
                }
                U.toast('Портал готовий', 'ok');
              })
              .then(function () { close(); })
              .catch(function (e) {
                U.toast('Не вдалося: ' + (e && e.message ? e.message : e), 'err');
              });
            return false;   // вікно лишаємо відкритим, поки все не доїде
          }
        }]),

        onMount: function (root) {
          var btn = root.querySelector('[data-portal-check]');
          if (!btn) return;
          var out = root.querySelector('[data-portal-check-out]');

          btn.addEventListener('click', function () {
            btn.disabled = true;
            out.innerHTML = '<div class="field__hint mt-2">Перевіряю…</div>';
            var pinEl = root.querySelector('[data-portal-pin]');
            var pin = pinEl && pinEl.value.trim();

            window.Cloud.portalSelfCheck(token, pin).then(function (r) {
              btn.disabled = false;
              out.innerHTML = portalCheckHtml(r);
            });
          });
        }
      });
    });
  };

  /** Людською мовою: що побачив би учень просто зараз. */
  function portalCheckHtml(r) {
    if (!r.ok) {
      var why = {
        setup: 'У базі ще немає потрібних функцій. Виконайте supabase/schema.sql у SQL Editor.',
        gone: 'База каже, що такого порталу немає. Натисніть «Оновити», щоб створити його наново.',
        locked: 'Портал закрито: код вводили неправильно забагато разів. Задайте код наново й збережіть.',
        pin: 'Код не підійшов. Впишіть його в поле вище й перевірте ще раз — саме його треба дати учневі.',
        empty: 'Портал є, але порожній. Натисніть «Оновити».',
        broken: 'Дані порталу пошкоджені. Натисніть «Оновити».',
        net: 'Не вдалося звернутися до бази. Перевірте інтернет.'
      }[r.why] || 'Не вдалося перевірити.';
      return '<div class="guard guard--off mt-2"><span class="guard__dot"></span><span>' +
        U.esc(why) + '</span></div>';
    }

    var lines = [
      'Учень бачить: ' + U.pl(r.lessons, 'заняття', 'заняття', 'занять') +
        (r.openable ? ', з них ' + r.openable + ' можна відкрити' : ', жодного не можна відкрити'),
      U.pl(r.materials, 'матеріал', 'матеріали', 'матеріалів'),
      r.needsPin ? 'Вхід за кодом' : 'Вхід без коду — досить самого посилання'
    ];

    var money = r.leaks.length
      ? '<div class="guard guard--off mt-2"><span class="guard__dot"></span><span>' +
        'Увага: у даних знайдено поля ' + U.esc(r.leaks.join(', ')) +
        '. Це схоже на фінанси — скажіть мені про це.</span></div>'
      : '<div class="guard guard--on mt-2"><span class="guard__dot"></span>' +
        '<span>Грошей у даних немає — ні цін, ні оплат, ні боргів.</span></div>';

    return '<div class="field__hint mt-2">' + U.esc(lines.join(' · ')) + '</div>' + money;
  }
})();
