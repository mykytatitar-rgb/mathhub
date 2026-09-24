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
  var KEYS = ['q', 'topic', 'level', 'src', 'bank', 'grade', 'sec', 'ans'];
  var filters = {};

  V.olymp = function (query) {
    filters = {};
    KEYS.forEach(function (k) { filters[k] = (query && query[k]) || ''; });
    /* Тут — лише олімпіади: сторінка про підготовку до змагань. Задачі з
       підручників живуть у «Банку задач» разом з усіма іншими. */
    filters.bank = 'olymp';
    shown = PAGE;

    return C.hero({
      short: true,
      title: 'Олімпіади',
      sub: 'підготовка до змагань: задачі олімпіад за темами карти й етапами — від шкільного до міжнародного'
    }) + '<div class="page"><div class="ol" data-ol>' + loading() + '</div></div>';
  };

  function loading() {
    return '<div class="card"><div class="muted">Завантажую банк задач…</div></div>';
  }

  /** Після рендеру сторінки: підтягнути задачі й намалювати список. */
  V.mountOlymp = function () {
    var root = document.querySelector('[data-ol]');
    if (!root || !O()) return;

    O().ready(function (idx) {
      var box0 = document.querySelector('[data-ol]');
      if (!box0) return;
      if (!idx) { failed(box0); return; }
      /* Кількість у вкладках — із покажчика, а файли вантажимо лише тієї
         вкладки, яка відкрита: підручників понад десять тисяч задач. */
      O().all(function (list, bad) {
        var box = document.querySelector('[data-ol]');
        if (!box) return;
        if (!list) { failed(box); return; }
        draw(box, list, bad);
      }, filters.bank || undefined);
    });
  };

  function failed(box) {
    var why = O().failText();
    box.innerHTML = '<div class="card">' + C.empty('alert', why[0], why[1]) + '</div>';
  }

  function matches(p) {
    if (filters.topic && p.t.indexOf(filters.topic) < 0) return false;
    if (filters.bank && p.bank !== filters.bank) return false;
    /* Рівні в підручнику й на олімпіаді — різні шкали: фільтр рівня
       вкладки підручників стосується лише підручників і навпаки. */
    if (filters.level) {
      if (filters.bank === 'book' ? p.bank !== 'book' : p.bank === 'book') return false;
      if (String(O().level(p).id) !== String(filters.level)) return false;
    }
    if (filters.src && p.s !== filters.src) return false;
    if (filters.grade && String(p.g) !== String(filters.grade)) return false;
    if (filters.sec && p.sec !== filters.sec) return false;
    if (filters.ans && !p.a) return false;
    if (filters.q) {
      var hay = O().haystack(p);
      var words = O().fold(filters.q).trim().split(' ');
      for (var i = 0; i < words.length; i++) {
        if (words[i] && hay.indexOf(words[i]) < 0) return false;
      }
    }
    return true;
  }

  function select(key, label, options, width) {
    return '<label class="field" style="min-width:' + (width || 180) + 'px;flex:1">' +
      '<span class="field__label">' + U.esc(label) + '</span>' +
      '<select class="input" data-ol-f="' + key + '">' +
        options.map(function (o) {
          return '<option value="' + U.esc(o[0]) + '"' + (String(filters[key]) === String(o[0]) ? ' selected' : '') + '>' +
            U.esc(o[1]) + '</option>';
        }).join('') +
      '</select>' +
    '</label>';
  }

  function draw(box, all, bad) {
    var list = all.filter(matches);
    var idx = O().index();
    var isBook = filters.bank === 'book';
    var isOlymp = filters.bank === 'olymp';

    /* Теми в списку — лише ті, де задачі справді є (у відкритій вкладці),
       і назвами з карти. Порожній пункт у фільтрі гірший за відсутній. */
    var topicCount = {};
    all.forEach(function (p) { p.t.forEach(function (t) { topicCount[t] = (topicCount[t] || 0) + 1; }); });
    var topics = Object.keys(topicCount).filter(function (t) { return topicName[t]; })
      .sort(function (a, b) {
        return (topicDom[a] || '').localeCompare(topicDom[b] || '') ||
          topicName[a].localeCompare(topicName[b], 'uk');
      });

    /* Олімпіади й підручники — вкладками на видноті, а не пунктом у списку:
       коли «Олімпіади» сховались у фільтр, їх просто загубили. Числа — з
       покажчиків, бо файли іншої вкладки ще не завантажені. */
    var bOlymp = O().bankIndex('olymp'), bBook = O().bankIndex('book');
    var nOlymp = (bOlymp && bOlymp.total) || 0;
    var nBook = (bBook && bBook.total) || 0;
    var tabs =
      '<div class="ol-note">' + icon('layers', 16) +
        '<span>Тут ' + U.pl(nOlymp, 'олімпіадна задача', 'олімпіадні задачі', 'олімпіадних задач') +
        '. Задачі з підручників і все разом — у ' +
        '<a href="#/bank">Банку задач</a>' + (nBook ? ' (ще ' + nBook + ' з підручників)' : '') + '.</span>' +
      '</div>';

    var fields = [];
    fields.push(
      '<label class="field" style="flex:2;min-width:240px">' +
        '<span class="field__label">Пошук в умовах</span>' +
        '<input class="input" id="ol-q" placeholder="' +
          (isBook ? 'модуль, трапеція, 14.23, прогресія…' : isOlymp ? 'triangle, prime, ways…' : 'трикутник, prime, 14.23…') +
          '" value="' + U.esc(filters.q) + '">' +
      '</label>');
    fields.push(select('topic', 'Тема карти', [['', 'Усі теми']].concat(topics.map(function (t) {
      return [t, topicName[t] + ' · ' + topicCount[t]];
    })), 230));

    if (isBook) {
      var books = O().books();
      var grades = {};
      Object.keys(books).forEach(function (k) { if (books[k].grade) grades[books[k].grade] = 1; });
      fields.push(select('grade', 'Клас', [['', 'Усі класи']].concat(Object.keys(grades).sort(function (a, b) {
        return a - b;
      }).map(function (g) { return [g, g + ' клас']; })), 120));
      var bookKeys = Object.keys(books).filter(function (k) {
        return !filters.grade || String(books[k].grade) === String(filters.grade);
      }).sort(function (a, b) {
        return (books[a].grade - books[b].grade) || books[a].title.localeCompare(books[b].title, 'uk');
      });
      fields.push(select('src', 'Підручник', [['', 'Усі підручники']].concat(bookKeys.map(function (k) {
        return [k, books[k].title + ' · ' + books[k].count];
      })), 260));
      if (filters.src) {
        /* Розділи — у порядку книжки: так їх і шукають, гортаючи зміст. */
        var secs = [], secCount = {};
        all.forEach(function (p) {
          if (p.s !== filters.src || !p.sec) return;
          if (!secCount[p.sec]) secs.push(p.sec);
          secCount[p.sec] = (secCount[p.sec] || 0) + 1;
        });
        fields.push(select('sec', 'Розділ', [['', 'Усі розділи']].concat(secs.map(function (s) {
          return [s, s + ' · ' + secCount[s]];
        })), 260));
      }
      fields.push(select('level', 'Рівень', [['', 'Будь-який']].concat(O().BOOK_LEVELS.map(function (l) {
        return [l.id, l.name];
      })), 140));
      fields.push(
        '<label class="ol-check"><input type="checkbox" data-ol-check="ans"' + (filters.ans ? ' checked' : '') + '>' +
        ' Лише з відповіддю</label>');
    } else if (isOlymp && bOlymp) {
      var srcs = Object.keys(bOlymp.sourceCount || {}).sort(function (a, b) {
        return bOlymp.sourceCount[b] - bOlymp.sourceCount[a];
      });
      fields.push(select('level', 'Рівень', [['', 'Будь-який']].concat(O().LEVELS.map(function (l) {
        return [l.id, l.name];
      })), 180));
      fields.push(select('src', 'Змагання', [['', 'Усі']].concat(srcs.map(function (s) {
        return [s, O().contest(s) + ' · ' + bOlymp.sourceCount[s]];
      })), 200));
    }

    var any = KEYS.some(function (k) { return k !== 'bank' && filters[k]; });
    var head = tabs +
      '<div class="card ol-filters">' +
        '<div class="row row--wrap" style="gap:10px;align-items:flex-end">' +
          fields.join('') +
          (any ? '<button class="btn btn--ghost btn--sm" data-act="ol-clear">Скинути</button>' : '') +
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

    var bookKeys = Object.keys(books).sort(function (a, b) {
      return (books[a].grade || 0) - (books[b].grade || 0) || books[a].title.localeCompare(books[b].title, 'uk');
    });
    return '<div class="card ol-credits">' +
      '<div class="card-title" style="font-size:14px">Звідки ці задачі</div>' +
      (bookKeys.length && filters.bank !== 'olymp'
        ? '<div class="muted small">Підручники — для власного викладання; при кожній задачі стоїть ' +
          'підручник, розділ і номер. Тема карти визначена за назвою розділу, тож у рідкісних ' +
          'випадках може бути сусідньою.</div>' +
          '<ul class="ol-books">' + bookKeys.map(function (k) {
            var b = books[k];
            return '<li>' + U.esc(b.title) + (b.year ? ', ' + b.year : '') +
              ' <span class="muted">· ' + U.pl(b.count || 0, 'задача', 'задачі', 'задач') +
              (b.answered ? ', з відповіддю ' + b.answered : '') + '</span></li>';
          }).join('') + '</ul>'
        : '') +
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
        (p.g ? '<span class="ol-grade">' + p.g + ' кл.</span>' : '') +
        '<span class="muted small ol-where">' + U.esc(O().where(p)) + '</span>' +
        '<span class="spacer"></span>' +
        '<button class="icon-btn" data-act="ol-copy" data-arg="' + U.esc(p.i) + '" ' +
          'title="Скопіювати умову">' + icon('copy', 16) + '</button>' +
        '<button class="icon-btn" data-act="ol-board" data-arg="' + U.esc(p.i) + '" ' +
          'title="Покласти на дошку уроку">' + icon('present', 16) + '</button>' +
      '</div>' +
      '<div class="ol-card__p">' + fmt(p.p) + '</div>' +
      O().imgHtml(p) +
      (p.f && !p.img ? '<div class="ol-fig">' + (p.bank === 'book'
        ? 'До задачі є рисунок — він у підручнику' + (p.pg ? ' на с. ' + p.pg + ' файлу' : '') + '.'
        : 'В умові був рисунок — його в наборі немає.') + '</div>' : '') +
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
          ? '<button class="btn btn--ghost btn--sm mt-2" data-act="nav" data-arg="#/bank?topic=' +
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
          O().imgHtml(p) +
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
      // вкладку лишаємо: «скинути» стосується фільтрів, а не того, де ти
      window.App.setQuery({ q: '', topic: '', level: '', src: '', grade: '', sec: '', ans: '' });
    },

    'ol-topic': function (t) { window.App.setQuery({ topic: t }); },

    'ol-bank': function (b) {
      // рівні, джерела й розділи в кожної вкладки свої — скидаємо разом із вкладкою
      window.App.setQuery({ bank: b || '', level: '', src: '', sec: '', grade: '', ans: '' });
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
    if (!document.querySelector('[data-ol]')) return;
    var chk = e.target.closest && e.target.closest('[data-ol-check]');
    if (chk) {
      var p1 = {};
      p1[chk.getAttribute('data-ol-check')] = chk.checked ? '1' : '';
      window.App.setQuery(p1);
      return;
    }
    var sel = e.target.closest && e.target.closest('[data-ol-f]');
    if (!sel) return;
    var key = sel.getAttribute('data-ol-f');
    var patch = {};
    patch[key] = sel.value;
    // інший клас — інші підручники; інший підручник — інші розділи
    if (key === 'grade') { patch.src = ''; patch.sec = ''; }
    if (key === 'src') patch.sec = '';
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
