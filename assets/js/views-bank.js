/* Банк задач — усі задачі з усіх джерел в одному місці.

   Олімпіадна сторінка — про підготовку до змагань. Банк — про те, щоб
   знайти задачу на будь-що: з підручника, збірника, олімпіади. Задач тут
   десятки тисяч, тому сторінка влаштована як каталог інтернет-магазину:
   ліворуч фільтри з кількістю в кожному пункті, згори пошук і вибране,
   праворуч — картки. Складність — одна шкала на всі джерела, рангами
   Codewars: 8 кю найлегше, 1 кю найважче.

   Фільтри живуть в адресі (#/bank?rank=6,5&grade=9), тож добірку можна
   лишити у вкладці й повернутися до неї. Перемальовуємо на місці, без
   переходу на нову адресу: так не стрибає прокрутка й не губиться фокус. */

(function () {
  'use strict';

  var U = window.U, C = window.C, icon = window.icon;
  var V = window.V;
  var MAP = window.MATH_MAP;

  function O() { return window.Olymp; }
  function fmt(t) { return window.MathFmt ? MathFmt.text(t) : U.esc(t); }

  var topicName = {}, topicDom = {}, domName = {}, domColor = {}, domOrder = [];
  if (MAP) {
    var secDom = {};
    MAP.sections.forEach(function (s) { secDom[s.id] = s.domain; });
    MAP.topics.forEach(function (t) { topicName[t.id] = t.name; topicDom[t.id] = secDom[t.section]; });
    MAP.domains.forEach(function (d) { domName[d.id] = d.name; domColor[d.id] = d.color; domOrder.push(d.id); });
  }

  var PAGE = 30;
  var LISTS = ['rank', 'grade', 'dom', 'topic', 'src', 'lang', 'has'];
  var f = {};                    // фільтри: списки + q + sort
  var shown = PAGE;
  var all = null;                // усі задачі обох банків
  var openGroups = {};           // розгорнуті довгі списки фільтрів
  var mobileOpen = false;

  var GRADES = [
    ['5', '5 клас'], ['6', '6 клас'], ['7', '7 клас'], ['8', '8 клас'], ['9', '9 клас'],
    ['10', '10 клас'], ['11', '11 клас'], ['uni', 'Університет'], ['mix', 'Збірники'],
    ['olymp', 'Олімпіадні']
  ];
  var LANGS = { uk: 'Українська', en: 'English', ru: 'Російська' };

  function parse(query) {
    f = { q: (query && query.q) || '', sort: (query && query.sort) || '' };
    LISTS.forEach(function (k) {
      f[k] = query && query[k] ? String(query[k]).split(',').filter(Boolean) : [];
    });
  }

  V.bank = function (query) {
    parse(query);
    // на телефоні задача займає майже екран — порція менша
    PAGE = window.innerWidth <= 640 ? 12 : 30;
    shown = PAGE;
    return C.hero({
      short: true,
      title: 'Банк задач',
      sub: 'задачі з підручників, збірників і олімпіад — з фільтрами за темою, класом і складністю'
    }) + '<div class="page"><div class="bk" data-bk>' +
      '<div class="card"><div class="muted">Завантажую банк задач…</div></div></div></div>';
  };

  V.mountBank = function () {
    if (!O() || !document.querySelector('[data-bk]')) return;
    O().all(function (list, bad) {
      var box = document.querySelector('[data-bk]');
      if (!box) return;
      if (!list) {
        var why = O().failText();
        box.innerHTML = '<div class="card">' + C.empty('alert', why[0], why[1]) + '</div>';
        return;
      }
      all = list;
      all.forEach(prepare);
      draw();
    });
  };

  /** Властивості задачі, за якими фільтруємо, — один раз, а не на кожен клік. */
  function prepare(p) {
    if (p._bk) return;
    p._bk = 1;
    p._rank = O().rank(p);
    p._grade = O().gradeKey(p);
    p._lang = O().lang(p);
    var doms = {};
    p.t.forEach(function (t) { if (topicDom[t]) doms[topicDom[t]] = 1; });
    p._doms = Object.keys(doms);
    p._src = p.bank === 'book' ? p.s : 'ol:' + p.s;
  }

  function any(list, value) { return !list.length || list.indexOf(String(value)) >= 0; }
  function some(list, values) {
    if (!list.length) return true;
    for (var i = 0; i < values.length; i++) if (list.indexOf(values[i]) >= 0) return true;
    return false;
  }

  /** Чи проходить задача всі фільтри, крім одного — так рахуються числа біля пунктів. */
  function pass(p, except) {
    if (except !== 'rank' && !any(f.rank, p._rank)) return false;
    if (except !== 'grade' && !any(f.grade, p._grade)) return false;
    if (except !== 'dom' && !some(f.dom, p._doms)) return false;
    if (except !== 'topic' && !some(f.topic, p.t)) return false;
    if (except !== 'src' && !any(f.src, p._src)) return false;
    if (except !== 'lang' && !any(f.lang, p._lang)) return false;
    if (except !== 'has' && f.has.length) {
      if (f.has.indexOf('a') >= 0 && !p.a) return false;
      if (f.has.indexOf('sol') >= 0 && !O().hasSolution(p)) return false;
    }
    if (f.q) {
      var hay = O().haystack(p);
      var words = O().fold(f.q).trim().split(' ');
      for (var i = 0; i < words.length; i++) if (words[i] && hay.indexOf(words[i]) < 0) return false;
    }
    return true;
  }

  function counts(key, valuesOf) {
    var c = {};
    all.forEach(function (p) {
      if (!pass(p, key)) return;
      var v = valuesOf(p);
      if (Array.isArray(v)) v.forEach(function (x) { c[x] = (c[x] || 0) + 1; });
      else c[v] = (c[v] || 0) + 1;
    });
    return c;
  }

  /* ============================================================
     Малювання
     ============================================================ */

  function draw() {
    var box = document.querySelector('[data-bk]');
    if (!box || !all) return;

    var list = all.filter(function (p) { return pass(p); });
    sortList(list);

    var side = '<aside class="bk-side' + (mobileOpen ? ' is-open' : '') + '">' + facets() + '</aside>';
    var main = '<div class="bk-main">' + toolbar(list.length) +
      (list.length
        ? list.slice(0, shown).map(card).join('') +
          (list.length > shown
            ? '<div class="bk-more"><button class="btn btn--soft" data-act="bk-more">Показати ще ' +
              Math.min(PAGE, list.length - shown) + ' з ' + (list.length - shown) + '</button></div>'
            : '')
        : '<div class="card">' + C.empty('search', 'Нічого не знайшлося',
            'Приберіть частину фільтрів або змініть запит.') + '</div>') +
      '</div>';

    box.innerHTML = '<div class="bk-layout">' + side + main + '</div>';
  }

  function sortList(list) {
    if (f.sort === 'easy') list.sort(function (a, b) { return b._rank - a._rank || gradeNum(a) - gradeNum(b); });
    else if (f.sort === 'hard') list.sort(function (a, b) { return a._rank - b._rank || gradeNum(b) - gradeNum(a); });
    else if (f.sort === 'rand') {
      list.forEach(function (p) { if (p._rnd == null) p._rnd = Math.random(); });
      list.sort(function (a, b) { return a._rnd - b._rnd; });
    }
    // без сортування — порядок книжки: клас, підручник, сторінка; олімпіадні — за ними
  }

  function gradeNum(p) { return p.bank === 'book' ? Number(p.g) || 0 : 12; }

  function rankBadge(kyu, small) {
    var r = O().rankInfo(kyu);
    return '<span class="kyu kyu--' + r.color + (small ? ' kyu--sm' : '') + '" title="' + U.esc(r.hint) + '">' +
      '<span class="kyu__hex"></span>' + kyu + ' кю</span>';
  }

  function check(key, value, label, count, extra) {
    var on = f[key].indexOf(String(value)) >= 0;
    if (!count && !on) return '';
    return '<label class="bk-opt' + (on ? ' is-on' : '') + '">' +
      '<input type="checkbox" data-bk-f="' + key + '" value="' + U.esc(value) + '"' + (on ? ' checked' : '') + '>' +
      '<span class="bk-opt__l">' + label + '</span>' +
      (extra || '') +
      '<span class="bk-opt__n">' + (count || 0) + '</span>' +
      '</label>';
  }

  function group(title, key, body, clearable) {
    if (!body) return '';
    return '<div class="bk-group">' +
      '<div class="bk-group__h">' + U.esc(title) +
        (clearable && f[key].length ? '<button class="bk-link" data-act="bk-clear" data-arg="' + key + '">скинути</button>' : '') +
      '</div>' + body + '</div>';
  }

  function facets() {
    var html = '';

    var rc = counts('rank', function (p) { return p._rank; });
    html += group('Складність', 'rank', O().RANKS.map(function (r) {
      return check('rank', r.kyu, rankBadge(r.kyu, true) + '<span class="bk-opt__hint">' + U.esc(r.hint) + '</span>',
        rc[r.kyu]);
    }).join(''), true);

    var gc = counts('grade', function (p) { return p._grade; });
    html += group('Клас', 'grade', GRADES.map(function (g) {
      return check('grade', g[0], U.esc(g[1]), gc[g[0]]);
    }).join(''), true);

    var dc = counts('dom', function (p) { return p._doms; });
    var tc = counts('topic', function (p) { return p.t; });
    html += group('Розділ і тема', 'dom', domOrder.map(function (d) {
      var row = check('dom', d, '<span class="bk-dot" style="--c:' + (domColor[d] || '#999') + '"></span>' +
        U.esc(domName[d] || d), dc[d]);
      if (!row) return '';
      // теми розділу — коли розділ вибрано або вже вибрано якусь його тему
      var topics = Object.keys(tc).filter(function (t) { return topicDom[t] === d && topicName[t]; });
      var showTopics = f.dom.indexOf(d) >= 0 || topics.some(function (t) { return f.topic.indexOf(t) >= 0; });
      if (!showTopics) return row;
      topics.sort(function (a, b) { return tc[b] - tc[a]; });
      return row + '<div class="bk-sub">' + topics.map(function (t) {
        return check('topic', t, U.esc(topicName[t]), tc[t]);
      }).join('') + '</div>';
    }).join(''), true);

    var sc = counts('src', function (p) { return p._src; });
    var books = O().books();
    var bookKeys = Object.keys(books).filter(function (k) { return sc[k] || f.src.indexOf(k) >= 0; })
      .sort(function (a, b) { return (books[a].grade - books[b].grade) || books[a].title.localeCompare(books[b].title, 'uk'); });
    var olKeys = Object.keys(sc).filter(function (k) { return k.indexOf('ol:') === 0; })
      .sort(function (a, b) { return sc[b] - sc[a]; });
    var olShown = openGroups.src ? olKeys : olKeys.slice(0, 8);
    html += group('Джерело', 'src',
      (bookKeys.length ? '<div class="bk-cap">Підручники</div>' + bookKeys.map(function (k) {
        return check('src', k, U.esc(books[k].title), sc[k]);
      }).join('') : '') +
      (olKeys.length ? '<div class="bk-cap">Олімпіади</div>' + olShown.map(function (k) {
        return check('src', k, U.esc(O().contest(k.slice(3))), sc[k]);
      }).join('') +
        (olKeys.length > olShown.length
          ? '<button class="bk-link" data-act="bk-open" data-arg="src">ще ' + (olKeys.length - olShown.length) + '</button>'
          : '') : ''), true);

    var lc = counts('lang', function (p) { return p._lang; });
    html += group('Мова', 'lang', Object.keys(LANGS).map(function (l) {
      return check('lang', l, LANGS[l], lc[l]);
    }).join(''), true);

    var hc = counts('has', function (p) {
      var v = [];
      if (p.a) v.push('a');
      if (O().hasSolution(p)) v.push('sol');
      return v;
    });
    html += group('Що є до задачі', 'has',
      check('has', 'a', 'Відповідь', hc.a) + check('has', 'sol', 'Розвʼязання', hc.sol), true);

    return html;
  }

  function toolbar(n) {
    var chips = [];
    LISTS.forEach(function (k) {
      f[k].forEach(function (v) {
        chips.push('<button class="bk-chip" data-act="bk-drop" data-arg="' + U.esc(k + ':' + v) + '">' +
          chipLabel(k, v) + ' <span aria-hidden="true">×</span></button>');
      });
    });

    return '<div class="card bk-bar">' +
      '<div class="bk-bar__row">' +
        '<div class="bk-search">' + icon('search', 16) +
          '<input class="input" id="bk-q" placeholder="Пошук: трапеція, модуль, 14.23, prime…" value="' + U.esc(f.q) + '">' +
        '</div>' +
        '<select class="input bk-sort" data-bk-sort aria-label="Порядок задач">' +
          [['', 'За джерелом'], ['easy', 'Спершу легші'], ['hard', 'Спершу складніші'], ['rand', 'Випадково']]
            .map(function (o) {
              return '<option value="' + o[0] + '"' + (f.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
            }).join('') +
        '</select>' +
        '<button class="btn btn--soft btn--sm bk-filters-btn" data-act="bk-mobile">' + icon('filter', 15) + 'Фільтри</button>' +
      '</div>' +
      '<div class="bk-bar__info">' +
        '<b>' + U.pl(n, 'задача', 'задачі', 'задач') + '</b>' +
        (n !== all.length ? '<span class="muted"> з ' + all.length + '</span>' : '') +
        (chips.length
          ? chips.join('') + '<button class="bk-link" data-act="bk-clear-all">скинути все</button>'
          : '') +
      '</div>' +
    '</div>';
  }

  function chipLabel(k, v) {
    if (k === 'rank') return v + ' кю';
    if (k === 'grade') { for (var i = 0; i < GRADES.length; i++) if (GRADES[i][0] === v) return GRADES[i][1]; return v; }
    if (k === 'dom') return U.esc(domName[v] || v);
    if (k === 'topic') return U.esc(topicName[v] || v);
    if (k === 'src') return U.esc(v.indexOf('ol:') === 0 ? O().contest(v.slice(3)) : O().contest(v));
    if (k === 'lang') return LANGS[v] || v;
    if (k === 'has') return v === 'a' ? 'з відповіддю' : 'з розвʼязанням';
    return U.esc(v);
  }

  function card(p) {
    var color = domColor[p._doms[0]] || 'var(--brand-600)';
    var isBook = p.bank === 'book';
    var title = isBook
      ? O().contest(p.s) + ' · № ' + p.num
      : O().contest(p.s);
    var meta = [];
    var book = isBook ? (O().books()[p.s] || {}) : null;
    if (isBook && p.sec) meta.push(U.esc(p.sec));
    meta.push(isBook ? (p.g === 'uni' ? 'університет' : p.g ? p.g + ' клас' : 'збірник') : 'олімпіада');
    if (book && book.ocr) meta.push('розпізнано зі скану — можливі помилки');
    if (p._lang !== 'uk') meta.push(LANGS[p._lang] || p._lang);

    return '<div class="card bk-card ol-card" data-ol-id="' + U.esc(p.i) + '" style="--c:' + color + '">' +
      '<div class="bk-card__head">' +
        rankBadge(p._rank) +
        '<div class="bk-card__title">' +
          '<div class="bk-card__name">' + U.esc(title) + '</div>' +
          '<div class="bk-card__meta">' + meta.filter(Boolean).join(' · ') + '</div>' +
        '</div>' +
        '<button class="icon-btn" data-act="ol-copy" data-arg="' + U.esc(p.i) + '" title="Скопіювати умову">' +
          icon('copy', 16) + '</button>' +
        '<button class="icon-btn" data-act="ol-board" data-arg="' + U.esc(p.i) + '" title="Покласти на дошку уроку">' +
          icon('present', 16) + '</button>' +
      '</div>' +
      '<div class="ol-card__p">' + fmt(p.p) + '</div>' +
      O().imgHtml(p) +
      (p.f && !p.img ? '<div class="ol-fig">' + (isBook
        ? 'До задачі є рисунок — він у підручнику' + (p.pg ? ' (с. ' + p.pg + ' файлу)' : '') + '.'
        : 'В умові був рисунок — його в наборі немає.') + '</div>' : '') +
      '<div class="ol-card__bot">' +
        p.t.filter(function (t) { return topicName[t]; }).slice(0, 3).map(function (t) {
          return '<button class="bk-tag" data-act="bk-add" data-arg="' + U.esc('topic:' + t) + '" ' +
            'style="--c:' + (domColor[topicDom[t]] || '') + '">' + U.esc(topicName[t]) + '</button>';
        }).join('') +
        '<span class="spacer"></span>' +
        (p.a ? '<button class="btn btn--ghost btn--sm" data-act="ol-answer" data-arg="' + U.esc(p.i) + '">Відповідь</button>' : '') +
        (O().hasSolution(p)
          ? '<button class="btn btn--soft btn--sm" data-act="ol-sol" data-arg="' + U.esc(p.i) + '">' +
            icon('book', 15) + 'Розвʼязання</button>'
          : '') +
      '</div>' +
      '<div class="ol-extra" data-ol-extra hidden></div>' +
      '</div>';
  }

  /* ============================================================
     Дії
     ============================================================ */

  /** Записати фільтри в адресу без переходу — і перемалювати на місці. */
  function commit() {
    shown = PAGE;
    var q = {};
    if (f.q) q.q = f.q;
    if (f.sort) q.sort = f.sort;
    LISTS.forEach(function (k) { if (f[k].length) q[k] = f[k].join(','); });
    var s = Object.keys(q).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
    try { history.replaceState(null, '', '#/bank' + (s ? '?' + s : '')); } catch (e) { /* адреса — зручність */ }
    draw();
  }

  function toggle(key, value) {
    var list = f[key];
    var at = list.indexOf(value);
    if (at >= 0) list.splice(at, 1); else list.push(value);
    // зняли розділ — знімаємо й його теми, інакше фільтр лишиться невидимим
    if (key === 'dom' && at >= 0) {
      f.topic = f.topic.filter(function (t) { return topicDom[t] !== value; });
    }
  }

  V.bankActions = {
    'bk-more': function () { shown += PAGE; draw(); },
    'bk-clear': function (key) { f[key] = []; commit(); },
    'bk-clear-all': function () { LISTS.forEach(function (k) { f[k] = []; }); f.q = ''; commit(); },
    'bk-drop': function (arg) {
      var i = arg.indexOf(':');
      toggle(arg.slice(0, i), arg.slice(i + 1));
      commit();
    },
    'bk-add': function (arg) {
      var i = arg.indexOf(':');
      var key = arg.slice(0, i), value = arg.slice(i + 1);
      if (f[key].indexOf(value) < 0) f[key].push(value);
      commit();
      window.scrollTo(0, 0);
    },
    'bk-open': function (key) { openGroups[key] = true; draw(); },
    'bk-mobile': function () { mobileOpen = !mobileOpen; draw(); }
  };

  document.addEventListener('change', function (e) {
    if (!document.querySelector('[data-bk]')) return;
    var box = e.target.closest && e.target.closest('[data-bk-f]');
    if (box) {
      toggle(box.getAttribute('data-bk-f'), box.value);
      commit();
      return;
    }
    if (e.target.hasAttribute && e.target.hasAttribute('data-bk-sort')) {
      f.sort = e.target.value;
      commit();
    }
  });

  var qTimer = null;
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'bk-q') return;
    var value = e.target.value;
    clearTimeout(qTimer);
    qTimer = setTimeout(function () {
      f.q = value;
      commit();
      var input = document.getElementById('bk-q');
      if (input) { input.focus(); input.setSelectionRange(value.length, value.length); }
    }, 250);
  });
})();
