/* Синхронізація з Supabase.

   Правило, від якого залежить швидкість: інтерфейс НІКОЛИ не чекає на мережу.
   Програма читає й пише лише localStorage, як раніше, а цей шар довантажує
   й відправляє дані у фоні. Якщо інтернету немає — нічого не ламається,
   зміни поїдуть при наступній нагоді.

   Захист від втрати даних: у кожної версії на сервері є номер (rev).
   Відправляючи зміни, ми кажемо, від якої версії їх зроблено. Якщо на сервері
   вже новіша (зберегли з іншого пристрою) — сервер відмовляє, а програма
   показує попередження й дає вибрати, що залишити. Тихого перезапису немає.

   Працює без жодних сторонніх бібліотек — лише fetch до Supabase REST. */

(function () {
  'use strict';

  var U = window.U, S = window.S;
  var Cloud = {};

  var META = 'mathhub.cloud';
  var DB_KEY = 'mathhub.db.v1';        // те саме сховище, що й у store.js
  var BACKUP = 'mathhub.before-sync';  // страховка перед прийняттям серверної версії
  var BACKUP_KEEP = 3;

  /* Страхові копії — повні знімки бази, тож їм місце у великому сховищі
     (disk.js), а не в localStorage, де вони тіснили саму базу. */
  function diskGet(key) { return window.Disk ? Disk.get(key) : localStorage.getItem(key); }
  function diskSet(key, value) { if (window.Disk) Disk.set(key, value); else localStorage.setItem(key, value); }
  /* Затримки навмисно різні. Під час уроку дошку дивляться з іншого пристрою,
     і кожна зайва секунда помітна — тому там усе прискорюється. Поза дошкою
     поспішати нема куди, а рідші запити бережуть батарею й трафік. */
  var PUSH_DELAY = 4000;      // звичайна пауза після останньої зміни
  var PUSH_DELAY_BOARD = 900; // коли відкрита дошка
  var cfg = window.CLOUD_CONFIG || { url: '', anonKey: '' };

  /* ============================================================
     Стан
     ============================================================ */

  var meta = { rev: 0, dirty: false, lastSync: null, hash: 0, changedAt: null };

  /* ============================================================
     Сесія входу — одна на всі вкладки
     ============================================================

     Сесія довго лежала всередині службового запису синхронізації, а той
     кожна вкладка переписує зі своєї пам'яті при кожному обміні з сервером.
     Звідси вхід, що злітав «сам»: у вкладці з дошкою, відкритій ще до
     входу, в пам'яті було «сесії немає» — і щойно людина входила в
     налаштуваннях сусідньої вкладки, дошка при наступній синхронізації
     записувала цю порожнечу поверх. Друга половина тієї ж біди: Supabase
     при кожному поновленні видає новий ключ поновлення й гасить старий,
     а повторне використання старого вважає крадіжкою й закриває сесію
     цілком. Вкладка зі старою копією ключа вбивала вхід для всіх.

     Тому сесія тепер окремим записом, і правда про неї — лише в сховищі:
     її читають звідти щоразу, а пишуть тільки вхід, вихід і поновлення. */

  var AUTH = 'mathhub.auth';
  var sessionCache;              // undefined — ще не читали

  function sess() {
    if (sessionCache === undefined) {
      try { sessionCache = JSON.parse(localStorage.getItem(AUTH) || 'null'); }
      catch (e) { sessionCache = null; }
    }
    return sessionCache;
  }

  function setSess(s) {
    sessionCache = s || null;
    try {
      if (s) localStorage.setItem(AUTH, JSON.stringify(s));
      else localStorage.removeItem(AUTH);
    } catch (e) { /* сховище недоступне — сесія житиме до закриття вкладки */ }
  }

  /** Перечитати зі сховища: інша вкладка могла щойно поновити чи закрити сесію. */
  function freshSess() {
    sessionCache = undefined;
    return sess();
  }
  var state = 'off';          // off | signedout | idle | syncing | offline | error
  var detail = '';
  var timer = null;
  var listeners = [];
  var started = false;
  var suppress = 0;           // >0 поки ми самі пишемо в базу (прийняли серверну версію)
  var housekeeping = 0;       // >0 поки програма пише сама, а не людина
  var forceNext = false;      // найближче відправлення — свідоме видалення

  /**
   * Обгортка для того, що програма робить сама: заповнення розкладу з
   * шаблону, міграції, дрібне прибирання. Дані зберігаються й поїдуть на
   * сервер як завжди, але часом правки не вважаються — інакше вони
   * перебивають справжні зміни з інших пристроїв.
   */
  Cloud.housekeeping = function (fn) {
    housekeeping++;
    try { return fn(); } finally { housekeeping--; }
  };
  var retry = false;          // захист від нескінченного кола при збігу записів у часі

  function loadMeta() {
    try {
      var raw = localStorage.getItem(META);
      if (raw) {
        var m = JSON.parse(raw);
        Object.keys(meta).forEach(function (k) { if (m[k] !== undefined) meta[k] = m[k]; });
        /* Перенесення зі старого місця: сесія, що лежала всередині цього
           запису, переїжджає в окремий — один раз, і лише якщо там порожньо. */
        if (m.session && m.session.refresh_token && !sess()) setSess(m.session);
      }
    } catch (e) { /* пошкоджений запис — почнемо з нуля */ }
  }

  function saveMeta() {
    // сесії тут немає навмисно — див. «Сесія входу — одна на всі вкладки»
    try { localStorage.setItem(META, JSON.stringify(meta)); } catch (e) { /* не критично */ }
  }

  function setState(s, d) {
    state = s; detail = d || '';
    listeners.forEach(function (fn) { try { fn(Cloud.status()); } catch (e) {} });
  }

  Cloud.onChange = function (fn) { listeners.push(fn); };

  /* ============================================================
     Версійний замок
     ============================================================

     Стара вкладка — повноправний письменник у живу базу. Саме через це
     зникли фотографії з уроку: код із кеша браузера шукав дошки на старому
     місці, не знаходив жодної й вирішив, що їхні картинки нікому не
     потрібні.

     Тому вкладка, що виконує старіший код, ніж лежить на сервері, втрачає
     право писати НА СЕРВЕР. Локально вона працює як раніше — нічого з
     набраного не пропадає, — а щойно людина перезавантажить сторінку,
     усе накопичене поїде вже свіжим кодом.

     Перевірка навмисно провалюється в бік «дозволити»: якщо версію не
     вдалося прочитати, програма працює як завжди. Замок має захищати від
     старого коду, а не від поганого інтернету. */

  var blocked = false;
  var blockedDetail = '';

  /**
   * Чи можна зараз щось відправляти на сервер.
   *
   * Крім застарілої вкладки, є ще один випадок, і він страшніший: локальні
   * дані не прочиталися. У памʼяті тоді порожньо — не тому, що даних немає,
   * а тому, що ми їх не розібрали. Відправити цю порожнечу означало б
   * знищити ще й серверну копію, тобто останню.
   */
  Cloud.writesBlocked = function () {
    if (blocked) return true;
    if (window.S && S.readFailed) {
      var f = S.readFailed();
      if (f.doc || f.boards) return true;
    }
    return false;
  };

  Cloud.blockedDetail = function () {
    if (!blocked && window.S && S.readFailed) {
      var f = S.readFailed();
      if (f.doc || f.boards) {
        return (f.doc ? 'Збережені дані' : 'Дошки') + ' на цьому пристрої не прочиталися. ' +
          'Відправлення зупинено, щоб порожнеча не поїхала на сервер поверх цілого.';
      }
    }
    return blockedDetail;
  };

  // {here, there, at}: перезавантаження повз кеш через розбіжність версій (пише app.js)
  var HARD_RELOAD = 'mathhub.hardReload';

  function versionNumber(v) {
    var m = String(v || '').match(/v(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function checkVersion() {
    var here = versionNumber(window.APP_BUILD);
    if (here == null) return Promise.resolve();

    return fetch('sw.js?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) {
        var there = versionNumber((t.match(/vektor-v\d+/) || [])[0]);
        if (there == null || there <= here) {
          try { localStorage.removeItem(HARD_RELOAD); } catch (e) {}
          return;
        }

        /* Повз кеш уже перезавантажувались саме через цю розбіжність — і
           вона лишилась. Отже, справа не в кеші: сервер сам віддає код,
           старший за номер у sw.js (версію виклали не всю). Ще одне
           перезавантаження нічого не змінить, а по колу воно робило
           кабінет непридатним: сторінка оновлювалась раз на хвилину, а
           відправка на сервер стояла. Тоді працюємо на тому, що є. */
        var last = null;
        try { last = JSON.parse(localStorage.getItem(HARD_RELOAD) || 'null'); } catch (e) { last = null; }
        if (last && last.here === here && last.there === there && Date.now() - (last.at || 0) < 6 * 3600000) {
          console.warn('На сервері sw.js — v' + there + ', а код — v' + here + '. Перезавантаження не допоможе, працюю далі.');
          return;
        }

        blocked = true;
        blockedDetail = 'ця вкладка працює на v' + here + ', на сервері вже v' + there;
        setState(state, blockedDetail);
        if (window.App && App.staleCodeBar) App.staleCodeBar(here, there);
      })
      .catch(function () { /* не дізналися — працюємо як завжди */ });
  }

  Cloud.status = function () {
    /* Стан виводимо, а не читаємо зі змінної: вона могла лишитися 'off' від
       самого запуску, якщо картку відмалювали раніше, ніж Cloud.start().
       Саме через це в інтерфейсі писало «не налаштована» при робочій синхронізації. */
    var s = state;
    if (!Cloud.available()) s = 'off';
    else if (!Cloud.signedIn()) s = 'signedout';
    else if (s === 'off' || s === 'signedout') s = meta.rev ? 'idle' : 'syncing';

    return {
      state: s,
      detail: detail,
      rev: meta.rev,
      dirty: ((window.RecSync ? RecSync.pending() : 0) +
              (window.BoardOps && BoardOps.pendingIds ? BoardOps.pendingIds().length : 0)) > 0,
      lastSync: meta.lastSync,
      email: sess() ? sess().email : null,
      backups: Cloud.backups().length
    };
  };

  Cloud.available = function () { return !!(cfg.url && cfg.anonKey); };
  Cloud.signedIn = function () { var s = sess(); return !!(s && s.refresh_token); };

  /** Адреса проєкту без кінцевої косої — потрібна сусідньому модулю картинок. */
  Cloud.base = function () { return cfg.url.replace(/\/+$/, ''); };

  /**
   * Ідентифікатор користувача — з самого токена (поле sub), без запиту до сервера.
   * Ним підписуються теки картинок, щоб правила доступу пускали лише до своїх.
   */
  Cloud.userId = function () {
    var s = sess();
    if (!s || !s.access_token) return null;
    try {
      var part = s.access_token.split('.')[1];
      if (!part) return null;
      var b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return JSON.parse(decodeURIComponent(escape(atob(b64)))).sub || null;
    } catch (e) { return null; }
  };

  /* ============================================================
     Дрібниці
     ============================================================ */

  /* Дешевий відпечаток рядка — щоб не тримати в пам'яті другу копію бази
     лише для порівняння "чи справді щось змінилося". */
  function hash(str) {
    var h = 2166136261, i;
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  /* Авторитетне джерело — сховище, а НЕ копія в пам'яті вкладки.
     Причина: вкладок може бути кілька, у кожної власна копія бази в пам'яті,
     і застаріла вкладка інакше відправила б на сервер свій старий стан. */
  /**
   * Прибрати з документа те, що тепер їде окремими рядками.
   *
   * Інакше лишався б другий шлях до тих самих даних — суцільний документ,
   * який завжди означає «хай стане ось так». Саме він і стирав: одного
   * такого запису з неповного пристрою вистачало, щоб забрати все.
   *
   * Документ лишається — у ньому налаштування, і він же служить копією
   * про всяк випадок. Але правда про учнів, уроки й гроші тепер не тут.
   */
  function withoutRecords(json) {
    if (!window.RecSync) return json;
    try {
      var doc = JSON.parse(json);
      RecSync.KINDS.forEach(function (k) { delete doc[k]; });
      delete doc.boards;
      return JSON.stringify(doc);
    } catch (e) {
      return json;               // не розібрали — краще відправити як є
    }
  }

  /**
   * Документ у тому вигляді, у якому він їде на сервер.
   *
   * Порівнювати треба саме його. Відколи записи й дошки поїхали окремо,
   * повний локальний документ і серверний перестали збігатися за
   * визначенням — а порівняння лишилося старим. Через це програма вважала,
   * що зміни є завжди: писала «зараз відправляються», слала документ на
   * кожному колі й відкладала страхову копію там, де нічого не мінялося.
   */
  function syncedJSON() { return withoutRecords(localJSON()); }

  function localJSON() {
    /* Браузер не прийняв останній запис — у сховищі давнє, а свіже лише в
       пам'яті. Тоді на сервер веземо пам'ять: інакше зміни зникли б. */
    if (window.S && S.lastSaveFailed && S.lastSaveFailed() && S.db()) return S.docJSON();
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (raw) return raw;
    } catch (e) { /* сховище недоступне — беремо з пам'яті */ }
    return S.exportJSON();
  }

  /* Чи відрізняється локальне від того, що ми останнього разу синхронізували.
     Це заміна прапорця dirty: прапорець лежить у спільному сховищі, тому одна
     вкладка могла скинути його, а друга після цього вважала, що локальних змін
     немає, і приймала серверну версію поверх незбережених даних. Порівняння
     вмісту такого зробити не дає. */
  function locallyChanged() {
    if (!meta.rev) return true;              // ще нічого не синхронізували
    return hash(syncedJSON()) !== meta.hash;
  }

  /* Копія локального стану перед тим, як прийняти серверну версію.
     Щоб навіть при найгіршому збігу обставин дані можна було повернути. */
  function keepBackup(reason) {
    /* Друга копія — в IndexedDB, де місця на порядки більше. У localStorage
       поміщається три штуки й ті тіснять саму базу; тут їх тридцять.
       Пишемо в обидва місця: старий список лишається як був, новий переживе
       і переповнення localStorage, і чистку історії. */
    try {
      if (window.Vault && Vault.available()) Vault.put(reason, localJSON());
    } catch (e) { /* сховище копій не має ламати синхронізацію */ }

    try {
      var list = JSON.parse(diskGet(BACKUP) || '[]');
      list.unshift({ at: new Date().toISOString(), reason: reason || '', data: localJSON() });
      list = list.slice(0, BACKUP_KEEP);
      diskSet(BACKUP, JSON.stringify(list));
    } catch (e) {
      // якщо місця не хватило — приберемо найстаріші й спробуємо ще раз
      try {
        diskSet(BACKUP, JSON.stringify([{ at: new Date().toISOString(), reason: reason || '', data: localJSON() }]));
      } catch (e2) { console.warn('Не вдалося зберегти страхову копію:', e2); }
    }
  }

  /* Скільки взагалі записів у базі — щоб порівнювати «було» і «стало». */
  function countRecords(dbObj) {
    var n = 0;
    ['students', 'lessons', 'boards', 'homeworks', 'payments', 'notes', 'materials']
      .forEach(function (k) { if (Array.isArray(dbObj[k])) n += dbObj[k].length; });
    return n;
  }

  Cloud.backups = function () {
    try {
      return JSON.parse(diskGet(BACKUP) || '[]').map(function (b, i) {
        var students = 0, archived = 0, total = 0;
        try {
          var parsed = JSON.parse(b.data);
          students = (parsed.students || []).length;
          archived = (parsed.students || []).filter(function (x) { return x && x.archived; }).length;
          total = countRecords(parsed);
        } catch (e) {}
        return { i: i, at: b.at, reason: b.reason, students: students, archived: archived,
                 total: total, bytes: b.data.length };
      });
    } catch (e) { return []; }
  };

  /**
   * Копії, які варто показувати людині.
   *
   * Спершу тут була умова «записів більше, ніж зараз» — і вона підвела:
   * демонстраційні дані затерли справжніх учнів, а їх було БІЛЬШЕ,
   * тому копія зі справжніми даними виявилась схована саме тоді,
   * коли була найпотрібніша.
   *
   * Тепер правило просте: показуємо будь-яку непорожню копію, вміст якої
   * відрізняється від теперішнього. Зайвий рядок в інтерфейсі — дрібниця
   * поряд із втраченими даними.
   */
  /**
   * Копії, у яких чогось більше, ніж зараз, — тільки такі варто показувати.
   *
   * Раніше умовою було «відрізняється від теперішнього». Але відрізняється
   * воно після будь-якої зміни, тож тривожна панель «якщо чогось не
   * вистачає» висіла постійно й лякала на порожньому місці.
   *
   * Порівнюємо по колекціях і лише ті, що є в обох. Це важливо: дошки з
   * документа переїхали, і в старих копіях вони ще є, а в теперішньому вже
   * немає — за загальним числом записів кожна копія назавжди виглядала б
   * «повнішою».
   */
  Cloud.backupsWorthShowing = function () {
    var now;
    try { now = JSON.parse(localJSON()); } catch (e) { return []; }

    var raw;
    try { raw = JSON.parse(diskGet(BACKUP) || '[]'); } catch (e) { raw = []; }

    return Cloud.backups().filter(function (b, i) {
      if (!b.total) return false;                       // порожня копія нічого не врятує
      var data = raw[i] && raw[i].data;
      if (!data) return false;

      var was;
      try { was = JSON.parse(data); } catch (e) { return false; }

      return COUNTED.some(function (k) {
        if (!Array.isArray(was[k]) || !Array.isArray(now[k])) return false;
        return was[k].length > now[k].length;
      });
    });
  };

  var COUNTED = ['students', 'lessons', 'boards', 'homeworks', 'payments', 'notes', 'materials'];

  Cloud.restoreBackup = function (i) {
    var list;
    try { list = JSON.parse(diskGet(BACKUP) || '[]'); } catch (e) { list = []; }
    var b = list[i];
    if (!b) return Promise.reject(new Error('Копію не знайдено'));
    S.importJSON(b.data);
    if (window.App && window.App.render) window.App.render();
    // повернене — звичайні зміни записів: поїдуть на сервер самі
    return Cloud.syncNow();
  };

  /** Те саме, але з копії в IndexedDB — там їх тридцять, а не три. */
  Cloud.restoreVault = function (id) {
    if (!window.Vault || !Vault.available()) return Promise.reject(new Error('Сховище копій недоступне'));
    return Vault.get(id).then(function (rec) {
      if (!rec || !rec.data) throw new Error('Копію не знайдено');
      /* Перед заміною відкладаємо теперішнє: людина може обрати не ту копію,
         і тоді дороги назад не було б. */
      keepBackup('перед поверненням копії від ' + rec.at);
      S.importJSON(rec.data);
      if (window.App && window.App.render) window.App.render();

      /* Дані вже повернуто на місце — відправка на сервер лише наздоганяє.
         Якщо вона не вдалася (немає мережі, не виконано вхід), казати
         «не вдалося повернути» не можна: людина побачила б помилку там,
         де насправді все спрацювало. Обмін дожене пізніше сам. */
      return Cloud.syncNow().catch(function (e) {
        console.warn('копію повернуто, але відправити не вийшло:', e);
      });
    });
  };

  function deviceName() {
    var ua = navigator.userAgent;
    var os = /Windows/.test(ua) ? 'Windows'
           : /Android/.test(ua) ? 'Android'
           : /iPhone|iPad/.test(ua) ? 'iOS'
           : /Mac/.test(ua) ? 'Mac' : 'інший';
    var br = /Edg\//.test(ua) ? 'Edge'
           : /Chrome\//.test(ua) ? 'Chrome'
           : /Safari\//.test(ua) ? 'Safari'
           : /Firefox\//.test(ua) ? 'Firefox' : '';
    return os + (br ? ' / ' + br : '');
  }

  /* ============================================================
     Запити
     ============================================================ */

  function authFetch(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    headers['apikey'] = cfg.anonKey;
    // для картинок тип задає викликач, а тіло — двійкове; JSON тут нав'язувати не можна
    if (!headers['Content-Type'] && !(opts.body instanceof Blob)) {
      headers['Content-Type'] = 'application/json';
    }
    var s = sess();
    if (s && s.access_token) {
      headers['Authorization'] = 'Bearer ' + s.access_token;
    }
    return fetch(cfg.url.replace(/\/+$/, '') + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body
    });
  }

  /* Токен живе близько години. Замість того щоб стежити за часом,
     реагуємо на першу відмову 401: оновлюємо токен і повторюємо запит один раз. */
  function api(path, opts) {
    return authFetch(path, opts).then(function (res) {
      if (res.status !== 401) return res;
      return refresh().then(function () { return authFetch(path, opts); });
    }).then(function (res) {
      // відмову сервера — у тихий журнал (journal.js), а не лише в консоль
      if (!res.ok && window.Journal) Journal.server(path, (opts && opts.method) || 'GET', res);
      return res;
    });
  }

  /** Запит із авторизацією й автоматичним поновленням токена — для модуля картинок. */
  Cloud.request = function (path, opts) { return api(path, opts); };

  /**
   * Тимчасове посилання на свій файл у сховищі (вкладення матеріалів) —
   * щоб відкрити його звичайною вкладкою, як відкриває учень. Вкладка з
   * адресою сховища живе за власними правилами, а не за правилами
   * кабінету, які не дають показати PDF усередині. null — файлу на
   * сервері ще немає або немає входу.
   */
  Cloud.signedFileUrl = function (key, seconds) {
    if (!Cloud.available() || !Cloud.signedIn() || !Cloud.userId() || !key) return Promise.resolve(null);
    return api('/storage/v1/object/sign/boards/' + encodeURIComponent(Cloud.userId()) + '/' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: seconds || 3600 })
    }).then(function (res) { return res.ok ? res.json() : null; })
      .then(function (j) {
        var u = j && (j.signedURL || j.signedUrl);
        if (!u) return null;
        return /^https?:/.test(u) ? u : Cloud.base() + '/storage/v1' + (u.charAt(0) === '/' ? '' : '/') + u;
      })
      .catch(function () { return null; });
  };

  /* ============================================================
     Публікація уроку для учня
     ============================================================
     Учень отримує звичайне посилання на самодостатню сторінку — ту саму,
     що досі надсилали файлом. Доступу до бази він не має взагалі:
     у сторінці вже вшито слайди й картинки саме цього уроку.

     Захист — у самій адресі: код на 128 випадкових бітів, підібрати
     неможливо. Відкликати = видалити файл. */

  Cloud.newShareToken = function () {
    var bytes = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
    return s;
  };

  function sharePath(token) {
    return '/storage/v1/object/shares/' + encodeURIComponent(Cloud.userId()) + '/' +
           encodeURIComponent(token) + '/index.html';
  }

  /* Посилання веде на НАШ сайт, а не прямо у сховище. Причина: Supabase
     навмисно віддає будь-який HTML як звичайний текст, тому учень побачив би
     вихідний код замість уроку. Сторінка share.html забирає той файл сама
     й показує його. Код уроку — після #, щоб не потрапляв у журнали серверів. */
  Cloud.shareUrl = function (token) {
    var uid = Cloud.userId();
    if (!uid) return '';
    /* Адреса без .html навмисно: Cloudflare Pages сам перенаправляє
       /share.html на /share, і зайвий перескок збивав би правило доступу,
       яке дозволяє учневі відкрити саме цю сторінку. */
    return location.origin + location.pathname.replace(/[^/]*$/, '') +
           'share#' + uid + '/' + token;
  };

  /* Картинки вивантажуємо ОДИН раз на посилання, а сам урок оновлюємо
     маленьким JSON. Якби картинки їхали разом з уроком щоразу, часте
     оновлення коштувало б сотні кілобайтів на кожен штрих. */
  var IMGMAP = 'mathhub.sharedimgs';

  function sentImages() {
    try { return JSON.parse(localStorage.getItem(IMGMAP) || '{}'); } catch (e) { return {}; }
  }
  function rememberImage(token, key) {
    var m = sentImages();
    if (!m[token]) m[token] = {};
    m[token][key] = true;
    try { localStorage.setItem(IMGMAP, JSON.stringify(m)); } catch (e) {}
  }

  Cloud.shareImageUrl = function (token, key, folder) {
    return Cloud.base() + '/storage/v1/object/public/shares/' +
           encodeURIComponent(Cloud.userId()) + '/' + encodeURIComponent(token) +
           '/' + (folder || 'img') + '/' + encodeURIComponent(key);
  };

  /**
   * Вивантажити файл уроку, якщо його там ще немає. Повертає адресу.
   * folder розділяє картинки дошки ('img') і вкладення матеріалів ('mat').
   */
  /* ============================================================
     Календар уроків
     ============================================================

     Кладемо .ics у те саме публічне сховище, що й сторінки уроків. Адреса
     містить випадковий код, тож знати її може лише той, кому ви дали
     посилання, а відкликається вона видаленням файлу.

     Тип обовʼязково text/calendar: із text/plain Google підписку не
     приймає — каже «не вдалося прочитати» й не пояснює чому. */

  Cloud.calendarUrl = function (token) {
    var uid = Cloud.userId();
    if (!uid || !token) return '';
    return Cloud.base() + '/storage/v1/object/public/shares/' +
      encodeURIComponent(uid) + '/cal/' + encodeURIComponent(token) + '.ics';
  };

  Cloud.publishCalendar = function (token, text) {
    if (!Cloud.available() || !Cloud.signedIn()) {
      return Promise.reject(new Error('Спершу увімкніть синхронізацію'));
    }
    var blob = new Blob([text], { type: 'text/calendar; charset=utf-8' });
    return api('/storage/v1/object/shares/' + encodeURIComponent(Cloud.userId()) +
               '/cal/' + encodeURIComponent(token) + '.ics', {
      method: 'POST',
      headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'x-upsert': 'true' },
      body: blob
    }).then(function (res) {
      if (!res.ok && res.status !== 409) {
        throw new Error('Календар не завантажився (' + res.status + ')');
      }
      return Cloud.calendarUrl(token);
    });
  };

  Cloud.revokeCalendar = function (token) {
    if (!Cloud.available() || !Cloud.signedIn() || !token) return Promise.resolve(false);
    return api('/storage/v1/object/shares/' + encodeURIComponent(Cloud.userId()) +
               '/cal/' + encodeURIComponent(token) + '.ics', { method: 'DELETE' })
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  };

  Cloud.publishShareImage = function (token, key, blob, folder) {
    folder = folder || 'img';
    var url = Cloud.shareImageUrl(token, key, folder);
    var mark = folder + '/' + key;
    var m = sentImages();
    if (m[token] && m[token][mark]) return Promise.resolve(url);
    return api('/storage/v1/object/shares/' + encodeURIComponent(Cloud.userId()) + '/' +
               encodeURIComponent(token) + '/' + folder + '/' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true' },
      body: blob
    }).then(function (res) {
      if (!res.ok && res.status !== 409) throw new Error('Файл не завантажився (' + res.status + ')');
      rememberImage(token, mark);
      return url;
    });
  };

  /** Оновити сам урок. Це маленький запит, тому його можна робити часто. */
  /**
   * Прочитати те, що вже опубліковано учневі.
   *
   * Сторінка учня — окрема повна копія слайдів на сервері, і вона не
   * залежить ні від історії в браузері, ні від журналу дій. Коли слайд
   * зник із дошки, а публікація після того не встигла оновитись, він там
   * ще лежить.
   */
  Cloud.shareData = function (token) {
    if (!Cloud.available() || !Cloud.signedIn() || !token) return Promise.resolve(null);
    return api('/rest/v1/shares?select=data,updated_at&token=eq.' + encodeURIComponent(token),
               { method: 'GET' })
      .then(function (res) {
        if (!res.ok) throw new Error('Сервер відповів ' + res.status);
        return res.json();
      })
      .then(function (rows) { return (rows && rows[0]) || null; })
      .catch(function (e) {
        console.warn('Сторінку учня не вдалося прочитати:', e && e.message);
        return null;
      });
  };

  Cloud.publishShareData = function (token, lessonId, title, dataJson, canWrite) {
    if (!Cloud.available() || !Cloud.signedIn()) {
      return Promise.reject(new Error('Спершу увімкніть синхронізацію в Налаштуваннях'));
    }
    var row = {
      token: token,
      owner: Cloud.userId(),
      lesson_id: lessonId,
      title: title || '',
      data: dataJson,
      revoked: false
    };
    if (canWrite != null) row.can_write = !!canWrite;

    return api('/rest/v1/shares?on_conflict=token', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row)
    }).then(function (res) {
      if (!res.ok) throw new Error('Сервер відповів ' + res.status);
      return Cloud.shareUrl(token);
    });
  };

  Cloud.revokeShare = function (token) {
    if (!Cloud.available() || !Cloud.signedIn()) return Promise.resolve();
    // рядок зникає разом із внесками учня; картинки прибираємо окремо
    return api('/rest/v1/shares?token=eq.' + encodeURIComponent(token), { method: 'DELETE' })
      .then(function (res) {
        if (!res.ok && res.status !== 404) throw new Error('Сервер відповів ' + res.status);
        var m = sentImages();
        delete m[token];
        try { localStorage.setItem(IMGMAP, JSON.stringify(m)); } catch (e) {}
      });
  };

  /** Записи, які учень зробив на дошці або надіслав як домашнє. */
  Cloud.shareContributions = function (token) {
    if (!Cloud.signedIn()) return Promise.resolve([]);
    return api('/rest/v1/share_contributions?token=eq.' + encodeURIComponent(token) +
               '&merged=eq.false&select=id,kind,payload,created_at&order=id')
      .then(function (res) { return res.ok ? res.json() : []; })
      .catch(function () { return []; });
  };

  /* ============================================================
     Портал учня: постійний вхід у свій розклад і матеріали
     ============================================================

     Портал живе поруч із посиланнями на уроки, але окремо від них:
     посилання дає один урок, портал — постійний доступ. Сторінка та сама
     (share), бо саме її й лише її пускає повз захист Cloudflare; режим
     розрізняємо позначкою portal: у частині адреси після #. */

  Cloud.portalUrl = function (token) {
    if (!token) return '';
    return location.origin + location.pathname.replace(/[^/]*$/, '') +
           'share#portal:' + token;
  };

  /** Портал цього учня або null, якщо ще не створювали. */
  Cloud.portalOf = function (studentId) {
    if (!Cloud.signedIn()) return Promise.resolve(null);
    return api('/rest/v1/portals?student_id=eq.' + encodeURIComponent(studentId) +
               '&owner=eq.' + encodeURIComponent(Cloud.userId()) +
               '&select=token,pin,revoked,rev,updated_at')
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (rows) { return (rows && rows[0]) || null; })
      .catch(function () { return null; });
  };

  /**
   * Створити або оновити портал. pin === null лишає код без змін,
   * '' прибирає його зовсім, рядок — задає новий.
   */
  Cloud.publishPortal = function (studentId, token, dataJson, pin) {
    if (!Cloud.available() || !Cloud.signedIn()) {
      return Promise.reject(new Error('Спершу увімкніть синхронізацію в Налаштуваннях'));
    }
    var row = {
      token: token,
      owner: Cloud.userId(),
      student_id: studentId,
      data: dataJson,
      revoked: false
    };
    if (pin !== null && pin !== undefined) row.pin = pin === '' ? null : String(pin);

    return api('/rest/v1/portals?on_conflict=token', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row)
    }).then(function (res) {
      if (!res.ok) throw new Error('Сервер відповів ' + res.status);
      return Cloud.portalUrl(token);
    });
  };

  /**
   * Перевірка порталу очима учня.
   *
   * Ходить у базу БЕЗ вашого входу — лише з публічним ключем, точно як
   * сторінка учня. Тому перевіряється справжній шлях, а не наше уявлення
   * про нього: чи пускає код, що саме віддається, і чи не просочилися гроші.
   *
   * Потрібно тому, що інакше єдиний спосіб переконатися — відкривати
   * посилання в іншому браузері й вірити очам.
   */
  Cloud.portalSelfCheck = function (token, pin) {
    var base = Cloud.base();
    function anon(fn, body) {
      return fetch(base + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    return anon('portal_gate', { p_token: token }).then(function (res) {
      if (res.status === 404) return { ok: false, why: 'setup' };
      if (!res.ok) return { ok: false, why: 'net' };
      return res.json().then(function (rows) {
        var g = rows && rows[0];
        if (!g) return { ok: false, why: 'gone' };
        if (g.locked) return { ok: false, why: 'locked' };

        return anon('portal_read', { p_token: token, p_pin: pin || '' })
          .then(function (r2) {
            if (!r2.ok) return { ok: false, why: 'pin', needsPin: g.needs_pin };
            return r2.json().then(function (rows2) {
              var row = rows2 && rows2[0];
              /* Невірний код тепер — порожня відповідь, а не помилка (інакше
                 база відкочувала лічильник спроб). */
              if (!row && g.needs_pin) return { ok: false, why: 'pin', needsPin: true };
              if (!row || !row.data) return { ok: false, why: 'empty' };

              var raw = row.data;
              var d;
              try { d = JSON.parse(raw); } catch (e) { return { ok: false, why: 'broken' }; }

              /* Найважливіше в перевірці: переконатися, що грошей там немає.
                 Шукаємо в сирому тексті, а не в розібраному об'єкті — так
                 знайдеться й те, про що ми забули. */
              var leaks = ['price', 'paid', 'amount', 'balance', 'debt', 'payment']
                .filter(function (k) { return raw.indexOf('"' + k + '"') > -1; });

              return {
                ok: true,
                needsPin: g.needs_pin,
                student: d.student || '',
                lessons: (d.lessons || []).length,
                openable: (d.lessons || []).filter(function (l) { return l.url; }).length,
                materials: (d.materials || []).length,
                leaks: leaks,
                updated: d.updated || row.updated_at || ''
              };
            });
          });
      });
    }).catch(function () { return { ok: false, why: 'net' }; });
  };

  Cloud.revokePortal = function (token) {
    if (!Cloud.available() || !Cloud.signedIn()) return Promise.resolve();
    return api('/rest/v1/portals?token=eq.' + encodeURIComponent(token), { method: 'DELETE' })
      .then(function (res) {
        if (!res.ok && res.status !== 404) throw new Error('Сервер відповів ' + res.status);
        var m = sentImages();
        delete m[token];
        try { localStorage.setItem(IMGMAP, JSON.stringify(m)); } catch (e) {}
      });
  };

  Cloud.markContributionsMerged = function (ids) {
    if (!ids || !ids.length || !Cloud.signedIn()) return Promise.resolve();
    return api('/rest/v1/share_contributions?id=in.(' + ids.join(',') + ')', {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ merged: true })
    });
  };

  /* Поновлення сесії — одне на всіх.

     Публікація уроку шле багато запитів одночасно: кожне фото окремо плюс
     сам урок. Коли термін токена спливає, вони всі отримують відмову в ту
     саму мить. Раніше кожен брався поновлювати сесію сам — а Supabase при
     поновленні видає НОВИЙ токен і гасить старий. Тобто перший запит
     спрацьовував, а решта надсилали вже недійсний токен і отримували
     «Сесія втратила чинність». Сесія помирала саме тоді, коли роботи
     найбільше — на уроці з фотографіями.

     Тепер перший, хто помітив відмову, поновлює сесію, а решта чекають на
     той самий результат. */
  var refreshing = null;

  /* Та сама черга, але між вкладками. Браузер дає замок, який бачать усі
     вкладки сайту: поки одна поновлює сесію, інші чекають, а потім беруть
     уже свіжий ключ зі сховища замість того, щоб пред'явити старий. */
  function withAuthLock(fn) {
    if (navigator.locks && navigator.locks.request) {
      return navigator.locks.request('vektor-auth-refresh', fn);
    }
    return fn();
  }

  function refresh() {
    if (refreshing) return refreshing;

    var used = sess();
    if (!used || !used.refresh_token) {
      return Promise.reject(new Error('Немає активного входу'));
    }

    refreshing = withAuthLock(function () {
      /* Поки ми чекали на замок, інша вкладка могла вже поновити сесію.
         Тоді в сховищі лежить новий ключ — беремо його й нікуди не йдемо. */
      var now = freshSess();
      if (!now || !now.refresh_token) {
        var gone = new Error('Сесія закрита в іншій вкладці — увійдіть знову');
        gone.expired = true;
        throw gone;
      }
      if (now.refresh_token !== used.refresh_token) return now;

      return fetch(cfg.url.replace(/\/+$/, '') + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: now.refresh_token })
      }).then(function (res) {
        if (!res.ok) {
          /* Відмова може бути й хибною тривогою: інша вкладка без замка
             (старий код) встигла поновити раніше. Перевіряємо сховище ще раз
             і лише тоді визнаємо, що сесії справді немає. */
          var after = freshSess();
          if (after && after.refresh_token && after.refresh_token !== now.refresh_token) return after;
          var e = new Error('Сесія втратила чинність — увійдіть знову');
          e.expired = true;
          throw e;
        }
        return res.json().then(function (j) {
          var next = {
            access_token: j.access_token,
            refresh_token: j.refresh_token,
            email: (j.user && j.user.email) || now.email
          };
          setSess(next);
          return next;
        });
      });
    }).then(function (s) {
      refreshing = null;
      return s;
    }, function (e) {
      refreshing = null;
      // на збої мережі сесію не чіпаємо: вона, найпевніше, ще жива
      if (e && e.expired) { setSess(null); setState('signedout'); }
      throw e;
    });

    return refreshing;
  }

  /* ============================================================
     Вхід
     ============================================================ */

  Cloud.signIn = function (email, password) {
    if (!Cloud.available()) return Promise.reject(new Error('Синхронізація не налаштована'));
    return fetch(cfg.url.replace(/\/+$/, '') + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (res) {
      return res.json().then(function (j) {
        if (!res.ok) throw new Error(j.error_description || j.msg || j.message || 'Не вдалося увійти');
        return j;
      });
    }).then(function (j) {
      setSess({
        access_token: j.access_token,
        refresh_token: j.refresh_token,
        email: (j.user && j.user.email) || email
      });
      /* Далі все саме: записи й дошки цього акаунта приїжджають, а те, що
         вже є в цьому браузері й чого сервер не знає, — їде туди. Нічого
         не замінюється цілком, тож і вибирати, «чиє взяти», не треба. */
      setState('syncing');
      startParts();
      return Cloud.syncNow();
    });
  };

  /** Обмін дошками й записами — щойно зʼявився вхід, без перезавантаження сторінки. */
  function startParts() {
    if (Cloud.writesBlocked()) return;
    if (window.BoardSync) BoardSync.start();
    if (window.RecSync) RecSync.start();
  }

  /**
   * Створення акаунта просто з програми — щоб не заходити в панель Supabase.
   * Якщо підтвердження пошти вимкнене, Supabase одразу віддає сесію і ми входимо.
   * Якщо увімкнене — сесії немає, треба перейти за посиланням з листа.
   * Повертає true, коли вхід відбувся, і false, коли чекаємо на лист.
   */
  Cloud.signUp = function (email, password) {
    if (!Cloud.available()) return Promise.reject(new Error('Синхронізація не налаштована'));
    return fetch(cfg.url.replace(/\/+$/, '') + '/auth/v1/signup', {
      method: 'POST',
      headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (res) {
      return res.json().then(function (j) {
        if (!res.ok) throw new Error(j.error_description || j.msg || j.message || 'Не вдалося створити акаунт');
        return j;
      });
    }).then(function (j) {
      if (!j.access_token) return false;        // чекаємо на підтвердження пошти
      setSess({
        access_token: j.access_token,
        refresh_token: j.refresh_token,
        email: (j.user && j.user.email) || email
      });
      startParts();                             // перший акаунт — наші дані їдуть на сервер
      return Cloud.syncNow().then(function () { return true; });
    });
  };

  /**
   * Новий пароль — з пристрою, де вже виконано вхід; старий не потрібен.
   * Інакше, забувши пароль, людина не могла б увійти з нового пристрою:
   * відновлення через лист у кабінеті немає.
   */
  Cloud.setPassword = function (password) {
    if (!Cloud.signedIn()) return Promise.reject(new Error('Спершу треба увійти'));
    return api('/auth/v1/user', {
      method: 'PUT',
      body: JSON.stringify({ password: password })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (res.ok) return true;
        var code = j.error_code || j.code || '';
        if (code === 'same_password') throw new Error('Це й так ваш теперішній пароль');
        if (code === 'weak_password') throw new Error('Пароль закороткий або надто простий');
        if (code === 'reauthentication_needed') throw new Error('Supabase просить підтвердити вхід ще раз: вийдіть і увійдіть');
        throw new Error(j.msg || j.message || j.error_description || ('Сервер відповів ' + res.status));
      });
    });
  };

  Cloud.signOut = function () {
    setSess(null);
    meta.rev = 0;
    meta.dirty = false;
    saveMeta();
    setState('signedout');
  };

  /* ============================================================
     Обмін — як у Miro
     ============================================================

     Колись уся база їхала на сервер одним документом, і при розбіжності
     пристроїв програма мусила вибирати, чию версію взяти цілком. Саме так
     і губилися дані: вибрати можна лише одну, а правди було по шматку в
     кожній.

     Тепер такого документа немає. Кожен запис — учень, урок, оплата,
     налаштування — їде окремо (recsync.js), кожна зміна дошки — окремою
     дією в журнал (boardops.js). Вибирати нема з чого: зміни зливаються
     самі, кожна у своєму обʼєкті. Тут лише спільний ритм і стан. */

  /** Відправити своє й забрати чуже — усе одразу. */
  Cloud.syncNow = function () {
    if (!Cloud.available() || !Cloud.signedIn()) return Promise.resolve();
    if (Cloud.writesBlocked()) return Promise.resolve();
    if (!navigator.onLine) { setState('offline'); return Promise.resolve(); }

    setState('syncing');
    var jobs = [];
    if (window.RecSync) jobs.push(RecSync.pull());       // спершу віддає своє, потім читає
    if (window.BoardSync) jobs.push(BoardSync.flush());
    return Promise.all(jobs).then(function () {
      meta.lastSync = new Date().toISOString();
      meta.dirty = false;
      saveMeta();
      setState(navigator.onLine ? 'idle' : 'offline');
    }).catch(function (e) {
      setState(navigator.onLine ? 'error' : 'offline', e && e.message);
    });
  };

  /* Захист старого документа від затирання більше не потрібен: документа,
     який можна затерти цілком, немає. */
  Cloud.guardInstalled = function () { return Promise.resolve('unknown'); };

  /** Список автоматичних копій, які сервер колись зробив зі старого документа. */
  Cloud.snapshots = function () {
    if (!Cloud.signedIn()) return Promise.resolve([]);
    return api('/rest/v1/snapshots?select=id,rev,device,created_at&order=created_at.desc&limit=50')
      .then(function (res) {
        if (!res.ok) throw new Error('Сервер відповів ' + res.status);
        return res.json();
      });
  };

  /** Відновити таку копію. Повернене — звичайна зміна: поїде всюди саме. */
  Cloud.restoreSnapshot = function (id) {
    return api('/rest/v1/snapshots?id=eq.' + encodeURIComponent(id) + '&select=data,rev')
      .then(function (res) {
        if (!res.ok) throw new Error('Сервер відповів ' + res.status);
        return res.json();
      })
      .then(function (rows) {
        if (!rows || !rows[0]) throw new Error('Копію не знайдено');
        keepBackup('перед поверненням копії з сервера');
        S.importJSON(rows[0].data);
        if (window.App && window.App.render) window.App.render();
        return Cloud.syncNow();
      });
  };

  /* Кілька вкладок одного сайту ділять сховище, але кожна тримає власну копію
     бази в пам'яті. Без цього обробника вкладка, відкрита раніше, лишалася зі
     старим станом і при першій же дії записувала його поверх свіжого.
     Тепер вона перечитує базу одразу, як тільки інша вкладка щось зберегла. */
  function watchOtherTabs() {
    /* Вхід чи вихід в одній вкладці — одразу для всіх. */
    window.addEventListener('storage', function (e) {
      if (e.key !== AUTH) return;
      var was = !!(sessionCache && sessionCache.refresh_token);
      freshSess();
      var now = Cloud.signedIn();
      if (was === now) return;
      if (now) {
        setState('syncing');
        startParts();
        Cloud.syncNow();
      } else {
        setState('signedout');
      }
    });

    window.addEventListener('storage', function (e) {
      if (e.key !== DB_KEY || !e.newValue) return;
      if (suppress > 0) return;
      suppress++;
      try {
        /* Спершу — у чергу своє, ще не помічене: перевірка змін іде з
           паузою, а після перечитування відбитки стануть «як на диску», і
           своя свіжа правка вже не відрізнялася б від чужої — не поїхала б. */
        if (window.RecSync && RecSync.scan) RecSync.scan();
        S.load();
        /* Відкрита тут дошка — правда цієї вкладки: у ній малюють, і її
           журнал сам зведе зміни з іншими. Щойно прочитана з диска копія не
           має її підмінити, інакше записи пішли б у стару. */
        var open = window.V && V.boardCurrent && V.boardCurrent();
        if (open) {
          var list = S.db().boards || [];
          var at = list.findIndex(function (b) { return b.lessonId === open.lessonId; });
          if (at >= 0) list[at] = open; else list.push(open);
        }
        // змінене іншою вкладкою — не своя правка: відбитки й чергу звести
        if (window.RecSync && RecSync.rebase) RecSync.rebase();
        if (window.App && window.App.render) {
          // відкриту дошку не чіпаємо: її вміст живе окремо
          if (!(window.V && V.boardMountedFor && V.boardMountedFor())) window.App.render();
        }
      } finally { suppress--; }
    });
  }

  /** Відправити негайно, не чекаючи паузи (перед закриттям, при згортанні). */
  Cloud.flush = function () {
    var jobs = [];
    try {
      if (window.RecSync) { RecSync.scan(); jobs.push(RecSync.flush()); }
      if (window.BoardSync) jobs.push(BoardSync.flush());
    } catch (e) { console.warn('flush:', e); }
    return Promise.all(jobs);
  };

  /* ============================================================
     Старт
     ============================================================ */

  Cloud.start = function () {
    if (started) return;
    started = true;

    /* Обробники вмикаємо ЗАВЖДИ, ще до перевірок: самі вони щоразу
       дивляться на умови, тож без входу нічого не роблять, а після входу
       працюють без перезавантаження сторінки. Стежать за змінами з інших
       пристроїв самі модулі записів і дошок. */
    window.addEventListener('online', function () { Cloud.syncNow(); });
    window.addEventListener('offline', function () {
      if (Cloud.available() && Cloud.signedIn()) setState('offline');
    });
    document.addEventListener('visibilitychange', function () {
      if (!Cloud.available() || !Cloud.signedIn()) return;
      if (document.visibilityState === 'hidden') Cloud.flush();
      else Cloud.syncNow();
    });

    /* Версію питаємо завжди — навіть без налаштованої синхронізації й без
       входу. Застаріла вкладка лишається застарілою незалежно від того,
       чи має вона куди писати, і людина має дізнатися про це одразу, а не
       після того, як попрацює годину. */
    var version = checkVersion();
    if (!Cloud._versionTimer) Cloud._versionTimer = setInterval(checkVersion, 30 * 60 * 1000);

    if (!Cloud.available()) { setState('off'); return; }
    if (!Cloud.signedIn()) { setState('signedout'); return; }

    /* Обмін — лише після відповіді про версію. Інакше стара вкладка
       встигла б записати до того, як дізналася, що вона стара. */
    version.then(function () {
      if (Cloud.writesBlocked()) return;
      startParts();
      setState('idle');
    });
  };

  window.Cloud = Cloud;

  loadMeta();
  watchOtherTabs();   // потрібно навіть без синхронізації: вкладки псували дані й раніше

  /* А от мережу чіпаємо лише після того, як app.js відмалював інтерфейс —
     перше відкриття не має чекати на сервер. */
  function startWhenReady() {
    if (window.Disk) Disk.ready(function () { Cloud.start(); }); else Cloud.start();
  }
  if (document.readyState === 'complete') startWhenReady();
  else window.addEventListener('load', startWhenReady);
})();
