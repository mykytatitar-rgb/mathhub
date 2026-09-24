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
      var usd = usdRate ? '<span class="cal-dayhead__usd">' +
        (isPlan ? ' · ~' : ' · ≈') + U.money(Math.round(box.uah / usdRate), 'USD') + '</span>' : '';

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

  V.schedule = function (query) {
    var panelHidden = V.panelHidden();
    var view = query.v === 'day' ? 'day' : 'week';
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
    var weekUAH = window.Rates ? window.Rates.sumToUAH(money) : null;

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
        '<div class="seg" style="background:#fff;box-shadow:var(--shadow-sm)">' +
          '<button class="seg__btn' + (view === 'week' ? ' is-active' : '') +
            '" data-act="cal-view" data-arg="week">Тиждень</button>' +
          '<button class="seg__btn' + (view === 'day' ? ' is-active' : '') +
            '" data-act="cal-view" data-arg="day">День</button>' +
        '</div>' +
        '<button class="icon-btn" data-act="cal-nav" data-arg="' + (off - 1) +
          '" aria-label="Назад" title="Назад" style="background:#fff;box-shadow:var(--shadow-sm)">' + icon('chevronL', 18) + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="cal-nav" data-arg="0" style="background:#fff">Сьогодні</button>' +
        '<button class="icon-btn" data-act="cal-nav" data-arg="' + (off + 1) +
          '" aria-label="Вперед" title="Вперед" style="background:#fff;box-shadow:var(--shadow-sm)">' + icon('chevronR', 18) + '</button>' +
        '<div class="spacer row row--wrap" style="gap:8px">' +
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
          '<div class="cal-hint">' + icon('info', 14) +
            ' Клік по вільному місцю — новий урок. Урок можна перетягнути, а за нижній край — змінити тривалість.' +
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
  V.scrollScheduleToWork = function () {
    var body = document.querySelector('.cal-body');
    if (!body || body.dataset.placed) return;
    body.dataset.placed = '1';

    var first = null;
    U.$$('.cal-ev', body).forEach(function (el) {
      var top = parseFloat(el.style.top) || 0;
      if (first == null || top < first) first = top;
    });

    var target = first != null
      ? Math.max(0, first - HOUR_PX / 2)
      : WORK_FROM * HOUR_PX;
    body.scrollTop = target;
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

  document.addEventListener('pointerdown', function (e) {
    var grip = e.target.closest('[data-grip]');
    var ev = e.target.closest('[data-ev]');
    if (!ev) return;
    // кнопки всередині блока працюють самі — не перехоплюємо їх перетягуванням
    if (e.target.closest('[data-act]')) return;
    var lesson = S.get('lessons', ev.dataset.ev);
    if (!lesson) return;

    e.preventDefault();
    var col = ev.closest('.cal-day');
    var from = +col.dataset.from;
    var rect = ev.getBoundingClientRect();

    drag = {
      id: lesson.id,
      el: ev,
      mode: grip ? 'resize' : 'move',
      from: from,
      grabDy: e.clientY - rect.top,
      startH: rect.height,
      moved: false,
      origDay: col.dataset.day,
      origTop: parseFloat(ev.style.top) || 0
    };
    ev.classList.add('is-dragging');
  });

  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    drag.moved = true;

    if (drag.mode === 'resize') {
      var top = drag.el.getBoundingClientRect().top;
      var h = Math.max(HOUR_PX / 4, e.clientY - top);
      // прилипання до 15 хвилин
      var mins = Math.round((h / HOUR_PX * 60) / SNAP_MIN) * SNAP_MIN;
      drag.newDuration = Math.max(SNAP_MIN, mins);
      drag.el.style.height = (drag.newDuration / 60 * HOUR_PX - 2) + 'px';
      return;
    }

    // яка колонка під курсором
    var target = null;
    dayColumns().forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right) target = c;
    });
    if (!target) target = drag.el.closest('.cal-day');

    var tr = target.getBoundingClientRect();
    var y = e.clientY - tr.top - drag.grabDy;
    var mins2 = timeFromY(Math.max(0, y), drag.from);
    drag.newDay = target.dataset.day;
    drag.newMinutes = mins2;

    drag.el.style.top = ((mins2 - drag.from * 60) / 60 * HOUR_PX) + 'px';
    if (target !== drag.el.parentNode) target.appendChild(drag.el);
    var tm = drag.el.querySelector('.cal-ev__time');
    if (tm) tm.textContent = U.pad(Math.floor(mins2 / 60)) + ':' + U.pad(mins2 % 60);
  });

  document.addEventListener('pointerup', function (e) {
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
        S.update('lessons', d.id, { date: newIso });
        U.toast('Перенесено на ' + U.fmtDateTime(newIso), 'ok');
      }
    }
    if (window.App) window.App.refresh();
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
