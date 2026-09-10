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

        /* Картки «На перевірку» тут немає навмисно: вона показувала саму лише
           кількість і вела в список учнів, тоді як «Потребує уваги» на цьому ж
           екрані називає, хто саме здав і яку роботу. Дві згадки про одне —
           це не подвійна увага, а зайвий крок. */

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
          '<div><div class="stu-card__stat-v">' + stat.hwPending + '</div>' +
          '<div class="stu-card__stat-l">ДЗ в роботі</div></div>' +
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
          var stat = S.studentStats(s.id);
          // рядок відкриває картку: історія й оплати нікуди не поділися
          return '<div class="list__item">' +
            '<button class="row" data-act="student-open" data-arg="' + s.id + '" ' +
            'style="flex:1;min-width:0;border:0;background:none;cursor:pointer;padding:0;gap:10px;text-align:left">' +
            C.avatar(s, 32) +
            '<span style="min-width:0"><span style="font-weight:650;display:block">' + U.esc(s.name) + '</span>' +
            '<span class="small muted">' + U.esc(s.grade) + ' · ' +
            U.pl(stat.done, 'урок', 'уроки', 'уроків') + ' в історії</span></span></button>' +
            '<button class="btn btn--ghost btn--sm" data-act="student-restore" data-arg="' + s.id + '">Повернути</button>' +
            '</div>';
        }).join('') + '</div></div>' : '') +
    '</div>';
  };

  /* Розклад живе в окремому модулі views-schedule.js */

  /* ============================================================
     Фінанси
     ============================================================ */

  /* ============================================================
     Загальний дохід за місяць
     ============================================================

     Решта сторінки навмисно показує одну валюту за раз: складати гривні
     з доларами без курсу — брехня. Але «скільки я заробив цього місяця»
     — питання про все разом, тож окремо зводимо все за курсом НБУ і
     показуємо двома звичними мірками: у гривнях і в доларах.

     Якщо курсу якоїсь валюти немає, чесно кажемо, що сума неповна, а не
     мовчки її занижуємо. */
  /** «У гривнях», «У доларах» — щоб підпис читався, а не був кодом. */
  var IN_WORDS = { UAH: 'У гривнях', USD: 'У доларах', EUR: 'У євро', PLN: 'У злотих',
                   GBP: 'У фунтах', CZK: 'У кронах', CAD: 'У канадських доларах',
                   AUD: 'В австралійських доларах' };
  function inWords(code) { return IN_WORDS[code] || ('У валюті ' + code); }

  function totalIncomeCard(mStart, mEnd, pStart, pEnd) {
    var R = window.Rates;
    if (!R) return '';

    var map = S.incomeMap(mStart, mEnd);
    if (!U.mapSize(map)) return '';

    /* Кожна оплата за курсом свого дня: минулі гроші не мають мінятися
       разом із сьогоднішнім курсом. */
    var now = S.incomeUAHBetween(mStart, mEnd);
    var prev = S.incomeUAHBetween(pStart, pEnd);

    var usdRate = R.get('USD');
    var inUsd = usdRate ? now.uah / usdRate : null;

    var diff = (prev.uah && !prev.partial && !now.partial)
      ? Math.round((now.uah - prev.uah) / prev.uah * 100) : null;

    /* З чого склалася сума — щоб число не виглядало як здогад.

       Пробував виносити цей поділ у великі числа, а зведену суму лишати
       рядком. Вийшло гірше: заголовок питає «скільки за місяць», а великим
       стояла частина відповіді. Повне число має бути великим, а поділ —
       поясненням під ним. */
    var parts = U.mapSize(map) > 1
      ? '<div class="tot__parts">' + U.moneyMap(map) + '</div>' : '';

    var note;
    if (now.partial) {
      note = '<div class="tot__warn">' + icon('alert', 14) +
        '<span>Немає курсу для ' + U.esc(now.missing.join(', ')) +
        ' — ці оплати в суму не входять. Курс можна вписати вручну в Налаштуваннях.</span></div>';
    } else if (!usdRate) {
      note = '<div class="tot__warn">' + icon('alert', 14) +
        '<span>Немає курсу долара — показано лише гривні.</span></div>';
    } else {
      var src = R.sourceOf('USD') === 'manual' ? 'курс вписано вручну' : 'курс НБУ';
      note = '<div class="tot__src">' + U.esc(src) + ' · $1 = ' +
        U.esc(String(Math.round(usdRate * 100) / 100)) + ' ₴</div>';
    }

    return '<div class="card tot mb-3">' +
      '<div class="card-head"><div><h3 class="card-title">Загальний дохід за місяць</h3>' +
      '<div class="card-sub">усі валюти разом, за курсом</div></div>' +
      (diff != null
        ? '<span class="spacer badge ' + (diff >= 0 ? 'badge--green' : 'badge--red') + '">' +
          (diff >= 0 ? '↑ ' : '↓ ') + Math.abs(diff) + '% до минулого</span>'
        : '') +
      '</div>' +
      /* Два рівноправні розділи, а не головне число й приписка збоку:
         дохід той самий, просто виміряний двома мірками. */
      '<div class="tot__row">' +
        '<div class="tot__cell">' +
          '<div class="tot__k">У гривнях</div>' +
          '<div class="tot__v">' + U.esc(U.money(Math.round(now.uah), 'UAH')) + '</div>' +
        '</div>' +
        (inUsd != null
          ? '<div class="tot__sep"></div>' +
            '<div class="tot__cell">' +
              '<div class="tot__k">У доларах</div>' +
              '<div class="tot__v">' + U.esc(U.money(Math.round(inUsd), 'USD')) + '</div>' +
            '</div>'
          : '') +
      '</div>' +
      parts + note +
      '</div>';
  }

  /* ============================================================
     Дашборди: з чого складається місяць
     ============================================================

     Стовпчики показують, СКІЛЬКИ, але не показують, ЗВІДКИ. Три питання,
     на які стовпчиками не відповісти: хто приносить дохід, скільки з
     нарахованого вже дійшло, і як розподілені борги.

     Усі суми зводимо в гривні за курсом — інакше сектори різних валют
     не можна порівнювати між собою. Валюти без курсу відкидаємо: краще
     не показати сектор, ніж намалювати його з вигаданого числа. */
  function toUah(amount, code) {
    var R = window.Rates;
    if (!R) return code === 'UAH' ? amount : null;
    return R.toUAH(amount, code);
  }

  function financePies(mStart, mEnd, code) {
    /* Рахуємо в гривнях — інакше сектори різних валют не порівняти між
       собою. Показуємо в тій валюті, яку обрано перемикачем: частки від
       цього не змінюються, змінюється лише підпис. Якщо курсу обраної
       валюти немає, чесніше лишитися в гривнях, ніж ділити на здогад. */
    var RP = window.Rates;
    var shown = (code === 'UAH' || (RP && RP.get(code))) ? code : 'UAH';
    var rate = shown === 'UAH' ? 1 : RP.get(shown);
    var uah = function (v) { return U.money(Math.round(v / rate), shown); };
    var inCur = inWords(shown).toLowerCase();

    /* 1. Хто приносить дохід */
    var byStudent = {};
    S.paymentsBetween(mStart, mEnd).forEach(function (p) {
      // за курсом дня оплати, а не сьогоднішнім
      var v = S.uahOf(p, p.amount, S.paymentCur(p));
      if (v == null) return;
      byStudent[p.studentId] = (byStudent[p.studentId] || 0) + v;
    });
    var studentSlices = Object.keys(byStudent).map(function (id) {
      var s = S.get('students', id);
      return { label: s ? s.name : 'Видалений учень', value: byStudent[id] };
    });

    /* 2. Скільки з нарахованого дійшло. Порівнюємо за той самий місяць:
       нараховано за проведені уроки проти отриманих оплат. */
    var earnedUah = 0;
    S.doneLessonsBetween(mStart, mEnd).forEach(function (l) {
      var v = S.uahOf(l, l.price || 0, S.lessonCur(l));
      if (v != null) earnedUah += v;
    });
    var paidUah = studentSlices.reduce(function (a, s) { return a + s.value; }, 0);
    var owedUah = Math.max(0, earnedUah - paidUah);
    var collectSlices = [
      { label: 'Оплачено', value: Math.min(paidUah, earnedUah), color: '#12A268' },
      { label: 'Ще не оплачено', value: owedUah, color: '#E07C0B' }
    ];
    var collected = earnedUah > 0 ? Math.round(Math.min(paidUah, earnedUah) / earnedUah * 100) : 0;

    /* 3. Борги за учнями — видно, з ким саме говорити */
    var debtSlices = S.debtors().map(function (d) {
      var v = toUah(d.debt, d.cur);
      return v == null ? null
        : { label: d.s.name + (d.s.archived ? ' · в архіві' : ''), value: v };
    }).filter(Boolean);

    var cards = [];

    var p1 = C.donut(studentSlices, { size: 168, fmt: uah,
      centerTop: uah(paidUah), center: 'за місяць' });
    if (p1) {
      cards.push('<div class="card">' +
        '<div class="card-head"><div><h3 class="card-title">Хто приносить дохід</h3>' +
        '<div class="card-sub">оплати цього місяця, ' + U.esc(inCur) + ' за курсом</div></div></div>' +
        p1 + '</div>');
    }

    // без нарахувань частка не має сенсу: ділити нема на що
    var p2 = earnedUah > 0 ? C.donut(collectSlices, { size: 168, fmt: uah, minShare: 0,
      centerTop: collected + '%', center: 'зібрано' }) : '';
    if (p2) {
      cards.push('<div class="card">' +
        '<div class="card-head"><div><h3 class="card-title">Скільки вже зібрано</h3>' +
        '<div class="card-sub">нараховано за проведені уроки: ' + U.esc(uah(earnedUah)) +
        '</div></div></div>' + p2 + '</div>');
    }

    var p3 = C.donut(debtSlices, { size: 168, fmt: uah,
      centerTop: uah(debtSlices.reduce(function (a, s) { return a + s.value; }, 0)),
      center: 'борг' });
    if (p3) {
      cards.push('<div class="card">' +
        '<div class="card-head"><div><h3 class="card-title">Хто винен</h3>' +
        '<div class="card-sub">поточна заборгованість, ' + U.esc(inCur) + ' за курсом</div></div></div>' +
        p3 + '</div>');
    }

    if (!cards.length) return '';
    return '<div class="grid grid--' + Math.min(3, cards.length) + ' mb-3">' +
      cards.join('') + '</div>';
  }

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
    /* Боржники — з архівними разом: людина пішла, а гроші лишились винні.
       Якби ми брали лише активних, борг зникав би з очей саме тоді, коли
       про нього найлегше забути. */
    var debts = S.debtors().filter(function (d) { return d.cur === code; })
      .map(function (d) { return { s: d.s, b: -d.debt }; });
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

    /* Дохід за 6 місяців — усі валюти разом.

       Раніше стовпчик рахував лише вибрану валюту. Через це «дохід за
       місяць» у діаграмі не збігався з доходом за місяць у картці зверху:
       там усе разом, тут сама одна валюта. Питання «скільки я заробив у
       серпні» має одну відповідь, а не по одній на валюту.

       Минулі місяці переводяться за сьогоднішнім курсом — історичних у нас
       немає. Для «більше чи менше, ніж торік» цього досить, і про це
       сказано в підписі. */
    var RT = window.Rates;
    var chartCur = (RT && (code === 'UAH' || RT.get(code))) ? code : null;
    var chartPartial = false;

    function monthValue(ms, me) {
      if (!chartCur) return S.incomeBetween(ms, me, code);   // без курсу — чесно лише своя валюта
      var sum = S.incomeUAHBetween(ms, me);
      if (sum.partial) chartPartial = true;
      if (chartCur === 'UAH') return sum.uah;
      var rate = RT.get(chartCur);
      return rate ? sum.uah / rate : 0;
    }

    var months = [];
    for (var i = 5; i >= 0; i--) {
      var ms = new Date(today.getFullYear(), today.getMonth() - i, 1);
      var me = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      months.push({ label: U.MONTHS_NOM[ms.getMonth()].slice(0, 3), value: monthValue(ms, me) });
    }
    var maxM = Math.max(1, Math.max.apply(null, months.map(function (m) { return m.value; })));
    var chart = months.map(function (m, idx) {
      var isCur = idx === months.length - 1;
      /* Раніше великі суми скорочувалися до «14к». Для питання «скільки я
         заробив» це та сама неповна цифра: округлення до тисяч ховає рівно
         те, за чим сюди дивляться. Показуємо число повністю, з пробілом між
         тисячами — воно вміщається. */
      var cap = !m.value ? '' : U.esc(Math.round(m.value).toLocaleString('uk-UA').replace(/[   ]/g, ' '));
      /* Місяць без доходу малювався такою ж смужкою, як і місяць з дрібною
         сумою, — виходило «щось було», хоча не було нічого. Порожній місяць
         тепер ледь помітна риска, і сплутати їх не можна. */
      var empty = !m.value;
      return '<div class="chart__col">' +
        '<div class="chart__top">' + cap + '</div>' +
        '<div class="chart__bar" style="height:' + (empty ? 3 : Math.max(6, (m.value / maxM) * 100)) + '%' +
        (empty ? ';background:var(--line)' : (isCur ? '' : ';background:linear-gradient(180deg,#9CC0FF,#6E9DFF)')) + '"></div>' +
        '<div class="chart__cap"' + (empty ? ' style="color:var(--muted-2)"' : '') + '>' + m.label + '</div></div>';
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
      actions: [
        { label: 'Вивантажити', icon: 'download', act: 'pay-export' },
        { label: 'Записати оплату', icon: 'plus', act: 'pay-add', solid: true }
      ]
    }) +

    '<div class="page">' +
      curChips +
      totalIncomeCard(mStart, mEnd, pStart, pEnd) +
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

      financePies(mStart, mEnd, code) +

      '<div class="grid grid--main mb-3">' +
        '<div class="card">' +
          '<div class="card-head"><div><h3 class="card-title">Дохід за півроку</h3>' +
          /* Валюту треба назвати. Стовпчики рахують лише вибрану, і без
             підпису «281» під карткою, де написано «$321», читається як
             розбіжність, хоча це просто різні речі: тут долари, там усе
             разом за курсом. */
          '<div class="card-sub">' +
          (chartCur
            ? 'усі валюти разом за курсом свого місяця, ' + U.esc(inWords(chartCur).toLowerCase())
            : 'сума отриманих оплат по місяцях, ' + U.esc(inWords(code).toLowerCase())) +
          '</div></div></div>' +
          '<div class="chart">' + chart + '</div>' +
          (chartPartial
            ? '<div class="field__hint mt-2">Для якоїсь із валют немає курсу — ці оплати ' +
              'у стовпчики не входять. Курс можна вписати вручну в Налаштуваннях.</div>'
            : '') +
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
              '<div style="flex:1;min-width:0"><div style="font-weight:650;font-size:14px">' +
              U.esc(x.s.name) +
              (x.s.archived ? ' <span class="badge badge--grey">в архіві</span>' : '') + '</div>' +
              '<div class="small muted">' + U.pl(Math.ceil(-x.b / (x.s.price || 1)),
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

  /* ============================================================
     Моє: власна математика
     ============================================================

     Те, у чому репетитор розбирається сам. Окремо від учнів навмисно:
     інакше власна справа лізла б у розклад, фінанси й портал учня.
     Дошка тут та сама, що й на уроці — з усіма фігурами й побудовами. */

  V.deskCycle = function (id) {
    var order = ['open', 'stuck', 'done'];
    var d = S.get('desk', id);
    if (!d) return;
    var next = order[(order.indexOf(d.status || 'open') + 1) % order.length];
    S.update('desk', id, { status: next });
    U.toast(S.DESK_STATUS[next].label);
    App.render();
  };

  /* ============================================================
     Аркуш теорії
     ============================================================

     Окремий екран, а не вікно поверх списку. Аркуш читають: із нього
     згадують правило посеред уроку, його показують учневі, його друкують.
     Вікно для цього затісне, і його не надрукуєш. */

  V.sheet = function (id, query) {
    /* Усі аркуші разом — це довідник, а не двадцять окремих сторінок. Тому
       ліворуч завжди повний перелік тем, і перемикання між ними не веде
       назад у бібліотеку: посеред уроку згадують не «де лежав аркуш», а
       «де там про логарифми». */
    var all = S.db().materials.filter(function (m) { return m.type === 'theory'; });

    if (!all.length) {
      return '<div class="page"><div class="card">' +
        C.empty('book', 'Довідника ще немає',
          'Він заводиться одним натисканням: теми, розділи, формули, приклади.',
          '<button class="btn btn--primary" data-act="mat-add-theory">' +
          icon('book', 16) + 'Завантажити довідник</button>') +
        '</div></div>';
    }

    var m = (id && S.get('materials', id)) || all[0];
    if (m.type !== 'theory') m = all[0];

    /* Пошук по всьому довіднику, а не по відкритій темі.

       Посеред уроку потрібне не «гортати двадцять одну тему», а «де там
       різниця квадратів». Тому шукаємо в назвах розділів, підписах,
       поясненнях і в самому записі формули: «a^2 - b^2» знаходиться так
       само, як і «difference of squares». */
    var q = String((query && query.q) || '').trim();
    var ql = q.toLowerCase();

    var found = [];
    if (ql.length > 1) {
      all.forEach(function (sh) {
        (sh.rules || []).forEach(function (r) {
          var hay = [r.group, r.title, r.note, r.formula, r.example, sh.title]
            .join(' ').toLowerCase();
          if (hay.indexOf(ql) >= 0) found.push({ sheet: sh, rule: r });
        });
      });
    }

    /* Однакові назви позначаємо. Тема-близнюк у переліку — це майже завжди
       залишок: щось завели двічі, потім правили лише одну копію, а друга
       так і лежить і збиває з пантелику. Мовчки прибирати не можна — раптом
       вони різні всередині, — але сказати про це варто. */
    var seen = {};
    all.forEach(function (x) {
      var k = (x.title || '').toLowerCase().trim();
      seen[k] = (seen[k] || 0) + 1;
    });

    var nav = all.map(function (x, n) {
      var dup = seen[(x.title || '').toLowerCase().trim()] > 1;
      return '<button class="ref__t' + (x.id === m.id ? ' is-on' : '') +
        '" data-act="sheet-open" data-arg="' + x.id + '"' +
        (dup ? ' title="Така сама назва є ще в іншої теми"' : '') + '>' +
        '<span class="ref__n">' + (n + 1) + '.</span>' +
        '<span class="truncate">' + U.esc(x.title || 'Без назви') + '</span>' +
        (dup ? '<span class="ref__dup" title="Повтор назви">2</span>' : '') +
        icon('chevronR', 14) + '</button>';
    }).join('');

    var dupNow = seen[(m.title || '').toLowerCase().trim()] > 1;

    /* Готовий довідник поповнюється з оновленнями програми, а бібліотека —
       ні: вона ваша, і мовчки дописувати в неї не можна. Але й мовчати теж
       не можна. Раніше про нову тему дізнавалися, лише повторно натиснувши
       «Завантажити довідник», — тобто випадково. */
    var missing = (window.SHEETS_DATA || []).filter(function (sh) {
      return !seen[(sh.title || '').toLowerCase().trim()];
    });

    /* Тема могла не зʼявитися, а доповнитися: у готовому довіднику додалися
       схеми графіків, а копія в бібліотеці лишилась як була. Порівнюємо за
       кількістю блоків — цього досить, щоб помітити поповнення, і при цьому
       не чіпаємо теми, які ви правили самі під себе. */
    var builtin = {};
    (window.SHEETS_DATA || []).forEach(function (sh) {
      builtin[(sh.title || '').toLowerCase().trim()] = sh;
    });

    var fresh = builtin[(m.title || '').toLowerCase().trim()];
    var canRefresh = !!(fresh && (fresh.rules || []).length > (m.rules || []).length);

    var grown = all.filter(function (x) {
      var b = builtin[(x.title || '').toLowerCase().trim()];
      return b && (b.rules || []).length > (x.rules || []).length;
    });

    var rules = m.rules || [];

    /* Правила згруповані так само, як їх і читають: «Властивості степеня»,
       «Особливі випадки». Група — картка з шапкою, всередині блоки.
       Порядок груп той, у якому їх вписали: теорію викладають послідовно. */
    var groups = [];
    var byName = {};
    rules.forEach(function (r) {
      var g = r.group || '';
      if (!byName[g]) { byName[g] = { name: g, items: [] }; groups.push(byName[g]); }
      byName[g].items.push(r);
    });

    function fx(v) { return window.MathFmt ? MathFmt.render(v) : ''; }

    function block(r) {
      var k = r.kind || 'rule';

      /* Пари — рядок таблиці: похідна, первісна, період. Ліворуч те, що
         шукають, праворуч відповідь. */
      if (k === 'pair') {
        return '<div class="blk-pair"><div>' + fx(r.formula) + '</div>' +
               '<div>' + fx(r.example) + '</div></div>';
      }
      if (k === 'warn') {
        return '<div class="blk-warn">' + icon('alert', 15) +
               '<span>' + U.esc(r.note || '') + '</span></div>';
      }
      /* Довідка — те саме світло-блакитне поле, але без знаку оклику.
         Різниця не косметична: попередження каже «тут помиляються», а
         довідка просто уточнює. Якби вони виглядали однаково, знак оклику
         швидко перестав би щось означати. */
      if (k === 'info') {
        return '<div class="blk-info">' +
               (r.title ? '<b>' + U.esc(r.title) + '</b> — ' : '') +
               U.esc(r.note || '') + '</div>';
      }
      if (k === 'text') {
        return '<div class="blk-text">' + U.esc(r.note || '') + '</div>';
      }
      if (k === 'item') {
        return '<div class="blk-item">' + icon('chevronR', 13) +
               '<span>' + U.esc(r.note || '') + '</span></div>';
      }
      /* Схема графіка. Назва форми лежить у полі формули: там уже є поле,
         і заводити ще одне заради одного слова не варто. */
      if (k === 'plot') {
        var svg = window.MathFmt ? MathFmt.plot((r.formula || '').trim()) : '';
        if (!svg) return '';
        return '<div class="blk-plot">' + svg +
               (r.note ? '<div class="blk-plot__c">' + U.esc(r.note) + '</div>' : '') +
               '</div>';
      }

      return (r.title ? '<div class="blk-h">' + U.esc(r.title) + '</div>' : '') +
        (r.note ? '<div class="blk-text">' + U.esc(r.note) + '</div>' : '') +
        (r.formula ? '<div class="blk-f">' + fx(r.formula) + '</div>' : '') +
        (r.example ? '<div class="blk-e">' + fx(r.example) + '</div>' : '');
    }

    var cards = groups.map(function (g) {
      return '<div class="gcard">' +
        (g.name ? '<div class="gcard__h">' + U.esc(g.name) + '</div>' : '') +
        '<div class="gcard__b">' + g.items.map(block).join('') + '</div>' +
        '</div>';
    }).join('');

    return '<div class="ref">' +
      '<div class="ref__bar">' +
        '<div class="ref__title">Довідник</div>' +
        '<div class="ref__count">' + U.pl(all.length, 'тема', 'теми', 'тем') + '</div>' +
        '<input class="ref__q" data-ref-q type="search" placeholder="Знайти правило…" ' +
          'value="' + U.esc(q) + '" autocomplete="off">' +
        '<button class="btn btn--ghost btn--sm" data-act="sheet-print">' +
          icon('download', 15) + 'Друк</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="mat-edit" data-arg="' + m.id + '">' +
          icon('edit', 15) + 'Редагувати</button>' +
        (canRefresh
          ? '<button class="btn btn--ghost btn--sm" data-act="sheet-refresh" data-arg="' + m.id + '">' +
            icon('refresh', 15) + 'Оновити тему</button>'
          : '') +
        '<button class="btn btn--ghost btn--sm" data-act="sheet-del" data-arg="' + m.id + '">' +
          icon('trash', 15) + 'Видалити тему</button>' +
      '</div>' +

      '<div class="ref__body">' +
        '<nav class="ref__nav">' + nav + '</nav>' +
        '<div class="ref__main">' +
          '<div class="ref__h">' +
            (ql.length > 1
              ? U.esc(q) + '<span class="ref__sub">' +
                U.pl(found.length, 'знахідка', 'знахідки', 'знахідок') + '</span>'
              : U.esc(m.title || '') +
                (m.topic ? '<span class="ref__sub">' + U.esc(m.topic) + '</span>' : '')) +
          '</div>' +
          (missing.length
            ? '<div class="ref__new">' +
              '<div style="flex:1;min-width:0">' +
                '<b>' + (missing.length === 1
                  ? 'Нова тема у готовому довіднику'
                  : 'У готовому довіднику ' + U.pl(missing.length, 'нова тема', 'нові теми', 'нових тем')) +
                '</b><br>' +
                U.esc(missing.map(function (x) { return x.title; }).join(', ')) +
              '</div>' +
              '<button class="btn btn--primary btn--sm" data-act="mat-add-theory">' +
              icon('plus', 15) + 'Додати</button>' +
              '</div>'
            : '') +

          (grown.length
            ? '<div class="ref__new">' +
              '<div style="flex:1;min-width:0">' +
                '<b>' + U.pl(grown.length, 'тема доповнилась', 'теми доповнились', 'тем доповнились') +
                ' у готовому довіднику</b><br>' +
                U.esc(grown.map(function (x) { return x.title; }).slice(0, 6).join(', ')) +
                (grown.length > 6 ? ' та інші' : '') +
              '</div>' +
              '<button class="btn btn--primary btn--sm" data-act="sheets-refresh-all">' +
              icon('refresh', 15) + 'Оновити всі</button>' +
              '</div>'
            : '') +
          (dupNow
            ? '<div class="blk-warn mb-3">' + icon('alert', 15) +
              '<span>Тема з такою назвою є ще раз. Порівняйте їх і зайву приберіть — ' +
              'кнопка «Видалити тему» вгорі.</span></div>'
            : '') +
          (m.note ? '<div class="blk-text mb-3">' + U.esc(m.note) + '</div>' : '') +
          (ql.length > 1
            ? (found.length
                ? '<div class="sheet">' +
                  found.slice(0, 60).map(function (x) {
                    return '<div class="gcard">' +
                      '<button class="gcard__h gcard__h--go" data-act="sheet-open" data-arg="' +
                        x.sheet.id + '">' + U.esc(x.sheet.title) +
                        '<span class="gcard__grp">' + U.esc(x.rule.group || '') + '</span></button>' +
                      '<div class="gcard__b">' + block(x.rule) + '</div>' +
                      '</div>';
                  }).join('') + '</div>' +
                  (found.length > 60
                    ? '<div class="blk-text mt-2">Показано перші 60 із ' + found.length +
                      '. Уточніть запит.</div>' : '')
                : '<div class="card">' + C.empty('search', 'Нічого не знайшлося',
                    'Спробуйте коротший запит — шукається і в тексті, і в самому записі формули.') +
                  '</div>')
            : groups.length
              ? '<div class="sheet">' + cards + '</div>'
              : '<div class="card">' + C.empty('book', 'Правил ще немає',
                  'Відкрийте редагування й додайте перше.') + '</div>') +
        '</div>' +
      '</div>' +
      '</div>';
  };

  V.desk = function (query) {
    var tag = (query && query.tag) || '';
    var all = S.deskItems();
    var list = tag ? all.filter(function (d) { return d.tag === tag; }) : all;

    var tags = [];
    all.forEach(function (d) { if (d.tag && tags.indexOf(d.tag) < 0) tags.push(d.tag); });

    var chips = tags.length
      ? '<div class="row row--wrap mb-3" style="gap:9px">' +
        '<button class="chip' + (tag ? '' : ' is-active') + '" data-act="filter-tag" data-arg="">' +
        'Усі <span style="opacity:.6">' + all.length + '</span></button>' +
        tags.map(function (t) {
          return '<button class="chip' + (tag === t ? ' is-active' : '') +
            '" data-act="filter-tag" data-arg="' + U.esc(t) + '">' + U.esc(t) + '</button>';
        }).join('') + '</div>'
      : '';

    var cards = list.map(function (d) {
      var meta = S.DESK_STATUS[d.status] || S.DESK_STATUS.open;
      var bs = S.boardStats(d.id);
      return '<div class="card desk">' +
        '<div class="row" style="gap:10px;align-items:flex-start">' +
          '<div style="flex:1;min-width:0">' +
            '<div class="desk__t">' + U.esc(d.title || 'Без назви') + '</div>' +
            '<div class="row row--wrap" style="gap:7px;margin-top:7px">' +
              C.badge(meta.label, meta.badge) +
              (d.tag ? '<span class="muted small">' + U.esc(d.tag) + '</span>' : '') +
              (bs && !bs.empty
                ? '<span class="muted small">' + U.pl(bs.slides, 'слайд', 'слайди', 'слайдів') + '</span>'
                : '<span class="muted small">дошка порожня</span>') +
            '</div>' +
          '</div>' +
          '<button class="icon-btn" data-act="desk-status" data-arg="' + d.id + '" ' +
            'title="Змінити стан">' + icon('check', 16) + '</button>' +
          '<button class="icon-btn" data-act="desk-edit" data-arg="' + d.id + '" ' +
            'title="Редагувати">' + icon('edit', 16) + '</button>' +
        '</div>' +
        (d.note ? '<div class="desk__n">' + U.esc(d.note) + '</div>' : '') +

        /* Посилання й файли просто в картці, а не за ще одним натисканням:
           до справи повертаються саме по них — відкрити розділ підручника
           чи перечитати конспект. */
        ((d.links || []).length || (d.files || []).length
          ? '<div class="file-strip mt-2" style="border:0;padding:0">' +
            (d.links || []).map(function (l) {
              return '<a class="file-row" href="' + U.esc(l.url) + '" target="_blank" rel="noopener">' +
                '<span class="file-row__i">' + icon('link', 15) + '</span>' +
                '<span class="file-row__n truncate">' + U.esc(l.title || l.url) + '</span></a>';
            }).join('') +
            (d.files || []).map(function (fl) {
              return '<button class="file-row" data-act="desk-file" data-arg="' + U.esc(fl.key) + '">' +
                '<span class="file-row__i">' + icon('file', 15) + '</span>' +
                '<span class="file-row__n truncate">' + U.esc(fl.name || 'файл') + '</span></button>';
            }).join('') +
            '</div>'
          : '') +

        '<button class="btn btn--soft btn--block mt-2" data-act="desk-open" data-arg="' + d.id + '">' +
          icon('board', 16) + 'Розбиратися на дошці</button>' +
      '</div>';
    }).join('');

    return C.hero({
      short: true,
      title: 'Моє',
      sub: 'математика, у якій розбираюся сам',
      actions: [{ label: 'Нова справа', icon: 'plus', act: 'desk-add', solid: true }]
    }) +

    '<div class="page">' + chips +
      (list.length
        ? '<div class="grid grid--auto">' + cards + '</div>'
        : '<div class="card">' + C.empty('compass', 'Тут порожньо',
            'Місце для власної математики: тема, у якій хочеться розібратися, ' +
            'задача, що не піддалася, ідея для уроку. У кожної справи своя дошка — ' +
            'та сама, що й на уроці, з фігурами й побудовами.',
            '<button class="btn btn--primary" data-act="desk-add">' +
            icon('plus', 16) + 'Створити першу</button>') + '</div>') +
    '</div>';
  };

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

    var typeIcon = { link: 'link', file: 'file', note: 'note', theory: 'book' };
    var typeLabel = { link: 'Посилання', file: 'Файл', note: 'Нотатка', theory: 'Аркуш теорії' };

    function fileSize(n) {
      if (!n) return '';
      return n < 1024 ? n + ' Б'
           : n < 1048576 ? Math.round(n / 1024) + ' КБ'
           : (n / 1048576).toFixed(1) + ' МБ';
    }

    function card(m) {
      var files = m.files || [];
      return '<div class="card" style="display:flex;flex-direction:column;gap:12px">' +
        '<div class="row" style="gap:12px;align-items:flex-start">' +
          '<div class="quick__icon" style="width:38px;height:38px">' + icon(typeIcon[m.type] || 'file', 19) + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:15px;line-height:1.35">' + U.esc(m.title) + '</div>' +
            '<div class="small muted" style="margin-top:3px">' + U.esc(typeLabel[m.type] || '') +
            (files.length ? ' · ' + U.pl(files.length, 'файл', 'файли', 'файлів') : '') + '</div>' +
          '</div>' +
          '<button class="icon-btn" data-act="mat-edit" data-arg="' + m.id + '">' + icon('edit', 16) + '</button>' +
        '</div>' +
        (m.note ? '<div class="small muted pre-wrap" style="line-height:1.55">' + U.esc(m.note) + '</div>' : '') +
        (files.length
          ? '<div class="file-list">' + files.map(function (f) {
              return '<button class="file-row" data-act="mat-file" data-arg="' + U.esc(f.key) + '">' +
                '<span class="file-row__i">' + icon('file', 15) + '</span>' +
                '<span class="file-row__n">' + U.esc(f.name || 'файл') + '</span>' +
                '<span class="small muted spacer">' + fileSize(f.size) + '</span>' +
                '<span class="file-row__d">' + icon('download', 15) + '</span>' +
              '</button>';
            }).join('') + '</div>'
          : '') +
        /* Аркуш показуємо не списком назв, а тим, заради чого його й
           заводили, — самими формулами. Три перші вистачає, щоб упізнати. */
        (m.type === 'theory' && (m.rules || []).length
          ? '<div class="mat-peek">' +
            (m.rules || []).slice(0, 3).map(function (r) {
              return '<div class="mat-peek__r">' + (window.MathFmt ? MathFmt.render(r.formula) : '') + '</div>';
            }).join('') +
            ((m.rules || []).length > 3
              ? '<div class="small muted">і ще ' + ((m.rules || []).length - 3) + '</div>' : '') +
            '</div>' +
            '<button class="btn btn--soft btn--sm" data-act="sheet-open" data-arg="' + m.id + '" ' +
            'style="align-self:flex-start">' + icon('board', 15) + 'Відкрити аркуш</button>'
          : '') +

        (m.url ? '<a class="btn btn--soft btn--sm" href="' + U.esc(m.url) + '" target="_blank" rel="noopener" ' +
          'style="align-self:flex-start">' + icon('link', 15) + 'Відкрити</a>' : '') +
        '</div>';
    }

    /* Групуємо за підтемами: бібліотека швидко росте, і суцільна сітка
       перестає читатися вже на двох десятках карток. */
    var groups = [];
    list.forEach(function (m) {
      var t = m.topic || 'Загальне';
      var g = groups.filter(function (x) { return x.topic === t; })[0];
      if (!g) { g = { topic: t, items: [] }; groups.push(g); }
      g.items.push(m);
    });
    groups.sort(function (a, b) { return a.topic.localeCompare(b.topic, 'uk'); });

    var cards = list.length
      ? groups.map(function (g) {
          return '<div class="mat-group">' +
            '<div class="mat-group__h">' + U.esc(g.topic) +
            '<span class="mat-group__n">' + g.items.length + '</span></div>' +
            '<div class="grid grid--auto">' + g.items.map(card).join('') + '</div>' +
          '</div>';
        }).join('')
      : C.empty('folder', 'Бібліотека порожня',
          'Складіть сюди посилання, файли й методичні нотатки, щоб не шукати їх щоразу.',
          '<button class="btn btn--primary" data-act="mat-add">' + icon('plus', 16) + 'Додати матеріал</button>');

    return C.hero({
      short: true,
      title: 'Матеріали',
      sub: U.pl(all.length, 'матеріал', 'матеріали', 'матеріалів') + ' у бібліотеці',
      actions: [
        { label: 'Завантажити довідник', icon: 'book', act: 'mat-add-theory' },
        { label: 'Додати матеріал', icon: 'plus', act: 'mat-add', solid: true }
      ]
    }) +

    '<div class="page">' +
      '<div class="row row--wrap mb-3" style="gap:9px">' + chips + '</div>' +
      cards +
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

    /* Свідомо мінімально. Синхронізація має бути невидимою: людина вносить дані
       й працює, а не натискає кнопки й читає списки версій. Тому на видноті —
       один рядок стану. Усе службове (історія, копії, вихід) складено в
       «Подробиці» й потрібне лише коли щось пішло не так. */
    return '<div class="card">' + head +
      '<div class="row" style="gap:8px" data-sync-state>' + V.syncStatusHtml() + '</div>' +
      '<div class="field__hint">' + U.esc(st.email || '') + ' · зберігається саме, ' +
      'нічого натискати не треба</div>' +

      /* Рядок про захист бази. Потрібен тому, що захист ставиться вручну
         одним запуском файлу в Supabase, і без такого рядка дізнатися,
         чи він стоїть, можна лише читаючи SQL. */
      '<div class="guard" data-guard>' +
        '<span class="guard__dot"></span><span>Перевіряю захист даних…</span>' +
      '</div>' +

      V.syncBackups() +
      '<details class="sync-more mt-2">' +
        '<summary>Подробиці</summary>' +
        '<div class="field__hint mt-2">Дані з усіх пристроїв тримаються однаковими. ' +
        'Якщо змінити щось на двох пристроях одночасно, програма залишить новішу версію ' +
        'і не питатиме — стару збереже в історії.</div>' +
        '<div class="row row--wrap" style="gap:10px;margin-top:10px">' +
          '<button class="btn btn--ghost btn--sm" data-act="sync-now">' + icon('refresh', 15) + 'Оновити зараз</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="sync-signout">Вийти</button>' +
        '</div>' +
        '<div class="mt-2" data-sync-snaps></div>' +
      '</details>' +
      '</div>';
  };

  /* ============================================================
     Чи все ціле
     ============================================================

     Досі про втрату дізнавалися останніми: дошка порожня, учень бачить
     старе, картинка не відкривається — і все це виявлялося випадково, вже
     після того, як сталося. Ця картка збирає такі перевірки в одне місце,
     щоб питання «чи все на місці» мало відповідь до того, як щось зникне,
     а не після. */

  /* ============================================================
     Нагадування в Telegram
     ============================================================

     Картка навмисно нічого не питає й не налаштовує. Створення бота й його
     токен — те, що робиться руками один раз і чого програма не має бачити
     взагалі: токен дає повний доступ до бота, і йому не місце ні в коді,
     ні в браузері. Тут лише видно, чи все живе, і є чим це перевірити. */

  /* ============================================================
     Календар
     ============================================================

     Два різні способи, і плутати їх не можна.

     Підписка — це весь розклад одним посиланням: Google перечитує його сам
     і тримає календар у відповідності. Але перечитує за власним розкладом,
     зазвичай раз на кілька годин, тож щойно створений урок там зʼявиться
     не миттєво.

     Кнопка на уроці — навпаки: відкриває Google із заповненою подією, і
     урок опиняється в календарі за пару секунд, але руками й по одному.

     Тому в картці сказано і про те, і про те: інакше людина чекала б від
     підписки миттєвості, якої там немає. */

  V.calendarCard = function () {
    var on = window.ICS && ICS.enabled && ICS.enabled();
    var url = on ? ICS.url() : '';
    var n = window.ICS ? ICS.count() : 0;

    var body;
    if (!window.Cloud || !Cloud.available() || !Cloud.signedIn()) {
      body = '<div class="field__hint">Спершу потрібна синхронізація: файл календаря ' +
             'лежить на сервері, звідки його читає Google.</div>';
    } else if (!on) {
      body =
        '<div class="field__hint">Один раз додаєте посилання в Google Календар — і ваші ' +
        'уроки зʼявляються там самі. Пізніше його можна відкликати одним натисканням.</div>' +
        '<div class="mt-2"><button class="btn btn--primary btn--sm" data-act="cal-on">' +
        icon('calendar', 15) + 'Увімкнути</button></div>';
    } else {
      body =
        '<div class="guard guard--on"><span class="guard__dot"></span>' +
        '<span>Працює. У файлі ' + U.pl(n, 'урок', 'уроки', 'уроків') +
        ' — від пів року тому до року вперед.</span></div>' +

        '<input class="input mt-2" readonly value="' + U.esc(url) + '" ' +
        'onclick="this.select()" style="font-size:12px">' +

        '<div class="row row--wrap mt-2" style="gap:8px">' +
          '<button class="btn btn--primary btn--sm" data-act="cal-copy">' +
            icon('link', 15) + 'Скопіювати посилання</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="cal-now">' +
            icon('refresh', 15) + 'Оновити зараз</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="cal-off">Вимкнути</button>' +
        '</div>' +

        '<div class="field__hint mt-2">' +
        '<b>Куди вставити:</b> календар Google → ліворуч «Інші календарі» → «+» → ' +
        '«Підписатися за URL‑адресою» → вставити посилання.<br>' +
        'Google перечитує підписки сам, але за власним розкладом — зазвичай раз на ' +
        'кілька годин. Якщо урок має бути в календарі просто зараз, натисніть ' +
        '«У Google Календар» на самому уроці.</div>';
    }

    return '<div class="card mt-3">' +
      '<div class="card-head"><div><h3 class="card-title">Google Календар</h3>' +
      '<div class="card-sub">розклад уроків одним посиланням</div></div></div>' +
      body +
      '</div>';
  };

  V.telegramCard = function () {
    return '<div class="card mt-3">' +
      '<div class="card-head"><div><h3 class="card-title">Нагадування в Telegram</h3>' +
      '<div class="card-sub">про уроки — вам, у ваш чат із ботом</div></div></div>' +
      '<div data-tg class="muted">Перевіряю…</div>' +
      '</div>';
  };

  V.fillTelegramAsync = function () {
    var box = document.querySelector('[data-tg]');
    if (!box) return;

    if (!window.Cloud || !Cloud.available() || !Cloud.signedIn()) {
      box.innerHTML = '<div class="field__hint">Спершу потрібна синхронізація: ' +
        'нагадування шле сервер, а не браузер.</div>';
      return;
    }

    Cloud.request('/rest/v1/rpc/tg_status', { method: 'POST', body: '{}' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (rows) {
        var st = rows && rows[0];
        box.className = '';

        if (!st) {
          /* Різниці між «функції ще немає» і «рядок не заповнено» для людини
             тут немає: обидва означають «ще не під'єднано». */
          box.innerHTML =
            '<div class="guard guard--warn"><span class="guard__dot"></span>' +
            '<span>Ще не підʼєднано. Це робиться один раз і займає хвилин пʼять — ' +
            'скажіть мені, і я дам покроково.</span></div>';
          return;
        }

        box.innerHTML =
          '<div class="guard ' + (st.enabled ? 'guard--on' : 'guard--warn') + '">' +
          '<span class="guard__dot"></span><span>' +
          (st.enabled
            ? 'Працюють. Попередження за ' + U.pl(st.hours_ahead, 'годину', 'години', 'годин') +
              ' до уроку, підсумок дня о ' + st.daily_at + ':00.'
            : 'Підʼєднано, але вимкнено.') +
          '</span></div>' +
          '<div class="field__hint mt-2">Надіслано ' + (st.sent || 0) +
          ', чекає в черзі ' + (st.queued || 0) + '.</div>' +
          '<div class="mt-2"><button class="btn btn--ghost btn--sm" data-act="tg-test">' +
          'Надіслати пробне</button></div>';
      })
      .catch(function () {
        box.className = '';
        box.innerHTML = '<div class="field__hint">Не вдалося спитати сервер про нагадування.</div>';
      });
  };

  V.healthCard = function () {
    return '<div class="card">' +
      '<div class="card-head"><div><h3 class="card-title">Чи все ціле</h3>' +
      '<div class="card-sub">перевірки, які видно з одного погляду</div></div></div>' +
      '<div data-health class="muted">Перевіряю…</div>' +
      '</div>';
  };

  /** Один рядок перевірки з кольоровою позначкою. */
  function healthRow(tone, title, text) {
    return '<div class="guard guard--' + tone + '" style="align-items:flex-start">' +
      '<span class="guard__dot" style="margin-top:6px"></span>' +
      '<span><b>' + U.esc(title) + '</b><br>' + text + '</span></div>';
  }

  /**
   * Яка версія лежить на сервері.
   *
   * Питаємо sw.js і читаємо з нього рядок версії. Запит навмисно повз кеш:
   * інакше відповідь прийшла б із того самого сховища, через яке й виникає
   * проблема, і завжди збігалася б.
   */
  function serverBuild() {
    return fetch('sw.js?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) {
        var m = t.match(/vektor-(v\d+)/);
        return m ? m[1] : null;
      })
      .catch(function () { return null; });
  }

  V.fillHealthAsync = function () {
    var box = document.querySelector('[data-health]');
    if (!box) return;

    var db = S.db();
    var jobs = [
      window.BoardHistory && BoardHistory.available()
        ? BoardHistory.stats() : Promise.resolve(null),
      window.ImgStore && ImgStore.available()
        ? ImgStore.keys() : Promise.resolve(null),
      serverBuild()
    ];

    Promise.all(jobs).then(function (res) {
      var hist = res[0], localKeys = res[1], onServer = res[2];
      var out = '';

      /* Найважливіше — вгору. Якщо сховище не прочиталося, все інше на цій
         панелі не має значення: дані на диску цілі, але програма їх не
         бачить, і будь-який запис зараз їх би добив. */
      var failed = (S.readFailed && S.readFailed()) || {};
      if (failed.doc || failed.boards) {
        out += healthRow('off', failed.doc
            ? 'Збережені дані не прочиталися'
            : 'Дошки не прочиталися',
          'Це <b>не</b> означає, що їх немає: вони лежать на диску такими, ' +
          'якими були, просто програма не змогла їх розібрати. Запис і ' +
          'відправлення на сервер зупинено, щоб не затерти оригінал. ' +
          '<b>Не чистіть дані сайту й не видаляйте нічого.</b> ' +
          'Найшвидший шлях далі — відкрити цей самий кабінет у синхронізації ' +
          'на іншому пристрої, де дані цілі.');
      }

      /* 0. Чи це взагалі свіжий код.

         Сайт оновлюється вручну архівом, тож регулярно виходить так: зміни
         вже на сервері, а сторінка виконує старе — з кеша або тому, що
         архів ще не завантажили. Зовні це не відрізнити від «виправлення
         не працює», і кожен раз з'ясування коштує окремого кола. */
      var here = window.APP_BUILD || '?';
      if (!onServer) {
        out += healthRow('warn', 'Версію перевірити не вдалося',
          'Ця сторінка працює на збірці ' + U.esc(here) + '.');
      } else if (onServer !== here) {
        out += healthRow('off', 'Сторінка працює на старому коді',
          'Тут ' + U.esc(here) + ', а на сервері вже ' + U.esc(onServer) + '. ' +
          'Саме через це нові виправлення можуть не діяти.' +
          '<div class="mt-2"><button class="btn btn--ghost btn--sm" data-act="hard-reload">' +
          'Перезавантажити зі свіжим кодом</button></div>');
      } else {
        out += healthRow('on', 'Свіжа версія програми',
          'Збірка ' + U.esc(here) + ' — така сама, як на сервері.');
      }

      /* 1. Синхронізація. Тут коротко й по суті: подробиці — вище в картці
         синхронізації, сюди людина йде по відповідь «так чи ні». */
      if (!window.Cloud || !Cloud.available()) {
        out += healthRow('warn', 'Синхронізація не налаштована',
          'Дані живуть лише в цьому браузері. Якщо він зникне — зникнуть і вони. ' +
          'Копії в браузері та експорт у файл поки що єдиний захист.');
      } else if (!Cloud.signedIn()) {
        out += healthRow('warn', 'Вихід із синхронізації',
          'Зміни залишаються тут і на сервер не їдуть. Учні свіжого не побачать. ' +
          'Увійдіть у картці синхронізації вище.');
      } else {
        var s = Cloud.status();
        out += healthRow('on', 'Синхронізація працює',
          'Останнє оновлення — ' + (s.lastSync ? U.esc(U.fmtDateTime(s.lastSync)) : 'ще не було') +
          (s.dirty ? '. Є зміни, які зараз відправляються.' : '.'));
      }

      /* 1б. Скільки кого в базі.

         Збоку рахуються лише активні учні, а в копіях і на сервері — усі.
         Через це «7» проти «4» виглядало як пропажа трьох, хоча троє просто
         в архіві. Тут числа стоять поруч і питання не виникає. */
      var all = db.students.length;
      var arch = db.students.filter(function (x) { return x.archived; }).length;
      out += healthRow('on', 'У базі ' + U.pl(all, 'учень', 'учні', 'учнів'),
        (arch ? U.pl(arch, 'з них в архіві', 'з них в архіві', 'з них в архіві') +
                ' — у списку збоку їх немає, але дані й гроші по них цілі. ' : '') +
        U.pl(db.lessons.length, 'урок', 'уроки', 'уроків') + ', ' +
        U.pl(db.payments.length, 'оплата', 'оплати', 'оплат') + ', ' +
        U.pl(db.boards.length, 'дошка', 'дошки', 'дошок') + '.');

      /* 2. Історія дошок — та сама, з якої можна повернути втрачене. */
      var filled = db.boards.filter(function (b) {
        return (b.slides || []).some(function (sl) { return (sl.items || []).length; });
      }).length;

      if (!hist) {
        out += healthRow('warn', 'Історія дошок недоступна',
          'Цей браузер не дає програмі власного сховища. Відкат дошки тут не працюватиме.');
      } else if (!hist.total) {
        out += healthRow('warn', 'Історія дошок поки порожня',
          'Версії зʼявляться, щойно ви відкриєте дошку. ' +
          (filled ? 'Непорожніх дошок зараз ' + filled + '.' : ''));
      } else {
        out += healthRow('on', 'Дошки можна відкотити',
          U.pl(hist.total, 'збережена версія', 'збережені версії', 'збережених версій') +
          ' на ' + U.pl(hist.boards, 'дошці', 'дошках', 'дошках') +
          ' з ' + filled + ' непорожніх. Кнопка «Історія» — на самій дошці.');
      }

      /* 3. Що бачить учень. Найгірша з відомих поломок була саме тут:
         репетитор малює, учень дивиться на старе, і жоден не знає. */
      var shared = db.boards.filter(function (b) { return b.share && b.share.token; });
      var log = V.publishLog ? V.publishLog() : {};
      var bad = shared.filter(function (b) {
        var r = log[b.lessonId];
        return r && !r.ok;
      });

      if (!shared.length) {
        out += healthRow('on', 'Посилань учням не видано',
          'Перевіряти нічого.');
      } else if (bad.length) {
        out += healthRow('off', 'Учень бачить старе: ' +
          U.pl(bad.length, 'урок', 'уроки', 'уроків'),
          bad.map(function (b) {
            var l = S.get('lessons', b.lessonId);
            var st = l ? S.get('students', l.studentId) : null;
            var r = log[b.lessonId];
            return '· ' + U.esc((st ? st.name + ' — ' : '') + (l ? (l.topic || 'урок') : 'урок')) +
              ' <span class="muted">(' + U.esc(r.err || 'не дійшло') + ')</span>';
          }).join('<br>') +
          '<div class="mt-2"><button class="btn btn--primary btn--sm" data-act="fix-publish">' +
          'Надіслати ще раз</button></div>');
      } else {
        out += healthRow('on', 'Уроки в учнів свіжі',
          U.pl(shared.length, 'урок відправлено', 'уроки відправлено', 'уроків відправлено') +
          ' без помилок.');
      }

      /* 4. Картинки. Місцева нестача ще не втрата: якщо синхронізація
         увімкнена, файл приїде з сервера при першому ж відкритті. */
      var used = S.usedImageKeys();
      if (!localKeys) {
        out += healthRow('warn', 'Сховище картинок недоступне',
          'Картинки на дошках у цьому браузері не збережуться.');
      } else {
        var have = {};
        localKeys.forEach(function (k) { have[k] = 1; });
        var absent = used.filter(function (k) { return !have[k]; });

        /* Кнопка тут завжди, а не лише коли чогось бракує. Вона не просто
           рахує: читання картинок перехоплене синхронізацією, тож кожна,
           що є на сервері, дорогою повертається в цей браузер. Це не
           діагностика, це відновлення — і воно має бути під рукою. */
        var fix = '<div class="mt-2"><button class="btn btn--ghost btn--sm" data-act="check-images">' +
          'Перевірити й повернути картинки</button></div>';

        /* Файли, які сервер відмовився прийняти через розмір. Вони працюють
           тут і зараз, але існують в одному примірнику — і це та річ, про
           яку треба знати заздалегідь, а не тоді, коли пристрій зникне. */
        /* Фото учня, які стоять на дошці порожньою рамкою: файл ще не
           доїхав, але адреса при ньому, отже воно повернеться саме при
           наступному відкритті уроку. Мовчати про це не можна — колись саме
           така тиша й ховала зниклі фото. */
        var pend = 0, pendLes = [];
        (S.db().boards || []).forEach(function (b) {
          var n = 0;
          (b.slides || []).forEach(function (sl) {
            (sl.items || []).forEach(function (it) {
              if (it && it.t === 'i' && it.src && it.k) n++;
            });
          });
          if (!n) return;
          pend += n;
          var les = S.get('lessons', b.lessonId);
          pendLes.push(les ? (les.topic || 'урок') : 'дошка');
        });
        if (pend) {
          out += healthRow('warn', U.pl(pend, 'фото учня ще не доїхало',
              'фото учня ще не доїхали', 'фото учня ще не доїхало'),
            'Файл не завантажився, але адреса на нього збережена — ' +
            'фото стане на місце саме, щойно ви відкриєте ' +
            (pendLes.length === 1 ? 'урок «' + U.esc(pendLes[0]) + '»'
                                  : U.pl(pendLes.length, 'урок', 'уроки', 'уроків')) +
            ' за наявності інтернету. Нічого робити не треба.');
        }

        var big = (window.CloudImages && CloudImages.tooBig) ? CloudImages.tooBig() : [];
        if (big.length) {
          var names = [];
          S.db().materials.forEach(function (m) {
            (m.files || []).forEach(function (fl) {
              if (big.indexOf(fl.key) >= 0) names.push(fl.name || 'файл');
            });
          });
          (S.deskItems() || []).forEach(function (d) {
            (d.files || []).forEach(function (fl) {
              if (big.indexOf(fl.key) >= 0) names.push(fl.name || 'файл');
            });
          });

          out += healthRow('warn', U.pl(big.length, 'файл лише на цьому пристрої',
              'файли лише на цьому пристрої', 'файлів лише на цьому пристрої'),
            (names.length ? U.esc(names.slice(0, 5).join(', ')) +
              (names.length > 5 ? ' та інші' : '') + '. ' : '') +
            (big.length === 1
              ? 'Сервер не прийняв його через розмір. На інших пристроях його не буде, ' +
                'і у файл резервної копії воно теж не потрапить. '
              : 'Сервер не прийняв їх через розмір. На інших пристроях їх не буде, ' +
                'і у файл резервної копії вони теж не потраплять. ') +
            'Ліміт піднімається в налаштуваннях сховища Supabase.');
        }

        if (!used.length) {
          out += healthRow('on', 'Картинок ще немає', 'Перевіряти нічого.');
        } else if (!absent.length) {
          out += healthRow('on', 'Усі картинки на місці',
            U.pl(used.length, 'файл', 'файли', 'файлів') + ' у сховищі браузера.' + fix);
        } else {
          out += healthRow('off', 'Частини картинок у цьому браузері немає',
            'Не знайшлося ' + absent.length + ' з ' + used.length + '. ' +
            'Ті, що встигли поїхати на сервер, повернуться самі — натисніть кнопку. ' +
            'Решту доведеться брати з файлу резервної копії: тільки він носить ' +
            'у собі самі картинки.' + fix);
        }
      }

      box.className = '';
      box.innerHTML = out;
    }).catch(function () {
      box.innerHTML = '<div class="field__hint">Перевірку не вдалося виконати.</div>';
    });
  };

  /**
   * Копії в сховищі браузера й стан захисту від видалення.
   *
   * Дописується після рендеру, бо IndexedDB відповідає не миттєво.
   * Показуємо навіть тоді, коли все добре: людина має бачити, що копії
   * взагалі є, — інакше вона про них згадає лише тоді, коли пізно.
   */
  V.fillVaultAsync = function () {
    var box = document.querySelector('[data-vault]');
    if (!box || !window.Vault || !Vault.available()) return;

    function size(n) {
      if (!n) return '0 Б';
      return n < 1024 ? n + ' Б'
           : n < 1048576 ? Math.round(n / 1024) + ' КБ'
           : (n / 1048576).toFixed(1) + ' МБ';
    }

    Promise.all([Vault.persist(), Vault.usage(), Vault.list()]).then(function (res) {
      var p = res[0], use = res[1], list = res[2];

      var state = !p.supported
        ? '<span class="guard__dot"></span>Браузер не вміє закріплювати сховище — покладаємось на копії'
        : p.persisted
          ? '<span class="guard__dot"></span>Сховище закріплене: браузер не зможе стерти дані сайту, ' +
            'навіть коли на диску стане тісно'
          : '<span class="guard__dot"></span><b>Сховище не закріплене.</b> Браузер має право стерти ' +
            'дані сайту під тиском місця. Закріплення дається автоматично, коли сайт додано в закладки ' +
            'або встановлено як застосунок';

      var room = use && use.quota
        ? '<div class="field__hint mt-2">Зайнято ' + size(use.used) +
          ' з доступних ' + size(use.quota) + '.</div>'
        : '';

      var copies = !list.length
        ? '<div class="field__hint mt-2">Копій ще немає — перша зʼявиться завтра при відкритті.</div>'
        : '<div class="field__label" style="margin:10px 0 6px">Копії в цьому браузері · ' + list.length + '</div>' +
          '<div class="snap-list">' +
          list.slice(0, 12).map(function (b) {
            var s = b.sum || {};
            return '<div class="snap-row">' +
              '<span class="small">' + U.esc(U.fmtDateTime(new Date(b.at))) + '</span>' +
              '<span class="small muted">' + (s.lessons || 0) + ' уроків, ' +
              (s.items || 0) + ' на дошках</span>' +
              '<button class="btn btn--ghost btn--sm spacer" data-act="vault-restore" ' +
              'data-arg="' + b.id + '">Повернути</button>' +
            '</div>';
          }).join('') + '</div>' +
          '<div class="field__hint mt-2">Копія відкладається раз на добу при відкритті ' +
          'та перед кожним прийняттям версії з сервера. Тримаються останні тридцять.</div>';

      box.innerHTML = '<div class="guard ' + (p.persisted ? 'guard--on' : 'guard--off') + '">' +
        state + '</div>' + room + copies;
    }).catch(function () { box.remove(); });
  };

  /**
   * Страхові копії, зроблені перед прийняттям серверної версії.
   * Показуємо лише коли вони є — це аварійний вихід, а не щоденний інструмент.
   */
  V.syncBackups = function () {
    if (!window.Cloud || !window.Cloud.backupsWorthShowing) return '';
    // тільки копії, у яких записів більше, ніж зараз — решта лише турбує
    var list = window.Cloud.backupsWorthShowing();
    if (!list.length) return '';
    return '<div class="cal-notice" style="margin:12px 0;display:block">' +
      '<b>Якщо чогось не вистачає — поверніть звідси.</b> Програма взяла новішу версію ' +
      'з іншого пристрою, а те, що було тут, відклала про запас.' +
      '<div class="snap-list" style="margin-top:10px">' +
      list.map(function (b) {
        return '<div class="snap-row">' +
          '<span class="small">' + U.esc(U.fmtDateTime(new Date(b.at))) + '</span>' +
          /* Архівні учні рахуються теж — інакше «7 учнів» у копії проти
             чотирьох на видноті читалося б як пропажа трьох. */
          '<span class="small muted">' + U.pl(b.students, 'учень', 'учні', 'учнів') +
          (b.archived ? ' (' + b.archived + ' в архіві)' : '') +
          ', ' + b.total + ' записів</span>' +
          '<button class="btn btn--ghost btn--sm spacer" data-act="sync-restore-local" ' +
          'data-arg="' + b.i + '">Повернути</button>' +
        '</div>';
      }).join('') +
      '</div></div>';
  };

  /* Захист від затирання даних ставиться вручну — одним запуском файлу
     supabase/schema.sql у Supabase. Питаємо базу, чи він там є, і кажемо
     людською мовою: читати SQL для цього не має бути потрібно. */
  function fillGuard() {
    var el = document.querySelector('[data-guard]');
    if (!el) return;
    if (!syncOn() || !window.Cloud.guardInstalled) { el.remove(); return; }

    window.Cloud.guardInstalled().then(function (state) {
      if (state === 'on') {
        el.className = 'guard guard--on';
        el.innerHTML = '<span class="guard__dot"></span>' +
          '<span>Захист даних увімкнено — пристрій із давніми даними ' +
          'не зможе затерти свіжі</span>';
        return;
      }
      if (state === 'off') {
        el.className = 'guard guard--off';
        el.innerHTML = '<span class="guard__dot"></span>' +
          '<span><b>Захист даних не налаштований.</b> Відкрийте Supabase → SQL Editor, ' +
          'вставте вміст файлу supabase/schema.sql і натисніть Run. ' +
          'Без цього пристрій, який давно не відкривали, може затерти свіжі дані.</span>';
        return;
      }
      el.remove();     // не змогли перевірити — краще нічого, ніж хибна тривога
    });
  }

  /** Історія автоматичних копій — приходить із сервера, тому дописуємо після рендеру. */
  V.fillSyncAsync = function () {
    fillGuard();
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
            /* Копії в браузері й стан закріплення сховища. Тут, а не всередині
               синхронізації: вони працюють і без входу, і саме сюди людина
               йде, коли щось зникло. */
            '<div class="mt-2" data-vault></div>' +
          '</div>' +

          V.healthCard() +
          V.telegramCard() +
          V.calendarCard() +

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

  /* Пошук у довіднику. Запит живе в адресі, а не в змінній: так його можна
     лишити відкритим, перезавантажити сторінку й побачити те саме, а ще
     повернутися до результатів кнопкою «назад». */
  function bindRefSearch() {
    var q = document.querySelector('[data-ref-q]');
    if (!q || !window.App || !App.setQuery) return;

    var timer = null;
    q.addEventListener('input', function () {
      if (timer) clearTimeout(timer);
      // не перемальовуємо на кожну літеру: двадцять одна тема — це відчутно
      timer = setTimeout(function () { App.setQuery({ q: q.value.trim() }); }, 220);
    });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { q.value = ''; App.setQuery({ q: '' }); }
    });

    /* Курсор повертаємо в кінець рядка: перемальовування замінює поле, і без
       цього кожна літера викидала б курсор на початок. */
    if (document.activeElement !== q && q.value) {
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
    }
  }

  /** Спільний хук після кожного рендеру. */
  V.afterRender = function (route) {
    if (route && route.parts && route.parts[0] === 'settings') {
      V.fillSettingsAsync();
      V.fillSyncAsync();
      V.fillVaultAsync();
      V.fillHealthAsync();
      V.fillTelegramAsync();
    }
    bindRefSearch();
    V.hydratePhotos();
    if (V.scrollScheduleToWork) V.scrollScheduleToWork();

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
