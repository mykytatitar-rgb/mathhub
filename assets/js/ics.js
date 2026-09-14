/* Календар уроків у форматі, який розуміють усі календарі.

   Навіщо саме так, а не через Google API. Щоб писати в Google Calendar
   напряму, потрібен проєкт у Google Cloud, екран згоди, ключ OAuth і
   зберігання токена з оновленням. Це чужий акаунт і чужі ключі — місце,
   де програмі краще не бувати взагалі.

   Натомість календар віддається файлом .ics. Google, Apple і Outlook уміють
   підписатися на такий файл за адресою й самі перечитують його. Уроки
   зʼявляються в календарі без жодного ключа, а якщо посилання відкликати —
   доступ зникає одним рухом.

   Формат вимогливий до дрібниць: рядки не довші за 75 байтів, коми й крапки
   з комою екрануються, переноси теж. Помилка в будь-чому з цього дає
   «календар не вдалося прочитати» без пояснень, тому все нижче зроблено
   строго за RFC 5545. */

(function () {
  'use strict';

  var U = window.U, S = window.S;
  var I = {};

  /** Час у форматі календаря: 20260817T103000Z. */
  function stamp(d) {
    function two(n) { return (n < 10 ? '0' : '') + n; }
    return d.getUTCFullYear() + two(d.getUTCMonth() + 1) + two(d.getUTCDate()) + 'T' +
           two(d.getUTCHours()) + two(d.getUTCMinutes()) + two(d.getUTCSeconds()) + 'Z';
  }

  /** Кома, крапка з комою й перенос усередині тексту мають бути екрановані. */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /**
   * Довгий рядок ділиться на шматки по 75 байтів, продовження починається
   * з пробілу. Рахуємо саме байти, а не символи: українські літери важать
   * по два, і рядок із назвою теми легко переступає межу непомітно.
   */
  function fold(line) {
    var out = '';
    var chunk = '';
    var bytes = 0;

    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      var w = ch.charCodeAt(0) > 127 ? 2 : 1;
      if (bytes + w > 73) {
        out += (out ? '\r\n ' : '') + chunk;
        chunk = '';
        bytes = 0;
      }
      chunk += ch;
      bytes += w;
    }
    return out + (out ? '\r\n ' : '') + chunk;
  }

  function line(key, value) { return fold(key + ':' + esc(value)); }

  /** Скільки хвилин триває урок. */
  function minutes(l) {
    var d = Number(l && l.duration);
    if (d > 0) return d;
    var t = S.db().tutor || {};
    return Number(t.defaultDuration) > 0 ? Number(t.defaultDuration) : 60;
  }

  /** Одна подія. */
  function event(l, uidHost) {
    var start = new Date(l.date);
    if (isNaN(start.getTime())) return '';
    var end = new Date(start.getTime() + minutes(l) * 60000);

    var st = S.get('students', l.studentId);
    var who = st ? st.name : 'Урок';
    var meet = S.meetUrlFor(l.studentId);

    var desc = [];
    if (l.topic) desc.push(l.topic);
    if (l.price) desc.push('Вартість: ' + U.money(l.price, S.lessonCur(l)));
    if (l.note) desc.push(l.note);

    var out = ['BEGIN:VEVENT'];
    out.push(line('UID', l.id + '@' + uidHost));
    out.push(line('DTSTAMP', stamp(new Date())).replace(/\\/g, ''));
    out.push('DTSTART:' + stamp(start));
    out.push('DTEND:' + stamp(end));
    out.push(line('SUMMARY', who + (l.topic ? ' · ' + l.topic : '')));
    if (desc.length) out.push(line('DESCRIPTION', desc.join('\n')));
    if (meet) out.push(line('LOCATION', meet));

    /* Скасований чи перенесений урок не прибираємо з файлу, а позначаємо
       скасованим: інакше він просто зникне з календаря, і незрозуміло, чи
       його скасували, чи він загубився. */
    out.push('STATUS:' + (l.status === 'cancelled' || l.status === 'moved'
      ? 'CANCELLED' : 'CONFIRMED'));

    out.push('END:VEVENT');
    return out.join('\r\n');
  }

  /* ============================================================
     Постійний розклад — повторюваними подіями
     ============================================================

     Уроки за постійним розкладом створюються на чотири тижні вперед. Якщо
     віддавати календарю тільки їх, далі за обрій він порожній — а розклад
     насправді триває. Тому сам слот їде окремою подією з повторенням, і
     календар показує його безстроково.

     Час у повторюваній події — місцевий, із зазначенням поясу, а не UTC.
     Це не дрібниця: урок о 17:30 за Києвом улітку — це 14:30Z, а взимку
     15:30Z. Щотижневе повторення в UTC зсунулося б на годину в день
     переходу на зимовий час і лишалося б зсунутим півроку. */

  var TZ = 'Europe/Kyiv';

  /* Правила переходу на літній час для цього поясу. Без цього блоку
     календарі або відмовляються читати TZID, або вгадують — і вгадують
     по-різному. */
  var VTIMEZONE = [
    'BEGIN:VTIMEZONE',
    'TZID:' + TZ,
    'BEGIN:STANDARD',
    'DTSTART:19701025T040000',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0200',
    'TZNAME:EET',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T030000',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0300',
    'TZNAME:EEST',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'END:VTIMEZONE'
  ].join('\r\n');

  var BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  /** Місцевий час без «Z» — саме такий вимагає TZID. */
  function localStamp(d) {
    function two(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + two(d.getMonth() + 1) + two(d.getDate()) + 'T' +
           two(d.getHours()) + two(d.getMinutes()) + '00';
  }

  /**
   * Чи цей браузер живе в тому поясі, який ми вміємо описати.
   *
   * Слоти постійного розкладу задані годинником на стіні («17:30»), тобто
   * місцевим часом того, хто їх вводив. Приписати їм чужий пояс означало б
   * зсунути весь розклад. Якщо пояс інший — повторюваних подій просто не
   * буде, а окремі уроки лишаються точними, бо вони в UTC.
   */
  /* Назв у цього поясу кілька. «Europe/Kyiv» — теперішня, «Europe/Kiev» —
     стара, і саме її досі віддає більшість систем; Ужгород і Запоріжжя —
     окремі записи з тими самими правилами. Порівняння з однією назвою
     мовчки вимикало б усе там, де воно найпотрібніше. */
  var TZ_SAME = ['Europe/Kyiv', 'Europe/Kiev', 'Europe/Uzhgorod', 'Europe/Zaporozhye'];

  function tzMatches() {
    try {
      var z = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return TZ_SAME.indexOf(z) >= 0;
    } catch (e) { return false; }
  }

  /** Перше входження слота, починаючи від сьогодні. */
  function firstOccurrence(slot) {
    var base = U.startOfWeek(U.today());
    for (var w = 0; w < 8; w++) {
      var d = U.toDate(U.ymd(U.addDays(base, (w * 7) + slot.day - 1)) + 'T' + slot.time);
      if (!isNaN(d.getTime()) && d >= new Date()) return d;
    }
    return null;
  }

  /** Урок стоїть саме в цьому слоті цього учня. */
  function inSlot(l, slot) {
    var d = new Date(l.date);
    if (isNaN(d.getTime())) return false;
    var wd = ((d.getDay() + 6) % 7) + 1;                 // Пн = 1
    return wd === slot.day && String(l.date).slice(11, 16) === slot.time;
  }

  /**
   * Повторювані події постійного розкладу.
   *
   * Повертає самі події й список уроків, які вони вже покривають, — щоб ті
   * не поїхали ще й окремо й не задвоїлись у календарі.
   */
  function weekly(host) {
    var out = [], covered = {};
    if (!tzMatches()) return { events: out, covered: covered };

    var now = new Date();
    var lessons = S.db().lessons || [];

    S.students().forEach(function (st) {
      (st.schedule || []).forEach(function (slot) {
        if (!(slot.day >= 1 && slot.day <= 7) || !slot.time) return;

        var first = firstOccurrence(slot);
        if (!first) return;

        /* Винятки. Урок, який відрізняється від звичайного — скасований,
           перенесений, із темою чи нотаткою, — має поїхати окремою подією.
           Тоді з повторення його треба виключити, інакше в календарі
           стоятимуть обидва. */
        var ex = [];
        var taken = {};                                  // які входження слота зайняті уроком
        lessons.forEach(function (l) {
          if (l.studentId !== st.id) return;
          var d = new Date(l.date);
          if (isNaN(d.getTime()) || d < now) return;     // минуле лишається як є
          if (!inSlot(l, slot)) return;

          taken[String(l.date).slice(0, 10)] = 1;
          var plain = l.fromTemplate && l.status === 'planned' && !l.topic && !l.note;
          if (plain) covered[l.id] = 1;
          else ex.push(d);
        });

        /* Звільнені місця. Урок перетягнули на інший день чи час або
           видалили — повторення про це не знає й далі ставить урок сюди
           щотижня. Без цього перенесений урок стояв у Google двічі: на
           новому місці й на старому, і старе не зникало ніколи.

           Беремо лише явно записані місця (див. slotGone у сховищі), а не
           вгадуємо з порожнечі: порожньо буває і там, куди уроки просто ще
           не створені. Якщо урок повернули назад, місце знову зайняте — і
           виключати його не можна. */
        (st.slotGone || []).forEach(function (iso) {
          var g = U.toDate(iso);
          if (isNaN(g.getTime()) || g < now) return;
          if (String(iso).slice(11, 16) !== slot.time) return;
          if ((((g.getDay() + 6) % 7) + 1) !== Number(slot.day)) return;
          if (taken[String(iso).slice(0, 10)]) return;      // урок уже повернули на місце
          ex.push(g);
        });

        // той самий момент міг потрапити у винятки двічі — лишаємо один
        var seenEx = {};
        ex = ex.filter(function (d) {
          var k = localStamp(d);
          if (seenEx[k]) return false;
          seenEx[k] = 1;
          return true;
        }).sort(function (a, b) { return a - b; });

        var mins = Number(st.duration) > 0 ? Number(st.duration) : 60;
        var end = new Date(first.getTime() + mins * 60000);
        var meet = S.meetUrlFor(st.id);

        var ev = ['BEGIN:VEVENT'];
        ev.push(line('UID', 'slot-' + st.id + '-' + slot.day + '-' +
                     slot.time.replace(':', '') + '@' + host));
        ev.push('DTSTAMP:' + stamp(new Date()));
        ev.push('DTSTART;TZID=' + TZ + ':' + localStamp(first));
        ev.push('DTEND;TZID=' + TZ + ':' + localStamp(end));
        ev.push('RRULE:FREQ=WEEKLY;BYDAY=' + BYDAY[slot.day - 1]);
        if (ex.length) {
          // коми тут розділяють дати, тож екранувати їх не можна — лише згортаємо
          ev.push(fold('EXDATE;TZID=' + TZ + ':' + ex.map(localStamp).join(',')));
        }
        ev.push(line('SUMMARY', st.name));
        ev.push(line('DESCRIPTION', 'Постійний розклад'));
        if (meet) ev.push(line('LOCATION', meet));
        ev.push('STATUS:CONFIRMED');
        ev.push('END:VEVENT');

        out.push(ev.join('\r\n'));
      });
    });

    return { events: out, covered: covered };
  }

  /**
   * Увесь календар.
   *
   * Беремо уроки за півроку назад і рік уперед: минулі потрібні, щоб історія
   * була на місці, а надто давні лише роздувають файл, який перечитується
   * цілком щоразу.
   */
  I.build = function () {
    var host = 'vektor.local';
    try { host = location.hostname || host; } catch (e) {}

    var from = new Date(); from.setMonth(from.getMonth() - 6);
    var to = new Date();   to.setFullYear(to.getFullYear() + 1);

    var rep = weekly(host);

    var events = (S.db().lessons || []).filter(function (l) {
      if (rep.covered[l.id]) return false;        // уже покрито повторюваною подією
      var d = new Date(l.date);
      return !isNaN(d.getTime()) && d >= from && d <= to;
    }).map(function (l) { return event(l, host); }).filter(Boolean);

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Vektor//Tutor Schedule//UK',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      line('X-WR-CALNAME', 'Уроки — Вектор'),
      'X-WR-TIMEZONE:' + TZ,
      VTIMEZONE,
      rep.events.join('\r\n'),
      events.join('\r\n'),
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n') + '\r\n';
  };

  /** Скільки уроків потрапляє у файл — для підпису в Налаштуваннях. */
  I.count = function () {
    var t = I.build();
    var all = (t.match(/BEGIN:VEVENT/g) || []).length;
    // саме тижневі: у блоці поясу теж є RRULE, але річні
    var rep = (t.match(/^RRULE:FREQ=WEEKLY/gm) || []).length;
    // повторювані події віднімаємо: це не уроки, а слоти постійного розкладу
    return Math.max(0, all - rep);
  };

  /** Скільки слотів постійного розкладу їде повторюваними подіями. */
  I.slotCount = function () {
    return (I.build().match(/^RRULE:FREQ=WEEKLY/gm) || []).length;
  };

  /**
   * Посилання «додати цей урок» для Google Calendar.
   *
   * Це не підписка, а разова дія: відкриває вікно створення події з уже
   * заповненими полями. Потрібне тоді, коли урок має опинитися в календарі
   * саме зараз, а не коли Google наступного разу перечитає підписку.
   */
  I.googleUrl = function (l) {
    if (!l) return '';
    var start = new Date(l.date);
    if (isNaN(start.getTime())) return '';
    var end = new Date(start.getTime() + minutes(l) * 60000);

    var st = S.get('students', l.studentId);
    var meet = S.meetUrlFor(l.studentId);

    var desc = [];
    if (l.topic) desc.push(l.topic);
    if (l.price) desc.push('Вартість: ' + U.money(l.price, S.lessonCur(l)));

    var q = {
      action: 'TEMPLATE',
      text: (st ? st.name : 'Урок') + (l.topic ? ' · ' + l.topic : ''),
      dates: stamp(start) + '/' + stamp(end),
      details: desc.join('\n'),
      location: meet || '',
      ctz: 'Europe/Kyiv'
    };

    return 'https://calendar.google.com/calendar/render?' +
      Object.keys(q).filter(function (k) { return q[k]; })
        .map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
  };

  /* ============================================================
     Підписка
     ============================================================

     Код підписки лежить у налаштуваннях репетитора, тож живе на всіх його
     пристроях і переживає перевстановлення браузера.

     Файл перевивантажується сам при кожній зміні розкладу — але не одразу:
     створення уроку тягне кілька збережень поспіль, і без паузи ми
     відправляли б той самий файл по три рази.

     Чесно про головне обмеження: Google перечитує підписані календарі за
     власним розкладом, зазвичай раз на кілька годин. Тому для «має бути в
     календарі просто зараз» є окрема кнопка на самому уроці. */

  var PUB_DELAY = 4000;
  var timer = null;
  var lastText = '';

  I.token = function () {
    var t = S.db().tutor || {};
    return t.calToken || '';
  };

  I.url = function () {
    var tok = I.token();
    return tok && window.Cloud && Cloud.calendarUrl ? Cloud.calendarUrl(tok) : '';
  };

  I.enabled = function () { return !!I.token(); };

  function newToken() {
    var bytes = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    var out = '';
    for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
    return out;
  }

  /** Викласти поточний розклад. Однакове двічі не відправляємо. */
  I.publish = function (force) {
    var tok = I.token();
    if (!tok || !window.Cloud || !Cloud.publishCalendar) return Promise.resolve('');

    var text = I.build();

    /* Порівнюємо без DTSTAMP. Він містить час складання файлу, тобто
       змінюється щосекунди — і перевірка «однакове двічі не відправляємо»
       не спрацьовувала жодного разу: календар перевикладався на кожне
       збереження, хоч у розкладі нічого не змінилося. */
    var same = text.replace(/^DTSTAMP:.*$/gm, '');
    if (!force && same === lastText) return Promise.resolve(I.url());

    return Cloud.publishCalendar(tok, text).then(function (url) {
      lastText = same;
      return url;
    });
  };

  I.enable = function () {
    var t = S.db().tutor || {};
    if (!t.calToken) {
      t.calToken = newToken();
      S.save();
    }
    return I.publish(true);
  };

  I.disable = function () {
    var tok = I.token();
    var t = S.db().tutor || {};
    delete t.calToken;
    S.save();
    lastText = '';
    return window.Cloud && Cloud.revokeCalendar ? Cloud.revokeCalendar(tok) : Promise.resolve(true);
  };

  /** Стежити за розкладом і перевикладати файл. */
  I.watch = function () {
    if (!S.onSave) return;
    S.onSave(function () {
      if (!I.enabled()) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        I.publish().catch(function (e) {
          console.warn('Календар не оновився:', e && e.message);
        });
      }, PUB_DELAY);
    });
  };

  window.ICS = I;
})();
