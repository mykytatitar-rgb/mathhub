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
  /* Затримки навмисно різні. Під час уроку дошку дивляться з іншого пристрою,
     і кожна зайва секунда помітна — тому там усе прискорюється. Поза дошкою
     поспішати нема куди, а рідші запити бережуть батарею й трафік. */
  var PUSH_DELAY = 4000;      // звичайна пауза після останньої зміни
  var PUSH_DELAY_BOARD = 900; // коли відкрита дошка
  var cfg = window.CLOUD_CONFIG || { url: '', anonKey: '' };

  /* ============================================================
     Стан
     ============================================================ */

  var meta = { rev: 0, dirty: false, lastSync: null, session: null, hash: 0, changedAt: null };
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
      }
    } catch (e) { /* пошкоджений запис — почнемо з нуля */ }
  }

  function saveMeta() {
    try { localStorage.setItem(META, JSON.stringify(meta)); } catch (e) { /* не критично */ }
  }

  function setState(s, d) {
    state = s; detail = d || '';
    listeners.forEach(function (fn) { try { fn(Cloud.status()); } catch (e) {} });
  }

  Cloud.onChange = function (fn) { listeners.push(fn); };

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
      dirty: Cloud.available() ? (meta.dirty || locallyChanged()) : meta.dirty,
      lastSync: meta.lastSync,
      email: meta.session ? meta.session.email : null,
      backups: Cloud.backups().length
    };
  };

  Cloud.available = function () { return !!(cfg.url && cfg.anonKey); };
  Cloud.signedIn = function () { return !!(meta.session && meta.session.refresh_token); };

  /** Адреса проєкту без кінцевої косої — потрібна сусідньому модулю картинок. */
  Cloud.base = function () { return cfg.url.replace(/\/+$/, ''); };

  /**
   * Ідентифікатор користувача — з самого токена (поле sub), без запиту до сервера.
   * Ним підписуються теки картинок, щоб правила доступу пускали лише до своїх.
   */
  Cloud.userId = function () {
    if (!meta.session || !meta.session.access_token) return null;
    try {
      var part = meta.session.access_token.split('.')[1];
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
  function localJSON() {
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
    return hash(localJSON()) !== meta.hash;
  }

  /* Копія локального стану перед тим, як прийняти серверну версію.
     Щоб навіть при найгіршому збігу обставин дані можна було повернути. */
  function keepBackup(reason) {
    try {
      var list = JSON.parse(localStorage.getItem(BACKUP) || '[]');
      list.unshift({ at: new Date().toISOString(), reason: reason || '', data: localJSON() });
      list = list.slice(0, BACKUP_KEEP);
      localStorage.setItem(BACKUP, JSON.stringify(list));
    } catch (e) {
      // якщо місця не хватило — приберемо найстаріші й спробуємо ще раз
      try {
        localStorage.setItem(BACKUP, JSON.stringify([{ at: new Date().toISOString(), reason: reason || '', data: localJSON() }]));
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
      return JSON.parse(localStorage.getItem(BACKUP) || '[]').map(function (b, i) {
        var students = 0, total = 0;
        try {
          var parsed = JSON.parse(b.data);
          students = (parsed.students || []).length;
          total = countRecords(parsed);
        } catch (e) {}
        return { i: i, at: b.at, reason: b.reason, students: students, total: total, bytes: b.data.length };
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
  Cloud.backupsWorthShowing = function () {
    var cur = '';
    try { cur = localJSON(); } catch (e) {}
    var curHash = hash(cur || '');
    var raw;
    try { raw = JSON.parse(localStorage.getItem(BACKUP) || '[]'); } catch (e) { raw = []; }
    return Cloud.backups().filter(function (b, i) {
      if (!b.total) return false;                       // порожня копія нічого не врятує
      var data = raw[i] && raw[i].data;
      return !data || hash(data) !== curHash;           // збігається з теперішнім — показувати нема сенсу
    });
  };

  Cloud.restoreBackup = function (i) {
    var list;
    try { list = JSON.parse(localStorage.getItem(BACKUP) || '[]'); } catch (e) { list = []; }
    var b = list[i];
    if (!b) return Promise.reject(new Error('Копію не знайдено'));
    suppress++;
    try { S.importJSON(b.data); } finally { suppress--; }
    meta.hash = 0;                 // вміст точно розійшовся з серверним
    meta.dirty = true;
    saveMeta();
    if (window.App && window.App.render) window.App.render();
    return push();
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
    if (meta.session && meta.session.access_token) {
      headers['Authorization'] = 'Bearer ' + meta.session.access_token;
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
    });
  }

  /** Запит із авторизацією й автоматичним поновленням токена — для модуля картинок. */
  Cloud.request = function (path, opts) { return api(path, opts); };

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

  function refresh() {
    if (!meta.session || !meta.session.refresh_token) {
      return Promise.reject(new Error('Немає активного входу'));
    }
    return fetch(cfg.url.replace(/\/+$/, '') + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: meta.session.refresh_token })
    }).then(function (res) {
      if (!res.ok) throw new Error('Сесія втратила чинність — увійдіть знову');
      return res.json();
    }).then(function (j) {
      meta.session = {
        access_token: j.access_token,
        refresh_token: j.refresh_token,
        email: (j.user && j.user.email) || (meta.session && meta.session.email)
      };
      saveMeta();
    });
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
      meta.session = {
        access_token: j.access_token,
        refresh_token: j.refresh_token,
        email: (j.user && j.user.email) || email
      };
      /* Семантика входу однозначна: "взяти дані цього акаунта".
         Скидаємо і номер версії, і позначку про незбережені зміни — інакше
         демо-дані свіжого браузера вступили б у конфлікт із серверними
         при кожному вході на новому пристрої.
         Якщо ж сервер порожній (перший пристрій) — syncNow відправить локальне. */
      meta.rev = 0;
      meta.dirty = false;
      meta.hash = 0;
      /* Ключове: скидаємо і час локальної зміни. Інакше свіжий браузер, який
         щойно щось записав (хоч би й порожню базу), вважався б «новішим»
         за сервер — і при вході затер би справжні дані демонстраційними.
         Вхід означає рівно одне: взяти дані цього акаунта. */
      meta.changedAt = null;
      saveMeta();
      setState('syncing');
      return Cloud.syncNow();
    });
  };

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
      meta.session = {
        access_token: j.access_token,
        refresh_token: j.refresh_token,
        email: (j.user && j.user.email) || email
      };
      meta.rev = 0;
      meta.dirty = true;                       // перший акаунт — наші дані мають поїхати на сервер
      meta.hash = 0;
      saveMeta();
      return Cloud.syncNow().then(function () { return true; });
    });
  };

  Cloud.signOut = function () {
    meta.session = null;
    meta.rev = 0;
    meta.dirty = false;
    saveMeta();
    setState('signedout');
  };

  /* ============================================================
     Читання з сервера
     ============================================================ */

  /* Легка перевірка «чи там щось нове»: тягнемо лише номер версії, без даних.
     Це кількасот байтів проти кількох сотень кілобайтів, тому можна питати часто. */
  function pullRev() {
    return api('/rest/v1/state?id=eq.main&select=rev')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (rows) { return rows && rows[0] ? rows[0].rev : null; })
      .catch(function () { return null; });
  }

  function pull() {
    return api('/rest/v1/state?id=eq.main&select=rev,data,device,updated_at')
      .then(function (res) {
        if (!res.ok) throw new Error('Сервер відповів ' + res.status);
        return res.json();
      })
      .then(function (rows) { return rows && rows[0] ? rows[0] : null; });
  }

  /* Прийняти серверну версію замість локальної.
     importJSON усередині викликає S.save(), а він у нас перехоплений — тому
     на час запису глушимо перехоплення, інакше щойно отримані дані одразу
     поїхали б назад на сервер як "зміна". */
  function adopt(row) {
    return Promise.resolve()
      .then(function () {
        var parsed = JSON.parse(row.data);
        if (!parsed || !Array.isArray(parsed.students)) {
          throw new Error('Дані на сервері виглядають пошкодженими');
        }
        // страховка: якщо локальне відрізняється, спершу відкладаємо його копію
        if (hash(localJSON()) !== hash(row.data)) {
          keepBackup('перед прийняттям версії з ' + (row.device || 'іншого пристрою'));
        }
        suppress++;
        try { S.importJSON(row.data); } finally { suppress--; }
        meta.rev = row.rev;
        meta.dirty = false;
        meta.hash = hash(row.data);
        meta.lastSync = new Date().toISOString();
        meta.changedAt = null;         // локальних змін після прийняття немає
        saveMeta();
        setState('idle');              // інакше в картці назавжди залишалось «зберігаю…»

        /* Якщо відкрита дошка — оновлюємо саме її, зберігаючи масштаб і слайд.
           Повне перемальовування скинуло б і те, й інше, а учень дивиться урок
           саме з відкритої дошки. */
        var handled = false;
        try {
          handled = !!(window.V && window.V.boardReload && window.V.boardReload());
        } catch (e) { handled = false; }
        if (!handled && window.App && window.App.render) window.App.render();
      });
  }

  /* ============================================================
     Відправка на сервер
     ============================================================ */

  function push() {
    var data = localJSON();          // зі сховища, не з пам'яті вкладки
    var h = hash(data);

    // нічого не змінилося з останнього разу — не турбуємо мережу
    if (h === meta.hash && meta.rev > 0) {
      meta.dirty = false; saveMeta();
      setState('idle');
      return Promise.resolve();
    }

    setState('syncing');
    var force = forceNext;
    return api('/rest/v1/rpc/save_state', {
      method: 'POST',
      body: JSON.stringify({
        p_data: data, p_base_rev: meta.rev, p_device: deviceName(), p_force: force
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('Сервер відповів ' + res.status);
      return res.json();
    }).then(function (newRev) {
      if (newRev === -1) {
        /* Хтось зберіг між нашим читанням і записом — рідкісний збіг у часі.
           Не турбуємо людину: просто починаємо коло заново, і звичайне
           правило «новіша версія перемагає» вирішить усе саме. */
        if (retry) { setState('error', 'Не вдалося зберегти — спробуйте ще раз'); return; }
        retry = true;
        return Cloud.syncNow().then(function () { retry = false; });
      }

      /* -2 — база не пустила запис, бо він знищив би наявні записи. Таке
         буває, коли на пристрої лежали давні дані. Беремо серверну версію;
         локальна не зникає, вона лягає в mathhub.before-sync. */
      if (newRev === -2) {
        return pull().then(function (row) {
          if (!row) { setState('error', 'Не вдалося зберегти'); return; }
          return adopt(row).then(function () {
            U.toast('На цьому пристрої були давніші дані — підтягнуто повні з сервера', 'ok');
          });
        });
      }
      meta.rev = newRev;
      meta.hash = h;
      meta.dirty = false;
      meta.lastSync = new Date().toISOString();
      saveMeta();
      if (force) forceNext = false;     // дозвіл одноразовий
      setState('idle');
    });
  }

  /**
   * Чи стоїть у базі захист від затирання даних.
   *
   * Перевіряємо без запису: просимо зберегти з завідомо старим номером
   * версії. База відповість -1 («на сервері новіше») і нічого не змінить.
   * Важливо інше — чи вона взагалі знає про аргумент p_force: він є лише
   * в новій, захищеній версії функції. Немає — відповідь 404.
   *
   * Потрібно, щоб не змушувати людину читати SQL, аби дізнатися,
   * чи все налаштовано.
   */
  Cloud.guardInstalled = function () {
    if (!Cloud.available() || !Cloud.signedIn()) return Promise.resolve('unknown');
    /* Тільки коли на сервері вже є наш стан. Інакше save_state піде гілкою
       «першого запуску» і створила б рядок із тим, що ми надіслали, —
       тобто з порожнім документом. Перевірка не має нічого записувати. */
    if (!(meta.rev > 0)) return Promise.resolve('unknown');
    return api('/rest/v1/rpc/save_state', {
      method: 'POST',
      body: JSON.stringify({
        p_data: '{}', p_base_rev: -1, p_device: deviceName(), p_force: false
      })
    }).then(function (res) {
      if (res.status === 404) return 'off';     // база про p_force не чула
      return res.ok ? 'on' : 'unknown';
    }).catch(function () { return 'unknown'; });
  };

  /* ============================================================
     Публічні дії
     ============================================================ */

  Cloud.syncNow = function () {
    if (!Cloud.available() || !Cloud.signedIn()) return Promise.resolve();
    if (!navigator.onLine) { setState('offline'); return Promise.resolve(); }

    setState('syncing');
    return pull().then(function (row) {
      // сервер порожній — це перший запуск, віддаємо локальні дані
      if (!row) return push();

      if (row.rev > meta.rev) {
        /* Обидві сторони змінилися. Питати людину, яку версію залишити, —
           погана ідея: для одного репетитора з ноутбуком і телефоном це
           щоразу однакова відповідь «ту, що новіша». Тому вирішуємо самі.

           Це безпечно, бо жодна з версій не зникає:
           - беремо серверну → локальна лягає в mathhub.before-sync (див. adopt);
           - беремо локальну → серверну архівує тригер на сервері в snapshots.
           Тобто «не та» версія завжди лишається доступною в Налаштуваннях.

           Рішення за ВМІСТОМ, а не за прапорцем dirty: прапорець лежить у
           спільному сховищі, і друга вкладка могла його скинути. */
        var mineChanged = locallyChanged();
        // forceNext — людина щойно щось видалила, і це не втрата, а її намір
        if (mineChanged && localIsNewer(row) && (forceNext || !localLooksTruncated(row))) {
          meta.rev = row.rev;         // підганяємось під серверну нумерацію
          saveMeta();
          return push().then(function () {
            U.toast('Залишено новішу версію — з цього пристрою', 'ok');
          });
        }
        var wasTruncated = mineChanged && localIsNewer(row) &&
          !forceNext && localLooksTruncated(row);
        return adopt(row).then(function () {
          if (wasTruncated) {
            /* Найнебезпечніший випадок: на пристрої лежали давні дані, і за
               часом він виглядав новішим. Кажемо прямо, бо людина щойно
               бачила менше учнів, ніж має бути. */
            U.toast('На цьому пристрої були давніші дані — підтягнуто повні з сервера', 'ok');
            return;
          }
          if (!mineChanged) return;
          // не називаємо пристрій, якщо це той самий, за яким людина сидить —
          // «взято версію з Windows / Chrome» на Windows / Chrome тільки збиває
          var from = (row.device && row.device !== deviceName()) ? row.device : 'іншого пристрою';
          U.toast('Взято новішу версію з ' + from, 'ok');
        });
      }

      return push();
    }).catch(function (e) {
      setState(navigator.onLine ? 'error' : 'offline', e.message);
    });
  };

  /** Чи локальна зміна свіжіша за те, що записано на сервері. */
  function localIsNewer(row) {
    if (!meta.changedAt) return false;          // не знаємо коли — довіряємо серверу
    if (!row.updated_at) return true;
    var mine = new Date(meta.changedAt).getTime();
    var theirs = new Date(row.updated_at).getTime();
    if (!mine || !theirs) return false;
    return mine > theirs;
  }

  /**
   * Чи не є локальна версія обрізаною відносно серверної.
   *
   * Навіщо. «Новіша перемагає» вирішується за часом зміни, а час зміни
   * підіймає будь-яке збереження — навіть те, що програма робить сама на
   * старті. Через це пристрій, який лежав тиждень із давніми даними, після
   * простого відкриття ставав «новішим» і затирав усе, що з'явилося потім.
   *
   * Тому дивимось не лише на час, а й на вміст: якщо на сервері є учні або
   * уроки, яких у нас немає взагалі, це не «свіжіша правка», а втрата.
   * Такі випадки вирішуємо на користь сервера, а локальне лишається в
   * mathhub.before-sync — див. adopt().
   */
  function localLooksTruncated(row) {
    var mine, theirs;
    try {
      mine = JSON.parse(localJSON());
      theirs = JSON.parse(row.data);
    } catch (e) { return true; }               // не прочитали — не ризикуємо
    if (!mine || !theirs) return true;

    function ids(db, name) {
      return (db[name] || []).map(function (x) { return x.id; }).filter(Boolean);
    }
    // учень, якого в нас немає, — найважливіший сигнал: усе решта висить на ньому
    var mineStu = ids(mine, 'students');
    var lost = ids(theirs, 'students').filter(function (id) {
      return mineStu.indexOf(id) < 0;
    });
    if (lost.length) return true;

    // те саме для уроків і оплат: їх втрата так само незворотна
    var names = ['lessons', 'payments', 'homeworks'];
    for (var i = 0; i < names.length; i++) {
      var have = ids(mine, names[i]);
      var gone = ids(theirs, names[i]).filter(function (id) { return have.indexOf(id) < 0; });
      if (gone.length) return true;
    }
    return false;
  }

  /** Розв'язання конфлікту: залишити локальне або взяти серверне. */
  Cloud.resolve = function (keep) {
    if (!Cloud.signedIn()) return Promise.resolve();
    setState('syncing');
    return pull().then(function (row) {
      if (keep === 'remote') {
        if (!row) { setState('idle'); return; }
        return adopt(row).then(function () {
          U.toast('Взято версію з сервера', 'ok');
        });
      }
      // залишаємо локальне: підганяємо номер версії під серверний і перезаписуємо
      meta.rev = row ? row.rev : 0;
      meta.hash = 0;
      saveMeta();
      return push().then(function () {
        U.toast('Залишено версію з цього пристрою', 'ok');
      });
    }).catch(function (e) {
      setState('error', e.message);
    });
  };

  /** Список автоматичних копій. */
  Cloud.snapshots = function () {
    if (!Cloud.signedIn()) return Promise.resolve([]);
    return api('/rest/v1/snapshots?select=id,rev,device,created_at&order=created_at.desc&limit=50')
      .then(function (res) {
        if (!res.ok) throw new Error('Сервер відповів ' + res.status);
        return res.json();
      });
  };

  /** Відновити конкретну копію. Поточний стан перед цим піде в історію сам. */
  Cloud.restoreSnapshot = function (id) {
    return api('/rest/v1/snapshots?id=eq.' + encodeURIComponent(id) + '&select=data,rev')
      .then(function (res) {
        if (!res.ok) throw new Error('Сервер відповів ' + res.status);
        return res.json();
      })
      .then(function (rows) {
        if (!rows || !rows[0]) throw new Error('Копію не знайдено');
        suppress++;
        try { S.importJSON(rows[0].data); } finally { suppress--; }
        meta.dirty = true;
        meta.hash = 0;
        saveMeta();
        if (window.App && window.App.render) window.App.render();
        return push();
      });
  };

  /* ============================================================
     Перехоплення збереження
     ============================================================ */

  function schedulePush() {
    if (suppress > 0) return;
    meta.dirty = true;
    /* changedAt — це час ПРАВКИ ЛЮДИНИ, і саме за ним вирішується, чия
       версія новіша. Тому службові записи його не підіймають: інакше
       пристрій, який лежав тиждень, після простого відкриття програми
       ставав «новішим» — програма сама заповнює розклад із шаблону на
       старті, і цього збереження досить, щоб затерти чужі зміни. */
    if (!housekeeping) meta.changedAt = new Date().toISOString();
    saveMeta();
    if (!Cloud.available() || !Cloud.signedIn()) return;
    if (state !== 'conflict') setState('syncing', 'зміни ще не відправлені');
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      if (state === 'conflict') return;   // не заважаємо, поки людина не вирішила
      Cloud.syncNow();
    }, boardOpen() ? PUSH_DELAY_BOARD : PUSH_DELAY);
  }

  function wrapSave() {
    var orig = S.save;
    S.save = function () {
      orig.apply(S, arguments);
      schedulePush();
    };

    /* База не пропускає запис, який видаляє наявні записи — це захист від
       пристрою з давніми даними. Але коли видаляє людина, це саме те, чого
       вона хоче. Тому позначаємо такі дії, і найближче відправлення йде
       з дозволом. */
    ['remove', 'removeStudent', 'removeLesson', 'removeBoard'].forEach(function (name) {
      var fn = S[name];
      if (typeof fn !== 'function') return;
      S[name] = function () {
        forceNext = true;
        return fn.apply(S, arguments);
      };
    });
  }

  /* Кілька вкладок одного сайту ділять сховище, але кожна тримає власну копію
     бази в пам'яті. Без цього обробника вкладка, відкрита раніше, лишалася зі
     старим станом і при першій же дії записувала його поверх свіжого —
     а з синхронізацією ще й відправляла на сервер. Тепер вона перечитує базу
     одразу, як тільки інша вкладка щось зберегла. */
  function watchOtherTabs() {
    window.addEventListener('storage', function (e) {
      if (e.key !== DB_KEY || !e.newValue) return;
      if (suppress > 0) return;
      suppress++;
      try {
        S.load();
        if (window.App && window.App.render) window.App.render();
      } finally { suppress--; }
      // вміст змінився не нами — перевіримо, чи треба щось відправити
      if (Cloud.available() && Cloud.signedIn() && state !== 'conflict') Cloud.syncNow();
    });
  }

  /** Відправити негайно, не чекаючи паузи (перед закриттям, при згортанні). */
  Cloud.flush = function () {
    if (timer) { clearTimeout(timer); timer = null; }
    // за вмістом, а не за прапорцем — див. locallyChanged()
    if (state !== 'conflict' && (meta.dirty || locallyChanged())) return Cloud.syncNow();
    return Promise.resolve();
  };

  /* ============================================================
     Старт
     ============================================================ */

  /* Стеження за змінами з інших пристроїв.

     Без цього зміни з телефона з'являлися на комп'ютері лише після
     перезавантаження сторінки — саме на це й скаржилися.

     Питаємо лише номер версії, тому запит крихітний. Повні дані тягнемо
     тільки коли номер справді змінився. У прихованій вкладці не питаємо
     взагалі: там нікому дивитися, а батарею економимо. */
  var WATCH_MS = 12000;        // звичайний ритм
  var WATCH_MS_BOARD = 2200;   // коли відкрита дошка — урок іде просто зараз
  var watchTimer = null;

  /** Чи відкрита зараз дошка. Від цього залежить, наскільки квапитись. */
  function boardOpen() {
    try { return !!(window.V && window.V.boardMountedFor && window.V.boardMountedFor()); }
    catch (e) { return false; }
  }

  /* Не setInterval, а ланцюжок setTimeout: так ритм можна міняти на льоту —
     коли відкривають дошку, опитування само пришвидшується. */
  function startWatching() {
    if (watchTimer) return;
    var tick = function () {
      watchTimer = setTimeout(function () {
        watchTimer = null;
        var go = document.visibilityState !== 'hidden' &&
                 Cloud.available() && Cloud.signedIn() && navigator.onLine &&
                 state !== 'syncing';
        if (!go) { tick(); return; }
        pullRev().then(function (rev) {
          if (rev != null && rev > meta.rev) Cloud.syncNow();
        }).then(tick, tick);
      }, boardOpen() ? WATCH_MS_BOARD : WATCH_MS);
    };
    tick();
  }

  Cloud.start = function () {
    if (started) return;
    started = true;

    /* Стеження й обробники вмикаємо ЗАВЖДИ, ще до перевірок.
       Раніше вони стояли після виходів нижче — тому якщо на момент
       завантаження вхід ще не був зроблений, зміни з інших пристроїв
       не з'являлися до перезавантаження сторінки.
       Самі обробники щоразу перевіряють умови, тож у вимкненому стані
       вони нічого не роблять. */
    startWatching();
    window.addEventListener('online', function () { Cloud.syncNow(); });
    window.addEventListener('offline', function () {
      if (Cloud.available() && Cloud.signedIn()) setState('offline');
    });
    document.addEventListener('visibilitychange', function () {
      if (!Cloud.available() || !Cloud.signedIn()) return;
      if (document.visibilityState === 'hidden') Cloud.flush();
      else Cloud.syncNow();
    });

    if (!Cloud.available()) { setState('off'); return; }
    if (!Cloud.signedIn()) { setState('signedout'); return; }

    Cloud.syncNow();
  };

  window.Cloud = Cloud;

  /* Перехоплення ставимо негайно, ще до старту програми: інакше збереження
     на завантаженні (заповнення розкладу з шаблону) пройшли б непоміченими
     й не потрапили б на сервер. */
  loadMeta();
  wrapSave();
  watchOtherTabs();   // потрібно навіть без синхронізації: вкладки псували дані й раніше

  /* А от мережу чіпаємо лише після того, як app.js відмалював інтерфейс —
     перше відкриття не має чекати на сервер. */
  if (document.readyState === 'complete') Cloud.start();
  else window.addEventListener('load', function () { Cloud.start(); });
})();
