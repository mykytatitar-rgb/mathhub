/* Екран дошки уроку: слайди, інструменти, автозбереження, експорт */
(function () {
  'use strict';

  var U = window.U, S = window.S, C = window.C, icon = window.icon;
  var V = window.V;

  var PEN_COLORS = ['#17163A', '#4B3FDB', '#E5484D', '#17B26A',
                    '#F79009', '#7A5AF8', '#DD2590', '#7E90AE'];
  var PEN_WIDTHS = [2, 4, 8];
  var TEXT_SIZES = [{ v: 12, l: 'XS' }, { v: 18, l: 'S' }, { v: 26, l: 'M' }, { v: 40, l: 'L' },
                  { v: 64, l: 'XL' }, { v: 110, l: '2XL' }, { v: 180, l: '3XL' }];

  /* Інструменти лівої колонки. opts — які налаштування показувати в підменю. */
  /* Інструментів стало багато, і суцільним стовпцем вони вже не читаються.
     У панелі лишається те, чим користуються щохвилини, а решта живе у двох
     групах. Група не ховає інструмент, а називає його: коли шукаєш, де тут
     перерізи, думаєш «це геометрія», а не перебираєш тринадцять однакових
     кружечків. */
  var TOOLS = [
    { id: 'select',  icon: 'cursor',     label: 'Вибір і переміщення (V)' },
    { id: 'pen',     icon: 'pen',        label: 'Олівець (P)',    opts: 'stroke' },
    { id: 'eraser',  icon: 'eraser',     label: 'Гумка (E)' },
    { id: 'text',    icon: 'textT',      label: 'Текст (T)',      opts: 'text' },

    { id: 'shape',   icon: 'shapes',     label: 'Фігури (S)',       opts: 'shape',  group: 'geo' },
    { id: 'point',   icon: 'dot',        label: 'Точка (O)',        opts: 'point',  group: 'geo' },
    { id: 'link',    icon: 'link2',      label: 'Провести від точки (C)', opts: 'link', group: 'geo' },
    { id: 'line',    icon: 'shapeLine',  label: 'Лінія (L)',        opts: 'stroke', group: 'geo' },
    { id: 'arrow',   icon: 'arrowRight', label: 'Стрілка (A)',      opts: 'stroke', group: 'geo' },
    { id: 'solid',   icon: 'cube3d',     label: 'Стереометрія (J)', opts: 'stroke', group: 'geo' },

    { id: 'plane',   icon: 'axes',       label: 'Координатна площина (K)', opts: 'stroke', group: 'alg' },
    { id: 'numline', icon: 'ruler',      label: 'Числова вісь (N)', opts: 'stroke', group: 'alg' },

    { id: 'hand',    icon: 'hand',       label: 'Рука — рух по полотну (H)' }
  ];

  var GROUPS = [
    { id: 'geo', icon: 'shapes', label: 'Геометрія' },
    { id: 'alg', icon: 'axes',   label: 'Алгебра' }
  ];

  function toolsOf(gid) {
    return TOOLS.filter(function (t) { return t.group === gid; });
  }

  function groupOf(toolId) {
    for (var i = 0; i < TOOLS.length; i++) {
      if (TOOLS[i].id === toolId) return TOOLS[i].group || null;
    }
    return null;
  }

  var LINK_HINT = 'mathhub.hint.link';
  function linkHinted() {
    try { return localStorage.getItem(LINK_HINT) === '1'; } catch (e) { return true; }
  }

  var TOOL_OPTS = {};
  TOOLS.forEach(function (t) { if (t.opts) TOOL_OPTS[t.id] = t.opts; });

  var cur = null;

  /* ============================================================
     Розмітка екрана
     ============================================================ */

  V.board = function (lessonId) {
    var lesson = S.get('lessons', lessonId);
    /* Дошка обслуговує не лише уроки: та сама потрібна для власних справ.
       Вона прив'язана до власника за ідентифікатором, тож досить знайти,
       кому саме належить ця дошка. */
    var deskItem = lesson ? null : S.get('desk', lessonId);

    if (!lesson && !deskItem) {
      return '<div class="page"><div class="card">' +
        C.empty('alert', 'Дошку не знайдено', 'Можливо, її було видалено.',
          '<button class="btn btn--primary" data-act="nav" data-arg="#/">На головну</button>') +
        '</div></div>';
    }
    var st = lesson ? S.get('students', lesson.studentId) : null;

    function toolBtn(t) {
      return '<button class="tool-btn' + (t.id === 'pen' ? ' is-active' : '') + '" data-tool="' + t.id +
        '" title="' + U.esc(t.label) + '">' + icon(t.icon, 20) +
        (t.opts ? '<i class="tool-btn__dot"></i>' : '') + '</button>';
    }

    var base = TOOLS.filter(function (t) { return !t.group; });

    /* Кнопки груп стоять у рейці, а самі панелі — поруч із нею.

       Усередині рейки їх обрізало: у неї прокрутка, а прокрутка ріже все,
       що виходить за межі, навіть якщо воно розташоване абсолютно. Панель
       ставала шматком завширшки з рейку, і від слова «Алгебра» лишалося
       «Ал». */
    var tools =
      base.slice(0, 4).map(toolBtn).join('') +
      '<div class="tool-sep"></div>' +
      GROUPS.map(function (g) {
        return '<button class="tool-btn tool-grp" data-group="' + g.id + '" ' +
          'title="' + U.esc(g.label) + '">' +
          icon(g.icon, 20) + '<i class="tool-btn__caret"></i></button>';
      }).join('') +
      base.slice(4).map(toolBtn).join('');

    var flys = GROUPS.map(function (g) {
      return '<div class="tool-fly" data-fly="' + g.id + '" hidden>' +
        '<div class="tool-fly__name">' + U.esc(g.label) + '</div>' +
        '<div class="tool-fly__row">' + toolsOf(g.id).map(toolBtn).join('') + '</div>' +
      '</div>';
    }).join('');

    return '<div class="board">' +

      '<div class="board-top">' +
        '<button class="icon-btn" data-act="board-exit" title="Вийти з дошки">' + icon('arrowLeft', 20) + '</button>' +
        (st ? C.avatar(st, 32) : '') +
        '<div style="min-width:0">' +
          '<div class="board-top__title truncate">' +
          U.esc(lesson ? (lesson.topic || 'Урок без теми') : (deskItem.title || 'Моя справа')) + '</div>' +
          '<div class="board-top__sub">' +
          (lesson
            ? U.esc((st ? st.name : '—') + ' · ' + U.fmtDateTime(lesson.date))
            : U.esc('Моя справа' + (deskItem.tag ? ' · ' + deskItem.tag : ''))) +
          '</div>' +
        '</div>' +

        '<div class="spacer row" style="gap:8px;flex-wrap:wrap">' +
          '<button class="board-top__saved" data-saved data-act="board-saved" hidden></button>' +
          /* Стан копії учня. Досі перевидання відбувалося мовчки, і так само
             мовчки падало: репетитор малював, а учень бачив старе — і жоден
             з них не міг про це здогадатися. */
          '<button class="board-top__pub" data-pub data-act="board-republish" hidden></button>' +
          // зустріч і поділитися — лише для уроку: власну справу нікому не шлють
          (lesson && S.meetUrlFor(lesson.studentId)
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
          '<button class="btn btn--ghost btn--sm" data-act="board-history" ' +
            'title="Попередні версії цієї дошки">' + icon('refresh', 15) + 'Історія</button>' +
          (lesson
            ? '<button class="btn btn--ghost btn--sm" data-act="board-hw" title="Домашнє завдання цього уроку">' +
              icon('checklist', 15) + 'ДЗ<span data-hw-count></span></button>'
            : '') +
          '<button class="btn btn--ghost btn--sm" data-act="board-png">' + icon('image', 15) + 'PNG</button>' +
          (lesson
            ? '<button class="btn btn--primary btn--sm" data-act="board-share">' +
              icon('share', 15) + 'Надіслати учню</button>'
            : '<button class="btn btn--primary btn--sm" data-act="nav" data-arg="#/desk">' +
              icon('folder', 15) + 'До моїх справ</button>') +
        '</div>' +
      '</div>' +

      '<div class="board-body">' +
        '<canvas class="board-canvas" id="board-canvas"></canvas>' +

        '<div class="board-empty-hint" data-empty hidden>' +
          '<b>Порожній слайд</b>' +
          '<span>Пишіть олівцем, додавайте текст, фігури й картинки. ' +
          'У групі «Геометрія» — точки та лінії між ними, у «Алгебрі» — координатна ' +
          'площина й числова пряма. Колесо миші — масштаб, пробіл або права кнопка — ' +
          'рух по полотну. Місця тут стільки, скільки треба.</span>' +
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

        flys +

        /* Окремої кнопки «показати налаштування» немає навмисно: вона робила
           те саме, що клік по вже активному інструменту, і просто висіла
           поруч із панеллю зайвою крапкою. */
        '<div class="board-opts" data-opts hidden></div>' +

        '<div class="sel-bar" data-sel-bar hidden></div>' +

        // multiple — інакше кілька картинок за раз просто не позначити
        '<input type="file" accept="image/*" multiple data-img-input hidden>' +
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
        '<div class="board-rails">' +
          '<div class="board-rail-row">' +
            '<span class="rail-tag">Урок</span>' +
            '<div class="board-rail" data-rail="lesson"></div>' +
          '</div>' +
          '<div class="board-rail-row board-rail-row--hw">' +
            '<span class="rail-tag rail-tag--hw">ДЗ</span>' +
            '<div class="board-rail" data-rail="hw"></div>' +
          '</div>' +
        '</div>' +
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
      onShrink: function () { allowShrink(); },
      onViewChange: function () { updateZoom(); updateSelBar(); },
      onSelect: function () { refreshUndo(); updateSelBar(); },
      onToolChange: function (t) { syncToolButtons(t); renderOpts(); },
      /* Точку підвели до місця дотику — про це треба сказати вголос.
         Мовчки зрушити чуже креслення не можна: людина має бачити, що
         саме змінилося, і знати, що це скасовується. */
      onTangent: function (info) {
        if (!info) return;
        var n = info.name && info.name !== '·' ? 'точка ' + info.name : 'точку';
        U.toast(info.kind === 'center'
          ? 'Привʼязано до центра кола: ' + n + ' тепер рухається разом із ним'
          : 'Дотичну вирівняно: ' + n + ' стала точкою дотику', 'ok');
      },
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

    /* Знімок стану, з яким дошку відкрили. Найгірше — коли за урок усе
       зникло; тоді ця точка й буде тим, до чого повертатись. */
    snapshot(true);

    /* Свіжа версія саме цієї дошки — на випадок, якщо її вели з іншого
       пристрою. Читаємо одну, а не всю базу: це швидко й не чіпає решти. */
    if (window.BoardSync) {
      BoardSync.pull(lessonId).then(function (changed) {
        if (changed && V.boardReload()) snapshot(true);
      });
    }

    updateHwCount();

    healStudentImages();

    /* Стан відправки змінюється й без нас — зникла мережа, спрацював
       повтор, сервер нарешті прийняв. Напис має це показувати одразу. */
    if (window.BoardSync && BoardSync.onChange) {
      cur.savedOff = BoardSync.onChange(function (id) {
        if (cur && (!id || id === cur.lessonId)) paintSaved();
      });
    }
    paintSaved();

    // поки дошка відкрита — забираємо те, що пише учень за посиланням
    cur.pullTimer = setInterval(function () {
      pullContributions();
      pullOps();
    }, PULL_MS);

    /* Урок, опублікований старішою версією програми, оновлюємо мовчки: учень
       має бачити те саме, що й ми, а сам він на це вплинути не може — у нього
       збережений знімок сторінки. */
    if (cur.board.share && cur.board.share.token) {
      if (!(window.Cloud && Cloud.available() && Cloud.signedIn())) {
        /* Без синхронізації відправляти нікуди. Кажемо це одразу, а не
           показуємо зелене «учень бачить це», якого ніхто не перевіряв. */
        scheduleRepublish();                       // сам виставить причину
      } else if (cur.board.share.v !== VIEWER_VERSION) {
        scheduleRepublish();
      } else {
        // урок уже свіжий — так і кажемо, щоб стан був видно з першої секунди
        setPubState('ok');
      }
    }
    applyRail();
    renderRail();
    renderOpts();
    updateZoom();
    refreshEmpty();
    updateSlideName();

    var root = document.querySelector('.board');

    /* Як у Miro: клік по вже активному інструменту згортає/розгортає його
       підменю, а перехід на інший інструмент завжди показує його налаштування. */
    /* Клік повз панель закриває її. Без цього вона висить над кресленням,
       поки не ткнеш у групу вдруге, — а рука в цей час уже малює. */
    root.addEventListener('pointerdown', function (e) {
      if (!root.querySelector('.tool-fly:not([hidden])')) return;
      if (e.target.closest && (e.target.closest('.tool-fly') || e.target.closest('[data-group]'))) return;
      U.$$('.tool-fly', root).forEach(function (f) { f.hidden = true; });
      U.$$('[data-group]', root).forEach(function (b) { b.classList.remove('is-open'); });
      renderOpts();
    }, true);

    U.onClick(root, '[data-group]', function (el) {
      var box = root.querySelector('[data-fly="' + el.dataset.group + '"]');
      var open = box && box.hidden;

      // відкрита завжди одна: дві розкриті панелі перекривають одна одну
      U.$$('.tool-fly', root).forEach(function (f) { f.hidden = true; });
      U.$$('[data-group]', root).forEach(function (b) { b.classList.remove('is-open'); });

      /* Поки група відкрита, налаштування інструмента ховаємо. Вони стоять
         у тому самому місці біля рейки, і разом виходить дві картки одна на
         одній — не зрозуміти, де що. Щойно інструмент обрано, налаштування
         повертаються самі, уже для нього. */
      var opts = root.querySelector('[data-opts]');
      if (opts) opts.hidden = true;

      if (!open || !box) { renderOpts(); return; }

      box.hidden = false;
      el.classList.add('is-open');

      /* Ставимо панель навпроти самої кнопки. Рахуємо, а не покладаємось на
         CSS: панель тепер не всередині рейки, і «сто відсотків» їй більше
         ні від чого рахувати. */
      /* Шукаємо вгору від самої кнопки, а не вниз від кореня: кнопка вже
         всередині дошки, і пошук серед нащадків її не знаходив — через це
         положення не рахувалося зовсім. */
      var wrap = el.closest ? el.closest('.board') : null;
      var rail = wrap ? wrap.querySelector('.board-tools') : null;
      if (!wrap || !rail) return;
      var wb = wrap.getBoundingClientRect();
      var bb = el.getBoundingClientRect();
      var rb = rail.getBoundingClientRect();
      box.style.left = (rb.right - wb.left + 10) + 'px';
      box.style.top = (bb.top - wb.top + bb.height / 2) + 'px';

      /* Тепер міряємо, куди панель справді стала, і доводимо на різницю.
         Відлік іде від найближчого розташованого предка, а він не завжди
         той, який ми взяли, — і панель сідала навскіс від кнопки. Замість
         вгадувати предка, просто дивимось на результат. */
      var got = box.getBoundingClientRect();
      var dy = (bb.top + bb.height / 2) - (got.top + got.height / 2);
      var dx = (rb.right + 10) - got.left;
      box.style.top = (parseFloat(box.style.top) + dy) + 'px';
      box.style.left = (parseFloat(box.style.left) + dx) + 'px';

      // якщо знизу не влазить — піднімаємо, щоб не ховалася за краєм
      var fin = box.getBoundingClientRect();
      if (fin.bottom > wb.bottom - 8) {
        box.style.top = (parseFloat(box.style.top) - (fin.bottom - (wb.bottom - 8))) + 'px';
      }
      if (fin.top < wb.top + 8) {
        box.style.top = (parseFloat(box.style.top) + ((wb.top + 8) - fin.top)) + 'px';
      }
    });

    U.onClick(root, '[data-tool]', function (el) {
      var id = el.dataset.tool;
      if (id === engine.tool && TOOL_OPTS[id]) { toggleOpts(); return; }
      setOptsHidden(false);
      setTool(id);

      /* Підказка на перший раз. Інструмент працює у два кліки, і без слова
         про це людина клацає один раз, нічого не бачить і вирішує, що він
         не працює. Далі підказка не повторюється — вона потрібна, поки
         правило не відоме. */
      if (id === 'link' && !linkHinted()) {
        U.toast('Клацніть точку, потім другу — між ними зʼявиться лінія. ' +
                'Клік у порожньому місці створить точку сам.', 'ok');
        try { localStorage.setItem(LINK_HINT, '1'); } catch (e) {}
      }

      // інструмент обрано — панель групи більше не потрібна
      U.$$('.tool-fly', root).forEach(function (f) { f.hidden = true; });
      U.$$('[data-group]', root).forEach(function (b) { b.classList.remove('is-open'); });
    });

    U.onClick(root, '[data-color]', function (el) {
      engine.color = el.dataset.color;
      renderOpts();                       // кружечки товщини теж перефарбовуються
      applyToSelection({ c: el.dataset.color });
    });

    U.onClick(root, '[data-width]', function (el) {
      engine.width = +el.dataset.width;
      renderOpts();
      applyToSelection({ w: +el.dataset.width });
    });

    /* Шкала товщини. Перемальовувати всю панель на кожен рух повзунка не
       можна — браузер загубив би сам повзунок під пальцем, тому оновлюємо
       лише кружечок і число поруч. */
    root.addEventListener('input', function (e) {
      var el = e.target.closest ? e.target.closest('[data-width-range]') : null;
      if (!el) return;
      var w = +el.value;
      engine.width = w;
      el.title = 'Товщина ' + w + ' px';

      var dot = root.querySelector('[data-width-dot]');
      if (dot) {
        var d = Math.max(4, Math.min(26, w * 1.25 + 3));
        dot.style.width = d + 'px';
        dot.style.height = d + 'px';
      }
      var val = root.querySelector('[data-width-val]');
      if (val) val.textContent = w;

      applyToSelection({ w: w });
    });

    /* Шкала розміру точки. Як і з товщиною, панель на кожен рух не
       перемальовуємо — інакше повзунок вислизає з-під пальця. */
    root.addEventListener('input', function (e) {
      var pe = e.target.closest ? e.target.closest('[data-psize-range]') : null;
      if (!pe) return;
      var r = +pe.value;
      engine.setPointSize(r);
      pe.title = 'Розмір точки ' + r + ' px';

      var pd = root.querySelector('[data-psize-dot]');
      if (pd) {
        var dd = Math.max(4, Math.min(28, r * 2));
        pd.style.width = dd + 'px';
        pd.style.height = dd + 'px';
      }
      var pv = root.querySelector('[data-psize-val]');
      if (pv) pv.textContent = r;

      /* Поки товщину лінії не задали руками, вона йде за точкою — і це
         видно тут же, на сусідній шкалі. Інакше людина ставить великі
         вершини, зʼєднує їх і аж потім помічає, що лінія волосяна. */
      var lr = root.querySelector('[data-lw-range]');
      if (lr && !engine.linkWidth) {
        var lw = engine.linkW();
        lr.value = lw;
        lr.title = 'Товщина лінії ' + lw + ' px';
        var ld = root.querySelector('[data-lw-dot]');
        if (ld) {
          var dd2 = Math.max(4, Math.min(26, lw * 1.25 + 3));
          ld.style.width = dd2 + 'px';
          ld.style.height = dd2 + 'px';
        }
        var lv2 = root.querySelector('[data-lw-val]');
        if (lv2) lv2.textContent = lw;
      }

      applyToSelection({ r: r }, 'o');
    });

    root.addEventListener('input', function (e) {
      var le = e.target.closest ? e.target.closest('[data-lw-range]') : null;
      if (!le) return;
      var lw = +le.value;
      engine.setLinkWidth(lw);
      le.title = 'Товщина лінії ' + lw + ' px';

      var ld = root.querySelector('[data-lw-dot]');
      if (ld) {
        var ld2 = Math.max(4, Math.min(26, lw * 1.25 + 3));
        ld.style.width = ld2 + 'px';
        ld.style.height = ld2 + 'px';
      }
      var lv = root.querySelector('[data-lw-val]');
      if (lv) lv.textContent = lw;

      applyToSelection({ w: lw }, 'c');
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

    U.onClick(root, '[data-linkkind]', function (el) {
      engine.setLinkKind(el.dataset.linkkind);
      renderOpts();
    });

    root.addEventListener('change', function (e) {
      var box = e.target.closest ? e.target.closest('[data-linkdash]') : null;
      if (!box) return;
      engine.setLinkDash(box.checked);
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

    U.onClick(root, '[data-flip]', function () {
      /* Виділені фігури перевертаємо одразу, інакше готуємо наступну. */
      var selF = engine.selection.filter(function (i) { return i.t === 'g'; });
      if (selF.length) {
        engine.snapshot();
        selF.forEach(function (i) { i.fx = i.fx ? 0 : 1; });
        engine.changed();
        U.toast('Відзеркалено');
        return;
      }
      engine.flipX = !engine.flipX;
      renderOpts();
      U.toast(engine.flipX ? 'Наступна фігура — дзеркальна' : 'Звичайна орієнтація');
    });

    U.onClick(root, '[data-labels]', function () {
      engine.showLabels = !engine.showLabels;
      renderOpts();
      var selL = engine.selection.filter(function (i) { return i.t === 'g'; });
      if (selL.length) {
        engine.snapshot();
        selL.forEach(function (i) { i.lb = engine.showLabels ? 1 : 0; });
        engine.changed();
      }
      U.toast(engine.showLabels ? 'Вершини підписуються' : 'Підписи вершин вимкнено');
    });

    U.onClick(root, '[data-facts]', function (el) { factsModal(el.dataset.facts); });

    U.onClick(root, '[data-slide-index]', function (el) { selectSlide(+el.dataset.slideIndex); });

    /* --- картинки --- */

    var fileInput = root.querySelector('[data-img-input]');
    fileInput.addEventListener('change', function () {
      var fs = Array.prototype.slice.call(fileInput.files || []);
      fileInput.value = '';
      if (fs.length) insertImageFiles(fs);
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
        // у буфері може бути кілька картинок — беремо всі
        var pasted = [];
        for (var i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.indexOf('image/') === 0) {
            var f = items[i].getAsFile();
            if (f) pasted.push(f);
          }
        }
        if (pasted.length) { e.preventDefault(); insertImageFiles(pasted); return; }
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
      // усі перетягнуті файли, а не лише перший
      var fs = (e.dataTransfer && e.dataTransfer.files)
        ? Array.prototype.slice.call(e.dataTransfer.files) : [];
      if (!fs.length) return;
      // ставимо саме туди, куди відпустили файли
      var r = canvas.getBoundingClientRect();
      insertImageFiles(fs, { x: e.clientX - r.left, y: e.clientY - r.top });
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
    snapshot(true);           // підсумок уроку — в історію обов'язково
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
    if (cur.savedOff) { cur.savedOff(); cur.savedOff = null; }

    /* Виходимо з дошки — урок скінчився. Якщо на нього видано посилання,
       оновлюємо його негайно, не чекаючи хвилинної паузи: саме тепер
       учень і піде дивитися. */
    if (cur.republishTimer) { clearTimeout(cur.republishTimer); cur.republishTimer = null; }
    if (cur.board.share && window.Cloud && Cloud.available() && Cloud.signedIn()) {
      var board = cur.board;
      var l = S.get('lessons', cur.lessonId);
      var st = l ? S.get('students', l.studentId) : null;
      var leavingId = cur.lessonId;
      publishLesson(board, l, st, board.share.token).then(function () {
        publogSet(leavingId, true);
      }, function (e) {
        publogSet(leavingId, false, e && e.message ? e.message : 'немає звʼязку');
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

  /* Сказати синхронізації, що дошка схудла з волі власника, а не через
     збій. Без цього захист від втрати відкочував би назад і стерте гумкою,
     і видалений слайд. */
  function allowShrink() {
    if (cur && window.BoardSync && BoardSync.allow) BoardSync.allow(cur.lessonId);
  }

  function markDirty() {
    if (!cur) return;
    cur.dirty = true;
    paintSaved();
    if (cur.saveTimer) clearTimeout(cur.saveTimer);
    cur.saveTimer = setTimeout(flushSave, 700);
  }

  /* ============================================================
     Де саме збережена дошка
     ============================================================

     Напис «Збережено» довго означав лише «записано в цей браузер». Якщо
     дошка не доїжджала на сервер — не було входу, зник інтернет, сервер
     відмовив — про це знала тільки консоль. Людина малювала далі й
     дізнавалася про втрату з іншого пристрою, коли вже пізно.

     Тепер напис говорить правду про обидва місця, а причину показує
     повідомленням — один раз на причину, щоб не сипати те саме на кожен
     штрих. */

  var SAVED_LOOK = {
    saved:  { cls: '',          ic: 'check', text: 'Збережено' },
    sending:{ cls: 'is-dirty',  ic: 'clock', text: 'Зберігається…' },
    queue:  { cls: 'is-dirty',  ic: 'clock', text: 'Надсилаю на сервер…' },
    local:  { cls: 'is-warn',   ic: 'alert', text: 'Лише на цьому пристрої' },
    fail:   { cls: 'is-fail',   ic: 'alert', text: 'Не доїхало на сервер' }
  };

  function savedState() {
    if (!cur) return { key: 'saved', note: '' };
    if (cur.dirty) return { key: 'sending', note: 'Записую зміни' };

    var st = (window.BoardSync && BoardSync.state)
      ? BoardSync.state(cur.lessonId) : { mode: 'idle' };

    if (st.mode === 'local') {
      return { key: 'local', note: st.why + '. Дошка є лише в цьому браузері: ' +
        'на іншому пристрої й в учня її не буде.' };
    }
    if (st.mode === 'fail') {
      return { key: 'fail', note: 'Сервер не прийняв дошку: ' + st.why +
        '. Намальоване тут ціле, спроба повториться сама.' };
    }
    if (st.mode === 'queue') return { key: 'queue', note: st.why || 'Чекає на відправку' };
    if (st.mode === 'sent') {
      return { key: 'saved', note: 'Записано тут і на сервері' +
        (st.at ? ' — ' + U.fmtDateTime(new Date(st.at).toISOString()) : '') + '.' };
    }
    return { key: 'saved', note: 'Записано в цьому браузері й на сервері.' };
  }

  /* Як у Miro: коли все працює, про збереження не видно нічого. Людина
     малює — і воно просто є. Напис зʼявляється лише тоді, коли справді
     щось не так і це триває: зник інтернет або сервер довго не приймає.
     Хвилинна затримка посеред уроку — не привід відволікати. */
  var QUIET_MS = 45000;

  function paintSaved() {
    var el = document.querySelector('[data-saved]');
    if (!el || !cur) return;
    var s2 = savedState();
    var trouble = s2.key === 'fail' || (s2.key === 'queue' && !navigator.onLine);

    if (!trouble) {
      cur.troubleSince = 0;
      el.hidden = true;
      return;
    }
    if (!cur.troubleSince) {
      cur.troubleSince = Date.now();
      // перевіримо ще раз, коли мине терпіння: може, саме минеться
      setTimeout(function () { if (cur) paintSaved(); }, QUIET_MS + 500);
    }
    if (Date.now() - cur.troubleSince < QUIET_MS) { el.hidden = true; return; }

    el.hidden = false;
    el.className = 'board-top__saved is-warn';
    el.innerHTML = icon('cloud', 15) + (navigator.onLine ? 'Сервер не відповідає' : 'Немає інтернету');
    el.title = 'Намальоване ціле й лежить тут. Щойно звʼязок повернеться, усе поїде саме.';
  }

  /* Якщо на урок уже видано посилання, воно має показувати те, що є зараз.
     Інакше учень бачить знімок того моменту, коли посилання створили —
     домалював слайд, а в нього досі старе. Покладатися на те, що репетитор
     не забуде натиснути «Оновити», не можна.

     Пауза коротка: оновлюється лише сам урок (кілька кілобайтів), картинки
     вже лежать на сервері й повторно не їдуть. Тому учень бачить написане
     майже одразу, як на другому пристрої репетитора. */
  var REPUBLISH_MS = 2500;

  /* Версія сторінки уроку.
     Опублікований урок — це знімок HTML на сервері, а не жива сторінка. Тому
     коли переглядач змінюється (нові інструменти, інша нумерація), уже
     опубліковані уроки лишаються старими, скільки б учень не оновлював
     браузер. Це число підіймається разом із переглядачем, і за ним видно,
     які уроки треба перевидати.

     Підіймати щоразу, коли міняється VIEWER_SCRIPT або розмітка переглядача. */
  var VIEWER_VERSION = 9;

  /**
   * Стан копії учня.
   *
   * На дошці його більше не видно зовсім: написи «учень бачить це» і
   * «учень бачить старе» на кожен штрих лише відволікали, а в Miro такого
   * немає, бо там учень дивиться на ту саму дошку. Оновлення й далі
   * повторюється само, а те, що справді застрягло, записується в журнал і
   * видно в «Чи все ціле».
   */
  function setPubState(state, detail) {
    var el = document.querySelector('[data-pub]');
    if (el) el.hidden = true;
    if (!cur) return;
    if (state === 'ok') cur.lastPubFail = null;
    else if (state === 'fail') cur.lastPubFail = detail || 'невідома причина';
  }

  function scheduleRepublish() {
    if (!cur || !cur.board.share) return;

    /* Раніше тут був мовчазний вихід. Через це напис лишався зеленим —
       програма запевняла, що учень бачить свіже, хоча нічого не
       відправлялося взагалі. */
    if (!(window.Cloud && Cloud.available())) {
      publogSet(cur.lessonId, false, 'синхронізацію не налаштовано');
      setPubState('fail', 'синхронізацію не налаштовано');
      return;
    }
    if (!Cloud.signedIn()) {
      publogSet(cur.lessonId, false, 'сесія скінчилася');
      setPubState('fail', 'сесія скінчилася — увійдіть у Налаштуваннях');
      return;
    }
    if (cur.republishTimer) return;                 // одне заплановане перевидання за раз

    var wait = Math.max(0, REPUBLISH_MS - (Date.now() - (cur.republishedAt || 0)));
    setPubState('sending');
    cur.republishTimer = setTimeout(function () {
      cur.republishTimer = null;
      if (!cur || !cur.board.share) return;
      var lessonId = cur.lessonId;
      var l = S.get('lessons', lessonId);
      var st = l ? S.get('students', l.studentId) : null;
      publishLesson(cur.board, l, st, cur.board.share.token).then(function () {
        if (cur && cur.lessonId === lessonId) cur.republishedAt = Date.now();
        cur.board.share.v = VIEWER_VERSION;
        publogSet(lessonId, true);
        setPubState('ok');
      }).catch(function (e) {
        publogSet(lessonId, false, e && e.message ? e.message : 'немає звʼязку');
        /* Раніше помилка йшла лише в консоль — тобто нікуди. Тепер вона
           на видноті: інакше репетитор упевнений, що учень бачить свіже,
           хоча в того досі старий знімок. */
        console.warn('Не вдалося оновити урок для учня:', e && e.message);
        setPubState('fail', e && e.message ? e.message : 'немає звʼязку');
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
    var pics = [];   // картинки від учня — їх треба забрати до себе

    rows.forEach(function (row) {
      /* Раніше id додавався тут — до будь-якої обробки. Через це внесок,
         який не вдалося застосувати, все одно позначався прийнятим і більше
         ніколи не читався. Тепер id потрапляє в список лише наприкінці, і
         лише якщо все справді лягло на місце. */
      var ok = true;
      var msgs;
      try { msgs = JSON.parse(row.payload); } catch (e) { return; }
      if (!Array.isArray(msgs)) msgs = [msgs];

      msgs.forEach(function (m) {
        if (m.mathhub === 'ink' && m.item) {
          /* Спершу за id слайда: приховані слайди не публікуються, тому
             номер у учня свій, і за ним запис ліг би не туди. Номер лишаємо
             запасним — для сторінок, опублікованих до цієї зміни. */
          var s = null;
          if (m.sid) {
            s = cur.board.slides.filter(function (x) { return x.id === m.sid; })[0] || null;
          }
          if (!s && m.sid == null) s = cur.board.slides[m.slide];
          // слайда немає — можливо, дошка тут ще стара; спробуємо наступного разу
          if (!s) { ok = false; return; }
          if (!s.items) s.items = [];
          // позначаємо чиє це — щоб на дошці було видно, що писав учень
          var it = m.item;
          it.by = 'student';

          /* Якщо запис уже на дошці, далі працюємо саме з ним, а не з
             копією з повідомлення. Інакше при повторній спробі адресу
             прибрало б із копії, а на дошці вона висіла б вічно. */
          var was = s.items.filter(function (x) { return x.id === it.id; })[0];
          if (was) {
            it = was;
          } else {
            s.items.push(it);
            changed = true;
          }

          /* Учень міг вставити фото чи скріншот. Файлу в нас ще немає — у
             повідомленні лише адреса, і вона єдиний шлях до нього. Поки
             файл не ляже у сховище, стерти адресу означає втратити фото
             назавжди. Приберемо її тоді, коли файл справді доїде. */
          if (it.t === 'i' && it.src) pics.push({ key: it.k, url: it.src, item: it });
        } else if (m.mathhub === 'ink-undo' && m.id) {
          cur.board.slides.forEach(function (s) {
            if (!s.items) return;
            var before = s.items.length;
            s.items = s.items.filter(function (x) { return x.id !== m.id; });
            if (s.items.length !== before) changed = true;
          });
        }
      });
      if (ok) ids.push(row.id);
    });

    /* Файли чекаємо, а не відпускаємо у фон. Раніше внесок позначався
       прийнятим одразу, а завантаження йшло слідом: одна невдала спроба —
       і фото не лишалося ніде, бо адресу вже стерто, а внесок більше не
       читався. Тепер «прийнято» настає лише після того, як файл ліг у
       сховище. */
    if (!pics.length || !window.ImgStore || !window.ImgStore.available()) {
      return Promise.resolve({ changed: changed, ids: ids });
    }

    return Promise.all(pics.map(function (p) {
      if (!p.key || !p.url) return null;
      return window.ImgStore.get(p.key).then(function (have) {
        if (have) { delete p.item.src; return null; }        // уже забрали раніше
        return fetch(p.url).then(function (res) {
          if (!res.ok) throw new Error('http ' + res.status);
          return res.blob();
        }).then(function (blob) {
          return window.ImgStore.put(p.key, blob);
        }).then(function () {
          delete p.item.src;                                 // тепер адреса не потрібна
        });
      }).catch(function (e) {
        console.warn('Картинка від учня не забралася:', e && e.message);
        p.failed = true;
      });
    })).then(function () {
      if (cur) {
        cur.engine.ensureImages();
        cur.engine.render();
        markDirty();
      }
      /* Хоч одне фото не доїхало — увесь внесок лишається неприйнятим і
         буде спробуваний ще раз. Повторна спроба нічого не зіпсує: усе, що
         вже лягло, пропускається. */
      if (pics.some(function (p) { return p.failed; })) ids = [];
      return { changed: changed, ids: ids };
    });
  }

  /**
   * Фото розв'язань від учня. Забираємо файл до себе й кладемо в те саме
   * сховище картинок, що й решту — тоді вони поводяться як звичайні фото
   * завдання: видно в програмі, їдуть у резервну копію й синхронізуються.
   */
  function mergeHomework(rows) {
    var jobs = [];
    var touched = 0;
    var failed = {};        // внески, які не вдалося прийняти повністю

    rows.forEach(function (row) {
      var m;
      try { m = JSON.parse(row.payload); } catch (e) { failed[row.id] = 1; return; }
      if (!m || !m.hw || !m.photos) { failed[row.id] = 1; return; }

      var hw = S.get('homeworks', m.hw);
      /* Завдання ще немає — найімовірніше, воно просто не доїхало з іншого
         пристрою. Це не привід викидати фото: лишаємо внесок неприйнятим,
         і він застосується, щойно завдання з'явиться. */
      if (!hw) { failed[row.id] = 1; return; }
      /* Розвʼязання учня лежать ОКРЕМО від фото завдання. Раніше вони падали
         в один список, і відрізнити «що я задав» від «що учень надіслав»
         було неможливо — на вигляд просто набір картинок. */
      if (!hw.solutions) hw.solutions = [];
      var has = function (k) {
        return hw.solutions.some(function (s) { return s.key === k; });
      };

      m.photos.forEach(function (p) {
        if (!p || !p.key || !p.url) return;
        if (has(p.key)) return;                          // уже забрали
        jobs.push(
          fetch(p.url).then(function (res) {
            if (!res.ok) throw new Error('http ' + res.status);
            return res.blob();
          }).then(function (blob) {
            return window.ImgStore.put(p.key, blob);
          }).then(function () {
            if (has(p.key)) return;
            hw.solutions.push({ key: p.key, at: row.created_at || new Date().toISOString() });
            // надіслав — отже здано; репетитор одразу бачить це в списку
            if (hw.status === 'assigned') hw.status = 'submitted';
            touched++;
          }).catch(function (e) {
            console.warn('Фото від учня не забралося:', e && e.message);
            failed[row.id] = 1;
          })
        );
      });
    });

    return Promise.all(jobs).then(function () {
      return {
        n: touched,
        ids: rows.filter(function (r) { return !failed[r.id]; })
                 .map(function (r) { return r.id; })
      };
    });
  }

  /**
   * Забрати дії, зроблені деінде, і показати їх тут.
   *
   * Не влазимо посеред штриха чи рамки виділення: інакше лінія обірветься
   * просто під рукою. Дії нікуди не подінуться — заберемо їх наступного
   * разу, за три секунди.
   */
  function pullOps() {
    if (!cur || !window.BoardOps) return;
    if (cur.engine.draft || cur.engine.band) return;

    var lessonId = cur.lessonId;
    BoardOps.pull(lessonId, cur.board).then(function (n) {
      if (!n || !cur || cur.lessonId !== lessonId) return;

      S.saveBoard(cur.board);
      if (cur.index >= cur.board.slides.length) cur.index = cur.board.slides.length - 1;
      cur.engine.setSlide(cur.board.slides[cur.index], true);   // true — лишити масштаб
      renderRail();
      refreshEmpty();
      updateSlideName();
    });
  }

  /**
   * Доносимо фото учня, які колись не доїхали.
   *
   * Тепер адреса лишається на обʼєкті, доки файл не ляже у сховище. Отже,
   * кожне відкриття дошки — ще одна спроба. Було офлайн, впав інтернет,
   * закінчилося місце — фото зʼявиться саме, без жодних дій і без питань
   * до людини.
   */
  function healStudentImages() {
    if (!cur || !window.ImgStore || !ImgStore.available()) return;

    var need = [];
    (cur.board.slides || []).forEach(function (sl) {
      (sl.items || []).forEach(function (it) {
        if (it && it.t === 'i' && it.src && it.k) need.push(it);
      });
    });
    if (!need.length) return;

    Promise.all(need.map(function (it) {
      return ImgStore.get(it.k).then(function (have) {
        if (have) { delete it.src; return true; }
        return fetch(it.src).then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.blob();
        }).then(function (b) {
          return ImgStore.put(it.k, b);
        }).then(function () { delete it.src; return true; });
      }).catch(function () { return false; });
    })).then(function (res) {
      var got = res.filter(Boolean).length;
      if (!got || !cur) return;
      cur.engine.ensureImages();
      cur.engine.render();
      markDirty();
      flushSave();
      if (got) U.toast(U.pl(got, 'фото учня повернулося', 'фото учня повернулися',
                            'фото учня повернулося'), 'ok');
    });
  }

  function pullContributions() {
    if (!cur || !cur.board.share) return;
    if (!(window.Cloud && Cloud.available() && Cloud.signedIn())) return;
    var lessonId = cur.lessonId;

    window.Cloud.shareContributions(cur.board.share.token).then(function (rows) {
      if (!cur || cur.lessonId !== lessonId || !rows || !rows.length) return;

      var ink = rows.filter(function (r) { return r.kind === 'ink'; });
      var hw  = rows.filter(function (r) { return r.kind === 'homework'; });

      return mergeContributions(ink).then(function (res) {
        if (res.changed) {
          markDirty();
          flushSave();
          cur.engine.setSlide(cur.board.slides[cur.index], true);
          renderRail();
          refreshEmpty();
          U.toast('Учень щось написав на дошці', 'ok');
        }

        return mergeHomework(hw).then(function (h) {
          if (h.n) {
            S.save();
            updateHwCount();
            U.toast('Учень надіслав ' + U.pl(h.n, 'фото', 'фото', 'фото') + ' розв\'язання', 'ok');
          }

          /* Позначаємо прийнятими лише те, що справді прийнято. Решта
             лишається на сервері й буде спробувана знову — краще зайва
             спроба, ніж зникле фото. */
          var ids = res.ids.concat(h.ids);
          var stuck = (ink.length + hw.length) - ids.length;
          if (stuck > 0) {
            console.warn('Внесків учня не прийнято:', stuck, '— спробуємо ще раз');
          }
          if (ids.length) window.Cloud.markContributionsMerged(ids);
        });
      });
    }).catch(function (e) {
      // без цього будь-яка помилка тут гинула тихо — саме так і сховалася
      // помилка з невідміченими внесками
      console.warn('Не вдалося забрати те, що надіслав учень:', e && e.message);
    });
  }

  /* ---- Історія дошки -----------------------------------------------------

     Знімок лягає в браузер поруч із самою дошкою й ні від чого не залежить:
     ні від мережі, ні від входу в акаунт. Це остання лінія — коли зникло
     просто так, повернути можна самому й одразу, не чекаючи нічиєї допомоги.

     Не частіше ніж раз на хвилину: інакше сорок місць в історії з'їв би
     один урок, і в ній не лишилося б нічого, крім останніх п'яти хвилин. */
  var SNAP_MS = 60000;

  /* ---- Журнал відправлень учню -------------------------------------------

     Позначку «востаннє дійшло» не можна тримати в самій дошці: її запис
     рахувався б зміною дошки й тягнув би наступне відправлення, а те —
     наступну позначку, і так по колу. Тому журнал лежить окремо, у цьому
     браузері, і потрібен рівно для одного — щоб у Налаштуваннях було видно,
     чи бачить учень свіже, не відкриваючи кожен урок. */
  var PUBLOG = 'vektor.publog.v1';

  function publogAll() {
    try { return JSON.parse(localStorage.getItem(PUBLOG) || '{}'); } catch (e) { return {}; }
  }

  function publogSet(lessonId, ok, err) {
    if (!lessonId) return;
    var m = publogAll();
    m[lessonId] = { at: new Date().toISOString(), ok: ok ? 1 : 0, err: err || '' };
    try { localStorage.setItem(PUBLOG, JSON.stringify(m)); } catch (e) {}
  }

  V.publishLog = publogAll;

  /** Повертає обіцянку: знімок уже в сховищі. Потрібно тим, хто одразу читає список. */
  function snapshot(force) {
    if (!cur || !window.BoardHistory || !BoardHistory.available()) return Promise.resolve(false);
    var now = Date.now();
    if (!force && cur.snapAt && now - cur.snapAt < SNAP_MS) return Promise.resolve(false);
    cur.snapAt = now;
    return BoardHistory.save(cur.lessonId, cur.board);
  }

  /** Список збережених версій із можливістю повернутись до будь-якої. */
  function historyDialog() {
    if (!cur) return;
    if (!window.BoardHistory || !BoardHistory.available()) {
      U.toast('Цей браузер не вміє зберігати історію дошки', 'err');
      return;
    }

    flushSave();
    /* Спершу записуємо те, що зараз на екрані, і лише потім читаємо список.
       Інакше читання встигало б раніше за запис — і власна щойно збережена
       версія у списку не з'являлась. */
    var boardKey = cur.lessonId;
    var ready = snapshot(true);

    C.modal({
      title: 'Історія дошки',
      sub: 'Версії зберігаються у цьому браузері',
      wide: true,
      body:
        '<p style="line-height:1.65;color:var(--ink-2);margin:4px 0 14px">' +
        'Знімок робиться при відкритті дошки, далі — не частіше ніж раз на хвилину, ' +
        'і обов’язково при виході. Зберігаються останні 40 версій кожної дошки. ' +
        'Перед поверненням поточний стан теж записується, тож відкат можна відкотити.</p>' +
        '<div data-hist class="muted" style="padding:8px 0">Читаю історію…</div>' +
        '<div style="height:1px;background:var(--line);margin:18px 0 14px"></div>' +
        '<p style="line-height:1.65;color:var(--ink-2);margin:0 0 10px">' +
        '<b>Слайд зник, а в історії його немає?</b><br>' +
        'На сервері є журнал: він тільки дописується й памʼятає кожен слайд, ' +
        'який колись існував на цій дошці. Пошук нічого не змінює — він лише ' +
        'показує, чого зараз бракує.</p>' +
        '<button class="btn btn--ghost btn--sm" data-act-find>Пошукати втрачені слайди</button>' +
        '<div data-lost style="margin-top:12px"></div>' +
        '<div style="height:1px;background:var(--line);margin:18px 0 14px"></div>' +
        '<p style="line-height:1.65;color:var(--ink-2);margin:0 0 10px">' +
        '<b>Слайда немає ніде, а фото на ньому були?</b><br>' +
        'Картинки лежать у сховищі окремо від дошок, і їх не видаляє ніщо — ' +
        'навіть коли слайд зник. Тут показані ті, на які зараз не посилається ' +
        'жоден слайд, домашнє чи матеріал.</p>' +
        '<button class="btn btn--ghost btn--sm" data-act-orphans>Пошукати загублені картинки</button>' +
        '<div data-orphans style="margin-top:12px"></div>' +
        (cur.board.share && cur.board.share.token
          ? '<div style="height:1px;background:var(--line);margin:18px 0 14px"></div>' +
            '<p style="line-height:1.65;color:var(--ink-2);margin:0 0 10px">' +
            '<b>Урок надіслано учневі.</b><br>' +
            'Його сторінка — окрема повна копія слайдів на сервері. Якщо слайд зник, ' +
            'а публікація після того не встигла оновитись, він там ще лежить.</p>' +
            '<button class="btn btn--ghost btn--sm" data-act-share>Подивитись у сторінці учня</button>' +
            '<div data-fromshare style="margin-top:12px"></div>'
          : ''),
      buttons: [{ label: 'Закрити', kind: 'btn--ghost', act: 'cancel' }],
      onMount: function (wrap, close) {
        var box = wrap.querySelector('[data-hist]');

        ready.then(function () { return BoardHistory.list(boardKey); }).then(function (rows) {
          if (!rows.length) {
            box.className = '';
            box.innerHTML = C.empty('clock', 'Версій поки немає',
              'Перша з’явиться, щойно ви щось намалюєте.');
            return;
          }

          box.className = '';
          box.innerHTML = '<div class="list">' + rows.map(function (r, i) {
            return '<div class="list__item">' +
              '<div style="flex:1;min-width:0">' +
              '<div class="truncate"><b>' + U.esc(U.fmtDateTime(r.at)) + '</b>' +
              (i === 0 ? ' ' + C.badge('зараз', 'badge--green') : '') + '</div>' +
              '<div class="muted" style="font-size:12px">' +
              U.pl(r.slides, 'слайд', 'слайди', 'слайдів') + ' · ' +
              U.pl(r.items, 'об’єкт', 'об’єкти', 'об’єктів') +
              (r.images ? ' · ' + U.pl(r.images, 'картинка', 'картинки', 'картинок') : '') +
              '</div></div>' +
              (i === 0 ? '' :
                '<button class="btn btn--ghost btn--sm" data-restore="' + r.id + '">' +
                'Повернути</button>') +
              '</div>';
          }).join('') + '</div>';

          U.$$('[data-restore]', box).forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = Number(btn.getAttribute('data-restore'));
              btn.disabled = true;
              BoardHistory.get(id).then(function (snap) {
                if (!snap || !snap.slides || !snap.slides.length) {
                  U.toast('Цю версію не вдалося прочитати', 'err');
                  btn.disabled = false;
                  return;
                }
                restoreVersion(snap);
                close();
              });
            });
          });
        });

        mountLostSlides(wrap, boardKey);
        mountLostImages(wrap);
        mountFromShare(wrap);
      }
    });
  }

  /**
   * Дістати слайд зі сторінки, надісланої учневі.
   *
   * Ще одна копія, незалежна і від історії в браузері, і від журналу: те, що
   * поїхало до учня, лежить на сервері окремим документом.
   *
   * Картинки там уже мають власні адреси, тож повертаємо не лише слайд, а й
   * самі файли — інакше повернувся б слайд із порожніми рамками.
   */
  function mountFromShare(wrap) {
    var btn = wrap.querySelector('[data-act-share]');
    var box = wrap.querySelector('[data-fromshare]');
    if (!btn || !box) return;

    btn.addEventListener('click', function () {
      var token = cur && cur.board.share && cur.board.share.token;
      if (!token || !window.Cloud || !Cloud.shareData) {
        box.innerHTML = '<div class="muted">Посилання для учня не знайдено.</div>';
        return;
      }
      btn.disabled = true;
      box.innerHTML = '<div class="muted">Читаю сторінку учня…</div>';

      Cloud.shareData(token).then(function (row) {
        btn.disabled = false;
        var data = row && parseViewerData(row.data);
        if (!data || !data.slides) {
          box.innerHTML = '<div class="muted">Сторінку не прочитано. ' +
            'Потрібні інтернет і вхід у синхронізацію.</div>';
          return;
        }

        var have = {};
        (cur.board.slides || []).forEach(function (s) { if (s && s.id) have[s.id] = 1; });
        var lost = data.slides.filter(function (s) {
          return s && s.id && !have[s.id] && (s.items || []).length;
        });

        var коли = row.updated_at ? U.fmtDateTime(row.updated_at) : '';
        if (!lost.length) {
          box.innerHTML = '<div class="muted">У сторінці учня' +
            (коли ? ' (оновлена ' + U.esc(коли) + ')' : '') +
            ' немає нічого, чого не було б на дошці.</div>';
          return;
        }

        box.innerHTML = '<div class="muted" style="margin-bottom:8px">Сторінка оновлена ' +
            U.esc(коли) + '</div>' +
          '<div class="list">' + lost.map(function (s, i) {
            var imgs = (s.items || []).filter(function (it) { return it && it.t === 'i'; }).length;
            return '<div class="list__item">' +
              '<div style="flex:1;min-width:0">' +
              '<div class="truncate"><b>' + U.esc(s.title || 'Слайд без назви') + '</b> ' +
              C.badge(s.kind === 'hw' ? 'ДЗ' : 'урок', s.kind === 'hw' ? 'badge--amber' : '') +
              '</div><div class="muted" style="font-size:12px">' +
              U.pl((s.items || []).length, 'об’єкт', 'об’єкти', 'об’єктів') +
              (imgs ? ' · ' + U.pl(imgs, 'картинка', 'картинки', 'картинок') : '') +
              '</div></div>' +
              '<button class="btn btn--primary btn--sm" data-share-back="' + i + '">Повернути</button>' +
              '</div>';
          }).join('') + '</div>';

        U.$$('[data-share-back]', box).forEach(function (b) {
          b.addEventListener('click', function () {
            var s = lost[Number(b.getAttribute('data-share-back'))];
            if (!s) return;
            b.disabled = true;
            b.textContent = 'Повертаю…';
            restoreFromShare(s, data.images || {}).then(function () {
              b.textContent = 'Повернуто';
            });
          });
        });
      });
    });
  }

  /* Знімок сторінки учня — це готовий HTML із даними всередині. Дістаємо
     саме їх: рядок починається з відомої мітки й займає рівно один рядок. */
  function parseViewerData(html) {
    if (!html) return null;
    var at = html.indexOf('var DATA = ');
    if (at < 0) return null;
    var from = at + 'var DATA = '.length;
    var end = html.indexOf('\n', from);
    var line = (end < 0 ? html.slice(from) : html.slice(from, end)).replace(/;\s*$/, '');
    try { return JSON.parse(line); } catch (e) { return null; }
  }

  /** Повернути слайд зі сторінки учня разом із його картинками. */
  function restoreFromShare(slide, images) {
    var keys = (slide.items || [])
      .filter(function (it) { return it && it.t === 'i' && it.k; })
      .map(function (it) { return it.k; });

    /* Тягнемо лише те, чого справді немає: якщо картинка вже у сховищі,
       чіпати її нема потреби. */
    var jobs = keys.map(function (k) {
      return ImgStore.getLocal ? ImgStore.getLocal(k) : ImgStore.get(k);
    });

    return Promise.all(jobs).then(function (blobs) {
      var need = [];
      blobs.forEach(function (b, i) { if (!b && images[keys[i]]) need.push(keys[i]); });

      return Promise.all(need.map(function (k) {
        return fetch(images[k]).then(function (r) { return r.ok ? r.blob() : null; })
          .then(function (b) { return b ? ImgStore.put(k, b) : null; })
          .catch(function () { return null; });
      }));
    }).then(function () {
      snapshot(true);
      var kind = slide.kind === 'hw' ? 'hw' : 'lesson';
      var pos = -1;
      for (var i = cur.board.slides.length - 1; i >= 0; i--) {
        if (S.slideKind(cur.board.slides[i]) === kind) { pos = i + 1; break; }
      }
      if (pos < 0) pos = kind === 'hw' ? cur.board.slides.length : 0;

      cur.board.slides.splice(pos, 0, {
        id: slide.id, title: slide.title || '', bg: slide.bg || 'grid',
        kind: kind, hidden: 0,
        items: JSON.parse(JSON.stringify(slide.items || []))
      });

      if (window.BoardOps && BoardOps.keep) BoardOps.keep(slide.id);
      cur.thumbs = {};
      markDirty();
      flushSave();
      selectSlide(pos);
      U.toast('Слайд повернувся зі сторінки учня', 'ok');
    });
  }

  /**
   * Картинки, на які вже ніщо не посилається.
   *
   * Останній рубіж, коли слайда немає ні в історії, ні в журналі. Сховище
   * картинок нічого не видаляє саме — тож фото зі зниклого слайда майже
   * напевно лежить на місці й чекає, поки його впізнають в обличчя.
   *
   * Показуємо саме зображення, а не список ключів: ключ нікому нічого не
   * каже, а по картинці одразу видно, та вона чи ні.
   */
  function mountLostImages(wrap) {
    var btn = wrap.querySelector('[data-act-orphans]');
    var box = wrap.querySelector('[data-orphans]');
    if (!btn || !box) return;

    var LIMIT = 60;
    var urls = [];

    btn.addEventListener('click', function () {
      if (!window.ImgStore || !ImgStore.available()) {
        box.innerHTML = '<div class="muted">Цей браузер не дає читати сховище картинок.</div>';
        return;
      }
      btn.disabled = true;
      box.innerHTML = '<div class="muted">Переглядаю сховище…</div>';

      /* Дивимось і в цей браузер, і на сервер. Картинку могли додати з
         телефона — тоді тут її немає зовсім, хоч вона й ціла. */
      var local = S.unusedImages();
      var remote = (window.CloudImages && CloudImages.listRemote)
        ? CloudImages.listRemote() : Promise.resolve([]);

      Promise.all([local, remote]).then(function (both) {
        var used = {};
        S.usedImageKeys().forEach(function (k) { used[k] = 1; });

        var keys = both[0].slice();
        both[1].forEach(function (r) {
          if (!used[r.key] && keys.indexOf(r.key) < 0) keys.push(r.key);
        });
        return keys;
      }).then(function (keys) {
        btn.disabled = false;
        if (!keys.length) {
          box.innerHTML = '<div class="muted">Безхазяйних картинок немає: ' +
            'усе, що лежить у сховищі, десь використовується.</div>';
          return;
        }

        var show = keys.slice(0, LIMIT);
        return Promise.all(show.map(function (k) {
          return ImgStore.get(k).then(function (blob) {
            return blob ? { key: k, blob: blob } : null;
          }).catch(function () { return null; });
        })).then(function (found) {
          var live = found.filter(Boolean);
          if (!live.length) {
            box.innerHTML = '<div class="muted">Ключі є, а самих файлів не знайшлося.</div>';
            return;
          }

          box.innerHTML =
            '<div class="muted" style="margin-bottom:10px">' +
              'Знайдено ' + U.pl(keys.length, 'картинку', 'картинки', 'картинок') +
              ', на які зараз ніщо не посилається' +
              (keys.length > LIMIT ? ' — показано перші ' + LIMIT : '') +
              '. Натисніть на ту, що з того слайда.</div>' +
            '<div data-grid style="display:grid;gap:10px;' +
              'grid-template-columns:repeat(auto-fill,minmax(120px,1fr))"></div>' +
            '<button class="btn btn--primary btn--sm" data-all style="margin-top:12px">' +
              'Зібрати слайд ДЗ з усіх показаних</button>';

          var grid = box.querySelector('[data-grid]');
          live.forEach(function (m, i) {
            var url = URL.createObjectURL(m.blob);
            urls.push(url);

            var cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'btn btn--ghost';
            cell.setAttribute('data-put', String(i));
            cell.style.cssText = 'padding:6px;height:auto;display:block;text-align:center';

            var img = document.createElement('img');
            img.alt = '';
            img.style.cssText = 'width:100%;height:88px;object-fit:contain;' +
              'border-radius:var(--r-sm);background:var(--bg);display:block';
            /* Заразом дізнаємось справжні розміри: без них картинка лягла б
               на дошку квадратом, а розтягнутий скріншот не прочитати. */
            img.addEventListener('load', function () {
              m.w = img.naturalWidth || 0;
              m.h = img.naturalHeight || 0;
            });
            img.src = url;

            var cap = document.createElement('span');
            cap.className = 'muted';
            cap.style.cssText = 'font-size:11px;display:block;margin-top:5px';
            cap.textContent = m.blob.size < 1048576
              ? Math.round(m.blob.size / 1024) + ' КБ'
              : (m.blob.size / 1048576).toFixed(1) + ' МБ';

            cell.appendChild(img);
            cell.appendChild(cap);
            grid.appendChild(cell);
          });

          U.$$('[data-put]', grid).forEach(function (cell) {
            cell.addEventListener('click', function () {
              placeImages([live[Number(cell.getAttribute('data-put'))]], false);
            });
          });
          box.querySelector('[data-all]').addEventListener('click', function () {
            placeImages(live, true);
          });
        });
      }).catch(function () {
        btn.disabled = false;
        box.innerHTML = '<div class="muted">Сховище картинок не прочиталося.</div>';
      });
    });

    /* Прибираємо посилання на файли, щойно вікно зникає з сторінки: інакше
       браузер тримає їх у памʼяті до перезавантаження. */
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () {
        if (document.body.contains(wrap)) return;
        urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
        urls = [];
        mo.disconnect();
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  /**
   * Покласти знайдені картинки назад на дошку.
   *
   * newSlide — зібрати з них окремий слайд ДЗ, тобто відтворити зниклий.
   * Інакше кладемо на той слайд, що зараз відкритий.
   */
  function placeImages(list, newSlide) {
    if (!cur || !list.length) return;
    snapshot(true);

    var target = cur.index;
    if (newSlide) {
      var s = S.newSlide('Домашнє завдання', 'hw');
      var pos = -1;
      for (var i = cur.board.slides.length - 1; i >= 0; i--) {
        if (S.slideKind(cur.board.slides[i]) === 'hw') { pos = i + 1; break; }
      }
      if (pos < 0) pos = cur.board.slides.length;
      cur.board.slides.splice(pos, 0, s);
      target = pos;
    }

    var slideTo = cur.board.slides[target];
    slideTo.items = slideTo.items || [];

    var cols = Math.ceil(Math.sqrt(list.length));
    var cell = 560, gap = 40;

    /* Кладемо нижче за все, що вже є на слайді, а не поверх: повернення
       втраченого не має нічого затуляти. */
    var below = 0;
    slideTo.items.forEach(function (it) {
      if (it && it.a) below = Math.max(below, it.a[1], it.a[3]);
    });
    var top = slideTo.items.length ? below + gap * 2 : 0;

    list.forEach(function (m, i) {
      var cx = (i % cols) * (cell + gap);
      var cy = top + Math.floor(i / cols) * (cell + gap);
      // справжні пропорції взято з мініатюри; без них скріншот розтягнеться
      var ratio = (m.w && m.h) ? m.w / m.h : 1;
      var w = ratio >= 1 ? cell : cell * ratio;
      var h = ratio >= 1 ? cell / ratio : cell;
      slideTo.items.push({ t: 'i', id: U.uid('it'), k: m.key, r: ratio,
                           a: [cx + (cell - w) / 2, cy + (cell - h) / 2,
                               cx + (cell + w) / 2, cy + (cell + h) / 2] });
    });

    cur.thumbs = {};
    markDirty();
    flushSave();
    selectSlide(target);
    if (cur.engine && cur.engine.fit) cur.engine.fit();
    U.toast(newSlide
      ? 'Слайд ДЗ зібрано з ' + U.pl(list.length, 'картинки', 'картинок', 'картинок')
      : U.pl(list.length, 'картинку покладено', 'картинки покладено', 'картинок покладено'), 'ok');
  }

  /**
   * Пошук слайдів, які зникли з дошки, але лишилися в журналі.
   *
   * Повертаємо лише те, чого зараз немає, і лише додаванням: кнопка, яка
   * рятує втрачене, не має права сама щось затерти.
   */
  function mountLostSlides(wrap, boardKey) {
    var btn = wrap.querySelector('[data-act-find]');
    var box = wrap.querySelector('[data-lost]');
    if (!btn || !box) return;

    btn.addEventListener('click', function () {
      if (!window.BoardOps || !BoardOps.rebuild) {
        box.innerHTML = '<div class="muted">Ця сторінка працює на старому коді й журналу ще не знає. ' +
          'Оновіть сторінку.</div>';
        return;
      }
      btn.disabled = true;
      box.innerHTML = '<div class="muted">Читаю журнал…</div>';

      BoardOps.rebuild(boardKey).then(function (old) {
        btn.disabled = false;
        if (!old) {
          box.innerHTML = '<div class="muted">Журнал не прочитався. Він живе на сервері, ' +
            'тож для пошуку потрібні інтернет і вхід у синхронізацію.</div>';
          return;
        }

        var have = {};
        (cur.board.slides || []).forEach(function (s) { if (s && s.id) have[s.id] = 1; });
        var lost = (old.slides || []).filter(function (s) {
          return s && s.id && !have[s.id] && (s.items || []).length;
        });

        if (!lost.length) {
          box.innerHTML = '<div class="muted">Нічого не бракує: у журналі ' +
            U.pl(old.ops || 0, 'дія', 'дії', 'дій') + ', і всі слайди з нього на місці.</div>';
          return;
        }

        box.innerHTML = '<div class="list">' + lost.map(function (s, i) {
          var imgs = (s.items || []).filter(function (it) { return it && it.t === 'i'; }).length;
          return '<div class="list__item">' +
            '<div style="flex:1;min-width:0">' +
            '<div class="truncate"><b>' + U.esc(s.title || 'Слайд без назви') + '</b> ' +
            C.badge(S.slideKind(s) === 'hw' ? 'ДЗ' : 'урок',
                    S.slideKind(s) === 'hw' ? 'badge--amber' : '') + '</div>' +
            '<div class="muted" style="font-size:12px">' +
            U.pl((s.items || []).length, 'об’єкт', 'об’єкти', 'об’єктів') +
            (imgs ? ' · ' + U.pl(imgs, 'картинка', 'картинки', 'картинок') : '') +
            '</div></div>' +
            '<button class="btn btn--primary btn--sm" data-back="' + i + '">Повернути</button>' +
            '</div>';
        }).join('') + '</div>';

        U.$$('[data-back]', box).forEach(function (b) {
          b.addEventListener('click', function () {
            var s = lost[Number(b.getAttribute('data-back'))];
            if (!s) return;
            b.disabled = true;
            b.textContent = 'Повернуто';

            /* У журналі лишилася й дія, якою слайд зник. Без цієї позначки
               вона програлася б знову при першому ж читанні — і слайд зник
               би вдруге, тільки-но його врятували. */
            if (BoardOps.keep) BoardOps.keep(s.id);

            snapshot(true);
            var kind = S.slideKind(s);
            var pos = -1;
            for (var i = cur.board.slides.length - 1; i >= 0; i--) {
              if (S.slideKind(cur.board.slides[i]) === kind) { pos = i + 1; break; }
            }
            if (pos < 0) pos = kind === 'hw' ? cur.board.slides.length : 0;
            cur.board.slides.splice(pos, 0, s);

            cur.thumbs = {};
            markDirty();
            flushSave();
            selectSlide(pos);
            U.toast('Слайд повернувся з журналу', 'ok');
          });
        });
      });
    });
  }

  /**
   * Повернути дошку до збереженої версії.
   *
   * Замінюємо тільки вміст: сама дошка, її ідентифікатор і посилання для учня
   * лишаються теперішніми. Інакше відкат воскрешав би старий токен — і учень
   * опинявся б на сторінці, якої вже немає.
   */
  function restoreVersion(snap) {
    snapshot(true);                             // щоб і сам відкат можна було відкотити
    /* Відкат — теж воля людини, і він цілком може зробити дошку меншою.
       Без цього дозволу сервер побачив би зменшення, вирішив, що це втрата,
       і повернув би все назад: кнопка «Повернути» не працювала б. */
    allowShrink();
    cur.board.slides = snap.slides;
    cur.index = 0;
    cur.thumbs = {};
    cur.snapAt = 0;                             // нова версія має потрапити в історію
    cur.engine.setSlide(cur.board.slides[0]);
    markDirty();
    flushSave();
    renderRail();
    updateZoom();
    refreshEmpty();
    refreshUndo();
    updateSlideName();
    updateSelBar();
    scheduleThumb();
    U.toast('Дошку повернуто до збереженої версії', 'ok');
  }

  function flushSave() {
    if (!cur || !cur.dirty) return;
    if (cur.saveTimer) { clearTimeout(cur.saveTimer); cur.saveTimer = null; }
    try {
      S.saveBoard(cur.board);
      cur.dirty = false;
      snapshot(false);
      /* Журнал дій — те саме збереження, але словами «що саме змінилось».
         Знімок дошки лишається для швидкого відкриття, а правда про кожен
         рух лежить у журналі, який уміє тільки дописувати. */
      if (window.BoardOps) BoardOps.record(cur.lessonId, cur.board);
      scheduleRepublish();
      paintSaved();
    } catch (e) {
      var el2 = document.querySelector('[data-saved]');
      if (el2) {
        el2.className = 'board-top__saved is-fail';
        el2.innerHTML = icon('alert', 15) + 'Не збережено';
        el2.title = 'Місце в сховищі браузера закінчилось';
      }
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

  /** Наступний або попередній слайд у тому самому рядку. */
  function stepSlide(dir) {
    var idx = railIndexes(curKind());
    var pos = idx.indexOf(cur.index) + dir;
    if (pos < 0 || pos >= idx.length) return;
    selectSlide(idx[pos]);
  }

  /** Куди класти новий слайд рядка kind: одразу за поточним або в кінець рядка. */
  function insertPos(kind) {
    if (curKind() === kind) return cur.index + 1;
    var idx = railIndexes(kind);
    return idx.length ? idx[idx.length - 1] + 1 : cur.board.slides.length;
  }

  function addSlide(copyFrom, kind) {
    kind = kind || (copyFrom ? S.slideKind(copyFrom) : curKind());
    var s = S.newSlide('', kind);
    if (copyFrom) {
      s.items = JSON.parse(JSON.stringify(copyFrom.items || []));
      s.bg = copyFrom.bg;
      s.hidden = copyFrom.hidden ? 1 : 0;
      s.title = (copyFrom.title || 'Слайд') + ' — копія';
    }
    var at = insertPos(kind);
    cur.board.slides.splice(at, 0, s);
    markDirty();
    flushSave();
    selectSlide(at);
  }

  /** Перекинути поточний слайд в інший рядок — у його кінець. */
  function moveSlideRow() {
    var s = cur.board.slides[cur.index];
    var to = S.slideKind(s) === 'hw' ? 'lesson' : 'hw';
    cur.board.slides.splice(cur.index, 1);
    s.kind = to;
    var idx = railIndexes(to);
    var at = idx.length ? idx[idx.length - 1] + 1 : cur.board.slides.length;
    cur.board.slides.splice(at, 0, s);
    cur.thumbs = {};
    markDirty(); flushSave();
    selectSlide(at);
    U.toast(to === 'hw' ? 'Слайд перенесено в ДЗ' : 'Слайд перенесено в урок');
  }

  function toggleSlideHidden() {
    var s = cur.board.slides[cur.index];
    s.hidden = s.hidden ? 0 : 1;
    markDirty(); flushSave();
    renderRail();
    U.toast(s.hidden ? 'Слайд прихований від учня' : 'Слайд знову видно учневі');
    scheduleRepublish();
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
        var gone = cur.board.slides[cur.index];
        cur.board.slides.splice(cur.index, 1);
        cur.thumbs = {};
        // видаляє сама людина — захист «повернутого» більше не потрібен
        if (window.BoardOps && BoardOps.unkeep && gone) BoardOps.unkeep(gone.id);
        allowShrink();
        markDirty();
        flushSave();
        selectSlide(Math.max(0, cur.index - 1));
        U.toast('Слайд видалено');
      });
  }

  /* Пересуваємо в межах свого рядка: сусід — це сусідній слайд того самого
     виду, а не наступний у спільному масиві. */
  function moveSlide(dir) {
    var idx = railIndexes(curKind());
    var pos = idx.indexOf(cur.index);
    var j = pos + dir;
    if (pos < 0 || j < 0 || j >= idx.length) return;
    var arr = cur.board.slides, a = idx[pos], b = idx[j];
    var tmp = arr[a]; arr[a] = arr[b]; arr[b] = tmp;
    cur.thumbs = {};
    markDirty(); flushSave();
    selectSlide(b);
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

  /** Номери слайдів одного рядка — у порядку загального масиву. */
  function railIndexes(kind) {
    var out = [];
    cur.board.slides.forEach(function (s, i) { if (S.slideKind(s) === kind) out.push(i); });
    return out;
  }

  /** Рядок, у якому зараз стоїмо. */
  function curKind() {
    return cur ? S.slideKind(cur.board.slides[cur.index]) : 'lesson';
  }

  function slideCardHtml(i, nInRow) {
    var s = cur.board.slides[i];
    var url = thumbFor(i);
    var name = s.title || ('Слайд ' + nInRow);
    return '<button class="slide-card' + (i === cur.index ? ' is-active' : '') +
      (s.hidden ? ' is-hidden-slide' : '') +
      '" data-slide-index="' + i + '" title="' + U.esc(name) +
      (s.hidden ? ' — учень цього не бачить' : '') + '">' +
      (url ? '<img class="slide-card__thumb" src="' + url + '" alt="">'
           : '<div class="slide-card__empty">порожній</div>') +
      (s.hidden ? '<span class="slide-card__eye" title="Прихований від учня">' +
        icon('eyeOff', 13) + '</span>' : '') +
      '<div class="slide-card__foot">' +
        '<span class="slide-card__num">' + nInRow + '</span>' +
        '<span class="slide-card__name">' + U.esc(name) + '</span>' +
      '</div></button>';
  }

  function renderRailRow(kind) {
    var rail = document.querySelector('[data-rail="' + kind + '"]');
    if (!rail || !cur) return;

    var idx = railIndexes(kind);
    var html = idx.map(function (i, n) { return slideCardHtml(i, n + 1); }).join('');

    /* Кнопки правки стосуються поточного слайда, тому їх показуємо
       лише в тому рядку, де він стоїть — інакше незрозуміло, що видалиться. */
    var isCur = curKind() === kind;

    rail.innerHTML = html +
      '<button class="slide-add" data-act="board-slide-add" data-arg="' + kind + '" ' +
        'title="Додати слайд у цей рядок">' + icon('plus', 20) + '</button>' +
      (kind === 'hw'
        ? '<button class="slide-add" data-act="board-slides-photos" ' +
            'title="Слайди з фото завдання">' + icon('image', 18) + '</button>'
        : '') +
      (isCur
        ? '<div class="rail-tools">' +
            '<button class="icon-btn" data-act="board-slide-hide" title="Показувати учневі чи ні">' +
              icon(cur.board.slides[cur.index].hidden ? 'eyeOff' : 'eye', 16) + '</button>' +
            '<button class="icon-btn" data-act="board-slide-move-row" ' +
              'title="Перенести в інший рядок">' + icon('swap', 16) + '</button>' +
          '</div>' +
          '<div class="rail-tools">' +
            '<button class="icon-btn" data-act="board-slide-dup" title="Дублювати слайд">' + icon('copy', 16) + '</button>' +
            '<button class="icon-btn icon-btn--danger" data-act="board-slide-del" title="Видалити слайд">' + icon('trash', 16) + '</button>' +
          '</div>' +
          '<div class="rail-tools">' +
            '<button class="icon-btn" data-act="board-slide-left" title="Перемістити ліворуч">' + icon('chevronL', 16) + '</button>' +
            '<button class="icon-btn" data-act="board-slide-right" title="Перемістити праворуч">' + icon('chevronR', 16) + '</button>' +
          '</div>'
        : '');

    var active = rail.querySelector('.slide-card.is-active');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function renderRail() {
    if (!cur) return;
    renderRailRow('lesson');
    renderRailRow('hw');

    var cnt = document.querySelector('[data-rail-count]');
    if (!cnt) return;
    var row = railIndexes(curKind());
    var hid = cur.board.slides.filter(function (s) { return s.hidden; }).length;
    cnt.textContent = (row.indexOf(cur.index) + 1) + ' / ' + row.length +
      (hid ? ' · ' + hid + ' прихов.' : '');
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
    holdSelBar();
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

  /* Змінює розмір виділених точок.
     Кожна точка росте від власного розміру, а не від спільного: якщо на
     кресленні центр кола зумисне більший за вершини, після «+» він має
     лишитися більшим. */
  function stepPoint(dir) {
    if (!cur) return;
    var e = cur.engine;
    var touched = 0;

    e.selection.forEach(function (it) {
      if (it.t !== 'o') return;
      var r = (window.Board && Board.pointR) ? Board.pointR(it) : (it.r || 6);
      var next = dir > 0 ? Math.ceil(r * 1.25) : Math.floor(r / 1.25);
      it.r = U.clamp(next, R_MIN, R_MAX);
      touched++;
    });

    if (!touched) return;
    // наступна точка ставиться таким самим розміром, як щойно налаштована
    var last = e.selection.filter(function (it) { return it.t === 'o'; }).pop();
    if (last) e.setPointSize(last.r);

    holdSelBar();
    e.snapshot();
    e.changed();
    renderOpts();
    updateSelBar();
  }

  /**
   * Перероблює вже проведені лінії на інший вид.
   *
   * Відрізок, промінь, пряма й вектор відрізняються лише тим, як далеко
   * тягнуться від своїх двох точок. Самі точки лишаються на місці, тож
   * перемикати вид можна скільки завгодно й нічого не губиться.
   */
  function setLinkKindOf(kind) {
    if (!cur || !window.Board.LINK_KINDS[kind]) return;
    var e = cur.engine;
    var touched = 0;

    holdSelBar();
    e.selection.forEach(function (it) {
      if (it.t !== 'c') return;
      if ((it.k || 'seg') === kind) return;
      if (kind === 'seg') delete it.k; else it.k = kind;
      touched++;
    });
    if (!touched) return;

    // наступна лінія проводиться така сама
    e.setLinkKind(kind);
    e.snapshot();
    e.changed();
    updateSelBar();
  }

  /** Суцільна лінія чи допоміжна пунктирна. */
  function toggleLinkDash() {
    if (!cur) return;
    var e = cur.engine;
    var lines = e.selection.filter(function (it) { return it.t === 'c'; });
    if (!lines.length) return;

    var on = !lines.every(function (it) { return it.dash; });
    holdSelBar();
    lines.forEach(function (it) { if (on) it.dash = 1; else delete it.dash; });
    e.setLinkDash(on);
    e.snapshot();
    e.changed();
    updateSelBar();
  }

  /* Змінює товщину виділених ліній.

     Потрібне тим самим, чим кнопки розміру точки: креслення вже зроблене,
     і виявилося, що сторони надто тонкі поруч із вершинами. Без цього
     довелося б перемальовувати все заново. */
  function stepStroke(dir) {
    if (!cur) return;
    var e = cur.engine;
    var touched = 0;

    holdSelBar();
    e.selection.forEach(function (it) {
      if (it.t === 'x' || it.t === 'i' || it.t === 'o') return;
      var w = it.w || 3;
      var next = dir > 0 ? Math.ceil(w * 1.3) : Math.floor(w / 1.3);
      it.w = U.clamp(next, W_MIN, W_MAX);
      touched++;
    });

    if (!touched) return;
    // наступна лінія проводиться такою ж, як щойно налаштована
    var last = e.selection.filter(function (it) {
      return it.t !== 'x' && it.t !== 'i' && it.t !== 'o';
    }).pop();
    if (last) {
      if (last.t === 'c') e.setLinkWidth(last.w);
      else e.width = last.w;
    }

    e.snapshot();
    e.changed();
    renderOpts();
    updateSelBar();
  }

  /* --- Панель олівця, лінії та стрілки --- */

  var W_MIN = 1, W_MAX = 24;

  /* Товщина — плавна шкала, а не три готові розміри. Три кроки завжди
     виявлялися або замалими, або завеликими: для підпису під фігурою
     потрібне одне, для виділення відповіді — інше. */
  function strokeWidthHtml() {
    var w = cur.engine.width;
    var d = Math.max(4, Math.min(26, w * 1.25 + 3));
    return '<div><div class="board-opts__label">Товщина</div>' +
      '<div class="w-row">' +
        '<span class="w-preview"><i class="w-dot" data-width-dot style="width:' + d +
          'px;height:' + d + 'px;background:' + cur.engine.color + '"></i></span>' +
        '<input class="w-range" type="range" data-width-range min="' + W_MIN + '" max="' + W_MAX +
          '" step="1" value="' + w + '" title="Товщина ' + w + ' px">' +
        '<span class="w-val" data-width-val>' + w + '</span>' +
      '</div></div>';
  }

  var R_MIN = 2, R_MAX = 40;

  /* Розмір точки — окрема шкала, не товщина лінії.
     Точка на кресленні виконує іншу роботу, ніж штрих: вершину треба бачити
     здалеку, а сторони при цьому лишати тонкими. Поки розмір був похідним
     від товщини пера, збільшити точку означало потовщити все інше. */
  function pointSizeHtml() {
    var r = cur.engine.pointSize || 6;
    var d = Math.max(4, Math.min(28, r * 2));
    return '<div><div class="board-opts__label">Розмір точки</div>' +
      '<div class="w-row">' +
        '<span class="w-preview"><i class="w-dot" data-psize-dot style="width:' + d +
          'px;height:' + d + 'px;background:' + cur.engine.color + '"></i></span>' +
        '<input class="w-range" type="range" data-psize-range min="' + R_MIN + '" max="' + R_MAX +
          '" step="1" value="' + r + '" title="Розмір точки ' + r + ' px">' +
        '<span class="w-val" data-psize-val>' + r + '</span>' +
      '</div></div>';
  }

  /* У зʼєднання власна товщина, не спільна з олівцем.
     Спільна означала б, що товсті сторони фігури роблять товстим і почерк,
     а це різні речі. Поки її не чіпали, вона йде за розміром точки. */
  function linkWidthHtml() {
    var w = cur.engine.linkW();
    var d = Math.max(4, Math.min(26, w * 1.25 + 3));
    return '<div><div class="board-opts__label">Товщина лінії</div>' +
      '<div class="w-row">' +
        '<span class="w-preview"><i class="w-dot" data-lw-dot style="width:' + d +
          'px;height:' + d + 'px;background:' + cur.engine.color + '"></i></span>' +
        '<input class="w-range" type="range" data-lw-range min="' + W_MIN + '" max="' + W_MAX +
          '" step="1" value="' + w + '" title="Товщина лінії ' + w + ' px">' +
        '<span class="w-val" data-lw-val>' + w + '</span>' +
      '</div></div>';
  }

  function stripColorsHtml() {
    return '<div class="strip-group">' + PEN_COLORS.map(function (c) {
      return '<button class="dot-btn dot-btn--color' + (c === cur.engine.color ? ' is-active' : '') +
        '" data-color="' + c + '" title="' + c + '"><i style="background:' + c + '"></i></button>';
    }).join('') + '</div>';
  }

  var SMOOTH_LABELS = ['без корекції', 'легка — гасить дрижання', 'сильна — для схем'];

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
      (cur.engine.fillOn ? 'rgba(75,63,219,.18)' : 'transparent') + '"></span>' +
      (cur.engine.fillOn ? 'Із заливкою' : 'Без заливки') + '</button>';

    var meas = '<button class="fill-toggle' + (cur.engine.showMeasures ? ' is-active' : '') +
      '" data-measures title="Підписувати сторони й кути">' +
      '<span class="fill-toggle__box" style="background:' +
      (cur.engine.showMeasures ? 'rgba(122,90,248,.18)' : 'transparent') +
      ';border-color:var(--violet)"></span>' +
      (cur.engine.showMeasures ? 'Розміри видно' : 'Розміри сховані') + '</button>';

    var labs = '<button class="fill-toggle' + (cur.engine.showLabels ? ' is-active' : '') +
      '" data-labels title="Підписувати вершини літерами A, B, C">' +
      '<span class="fill-toggle__box" style="background:' +
      (cur.engine.showLabels ? 'rgba(75,63,219,.18)' : 'transparent') +
      ';border-color:var(--blue-600)"></span>' +
      (cur.engine.showLabels ? 'Вершини A, B, C' : 'Без підписів') + '</button>';

    var flip = '<button class="fill-toggle' + (cur.engine.flipX ? ' is-active' : '') +
      '" data-flip title="Дзеркально: прямий кут з іншого боку">' +
      '<span class="fill-toggle__box" style="background:' +
      (cur.engine.flipX ? 'rgba(240,138,44,.20)' : 'transparent') +
      ';border-color:var(--orange, #F08A2C)"></span>' +
      (cur.engine.flipX ? 'Дзеркально' : 'Звичайно') + '</button>';

    var info = '<button class="facts-btn" data-facts="' + cur.engine.shape + '">' +
      icon('info', 15) + 'Властивості фігури</button>';

    return '<div><div class="board-opts__label">Фігура</div>' +
      tabs + grid + fill + meas + labs + flip + info + '</div>';
  }

  /* Що проводимо від точки. Малюємо самі значки, а не підписи: між
     відрізком, променем і прямою різниця саме у вигляді, і побачити її
     швидше, ніж прочитати. */
  /* Значки видів ліній. Винесені окремо, бо потрібні двічі: у панелі
     інструмента — щоб обрати, що проводити, і в панелі виділеного — щоб
     передумати вже після побудови. */
  var LINK_GLYPHS = {
      seg:  '<svg viewBox="0 0 34 20" width="34" height="20"><circle cx="7" cy="10" r="2.6" fill="currentColor"/>' +
            '<circle cx="27" cy="10" r="2.6" fill="currentColor"/>' +
            '<path d="M7 10h20" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>',
      ray:  '<svg viewBox="0 0 34 20" width="34" height="20"><circle cx="7" cy="10" r="2.6" fill="currentColor"/>' +
            '<path d="M7 10h26" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>',
      line: '<svg viewBox="0 0 34 20" width="34" height="20">' +
            '<path d="M1 10h32" stroke="currentColor" stroke-width="1.8" fill="none"/>' +
            '<circle cx="12" cy="10" r="2.6" fill="currentColor"/>' +
            '<circle cx="24" cy="10" r="2.6" fill="currentColor"/></svg>',
      vec:  '<svg viewBox="0 0 34 20" width="34" height="20"><circle cx="6" cy="10" r="2.6" fill="currentColor"/>' +
            '<path d="M6 10h20M22 6l5 4-5 4" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>'
  };

  function linkKindsHtml() {
    var cur2 = cur.engine.linkKind || 'seg';
    var glyphs = LINK_GLYPHS;

    var row = Object.keys(window.Board.LINK_KINDS).map(function (k) {
      return '<button class="shape-btn' + (k === cur2 ? ' is-active' : '') +
        '" data-linkkind="' + k + '" title="' + U.esc(Board.LINK_KINDS[k].label) + '">' +
        glyphs[k] + '</button>';
    }).join('');

    return '<div class="board-opts__label">Що проводимо</div>' +
      '<div class="shape-grid shape-grid--wide">' + row + '</div>' +
      '<label class="check" style="padding:6px 2px 0">' +
        '<input type="checkbox" data-linkdash' + (cur.engine.linkDash ? ' checked' : '') + '>' +
        '<span>Пунктиром — допоміжна</span></label>';
  }

  function renderOpts() {
    if (!cur) return;
    var panel = document.querySelector('[data-opts]');
    if (!panel) return;

    var kind = TOOL_OPTS[cur.engine.tool];

    // у інструментів без налаштувань підменю просто немає
    if (!kind) { panel.hidden = true; return; }

    // згорнули — відкриється кліком по тому самому інструменту
    if (optsHidden()) { panel.hidden = true; return; }
    panel.hidden = false;

    var inner = '';
    if (kind === 'stroke') {
      // шкала товщини, під нею кольори, а для олівця ще й корекція почерку
      inner = strokeWidthHtml() +
        '<div class="w-sep"></div>' + stripColorsHtml() +
        (cur.engine.tool === 'pen'
          ? '<div class="w-sep"></div><div class="w-smooth">' + stripSmoothHtml() + '</div>'
          : '');
    }
    else if (kind === 'point') inner = pointSizeHtml() +
      '<div class="w-sep"></div>' + stripColorsHtml();
    else if (kind === 'link') inner = linkKindsHtml() + '<div class="w-sep"></div>' +
      pointSizeHtml() + '<div class="w-sep"></div>' + linkWidthHtml() +
      '<div class="w-sep"></div>' + stripColorsHtml();
    else if (kind === 'text') inner = colorsHtml() + sizesHtml();
    else if (kind === 'shape') inner = shapesHtml() + colorsHtml() + widthsHtml();

    panel.innerHTML = inner;
    panel.classList.toggle('board-opts--wide', kind === 'shape');
    panel.classList.toggle('board-opts--stroke', kind === 'stroke' || kind === 'point');
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
        if (k === 'r' && it.t !== 'o') return;
        it[k] = patch[k];
        if (k === 'c' && it.t === 'g' && it.f) it.f = fillFromColor(patch[k]);
      });
      touched++;
    });
    if (touched) { cur.engine.snapshot(); cur.engine.changed(); }
  }

  function fillFromColor(color) {
    var m = /^#([0-9a-f]{6})$/i.exec(color || '');
    if (!m) return 'rgba(75,63,219,.15)';
    var n = parseInt(m[1], 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',.15)';
  }

  /* ============================================================
     Панель дій над виділеним
     ============================================================ */

  /* Поки людина натискає кнопки розміру, панель стоїть на місці.

     Кнопки «більше/менше» змінюють сам виділений обʼєкт, той росте, межі
     ростуть разом із ним — і панель тікає з-під пальця вже після першого
     натискання. Другий клік потрапляв у полотно й знімав виділення, тож
     збільшити щось на кілька кроків було неможливо.

     Тримаємо позицію короткий час після кожного кроку: цього досить, щоб
     серія натискань спрацювала, і мало, щоб панель не застрягла осторонь,
     коли людина перейшла до іншого обʼєкта. */
  var barHold = 0;

  function holdSelBar() { barHold = Date.now(); }

  function updateSelBar() {
    if (!cur) return;
    var bar = document.querySelector('[data-sel-bar]');
    if (!bar) return;
    var e = cur.engine;
    var n = e.selection.length;

    if (!n || e.band) { bar.hidden = true; return; }

    var b = e.selectionBounds();
    if (!b) { bar.hidden = true; return; }

    /* Товщина — для всього, що має обведення. Розмір точки живе поруч,
       бо на кресленні їх і підбирають разом: вершини помітні, сторони
       тонші за них. */
    var strokeBtns =
      '<button class="sel-bar__btn" data-act="board-stroke-down" title="Тонші лінії">' +
        '<b style="font-size:13px">−</b></button>' +
      '<button class="sel-bar__btn" data-act="board-stroke-up" title="Товщі лінії">' +
        '<b style="font-size:13px">+</b></button>';

    var hasStroke = e.selection.some(function (i) {
      return i.t !== 'x' && i.t !== 'i' && i.t !== 'o';
    });
    var hasPoint = e.selection.some(function (i) { return i.t === 'o'; });

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
    } else if (n === 1 && e.selection[0].t === 's') {
      extra =
        '<button class="sel-bar__btn" data-act="board-solid" title="Тіло, кути, підписи">' +
          icon('target', 16) + '</button>' +
        '<span class="sel-bar__sep"></span>';
    } else if (n === 1 && e.selection[0].t === 'f') {
      extra =
        '<button class="sel-bar__btn" data-act="board-plane" title="Формула, вікно, що показувати">' +
          icon('target', 16) + '</button>' +
        '<span class="sel-bar__sep"></span>';
    } else if (n === 1 && e.selection[0].t === 'n') {
      extra =
        '<button class="sel-bar__btn" data-act="board-numline" title="Діапазон і крок осі">' +
          icon('target', 16) + '</button>' +
        '<button class="sel-bar__btn" data-act="board-ineq" title="Нерівність: точки та інтервали">' +
          icon('sigma', 16) + '</button>' +
        '<span class="sel-bar__sep"></span>';
    } else if (e.selection.every(function (i) { return i.t === 'c'; })) {
      /* Що саме проводили — відрізок, промінь чи пряму — видно аж на
         кресленні, і передумати тут природніше, ніж перемальовувати.
         Значок показує поточний вид, підсвічений — обраний. */
      var kinds = {};
      e.selection.forEach(function (i) { kinds[i.k || 'seg'] = 1; });
      var one = Object.keys(kinds).length === 1 ? Object.keys(kinds)[0] : null;

      extra = Object.keys(window.Board.LINK_KINDS).map(function (k) {
        return '<button class="sel-bar__btn sel-bar__btn--kind' +
          (k === one ? ' is-on' : '') + '" data-act="board-link-kind" data-arg="' + k +
          '" title="' + U.esc(Board.LINK_KINDS[k].label) + '">' + LINK_GLYPHS[k] + '</button>';
      }).join('') +
        '<button class="sel-bar__btn' +
          (e.selection.every(function (i) { return i.dash; }) ? ' is-on' : '') +
          '" data-act="board-link-dash" title="Пунктиром — допоміжна">' +
          '<svg viewBox="0 0 20 20" width="16" height="16"><path d="M2 10h4M9 10h3M15 10h3" ' +
          'stroke="currentColor" stroke-width="2" fill="none"/></svg></button>' +
        strokeBtns +
        '<span class="sel-bar__sep"></span>';
    } else if (hasPoint) {
      extra =
        '<button class="sel-bar__btn" data-act="board-point-down" title="Менші точки">' +
          '<b style="font-size:9px">●−</b></button>' +
        '<button class="sel-bar__btn" data-act="board-point-up" title="Більші точки">' +
          '<b style="font-size:14px">●+</b></button>' +
        (hasStroke ? strokeBtns : '') +
        '<span class="sel-bar__sep"></span>';
    } else if (hasStroke) {
      extra = strokeBtns + '<span class="sel-bar__sep"></span>';
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
    if (bar.style.left && Date.now() - barHold < 900) return;

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

    /* Кнопка групи світиться, коли обраний інструмент саме з неї, і
       показує його значок. Інакше після закриття панелі незрозуміло, чим
       ти зараз малюєш. */
    var g = groupOf(id);
    U.$$('[data-group]').forEach(function (b) {
      var mine = b.dataset.group === g;
      b.classList.toggle('is-active', mine);
      var def = GROUPS.filter(function (x) { return x.id === b.dataset.group; })[0];
      var want = mine ? id : (def && def.icon);
      var t = TOOLS.filter(function (x) { return x.id === want; })[0];
      var glyph = mine && t ? t.icon : (def && def.icon);
      if (glyph && b.dataset.glyph !== glyph) {
        b.dataset.glyph = glyph;
        b.innerHTML = icon(glyph, 20) + '<i class="tool-btn__caret"></i>';
      }
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

  /**
   * Додати одну або кілька картинок.
   *
   * Раніше з кількох файлів бралася лише перша, і решта зникали без жодного
   * слова — саме звідси «не всі файли зберігаються на дошці». Тепер беремо
   * всі, по черзі: паралельно вони змагалися б за одну й ту саму позицію.
   *
   * at — необов'язкова точка на полотні; без неї беремо позицію курсора.
   */
  function insertImageFiles(files, at) {
    if (!cur) return;
    if (!window.ImgStore || !window.ImgStore.available()) {
      U.toast('Браузер не дає зберігати картинки (немає IndexedDB)', 'err');
      return;
    }

    var list = Array.prototype.slice.call(files || [])
      .filter(function (f) { return f && /^image\//.test(f.type || ''); });

    if (!list.length) {
      U.toast('Це не картинка — підійдуть PNG, JPG, WebP', 'err');
      return;
    }

    // позицію фіксуємо зараз: поки картинка стискається, курсор може зʼїхати
    var spot = at || (cur.engine.lastPointer
      ? { x: cur.engine.lastPointer.x, y: cur.engine.lastPointer.y } : null);

    U.toast(list.length > 1
      ? 'Обробляю ' + U.pl(list.length, 'картинку', 'картинки', 'картинок') + '…'
      : 'Обробляю картинку…');

    var added = 0, failed = 0, bytes = 0;
    var chain = Promise.resolve();

    list.forEach(function (file, i) {
      chain = chain.then(function () {
        return window.ImgStore.ingest(file).then(function (meta) {
          if (!cur) return;
          // кожну наступну зсуваємо, щоб вони не лягали одна на одну
          var at2 = spot ? { x: spot.x + i * 28, y: spot.y + i * 28 } : null;
          cur.engine.addImage(meta, at2);
          added++;
          bytes += meta.bytes || 0;
        }).catch(function (e) {
          failed++;
          console.warn('Картинка не додалася:', file.name, e && e.message);
        });
      });
    });

    chain.then(function () {
      if (!cur) return;
      flushSave();
      renderRail();
      if (added) {
        U.toast('Додано ' + U.pl(added, 'картинку', 'картинки', 'картинок') +
          ' · ' + Math.max(1, Math.round(bytes / 1024)) + ' КБ', 'ok');
      }
      // про невдачі кажемо окремо: мовчки втрачати файли не можна
      if (failed) {
        U.toast('Не вдалося додати ' + U.pl(failed, 'файл', 'файли', 'файлів') +
          ' — можливо, це не картинки', 'err');
      }
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
                l: 'line', a: 'arrow', n: 'numline', k: 'plane', j: 'solid', o: 'point', c: 'link', h: 'hand' };
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
    // гортаємо свій рядок, а не перескакуємо з уроку в ДЗ посеред пояснення
    if (e.key === 'PageDown') { e.preventDefault(); stepSlide(1); return; }
    if (e.key === 'PageUp') { e.preventDefault(); stepSlide(-1); return; }
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

  /**
   * Діапазон і крок числової осі.
   *
   * Три числа, бо саме їх і міняють: від, до, крок. Решта — підписи,
   * ділення, стрілка — рахується сама, і питати про це означало б
   * перекладати на людину роботу програми.
   */
  /**
   * Що не так із числами осі. Порожній рядок означає «все гаразд».
   *
   * Найважливіший тут третій випадок. «Крок» природно прочитати як
   * «кількість ділень», і тоді на діапазоні від −5 до 5 з'являється крок
   * 100 — а вісь виходить порожня, бо в десятку сто не вміщається жодного
   * разу. Тому повідомлення не просто відмовляє, а називає те число, яке
   * людина насправді мала на увазі.
   */
  function numlineProblem(from, to, step) {
    if (!isFinite(from) || !isFinite(to)) return 'Введіть числа для «Від» і «До»';
    if (!(to > from)) return '«До» має бути більше за «Від»';
    if (!(step > 0)) return 'Крок має бути додатним';

    var span = to - from;
    if (step > span) {
      var want = trimNum(span / 100);
      return 'Крок ' + trimNum(step) + ' більший за весь діапазон (' + trimNum(span) +
        ') — жодного ділення не вийде. Крок — це відстань між поділками. ' +
        'Для ста ділень тут потрібен крок ' + want;
    }
    if (span / step > 400) return 'Забагато ділень — збільште крок';
    return '';
  }

  /** Коротке число без хвоста нулів: 0.1, а не 0.10000000000000001. */
  function trimNum(n) {
    if (!isFinite(n)) return '?';
    return String(Math.round(n * 1e6) / 1e6);
  }

  /**
   * Прочитати число з поля, де дозволено писати дробом.
   *
   * Приймає «0.5», «1/3», «-2/3» і мішане «1 1/2». Кома як десятковий
   * роздільник — теж: на українській розкладці її натискають частіше за
   * крапку, і мовчазне NaN через це виглядало б як зламане поле.
   */
  function numValue(text) {
    var s = String(text == null ? '' : text).trim().replace(/,/g, '.').replace(/\s+/g, ' ');
    if (!s) return NaN;

    var mixed = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (mixed) {
      var whole = Number(mixed[1]), den0 = Number(mixed[3]);
      if (!den0) return NaN;
      var part = Number(mixed[2]) / den0;
      return whole < 0 ? whole - part : whole + part;
    }

    var frac = s.match(/^(-?\d*\.?\d+)\s*\/\s*(-?\d*\.?\d+)$/);
    if (frac) {
      var den = Number(frac[2]);
      return den ? Number(frac[1]) / den : NaN;
    }

    if (/^-?\d*\.?\d+$/.test(s)) return Number(s);

    /* Усе складніше віддаємо обчислювачу формул: sqrt(5), pi/3, log2(8),
       2^(1/3). Інакше такі числа неможливо було б поставити на пряму —
       а саме вони й стоять у задачах про корені та логарифми. */
    if (window.Plot && Plot.compile) {
      var r = Plot.compile(s);
      if (r.f) {
        var v = r.f(0);
        if (isFinite(v)) return v;
      }
    }
    return NaN;
  }

  /**
   * Як показати збережене число в полі.
   *
   * Десятковим — коли він записує число точно. Інакше дробом: ⅓ у полі як
   * «0.333333» при наступному «Застосувати» збереглося б саме таким, і
   * підписи дробами мовчки перетворилися б на десяткові.
   */
  function numText(v) {
    if (v == null || !isFinite(v)) return '';
    var t = trimNum(v);
    if (Number(t) === v) return t;
    var f = window.Board && Board.toFraction ? Board.toFraction(v) : null;
    return (f && f.d !== 1) ? f.n + '/' + f.d : String(v);
  }

  function numFmtOf(it) {
    var f = it && it.fmt;
    return (f === 'frac' || f === 'both' || f === 'both-dec' ||
            f === 'pi' || f === 'root' || f === 'auto') ? f : 'dec';
  }

  /**
   * Той самий дріб, що й на осі, — щоб підказка не обіцяла одного, а
   * малюнок давав інше. Логіка навмисно повторює рушій дошки, бо це
   * єдина річ, яку вона має показувати правдиво.
   */
  function fracText(v) {
    var f = window.Board && Board.toFraction ? Board.toFraction(v) : null;
    if (!f || f.d === 1) return null;
    return f.n + '/' + f.d;
  }

  /** Що вийде з цих чисел — видно ще до натискання «Застосувати». */
  function numlinePreview(from, to, step, fmt) {
    var bad = numlineProblem(from, to, step);
    if (bad) return '<span style="color:var(--red)">' + U.esc(bad) + '</span>';

    function label(v) {
      /* Десятковий беремо в самої дошки: підказка не має обіцяти
         «0.333333», коли на осі буде «0.33». */
      var dec = (window.Board && Board.numLabel) ? Board.numLabel(v, step) : trimNum(v);
      if (fmt === 'dec') return dec;

      // π і корені — те саме правило, що й на осі, і в тому самому порядку
      if (fmt === 'pi' || fmt === 'root' || fmt === 'auto') {
        var sp = Math.abs(v) < 1e-12 ? '0' : null;
        if ((fmt === 'pi' || fmt === 'auto') && Board.piLabel) sp = Board.piLabel(v);
        if (!sp && (fmt === 'root' || fmt === 'auto') && Board.rootLabel) sp = Board.rootLabel(v);
        if (sp) return sp;
        if (fmt === 'pi' || fmt === 'root') return dec;
      }

      // те саме правило, що й на осі: ціле лишається цілим, без хвоста
      var whole = window.Board && Board.toFraction ? Board.toFraction(v) : null;
      if (whole && whole.d === 1) return String(whole.n);

      var f = fracText(v);
      if (!f) return dec;                       // не поділилося — лишається десятковий
      if (fmt === 'both') return f + ' (' + dec + ')';
      if (fmt === 'both-dec') return dec + ' (' + f + ')';
      return f;
    }

    var count = Math.round((to - from) / step);
    var sample = [];
    for (var k = 0; k <= count && sample.length < 4; k++) {
      sample.push(label(from + k * step));
    }
    // якщо показали не всі — кінець осі має бути видно, інакше число поділок
    // і перелік суперечать одне одному
    var tail = sample.length <= count ? ' … ' + label(to) : '';

    return '<b>' + U.pl(count + 1, 'поділка', 'поділки', 'поділок') + '</b>: ' +
      U.esc(sample.join(', ')) + U.esc(tail);
  }

  /**
   * Налаштування координатної площини.
   *
   * Формула перевіряється просто під час набирання: порожній графік без
   * пояснення — найгірше, що може статися, бо не видно, чи справа в формулі,
   * чи у вікні.
   */
  /**
   * Яке тіло, під яким кутом і з якими підписами.
   *
   * Кути числами — на додачу до маркера обертання: «поверни рівно на 45»
   * мишею не зробиш, а на уроці це трапляється постійно.
   */
  function solidDialog(it) {
    var K = window.Solids ? Solids.KINDS : {};
    var list = Object.keys(K);

    function tiles() {
      return '<div class="solid-grid">' + list.map(function (k) {
        return '<button type="button" class="solid-tile' + (it.k === k ? ' is-on' : '') +
          '" data-kind="' + k + '">' + U.esc(K[k].label) + '</button>';
      }).join('') + '</div>';
    }

    C.modal({
      title: 'Стереометрія',
      sub: 'тіло, кути й підписи',
      wide: true,
      body:
        tiles() +
        '<div class="field-row" style="margin-top:14px">' +
          C.field('Поворот, °', C.input('yaw', Math.round(it.yaw || 0), 'type="number" step="5"')) +
          C.field('Нахил, °', C.input('pitch', Math.round(typeof it.pitch === 'number' ? it.pitch : 22),
            'type="number" step="5" min="-80" max="80"')) +
        '</div>' +
        '<div class="check-row">' +
          '<label class="check"><input type="checkbox" name="lb"' + (it.lb !== 0 ? ' checked' : '') +
            '><span>Підписи вершин</span></label>' +
          '<label class="check"><input type="checkbox" name="hid"' + (it.hid !== 0 ? ' checked' : '') +
            '><span>Невидимі ребра пунктиром</span></label>' +
          '<label class="check"><input type="checkbox" name="live"' + (it.live ? ' checked' : '') +
            '><span>Учень може обертати</span></label>' +
        '</div>' +
        '<div class="field__hint" style="margin-top:10px">Тіло можна обертати й мишею — ' +
        'помаранчевий маркер над ним: убік крутить, вгору-вниз нахиляє. ' +
        'Зелені маркери на вершинах тягнуть саму вершину: мишею — у площині ' +
        'екрана, із Shift — угору-вниз по висоті.' +
        (it.mv && Object.keys(it.mv).length
          ? ' <button type="button" class="btn btn--ghost btn--sm" data-reset-mv ' +
            'style="margin-top:8px">Повернути правильну форму</button>'
          : '') + '</div>' +
        '<div data-solid-extra></div>',
      onMount: function (root) {
        var extra = root.querySelector('[data-solid-extra]');

        /* Побудови й переріз показуємо лише для многогранників: у кулі
           немає ні вершин, ні граней, тож і різати її через три вершини
           нема через що. */
        function renderExtra(kind) {
          var d = K[kind];
          if (!d || !window.Solids) { extra.innerHTML = ''; return; }

          /* У кулі, циліндра й конуса граней немає, тож переріз через три
             вершини до них не застосовний. Зате саме для них у школі
             потрібні два свої: осьовий і паралельний основі. */
          if (d.round) {
            var cur0 = (it.rsec && it.rsec.k) || '';
            extra.innerHTML =
              '<div class="dim-sep" style="margin:16px 0 12px"></div>' +
              '<div class="board-opts__label" style="margin-bottom:8px">Переріз</div>' +
              '<div class="field-row">' +
                C.field('', C.select('rk', cur0, [
                  { value: '', label: 'Без перерізу' },
                  { value: 'axial', label: Solids.RSEC.axial },
                  { value: 'parallel', label: Solids.RSEC.parallel }
                ])) +
                C.field('Висота, % від низу',
                  C.input('rt', Math.round(((it.rsec && it.rsec.t) || 0.5) * 100),
                          'type="number" min="2" max="98" step="5"')) +
              '</div>' +
              '<div class="field__hint">Висота стосується лише перерізу, ' +
              'паралельного основі. Осьовий проходить через вісь і збігається з ' +
              'обрисом тіла — тому він залитий, інакше його не було б видно.</div>';
            return;
          }

          var have = {};
          (it.cons || []).forEach(function (c) { have[c.k] = 1; });

          var opts = Solids.pointsOf(kind).map(function (p) {
            return { value: p.id, label: p.name };
          });
          var picked = (it.sec && it.sec.length === 3) ? it.sec
            : [opts[0] && opts[0].value, opts[1] && opts[1].value, opts[2] && opts[2].value];

          extra.innerHTML =
            '<div class="dim-sep" style="margin:16px 0 12px"></div>' +
            '<div class="board-opts__label" style="margin-bottom:8px">Побудови</div>' +
            '<div class="check-row">' +
              Object.keys(Solids.CONS).map(function (ck) {
                return '<label class="check"><input type="checkbox" name="c_' + ck + '"' +
                  (have[ck] ? ' checked' : '') + '><span>' + U.esc(Solids.CONS[ck]) +
                  '</span></label>';
              }).join('') +
            '</div>' +
            '<div class="board-opts__label" style="margin:16px 0 8px">Переріз через три точки</div>' +
            '<div class="field-row field-row--4">' +
              C.field('', C.select('s1', picked[0], opts)) +
              C.field('', C.select('s2', picked[1], opts)) +
              C.field('', C.select('s3', picked[2], opts)) +
              C.field('', '<label class="check" style="padding-top:9px">' +
                '<input type="checkbox" name="secOn"' + (it.sec && it.sec.length === 3 ? ' checked' : '') +
                '><span>Показати</span></label>') +
            '</div>' +
            '<div data-sec-note class="field__hint"></div>';

          function note() {
            var vv = C.readForm(root);
            var box = extra.querySelector('[data-sec-note]');
            if (!box) return;
            var r = Solids.section(kind, [vv.s1, vv.s2, vv.s3]);
            /* Число тут — частина слова («6-кутник»), а не окрема кількість,
               тож відмінювати нічого не треба: «6-кутників» — це нісенітниця. */
            box.innerHTML = r
              ? 'Вийде ' + r.poly.length + '-кутник.'
              : '<span style="color:var(--red)">Ці три точки лежать на одній прямій — ' +
                'площину через них не провести.</span>';
          }
          U.$$('select', extra).forEach(function (sel) { sel.addEventListener('change', note); });
          note();
        }

        U.onClick(root, '[data-reset-mv]', function (el) {
          cur.engine.snapshot();
          delete it.mv;
          cur.engine.changed();
          el.disabled = true;
          el.textContent = 'Повернуто';
        });

        U.onClick(root, '[data-kind]', function (el) {
          U.$$('[data-kind]', root).forEach(function (b) { b.classList.remove('is-on'); });
          el.classList.add('is-on');
          root.setAttribute('data-picked', el.dataset.kind);
          var d = K[el.dataset.kind];
          if (d && d.yaw0 != null) root.querySelector('[name="yaw"]').value = d.yaw0;
          renderExtra(el.dataset.kind);
        });

        renderExtra(it.k || 'cube');
      },
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Застосувати', kind: 'btn--primary', act: 'save', icon: 'check',
          onClick: function (root) {
            var vv = C.readForm(root);
            var picked = root.getAttribute('data-picked') || it.k || 'cube';
            if (!K[picked]) { U.toast('Такого тіла немає', 'err'); return false; }

            cur.engine.snapshot();
            it.k = picked;
            it.yaw = Number(vv.yaw) || 0;
            it.pitch = Math.max(-80, Math.min(80, Number(vv.pitch) || 0));
            it.lb = vv.lb ? 1 : 0;
            it.hid = vv.hid ? 1 : 0;
            it.live = vv.live ? 1 : 0;

            var cons = [];
            if (window.Solids) {
              Object.keys(Solids.CONS).forEach(function (ck) {
                if (vv['c_' + ck]) cons.push({ k: ck, i: 0 });
              });
            }
            it.cons = cons;
            it.sec = (vv.secOn && vv.s1 && vv.s2 && vv.s3) ? [vv.s1, vv.s2, vv.s3] : null;
            it.rsec = vv.rk
              ? { k: vv.rk, t: Math.max(0.02, Math.min(0.98, (Number(vv.rt) || 50) / 100)) }
              : null;

            cur.engine.changed();
          } }
      ]
    });
  }

  function planeDialog(it) {
    function chk(name, on, label) {
      return '<label class="check"><input type="checkbox" name="' + name + '"' +
        (on ? ' checked' : '') + '><span>' + label + '</span></label>';
    }

    C.modal({
      title: 'Координатна площина',
      sub: 'формула, вікно й що показувати',
      wide: true,
      body:
        C.field('Формула f(x)', C.input('ex', it.ex || 'x^2', 'inputmode="text"'),
          'Можна писати як звично: x^2-3x+1, 2sin(x), sqrt(x), 1/x') +
        '<div data-plane-check style="margin:-4px 0 14px;line-height:1.5"></div>' +

        '<div class="board-opts__label" style="margin:6px 0 8px">Вікно</div>' +
        '<div class="field-row field-row--4">' +
          C.field('x від', C.input('xa', it.xa, 'inputmode="text"')) +
          C.field('x до', C.input('xb', it.xb, 'inputmode="text"')) +
          C.field('y від', C.input('ya', it.ya, 'inputmode="text"')) +
          C.field('y до', C.input('yb', it.yb, 'inputmode="text"')) +
        '</div>' +

        '<div class="board-opts__label" style="margin:6px 0 8px">Точки на графіку</div>' +
        '<div class="field-row field-row--3">' +
          C.field('x₁', C.input('p1', it.p1, 'inputmode="text"')) +
          C.field('x₂', C.input('p2', it.p2, 'inputmode="text"')) +
          C.field('', '<div class="field__hint" style="padding-top:9px">Точки ' +
            'можна просто тягнути мишею на самій площині.</div>') +
        '</div>' +

        '<div class="board-opts__label" style="margin:6px 0 8px">Показувати</div>' +
        '<div class="check-row">' +
          chk('grid', it.grid !== 0, 'Сітку') +
          chk('nums', it.nums !== 0, 'Числа на осях') +
          chk('pts', it.pts !== 0, 'Точки й проєкції') +
          chk('hlab', it.hlab !== 0, 'Приріст h') +
          chk('sec', !!it.sec, 'Січну через дві точки') +
          chk('tan', !!it.tan, 'Дотичну в x₁') +
          chk('quot', !!it.quot, 'Різницеве відношення') +
          chk('integ', !!it.integ, 'Визначений інтеграл — площа') +
          chk('live', !!it.live, 'Учень може рухати точку') +
        '</div>' +
        '<div class="field-row" style="margin-top:10px">' +
          C.field('Інтеграл від', C.input('ia', it.ia != null ? it.ia : it.xa, 'inputmode="text"')) +
          C.field('до', C.input('ib', it.ib != null ? it.ib : it.xb, 'inputmode="text"')) +
        '</div>' +
        '<div class="field__hint">Площа рахується між графіком і віссю: там, де ' +
        'крива нижча за нуль, вона віднімається — така частина фарбується червоним. ' +
        'Число видно в кутку.</div>',
      onMount: function (root) {
        var box = root.querySelector('[data-plane-check]');
        function refresh() {
          var v = C.readForm(root);
          var r = window.Plot ? Plot.compile(v.ex) : { err: 'Модуль формул не завантажився' };
          box.innerHTML = r.err
            ? '<span style="color:var(--red)">' + U.esc(r.err) + '</span>'
            : '<span class="muted">Формула читається: f(1) = ' +
              U.esc(String(Math.round(r.f(1) * 1000) / 1000)) + ', f(2) = ' +
              U.esc(String(Math.round(r.f(2) * 1000) / 1000)) + '</span>';
        }
        var inp = root.querySelector('[name="ex"]');
        inp.addEventListener('input', refresh);
        refresh();
      },
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Застосувати', kind: 'btn--primary', act: 'save', icon: 'check',
          onClick: function (root) {
            var v = C.readForm(root);
            var r = window.Plot ? Plot.compile(v.ex) : { err: 'Модуль формул не завантажився' };
            if (r.err) { U.toast(r.err, 'err'); return false; }

            var xa = numValue(v.xa), xb = numValue(v.xb);
            var ya = numValue(v.ya), yb = numValue(v.yb);
            if (!(xb > xa)) { U.toast('По x: «до» має бути більше за «від»', 'err'); return false; }
            if (!(yb > ya)) { U.toast('По y: «до» має бути більше за «від»', 'err'); return false; }

            var p1 = numValue(v.p1), p2 = numValue(v.p2);
            if (isNaN(p1) || isNaN(p2)) { U.toast('x₁ і x₂ мають бути числами', 'err'); return false; }

            cur.engine.snapshot();
            it.ex = String(v.ex).trim();
            it.xa = xa; it.xb = xb; it.ya = ya; it.yb = yb;
            it.p1 = Math.max(xa, Math.min(xb, p1));
            it.p2 = Math.max(xa, Math.min(xb, p2));
            ['grid', 'nums', 'pts', 'hlab', 'sec', 'tan', 'quot', 'integ', 'live'].forEach(function (k) {
              it[k] = v[k] ? 1 : 0;
            });

            var ia = numValue(v.ia), ib = numValue(v.ib);
            it.ia = isNaN(ia) ? xa : Math.max(xa, Math.min(xb, ia));
            it.ib = isNaN(ib) ? xb : Math.max(xa, Math.min(xb, ib));
            cur.engine.changed();
          } }
      ]
    });
  }

  /**
   * Нерівність на числовій прямій — метод інтервалів.
   *
   * Вводиться так, як стоїть у задачі: вираз і знак. Далі програма робить
   * те саме, що робить рука на дошці, — знаходить нулі й розриви, ставить
   * точки, розставляє знаки й підкреслює відповідь. Вручну теж можна: не
   * кожна нерівність зводиться до одного виразу.
   */
  function ineqDialog(it) {
    C.modal({
      title: 'Нерівність на прямій',
      sub: 'метод інтервалів',
      wide: true,
      body:
        '<div class="field-row" style="grid-template-columns:3fr 1fr">' +
          C.field('Вираз', C.input('ex', it.ex || 'x^2-5x+6', 'inputmode="text"'),
            'Ліва частина, коли справа нуль: x^2-5x+6, (x-1)/(x-2), (x+3)(x-4)') +
          C.field('Знак', C.select('op', it.op || '>', [
            { value: '>', label: '> 0' }, { value: '>=', label: '≥ 0' },
            { value: '<', label: '< 0' }, { value: '<=', label: '≤ 0' }
          ])) +
        '</div>' +
        '<div data-ineq-out style="margin:2px 0 14px;line-height:1.6"></div>' +
        '<div class="check-row">' +
          '<label class="check"><input type="checkbox" name="showSigns"' +
            (it.showSigns !== 0 ? ' checked' : '') + '><span>Знаки + і − між точками</span></label>' +
          '<label class="check"><input type="checkbox" name="fit"' +
            ' checked><span>Підігнати діапазон осі під точки</span></label>' +
        '</div>' +
        '<div class="field__hint" style="margin-top:10px">Нулі й розриви шукаються перебором, ' +
        'тож розкладати на множники не потрібно. Розрив ніколи не входить у відповідь, ' +
        'навіть при знаку ≥.</div>',
      onMount: function (root) {
        var box = root.querySelector('[data-ineq-out]');
        function refresh() {
          var v = C.readForm(root);
          var r = window.Plot ? Plot.compile(v.ex) : { err: 'Модуль формул не завантажився' };
          if (r.err) {
            box.innerHTML = '<span style="color:var(--red)">' + U.esc(r.err) + '</span>';
            return null;
          }
          var lo = typeof it.from === 'number' ? it.from : -5;
          var hi = typeof it.to === 'number' ? it.to : 5;
          var wide = Math.max(20, (hi - lo) * 3);
          var sol = Plot.solveIneq(r.f, v.op, -wide, wide);

          var pts = sol.points.map(function (p) {
            return trimNum(p.x) + (p.kind === 'pole' ? ' (розрив)' : '');
          });
          box.innerHTML =
            '<div class="muted">' + (pts.length
              ? 'Точки: ' + U.esc(pts.join(', '))
              : 'Особливих точок немає — вираз не змінює знак') + '</div>' +
            '<div style="color:var(--blue-600);font-weight:700;margin-top:4px">' +
              U.esc(answerText(sol, -wide, wide)) + '</div>';
          return { sol: sol, lo: -wide, hi: wide };
        }
        U.$$('input, select', root).forEach(function (i) {
          i.addEventListener('input', refresh);
          i.addEventListener('change', refresh);
        });
        refresh();
      },
      buttons: [
        { label: 'Прибрати позначки', kind: 'btn--ghost', act: 'clear',
          onClick: function () {
            cur.engine.snapshot();
            it.marks = []; it.spans = []; it.signs = []; it.ans = '';
            cur.engine.changed();
          } },
        { label: 'Побудувати', kind: 'btn--primary', act: 'save', icon: 'check',
          onClick: function (root) {
            var v = C.readForm(root);
            var r = window.Plot ? Plot.compile(v.ex) : { err: 'Модуль формул не завантажився' };
            if (r.err) { U.toast(r.err, 'err'); return false; }

            var lo = typeof it.from === 'number' ? it.from : -5;
          var hi = typeof it.to === 'number' ? it.to : 5;
            var wide = Math.max(20, (hi - lo) * 3);
            var sol = Plot.solveIneq(r.f, v.op, -wide, wide);

            cur.engine.snapshot();

            /* Вісь підганяємо під знайдені точки: інакше найчастіший
               випадок — усі корені за краєм видимого шматка прямої. */
            if (v.fit && sol.points.length) {
              var xs = sol.points.map(function (p) { return p.x; });
              var mn = Math.min.apply(null, xs), mx = Math.max.apply(null, xs);
              var pad = Math.max(1, (mx - mn) * 0.45);
              it.from = Math.floor(mn - pad);
              it.to = Math.ceil(mx + pad);
              if (it.to - it.from < 2) { it.from -= 1; it.to += 1; }

              /* Крок цілий, поки вісь не надто довга: корені зазвичай цілі,
                 і вони мають стояти саме на поділках. При кроці 1.5 точка
                 −3 опинялася між рисками, і побудова читалася як неточна. */
              var wide2 = it.to - it.from;
              it.step = wide2 <= 24 ? 1 : Math.ceil(wide2 / 12);
            }

            it.ex = String(v.ex).trim();
            it.op = v.op;
            it.showSigns = v.showSigns ? 1 : 0;
            it.marks = sol.marks;
            it.signs = sol.signs;
            it.spans = sol.spans;
            it.ans = answerText(sol, -wide, wide);
            cur.engine.changed();
          } }
      ]
    });
  }

  /** Відповідь у звичному записі: x ∈ (−∞; 2) ∪ [3; +∞). */
  function answerText(sol, lo, hi) {
    if (!sol.spans.length) return 'Розвʼязків немає';
    // мінус усюди один і той самий: поруч із −∞ дефіс виглядає як помилка
    function num(v) { return trimNum(v).replace('-', '−'); }
    return 'x ∈ ' + sol.spans.map(function (g) {
      var aInf = g.a <= lo + 1e-9, bInf = g.b >= hi - 1e-9;
      var openA = true, openB = true;
      sol.marks.forEach(function (m) {
        if (Math.abs(m.x - g.a) < 1e-9) openA = !!m.o;
        if (Math.abs(m.x - g.b) < 1e-9) openB = !!m.o;
      });
      return (aInf || openA ? '(' : '[') + (aInf ? '−∞' : num(g.a)) + '; ' +
             (bInf ? '+∞' : num(g.b)) + (bInf || openB ? ')' : ']');
    }).join(' ∪ ');
  }

  function numlineDialog(it) {
    C.modal({
      title: 'Числова вісь',
      sub: 'діапазон і крок',
      body:
        /* Поля текстові, а не числові. Числове не пускає скісну риску, а
           без неї крок ⅓ ввести неможливо — тобто підписи звичайними
           дробами не мали б звідки взятися. */
        '<div class="field-row field-row--3">' +
          C.field('Від', C.input('from', numText(it.from), 'inputmode="text"')) +
          C.field('До', C.input('to', numText(it.to), 'inputmode="text"')) +
          C.field('Крок', C.input('step', numText(it.step), 'inputmode="text"')) +
        '</div>' +
        '<div class="field__hint">Крок — це відстань між сусідніми поділками, ' +
        'а не їх кількість. Можна писати дробом: <b>1/3</b>, <b>3/4</b>, <b>1 1/2</b> — ' +
        'або формулою: <b>pi/2</b>, <b>sqrt(2)</b>, <b>log2(8)</b>.</div>' +
        C.field('Підписи', C.select('fmt', numFmtOf(it), [
          { value: 'auto',     label: 'Сама — π, корінь, дріб або десятковий' },
          { value: 'dec',      label: 'Десятковим дробом — 0.5' },
          { value: 'frac',     label: 'Звичайним дробом — ½' },
          { value: 'pi',       label: 'Через π — π/2, 3π/2' },
          { value: 'root',     label: 'Через корінь — √2, 2√3' },
          { value: 'both',     label: 'Обидва: зверху звичайний — ½, під ним 0.5' },
          { value: 'both-dec', label: 'Обидва: зверху десятковий — 0.5, під ним ½' }
        ])) +
        '<div data-nl-preview style="margin-top:10px;padding:10px 12px;' +
          'background:var(--bg);border-radius:var(--r-sm);line-height:1.55"></div>' +
        '<div class="field__hint" style="margin-top:10px">Підписи ставляться через стільки ' +
        'ділень, скільки вміщається, — щоб числа не наповзали. Стрілка завжди праворуч.</div>',
      onMount: function (root) {
        var box = root.querySelector('[data-nl-preview]');
        function refresh() {
          var v = C.readForm(root);
          box.innerHTML = numlinePreview(numValue(v.from), numValue(v.to), numValue(v.step), v.fmt);
        }
        U.$$('input, select', root).forEach(function (i) {
          i.addEventListener('input', refresh);
          i.addEventListener('change', refresh);
        });
        refresh();
      },
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Застосувати', kind: 'btn--primary', act: 'save', icon: 'check',
          onClick: function (root) {
            var v = C.readForm(root);
            var from = numValue(v.from), to = numValue(v.to), step = numValue(v.step);
            var bad = numlineProblem(from, to, step);
            if (bad) { U.toast(bad, 'err'); return false; }

            cur.engine.snapshot();
            it.from = from; it.to = to; it.step = step;
            it.fmt = ['frac', 'both', 'both-dec', 'pi', 'root', 'auto'].indexOf(v.fmt) >= 0
              ? v.fmt : 'dec';
            cur.engine.changed();
          } }
      ]
    });
  }

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
    'board-rail-toggle': function () { toggleRail(); },
    /* Повторна спроба вручну. Потрібна, коли зв'язок пропав саме в мить
       відправлення: сама собою вона не повториться, бо дошка не змінюється. */
    'board-republish': function () {
      if (!cur || !cur.board.share) return;
      cur.republishedAt = 0;                 // не чекаємо паузу — людина попросила зараз
      scheduleRepublish();
    },
    'board-save-view': function () {
      if (cur.engine.saveCurrentView()) {
        flushSave();
        U.toast('Цей вигляд слайда стане початковим', 'ok');
      }
    },
    'board-solid': function () {
      var it = cur && cur.engine.selection[0];
      if (it && it.t === 's') solidDialog(it);
    },
    'board-plane': function () {
      var it = cur && cur.engine.selection[0];
      if (it && it.t === 'f') planeDialog(it);
    },
    'board-ineq': function () {
      var it = cur && cur.engine.selection[0];
      if (it && it.t === 'n') ineqDialog(it);
    },
    'board-numline': function () {
      var it = cur && cur.engine.selection[0];
      if (it && it.t === 'n') numlineDialog(it);
    },
    'board-saved': function () {
      var s2 = savedState();
      U.toast(SAVED_LOOK[s2.key].text + '. ' + (s2.note || ''), s2.key === 'saved' ? 'ok' : 'err');
      // «не доїхало» — найчастіше просто зник зв'язок; пробуємо ще раз одразу
      if ((s2.key === 'fail' || s2.key === 'queue') && window.BoardSync && cur) {
        BoardSync.push(cur.lessonId).then(paintSaved);
      }
    },
    'board-history': function () { historyDialog(); },
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
    'board-link-kind': function (arg) { setLinkKindOf(arg); },
    'board-link-dash': function () { toggleLinkDash(); },
    'board-stroke-up': function () { stepStroke(1); },
    'board-stroke-down': function () { stepStroke(-1); },
    'board-point-up': function () { stepPoint(1); },
    'board-point-down': function () { stepPoint(-1); },
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
    'board-slide-add': function (arg) { addSlide(null, arg || null); },
    'board-slides-photos': function () { document.querySelector('[data-multi-input]').click(); },
    'board-slide-dup': function () { addSlide(slide()); },
    'board-slide-hide': function () { toggleSlideHidden(); },
    'board-slide-move-row': function () { moveSlideRow(); },
    'board-slide-del': function () { deleteSlide(); },
    'board-slide-left': function () { moveSlide(-1); },
    'board-slide-right': function () { moveSlide(1); },
    'board-rename': function () { renameSlide(); },
    'board-bg': function () { changeBg(); },
    'board-png': function () { exportPNG(); },
    'board-hw': function () { homeworkDialog(); },
    'board-hw-edit': function (hwId) {
      F.homework(hwId, {}, function () { afterHomeworkChange(); homeworkDialog(); });
    },
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
      // це фото завдання — тож слайди йдуть у рядок ДЗ, а не в рядок уроку
      var base = insertPos('hw');
      if (mode === 'each') {
        ok.forEach(function (m, i) {
          var s = S.newSlide('Фото ' + (i + 1), 'hw');
          cur.board.slides.splice(base + i, 0, s);
          // кладемо фото в природному розмірі навколо початку координат
          var w = Math.min(900, m.w), h = w / (m.w / m.h);
          s.items.push({ t: 'i', k: m.key, r: m.w / m.h,
                         a: [-w / 2, -h / 2, w / 2, h / 2] });
          s.view = { x: -w / 2 - 60, y: -h / 2 - 60, s: 1 };
        });
        markDirty(); flushSave();
        selectSlide(base);
      } else {
        var s2 = S.newSlide('Домашнє завдання', 'hw');
        cur.board.slides.splice(base, 0, s2);
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
        selectSlide(base);
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

  /* Підписи кутів вручну.

     Потрібно на кресленнях до задачі: за умовою кут 30°, а намальований
     від руки — 34°, і показувати треба саме умову. Сама фігура при цьому
     не змінюється: це підпис, а не геометрія. Порожнє поле означає
     «як виміряно». */
  function manualAnglesHtml(it, m) {
    if (m.round || !m.angles || !m.angles.length || m.pts.length > 8) return '';
    var L = (window.Board.VERTEX_LETTERS || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    var man = it.ang || {};

    return '<div class="dim-sep" style="margin:16px 0 12px"></div>' +
      '<div class="board-opts__label" style="margin-bottom:8px">Підписати кути вручну</div>' +
      '<div class="ang-grid">' + m.angles.map(function (A, i) {
        var name = i < L.length ? L[i] : String(i + 1);
        return '<label class="ang-cell"><span>' + name + '</span>' +
          '<input class="input" data-ang="' + i + '" value="' + U.esc(man[i] == null ? '' : man[i]) +
          '" placeholder="' + Math.round(A.deg) + '"></label>';
      }).join('') + '</div>' +
      '<div class="field__hint mt-1">Порожнє поле — показувати виміряний кут. ' +
      'Можна вписати не лише число, а й позначення: α, 2x.</div>';
  }

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
      var L = B.VERTEX_LETTERS || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var angles = m.angles.map(function (A, i) {
        return row('Кут ' + (i < L.length ? L[i] : i + 1), Math.round(A.deg) + '°');
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
            manualAnglesHtml(it, m) +
          '</div>' +
        '</div>',
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Застосувати', kind: 'btn--primary', act: 'ok', icon: 'check',
          onClick: function (root) {
            /* Підписи кутів застосовуємо завжди — навіть якщо розміри
               лишили без змін: людина могла зайти саме заради них. */
            var angEls = U.$$('[data-ang]', root);
            if (angEls.length) {
              var ang = {};
              angEls.forEach(function (el) {
                var s = el.value.trim();
                if (s) ang[el.dataset.ang] = s;
              });
              it.ang = Object.keys(ang).length ? ang : null;
              if (it.ang) it.m = 1;            // підписаний кут має бути видно
            }

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
          /* Підписуємо літерами так само, як вони стоять на самій фігурі —
             інакше доводиться подумки перекладати «сторона 2» у «BC». */
          var isV = o.per === 'vertex';
          var word = isV ? 'вершини' : 'сторони';
          var btns = '';
          for (var i = 0; i < o.count; i++) {
            var nm = isV ? Cn.vertexName(i) : Cn.sideName(i, o.count);
            btns += '<button class="constr-num" data-add="' + o.k + '" data-i="' + i + '" ' +
              'title="Від ' + word + ' ' + nm + '">' + nm + '</button>';
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
        } else if (o.per === 'sides') {
          /* Кількість сторін — кнопками, а не полем: у школі потрібні три,
             чотири й шість, і тицьнути в них має бути швидше, ніж набрати. */
          var quick = '';
          [3, 4, 5, 6, 8, 12].forEach(function (nn) {
            quick += '<button class="constr-num" data-add="' + o.k + '" data-n="' + nn +
              '" title="' + nn + ' сторони">' + nn + '</button>';
          });
          ctrl = '<div class="constr-angle">' + quick +
            '<span class="muted small">поворот</span>' +
            '<input class="input" type="number" value="90" min="0" max="360" step="5" data-a1="' + o.k + '">' +
            '<span class="muted small">°</span></div>';
        } else if (o.per === 'ratio') {
          ctrl = '<div class="constr-angle">' +
            '<input class="input" type="number" value="60" min="5" max="300" step="5" data-r2="' + o.k + '">' +
            '<span class="muted small">% радіуса</span>' +
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
      var vcount = (B.shapePoints(shape) || []).length;
      return '<div class="constr-list">' + list.map(function (x, n) {
        var kind = Cn.KINDS[x.k] || {};
        var lbl = kind.label || x.k;
        var extra = '';
        if (x.i != null && vcount) {
          if (x.k === 'midline') extra = ' ∥ ' + Cn.sideName(x.i, vcount);
          else if (kind.per === 'side') extra = ' до ' + Cn.sideName(x.i, vcount);
          else extra = ' з ' + Cn.vertexName(x.i);
        } else if (x.n != null) {
          extra = ' · ' + U.pl(x.n, 'сторона', 'сторони', 'сторін');
        } else if (x.r2 != null) {
          extra = ' · ' + Math.round(x.r2 * 100) + '%';
        } else if (x.a2 != null) {
          extra = ' ' + x.a1 + '°…' + x.a2 + '°';
        } else if (x.a1 != null) {
          extra = ' ' + x.a1 + '°';
        }
        return '<span class="constr-chip"><i style="background:' + (x.c || '#17163A') + '"></i>' +
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

        function addOne(kind, idx, sides) {
          var spec = { k: kind };
          if (idx != null) spec.i = idx;
          if (sides != null) spec.n = sides;
          var a1 = root.querySelector('[data-a1="' + kind + '"]');
          var a2 = root.querySelector('[data-a2="' + kind + '"]');
          var r2 = root.querySelector('[data-r2="' + kind + '"]');
          if (a1) spec.a1 = +a1.value;
          if (a2) spec.a2 = +a2.value;
          if (r2) spec.r2 = (+r2.value) / 100;
          var made = cur.engine.addConstruction(shape, spec);
          if (!made) { U.toast('Така побудова тут неможлива', 'err'); return false; }
          return true;
        }

        U.onClick(root, '[data-add]', function (el) {
          var idx = el.hasAttribute('data-i') ? +el.dataset.i : null;
          var sides = el.hasAttribute('data-n') ? +el.dataset.n : null;
          if (addOne(el.dataset.add, idx, sides)) {
            U.toast('Додано', 'ok'); refresh(); updateSelBar();
          }
        });

        U.onClick(root, '[data-add-all]', function (el) {
          var k = el.dataset.addAll, n = +el.dataset.count;
          var was = cur.engine.constructionsOf(shape).length;
          for (var i = 0; i < n; i++) addOne(k, i);
          var made = cur.engine.constructionsOf(shape).length - was;
          if (made > 0) { U.toast('Додано ' + made, 'ok'); refresh(); updateSelBar(); }
          else U.toast('Усе це вже побудовано');
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
        '</div>' +
        /* Окремим блоком на всю ширину, бо саме ці факти й потрібні на
           уроці: фігуру рідко розглядають саму собою, а щойно проводиш у
           ній відрізок — починається теорема. */
        (facts.lines && facts.lines.length
          ? '<div class="facts-more">' +
              '<div class="board-opts__label" style="margin-bottom:10px">' +
                'Побудови: відрізки, діагоналі, дотичні</div>' +
              list(facts.lines) +
            '</div>'
          : ''),
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

  /* ------------------------------------------------------------
     Домашнє завдання просто з уроку

     Раніше по нього треба було виходити з дошки в окрему вкладку учня.
     Але завдання дають саме на уроці — тож логічніше, щоб воно було тут.
     ------------------------------------------------------------ */

  /** Завдання, що стосуються цього уроку: його власні плюс незакриті цього учня. */
  function lessonHomework() {
    if (!cur) return [];
    var l = S.get('lessons', cur.lessonId);
    if (!l) return [];
    return S.db().homeworks.filter(function (h) {
      if (h.lessonId === l.id) return true;
      if (h.studentId !== l.studentId) return false;
      return h.status === 'assigned' || h.status === 'submitted';
    });
  }

  function updateHwCount() {
    var el = document.querySelector('[data-hw-count]');
    if (!el) return;
    var n = lessonHomework().length;
    el.textContent = n ? ' ' + n : '';
  }

  function homeworkDialog() {
    flushSave();
    var l = S.get('lessons', cur.lessonId);
    var st = l ? S.get('students', l.studentId) : null;
    var list = lessonHomework();

    var rows = list.length
      ? list.map(function (h) {
          var overdue = h.status === 'assigned' && U.daysBetween(U.today(), h.dueDate) < 0;
          return '<button class="hw-row" data-act="board-hw-edit" data-arg="' + h.id + '">' +
            '<div style="min-width:0;text-align:left">' +
              '<div class="hw-row__t">' + U.esc(h.title) + '</div>' +
              '<div class="small muted" style="margin-top:3px">до ' + U.esc(U.fmtDate(h.dueDate)) +
              (h.lessonId !== cur.lessonId ? ' · з іншого уроку' : '') +
              ((h.solutions || []).length
                ? ' · учень надіслав ' + U.pl(h.solutions.length, 'фото', 'фото', 'фото')
                : ' · ще не надіслав') +
              '</div>' +
            '</div>' +
            '<span class="spacer">' + C.hwBadge(overdue ? 'skipped' : h.status) + '</span>' +
          '</button>';
        }).join('')
      : '<div class="field__hint">Для цього уроку завдань ще немає.</div>';

    C.modal({
      title: 'Домашнє завдання',
      sub: (st ? st.name : '') + (l ? ' · урок ' + U.fmtDate(l.date) : ''),
      body:
        '<div class="hw-list">' + rows + '</div>' +
        '<div class="field__hint mt-2">Учень бачить ці завдання на сторінці уроку й може ' +
        'надіслати фото розв\'язання до кожного окремо.</div>',
      buttons: [
        { label: 'Закрити', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Задати ДЗ', kind: 'btn--primary', act: 'add', icon: 'plus',
          onClick: function () {
            F.homework(null, { studentId: l ? l.studentId : '', lessonId: cur.lessonId, lockStudent: true },
              function () { afterHomeworkChange(); });
          } }
      ]
    });
  }

  /* Після зміни завдань оновлюємо лічильник і, якщо урок опубліковано,
     одразу перевидаємо — інакше учень побачив би старий список. */
  function afterHomeworkChange() {
    updateHwCount();
    if (!cur || !cur.board.share) return;
    if (!(window.Cloud && Cloud.available() && Cloud.signedIn())) return;
    var l = S.get('lessons', cur.lessonId);
    var st = l ? S.get('students', l.studentId) : null;
    publishLesson(cur.board, l, st, cur.board.share.token).catch(function (e) {
      console.warn('Не вдалося оновити урок для учня:', e && e.message);
    });
  }

  /* Вибір матеріалів, які поїдуть учневі разом з уроком.
     Бібліотека — робоча кухня репетитора, тому відкриваємо тільки те,
     що він позначив сам, і для кожного уроку окремо. */
  function materialPicker(chosen) {
    var all = S.db().materials;
    if (!all.length) {
      return '<div class="field__hint mt-2">Матеріалів у бібліотеці ще немає.</div>';
    }
    var byTopic = {};
    all.forEach(function (m) {
      var t = m.topic || 'Загальне';
      (byTopic[t] = byTopic[t] || []).push(m);
    });
    return '<details class="sync-more mt-2"' + (chosen.length ? ' open' : '') + '>' +
      '<summary>Матеріали для учня' + (chosen.length ? ' · ' + chosen.length : '') + '</summary>' +
      '<div class="mat-pick">' +
      Object.keys(byTopic).sort(function (a, b) { return a.localeCompare(b, 'uk'); }).map(function (t) {
        return '<div class="mat-pick__h">' + U.esc(t) + '</div>' +
          byTopic[t].map(function (m) {
            var n = (m.files || []).length;
            var nr = (m.type === 'theory' && (m.rules || []).length) || 0;
            /* Матеріал без посилання, файлів і правил учневі показувати нема
               сенсу: він побачить назву, під якою нічого не відкривається.
               Краще попередити тут, ніж щоб учень тицяв у порожнє. */
            var empty = !n && !m.url && !nr;
            var tail = nr
              ? ' <span class="muted">· ' + U.pl(nr, 'правило', 'правила', 'правил') + '</span>'
              : n
                ? ' <span class="muted">· ' + U.pl(n, 'файл', 'файли', 'файлів') + '</span>'
                : m.url ? ' <span class="muted">· посилання</span>'
                        : ' <span class="mat-pick__empty">· порожній</span>';
            return '<label class="mat-pick__r' + (empty ? ' is-empty' : '') + '"' +
              (empty ? ' title="Ні файлу, ні посилання — учневі нічого відкривати"' : '') + '>' +
              '<input type="checkbox" data-mat="' + m.id + '"' +
              (chosen.indexOf(m.id) > -1 ? ' checked' : '') + '>' +
              '<span>' + U.esc(m.title) + tail + '</span></label>';
          }).join('');
      }).join('') +
      '</div>' +
      '<div class="field__hint mt-2">Учень побачить лише позначене, і лише за цим посиланням. ' +
      'Позначені «порожній» відкрити не вийде — до них спершу треба додати файл або посилання.</div>' +
      '</details>';
  }

  function readPicked(root) {
    return U.$$('[data-mat]', root).filter(function (el) { return el.checked; })
      .map(function (el) { return el.dataset.mat; });
  }

  /* Той самий вибір матеріалів потрібен і в порталі учня — щоб репетитор
     не вчився двом різним спискам, віддаємо його назовні. */
  V.materialPicker = materialPicker;
  V.readPickedMaterials = readPicked;

  /**
   * Опублікувати дошку уроку, не відкриваючи її. Потрібно порталу:
   * учень має заходити в самі уроки, а не лише бачити їх у розкладі.
   *
   * Уже опубліковані не чіпаємо: поки репетитор працює на дошці, вона
   * оновлюється сама, і смикати її звідси — зайвий трафік.
   * Повертає адресу або '' , якщо публікувати нема чого.
   */
  /**
   * Чи є що показувати учневі в цьому уроці. Не лише записи на дошці:
   * урок із заданим домашнім теж варто відкрити, навіть якщо дошка чиста —
   * саме там учень побачить завдання й надішле розв'язання.
   */
  V.lessonHasContent = function (lessonId) {
    var board = S.getBoard(lessonId);
    var ink = board && (board.slides || []).some(function (s) {
      return !s.hidden && (s.items || []).length;
    });
    if (ink) return true;
    return S.db().homeworks.some(function (h) { return h.lessonId === lessonId; });
  };

  /**
   * Перевидати урок, не відкриваючи дошку.
   *
   * Потрібне панелі «Чи все ціле»: якщо відправлення колись не дійшло —
   * скажімо, тоді скінчилася сесія, — лагодити це має одна кнопка, а не
   * «відкрийте по черзі кожну дошку й почекайте».
   *
   * На відміну від publishLessonBoard, шле беззастережно: тут ми вже
   * знаємо, що в учня старе, і причина не у версії переглядача.
   */
  V.republishLesson = function (lessonId) {
    var board = S.getBoard(lessonId);
    if (!board || !board.share || !board.share.token) return Promise.resolve(false);
    if (!(window.Cloud && Cloud.available() && Cloud.signedIn())) {
      return Promise.reject(new Error('Немає входу в синхронізацію'));
    }

    var l = S.get('lessons', lessonId);
    var st = l ? S.get('students', l.studentId) : null;

    return publishLesson(board, l, st, board.share.token).then(function () {
      board.share.v = VIEWER_VERSION;
      board.share.at = new Date().toISOString();
      S.saveBoard(board);
      publogSet(lessonId, true);
      return true;
    }, function (e) {
      publogSet(lessonId, false, e && e.message ? e.message : 'немає звʼязку');
      throw e;
    });
  };

  /** Уроки, у яких останнє відправлення учневі не вдалося. */
  V.staleForStudents = function () {
    var log = publogAll();
    return (S.db().boards || []).filter(function (b) {
      return b.share && b.share.token && log[b.lessonId] && !log[b.lessonId].ok;
    }).map(function (b) { return b.lessonId; });
  };

  V.publishLessonBoard = function (lessonId) {
    if (!window.Cloud || !Cloud.available() || !Cloud.signedIn()) return Promise.resolve('');

    var board = S.getBoard(lessonId);

    /* Уже опублікований урок перевидаємо лише тоді, коли він зроблений
       старішим переглядачем. Інакше учень нових можливостей не побачить,
       скільки б не оновлював сторінку: у нього збережений знімок. */
    if (board && board.share && board.share.token) {
      var url = Cloud.shareUrl(board.share.token);
      if (board.share.v === VIEWER_VERSION) return Promise.resolve(url);

      var l0 = S.get('lessons', lessonId);
      var st0 = l0 ? S.get('students', l0.studentId) : null;
      return publishLesson(board, l0, st0, board.share.token).then(function () {
        board.share.v = VIEWER_VERSION;
        S.saveBoard(board);
        return url;
      }).catch(function () { return url; });   // не вийшло — хай лишається старий
    }

    // порожній урок відкривати нема сенсу — учень побачить білий аркуш
    if (!V.lessonHasContent(lessonId)) return Promise.resolve('');

    // дошки може ще не бути — урок міг мати тільки домашнє
    if (!board) board = S.ensureBoard(lessonId);

    var lesson = S.get('lessons', lessonId);
    var student = lesson ? S.get('students', lesson.studentId) : null;
    var token = Cloud.newShareToken();

    return publishLesson(board, lesson, student, token).then(function () {
      board.share = { token: token, at: new Date().toISOString(), materials: [], v: VIEWER_VERSION };
      S.saveBoard(board);
      return Cloud.shareUrl(token);
    });
  };

  /** Опублікувати урок і покласти посилання в буфер обміну. */
  function publishShare(l, st, token, isUpdate, root) {
    if (root) {
      cur.board.share = cur.board.share || { token: token, at: new Date().toISOString() };
      cur.board.share.materials = readPicked(root);
    }
    U.toast(isUpdate ? 'Оновлюю урок…' : 'Готую урок для учня…');
    return publishLesson(cur.board, l, st, token).then(function (url) {
      var mats = (cur.board.share && cur.board.share.materials) || [];
      cur.board.share = {
        token: token, at: new Date().toISOString(), materials: mats, v: VIEWER_VERSION
      };
      cur.republishedAt = Date.now();
      publogSet(cur.lessonId, true);
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
      publogSet(cur && cur.lessonId, false, e && e.message ? e.message : 'немає звʼязку');
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
          facts +
          materialPicker((share && share.materials) || []),
        buttons: [
          { label: 'Закрити', kind: 'btn--ghost', act: 'cancel' },
          { label: 'Відкликати', kind: 'btn--danger', act: 'revoke',
            onClick: function () {
              /* Відкликання стирає й те, що надіслав учень. Якщо щось із
                 надісланого ще не забрано до себе, воно зникне назавжди —
                 і людина про це не дізнається. Тому спершу дивимось, чи
                 порожньо, і лише потім питаємо. */
              window.Cloud.shareContributions(share.token).then(function (rows) {
                var n = (rows || []).length;
                function doRevoke() {
                  window.Cloud.revokeShare(share.token).then(function () {
                    delete cur.board.share;
                    markDirty(); flushSave();
                    U.toast('Посилання більше не працює', 'ok');
                  }).catch(function (e) {
                    U.toast('Не вдалося відкликати: ' + (e && e.message ? e.message : e), 'err');
                  });
                }
                if (!n) { doRevoke(); return; }
                C.confirm('Учень надіслав ' + U.pl(n, 'запис', 'записи', 'записів') +
                  ', які ще не забрані',
                  'Відкликання прибере їх разом із посиланням, і повернути їх буде ' +
                  'нізвідки. Спершу відкрийте дошку й дочекайтеся, поки вони зʼявляться.',
                  doRevoke, 'Все одно відкликати');
              });
            } },
          { label: 'Оновити', kind: 'btn--primary', act: 'go', icon: 'refresh',
            onClick: function (root) { publishShare(l, st, share.token, true, root); } }
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
        materialPicker([]) +
        '<div class="field__hint mt-2">Код у посиланні випадковий, підібрати його неможливо. ' +
        'Доступ можна відкликати будь-коли — тоді сторінка перестане відкриватися.</div>',
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Зібрати файл', kind: 'btn--ghost', act: 'file', icon: 'download',
          onClick: function () { downloadViewer(l, st); } },
        { label: 'Створити посилання', kind: 'btn--primary', act: 'go', icon: 'share',
          onClick: function (root) { publishShare(l, st, window.Cloud.newShareToken(), false, root); } }
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

    /* Точки й відрізки посилаються на сусідів по слайду, тож малюванню
       потрібен увесь список. Без цього вони запікалися б у порожнечу. */
    if (window.Board && Board.setDrawScope) Board.setDrawScope(items);

    items.forEach(function (it) {
      if (it.t === 'd') {
        var parent = byId[it.pid];
        var g = (parent && window.Constructions) ? window.Constructions.resolve(it, parent) : null;
        if (!g) return;
        var thin = Math.max(1, (it.w || 2) * 0.7);
        g.segs.forEach(function (s) {
          out.push({ t: 'l', c: it.c, w: it.w, a: [s[0], s[1], s[2], s[3]] });
        });
        /* Допоміжні лінії побудови досі не доїжджали до учня взагалі: у
           списку видів їх не було, тож хорда під вписаним кутом чи основа
           висоти в нього просто зникали. Пунктиру сторінка учня не вміє,
           тож лінія суцільна — але вона є, а це важливіше. */
        (g.dashed || []).forEach(function (s) {
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
      if (!baked) return;
      // складний обʼєкт розкладається на кілька простих
      if (Array.isArray(baked)) out.push.apply(out, baked); else out.push(baked);
    });
    return out;
  }

  function bakeItem(it) {
    /* Числова вісь і координатна площина — складніші за все, що вміє
       сторінка учня, тож розкладаємо їх на прості лінії й написи. Доти вони
       їхали до учня як є й не малювалися взагалі. */
    /* Площину й тіло віддаємо кадрами: учень зможе тягнути точку й
       обертати тіло, хоч у нього немає ні обчислювача формул, ні
       стереометрії. Сторінка уроку — один самодостатній файл, і вантажити
       в неї модулі не можна: сайт за захистом, а учень не входить. */
    /* Кадри для тягання робимо лише тоді, коли їх справді просили.

       Вони важать десятки кілобайтів на обʼєкт, а урок перевидається учневі
       через кілька секунд після кожної правки. Вмикати це всім означало б
       гнати мережею зайве при кожному штриху — заради можливості, яка на
       більшості уроків не потрібна. */
    if ((it.t === 'f' || it.t === 's') && it.live && window.Board.bakeFrames) {
      var fr = window.Board.bakeFrames(it);
      if (fr) {
        return [{ t: 'q', k: fr.kind, st: fr.stat, fr: fr.frames,
                  box: fr.box, id: it.id || U.uid('q') }];
      }
    }
    if (it.t === 'n' || it.t === 'f' || it.t === 's' || it.t === 'o' || it.t === 'c') {
      var parts = window.Board.bakePrimitives ? window.Board.bakePrimitives(it) : [];
      return parts.length ? parts : null;
    }
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
    /* Показуємо учневі не лише завдання цього уроку, а й усі його незакриті.
       Причина: завдання, задане з картки учня, не привʼязане до жодного уроку —
       і раніше учень не побачив би його ніде взагалі. */
    var hw = [];
    if (lesson) {
      var sid = lesson.studentId;
      hw = S.db().homeworks.filter(function (h) {
        if (h.lessonId === lesson.id) return true;                 // завдання саме цього уроку
        if (h.studentId !== sid) return false;                     // чуже — ніколи
        return h.status === 'assigned' || h.status === 'submitted'; // ще в роботі
      });
    }

    /* Слайди з позначкою «приховано» не публікуються взагалі: не ховаються
       в інтерфейсі учня, а просто не потрапляють у те, що йому надсилається. */
    var shown = board.slides.filter(function (s) { return !s.hidden; });

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
          feedback: h.feedback || '',
          photos: (h.photos || []).slice(),
          // те, що учень уже надіслав — щоб він бачив, за що можна не хвилюватися
          sent: (h.solutions || []).length
        };
      }),
      images: {},
      slides: shown.map(function (s) {
        return {
          /* id обовʼязковий: учень надсилає, на якому слайді він писав, а
             приховані слайди зсувають нумерацію — по номеру не знайдемо. */
          id: s.id,
          title: s.title || '', bg: s.bg || 'grid',
          kind: S.slideKind(s),
          items: bakeSlideItems(s.items || [])
        };
      })
    };

    // картинки беремо теж лише з відкритих слайдів — інакше приховане поїхало б у файл
    var keys = window.Board.imageKeysIn(shown);
    payload.homework.forEach(function (h) {
      h.photos.forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    });

    /* Матеріали, які репетитор навмисно відкрив для цього учня.
       Не всі підряд: бібліотека — його робоча кухня, і учневі там не місце. */
    var matKeys = [];
    var chosen = (board.share && board.share.materials) || [];
    payload.materials = chosen.map(function (mid) {
      var m = S.get('materials', mid);
      if (!m) return null;
      /* Формули малюємо тут, а не в учня: сторінку збирає репетитор, тож
         до учня доїжджає готовий HTML. Йому не треба ні набору формул, ні
         бібліотеки — лише кілька правил оформлення. */
      var rules = (m.type === 'theory' && window.MathFmt)
        ? (m.rules || []).map(function (r) {
            return {
              title: r.title || '',
              note: r.note || '',
              kind: r.kind || 'rule',
              // схема малюється тут-таки: до учня їде готовий SVG
              plot: r.kind === 'plot' ? MathFmt.plot((r.formula || '').trim()) : '',
              f: r.kind === 'plot' ? '' : MathFmt.render(r.formula),
              ex: MathFmt.render(r.example)
            };
          })
        : [];

      return {
        title: m.title || '', note: m.note || '', url: m.url || '',
        rules: rules,
        files: (m.files || []).map(function (f) {
          if (matKeys.indexOf(f.key) < 0) matKeys.push(f.key);
          return { key: f.key, name: f.name || 'файл', size: f.size || 0 };
        })
      };
    }).filter(Boolean);

    return { payload: payload, keys: keys, matKeys: matKeys };
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
    /* Код уроку потрібен самій сторінці: за ним вона тримає написане учнем
       у його браузері окремо для кожного уроку. Нового доступу це не дає —
       код і так стоїть в адресі, за якою сторінку відкривають. */
    built.payload.token = token;

    var matUrls = {};
    var jobs = built.keys.map(function (k) {
      return window.ImgStore.get(k).then(function (blob) {
        if (!blob) return null;
        return window.Cloud.publishShareImage(token, k, blob).then(function (url) {
          built.payload.images[k] = url;
        });
      }).catch(function () { return null; });   // одна невдала картинка не має валити публікацію
    }).concat(built.matKeys.map(function (k) {
      return window.ImgStore.get(k).then(function (blob) {
        if (!blob) return null;
        return window.Cloud.publishShareImage(token, k, blob, 'mat').then(function (url) {
          matUrls[k] = url;
        });
      }).catch(function () { return null; });
    }));

    return Promise.all(jobs).then(function () {
      built.payload.materials.forEach(function (m) {
        m.files = m.files.filter(function (f) { return matUrls[f.key]; })
          .map(function (f) { return { name: f.name, size: f.size, url: matUrls[f.key] }; });
      });
      return null;
    }).then(function () {
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
'*{box-sizing:border-box}html,body{margin:0;height:100%;font-family:Manrope,"Segoe UI",system-ui,sans-serif;background:#F6F5FB;color:#17163A}\n' +
'.wrap{display:flex;flex-direction:column;height:100%}\n' +
'.top{display:flex;align-items:center;gap:14px;padding:12px 18px;background:#fff;border-bottom:1px solid #E7E5F2;flex-wrap:wrap}\n' +
'.ttl{font-weight:750;font-size:15px}.sub{font-size:12px;color:#7E90AE;margin-top:2px}\n' +
'.sp{margin-left:auto;display:flex;align-items:center;gap:8px}\n' +
'.btn{border:1.5px solid #E7E5F2;background:#fff;border-radius:999px;padding:8px 14px;font:inherit;font-size:13px;font-weight:650;cursor:pointer;color:#3D3B63}\n' +
'.btn:hover{background:#F1EFFE;border-color:#8FB4FF;color:#3A31B0}\n' +
'.btn:disabled{opacity:.4;cursor:not-allowed}\n' +
'.pos{font-size:13px;font-weight:700;min-width:74px;text-align:center}\n' +
'.body{flex:1;position:relative;min-height:0}\n' +
'canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;background:#fff}\n' +
'canvas.drag{cursor:grabbing}\n' +
'.name{position:absolute;left:16px;top:14px;background:rgba(255,255,255,.94);border:1px solid #E7E5F2;border-radius:999px;padding:7px 16px;font-size:13px;font-weight:700;box-shadow:0 4px 14px rgba(23,22,58,.07);max-width:calc(100% - 32px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n' +
'.zoom{position:absolute;left:16px;bottom:16px;background:#fff;border-radius:999px;box-shadow:0 6px 24px rgba(23,22,58,.12);padding:5px;display:flex;gap:2px;align-items:center}\n' +
'.zoom button{width:34px;height:34px;border:0;background:none;border-radius:50%;cursor:pointer;font-size:17px;font-weight:700;color:#3D3B63}\n' +
'.zoom button:hover{background:#F1EFFE;color:#3A31B0}\n' +
'.zv{min-width:52px;text-align:center;font-size:12.5px;font-weight:700}\n' +
'.rail{flex:0 0 auto;display:flex;gap:8px;padding:10px 14px;background:#fff;border-top:1px solid #E7E5F2;overflow-x:auto}\n' +
'.sc{flex:0 0 auto;border:2px solid #E7E5F2;background:#fff;border-radius:10px;padding:7px 13px;cursor:pointer;font:inherit;font-size:12px;font-weight:650;color:#3D3B63;white-space:nowrap}\n' +
'.sc.on{border-color:#4B3FDB;color:#3A31B0;background:#F1EFFE}\n' +
'.sc-tag{flex:0 0 auto;align-self:center;font-size:10.5px;font-weight:800;letter-spacing:.7px;' +
'text-transform:uppercase;color:#AAA8C2;padding:0 4px 0 8px;border-left:2px solid #E7E5F2;white-space:nowrap}\n' +
'.sc-tag:first-child{border-left:0;padding-left:0}\n' +
'.sc-tag.hw{color:#B06A10}\n' +
'.note{padding:12px 18px;background:#F1EFFE;border-top:1px solid #E7E5F2;font-size:13px;line-height:1.6;white-space:pre-wrap}\n' +
'.extra{max-height:34vh;overflow-y:auto;border-top:1px solid #E7E5F2;background:#fff}\n' +
'.extra h3{margin:0;padding:12px 18px 6px;font-size:13px;letter-spacing:.6px;text-transform:uppercase;color:#AAA8C2}\n' +
'.hw{padding:10px 18px 14px;border-bottom:1px solid #E7E5F2}\n' +
'.hw:last-child{border-bottom:0}\n' +
'.hw b{font-size:14px}\n' +
'.hw .meta{font-size:12px;color:#7E90AE;margin-top:3px}\n' +
'.hw .desc{font-size:13px;line-height:1.6;margin-top:7px;white-space:pre-wrap;background:#F1EFFE;padding:10px 12px;border-radius:10px}\n' +
'.hw .shots{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}\n' +
'.hw .shots a{display:block;width:96px;height:96px;border:1.5px solid #E7E5F2;border-radius:10px;overflow:hidden}\n' +
'.hw .shots img{width:100%;height:100%;object-fit:cover;display:block}\n' +
'.btn.on{background:#4B3FDB;border-color:#4B3FDB;color:#fff}\n' +
'.addshot{display:inline-block;margin-top:9px;cursor:pointer}\n' +
'.addshot input{display:none}\n' +
'.addshot span{display:inline-block;border:1.5px dashed #8FB4FF;border-radius:999px;padding:8px 15px;font-size:12.5px;font-weight:650;color:#3A31B0;background:#F7FAFF}\n' +
'.addshot span:hover{background:#F1EFFE}\n' +
'.tools{position:absolute;left:14px;top:50%;transform:translateY(-50%);background:#fff;border-radius:16px;box-shadow:0 6px 24px rgba(23,22,58,.13);padding:6px;display:flex;flex-direction:column;gap:3px;z-index:3}\n' +
'.tl{width:40px;height:40px;border:0;background:none;border-radius:11px;cursor:pointer;font-size:17px;line-height:1;color:#3D3B63;display:flex;align-items:center;justify-content:center}\n' +
'.tl:hover{background:#F1EFFE;color:#3A31B0}\n' +
'.tl.on{background:#4B3FDB;color:#fff}\n' +
'.opts{position:absolute;left:66px;top:50%;transform:translateY(-50%);background:#fff;border-radius:14px;box-shadow:0 6px 24px rgba(23,22,58,.13);padding:9px;display:flex;flex-direction:column;gap:9px;z-index:3}\n' +
'.opts.hide{display:none}\n' +
'.opts__row{display:flex;flex-direction:column;gap:5px;align-items:center}\n' +
'.sw{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}\n' +
'.sw.on{border-color:#17163A}\n' +
'.wd{width:30px;height:26px;border:0;background:none;cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center}\n' +
'.wd:hover{background:#F1EFFE}\n' +
'.wd.on{background:#F1EFFE}\n' +
'.wd i{display:block;background:#3D3B63;border-radius:99px}\n' +
'@media(max-width:640px){.tools{left:8px;padding:4px}.tl{width:34px;height:34px;font-size:15px}.opts{left:52px;padding:7px}}\n' +
'.tin{position:absolute;z-index:4;min-width:170px;min-height:34px;border:2px solid #4B3FDB;border-radius:8px;padding:5px 8px;font-family:Manrope,"Segoe UI",system-ui,sans-serif;font-weight:500;line-height:1.25;background:rgba(255,255,255,.97);outline:none;resize:none;overflow:hidden}\n' +
'.sent{color:#16A34A;font-weight:700}\n' +
'.mats{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}\n' +
'.matf{display:inline-block;border:1.5px solid #E7E5F2;border-radius:10px;padding:8px 14px;font-size:12.5px;font-weight:650;color:#3A31B0;text-decoration:none;background:#fff}\n' +
'.matf:hover{background:#F1EFFE;border-color:#8FB4FF}\n' +

/* Аркуш теорії. Формули приїжджають уже намальованими, тут лише правила
   оформлення — щоб дріб стояв рискою, а степінь угорі. */
'.sheet{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:10px;margin-top:10px}\n' +
'.rule{border:1px solid #E7E5F2;border-radius:12px;padding:10px;background:#fff}\n' +
'.rule__h{font-weight:700;font-size:12px;color:#3A31B0;margin-bottom:7px}\n' +
'.rule__n{font-size:11.5px;color:#6B6982;line-height:1.5;margin-bottom:6px}\n' +
'.rule__f{text-align:center;font-size:17px;padding:9px 8px;background:#F7F6FD;border-radius:9px;overflow-x:auto}\n' +
'.rule__e{text-align:center;font-size:13px;padding:6px 8px;margin-top:6px;background:#E9F8F0;border-radius:9px;overflow-x:auto}\n' +
'.rule__p{text-align:center;padding:6px 0;color:#3A31B0}\n' +
'.rule__p svg{max-width:100%;height:auto}\n' +
'.mf{font-family:"Source Serif 4","Cambria Math",Georgia,"Times New Roman",serif;font-weight:600;line-height:1.32;color:#101010;white-space:normal;overflow-wrap:normal}\n' +
'.mf .mf-v{font-style:italic}\n' +
'.mf sup,.mf sub{font-size:.66em;line-height:1}\n' +
'.mf .mf-fn{padding-right:.18em}\n' +
'.mf-frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 .2em;line-height:1.08}\n' +
'.mf-num{padding:0 .3em 1px}\n' +
'.mf-den{padding:1px .3em 0;border-top:2px solid currentColor}\n' +
'.mf-root{display:inline-flex;align-items:flex-start;line-height:1.08}\n' +
'.mf-root .mf-idx{font-size:.6em;transform:translateY(.12em);margin-right:-.3em}\n' +
'.mf-root .mf-sign{transform:scaleY(1.2)}\n' +
'.mf-root .mf-under{border-top:2px solid currentColor;padding:2px .25em 0 .12em;margin-top:.14em}\n' +
'.addshot.busy span{opacity:.55;border-style:solid}\n' +
'.shots a.mine{border-color:#8FB4FF}\n' +
'canvas.pen{cursor:crosshair}\n' +
'.saved{position:absolute;right:16px;bottom:16px;background:rgba(255,255,255,.95);border:1px solid #E7E5F2;border-radius:999px;padding:6px 14px;font-size:12.5px;font-weight:650;color:#7E90AE;opacity:0;transition:opacity .2s}\n' +
'.saved.show{opacity:1}\n' +
'@media(max-width:640px){.top{padding:10px 12px}.sp{width:100%;justify-content:space-between}}\n' +
'</style></head><body>\n' +
'<div class="wrap">\n' +
'  <div class="top">\n' +
'    <div><div class="ttl">' + U.esc(payload.title) + '</div>\n' +
'    <div class="sub">' + U.esc([payload.student, payload.date].filter(Boolean).join(' · ')) + '</div></div>\n' +
'    <div class="sp">\n' +
(payload.canWrite
  ? '      <button class="btn" id="undo" title="Скасувати (Ctrl+Z)" disabled>↶</button>\n' +
    '      <button class="btn" id="redo" title="Повернути (Ctrl+Y)" disabled>↷</button>\n'
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
(payload.canWrite
  ? '    <div class="tools" id="tools">\n' +
    '      <button class="tl" data-tool="hand" title="Рух по полотну">✋</button>\n' +
    '      <button class="tl on" data-tool="pen" title="Олівець">✎</button>\n' +
    '      <button class="tl" data-tool="erase" title="Гумка — стирає ваші записи">◻</button>\n' +
    '      <button class="tl" data-tool="text" title="Текст">T</button>\n' +
    '      <button class="tl" data-tool="line" title="Лінія">╱</button>\n' +
    '      <button class="tl" data-tool="arrow" title="Стрілка">→</button>\n' +
    '      <button class="tl" data-tool="rect" title="Прямокутник">▭</button>\n' +
    '      <button class="tl" data-tool="ell" title="Коло">◯</button>\n' +
    /* Своє фото на дошку. На комп\'ютері швидше Ctrl+V, але на телефоні
       вставки з буфера немає — тому ще й кнопка. */
    '      <label class="tl" id="pic" title="Додати фото або скріншот (можна Ctrl+V)">🖼' +
    '<input type="file" accept="image/*" multiple hidden id="picinp"></label>\n' +
    '    </div>\n' +
    '    <div class="opts" id="opts">\n' +
    '      <div class="opts__row" id="cols"></div>\n' +
    '      <div class="opts__row" id="wids"></div>\n' +
    '    </div>\n'
  : '') +
'    <div class="zoom"><button id="zo">−</button><span class="zv" id="zv">100%</span>' +
'<button id="zi">+</button><button id="zf" title="Вмістити" style="font-size:13px">⤢</button></div>\n' +
'  </div>\n' +
'  <div class="rail" id="rail"></div>\n' +
(payload.notes ? '  <div class="note"><b>Конспект уроку:</b>\n' + U.esc(payload.notes) + '</div>\n' : '') +
((payload.materials && payload.materials.length)
  ? '  <div class="extra"><h3>Матеріали</h3>\n' + payload.materials.map(function (m) {
      return '    <div class="hw"><b>' + U.esc(m.title) + '</b>' +
        (m.note ? '<div class="desc">' + U.esc(m.note) + '</div>' : '') +
        ((m.rules || []).length
          ? '<div class="sheet">' + m.rules.map(function (r) {
              return '<div class="rule">' +
                '<div class="rule__h">' + U.esc(r.title || 'Правило') + '</div>' +
                (r.note ? '<div class="rule__n">' + U.esc(r.note) + '</div>' : '') +
                (r.plot ? '<div class="rule__p">' + r.plot + '</div>' : '') +
                (r.f ? '<div class="rule__f">' + r.f + '</div>' : '') +
                (r.ex ? '<div class="rule__e">' + r.ex + '</div>' : '') +
                '</div>';
            }).join('') + '</div>'
          : '') +
        (m.url ? '<div class="meta" style="margin-top:6px"><a href="' + U.esc(m.url) +
          '" target="_blank" rel="noopener">Відкрити посилання</a></div>' : '') +
        (m.files.length
          ? '<div class="mats">' + m.files.map(function (f) {
              return '<a class="matf" href="' + U.esc(f.url) + '" download="' + U.esc(f.name) +
                '" target="_blank" rel="noopener">' + U.esc(f.name) + '</a>';
            }).join('') + '</div>'
          : '') +
        '</div>\n';
    }).join('') + '  </div>\n'
  : '') +
(payload.homework.length
  ? '  <div class="extra"><h3>Домашнє завдання</h3>\n' + payload.homework.map(function (h) {
      return '    <div class="hw"><b>' + U.esc(h.title) + '</b>' +
        '<div class="meta">' +
        (h.due ? 'до ' + U.esc(h.due) : '') +
        (h.sent ? ' · <span class="sent">надіслано ' + h.sent + '</span>' : '') + '</div>' +
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
'var MY={},cur=null,mine=[],erasing=false;',

/* Написане учнем живе в його ж браузері, поки репетитор його не забере.
   Без цього оновлення сторінки стирало все: MY існував лише в памʼяті, а
   на сервері лежить знімок дошки репетитора, де записів учня ще немає.
   Ключ — по коду уроку, щоб різні уроки не змішувалися. */
/* Без коду уроку не зберігаємо: так буває у файлі, надісланому окремо,
   і там писати однаково не можна. */
'var MYKEY=DATA.token?("vektor.my."+DATA.token):null;',
'function saveMine(){if(!MYKEY)return;',
'try{localStorage.setItem(MYKEY,JSON.stringify(MY));}catch(e){}}',
'function loadMine(){',
'if(!MYKEY)return;',
'try{var raw=localStorage.getItem(MYKEY);if(raw)MY=JSON.parse(raw)||{};}catch(e){MY={};}',
/* Те, що репетитор уже влив у дошку, приходить у DATA — тоді свою копію
   прибираємо, інакше той самий запис малювався б двічі. */
'var have={};DATA.slides.forEach(function(s){(s.items||[]).forEach(function(it){if(it.id)have[it.id]=1;});});',
'Object.keys(MY).forEach(function(k){',
'MY[k]=(MY[k]||[]).filter(function(it){return it&&it.id&&!have[it.id];});',
'if(!MY[k].length)delete MY[k];});',
// картинки треба перезавантажити: у памʼяті їх уже немає
'Object.keys(MY).forEach(function(k){MY[k].forEach(function(it){',
'if(it.t==="i"&&it.src&&!IMGS[it.k]){var im=new Image();im.onload=function(){draw();};im.src=it.src;IMGS[it.k]=im;}',
'});});',
'saveMine();}',
'var tool="pen",PENC="#E11D48",PENW=3;',
'var QPOS={};',                       // який кадр показуємо для кожного рухомого обʼєкта
'var qdrag=null;',

/* Підказка під обʼєктом. Без неї учень не здогадається, що тут можна
   тягнути: на вигляд це звичайний малюнок. */
'function drawGrab(ctx,it){var x1=Math.min(it.box[0],it.box[2]),x2=Math.max(it.box[0],it.box[2]);',
'var y2=Math.max(it.box[1],it.box[3]);',
'ctx.save();ctx.fillStyle="#7E90AE";ctx.font=\'600 13px Manrope,"Segoe UI",system-ui,sans-serif\';',
'ctx.textAlign="center";ctx.textBaseline="top";',
'var t=it.k==="plane"?"\\u270B тягніть \\u2014 точка поїде графіком":"\\u270B тягніть \\u2014 тіло обернеться";',
'if(!QCAN())t+=" (візьміть \\u270B на панелі)";',
'ctx.fillText(t,(x1+x2)/2,y2+8);ctx.restore();}',

/* Тягнути можна рукою або коли писати нема чим: інакше рухомий обʼєкт
   крав би кожен штрих, який учень хотів зробити поверх нього. */
'function QCAN(){return tool==="hand"||!CANW;}',
'function qAt(wx,wy){var found=null;',
'((DATA.slides[idx]||{}).items||[]).forEach(function(it){if(it.t!=="q")return;',
'var x1=Math.min(it.box[0],it.box[2]),x2=Math.max(it.box[0],it.box[2]);',
'var y1=Math.min(it.box[1],it.box[3]),y2=Math.max(it.box[1],it.box[3]);',
'if(wx>=x1&&wx<=x2&&wy>=y1&&wy<=y2)found=it;});return found;}',
'var CANW=!!DATA.canWrite;',
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
// без тексту — звичайне «надіслано»; з текстом — своє повідомлення
'function flash(msg){var s=document.getElementById("sv");if(!s)return;',
's.textContent=msg||"Надіслано репетитору";s.className="saved show";',
'setTimeout(function(){s.className="saved"},msg?2200:1400);}',
'Object.keys(DATA.images||{}).forEach(function(k){var im=new Image();im.onload=function(){draw();};im.src=DATA.images[k];IMGS[k]=im;});',
'function bounds(it){var xs=[],ys=[],i;',
'if(it.t==="p"){for(i=0;i<it.d.length;i+=2){xs.push(it.d[i]);ys.push(it.d[i+1]);}}',
'else if(it.t==="y"){it.p.forEach(function(q){xs.push(q[0]);ys.push(q[1]);});}',
'else if(it.t==="q"){xs=[it.box[0],it.box[2]];ys=[it.box[1],it.box[3]];}',
'else if(it.t==="x"){var ls=String(it.v).split("\\n"),m=0;ls.forEach(function(l){m=Math.max(m,l.length)});',
'xs=[it.p[0],it.p[0]+m*it.s*0.55];ys=[it.p[1]-it.s,it.p[1]+(ls.length-1)*it.s*1.25+it.s*0.3];}',
'else{xs=[it.a[0],it.a[2]];ys=[it.a[1],it.a[3]];}',
'if(!xs.length)return null;return{x1:Math.min.apply(null,xs),y1:Math.min.apply(null,ys),x2:Math.max.apply(null,xs),y2:Math.max.apply(null,ys)};}',
'function drawItem(ctx,it){',
/* Рухомий обʼєкт: стала частина плюс поточний кадр. Кадри намальовані
   заздалегідь у репетитора, тож учень бачить точно те саме, що й він. */
'if(it.t==="q"){var qi=QPOS[it.id]||0;',
'(it.st||[]).forEach(function(p){drawItem(ctx,p);});',
'var f2=it.fr[qi];if(f2)f2.p.forEach(function(p){drawItem(ctx,p);});',
'drawGrab(ctx,it);return;}',
'ctx.strokeStyle=it.c;ctx.fillStyle=it.c;ctx.lineWidth=it.w||3;ctx.lineCap="round";ctx.lineJoin="round";var i;',
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
'if(it.t==="x"){ctx.font=\'500 \'+it.s+\'px Manrope,"Segoe UI",system-ui,sans-serif\';ctx.textBaseline="alphabetic";ctx.textAlign="left";',
'String(it.v).split("\\n").forEach(function(l,n){ctx.fillText(l,it.p[0],it.p[1]+n*it.s*1.25);});return;}',
'if(it.t==="i"){var x=Math.min(it.a[0],it.a[2]),y=Math.min(it.a[1],it.a[3]),w=Math.abs(it.a[2]-it.a[0]),h=Math.abs(it.a[3]-it.a[1]);',
'var im=IMGS[it.k];if(im&&im.complete&&im.naturalWidth){ctx.drawImage(im,x,y,w,h);}',
'else{ctx.save();ctx.fillStyle="#F1EFFE";ctx.strokeStyle="#8FB4FF";ctx.lineWidth=2;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);ctx.restore();}return;}}',
'function bg(b){ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);if(b==="blank")return;',
'var st=40*scale;while(st<14)st*=2;while(st>150)st/=2;',
'var ox=(-cam.x*scale)%st,oy=(-cam.y*scale)%st;if(ox<0)ox+=st;if(oy<0)oy+=st;var x,y;',
'if(b==="dots"){ctx.fillStyle="#C9D6EA";var r=Math.max(0.8,Math.min(1.8,scale*1.2));',
'for(x=ox;x<W;x+=st)for(y=oy;y<H;y+=st){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}return;}',
'ctx.strokeStyle="#E7E5F2";ctx.lineWidth=1;ctx.beginPath();',
'for(x=ox;x<W;x+=st){ctx.moveTo(Math.round(x)+.5,0);ctx.lineTo(Math.round(x)+.5,H);}',
'for(y=oy;y<H;y+=st){ctx.moveTo(0,Math.round(y)+.5);ctx.lineTo(W,Math.round(y)+.5);}ctx.stroke();}',
'function draw(){var s=DATA.slides[idx];ctx.setTransform(dpr,0,0,dpr,0,0);bg(s.bg);',
'ctx.save();ctx.scale(scale,scale);ctx.translate(-cam.x,-cam.y);',
'(s.items||[]).forEach(function(it){drawItem(ctx,it)});',
// написане учнем малюємо поверх — воно ще не встигло дійти до репетитора
'(MY[idx]||[]).forEach(function(it){drawItem(ctx,it)});',
'if(cur&&(cur.t!=="p"||cur.d.length>=4))drawItem(ctx,cur);',
'ctx.restore();',
'document.getElementById("zv").textContent=Math.round(scale*100)+"%";}',
'function resize(){var r=cv.getBoundingClientRect();dpr=window.devicePixelRatio||1;W=r.width;H=r.height;',
'cv.width=Math.max(1,Math.round(W*dpr));cv.height=Math.max(1,Math.round(H*dpr));draw();}',
'function fit(){var s=DATA.slides[idx],b=null;(s.items||[]).forEach(function(it){var ib=bounds(it);if(!ib)return;',
'if(!b){b={x1:ib.x1,y1:ib.y1,x2:ib.x2,y2:ib.y2};return;}b.x1=Math.min(b.x1,ib.x1);b.y1=Math.min(b.y1,ib.y1);b.x2=Math.max(b.x2,ib.x2);b.y2=Math.max(b.y2,ib.y2);});',
'if(!b){scale=1;cam={x:-W/2,y:-H/2};draw();return;}var p=60,w=Math.max(1,b.x2-b.x1),h=Math.max(1,b.y2-b.y1);',
'scale=Math.max(MINS,Math.min(2,Math.min((W-p*2)/w,(H-p*2)/h)));',
'cam.x=(b.x1+b.x2)/2-W/(2*scale);cam.y=(b.y1+b.y2)/2-H/(2*scale);draw();}',
/* Нумерація в кожному рядку своя: домашнє завдання теж починається
   з першого слайда, а не продовжує наскрізний рахунок уроку. Рахуємо
   один раз наперед, бо ці числа потрібні і стрічці, і підпису зверху. */
'var ROW={lesson:0,hw:0};',
'DATA.slides.forEach(function(s){var k=s.kind==="hw"?"hw":"lesson";s.__k=k;s.__n=++ROW[k];});',
'function slideName(s){return s.title||("Слайд "+s.__n);}',

'function go(i,noFit){if(i<0||i>=DATA.slides.length)return;idx=i;',
'var s=DATA.slides[idx];',
'document.getElementById("pos").textContent=s.__n+" / "+ROW[s.__k];',
'document.getElementById("nm").textContent=slideName(s);',
'document.getElementById("prev").disabled=idx===0;',
'document.getElementById("next").disabled=idx===DATA.slides.length-1;',
'[].forEach.call(document.querySelectorAll(".sc"),function(b,n){b.className="sc"+(n===idx?" on":"")});',
'if(noFit){draw();}else{fit();}keep();}',
'var rail=document.getElementById("rail");',
// у стрічці слайди уроку й слайди ДЗ розділені підписом, як і в репетитора
'var lastKind=null;',
'DATA.slides.forEach(function(s,i){',
'if(s.__k!==lastKind){var t=document.createElement("span");t.className="sc-tag"+(s.__k==="hw"?" hw":"");',
't.textContent=s.__k==="hw"?"Домашнє завдання":"Урок";rail.appendChild(t);lastKind=s.__k;}',
'var b=document.createElement("button");b.className="sc";',
'b.textContent=s.__n+". "+slideName(s);b.onclick=function(){go(i)};rail.appendChild(b);});',
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

/* Інструменти ті самі, що й у репетитора: олівець, гумка, текст, лінія,
   стрілка, прямокутник, коло — з вибором кольору й товщини. Формати записів
   збігаються з дошкою, тому написане учнем виглядає в репетитора так само. */
'var COLS=["#17163A","#4B3FDB","#E11D48","#16A34A","#F59E0B","#7C3AED"];',
'var WIDS=[2,3,5,9,14];',
'var undone=[];',

'function setTool(t){tool=t;',
'[].forEach.call(document.querySelectorAll(".tl"),function(b){b.className="tl"+(b.dataset.tool===t?" on":"")});',
'var o=document.getElementById("opts");if(o)o.className="opts"+(t==="hand"||t==="erase"?" hide":"");',
'cv.className=(t==="hand")?"":"pen";}',

'function paintOpts(){var cw=document.getElementById("cols"),ww=document.getElementById("wids");',
'if(!cw)return;',
'cw.innerHTML=COLS.map(function(c){return \'<button class="sw\'+(c===PENC?" on":"")+\'" data-c="\'+c+\'" style="background:\'+c+\'"></button>\';}).join("");',
'ww.innerHTML=WIDS.map(function(w){var d=Math.min(16,4+w);',
'return \'<button class="wd\'+(w===PENW?" on":"")+\'" data-w="\'+w+\'"><i style="width:\'+d+\'px;height:\'+Math.max(2,w)+\'px"></i></button>\';}).join("");}',

'function sidOf(i){var s=DATA.slides[i];return s&&s.id?s.id:null;}',
'function pushMine(it){if(!MY[idx])MY[idx]=[];MY[idx].push(it);mine.push({s:idx,id:it.id});undone=[];',
'saveMine();',
'say({mathhub:"ink",slide:idx,sid:sidOf(idx),item:it});flash();syncUndo();draw();}',
'function syncUndo(){var u=document.getElementById("undo"),r=document.getElementById("redo");',
'if(u)u.disabled=!mine.length;if(r)r.disabled=!undone.length;}',

'function eraseAt(wx,wy){var list=MY[idx]||[];var hit=null;var tol=12/scale;',
'for(var i=list.length-1;i>=0;i--){var b=bounds(list[i]);if(!b)continue;',
'if(wx>=b.x1-tol&&wx<=b.x2+tol&&wy>=b.y1-tol&&wy<=b.y2+tol){hit=list[i];break;}}',
'if(!hit)return;MY[idx]=list.filter(function(x){return x.id!==hit.id});',
'mine=mine.filter(function(m){return m.id!==hit.id});',
'saveMine();',
'say({mathhub:"ink-undo",id:hit.id});syncUndo();draw();}',

'cv.addEventListener("pointerdown",function(e){try{cv.setPointerCapture(e.pointerId)}catch(x){}var r=cv.getBoundingClientRect();',
'var sx=e.clientX-r.left,sy=e.clientY-r.top;var w0=toWorld(sx,sy);',
/* Рухомий обʼєкт перехоплюємо першим — але лише коли він має право
   ловити: інакше він крав би кожен штрих поверх себе. */
'if(QCAN()&&e.button!==2){var qh=qAt(w0[0],w0[1]);',
'if(qh){e.preventDefault();qdrag={it:qh,sx:sx,i0:QPOS[qh.id]||0};return;}}',
'if(CANW&&tool!=="hand"&&e.button!==2){e.preventDefault();',
'if(tool==="erase"){erasing=true;eraseAt(w0[0],w0[1]);return;}',
'if(tool==="text"){placeText(sx,sy,w0);return;}',
'if(tool==="pen"){cur={t:"p",c:PENC,w:PENW,d:[w0[0],w0[1]],id:seq()};return;}',
'cur={t:(tool==="line"?"l":tool==="arrow"?"a":tool==="rect"?"r":"e"),c:PENC,w:PENW,',
'a:[w0[0],w0[1],w0[0],w0[1]],id:seq()};return;}',
'pts[e.pointerId]={x:sx,y:sy};',
'if(Object.keys(pts).length===2){var k=Object.keys(pts),a=pts[k[0]],b2=pts[k[1]];',
'pan=null;pinch={d:Math.hypot(a.x-b2.x,a.y-b2.y)};return;}',
'pan={sx:sx,sy:sy,cx:cam.x,cy:cam.y};cv.className="drag";});',

'cv.addEventListener("pointermove",function(e){var r=cv.getBoundingClientRect();var p={x:e.clientX-r.left,y:e.clientY-r.top};',
/* Площину рухаємо за самою точкою: скільки пікселів пройшла миша по
   ширині обʼєкта, стільки кадрів і перегортаємо. Тіло — за горизонтальним
   зсувом: так само, як у репетитора. */
'if(qdrag){var it=qdrag.it,N=it.fr.length-1;',
'var x1=Math.min(it.box[0],it.box[2]),x2=Math.max(it.box[0],it.box[2]);',
'var wq=toWorld(p.x,p.y);var k2;',
'if(it.k==="plane"){k2=Math.round((wq[0]-x1)/Math.max(1,x2-x1)*N);}',
'else{k2=qdrag.i0+Math.round((p.x-qdrag.sx)/26);k2=((k2%(N+1))+(N+1))%(N+1);}',
'QPOS[it.id]=Math.max(0,Math.min(N,k2));draw();return;}',
'if(erasing){var we=toWorld(p.x,p.y);eraseAt(we[0],we[1]);return;}',
'if(cur){var wp=toWorld(p.x,p.y);',
'if(cur.t==="p"){var n=cur.d.length;',
// не пишемо точку, поки палець не зрушив помітно — інакше лінія «мохната»
'if(n<2||Math.hypot(wp[0]-cur.d[n-2],wp[1]-cur.d[n-1])>1.2/scale){cur.d.push(wp[0],wp[1]);draw();}return;}',
'cur.a[2]=wp[0];cur.a[3]=wp[1];',
// з Shift фігура виходить правильною: квадрат і коло замість витягнутих
'if(e.shiftKey&&(cur.t==="r"||cur.t==="e")){var dx=wp[0]-cur.a[0],dy=wp[1]-cur.a[1];',
'var m=Math.max(Math.abs(dx),Math.abs(dy));cur.a[2]=cur.a[0]+(dx<0?-m:m);cur.a[3]=cur.a[1]+(dy<0?-m:m);}',
'draw();return;}',
'if(pts[e.pointerId])pts[e.pointerId]=p;var k=Object.keys(pts);',
'if(k.length===2&&pinch){var a=pts[k[0]],b2=pts[k[1]],d=Math.hypot(a.x-b2.x,a.y-b2.y);',
'if(pinch.d>0)zoomAt(d/pinch.d,(a.x+b2.x)/2,(a.y+b2.y)/2);pinch.d=d;return;}',
'if(!pan)return;cam.x=pan.cx-(p.x-pan.sx)/scale;cam.y=pan.cy-(p.y-pan.sy)/scale;draw();keep();});',

'function up(e){',
'if(qdrag){qdrag=null;return;}',
'if(erasing){erasing=false;return;}',
'if(cur){var it=cur;cur=null;',
'var okItem=(it.t==="p")?it.d.length>=4:(Math.hypot(it.a[2]-it.a[0],it.a[3]-it.a[1])>3/scale);',
'if(okItem)pushMine(it);else draw();return;}',
'delete pts[e.pointerId];if(Object.keys(pts).length<2)pinch=null;pan=null;',
'cv.className=(CANW&&tool!=="hand")?"pen":"";}',
'cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);',

/* Текст пишемо прямо на полотні: поле зʼявляється там, де клікнули,
   і зникає, щойно людина клацнула повз. */
'function placeText(sx,sy,w0){var ta=document.createElement("textarea");',
'ta.className="tin";ta.style.left=sx+"px";ta.style.top=(sy-12)+"px";',
'ta.style.fontSize=Math.max(11,Math.round(24*scale))+"px";ta.style.color=PENC;',
'document.querySelector(".body").appendChild(ta);',
'setTimeout(function(){ta.focus();},30);',
'var done=false;',
'function finish(){if(done)return;done=true;var v=ta.value.trim();ta.remove();',
'if(v)pushMine({t:"x",c:PENC,s:24,p:[w0[0],w0[1]],v:v,id:seq()});}',
'ta.addEventListener("blur",finish);',
'ta.addEventListener("keydown",function(ev){if(ev.key==="Escape"){ta.value="";finish();}',
'if(ev.key==="Enter"&&(ev.ctrlKey||ev.metaKey))finish();});}',

'var undoB=document.getElementById("undo"),redoB=document.getElementById("redo");',
'function doUndo(){if(!mine.length)return;var last=mine.pop();',
'var arr=MY[last.s]||[];var it=arr.filter(function(x){return x.id===last.id;})[0];',
'MY[last.s]=arr.filter(function(x){return x.id!==last.id});',
'if(it)undone.push({s:last.s,item:it});',
'saveMine();',
'say({mathhub:"ink-undo",id:last.id});syncUndo();draw();}',
'function doRedo(){if(!undone.length)return;var back=undone.pop();',
'if(!MY[back.s])MY[back.s]=[];MY[back.s].push(back.item);',
'mine.push({s:back.s,id:back.item.id});',
'saveMine();',
'say({mathhub:"ink",slide:back.s,sid:sidOf(back.s),item:back.item});syncUndo();draw();}',
'if(undoB)undoB.onclick=doUndo;',
'if(redoB)redoB.onclick=doRedo;',

'[].forEach.call(document.querySelectorAll(".tl"),function(b){',
'b.onclick=function(){setTool(b.dataset.tool);};});',
'var optsEl=document.getElementById("opts");',
'if(optsEl)optsEl.addEventListener("click",function(e){',
'var c=e.target.closest("[data-c]");if(c){PENC=c.dataset.c;paintOpts();return;}',
'var w=e.target.closest("[data-w]");if(w){PENW=+w.dataset.w;paintOpts();}});',
'if(CANW){paintOpts();setTool("pen");}',
'window.addEventListener("keydown",function(e){',
'if(e.target&&e.target.tagName==="TEXTAREA")return;',   // поки пишуть текст — гарячі клавіші мовчать
'var mod=e.ctrlKey||e.metaKey;',
'if(mod&&e.key.toLowerCase()==="z"&&!e.shiftKey){e.preventDefault();doUndo();return;}',
'if(mod&&(e.key.toLowerCase()==="y"||(e.key.toLowerCase()==="z"&&e.shiftKey))){e.preventDefault();doRedo();return;}',
'if(CANW&&!mod){var m={p:"pen",e:"erase",t:"text",l:"line",a:"arrow",r:"rect",o:"ell",h:"hand"}[e.key.toLowerCase()];',
'if(m){e.preventDefault();setTool(m);return;}}',
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
/* ---- Свої фото та скріншоти на дошці ----

   Сама сторінка не знає ні адреси бази, ні ключа: файли віддаємо обгортці,
   вона їх стискає й вивантажує, а нам повертає готові адреси. Далі картинка
   стає таким самим об'єктом дошки, як лінія чи напис, і їде до репетитора
   тим самим шляхом. */
'function addPics(files){',
'if(!CANW)return;',
'var fs=[].slice.call(files||[]).filter(function(f){return f&&/^image\\//.test(f.type);});',
'if(!fs.length)return;',
'flash("Надсилаю "+fs.length+" фото…");',
'say({mathhub:"pic",files:fs});}',

'window.addEventListener("paste",function(e){',
'if(!CANW)return;',
'if(e.target&&e.target.tagName==="TEXTAREA")return;',   // поки пишуть текст — вставляється текст
'var items=(e.clipboardData||{}).items;if(!items)return;',
'var fs=[];for(var i=0;i<items.length;i++){if(items[i].type&&items[i].type.indexOf("image/")===0){',
'var f=items[i].getAsFile();if(f)fs.push(f);}}',
'if(!fs.length)return;e.preventDefault();addPics(fs);});',

'var picInp=document.getElementById("picinp");',
'if(picInp)picInp.onchange=function(){addPics(picInp.files);picInp.value="";};',

/* Дії репетитора, що приходять наживо.

   Досі учень бачив урок лише таким, яким його востаннє перевидали. Через
   це й існувала ціла категорія «учень бачить старе»: перевидання могло не
   дійти, а помітити це було нічим.

   Тепер сторінка-обгортка читає журнал дій і передає їх сюди, а тут вони
   лягають на слайди — без перезавантаження й без перевидання.

   Межа проведена свідомо. Наживо застосовуємо те, що стосується об'єктів
   на наявних слайдах. Поява чи зникнення цілого слайда і нова картинка
   вимагають повного оновлення: у першому випадку треба перебудувати
   стрічку, у другому — привезти сам файл, якого в цієї сторінки немає.
   Тоді просимо обгортку принести урок цілком. */
'function slById(id){for(var i=0;i<DATA.slides.length;i++)if(DATA.slides[i].id===id)return DATA.slides[i];return null;}',
'var NEEDFULL=false;',
'function applyOp(op){if(!op)return false;',
'if(op.t==="s+"||op.t==="s-"){NEEDFULL=true;return false;}',
'var sl=slById(op.s);if(!sl)return false;sl.items=sl.items||[];',
'if(op.t==="s~"){var p=op.p||{};Object.keys(p).forEach(function(k){sl[k]=p[k];});return true;}',
'if(op.t==="i-"){var kill={};(op.ids||[]).forEach(function(x){kill[x]=1;});',
'var n0=sl.items.length;sl.items=sl.items.filter(function(it){return !kill[it&&it.id];});',
'return sl.items.length!==n0;}',
'if(op.t==="i+"||op.t==="i~"){var it=op.it;if(!it||!it.id)return false;',
'if(it.t==="i"&&it.k&&!IMGS[it.k]){NEEDFULL=true;return false;}',
'var at=-1;for(var q=0;q<sl.items.length;q++)if(sl.items[q]&&sl.items[q].id===it.id)at=q;',
'if(at>=0)sl.items[at]=it;else sl.items.push(it);return true;}',
'return false;}',

'window.addEventListener("message",function(e){var d=e.data;if(!d||d.mathhub!=="ops")return;',
'NEEDFULL=false;var ch=0;',
'(d.ops||[]).forEach(function(op){if(applyOp(op))ch++;});',
/* Своє, ще не влите репетитором, могло щойно приїхати назад уже його
   рукою. Лишати обидві копії не можна — на дошці двоїлося б. */
'if(ch){var have={};DATA.slides.forEach(function(s){(s.items||[]).forEach(function(it){if(it.id)have[it.id]=1;});});',
'Object.keys(MY).forEach(function(k){MY[k]=(MY[k]||[]).filter(function(it){return it&&it.id&&!have[it.id];});',
'if(!MY[k].length)delete MY[k];});saveMine();',
'go(idx,true);}',
'if(NEEDFULL)say({mathhub:"need-full"});});',

'window.addEventListener("message",function(e){var d=e.data;if(!d||d.mathhub!=="pic-done")return;',
'if(d.error||!d.items||!d.items.length){flash("Не вдалося надіслати фото");return;}',
'var c=[cam.x+W/(2*scale),cam.y+H/(2*scale)];',
'd.items.forEach(function(p,n){',
'var key="img_"+seq();',
// вписуємо в видиму область, щоб вставлене не полетіло за край екрана
'var maxW=Math.min(900,(W/scale)*0.6);',
'var w=Math.min(maxW,p.w||600),h=w*((p.h||400)/(p.w||600));',
'var x=c[0]-w/2+n*26,y=c[1]-h/2+n*26;',
'var im=new Image();im.onload=function(){draw();};im.src=p.url;IMGS[key]=im;',
'pushMine({t:"i",id:seq(),k:key,src:p.url,r:(p.w||600)/(p.h||400),',
'a:[Math.round(x),Math.round(y),Math.round(x+w),Math.round(y+h)]});});',
'flash("Надіслано репетитору");});',

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
// спершу повертаємо написане учнем — інакше перший малюнок буде без нього
'loadMine();',
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
