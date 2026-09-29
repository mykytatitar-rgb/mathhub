/* Сховище: модель даних, localStorage, вибірки */
(function () {
  'use strict';

  var KEY = 'mathhub.db.v1';

  /* Дошки лежать окремо від решти бази — і тут, і на сервері.

     Раніше все було одним документом: кожен штрих на дошці означав «перепиши
     всю базу цілком». Через це помилка в будь-якому іншому місці забирала
     дошку заразом, а пристрій із давніми даними приносив старе про все одразу.
     Тепер запис дошки не торкається учнів і фінансів, а запис бази не
     торкається дошок. */
  var BOARDS_KEY = 'mathhub.boards.v1';          // давній формат: усі дошки одним записом
  /* Кожна дошка — окремим записом, плюс список їхнього порядку. Коли дошки
     лежали одним записом, збереження після кожного штриха переписувало всі
     дошки разом — 5 МБ і 70–200 мс заморозки, і олівець підвисав. Тепер
     переписується лише змінена дошка. Давній запис не стирається: з нього
     дочитується те, чого раптом бракує в новому. */
  var BOARD_PREFIX = 'mathhub.board:';
  var BOARD_ORDER = 'mathhub.boards.order';
  var U = window.U;

  var S = {};

  /* ============================================================
     Довідники
     ============================================================ */

  S.COLORS = ['#1358F5', '#7A5AF8', '#17B26A', '#F79009', '#E5484D',
              '#06AED4', '#DD2590', '#5C6C8A', '#8B5CF6', '#0E9F5B'];

  S.LESSON_STATUS = {
    planned:   { label: 'Заплановано', badge: 'badge',         slot: '' },
    done:      { label: 'Проведено',   badge: 'badge--green',  slot: 'slot--done' },
    moved:     { label: 'Перенесено',  badge: 'badge--violet', slot: 'slot--moved' },
    cancelled: { label: 'Скасовано',   badge: 'badge--grey',   slot: 'slot--cancelled' },
    missed:    { label: 'Пропуск',     badge: 'badge--red',    slot: 'slot--missed' }
  };

  /** Статуси, які не займають місце в розкладі й не йдуть у гроші. */
  S.INACTIVE_STATUS = ['cancelled', 'moved'];

  S.HW_STATUS = {
    assigned:  { label: 'Задано',      badge: 'badge--amber' },
    submitted: { label: 'Здано',       badge: 'badge--violet' },
    checked:   { label: 'Перевірено',  badge: 'badge--green' },
    skipped:   { label: 'Не виконано', badge: 'badge--red' }
  };

  S.TOPICS = [
    'Числа і вирази',
    'Рівняння і нерівності',
    'Функції та графіки',
    'Числові послідовності',
    'Тригонометрія',
    'Похідна та її застосування',
    'Інтеграл і первісна',
    'Планіметрія',
    'Стереометрія',
    'Координати і вектори',
    'Комбінаторика, ймовірність, статистика',
    'Текстові задачі та відсотки'
  ];

  /* Порядок тем у підготовці. Не абетковий і не той, що в S.TOPICS:
     тут теми стоять так, як їх реально проходять — спершу те, без чого
     не піде далі (вирази, рівняння), і аж потім те, що на них спирається. */
  S.ROADMAP_TEMPLATES = {
    nmt: [
      'Числа і вирази',
      'Рівняння і нерівності',
      'Текстові задачі та відсотки',
      'Функції та графіки',
      'Числові послідовності',
      'Тригонометрія',
      'Похідна та її застосування',
      'Інтеграл і первісна',
      'Планіметрія',
      'Стереометрія',
      'Координати і вектори',
      'Комбінаторика, ймовірність, статистика',
      'Повторення і пробні тести'
    ],
    dpa: [
      'Числа і вирази',
      'Рівняння і нерівності',
      'Текстові задачі та відсотки',
      'Функції та графіки',
      'Планіметрія',
      'Стереометрія',
      'Повторення і пробні тести'
    ]
  };

  /** Який шаблон пасує цій цілі. Нічого не вгадали — беремо теми як є. */
  S.roadmapTemplateFor = function (goal) {
    var g = String(goal || '').toLowerCase();
    if (g.indexOf('нмт') > -1 || g.indexOf('зно') > -1 || g.indexOf('вступ') > -1) {
      return S.ROADMAP_TEMPLATES.nmt;
    }
    if (g.indexOf('дпа') > -1) return S.ROADMAP_TEMPLATES.dpa;
    return S.TOPICS.slice();
  };

  /** Підказки для поля «Ціль». Користувач може вписати будь-що своє. */
  S.GOALS = ['НМТ-2026', 'НМТ-2027', 'НМТ-2028', 'ДПА', 'Шкільна програма',
             'Олімпіади', 'Вступ до вишу', 'Підготовка до SAT', 'Іспит IB / A-level',
             'Наздогнати клас', 'Математика для себе'];

  /** Стандартні цілі + усі власні, які вже трапляються в учнів. */
  S.allGoals = function () {
    var out = S.GOALS.slice();
    (db ? db.students : []).forEach(function (s) {
      if (s.goal && out.indexOf(s.goal) < 0) out.push(s.goal);
    });
    return out;
  };

  /* ============================================================
     Стан
     ============================================================ */

  var db = null;

  function blank() {
    return {
      version: 1,
      tutor: { name: 'Микита', subject: 'Математика', defaultPrice: 500, defaultDuration: 60,
               currency: 'UAH', meetUrl: '' },
      students: [],
      lessons: [],
      homeworks: [],
      payments: [],
      progress: [],   // {id, studentId, topic, level 0..100, updatedAt}
      roadmap: [],    // {id, studentId, title, topic, status, due, note, ord}
      desk: [],       // мої власні справи: {id, title, note, status, tag}
      mathmap: [],    // моя карта математики: {id: тема, s: 0..3, note, at}
      stumap: [],     // карта учня: {id: учень~тема, studentId, topic, s: 0..3, note, at}
      materials: [],
      notes: [],
      boards: []      // {id, lessonId, slides:[{id,title,bg,items:[]}], updatedAt}
    };
  }

  /* ============================================================
     Коли прочитати не вдалося
     ============================================================

     Головне правило всього сховища: «я не зміг прочитати» ніколи не означає
     «там порожньо». Раніше означало — і саме через це зникали дошки. Якщо
     розбір збереженого падав, програма бралася за порожню базу й одразу
     записувала її поверх нечитаного. Один невдалий запуск — і на пристрої
     не лишалося нічого, причому назавжди, бо оригінал уже затерто.

     Тепер невдале читання забороняє запис. Дані лишаються на диску такими,
     якими були, і їх ще можна врятувати. Заборона окрема для документа й
     для дошок: якщо не прочиталися лише дошки, решта програми має
     працювати. */
  var readFailed = { doc: false, boards: false };

  S.readFailed = function () { return { doc: readFailed.doc, boards: readFailed.boards }; };

  var warned = false;
  function warnBlocked() {
    if (warned) return;
    warned = true;
    console.warn('Збережені дані не прочиталися — запис на цьому пристрої зупинено, щоб їх не затерти');
  }

  S.load = function () {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }

    if (raw) {
      try {
        db = JSON.parse(raw);
        var b = blank();
        Object.keys(b).forEach(function (k) { if (db[k] === undefined) db[k] = b[k]; });
        adoptBoardsStore(db);
        return db;
      } catch (e) {
        /* Запис є, але не читається. Це не порожня база — це пошкоджена,
           і найгірше, що можна зробити, — записати поверх неї порожню. */
        console.warn('Збережені дані не прочиталися:', e);
        readFailed.doc = true;
        readFailed.boards = true;
        db = blank();
        warnBlocked();
        return db;
      }
    }

    /* Порожній браузер. Демо-дані показуємо лише тоді, коли синхронізації немає:
       інакше свіжий браузер (чи інший браузер на тому самому комп'ютері)
       вигадав би шістьох неіснуючих учнів, і після входу вони — як щойно
       створені, тобто «новіші» — могли б поїхати на сервер поверх справжніх.
       Коли синхронізація налаштована, чекаємо на справжні дані з сервера. */
    var syncReady = !!(window.CLOUD_CONFIG && window.CLOUD_CONFIG.url && window.CLOUD_CONFIG.anonKey);
    db = syncReady ? blank() : seed();
    S.save();
    return db;
  };

  /**
   * Підставити дошки з їхнього власного сховища.
   *
   * Якщо окремого сховища ще немає — це перше відкриття після поділу:
   * забираємо дошки з документа й одразу відкладаємо їх на нове місце.
   * Ті, що лишилися в документі, не чіпаємо: вони знадобляться, якщо
   * доведеться відкрити цю базу старою версією програми.
   */
  function diskGet(k) { return window.Disk ? Disk.get(k) : localStorage.getItem(k); }
  function diskSet(k, v) {
    if (window.Disk) { Disk.set(k, v); return; }
    if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v);
  }
  function diskKeys(prefix) {
    if (window.Disk && Disk.keys) return Disk.keys(prefix);
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(prefix) === 0) out.push(k);
    }
    return out;
  }
  function boardKey(b) { return b && (b.lessonId || b.id); }

  /** Дошки з окремих записів. null — нового формату ще немає. Кидає, якщо не розібрався. */
  function readSplitBoards() {
    var order = diskGet(BOARD_ORDER);
    if (!order) return null;
    var ids = JSON.parse(order);
    if (!Array.isArray(ids)) throw new Error('очікувався список дошок');
    var list = [], seen = {}, missing = [];
    ids.forEach(function (id) {
      var raw = diskGet(BOARD_PREFIX + id);
      if (raw) { list.push(JSON.parse(raw)); seen[id] = 1; } else missing.push(id);
    });
    // записані окремо, але не внесені в порядок — запис міг перерватися
    diskKeys(BOARD_PREFIX).forEach(function (key) {
      var id = key.slice(BOARD_PREFIX.length);
      if (seen[id]) return;
      var raw = diskGet(key);
      if (raw) { list.push(JSON.parse(raw)); seen[id] = 1; }
    });
    // чого бракує — з давнього спільного запису
    if (missing.length) {
      var old = [];
      try { old = JSON.parse(diskGet(BOARDS_KEY) || '[]') || []; } catch (e) { old = []; }
      old.forEach(function (b) {
        var id = boardKey(b);
        if (id && !seen[id] && missing.indexOf(id) >= 0) { list.push(b); seen[id] = 1; }
      });
      boardsDirty = true;                  // дописати його вже окремими записами
    }
    return list;
  }

  function adoptBoardsStore(doc) {
    if (window.Disk && Disk.broken()) {
      // дошки лежать в IndexedDB, який зараз не читається, — «порожньо» тут не правда
      readFailed.boards = true;
      doc.boards = [];
      warnBlocked();
      return;
    }
    try {
      var split = readSplitBoards();
      if (split) { doc.boards = split; return; }
    } catch (e) {
      console.warn('Дошки не прочиталися:', e);
      readFailed.boards = true;
      doc.boards = [];
      warnBlocked();
      return;
    }

    var raw = null;
    try { raw = window.Disk ? Disk.get(BOARDS_KEY) : localStorage.getItem(BOARDS_KEY); } catch (e) { raw = null; }

    if (raw) {
      /* Запис про дошки є. Далі можливі лише два кінці: або ми його
         прочитали, або не чіпаємо нічого. Третього — «вважати, що дошок
         немає» — не існує: саме він і стирав їх усі разом. */
      try {
        var arr = JSON.parse(raw);
        // прочитано з давнього формату — наступне збереження перекладе в новий
        if (Array.isArray(arr)) { doc.boards = arr; boardsDirty = true; return; }
        throw new Error('очікувався список дошок');
      } catch (e) {
        console.warn('Дошки не прочиталися:', e);
        readFailed.boards = true;
        doc.boards = [];          // у памʼяті порожньо, але на диск це не поїде
        warnBlocked();
        return;
      }
    }

    // запису немає взагалі — це справді перший запуск або перенесення зі старого документа
    doc.boards = Array.isArray(doc.boards) ? doc.boards : [];
    boardsDirty = true;
  }

  /* Дошки серіалізуються окремо й лише коли справді змінилися: інакше
     збереження одного учня щоразу переписувало б усі дошки цілком.
     boardsDirty — переписати всі; dirtyIds — лише названі. */
  var boardsDirty = false;
  var dirtyIds = {};
  var writtenOrder = null;

  /** Сказати сховищу, що дошка (id) або всі дошки змінилися повз S.saveBoard. */
  S.touchBoards = function (id) {
    if (id) dirtyIds[id] = 1; else boardsDirty = true;
  };

  function writeBoards() {
    var ids = db.boards.map(boardKey);
    var order = JSON.stringify(ids);
    if (boardsDirty) {
      db.boards.forEach(function (b) { diskSet(BOARD_PREFIX + boardKey(b), JSON.stringify(b)); });
      diskKeys(BOARD_PREFIX).forEach(function (key) {
        if (ids.indexOf(key.slice(BOARD_PREFIX.length)) < 0) diskSet(key, null);
      });
    } else {
      Object.keys(dirtyIds).forEach(function (id) {
        var b = null;
        for (var i = 0; i < db.boards.length; i++) if (boardKey(db.boards[i]) === id) { b = db.boards[i]; break; }
        diskSet(BOARD_PREFIX + id, b ? JSON.stringify(b) : null);
      });
    }
    // порядок — останнім: окремі записи дошок лягають раніше за список
    if (boardsDirty || order !== writtenOrder) { diskSet(BOARD_ORDER, order); writtenOrder = order; }
    boardsDirty = false;
    dirtyIds = {};
  }

  /* Хто хоче знати про зміни в базі. Потрібно тому, що портал учня —
     це знімок даних на сервері, і його треба переробляти сам, а не
     чекати, поки репетитор згадає натиснути «Оновити». */
  var saveHooks = [];
  S.onSave = function (fn) { if (typeof fn === 'function') saveHooks.push(fn); };

  var lastSaveFailed = false;

  /** Чи останній запис у браузер не вдався — тоді свіжі дані лише в пам'яті. */
  S.lastSaveFailed = function () { return lastSaveFailed; };

  /* Останній записаний документ бази (без дошок). За ним обмін записами
     одразу бачить, що змінилися лише дошки, і не перебирає всіх учнів. */
  var lastDoc = '';
  S.lastDoc = function () { return lastDoc; };

  /** База без дошок — як вона лягає в браузер і їде на сервер. */
  S.docJSON = function () {
    var doc = {};
    Object.keys(db).forEach(function (k) { if (k !== 'boards') doc[k] = db[k]; });
    return JSON.stringify(doc);
  };

  S.save = function () {
    try {
      /* Нечитане не перезаписуємо. У памʼяті зараз порожньо не тому, що
         даних немає, а тому, що ми їх не розібрали, — і запис звідси стер
         би оригінал остаточно. */
      if (readFailed.doc) { warnBlocked(); return; }

      lastDoc = S.docJSON();
      localStorage.setItem(KEY, lastDoc);
      lastSaveFailed = false;

      var anyDirty = boardsDirty || Object.keys(dirtyIds).length > 0;
      if (anyDirty && !readFailed.boards) {
        writeBoards();
      } else if (anyDirty) {
        warnBlocked();
      }
    } catch (e) {
      /* Не щоразу: при переповненому сховищі кожна дія давала нове червоне
         вікно, і посеред уроку ними засипало весь екран. Раз на 10 хвилин
         досить, щоб знати; дані тим часом ідуть на сервер із пам'яті. */
      lastSaveFailed = true;
      console.warn('S.save (локально не записалось, на сервер іде з памʼяті):', e);
    }
    // збій в одному слухачі не має валити збереження
    saveHooks.forEach(function (fn) {
      try { fn(); } catch (e) { console.warn('onSave:', e); }
    });
  };

  S.db = function () { return db; };

  S.reset = function () {
    db = seed(); boardsDirty = true; S.save();
    if (window.ImgStore && window.ImgStore.available()) window.ImgStore.gc([]);
  };

  S.wipe = function () {
    var R = window.RecSync;
    var syncing = !!(R && window.Cloud && Cloud.available() && Cloud.signedIn());
    var keepTutor = db && db.tutor;
    if (syncing) {
      /* З обміном «очистити» — отже, всюди. Досі база заміщувалась порожньою
         лише тут: сервер про видалення не знав, і наступне читання
         привозило все назад (або воно лишалось на інших пристроях). Кожен
         запис — «видалено» поіменно, кожна дошка — повним шляхом. */
      R.KINDS.forEach(function (kind) {
        if (kind === 'meta') return;
        (db[kind] || []).forEach(function (rec) { if (rec && rec.id) R.markDeleted(kind, rec.id); });
      });
      (db.boards || []).slice().forEach(function (b) { if (b && b.lessonId) S.removeBoard(b.lessonId); });
    }
    db = blank();
    // профіль і налаштування — не «дані» учнів: порожній профіль затер би справжній на всіх пристроях
    if (syncing && keepTutor) db.tutor = keepTutor;
    boardsDirty = true; S.save();
    if (window.ImgStore && window.ImgStore.available()) window.ImgStore.gc([]);
  };

  /* Службове поле обміну дошок (_sync) у файл не йде: воно подвоює розмір і
     має сенс лише для цього браузера. */
  function noSync(k, v) { return k === '_sync' ? undefined : v; }
  S.exportJSON = function () { return JSON.stringify(db, noSync, 2); };

  /**
   * Замінити базу вмістом документа.
   *
   * keepBoards — для синхронізації. Документ на сервері дошок більше не
   * містить: вони їдуть окремо. Без цього прапорця прийняття версії з
   * іншого пристрою стирало б усі дошки, бо в документі їх просто немає.
   * Файл резервної копії, навпаки, дошки містить — і має право їх замінити.
   */
  S.importJSON = function (text, opts) {
    var parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.students)) throw new Error('Файл не схожий на резервну копію mathhub');

    /* Порожній чи відсутній список означає не «записів немає», а «цей
       документ про них не знає».

       Так виглядає документ, збережений версією програми до того, як дошки
       й записи переїхали у власні сховища: вона просто не бачила їх на
       новому місці. Прийняти таке за правду означало б стерти все — тобто
       рівно ту втрату, заради якої переїзд і робився.

       Файл резервної копії — інша річ: там списки справжні, і він має
       право замінювати. Тому порожнеча ігнорується, а вміст ні. */
    var OWN_STORE = ['boards'].concat(window.RecSync ? RecSync.KINDS : []);
    var keep = !!(opts && opts.keepBoards);

    var incoming = {};
    OWN_STORE.forEach(function (k) {
      incoming[k] = (Array.isArray(parsed[k]) && parsed[k].length) ? parsed[k] : null;
    });

    var b = blank();
    Object.keys(b).forEach(function (k) { if (parsed[k] === undefined) parsed[k] = b[k]; });

    OWN_STORE.forEach(function (k) {
      parsed[k] = (keep || !incoming[k]) ? ((db && db[k]) || []) : incoming[k];
    });

    /* Дошки з файлу лягають поверх теперішніх, але пам'ять обміну лишається
       теперішня. Тоді повернене з копії — це звичайна зміна дошки: вона
       поїде в журнал і дійде до всіх пристроїв, а не загубиться. */
    if (!keep && incoming.boards && db && db.boards) {
      var mine = {};
      db.boards.forEach(function (b) { if (b && b._sync) mine[b.lessonId] = b._sync; });
      parsed.boards.forEach(function (b) {
        if (!b) return;
        delete b._sync;
        if (mine[b.lessonId]) b._sync = mine[b.lessonId];
      });
    }

    db = parsed;
    boardsDirty = !keep && !!incoming.boards;
    S.save();
  };

  /* ============================================================
     CRUD
     ============================================================ */

  function coll(name) { return db[name]; }

  S.get = function (name, id) {
    var list = coll(name);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };

  /* Кожна зміна називає себе поіменно: «оновився цей учень», «видалено цю
     оплату». Раніше зміна будь-чого означала «відправ усю базу», і саме
     той запис умів стирати сусіднє. */
  function sync(name, id) { if (window.RecSync) RecSync.mark(name, id); }
  function syncDel(name, id) { if (window.RecSync) RecSync.markDeleted(name, id); }

  S.add = function (name, obj) {
    obj.id = obj.id || U.uid(name.slice(0, 3));
    obj.createdAt = obj.createdAt || new Date().toISOString();
    coll(name).push(obj);
    S.save();
    sync(name, obj.id);
    return obj;
  };

  /* ============================================================
     Звільнені місця постійного розкладу
     ============================================================

     Постійний розклад іде в календар однією повторюваною подією: «щопонеділка
     о 17:30». Коли урок із цього слота перетягують на інший день або
     видаляють, повторення про це не знає — і в Google урок стояв далі на
     старому місці, поруч із новим. Не до наступного оновлення, а назавжди.

     Вгадати звільнене місце з порожнечі в розкладі не можна: порожньо буває
     і там, звідки урок забрали, і там, куди застосунок уроки ще не створив.
     Тому місце записуємо в момент, коли його звільняють, — прямо на учні,
     бо самого уроку після видалення вже немає. */

  function inCurrentSlot(st, iso) {
    if (!st || !st.schedule || !iso) return false;
    var d = U.toDate(iso);
    if (isNaN(d.getTime())) return false;
    var wd = d.getDay() === 0 ? 7 : d.getDay();
    var hhmm = String(iso).slice(11, 16);
    return st.schedule.some(function (s) { return Number(s.day) === wd && s.time === hhmm; });
  }

  function markSlotGone(lesson) {
    if (!lesson || !lesson.fromTemplate) return;
    var st = S.get('students', lesson.studentId);
    var iso = String(lesson.date || '').slice(0, 16);

    /* Лише місце, яке й досі є в розкладі. Коли розклад змінюють, старі
       уроки прибираються, — але їхні дні вже не повторюються, і пам'ятати
       їх нема для чого. */
    if (!inCurrentSlot(st, iso)) return;

    var now = new Date();
    if (!(U.toDate(iso) > now)) return;                  // минуле не чіпаємо

    // заразом прибираємо те, що вже минуло або випало з розкладу
    var keep = (st.slotGone || []).filter(function (x) {
      return x !== iso && U.toDate(x) > now && inCurrentSlot(st, x);
    });
    keep.push(iso);
    st.slotGone = keep.sort();
    st.updatedAt = now.toISOString();
    sync('students', st.id);
  }

  S.update = function (name, id, patch) {
    var item = S.get(name, id);
    if (!item) return null;
    var moved = name === 'lessons' && patch && patch.date && patch.date !== item.date;
    if (moved) markSlotGone(item);
    Object.keys(patch).forEach(function (k) { item[k] = patch[k]; });

    /* Урок, який переставили рукою, більше не належить шаблону. Інакше при
       наступній зміні постійного розкладу прибирання вважало його «старим
       уроком за попереднім розкладом» і мовчки видаляло — хоча його місце
       людина обрала сама. Знімаємо позначку вже після латки: форма уроку
       може повернути її назад разом з усіма полями. */
    if (moved && item.fromTemplate) delete item.fromTemplate;
    item.updatedAt = new Date().toISOString();
    S.save();
    sync(name, id);
    return item;
  };

  S.remove = function (name, id) {
    var list = coll(name);
    var i = list.findIndex(function (x) { return x.id === id; });
    if (i >= 0) { list.splice(i, 1); S.save(); syncDel(name, id); return true; }
    return false;
  };

  /* Видалення пачкою — коли прибирають учня разом з усім, що на ньому
     висіло. Кожен запис має назвати себе окремо, інакше на сервері
     лишаться сироти: уроки без учня, оплати без уроку. */
  function syncDelMany(name, list) {
    (list || []).forEach(function (x) { if (x && x.id) syncDel(name, x.id); });
  }

  /** Видалити учня разом з усім, що на нього зав'язано. */
  S.removeStudent = function (id) {
    var lessonIds = db.lessons.filter(function (l) { return l.studentId === id; })
      .map(function (l) { return l.id; });
    /* Кожну дошку — повним шляхом: разом із журналом, історією й знімком на
       сервері. Досі їх лише вирізали тут, і наступне читання з сервера
       привозило всі дошки видаленого учня назад сиротами. */
    lessonIds.forEach(function (lid) { S.removeBoard(lid); });
    ['lessons', 'homeworks', 'payments', 'progress', 'roadmap', 'notes', 'stumap'].forEach(function (name) {
      if (!Array.isArray(db[name])) return;
      var gone = db[name].filter(function (x) { return x.studentId === id; });
      db[name] = db[name].filter(function (x) { return x.studentId !== id; });
      syncDelMany(name, gone);
    });
    db.students = db.students.filter(function (x) { return x.id !== id; });
    syncDel('students', id);
    S.save();
    S.gcImages();
  };

  /* ============================================================
     Вибірки
     ============================================================ */

  S.students = function () {
    return U.sortBy(db.students.filter(function (s) { return !s.archived; }), function (s) { return s.name; });
  };

  S.archivedStudents = function () {
    return db.students.filter(function (s) { return s.archived; });
  };

  S.lessonsOf = function (studentId) {
    return U.sortBy(db.lessons.filter(function (l) { return l.studentId === studentId; }),
      function (l) { return l.date; }, true);
  };

  /** Заплановані уроки цього учня попереду — ті, що зникнуть із розкладу в архіві. */
  S.upcomingOf = function (studentId) {
    var now = new Date();
    return db.lessons.filter(function (l) {
      return l.studentId === studentId && l.status === 'planned' && U.toDate(l.date) >= now;
    });
  };

  S.homeworksOf = function (studentId) {
    return U.sortBy(db.homeworks.filter(function (h) { return h.studentId === studentId; }),
      function (h) { return h.dueDate; }, true);
  };

  S.paymentsOf = function (studentId) {
    return U.sortBy(db.payments.filter(function (p) { return p.studentId === studentId; }),
      function (p) { return p.date; }, true);
  };

  S.notesOf = function (studentId) {
    return U.sortBy(db.notes.filter(function (n) { return n.studentId === studentId; }),
      function (n) { return n.date; }, true);
  };

  S.progressOf = function (studentId) {
    return db.progress.filter(function (p) { return p.studentId === studentId; });
  };

  S.progressLevel = function (studentId, topic) {
    var p = db.progress.find(function (x) { return x.studentId === studentId && x.topic === topic; });
    return p ? p.level : null;
  };

  /* ============================================================
     Роудмап: план підготовки під ціль учня
     ============================================================

     Це не автоматичний розклад, а план тем у тому порядку, у якому їх
     збираються пройти. Стан кожного етапу веде репетитор; готовність
     самої теми окремо не дублюємо — вона вже є в progress. */

  S.ROADMAP_STATUS = {
    todo:  { label: 'Попереду',   badge: 'badge--grey' },
    doing: { label: 'У роботі',   badge: 'badge--violet' },
    done:  { label: 'Пройдено',   badge: 'badge--green' },
    skip:  { label: 'Пропускаємо', badge: 'badge--amber' }
  };

  S.roadmapOf = function (studentId) {
    return db.roadmap
      .filter(function (r) { return r.studentId === studentId; })
      .sort(function (a, b) { return (a.ord || 0) - (b.ord || 0); });
  };

  function nextOrd(studentId) {
    var list = S.roadmapOf(studentId);
    return list.length ? (list[list.length - 1].ord || 0) + 10 : 10;
  }

  S.addRoadmapStep = function (studentId, step) {
    return S.add('roadmap', {
      studentId: studentId,
      title: (step && step.title) || '',
      topic: (step && step.topic) || '',
      status: (step && step.status) || 'todo',
      due: (step && step.due) || '',
      note: (step && step.note) || '',
      ord: nextOrd(studentId)
    });
  };

  /**
   * Скласти план із шаблону під ціль учня. Уже наявні етапи не чіпаємо
   * і не дублюємо: людина могла дописати своє, і затирати це — образливо.
   * Повертає, скільки додано.
   */
  S.fillRoadmap = function (studentId) {
    var st = S.get('students', studentId);
    if (!st) return 0;
    var have = S.roadmapOf(studentId).map(function (r) {
      return (r.topic || r.title).toLowerCase();
    });
    var added = 0;
    S.roadmapTemplateFor(st.goal).forEach(function (t) {
      if (have.indexOf(t.toLowerCase()) > -1) return;
      S.addRoadmapStep(studentId, { title: t, topic: S.TOPICS.indexOf(t) > -1 ? t : '' });
      added++;
    });
    return added;
  };

  /** Пересунути етап на позицію вище або нижче сусіда. */
  S.moveRoadmapStep = function (id, dir) {
    var step = S.get('roadmap', id);
    if (!step) return false;
    var list = S.roadmapOf(step.studentId);
    var i = list.findIndex(function (r) { return r.id === id; });
    var j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return false;
    var a = list[i].ord || 0, b = list[j].ord || 0;
    list[i].ord = b;
    list[j].ord = a;
    S.save();
    return true;
  };

  /** Скільки етапів пройдено — для смужки поступу. Пропущені не рахуємо взагалі. */
  S.roadmapStats = function (studentId) {
    var list = S.roadmapOf(studentId);
    var counted = list.filter(function (r) { return r.status !== 'skip'; });
    var done = counted.filter(function (r) { return r.status === 'done'; }).length;
    var doing = list.filter(function (r) { return r.status === 'doing'; });
    return {
      total: counted.length,
      done: done,
      doing: doing[0] || null,
      next: counted.filter(function (r) { return r.status === 'todo'; })[0] || null,
      percent: counted.length ? Math.round(done / counted.length * 100) : 0
    };
  };

  S.setProgress = function (studentId, topic, level) {
    var p = db.progress.find(function (x) { return x.studentId === studentId && x.topic === topic; });
    if (p) { p.level = level; p.updatedAt = new Date().toISOString(); }
    else { S.add('progress', { studentId: studentId, topic: topic, level: level }); }
    S.save();
  };

  /** Уроки в діапазоні [from, to] включно, за днями. */
  /** Чи учень в архіві, тобто більше не займається. */
  S.isArchived = function (studentId) {
    var s = S.get('students', studentId);
    return !!(s && s.archived);
  };

  /* Архів прибирає з розкладу лише те, чого вже не буде: заплановані уроки
     попереду. Проведене нікуди не дівається — це історія, за яку отримані
     гроші, і вона має лишатися на своєму місці в тижні. Раніше архів ховав
     усі уроки учня, і минулі тижні виглядали так, ніби тих занять не було.
     Якщо учень повернеться, його майбутній розклад повернеться разом із ним. */
  /* У розкладі архівного учня лишається лише те, що СТАЛОСЯ: проведені
     уроки й пропуски — за ними гроші й історія. Заплановані зникають усі,
     і минулі теж: їх наробив постійний розклад, вони ніколи не відбулися
     й тільки засмічують тижні. */
  var ARCHIVE_KEEP = { done: 1, missed: 1 };

  function visible(list) {
    return list.filter(function (l) {
      return !S.isArchived(l.studentId) || !!ARCHIVE_KEEP[l.status];
    });
  }

  S.lessonsBetween = function (from, to) {
    var a = U.ymd(from), b = U.ymd(to);
    return U.sortBy(visible(db.lessons.filter(function (l) {
      var d = l.date.slice(0, 10);
      return d >= a && d <= b;
    })), function (l) { return l.date; });
  };

  S.lessonsOnDay = function (day) {
    var d = U.ymd(day);
    return U.sortBy(visible(db.lessons.filter(function (l) { return l.date.slice(0, 10) === d; })),
      function (l) { return l.date; });
  };

  S.upcoming = function (limit) {
    var now = new Date();
    var list = visible(db.lessons.filter(function (l) {
      return l.status === 'planned' && U.toDate(l.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }));
    list = U.sortBy(list, function (l) { return l.date; });
    return limit ? list.slice(0, limit) : list;
  };

  /**
   * Перевести в архів або повернути. Уроки, оплати й дошки лишаються:
   * архів — це «більше не займається», а не «видалити».
   *
   * Прибираються лише порожні уроки постійного розкладу (isBareTemplate):
   * при архівації — ті, що попереду, при поверненні — ті, що припали на час
   * відсутності. Досі вони лишались: минулі рахувались «не відміченими» й
   * з'їдали запас учня, а після повернення в розкладі зіяла діра, бо
   * заповнення вже пішло далі. Після повернення розклад заповнюється знову.
   */
  S.setArchived = function (studentId, on) {
    var st = S.get('students', studentId);
    if (!st) return null;
    var now = new Date();
    if (on) {
      dropLessons(db.lessons.filter(function (l) {
        return l.studentId === studentId && isBareTemplate(l) && U.toDate(l.date) >= now;
      }));
      return S.update('students', studentId, { archived: true, archivedAt: U.ymd(U.today()) });
    }
    /* Відколи учня не було. Для заархівованих раніше дати немає — тоді від
       останнього проведеного чи пропущеного уроку: до нього учень ходив,
       і невідмічене там може бути справжнім. Без жодного — минуле не чіпаємо. */
    var from = st.archivedAt ? U.toDate(st.archivedAt) : null;
    if (!from) {
      db.lessons.forEach(function (l) {
        if (l.studentId !== studentId || !ARCHIVE_KEEP[l.status]) return;
        var d = U.toDate(l.date);
        if (!from || d > from) from = d;
      });
    }
    if (from) {
      dropLessons(db.lessons.filter(function (l) {
        if (l.studentId !== studentId || !isBareTemplate(l)) return false;
        var d = U.toDate(l.date);
        return d > from && d < now;
      }));
    }
    var rec = S.update('students', studentId, { archived: false, archivedAt: undefined });
    S.fillStudentTemplate(studentId);
    return rec;
  };

  /* ---------- Валюта ---------- */

  /** Валюта конкретного учня; якщо не задана — валюта репетитора. */
  S.curOf = function (studentId) {
    var st = S.get('students', studentId);
    return (st && st.currency) || (db.tutor && db.tutor.currency) || 'UAH';
  };

  S.lessonCur = function (lesson) { return lesson.currency || S.curOf(lesson.studentId); };
  S.paymentCur = function (payment) { return payment.currency || S.curOf(payment.studentId); };

  /**
   * Валюти, які реально є в кабінеті.
   *
   * Раніше рахувались лише активні учні. Через це гроші учня, якого
   * заархівували, зникали з очей: його валюти не було серед перемикачів,
   * а отже й оплат — у списках. Тепер сюди йдуть і валюти самих оплат.
   */
  S.currenciesInUse = function () {
    var out = [];
    function add(c) { if (c && out.indexOf(c) < 0) out.push(c); }
    S.students().forEach(function (s) { add(s.currency || 'UAH'); });
    (db.payments || []).forEach(function (p) { add(S.paymentCur(p)); });
    return out.length ? out : [(db.tutor && db.tutor.currency) || 'UAH'];
  };

  /**
   * Змінити валюту учня. Історія лишається у своїй валюті.
   *
   * Раніше всі уроки й оплати учня перемічувались новою валютою без
   * перерахунку: «$40» ставало «40 ₴», і дохід за минулі місяці падав у
   * сорок разів. Тепер кожен запис, що досі брав валюту з учня (поля
   * currency в ньому не було), отримує її явно — стару. Нова валюта діє
   * лише на те, що створюватиметься далі; баланс зводить обидві
   * (див. inStudentCur). Повертає true, якщо валюта справді змінилась.
   */
  S.setStudentCurrency = function (studentId, code) {
    var st = S.get('students', studentId);
    if (!st || !code) return false;
    var old = S.curOf(studentId);
    if (old === code) return false;
    db.lessons.forEach(function (l) {
      if (l.studentId === studentId && !l.currency) { l.currency = old; l.updatedAt = new Date().toISOString(); }
    });
    db.payments.forEach(function (p) {
      if (p.studentId === studentId && !p.currency) { p.currency = old; p.updatedAt = new Date().toISOString(); }
    });
    st.currency = code;
    st.updatedAt = new Date().toISOString();
    S.save();
    return true;
  };

  /* Сума запису у валюті учня. У тій самій валюті — як є, без жодних
     округлень. В іншій (учень колись платив у доларах, тепер у гривнях) —
     через гривні: за курсом самого запису, а в валюту учня — за нинішнім. */
  function inStudentCur(rec, amount, recCur, stCur) {
    amount = Number(amount) || 0;
    if (!amount || recCur === stCur) return amount;
    var uah = S.uahOf(rec, amount, recCur);
    if (uah == null) return 0;                    // курсу ще немає — не вигадуємо
    if (stCur === 'UAH') return uah;
    var r = (window.Rates && Rates.get(stCur)) || 0;
    return r > 0 ? uah / r : 0;
  }
  function cents(x) { return Math.round(x * 100) / 100; }

  /** Скільки учень сплатив — у його валюті. */
  S.paidOf = function (studentId) {
    var cur = S.curOf(studentId);
    return cents(U.sum(S.paymentsOf(studentId), function (p) {
      return inStudentCur(p, p.amount, S.paymentCur(p), cur);
    }));
  };

  /** Вартість проведених уроків — у валюті учня. */
  S.chargedOf = function (studentId) {
    var cur = S.curOf(studentId);
    return cents(U.sum(db.lessons.filter(function (l) {
      return l.studentId === studentId && l.status === 'done';
    }), function (l) { return inStudentCur(l, l.price || 0, S.lessonCur(l), cur); }));
  };

  /** Згрупувати суми за валютами: {UAH: 12500, USD: 180}. */
  function byCurrency(items, amountFn, curFn) {
    var out = {};
    items.forEach(function (x) {
      var c = curFn(x);
      out[c] = (out[c] || 0) + (Number(amountFn(x)) || 0);
    });
    return out;
  }

  /* ---------- Фінанси ---------- */

  /** Баланс учня: сплачено мінус вартість проведених уроків. Мінус = борг. */
  S.balance = function (studentId) {
    return cents(S.paidOf(studentId) - S.chargedOf(studentId));
  };

  /** Скільки оплачених уроків лишилось (за поточною ціною). */
  S.lessonsLeft = function (studentId) {
    var st = S.get('students', studentId);
    var price = (st && st.price) || db.tutor.defaultPrice || 1;
    return Math.floor(S.balance(studentId) / price);
  };

  /**
   * Уроки, які вже минули, але не відмічені проведеними.
   *
   * Поки урок не відмічено, його вартість не віднімається від оплат — і
   * гроші за нього виглядають як аванс на майбутнє. Саме звідси беруться
   * «3 уроки оплачено» у того, в кого попереду неоплачений урок.
   */
  S.unmarkedOf = function (studentId) {
    var now = new Date();
    return db.lessons.filter(function (l) {
      return l.studentId === studentId && l.status === 'planned' && U.toDate(l.date) < now;
    });
  };

  /**
   * Справжній запас: оплати мінус проведені уроки мінус ті, що вже
   * відбулися, але ще не відмічені.
   */
  S.creditOf = function (studentId) {
    var st = S.get('students', studentId);
    var price = (st && st.price) || db.tutor.defaultPrice || 0;
    var cur = S.curOf(studentId);
    var hidden = U.sum(S.unmarkedOf(studentId), function (l) {
      return l.price ? inStudentCur(l, l.price, S.lessonCur(l), cur) : price;
    });
    return cents(S.balance(studentId) - hidden);
  };

  /** Оплати за період. Якщо вказано code — лише в цій валюті. */
  S.paymentsBetween = function (from, to, code) {
    var a = U.ymd(from), b = U.ymd(to);
    return db.payments.filter(function (p) {
      var d = p.date.slice(0, 10);
      if (d < a || d > b) return false;
      return !code || S.paymentCur(p) === code;
    });
  };

  /** Проведені уроки за період. Якщо вказано code — лише в цій валюті. */
  S.doneLessonsBetween = function (from, to, code) {
    var a = U.ymd(from), b = U.ymd(to);
    return db.lessons.filter(function (l) {
      var d = l.date.slice(0, 10);
      if (l.status !== 'done' || d < a || d > b) return false;
      return !code || S.lessonCur(l) === code;
    });
  };

  S.incomeBetween = function (from, to, code) {
    return U.sum(S.paymentsBetween(from, to, code), function (p) { return p.amount; });
  };

  /** Зароблено (проведені уроки) за період. */
  S.earnedBetween = function (from, to, code) {
    return U.sum(S.doneLessonsBetween(from, to, code), function (l) { return l.price || 0; });
  };

  /** Надходження за період у розрізі валют: {UAH: 12500, USD: 180}. */
  S.incomeMap = function (from, to) {
    return byCurrency(S.paymentsBetween(from, to), function (p) { return p.amount; }, S.paymentCur);
  };

  /** Нарахування за проведені уроки в розрізі валют. */
  S.earnedMap = function (from, to) {
    return byCurrency(S.doneLessonsBetween(from, to), function (l) { return l.price || 0; }, S.lessonCur);
  };

  /** Сумарні борги в розрізі валют (додатні числа). */
  /**
   * Усі, хто винен, — включно з тими, хто вже не займається.
   *
   * Архів ховає учня з розкладу й списків, але не з фінансів: людина
   * пішла, а борг лишився. Якби ми брали лише активних, сума мовчки
   * зникала б з очей саме тоді, коли про неї найлегше забути.
   */
  S.debtors = function () {
    return db.students.map(function (s) {
      var b = S.balance(s.id);
      return b < 0 ? { s: s, debt: -b, cur: S.curOf(s.id) } : null;
    }).filter(Boolean);
  };

  S.debtMap = function () {
    var out = {};
    S.debtors().forEach(function (d) {
      out[d.cur] = (out[d.cur] || 0) + d.debt;
    });
    return out;
  };

  /* ---------- Статистика учня ---------- */

  S.studentStats = function (studentId) {
    var lessons = S.lessonsOf(studentId);
    var done = lessons.filter(function (l) { return l.status === 'done'; });
    var hw = S.homeworksOf(studentId);
    var prog = S.progressOf(studentId);

    return {
      total: lessons.length,
      done: done.length,
      planned: lessons.filter(function (l) { return l.status === 'planned'; }).length,
      missed: lessons.filter(function (l) { return l.status === 'missed'; }).length,
      hwTotal: hw.length,
      hwPending: hw.filter(function (h) { return h.status === 'assigned' || h.status === 'submitted'; }).length,
      hwSkipped: hw.filter(function (h) { return h.status === 'skipped'; }).length,
      hwChecked: hw.filter(function (h) { return h.status === 'checked'; }).length,
      avgProgress: prog.length ? Math.round(U.sum(prog, function (p) { return p.level; }) / prog.length) : 0,
      topicsCovered: prog.length,
      lastLesson: done.length ? done[0] : null,
      unmarked: S.unmarkedOf(studentId).length,
      credit: S.creditOf(studentId),
      nextLesson: U.sortBy(lessons.filter(function (l) {
        return l.status === 'planned' && U.toDate(l.date) >= U.today();
      }), function (l) { return l.date; })[0] || null,
      balance: S.balance(studentId)
    };
  };

  /** Речі, що потребують уваги, по всій базі. */
  S.attention = function () {
    var out = [];
    var today = U.today();

    // архівні теж: борг не зникає від того, що людина перестала займатися
    S.debtors().forEach(function (d) {
      out.push({
        kind: 'debt', studentId: d.s.id, priority: 1,
        title: d.s.name + (d.s.archived ? ' · в архіві' : ''),
        text: 'Борг ' + U.money(d.debt, d.cur)
      });
    });

    db.homeworks.forEach(function (h) {
      var st = S.get('students', h.studentId);
      if (!st || st.archived) return;
      if (h.status === 'submitted') {
        out.push({
          kind: 'check', studentId: h.studentId, priority: 2,
          title: st.name, text: 'Здав ДЗ на перевірку: ' + h.title
        });
      } else if (h.status === 'assigned' && U.daysBetween(today, h.dueDate) < 0) {
        out.push({
          kind: 'overdue', studentId: h.studentId, priority: 1,
          title: st.name, text: 'Прострочене ДЗ: ' + h.title
        });
      }
    });

    S.students().forEach(function (st) {
      var last = S.lessonsOf(st.id).filter(function (l) { return l.status === 'done'; })[0];
      if (last) {
        var gap = U.daysBetween(last.date, today);
        var hasNext = S.lessonsOf(st.id).some(function (l) {
          return l.status === 'planned' && U.toDate(l.date) >= today;
        });
        if (gap > 14 && !hasNext) {
          out.push({
            kind: 'quiet', studentId: st.id, priority: 3,
            title: st.name, text: 'Без уроків ' + U.pl(gap, 'день', 'дні', 'днів') + ', наступний не призначено'
          });
        }
      }
    });

    return U.sortBy(out, function (x) { return x.priority; });
  };

  /* ============================================================
     Дошки уроків
     ============================================================ */

  S.BOARD_BG = ['grid', 'dots', 'blank'];

  /* kind: 'lesson' — слайди уроку, 'hw' — слайди домашнього завдання.
     hidden: 1 — слайд лишається в репетитора, але учневі не публікується. */
  S.SLIDE_KINDS = ['lesson', 'hw'];

  S.newSlide = function (title, kind) {
    return {
      id: U.uid('sl'), title: title || '', bg: 'grid', items: [],
      kind: kind === 'hw' ? 'hw' : 'lesson', hidden: 0
    };
  };

  /** Слайди одного рядка, у їхньому порядку. Старі слайди без kind — урок. */
  S.slideKind = function (s) { return s && s.kind === 'hw' ? 'hw' : 'lesson'; };

  /**
   * Дохід за період у гривнях — кожна оплата за КУРСОМ СВОГО ДНЯ.
   *
   * Раніше тут була сума по валютах, переведена сьогоднішнім курсом. Через
   * це заробіток за минулий місяць мінявся щодня разом із курсом, хоча
   * гроші отримані давно й більше не змінюються.
   *
   * partial означає «щось порахували наближено»: для якоїсь валюти немає
   * курсу взагалі або архівний за той день ще не приїхав.
   */
  S.incomeUAHBetween = function (from, to) {
    var uah = 0, exact = true, missing = [];

    S.paymentsBetween(from, to).forEach(function (p) {
      var c = S.paymentCur(p);
      var v = S.uahOf(p, p.amount, c);
      if (v == null) {
        exact = false;
        if (missing.indexOf(c) < 0) missing.push(c);
        return;
      }
      uah += v;
      if (c !== 'UAH' && !(p.rate > 0) &&
          window.Rates && Rates.isHistoric && !Rates.isHistoric(c, p.date)) exact = false;
    });

    return { uah: uah, partial: !exact, missing: missing };
  };

  /**
   * Курс, за яким рахувати цей урок або оплату.
   *
   * Спершу той, що записаний у самому записі: його зберігають у мить, коли
   * урок відмічають проведеним чи вносять оплату, — точнішого джерела не
   * буває. Далі архів НБУ за той день. І лише як останній варіант —
   * сьогоднішній курс.
   *
   * Це не дрібниця. Раніше заробіток за минулий тиждень мінявся щодня разом
   * із курсом, хоча гроші давно отримані.
   */
  S.rateFor = function (rec, cur) {
    if (!cur || cur === 'UAH') return 1;
    if (rec && rec.rate > 0) return rec.rate;
    var when = rec && (rec.date || rec.createdAt);
    if (window.Rates && Rates.forDate) return Rates.forDate(cur, when);
    return (window.Rates && Rates.get(cur)) || 0;
  };

  /** Сума запису в гривнях за його власним курсом. */
  S.uahOf = function (rec, amount, cur) {
    var rate = S.rateFor(rec, cur);
    return rate > 0 ? (Number(amount) || 0) * rate : null;
  };

  /**
   * Курс того самого дня, який можна записати в запис назавжди, — або 0.
   *
   * Заморожувати можна лише справжній курс дня: архівний НБУ за ту дату або
   * сьогоднішній, якщо сьогодні курс уже оновлено. Досі урок, відмічений у
   * пʼятницю за понеділок, отримував пʼятничний курс (архівний ще не
   * приїхав, а forDate віддає поточний) — і гривневий дохід назавжди
   * рахувався неправильно, ще й без позначки «≈». Незаморожений запис
   * нічого не губить: S.uahOf візьме архівний курс, щойно він приїде.
   */
  S.exactRate = function (rec, cur) {
    var R = window.Rates;
    if (!cur || cur === 'UAH' || !R || !R.isHistoric) return 0;
    var when = rec && (rec.date || rec.createdAt);
    if (!R.isHistoric(cur, when)) return 0;
    var day = String(when || '').slice(0, 10);
    if (day >= U.ymd(new Date()) && R.isFresh && !R.isFresh()) return 0;   // сьогоднішній ще не оновлено
    var rate = R.forDate(cur, when);
    return rate > 0 ? rate : 0;
  };

  /**
   * Запамʼятати курс у записі. Викликається в мить, коли гроші стають
   * фактом: урок проведено, оплату внесено.
   */
  S.freezeRate = function (name, id, cur) {
    if (!cur || cur === 'UAH') return;
    var rec = S.get(name, id);
    if (!rec || rec.rate > 0) return;          // вже заморожено — не чіпаємо
    var rate = S.exactRate(rec, cur);
    if (rate > 0) S.update(name, id, { rate: rate });
  };

  /** Дошка уроку або null, якщо її ще не створювали. */
  S.getBoard = function (lessonId) {
    return db.boards.find(function (b) { return b.lessonId === lessonId; }) || null;
  };

  /**
   * Проставити номери об'єктам, намальованим до того, як номери з'явилися.
   *
   * Без номера об'єкт не можна назвати — а отже не можна сказати «пересунули
   * оцей». Дошки, намальовані раніше, інакше лишилися б поза спільним
   * малюванням назавжди. Повертає true, якщо щось довелося дописати.
   */
  S.ensureItemIds = function (board) {
    var touched = false;
    ((board && board.slides) || []).forEach(function (sl) {
      (sl.items || []).forEach(function (it) {
        if (it && !it.id) {
          it.id = U.uid('it');
          touched = true;
        }
      });
    });
    return touched;
  };

  /** Дошка уроку; якщо немає — створюється з одним порожнім слайдом. */
  S.ensureBoard = function (lessonId) {
    var b = S.getBoard(lessonId);
    if (b) {
      if (!b.slides || !b.slides.length) b.slides = [S.newSlide()];
      if (S.ensureItemIds(b)) { S.touchBoards(boardKey(b)); S.save(); }
      return b;
    }
    /* Перший слайд має однаковий номер на всіх пристроях. Якщо дошку того
       самого уроку відкрили на двох пристроях раніше, ніж вони побачили
       одне одного, їхні перші слайди зливаються в один, а не стають двома. */
    var first = S.newSlide();
    first.id = 'sl0-' + lessonId;
    b = {
      id: U.uid('brd'),
      lessonId: lessonId,
      slides: [first],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.boards.push(b);
    if (window.BoardOps && BoardOps.prepare) BoardOps.prepare(b);
    S.touchBoards(boardKey(b));
    S.save();
    return b;
  };

  S.saveBoard = function (board) {
    board.updatedAt = new Date().toISOString();
    var i = db.boards.findIndex(function (b) { return b.id === board.id; });
    if (i < 0) db.boards.push(board);
    /* Базу могли перечитати з диска (зміна з іншої вкладки) — тоді тут
       лежить інший обʼєкт тієї самої дошки, а малюють у цьому. Без підміни
       на диск ішла стара копія, і все намальоване після перечитування жило
       лише в памʼяті. */
    else if (db.boards[i] !== board) db.boards[i] = board;
    S.touchBoards(boardKey(board));
    /* Лише дошки, а не вся база. Досі кожне збереження дошки (а на уроці —
       після кожного штриха) ще й серіалізувало всю базу в localStorage і
       будило календар та портали всіх учнів. Базу й хуки кличемо лише тоді,
       коли дошка вперше отримала вміст: тоді в порталі учня зʼявляється
       посилання на урок. */
    var has = (board.slides || []).some(function (s) { return (s.items || []).length; });
    if (has && !hadContent.get(board)) {
      hadContent.set(board, true);
      S.save();
    } else {
      if (has) hadContent.set(board, true);
      saveBoardsOnly();
    }
    if (window.BoardSync) BoardSync.mark(board.lessonId);
  };

  var hadContent = new WeakMap();

  function saveBoardsOnly() {
    try {
      if (readFailed.boards) { warnBlocked(); return; }
      writeBoards();
    } catch (e) {
      lastSaveFailed = true;
      console.warn('S.saveBoard (дошки не записались, на сервер ідуть з памʼяті):', e);
    }
  }

  /** Скільки слайдів і об'єктів на дошці уроку (для індикаторів у списках). */
  S.boardStats = function (lessonId) {
    var b = S.getBoard(lessonId);
    if (!b) return null;
    var items = 0;
    b.slides.forEach(function (s) { items += (s.items || []).length; });
    return { slides: b.slides.length, items: items, empty: items === 0, updatedAt: b.updatedAt };
  };

  /** Уроки учня, на яких є непорожня дошка — від найновіших. */
  S.boardsOf = function (studentId) {
    return S.lessonsOf(studentId).filter(function (l) {
      var st = S.boardStats(l.id);
      return st && !st.empty;
    });
  };

  /** Усі непорожні дошки по всій базі. */
  S.allBoards = function () {
    return U.sortBy(db.boards.filter(function (b) {
      return b.slides.some(function (s) { return (s.items || []).length; });
    }), function (b) { return b.updatedAt; }, true);
  };

  /* ============================================================
     Постійний розклад: уроки з шаблону створюються самі
     ============================================================ */

  var FILL_DAYS = 28;   // на скільки днів уперед тримаємо розклад заповненим

  function slotIso(day, slot, weekStart) {
    var d = U.addDays(weekStart, slot.day - 1);
    return U.ymd(d) + 'T' + slot.time;
  }

  /** Чи вже є урок цього учня на таку саму дату й час. */
  function hasLessonAt(studentId, iso) {
    return db.lessons.some(function (l) {
      return l.studentId === studentId && l.date === iso;
    });
  }

  /* Номер уроку з постійного розкладу складається з учня й часу слота.
     Той самий слот, заповнений на двох пристроях, стає одним записом, а не
     двома: обмін зливає записи за номером. */
  function templateId(studentId, iso) {
    return 'tpl_' + studentId + '_' + String(iso).replace(/[^0-9]/g, '');
  }

  function createFromSlot(st, iso) {
    var id = templateId(st.id, iso);
    // такий номер уже є — урок із цього слота перенесли чи змінили; місце не порожнє
    if (S.get('lessons', id)) return null;
    return S.add('lessons', {
      id: id,
      studentId: st.id, date: iso, duration: st.duration || 60,
      price: st.price, currency: st.currency || 'UAH',
      topic: '', status: 'planned', notes: '', fromTemplate: 1
    });
  }

  /* Урок постійного розкладу, у якому ще нічого немає: ні теми, ні
     конспекту, ні оплати, ні ДЗ, ні записів на дошці. Лише такий програма
     має право прибрати сама — усе інше вже робота. */
  function isBareTemplate(l) {
    if (!l || !l.fromTemplate || l.status !== 'planned') return false;
    if (l.topic || l.notes || l.paid) return false;
    if (db.payments.some(function (p) { return p.lessonId === l.id; })) return false;
    if (db.homeworks.some(function (h) { return h.lessonId === l.id; })) return false;
    var b = db.boards.filter(function (x) { return x.lessonId === l.id; })[0];
    return !(b && (b.slides || []).some(function (s) { return (s.items || []).length; }));
  }

  /* Прибрати уроки всюди — разом із їхніми (порожніми) дошками. Без
     позначки «місце звільнено»: це прибирання програми, а не рішення
     людини, і слот лишається доступним для постійного розкладу. */
  function dropLessons(list) {
    if (!list || !list.length) return 0;
    var gone = {};
    list.forEach(function (l) { gone[l.id] = 1; });
    Object.keys(gone).forEach(function (id) { S.removeBoard(id); });
    db.lessons = db.lessons.filter(function (l) { return !gone[l.id]; });
    Object.keys(gone).forEach(function (id) { syncDel('lessons', id); });
    S.save();
    return Object.keys(gone).length;
  }

  /**
   * Двійники уроків постійного розкладу: той самий учень і час, обидва
   * заплановані з шаблону. Лишалися з тих часів, коли два пристрої
   * заповнювали розклад, не бачачи один одного. Лишаємо той, у якому є
   * робота, а за рівних — старший; прибираємо лише порожні.
   */
  S.dedupeTemplateLessons = function () {
    var groups = {};
    db.lessons.forEach(function (l) {
      if (!l || !l.fromTemplate || l.status !== 'planned') return;
      var k = l.studentId + '|' + l.date;
      (groups[k] = groups[k] || []).push(l);
    });
    var extra = [];
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      if (g.length < 2) return;
      g.sort(function (a, b) {
        var wa = isBareTemplate(a) ? 0 : 1, wb = isBareTemplate(b) ? 0 : 1;
        if (wa !== wb) return wb - wa;
        return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      });
      g.slice(1).forEach(function (l) { if (isBareTemplate(l)) extra.push(l); });
    });
    return dropLessons(extra);
  };

  /**
   * Створити уроки за постійним розкладом одного учня — від дати `from`
   * (за замовчуванням сьогодні) на `days` уперед. Дублікати пропускаються.
   */
  S.fillStudentTemplate = function (studentId, days, from) {
    var st = S.get('students', studentId);
    if (!st || !st.schedule || !st.schedule.length) return 0;
    var start = from ? U.toDate(from) : U.today();
    var end = U.addDays(start, days || FILL_DAYS);
    var made = 0;

    var nowTs = new Date();
    // місця, звільнені рукою (урок перенесли чи видалили), не заповнюємо знову
    var gone = {};
    (st.slotGone || []).forEach(function (x) { gone[x] = 1; });

    var weekStart = U.startOfWeek(start);
    while (weekStart <= end) {
      /* eslint-disable no-loop-func */
      st.schedule.forEach(function (slot) {
        var iso = slotIso(0, slot, weekStart);
        var d = U.toDate(iso);
        // і не в минулому: такий урок одразу рахувався б «не відміченим»
        if (d < start || d > end || d < nowTs) return;
        if (gone[iso] || hasLessonAt(st.id, iso)) return;
        if (createFromSlot(st, iso)) made++;
      });
      weekStart = U.addDays(weekStart, 7);
    }
    return made;
  };

  /**
   * Прибрати майбутні уроки, що лишилися від попереднього постійного розкладу.
   *
   * Без цього зміна розкладу лише ДОДАВАЛА нові дні, а старі лишалися в
   * календарі — і виглядало так, ніби зміна не збереглася.
   *
   * Чіпаємо тільки те, що напевно створене шаблоном і ще нічого не значить
   * (isBareTemplate): майбутнє, «заплановано», без теми й конспекту, без
   * оплати, домашнього й записів на дошці. Урок із вписаною наперед темою
   * — це вже робота, навіть якщо день змінився: його лишаємо.
   */
  S.pruneStudentTemplate = function (studentId) {
    var st = S.get('students', studentId);
    if (!st) return 0;

    var now = new Date();
    var slots = {};
    (st.schedule || []).forEach(function (s) { slots[s.day + '@' + s.time] = true; });

    var doomed = db.lessons.filter(function (l) {
      if (l.studentId !== studentId) return false;
      if (!isBareTemplate(l)) return false;              // вручну, проведене, з темою, оплатою…
      var d = U.toDate(l.date);
      if (!(d > now)) return false;                      // минуле лишається як історія

      var wd = d.getDay() === 0 ? 7 : d.getDay();
      var hhmm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
      return !slots[wd + '@' + hhmm];                    // цей день і час досі в розкладі — лишаємо
    });

    doomed.forEach(function (l) { S.removeLesson(l.id); });
    return doomed.length;
  };

  /**
   * Тримати розклад заповненим наперед. Заповнюємо лише той проміжок,
   * якого ще не торкались (`fillUntil`) — тому видалені вручну уроки не
   * з'являються знову.
   *
   * Межа лежить окремим полем бази, а не в профілі репетитора. У профілі
   * вона щодня змінювала весь профіль, і пристрій із давніми даними
   * відправляв разом із нею своє застаріле посилання на зустріч, ціну й
   * валюту — поверх свіжих. `tutor.filledUntil` лишається для читання.
   */
  S.autoFillTemplates = function () {
    var today = U.today();
    var horizon = U.addDays(today, FILL_DAYS);
    var mark = db.fillUntil || (db.tutor && db.tutor.filledUntil);
    var last = mark ? U.toDate(mark) : null;
    var from = (last && last > today) ? U.addDays(last, 1) : today;
    if (from > horizon) return 0;

    var made = 0;
    S.students().forEach(function (st) {
      made += S.fillStudentTemplate(st.id, U.daysBetween(from, horizon), from);
    });
    db.fillUntil = U.ymd(horizon);
    S.save();
    return made;
  };

  /* ============================================================
     Проведено й оплачено
     ============================================================ */

  /**
   * Позначити урок оплаченим. Створюється звичайний платіж, прив'язаний
   * до уроку, щоб баланс учня лишався правильним; зняття позначки його прибирає.
   */
  S.setLessonPaid = function (lessonId, paid) {
    var l = S.get('lessons', lessonId);
    if (!l) return false;
    var existing = db.payments.filter(function (p) { return p.lessonId === lessonId; });

    if (paid) {
      l.paid = 1;
      if (!existing.length) {
        var pcur = S.lessonCur(l);
        S.add('payments', {
          studentId: l.studentId, lessonId: lessonId,
          date: l.date.slice(0, 10), amount: l.price || 0,
          currency: pcur, method: 'За урок',
          /* курс беремо з уроку: оплата за нього й отримана тоді ж. Лише
             справжній курс того дня — інакше порожньо, і S.uahOf візьме
             архівний, коли той приїде. */
          rate: pcur === 'UAH' ? undefined : (l.rate > 0 ? l.rate : (S.exactRate(l, pcur) || undefined)),
          note: 'Оплата за урок ' + U.fmtDate(l.date)
        });
      }
    } else {
      delete l.paid;
      existing.forEach(function (p) { S.remove('payments', p.id); });
    }
    S.save();
    return true;
  };

  /** Провести урок і одразу відмітити оплату. */
  S.completeLesson = function (lessonId, paid) {
    var l = S.get('lessons', lessonId);
    if (!l) return false;
    l.status = 'done';
    /* Курс ДНЯ УРОКУ, а не сьогоднішній.

       Урок часто відмічають проведеним не в той самий день: у понеділок
       провів, у пʼятницю відмітив. Гроші отримані в понеділок, і курс має
       бути понеділковий. */
    var cur = S.lessonCur(l);
    if (cur !== 'UAH' && !(l.rate > 0)) {
      var rate = S.exactRate(l, cur);        // лише справжній курс дня уроку
      if (rate > 0) l.rate = rate;
    }
    S.save();
    if (window.RecSync) RecSync.mark('lessons', lessonId);
    S.setLessonPaid(lessonId, paid !== false);
    return true;
  };

  /** Зняти позначку «проведено» разом з оплатою. */
  S.uncompleteLesson = function (lessonId) {
    var l = S.get('lessons', lessonId);
    if (!l) return false;
    l.status = 'planned';
    S.setLessonPaid(lessonId, false);
    S.save();
    return true;
  };

  /** Постійне посилання на зустріч: у учня власне, інакше спільне з налаштувань. */
  S.meetUrlFor = function (studentId) {
    var st = studentId ? S.get('students', studentId) : null;
    return (st && st.meetUrl) || (db.tutor && db.tutor.meetUrl) || '';
  };

  /** Ключі всіх картинок — і з дошок, і з домашніх завдань. */
  S.usedImageKeys = function () {
    var keys = [];
    if (!db) return keys;               // база ще не прочитана (Disk вантажиться) — нічого не знаємо
    function add(k) { if (k && keys.indexOf(k) < 0) keys.push(k); }
    db.boards.forEach(function (b) {
      (b.slides || []).forEach(function (s) {
        (s.items || []).forEach(function (it) { if (it.t === 'i') add(it.k); });
      });
    });
    db.homeworks.forEach(function (h) {
      (h.photos || []).forEach(add);
      // розвʼязання від учня лежать окремо, але в тому самому сховищі
      (h.solutions || []).forEach(function (s) { add(s && s.key); });
    });
    /* Вкладення матеріалів лежать у тому самому сховищі. Якщо їх тут не
       врахувати, прибирання невикористаних файлів мовчки їх видалить. */
    db.materials.forEach(function (m) {
      (m.files || []).forEach(function (f) { add(f && f.key); });
    });
    /* Вкладення власних справ. Без цього вони не потрапляли б у
       синхронізацію картинок — тобто лишалися б тільки на цьому пристрої. */
    (db.desk || []).forEach(function (d) {
      (d.files || []).forEach(function (f) { add(f && f.key); });
    });
    return keys;
  };

  /* ============================================================
     Мої справи: те, у чому розбираюся сам
     ============================================================

     Окрема колекція, а не «учень я сам»: інакше власна робота лізла б у
     розклад, фінанси й портали. Дошка тут та сама, що й на уроці — вона
     прив'язується до будь-якого власника за ідентифікатором. */

  S.DESK_STATUS = {
    open:  { label: 'Розбираюся', badge: 'badge--violet' },
    stuck: { label: 'Застряг',    badge: 'badge--amber' },
    done:  { label: 'Розібрався', badge: 'badge--green' }
  };

  S.deskItems = function () {
    return U.sortBy(db.desk || [], function (d) { return d.updatedAt || d.createdAt; }, true);
  };

  S.addDeskItem = function (data) {
    return S.add('desk', {
      title: (data && data.title) || '',
      note: (data && data.note) || '',
      tag: (data && data.tag) || '',
      status: (data && data.status) || 'open',
      links: (data && data.links) || [],
      files: (data && data.files) || []
    });
  };

  /** Дошка справи разом із самою справою — щоб не лишалося сиріт. */
  S.removeDeskItem = function (id) {
    var b = db.boards.filter(function (x) { return x.lessonId === id; })[0];
    if (b) { db.boards = db.boards.filter(function (x) { return x !== b; }); boardsDirty = true; }
    db.desk = (db.desk || []).filter(function (d) { return d.id !== id; });
    /* Серверу треба сказати «видалено» поіменно. Без цього справа зникала
       лише тут, а наступний обмін привозив її назад із сервера. */
    syncDel('desk', id);
    S.save();
    S.gcImages();
    if (window.BoardHistory) BoardHistory.drop(id);
    if (window.BoardOps) BoardOps.drop(id);
    if (window.BoardSync) BoardSync.remove(id);
    return true;
  };

  /* ============================================================
     Карта математики — позначки репетитора й учнів
     ============================================================

     Запис на тему, а не один документ на всю карту. Так само, як учні й
     уроки: позначка «знаю» на ноутбуці й нотатка до іншої теми з телефона
     не можуть затерти одна одну, бо це різні записи.

     Мої позначки лежать у mathmap (id — сама тема), учнівські — у stumap
     (id — «учень~тема»). Окремі колекції, а не одна з полем «чиє»: мої
     записи не мають змішуватися з учнівськими ні в синхронізації, ні при
     видаленні учня.

     Тема без позначки й без нотатки запису не має зовсім: «не вивчено» —
     це відсутність, а не ще один рядок на сервері. */

  S.MAP_STATUS = ['Не вивчено', 'Вивчаю', 'Знаю', 'Можу пояснити'];
  S.STUMAP_STATUS = ['Не вивчали', 'Вивчаємо', 'Знає', 'Впевнено'];

  function mapColl(studentId) {
    var name = studentId ? 'stumap' : 'mathmap';
    if (!Array.isArray(db[name])) db[name] = [];
    return name;
  }

  function mapRecId(topicId, studentId) {
    return studentId ? studentId + '~' + topicId : topicId;
  }

  S.mapEntry = function (topicId, studentId) {
    var list = db[mapColl(studentId)];
    var id = mapRecId(topicId, studentId);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };

  S.mapStatus = function (topicId, studentId) {
    var e = S.mapEntry(topicId, studentId);
    return e ? (Number(e.s) | 0) : 0;
  };

  /** Усі позначки одним проходом: {тема: запис}. Карта питає про сотні тем за раз. */
  S.mapEntries = function (studentId) {
    var out = {};
    db[mapColl(studentId)].forEach(function (e) {
      if (!e || !e.id) return;
      if (studentId) { if (e.studentId === studentId && e.topic) out[e.topic] = e; }
      else out[e.id] = e;
    });
    return out;
  };

  /* Застосувати зміни до кількох тем одним збереженням.

     Масова позначка — «знає весь рівень» — чіпає десятки тем. Зберігати
     базу після кожної означало б десятки повних перезаписів і стільки ж
     поштовхів синхронізації, календарю й порталам. */
  S.setMapTopics = function (changes, studentId) {
    var name = mapColl(studentId);
    var list = db[name];
    var now = new Date().toISOString();
    var touched = 0;

    (changes || []).forEach(function (c) {
      if (!c || !c.id) return;
      var rid = mapRecId(c.id, studentId);
      var i = -1;
      for (var k = 0; k < list.length; k++) if (list[k].id === rid) { i = k; break; }
      var cur = i >= 0 ? list[i] : null;

      var sv = c.s !== undefined ? (Number(c.s) | 0) : (cur ? (Number(cur.s) | 0) : 0);
      var note = c.note !== undefined ? String(c.note || '') : (cur ? (cur.note || '') : '');
      /* Побажання до самого блоку теми — що в ньому доробити. Буває лише на
         власній карті репетитора: це розмова про зміст карти, а не про учня. */
      var wish = studentId ? '' :
        (c.wish !== undefined ? String(c.wish || '') : (cur ? (cur.wish || '') : ''));
      if (cur && (Number(cur.s) | 0) === sv && (cur.note || '') === note &&
          (cur.wish || '') === wish) return;

      if (!sv && !note && !wish) {
        if (i < 0) return;
        list.splice(i, 1);
        syncDel(name, rid);
        touched++;
        return;
      }

      var rec = studentId
        ? { id: rid, studentId: studentId, topic: c.id, s: sv, note: note, at: now }
        : { id: rid, s: sv, note: note, at: now };
      if (wish) {
        rec.wish = wish;
        rec.wishAt = (cur && cur.wish === wish && cur.wishAt) || now;
      }
      if (i >= 0) list[i] = rec; else list.push(rec);
      sync(name, rid);
      touched++;
    });

    if (touched) S.save();
    return touched;
  };

  S.setMapTopic = function (topicId, patch, studentId) {
    return S.setMapTopics([Object.assign({ id: topicId }, patch || {})], studentId);
  };

  /**
   * Картинки, на які вже ніхто не посилається.
   *
   * Лише рахує. Нічого не видаляє — і в цьому суть.
   *
   * Раніше це саме місце стирало «зайві» файли одразу після збереження ДЗ,
   * видалення матеріалу чи учня. Поки список дошок читався правильно, все
   * було добре. Але варто було програмі побачити нуль дошок — і всі
   * картинки з усіх дошок ставали «нікому не потрібні» й зникали.
   *
   * Саме так і сталося: після переїзду дошок в окреме сховище стара версія
   * програми, ще жива в кеші браузера, шукала дошки на старому місці, не
   * знаходила жодної й стирала фотографії з уроків.
   *
   * Ціна помилки тут несиметрична. Зайвий мегабайт на диску не коштує
   * нічого — місця в IndexedDB гігабайти. Стерта фотографія з уроку не
   * повертається ніяк. Тому автоматичного стирання більше немає взагалі:
   * прибирання лишилося, але тільки як свідома дія в Налаштуваннях.
   */
  S.unusedImages = function () {
    if (!window.ImgStore || !window.ImgStore.available()) return Promise.resolve([]);
    var used = {};
    S.usedImageKeys().forEach(function (k) { used[k] = 1; });
    return window.ImgStore.keys().then(function (keys) {
      return (keys || []).filter(function (k) { return !used[k]; });
    }).catch(function () { return []; });
  };

  /* Лишається під старою назвою: місць виклику багато, і кожне з них
     розраховувало саме на «після цієї дії підчисти». Тепер вони не роблять
     нічого руйнівного. */
  S.gcImages = function () { return Promise.resolve(0); };

  /**
   * Справді стерти непотрібні картинки. Тільки з Налаштувань, тільки руками.
   *
   * Перед стиранням переконуємось, що список дошок прочитано повністю: якщо
   * у сховищі дошки є, а в пам'яті їх нема, значить програма бачить не все —
   * і будь-яке прибирання зараз стерло б потрібне.
   */
  S.purgeUnusedImages = function () {
    if (!window.ImgStore || !window.ImgStore.available()) return Promise.resolve(0);

    var stored = [];
    try {
      stored = JSON.parse(diskGet(BOARD_ORDER) || 'null') ||
               JSON.parse(diskGet(BOARDS_KEY) || '[]') || [];
    } catch (e) { stored = []; }
    if (stored.length && !(db.boards || []).length) {
      return Promise.reject(new Error('Дошки прочитані не повністю — прибирання скасовано'));
    }

    return S.unusedImages().then(function (dead) {
      return Promise.all(dead.map(function (k) { return window.ImgStore.del(k); }))
        .then(function () { return dead.length; });
    });
  };

  /**
   * Повна резервна копія: JSON бази + картинки в base64.
   * Окремий асинхронний шлях, бо картинки лежать в IndexedDB.
   */
  S.exportBundle = function () {
    var keys = S.usedImageKeys();
    var images = {};
    if (!keys.length || !window.ImgStore || !window.ImgStore.available()) {
      return Promise.resolve(JSON.stringify(withImages(images), null, 2));
    }
    /* Дуже важкі файли у копію не вкладаємо.

       Копія — це один JSON, а файл у ньому лежить у base64, тобто на
       третину більший за себе. Одне відео на сто мегабайтів робить копію
       непридатною: браузер не збере такий рядок, а якщо збере — не
       відкриє назад.

       Тому великі лишаються поза копією, але їхні імена в неї потрапляють:
       краще знати, чого бракує, ніж думати, що збережено все. */
    var CAP = 20 * 1048576;
    var skipped = [];

    return Promise.all(keys.map(function (k) {
      return window.ImgStore.get(k).then(function (blob) {
        if (!blob) return null;
        if (blob.size > CAP) { skipped.push({ key: k, size: blob.size }); return null; }
        return window.ImgStore.toDataURL(blob).then(function (url) { images[k] = url; });
      }).catch(function () { return null; });
    })).then(function () {
      var out = withImages(images);
      if (skipped.length) out._skipped = skipped;
      return JSON.stringify(out, null, 2);
    });
  };

  function withImages(images) {
    var out = {};
    Object.keys(db).forEach(function (k) { out[k] = db[k]; });
    out._images = images;
    return out;
  }

  /** Відновлення з повної копії: спершу картинки, потім сама база. */
  S.importBundle = function (text) {
    var parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.students)) {
      return Promise.reject(new Error('Файл не схожий на резервну копію mathhub'));
    }
    var images = parsed._images || {};
    delete parsed._images;

    var keys = Object.keys(images);
    var writeImages = (!keys.length || !window.ImgStore || !window.ImgStore.available())
      ? Promise.resolve()
      : Promise.all(keys.map(function (k) {
          return window.ImgStore.fromDataURL(images[k]).then(function (blob) {
            return window.ImgStore.put(k, blob);
          }).catch(function () { return null; });
        }));

    return writeImages.then(function () {
      S.importJSON(JSON.stringify(parsed));
      return keys.length;
    });
  };

  /** Видалити урок разом із його дошкою та прив'язаним платежем. */
  S.removeLesson = function (lessonId) {
    markSlotGone(S.get('lessons', lessonId));
    S.removeBoard(lessonId);
    // оплата уроку зникає всюди, а не лише тут — інакше повернулась би з іншого пристрою
    syncDelMany('payments', db.payments.filter(function (p) { return p.lessonId === lessonId; }));
    db.payments = db.payments.filter(function (p) { return p.lessonId !== lessonId; });
    return S.remove('lessons', lessonId);
  };

  S.removeBoard = function (lessonId) {
    var i = db.boards.findIndex(function (b) { return b.lessonId === lessonId; });
    if (i >= 0) {
      db.boards.splice(i, 1); boardsDirty = true; S.save(); S.gcImages();
      if (window.BoardHistory) BoardHistory.drop(lessonId);
      if (window.BoardOps) BoardOps.drop(lessonId);
      if (window.BoardSync) BoardSync.remove(lessonId);
      return true;
    }
    return false;
  };

  /* ============================================================
     Демо-дані
     ============================================================ */

  function seed() {
    var d = blank();
    var today = U.today();

    var people = [
      { name: 'Крістіна Романюк', grade: '11 клас', goal: 'НМТ-2026', price: 550, color: '#1358F5',
        days: [{ d: 2, t: '15:30' }, { d: 5, t: '19:30' }], phone: '+380 67 214 88 03',
        parent: 'Оксана Романюк, +380 50 331 77 12', tg: '@kristina_r',
        target: 'Мета — 185+ на НМТ, вступ на економіку в КНУ' },
      { name: 'Артем Ковальчук', grade: '9 клас', goal: 'ДПА', price: 450, color: '#7A5AF8',
        days: [{ d: 1, t: '17:00' }, { d: 4, t: '17:00' }], phone: '+380 63 902 41 55',
        parent: 'Ігор Ковальчук, +380 67 118 20 44', tg: '@artem_kov',
        target: 'Підтягнути алгебру до ДПА, головна проблема — дроби і рівняння' },
      { name: 'Софія Мельник', grade: '11 клас', goal: 'НМТ-2026', price: 22, currency: 'USD', color: '#17B26A',
        days: [{ d: 3, t: '18:00' }, { d: 6, t: '11:00' }], phone: '+380 95 774 12 09',
        parent: '', tg: '@sofiiam',
        target: 'Сильна учениця, ціль 195+. Робимо акцент на геометрії та параметрах.\nЖиве в Польщі, платить у доларах.' },
      { name: 'Данило Шевченко', grade: '10 клас', goal: 'Шкільна програма', price: 450, color: '#F79009',
        days: [{ d: 2, t: '18:00' }], phone: '+380 66 481 33 27',
        parent: 'Наталія Шевченко, +380 96 220 55 18', tg: '',
        target: 'Вирівняти оцінки за семестр, багато прогалин з 9 класу' },
      { name: 'Марія Бондаренко', grade: '11 клас', goal: 'НМТ-2026', price: 550, color: '#DD2590',
        days: [{ d: 1, t: '19:30' }, { d: 4, t: '19:30' }], phone: '+380 68 305 60 91',
        parent: 'Леся Бондаренко, +380 63 447 90 26', tg: '@maria_b11',
        target: 'Стартувала з нуля в лютому, прогрес хороший. Ціль 160+' },
      { name: 'Олег Ткаченко', grade: '8 клас', goal: 'Обласна олімпіада, 1 місце', price: 20, currency: 'EUR',
        color: '#06AED4', days: [{ d: 6, t: '13:00' }], phone: '+380 50 776 14 38',
        parent: 'Андрій Ткаченко, +380 50 776 14 38', tg: '',
        target: 'Готуємось до обласного етапу. Комбінаторика, теорія чисел, нерівності.\nРодина у Німеччині, розрахунок у євро.' }
    ];

    var lessonTopics = [
      'Квадратні рівняння та теорема Вієта', 'Модуль: рівняння і нерівності',
      'Показникові рівняння', 'Логарифми: властивості', 'Логарифмічні нерівності',
      'Тригонометричні формули', 'Розв\'язування тригонометричних рівнянь',
      'Похідна: правила диференціювання', 'Дослідження функції за допомогою похідної',
      'Первісна та площа криволінійної трапеції', 'Прогресії: арифметична та геометрична',
      'Трикутники: площі та подібність', 'Коло: вписані та центральні кути',
      'Чотирикутники та їх властивості', 'Многогранники: призма і піраміда',
      'Тіла обертання: циліндр, конус, куля', 'Вектори на площині',
      'Комбінаторика: перестановки і сполучення', 'Ймовірність випадкової події',
      'Текстові задачі на рух', 'Задачі на суміші та відсотки',
      'Системи рівнянь', 'Параметри в квадратних рівняннях', 'Розбір пробного НМТ'
    ];

    var hwTitles = [
      'Збірник Істер, §12 — №4.1–4.14', 'Картка «Логарифми», 10 задач',
      'Тренажер НМТ: блок «Функції»', 'Геометрія: 8 задач на подібність',
      'Демо-варіант НМТ 2024, частина 1', 'Картка «Тригонометрія», рівень B',
      'Задачі на прогресії — №205–218', 'Параметри: 5 задач із зірочкою',
      'Стереометрія: об\'єми, 6 задач', 'Відсотки і суміші — картка №7'
    ];

    var noteTexts = [
      'Плутає знак при перенесенні через рівність — повторити на наступному уроці.',
      'Дуже добре зайшов метод інтервалів, розв\'язує швидко і без підказок.',
      'Батьки просили додати ще один урок на тиждень з травня.',
      'Сильна тривожність перед контрольними. Даю більше легких задач на розігрів.',
      'Не встигає робити ДЗ у будні через секцію — переносимо дедлайни на неділю.',
      'Прорив у геометрії: сам довів теорему про висоти. Хвалити частіше.'
    ];

    // --- Учні ---
    people.forEach(function (p, idx) {
      var st = {
        id: 'stu_' + (idx + 1),
        name: p.name,
        grade: p.grade,
        goal: p.goal,
        price: p.price,
        currency: p.currency || 'UAH',
        duration: 60,
        color: p.color,
        phone: p.phone,
        parent: p.parent,
        telegram: p.tg,
        target: p.target,
        schedule: p.days.map(function (x) { return { day: x.d, time: x.t }; }),
        archived: false,
        createdAt: new Date(today.getFullYear(), today.getMonth() - 5, 3).toISOString()
      };
      d.students.push(st);

      // --- Уроки: 9 тижнів назад + 3 тижні вперед ---
      var n = 0;
      var tIdx = idx * 3;
      for (var w = -9; w <= 3; w++) {
        var weekStart = U.startOfWeek(U.addDays(today, w * 7));
        p.days.forEach(function (slot) {
          var date = U.addDays(weekStart, slot.d - 1); // d: 1=Пн … 7=Нд
          var hh = slot.t.split(':');
          date.setHours(+hh[0], +hh[1], 0, 0);
          if (date < new Date(today.getFullYear(), today.getMonth() - 5, 1)) return;

          var isPast = date < new Date();
          var status = 'planned';
          if (isPast) {
            status = 'done';
            if (n === 4) status = 'cancelled';
            if (n === 11) status = 'missed';
          }
          var topic = lessonTopics[(tIdx + n) % lessonTopics.length];

          var lesson = {
            id: U.uid('les'),
            studentId: st.id,
            date: U.ymd(date) + 'T' + U.fmtTime(date),
            duration: 60,
            price: p.price,
            currency: p.currency || 'UAH',
            topic: topic,
            status: status,
            notes: status === 'done' && n % 3 === 0
              ? 'Розібрали теорію, прорешали 6 задач. Слабке місце — оформлення розв\'язку.'
              : '',
            createdAt: date.toISOString()
          };
          d.lessons.push(lesson);

          // --- ДЗ до частини проведених уроків ---
          if (status === 'done' && n % 2 === 0) {
            var due = U.addDays(date, 3);
            var past = due < new Date();
            var hwStatus = past ? 'checked' : 'assigned';
            if (past && n % 7 === 0) hwStatus = 'skipped';
            if (!past && n % 5 === 0) hwStatus = 'submitted';

            d.homeworks.push({
              id: U.uid('hw'),
              studentId: st.id,
              lessonId: lesson.id,
              title: hwTitles[(idx + n) % hwTitles.length],
              description: 'Основне — задачі 3, 7 і 9. Якщо не виходить — фотографуй спробу, розберемо разом.',
              dueDate: U.ymd(due),
              status: hwStatus,
              feedback: hwStatus === 'checked' ? 'Добре, але в №7 загубив другий корінь.' : '',
              createdAt: date.toISOString()
            });
          }
          n++;
        });
      }

      // --- Прогрес по темах ---
      var covered = 5 + (idx % 5);
      for (var t = 0; t < covered; t++) {
        var base = p.goal === 'Олімпіади' ? 70 : p.goal === 'ДПА' ? 45 : 55;
        d.progress.push({
          id: U.uid('prg'),
          studentId: st.id,
          topic: S.TOPICS[t],
          level: U.clamp(base + ((idx * 7 + t * 13) % 45) - 10, 15, 98),
          updatedAt: new Date().toISOString()
        });
      }

      // --- Оплати ---
      var doneCount = d.lessons.filter(function (l) { return l.studentId === st.id && l.status === 'done'; }).length;
      var owed = doneCount * p.price;
      var chunks = Math.max(1, Math.round(owed / (p.price * 4)));
      var paidTotal = 0;
      for (var c = 0; c < chunks; c++) {
        var pd = U.addDays(today, -((chunks - c) * 14) + 2);
        var amount = p.price * 4;
        d.payments.push({
          id: U.uid('pay'),
          studentId: st.id,
          date: U.ymd(pd),
          amount: amount,
          currency: p.currency || 'UAH',
          method: c % 3 === 0 ? 'Готівка' : 'Картка',
          note: 'Пакет 4 уроки',
          createdAt: pd.toISOString()
        });
        paidTotal += amount;
      }
      // У двох учнів навмисно лишаємо борг — щоб було видно, як це виглядає
      if (idx === 1 || idx === 4) {
        var last = d.payments.filter(function (x) { return x.studentId === st.id; }).pop();
        if (last) {
          d.payments.splice(d.payments.indexOf(last), 1);
        }
      }

      // --- Нотатки ---
      d.notes.push({
        id: U.uid('note'),
        studentId: st.id,
        date: U.ymd(U.addDays(today, -(7 + idx * 3))),
        text: noteTexts[idx % noteTexts.length],
        createdAt: new Date().toISOString()
      });
    });

    // --- Матеріали ---
    var mats = [
      { title: 'Офіційні демо-варіанти НМТ', type: 'link', url: 'https://testportal.gov.ua/', topic: 'Загальне',
        note: 'Актуальні специфікації та зразки завдань від УЦОЯО' },
      { title: 'Формули для НМТ — одна сторінка', type: 'file', url: '', topic: 'Загальне',
        note: 'Роздруковую і даю кожному новому учню на перший урок' },
      { title: 'GeoGebra — динамічна геометрія', type: 'link', url: 'https://www.geogebra.org/', topic: 'Планіметрія',
        note: 'Показувати вписані кути та переріз піраміди' },
      { title: 'Картки «Логарифми», рівні A/B/C', type: 'file', url: '', topic: 'Функції та графіки',
        note: '3 рівні складності, по 12 задач' },
      { title: 'Банк задач з параметрами', type: 'file', url: '', topic: 'Рівняння і нерівності',
        note: 'Для сильних учнів, 40 задач з розв\'язками' },
      { title: 'Desmos — графіки функцій', type: 'link', url: 'https://www.desmos.com/calculator', topic: 'Функції та графіки',
        note: 'Найкраще для пояснення перетворень графіків' },
      { title: 'Тренажер усного рахунку', type: 'link', url: '', topic: 'Числа і вирази',
        note: '5 хвилин на початку кожного уроку з молодшими' },
      { title: 'Стереометрія: перерізи многогранників', type: 'note', url: '', topic: 'Стереометрія',
        note: 'Метод слідів + метод внутрішнього проєктування. Порядок пояснення: слід → точка → переріз' }
    ];
    mats.forEach(function (m) {
      d.materials.push({
        id: U.uid('mat'), title: m.title, type: m.type, url: m.url,
        topic: m.topic, note: m.note, createdAt: new Date().toISOString()
      });
    });

    return d;
  }

  window.S = S;
})();
