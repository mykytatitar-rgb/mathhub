/* Олімпіадні задачі — сторінка банку й картка однієї задачі.

   Банк відкритий і чужий: задачі склали організатори змагань, а зібрані
   вони у відкритих наборах. Тому при кожній задачі стоїть назва змагання,
   а внизу сторінки — звідки все взято й на яких умовах.

   Сторінка нічого не зберігає в базі: фільтри живуть в адресі, а самі
   задачі підвантажуються файлами. Єдине, що звідси потрапляє в роботу, —
   умова, яку репетитор кладе на дошку або в домашнє завдання. */

(function () {
  'use strict';

  var U = window.U, S = window.S, C = window.C, icon = window.icon;
  var V = window.V;
  var MAP = window.MATH_MAP;

  function O() { return window.Olymp; }
  function fmt(t) { return window.MathFmt ? MathFmt.text(t) : U.esc(t); }
  /* Для дошки й буфера — без тегів: там формулу нема кому зверстати. */
  function plain(t) { return window.MathFmt ? MathFmt.plain(t) : String(t || ''); }

  var topicName = {};
  var topicDom = {};
  if (MAP) {
    var secDom = {};
    MAP.sections.forEach(function (s) { secDom[s.id] = s.domain; });
    MAP.topics.forEach(function (t) {
      topicName[t.id] = t.name;
      topicDom[t.id] = secDom[t.section];
    });
  }
  var domColor = {};
  var domName = {};
  if (MAP) MAP.domains.forEach(function (d) { domColor[d.id] = d.color; domName[d.id] = d.name; });

  /* ============================================================
     Сторінка
     ============================================================ */

  var PAGE = 30;                 // скільки задач показуємо за раз
  var shown = PAGE;
  var filters = { q: '', topic: '', level: '', src: '', bank: '' };

  V.olymp = function (query) {
    filters = {
      q: (query && query.q) || '',
      topic: (query && query.topic) || '',
      level: (query && query.level) || '',
      src: (query && query.src) || '',
      bank: (query && query.bank) || ''
    };
    shown = PAGE;

    return C.hero({
      short: true,
      title: 'Олімпіади й задачі',
      sub: 'олімпіадні задачі й задачі з підручників — за темами карти математики'
    }) + '<div class="page"><div class="ol" data-ol>' + loading() + '</div></div>';
  };

  function loading() {
    return '<div class="card"><div class="muted">Завантажую банк задач…</div></div>';
  }

  /** Після рендеру сторінки: підтягнути задачі й намалювати список. */
  V.mountOlymp = function () {
    var root = document.querySelector('[data-ol]');
    if (!root || !O()) return;

    O().all(function (list, bad) {
      var box = document.querySelector('[data-ol]');
      if (!box) return;
      if (!list) {
        box.innerHTML = '<div class="card">' +
          C.empty('alert', 'Банк задач не завантажився',
            'Файли з задачами лежать поруч із програмою. Перевірте звʼязок і оновіть сторінку.') +
          '</div>';
        return;
      }
      draw(box, list, bad);
    });
  };

  function matches(p) {
    if (filters.topic && p.t.indexOf(filters.topic) < 0) return false;
    if (filters.bank && p.bank !== filters.bank) return false;
    /* Рівні в підручнику й на олімпіаді — різні шкали, тому фільтр рівня
       стосується лише олімпіадних задач, а підручникові він не ховає. */
    if (filters.level && p.bank !== 'book' && String(O().level(p).id) !== String(filters.level)) return false;
    if (filters.level && p.bank === 'book') return false;
    if (filters.src && p.s !== filters.src) return false;
    if (filters.q) {
      var q = filters.q.toLowerCase();
      if (p.p.toLowerCase().indexOf(q) < 0 && O().contest(p.s).toLowerCase().indexOf(q) < 0) return false;
    }
    return true;
  }

  function draw(box, all, bad) {
    var list = all.filter(matches);
    var idx = O().index();

    /* Теми в списку — лише ті, де задачі справді є, і назвами з карти.
       Порожній пункт у фільтрі гірший за відсутній: він обіцяє те, чого немає. */
    var topics = Object.keys(idx.topics).filter(function (t) { return topicName[t]; })
      .sort(function (a, b) {
        return (topicDom[a] || '').localeCompare(topicDom[b] || '') ||
          topicName[a].localeCompare(topicName[b], 'uk');
      });

    var srcs = Object.keys(idx.sourceCount).sort(function (a, b) {
      return idx.sourceCount[b] - idx.sourceCount[a];
    });

    /* Олімпіади й підручники — вкладками на видноті, а не пунктом у списку:
       коли «Олімпіади» сховались у фільтр, їх просто загубили. */
    var nBook = all.filter(function (p) { return p.bank === 'book'; }).length;
    var nOlymp = all.length - nBook;
    var tabs =
      '<div class="ol-tabs">' +
        [['', 'Усі задачі', all.length], ['olymp', 'Олімпіадні', nOlymp], ['book', 'З підручників', nBook]]
          .map(function (t) {
            return '<button class="ol-tab' + (filters.bank === t[0] ? ' is-on' : '') + '" ' +
              'data-act="ol-bank" data-arg="' + t[0] + '">' + U.esc(t[1]) +
              '<span>' + t[2] + '</span></button>';
          }).join('') +
      '</div>';

    var head = tabs +
      '<div class="card ol-filters">' +
        '<div class="row row--wrap" style="gap:10px;align-items:flex-end">' +
          '<label class="field" style="flex:1;min-width:220px">' +
            '<span class="field__label">Пошук в умовах</span>' +
            '<input class="input" id="ol-q" placeholder="triangle, prime, ways…" value="' +
              U.esc(filters.q) + '">' +
          '</label>' +
          '<label class="field" style="min-width:230px">' +
            '<span class="field__label">Тема карти</span>' +
            '<select class="input" data-ol-f="topic">' +
              '<option value="">Усі теми</option>' +
              topics.map(function (t) {
                return '<option value="' + U.esc(t) + '"' + (filters.topic === t ? ' selected' : '') + '>' +
                  U.esc(topicName[t]) + ' · ' + idx.topics[t] + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
          '<label class="field" style="min-width:180px">' +
            '<span class="field__label">Рівень</span>' +
            '<select class="input" data-ol-f="level">' +
              '<option value="">Будь-який</option>' +
              O().LEVELS.map(function (l) {
                return '<option value="' + l.id + '"' + (String(filters.level) === String(l.id) ? ' selected' : '') +
                  '>' + U.esc(l.name) + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
          '<label class="field" style="min-width:200px">' +
            '<span class="field__label">Змагання</span>' +
            '<select class="input" data-ol-f="src">' +
              '<option value="">Усі</option>' +
              srcs.map(function (s) {
                return '<option value="' + U.esc(s) + '"' + (filters.src === s ? ' selected' : '') + '>' +
                  U.esc(O().contest(s)) + ' · ' + idx.sourceCount[s] + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
          (filters.q || filters.topic || filters.level || filters.src || filters.bank
            ? '<button class="btn btn--ghost btn--sm" data-act="ol-clear">Скинути</button>' : '') +
        '</div>' +
        '<div class="muted small mt-2">' +
          'Знайдено ' + U.pl(list.length, 'задача', 'задачі', 'задач') +
          ' з ' + all.length +
          (bad ? ' · частина файлів не завантажилась' : '') +
        '</div>' +
      '</div>';

    var body = list.length
      ? list.slice(0, shown).map(card).join('') +
        (list.length > shown
          ? '<div class="row" style="justify-content:center;margin:14px 0">' +
            '<button class="btn btn--soft" data-act="ol-more">Показати ще ' +
            Math.min(PAGE, list.length - shown) + '</button></div>'
          : '')
      : '<div class="card">' + C.empty('search', 'Нічого не знайшлося',
          'Спробуйте прибрати частину фільтрів.') + '</div>';

    box.innerHTML = head + body + credits();
    box.olAll = all;
  }

  /** Звідки задачі. Відкритий набір — це не «нічиє», а чужа праця з ліцензією. */
  function credits() {
    var sets = O().sets();
    var books = O().books();
    var idx = O().index();

    return '<div class="card ol-credits">' +
      '<div class="card-title" style="font-size:14px">Звідки ці задачі</div>' +
      Object.keys(books).map(function (k) {
        var b = books[k];
        return '<div class="muted small">' + U.esc(b.title) +
          (b.year ? ', ' + b.year : '') + ' — задачі переписано для власного викладання, ' +
          'при кожній стоїть параграф і номер.</div>';
      }).join('') +
      Object.keys(sets).map(function (k) {
        var s = sets[k];
        return '<div class="muted small">' + U.esc(s.title) + ' · ліцензія ' + U.esc(s.license) +
          ' · <a href="' + U.esc(s.url) + '" target="_blank" rel="noopener">джерело</a></div>';
      }).join('') +
      '<div class="muted small mt-2">Задачі зі змагань подано мовою оригіналу — здебільшого ' +
      'англійською; підручникові — українською. Автори задач — організатори змагань і ' +
      'автори підручників. Зібрано ' + U.esc(idx.built) + '.</div>' +
      '</div>';
  }

  /* ============================================================
     Картка задачі
     ============================================================ */

  function card(p) {
    var lvl = O().level(p);
    var doms = {};
    p.t.forEach(function (t) { if (topicDom[t]) doms[topicDom[t]] = 1; });
    var color = domColor[Object.keys(doms)[0]] || 'var(--brand-600)';

    return '<div class="card ol-card" data-ol-id="' + U.esc(p.i) + '" style="--c:' + color + '">' +
      '<div class="ol-card__top">' +
        '<span class="ol-lvl ol-lvl--' + lvl.id + '" title="' + U.esc(lvl.hint) + '">' +
          U.esc(lvl.name) + '</span>' +
        '<span class="muted small">' + U.esc(O().where(p)) + '</span>' +
        '<span class="spacer"></span>' +
        '<button class="icon-btn" data-act="ol-copy" data-arg="' + U.esc(p.i) + '" ' +
          'title="Скопіювати умову">' + icon('copy', 16) + '</button>' +
        '<button class="icon-btn" data-act="ol-board" data-arg="' + U.esc(p.i) + '" ' +
          'title="Покласти на дошку уроку">' + icon('present', 16) + '</button>' +
      '</div>' +
      '<div class="ol-card__p">' + fmt(p.p) + '</div>' +
      (p.f ? '<div class="ol-fig">В умові був рисунок — його в наборі немає.</div>' : '') +
      '<div class="ol-card__bot">' +
        p.t.filter(function (t) { return topicName[t]; }).slice(0, 4).map(function (t) {
          return '<button class="chip chip--sm" data-act="ol-topic" data-arg="' + U.esc(t) + '" ' +
            'style="--c:' + (domColor[topicDom[t]] || '') + '">' + U.esc(topicName[t]) + '</button>';
        }).join('') +
        '<span class="spacer"></span>' +
        (p.a ? '<button class="btn btn--ghost btn--sm" data-act="ol-answer" data-arg="' + U.esc(p.i) + '">' +
          'Відповідь</button>' : '') +
        (O().hasSolution(p)
          ? '<button class="btn btn--soft btn--sm" data-act="ol-sol" data-arg="' + U.esc(p.i) + '">' +
            icon('book', 15) + 'Розвʼязання</button>'
          : '') +
      '</div>' +
      '<div class="ol-extra" data-ol-extra hidden></div>' +
      '</div>';
  }

  function cardEl(id) { return document.querySelector('[data-ol-id="' + id + '"]'); }

  /** Відповідь і розв'язання показуємо в самій картці: так видно задачу поруч. */
  function showExtra(id, html) {
    var el = cardEl(id);
    if (!el) return;
    var box = el.querySelector('[data-ol-extra]');
    box.innerHTML = html;
    box.hidden = false;
  }

  /* ============================================================
     Задачі теми — для шухляди карти математики
     ============================================================ */

  /**
   * Список задач однієї теми. Готовий HTML віддаємо зворотним викликом:
   * шухляда карти малюється раніше, ніж приїде файл із задачами.
   */
  V.olympForTopic = function (topicId, limit, cb0) {
    /* Відповідь завжди наступного кроку, навіть коли файли вже в памʼяті:
       шухляда карти саме зараз збирає свій HTML рядком, і відповідь
       усередині цієї збірки не мала б куди лягти. */
    var cb = function (html) { setTimeout(function () { cb0(html); }, 0); };
    if (!O()) { cb(''); return; }
    O().forTopic(topicId, function (list) {
      if (!list || !list.length) { cb(''); return; }
      var take = list.slice(0, limit || 3);
      cb('<div class="mm-olymp">' +
        take.map(function (p) {
          var lvl = O().level(p);
          return '<button class="mm-olymp__p" data-mm="olymp-open" data-arg="' + U.esc(p.i) + '">' +
            '<span class="ol-lvl ol-lvl--' + lvl.id + '">' + U.esc(lvl.name) + '</span>' +
            '<span class="mm-olymp__t">' + fmt(p.p) + '</span>' +
            '</button>';
        }).join('') +
        (list.length > take.length
          ? '<button class="btn btn--ghost btn--sm mt-2" data-act="nav" data-arg="#/olymp?topic=' +
            encodeURIComponent(topicId) + '">Усі ' +
            U.pl(list.length, 'задача', 'задачі', 'задач') + ' цієї теми</button>'
          : '') +
        '</div>');
    });
  };

  /** Одна задача у вікні — відкривається з карти математики. */
  V.olympDialog = function (id) {
    var p = O() && O().get(id);
    if (!p) return;
    var lvl = O().level(p);

    C.modal({
      title: O().where(p),
      sub: lvl.name + ' рівень · ' + lvl.hint,
      body: '<div class="ol-dialog">' +
          '<div class="ol-card__p">' + fmt(p.p) + '</div>' +
          (p.a ? '<div class="ol-answer"><b>Відповідь:</b> ' + fmt(p.a) + '</div>' : '') +
          (O().hasSolution(p)
            ? '<div class="ol-sol" data-ol-dlg-sol><button class="btn btn--soft btn--sm" ' +
              'data-act="ol-sol-dlg" data-arg="' + U.esc(p.i) + '">' +
              icon('book', 15) + 'Показати розвʼязання</button></div>'
            : '') +
        '</div>',
      wide: true
    });
  };

  /* ============================================================
     Дії
     ============================================================ */

  V.olympActions = {
    'ol-more': function () {
      shown += PAGE;
      var box = document.querySelector('[data-ol]');
      if (box && box.olAll) draw(box, box.olAll, 0);
    },

    'ol-clear': function () {
      window.App.setQuery({ q: '', topic: '', level: '', src: '', bank: '' });
    },

    'ol-topic': function (t) { window.App.setQuery({ topic: t }); },

    'ol-bank': function (b) {
      // рівні олімпіад і підручника — різні шкали, тож фільтр рівня скидаємо разом із вкладкою
      window.App.setQuery({ bank: b || '', level: '' });
    },

    'ol-copy': function (id) {
      var p = O().get(id);
      if (!p) return;
      var text = plain(p.p) + (p.a ? '\n\nВідповідь: ' + plain(p.a) : '') +
        '\n\n(' + O().contest(p.s) + ')';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(function () { U.toast('Умову скопійовано', 'ok'); })
          .catch(function () { U.toast('Браузер не дав скопіювати', 'err'); });
      } else {
        U.toast('Цей браузер не вміє копіювати сам', 'err');
      }
    },

    /* Покласти задачу на дошку: найчастіший шлях — знайшов і одразу дав
       учневі. Дошка береться з уроку, який зараз іде, або з найближчого. */
    'ol-board': function (id) {
      var p = O().get(id);
      if (!p) return;
      var lesson = nearestLesson();
      if (!lesson) {
        U.toast('Немає уроку, на дошку якого це покласти', 'err');
        return;
      }
      /* Окремим слайдом, а не поверх чинного: умова — це початок нової
         роботи, і затирати нею те, що вже намальовано, не можна. */
      var board = S.ensureBoard(lesson.id);
      var slide = S.newSlide(O().contest(p.s));
      slide.items = [{
        id: U.uid('it'), t: 'x', c: '#17163A', s: 22, p: [80, 80],
        v: plain(p.p) + (p.a ? '\n\nВідповідь: ' + plain(p.a) : '')
      }];
      board.slides.push(slide);
      S.saveBoard(board);
      var stu = S.get('students', lesson.studentId);
      U.toast('Задача на дошці уроку' + (stu ? ' — ' + stu.name : ''), 'ok');
    },

    'ol-answer': function (id) {
      var p = O().get(id);
      if (p) showExtra(id, '<div class="ol-answer"><b>Відповідь:</b> ' + fmt(p.a) + '</div>');
    },

    'ol-sol': function (id) {
      var p = O().get(id);
      if (!p) return;
      showExtra(id, '<div class="muted small">Завантажую розвʼязання…</div>');
      O().solution(p, function (text) {
        showExtra(id, text
          ? '<div class="ol-sol">' + fmt(text) + '</div>'
          : '<div class="muted small">Розвʼязання до цієї задачі немає.</div>');
      });
    },

    'ol-sol-dlg': function (id) {
      var p = O().get(id);
      var box = document.querySelector('[data-ol-dlg-sol]');
      if (!p || !box) return;
      box.innerHTML = '<div class="muted small">Завантажую розвʼязання…</div>';
      O().solution(p, function (text) {
        box.innerHTML = text ? fmt(text) : '<div class="muted small">Розвʼязання немає.</div>';
      });
    }
  };

  /* ============================================================
     Події сторінки
     ============================================================

     Фільтри живуть в адресі, а не в пам'яті: так відібране можна лишити
     у вкладці, надіслати собі й повернутися до нього завтра. Пошук у
     тексті — навпаки, на місці: перемальовувати сторінку на кожну літеру
     означало б утратити курсор. */

  var qTimer = null;

  document.addEventListener('change', function (e) {
    var sel = e.target.closest && e.target.closest('[data-ol-f]');
    if (!sel || !document.querySelector('[data-ol]')) return;
    var patch = {};
    patch[sel.getAttribute('data-ol-f')] = sel.value;
    window.App.setQuery(patch);
  });

  document.addEventListener('input', function (e) {
    if (e.target.id !== 'ol-q') return;
    var value = e.target.value;
    clearTimeout(qTimer);
    qTimer = setTimeout(function () {
      filters.q = value;
      shown = PAGE;
      var box = document.querySelector('[data-ol]');
      if (box && box.olAll) {
        var all = box.olAll;
        draw(box, all, 0);
        var input = document.getElementById('ol-q');
        if (input) { input.focus(); input.setSelectionRange(value.length, value.length); }
      }
    }, 250);
  });

  /** Урок, на дошку якого класти задачу: той, що йде зараз, інакше найближчий. */
  function nearestLesson() {
    var all = S.db().lessons.filter(function (l) { return l.status !== 'cancelled'; });
    if (!all.length) return null;
    var now = Date.now();
    var sorted = all.slice().sort(function (a, b) {
      return Math.abs(new Date(a.date) - now) - Math.abs(new Date(b.date) - now);
    });
    return sorted[0];
  }
})();
