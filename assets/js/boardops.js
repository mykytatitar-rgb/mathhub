/* Дошки — як у Miro.

   Правда про дошку — журнал дій на сервері (таблиця board_ops): «додано
   лінію», «пересунуто фігуру», «стерто картинку», «переставлено слайд».
   Журнал лише дописується, і кожна дія називає свій обʼєкт.

   Кожен пристрій тримає біля дошки три речі (поле _sync):
     base — дошку такою, якою її знає сервер: знімок плюс усі прочитані
            дії журналу по порядку, свої теж;
     fly  — свої дії, які вже лягли в журнал, але ще не повернулися при
            читанні;
     сама дошка — base + fly + те, що намальовано тут і ще не поїхало.

   Відправити — порахувати різницю між (base + fly) і дошкою й дописати її
   в журнал. Прочитати — накласти нові дії на base, а своє невідправлене
   покласти зверху. Дошка ніколи не перезаписується цілком ні в який бік.
   Тому ні давній пристрій, ні інша вкладка, ні учень не можуть стерти
   чуже: хто записав пізніше, того й правда — але лише щодо того самого
   обʼєкта.

   Знімок у таблиці boards — тільки прискорення. З нього починає новий
   пристрій і сторінка учня, а далі дочитують журнал. Знімок знає, до якої
   дії він дійшов (_seen), і складається лише з того, що лежить на сервері
   (попередній знімок + журнал), а не з памʼяті пристрою: інакше одна
   помилка в тій памʼяті розходилася б на всі інші пристрої.

   Звірка (O.verify) раз у раз перевіряє, чи памʼять пристрою про сервер
   ще правдива, і зводить розбіжності докупи, нічого не стираючи.

   Людина нічого з цього не бачить і нічого не натискає. */

