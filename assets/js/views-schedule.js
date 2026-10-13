/* Розклад: сітка з годинами як у Google Calendar + бічна панель
   із найближчими уроками й шаблоном тижня, як у Preply. */
(function () {
  'use strict';

  var U = window.U, S = window.S, C = window.C, icon = window.icon;
  var V = window.V;

  var HOUR_PX = 64;          // висота однієї години
  var SNAP_MIN = 15;         // крок прилипання під час перетягування
  /* Повна доба. Раніше сітка починалася о 8:00 і закінчувалася о 21:00, і
     заняття поза цими межами доводилося ловити розтягуванням. Тепер видно
     весь день, а щоб не гортати щоразу з ночі, після відкриття сітка сама
     стає на робочі години — див. scrollToWork(). */
  var DEFAULT_FROM = 0, DEFAULT_TO = 24;

  // куди прокрутити сітку одразу після показу
  var WORK_FROM = 8;

  /* ============================================================
     Дрібні помічники
     ============================================================ */

  function minutesOf(dateStr) {
    var d = U.toDate(dateStr);
    return d.getHours() * 60 + d.getMinutes();
  }

  /** Головний вказівник — палець (телефон, планшет), а не миша. */
  function isTouchy() {
    try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
  }

  function iso(day, minutes) {
    var h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
    return U.ymd(day) + 'T' + U.pad(h) + ':' + U.pad(m);
  }

  /** Проміжок годин, який треба показати: типовий, розширений під уроки. */
  function hourRange(lessons) {
    var from = DEFAULT_FROM, to = DEFAULT_TO;
    lessons.forEach(function (l) {
      var s = minutesOf(l.date) / 60;
      var e = s + (l.duration || 60) / 60;
      from = Math.min(from, Math.floor(s));
      to = Math.max(to, Math.ceil(e));
    });
    return { from: Math.max(0, from), to: Math.min(24, Math.max(to, from + 4)) };
  }

  /**
   * Заробіток за день, зведений у гривні за курсом НБУ.
   * Якщо курсу для якоїсь валюти немає — сума позначається як приблизна,
   * а в підказці видно, чого саме бракує.
   */
  function dayEarnings(lessons) {
    /* Кожен урок рахуємо за курсом СВОГО дня, а не сьогоднішнім.

       Заняття 17 серпня оплатили за курсом 17 серпня. Якщо перераховувати
       його сьогоднішнім, заробіток за минулий тиждень мінятиметься щодня —
       хоча гроші давно отримані й більше не змінюються. */
    var done = { uah: 0, parts: {}, exact: true, missing: [] };
    var plan = { uah: 0, parts: {}, exact: true, missing: [] };

    lessons.forEach(function (l) {
      if (l.status !== 'done' && l.status !== 'planned') return;
      var box = l.status === 'done' ? done : plan;
      var c = S.lessonCur(l);
      var sum = l.price || 0;

      box.parts[c] = (box.parts[c] || 0) + sum;

      var uah = S.uahOf(l, sum, c);
      if (uah == null) {
        box.exact = false;
        if (box.missing.indexOf(c) < 0) box.missing.push(c);
        return;
      }
      box.uah += uah;

      // курс того дня ще не приїхав — рахуємо поточним і чесно позначаємо
      if (!(l.rate > 0) && window.Rates && Rates.isHistoric &&
          !Rates.isHistoric(c, l.date)) box.exact = false;
    });

    var R = window.Rates;

    function block(box, isPlan) {
      if (!U.mapSize(box.parts)) return '';
      var raw = Object.keys(box.parts).filter(function (c) { return Math.abs(box.parts[c]) > 0.005; })
        .map(function (c) { return U.money(box.parts[c], c); }).join(' + ');

      if (!R) {
        return '<div class="cal-dayhead__money' + (isPlan ? ' is-plan' : '') + '">' +
          U.moneyMap(box.parts) + '</div>';
      }

      var txt = U.money(Math.round(box.uah), 'UAH');
      var title = raw + ' · за курсом того дня' +
        (box.missing.length ? ' · немає курсу: ' + box.missing.join(', ') : '');

      /* Та сама сума ще й у доларах — тим самим рядком: половина учнів
         платить у доларах, а зайвий рядок у шапці дня з'їдає висоту сітки. */
      var usdRate = R.get('USD');
      var usd = usdRate ? '<span class="cal-dayhead__usd"><span class="cal-dayhead__sep"> · </span>' +
        (isPlan ? '~' : '≈') + U.money(Math.round(box.uah / usdRate), 'USD') + '</span>' : '';

      return '<div class="cal-dayhead__money' + (isPlan ? ' is-plan' : '') +
        '" title="' + U.esc(title) + '">' +
        (isPlan ? '~' : '') + (box.exact ? '' : '≈') + txt + usd + '</div>';
    }

    var d = block(done, false);
    return d || block(plan, true);
  }

  /** Розкладка подій, що перетинаються за часом, у стовпчики. */
  function layout(lessons) {
    var evs = U.sortBy(lessons, function (l) { return l.date; }).map(function (l) {
      var s = minutesOf(l.date);
      return { l: l, s: s, e: s + (l.duration || 60), col: 0, cols: 1 };
    });
    // групуємо ті, що перекриваються, і роздаємо стовпчики
    var i, j;
    for (i = 0; i < evs.length; i++) {
      var group = [evs[i]];
      var end = evs[i].e;
      for (j = i + 1; j < evs.length && evs[j].s < end; j++) {
        group.push(evs[j]);
        end = Math.max(end, evs[j].e);
      }
      if (group.length > 1) {
        group.forEach(function (g, n) { g.col = n; g.cols = group.length; });
        i = j - 1;
      }
    }
    return evs;
  }

  /** Якщо для якоїсь валюти немає курсу — прямо кажемо це й ведемо в налаштування. */
  function ratesNotice() {
    var R = window.Rates;
    if (!R) return '';
    var missing = S.currenciesInUse().filter(function (c) {
      return c !== 'UAH' && R.get(c) == null;
    });
    if (!missing.length) return '';
    return '<div class="cal-notice">' + icon('alert', 16) +
      '<span>Немає курсу для ' + missing.join(', ') +
      ' — денний заробіток порахований лише частково.</span>' +
      '<button class="btn btn--soft btn--sm" data-act="rates-refresh">Спробувати НБУ</button>' +
      '<button class="btn btn--ghost btn--sm" data-act="nav" data-arg="#/settings">Вказати вручну</button>' +
      '</div>';
  }

  /* ============================================================
     Вигляд
     ============================================================ */

  var PANEL_KEY = 'mathhub.calPanel';

  var MONEY_KEY = 'mathhub.calMoney';

  V.panelHidden = function () {
    try { return localStorage.getItem(PANEL_KEY) === 'hidden'; } catch (e) { return false; }
  };
  V.toggleCalPanel = function () {
    try { localStorage.setItem(PANEL_KEY, V.panelHidden() ? 'shown' : 'hidden'); } catch (e) {}
  };

  /* Заробіток у шапці дня потрібен не завжди: коли дивишся розклад під час
     уроку, суми лише займають висоту. Ховаються одним натисканням. */
  V.moneyHidden = function () {
    try { return localStorage.getItem(MONEY_KEY) === 'hidden'; } catch (e) { return false; }
  };
  V.toggleCalMoney = function () {
    try { localStorage.setItem(MONEY_KEY, V.moneyHidden() ? 'shown' : 'hidden'); } catch (e) {}
  };

  /* ============================================================
     Список — розклад на телефоні, як у Preply
     ============================================================

     Сітка тижня на екрані телефона — сім колонок по пів сантиметра:
     імена обрізані, суми налазять, урок не влучиш пальцем. Тут дні йдуть
     один під одним, урок — картка на всю ширину: хто, коли, скільки й чи
     проведено. Лінія «Зараз» ділить минуле й майбутнє, і список одразу
     відкривається на ній. Торкання картки — урок знизу «шторкою». */

  var AG_BACK = 14;       // днів назад
  var AG_AHEAD = 60;      // днів уперед

  function agCard(l) {
    var st = S.get('students', l.studentId);
    var color = st ? st.color : '#4B3FDB';
    var start = U.toDate(l.date);
    var end = new Date(start.getTime() + (l.duration || 60) * 60000);
    var faded = S.INACTIVE_STATUS.indexOf(l.status) >= 0;
    var cfg = S.LESSON_STATUS[l.status] || S.LESSON_STATUS.planned;

    var mark = '';
    if (l.status === 'done') {
      mark = l.paid
        ? '<span class="ag-mark ag-mark--ok" title="Проведено й оплачено">' + icon('check', 13) + '</span>'
        : '<span class="ag-mark ag-mark--due" title="Проведено, ще не оплачено">' + icon('wallet', 13) + '</span>';
    } else if (l.status === 'missed') {
      mark = '<span class="ag-tag ag-tag--red">' + cfg.label + '</span>';
    } else if (faded) {
      mark = '<span class="ag-tag">' + cfg.label + '</span>';
    } else if (l.paid) {
      mark = '<span class="ag-mark ag-mark--paid" title="Оплачено наперед">' + icon('wallet', 13) + '</span>';
    }

    return '<button class="ag-ev' + (faded ? ' is-faded' : '') + (l.status === 'done' ? ' is-done' : '') +
      '" data-act="lesson-open" data-arg="' + l.id + '" style="--c:' + color + '">' +
      '<span class="ag-ev__main">' +
        '<span class="ag-ev__name">' + U.esc(st ? st.name : '—') + '</span>' +
        '<span class="ag-ev__time">' + U.fmtTime(start) + ' – ' + U.pad(end.getHours()) + ':' + U.pad(end.getMinutes()) +
          (l.topic ? ' · ' + U.esc(l.topic) : '') + '</span>' +
      '</span>' +
      '<span class="ag-ev__side">' +
        '<span class="ag-ev__price">' + U.money(l.price || 0, S.lessonCur(l)) + '</span>' + mark +
      '</span>' +
    '</button>';
  }

  function agendaHtml() {
    var today = U.today();
    var now = Date.now();
    var lessons = S.lessonsBetween(U.addDays(today, -AG_BACK), U.addDays(today, AG_AHEAD));

    var groups = [], byDay = {};
    lessons.forEach(function (l) {
      var key = l.date.slice(0, 10);
      if (!byDay[key]) { byDay[key] = []; groups.push(key); }
      byDay[key].push(l);
    });

    var NOW = '<div class="ag-now" data-ag-now><span>Зараз</span></div>';
    var html = '', month = null, nowDone = false;

    groups.forEach(function (key) {
      var d = U.toDate(key + 'T12:00');
      var m = d.getFullYear() * 12 + d.getMonth();
      if (m !== month) {
        month = m;
        html += '<div class="ag-month">' + U.MONTHS_NOM[d.getMonth()] + ' ' + d.getFullYear() + '</div>';
      }
      var isToday = U.isSameDay(d, today);
      var cards = '';
      byDay[key].forEach(function (l, i) {
        if (!nowDone && U.toDate(l.date).getTime() >= now) {
          nowDone = true;
          // «зараз» посеред сьогоднішніх уроків — усередині дня, інакше — між днями
          if (i > 0) cards += NOW; else html += NOW;
        }
        cards += agCard(l);
      });
      html += '<div class="ag-day' + (isToday ? ' is-today' : '') + '">' +
        '<div class="ag-date"><div class="ag-date__wd">' + U.DAYS_SHORT[d.getDay()] + '</div>' +
        '<div class="ag-date__num">' + d.getDate() + '</div></div>' +
        '<div class="ag-list">' + cards + '</div></div>';
    });
    if (!nowDone) html += NOW;

    if (!groups.length) {
      html = C.empty('calendar', 'Уроків немає', 'Ні за два тижні назад, ні на два місяці вперед.') + NOW;
    }
    return '<div class="ag">' + html + '</div>' +
      '<button class="ag-fab" data-act="lesson-add">' + icon('plus', 18) + 'Урок</button>';
  }

  function viewSwitch(view) {
    return '<div class="seg" style="background:#fff;box-shadow:var(--shadow-sm)">' +
      [['list', 'Список'], ['week', 'Тиждень'], ['day', 'День']].map(function (x) {
        return '<button class="seg__btn' + (view === x[0] ? ' is-active' : '') +
          '" data-act="cal-view" data-arg="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div>';
  }

  /** Вигляд із адреси; на телефоні без явного вибору — список. */
  function pickView(query) {
    if (query.v === 'day' || query.v === 'list' || query.v === 'week') return query.v;
    return window.innerWidth <= 640 ? 'list' : 'week';
  }

  V.schedule = function (query) {
    var panelHidden = V.panelHidden();
    var view = pickView(query);

    if (view === 'list') {
      // «новий урок» — кругла кнопка внизу, під великим пальцем
      return C.hero({ short: true, tight: true, title: 'Розклад', sub: 'усі уроки підряд' }) +
        '<div class="page page--tight">' +
          '<div class="row row--wrap mb-2" style="gap:10px">' + viewSwitch(view) + '</div>' +
          agendaHtml() +
        '</div>';
    }
    var off = parseInt(query.off || '0', 10) || 0;
    var today = U.today();

    var days = [];
    if (view === 'week') {
      var start = U.startOfWeek(U.addDays(today, off * 7));
      for (var i = 0; i < 7; i++) days.push(U.addDays(start, i));
    } else {
      days.push(U.addDays(today, off));
    }

    var lessons = S.lessonsBetween(days[0], days[days.length - 1]);
    var range = hourRange(lessons);
    var gridH = (range.to - range.from) * HOUR_PX;

    /* --- шапка з днями --- */
    var head = days.map(function (d) {
      var isToday = U.isSameDay(d, today);
      var dayL = S.lessonsOnDay(d);
      var n = dayL.filter(function (l) { return S.INACTIVE_STATUS.indexOf(l.status) < 0; }).length;
      var money = dayEarnings(dayL);
      return '<div class="cal-dayhead' + (isToday ? ' is-today' : '') + '">' +
        '<div class="cal-dayhead__wd">' + U.DAYS_SHORT[d.getDay()] + '</div>' +
        '<div class="cal-dayhead__num">' + d.getDate() + '</div>' +
        (n ? '<div class="cal-dayhead__n">' + n + '</div>' : '') +
        money +
        '</div>';
    }).join('');

    /* --- лінійка годин --- */
    var gutter = '';
    for (var h = range.from; h < range.to; h++) {
      gutter += '<div class="cal-hour" style="height:' + HOUR_PX + 'px">' +
        '<span>' + U.pad(h) + ':00</span></div>';
    }

    /* --- стовпчики днів із подіями --- */
    var cols = days.map(function (d) {
      var dayLessons = S.lessonsOnDay(d);
      var evs = layout(dayLessons);
      var blocks = evs.map(function (ev) {
        var st = S.get('students', ev.l.studentId);
        var top = (ev.s - range.from * 60) / 60 * HOUR_PX;
        var hgt = Math.max(20, (ev.e - ev.s) / 60 * HOUR_PX - 2);
        var w = 100 / ev.cols, left = ev.col * w;
        var cfg = S.LESSON_STATUS[ev.l.status] || S.LESSON_STATUS.planned;
        var color = st ? st.color : '#1358F5';
        var faded = S.INACTIVE_STATUS.indexOf(ev.l.status) >= 0;
        return '<div class="cal-ev' + (faded ? ' is-cancelled' : '') +
          (ev.l.status === 'done' ? ' is-done' : '') +
          (ev.l.status === 'moved' ? ' is-moved' : '') +
          '" data-ev="' + ev.l.id + '" style="top:' + top + 'px;height:' + hgt + 'px;' +
          'left:' + left + '%;width:calc(' + w + '% - 3px);' +
          'background:' + color + '14;border-left-color:' + color + '">' +
          '<button class="cal-ev__tick" data-act="lesson-toggle-done" data-arg="' + ev.l.id + '" ' +
            'title="' + (ev.l.status === 'done'
              ? 'Проведено' + (ev.l.paid ? ' й оплачено' : '') + ' — натисніть, щоб скасувати'
              : 'Провести й відмітити оплату') + '">' +
            (ev.l.status === 'done' ? icon('check', 12) : '') + '</button>' +
          '<div class="cal-ev__time">' + U.fmtTime(ev.l.date) + '</div>' +
          '<div class="cal-ev__name">' + U.esc(st ? st.name.split(' ')[0] : '—') + '</div>' +
          (hgt > 54 && ev.l.topic ? '<div class="cal-ev__topic">' + U.esc(ev.l.topic) + '</div>' : '') +
          (faded ? '<div class="cal-ev__badge">' + (S.LESSON_STATUS[ev.l.status] || {}).label + '</div>' : '') +
          '<div class="cal-ev__grip" data-grip="' + ev.l.id + '"></div>' +
          '</div>';
      }).join('');

      // червона лінія «зараз»
      var nowLine = '';
      if (U.isSameDay(d, new Date())) {
        var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        if (nowMin >= range.from * 60 && nowMin <= range.to * 60) {
          nowLine = '<div class="cal-now" style="top:' +
            ((nowMin - range.from * 60) / 60 * HOUR_PX) + 'px"></div>';
        }
      }

      return '<div class="cal-day' + (U.isSameDay(d, today) ? ' is-today' : '') +
        '" data-day="' + U.ymd(d) + '" data-from="' + range.from + '">' +
        nowLine + blocks + '</div>';
    }).join('');

    /* --- бічна панель ---
       Три уроки, не більше: це підказка «що далі», а не другий розклад.
       Довший список тільки дублював сітку поруч і розтягував сторінку. */
    var upcoming = S.upcoming(3);
    var upHtml = upcoming.length ? upcoming.map(function (l) {
      var st = S.get('students', l.studentId);
      var meet = S.meetUrlFor(l.studentId);
      return '<div class="list__item" style="padding:11px 16px">' +
        C.avatar(st, 32) +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:650;font-size:13.5px" class="truncate">' + U.esc(st ? st.name : '—') + '</div>' +
        '<div class="small muted">' + U.fmtRelative(l.date) + ', ' + U.fmtTime(l.date) + '</div></div>' +
        (meet ? '<a class="btn btn--soft btn--sm" href="' + U.esc(meet) + '" target="_blank" rel="noopener">' +
          icon('present', 14) + '</a>' : '') +
        '<button class="icon-btn" data-act="lesson-toggle-done" data-arg="' + l.id + '" ' +
        'title="Провести й відмітити оплату">' + icon('check', 16) + '</button>' +
        '<button class="icon-btn" data-act="lesson-open" data-arg="' + l.id + '" aria-label="Відкрити урок" title="Відкрити урок">' +
        icon('chevronR', 16) + '</button>' +
        '</div>';
    }).join('') : C.empty('calendar', 'Уроків не заплановано', '');

    var doneW = lessons.filter(function (l) { return l.status === 'done'; });
    var planW = lessons.filter(function (l) { return l.status === 'planned'; });
    var money = {};
    doneW.forEach(function (l) {
      var c = S.lessonCur(l);
      money[c] = (money[c] || 0) + (l.price || 0);
    });
    var hours = U.sum(lessons.filter(function (l) { return S.INACTIVE_STATUS.indexOf(l.status) < 0; }),
      function (l) { return (l.duration || 60) / 60; });
    /* За курсом кожного уроку — так само, як шапки днів. Досі тиждень
       рахувався за сьогоднішнім курсом і не дорівнював сумі своїх днів. */
    var weekUAH = null;
    if (window.Rates) {
      weekUAH = { uah: 0, partial: false, missing: [] };
      doneW.forEach(function (l) {
        var c = S.lessonCur(l);
        var v = S.uahOf(l, l.price || 0, c);
        if (v == null) {
          weekUAH.partial = true;
          if (weekUAH.missing.indexOf(c) < 0) weekUAH.missing.push(c);
          return;
        }
        weekUAH.uah += v;
        if (c !== 'UAH' && !(l.rate > 0) && window.Rates.isHistoric && !window.Rates.isHistoric(c, l.date)) weekUAH.partial = true;
      });
    }

    var label = view === 'week'
      ? (off === 0 ? 'Поточний тиждень' : off === 1 ? 'Наступний тиждень' : off === -1 ? 'Минулий тиждень'
         : days[0].getDate() + ' ' + U.MONTHS_GEN[days[0].getMonth()] + ' — ' +
           days[6].getDate() + ' ' + U.MONTHS_GEN[days[6].getMonth()])
      : U.DAYS_FULL[days[0].getDay()] + ', ' + U.fmtDateLong(days[0]);

    return C.hero({
      short: true,
      tight: true,
      title: 'Розклад',
      sub: label,
      actions: [
        { label: 'Створити за шаблоном', icon: 'sparkles', act: 'gen-week' },
        { label: 'Новий урок', icon: 'plus', act: 'lesson-add', solid: true }
      ]
    }) +

    '<div class="page page--tight">' +
      ratesNotice() +
      '<div class="row row--wrap mb-2" style="gap:10px">' +
        viewSwitch(view) +
        '<button class="icon-btn" data-act="cal-nav" data-arg="' + (off - 1) +
          '" aria-label="Назад" title="Назад" style="background:#fff;box-shadow:var(--shadow-sm)">' + icon('chevronL', 18) + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="cal-nav" data-arg="0" style="background:#fff">Сьогодні</button>' +
        '<button class="icon-btn" data-act="cal-nav" data-arg="' + (off + 1) +
          '" aria-label="Вперед" title="Вперед" style="background:#fff;box-shadow:var(--shadow-sm)">' + icon('chevronR', 18) + '</button>' +
        // підсумки тижня й перемикачі панелей — для великого екрана; на телефоні суми вже в шапці днів
        '<div class="spacer row row--wrap cal-stats" style="gap:8px">' +
          C.badge(U.pl(planW.length, 'запланований', 'заплановані', 'запланованих'), '') +
          C.badge(U.pl(doneW.length, 'проведений', 'проведені', 'проведених'), 'badge--green') +
          C.badge(U.num(hours, 1) + ' год', 'badge--grey') +
          (weekUAH && U.mapSize(money)
            ? '<span class="badge badge--green" title="' +
              U.esc(Object.keys(money).map(function (c) { return U.money(money[c], c); }).join(' + ') +
                (weekUAH.partial ? ' · немає курсу: ' + weekUAH.missing.join(', ') : '')) + '">' +
              (weekUAH.partial ? '≈ ' : '') + U.money(Math.round(weekUAH.uah), 'UAH') +
              (window.Rates.get('USD')
                ? ' · ≈' + U.money(Math.round(weekUAH.uah / window.Rates.get('USD')), 'USD') : '') +
              '</span>'
            : C.badge(U.moneyMap(money), 'badge--grey')) +
          '<button class="btn btn--ghost btn--sm" data-act="cal-money" ' +
            'title="' + (V.moneyHidden() ? 'Показати заробіток у шапці днів' : 'Сховати заробіток у шапці днів') + '">' +
            icon(V.moneyHidden() ? 'eyeOff' : 'wallet', 15) +
            (V.moneyHidden() ? 'Суми' : 'Суми') + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="cal-panel" ' +
            'title="Показати або сховати праву панель">' + icon('layers', 15) + 'Панель</button>' +
        '</div>' +
      '</div>' +

      '<div class="cal-layout' + (panelHidden ? ' cal-layout--full' : '') + '">' +
        '<div class="card card--pad0" style="overflow:hidden">' +
          '<div class="cal' + (view === 'day' ? ' cal--day' : '') +
            (V.moneyHidden() ? ' cal--nomoney' : '') + '">' +
            '<div class="cal-head">' +
              '<div class="cal-head__corner"></div>' +
              '<div class="cal-head__days">' + head + '</div>' +
            '</div>' +
            '<div class="cal-body" tabindex="0" aria-label="Розклад">' +
              '<div class="cal-gutter">' + gutter + '</div>' +
              '<div class="cal-days" style="height:' + gridH + 'px;' +
                'background-size:100% ' + HOUR_PX + 'px">' + cols + '</div>' +
            '</div>' +
          '</div>' +
          // пальцем урок не тягнуть, а тримають — і підказка каже саме це
          '<div class="cal-hint">' + icon('info', 14) + (isTouchy()
            ? ' Торкніться вільного місця — новий урок. Потримайте урок, щоб перенести; потримайте нижній край — змінити тривалість.'
            : ' Клік по вільному місцю — новий урок. Урок можна перетягнути, а за нижній край — змінити тривалість.') +
          '</div>' +
        '</div>' +

        (panelHidden ? '' :
        '<div class="stack">' +
          '<div class="card card--pad0">' +
            '<div class="card-head" style="padding:20px 20px 12px;margin:0">' +
              '<div><h2 class="card-title">Найближчі уроки</h2>' +
              '<div class="card-sub">що буде далі</div></div></div>' +
            '<div class="list">' + upHtml + '</div>' +
          '</div>' +

          /* Картки «Шаблон тижня» тут немає навмисно: постійні слоти учня
             належать його картці, де їх і задають. Окремий перелік лише
             показував те саме вдруге й підказував, що розклад мислиться
             тижнями — хоча створювати уроки можна на скільки завгодно
             наперед кнопкою «Створити за шаблоном» угорі. */
        '</div>') +
      '</div>' +
    '</div>';
  };

  /**
   * Сітка показує всю добу, але починати з опівночі безглуздо: там ніколи
   * нічого немає. Тому одразу після показу прокручуємо до найранішого
   * уроку дня, а якщо уроків немає — до звичайних робочих годин.
   *
   * Робимо це лише коли людина ще не гортала сама: інакше кожне
   * перемальовування смикало б сітку назад.
   */
  var agPlacedFor = null;

  /* Де стояла сітка годин. Кожне перемальовування (перенесли урок, приїхали
     зміни, відмітили проведеним) будує сітку наново — і вона відскакувала
     до першого уроку. Особливо прикро після перенесення в пізні години:
     щойно поставив урок на 20:00, а сітка вже показує ранок. Тож на тій
     самій сторінці лишаємо сітку там, де її гортали, — як App.render лишає
     саму сторінку. Порожній тиждень не запамʼятовуємо: поки уроки ще не
     приїхали, сітка стоїть на робочих годинах і має стати на перший урок. */
  var calKeep = null;

  function keepCal(body) {
    if (body.querySelector('.cal-ev')) calKeep = { hash: location.hash, top: body.scrollTop };
  }

  window.addEventListener('hashchange', function () {
    if (!/^#\/schedule/.test(location.hash)) { agPlacedFor = null; calKeep = null; }
  });

  /* Телефон: сітка — на весь екран між шапкою і нижньою панеллю розділів.
     Із висотою «на око» (100vh мінус запас) низ сітки ховався під
     панеллю, і гортати доводилося двічі: спершу сторінку, потім сітку. */
  function fitCalToScreen(body) {
    if (window.innerWidth > 640) { body.style.maxHeight = ''; body.style.minHeight = ''; return; }
    /* Висота екрана без клавіатури й без збільшення двома пальцями. Видима
       висота (visualViewport) меншає, поки відкрита клавіатура: додали урок
       зі шторки, сітка перемалювалась саме тоді — і лишалась куцою, бо коли
       клавіатура ховається, вікно про це не сповіщає. А нижня панель стоїть
       унизу всього екрана, не видимої частини. clientHeight від клавіатури й
       збільшення не залежить, зате в браузері не росте, коли ховається смуга
       адреси, — це вміє innerHeight. Обидва бувають лише меншими за
       справжню висоту, тож беремо більшу. */
    var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    var tabs = document.querySelector('.m-tabs');
    var tabsH = tabs && tabs.offsetHeight ? tabs.offsetHeight : 58;
    var top = body.getBoundingClientRect().top + window.scrollY;
    body.style.maxHeight = Math.max(300, Math.round(vh - tabsH - top - 8)) + 'px';
    // інакше нижня межа з app.css (380 px) перекриває цю й ховає низ сітки під панеллю
    body.style.minHeight = '300px';
  }

  // повернули телефон чи сховалась смуга браузера — висота сітки слідом
  window.addEventListener('resize', function () {
    var body = document.querySelector('.cal-body');
    if (body) fitCalToScreen(body);
  });

  V.scrollScheduleToWork = function () {
    var nowEl = document.querySelector('[data-ag-now]');
    if (nowEl) {
      // перемальовування (приїхали зміни) не смикає список назад;
      // поки база не прочитана й уроків нема — ще не ставимо
      if (agPlacedFor === location.hash) return;
      /* Повернулись «Назад» (урок → дошка → назад): список уже там, де його
         гортали, — не перескакуємо на «Зараз». */
      if (window.App && App.scrollRestored) { agPlacedFor = location.hash; return; }
      if (document.querySelector('.ag-ev')) agPlacedFor = location.hash;
      var y = nowEl.getBoundingClientRect().top + window.scrollY - Math.round(window.innerHeight * 0.3);
      window.scrollTo(0, Math.max(0, y));
      return;
    }
    var body = document.querySelector('.cal-body');
    if (!body || body.dataset.placed) return;
    body.dataset.placed = '1';
    fitCalToScreen(body);
    body.addEventListener('scroll', function () { keepCal(body); }, { passive: true });

    if (calKeep && calKeep.hash === location.hash) {
      body.scrollTop = calKeep.top;
      return;
    }

    var first = null;
    U.$$('.cal-ev', body).forEach(function (el) {
      var top = parseFloat(el.style.top) || 0;
      if (first == null || top < first) first = top;
    });

    var target = first != null
      ? Math.max(0, first - HOUR_PX / 2)
      : WORK_FROM * HOUR_PX;
    body.scrollTop = target;
    keepCal(body);
  };

  /* ============================================================
     Перетягування уроків
     ============================================================ */

  var drag = null;

  function dayColumns() {
    return U.$$('.cal-day');
  }

  function timeFromY(y, from) {
    var mins = from * 60 + (y / HOUR_PX) * 60;
    return Math.round(mins / SNAP_MIN) * SNAP_MIN;
  }

  /** Узяти урок: ev — блок, grip — чи за нижній край (тривалість). */
  function startDrag(ev, grip, clientY) {
    var lesson = S.get('lessons', ev.dataset.ev);
    if (!lesson) return false;
    var col = ev.closest('.cal-day');
    var rect = ev.getBoundingClientRect();
    drag = {
      id: lesson.id,
      el: ev,
      mode: grip ? 'resize' : 'move',
      from: +col.dataset.from,
      grabDy: clientY - rect.top,
      startH: rect.height,
      moved: false,
      origDay: col.dataset.day,
      origTop: parseFloat(ev.style.top) || 0
    };
    ev.classList.add('is-dragging');
    return true;
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;          // палець — окремо, нижче
    var grip = e.target.closest('[data-grip]');
    var ev = e.target.closest('[data-ev]');
    if (!ev) return;
    // кнопки всередині блока працюють самі — не перехоплюємо їх перетягуванням
    if (e.target.closest('[data-act]')) return;
    if (startDrag(ev, grip, e.clientY)) e.preventDefault();
  });

  function moveDrag(clientX, clientY) {
    if (!drag) return;
    drag.moved = true;
    // де палець зараз — з цього місця сітку гортає край (див. autoScrollTick)
    drag.lastX = clientX;
    drag.lastY = clientY;

    if (drag.mode === 'resize') {
      var top = drag.el.getBoundingClientRect().top;
      var h = Math.max(HOUR_PX / 4, clientY - top);
      // прилипання до 15 хвилин; не довше, ніж дозволяє форма уроку
      var mins = Math.round((h / HOUR_PX * 60) / SNAP_MIN) * SNAP_MIN;
      drag.newDuration = Math.min(480, Math.max(SNAP_MIN, mins));
      drag.el.style.height = (drag.newDuration / 60 * HOUR_PX - 2) + 'px';
      return;
    }

    // яка колонка під курсором
    var target = null;
    dayColumns().forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) target = c;
    });
    if (!target) target = drag.el.closest('.cal-day');

    var tr = target.getBoundingClientRect();
    var y = clientY - tr.top - drag.grabDy;
    /* Не нижче за кінець доби: протягнутий за низ сітки урок отримував
       час «24:15» — такої години немає, і урок опинявся вгорі, опівночі. */
    var dayEnd = Math.min(24 * 60, drag.from * 60 + Math.round(target.offsetHeight / HOUR_PX * 60));
    var mins2 = Math.min(dayEnd - SNAP_MIN, timeFromY(Math.max(0, y), drag.from));
    drag.newDay = target.dataset.day;
    drag.newMinutes = mins2;

    drag.el.style.top = ((mins2 - drag.from * 60) / 60 * HOUR_PX) + 'px';
    if (target !== drag.el.parentNode) target.appendChild(drag.el);
    var tm = drag.el.querySelector('.cal-ev__time');
    if (tm) tm.textContent = U.pad(Math.floor(mins2 / 60)) + ':' + U.pad(mins2 % 60);
  }

  // урок, узятий затриманням (drag.touch), веде обробник дотику нижче —
  // перо на планшеті шле і pointer-, і touch-події, двічі вести не треба
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' || (drag && drag.touch)) return;
    moveDrag(e.clientX, e.clientY);
  });

  document.addEventListener('pointerup', function (e) {
    if (e.pointerType === 'touch' || (drag && drag.touch)) return;
    endDrag();
  });

  /* Перо на планшеті без дотикових подій: рух по уроку тут — прокрутка
     (touch-action: pan-y), і браузер, забравши його собі, шле pointercancel
     замість pointerup. Без цього урок лишався «у руці» до наступного
     дотику. Повертаємо його на місце. */
  document.addEventListener('pointercancel', function (e) {
    if (e.pointerType === 'touch' || !drag || drag.touch) return;
    var moved = drag.moved;
    stopAutoScroll();
    drag.el.classList.remove('is-dragging');
    drag = null;
    if (moved && window.App) window.App.refresh();
  });

  /* ---------- Край сітки гортає години ----------

     Сітка показує кілька годин, решта доби — за краєм. Урок у пальці
     інакше не перенести далі видимого: палець зайнятий уроком, гортати
     нічим. Тож поки урок у пальці біля верхнього чи нижнього краю сітки,
     вона гортається сама — що ближче до краю, то швидше, — а урок їде
     разом із нею. Лише для пальця: мишею на компʼютері все як було. */
  var EDGE_PX = 44;          // смуга біля краю, де сітка починає гортатись
  var EDGE_STEP = 14;        // найбільший крок за кадр, px
  var ARM_PX = 12;           // настільки палець має піти до краю, щоб той почав гортати
  var autoRaf = 0;

  /* Смуги краю міряємо по видимій частині сітки, а не по всій її коробці.
     На планшеті низ сітки буває нижче за екран (над нею щось іще, або
     100vh вищий за видиме), а на маленькому телефоні — під нижньою
     панеллю. Тоді й нижня смуга опинялась за екраном, і урок не можна було
     повезти далі видимих годин: сторінку, поки урок у пальці, теж не
     погортаєш. */
  function visibleEdges(body) {
    var b = body.getBoundingClientRect();
    var top = Math.max(b.top, 0), bottom = Math.min(b.bottom, window.innerHeight);
    var cal = body.closest('.cal');
    var head = cal && cal.querySelector('.cal-head');
    var bar = document.querySelector('.m-bar'), tabs = document.querySelector('.m-tabs');
    if (head) top = Math.max(top, head.getBoundingClientRect().bottom);
    if (bar && bar.offsetHeight) top = Math.max(top, bar.getBoundingClientRect().bottom);
    if (tabs && tabs.offsetHeight) bottom = Math.min(bottom, tabs.getBoundingClientRect().top);
    return { top: top, bottom: bottom };
  }

  function autoScrollTick() {
    autoRaf = 0;
    if (!drag || !drag.touch) return;
    /* Розклад перемалювався, поки урок у пальці (приїхали зміни з іншого
       пристрою): блока, який ми тримали, на сторінці вже немає, і дотики до
       нього сюди не доходять. Без цього цикл крутився б до кінця сесії, а
       урок лишався «у руці». Новий розклад і так показує урок на його
       місці — просто відпускаємо. */
    if (!drag.el.isConnected) {
      if (touch) note('розклад перемалювався під пальцем', touch);
      cancelTouch();
      drag = null;
      return;
    }
    var body = drag.lastY != null && drag.el.closest('.cal-body');
    if (body) {
      var b = visibleEdges(body);
      /* Край гортає, лише коли палець повели до нього. Перший урок дня
         стоїть під самим верхом сітки, а обрізаний урок — біля низу, тож
         узятий урок часто вже у смузі краю: від першого ж тремтіння пальця
         сітка їхала сама й несла урок у ніч. */
      var into = 0;                               // наскільки палець заїхав у смугу краю
      if (drag.lastY < b.top + EDGE_PX && drag.lastY < drag.startY - ARM_PX) {
        into = -(b.top + EDGE_PX - drag.lastY);
      } else if (drag.lastY > b.bottom - EDGE_PX && drag.lastY > drag.startY + ARM_PX) {
        into = drag.lastY - (b.bottom - EDGE_PX);
      }
      if (into) {
        var step = Math.max(-EDGE_STEP, Math.min(EDGE_STEP, Math.round(into / EDGE_PX * EDGE_STEP) || (into > 0 ? 1 : -1)));
        var before = body.scrollTop;
        body.scrollTop = before + step;
        // сітка зрушила під нерухомим пальцем — час уроку теж
        if (body.scrollTop !== before) moveDrag(drag.lastX, drag.lastY);
      }
    }
    autoRaf = requestAnimationFrame(autoScrollTick);
  }

  function startAutoScroll() {
    if (!autoRaf && window.requestAnimationFrame) autoRaf = requestAnimationFrame(autoScrollTick);
  }

  function stopAutoScroll() {
    if (autoRaf) cancelAnimationFrame(autoRaf);
    autoRaf = 0;
  }

  function endDrag() {
    stopAutoScroll();
    if (!drag) return;
    var d = drag;
    drag = null;
    d.el.classList.remove('is-dragging');

    if (!d.moved) {
      // це був звичайний клік — відкриваємо урок
      if (window.F) window.F.lessonView(d.id);
      return;
    }

    if (d.mode === 'resize' && d.newDuration) {
      S.update('lessons', d.id, { duration: d.newDuration });
      U.toast('Тривалість: ' + d.newDuration + ' хв', 'ok');
    } else if (d.newDay != null && d.newMinutes != null) {
      var newIso = d.newDay + 'T' + U.pad(Math.floor(d.newMinutes / 60)) + ':' + U.pad(d.newMinutes % 60);
      var lesson = S.get('lessons', d.id);
      if (lesson && lesson.date !== newIso) {
        // те саме, що «Перенести» в картці уроку: інший день — і курс того дня
        S.update('lessons', d.id, window.F && window.F.lessonMovePatch
          ? window.F.lessonMovePatch(lesson, newIso) : { date: newIso });
        U.toast('Перенесено на ' + U.fmtDateTime(newIso), 'ok');
      }
    }
    if (window.App) window.App.refresh();
  }

  /* ---------- Пальцем: телефон і планшет ----------

     Палець, що веде вгору чи вниз, — це прокрутка розкладу, тож урок не
     може братися від першого ж руху (досі браузер забирав цей рух собі, і
     перенести урок пальцем було неможливо). Як у календарі телефона:
       • коротке торкання — відкрити урок;
       • потримати ~0,4 с — урок береться (коротка вібрація), далі їде за
         пальцем, а сторінка не гортається;
       • повели одразу — звичайна прокрутка. */
  var HOLD_MS = 380;
  /* Поріг «повели одразу». Браузер сам починає гортати, щойно палець
     зсунувся десь на 8 px, і після цього сторінку вже не втримати: урок,
     узятий згодом, їхав би разом із сіткою. Тож віддаємо дотик прокрутці
     раніше за браузер. */
  var SLOP = 6;
  var touch = null;

  function cancelTouch() {
    if (touch && touch.timer) clearTimeout(touch.timer);
    touch = null;
  }

  /** Той палець, що торкнувся уроку, серед списку дотиків — урок веде він, а не перший-ліпший. */
  function ownTouch(list) {
    if (!touch || !list) return null;
    for (var i = 0; i < list.length; i++) if (list[i].identifier === touch.id) return list[i];
    return null;
  }

  /** Покласти урок, узятий пальцем, назад на його місце — нічого не зберігаючи. */
  function dropHeld() {
    cancelTouch();
    stopAutoScroll();
    if (drag && drag.touch) {
      drag.el.classList.remove('is-dragging');
      drag = null;
      if (window.App) window.App.refresh();           // повернути блок на місце
    }
  }

  /* Що сталося з дотиком до уроку — у тихий журнал. На справжньому
     телефоні палець поводиться інакше, ніж будь-яка імітація, і без цього
     про збій можна лише здогадуватись. */
  function note(outcome, t) {
    if (!window.Journal) return;
    Journal.add('touch', 'розклад: ' + outcome, {
      held: !!(t && t.held), ms: t ? Date.now() - t.at : null,
      w: window.innerWidth, view: document.querySelector('.cal--day') ? 'день' : 'тиждень'
    });
  }

  document.addEventListener('touchstart', function (e) {
    /* Урок у пальці, а екрана торкнувся ще один палець чи долоня (перо на
       планшеті йде цим самим шляхом). Досі це кидало дотик, а урок лишався
       «у руці»: сітка сама гортала його до ночі, а підняті пальці нічого не
       зберігали. Тепер зайвий дотик не зважаємо — урок веде той палець, що
       його взяв. */
    if (touch && touch.held && ownTouch(e.touches)) return;
    /* Палець, що тримав урок, уже піднявся, а ми цього не почули. Кладемо
       урок на місце — розклад при цьому перемальовується, і те, чого
       торкнулись зараз, уже не на сторінці, тож цей дотик більше нічого
       не робить. */
    if (drag && drag.touch) { dropHeld(); return; }
    if (e.touches.length !== 1) { cancelTouch(); return; }
    var ev = e.target.closest && e.target.closest('[data-ev]');
    if (!ev || e.target.closest('[data-act]')) return;
    /* Перо на планшеті приходить і сюди, і в pointerdown вище, — а там урок
       уже взято одразу. Але на дотиковому екрані рух по уроку — прокрутка,
       тож перо поводиться як палець: торкнутись — відкрити, потримати —
       перенести. Заодно торкання пером не відкриває картку двічі. */
    if (drag && !drag.touch && !drag.moved && isTouchy()) {
      drag.el.classList.remove('is-dragging');
      drag = null;
    }
    var t = e.touches[0];
    touch = {
      id: t.identifier,
      ev: ev,
      grip: e.target.closest('[data-grip]'),
      x: t.clientX, y: t.clientY,
      held: false,
      at: Date.now()
    };
    touch.timer = setTimeout(function () {
      if (!touch) return;
      if (!startDrag(touch.ev, touch.grip, touch.y)) { cancelTouch(); return; }
      touch.held = true;
      drag.touch = true;
      drag.startY = touch.y;                        // звідси міряємо, чи палець пішов до краю
      startAutoScroll();
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (x) { /* не всі вміють */ }
    }, HOLD_MS);
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!touch) return;
    if (touch.held) {
      /* Браузер уже гортає сам (рух не можна скасувати) — сторінку він нам
         не віддасть, і урок їхав би разом із сіткою, не змінюючи часу.
         Чесніше покласти його назад. */
      if (!e.cancelable) { note('браузер уже гортав — урок назад', touch); dropHeld(); return; }
      e.preventDefault();                           // урок у руці — сторінка стоїть
      var own = ownTouch(e.changedTouches);         // рухався інший палець — урок стоїть
      if (own) moveDrag(own.clientX, own.clientY);
      return;
    }
    var t = ownTouch(e.touches);
    if (!t) return;
    if (!e.cancelable || Math.abs(t.clientX - touch.x) > SLOP || Math.abs(t.clientY - touch.y) > SLOP) {
      note('рух одразу — прокрутка', touch);
      cancelTouch();
    }
  }, { passive: false });

  document.addEventListener('touchend', function (e) {
    if (!touch) return;
    if (!ownTouch(e.changedTouches)) {
      // піднявся зайвий палець: урок і далі в руці, а під тим пальцем нічого не натискається
      if (touch.held && e.cancelable) e.preventDefault();
      return;
    }
    var t0 = touch;
    cancelTouch();
    // без цього слідом прийшов би ще й клік — і відкрив би щось удруге
    if (e.cancelable) e.preventDefault();
    if (t0.held) { note(drag && drag.moved ? 'затримання — перенесено' : 'затримання без руху', t0); endDrag(); return; }
    note('торкання — картка уроку', t0);
    if (window.F) window.F.lessonView(t0.ev.dataset.ev);
  }, { passive: false });

  document.addEventListener('touchcancel', function (e) {
    // скасовано лише зайвий дотик (скажімо, долоню відкинуто) — урок тримає свій палець
    if (touch && touch.held && !ownTouch(e.changedTouches)) return;
    if (touch) note('телефон перервав дотик (touchcancel)', touch);
    dropHeld();
  });

  /** Клік по вільному місцю — новий урок у цей час. */
  document.addEventListener('click', function (e) {
    var col = e.target.closest('.cal-day');
    if (!col || e.target.closest('[data-ev]')) return;
    var r = col.getBoundingClientRect();
    var mins = timeFromY(e.clientY - r.top, +col.dataset.from);
    var hh = U.pad(Math.floor(mins / 60)), mm = U.pad(mins % 60);
    if (window.F) window.F.lesson(null, { date: col.dataset.day, time: hh + ':' + mm });
  });

  window.V = V;
})();
