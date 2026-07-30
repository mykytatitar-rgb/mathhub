/* Екран учня — серце системи */
(function () {
  'use strict';

  var U = window.U, S = window.S, C = window.C, icon = window.icon;
  var V = window.V;

  /* Окремої вкладки «Домашка» немає навмисно: завдання дають на уроці,
     тому вони й живуть усередині уроку — і в списку, і на дошці. */
  /* «Роудмап» і «Прогрес» були про одне й те саме — які теми проходимо і
     наскільки вони засвоєні, — тільки з різних боків. Тепер це один шлях:
     етапи по порядку, і рівень засвоєння прямо на етапі. */
  var TABS = [
    { id: 'overview', label: 'Огляд' },
    { id: 'lessons',  label: 'Уроки' },
    { id: 'path',     label: 'Шлях' },
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
    if (tab === 'roadmap' || tab === 'progress') tab = 'path';
    var stat = S.studentStats(id);
    var next = stat.nextLesson;
    var cur = S.curOf(id);

    var counts = {
      lessons: stat.total,
      path: S.roadmapOf(id).length,
      payments: S.paymentsOf(id).length,
      notes: S.notesOf(id).length
    };

    var tabsHtml = TABS.map(function (t) {
      var n = counts[t.id];
      return '<button class="tab' + (tab === t.id ? ' is-active' : '') + '" data-act="tab" data-arg="' + t.id + '">' +
        U.esc(t.label) + (n ? '<span class="tab__count">' + n + '</span>' : '') + '</button>';
    }).join('');

    var bodies = {
      overview: overview, lessons: lessons, path: pathTab,
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
          (stat.balance >= st.price ? ' · ' + U.pl(Math.floor(stat.balance / st.price), 'урок', 'уроки', 'уроків') : '') +
          '</div></div><span class="quick__arrow">' + icon('chevronR', 18) + '</span></button>' +
      '</div>' +

      '<div class="tabs mb-3">' + tabsHtml + '</div>' +
      body +
    '</div>';
  };

  /* ============================================================
     Огляд
     ============================================================ */

  /* ============================================================
     Шлях: план підготовки разом із засвоєнням тем
     ============================================================

     Раніше це були дві вкладки. «Роудмап» відповідав, що проходимо і в
     якому порядку, «Прогрес» — наскільки засвоєно. Але це одне й те саме
     питання з різних боків, і тримати теми у двох списках означало вести
     їх двічі. Тепер етап знає свій рівень засвоєння, а сама дорога
     показує, де ми зараз. */

  /** Один вузол дороги. Бік чергується, щоб вийшла змійка, а не стовпчик. */
  function pathNode(st, r, n, side) {
    var status = r.status || 'todo';
    var meta = S.ROADMAP_STATUS[status] || S.ROADMAP_STATUS.todo;
    var level = r.topic ? S.progressLevel(st.id, r.topic) : null;

    /* Кільце засвоєння малюємо прямо на вузлі: видно не лише «пройшли»,
       а й наскільки міцно. */
    var ring = '';
    if (level != null) {
      var C0 = 2 * Math.PI * 25;
      ring = '<svg class="pnode__ring" viewBox="0 0 56 56" aria-hidden="true">' +
        '<circle cx="28" cy="28" r="25" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="4"/>' +
        '<circle cx="28" cy="28" r="25" fill="none" stroke="currentColor" stroke-width="4" ' +
        'stroke-linecap="round" stroke-dasharray="' + C0 + '" ' +
        'stroke-dashoffset="' + (C0 * (1 - U.clamp(level, 0, 100) / 100)) + '" ' +
        'transform="rotate(-90 28 28)"/></svg>';
    }

    var face = status === 'done' ? icon('check', 20)
             : status === 'skip' ? '<span class="pnode__n">—</span>'
             : '<span class="pnode__n">' + n + '</span>';

    return '<div class="pstep pstep--' + side + ' is-' + status + '">' +
      '<button class="pnode" data-act="roadmap-edit" data-arg="' + r.id + '" ' +
        'title="' + U.esc((r.title || r.topic || 'Етап') + ' — ' + meta.label) + '">' +
        ring + face +
      '</button>' +
      '<div class="pinfo">' +
        '<div class="pinfo__t">' + U.esc(r.title || r.topic || 'Етап') + '</div>' +
        '<div class="pinfo__m">' + C.badge(meta.label, meta.badge) +
          (level != null ? '<span class="pinfo__pct">' + level + '%</span>' : '') +
          (r.due ? '<span class="muted small">до ' + U.fmtDate(r.due) + '</span>' : '') +
        '</div>' +
        (r.note ? '<div class="pinfo__n">' + U.esc(r.note) + '</div>' : '') +
        '<div class="pinfo__a">' +
          '<button class="icon-btn" data-act="roadmap-status" data-arg="' + r.id + '" ' +
            'title="Наступний стан">' + icon('check', 15) + '</button>' +
          '<button class="icon-btn" data-act="roadmap-up" data-arg="' + r.id + '" ' +
            'title="Вище">' + icon('chevronL', 15) + '</button>' +
          '<button class="icon-btn" data-act="roadmap-down" data-arg="' + r.id + '" ' +
            'title="Нижче">' + icon('chevronR', 15) + '</button>' +
        '</div>' +
      '</div></div>';
  }

  function pathTab(st, stat) {
    var list = S.roadmapOf(st.id);
    var rs = S.roadmapStats(st.id);

    if (!list.length) {
      return '<div class="card">' +
        C.empty('target', 'Шляху ще немає',
          'Складіть його з готового набору тем під ціль «' + st.goal + '» — ' +
          'потім можна переставляти, дописувати своє і викидати зайве.',
          '<button class="btn btn--primary" data-act="roadmap-fill" data-arg="' + st.id + '">' +
          icon('plus', 16) + 'Скласти шлях під ціль</button>') +
        '</div>';
    }

    var nCount = 0;
    var steps = list.map(function (r, i) {
      if (r.status !== 'skip') nCount++;
      return pathNode(st, r, r.status === 'skip' ? '' : nCount, i % 2 ? 'right' : 'left');
    }).join('');

    /* Теми, які оцінювали, але яких у шляху немає. Раніше вони жили в
       окремій вкладці, і після злиття просто зникли б з очей. */
    var inPath = list.map(function (r) { return (r.topic || r.title || '').toLowerCase(); });
    var orphans = S.progressOf(st.id).filter(function (p) {
      return inPath.indexOf((p.topic || '').toLowerCase()) < 0;
    });

    return '<div class="grid grid--main">' +
      '<div class="stack">' +
        '<div class="card card--pad0">' +
          '<div class="card-head" style="padding:22px 24px 10px;margin:0">' +
            '<div><h3 class="card-title">Шлях до цілі</h3>' +
            '<div class="card-sub">' + U.esc(st.goal) + ' · ' +
            U.pl(rs.total, 'етап', 'етапи', 'етапів') + '</div></div>' +
            '<button class="btn btn--soft btn--sm spacer" data-act="roadmap-add" data-arg="' + st.id + '">' +
            icon('plus', 15) + 'Свій етап</button>' +
          '</div>' +
          '<div class="path" style="--done:' + rs.percent + '%">' + steps + '</div>' +
        '</div>' +

        (orphans.length ? '<div class="card">' +
          '<div class="card-head"><div><h3 class="card-title">Теми поза шляхом</h3>' +
          '<div class="card-sub">оцінені, але не поставлені в план</div></div></div>' +
          '<div class="orph">' + orphans.map(function (p) {
            return '<button class="orph__i" data-act="roadmap-adopt" data-arg="' +
              st.id + '|' + U.esc(p.topic) + '" title="Додати в шлях">' +
              U.esc(p.topic) + '<b>' + p.level + '%</b>' + icon('plus', 13) + '</button>';
          }).join('') + '</div></div>' : '') +
      '</div>' +

      '<div class="stack">' +
        '<div class="card center">' +
          '<div class="card-head" style="justify-content:center"><div>' +
          '<h3 class="card-title">Пройдено шляху</h3>' +
          '<div class="card-sub">' + rs.done + ' з ' + rs.total + '</div></div></div>' +
          '<div style="display:grid;place-items:center;padding:6px 0 14px">' +
          C.ring(rs.percent, 128, 12) + '</div>' +
          (rs.doing
            ? '<div class="small muted" style="line-height:1.5">Зараз: <b style="color:var(--ink)">' +
              U.esc(rs.doing.title || rs.doing.topic) + '</b></div>'
            : rs.next
              ? '<div class="small muted" style="line-height:1.5">Далі: <b style="color:var(--ink)">' +
                U.esc(rs.next.title || rs.next.topic) + '</b></div>'
              : '<div class="small muted">Увесь шлях пройдено.</div>') +
          '<button class="btn btn--soft btn--block mt-2" data-act="roadmap-fill" data-arg="' + st.id + '">' +
          icon('plus', 16) + 'Дописати теми з шаблону</button>' +
        '</div>' +

        '<div class="card center">' +
          '<div class="card-head" style="justify-content:center"><div>' +
          '<h3 class="card-title">Засвоєння</h3>' +
          '<div class="card-sub">середнє по оцінених темах</div></div></div>' +
          '<div style="display:grid;place-items:center;padding:6px 0 12px">' +
          C.ring(stat.avgProgress, 112, 11) + '</div>' +
          '<div class="small muted" style="line-height:1.5">Оцінено ' +
          U.pl(stat.topicsCovered, 'тему', 'теми', 'тем') + '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head"><div><h3 class="card-title">Як це працює</h3></div></div>' +
          '<div class="small muted" style="line-height:1.65">' +
          'Клік по кружечку відкриває етап: там і назва, і рівень засвоєння теми. ' +
          'Кнопка з галочкою перемикає стан: попереду → у роботі → пройдено → ' +
          'пропускаємо. Пропущені не рахуються в поступі взагалі — щоб відсоток ' +
          'не падав через теми, які ви свідомо не берете.' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

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
          '<div class="card-head"><div><h3 class="card-title">Ціль і контекст</h3></div>' +
          '<button class="icon-btn spacer" data-act="student-edit" data-arg="' + st.id + '">' + icon('edit', 16) + '</button></div>' +
          '<div class="pre-wrap" style="color:var(--ink-2)">' + U.esc(st.target) + '</div>' +
          '</div>' : '') +

        '<div class="card card--pad0">' +
          '<div class="card-head" style="padding:22px 24px 14px;margin:0">' +
            '<div><h3 class="card-title">Останні уроки</h3>' +
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
        '<div class="card center">' +
          '<div class="card-head" style="justify-content:center"><div><h3 class="card-title">Готовність до цілі</h3>' +
          '<div class="card-sub">' + U.esc(st.goal) + '</div></div></div>' +
          '<div style="display:grid;place-items:center;padding:6px 0 14px">' + C.ring(stat.avgProgress, 128, 12) + '</div>' +
          '<div class="small muted" style="line-height:1.5">Середній рівень засвоєння за ' +
          U.pl(stat.topicsCovered, 'темою', 'темами', 'темами') + '</div>' +
          '<button class="btn btn--soft btn--block mt-2" data-act="progress-edit" data-arg="' + st.id + '">' +
          icon('edit', 16) + 'Оновити прогрес</button>' +
        '</div>' +

        /* Куди рухаємось: на огляді досить одного рядка — що зараз і що далі. */
        (function () {
          var rs = S.roadmapStats(st.id);
          if (!rs.total) {
            return '<button class="card card--btn" data-act="tab" data-arg="path">' +
              '<div class="card-head"><div><h3 class="card-title">План підготовки</h3>' +
              '<div class="card-sub">ще не складений</div></div>' +
              '<span class="spacer">' + icon('chevronR', 18, 'style="color:var(--muted-2)"') + '</span></div>' +
              '<div class="small muted">Розкласти ціль «' + U.esc(st.goal) +
              '» на етапи — тоді видно, що вже пройдено, а що попереду.</div></button>';
          }
          var now = rs.doing || rs.next;
          return '<button class="card card--btn" data-act="tab" data-arg="path">' +
            '<div class="card-head"><div><h3 class="card-title">План підготовки</h3>' +
            '<div class="card-sub">' + rs.done + ' з ' + rs.total + ' етапів</div></div>' +
            '<span class="spacer">' + icon('chevronR', 18, 'style="color:var(--muted-2)"') + '</span></div>' +
            C.bar(rs.percent) +
            (now ? '<div class="small muted mt-2">' +
              (rs.doing ? 'Зараз: ' : 'Далі: ') + '<b style="color:var(--ink)">' +
              U.esc(now.title || now.topic) + '</b></div>'
                 : '<div class="small muted mt-2">Увесь план пройдено.</div>') +
            '</button>';
        })() +

        (boards.length ? '<div class="card card--pad0">' +
          '<div class="card-head" style="padding:22px 24px 12px;margin:0">' +
            '<div><h3 class="card-title">Архів дошок</h3>' +
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
          '<div class="card-head"><div><h3 class="card-title">Сильні теми</h3></div></div>' +
          strong.map(function (p) {
            return '<div style="margin-bottom:14px">' +
              '<div class="row small" style="margin-bottom:6px"><span style="font-weight:600">' + U.esc(p.topic) + '</span>' +
              '<span class="spacer bold">' + p.level + '%</span></div>' + C.bar(p.level) + '</div>';
          }).join('') + '</div>' : '') +

        (weak.length ? '<div class="card">' +
          '<div class="card-head"><div><h3 class="card-title">Над чим працювати</h3>' +
          '<div class="card-sub">найнижчі рівні</div></div></div>' +
          weak.map(function (p) {
            return '<div style="margin-bottom:14px">' +
              '<div class="row small" style="margin-bottom:6px"><span style="font-weight:600">' + U.esc(p.topic) + '</span>' +
              '<span class="spacer bold">' + p.level + '%</span></div>' + C.bar(p.level) + '</div>';
          }).join('') + '</div>' : '') +

        (contacts.length ? '<div class="card">' +
          '<div class="card-head"><div><h3 class="card-title">Контакти</h3></div></div>' +
          contacts.map(function (c) {
            return '<div class="row" style="gap:11px;padding:9px 0;border-bottom:1px solid var(--line)">' +
              '<span style="color:var(--muted)">' + icon(c.i, 17) + '</span>' +
              '<div style="min-width:0"><div class="small muted">' + c.l + '</div>' +
              '<div style="font-weight:600;font-size:13.5px">' + U.esc(c.v) + '</div></div></div>';
          }).join('') + '</div>' : '') +

        '<div class="card">' +
          '<div class="card-head"><div><h3 class="card-title">Умови</h3></div></div>' +
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

    return (future.length ? '<h3 class="card-title mb-2">Заплановані</h3>' +
      '<div class="stack mb-3">' +
      U.sortBy(future, function (l) { return l.date; }).map(function (l) {
        return C.lessonRow(l, numberOf[l.id], { withHw: true });
      }).join('') + '</div>' : '') +

      '<div class="row mb-2"><h3 class="card-title">Історія</h3>' +
      '<button class="btn btn--soft btn--sm spacer" data-act="lesson-add-for" data-arg="' + st.id + '">' +
      icon('plus', 15) + 'Додати урок</button></div>' +

      '<div class="stack">' +
      past.map(function (l) { return C.lessonRow(l, numberOf[l.id], { withHw: true }); }).join('') +
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
    var paid = U.sum(list, function (p) { return p.amount; });
    var doneLessons = S.lessonsOf(st.id).filter(function (l) { return l.status === 'done'; });
    var used = U.sum(doneLessons, function (l) { return l.price || 0; });
    var left = Math.floor(stat.balance / st.price);

    var rows = list.length ? list.map(function (p) {
      return '<tr><td class="nowrap">' + U.fmtDate(p.date) + '</td>' +
        '<td>' + C.badge(p.method || '—', 'badge--grey') + '</td>' +
        '<td class="muted small">' + U.esc(p.note || '') + '</td>' +
        '<td class="num" style="color:var(--green)">+' + U.money(p.amount, S.paymentCur(p)) + '</td>' +
        '<td class="right"><button class="icon-btn" data-act="pay-edit" data-arg="' + p.id + '">' +
        icon('edit', 16) + '</button></td></tr>';
    }).join('') : '<tr><td colspan="5" class="center muted" style="padding:34px">Оплат ще не було</td></tr>';

    return '<div class="grid grid--main">' +
      '<div class="card card--pad0">' +
        '<div class="card-head" style="padding:22px 24px 8px;margin:0">' +
          '<div><h3 class="card-title">Історія оплат</h3></div>' +
          '<button class="btn btn--primary btn--sm spacer" data-act="pay-add" data-arg="' + st.id + '">' +
          icon('plus', 15) + 'Записати</button>' +
        '</div>' +
        '<div style="overflow-x:auto"><table class="tbl">' +
        '<thead><tr><th>Дата</th><th>Спосіб</th><th>Коментар</th><th class="num">Сума</th><th></th></tr></thead>' +
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
            : left >= 1 ? 'Вистачить ще на ' + U.pl(left, 'урок', 'уроки', 'уроків') : 'Наступний урок потребує оплати') +
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

    return '<div class="row mb-2"><h3 class="card-title">Нотатки про учня</h3>' +
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

  /* Стан етапу перемикаємо по колу: перебирати варіанти в діалозі заради
     одного кліка — задорого, а станів усього чотири. */
  var RM_CYCLE = ['todo', 'doing', 'done', 'skip'];

  V.roadmapCycle = function (id) {
    var r = S.get('roadmap', id);
    if (!r) return;
    var i = RM_CYCLE.indexOf(r.status || 'todo');
    var next = RM_CYCLE[(i + 1) % RM_CYCLE.length];
    S.update('roadmap', id, { status: next });
    U.toast(S.ROADMAP_STATUS[next].label);
    window.App.render();
  };

  V.roadmapMove = function (id, dir) {
    if (S.moveRoadmapStep(id, dir)) window.App.render();
  };

  V.roadmapFill = function (studentId) {
    var n = S.fillRoadmap(studentId);
    U.toast(n ? 'Додано ' + U.pl(n, 'етап', 'етапи', 'етапів') : 'Усі теми шаблону вже є', n ? 'ok' : undefined);
    window.App.render();
  };

  /** Створити або відредагувати етап. */
  V.roadmapEdit = function (arg, studentId) {
    var r = studentId ? null : S.get('roadmap', arg);
    var sid = studentId || (r && r.studentId);
    if (!sid) return;

    var topics = S.TOPICS.slice();
    S.roadmapOf(sid).forEach(function (x) {
      if (x.topic && topics.indexOf(x.topic) < 0) topics.push(x.topic);
    });

    var lvlNow = (r && r.topic) ? S.progressLevel(sid, r.topic) : null;
    var hasLvl = lvlNow != null;
    var lvl0 = hasLvl ? lvlNow : 0;

    C.modal({
      title: r ? 'Етап шляху' : 'Новий етап',
      body:
        C.field('Назва', '<input class="input" data-rm-title value="' +
          U.esc(r ? (r.title || '') : '') + '" placeholder="напр. Тригонометрія">') +
        C.field('Тема з довідника',
          '<input class="input" list="rm-topics" data-rm-topic value="' +
          U.esc(r ? (r.topic || '') : '') + '" placeholder="необов’язково">' +
          '<datalist id="rm-topics">' +
          topics.map(function (t) { return '<option value="' + U.esc(t) + '">'; }).join('') +
          '</datalist>',
          'Тема потрібна для оцінки засвоєння — вона показується кільцем навколо етапу.') +

        /* Рівень засвоєння живе тут, а не в окремій вкладці: тема і те,
           наскільки вона дається, — одна думка, і вести їх нарізно означало
           двічі шукати те саме. */
        C.field('Засвоєно',
          '<div class="lvl-row">' +
            '<input class="lvl-range" type="range" min="0" max="100" step="5" ' +
            'data-rm-level value="' + lvl0 + '">' +
            '<input class="input lvl-num" type="number" min="0" max="100" step="1" ' +
            'data-rm-level-num value="' + lvl0 + '">' +
            '<span class="muted">%</span>' +
          '</div>',
          hasLvl ? '' : 'Поки не оцінено. Посуньте повзунок, щоб зафіксувати рівень.') +

        C.field('Орієнтовний строк', '<input class="input" type="date" data-rm-due value="' +
          U.esc(r ? (r.due || '') : '') + '">') +
        C.field('Нотатка', '<textarea class="input" rows="3" data-rm-note>' +
          U.esc(r ? (r.note || '') : '') + '</textarea>'),
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' }
      ].concat(r ? [{
        label: 'Видалити', kind: 'btn--danger', act: 'del',
        onClick: function () {
          S.remove('roadmap', r.id);
          U.toast('Етап прибрано');
          window.App.render();
        }
      }] : []).concat([{
        label: 'Зберегти', kind: 'btn--primary', act: 'ok',
        onClick: function (root) {
          var patch = {
            title: root.querySelector('[data-rm-title]').value.trim(),
            topic: root.querySelector('[data-rm-topic]').value.trim(),
            due:   root.querySelector('[data-rm-due]').value,
            note:  root.querySelector('[data-rm-note]').value.trim()
          };
          if (!patch.title && !patch.topic) {
            U.toast('Впишіть назву етапу', 'err');
            return false;
          }
          if (!patch.title) patch.title = patch.topic;
          if (r) S.update('roadmap', r.id, patch);
          else S.addRoadmapStep(sid, patch);

          /* Рівень пишемо лише коли є тема: він зберігається за назвою теми,
             і без неї його нікуди покласти. Незайманий нуль теж не пишемо —
             інакше «ще не оцінювали» стало б «оцінили на нуль». */
          var lvlEl = root.querySelector('[data-rm-level]');
          if (patch.topic && lvlEl) {
            var lvl = U.clamp(+lvlEl.value || 0, 0, 100);
            if (hasLvl || lvl > 0) S.setProgress(sid, patch.topic, lvl);
          }
          window.App.render();
        }
      }]),
      // повзунок і число показують одне значення й ходять разом
      onMount: function (root) {
        var rng = root.querySelector('[data-rm-level]');
        var num = root.querySelector('[data-rm-level-num]');
        if (!rng || !num) return;
        rng.addEventListener('input', function () { num.value = rng.value; });
        num.addEventListener('input', function () {
          var v = U.clamp(+num.value || 0, 0, 100);
          rng.value = v;
        });
      }
    });
  };

  /** Тема, оцінена поза шляхом, стає його етапом. */
  V.roadmapAdopt = function (arg) {
    var parts = String(arg || '').split('|');
    var sid = parts[0], topic = parts.slice(1).join('|');
    if (!sid || !topic) return;
    S.addRoadmapStep(sid, { title: topic, topic: topic });
    U.toast('Додано в шлях', 'ok');
    window.App.render();
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

          (window.V.materialPicker ? window.V.materialPicker(chosen) : ''),

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
        }])
      });
    });
  };
})();
