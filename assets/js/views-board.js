/* Екран дошки уроку: слайди, інструменти, автозбереження, експорт */
(function () {
  'use strict';

  var U = window.U, S = window.S, C = window.C, icon = window.icon;
  var V = window.V;

  var PEN_COLORS = ['#0D2149', '#1358F5', '#E5484D', '#17B26A',
                    '#F79009', '#7A5AF8', '#DD2590', '#7E90AE'];
  var PEN_WIDTHS = [2, 4, 8];
  var TEXT_SIZES = [{ v: 12, l: 'XS' }, { v: 18, l: 'S' }, { v: 26, l: 'M' }, { v: 40, l: 'L' },
                  { v: 64, l: 'XL' }, { v: 110, l: '2XL' }, { v: 180, l: '3XL' }];

  /* Інструменти лівої колонки. opts — які налаштування показувати в підменю. */
  var TOOLS = [
    { id: 'select',  icon: 'cursor',     label: 'Вибір і переміщення (V)' },
    { id: 'pen',     icon: 'pen',        label: 'Олівець (P)',    opts: 'stroke' },
    { id: 'eraser',  icon: 'eraser',     label: 'Гумка (E)' },
    { id: 'text',    icon: 'textT',      label: 'Текст (T)',      opts: 'text' },
    { id: 'shape',   icon: 'shapes',     label: 'Геометричні фігури (S)', opts: 'shape' },
    { id: 'line',    icon: 'shapeLine',  label: 'Лінія (L)',      opts: 'stroke' },
    { id: 'arrow',   icon: 'arrowRight', label: 'Стрілка (A)',    opts: 'stroke' },
    { id: 'hand',    icon: 'hand',       label: 'Рука — рух по полотну (H)' }
  ];

  var TOOL_OPTS = {};
  TOOLS.forEach(function (t) { if (t.opts) TOOL_OPTS[t.id] = t.opts; });

  var cur = null;

  /* ============================================================
     Розмітка екрана
     ============================================================ */

  V.board = function (lessonId) {
    var lesson = S.get('lessons', lessonId);
    if (!lesson) {
      return '<div class="page"><div class="card">' +
        C.empty('alert', 'Урок не знайдено', 'Можливо, його було видалено.',
          '<button class="btn btn--primary" data-act="nav" data-arg="#/">На головну</button>') +
        '</div></div>';
    }
    var st = S.get('students', lesson.studentId);

    var tools = TOOLS.map(function (t) {
      return '<button class="tool-btn' + (t.id === 'pen' ? ' is-active' : '') + '" data-tool="' + t.id +
        '" title="' + U.esc(t.label) + '">' + icon(t.icon, 20) +
        (t.opts ? '<i class="tool-btn__dot"></i>' : '') + '</button>';
    }).join('');

    return '<div class="board">' +

      '<div class="board-top">' +
        '<button class="icon-btn" data-act="board-exit" title="Вийти з дошки">' + icon('arrowLeft', 20) + '</button>' +
        (st ? C.avatar(st, 32) : '') +
        '<div style="min-width:0">' +
          '<div class="board-top__title truncate">' + U.esc(lesson.topic || 'Урок без теми') + '</div>' +
          '<div class="board-top__sub">' + U.esc(st ? st.name : '—') + ' · ' + U.fmtDateTime(lesson.date) + '</div>' +
        '</div>' +

        '<div class="spacer row" style="gap:8px;flex-wrap:wrap">' +
          '<span class="board-top__saved" data-saved>' + icon('check', 15) + 'Збережено</span>' +
          (S.meetUrlFor(lesson.studentId)
            ? '<a class="btn btn--ghost btn--sm" href="' + U.esc(S.meetUrlFor(lesson.studentId)) +
              '" target="_blank" rel="noopener" title="Відкрити зустріч">' +
              icon('present', 15) + 'Зустріч</a>' : '') +
          '<button class="btn btn--ghost btn--sm" data-act="board-measures" ' +
            'title="Показати або сховати сторони й кути (M)">' + icon('checklist', 15) + 'Розміри</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="board-save-view" ' +
            'title="Запам’ятати цей вигляд як початковий для слайда">' + icon('target', 15) + 'Вигляд</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="board-rename" title="Назва слайда">' +
            icon('edit', 15) + '<span data-slide-name>Слайд</span></button>' +
          '<button class="btn btn--ghost btn--sm" data-act="board-bg" title="Фон слайда">' +
            icon('grid', 15) + 'Фон</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="board-png">' + icon('image', 15) + 'PNG</button>' +
          '<button class="btn btn--primary btn--sm" data-act="board-share">' +
            icon('share', 15) + 'Надіслати учню</button>' +
        '</div>' +
      '</div>' +

      '<div class="board-body">' +
        '<canvas class="board-canvas" id="board-canvas"></canvas>' +

        '<div class="board-empty-hint" data-empty hidden>' +
          '<b>Порожній слайд</b>' +
          '<span>Пишіть олівцем, додавайте текст, фігури й картинки. Колесо миші — масштаб, ' +
          'пробіл або права кнопка — рух по полотну. Місця тут стільки, скільки треба.</span>' +
        '</div>' +

        '<div class="board-tools">' + tools +
          '<div class="tool-sep"></div>' +
          '<button class="tool-btn" data-act="board-image" title="Вставити картинку (Ctrl+V або перетягніть файл)">' +
            icon('image', 20) + '</button>' +
          '<button class="tool-btn" data-act="board-clear" title="Очистити слайд">' + icon('trash', 20) + '</button>' +
          '<div class="tool-sep"></div>' +
          '<button class="tool-btn" data-act="board-undo" disabled title="Крок назад (Ctrl+Z)">' +
            icon('undo', 20) + '</button>' +
          '<button class="tool-btn" data-act="board-redo" disabled title="Крок вперед (Ctrl+Shift+Z)">' +
            icon('redo', 20) + '</button>' +
        '</div>' +

        '<div class="board-opts" data-opts hidden></div>' +

        '<button class="board-opts__open" data-act="board-opts-toggle" data-opts-open hidden ' +
          'title="Показати налаштування інструмента">' +
          '<span class="board-opts__dot" data-opts-dot style="background:' + PEN_COLORS[0] + '"></span>' +
        '</button>' +

        '<div class="sel-bar" data-sel-bar hidden></div>' +

        '<input type="file" accept="image/*" data-img-input hidden>' +
        '<input type="file" accept="image/*" multiple data-multi-input hidden>' +

        '<div class="board-zoom">' +
          '<button class="icon-btn" data-act="board-zoom-out" title="Зменшити">' + icon('zoomOut', 18) + '</button>' +
          '<button class="board-zoom__val" data-zoom data-act="board-zoom-reset" title="Скинути масштаб">100%</button>' +
          '<button class="icon-btn" data-act="board-zoom-in" title="Збільшити">' + icon('zoomIn', 18) + '</button>' +
          '<button class="icon-btn" data-act="board-fit" title="Вмістити все">' + icon('fit', 18) + '</button>' +
        '</div>' +

        '<div class="board-hint" data-hint></div>' +
      '</div>' +

      '<div class="board-rail-wrap" data-rail-wrap>' +
        '<button class="board-rail__toggle" data-act="board-rail-toggle" ' +
          'title="Згорнути або показати слайди">' +
          icon('chevronD', 15) + '<span data-rail-count></span></button>' +
        '<div class="board-rail" data-rail></div>' +
      '</div>' +
    '</div>';
  };

  /* ============================================================
     Монтування
     ============================================================ */

  V.mountBoard = function (lessonId) {
    var canvas = document.getElementById('board-canvas');
    if (!canvas) return;

    var board = S.ensureBoard(lessonId);
    var engine = new window.Board(canvas, {
      onChange: function () { markDirty(); refreshUndo(); refreshEmpty(); scheduleThumb(); updateSelBar(); },
      onViewChange: function () { updateZoom(); updateSelBar(); },
      onSelect: function () { refreshUndo(); updateSelBar(); },
      onToolChange: function (t) { syncToolButtons(t); renderOpts(); },
      onTextPlace: function (world, screen) { openTextInput(world, screen); }
    });

    cur = {
      lessonId: lessonId,
      board: board,
      index: 0,
      engine: engine,
      dirty: false,
      saveTimer: null,
      thumbTimer: null,
      thumbs: {},
      shapeGroup: 0
    };

    engine.setSlide(board.slides[0]);
    engine.applyCursor();

    // поки дошка відкрита — забираємо те, що пише учень за посиланням
    cur.pullTimer = setInterval(pullContributions, PULL_MS);
    applyRail();
    renderRail();
    renderOpts();
    updateZoom();
    refreshEmpty();
    updateSlideName();

    var root = document.querySelector('.board');

    /* Як у Miro: клік по вже активному інструменту згортає/розгортає його
       підменю, а перехід на інший інструмент завжди показує його налаштування. */
    U.onClick(root, '[data-tool]', function (el) {
      var id = el.dataset.tool;
      if (id === engine.tool && TOOL_OPTS[id]) { toggleOpts(); return; }
      setOptsHidden(false);
      setTool(id);
    });

    U.onClick(root, '[data-color]', function (el) {
      engine.color = el.dataset.color;
      var dot = root.querySelector('[data-opts-dot]');
      if (dot) dot.style.background = el.dataset.color;
      renderOpts();                       // кружечки товщини теж перефарбовуються
      applyToSelection({ c: el.dataset.color });
    });

    U.onClick(root, '[data-width]', function (el) {
      engine.width = +el.dataset.width;
      renderOpts();
      applyToSelection({ w: +el.dataset.width });
    });

    U.onClick(root, '[data-size]', function (el) {
      engine.fontSize = +el.dataset.size;
      U.$$('[data-size]', root).forEach(function (x) { x.classList.remove('is-active'); });
      el.classList.add('is-active');
      applyToSelection({ s: +el.dataset.size }, 'x');
    });

    U.onClick(root, '[data-shape]', function (el) {
      engine.setShape(el.dataset.shape);
      renderOpts();
    });

    U.onClick(root, '[data-shape-group]', function (el) {
      cur.shapeGroup = +el.dataset.shapeGroup;
      renderOpts();
    });

    U.onClick(root, '[data-size-step]', function (el) { stepFont(+el.dataset.sizeStep); });

    // розмір можна й просто вписати
    root.addEventListener('input', function (e) {
      if (!e.target.matches('[data-size-val]')) return;
      var v = parseInt(e.target.value, 10);
      if (!v) return;
      engine.fontSize = U.clamp(v, 6, 800);
      U.$$('[data-size]', root).forEach(function (x) {
        x.classList.toggle('is-active', +x.dataset.size === engine.fontSize);
      });
      applyToSelection({ s: engine.fontSize }, 'x');
    });

    U.onClick(root, '[data-fill]', function () {
      engine.fillOn = !engine.fillOn;
      renderOpts();
    });

    U.onClick(root, '[data-smooth]', function () {
      engine.smoothing = ((engine.smoothing || 0) + 1) % 3;
      renderOpts();
      U.toast('Почерк: ' + SMOOTH_LABELS[engine.smoothing]);
    });

    U.onClick(root, '[data-measures]', function () {
      engine.showMeasures = !engine.showMeasures;
      renderOpts();
      // якщо щось виділено — застосовуємо й до нього
      var sel = engine.selection.filter(function (i) { return i.t === 'g'; });
      if (sel.length) {
        engine.snapshot();
        sel.forEach(function (i) { i.m = engine.showMeasures ? 1 : 0; });
        engine.changed();
      }
    });

    U.onClick(root, '[data-facts]', function (el) { factsModal(el.dataset.facts); });

    U.onClick(root, '[data-slide-index]', function (el) { selectSlide(+el.dataset.slideIndex); });

    /* --- картинки --- */

    var fileInput = root.querySelector('[data-img-input]');
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (f) insertImageFile(f);
    });

    var multiInput = root.querySelector('[data-multi-input]');
    multiInput.addEventListener('change', function () {
      var files = Array.prototype.slice.call(multiInput.files || []);
      multiInput.value = '';
      if (files.length) photosToSlidesDialog(files);
    });

    cur.pasteHandler = function (e) {
      if (!cur) return;
      if (e.target && e.target.matches && e.target.matches('input, textarea')) return;
      var items = e.clipboardData && e.clipboardData.items;
      if (items) {
        for (var i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.indexOf('image/') === 0) {
            var f = items[i].getAsFile();
            if (f) { e.preventDefault(); insertImageFile(f); return; }
          }
        }
      }
      // картинки в буфері немає — вставляємо скопійовані об'єкти дошки
      if (cur.engine.hasClipboard()) {
        e.preventDefault();
        var n = cur.engine.pasteClipboard();
        if (n) U.toast('Вставлено ' + U.pl(n, 'об’єкт', 'об’єкти', 'об’єктів'), 'ok');
      }
    };
    window.addEventListener('paste', cur.pasteHandler);

    var body = root.querySelector('.board-body');
    cur.dragOver = function (e) { e.preventDefault(); body.classList.add('is-dropping'); };
    cur.dragLeave = function (e) { if (e.target === body) body.classList.remove('is-dropping'); };
    cur.drop = function (e) {
      e.preventDefault();
      body.classList.remove('is-dropping');
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      // ставимо саме туди, куди відпустили файл
      var r = canvas.getBoundingClientRect();
      insertImageFile(f, { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    body.addEventListener('dragover', cur.dragOver);
    body.addEventListener('dragleave', cur.dragLeave);
    body.addEventListener('drop', cur.drop);

    window.addEventListener('keydown', onKey);
    cur.keyHandler = onKey;

    cur.beforeUnload = function () { flushSave(); };
    window.addEventListener('beforeunload', cur.beforeUnload);

    hint('Колесо — масштаб · пробіл або права кнопка — рух по полотну');
  };

  V.unmountBoard = function () {
    if (!cur) return;
    flushSave();
    if (cur.keyHandler) window.removeEventListener('keydown', cur.keyHandler);
    if (cur.beforeUnload) window.removeEventListener('beforeunload', cur.beforeUnload);
    if (cur.pasteHandler) window.removeEventListener('paste', cur.pasteHandler);
    var body = document.querySelector('.board-body');
    if (body && cur.dragOver) {
      body.removeEventListener('dragover', cur.dragOver);
      body.removeEventListener('dragleave', cur.dragLeave);
      body.removeEventListener('drop', cur.drop);
    }
    if (cur.saveTimer) clearTimeout(cur.saveTimer);
    if (cur.thumbTimer) clearTimeout(cur.thumbTimer);
    if (cur.pullTimer) clearInterval(cur.pullTimer);

    /* Виходимо з дошки — урок скінчився. Якщо на нього видано посилання,
       оновлюємо його негайно, не чекаючи хвилинної паузи: саме тепер
       учень і піде дивитися. */
    if (cur.republishTimer) { clearTimeout(cur.republishTimer); cur.republishTimer = null; }
    if (cur.board.share && window.Cloud && Cloud.available() && Cloud.signedIn()) {
      var board = cur.board;
      var l = S.get('lessons', cur.lessonId);
      var st = l ? S.get('students', l.studentId) : null;
      publishLesson(board, l, st, board.share.token).catch(function (e) {
        console.warn('Не вдалося оновити урок для учня при виході:', e && e.message);
      });
    }

    cur.engine.destroy();
    cur = null;
  };

  V.boardMountedFor = function () { return cur ? cur.lessonId : null; };
  V.boardEngine = function () { return cur ? cur.engine : null; };

  /**
   * Перечитати відкриту дошку після того, як дані оновилися з сервера.
   *
   * Потрібно тому, що синхронізація замінює всю базу цілком, і об'єкт дошки,
   * який тримає ця сторінка, після цього вказує на старі дані. Повне
   * перемальовування сторінки теж спрацювало б, але скинуло б масштаб і
   * повернуло на перший слайд — а саме так учень і дивиться урок.
   *
   * Повертає true, якщо дошку оновлено; false — якщо дошка не відкрита
   * або зараз не час її чіпати.
   */
  V.boardReload = function () {
    if (!cur) return false;

    // не влазимо посеред штриха чи перетягування — інакше лінія обірветься
    if (cur.engine.draft || cur.engine.band || cur.dirty) return false;

    var fresh = S.getBoard(cur.lessonId);
    if (!fresh || !fresh.slides || !fresh.slides.length) return false;

    cur.board = fresh;
    if (cur.index >= fresh.slides.length) cur.index = fresh.slides.length - 1;

    cur.engine.setSlide(fresh.slides[cur.index], true);   // true — лишити масштаб і позицію
    renderRail();
    refreshEmpty();
    updateSlideName();
    return true;
  };

  /* ============================================================
     Збереження
     ============================================================ */

  function markDirty() {
    if (!cur) return;
    cur.dirty = true;
    var el = document.querySelector('[data-saved]');
    if (el) { el.classList.add('is-dirty'); el.innerHTML = icon('clock', 15) + 'Зберігається…'; }
    if (cur.saveTimer) clearTimeout(cur.saveTimer);
    cur.saveTimer = setTimeout(flushSave, 700);
  }

  /* Якщо на урок уже видано посилання, воно має показувати те, що є зараз.
     Інакше учень бачить знімок того моменту, коли посилання створили —
     домалював слайд, а в нього досі старе. Покладатися на те, що репетитор
     не забуде натиснути «Оновити», не можна.

     Пауза коротка: оновлюється лише сам урок (кілька кілобайтів), картинки
     вже лежать на сервері й повторно не їдуть. Тому учень бачить написане
     майже одразу, як на другому пристрої репетитора. */
  var REPUBLISH_MS = 2500;

  function scheduleRepublish() {
    if (!cur || !cur.board.share) return;
    if (!(window.Cloud && Cloud.available() && Cloud.signedIn())) return;
    if (cur.republishTimer) return;                 // одне заплановане перевидання за раз

    var wait = Math.max(0, REPUBLISH_MS - (Date.now() - (cur.republishedAt || 0)));
    cur.republishTimer = setTimeout(function () {
      cur.republishTimer = null;
      if (!cur || !cur.board.share) return;
      var lessonId = cur.lessonId;
      var l = S.get('lessons', lessonId);
      var st = l ? S.get('students', l.studentId) : null;
      publishLesson(cur.board, l, st, cur.board.share.token).then(function () {
        if (cur && cur.lessonId === lessonId) cur.republishedAt = Date.now();
      }).catch(function (e) {
        console.warn('Не вдалося оновити урок для учня:', e && e.message);
      });
    }, wait);
  }

  /* Забираємо написане учнем і вливаємо в дошку.

     Внески лежать в окремій таблиці саме тому, що база репетитора їде на
     сервер одним документом цілком: якби записи учня були в тому ж документі,
     наступне збереження репетитора просто затерло б їх. */
  var PULL_MS = 3000;

  function mergeContributions(rows) {
    // повертаємо ту саму форму, що й у звичайному разі: інакше виклик
    // res.ids нижче падав, і внески ніколи не позначалися опрацьованими
    if (!cur || !rows || !rows.length) return { changed: false, ids: [] };
    var changed = false;
    var ids = [];

    rows.forEach(function (row) {
      ids.push(row.id);
      var msgs;
      try { msgs = JSON.parse(row.payload); } catch (e) { return; }
      if (!Array.isArray(msgs)) msgs = [msgs];

      msgs.forEach(function (m) {
        if (m.mathhub === 'ink' && m.item) {
          var s = cur.board.slides[m.slide];
          if (!s) return;
          if (!s.items) s.items = [];
          // позначаємо чиє це — щоб на дошці було видно, що писав учень
          var it = m.item;
          it.by = 'student';
          if (!s.items.some(function (x) { return x.id === it.id; })) {
            s.items.push(it);
            changed = true;
          }
        } else if (m.mathhub === 'ink-undo' && m.id) {
          cur.board.slides.forEach(function (s) {
            if (!s.items) return;
            var before = s.items.length;
            s.items = s.items.filter(function (x) { return x.id !== m.id; });
            if (s.items.length !== before) changed = true;
          });
        }
      });
    });

    return { changed: changed, ids: ids };
  }

  /**
   * Фото розв'язань від учня. Забираємо файл до себе й кладемо в те саме
   * сховище картинок, що й решту — тоді вони поводяться як звичайні фото
   * завдання: видно в програмі, їдуть у резервну копію й синхронізуються.
   */
  function mergeHomework(rows) {
    var jobs = [];
    var touched = 0;

    rows.forEach(function (row) {
      var m;
      try { m = JSON.parse(row.payload); } catch (e) { return; }
      if (!m || !m.hw || !m.photos) return;

      var hw = S.get('homeworks', m.hw);
      if (!hw) return;
      if (!hw.photos) hw.photos = [];

      m.photos.forEach(function (p) {
        if (!p || !p.key || !p.url) return;
        if (hw.photos.indexOf(p.key) > -1) return;      // уже забрали
        jobs.push(
          fetch(p.url).then(function (res) {
            if (!res.ok) throw new Error('http ' + res.status);
            return res.blob();
          }).then(function (blob) {
            return window.ImgStore.put(p.key, blob);
          }).then(function () {
            if (hw.photos.indexOf(p.key) < 0) { hw.photos.push(p.key); touched++; }
          }).catch(function (e) {
            console.warn('Фото від учня не забралося:', e && e.message);
          })
        );
      });
    });

    return Promise.all(jobs).then(function () { return touched; });
  }

  function pullContributions() {
    if (!cur || !cur.board.share) return;
    if (!(window.Cloud && Cloud.available() && Cloud.signedIn())) return;
    var lessonId = cur.lessonId;

    window.Cloud.shareContributions(cur.board.share.token).then(function (rows) {
      if (!cur || cur.lessonId !== lessonId || !rows || !rows.length) return;

      var ink = rows.filter(function (r) { return r.kind === 'ink'; });
      var hw  = rows.filter(function (r) { return r.kind === 'homework'; });

      var res = mergeContributions(ink);
      if (res.changed) {
        markDirty();
        flushSave();
        cur.engine.setSlide(cur.board.slides[cur.index], true);
        renderRail();
        refreshEmpty();
        U.toast('Учень щось написав на дошці', 'ok');
      }

      return mergeHomework(hw).then(function (n) {
        if (n) {
          S.save();
          U.toast('Учень надіслав ' + U.pl(n, 'фото', 'фото', 'фото') + ' розв\'язання', 'ok');
        }
        var ids = res.ids.concat(hw.map(function (r) { return r.id; }));
        if (ids.length) window.Cloud.markContributionsMerged(ids);
      });
    }).catch(function (e) {
      // без цього будь-яка помилка тут гинула тихо — саме так і сховалася
      // помилка з невідміченими внесками
      console.warn('Не вдалося забрати те, що надіслав учень:', e && e.message);
    });
  }

  function flushSave() {
    if (!cur || !cur.dirty) return;
    if (cur.saveTimer) { clearTimeout(cur.saveTimer); cur.saveTimer = null; }
    try {
      S.saveBoard(cur.board);
      cur.dirty = false;
      scheduleRepublish();
      var el = document.querySelector('[data-saved]');
      if (el) { el.classList.remove('is-dirty'); el.innerHTML = icon('check', 15) + 'Збережено'; }
    } catch (e) {
      var el2 = document.querySelector('[data-saved]');
      if (el2) { el2.classList.add('is-dirty'); el2.innerHTML = icon('alert', 15) + 'Не збережено'; }
      U.toast('Місце в сховищі браузера закінчилось. Зробіть експорт і почистіть старі дошки.', 'err');
    }
  }

  /* ============================================================
     Слайди
     ============================================================ */

  function slide() { return cur.board.slides[cur.index]; }

  function selectSlide(i) {
    if (!cur || i < 0 || i >= cur.board.slides.length) return;
    flushSave();
    cur.index = i;
    cur.engine.setSlide(cur.board.slides[i]);
    renderRail();
    updateZoom();
    refreshEmpty();
    refreshUndo();
    updateSlideName();
    updateSelBar();
  }

  function addSlide(copyFrom) {
    var s = S.newSlide();
    if (copyFrom) {
      s.items = JSON.parse(JSON.stringify(copyFrom.items || []));
      s.bg = copyFrom.bg;
      s.title = (copyFrom.title || 'Слайд') + ' — копія';
    }
    cur.board.slides.splice(cur.index + 1, 0, s);
    markDirty();
    flushSave();
    selectSlide(cur.index + 1);
  }

  function deleteSlide() {
    if (cur.board.slides.length <= 1) {
      U.toast('Це єдиний слайд — його не можна видалити', 'err');
      return;
    }
    var n = cur.index + 1;
    C.confirm('Видалити слайд ' + n + '?',
      'Усі записи на цьому слайді зникнуть без можливості відновлення.',
      function () {
        cur.board.slides.splice(cur.index, 1);
        cur.thumbs = {};
        markDirty();
        flushSave();
        selectSlide(Math.max(0, cur.index - 1));
        U.toast('Слайд видалено');
      });
  }

  function moveSlide(dir) {
    var i = cur.index, j = i + dir;
    if (j < 0 || j >= cur.board.slides.length) return;
    var arr = cur.board.slides;
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    cur.thumbs = {};
    markDirty(); flushSave();
    selectSlide(j);
  }

  function updateSlideName() {
    var el = document.querySelector('[data-slide-name]');
    if (!el || !cur) return;
    var s = slide();
    el.textContent = s.title || ('Слайд ' + (cur.index + 1));
  }

  function thumbFor(i) {
    var s = cur.board.slides[i];
    var key = s.id + ':' + (s.items || []).length + ':' + s.bg;
    if (cur.thumbs[key]) return cur.thumbs[key];
    if (!(s.items || []).length) return null;
    var url;
    try { url = window.Board.renderToCanvas(s, 420).toDataURL('image/png'); }
    catch (e) { return null; }
    cur.thumbs = {};
    cur.thumbs[key] = url;
    return url;
  }

  function renderRail() {
    var rail = document.querySelector('[data-rail]');
    if (!rail || !cur) return;

    var html = cur.board.slides.map(function (s, i) {
      var url = thumbFor(i);
      return '<button class="slide-card' + (i === cur.index ? ' is-active' : '') +
        '" data-slide-index="' + i + '" title="' + U.esc(s.title || ('Слайд ' + (i + 1))) + '">' +
        (url ? '<img class="slide-card__thumb" src="' + url + '" alt="">'
             : '<div class="slide-card__empty">порожній</div>') +
        '<div class="slide-card__foot">' +
          '<span class="slide-card__num">' + (i + 1) + '</span>' +
          '<span class="slide-card__name">' + U.esc(s.title || 'Слайд ' + (i + 1)) + '</span>' +
        '</div></button>';
    }).join('');

    rail.innerHTML = html +
      '<button class="slide-add" data-act="board-slide-add" title="Додати слайд">' + icon('plus', 20) + '</button>' +
      '<button class="slide-add" data-act="board-slides-photos" ' +
        'title="Слайди з фото домашнього завдання">' + icon('image', 18) + '</button>' +
      '<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:4px;margin-left:6px">' +
        '<button class="icon-btn" data-act="board-slide-dup" title="Дублювати слайд">' + icon('copy', 16) + '</button>' +
        '<button class="icon-btn icon-btn--danger" data-act="board-slide-del" title="Видалити слайд">' + icon('trash', 16) + '</button>' +
      '</div>' +
      '<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:4px">' +
        '<button class="icon-btn" data-act="board-slide-left" title="Перемістити ліворуч">' + icon('chevronL', 16) + '</button>' +
        '<button class="icon-btn" data-act="board-slide-right" title="Перемістити праворуч">' + icon('chevronR', 16) + '</button>' +
      '</div>';

    var active = rail.querySelector('.slide-card.is-active');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    var cnt = document.querySelector('[data-rail-count]');
    if (cnt) cnt.textContent = (cur.index + 1) + ' / ' + cur.board.slides.length;
  }

  /* ---------- Згортання стрічки слайдів ---------- */

  var RAIL_KEY = 'mathhub.boardRail';

  function railHidden() {
    try { return localStorage.getItem(RAIL_KEY) === 'hidden'; } catch (e) { return false; }
  }

  function applyRail() {
    var board = document.querySelector('.board');
    if (board) board.classList.toggle('is-rail-collapsed', railHidden());
    if (cur) cur.engine.resize();   // полотно стало вище або нижче
  }

  function toggleRail() {
    try { localStorage.setItem(RAIL_KEY, railHidden() ? 'shown' : 'hidden'); } catch (e) {}
    applyRail();
  }

  function scheduleThumb() {
    if (!cur) return;
    if (cur.thumbTimer) clearTimeout(cur.thumbTimer);
    cur.thumbTimer = setTimeout(function () { renderRail(); }, 1200);
  }

  /* ============================================================
     Панель налаштувань інструмента (підменю, як у Miro)
     ============================================================ */

  var OPTS_KEY = 'mathhub.boardOpts';

  function optsHidden() {
    try { return localStorage.getItem(OPTS_KEY) === 'hidden'; } catch (e) { return false; }
  }

  function setOptsHidden(v) {
    try { localStorage.setItem(OPTS_KEY, v ? 'hidden' : 'shown'); } catch (e) {}
  }

  function colorsHtml() {
    return '<div><div class="board-opts__label">Колір</div>' +
      '<div class="pen-colors">' + PEN_COLORS.map(function (c) {
        return '<button class="pen-color' + (c === cur.engine.color ? ' is-active' : '') +
          '" data-color="' + c + '" style="background:' + c + '" title="' + c + '"></button>';
      }).join('') + '</div></div>';
  }

  function widthsHtml() {
    return '<div><div class="board-opts__label">Товщина</div>' +
      '<div class="pen-widths">' + PEN_WIDTHS.map(function (w) {
        return '<button class="pen-width' + (w === cur.engine.width ? ' is-active' : '') +
          '" data-width="' + w + '" title="Товщина ' + w + '">' +
          '<i style="width:' + (w + 6) + 'px;height:' + (w + 1) + 'px"></i></button>';
      }).join('') + '</div></div>';
  }

  function sizesHtml() {
    return '<div><div class="board-opts__label">Розмір тексту</div>' +
      '<div class="size-row">' + TEXT_SIZES.map(function (s) {
        return '<button class="size-btn' + (s.v === cur.engine.fontSize ? ' is-active' : '') +
          '" data-size="' + s.v + '" title="' + s.v + ' px">' + s.l + '</button>';
      }).join('') + '</div>' +
      '<div class="stepper">' +
        '<button class="stepper__btn" data-size-step="-1" title="Дрібніше (Ctrl+[)">−</button>' +
        '<input class="stepper__inp" type="number" min="6" max="800" step="1" data-size-val ' +
          'value="' + cur.engine.fontSize + '" title="Розмір у пікселях, 6…800">' +
        '<button class="stepper__btn" data-size-step="1" title="Більше (Ctrl+])">+</button>' +
      '</div></div>';
  }

  /**
   * Показати або сховати підписи сторін і кутів. Якщо фігури виділені —
   * перемикаємо саме їх; інакше вмикаємо/вимикаємо для всіх на слайді
   * і для нових фігур.
   */
  function toggleMeasures() {
    if (!cur) return;
    var e = cur.engine;
    var sel = e.selection.filter(function (i) { return i.t === 'g'; });
    e.snapshot();
    if (sel.length) {
      var on = !sel[0].m;
      sel.forEach(function (i) { i.m = on ? 1 : 0; });
      U.toast(on ? 'Розміри показано' : 'Розміри сховано');
    } else {
      var shapes = e.items().filter(function (i) { return i.t === 'g'; });
      var anyOn = shapes.some(function (i) { return i.m; });
      var next = !anyOn;
      shapes.forEach(function (i) { i.m = next ? 1 : 0; });
      e.showMeasures = next;
      U.toast(next ? 'Розміри показано для всіх фігур' : 'Розміри сховано');
    }
    e.changed();
    renderOpts();
    updateSelBar();
  }

  /** Крок розміру шрифту — множенням, щоб і дрібні, і великі змінювались відчутно. */
  function stepFont(dir) {
    if (!cur) return;
    var e = cur.engine;
    var next = dir > 0 ? Math.ceil(e.fontSize * 1.18) : Math.floor(e.fontSize / 1.18);
    e.fontSize = U.clamp(next, 6, 800);
    var out = document.querySelector('[data-size-val]');
    if (out) out.value = e.fontSize;
    U.$$('[data-size]').forEach(function (x) {
      x.classList.toggle('is-active', +x.dataset.size === e.fontSize);
    });
    applyToSelection({ s: e.fontSize }, 'x');
    updateSelBar();
  }

  /* --- Вузька смужка для олівця, лінії та стрілки (як у Miro) --- */

  function stripWidthsHtml() {
    return '<div class="strip-group">' + PEN_WIDTHS.map(function (w) {
      var d = 5 + w * 1.7;
      return '<button class="dot-btn' + (w === cur.engine.width ? ' is-active' : '') +
        '" data-width="' + w + '" title="Товщина ' + w + '">' +
        '<i style="width:' + d + 'px;height:' + d + 'px;background:' + cur.engine.color + '"></i></button>';
    }).join('') + '</div>';
  }

  function stripColorsHtml() {
    return '<div class="strip-group">' + PEN_COLORS.map(function (c) {
      return '<button class="dot-btn dot-btn--color' + (c === cur.engine.color ? ' is-active' : '') +
        '" data-color="' + c + '" title="' + c + '"><i style="background:' + c + '"></i></button>';
    }).join('') + '</div>';
  }

  var SMOOTH_LABELS = ['без корекції', 'звичайна корекція', 'сильна корекція'];

  function stripSmoothHtml() {
    var lv = cur.engine.smoothing || 0;
    return '<button class="dot-btn dot-btn--icon' + (lv ? ' is-active' : '') +
      (lv === 2 ? ' is-strong' : '') + '" data-smooth title="Почерк: ' + SMOOTH_LABELS[lv] +
      ' (клік — наступний рівень)">' + icon('sparkles', 18) +
      (lv ? '<b class="dot-btn__lv">' + lv + '</b>' : '') + '</button>';
  }

  function smoothHtml() {
    return '<button class="fill-toggle' + (cur.engine.smoothing ? ' is-active' : '') +
      '" data-smooth title="Вирівнювати лінію після кожного штриха">' +
      '<span class="fill-toggle__box" style="background:' +
      (cur.engine.smoothing ? 'rgba(23,178,106,.2)' : 'transparent') +
      ';border-color:var(--green)"></span>' +
      (cur.engine.smoothing ? 'Почерк рівний' : 'Почерк як є') + '</button>';
  }

  function shapesHtml() {
    var groups = window.Board.SHAPE_GROUPS;
    var tabs = '<div class="shape-tabs">' + groups.map(function (g, i) {
      return '<button class="shape-tab' + (i === cur.shapeGroup ? ' is-active' : '') +
        '" data-shape-group="' + i + '">' + U.esc(g.label) + '</button>';
    }).join('') + '</div>';

    var g = groups[cur.shapeGroup] || groups[0];
    var grid = '<div class="shape-grid">' + g.ids.map(function (id) {
      var sh = window.Board.SHAPES[id];
      return '<button class="shape-btn' + (id === cur.engine.shape ? ' is-active' : '') +
        '" data-shape="' + id + '" title="' + U.esc(sh.label) + '">' +
        window.Board.shapeIcon(id, 24) + '</button>';
    }).join('') + '</div>';

    var fill = '<button class="fill-toggle' + (cur.engine.fillOn ? ' is-active' : '') + '" data-fill>' +
      '<span class="fill-toggle__box" style="background:' +
      (cur.engine.fillOn ? 'rgba(19,88,245,.18)' : 'transparent') + '"></span>' +
      (cur.engine.fillOn ? 'Із заливкою' : 'Без заливки') + '</button>';

    var meas = '<button class="fill-toggle' + (cur.engine.showMeasures ? ' is-active' : '') +
      '" data-measures title="Підписувати сторони й кути">' +
      '<span class="fill-toggle__box" style="background:' +
      (cur.engine.showMeasures ? 'rgba(122,90,248,.18)' : 'transparent') +
      ';border-color:var(--violet)"></span>' +
      (cur.engine.showMeasures ? 'Розміри видно' : 'Розміри сховані') + '</button>';

    var info = '<button class="facts-btn" data-facts="' + cur.engine.shape + '">' +
      icon('info', 15) + 'Властивості фігури</button>';

    return '<div><div class="board-opts__label">Фігура</div>' + tabs + grid + fill + meas + info + '</div>';
  }

  function renderOpts() {
    if (!cur) return;
    var panel = document.querySelector('[data-opts]');
    var open = document.querySelector('[data-opts-open]');
    if (!panel || !open) return;

    var kind = TOOL_OPTS[cur.engine.tool];
    var dot = document.querySelector('[data-opts-dot]');
    if (dot) dot.style.background = cur.engine.color;

    // у інструментів без налаштувань підменю просто немає
    if (!kind) { panel.hidden = true; open.hidden = true; return; }

    if (optsHidden()) { panel.hidden = true; open.hidden = false; return; }
    open.hidden = true;
    panel.hidden = false;

    var inner = '';
    if (kind === 'stroke') {
      // вузька смужка: товщини кружечками, під ними кольори
      inner = stripWidthsHtml() + '<div class="strip-sep"></div>' + stripColorsHtml() +
        (cur.engine.tool === 'pen' ? '<div class="strip-sep"></div>' + stripSmoothHtml() : '');
    }
    else if (kind === 'text') inner = colorsHtml() + sizesHtml();
    else if (kind === 'shape') inner = shapesHtml() + colorsHtml() + widthsHtml();

    panel.innerHTML = inner;
    panel.classList.toggle('board-opts--wide', kind === 'shape');
    panel.classList.toggle('board-opts--strip', kind === 'stroke');
  }

  function toggleOpts() {
    setOptsHidden(!optsHidden());
    renderOpts();
  }

  /** Зміна кольору/товщини застосовується і до вже виділених об'єктів. */
  function applyToSelection(patch, onlyType) {
    if (!cur) return;
    var sel = cur.engine.selection;
    if (!sel.length) return;
    var touched = 0;
    sel.forEach(function (it) {
      if (onlyType && it.t !== onlyType) return;
      if (it.t === 'i') return;                         // у картинки немає кольору
      Object.keys(patch).forEach(function (k) {
        if (k === 's' && it.t !== 'x') return;
        if (k === 'w' && it.t === 'x') return;
        it[k] = patch[k];
        if (k === 'c' && it.t === 'g' && it.f) it.f = fillFromColor(patch[k]);
      });
      touched++;
    });
    if (touched) { cur.engine.snapshot(); cur.engine.changed(); }
  }

  function fillFromColor(color) {
    var m = /^#([0-9a-f]{6})$/i.exec(color || '');
    if (!m) return 'rgba(19,88,245,.15)';
    var n = parseInt(m[1], 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',.15)';
  }

  /* ============================================================
     Панель дій над виділеним
     ============================================================ */

  function updateSelBar() {
    if (!cur) return;
    var bar = document.querySelector('[data-sel-bar]');
    if (!bar) return;
    var e = cur.engine;
    var n = e.selection.length;

    if (!n || e.band) { bar.hidden = true; return; }

    var b = e.selectionBounds();
    if (!b) { bar.hidden = true; return; }

    // контекстні дії: залежать від того, що саме виділено
    var extra = '';
    if (n === 1 && e.selection[0].t === 'g') {
      var sid = e.selection[0].sh;
      extra =
        '<button class="sel-bar__btn" data-act="board-constr" title="Побудови: висота, медіана, коло…">' +
          icon('compass', 16) + '</button>' +
        '<button class="sel-bar__btn" data-act="board-dims" title="Задати сторони й кути">' +
          icon('target', 16) + '</button>' +
        '<button class="sel-bar__btn" data-act="board-facts-sel" title="Властивості фігури">' +
          icon('info', 16) + '</button>' +
        '<button class="sel-bar__btn' + (e.selection[0].m ? ' is-on' : '') +
          '" data-act="board-toggle-measures" title="Показати або сховати розміри">' +
          icon('checklist', 16) + '</button>' +
        '<span class="sel-bar__sep"></span>';
    } else if (e.selection.some(function (i) { return i.t === 'x'; })) {
      extra =
        '<button class="sel-bar__btn" data-act="board-font-down" title="Дрібніший текст">' +
          '<b style="font-size:12px">A−</b></button>' +
        '<button class="sel-bar__btn" data-act="board-font-up" title="Більший текст">' +
          '<b style="font-size:15px">A+</b></button>' +
        '<span class="sel-bar__sep"></span>';
    }

    bar.innerHTML =
      '<span class="sel-bar__count">' + U.pl(n, 'об’єкт', 'об’єкти', 'об’єктів') + '</span>' +
      extra +
      '<button class="sel-bar__btn" data-act="board-copy" title="Копіювати (Ctrl+C)">' +
        icon('copy', 16) + '</button>' +
      '<button class="sel-bar__btn" data-act="board-duplicate" title="Дублювати (Ctrl+D)">' +
        icon('layers', 16) + '</button>' +
      '<button class="sel-bar__btn sel-bar__btn--danger" data-act="board-delete" title="Видалити (Delete)">' +
        icon('trash', 16) + '</button>';

    var tl = e.toScreen(b.x1, b.y1);
    var tr = e.toScreen(b.x2, b.y1);
    bar.hidden = false;

    var w = bar.offsetWidth || 190;
    var cx = (tl.x + tr.x) / 2;
    var left = Math.max(8, Math.min(e.cssW - w - 8, cx - w / 2));
    var top = tl.y - bar.offsetHeight - 12;
    if (top < 8) top = Math.min(e.cssH - 50, e.toScreen(b.x1, b.y2).y + 14);

    bar.style.left = Math.round(left) + 'px';
    bar.style.top = Math.round(top) + 'px';
  }

  /* ============================================================
     Дрібні оновлення
     ============================================================ */

  function setTool(id) { if (cur) cur.engine.setTool(id); }

  function syncToolButtons(id) {
    U.$$('[data-tool]').forEach(function (x) {
      x.classList.toggle('is-active', x.dataset.tool === id);
    });
  }

  function updateZoom() {
    var el = document.querySelector('[data-zoom]');
    if (el && cur) el.textContent = Math.round(cur.engine.scale * 100) + '%';
  }

  function refreshUndo() {
    if (!cur) return;
    U.$$('[data-act="board-undo"]').forEach(function (b) { b.disabled = !cur.engine.canUndo(); });
    U.$$('[data-act="board-redo"]').forEach(function (b) { b.disabled = !cur.engine.canRedo(); });
  }

  function refreshEmpty() {
    var el = document.querySelector('[data-empty]');
    if (el && cur) el.hidden = (slide().items || []).length > 0;
  }

  var hintTimer = null;
  function hint(text) {
    var el = document.querySelector('[data-hint]');
    if (!el) return;
    el.textContent = text;
    el.classList.add('is-on');
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { el.classList.remove('is-on'); }, 4200);
  }

  /* ============================================================
     Вставка картинки
     ============================================================ */

  /** at — необов'язкова точка на полотні; без неї беремо позицію курсора. */
  function insertImageFile(file, at) {
    if (!cur) return;
    if (!window.ImgStore || !window.ImgStore.available()) {
      U.toast('Браузер не дає зберігати картинки (немає IndexedDB)', 'err');
      return;
    }
    if (!/^image\//.test(file.type || '')) {
      U.toast('Це не картинка — підійдуть PNG, JPG, WebP', 'err');
      return;
    }
    // позицію фіксуємо зараз: поки картинка стискається, курсор може зʼїхати
    var spot = at || (cur.engine.lastPointer ? { x: cur.engine.lastPointer.x, y: cur.engine.lastPointer.y } : null);
    U.toast('Обробляю картинку…');
    window.ImgStore.ingest(file).then(function (meta) {
      if (!cur) return;
      cur.engine.addImage(meta, spot);
      flushSave();
      renderRail();
      U.toast('Картинку додано · ' + Math.max(1, Math.round(meta.bytes / 1024)) + ' КБ', 'ok');
    }).catch(function (e) {
      U.toast('Не вдалося додати картинку: ' + (e && e.message ? e.message : e), 'err');
    });
  }

  /* ============================================================
     Введення тексту прямо на полотні
     ============================================================ */

  function openTextInput(world, screen) {
    var body = document.querySelector('.board-body');
    if (!body) return;

    var old = body.querySelector('.board-text-input');
    if (old && old._commit) old._commit();

    var ta = document.createElement('textarea');
    ta.className = 'board-text-input';
    ta.rows = 1;
    var size = cur.engine.fontSize * cur.engine.scale;
    ta.style.left = screen.x + 'px';
    ta.style.top = (screen.y - size) + 'px';
    ta.style.fontSize = Math.max(11, size) + 'px';
    ta.style.color = cur.engine.color;
    ta.placeholder = 'Текст…';
    body.appendChild(ta);

    function grow() {
      ta.style.height = 'auto';
      ta.style.height = (ta.scrollHeight + 2) + 'px';
    }
    ta.addEventListener('input', grow);

    var done = false, armed = false;

    function commit() {
      if (done) return;
      done = true;
      var v = ta.value.replace(/\s+$/, '');
      ta.remove();
      if (v) cur.engine.addText(world, v);
    }
    function cancel() {
      if (done) return;
      done = true;
      ta.remove();
    }
    ta._commit = commit;

    /* Закриваємо по blur лише після «озброєння» — інакше стандартна дія
       mousedown, що знімає фокус одразу, закрила б поле порожнім.
       Озброюємось за таймером, а не по події focus: у деяких станах
       (наприклад, коли вікно браузера не активне) focus не приходить,
       і текст губився б при переході до іншого елемента. */
    ta.addEventListener('focus', function () { armed = true; });
    ta.addEventListener('blur', function () { if (armed) commit(); });

    ta.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });

    /* Фокус — наступним тіком. Синхронний focus() браузер скасовує,
       завершуючи обробку mousedown, і поле закривалося б порожнім. */
    setTimeout(function () {
      if (done) return;
      ta.focus();
      armed = true;
    }, 0);
    grow();
  }

  /* ============================================================
     Клавіатура
     ============================================================ */

  function onKey(e) {
    if (!cur) return;
    if (e.target && e.target.matches && e.target.matches('input, textarea, select')) return;
    var mr = document.getElementById('modal-root');
    if (mr && !mr.hidden) return;

    var eng = cur.engine;

    if (e.key === ' ') { eng.spaceDown = true; eng.canvas.style.cursor = 'grab'; return; }

    if (e.ctrlKey || e.metaKey) {
      var k = e.key.toLowerCase();
      if (k === 'z' || k === 'я') {
        e.preventDefault();
        if (e.shiftKey) eng.redo(); else eng.undo();
        refreshUndo(); refreshEmpty(); scheduleThumb();
        return;
      }
      if (k === 'y') { e.preventDefault(); eng.redo(); refreshUndo(); refreshEmpty(); scheduleThumb(); return; }
      if (k === 'a' || k === 'ф') { e.preventDefault(); eng.selectAll(); return; }
      if (e.key === ']' || e.key === '}') { e.preventDefault(); stepFont(1); return; }
      if (e.key === '[' || e.key === '{') { e.preventDefault(); stepFont(-1); return; }
      if (k === 'c' || k === 'с') {
        var n = eng.copySelection();
        if (n) { e.preventDefault(); U.toast('Скопійовано ' + U.pl(n, 'об’єкт', 'об’єкти', 'об’єктів'), 'ok'); }
        return;
      }
      if (k === 'd' || k === 'в') {
        e.preventDefault();
        var m = eng.duplicateSelection();
        if (m) U.toast('Дубльовано ' + U.pl(m, 'об’єкт', 'об’єкти', 'об’єктів'), 'ok');
        return;
      }
      return;   // Ctrl+V ловить обробник paste
    }
    if (e.altKey) return;

    var map = { v: 'select', p: 'pen', e: 'eraser', t: 'text', s: 'shape',
                l: 'line', a: 'arrow', h: 'hand' };
    var kk = e.key.toLowerCase();
    if (map[kk]) { e.preventDefault(); setTool(map[kk]); return; }
    if (kk === 'r') { e.preventDefault(); eng.setShape('rect'); renderOpts(); return; }
    if (kk === 'o') { e.preventDefault(); eng.setShape('circle'); renderOpts(); return; }
    if (kk === 'm') { e.preventDefault(); toggleMeasures(); return; }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (eng.deleteSelection()) e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      if (eng.selection.length) { eng.clearSelection(); eng.render(); return; }
      document.querySelector('[data-act="board-exit"]').click();
      return;
    }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); eng.zoomBy(1.2); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); eng.zoomBy(1 / 1.2); return; }
    if (e.key === '0') { e.preventDefault(); eng.resetView(); return; }
    if (e.key === 'PageDown') { e.preventDefault(); selectSlide(cur.index + 1); return; }
    if (e.key === 'PageUp') { e.preventDefault(); selectSlide(cur.index - 1); return; }
  }

  window.addEventListener('keyup', function (e) {
    if (e.key === ' ' && cur) {
      cur.engine.spaceDown = false;
      cur.engine.applyCursor();
    }
  });

  /* ============================================================
     Дії
     ============================================================ */

  V.boardActions = {
    'board-exit': function () {
      var lid = cur ? cur.lessonId : null;
      var lesson = lid ? S.get('lessons', lid) : null;
      V.unmountBoard();
      location.hash = lesson ? '#/student/' + lesson.studentId + '/lessons' : '#/';
    },
    'board-undo': function () { cur.engine.undo(); refreshUndo(); refreshEmpty(); scheduleThumb(); },
    'board-redo': function () { cur.engine.redo(); refreshUndo(); refreshEmpty(); scheduleThumb(); },
    'board-image': function () { document.querySelector('[data-img-input]').click(); },
    'board-opts-toggle': function () { toggleOpts(); },
    'board-rail-toggle': function () { toggleRail(); },
    'board-save-view': function () {
      if (cur.engine.saveCurrentView()) {
        flushSave();
        U.toast('Цей вигляд слайда стане початковим', 'ok');
      }
    },
    'board-measures': function () { toggleMeasures(); },
    'board-copy': function () {
      var n = cur.engine.copySelection();
      if (n) U.toast('Скопійовано ' + U.pl(n, 'об’єкт', 'об’єкти', 'об’єктів'), 'ok');
    },
    'board-duplicate': function () {
      var n = cur.engine.duplicateSelection();
      if (n) U.toast('Дубльовано ' + U.pl(n, 'об’єкт', 'об’єкти', 'об’єктів'), 'ok');
    },
    'board-delete': function () { cur.engine.deleteSelection(); },
    'board-font-up': function () { stepFont(1); },
    'board-font-down': function () { stepFont(-1); },
    'board-dims': function () {
      var it = cur.engine.selection[0];
      if (it && it.t === 'g') dimensionsDialog(it);
    },
    'board-constr': function () {
      var it = cur.engine.selection[0];
      if (it && it.t === 'g') constructionsDialog(it);
    },
    'board-facts-sel': function () {
      var it = cur.engine.selection[0];
      if (it && it.t === 'g') factsModal(it.sh);
    },
    'board-toggle-measures': function () {
      var it = cur.engine.selection[0];
      if (!it || it.t !== 'g') return;
      cur.engine.snapshot();
      it.m = it.m ? 0 : 1;
      cur.engine.changed();
    },
    'board-clear': function () {
      if (!(slide().items || []).length) { U.toast('Слайд і так порожній'); return; }
      C.confirm('Очистити слайд?', 'Усі записи на поточному слайді буде стерто. Скасувати можна через Ctrl+Z.',
        function () { cur.engine.clearSlide(); refreshUndo(); refreshEmpty(); renderRail(); },
        'Так, очистити');
    },
    'board-zoom-in': function () { cur.engine.zoomBy(1.25); },
    'board-zoom-out': function () { cur.engine.zoomBy(1 / 1.25); },
    'board-zoom-reset': function () { cur.engine.resetView(); },
    'board-fit': function () { cur.engine.fit(); },
    'board-slide-add': function () { addSlide(null); },
    'board-slides-photos': function () { document.querySelector('[data-multi-input]').click(); },
    'board-slide-dup': function () { addSlide(slide()); },
    'board-slide-del': function () { deleteSlide(); },
    'board-slide-left': function () { moveSlide(-1); },
    'board-slide-right': function () { moveSlide(1); },
    'board-rename': function () { renameSlide(); },
    'board-bg': function () { changeBg(); },
    'board-png': function () { exportPNG(); },
    'board-share': function () { shareDialog(); }
  };

  function renameSlide() {
    var s = slide();
    C.modal({
      title: 'Назва слайда',
      sub: 'Слайд ' + (cur.index + 1) + ' з ' + cur.board.slides.length,
      body: C.field('Назва', C.input('title', s.title,
        'placeholder="Напр. Теорія: похідна складеної функції"'),
        'Видно у стрічці слайдів і в тому, що бачить учень.'),
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Зберегти', kind: 'btn--primary', act: 'ok', icon: 'check',
          onClick: function (root) {
            s.title = C.readForm(root).title;
            markDirty(); flushSave(); renderRail(); updateSlideName();
          } }
      ]
    });
  }

  /* ============================================================
     Слайди з фото домашнього завдання
     ============================================================ */

  function photosToSlidesDialog(files) {
    C.modal({
      title: 'Слайди з фото',
      sub: U.pl(files.length, 'фото', 'фото', 'фото') + ' — як розкласти?',
      body:
        '<div class="seg" data-modes>' +
          '<button class="seg__btn is-active" data-mode="each">Окремий слайд на кожне</button>' +
          '<button class="seg__btn" data-mode="one">Усі на один слайд</button>' +
        '</div>' +
        '<div class="field__hint mt-2">Якщо на одне завдання кілька фото — вибирайте «усі на один слайд»: ' +
        'вони ляжуть сіткою, і ви зможете писати поверх них. Слайди додаються після поточного.</div>',
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Створити', kind: 'btn--primary', act: 'go', icon: 'sparkles',
          onClick: function (root) {
            var mode = root.querySelector('.seg__btn.is-active').dataset.mode;
            buildSlidesFromPhotos(files, mode);
          } }
      ],
      onMount: function (root) {
        U.onClick(root, '[data-mode]', function (el) {
          U.$$('.seg__btn', root).forEach(function (x) { x.classList.remove('is-active'); });
          el.classList.add('is-active');
        });
      }
    });
  }

  function buildSlidesFromPhotos(files, mode) {
    if (!cur) return;
    if (!window.ImgStore || !window.ImgStore.available()) {
      U.toast('Браузер не дає зберігати фото', 'err');
      return;
    }
    U.toast('Обробляю ' + U.pl(files.length, 'фото', 'фото', 'фото') + '…');

    Promise.all(files.map(function (f) {
      return window.ImgStore.ingest(f).then(function (m) { return m; }).catch(function () { return null; });
    })).then(function (metas) {
      var ok = metas.filter(Boolean);
      if (!ok.length) { U.toast('Не вдалося прочитати жодного файлу', 'err'); return; }

      var e = cur.engine;
      if (mode === 'each') {
        ok.forEach(function (m, i) {
          var s = S.newSlide('Фото ' + (i + 1));
          cur.board.slides.splice(cur.index + 1 + i, 0, s);
          // кладемо фото в природному розмірі навколо початку координат
          var w = Math.min(900, m.w), h = w / (m.w / m.h);
          s.items.push({ t: 'i', k: m.key, r: m.w / m.h,
                         a: [-w / 2, -h / 2, w / 2, h / 2] });
          s.view = { x: -w / 2 - 60, y: -h / 2 - 60, s: 1 };
        });
        markDirty(); flushSave();
        selectSlide(cur.index + 1);
      } else {
        var s2 = S.newSlide('Домашнє завдання');
        cur.board.slides.splice(cur.index + 1, 0, s2);
        var cols = Math.ceil(Math.sqrt(ok.length));
        var cell = 560, gap = 40;
        ok.forEach(function (m, i) {
          var cx = (i % cols) * (cell + gap);
          var cy = Math.floor(i / cols) * (cell + gap);
          var k = Math.min(cell / m.w, cell / m.h);
          var w = m.w * k, h = m.h * k;
          s2.items.push({ t: 'i', k: m.key, r: m.w / m.h,
                          a: [cx + (cell - w) / 2, cy + (cell - h) / 2,
                              cx + (cell + w) / 2, cy + (cell + h) / 2] });
        });
        var rows = Math.ceil(ok.length / cols);
        s2.view = { x: -60, y: -60, s: Math.min(1, 700 / (rows * (cell + gap))) };
        markDirty(); flushSave();
        selectSlide(cur.index + 1);
      }

      cur.thumbs = {};
      renderRail();
      e.ensureImages();
      e.render();
      U.toast(mode === 'each'
        ? 'Створено ' + U.pl(ok.length, 'слайд', 'слайди', 'слайдів')
        : 'Слайд із ' + U.pl(ok.length, 'фото', 'фото', 'фото') + ' готовий', 'ok');
    });
  }

  /* ============================================================
     Розміри фігури: показ і точне задання
     ============================================================ */

  function dimensionsDialog(it) {
    var B = window.Board;
    var m = B.shapeMeasure(it);
    if (!m) { U.toast('Для цієї фігури розміри недоступні', 'err'); return; }
    var sh = B.SHAPES[it.sh] || {};
    var isTri = !m.round && m.pts && m.pts.length === 3;
    var u = function (v) { return B.fmtLen(v); };

    /* --- поточні виміри --- */
    var info;
    if (m.round) {
      info = '<div class="dim-list">' +
        row('Радіус по горизонталі', u(m.rx)) +
        row('Радіус по вертикалі', u(m.ry)) +
        row('Площа', u2(Math.PI * m.rx * m.ry)) +
        '</div>';
    } else {
      var sides = m.sides.map(function (s, i) {
        return row('Сторона ' + (i + 1), u(s.len));
      }).join('');
      var angles = m.angles.map(function (A, i) {
        return row('Кут ' + (i + 1), Math.round(A.deg) + '°');
      }).join('');
      info = '<div class="dim-list">' + sides +
        '<div class="dim-sep"></div>' + angles +
        '<div class="dim-sep"></div>' +
        row('Периметр', u(m.perimeter)) +
        row('Площа', u2(m.area)) +
        row('Сума кутів', Math.round(m.angles.reduce(function (a, x) { return a + x.deg; }, 0)) + '°') +
        '</div>';
    }

    function row(k, v) {
      return '<div class="dim-row"><span>' + U.esc(k) + '</span><b>' + U.esc(v) + '</b></div>';
    }
    function u2(area) { return (Math.round(area / (B.UNIT * B.UNIT) * 10) / 10).toString().replace('.', ',') + ' од²'; }

    /* --- режими задання --- */
    var modes = [{ v: 'box', l: 'Рамка' }];
    if (isTri) { modes.push({ v: 'sss', l: '3 сторони' }); modes.push({ v: 'sas', l: '2 сторони + кут' }); }
    if (!m.round && !isTri) modes.push({ v: 'side', l: 'За стороною' });
    if (m.round) modes.push({ v: 'circle', l: 'Радіус' });

    function fields(mode) {
      if (mode === 'box') {
        if (sh.lock) {
          return C.field('Ширина, од', C.input('w', dec(m.w / B.UNIT), 'type="number" min="0.1" step="0.5"'),
            'Це правильна фігура, тому висота підбирається сама — інакше вона перестане бути правильною.');
        }
        return '<div class="field-row">' +
          C.field('Ширина, од', C.input('w', dec(m.w / B.UNIT), 'type="number" min="0.1" step="0.5"')) +
          C.field('Висота, од', C.input('h', dec(m.h / B.UNIT), 'type="number" min="0.1" step="0.5"')) +
          '</div>';
      }
      if (mode === 'sss') {
        return '<div class="field-row field-row--3">' +
          C.field('Сторона 1', C.input('s1', dec(m.sides[0].len / B.UNIT), 'type="number" min="0.1" step="0.5"')) +
          C.field('Сторона 2', C.input('s2', dec(m.sides[1].len / B.UNIT), 'type="number" min="0.1" step="0.5"')) +
          C.field('Сторона 3', C.input('s3', dec(m.sides[2].len / B.UNIT), 'type="number" min="0.1" step="0.5"')) +
          '</div><div class="field__hint">Сума будь-яких двох сторін мусить бути більшою за третю.</div>';
      }
      if (mode === 'sas') {
        return '<div class="field-row field-row--3">' +
          C.field('Сторона 1', C.input('s1', dec(m.sides[0].len / B.UNIT), 'type="number" min="0.1" step="0.5"')) +
          C.field('Сторона 2', C.input('s2', dec(m.sides[1].len / B.UNIT), 'type="number" min="0.1" step="0.5"')) +
          C.field('Кут між ними, °', C.input('deg', Math.round(m.angles[1].deg), 'type="number" min="1" max="179" step="1"')) +
          '</div><div class="field__hint">Кут між сторонами 1 і 2 — це кут при їхній спільній вершині.</div>';
      }
      if (mode === 'side') {
        var opts = m.sides.map(function (s, i) {
          return { value: String(i), label: 'Сторона ' + (i + 1) + ' (зараз ' + u(s.len) + ')' };
        });
        return '<div class="field-row">' +
          C.field('Яку сторону', C.select('idx', '0', opts)) +
          C.field('Зробити рівною, од', C.input('len', dec(m.sides[0].len / B.UNIT), 'type="number" min="0.1" step="0.5"')) +
          '</div><div class="field__hint">Фігура масштабується пропорційно, тому решта сторін і всі кути збережуться.</div>';
      }
      if (mode === 'circle') {
        return it.sh === 'circle'
          ? C.field('Радіус, од', C.input('r', dec(m.rx / B.UNIT), 'type="number" min="0.1" step="0.5"'))
          : '<div class="field-row">' +
            C.field('Піввісь a, од', C.input('rx', dec(m.rx / B.UNIT), 'type="number" min="0.1" step="0.5"')) +
            C.field('Піввісь b, од', C.input('ry', dec(m.ry / B.UNIT), 'type="number" min="0.1" step="0.5"')) +
            '</div>';
      }
      return '';
    }

    function dec(v) { return Math.round(v * 10) / 10; }

    C.modal({
      title: 'Розміри: ' + (sh.label || 'фігура'),
      sub: '1 умовна одиниця = ' + B.UNIT + ' пікселів полотна',
      wide: true,
      body:
        '<div class="dim-cols">' +
          '<div><div class="board-opts__label" style="margin-bottom:10px">Зараз</div>' + info + '</div>' +
          '<div><div class="board-opts__label" style="margin-bottom:10px">Задати точно</div>' +
            '<div class="seg" data-modes>' + modes.map(function (o, i) {
              return '<button class="seg__btn' + (i === 0 ? ' is-active' : '') +
                '" data-mode="' + o.v + '">' + o.l + '</button>';
            }).join('') + '</div>' +
            '<div class="mt-2" data-fields>' + fields('box') + '</div>' +
          '</div>' +
        '</div>',
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Застосувати', kind: 'btn--primary', act: 'ok', icon: 'check',
          onClick: function (root) {
            var mode = root.querySelector('.seg__btn.is-active').dataset.mode;
            var v = C.readForm(root);
            var spec = null;
            if (mode === 'box') spec = { w: v.w, h: v.h };
            else if (mode === 'sss') spec = { sides: [v.s1, v.s2, v.s3] };
            else if (mode === 'sas') spec = { sas: { s1: v.s1, s2: v.s2, deg: v.deg } };
            else if (mode === 'side') spec = { scaleToSide: { i: +v.idx, len: v.len } };
            else if (mode === 'circle') spec = it.sh === 'circle' ? { r: v.r } : { rx: v.rx, ry: v.ry };

            cur.engine.snapshot();
            var ok = cur.engine.setShapeGeometry(it, spec);
            if (!ok) {
              cur.engine.history.pop();
              U.toast(mode === 'sss'
                ? 'Такого трикутника не існує: перевірте нерівність трикутника'
                : 'Перевірте введені числа', 'err');
              return false;
            }
            it.m = 1;                        // після точного задання показуємо підписи
            cur.engine.changed();
            updateSelBar();
            U.toast('Розміри застосовано', 'ok');
          } }
      ],
      onMount: function (root) {
        U.onClick(root, '[data-mode]', function (el) {
          U.$$('.seg__btn', root).forEach(function (x) { x.classList.remove('is-active'); });
          el.classList.add('is-active');
          root.querySelector('[data-fields]').innerHTML = fields(el.dataset.mode);
        });
      }
    });
  }

  /* ============================================================
     Побудови: висота, медіана, бісектриса, коло тощо
     ============================================================ */

  function constructionsDialog(shape) {
    var B = window.Board, Cn = window.Constructions;
    if (!Cn) { U.toast('Модуль побудов не завантажився', 'err'); return; }
    var pts = B.shapePoints(shape);
    var avail = Cn.availableFor(shape, pts);
    var shDef = B.SHAPES[shape.sh] || {};

    if (!avail.length) {
      U.toast('Для цієї фігури побудов немає', 'err');
      return;
    }

    function rowsHtml() {
      return avail.map(function (o) {
        var ctrl;
        if (o.per === 'vertex' || o.per === 'side') {
          var word = o.per === 'vertex' ? 'вершини' : 'сторони';
          var btns = '';
          for (var i = 0; i < o.count; i++) {
            btns += '<button class="constr-num" data-add="' + o.k + '" data-i="' + i + '" ' +
              'title="Від ' + word + ' ' + (i + 1) + '">' + (i + 1) + '</button>';
          }
          btns += '<button class="constr-num constr-num--all" data-add-all="' + o.k +
            '" data-count="' + o.count + '">усі</button>';
          ctrl = '<div class="constr-nums">' + btns + '</div>';
        } else if (o.per === 'angle') {
          ctrl = '<div class="constr-angle">' +
            '<input class="input" type="number" value="35" min="0" max="360" step="5" data-a1="' + o.k + '">' +
            '<span class="muted small">°</span>' +
            '<button class="btn btn--soft btn--sm" data-add="' + o.k + '">Додати</button></div>';
        } else if (o.per === 'angle2') {
          ctrl = '<div class="constr-angle">' +
            '<input class="input" type="number" value="35" min="0" max="360" step="5" data-a1="' + o.k + '">' +
            '<input class="input" type="number" value="160" min="0" max="360" step="5" data-a2="' + o.k + '">' +
            '<span class="muted small">°</span>' +
            '<button class="btn btn--soft btn--sm" data-add="' + o.k + '">Додати</button></div>';
        } else {
          ctrl = '<button class="btn btn--soft btn--sm" data-add="' + o.k + '">Побудувати</button>';
        }
        return '<div class="constr-row">' +
          '<div class="constr-row__name">' + U.esc(o.label) +
          (o.hint ? ' <span class="muted small">(' + U.esc(o.hint) + ')</span>' : '') + '</div>' +
          ctrl + '</div>';
      }).join('');
    }

    function existingHtml() {
      var list = cur.engine.constructionsOf(shape);
      if (!list.length) {
        return '<div class="field__hint">Ще нічого не побудовано.</div>';
      }
      return '<div class="constr-list">' + list.map(function (x, n) {
        var lbl = (Cn.KINDS[x.k] || {}).label || x.k;
        var extra = x.i != null ? ' ' + (x.i + 1) : (x.a1 != null ? ' ' + x.a1 + '°' : '');
        return '<span class="constr-chip"><i style="background:' + (x.c || '#0D2149') + '"></i>' +
          U.esc(lbl + extra) +
          '<button data-del-constr="' + n + '" title="Прибрати">' + icon('x', 12) + '</button></span>';
      }).join('') + '</div>';
    }

    C.modal({
      title: 'Побудови: ' + (shDef.label || 'фігура'),
      sub: 'Показані лише ті, що для цієї фігури мають сенс',
      wide: true,
      body:
        '<div data-constr-rows>' + rowsHtml() + '</div>' +
        '<div class="dim-sep" style="margin:16px 0 12px"></div>' +
        '<div class="board-opts__label" style="margin-bottom:8px">Уже побудовано</div>' +
        '<div data-constr-existing>' + existingHtml() + '</div>',
      buttons: [{ label: 'Готово', kind: 'btn--primary', act: 'ok' }],
      onMount: function (root) {
        function refresh() {
          root.querySelector('[data-constr-existing]').innerHTML = existingHtml();
        }

        function addOne(kind, idx) {
          var spec = { k: kind };
          if (idx != null) spec.i = idx;
          var a1 = root.querySelector('[data-a1="' + kind + '"]');
          var a2 = root.querySelector('[data-a2="' + kind + '"]');
          if (a1) spec.a1 = +a1.value;
          if (a2) spec.a2 = +a2.value;
          var made = cur.engine.addConstruction(shape, spec);
          if (!made) { U.toast('Така побудова тут неможлива', 'err'); return false; }
          return true;
        }

        U.onClick(root, '[data-add]', function (el) {
          if (el.hasAttribute('data-i')) {
            if (addOne(el.dataset.add, +el.dataset.i)) {
              U.toast('Додано', 'ok'); refresh(); updateSelBar();
            }
          } else {
            if (addOne(el.dataset.add, null)) { U.toast('Додано', 'ok'); refresh(); updateSelBar(); }
          }
        });

        U.onClick(root, '[data-add-all]', function (el) {
          var k = el.dataset.addAll, n = +el.dataset.count, made = 0;
          for (var i = 0; i < n; i++) if (addOne(k, i)) made++;
          if (made) { U.toast('Додано ' + made, 'ok'); refresh(); updateSelBar(); }
        });

        U.onClick(root, '[data-del-constr]', function (el) {
          var list = cur.engine.constructionsOf(shape);
          var target = list[+el.dataset.delConstr];
          if (!target) return;
          var e = cur.engine;
          e.snapshot();
          e.slide.items = e.items().filter(function (x) { return x !== target; });
          e.clearSelection();
          e.setSelection([shape]);
          e.changed();
          refresh();
        });
      }
    });
  }

  /* ============================================================
     Властивості фігури
     ============================================================ */

  /**
   * Текст із математикою: \frac{чисельник}{знаменник} перетворюється у справжній
   * дріб із горизонтальною рискою. Спершу екрануємо, потім розставляємо розмітку —
   * маркер не містить символів HTML, тож екранування його не зачіпає.
   */
  function mathHtml(s) {
    return U.esc(s).replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, function (_, n, d) {
      return '<span class="frac"><span class="frac__n">' + n + '</span>' +
             '<span class="frac__d">' + d + '</span></span>';
    });
  }

  function factsModal(shapeId) {
    var facts = (window.SHAPE_FACTS || {})[shapeId];
    var sh = (window.Board.SHAPES || {})[shapeId] || {};
    if (!facts) {
      U.toast('Для цієї фігури опис ще не додано', 'err');
      return;
    }

    function list(items, cls) {
      return '<ul class="facts-list' + (cls ? ' ' + cls : '') + '">' +
        items.map(function (t) { return '<li>' + mathHtml(t) + '</li>'; }).join('') + '</ul>';
    }

    C.modal({
      title: facts.name,
      sub: 'Властивості та формули',
      wide: true,
      body:
        '<div class="facts-head">' +
          '<div class="facts-icon">' + window.Board.shapeIcon(shapeId, 56) + '</div>' +
          '<div class="small muted" style="line-height:1.6">' + mathHtml(facts.notes || '') + '</div>' +
        '</div>' +
        '<div class="facts-cols">' +
          '<div><div class="board-opts__label" style="margin-bottom:10px">Властивості</div>' +
            list(facts.props) + '</div>' +
          '<div><div class="board-opts__label" style="margin-bottom:10px">Формули</div>' +
            list(facts.formulas, 'facts-list--mono') + '</div>' +
        '</div>',
      buttons: [
        { label: 'Закрити', kind: 'btn--primary', act: 'ok' }
      ]
    });
  }

  function changeBg() {
    var s = slide();
    var opts = [
      { v: 'grid', l: 'Клітинка' },
      { v: 'dots', l: 'Крапки' },
      { v: 'blank', l: 'Чистий аркуш' }
    ];
    C.modal({
      title: 'Фон слайда',
      body: '<div class="seg">' + opts.map(function (o) {
        return '<button class="seg__btn' + (s.bg === o.v ? ' is-active' : '') +
          '" data-bg="' + o.v + '">' + o.l + '</button>';
      }).join('') + '</div>' +
      '<div class="field__hint mt-2">Клітинка зручна для графіків і геометрії, крапки — для схем, чистий аркуш — для тексту.</div>',
      buttons: [{ label: 'Готово', kind: 'btn--primary', act: 'ok' }],
      onMount: function (root) {
        U.onClick(root, '[data-bg]', function (el) {
          U.$$('.seg__btn', root).forEach(function (x) { x.classList.remove('is-active'); });
          el.classList.add('is-active');
          s.bg = el.dataset.bg;
          cur.engine.render();
          markDirty();
        });
      }
    });
  }

  /* ============================================================
     Експорт
     ============================================================ */

  function download(name, blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  function lessonSlug() {
    var l = S.get('lessons', cur.lessonId);
    var st = l ? S.get('students', l.studentId) : null;
    var name = (st ? st.name.split(' ')[0] : 'урок');
    return name + '-' + (l ? U.ymd(l.date) : U.ymd(new Date()));
  }

  function exportPNG() {
    var s = slide();
    if (!(s.items || []).length) { U.toast('Слайд порожній — нема чого зберігати', 'err'); return; }
    var n = cur.index + 1;
    window.Board.preloadImages([s]).then(function () {
      var cv = window.Board.renderToCanvas(s, 2400);
      cv.toBlob(function (blob) {
        download(lessonSlug() + '-слайд-' + n + '.png', blob);
        U.toast('Зображення збережено', 'ok');
      }, 'image/png');
    });
  }

  /** Опублікувати урок і покласти посилання в буфер обміну. */
  function publishShare(l, st, token, isUpdate) {
    U.toast(isUpdate ? 'Оновлюю урок…' : 'Готую урок для учня…');
    return publishLesson(cur.board, l, st, token).then(function (url) {
      cur.board.share = { token: token, at: new Date().toISOString() };
      cur.republishedAt = Date.now();
      markDirty(); flushSave();
      // копіюємо одразу: людина щойно натиснула кнопку, отже дозвіл є
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          U.toast('Посилання скопійовано', 'ok');
        }).catch(function () {
          U.toast('Готово. Скопіюйте посилання з вікна', 'ok');
        });
      } else {
        U.toast('Готово', 'ok');
      }
      return url;
    }).catch(function (e) {
      U.toast('Не вдалося опублікувати: ' + (e && e.message ? e.message : e), 'err');
    });
  }

  function shareDialog() {
    flushSave();
    var l = S.get('lessons', cur.lessonId);
    var st = l ? S.get('students', l.studentId) : null;
    var filled = cur.board.slides.filter(function (s) { return (s.items || []).length; }).length;

    var canLink = !!(window.Cloud && Cloud.available() && Cloud.signedIn());
    var share = cur.board.share || null;
    var url = (canLink && share) ? Cloud.shareUrl(share.token) : '';

    var facts =
      '<div class="card card--flat" style="padding:14px 16px">' +
        '<div class="row small" style="padding:5px 0"><span class="muted">Урок</span>' +
        '<span class="spacer bold right">' + U.esc(l ? (l.topic || 'без теми') : '—') + '</span></div>' +
        '<div class="row small" style="padding:5px 0"><span class="muted">Слайдів із записами</span>' +
        '<span class="spacer bold">' + filled + ' з ' + cur.board.slides.length + '</span></div>' +
      '</div>';

    /* Синхронізації немає — лишається старий спосіб, файлом. */
    if (!canLink) {
      C.modal({
        title: 'Надіслати дошку учню',
        sub: st ? st.name : '',
        body:
          '<p style="line-height:1.65;color:var(--ink-2);margin:4px 0 16px">' +
          'Програма збере <b>окремий HTML-файл</b> з усіма слайдами цього уроку — ' +
          'надішліть його в Telegram чи поштою. Учень відкриє файл у будь-якому браузері, ' +
          'зможе гортати слайди й наближати записи. Редагувати не зможе.' +
          '<br><br>Щоб замість файлу давати посилання, увімкніть синхронізацію в Налаштуваннях.</p>' +
          facts,
        buttons: [
          { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
          { label: 'Зібрати файл', kind: 'btn--primary', act: 'go', icon: 'download',
            onClick: function () { downloadViewer(l, st); } }
        ]
      });
      return;
    }

    /* Посилання вже створене — показуємо його, даємо оновити або відкликати. */
    if (share && url) {
      C.modal({
        title: 'Посилання для учня',
        sub: st ? st.name : '',
        body:
          '<p style="line-height:1.65;color:var(--ink-2);margin:4px 0 12px">' +
          'Учень відкриє цю сторінку без жодного входу й побачить <b>тільки цей урок</b>. ' +
          'До решти ваших даних доступу немає.</p>' +
          '<input class="input" readonly value="' + U.esc(url) + '" ' +
          'onclick="this.select()" style="font-size:12px">' +
          '<div class="field__hint mt-2">Сторінка оновлюється сама: під час роботи — ' +
          'приблизно раз на хвилину, і одразу коли ви виходите з дошки. ' +
          'Кнопка «Оновити» потрібна лише якщо хочете не чекати.</div>' +
          facts,
        buttons: [
          { label: 'Закрити', kind: 'btn--ghost', act: 'cancel' },
          { label: 'Відкликати', kind: 'btn--danger', act: 'revoke',
            onClick: function () {
              window.Cloud.revokeShare(share.token).then(function () {
                delete cur.board.share;
                markDirty(); flushSave();
                U.toast('Посилання більше не працює', 'ok');
              }).catch(function (e) {
                U.toast('Не вдалося відкликати: ' + (e && e.message ? e.message : e), 'err');
              });
            } },
          { label: 'Оновити', kind: 'btn--primary', act: 'go', icon: 'refresh',
            onClick: function () { publishShare(l, st, share.token, true); } }
        ]
      });
      return;
    }

    /* Посилання ще немає. */
    C.modal({
      title: 'Надіслати дошку учню',
      sub: st ? st.name : '',
      body:
        '<p style="line-height:1.65;color:var(--ink-2);margin:4px 0 16px">' +
        'Створіть <b>посилання</b> — учень відкриє його в будь-якому браузері й побачить ' +
        'тільки цей урок: слайди, теорію та домашнє завдання. Ні входу, ні паролів, ' +
        'ні доступу до решти ваших даних.</p>' +
        facts +
        '<div class="field__hint mt-2">Код у посиланні випадковий, підібрати його неможливо. ' +
        'Доступ можна відкликати будь-коли — тоді сторінка перестане відкриватися.</div>',
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Зібрати файл', kind: 'btn--ghost', act: 'file', icon: 'download',
          onClick: function () { downloadViewer(l, st); } },
        { label: 'Створити посилання', kind: 'btn--primary', act: 'go', icon: 'share',
          onClick: function () { publishShare(l, st, window.Cloud.newShareToken(), false); } }
      ]
    });
  }

  function downloadViewer(l, st) {
    var name = lessonSlug() + '.html';
    U.toast('Збираю файл…');
    buildViewerHTML(cur.board, l, st).then(function (html) {
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      download(name, blob);
      U.toast('Файл готовий (' + Math.max(1, Math.round(blob.size / 1024)) +
        ' КБ) — надішліть його учню', 'ok');
    }).catch(function (e) {
      U.toast('Не вдалося зібрати файл: ' + (e && e.message ? e.message : e), 'err');
    });
  }

  /* ------------------------------------------------------------
     Самодостатній переглядач. Геометричні фігури «запікаються»
     у готові вершини, щоб файл не залежав від таблиці фігур —
     це архів, який має відкриватись і через роки.
     ------------------------------------------------------------ */

  /** Побудови «запікаються» в звичайні лінії й кола — файл для учня статичний. */
  function bakeSlideItems(items) {
    var byId = {}, out = [];
    items.forEach(function (it) { if (it.id) byId[it.id] = it; });

    items.forEach(function (it) {
      if (it.t === 'd') {
        var parent = byId[it.pid];
        var g = (parent && window.Constructions) ? window.Constructions.resolve(it, parent) : null;
        if (!g) return;
        var thin = Math.max(1, (it.w || 2) * 0.7);
        g.segs.forEach(function (s) {
          out.push({ t: 'l', c: it.c, w: it.w, a: [s[0], s[1], s[2], s[3]] });
        });
        g.circles.forEach(function (c) {
          out.push({ t: 'e', c: it.c, w: it.w, f: null,
                     a: [c.c[0] - c.r, c.c[1] - c.r, c.c[0] + c.r, c.c[1] + c.r] });
        });
        g.right.forEach(function (r) {
          var m = 11;
          var p1 = [r.at[0] + r.d1[0] * m, r.at[1] + r.d1[1] * m];
          var p2 = [r.at[0] + r.d2[0] * m, r.at[1] + r.d2[1] * m];
          var p3 = [p1[0] + r.d2[0] * m, p1[1] + r.d2[1] * m];
          out.push({ t: 'l', c: it.c, w: thin, a: [p1[0], p1[1], p3[0], p3[1]] });
          out.push({ t: 'l', c: it.c, w: thin, a: [p3[0], p3[1], p2[0], p2[1]] });
        });
        g.ticks.forEach(function (t) {
          var tl = 7;
          out.push({ t: 'l', c: it.c, w: thin,
                     a: [t[0] - t[2] * tl, t[1] - t[3] * tl, t[0] + t[2] * tl, t[1] + t[3] * tl] });
        });
        return;
      }
      var baked = bakeItem(it);
      if (baked) out.push(baked);
    });
    return out;
  }

  function bakeItem(it) {
    if (it.t !== 'g') return it;
    var sh = window.Board.SHAPES[it.sh];
    if (!sh) return null;
    if (sh.round) return { t: 'e', c: it.c, w: it.w, f: it.f || null, a: it.a.slice() };
    var pts = window.Board.shapePoints(it);
    if (!pts) return null;
    return {
      t: 'y', c: it.c, w: it.w, f: it.f || null,
      p: pts.map(function (p) { return [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]; })
    };
  }

  /** Сам урок без картинок: слайди, теорія, домашні завдання. */
  function buildPayload(board, lesson, student) {
    var hw = lesson ? S.db().homeworks.filter(function (h) { return h.lessonId === lesson.id; }) : [];

    var payload = {
      title: lesson ? (lesson.topic || 'Урок') : 'Урок',
      student: student ? student.name : '',
      date: lesson ? U.fmtDateTime(lesson.date) : '',
      notes: lesson ? (lesson.notes || '') : '',
      homework: hw.map(function (h) {
        return {
          id: h.id,
          title: h.title || '', desc: h.description || '',
          due: h.dueDate ? U.fmtDate(h.dueDate) : '',
          score: h.score != null ? h.score : null,
          feedback: h.feedback || '',
          photos: (h.photos || []).slice()
        };
      }),
      images: {},
      slides: board.slides.map(function (s) {
        return {
          title: s.title || '', bg: s.bg || 'grid',
          items: bakeSlideItems(s.items || [])
        };
      })
    };

    var keys = window.Board.imageKeysIn(board.slides);
    payload.homework.forEach(function (h) {
      h.photos.forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    });

    return { payload: payload, keys: keys };
  }

  /** Файл для надсилання: картинки вшиваються всередину, щоб працювало без мережі. */
  function buildViewerHTML(board, lesson, student) {
    var built = buildPayload(board, lesson, student);
    return Promise.all(built.keys.map(function (k) {
      return window.ImgStore.get(k).then(function (blob) {
        if (!blob) return null;
        return window.ImgStore.toDataURL(blob).then(function (url) { built.payload.images[k] = url; });
      }).catch(function () { return null; });
    })).then(function () {
      return renderViewerHTML(built.payload);
    });
  }

  /**
   * Урок для посилання.
   *
   * Сторінка та сама, що й у файлі, але картинки в неї не вшиваються:
   * вони вивантажуються окремо й один раз, а в сторінці лишаються самі адреси.
   * Через це сторінка важить кілька кілобайтів замість сотень — і саме тому
   * її можна оновлювати кожні пару секунд, щоб учень бачив урок наживо.
   */
  function publishLesson(board, lesson, student, token) {
    var built = buildPayload(board, lesson, student);
    // учневі дозволено писати, якщо репетитор не вимкнув це для цього уроку
    built.payload.canWrite = !(board.share && board.share.readOnly);
    return Promise.all(built.keys.map(function (k) {
      return window.ImgStore.get(k).then(function (blob) {
        if (!blob) return null;
        return window.Cloud.publishShareImage(token, k, blob).then(function (url) {
          built.payload.images[k] = url;
        });
      }).catch(function () { return null; });   // одна невдала картинка не має валити публікацію
    })).then(function () {
      return window.Cloud.publishShareData(
        token,
        lesson ? lesson.id : '',
        (lesson && lesson.topic) || 'Урок',
        renderViewerHTML(built.payload)
      );
    });
  }

  function renderViewerHTML(payload) {
    var json = JSON.stringify(payload)
      .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

    return '<!DOCTYPE html>\n<html lang="uk"><head><meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>' + U.esc(payload.title) + ' — дошка уроку</title>\n' +
'<style>\n' +
'*{box-sizing:border-box}html,body{margin:0;height:100%;font-family:Montserrat,"Segoe UI",system-ui,sans-serif;background:#F4F7FC;color:#0D2149}\n' +
'.wrap{display:flex;flex-direction:column;height:100%}\n' +
'.top{display:flex;align-items:center;gap:14px;padding:12px 18px;background:#fff;border-bottom:1px solid #E8EEF8;flex-wrap:wrap}\n' +
'.ttl{font-weight:750;font-size:15px}.sub{font-size:12px;color:#7E90AE;margin-top:2px}\n' +
'.sp{margin-left:auto;display:flex;align-items:center;gap:8px}\n' +
'.btn{border:1.5px solid #E8EEF8;background:#fff;border-radius:999px;padding:8px 14px;font:inherit;font-size:13px;font-weight:650;cursor:pointer;color:#33456B}\n' +
'.btn:hover{background:#F0F5FF;border-color:#8FB4FF;color:#0B4ED6}\n' +
'.btn:disabled{opacity:.4;cursor:not-allowed}\n' +
'.pos{font-size:13px;font-weight:700;min-width:74px;text-align:center}\n' +
'.body{flex:1;position:relative;min-height:0}\n' +
'canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;background:#fff}\n' +
'canvas.drag{cursor:grabbing}\n' +
'.name{position:absolute;left:16px;top:14px;background:rgba(255,255,255,.94);border:1px solid #E8EEF8;border-radius:999px;padding:7px 16px;font-size:13px;font-weight:700;box-shadow:0 4px 14px rgba(13,33,73,.07);max-width:calc(100% - 32px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n' +
'.zoom{position:absolute;left:16px;bottom:16px;background:#fff;border-radius:999px;box-shadow:0 6px 24px rgba(13,33,73,.12);padding:5px;display:flex;gap:2px;align-items:center}\n' +
'.zoom button{width:34px;height:34px;border:0;background:none;border-radius:50%;cursor:pointer;font-size:17px;font-weight:700;color:#33456B}\n' +
'.zoom button:hover{background:#F0F5FF;color:#0B4ED6}\n' +
'.zv{min-width:52px;text-align:center;font-size:12.5px;font-weight:700}\n' +
'.rail{flex:0 0 auto;display:flex;gap:8px;padding:10px 14px;background:#fff;border-top:1px solid #E8EEF8;overflow-x:auto}\n' +
'.sc{flex:0 0 auto;border:2px solid #E8EEF8;background:#fff;border-radius:10px;padding:7px 13px;cursor:pointer;font:inherit;font-size:12px;font-weight:650;color:#33456B;white-space:nowrap}\n' +
'.sc.on{border-color:#1358F5;color:#0B4ED6;background:#F0F5FF}\n' +
'.note{padding:12px 18px;background:#F0F5FF;border-top:1px solid #E8EEF8;font-size:13px;line-height:1.6;white-space:pre-wrap}\n' +
'.extra{max-height:34vh;overflow-y:auto;border-top:1px solid #E8EEF8;background:#fff}\n' +
'.extra h3{margin:0;padding:12px 18px 6px;font-size:13px;letter-spacing:.6px;text-transform:uppercase;color:#A6B4CC}\n' +
'.hw{padding:10px 18px 14px;border-bottom:1px solid #E8EEF8}\n' +
'.hw:last-child{border-bottom:0}\n' +
'.hw b{font-size:14px}\n' +
'.hw .meta{font-size:12px;color:#7E90AE;margin-top:3px}\n' +
'.hw .desc{font-size:13px;line-height:1.6;margin-top:7px;white-space:pre-wrap;background:#F0F5FF;padding:10px 12px;border-radius:10px}\n' +
'.hw .shots{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}\n' +
'.hw .shots a{display:block;width:96px;height:96px;border:1.5px solid #E8EEF8;border-radius:10px;overflow:hidden}\n' +
'.hw .shots img{width:100%;height:100%;object-fit:cover;display:block}\n' +
'.btn.on{background:#1358F5;border-color:#1358F5;color:#fff}\n' +
'.addshot{display:inline-block;margin-top:9px;cursor:pointer}\n' +
'.addshot input{display:none}\n' +
'.addshot span{display:inline-block;border:1.5px dashed #8FB4FF;border-radius:999px;padding:8px 15px;font-size:12.5px;font-weight:650;color:#0B4ED6;background:#F7FAFF}\n' +
'.addshot span:hover{background:#F0F5FF}\n' +
'.addshot.busy span{opacity:.55;border-style:solid}\n' +
'.shots a.mine{border-color:#8FB4FF}\n' +
'canvas.pen{cursor:crosshair}\n' +
'.saved{position:absolute;right:16px;bottom:16px;background:rgba(255,255,255,.95);border:1px solid #E8EEF8;border-radius:999px;padding:6px 14px;font-size:12.5px;font-weight:650;color:#7E90AE;opacity:0;transition:opacity .2s}\n' +
'.saved.show{opacity:1}\n' +
'@media(max-width:640px){.top{padding:10px 12px}.sp{width:100%;justify-content:space-between}}\n' +
'</style></head><body>\n' +
'<div class="wrap">\n' +
'  <div class="top">\n' +
'    <div><div class="ttl">' + U.esc(payload.title) + '</div>\n' +
'    <div class="sub">' + U.esc([payload.student, payload.date].filter(Boolean).join(' · ')) + '</div></div>\n' +
'    <div class="sp">\n' +
(payload.canWrite
  ? '      <button class="btn pen" id="pen" title="Писати на дошці">✎ Писати</button>\n' +
    '      <button class="btn" id="undo" title="Прибрати останнє" disabled>↶</button>\n'
  : '') +
'      <button class="btn" id="prev">← Назад</button>\n' +
'      <span class="pos" id="pos"></span>\n' +
'      <button class="btn" id="next">Далі →</button>\n' +
'    </div>\n' +
'  </div>\n' +
'  <div class="body">\n' +
'    <canvas id="c"></canvas>\n' +
'    <div class="name" id="nm"></div>\n' +
'    <div class="saved" id="sv">Надіслано репетитору</div>\n' +
'    <div class="zoom"><button id="zo">−</button><span class="zv" id="zv">100%</span>' +
'<button id="zi">+</button><button id="zf" title="Вмістити" style="font-size:13px">⤢</button></div>\n' +
'  </div>\n' +
'  <div class="rail" id="rail"></div>\n' +
(payload.notes ? '  <div class="note"><b>Конспект уроку:</b>\n' + U.esc(payload.notes) + '</div>\n' : '') +
(payload.homework.length
  ? '  <div class="extra"><h3>Домашнє завдання</h3>\n' + payload.homework.map(function (h) {
      return '    <div class="hw"><b>' + U.esc(h.title) + '</b>' +
        '<div class="meta">' +
        (h.due ? 'до ' + U.esc(h.due) : '') +
        (h.score != null ? ' · оцінка ' + h.score + '/12' : '') + '</div>' +
        (h.desc ? '<div class="desc">' + U.esc(h.desc) + '</div>' : '') +
        (h.feedback ? '<div class="meta" style="margin-top:6px">Відгук: ' + U.esc(h.feedback) + '</div>' : '') +
        '<div class="shots" data-shots="' + U.esc(h.id || '') + '">' +
          h.photos.map(function (k) {
            return '<a href="#" data-shot="' + U.esc(k) + '" target="_blank" rel="noopener">' +
              '<img alt="Фото завдання"></a>';
          }).join('') +
        '</div>' +
        (payload.canWrite
          ? '<label class="addshot">' +
              '<input type="file" accept="image/*" multiple data-hw="' + U.esc(h.id || '') + '">' +
              '<span>+ Додати фото розв\'язання</span>' +
            '</label>'
          : '') +
        '</div>\n';
    }).join('') + '  </div>\n'
  : '') +
'</div>\n' +
'<script>\n' +
'var DATA = ' + json + ';\n' +
VIEWER_SCRIPT +
'\n<\/script></body></html>';
  }

  var VIEWER_SCRIPT = [
'(function(){',
'var cv=document.getElementById("c"),ctx=cv.getContext("2d");',
'var idx=0,scale=1,cam={x:0,y:0},W=0,H=0,dpr=1;',
'var IMGS={};',
// MY — написане учнем, ще не влите репетитором; cur — штрих, який малюється зараз
'var MY={},penOn=false,cur=null,mine=[];',
'var PENC="#E11D48",PENW=3;',
'function seq(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}',
'function toWorld(sx,sy){return[sx/scale+cam.x,sy/scale+cam.y];}',
'function say(o){try{parent.postMessage(o,"*")}catch(e){}}',
/* Де саме учень зараз дивиться. Сторінка-обгортка це запам'ятовує й повертає
   після оновлення уроку — інакше кожна зміна від репетитора викидала б учня
   на початок першого слайда. Повідомляємо із затримкою, бо рух і масштаб
   змінюються десятки разів на секунду. */
'var keepT=null;',
'function keep(){if(keepT)clearTimeout(keepT);',
'keepT=setTimeout(function(){keepT=null;',
'say({mathhub:"view",idx:idx,scale:scale,cam:{x:cam.x,y:cam.y}});},250);}',
'function flash(){var s=document.getElementById("sv");if(!s)return;s.className="saved show";',
'setTimeout(function(){s.className="saved"},1400);}',
'Object.keys(DATA.images||{}).forEach(function(k){var im=new Image();im.onload=function(){draw();};im.src=DATA.images[k];IMGS[k]=im;});',
'function bounds(it){var xs=[],ys=[],i;',
'if(it.t==="p"){for(i=0;i<it.d.length;i+=2){xs.push(it.d[i]);ys.push(it.d[i+1]);}}',
'else if(it.t==="y"){it.p.forEach(function(q){xs.push(q[0]);ys.push(q[1]);});}',
'else if(it.t==="x"){var ls=String(it.v).split("\\n"),m=0;ls.forEach(function(l){m=Math.max(m,l.length)});',
'xs=[it.p[0],it.p[0]+m*it.s*0.55];ys=[it.p[1]-it.s,it.p[1]+(ls.length-1)*it.s*1.25+it.s*0.3];}',
'else{xs=[it.a[0],it.a[2]];ys=[it.a[1],it.a[3]];}',
'if(!xs.length)return null;return{x1:Math.min.apply(null,xs),y1:Math.min.apply(null,ys),x2:Math.max.apply(null,xs),y2:Math.max.apply(null,ys)};}',
'function drawItem(ctx,it){ctx.strokeStyle=it.c;ctx.fillStyle=it.c;ctx.lineWidth=it.w||3;ctx.lineCap="round";ctx.lineJoin="round";var i;',
'if(it.t==="p"){if(it.d.length<4){ctx.beginPath();ctx.arc(it.d[0],it.d[1],(it.w||3)/2,0,Math.PI*2);ctx.fill();return;}',
'ctx.beginPath();ctx.moveTo(it.d[0],it.d[1]);',
'for(i=2;i<it.d.length-2;i+=2){var mx=(it.d[i]+it.d[i+2])/2,my=(it.d[i+1]+it.d[i+3])/2;ctx.quadraticCurveTo(it.d[i],it.d[i+1],mx,my);}',
'ctx.lineTo(it.d[it.d.length-2],it.d[it.d.length-1]);ctx.stroke();return;}',
'if(it.t==="l"||it.t==="a"){ctx.beginPath();ctx.moveTo(it.a[0],it.a[1]);ctx.lineTo(it.a[2],it.a[3]);ctx.stroke();',
'if(it.t==="a"){var an=Math.atan2(it.a[3]-it.a[1],it.a[2]-it.a[0]),hd=Math.max(10,(it.w||3)*3.4);',
'ctx.beginPath();ctx.moveTo(it.a[2],it.a[3]);ctx.lineTo(it.a[2]-hd*Math.cos(an-0.42),it.a[3]-hd*Math.sin(an-0.42));',
'ctx.moveTo(it.a[2],it.a[3]);ctx.lineTo(it.a[2]-hd*Math.cos(an+0.42),it.a[3]-hd*Math.sin(an+0.42));ctx.stroke();}return;}',
'if(it.t==="r"){ctx.beginPath();ctx.rect(Math.min(it.a[0],it.a[2]),Math.min(it.a[1],it.a[3]),Math.abs(it.a[2]-it.a[0]),Math.abs(it.a[3]-it.a[1]));ctx.stroke();return;}',
'if(it.t==="e"){ctx.beginPath();ctx.ellipse((it.a[0]+it.a[2])/2,(it.a[1]+it.a[3])/2,Math.abs(it.a[2]-it.a[0])/2,Math.abs(it.a[3]-it.a[1])/2,0,0,Math.PI*2);',
'if(it.f){ctx.fillStyle=it.f;ctx.fill();}ctx.strokeStyle=it.c;ctx.stroke();return;}',
'if(it.t==="y"){ctx.beginPath();ctx.moveTo(it.p[0][0],it.p[0][1]);',
'for(i=1;i<it.p.length;i++)ctx.lineTo(it.p[i][0],it.p[i][1]);ctx.closePath();',
'if(it.f){ctx.fillStyle=it.f;ctx.fill();}ctx.strokeStyle=it.c;ctx.stroke();return;}',
'if(it.t==="x"){ctx.font=\'500 \'+it.s+\'px Montserrat,"Segoe UI",system-ui,sans-serif\';ctx.textBaseline="alphabetic";ctx.textAlign="left";',
'String(it.v).split("\\n").forEach(function(l,n){ctx.fillText(l,it.p[0],it.p[1]+n*it.s*1.25);});return;}',
'if(it.t==="i"){var x=Math.min(it.a[0],it.a[2]),y=Math.min(it.a[1],it.a[3]),w=Math.abs(it.a[2]-it.a[0]),h=Math.abs(it.a[3]-it.a[1]);',
'var im=IMGS[it.k];if(im&&im.complete&&im.naturalWidth){ctx.drawImage(im,x,y,w,h);}',
'else{ctx.save();ctx.fillStyle="#F0F5FF";ctx.strokeStyle="#8FB4FF";ctx.lineWidth=2;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);ctx.restore();}return;}}',
'function bg(b){ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);if(b==="blank")return;',
'var st=40*scale;while(st<14)st*=2;while(st>150)st/=2;',
'var ox=(-cam.x*scale)%st,oy=(-cam.y*scale)%st;if(ox<0)ox+=st;if(oy<0)oy+=st;var x,y;',
'if(b==="dots"){ctx.fillStyle="#C9D6EA";var r=Math.max(0.8,Math.min(1.8,scale*1.2));',
'for(x=ox;x<W;x+=st)for(y=oy;y<H;y+=st){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}return;}',
'ctx.strokeStyle="#E8EEF8";ctx.lineWidth=1;ctx.beginPath();',
'for(x=ox;x<W;x+=st){ctx.moveTo(Math.round(x)+.5,0);ctx.lineTo(Math.round(x)+.5,H);}',
'for(y=oy;y<H;y+=st){ctx.moveTo(0,Math.round(y)+.5);ctx.lineTo(W,Math.round(y)+.5);}ctx.stroke();}',
'function draw(){var s=DATA.slides[idx];ctx.setTransform(dpr,0,0,dpr,0,0);bg(s.bg);',
'ctx.save();ctx.scale(scale,scale);ctx.translate(-cam.x,-cam.y);',
'(s.items||[]).forEach(function(it){drawItem(ctx,it)});',
// написане учнем малюємо поверх — воно ще не встигло дійти до репетитора
'(MY[idx]||[]).forEach(function(it){drawItem(ctx,it)});',
'if(cur&&cur.d.length>=4)drawItem(ctx,cur);',
'ctx.restore();',
'document.getElementById("zv").textContent=Math.round(scale*100)+"%";}',
'function resize(){var r=cv.getBoundingClientRect();dpr=window.devicePixelRatio||1;W=r.width;H=r.height;',
'cv.width=Math.max(1,Math.round(W*dpr));cv.height=Math.max(1,Math.round(H*dpr));draw();}',
'function fit(){var s=DATA.slides[idx],b=null;(s.items||[]).forEach(function(it){var ib=bounds(it);if(!ib)return;',
'if(!b){b={x1:ib.x1,y1:ib.y1,x2:ib.x2,y2:ib.y2};return;}b.x1=Math.min(b.x1,ib.x1);b.y1=Math.min(b.y1,ib.y1);b.x2=Math.max(b.x2,ib.x2);b.y2=Math.max(b.y2,ib.y2);});',
'if(!b){scale=1;cam={x:-W/2,y:-H/2};draw();return;}var p=60,w=Math.max(1,b.x2-b.x1),h=Math.max(1,b.y2-b.y1);',
'scale=Math.max(MINS,Math.min(2,Math.min((W-p*2)/w,(H-p*2)/h)));',
'cam.x=(b.x1+b.x2)/2-W/(2*scale);cam.y=(b.y1+b.y2)/2-H/(2*scale);draw();}',
'function go(i,noFit){if(i<0||i>=DATA.slides.length)return;idx=i;',
'document.getElementById("pos").textContent=(idx+1)+" / "+DATA.slides.length;',
'document.getElementById("nm").textContent=DATA.slides[idx].title||("Слайд "+(idx+1));',
'document.getElementById("prev").disabled=idx===0;',
'document.getElementById("next").disabled=idx===DATA.slides.length-1;',
'[].forEach.call(document.querySelectorAll(".sc"),function(b,n){b.className="sc"+(n===idx?" on":"")});',
'if(noFit){draw();}else{fit();}keep();}',
'var rail=document.getElementById("rail");',
'DATA.slides.forEach(function(s,i){var b=document.createElement("button");b.className="sc";',
'b.textContent=(i+1)+". "+(s.title||"Слайд "+(i+1));b.onclick=function(){go(i)};rail.appendChild(b);});',
'document.getElementById("prev").onclick=function(){go(idx-1)};',
'document.getElementById("next").onclick=function(){go(idx+1)};',
'document.getElementById("zi").onclick=function(){zoomAt(1.25,W/2,H/2)};',
'document.getElementById("zo").onclick=function(){zoomAt(1/1.25,W/2,H/2)};',
'document.getElementById("zf").onclick=fit;',
// межі ті самі, що й на дошці репетитора — інакше учень не може роздивитися так само
'var MINS=0.02,MAXS=32;',
'function zoomAt(f,sx,sy){var wx=sx/scale+cam.x,wy=sy/scale+cam.y;scale=Math.max(MINS,Math.min(MAXS,scale*f));',
'cam.x=wx-sx/scale;cam.y=wy-sy/scale;draw();keep();}',
'cv.addEventListener("wheel",function(e){e.preventDefault();var r=cv.getBoundingClientRect();',
'zoomAt(Math.pow(0.999,e.deltaY*(e.ctrlKey?2.4:1)),e.clientX-r.left,e.clientY-r.top);},{passive:false});',
'var pan=null,pts={},pinch=null;',
'cv.addEventListener("pointerdown",function(e){try{cv.setPointerCapture(e.pointerId)}catch(x){}var r=cv.getBoundingClientRect();',
// олівець увімкнено — починаємо штрих замість руху по полотну
'if(penOn){e.preventDefault();var w0=toWorld(e.clientX-r.left,e.clientY-r.top);',
'cur={t:"p",c:PENC,w:PENW,d:[w0[0],w0[1]],id:seq()};return;}',
'pts[e.pointerId]={x:e.clientX-r.left,y:e.clientY-r.top};',
'if(Object.keys(pts).length===2){var k=Object.keys(pts),a=pts[k[0]],b2=pts[k[1]];',
'pan=null;pinch={d:Math.hypot(a.x-b2.x,a.y-b2.y)};return;}',
'pan={sx:e.clientX-r.left,sy:e.clientY-r.top,cx:cam.x,cy:cam.y};cv.className="drag";});',
'cv.addEventListener("pointermove",function(e){var r=cv.getBoundingClientRect();var p={x:e.clientX-r.left,y:e.clientY-r.top};',
'if(cur){var wp=toWorld(p.x,p.y);var n=cur.d.length;',
// не пишемо точку, поки палець не зрушив помітно — інакше лінія «мохната»
'if(n<2||Math.hypot(wp[0]-cur.d[n-2],wp[1]-cur.d[n-1])>1.2/scale){cur.d.push(wp[0],wp[1]);draw();}return;}',
'if(pts[e.pointerId])pts[e.pointerId]=p;var k=Object.keys(pts);',
'if(k.length===2&&pinch){var a=pts[k[0]],b2=pts[k[1]],d=Math.hypot(a.x-b2.x,a.y-b2.y);',
'if(pinch.d>0)zoomAt(d/pinch.d,(a.x+b2.x)/2,(a.y+b2.y)/2);pinch.d=d;return;}',
'if(!pan)return;cam.x=pan.cx-(p.x-pan.sx)/scale;cam.y=pan.cy-(p.y-pan.sy)/scale;draw();keep();});',
'function up(e){',
'if(cur){var it=cur;cur=null;',
'if(it.d.length>=4){if(!MY[idx])MY[idx]=[];MY[idx].push(it);mine.push({s:idx,id:it.id});',
'say({mathhub:"ink",slide:idx,item:it});flash();',
'document.getElementById("undo").disabled=false;}',
'draw();return;}',
'delete pts[e.pointerId];if(Object.keys(pts).length<2)pinch=null;pan=null;cv.className=penOn?"pen":"";}',
'cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);',
// кнопки олівця
'var penB=document.getElementById("pen"),undoB=document.getElementById("undo");',
'if(penB){penB.onclick=function(){penOn=!penOn;penB.className="btn pen"+(penOn?" on":"");',
'cv.className=penOn?"pen":"";};}',
'if(undoB){undoB.onclick=function(){if(!mine.length)return;var last=mine.pop();',
'MY[last.s]=(MY[last.s]||[]).filter(function(x){return x.id!==last.id});',
'say({mathhub:"ink-undo",id:last.id});undoB.disabled=!mine.length;draw();};}',
'window.addEventListener("keydown",function(e){',
'if(e.key==="ArrowRight"||e.key==="PageDown"||e.key===" "){e.preventDefault();go(idx+1);}',
'else if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();go(idx-1);}',
'else if(e.key==="+"||e.key==="="){zoomAt(1.25,W/2,H/2);}',
'else if(e.key==="-"){zoomAt(1/1.25,W/2,H/2);}',
'else if(e.key==="0"){fit();}});',
'window.addEventListener("resize",resize);',
'[].forEach.call(document.querySelectorAll("[data-shot]"),function(a){',
'var u=DATA.images[a.getAttribute("data-shot")];',
'if(u){a.querySelector("img").src=u;a.href=u;}});',
// фото рішень: самі файли віддаємо назовні, бо ця сторінка не знає ні адреси
// бази, ні ключа — вивантаженням займається сторінка, що нас показує
'[].forEach.call(document.querySelectorAll("input[data-hw]"),function(inp){',
'inp.onchange=function(){var fs=[].slice.call(inp.files||[]);if(!fs.length)return;',
'var lab=inp.parentNode;lab.className="addshot busy";',
'lab.querySelector("span").textContent="Надсилаю "+fs.length+"…";',
'say({mathhub:"hw",hw:inp.getAttribute("data-hw"),files:fs});inp.value="";};});',
// сторінка-обгортка звітує, чим усе скінчилося
'window.addEventListener("message",function(e){var d=e.data;if(!d||d.mathhub!=="hw-done")return;',
'var inp=document.querySelector(\'input[data-hw="\'+d.hw+\'"]\');if(!inp)return;',
'var lab=inp.parentNode;lab.className="addshot";',
'lab.querySelector("span").textContent=d.error?"Не вдалося — спробуйте ще":"+ Додати фото розв\'язання";',
'if(d.error)return;',
'var box=document.querySelector(\'[data-shots="\'+d.hw+\'"]\');',
'(d.urls||[]).forEach(function(u){var a=document.createElement("a");a.className="mine";a.href=u;',
'a.target="_blank";a.rel="noopener";a.innerHTML=\'<img alt="Фото розв\\\'язання">\';',
'a.querySelector("img").src=u;if(box)box.appendChild(a);});});',
'resize();',
/* Якщо обгортка передала, де учень був до оновлення — повертаємось туди,
   а не на початок. Слайд обмежуємо: репетитор міг його видалити. */
'var V0=window.__VIEW;',
'if(V0&&DATA.slides.length){var i0=Math.max(0,Math.min(V0.idx|0,DATA.slides.length-1));',
'go(i0,true);',
'if(V0.scale)scale=Math.max(MINS,Math.min(MAXS,V0.scale));',
'if(V0.cam)cam={x:V0.cam.x,y:V0.cam.y};',
'draw();}else{go(0);}',
'})();'
  ].join('\n');

})();
