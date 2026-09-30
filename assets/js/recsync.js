/* Обмін записами — кожним окремо. Як у Miro: людина нічого не зберігає й не
   синхронізує, воно просто є всюди.

   Кожен запис (учень, урок, оплата, домашка, налаштування) — окремий рядок
   на сервері. «Онови цього учня» фізично не може зачепити сусіднього, тож
   два пристрої, що правлять різне, не конфліктують узагалі. Правлять те
   саме — лишається пізніший запис, і лише в межах цього одного запису.

   Що змінилося, програма бачить сама: після кожного збереження порівнює
   відбитки записів із тими, що вже поїхали. Раніше зміну треба було
   назвати вручну, і все, що змінювали повз це (а таких місць назбиралось),
   лишалося тільки на одному пристрої.

   Інтерфейс ніколи не чекає на мережу. Запис спершу лягає в браузер, а
   сюди потрапляє позначка «це треба відправити». Немає інтернету —
   позначка чекає й переживає перезавантаження сторінки. Видалення на
   сервері — позначка, а не стирання: помилково видалене можна повернути. */

(function () {
  'use strict';

  var U = window.U, S = window.S;
  var R = {};

  /* Види записів. meta — усе поза списками: профіль репетитора, курс,
     інші налаштування; id рядка — назва поля в базі. Дошки тут не згадані:
     у них власний журнал дій (boardops.js). */
  R.KINDS = ['students', 'lessons', 'payments', 'homeworks', 'progress',
             'roadmap', 'desk', 'materials', 'notes', 'mathmap', 'stumap', 'meta'];

  var NOT_META = { boards: 1, version: 1 };

  /* Який набір видів бачив цей пристрій минулого разу. Щойно набір
     змінився, один раз читаємо все з початку: інакше рядки нового виду,
     записані до оновлення коду, лишилися б позаду назавжди. */
  var KINDS_KEY = 'mathhub.rec.kinds';

  var OUT = 'mathhub.rec.outbox';    // що не встигло поїхати: {"kind/id": 1|"del"}
  var SINCE = 'mathhub.rec.since';   // мітка часу останнього вдалого читання (час сервера)
  var DONE = 'mathhub.rec.migrated'; // чи перенесено початкові дані
  var HASH = 'mathhub.rec.hash';     // відбитки записів, що вже на сервері або в черзі
  var PUSH_DELAY = 1200;
  var PULL_MS = 15000;               // як часто дивитися, чи не змінилось щось деінде
  var OVERLAP_MS = 90000;            // дочитуємо трохи назад — на випадок розбіжності годинників

  var outbox = {};
  var since = null;
  var hashes = null;
  var timer = null;
  var sending = false;
  var started = false;
  var pullTimer = null;

  function kindsChanged() {
    try { return localStorage.getItem(KINDS_KEY) !== R.KINDS.join(','); } catch (e) { return false; }
  }

  function diskGet(k) { return window.Disk ? Disk.get(k) : localStorage.getItem(k); }
  function diskSet(k, v) { try { if (window.Disk) Disk.set(k, v); else localStorage.setItem(k, v); } catch (e) {} }

  function diskReady() { return !window.Disk || Disk.isReady(); }

  function loadState() {
    try { outbox = JSON.parse(localStorage.getItem(OUT) || '{}') || {}; } catch (e) { outbox = {}; }
    try { since = localStorage.getItem(SINCE) || null; } catch (e) { since = null; }
    loadHashes();
  }

  var hashesRead = false;
  function loadHashes() {
    if (hashesRead || !diskReady()) return;
    hashesRead = true;
    try { hashes = JSON.parse(diskGet(HASH) || 'null'); } catch (e) { hashes = null; }
  }

  /* Черга спільна для всіх вкладок цього браузера, а пам'ять у кожної своя.
     Досі кожна вкладка записувала свою чергу поверх чужої: видалення,
     зроблене в іншій вкладці без мережі, губилося, щойно ця щось зберігала.
     Тепер перед записом чуже невідправлене підхоплюється; своє відправлене
     (sentHere) — ні, інакше воно поверталось би в чергу вічно. Повторна
     відправка запису безпечна: сервер просто отримає те саме ще раз. */
  var sentHere = {};
  /* Перейняте від іншої вкладки. Щойно та вкладка своє відправила (ключа
     в спільній черзі вже немає), перейняте тут прибирається: інакше фонова
     вкладка годинами тримала б застаріле «видалено» й потім стерла б ним
     урок, який тим часом повернули (у шаблону номер уроку сталий). */
  var adopted = {};
  /* Цю зміну помітила сама вкладка (правка, злиття, перегляд змін) — вона
     вже своя, навіть якщо ключ колись було перейнято. Інакше, щойно інша
     вкладка відправила б свою версію, своя свіжа правка випала б із черги. */
  function own(key) {
    outbox[key] = 1;
    delete adopted[key];
  }
  function mergeStored() {
    var stored;
    try { stored = JSON.parse(localStorage.getItem(OUT) || '{}') || {}; } catch (e) { stored = {}; }
    Object.keys(adopted).forEach(function (k) {
      if (!(k in stored) || stored[k] !== adopted[k]) {
        if (outbox[k] === adopted[k]) delete outbox[k];
        delete adopted[k];
      }
    });
    Object.keys(stored).forEach(function (k) {
      if (!(k in outbox) && !sentHere[k]) { outbox[k] = stored[k]; adopted[k] = stored[k]; }
    });
  }

  function saveState() {
    try {
      mergeStored();
      sentHere = {};
      localStorage.setItem(OUT, JSON.stringify(outbox));
      if (since) localStorage.setItem(SINCE, since);
    } catch (e) { /* сховище повне — дані все одно в базі, черга відновиться */ }
  }

  /* Для панелі «Чи все ціле»: остання відмова сервера й відколи черга не
     порожніє. Досі відмова йшла лише в консоль, а панель казала «усе на
     сервері». */
  var lastErr = null, pendingSince = null;
  R.lastError = function () { return lastErr; };
  R.pendingSince = function () { return Object.keys(outbox).length ? pendingSince : null; };

  var hashTimer = null;
  function saveHashes() {
    if (hashTimer) return;
    hashTimer = setTimeout(function () {
      hashTimer = null;
      if (hashes) diskSet(HASH, JSON.stringify(hashes));
    }, 1000);
  }

  function ready() {
    return !!(window.Cloud && Cloud.available() && Cloud.signedIn() &&
      !(Cloud.writesBlocked && Cloud.writesBlocked()));
  }

  function device() {
    try { return navigator.platform || ''; } catch (e) { return ''; }
  }

  function fp(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h.toString(36) + ':' + str.length.toString(36);
  }

  function metaKeys(db) {
    return Object.keys(db).filter(function (k) {
      return !NOT_META[k] && R.KINDS.indexOf(k) < 0 && db[k] !== undefined;
    });
  }

  R.pending = function () { return Object.keys(outbox).length; };
  R.available = function () { return ready(); };

  /* ============================================================
     Черга
     ============================================================ */

  /** Запис змінився. */
  R.mark = function (kind, id) {
    if (!kind || !id || R.KINDS.indexOf(kind) < 0) return;
    own(kind + '/' + id);
    saveState();
    schedule();
  };

  /** Запис видалено. На сервері це позначка, а не стирання. */
  R.markDeleted = function (kind, id) {
    R.markDeletedMany([[kind, id]]);
  };

  /** Багато видалень — один запис черги (кожне окремо перезаписувало всю чергу). */
  R.markDeletedMany = function (list) {
    var any = false;
    (list || []).forEach(function (x) {
      var kind = x[0], id = x[1];
      if (!kind || !id || R.KINDS.indexOf(kind) < 0) return;
      outbox[kind + '/' + id] = 'del';
      delete adopted[kind + '/' + id];
      if (hashes) delete hashes[kind + '/' + id];
      any = true;
    });
    if (!any) return;
    if (hashes) saveHashes();
    saveState();
    schedule();
  };

  function schedule() {
    if (!ready()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = null; R.flush(); }, PUSH_DELAY);
  }

  /* ---------- що змінилося — бачимо самі ---------- */

  var lastScanned = null;
  var scanTimer = null;

  function scanSoon() {
    if (scanTimer) return;
    scanTimer = setTimeout(function () { scanTimer = null; R.scan(); }, 300);
  }

  /**
   * Порівняти кожен запис із тим, що вже поїхало, і поставити в чергу
   * змінене. Перший запуск лише запамʼятовує відбитки: усе, що є тут,
   * або вже на сервері, або й так у черзі.
   */
  R.scan = function () {
    var db = S.db();
    if (!db) return 0;
    // відбитки з минулого разу ще не прочитані — порівнювати нема з чим
    if (!diskReady()) { Disk.ready(scanSoon); return 0; }
    loadHashes();
    var doc = S.lastDoc ? S.lastDoc() : null;
    if (doc && doc === lastScanned) return 0;      // змінились лише дошки
    lastScanned = doc;

    var first = !hashes;
    if (first) hashes = {};
    var n = 0;

    function check(kind, id, data) {
      var key = kind + '/' + id;
      var h = fp(JSON.stringify(data));
      if (hashes[key] === h) return;
      hashes[key] = h;
      if (first) return;
      if (outbox[key] !== 'del') own(key);
      n++;
    }

    R.KINDS.forEach(function (kind) {
      if (kind === 'meta') {
        metaKeys(db).forEach(function (k) { check('meta', k, { v: db[k] }); });
        return;
      }
      (db[kind] || []).forEach(function (rec) { if (rec && rec.id) check(kind, rec.id, rec); });
    });

    saveHashes();
    if (n) { saveState(); schedule(); }
    return n;
  };

  /**
   * Базу щойно перечитали з диска — її змінила інша вкладка цього браузера.
   * Нове там належить тій вкладці: вона сама його відправить (її чергу ця
   * підхоплює, див. mergeStored). Тут лише запамʼятовуємо відбитки, щоб не
   * прийняти чуже за власну правку й не відправити його поверх свіжішого.
   * Своє невідправлене (є в черзі) не чіпаємо.
   */
  R.rebase = function () {
    var db = S.db();
    if (!db || !hashes) return;
    mergeStored();
    R.KINDS.forEach(function (kind) {
      if (kind === 'meta') {
        metaKeys(db).forEach(function (k) {
          if (!outbox['meta/' + k]) hashes['meta/' + k] = fp(JSON.stringify({ v: db[k] }));
        });
        return;
      }
      (db[kind] || []).forEach(function (rec) {
        if (rec && rec.id && !outbox[kind + '/' + rec.id]) hashes[kind + '/' + rec.id] = fp(JSON.stringify(rec));
      });
    });
    lastScanned = S.lastDoc ? S.lastDoc() : null;
    saveHashes();
  };

  /** Відправити все, що чекає. По одному: так зрозуміло, що саме не пройшло. */
  R.flush = function () {
    if (sending || !ready()) return Promise.resolve(0);
    mergeStored();                                // і те, що лишила інша вкладка
    var keys = Object.keys(outbox);
    if (!keys.length) { pendingSince = null; return Promise.resolve(0); }
    if (!pendingSince) pendingSince = Date.now();

    sending = true;
    var ok = 0, failed = 0;

    return keys.reduce(function (chain, key) {
      return chain.then(function () {
        var parts = key.split('/');
        var kind = parts[0], id = parts.slice(1).join('/');
        var op = outbox[key];

        if (op === 'del') {
          return call('delete_record', { p_kind: kind, p_id: id, p_device: device() })
            .then(function () {
              if (outbox[key] === 'del') { delete outbox[key]; sentHere[key] = 1; }
              ok++;
            });
        }

        var rec = findLocal(kind, id);
        if (!rec) { delete outbox[key]; sentHere[key] = 1; return; }   // зник локально — нема чого слати
        var sent = JSON.stringify(rec);

        return call('save_record', { p_kind: kind, p_id: id, p_data: rec, p_device: device() })
          .then(function () {
            // поки летіло, запис могли змінити ще раз — тоді він лишається в черзі
            var now = findLocal(kind, id);
            if (now && JSON.stringify(now) === sent) { delete outbox[key]; sentHere[key] = 1; }
            ok++;
          });
      }).catch(function (e) {
        // лишаємо в черзі: поїде при наступній нагоді
        failed++;
        lastErr = { at: Date.now(), key: key, msg: (e && e.message) || 'помилка' };
        console.warn('Запис не поїхав (' + key + '):', e && e.message);
      });
    }, Promise.resolve()).then(function () {
      sending = false;
      if (!failed) lastErr = null;
      if (!Object.keys(outbox).length) pendingSince = null;
      saveState();
      if (Object.keys(outbox).length) setTimeout(function () { if (ready()) R.flush(); }, 15000);
      return ok;
    }, function () {
      sending = false;
      saveState();
      return ok;
    });
  };

  function call(fn, body) {
    return Cloud.request('/rest/v1/rpc/' + fn, {
      method: 'POST', body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) throw new Error('Сервер відповів ' + res.status);
      return res.json();
    });
  }

  function findLocal(kind, id) {
    var db = S.db();
    if (kind === 'meta') {
      if (NOT_META[id] || R.KINDS.indexOf(id) >= 0 || db[id] === undefined) return null;
      return { v: db[id] };
    }
    var list = db[kind];
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ============================================================
     Читання
     ============================================================ */

  var pulling = null;

  /* Дії, яким потрібне свіже з сервера, а не те, з чим пристрій
     прокинувся. Насамперед — заповнення розкладу наперед: пристрій, що
     тиждень лежав, досі створював уроки за старими даними раніше, ніж
     бачив уже створені іншим пристроєм, — і в розкладі з'являлися двійники.
     Кожна дія виконується один раз, після першого вдалого читання. */
  var afterPull = [], pulledOnce = false;
  R.afterFirstPull = function (fn) {
    if (pulledOnce) { try { fn(); } catch (e) { console.warn('afterFirstPull:', e); } return; }
    afterPull.push(fn);
  };
  /** Чи записи тут уже звірені з сервером хоч раз після відкриття. */
  R.hasPulled = function () { return pulledOnce; };
  function firstPullDone() {
    if (pulledOnce) return;
    pulledOnce = true;
    afterPull.splice(0).forEach(function (fn) {
      try { fn(); } catch (e) { console.warn('afterFirstPull:', e); }
    });
  }

  /**
   * Забрати з сервера все, що змінилося після минулого разу.
   *
   * Своє відправляємо ПЕРЕД читанням: інакше свіжа локальна правка
   * перекрилася б старішою серверною, і виглядало б це як втрата.
   */
  R.pull = function (full) {
    if (!ready()) return Promise.resolve(0);
    if (pulling) return pulling;

    var path = '/rest/v1/records?select=kind,id,data,rev,deleted,updated_at&order=updated_at.asc,kind.asc,id.asc';
    if (!full && since) {
      var from = new Date(new Date(since).getTime() - OVERLAP_MS).toISOString();
      path += '&updated_at=gt.' + encodeURIComponent(from);
    }

    /* Сервер віддає не більше тисячі рядків за раз — тому сторінками.
       Інакше новий пристрій отримав би лише частину учнів і уроків.

       Наступна сторінка — «після останнього прочитаного рядка» (час, вид,
       номер), а не «пропусти тисячу». Досі було друге: якщо під час читання
       інший пристрій змінював запис із першої сторінки, той переїжджав у
       кінець, решта зсувалась на одну позицію, і один запис не читався
       зовсім — а мітка «прочитано до» вже стояла за ним. */
    var PAGE = 1000;
    function q(v) { return '"' + String(v).replace(/"/g, '\\"') + '"'; }
    function page(last, acc) {
      var url = path + '&limit=' + PAGE;
      if (last) {
        url += '&or=' + encodeURIComponent('(updated_at.gt.' + q(last.updated_at) +
          ',and(updated_at.eq.' + q(last.updated_at) + ',kind.gt.' + q(last.kind) + ')' +
          ',and(updated_at.eq.' + q(last.updated_at) + ',kind.eq.' + q(last.kind) + ',id.gt.' + q(last.id) + '))');
      }
      return Cloud.request(url, { method: 'GET' })
        .then(function (res) {
          if (!res.ok) throw new Error('Сервер відповів ' + res.status);
          return res.json();
        })
        .then(function (rows) {
          rows = rows || [];
          acc = acc.concat(rows);
          return rows.length < PAGE ? acc : page(rows[rows.length - 1], acc);
        });
    }

    R.scan();                                   // спершу помітити своє, щоб його не перекрило
    var ok = false;
    pulling = R.flush().then(function () {
      return page(null, []);
    }).then(function (rows) {
      ok = true;

      var changed = 0;
      var newest = since;
      var sawMeta = false;

      rows.forEach(function (row) {
        if (row.kind === 'meta') sawMeta = true;
        if (!newest || row.updated_at > newest) newest = row.updated_at;
        if (R.KINDS.indexOf(row.kind) < 0) return;
        // те, що зараз чекає в черзі, чіпати не можна: наше новіше
        if (outbox[row.kind + '/' + row.id]) return;
        if (apply(row)) changed++;
      });
      if (boardsToDrop.length) {
        var drop = boardsToDrop.splice(0);
        try { S.removeBoards(drop); } catch (e) { console.warn('removeBoards:', e); }
      }
      // зʼявились нові уроки чи справи — дошки, пропущені як сироти, можуть бути вже їхні
      if (changed && window.BoardSync && BoardSync.recheckOrphans) {
        setTimeout(function () { BoardSync.recheckOrphans(); }, 0);
      }

      /* Налаштування вперше їдуть окремими записами. Якщо сервер їх ще не
         має — наші стають першими. */
      if (full && !sawMeta) {
        metaKeys(S.db()).forEach(function (k) { own('meta/' + k); });
        schedule();
      }

      since = newest;
      if (full && transition()) { try { localStorage.setItem(V2, new Date().toISOString()); } catch (e) {} }
      saveState();
      saveHashes();
      if (Object.keys(outbox).length) schedule();
      if (full) { try { localStorage.setItem(KINDS_KEY, R.KINDS.join(',')); } catch (e) {} }
      if (changed) {
        /* Відбитки прийнятого вже збігаються, тож наступний перегляд не
           повезе його назад, а свої зміни, зроблені поки йшов запит, знайде. */
        S.save();
        if (window.App && App.render) {
          // відкриту дошку не перемальовуємо: записи її не стосуються
          try { if (!(window.V && V.boardMountedFor && V.boardMountedFor())) App.render(); } catch (e) {}
        }
      }
      return changed;
    }).catch(function (e) {
      console.warn('Записи не вдалося прочитати:', e && e.message);
      return 0;
    }).then(function (n) {
      pulling = null;
      if (ok) setTimeout(firstPullDone, 0);
      return n;
    });
    return pulling;
  };

  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  /* ---------- перехід зі старого обміну ----------
     Стара версія відправляла лише ті зміни, які їй назвали вручну. Дещо
     (фото розвʼязань від учня, частина позначок) лишалось тільки в цьому
     браузері. Тому при першому читанні тут запис не замінюється серверним,
     а зливається з ним: з обох беремо все, чого немає в іншому, а де
     значення різні — новіше. Потім злите їде на сервер. */
  var V2 = 'mathhub.rec.v2';
  function transition() { try { return !localStorage.getItem(V2); } catch (e) { return false; } }

  function union(a, b) {
    var out = a.slice();
    var keyOf = function (x) {
      if (x && typeof x === 'object') return x.id || x.key || JSON.stringify(x);
      return JSON.stringify(x);
    };
    var have = {};
    out.forEach(function (x) { have[keyOf(x)] = 1; });
    b.forEach(function (x) { if (!have[keyOf(x)]) { out.push(x); have[keyOf(x)] = 1; } });
    return out;
  }

  function mergeBoth(local, server, serverAt) {
    var localNewer = !!(local && local.updatedAt && serverAt && local.updatedAt > serverAt);
    var base = JSON.parse(JSON.stringify(localNewer ? local : server));
    var other = localNewer ? server : local;
    Object.keys(other || {}).forEach(function (k) {
      if (!(k in base)) base[k] = other[k];
      else if (Array.isArray(base[k]) && Array.isArray(other[k])) base[k] = union(base[k], other[k]);
    });
    return base;
  }

  /* Запис змінили тут, а перегляд змін ще не встиг його помітити (між
     збереженням і переглядом — частки секунди). Серверна версія старша за
     нашу — брати її не можна, а нашу треба відправити. */
  function dirtyHere(key, data) {
    if (!hashes || !(key in hashes) || data === undefined) return false;
    if (hashes[key] === fp(JSON.stringify(data))) return false;
    own(key);
    return true;
  }

  var boardsToDrop = [];
  function unsentBoard(id) {
    var O = window.BoardOps;
    if (O && O.unsent) return O.unsent(id);
    if (!O || !O.state) return false;
    var st = O.state(id) || {};
    return st.mode === 'queue' || st.mode === 'fail' || !!st.pending;
  }

  function apply(row) {
    var db = S.db();
    var key = row.kind + '/' + row.id;

    if (row.kind === 'meta') {
      if (NOT_META[row.id] || R.KINDS.indexOf(row.id) >= 0) return false;
      if (db[row.id] !== undefined && dirtyHere(key, { v: db[row.id] })) return false;
      var v = row.deleted || !row.data ? undefined : row.data.v;
      // перехід: налаштування теж зливаються, а не замінюються
      if (transition() && v && db[row.id] && typeof v === 'object' && typeof db[row.id] === 'object' &&
          !Array.isArray(v) && !same(db[row.id], v)) {
        v = mergeBoth(db[row.id], v, row.updated_at);
        if (!same(v, row.data.v)) own(key);
      }
      if (same(db[row.id], v)) {
        if (hashes) hashes[key] = fp(JSON.stringify({ v: db[row.id] }));
        return false;
      }
      if (v === undefined) delete db[row.id]; else db[row.id] = v;
      if (hashes) {
        if (v === undefined) delete hashes[key];
        else hashes[key] = fp(JSON.stringify({ v: db[row.id] }));
      }
      return true;
    }

    var list = db[row.kind];
    if (!Array.isArray(list)) return false;

    var i = -1;
    for (var k = 0; k < list.length; k++) if (list[k].id === row.id) { i = k; break; }

    if (i >= 0 && dirtyHere(key, list[i])) return false;

    if (row.deleted) {
      if (hashes) delete hashes[key];
      if (i < 0) return false;
      list.splice(i, 1);
      /* Урок чи справу видалили на іншому пристрої — їхня дошка йде
         разом із ними (усі разом, одним записом після читання). Досі вона
         лишалась тут назавжди сиротою. Але дошку з невідправленими діями
         не чіпаємо: намальоване тут ще не доїхало, і прибрати її — стерти
         роботу. Вона лишається тут, а дії поїдуть на сервер. */
      if ((row.kind === 'lessons' || row.kind === 'desk') && S.getBoard(row.id)) {
        if (unsentBoard(row.id)) console.warn('Урок видалено деінде, але на його дошці є невідправлене — дошку лишаю:', row.id);
        else boardsToDrop.push(row.id);
      }
      return true;
    }

    var rec = row.data;
    if (!rec || typeof rec !== 'object') return false;
    rec.id = row.id;
    if (i >= 0 && same(list[i], rec)) {
      if (hashes) hashes[key] = fp(JSON.stringify(list[i]));
      return false;
    }
    if (i >= 0 && transition()) {
      var merged = mergeBoth(list[i], rec, row.updated_at);
      merged.id = row.id;
      if (!same(merged, rec)) own(key);       // злите — новіше за серверне
      rec = merged;
    }
    if (i >= 0) list[i] = rec; else list.push(rec);
    if (hashes) hashes[key] = fp(JSON.stringify(rec));
    return true;
  }

  /* ============================================================
     Перенесення
     ============================================================ */

  /**
   * Одноразово перекласти те, що вже є локально, у таблицю записів — на
   * пристрої, який ще ніколи цього не робив.
   */
  R.migrate = function () {
    if (!ready()) return Promise.resolve(0);
    try { if (localStorage.getItem(DONE)) return Promise.resolve(0); } catch (e) {}

    var db = S.db();
    R.KINDS.forEach(function (kind) {
      if (kind === 'meta') return;                // налаштування — див. R.pull(full)
      (db[kind] || []).forEach(function (rec) {
        if (rec && rec.id) own(kind + '/' + rec.id);
      });
    });
    saveState();

    return R.flush().then(function (sent) {
      if (!R.pending()) {
        try { localStorage.setItem(DONE, new Date().toISOString()); } catch (e) {}
      }
      return sent;
    });
  };

  R.migrated = function () {
    try { return !!localStorage.getItem(DONE); } catch (e) { return false; }
  };

  /* ============================================================
     Зайві оплати
     ============================================================

     Стара версія, видаляючи урок, прибирала його оплату лише в браузері —
     на сервері вона лишалася. Перше повне читання новим способом
     повернуло такі оплати, і дохід за місяць виріс на гроші за уроки,
     яких уже немає. Так само бувають двійники: урок позначили оплаченим
     на двох пристроях раніше, ніж вони побачили одне одного.

     Прибираємо лише те, що за правилами програми існувати не мало:
       • оплату «за урок», чий урок видалено (на сервері він позначений
         видаленим, тут його немає);
       • другу й далі однакову оплату за той самий урок.
     На сервері це позначка «видалено», а не стирання: повернути можна. */

  function pagedIds(path) {
    var out = [];
    function page(offset) {
      return Cloud.request(path + '&limit=1000&offset=' + offset, { method: 'GET' })
        .then(function (res) {
          if (!res.ok) throw new Error('Сервер відповів ' + res.status);
          return res.json();
        })
        .then(function (rows) {
          rows = rows || [];
          out = out.concat(rows);
          return rows.length < 1000 ? out : page(offset + 1000);
        });
    }
    return page(0);
  }

  R.heal = function () {
    if (!ready()) return Promise.resolve(0);
    return pagedIds('/rest/v1/records?select=id&kind=eq.lessons&deleted=eq.true&order=id.asc')
      .then(function (rows) {
        var db = S.db();
        var gone = {};
        (rows || []).forEach(function (r) { gone[r.id] = 1; });
        var here = {};
        db.lessons.forEach(function (l) { here[l.id] = 1; });

        var kill = {};
        // оплати видалених уроків
        db.payments.forEach(function (p) {
          if (p && p.lessonId && gone[p.lessonId] && !here[p.lessonId]) kill[p.id] = 'урок видалено';
        });
        // двійники: та сама сума в тій самій валюті за той самий урок
        var seen = {};
        db.payments.slice().sort(function (a, b) {
          return String(a.createdAt || '') < String(b.createdAt || '') ? -1 : 1;
        }).forEach(function (p) {
          if (!p || !p.lessonId || kill[p.id]) return;
          var key = p.lessonId + '|' + Number(p.amount) + '|' + S.paymentCur(p);
          if (seen[key]) kill[p.id] = 'двійник';
          else seen[key] = 1;
        });

        var ids = Object.keys(kill);
        if (!ids.length) return 0;
        console.info('Прибрано зайвих оплат:', ids.length, ids.map(function (id) { return id + ' (' + kill[id] + ')'; }));
        db.payments = db.payments.filter(function (p) { return !kill[p.id]; });
        ids.forEach(function (id) { R.markDeleted('payments', id); });
        S.save();
        if (window.App && App.render) {
          try { if (!(window.V && V.boardMountedFor && V.boardMountedFor())) App.render(); } catch (e) {}
        }
        return ids.length;
      })
      .catch(function (e) {
        console.warn('Перевірка оплат не вдалася:', e && e.message);
        return 0;
      });
  };

  /* ============================================================
     Старт
     ============================================================ */

  function watch() {
    if (pullTimer) return;
    var tick = function () {
      pullTimer = setTimeout(function () {
        pullTimer = null;
        if (document.visibilityState !== 'hidden' && navigator.onLine && ready()) {
          R.pull().then(tick, tick);
        } else {
          tick();
        }
      }, PULL_MS);
    };
    tick();
  }

  R.start = function () {
    loadState();
    if (started) return;
    // запускаємось лише з входом, інакше вхід без перезавантаження нічого б не ввімкнув
    if (!ready()) return;
    started = true;

    if (hashes === null) R.scan();

    /* Перед першим читанням новим способом — копія всього, що є тут. Вона
       лежить у «Копіях у браузері» й дозволяє повернути будь-що самому. */
    var first = transition();
    if (first && window.Vault && Vault.available && Vault.available()) {
      try { Vault.put('перед переходом на новий обмін', S.exportJSON()); } catch (e) {}
    }

    /* Порядок важливий: спершу віддати своє, потім перенести те, чого на
       сервері ще немає, і лише тоді забирати чуже. */
    R.flush()
      .then(function () { return R.migrate(); })
      .then(function () { return R.pull(!since || kindsChanged() || first); })
      .then(function () { return R.heal(); })
      .then(watch, watch);

    window.addEventListener('online', function () { R.flush(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') R.pull();
      else R.flush();
    });
  };

  loadState();
  if (S.onSave) S.onSave(scanSoon);

  window.RecSync = R;
})();