(function () {
  'use strict';

  var U = window.U, S = window.S;
  var O = {};
  function K() { return window.BoardCore; }

  var CLIENT_KEY = 'mathhub.client';
  var KEPT = 'mathhub.ops.kept';          // {slideId: 1} — слайди, повернуті вручну
  var LEGACY_BASE = 'mathhub.ops.base';   // стара копія «відомого серверу» — для переходу
  var PENDING = 'mathhub.boards.pending'; // {boardId: 1} — можливо, щось не поїхало

  var BATCH = 150;            // дій за один запис
  var SNAP_MS = 20000;        // знімок дошки — не частіше ніж раз на 20 с
  var OVERLAP_MS = 20000;     // дочитуємо трохи назад: дії, що зʼявились у базі із запізненням
  var RECENT = 1500;          // скільки номерів прочитаних дій памʼятати для цього
  var RETRY_MS = 15000;

  /* ============================================================
     Дрібне
     ============================================================ */

  var client = (function () {
    var id = null;
    try { id = localStorage.getItem(CLIENT_KEY); } catch (e) {}
    if (!id) {
      id = 'c' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      try { localStorage.setItem(CLIENT_KEY, id); } catch (e) {}
    }
    return id;
  })();
  O.client = client;

  function ready() {
    return !!(window.Cloud && Cloud.available() && Cloud.signedIn() &&
      !(Cloud.writesBlocked && Cloud.writesBlocked()));
  }
  O.ready = ready;

  function why() {
    if (!window.Cloud || !Cloud.available()) return 'Синхронізація не налаштована';
    if (!Cloud.signedIn()) return 'Немає входу';
    if (Cloud.writesBlocked && Cloud.writesBlocked()) return 'Запис на сервер тимчасово зупинено';
    if (!navigator.onLine) return 'Немає інтернету';
    return '';
  }
  O.why = why;

  function enc(s) { return encodeURIComponent(s); }

  function device() {
    try { return (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || ''; }
    catch (e) { return ''; }
  }

  function req(path, opts) {
    return Cloud.request(path, opts || { method: 'GET' }).then(function (res) {
      if (!res.ok) {
        var e = new Error('Сервер відповів ' + res.status);
        e.status = res.status;
        throw e;
      }
      return res.status === 204 ? null : res.json();
    });
  }

  function byId(list) {
    var m = {};
    (list || []).forEach(function (x) { if (x && x.id) m[x.id] = x; });
    return m;
  }

  var kept = null;
  function keptMap() {
    if (!kept) {
      try { kept = JSON.parse(localStorage.getItem(KEPT) || '{}') || {}; } catch (e) { kept = {}; }
    }
    return kept;
  }
  function saveKept() { try { localStorage.setItem(KEPT, JSON.stringify(keptMap())); } catch (e) {} }

  /**
   * Слайд, який людина свідомо повернула з журналу. У журналі лишається й
   * та дія, якою слайд колись зник; при першому читанні цієї дошки на
   * новому пристрої вона не має забрати його вдруге.
   */
  O.keep = function (slideId) { if (slideId) { keptMap()[slideId] = 1; saveKept(); } };
  O.unkeep = function (slideId) { if (slideId) { delete keptMap()[slideId]; saveKept(); } };

  var legacy;
  function legacyBase(id) {
    if (legacy === undefined) {
      try {
        legacy = JSON.parse((window.Disk ? Disk.get(LEGACY_BASE) : localStorage.getItem(LEGACY_BASE)) || '{}') || {};
      } catch (e) { legacy = {}; }
    }
    var raw = legacy[id];
    if (!raw) return null;
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return null; }
  }

  /* ---------- стан для інтерфейсу ---------- */

  var pending = {};
  try { pending = JSON.parse(localStorage.getItem(PENDING) || '{}') || {}; } catch (e) { pending = {}; }
  function savePending() { try { localStorage.setItem(PENDING, JSON.stringify(pending)); } catch (e) {} }

  var errs = {};        // {boardId: чому не поїхала}
  var sentAt = {};      // {boardId: коли сервер востаннє прийняв}
  var busy = {};        // {boardId: true} — іде обмін
  var watchers = [];

  O.onChange = function (fn) {
    watchers.push(fn);
    return function () {
      var i = watchers.indexOf(fn);
      if (i >= 0) watchers.splice(i, 1);
    };
  };
  function notify(id) {
    watchers.forEach(function (fn) { try { fn(id); } catch (e) { console.warn('BoardOps.onChange:', e); } });
  }

  function setPending(id, on) {
    if (on) { if (!pending[id]) { pending[id] = 1; savePending(); } }
    else if (pending[id]) { delete pending[id]; savePending(); }
  }

  /** Стан однієї дошки — для тихого напису, який зʼявляється лише коли щось довго не так. */
  O.state = function (id) {
    var stop = why();
    if (stop && stop !== 'Немає інтернету') return { mode: 'local', why: stop, pending: !!pending[id] };
    if (busy[id]) return { mode: 'queue', why: 'Відправляю…' };
    if (pending[id]) {
      if (!navigator.onLine) return { mode: 'queue', why: 'Немає інтернету' };
      return errs[id] ? { mode: 'fail', why: errs[id] } : { mode: 'queue', why: 'Чекає на відправку' };
    }
    if (sentAt[id]) return { mode: 'sent', at: sentAt[id] };
    return { mode: 'idle' };
  };

  O.stats = function () {
    return {
      pending: Object.keys(pending).length,
      failed: Object.keys(errs).length,
      ids: Object.keys(pending),
      why: why()
    };
  };

  /* ---------- черга на кожну дошку ----------
     Читання й запис однієї дошки не йдуть одночасно: інакше свою щойно
     записану дію можна було б прочитати раніше, ніж вона ляже в fly, і
     порахувати двічі. */
  var locks = {};
  function lock(id, fn) {
    var prev = locks[id] || Promise.resolve();
    var run = prev.then(fn, fn);
    locks[id] = run.then(function () {}, function () {});
    return run;
  }

  /* ---------- запис на диск ---------- */

  /* На диск — лише ті дошки, що змінились (id); без id — усі. Раніше
     переписувались усі дошки разом, і після кожного штриха все завмирало. */
  var saveTimer = null;
  var touched = {}, touchedAll = false;
  function touch(id) { if (id) touched[id] = 1; else touchedAll = true; }
  function flushTouch() {
    if (touchedAll) S.touchBoards();
    else Object.keys(touched).forEach(function (id) { S.touchBoards(id); });
    touched = {};
    touchedAll = false;
  }
  function persistSoon(id) {
    touch(id);
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      flushTouch();
      S.save();
    }, 800);
  }
  function persistNow(id) {
    touch(id);
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    flushTouch();
    S.save();
  }

  /* ============================================================
     Стан дошки
     ============================================================ */

  function sync(board) { return board && board._sync; }
  function established(board) { var s = sync(board); return !!(s && s.base); }

  /** Дошка, якою її знає сервер, разом із власними діями, що вже в дорозі. */
  function known(board) {
    var s = board._sync;
    var k = K().clone(s.base);
    (s.fly || []).forEach(function (op) { K().apply(k, op); });
    return k;
  }

  /**
   * Підготувати дошку до обміну.
   *
   * Якщо дошка ще ніколи не мінялася новим способом, запамʼятовуємо, від
   * чого відраховувати її зміни (ref). Далі все, що від нього відрізняється,
   * — наше і поїде на сервер. Стара копія «відомого серверу» точніша за
   * саму дошку, тому, якщо вона є, беремо її.
   */
  O.prepare = function (board) {
    if (!board) return false;
    var touched = S.ensureItemIds ? S.ensureItemIds(board) : false;
    if (board._sync) return touched;
    var lg = legacyBase(board.lessonId);
    board._sync = { v: 2, ref: lg ? K().strip(lg) : K().strip(board), fly: [], seen: 0 };
    return true;
  };

  /**
   * Покласти новий вміст у ту саму дошку.
   *
   * Обʼєкти, що не змінилися, лишаються тими самими: рушій тримає на них
   * посилання (виділення, поточний слайд), і підміна кожного дрібного
   * обʼєкта заради одного чужого штриха збивала б роботу під рукою.
   */
  function putContent(board, fresh) {
    var k = K();
    var before = JSON.stringify(k.strip(board));
    if (before === JSON.stringify(k.strip(fresh))) return false;

    // відкрита дошка має знати, що зараз ляже чуже, — для «кроку назад»
    if (O.view && O.view.id === board.lessonId && O.view.before) {
      try { O.view.before(); } catch (e) { console.warn('view.before:', e); }
    }

    Object.keys(board).forEach(function (key) {
      if (key !== 'slides' && k.isProp(key) && !(key in fresh)) delete board[key];
    });
    Object.keys(fresh).forEach(function (key) {
      if (key !== 'slides' && k.isProp(key)) board[key] = fresh[key];
    });

    var old = byId(board.slides);
    board.slides = (fresh.slides || []).map(function (fs) {
      var o = old[fs.id];
      if (!o) return fs;
      Object.keys(o).forEach(function (key) { if (key !== 'items' && !(key in fs)) delete o[key]; });
      Object.keys(fs).forEach(function (key) { if (key !== 'items') o[key] = fs[key]; });
      var oi = byId(o.items);
      o.items = (fs.items || []).map(function (it) {
        var was = it && it.id ? oi[it.id] : null;
        return was && JSON.stringify(was) === JSON.stringify(it) ? was : it;
      });
      return o;
    });
    if (!board.slides.length) board.slides.push(S.newSlide());

    return JSON.stringify(k.strip(board)) !== before;
  }

  /**
   * Накласти своє невідправлене на свіжий стан.
   *
   * Якщо деінде видалили слайд, на якому тут саме щось малювали, своє не
   * пропадає: слайд повертається таким, як він є тут, і поїде на сервер.
   * Малювання важливіше за видалення — видалити можна ще раз, а
   * намальоване вдруге не зʼявиться.
   */
  function overlay(fresh, loc, board, sent) {
    var k = K();
    loc.forEach(function (op) { k.apply(fresh, op); });
    // і те, що вже поїхало, але лягло на слайд, якого тим часом не стало
    var need = {};
    loc.concat(sent || []).forEach(function (op) {
      if (op.s && (op.t === 'i+' || op.t === 'i~' || op.t === 'io' || op.t === 's~')) need[op.s] = 1;
    });
    var have = byId(fresh.slides);
    (board.slides || []).forEach(function (sl, i) {
      if (!sl || !need[sl.id] || have[sl.id]) return;
      fresh.slides.splice(Math.min(i, fresh.slides.length), 0, k.clone(sl));
    });
    return fresh;
  }

  /** Хто власник обʼєкта: true — учень, false — репетитор, null — такого немає. */
  function ownedIn(board) {
    return function (id) {
      var found = null;
      (board.slides || []).some(function (sl) {
        return (sl.items || []).some(function (it) {
          if (it && it.id === id) { found = it.by === 'student'; return true; }
          return false;
        });
      });
      return found;
    };
  }

  /** Накласти одну дію журналу на стан, який знає сервер. */
  function fold(state, row) {
    var op = row.op;
    if (!op) return false;
    if (row.author === 'student' && !K().studentAllowed(op, ownedIn(state))) {
      console.warn('Відкинуто дію учня над чужим обʼєктом:', op.t);
      return false;
    }
    if (op.t === 's-' && keptMap()[op.s]) return false;   // слайд повернули вручну
    K().apply(state, op);
    return true;
  }

  /* ============================================================
     Мережа
     ============================================================ */

  function fetchSnapshot(id) {
    return req('/rest/v1/boards?select=rev,data,updated_at&board_id=eq.' + enc(id))
      .then(function (rows) { return rows && rows[0] ? rows[0] : null; });
  }

  /**
   * Дії після номера after — і ще ті, що після floor зʼявились у базі за
   * останні секунди (див. OVERLAP_MS). Нижче floor не дивимось ніколи: усе
   * до нього вже є в стані, і повтор старої дії відкотив би новіше.
   */
  function fetchOps(id, after, overlapFrom, floor) {
    var out = [];
    function page(from, first) {
      var q = '/rest/v1/board_ops?select=id,op,author,at&board=eq.' + enc(id) +
              '&order=id.asc&limit=1000';
      if (first && overlapFrom && (floor || 0) < from) {
        q += '&or=(id.gt.' + from + ',and(id.gt.' + (floor || 0) + ',at.gt.' + enc(overlapFrom) + '))';
      } else {
        q += '&id=gt.' + from;
      }
      return req(q).then(function (rows) {
        rows = rows || [];
        out = out.concat(rows);
        if (rows.length < 1000) return out;
        var last = rows[rows.length - 1].id;
        return page(Math.max(last, from), false);
      });
    }
    return page(after || 0, true);
  }

  /** Номери всього, що колись стерли, — до номера upTo включно. */
  function fetchDeleted(id, upTo) {
    var out = [];
    function page(from) {
      return req('/rest/v1/board_ops?select=id,op&board=eq.' + enc(id) +
                 '&id=gt.' + from + '&id=lte.' + upTo +
                 '&op->>t=in.(%22i-%22,%22s-%22)&order=id.asc&limit=1000')
        .then(function (rows) {
          rows = rows || [];
          out = out.concat(rows);
          return rows.length < 1000 ? out : page(rows[rows.length - 1].id);
        });
    }
    return page(0);
  }

  var MATURE_MS = 30000;      // дії молодші за це в знімок не йдуть: запис бази міг ще не завершитись

  /**
   * Дошка такою, якою її знає сервер: знімок і дії журналу після нього.
   * mature — лише дії, старші за MATURE_MS: для знімка, щоб
   * запис бази, видимий із запізненням, не опинився позаду його _seen.
   */
  function serverTruth(id, mature) {
    var k = K(), row = null, T, from = 0;
    return fetchSnapshot(id).then(function (r) {
      row = r;
      T = r && r.data ? k.strip(r.data) : { slides: [] };
      from = r && r.data && r.data._seen ? Number(r.data._seen) || 0 : 0;
      return fetchOps(id, from, null);
    }).then(function (rows) {
      var last = from;
      // від годинника пристрою: якщо він відстає, дії просто дозрівають пізніше
      var cut = mature ? Date.now() - MATURE_MS : null;
      var used = [];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (cut !== null && (Date.parse(r.at || '') || 0) > cut) break;
        fold(T, r);
        used.push(r);
        if (r.id > last) last = r.id;
      }
      return { T: T, rows: used, from: from, last: last, row: row };
    });
  }

  function appendOps(id, ops, onChunk) {
    var chunks = [];
    for (var i = 0; i < ops.length; i += BATCH) chunks.push(ops.slice(i, i + BATCH));
    return chunks.reduce(function (p, chunk) {
      return p.then(function () {
        return req('/rest/v1/rpc/append_board_ops', {
          method: 'POST',
          body: JSON.stringify({ p_board: id, p_ops: chunk })
        }).then(function (lastId) { onChunk(chunk, Number(lastId) || 0); });
      });
    }, Promise.resolve());
  }

  /* ============================================================
     Перше знайомство дошки з журналом
     ============================================================

     Один раз на дошку на кожному пристрої. Сервер знає одне (знімок і
     журнал), пристрій — своє (ref і те, що намалювали після нього).
     Складаємо так, щоб не загубилося ні те, ні те:
       • усе, що є на сервері, — лишається;
       • усе, що є тут і чого сервер не знає, — додається й поїде туди;
       • стерте на сервері не воскресає, якщо тут його не змінювали. */

  function establish(board) {
    var id = board.lessonId, k = K();
    var s = board._sync || {};
    var row = null, T, from = 0, last = 0, atSeen = null;
    var delItems = {}, delSlides = {};

    function noteDeleted(op) {
      if (!op) return;
      if (op.t === 'i-') (op.ids || []).forEach(function (x) { delItems[x] = 1; });
      if (op.t === 's-' && op.s) delSlides[op.s] = 1;
    }

    return fetchSnapshot(id).then(function (r) {
      row = r;
      T = row && row.data ? k.strip(row.data) : { slides: [] };
      from = row && row.data && row.data._seen ? Number(row.data._seen) || 0 : 0;
      return fetchOps(id, from, null);
    }).then(function (rows) {
      last = from;
      rows.forEach(function (r) {
        if (fold(T, r)) noteDeleted(r.op);
        if (r.id > last) last = r.id;
        if (r.at && (!atSeen || r.at > atSeen)) atSeen = r.at;
      });
      s.recent = rows.slice(-RECENT).map(function (r) { return r.id; });
      s.floor = rows.length > RECENT ? rows[rows.length - RECENT - 1].id : from;
      return from > 0 ? fetchDeleted(id, from) : [];
    }).then(function (older) {
      (older || []).forEach(function (r) { noteDeleted(r.op); });

      var R = s.ref || { slides: [] };
      var B = k.strip(board);
      var loc = k.diff(R, B);                  // що змінили тут після ref

      /* Те, що є тут і чого сервер не знає. */
      var add = [];
      var tS = byId(T.slides), bS = byId(B.slides);
      (R.slides || []).forEach(function (rs, i) {
        if (!rs || !rs.id || delSlides[rs.id]) return;
        var ts = tS[rs.id];
        if (!ts) {
          var bs = bS[rs.id];
          /* Порожній слайд, створений тут автоматично, у повну дошку з
             іншого пристрою не несемо — інакше в ній з'являвся б зайвий. */
          var worth = !T.slides.length || (rs.items || []).length ||
            (bs && (bs.items || []).length) || rs.title || (bs && bs.title);
          if (!worth) return;
          var sl = k.clone(rs);
          sl.items = (sl.items || []).filter(function (it) { return !(it && it.id && delItems[it.id]); });
          add.push({ t: 's+', sl: sl, i: i });
          return;
        }
        var have = byId(ts.items);
        (rs.items || []).forEach(function (it, j) {
          if (!it || !it.id || have[it.id] || delItems[it.id]) return;
          add.push({ t: 'i+', s: rs.id, it: k.clone(it), at: j });
        });
      });
      var p = {}, pn = 0;
      Object.keys(R).forEach(function (key) {
        if (key !== 'slides' && k.isProp(key) && !(key in T)) { p[key] = R[key]; pn++; }
      });
      if (pn) add.push({ t: 'b~', p: p });

      var fresh = k.clone(T);
      add.forEach(function (op) { k.apply(fresh, op); });
      overlay(fresh, loc, B);

      board._sync = {
        v: 2, base: T, seen: last, fly: [], recent: s.recent || [], floor: s.floor || 0,
        atSeen: atSeen, snapRev: row ? row.rev : 0, snapSeen: from, snapAt: 0
      };
      if (putContent(board, fresh)) persistNow(id); else persistSoon(id);
      return true;
    });
  }

  /* ============================================================
     Читання
     ============================================================ */

  function pullNow(board) {
    var id = board.lessonId, k = K(), s = board._sync;
    s.recent = s.recent || [];
    s.fly = s.fly || [];
    var overlapFrom = s.atSeen
      ? new Date(new Date(s.atSeen).getTime() - OVERLAP_MS).toISOString() : null;

    return fetchOps(id, s.seen || 0, overlapFrom, s.floor || 0).then(function (rows) {
      var recent = {};
      (s.recent || []).forEach(function (x) { recent[x] = 1; });
      rows = rows.filter(function (r) { return r.id > (s.floor || 0) && !recent[r.id]; });
      if (!rows.length) return 0;

      var before = known(board);
      var loc = k.diff(before, k.strip(board));      // тут намальоване й ще не відправлене
      var sent = s.fly.slice();                      // своє, що вже в дорозі

      rows.forEach(function (r) {
        s.recent.push(r.id);
        if (r.id > (s.seen || 0)) s.seen = r.id;
        if (r.at && (!s.atSeen || r.at > s.atSeen)) s.atSeen = r.at;
        fold(s.base, r);
        if (r.op && r.op.u) s.fly = s.fly.filter(function (f) { return f.u !== r.op.u; });
      });
      if (s.recent.length > RECENT) {
        // забуті номери опускаються нижче floor — до них більше не повертаємось
        var cut = s.recent.length - RECENT;
        for (var c = 0; c < cut; c++) if (s.recent[c] > (s.floor || 0)) s.floor = s.recent[c];
        s.recent = s.recent.slice(cut);
      }
      // запобіжник: дія, чий номер уже позаду, точно прочитана
      s.fly = s.fly.filter(function (f) { return !(f._upto && s.seen >= f._upto); });

      var fresh = overlay(known(board), loc, k.strip(board), sent);
      var changed = putContent(board, fresh);
      if (changed) persistNow(id); else persistSoon(id);

      // тут лишилось своє, чого сервер ще не має (зокрема повернений слайд) — везти
      if (k.diff(known(board), k.strip(board)).length) sendSoon(id);
      return changed ? 1 : 0;
    });
  }

  /* Відкрита дошка: посеред штриха її не чіпаємо, інакше лінія обірвалась би
     під рукою. Сторінка дошки каже, коли можна, і що перемалювати після. */
  O.view = null;     // { id, busy(): bool, refresh(): void }

  function viewBusy(id) {
    try { return !!(O.view && O.view.id === id && O.view.busy && O.view.busy()); }
    catch (e) { return false; }
  }

  var later = {};
  function pullLater(id) {
    if (later[id]) return;
    later[id] = setTimeout(function () { later[id] = null; O.pull(id); }, 500);
  }

  /**
   * Забрати з журналу все нове й показати. Повертає кількість змін (0 — нічого).
   */
  O.pull = function (boardId, board) {
    board = board || S.getBoard(boardId);
    if (!ready() || !boardId || !board) return Promise.resolve(0);
    if (viewBusy(boardId)) { pullLater(boardId); return Promise.resolve(0); }
    if (O.prepare(board)) persistSoon(boardId);

    return lock(boardId, function () {
      if (viewBusy(boardId)) { pullLater(boardId); return 0; }
      if (!established(board)) return establish(board).then(function () { return 1; });
      return pullNow(board);
    }).then(function (n) {
      if (n && O.view && O.view.id === boardId && O.view.refresh) {
        try { O.view.refresh(); } catch (e) { console.warn('refresh:', e); }
      }
      snapshotSoon(board);
      return n;
    }, function (e) {
      console.warn('Дошку не вдалося прочитати:', boardId, e && e.message);
      return 0;
    });
  };

  /* ============================================================
     Запис
     ============================================================ */

  function recordNow(board) {
    var id = board.lessonId, k = K(), s = board._sync;
    var ops = k.diff(known(board), k.strip(board));
    if (!ops.length) { setPending(id, false); delete errs[id]; return Promise.resolve(0); }

    /* Запобіжник від кола: та сама різниця щойно вже їздила, а стан так і
       не зійшовся (дія чомусь не лягає). Слати її щосекунди нема сенсу —
       вона лишається тут і поїде з наступною справжньою зміною. */
    var sig = JSON.stringify(ops);
    if (s.lastSig === sig && Date.now() - (s.lastSigAt || 0) < 60000) {
      console.warn('Дошка: та сама різниця не лягає на сервер, пауза', id);
      return Promise.resolve(0);
    }
    ops.forEach(function (op) { op.u = U.uid('o'); op.c = client; });

    /* Живий канал отримує різницю одразу: учень бачить штрих у ту ж мить.
       Отримати ту саму дію двічі безпечно — вона називає свій обʼєкт. */
    if (O.onDiff) { try { O.onDiff(id, ops); } catch (e) { console.warn('onDiff:', e); } }

    var upto = 0;
    return appendOps(id, ops, function (chunk, lastId) {
      if (lastId > upto) upto = lastId;
      chunk.forEach(function (op) {
        var f = k.clone(op);
        f._upto = lastId;
        s.fly.push(f);
      });
      persistSoon(id);
    }).then(function () {
      s.lastSig = sig;                    // лише те, що справді поїхало
      s.lastSigAt = Date.now();
      delete errs[id];
      sentAt[id] = Date.now();
      setPending(id, false);
      /* Сервер прийняв — тепер і лише тепер можна сказати іншим пристроям
         «забирайте»: раніше вони питали сервер, поки запис ще йшов, нічого
         не знаходили й чекали наступної перевірки. */
      if (O.onSaved) { try { O.onSaved(id, upto); } catch (e) { console.warn('onSaved:', e); } }
      return ops.length;
    });
  }

  var sendTimers = {};
  function sendSoon(id) {
    setPending(id, true);
    if (sendTimers[id]) return;
    sendTimers[id] = setTimeout(function () { sendTimers[id] = null; O.record(id); }, 300);
  }

  var retryTimer = null;
  function scheduleRetry() {
    if (retryTimer || !Object.keys(pending).length) return;
    retryTimer = setTimeout(function () {
      retryTimer = null;
      if (ready() && navigator.onLine) O.flush();
      scheduleRetry();
    }, RETRY_MS);
  }

  /**
   * Відправити зміни дошки. Повертає скільки дій поїхало; 0 — нічого нового
   * або не вийшло (тоді дошка лишається в черзі й повториться сама).
   */
  O.record = function (boardId, board) {
    board = board || S.getBoard(boardId);
    if (!boardId || !board) return Promise.resolve(0);
    O.prepare(board);
    setPending(boardId, true);
    if (!ready()) { notify(boardId); scheduleRetry(); return Promise.resolve(0); }

    busy[boardId] = true;
    notify(boardId);
    var fresh = false;
    return lock(boardId, function () {
      fresh = !established(board);
      var first = fresh ? establish(board) : Promise.resolve();
      return first.then(function () { return recordNow(board); });
    }).then(function (n) {
      busy[boardId] = false;
      notify(boardId);
      // знайомство з журналом могло додати на дошку те, що було на сервері
      if (fresh && O.view && O.view.id === boardId && O.view.refresh) {
        try { O.view.refresh(); } catch (e) { console.warn('refresh:', e); }
      }
      // свої дії мають повернутися з журналу — тоді дошка й сервер збігаються
      if (n) O.pull(boardId, board);
      return n;
    }, function (e) {
      busy[boardId] = false;
      errs[boardId] = (e && e.message) || 'сервер не відповів';
      console.warn('Дошка не відправилась:', boardId, errs[boardId]);
      notify(boardId);
      scheduleRetry();
      return 0;
    });
  };

  /** Усе, що чекає в черзі. */
  O.flush = function () {
    if (!ready()) return Promise.resolve(0);
    var ids = Object.keys(pending);
    var done = 0;
    return ids.reduce(function (chain, id) {
      return chain.then(function () {
        if (!S.getBoard(id)) { setPending(id, false); return; }
        return O.record(id).then(function (n) { if (n) done++; });
      });
    }, Promise.resolve()).then(function () { return done; });
  };

  /* ============================================================
     Знімок дошки на сервері
     ============================================================ */

  var snapTimers = {};

  function snapshotSoon(board, force) {
    var s = sync(board);
    if (!s || !s.base || !ready()) return;
    if ((s.seen || 0) <= (s.snapSeen || 0)) return;          // знімок і так свіжий
    var id = board.lessonId;
    var wait = force ? 0 : SNAP_MS - (Date.now() - (s.snapAt || 0));
    if (wait > 0) {
      if (!snapTimers[id]) {
        snapTimers[id] = setTimeout(function () {
          snapTimers[id] = null;
          var b = S.getBoard(id);
          if (b) snapshotSoon(b);
        }, wait + 50);
      }
      return;
    }
    return lock(id, function () { return writeSnapshot(board, false); })
      .catch(function (e) { console.warn('Знімок дошки не записався:', id, e && e.message); });
  }

  /* Знімок — попередній знімок плюс журнал після нього, і нічого з памʼяті
     пристрою. Раніше писався base пристрою: якщо та памʼять колись розійшлася
     з журналом, знімок переносив розбіжність на кожен новий пристрій і на
     сторінку учня. */
  function writeSnapshot(board, retried) {
    var s = board._sync;
    if (!s || !s.base) return Promise.resolve(false);

    return serverTruth(board.lessonId, true).then(function (res) {
      if (res.last <= res.from) {                 // нового після знімка немає
        if (res.row) { s.snapRev = res.row.rev; s.snapSeen = res.from; }
        s.snapAt = Date.now();
        return false;
      }
      var data = res.T;
      data.id = board.id;
      data.lessonId = board.lessonId;
      if (board.createdAt) data.createdAt = board.createdAt;
      data._seen = res.last;

      return req('/rest/v1/rpc/save_board', {
        method: 'POST',
        body: JSON.stringify({
          p_board: board.lessonId, p_rev: res.row ? res.row.rev : 0, p_data: data,
          p_device: device(), p_force: true
        })
      }).then(function (rev) {
        rev = Number(rev);
        if (rev === -1) return retried ? false : writeSnapshot(board, true);   // хтось записав між читанням і записом
        if (rev > 0) {
          s.snapRev = rev;
          s.snapSeen = data._seen;
          s.snapAt = Date.now();
          persistSoon(board.lessonId);
          return true;
        }
        return false;
      });
    });
  }

  /** Дошку закривають: усе своє — в журнал, свіжий знімок — на сервер. */
  O.leave = function (boardId) {
    var board = S.getBoard(boardId);
    if (!board || !ready()) return Promise.resolve();
    return O.record(boardId, board).then(function () {
      return O.pull(boardId, board);
    }).then(function () {
      return O.verify(boardId);
    }).then(function () {
      return snapshotSoon(board, true);
    });
  };

  /* ============================================================
     Дошки, яких тут ще немає
     ============================================================ */

  /**
   * Забрати з сервера дошки, яких на цьому пристрої немає зовсім, і
   * освіжити ті, що змінювались деінде. Новий пристрій після входу
   * бачить усе одразу.
   */
  O.fetchMissing = function () {
    if (!ready()) return Promise.resolve({ added: 0, stale: [] });
    return req('/rest/v1/boards?select=board_id,rev,updated_at').then(function (rows) {
      var local = {};
      (S.db().boards || []).forEach(function (b) { local[b.lessonId] = b; });

      /* Дошка без уроку й без справи — сирота: власника видалили (можливо,
         на іншому пристрої чи без мережі). Таку не везти. Судити можна лише
         тоді, коли записи вже звірені з сервером — інакше новий пристрій,
         що ще не бачив уроків, лишився б без жодної дошки. */
      var judged = !!(window.RecSync && RecSync.hasPulled && RecSync.hasPulled());
      var gone = {};
      if (window.BoardSync && BoardSync.pendingDeletes) {
        BoardSync.pendingDeletes().forEach(function (id) { gone[id] = 1; });
      }
      function orphan(id) {
        if (gone[id]) return true;
        return judged && !S.get('lessons', id) && !S.get('desk', id);
      }

      var missing = [], stale = [];
      (rows || []).forEach(function (r) {
        var b = local[r.board_id];
        if (!b) { if (!orphan(r.board_id)) missing.push(r.board_id); return; }
        var s = b._sync;
        if (s && s.base) { if (r.rev !== s.snapRev) stale.push(r.board_id); }
        else if (!b.updatedAt || r.updated_at > b.updatedAt) stale.push(r.board_id);
      });

      var added = 0;
      var chunks = [];
      for (var i = 0; i < missing.length; i += 10) chunks.push(missing.slice(i, i + 10));
      return chunks.reduce(function (p, ids) {
        return p.then(function () {
          var list = ids.map(function (x) { return '%22' + enc(x) + '%22'; }).join(',');
          return req('/rest/v1/boards?select=board_id,rev,data,updated_at&board_id=in.(' + list + ')')
            .then(function (full) {
              (full || []).forEach(function (r) {
                if (!r.data || S.getBoard(r.board_id)) return;
                var d = r.data;
                var board = K().strip(d);
                board.id = d.id || U.uid('brd');
                board.lessonId = r.board_id;
                board.createdAt = d.createdAt || r.updated_at;
                board.updatedAt = r.updated_at;
                if (!board.slides.length) board.slides.push(S.newSlide());
                board._sync = {
                  v: 2, base: K().strip(d), seen: Number(d._seen) || 0, fly: [], recent: [],
                  floor: Number(d._seen) || 0,
                  atSeen: null, snapRev: r.rev, snapSeen: Number(d._seen) || 0, snapAt: 0
                };
                S.db().boards.push(board);
                stale.push(r.board_id);          // дочитати журнал після знімка
                added++;
              });
            });
        });
      }, Promise.resolve()).then(function () {
        if (added) persistNow();
        return { added: added, stale: stale };
      });
    });
  };

  /** Освіжити дошки по одній у фоні — щоб не завалити мережу на старті. */
  O.refresh = function (ids) {
    return (ids || []).reduce(function (chain, id) {
      return chain.then(function () {
        return O.pull(id).then(function () {
          return new Promise(function (r) { setTimeout(r, 250); });
        });
      });
    }, Promise.resolve());
  };

  /* ============================================================
     Звірка з сервером
     ============================================================

     Пристрій памʼятає, що вже має сервер (base), і шле лише різницю. Якщо
     ця памʼять колись розійшлася з правдою, різниця виходить порожньою — і
     вміст так і лишається на одному пристрої, а решта його не бачать.
     Звірка читає правду з сервера й зводить обидва боки докупи, нічого не
     стираючи:
       • тут є, пристрій певен, що сервер це має, а там цього немає —
         поїде на сервер;
       • на сервері є, а пристрій про це не знав — приходить сюди.
     Стерте кимось після того, що пристрій уже прочитав, не чіпаємо: це
     звичайне читання, воно прийде саме. */

  O.verify = function (boardId) {
    var board = S.getBoard(boardId);
    if (!ready() || !board || !established(board) || viewBusy(boardId)) return Promise.resolve(0);

    return lock(boardId, function () {
      if (viewBusy(boardId)) return 0;
      var k = K(), s = board._sync;
      return serverTruth(boardId, false).then(function (res) {
        /* Пристрій ще не дочитав журнал — спершу звичайне читання. Інакше
           стерте кимось (а воно могло вже лягти й у знімок) виглядало б як
           «сервер загубив», і звірка повернула б його назад. */
        if ((s.seen || 0) < res.last) {
          return pullNow(board).then(function () { return res; });
        }
        return res;
      }).then(function (res) {
        var T = res.T;

        var after = {};
        res.rows.forEach(function (r) {
          if (!r.op || r.id <= (s.seen || 0)) return;
          if (r.op.t === 'i-') (r.op.ids || []).forEach(function (x) { after['i:' + x] = 1; });
          if (r.op.t === 's-' && r.op.s) after['s:' + r.op.s] = 1;
        });
        // своє стерте, що вже в дорозі, назад не повертаємо
        (s.fly || []).forEach(function (op) {
          if (op.t === 'i-') (op.ids || []).forEach(function (x) { after['i:' + x] = 1; });
          if (op.t === 's-' && op.s) after['s:' + op.s] = 1;
        });

        var kn = known(board), B = k.strip(board);
        var tS = byId(T.slides), kS = byId(kn.slides);
        var lost = 0, found = 0;

        // 1) пристрій певен, що сервер це має, — а там цього немає
        B.slides.forEach(function (bs) {
          var ks = kS[bs.id];
          if (!ks || after['s:' + bs.id]) return;       // ще не відправлене — звичайна черга
          var ts = tS[bs.id];
          if (!ts) { k.apply(s.base, { t: 's-', s: bs.id }); lost++; return; }
          var tI = byId(ts.items), kI = byId(ks.items), gone = [];
          (bs.items || []).forEach(function (it) {
            if (it && it.id && kI[it.id] && !tI[it.id] && !after['i:' + it.id]) gone.push(it.id);
          });
          if (gone.length) { k.apply(s.base, { t: 'i-', s: bs.id, ids: gone }); lost += gone.length; }
        });

        // 2) на сервері є, а пристрій про це не знав
        var down = [];
        T.slides.forEach(function (ts, i) {
          if (after['s:' + ts.id]) return;
          var ks = kS[ts.id];
          if (!ks) { down.push({ t: 's+', sl: k.clone(ts), i: i }); return; }
          var kI = byId(ks.items);
          (ts.items || []).forEach(function (it, j) {
            if (it && it.id && !kI[it.id] && !after['i:' + it.id]) down.push({ t: 'i+', s: ts.id, it: k.clone(it), at: j });
          });
        });
        if (down.length) {
          var loc = k.diff(kn, B);                      // тут намальоване й ще не відправлене
          var sent = (s.fly || []).slice();
          down.forEach(function (op) { k.apply(s.base, op); });
          putContent(board, overlay(known(board), loc, B, sent));
          found = down.length;
        }

        if (!lost && !found) return 0;
        console.warn('Звірка дошки ' + boardId + ': на сервер ' + lost + ', із сервера ' + found);
        persistNow(boardId);
        if (lost) sendSoon(boardId);                   // поїде звичайною дорогою — різницею
        return lost + found;
      });
    }).then(function (n) {
      if (n && O.view && O.view.id === boardId && O.view.refresh) {
        try { O.view.refresh(); } catch (e) { console.warn('refresh:', e); }
      }
      return n;
    }, function (e) {
      console.warn('Звірка дошки не вдалася:', boardId, e && e.message);
      return 0;
    });
  };

  /* Звірка всіх дошок, що мінялися останнім часом, — у фоні, по одній і
     не частіше ніж раз на добу кожну. Так розбіжність лікується й на
     дошці, яку зараз ніхто не відкриває. */
  var VERIFIED = 'mathhub.boards.verified';
  O.verifySweep = function (days) {
    if (!ready()) return Promise.resolve(0);
    var done = {};
    try { done = JSON.parse(localStorage.getItem(VERIFIED) || '{}') || {}; } catch (e) { done = {}; }
    var since = Date.now() - (days || 45) * 86400000;
    var today = new Date().toISOString().slice(0, 10);
    var ids = (S.db().boards || []).filter(function (b) {
      if (!b || !b.lessonId || !established(b) || done[b.lessonId] === today) return false;
      return !b.updatedAt || Date.parse(b.updatedAt) >= since;
    }).map(function (b) { return b.lessonId; });

    var fixed = 0;
    return ids.reduce(function (chain, id) {
      return chain.then(function () {
        if (!ready()) return;
        return O.verify(id).then(function (n) {
          fixed += n;
          done[id] = today;
          try { localStorage.setItem(VERIFIED, JSON.stringify(done)); } catch (e) {}
          return new Promise(function (r) { setTimeout(r, 1200); });
        });
      });
    }, Promise.resolve()).then(function () { return fixed; });
  };

  /* ============================================================
     Рятувальне й службове
     ============================================================ */

  /**
   * Зібрати дошку з усього журналу — від найпершої дії.
   *
   * Рятувальний інструмент, а не звичайне читання: видалення тут навмисно
   * пропускаються. Питання не «як дошка виглядає зараз», а «що на ній
   * колись було».
   */
  O.rebuild = function (boardId) {
    if (!ready() || !boardId) return Promise.resolve(null);
    var out = { slides: [] };
    return fetchOps(boardId, 0, null).then(function (rows) {
      rows.forEach(function (row) {
        var op = row.op;
        if (!op || op.t === 's-' || op.t === 'i-') return;
        K().apply(out, op);
      });
      out.ops = rows.length;
      return out;
    }).catch(function (e) {
      console.warn('Журнал не зібрався:', e && e.message);
      return null;
    });
  };

  /** Забути дошку, якої більше немає. */
  O.drop = function (boardId) {
    setPending(boardId, false);
    delete errs[boardId];
    delete sentAt[boardId];
  };

  O.seenAt = function (boardId) {
    var b = S.getBoard(boardId);
    return (b && b._sync && b._sync.seen) || 0;
  };

  O.pendingIds = function () { return Object.keys(pending); };

  window.BoardOps = O;
})();
