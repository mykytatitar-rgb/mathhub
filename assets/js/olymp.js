/* Банк олімпіадних задач.

   Задачі лежать не в базі, а окремими файлами поруч із програмою — кілька
   тисяч чужих задач нікуди не редагуються й нікуди не синхронізуються, тож
   у сховищі браузера їм не місце. Кабінет вантажить лише ту частину, яка
   потрібна зараз: спершу покажчик (кілька кілобайтів), далі — файл того
   домену, у який зайшли, і вже потім розв'язання.

   Звідки задачі й на яких умовах — написано в самому покажчику (index.json)
   і показано на сторінці: це відкриті набори з ліцензією, і назва змагання
   стоїть при кожній задачі.

   Умови лишаються мовою оригіналу. Машинний переклад олімпіадної умови —
   це зіпсована умова: у ній кожне слово має вагу. */

(function () {
  'use strict';

  var O = {};
  var BASE = 'assets/data/olymp/';

  var index = null;
  var indexState = 'idle';          // idle | loading | ready | failed
  var indexWaiters = [];
  var shards = {};                  // домен → список задач
  var shardWaiters = {};
  var sols = {};                    // домен → {id: розвʼязання}
  var byId = {};

  function get(path) {
    return fetch(BASE + path, { cache: 'default' }).then(function (r) {
      if (!r.ok) throw new Error('файл не прочитався (' + r.status + ')');
      return r.json();
    });
  }

  /* ============================================================
     Покажчик
     ============================================================ */

  O.state = function () { return indexState; };

  /** Покажчик: скільки задач і де їх шукати. cb(index|null). */
  O.ready = function (cb) {
    if (indexState === 'ready') { if (cb) cb(index); return; }
    if (cb) indexWaiters.push(cb);
    if (indexState === 'loading') return;

    indexState = 'loading';
    get('index.json').then(function (data) {
      index = data;
      indexState = 'ready';
      done(index);
    }).catch(function (e) {
      console.warn('Банк задач:', e && e.message);
      indexState = 'failed';
      done(null);
    });

    function done(arg) {
      var list = indexWaiters;
      indexWaiters = [];
      list.forEach(function (fn) { try { fn(arg); } catch (err) { console.warn(err); } });
    }
  };

  O.index = function () { return index; };

  /** Скільки задач прив'язано до теми карти. */
  O.count = function (topicId) {
    return (index && index.topics[topicId]) || 0;
  };

  O.total = function () { return (index && index.total) || 0; };

  /* ============================================================
     Задачі
     ============================================================ */

  /** Один файл домену. cb(список|null). */
  O.domain = function (dom, cb) {
    if (shards[dom]) { cb(shards[dom]); return; }
    if (shardWaiters[dom]) { shardWaiters[dom].push(cb); return; }
    shardWaiters[dom] = [cb];

    get(dom + '.json').then(function (list) {
      list.forEach(function (p) { p.dom = dom; byId[p.i] = p; });
      shards[dom] = list;
      flush(dom, list);
    }).catch(function (e) {
      console.warn('Задачі домену ' + dom + ':', e && e.message);
      flush(dom, null);
    });

    function flush(d, arg) {
      var list = shardWaiters[d] || [];
      delete shardWaiters[d];
      list.forEach(function (fn) { try { fn(arg); } catch (err) { console.warn(err); } });
    }
  };

  /**
   * Задачі однієї теми карти, від найлегшої.
   *
   * Задача живе у файлі свого головного домену, але позначена буває й
   * темами з інших — тому покажчик і каже, у які файли дивитись.
   */
  O.forTopic = function (topicId, cb) {
    O.ready(function (idx) {
      if (!idx) { cb(null); return; }
      var files = (idx.topicFiles && idx.topicFiles[topicId]) || [];
      if (!files.length) { cb([]); return; }

      var left = files.length;
      var out = [];
      var failed = false;

      files.forEach(function (dom) {
        O.domain(dom, function (list) {
          if (!list) failed = true;
          (list || []).forEach(function (p) {
            if (p.t.indexOf(topicId) >= 0) out.push(p);
          });
          if (--left) return;
          if (failed && !out.length) { cb(null); return; }
          /* Спершу задачі, де тема стоїть у надійній частині прив'язки,
             і лише потім ті, які підібрані за словами умови. */
          out.sort(function (a, b) {
            return primary(b, topicId) - primary(a, topicId) || a.d - b.d;
          });
          cb(out);
        });
      });
    });
  };

  /** Усі задачі — для пошуку по банку. cb(список|null, скільки файлів не дійшло). */
  O.all = function (cb) {
    O.ready(function (idx) {
      if (!idx) { cb(null, 0); return; }
      var doms = Object.keys(idx.domains);
      var left = doms.length;
      var out = [];
      var bad = 0;

      doms.forEach(function (dom) {
        O.domain(dom, function (list) {
          if (list) out = out.concat(list); else bad++;
          if (--left) return;
          out.sort(function (a, b) { return a.d - b.d; });
          cb(out, bad);
        });
      });
    });
  };

  O.get = function (id) { return byId[id] || null; };

  /** Чи стоїть тема в надійній частині прив'язки (з рубрики набору). */
  function primary(p, topicId) {
    var at = p.t.indexOf(topicId);
    return at >= 0 && at < (p.n == null ? p.t.length : p.n) ? 1 : 0;
  }

  O.primary = primary;

  /** Розв'язання задачі. Окремим файлом: воно вдесятеро довше за умову. */
  O.solution = function (p, cb) {
    if (!p || !p.dom) { cb(null); return; }
    if (sols[p.dom]) { cb(sols[p.dom][p.i] || ''); return; }

    get('sol-' + p.dom + '.json').then(function (map) {
      sols[p.dom] = map;
      cb(map[p.i] || '');
    }).catch(function (e) {
      console.warn('Розвʼязання:', e && e.message);
      cb(null);
    });
  };

  /* ============================================================
     Складність
     ============================================================

     У наборі складність — число від 1 до 10 за шкалою AoPS. Саме число
     репетиторові нічого не каже, тому перекладаємо його в рівень змагання,
     звичний тут: від шкільного етапу до міжнародної олімпіади. */

  O.LEVELS = [
    { id: 1, max: 2.5, name: 'Шкільний', hint: 'задачі шкільного етапу' },
    { id: 2, max: 4, name: 'Районний', hint: 'районний і міський етапи' },
    { id: 3, max: 5.5, name: 'Обласний', hint: 'обласний етап' },
    { id: 4, max: 7, name: 'Всеукраїнський', hint: 'рівень фінального етапу' },
    { id: 5, max: 99, name: 'Міжнародний', hint: 'IMO та відбори збірних' }
  ];

  O.level = function (d) {
    var n = Number(d) || 0;
    for (var i = 0; i < O.LEVELS.length; i++) if (n <= O.LEVELS[i].max) return O.LEVELS[i];
    return O.LEVELS[O.LEVELS.length - 1];
  };

  /** Людська назва змагання. */
  O.contest = function (key) {
    return (index && index.contests && index.contests[key]) ||
      String(key || '').replace(/_/g, ' ');
  };

  /** Мова набору, з якого задача: поки що всі англійською. */
  O.lang = function (p) {
    var set = index && index.sets && index.sets[String(p.i).slice(0, 2)];
    return (set && set.lang) || 'en';
  };

  O.sets = function () { return (index && index.sets) || {}; };

  window.Olymp = O;
})();
