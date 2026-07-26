/* Екрани: дашборд, учні, розклад, фінанси, матеріали, налаштування */
(function () {
  'use strict';

  var U = window.U, S = window.S, C = window.C, icon = window.icon;
  var V = {};

  /* ============================================================
     Дашборд
     ============================================================ */

  V.dashboard = function () {
    var db = S.db();
    var today = U.today();
    var h = new Date().getHours();
    var greet = h < 6 ? 'Доброї ночі' : h < 12 ? 'Доброго ранку' : h < 18 ? 'Доброго дня' : 'Доброго вечора';

    var todayLessons = S.lessonsOnDay(today);
    var attention = S.attention();
    var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    var monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    /* Валюти не складаємо — показуємо кожну окремо */
    var incomeMap = S.incomeMap(monthStart, monthEnd);
    var earnedMap = S.earnedMap(monthStart, monthEnd);
    var debtMap = S.debtMap();
    var hasDebt = U.mapSize(debtMap) > 0;
    var hwToCheck = db.homeworks.filter(function (x) { return x.status === 'submitted'; }).length;

    /* --- Тижневий графік навантаження --- */
    var weekStart = U.startOfWeek(today);
    var days = [];
    for (var i = 0; i < 7; i++) {
      var d = U.addDays(weekStart, i);
      var ls = S.lessonsOnDay(d).filter(function (l) { return l.status !== 'cancelled'; });
      days.push({ date: d, count: ls.length });
    }
    var maxDay = Math.max(1, Math.max.apply(null, days.map(function (x) { return x.count; })));
    var chart = days.map(function (x) {
      var isToday = U.isSameDay(x.date, today);
      return '<div class="chart__col">' +
        '<div class="chart__top">' + (x.count || '') + '</div>' +
        '<div class="chart__bar" style="height:' + Math.max(4, (x.count / maxDay) * 100) + '%' +
        (isToday ? '' : ';background:linear-gradient(180deg,#9CC0FF,#6E9DFF)') + '"></div>' +
        '<div class="chart__cap"' + (isToday ? ' style="color:var(--blue-600);font-weight:800"' : '') + '>' +
        U.DAYS_SHORT[x.date.getDay()] + '</div></div>';
    }).join('');

    /* --- Уроки сьогодні --- */
    var todayHtml = todayLessons.length
      ? todayLessons.map(function (l) {
          var st = S.get('students', l.studentId);
          return '<button class="list__item list__item--btn" data-act="lesson-open" data-arg="' + l.id + '">' +
            C.avatar(st, 40) +
            '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:14.5px">' + U.esc(st ? st.name : '—') + '</div>' +
            '<div class="small muted truncate" style="margin-top:2px">' +
            U.esc(l.topic || 'Тема не вказана') + '</div></div>' +
            '<div style="text-align:right"><div style="font-weight:750;font-size:15px">' + U.fmtTime(l.date) + '</div>' +
            '<div style="margin-top:5px">' + C.lessonBadge(l.status) + '</div></div>' +
            '</button>';
        }).join('')
      : C.empty('calendar', 'Сьогодні уроків немає', 'Гарний день, щоб підготувати матеріали або підбити фінанси.');

    /* --- Потребує уваги --- */
    var attIcon = { debt: 'wallet', check: 'checklist', overdue: 'alert', quiet: 'clock' };
    var attTone = { debt: 'var(--red)', check: 'var(--violet)', overdue: 'var(--amber)', quiet: 'var(--muted)' };
    var attBg = { debt: 'var(--red-bg)', check: 'var(--violet-bg)', overdue: 'var(--amber-bg)', quiet: '#EEF2F8' };

    var attHtml = attention.length
      ? attention.slice(0, 7).map(function (a) {
          return '<button class="list__item list__item--btn" data-act="student-open" data-arg="' + a.studentId + '">' +
            '<div style="width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:0 0 auto;' +
            'background:' + attBg[a.kind] + ';color:' + attTone[a.kind] + '">' + icon(attIcon[a.kind], 17) + '</div>' +
            '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:14px">' + U.esc(a.title) + '</div>' +
            '<div class="small muted truncate" style="margin-top:1px">' + U.esc(a.text) + '</div></div>' +
            icon('chevronR', 16, 'style="color:var(--muted-2)"') +
            '</button>';
        }).join('')
      : C.empty('check', 'Усе під контролем', 'Немає боргів, прострочених ДЗ і зниклих учнів.');

    /* --- Найближчі уроки --- */
    var upcoming = S.upcoming(5).filter(function (l) { return !U.isSameDay(l.date, today); });
    var upHtml = upcoming.length
      ? upcoming.map(function (l) {
          var st = S.get('students', l.studentId);
          return '<button class="list__item list__item--btn" data-act="lesson-open" data-arg="' + l.id + '">' +
            '<div style="width:46px;text-align:center;flex:0 0 auto">' +
            '<div style="font-size:17px;font-weight:800;line-height:1">' + U.toDate(l.date).getDate() + '</div>' +
            '<div class="small muted" style="font-size:10.5px;text-transform:uppercase;font-weight:700">' +
            U.MONTHS_GEN[U.toDate(l.date).getMonth()].slice(0, 3) + '</div></div>' +
            C.avatar(st, 32) +
            '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:650;font-size:14px">' + U.esc(st ? st.name : '—') + '</div>' +
            '<div class="small muted">' + U.DAYS_FULL[U.toDate(l.date).getDay()] + ', ' + U.fmtTime(l.date) + '</div>' +
            '</div>' + icon('chevronR', 16, 'style="color:var(--muted-2)"') + '</button>';
        }).join('')
      : C.empty('calendar', 'Далі порожньо', 'Створіть уроки на наступний тиждень одним натисканням.',
          '<button class="btn btn--soft" data-act="gen-week">' + icon('sparkles', 16) + 'Створити за розкладом</button>');

    return C.hero({
      title: greet + ', ' + (db.tutor.name ? U.vocative(db.tutor.name) : 'колего'),
      sub: U.DAYS_FULL[today.getDay()] + ', ' + U.fmtDateLong(today),
      actions: [
        { label: 'Записати урок', icon: 'plus', act: 'lesson-add' },
        { label: 'Новий учень', icon: 'user', act: 'student-add', solid: true }
      ]
    }) +

    '<div class="page page--overlap">' +
      '<div class="quick-row mb-3">' +
        '<button class="quick" data-act="nav" data-arg="#/schedule">' +
          '<div class="quick__icon">' + icon('calendar', 21) + '</div>' +
          '<div><div class="quick__title">Уроки сьогодні' +
          (todayLessons.length ? '<span class="quick__badge">' + todayLessons.length + '</span>' : '') + '</div>' +
          '<div class="small muted" style="margin-top:2px">' +
          (todayLessons.length ? 'перший о ' + U.fmtTime(todayLessons[0].date) : 'вільний день') + '</div></div>' +
          '<span class="quick__arrow">' + icon('chevronR', 18) + '</span></button>' +

        '<button class="quick" data-act="nav" data-arg="#/students">' +
          '<div class="quick__icon" style="background:var(--violet-bg);color:var(--violet)">' + icon('checklist', 21) + '</div>' +
          '<div><div class="quick__title">На перевірку' +
          (hwToCheck ? '<span class="quick__badge" style="background:var(--violet)">' + hwToCheck + '</span>' : '') + '</div>' +
          '<div class="small muted" style="margin-top:2px">' +
          (hwToCheck ? U.pl(hwToCheck, 'робота', 'роботи', 'робіт') + ' чекає' : 'усе перевірено') + '</div></div>' +
          '<span class="quick__arrow">' + icon('chevronR', 18) + '</span></button>' +

        '<button class="quick" data-act="nav" data-arg="#/finance">' +
          '<div class="quick__icon" style="background:' + (hasDebt ? 'var(--red-bg)' : 'var(--green-bg)') +
          ';color:' + (hasDebt ? 'var(--red)' : 'var(--green)') + '">' + icon('wallet', 21) + '</div>' +
          '<div style="min-width:0"><div class="quick__title">' + (hasDebt ? 'Заборгованість' : 'Дохід за місяць') + '</div>' +
          '<div class="small muted truncate" style="margin-top:2px">' +
          (hasDebt ? U.moneyMap(debtMap) + ' не сплачено' : U.moneyMap(incomeMap)) + '</div></div>' +
          '<span class="quick__arrow">' + icon('chevronR', 18) + '</span></button>' +
      '</div>' +

      '<div class="grid grid--main">' +
        '<div class="stack">' +
          '<div class="card card--pad0">' +
            '<div class="card-head" style="padding:22px 24px 14px;margin:0">' +
              '<div><h3 class="card-title">Сьогодні</h3>' +
              '<div class="card-sub">' + U.fmtDateLong(today) + '</div></div>' +
              '<button class="btn btn--soft btn--sm spacer" data-act="lesson-add">' + icon('plus', 15) + 'Урок</button>' +
            '</div>' +
            '<div class="list">' + todayHtml + '</div>' +
          '</div>' +

          '<div class="card card--pad0">' +
            '<div class="card-head" style="padding:22px 24px 14px;margin:0">' +
              '<div><h3 class="card-title">Найближчі уроки</h3>' +
              '<div class="card-sub">що заплановано далі</div></div>' +
              '<button class="btn btn--ghost btn--sm spacer" data-act="nav" data-arg="#/schedule">Весь розклад</button>' +
            '</div>' +
            '<div class="list">' + upHtml + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="stack">' +
          '<div class="card card--pad0">' +
            '<div class="card-head" style="padding:22px 24px 14px;margin:0">' +
              '<div><h3 class="card-title">Потребує уваги</h3>' +
              '<div class="card-sub">' + (attention.length ? U.pl(attention.length, 'пункт', 'пункти', 'пунктів') : 'чисто') + '</div></div>' +
            '</div>' +
            '<div class="list">' + attHtml + '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head"><div><h3 class="card-title">Навантаження на тиждень</h3>' +
            '<div class="card-sub">' + U.pl(U.sum(days, function (x) { return x.count; }), 'урок', 'уроки', 'уроків') + '</div></div></div>' +
            '<div class="chart">' + chart + '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head"><div><h3 class="card-title">' + U.MONTHS_NOM[today.getMonth()] + '</h3>' +
            '<div class="card-sub">поточний місяць</div></div></div>' +
            '<div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)">' +
              '<span class="small muted">Надійшло оплат</span><span class="bold right">' + U.moneyMap(incomeMap) + '</span></div>' +
            '<div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)">' +
              '<span class="small muted">Проведено уроків на</span><span class="bold right">' + U.moneyMap(earnedMap) + '</span></div>' +
            '<div class="row" style="justify-content:space-between;padding:10px 0">' +
              '<span class="small muted">Активних учнів</span><span class="bold">' + S.students().length + '</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  };

  /* ============================================================
     Учні
     ============================================================ */

  V.students = function (query) {
    var q = (query.q || '').toLowerCase();
    var goal = query.goal || '';

    var all = S.students();
    var list = all.filter(function (s) {
      if (goal && s.goal !== goal) return false;
      if (q && (s.name + ' ' + s.grade + ' ' + s.goal).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });

    var goals = [];
    all.forEach(function (s) { if (goals.indexOf(s.goal) < 0) goals.push(s.goal); });

    var chips = '<button class="chip' + (goal ? '' : ' is-active') + '" data-act="filter-goal" data-arg="">' +
      'Усі <span class="muted">' + all.length + '</span></button>' +
      goals.map(function (g) {
        var n = all.filter(function (s) { return s.goal === g; }).length;
        return '<button class="chip' + (goal === g ? ' is-active' : '') + '" data-act="filter-goal" data-arg="' +
          U.esc(g) + '">' + U.esc(g) + ' <span style="opacity:.6">' + n + '</span></button>';
      }).join('');

    var cards = list.length ? list.map(function (s) {
      var stat = S.studentStats(s.id);
      var next = stat.nextLesson;
      return '<button class="stu-card" data-act="student-open" data-arg="' + s.id + '">' +
        '<div class="stu-card__strip" style="background:' + s.color + '"></div>' +
        '<div class="row" style="gap:13px;align-items:flex-start">' +
          C.avatar(s, 48) +
          '<div style="flex:1;min-width:0">' +
            '<div class="stu-card__name truncate">' + U.esc(s.name) + '</div>' +
            '<div class="stu-card__sub truncate" title="' + U.esc(s.goal) + '">' +
            U.esc(s.grade) + ' · ' + U.esc(s.goal) + '</div>' +
          '</div>' +
          C.ring(stat.avgProgress, 44, 5) +
        '</div>' +

        '<div style="margin-top:14px">' + C.balanceBadge(stat.balance, s.price, S.curOf(s.id)) +
        (stat.hwPending ? ' ' + C.badge(U.pl(stat.hwPending, 'ДЗ', 'ДЗ', 'ДЗ') + ' в роботі', 'badge--amber') : '') +
        '</div>' +

        '<div class="stu-card__stats">' +
          '<div><div class="stu-card__stat-v">' + stat.done + '</div>' +
          '<div class="stu-card__stat-l">уроків</div></div>' +
          '<div><div class="stu-card__stat-v">' +
          (stat.avgScore != null ? U.num(stat.avgScore, 1) : '—') + '</div>' +
          '<div class="stu-card__stat-l">бал ДЗ</div></div>' +
          '<div style="min-width:0"><div class="stu-card__stat-v" style="font-size:14px;padding-top:3px">' +
          (next ? U.fmtDate(next.date) + ' ' + U.fmtTime(next.date) : '—') + '</div>' +
          '<div class="stu-card__stat-l">наступний</div></div>' +
        '</div>' +
        '</button>';
    }).join('') : C.empty('users',
        q || goal ? 'Нікого не знайдено' : 'Ще немає учнів',
        q || goal ? 'Спробуйте змінити пошук або фільтр.' : 'Додайте першого учня — і вся статистика почне збиратись автоматично.',
        '<button class="btn btn--primary" data-act="student-add">' + icon('plus', 16) + 'Додати учня</button>');

    var archived = S.archivedStudents();

    return C.hero({
      short: true,
      title: 'Учні',
      sub: U.pl(all.length, 'активний учень', 'активні учні', 'активних учнів'),
      actions: [
        { label: 'Створити уроки на тиждень', icon: 'sparkles', act: 'gen-week' },
        { label: 'Новий учень', icon: 'plus', act: 'student-add', solid: true }
      ]
    }) +

    '<div class="page">' +
      '<div class="row row--wrap mb-3" style="gap:10px">' +
        '<div style="position:relative;min-width:250px">' +
          '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted)">' +
          icon('search', 17) + '</span>' +
          '<input class="input" id="stu-search" placeholder="Пошук за іменем…" value="' + U.esc(query.q || '') +
          '" style="padding-left:40px;border-radius:999px;background:#fff">' +
        '</div>' +
        chips +
      '</div>' +
      '<div class="grid grid--auto">' + cards + '</div>' +

      (archived.length ? '<h3 class="card-title mt-3 mb-2">В архіві</h3>' +
        '<div class="card card--pad0"><div class="list">' +
        archived.map(function (s) {
          return '<div class="list__item">' + C.avatar(s, 32) +
            '<div style="flex:1"><div style="font-weight:650">' + U.esc(s.name) + '</div>' +
            '<div class="small muted">' + U.esc(s.grade) + '</div></div>' +
            '<button class="btn btn--ghost btn--sm" data-act="student-restore" data-arg="' + s.id + '">Повернути</button>' +
            '</div>';
        }).join('') + '</div></div>' : '') +
    '</div>';
  };

  /* Розклад живе в окремому модулі views-schedule.js */

  /* ============================================================
     Фінанси
     ============================================================ */

  V.finance = function (query) {
    var today = U.today();
    var mStart = new Date(today.getFullYear(), today.getMonth(), 1);
    var mEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    var pStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    var pEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    /* Суми різних валют не складаються — сторінка показує одну обрану валюту */
    var codes = S.currenciesInUse();
    var code = (query && query.cur && codes.indexOf(query.cur) >= 0) ? query.cur : codes[0];

    var income = S.incomeBetween(mStart, mEnd, code);
    var prevIncome = S.incomeBetween(pStart, pEnd, code);
    var earned = S.earnedBetween(mStart, mEnd, code);
    var diff = prevIncome ? Math.round((income - prevIncome) / prevIncome * 100) : null;

    var studs = S.students().filter(function (s) { return S.curOf(s.id) === code; });
    var debts = studs.map(function (s) { return { s: s, b: S.balance(s.id) }; })
      .filter(function (x) { return x.b < 0; });
    var totalDebt = U.sum(debts, function (x) { return -x.b; });

    var curChips = codes.length > 1
      ? '<div class="row row--wrap mb-3" style="gap:9px">' +
        '<span class="small muted" style="font-weight:650;margin-right:4px">Валюта:</span>' +
        codes.map(function (c) {
          var n = S.students().filter(function (s) { return S.curOf(s.id) === c; }).length;
          return '<button class="chip' + (c === code ? ' is-active' : '') + '" data-act="filter-cur" data-arg="' + c + '">' +
            U.symbol(c) + ' ' + c + ' <span style="opacity:.6">' + n + '</span></button>';
        }).join('') + '</div>'
      : '';

    /* Дохід за 6 місяців */
    var months = [];
    for (var i = 5; i >= 0; i--) {
      var ms = new Date(today.getFullYear(), today.getMonth() - i, 1);
      var me = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      months.push({ label: U.MONTHS_NOM[ms.getMonth()].slice(0, 3), value: S.incomeBetween(ms, me, code) });
    }
    var maxM = Math.max(1, Math.max.apply(null, months.map(function (m) { return m.value; })));
    var chart = months.map(function (m, idx) {
      var isCur = idx === months.length - 1;
      // Для дрібних валют «к» не має сенсу — показуємо число як є
      var cap = !m.value ? '' : (maxM >= 3000 ? Math.round(m.value / 1000) + 'к' : Math.round(m.value));
      return '<div class="chart__col">' +
        '<div class="chart__top">' + cap + '</div>' +
        '<div class="chart__bar" style="height:' + Math.max(4, (m.value / maxM) * 100) + '%' +
        (isCur ? '' : ';background:linear-gradient(180deg,#9CC0FF,#6E9DFF)') + '"></div>' +
        '<div class="chart__cap">' + m.label + '</div></div>';
    }).join('');

    var recent = U.sortBy(S.db().payments.filter(function (p) { return S.paymentCur(p) === code; }),
      function (p) { return p.date; }, true).slice(0, 12);

    var rows = studs.map(function (s) {
      var bal = S.balance(s.id);
      var paid = U.sum(S.paymentsOf(s.id), function (p) { return p.amount; });
      var done = S.lessonsOf(s.id).filter(function (l) { return l.status === 'done'; }).length;
      return '<tr>' +
        '<td><button class="row" data-act="student-open" data-arg="' + s.id + '" ' +
        'style="border:0;background:none;cursor:pointer;padding:0;gap:10px">' + C.avatar(s, 32) +
        '<span style="font-weight:650">' + U.esc(s.name) + '</span></button></td>' +
        '<td class="num">' + U.money(s.price, code) + '</td>' +
        '<td class="num">' + done + '</td>' +
        '<td class="num">' + U.money(paid, code) + '</td>' +
        '<td class="num" style="color:' + (bal < 0 ? 'var(--red)' : bal > 0 ? 'var(--green)' : 'var(--muted)') + '">' +
        U.money(bal, code) + '</td>' +
        '<td class="right"><button class="btn btn--soft btn--sm" data-act="pay-add" data-arg="' + s.id + '">' +
        icon('plus', 14) + 'Оплата</button></td>' +
        '</tr>';
    }).join('');

    return C.hero({
      short: true,
      title: 'Фінанси',
      sub: U.MONTHS_NOM[today.getMonth()] + ' ' + today.getFullYear() +
        (codes.length > 1 ? ' · ' + U.symbol(code) + ' ' + code : ''),
      actions: [{ label: 'Записати оплату', icon: 'plus', act: 'pay-add', solid: true }]
    }) +

    '<div class="page">' +
      curChips +
      '<div class="grid grid--4 mb-3">' +
        C.stat('Надійшло за місяць', U.money(income, code),
          diff != null ? (diff >= 0 ? '↑ ' : '↓ ') + Math.abs(diff) + '% до минулого' : 'перший місяць',
          'wallet', 'green') +
        C.stat('Проведено уроків на', U.money(earned, code), 'нарахована вартість', 'book') +
        C.stat('Заборгованість', U.money(totalDebt, code),
          debts.length ? U.pl(debts.length, 'учень', 'учні', 'учнів') : 'усі розрахувались',
          'alert', totalDebt ? 'red' : 'green') +
        C.stat('Середній чек', U.money(studs.length ? U.sum(studs, function (s) { return s.price; }) / studs.length : 0, code),
          'за урок', 'chart', 'violet') +
      '</div>' +

      '<div class="grid grid--main mb-3">' +
        '<div class="card">' +
          '<div class="card-head"><div><h3 class="card-title">Дохід за півроку</h3>' +
          '<div class="card-sub">сума отриманих оплат по місяцях</div></div></div>' +
          '<div class="chart">' + chart + '</div>' +
        '</div>' +

        '<div class="card card--pad0">' +
          '<div class="card-head" style="padding:22px 24px 14px;margin:0">' +
            '<div><h3 class="card-title">Борги</h3><div class="card-sub">' +
            (debts.length ? 'потрібно нагадати' : 'усе сплачено') + '</div></div>' +
          '</div>' +
          '<div class="list">' +
          (debts.length ? debts.map(function (x) {
            return '<button class="list__item list__item--btn" data-act="student-open" data-arg="' + x.s.id + '">' +
              C.avatar(x.s, 32) +
              '<div style="flex:1;min-width:0"><div style="font-weight:650;font-size:14px">' + U.esc(x.s.name) + '</div>' +
              '<div class="small muted">' + U.pl(Math.ceil(-x.b / x.s.price),
                'неоплачений урок', 'неоплачені уроки', 'неоплачених уроків') + '</div></div>' +
              '<span class="bold" style="color:var(--red)">' + U.money(-x.b, code) + '</span></button>';
          }).join('') : C.empty('check', 'Боргів немає', 'Усі учні мають додатний або нульовий баланс.')) +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card card--pad0 mb-3">' +
        '<div class="card-head" style="padding:22px 24px 8px;margin:0">' +
          '<div><h3 class="card-title">Баланси учнів</h3>' +
          '<div class="card-sub">оплачено мінус вартість проведених уроків</div></div>' +
        '</div>' +
        '<div style="overflow-x:auto"><table class="tbl">' +
          '<thead><tr><th>Учень</th><th class="num">Ціна</th><th class="num">Уроків</th>' +
          '<th class="num">Сплачено</th><th class="num">Баланс</th><th></th></tr></thead>' +
          '<tbody>' + (rows || '<tr><td colspan="6" class="center muted" style="padding:30px">Немає учнів</td></tr>') + '</tbody>' +
        '</table></div>' +
      '</div>' +

      '<div class="card card--pad0">' +
        '<div class="card-head" style="padding:22px 24px 8px;margin:0">' +
          '<div><h3 class="card-title">Останні оплати</h3></div>' +
        '</div>' +
        '<div style="overflow-x:auto"><table class="tbl">' +
          '<thead><tr><th>Дата</th><th>Учень</th><th>Спосіб</th><th>Коментар</th><th class="num">Сума</th><th></th></tr></thead>' +
          '<tbody>' + (recent.length ? recent.map(function (p) {
            var s = S.get('students', p.studentId);
            return '<tr><td class="nowrap">' + U.fmtDate(p.date) + '</td>' +
              '<td>' + U.esc(s ? s.name : '—') + '</td>' +
              '<td>' + C.badge(p.method || '—', 'badge--grey') + '</td>' +
              '<td class="muted small">' + U.esc(p.note || '') + '</td>' +
              '<td class="num">' + U.money(p.amount, S.paymentCur(p)) + '</td>' +
              '<td class="right"><button class="icon-btn" data-act="pay-edit" data-arg="' + p.id + '">' +
              icon('edit', 16) + '</button></td></tr>';
          }).join('') : '<tr><td colspan="6" class="center muted" style="padding:30px">Оплат ще не було</td></tr>') + '</tbody>' +
        '</table></div>' +
      '</div>' +
    '</div>';
  };

  /* ============================================================
     Матеріали
     ============================================================ */

  V.materials = function (query) {
    var topic = query.topic || '';
    var all = S.db().materials;
    var list = topic ? all.filter(function (m) { return m.topic === topic; }) : all;

    var topics = [];
    all.forEach(function (m) { if (topics.indexOf(m.topic) < 0) topics.push(m.topic); });

    var chips = '<button class="chip' + (topic ? '' : ' is-active') + '" data-act="filter-topic" data-arg="">' +
      'Усі <span style="opacity:.6">' + all.length + '</span></button>' +
      topics.map(function (t) {
        return '<button class="chip' + (topic === t ? ' is-active' : '') + '" data-act="filter-topic" data-arg="' +
          U.esc(t) + '">' + U.esc(t) + '</button>';
      }).join('');

    var typeIcon = { link: 'link', file: 'file', note: 'note' };
    var typeLabel = { link: 'Посилання', file: 'Файл', note: 'Нотатка' };

    var cards = list.length ? list.map(function (m) {
      return '<div class="card" style="display:flex;flex-direction:column;gap:12px">' +
        '<div class="row" style="gap:12px;align-items:flex-start">' +
          '<div class="quick__icon" style="width:38px;height:38px">' + icon(typeIcon[m.type] || 'file', 19) + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:15px;line-height:1.35">' + U.esc(m.title) + '</div>' +
            '<div class="small muted" style="margin-top:3px">' + U.esc(typeLabel[m.type] || '') + ' · ' + U.esc(m.topic) + '</div>' +
          '</div>' +
          '<button class="icon-btn" data-act="mat-edit" data-arg="' + m.id + '">' + icon('edit', 16) + '</button>' +
        '</div>' +
        (m.note ? '<div class="small muted pre-wrap" style="line-height:1.55">' + U.esc(m.note) + '</div>' : '') +
        (m.url ? '<a class="btn btn--soft btn--sm" href="' + U.esc(m.url) + '" target="_blank" rel="noopener" ' +
          'style="align-self:flex-start">' + icon('link', 15) + 'Відкрити</a>' : '') +
        '</div>';
    }).join('') : C.empty('folder', 'Бібліотека порожня',
        'Складіть сюди посилання, картки й методичні нотатки, щоб не шукати їх щоразу.',
        '<button class="btn btn--primary" data-act="mat-add">' + icon('plus', 16) + 'Додати матеріал</button>');

    return C.hero({
      short: true,
      title: 'Матеріали',
      sub: U.pl(all.length, 'матеріал', 'матеріали', 'матеріалів') + ' у бібліотеці',
      actions: [{ label: 'Додати матеріал', icon: 'plus', act: 'mat-add', solid: true }]
    }) +

    '<div class="page">' +
      '<div class="row row--wrap mb-3" style="gap:9px">' + chips + '</div>' +
      '<div class="grid grid--auto">' + cards + '</div>' +
    '</div>';
  };

  /* ============================================================
     Налаштування
     ============================================================ */

  function syncOn() {
    return !!(window.Cloud && window.Cloud.available() && window.Cloud.signedIn());
  }

  /* Людські підписи станів синхронізації. */
  var SYNC_TEXT = {
    off:       ['muted',  'не налаштована'],
    signedout: ['warn',   'потрібен вхід'],
    idle:      ['ok',     'усе збережено'],
    syncing:   ['muted',  'зберігаю…'],
    offline:   ['warn',   'немає інтернету — зміни поїдуть пізніше'],
    error:     ['err',    'не вдалося зберегти на сервер']
  };

  V.syncStatusHtml = function () {
    var st = (window.Cloud ? window.Cloud.status() : { state: 'off' });
    var pair = SYNC_TEXT[st.state] || SYNC_TEXT.off;
    var extra = '';
    // new Date(...) обов'язковий: U.toDate читає рядки як місцевий час
    // (так зберігаються дати уроків), а тут час приходить у UTC — без цього
    // показувало б на 3 години раніше
    if (st.state === 'idle' && st.lastSync) extra = ' · ' + U.fmtDateTime(new Date(st.lastSync));
    else if (st.detail) extra = ' · ' + st.detail;
    return '<span class="sync-dot sync-dot--' + pair[0] + '"></span>' +
      '<span class="small">' + U.esc(pair[1] + extra) + '</span>';
  };

  V.syncCard = function () {
    var Cl = window.Cloud;
    var head = '<div class="card-head"><div><h3 class="card-title">Синхронізація</h3>' +
      '<div class="card-sub">спільні дані на всіх пристроях і автоматичні копії</div></div></div>';

    /* Немає адреси проєкту — нічого вмикати */
    if (!Cl || !Cl.available()) {
      return '<div class="card">' + head +
        '<div class="field__hint">Поки не налаштована: дані живуть тільки в цьому браузері, ' +
        'а на телефоні буде окрема порожня база.' +
        '<br><br>Щоб увімкнути, потрібен безкоштовний проєкт Supabase — покроково описано ' +
        'у файлі <b>DEPLOY.md</b>, розділ «Крок 2». Після цього адресу проєкту треба вписати ' +
        'у файл <b>assets/js/cloudconfig.js</b>.</div>' +
        '</div>';
    }

    /* Налаштована, але вхід не зроблено */
    if (!Cl.signedIn()) {
      return '<div class="card">' + head +
        '<div class="row" style="gap:8px;margin-bottom:12px">' + V.syncStatusHtml() + '</div>' +
        '<div id="sync-form">' +
          C.field('Пошта', C.input('email', '', 'type="email" autocomplete="username" placeholder="ваша@пошта"')) +
          C.field('Пароль', C.input('password', '', 'type="password" autocomplete="current-password"')) +
        '</div>' +
        '<div class="row row--wrap" style="gap:10px">' +
          '<button class="btn btn--primary" data-act="sync-signin">' + icon('cloud', 16) + 'Увійти</button>' +
          '<button class="btn btn--ghost" data-act="sync-signup">Створити акаунт</button>' +
        '</div>' +
        '<div class="field__hint mt-2"><b>Перший раз</b> — «Створити акаунт»: дані з цього ' +
        'браузера поїдуть на сервер і стануть основними.' +
        '<br><b>На інших пристроях</b> — «Увійти»: там навпаки, локальні дані буде замінено ' +
        'серверними. Тому на телефоні входьте вже після комп\'ютера.</div>' +
        '</div>';
    }

    var st = Cl.status();

    return '<div class="card">' + head +
      '<div class="row" style="gap:8px;margin-bottom:4px" data-sync-state>' + V.syncStatusHtml() + '</div>' +
      '<div class="field__hint">' + U.esc(st.email || '') + '</div>' +
      V.syncBackups() +
      '<div class="row row--wrap" style="gap:10px;margin-top:12px">' +
        '<button class="btn btn--soft" data-act="sync-now">' + icon('refresh', 16) + 'Синхронізувати зараз</button>' +
        '<button class="btn btn--ghost" data-act="sync-signout">Вийти</button>' +
      '</div>' +
      '<div class="field__hint mt-2">Усе зберігається саме. Якщо змінити щось на двох пристроях, ' +
      'програма залишить новішу версію — питати не буде. Стару при цьому не викидає: вона ' +
      'лишається в історії нижче.</div>' +
      '<div class="mt-2" data-sync-snaps><div class="field__hint">Історія версій завантажується…</div></div>' +
      '</div>';
  };

  /**
   * Страхові копії, зроблені перед прийняттям серверної версії.
   * Показуємо лише коли вони є — це аварійний вихід, а не щоденний інструмент.
   */
  V.syncBackups = function () {
    if (!window.Cloud || !window.Cloud.backups) return '';
    var list = window.Cloud.backups();
    if (!list.length) return '';
    return '<div class="cal-notice" style="margin:12px 0;display:block">' +
      '<b>Якщо чогось не вистачає — поверніть звідси.</b> Програма взяла новішу версію ' +
      'з іншого пристрою, а те, що було тут, відклала про запас.' +
      '<div class="snap-list" style="margin-top:10px">' +
      list.map(function (b) {
        return '<div class="snap-row">' +
          '<span class="small">' + U.esc(U.fmtDateTime(new Date(b.at))) + '</span>' +
          '<span class="small muted">' + U.pl(b.students, 'учень', 'учні', 'учнів') + '</span>' +
          '<button class="btn btn--ghost btn--sm spacer" data-act="sync-restore-local" ' +
          'data-arg="' + b.i + '">Повернути</button>' +
        '</div>';
      }).join('') +
      '</div></div>';
  };

  /** Історія автоматичних копій — приходить із сервера, тому дописуємо після рендеру. */
  V.fillSyncAsync = function () {
    var box = document.querySelector('[data-sync-snaps]');
    if (!box || !syncOn()) return;
    window.Cloud.snapshots().then(function (rows) {
      if (!rows || !rows.length) {
        box.innerHTML = '<div class="field__hint">Історія поки порожня — вона з\'явиться після ' +
          'перших змін. Сервер сам зберігає попередню версію при кожному записі.</div>';
        return;
      }
      box.innerHTML = '<div class="field__label" style="margin-bottom:6px">Автоматичні копії · ' +
        rows.length + '</div>' +
        '<div class="snap-list">' +
        rows.slice(0, 10).map(function (r) {
          return '<div class="snap-row">' +
            // сервер віддає час у UTC — перетворюємо на дату, інакше U.toDate
            // прочитає його як місцевий і покаже на 3 години раніше
            '<span class="small">' + U.esc(U.fmtDateTime(new Date(r.created_at))) + '</span>' +
            '<span class="small muted">' + U.esc(r.device || '') + '</span>' +
            '<button class="btn btn--ghost btn--sm spacer" data-act="sync-restore" data-arg="' + r.id + '">' +
            'Відновити</button>' +
          '</div>';
        }).join('') + '</div>' +
        '<div class="field__hint mt-2">Копії робить сервер сам при кожному збереженні. ' +
        'Тримаються останні 50 — це кілька тижнів роботи.</div>';
    }).catch(function (e) {
      box.innerHTML = '<div class="field__hint">Не вдалося прочитати історію: ' +
        U.esc(e && e.message ? e.message : String(e)) + '</div>';
    });
  };

  V.settings = function () {
    var t = S.db().tutor;
    var db = S.db();

    return C.hero({
      short: true,
      title: 'Налаштування',
      sub: 'профіль, дані, резервні копії'
    }) +

    '<div class="page">' +
      '<div class="grid grid--2">' +
        '<div class="card">' +
          '<div class="card-head"><div><h3 class="card-title">Профіль репетитора</h3>' +
          '<div class="card-sub">як вас називати в інтерфейсі</div></div></div>' +
          '<div id="tutor-form">' +
            C.field('Ім\'я', C.input('name', t.name)) +
            C.field('Предмет', C.input('subject', t.subject)) +
            '<div class="field-row field-row--3">' +
              C.field('Ціна за урок', C.input('defaultPrice', t.defaultPrice, 'type="number" step="any"')) +
              C.field('Валюта', C.select('currency', t.currency || 'UAH',
                U.CURRENCY_CODES.map(function (c) { return { value: c, label: U.symbol(c) + '  ' + c }; }))) +
              C.field('Тривалість, хв', C.input('defaultDuration', t.defaultDuration, 'type="number" step="15"')) +
            '</div>' +
            '<div class="field__hint mb-2">Ці значення підставляються в картку нового учня. ' +
            'У кожного учня валюту можна змінити окремо.</div>' +
            C.field('Постійне посилання на зустріч',
              C.input('meetUrl', t.meetUrl, 'placeholder="https://meet.google.com/abc-defg-hij"'),
              'Одне посилання на всі уроки — кнопка «Приєднатися» з’явиться в уроці й на дошці. ' +
              'У окремого учня можна вказати своє в його картці.') +
            '<button class="btn btn--primary" data-act="tutor-save">' + icon('check', 16) + 'Зберегти</button>' +
          '</div>' +
        '</div>' +

        '<div class="stack">' +
          (function () {
            var R = window.Rates;
            if (!R) return '';
            var st = R.state();
            var codes = S.currenciesInUse().filter(function (c) { return c !== 'UAH'; });
            if (!codes.length) codes = ['USD', 'EUR'];
            var fresh = R.isFresh();
            return '<div class="card">' +
              '<div class="card-head"><div><h3 class="card-title">Курс валют</h3>' +
              '<div class="card-sub">щоб зводити заробіток у гривні</div></div>' +
              '<button class="btn btn--soft btn--sm spacer" data-act="rates-refresh">' +
              icon('link', 15) + 'Оновити з НБУ</button></div>' +
              '<div class="row small mb-2" style="gap:8px">' +
                (fresh
                  ? C.badge('НБУ на ' + U.fmtDate(st.date), 'badge--green', 'check')
                  : C.badge(st.error ? 'НБУ недоступний' : 'курс не завантажено', 'badge--amber', 'alert')) +
              '</div>' +
              '<div id="rates-form">' +
                '<div class="field-row">' +
                  codes.slice(0, 2).map(function (c) {
                    var auto = st.map[c];
                    return C.field(U.symbol(c) + ' ' + c + ' → ₴',
                      C.input('rate_' + c, R.manual()[c] || '', 'type="number" step="0.01" min="0" ' +
                        'placeholder="' + (auto ? U.num(auto, 2) : 'напр. 42') + '"'));
                  }).join('') +
                '</div>' +
                '<button class="btn btn--ghost btn--sm" data-act="rates-save">' +
                icon('check', 15) + 'Зберегти вручну</button>' +
              '</div>' +
              '<div class="field__hint mt-2">Спершу програма питає курс у НБУ. Якщо інтернету немає ' +
              'або файл відкрито напряму з диска — використовується курс, введений тут вручну.</div>' +
            '</div>';
          })() +
          V.syncCard() +

          '<div class="card">' +
            '<div class="card-head"><div><h3 class="card-title">Дані</h3>' +
            '<div class="card-sub">' + (syncOn()
              ? 'копії робляться самі, ця кнопка — про запас'
              : 'усе зберігається лише у вашому браузері') + '</div></div></div>' +
            '<div class="row row--wrap" style="gap:10px">' +
              '<button class="btn btn--soft" data-act="export">' + icon('download', 16) + 'Експорт у файл</button>' +
              '<button class="btn btn--ghost" data-act="import">' + icon('upload', 16) + 'Імпорт з файлу</button>' +
            '</div>' +
            '<div class="field__hint mt-2">' + (syncOn()
              ? 'Синхронізація вже тримає історію версій на сервері, тому щотижневий експорт більше не обов\'язковий. Файл усе одно корисний: він єдиний працює, коли сервер недоступний, і забирає картинки дошок, яких у синхронізації поки немає.'
              : 'Резервну копію варто робити раз на тиждень. Файл JSON можна перенести на інший комп\'ютер або в інший браузер.') + '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head"><div><h3 class="card-title">Що зараз у базі</h3></div></div>' +
            '<div class="grid grid--2" style="gap:12px">' +
              ['students:Учнів:users', 'lessons:Уроків:book', 'homeworks:ДЗ:checklist',
               'payments:Оплат:wallet', 'notes:Нотаток:note', 'materials:Матеріалів:folder',
               'boards:Дошок:board']
                .map(function (x) {
                  var p = x.split(':');
                  return '<div class="row" style="gap:10px">' +
                    '<span style="color:var(--blue-600)">' + icon(p[2], 17) + '</span>' +
                    '<span class="small muted">' + p[1] + '</span>' +
                    '<span class="spacer bold">' + db[p[0]].length + '</span></div>';
                }).join('') +
              '<div class="row" style="gap:10px">' +
                '<span style="color:var(--blue-600)">' + icon('image', 17) + '</span>' +
                '<span class="small muted">Картинок</span>' +
                '<span class="spacer bold" data-img-usage>…</span></div>' +
            '</div>' +
            '<div class="field__hint mt-2">Записи дошок лежать у localStorage разом з рештою даних, ' +
            'а картинки — окремо в IndexedDB, де місця значно більше. Резервна копія забирає і те, й інше.</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head"><div><h3 class="card-title">Небезпечна зона</h3></div></div>' +
            '<div class="row row--wrap" style="gap:10px">' +
              '<button class="btn btn--ghost" data-act="reset-demo">' + icon('sparkles', 16) + 'Повернути демо-дані</button>' +
              '<button class="btn btn--danger" data-act="wipe">' + icon('trash', 16) + 'Очистити все</button>' +
            '</div>' +
            '<div class="field__hint mt-2">«Очистити все» видаляє учнів, уроки, оплати й нотатки без можливості відновлення. Спершу зробіть експорт.</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  };

  /** Обсяг картинок дізнаємось асинхронно — дописуємо після рендеру. */
  V.fillSettingsAsync = function () {
    var el = document.querySelector('[data-img-usage]');
    if (!el) return;
    if (!window.ImgStore || !window.ImgStore.available()) { el.textContent = '—'; return; }
    Promise.all([window.ImgStore.keys(), window.ImgStore.usage()]).then(function (r) {
      var n = (r[0] || []).length, bytes = r[1] || 0;
      el.textContent = n + (bytes ? ' · ' + (bytes < 1048576
        ? Math.max(1, Math.round(bytes / 1024)) + ' КБ'
        : (bytes / 1048576).toFixed(1) + ' МБ') : '');
    }).catch(function () { el.textContent = '—'; });
  };

  /** Підвантажити фото домашніх завдань — вони лежать в IndexedDB. */
  V.hydratePhotos = function () {
    if (!window.ImgStore || !window.ImgStore.available()) return;
    U.$$('[data-hw-photos]').forEach(function (box) {
      if (box.dataset.done) return;
      box.dataset.done = '1';
      box.dataset.hwPhotos.split(',').filter(Boolean).forEach(function (k) {
        var el = document.createElement('a');
        el.className = 'photo-thumb';
        el.target = '_blank';
        el.rel = 'noopener';
        el.innerHTML = '<img alt="Фото завдання">';
        box.appendChild(el);
        window.ImgStore.get(k).then(function (blob) {
          if (!blob) { el.classList.add('is-missing'); return; }
          var url = URL.createObjectURL(blob);
          el.querySelector('img').src = url;
          el.href = url;
        }).catch(function () { el.classList.add('is-missing'); });
      });
    });
  };

  /** Спільний хук після кожного рендеру. */
  V.afterRender = function (route) {
    if (route && route.parts && route.parts[0] === 'settings') {
      V.fillSettingsAsync();
      V.fillSyncAsync();
    }
    V.hydratePhotos();

    // курс НБУ потрібен розкладу й фінансам — тягнемо один раз на день
    var needRates = route && route.parts &&
      (route.parts[0] === 'schedule' || route.parts[0] === 'finance' || !route.parts.length);
    if (needRates && window.Rates && !window.Rates.isFresh()) {
      window.Rates.refresh().then(function (ok) {
        if (ok && window.App) window.App.render();
      });
    }
  };

  window.V = V;
})();
