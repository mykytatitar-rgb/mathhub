/* Банк задач: олімпіадні змагання й підручники.

   Задачі лежать не в базі, а окремими файлами поруч із програмою — тисячі
   чужих задач нікуди не редагуються й нікуди не синхронізуються, тож у
   сховищі браузера їм не місце. Кабінет вантажить лише потрібну частину:
   спершу покажчик (кілька кілобайтів), далі — файл того домену, у який
   зайшли, і вже потім розв'язання.

   Банків два, і вони різні за природою:

     olymp — відкриті набори задач зі змагань: ліцензія вказана в покажчику,
             умови мовою оригіналу, здебільшого англійською;
     book  — задачі з підручників, переписані для власного викладання:
             українською, з параграфом і номером.

   Назовні це один банк: у темі карти важливо, що задача є, а не з якого
   вона файлу. */

(function () {
  'use strict';

  var O = {};

  var BASE = {
    olymp: 'assets/data/olymp/',
    book: 'assets/data/book/'
  };
  var BANKS = ['olymp', 'book'];

  var index = null;                 // зведений покажчик обох банків
  var raw = {};                     // покажчик кожного банку окремо
  var indexState = 'idle';          // idle | loading | ready | failed
  var indexWaiters = [];

  var shards = {};                  // «банк:домен» → список задач
  var shardWaiters = {};
  var sols = {};                    // «банк:домен» → {id: розвʼязання}
  var byId = {};

  function get(bank, path) {
    return fetch(BASE[bank] + path, { cache: 'default' }).then(function (r) {
      if (!r.ok) throw new Error('файл не прочитався (' + r.status + ')');
      return r.json();
    });
  }

  /* ============================================================
     Покажчик
     ============================================================ */

  O.state = function () { return indexState; };

  /**
   * Зведений покажчик. Другий банк може бути й порожнім — це не помилка:
   * задачі з підручників переписуються поступово, і поки їх мало, працює
   * сам олімпіадний.
   */
  O.ready = function (cb) {
    if (indexState === 'ready') { if (cb) cb(index); return; }
    if (cb) indexWaiters.push(cb);
    if (indexState === 'loading') return;

    indexState = 'loading';
    var left = BANKS.length;

    BANKS.forEach(function (bank) {
      get(bank, 'index.json').then(function (data) {
        raw[bank] = data;
      }).catch(function (e) {
        raw[bank] = null;
        console.warn('Банк «' + bank + '»:', e && e.message);
      }).then(function () {
        if (--left) return;
        index = merge();
        indexState = index ? 'ready' : 'failed';
        var list = indexWaiters;
        indexWaiters = [];
        list.forEach(function (fn) { try { fn(index); } catch (err) { console.warn(err); } });
      });
    });
  };

  /** Скласти покажчики банків в один: теми, джерела, у яких файлах шукати. */
  function merge() {
    if (!raw.olymp && !raw.book) return null;

    var out = {
      total: 0, topics: {}, topicFiles: {}, domains: {},
      contests: {}, sourceCount: {}, sets: {}, books: {}, built: ''
    };

    BANKS.forEach(function (bank) {
      var idx = raw[bank];
      if (!idx) return;

      out.total += idx.total || 0;
      out.built = idx.built || out.built;

      Object.keys(idx.sets || {}).forEach(function (k) { out.sets[k] = idx.sets[k]; });
      Object.keys(idx.books || {}).forEach(function (k) {
        out.books[k] = idx.books[k];
        out.contests[k] = idx.books[k].title;
      });
      Object.keys(idx.contests || {}).forEach(function (k) { out.contests[k] = idx.contests[k]; });
      Object.keys(idx.sourceCount || {}).forEach(function (k) {
        out.sourceCount[k] = (out.sourceCount[k] || 0) + idx.sourceCount[k];
      });
      Object.keys(idx.domains || {}).forEach(function (d) {
        out.domains[d] = (out.domains[d] || 0) + idx.domains[d];
      });
      Object.keys(idx.topics || {}).forEach(function (t) {
        out.topics[t] = (out.topics[t] || 0) + idx.topics[t];
      });
      Object.keys(idx.topicFiles || {}).forEach(function (t) {
        out.topicFiles[t] = (out.topicFiles[t] || []).concat(
          idx.topicFiles[t].map(function (d) { return bank + ':' + d; }));
      });
    });

    return out;
  }

  O.index = function () { return index; };
  O.bankIndex = function (bank) { return raw[bank] || null; };

  /** Скільки задач прив'язано до теми карти — в обох банках разом. */
  O.count = function (topicId) {
    return (index && index.topics[topicId]) || 0;
  };

  O.total = function () { return (index && index.total) || 0; };

  /* ============================================================
     Задачі
     ============================================================ */

  /** Один файл; ключ виду «банк:домен». cb(список|null). */
  O.file = function (key, cb) {
    if (shards[key]) { cb(shards[key]); return; }
    if (shardWaiters[key]) { shardWaiters[key].push(cb); return; }
    shardWaiters[key] = [cb];

    var parts = key.split(':');
    get(parts[0], parts[1] + '.json').then(function (list) {
      list.forEach(function (p) {
        p.bank = parts[0];
        p.dom = parts[1];
        byId[p.i] = p;
      });
      shards[key] = list;
      flush(list);
    }).catch(function (e) {
      console.warn('Задачі ' + key + ':', e && e.message);
      flush(null);
    });

    function flush(arg) {
      var list = shardWaiters[key] || [];
      delete shardWaiters[key];
      list.forEach(function (fn) { try { fn(arg); } catch (err) { console.warn(err); } });
    }
  };

  /**
   * Задачі однієї теми карти.
   *
   * Спершу — з підручників: вони українською, з параграфом і номером, і
   * саме їх дають на уроці. Далі — олімпіадні, від найлегшої.
   */
  O.forTopic = function (topicId, cb) {
    O.ready(function (idx) {
      if (!idx) { cb(null); return; }
      var keys = idx.topicFiles[topicId] || [];
      if (!keys.length) { cb([]); return; }

      var left = keys.length;
      var out = [];

      keys.forEach(function (key) {
        O.file(key, function (list) {
          (list || []).forEach(function (p) {
            if (p.t.indexOf(topicId) >= 0) out.push(p);
          });
          if (--left) return;
          out.sort(function (a, b) {
            return bankRank(a) - bankRank(b) ||
              primary(b, topicId) - primary(a, topicId) ||
              a.d - b.d;
          });
          cb(out);
        });
      });
    });
  };

  function bankRank(p) { return p.bank === 'book' ? 0 : 1; }

  /**
   * Усі задачі — для пошуку по банку. cb(список|null, скільки файлів не дійшло).
   * only — лише один банк: вкладка підручників не мусить чекати на олімпіадні
   * розвʼязання й навпаки.
   */
  O.all = function (cb, only) {
    O.ready(function (idx) {
      if (!idx) { cb(null, 0); return; }

      var keys = [];
      BANKS.forEach(function (bank) {
        var bi = raw[bank];
        if (!bi || (only && only !== bank)) return;
        Object.keys(bi.domains || {}).forEach(function (d) { keys.push(bank + ':' + d); });
      });
      if (!keys.length) { cb([], 0); return; }

      var left = keys.length;
      var out = [];
      var bad = 0;

      keys.forEach(function (key) {
        O.file(key, function (list) {
          if (list) out = out.concat(list); else bad++;
          if (--left) return;
          out.sort(function (a, b) { return bankRank(a) - bankRank(b) || a.d - b.d; });
          cb(out, bad);
        });
      });
    });
  };

  O.get = function (id) { return byId[id] || null; };

  /** Чи стоїть тема в надійній частині прив'язки (з рубрики джерела). */
  function primary(p, topicId) {
    var at = p.t.indexOf(topicId);
    return at >= 0 && at < (p.n == null ? p.t.length : p.n) ? 1 : 0;
  }

  O.primary = primary;

  /** Розв'язання задачі. Окремим файлом: воно вдесятеро довше за умову. */
  O.solution = function (p, cb) {
    if (!p || !p.dom || p.bank !== 'olymp') { cb(null); return; }
    var key = p.bank + ':' + p.dom;
    if (sols[key]) { cb(sols[key][p.i] || ''); return; }

    get(p.bank, 'sol-' + p.dom + '.json').then(function (map) {
      sols[key] = map;
      cb(map[p.i] || '');
    }).catch(function (e) {
      console.warn('Розвʼязання:', e && e.message);
      cb(null);
    });
  };

  O.hasSolution = function (p) { return !!p && p.bank === 'olymp'; };

  /* ============================================================
     Складність
     ============================================================

     У змаганнях складність — число від 1 до 10 за шкалою AoPS; саме число
     репетиторові нічого не каже, тому перекладаємо його в рівень змагання.
     У підручниках своя мітка — кружечок, крапка, зірочка — і означає вона
     зовсім інше, тож і підписи в неї власні. */

  O.LEVELS = [
    { id: 1, max: 2.5, name: 'Шкільний', hint: 'задачі шкільного етапу' },
    { id: 2, max: 4, name: 'Районний', hint: 'районний і міський етапи' },
    { id: 3, max: 5.5, name: 'Обласний', hint: 'обласний етап' },
    { id: 4, max: 7, name: 'Всеукраїнський', hint: 'рівень фінального етапу' },
    { id: 5, max: 99, name: 'Міжнародний', hint: 'IMO та відбори збірних' }
  ];

  var BOOK_LEVELS = [
    { id: 1, name: 'Базовий', hint: 'обовʼязковий рівень підручника' },
    { id: 2, name: 'Середній', hint: 'для тих, хто засвоїв основне' },
    { id: 3, name: 'Високий', hint: 'складніші задачі параграфа' }
  ];

  O.BOOK_LEVELS = BOOK_LEVELS;

  /** Рівень задачі. Приймає і саму задачу, і саме число складності. */
  O.level = function (p) {
    if (p && typeof p === 'object') {
      if (p.bank === 'book') {
        var n = Math.min(3, Math.max(1, Number(p.d) || 1));
        return BOOK_LEVELS[n - 1];
      }
      return byNumber(p.d);
    }
    return byNumber(p);
  };

  function byNumber(d) {
    var n = Number(d) || 0;
    for (var i = 0; i < O.LEVELS.length; i++) if (n <= O.LEVELS[i].max) return O.LEVELS[i];
    return O.LEVELS[O.LEVELS.length - 1];
  }

  /* ============================================================
     Ранг — одна шкала для всіх задач
     ============================================================

     Підручник міряє складність кружечком і зірочкою в межах свого класу,
     олімпіада — етапом. Щоб шукати задачі разом, потрібна одна шкала — і
     найзрозуміліша з готових у Codewars: 8 кю — найлегше, 1 кю — найважче,
     кольори ті самі (сірий, жовтий, синій, фіолетовий).

     Підручник: 5–8 клас починається з 8 кю, 9–11 — із 7 кю; середній рівень
     на ступінь важчий, високий — на два. Олімпіада: шкільний етап — 5 кю,
     районний — 4, обласний — 3, всеукраїнський — 2, міжнародний — 1. */

  O.RANKS = [
    { kyu: 8, color: 'white', hint: 'базові шкільні: 5–8 клас' },
    { kyu: 7, color: 'white', hint: 'шкільні середні або базові 9–11 класу' },
    { kyu: 6, color: 'yellow', hint: 'складніші шкільні' },
    { kyu: 5, color: 'yellow', hint: 'високий рівень підручника, шкільний етап олімпіади' },
    { kyu: 4, color: 'blue', hint: 'районний і міський етапи олімпіади' },
    { kyu: 3, color: 'blue', hint: 'обласний етап олімпіади' },
    { kyu: 2, color: 'purple', hint: 'всеукраїнський рівень' },
    { kyu: 1, color: 'purple', hint: 'міжнародні олімпіади й відбори збірних' }
  ];

  O.rank = function (p) {
    if (!p) return 8;
    if (p._rank) return p._rank;
    var r;
    if (p.bank === 'book') {
      var base = p.g === 'uni' ? 5 : !p.g ? 6 : (Number(p.g) <= 8 ? 8 : 7);
      r = base - (Math.min(3, Math.max(1, Number(p.d) || 1)) - 1);
    } else {
      r = 6 - byNumber(p.d).id;          // шкільний етап (1) → 5 кю, міжнародний (5) → 1 кю
    }
    p._rank = Math.max(1, Math.min(8, r));
    return p._rank;
  };

  O.rankInfo = function (kyu) {
    for (var i = 0; i < O.RANKS.length; i++) if (O.RANKS[i].kyu === kyu) return O.RANKS[i];
    return O.RANKS[0];
  };

  /** Для кого задача: клас підручника або «олімпіада». */
  O.gradeKey = function (p) {
    if (p.bank !== 'book') return 'olymp';
    return String(p.g || 'mix');          // збірник без класу — «Збірники»
  };

  /** Людська назва джерела: змагання або підручник. */
  O.contest = function (key) {
    return (index && index.contests && index.contests[key]) ||
      String(key || '').replace(/_/g, ' ');
  };

  /** Звідки саме задача — рядок під заголовком картки. */
  O.where = function (p) {
    if (!p) return '';
    var name = O.contest(p.s);
    if (p.bank !== 'book') return name;
    return name + (p.sec ? ' · ' + p.sec : '') + ', № ' + p.num;
  };

  /* Пошук, якому байдуже, як набрано: «х» кирилицею й «x» латиницею —
     на око та сама змінна, і в самих підручниках трапляються обидві. */
  var FOLD = { 'а': 'a', 'с': 'c', 'е': 'e', 'о': 'o', 'р': 'p', 'х': 'x', 'у': 'y', 'і': 'i', 'к': 'k', 'ё': 'е' };

  O.fold = function (s) {
    return String(s || '').toLowerCase()
      .replace(/\\(frac|sqrt|vec|left|right|begin|end|cases|cdot)\b/g, ' ')
      .replace(/[{}$^_\\]/g, '')
      .replace(/[’ʼ']/g, '’')
      .replace(/[асеорхуікё]/g, function (c) { return FOLD[c]; })
      .replace(/\s+/g, ' ');
  };

  /** Рядок, у якому шукаємо: умова, розділ, номер і назва підручника. */
  O.haystack = function (p) {
    if (p._hay == null) {
      p._hay = O.fold(p.p + ' ' + (p.sec || '') + ' ' + (p.ch || '') + ' ' + (p.num || '') + ' ' + O.contest(p.s));
    }
    return p._hay;
  };

  /** Мова задачі: підручники українською, набори — як указано в покажчику. */
  O.lang = function (p) {
    if (!p) return 'en';
    if (p.bank === 'book') {
      var b = index && index.books && index.books[p.s];
      return (b && b.lang) || 'uk';
    }
    var set = index && index.sets && index.sets[String(p.i).slice(0, 2)];
    return (set && set.lang) || 'en';
  };

  O.sets = function () { return (index && index.sets) || {}; };
  O.books = function () { return (index && index.books) || {}; };

  window.Olymp = O;
})();
