/* Форми створення та редагування */
(function () {
  'use strict';

  var U = window.U, S = window.S, C = window.C, icon = window.icon;
  var F = {};

  function refresh() { if (window.App) window.App.refresh(); }

  function nowTimeRounded() {
    var d = new Date();
    d.setMinutes(d.getMinutes() > 30 ? 60 : 30, 0, 0);
    return U.fmtTime(d);
  }

  /** Звична тривалість уроку: спершу в учня, потім загальна, потім година. */
  function defaultDuration(studentId) {
    var st = studentId ? S.get('students', studentId) : null;
    if (st && st.duration) return st.duration;
    var t = S.db().tutor || {};
    return t.defaultDuration || 60;
  }

  /* ============================================================
     Учень
     ============================================================ */

  F.student = function (id) {
    var st = id ? S.get('students', id) : null;
    var isNew = !st;
    var data = st || {
      name: '', grade: '11 клас', goal: 'НМТ-2026',
      price: S.db().tutor.defaultPrice, currency: S.db().tutor.currency || 'UAH',
      color: S.COLORS[S.db().students.length % S.COLORS.length],
      phone: '', parent: '', telegram: '', target: '', meetUrl: '', schedule: []
    };

    var sched = {};
    (data.schedule || []).forEach(function (s) { sched[s.day] = s.time; });

    /* Якщо колір учня не з нашого набору (старий запис, інша версія програми),
       треба все одно щось виділити. Інакше жоден кружечок не активний —
       і збереження падало на спробі прочитати колір із неіснуючого елемента,
       через що не зберігалося взагалі нічого. */
    var activeColor = S.COLORS.indexOf(data.color) > -1 ? data.color : S.COLORS[0];

    var swatches = S.COLORS.map(function (c) {
      return '<button type="button" class="swatch' + (c === activeColor ? ' is-active' : '') +
        '" data-color="' + c + '" style="background:' + c + '"></button>';
    }).join('');

    var days = [1, 2, 3, 4, 5, 6, 7].map(function (d) {
      var label = U.DAYS_SHORT[d % 7];
      return '<div style="text-align:center">' +
        '<div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:5px">' + label + '</div>' +
        '<input class="input" type="time" data-day="' + d + '" value="' + (sched[d] || '') +
        '" style="padding:8px 4px;text-align:center;font-size:12.5px">' +
        '</div>';
    }).join('');

    var body =
      C.field('Ім\'я та прізвище', C.input('name', data.name, 'placeholder="Напр. Крістіна Романюк" required')) +
      '<div class="field-row">' +
        C.field('Клас', C.select('grade', data.grade,
          ['5 клас','6 клас','7 клас','8 клас','9 клас','10 клас','11 клас','Студент','Дорослий'])) +
        C.field('Ціль',
          C.input('goal', data.goal, 'list="goal-list" placeholder="Оберіть або впишіть свою"') +
          '<datalist id="goal-list">' +
          S.allGoals().map(function (g) { return '<option value="' + U.esc(g) + '">'; }).join('') +
          '</datalist>',
          'Можна вписати будь-що своє — напр. «Вступ до Politechnika Wrocławska».') +
      '</div>' +
      '<div class="field-row field-row--3">' +
        C.field('Ціна за урок', C.input('price', data.price, 'type="number" min="0" step="any"')) +
        C.field('Валюта', C.select('currency', data.currency || 'UAH',
          U.CURRENCY_CODES.map(function (c) {
            return { value: c, label: U.symbol(c) + '  ' + c };
          }))) +
        C.field('Тривалість, хв', C.input('duration', data.duration || 60, 'type="number" min="15" step="15"')) +
      '</div>' +
      C.field('Колір картки', '<div class="swatches" id="sw">' + swatches + '</div>') +
      '<div class="field"><label class="field__label">Постійний розклад</label>' +
        '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:7px">' + days + '</div>' +
        '<div class="field__hint">Залиште порожнім, якщо в цей день уроку немає. ' +
        'Уроки за цим розкладом створюються самі — одразу після збереження й далі ' +
        'на чотири тижні вперед щоразу, коли ви відкриваєте програму.</div>' +
      '</div>' +
      '<div class="field-row">' +
        C.field('Телефон учня', C.input('phone', data.phone, 'placeholder="+380 …"')) +
        C.field('Telegram', C.input('telegram', data.telegram, 'placeholder="@nickname"')) +
      '</div>' +
      C.field('Батьки (контакт)', C.input('parent', data.parent, 'placeholder="Ім\'я, телефон"')) +
      C.field('Посилання на зустріч', C.input('meetUrl', data.meetUrl, 'placeholder="https://meet.google.com/…"'),
        'Якщо порожньо — використовується спільне посилання з «Налаштувань».') +
      C.field('Ціль і нотатки про учня', C.textarea('target', data.target,
        'placeholder="Напр. Мета — 185+ на НМТ. Слабкі місця: геометрія, параметри."'));

    C.modal({
      title: isNew ? 'Новий учень' : 'Редагувати учня',
      sub: isNew ? 'Заповніть базове — решту можна додати пізніше' : data.name,
      body: body,
      buttons: [
        !isNew ? { label: 'Видалити', kind: 'btn--danger', act: 'del', close: true, onClick: function () {
          C.confirm('Видалити учня?',
            'Разом з ним зникнуть усі уроки, домашні завдання, оплати та нотатки. Дію не можна скасувати.',
            function () { S.removeStudent(id); U.toast('Учня видалено'); location.hash = '#/students'; refresh(); });
        } } : null,

        /* Архів — для тих, хто просто перестав займатися. На відміну від
           видалення, нічого не зникає: історія, оплати й дошки лишаються,
           а учень зникає лише з розкладу й списків. */
        !isNew ? (data.archived
          ? { label: 'Повернути з архіву', kind: 'btn--ghost', act: 'unarch', close: true,
              onClick: function () {
                S.setArchived(id, false);
                U.toast('Учня повернуто', 'ok');
                refresh();
              } }
          : { label: 'В архів', kind: 'btn--ghost', act: 'arch', close: true,
              onClick: function () {
                C.confirm('Перевести ' + data.name + ' в архів?',
                  'Учень зникне з розкладу й списків, а нові уроки за його постійним ' +
                  'розкладом більше не створюватимуться. Нічого не видаляється: історія, ' +
                  'оплати й дошки лишаються, і його можна повернути будь-коли.',
                  function () {
                    S.setArchived(id, true);
                    U.toast('Учня переведено в архів', 'ok');
                    location.hash = '#/students';
                    refresh();
                  }, 'Перевести в архів');
              } }) : null,
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: isNew ? 'Додати учня' : 'Зберегти', kind: 'btn--primary', act: 'save', icon: 'check',
          onClick: function (root) {
            var v = C.readForm(root);
            if (!v.name) { U.toast('Вкажіть ім\'я учня', 'err'); return false; }
            if (!v.goal) v.goal = 'Без конкретної цілі';
            /* Другий запобіжник: якщо активного кружечка чомусь немає,
               беремо колишній колір, а не падаємо. Одна помилка тут зупиняла
               збереження цілком — не зберігалися ні розклад, ні решта полів. */
            var swatch = root.querySelector('.swatch.is-active') || root.querySelector('.swatch');
            v.color = swatch ? swatch.dataset.color : (data.color || S.COLORS[0]);
            v.schedule = U.$$('[data-day]', root)
              .filter(function (el) { return el.value; })
              .map(function (el) { return { day: +el.dataset.day, time: el.value }; });
            var oldSchedule = JSON.stringify((data.schedule || []));
            var newSchedule = JSON.stringify(v.schedule);

            if (isNew) {
              var created = S.add('students', v);
              U.toast('Учня «' + created.name + '» додано', 'ok');
              // одразу ставимо уроки за постійним розкладом — інакше він
              // лишався б просто записом, а в календарі було б порожньо
              var made = S.fillStudentTemplate(created.id);
              if (made) U.toast('Створено ' + U.pl(made, 'урок', 'уроки', 'уроків') +
                ' за постійним розкладом', 'ok');
              location.hash = '#/student/' + created.id;
            } else {
              S.update('students', id, v);
              // Валюту міняємо окремо: старі уроки й оплати перемічуються, але НЕ конвертуються
              var changed = S.setStudentCurrency(id, v.currency);
              U.toast(changed
                ? 'Валюту змінено на ' + v.currency + '. Суми не перераховувались — перевірте їх.'
                : 'Збережено', 'ok');
              if (newSchedule !== oldSchedule) {
                /* Спершу прибираємо майбутні уроки за старим розкладом, і лише
                   потім створюємо нові. Без прибирання зміна розкладу лише
                   додавала дні, а старі лишались — і виглядало так, ніби
                   нічого не збереглося. */
                var gone = S.pruneStudentTemplate(id);
                var n = v.schedule.length ? S.fillStudentTemplate(id) : 0;
                var parts = [];
                if (n) parts.push('додано ' + U.pl(n, 'урок', 'уроки', 'уроків'));
                if (gone) parts.push('прибрано ' + U.pl(gone, 'старий', 'старі', 'старих'));
                if (parts.length) U.toast('Розклад оновлено: ' + parts.join(', '), 'ok');
              }
            }
            refresh();
          } }
      ].filter(Boolean),
      onMount: function (root) {
        U.onClick(root, '.swatch', function (el) {
          U.$$('.swatch', root).forEach(function (x) { x.classList.remove('is-active'); });
          el.classList.add('is-active');
        });
      }
    });
  };

  /* ============================================================
     Урок
     ============================================================ */

  F.lesson = function (id, preset) {
    preset = preset || {};
    var ls = id ? S.get('lessons', id) : null;
    var isNew = !ls;
    var stList = S.students();
    if (!stList.length) { U.toast('Спочатку додайте учня', 'err'); return; }

    var firstId = preset.studentId || stList[0].id;
    var data = ls || {
      studentId: firstId,
      date: (preset.date || U.ymd(new Date())) + 'T' + (preset.time || nowTimeRounded()),
      topic: '', status: 'planned', notes: '', price: null,
      // звична тривалість цього учня, а не завжди година
      duration: defaultDuration(firstId)
    };

    var stud = S.get('students', data.studentId);
    var lessonCur = data.currency || S.curOf(data.studentId);
    var body =
      (preset.lockStudent ? '' : C.field('Учень', C.studentSelect('studentId', data.studentId))) +
      '<div class="field-row field-row--3">' +
        C.field('Дата', C.input('_date', data.date.slice(0, 10), 'type="date"')) +
        C.field('Час', C.input('_time', data.date.slice(11, 16) || '15:00', 'type="time"')) +
        /* Тривалість досі можна було змінити лише перетягуванням краю уроку
           в розкладі — і про це ніяк не здогадатися. Тут її видно завжди. */
        C.field('Тривалість, хв',
          C.input('duration', data.duration || 60,
            'type="number" min="15" max="480" step="5" list="dur-list"') +
          '<datalist id="dur-list">' +
          [30, 45, 60, 90, 120].map(function (d) { return '<option value="' + d + '">'; }).join('') +
          '</datalist>') +
      '</div>' +
      C.field('Тема уроку', C.input('topic', data.topic, 'placeholder="Напр. Логарифмічні нерівності" list="topic-list"') +
        '<datalist id="topic-list">' + S.TOPICS.map(function (t) { return '<option value="' + U.esc(t) + '">'; }).join('') + '</datalist>') +
      '<div class="field-row">' +
        C.field('Статус', C.select('status', data.status, Object.keys(S.LESSON_STATUS).map(function (k) {
          return { value: k, label: S.LESSON_STATUS[k].label };
        }))) +
        C.field('Вартість уроку',
          '<div class="row" style="gap:8px">' +
          C.input('price', data.price != null ? data.price : (stud ? stud.price : 500),
            'type="number" min="0" step="any" style="flex:1"') +
          '<span class="badge badge--grey" data-cur-tag style="height:42px;padding:0 13px;font-size:13px">' +
          U.esc(U.symbol(lessonCur) + ' ' + lessonCur) + '</span></div>',
          'Валюта береться з картки учня') +
      '</div>' +
      C.field('Конспект уроку', C.textarea('notes', data.notes,
        'placeholder="Що розібрали, що не вийшло, на що звернути увагу наступного разу"'));

    C.modal({
      title: isNew ? 'Новий урок' : 'Редагувати урок',
      sub: preset.lockStudent && stud ? stud.name : '',
      body: body,
      buttons: [
        !isNew ? { label: 'Видалити', kind: 'btn--danger', act: 'del', onClick: function () {
          var bst = S.boardStats(id);
          C.confirm('Видалити урок?',
            'Запис про урок буде вилучено назавжди.' +
            (bst && !bst.empty ? ' Разом з ним зникне дошка з ' +
              U.pl(bst.slides, 'слайдом', 'слайдами', 'слайдами') + ' записів.' : ''),
            function () {
              S.removeLesson(id);
              U.toast('Урок видалено');
              refresh();
            });
        } } : null,
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: isNew ? 'Додати урок' : 'Зберегти', kind: 'btn--primary', act: 'save', icon: 'check',
          onClick: function (root) {
            var v = C.readForm(root);
            v.date = v._date + 'T' + (v._time || '00:00');
            delete v._date; delete v._time;
            // порожнє чи безглузде поле не має перетворювати урок на нульовий
            v.duration = U.clamp(v.duration || defaultDuration(v.studentId), 15, 480);
            if (preset.lockStudent) v.studentId = data.studentId;
            v.currency = S.curOf(v.studentId);
            if (isNew) { S.add('lessons', v); U.toast('Урок додано', 'ok'); }
            else { S.update('lessons', id, v); U.toast('Збережено', 'ok'); }
            refresh();
          } }
      ].filter(Boolean),
      onMount: function (root) {
        var sel = root.querySelector('[name=studentId]');
        if (!sel) return;
        sel.addEventListener('change', function () {
          var s = S.get('students', sel.value);
          if (!s) return;
          var code = s.currency || 'UAH';
          root.querySelector('[data-cur-tag]').textContent = U.symbol(code) + ' ' + code;
          root.querySelector('[name=price]').value = s.price;
          // тривалість теж своя в кожного учня
          var dur = root.querySelector('[name=duration]');
          if (dur) dur.value = defaultDuration(s.id);
        });
      }
    });
  };

  /** Швидкий перегляд уроку з дією «провести». */
  F.lessonView = function (id) {
    var ls = S.get('lessons', id);
    if (!ls) return;
    var st = S.get('students', ls.studentId);
    var hw = S.db().homeworks.filter(function (h) { return h.lessonId === id; });

    var body =
      '<div class="row mb-2" style="gap:14px">' + C.avatar(st, 48) +
      '<div><div style="font-weight:750;font-size:16px">' + U.esc(st ? st.name : '—') + '</div>' +
      '<div class="small muted">' + U.esc(st ? st.grade + ' · ' + st.goal : '') + '</div></div>' +
      '<div class="spacer row" style="gap:6px">' + C.lessonBadge(ls.status) +
      (ls.paid ? C.badge('Оплачено', 'badge--green', 'wallet') : '') + '</div></div>' +

      '<div class="card card--flat mb-2" style="padding:16px 18px">' +
      '<div class="row" style="gap:10px;color:var(--muted);font-size:13px;font-weight:600">' +
      icon('clock', 15) + U.fmtDateTime(ls.date) + ' · ' + U.fmtRelative(ls.date) +
      '<span class="spacer">' + U.money(ls.price || 0, S.lessonCur(ls)) + '</span></div>' +
      '<div style="font-size:17px;font-weight:750;margin-top:8px">' + U.esc(ls.topic || 'Тема не вказана') + '</div>' +
      '</div>' +

      /* Дві незалежні позначки. Досі проведення й оплата були зчеплені: урок
         не можна було відмітити проведеним, не зарахувавши гроші, а це
         звичайна річ — заняття було, платять пізніше. Кнопка внизу лишилась
         для найчастішого випадку, коли обидва разом. */
      '<div class="marks">' +
        '<label class="mark' + (ls.status === 'done' ? ' is-on' : '') + '">' +
          '<input type="checkbox" data-mark="done"' + (ls.status === 'done' ? ' checked' : '') + '>' +
          '<span class="mark__box">' + icon('check', 14) + '</span>' +
          '<span class="mark__t">Проведено</span>' +
        '</label>' +
        '<label class="mark' + (ls.paid ? ' is-on' : '') + '">' +
          '<input type="checkbox" data-mark="paid"' + (ls.paid ? ' checked' : '') + '>' +
          '<span class="mark__box">' + icon('check', 14) + '</span>' +
          '<span class="mark__t">Оплачено</span>' +
          '<span class="mark__sum">' + U.esc(U.money(ls.price || 0, S.lessonCur(ls))) + '</span>' +
        '</label>' +
      '</div>' +

      (ls.notes ? '<div class="field"><label class="field__label">Конспект</label>' +
        '<div class="pre-wrap small" style="background:var(--blue-50);padding:14px 16px;border-radius:12px">' +
        U.esc(ls.notes) + '</div></div>' : '') +

      (hw.length ? '<div class="field"><label class="field__label">Домашнє завдання</label>' +
        hw.map(function (h) {
          return '<div class="row" style="background:#FBFCFE;border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:8px">' +
            '<div style="min-width:0"><div style="font-weight:650;font-size:14px">' + U.esc(h.title) + '</div>' +
            '<div class="small muted" style="margin-top:3px">до ' + U.fmtDate(h.dueDate) + '</div></div>' +
            '<span class="spacer">' + C.hwBadge(h.status) + '</span></div>';
        }).join('') + '</div>' : '');

    C.modal({
      title: 'Урок',
      body: body,
      buttons: [
        S.meetUrlFor(ls.studentId)
          ? { label: 'Приєднатися', kind: 'btn--ghost', act: 'meet', icon: 'present',
              onClick: function () { window.open(S.meetUrlFor(ls.studentId), '_blank', 'noopener'); } }
          : null,
        { label: 'Редагувати', kind: 'btn--ghost', act: 'edit', icon: 'edit',
          onClick: function () { setTimeout(function () { F.lesson(id); }, 60); } },
        { label: 'Дошка', kind: 'btn--soft', act: 'board', icon: 'board',
          onClick: function () { location.hash = '#/board/' + id; } },
        // кнопка лише для найчастішого випадку; поодинці — позначками вище
        (ls.status === 'done' && ls.paid)
          ? null
          : { label: 'Проведено й оплачено', kind: 'btn--primary', act: 'done', icon: 'check',
              onClick: function () {
                S.completeLesson(id, true);
                U.toast('Проведено й оплачено · ' + U.money(ls.price || 0, S.lessonCur(ls)), 'ok');
                refresh();
              } }
      ].filter(Boolean),

      onMount: function (root, close) {
        U.$$('[data-mark]', root).forEach(function (inp) {
          inp.addEventListener('change', function () {
            var on = inp.checked;
            if (inp.dataset.mark === 'done') {
              /* Знімаємо проведення — знімаємо й оплату: платять за урок,
                 якого тепер немає. Ставимо — оплату не чіпаємо. */
              if (on) { S.completeLesson(id, false); U.toast('Відмічено як проведений', 'ok'); }
              else { S.uncompleteLesson(id); U.toast('Урок знову запланований'); }
            } else {
              S.setLessonPaid(id, on);
              U.toast(on ? 'Оплату зараховано' : 'Оплату знято', on ? 'ok' : undefined);
            }
            refresh();
            // перевідкриваємо, щоб позначки й кнопка показували новий стан
            close();
            setTimeout(function () { F.lessonView(id); }, 60);
          });
        });
      }
    });
  };

  /* ============================================================
     Смужка фото: спільна для ДЗ і матеріалів
     ============================================================ */

  function photoStripHtml() {
    return '<div class="photo-strip" data-strip>' +
      '<button type="button" class="photo-add" data-photo-add>' + icon('image', 18) +
      '<span>Додати фото</span></button>' +
      '<input type="file" accept="image/*" multiple hidden data-photo-input>' +
      '</div>';
  }

  /**
   * Оживити смужку фото. keys — масив ключів у ImgStore, змінюється на місці.
   * Фото стискаються так само, як на дошці, і лежать в IndexedDB.
   */
  function mountPhotoStrip(root, keys) {
    var strip = root.querySelector('[data-strip]');
    var input = root.querySelector('[data-photo-input]');
    if (!strip || !input) return;

    function render() {
      U.$$('.photo-thumb', strip).forEach(function (x) { x.remove(); });
      keys.forEach(function (k) {
        var el = document.createElement('div');
        el.className = 'photo-thumb';
        el.innerHTML = '<img alt="">' +
          '<button type="button" class="photo-del" data-del="' + k + '" title="Прибрати">' +
          icon('x', 13) + '</button>';
        strip.insertBefore(el, strip.querySelector('.photo-add'));
        if (window.ImgStore && window.ImgStore.available()) {
          window.ImgStore.get(k).then(function (blob) {
            if (blob) el.querySelector('img').src = URL.createObjectURL(blob);
            else el.classList.add('is-missing');
          }).catch(function () { el.classList.add('is-missing'); });
        }
      });
    }

    strip.addEventListener('click', function (e) {
      var add = e.target.closest('[data-photo-add]');
      if (add) { e.preventDefault(); input.click(); return; }
      var del = e.target.closest('[data-del]');
      if (del) {
        e.preventDefault();
        var i = keys.indexOf(del.dataset.del);
        if (i >= 0) keys.splice(i, 1);
        render();
      }
    });

    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      input.value = '';
      if (!files.length) return;
      if (!window.ImgStore || !window.ImgStore.available()) {
        U.toast('Браузер не дає зберігати фото', 'err');
        return;
      }
      U.toast('Обробляю ' + U.pl(files.length, 'фото', 'фото', 'фото') + '…');
      Promise.all(files.map(function (f) {
        return window.ImgStore.ingest(f).then(function (m) { return m.key; })
          .catch(function () { return null; });
      })).then(function (added) {
        var ok = added.filter(Boolean);
        ok.forEach(function (k) { keys.push(k); });
        render();
        if (ok.length) U.toast('Додано ' + U.pl(ok.length, 'фото', 'фото', 'фото'), 'ok');
        if (ok.length < files.length) U.toast('Частину файлів не вдалося прочитати', 'err');
      });
    });

    // вставка скріншота прямо в діалог
    root.addEventListener('paste', function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image/') === 0) {
          var f = items[i].getAsFile();
          if (!f) continue;
          e.preventDefault();
          window.ImgStore.ingest(f).then(function (m) {
            keys.push(m.key); render();
            U.toast('Скріншот додано', 'ok');
          }).catch(function () { U.toast('Не вдалося вставити скріншот', 'err'); });
          return;
        }
      }
    });

    render();
  }

  /* ============================================================
     Домашнє завдання
     ============================================================ */

  /**
   * @param onDone — викликається після збереження чи видалення. Потрібен дошці:
   *   вона не перемальовується цілком, тому має сама оновити лічильник
   *   і перевидати урок для учня.
   */
  F.homework = function (id, preset, onDone) {
    preset = preset || {};
    var done = function () { if (onDone) { try { onDone(); } catch (e) {} } };
    var hw = id ? S.get('homeworks', id) : null;
    var isNew = !hw;
    var stList = S.students();
    if (!stList.length) { U.toast('Спочатку додайте учня', 'err'); return; }

    var data = hw || {
      studentId: preset.studentId || stList[0].id,
      lessonId: preset.lessonId || '',
      title: '', description: '',
      dueDate: U.ymd(U.addDays(new Date(), 3)),
      status: 'assigned', feedback: '', photos: [], solutions: []
    };
    var photoKeys = (data.photos || []).slice();
    var solutions = (data.solutions || []).slice();

    /* Надіслане учнем показуємо окремо від фото завдання. Раніше все лежало
       в одному списку, і зрозуміти, де твоє, а де його, було неможливо. */
    /* Підпис збираємо вручну: C.field екранує його, тому значок із кількістю
       через нього вивівся б звичайним текстом. */
    var solutionsField = solutions.length
      ? '<div class="field">' +
          '<label class="field__label">Розв\'язання від учня' +
          '<span class="sol-n">' + solutions.length + '</span></label>' +
          '<div class="photo-strip photo-strip--view" data-sol></div>' +
          '<div class="field__hint">Натисніть на фото, щоб відкрити на весь екран. ' +
          'Хрестик прибирає його.</div>' +
        '</div>'
      : (isNew ? '' : '<div class="field"><label class="field__label">Розв\'язання від учня</label>' +
          '<div class="sol-empty">' + icon('clock', 15) + 'Учень ще не надіслав</div></div>');

    var body =
      (preset.lockStudent || !isNew ? '' : C.field('Учень', C.studentSelect('studentId', data.studentId))) +
      C.field('Завдання', C.input('title', data.title, 'placeholder="Напр. Збірник Істер, §12 — №4.1–4.14"')) +
      C.field('Опис / коментар', C.textarea('description', data.description,
        'placeholder="На що звернути увагу, що робити якщо не виходить"')) +
      C.field('Фото завдання', photoStripHtml(),
        'Сфотографуйте картку чи вставте скріншот через Ctrl+V — стане в пригоді, коли завдання не з підручника.') +
      solutionsField +
      '<div class="field-row">' +
        C.field('Дедлайн', C.input('dueDate', data.dueDate, 'type="date"')) +
        C.field('Статус', C.select('status', data.status, Object.keys(S.HW_STATUS).map(function (k) {
          return { value: k, label: S.HW_STATUS[k].label };
        }))) +
      '</div>' +
      C.field('Відгук для учня', C.textarea('feedback', data.feedback,
        'placeholder="Що вийшло добре, де помилка"'));

    C.modal({
      title: isNew ? 'Нове домашнє завдання' : 'Домашнє завдання',
      body: body,
      buttons: [
        !isNew ? { label: 'Видалити', kind: 'btn--danger', act: 'del', onClick: function () {
          C.confirm('Видалити ДЗ?', 'Завдання буде вилучено назавжди.', function () {
            S.remove('homeworks', id); U.toast('ДЗ видалено'); refresh(); done();
          });
        } } : null,
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: isNew ? 'Задати' : 'Зберегти', kind: 'btn--primary', act: 'save', icon: 'check',
          onClick: function (root) {
            var v = C.readForm(root);
            if (!v.title && !photoKeys.length) {
              U.toast('Опишіть завдання або додайте фото', 'err'); return false;
            }
            if (!v.title) v.title = 'Завдання на фото';
            v.photos = photoKeys.slice();
            v.solutions = solutions.slice();
            if (isNew) {
              v.studentId = preset.lockStudent ? data.studentId : (v.studentId || data.studentId);
              v.lessonId = data.lessonId;
              S.add('homeworks', v); U.toast('ДЗ задано', 'ok');
            } else { S.update('homeworks', id, v); U.toast('Збережено', 'ok'); }
            S.gcImages();
            refresh();
            done();
          } }
      ].filter(Boolean),
      onMount: function (root) {
        mountPhotoStrip(root, photoKeys);
        mountSolutions(root, solutions);
      }
    });
  };

  /** Розв'язання від учня: показати, відкрити на весь екран, прибрати. */
  function mountSolutions(root, solutions) {
    var box = root.querySelector('[data-sol]');
    if (!box) return;

    function render() {
      box.innerHTML = '';
      solutions.forEach(function (s) {
        var el = document.createElement('div');
        el.className = 'photo-thumb';
        el.innerHTML = '<img alt="Розв\'язання">' +
          '<span class="sol-when">' + U.esc(U.fmtDate(s.at)) + '</span>' +
          '<button type="button" class="photo-del" data-soldel="' + U.esc(s.key) +
          '" title="Прибрати">' + icon('x', 13) + '</button>';
        box.appendChild(el);
        if (window.ImgStore && window.ImgStore.available()) {
          window.ImgStore.get(s.key).then(function (blob) {
            if (!blob) { el.classList.add('is-missing'); return; }
            var url = URL.createObjectURL(blob);
            el.querySelector('img').src = url;
            el.dataset.full = url;
          }).catch(function () { el.classList.add('is-missing'); });
        }
      });
    }

    box.addEventListener('click', function (e) {
      var del = e.target.closest('[data-soldel]');
      if (del) {
        e.preventDefault();
        var k = del.dataset.soldel;
        for (var i = 0; i < solutions.length; i++) {
          if (solutions[i].key === k) { solutions.splice(i, 1); break; }
        }
        render();
        return;
      }
      // клік по самій картинці — відкрити у новій вкладці, щоб роздивитися
      var thumb = e.target.closest('.photo-thumb');
      if (thumb && thumb.dataset.full) window.open(thumb.dataset.full, '_blank', 'noopener');
    });

    render();
  }

  /* ============================================================
     Оплата
     ============================================================ */

  F.payment = function (id, preset) {
    preset = preset || {};
    var p = id ? S.get('payments', id) : null;
    var isNew = !p;
    var stList = S.students();
    if (!stList.length) { U.toast('Спочатку додайте учня', 'err'); return; }

    var sid = p ? p.studentId : (preset.studentId || stList[0].id);
    var st = S.get('students', sid);
    var data = p || {
      studentId: sid, date: U.ymd(new Date()),
      amount: st ? st.price * 4 : 2000, method: 'Картка', note: 'Пакет 4 уроки'
    };

    var payCur = p ? S.paymentCur(p) : S.curOf(sid);

    function quickHtml(student) {
      var price = student ? student.price : 500;
      var code = student ? (student.currency || 'UAH') : 'UAH';
      return [1, 4, 8, 10].map(function (n) {
        return '<button type="button" class="chip" data-pack="' + n + '">' +
          n + ' × ' + U.money(price, code) + '</button>';
      }).join('');
    }

    var body =
      (preset.lockStudent ? '' : C.field('Учень', C.studentSelect('studentId', data.studentId))) +
      C.field('Швидко', '<div class="row row--wrap" style="gap:8px" data-quick>' + quickHtml(st) + '</div>') +
      '<div class="field-row">' +
        C.field('Сума',
          '<div class="row" style="gap:8px">' +
          C.input('amount', data.amount, 'type="number" min="0" step="any" style="flex:1"') +
          '<span class="badge badge--grey" data-cur-tag style="height:42px;padding:0 13px;font-size:13px">' +
          U.esc(U.symbol(payCur) + ' ' + payCur) + '</span></div>') +
        C.field('Дата', C.input('date', data.date, 'type="date"')) +
      '</div>' +
      '<div class="field-row">' +
        C.field('Спосіб', C.select('method', data.method, ['Картка', 'Готівка', 'Переказ', 'Інше'])) +
        C.field('Коментар', C.input('note', data.note, 'placeholder="Напр. пакет 4 уроки"')) +
      '</div>' +
      (st ? '<div class="card card--flat" style="padding:14px 16px">' +
        '<div class="row small"><span class="muted">Баланс зараз</span>' +
        '<span class="spacer bold" data-balance style="color:' + (S.balance(sid) < 0 ? 'var(--red)' : 'var(--green)') + '">' +
        U.money(S.balance(sid), payCur) + '</span></div></div>' : '');

    C.modal({
      title: isNew ? 'Записати оплату' : 'Редагувати оплату',
      sub: preset.lockStudent && st ? st.name : '',
      body: body,
      buttons: [
        !isNew ? { label: 'Видалити', kind: 'btn--danger', act: 'del', onClick: function () {
          C.confirm('Видалити оплату?', 'Запис зникне, баланс учня перерахується.', function () {
            S.remove('payments', id); U.toast('Оплату видалено'); refresh();
          });
        } } : null,
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: isNew ? 'Записати' : 'Зберегти', kind: 'btn--primary', act: 'save', icon: 'check',
          onClick: function (root) {
            var v = C.readForm(root);
            if (!v.amount) { U.toast('Вкажіть суму', 'err'); return false; }
            if (preset.lockStudent) v.studentId = data.studentId;
            v.currency = S.curOf(v.studentId);
            if (isNew) { S.add('payments', v); U.toast('Оплату записано', 'ok'); }
            else { S.update('payments', id, v); U.toast('Збережено', 'ok'); }
            refresh();
          } }
      ].filter(Boolean),
      onMount: function (root) {
        var sel = root.querySelector('[name=studentId]');
        var current = st;

        function sync() {
          var code = current ? (current.currency || 'UAH') : 'UAH';
          root.querySelector('[data-cur-tag]').textContent = U.symbol(code) + ' ' + code;
          root.querySelector('[data-quick]').innerHTML = quickHtml(current);
          var bal = root.querySelector('[data-balance]');
          if (bal && current) {
            var b = S.balance(current.id);
            bal.textContent = U.money(b, code);
            bal.style.color = b < 0 ? 'var(--red)' : 'var(--green)';
          }
        }

        if (sel) sel.addEventListener('change', function () {
          current = S.get('students', sel.value);
          sync();
        });

        U.onClick(root, '[data-pack]', function (el) {
          var n = +el.dataset.pack;
          root.querySelector('[name=amount]').value = n * (current ? current.price : 500);
          root.querySelector('[name=note]').value = 'Пакет ' + U.pl(n, 'урок', 'уроки', 'уроків');
        });
      }
    });
  };

  /* ============================================================
     Нотатка
     ============================================================ */

  F.note = function (id, preset) {
    preset = preset || {};
    var n = id ? S.get('notes', id) : null;
    var isNew = !n;
    var data = n || { studentId: preset.studentId, date: U.ymd(new Date()), text: '' };

    C.modal({
      title: isNew ? 'Нова нотатка' : 'Нотатка',
      body:
        C.field('Дата', C.input('date', data.date, 'type="date"')) +
        C.field('Текст', C.textarea('text', data.text,
          'placeholder="Спостереження, домовленості з батьками, що працює а що ні" style="min-height:140px"')),
      buttons: [
        !isNew ? { label: 'Видалити', kind: 'btn--danger', act: 'del', onClick: function () {
          S.remove('notes', id); U.toast('Нотатку видалено'); refresh();
        } } : null,
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Зберегти', kind: 'btn--primary', act: 'save', icon: 'check',
          onClick: function (root) {
            var v = C.readForm(root);
            if (!v.text) { U.toast('Нотатка порожня', 'err'); return false; }
            if (isNew) { v.studentId = data.studentId; S.add('notes', v); }
            else S.update('notes', id, v);
            U.toast('Збережено', 'ok'); refresh();
          } }
      ].filter(Boolean)
    });
  };

  /* ============================================================
     Матеріал
     ============================================================ */

  function fileSize(n) {
    if (!n) return '';
    return n < 1024 ? n + ' Б'
         : n < 1048576 ? Math.round(n / 1024) + ' КБ'
         : (n / 1048576).toFixed(1) + ' МБ';
  }

  function fileStripHtml() {
    return '<div class="file-strip" data-fstrip>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-file-add>' +
      icon('upload', 15) + 'Додати файл</button>' +
      '<input type="file" multiple hidden data-file-input>' +
      '</div>';
  }

  /**
   * Вкладення матеріалу. files — масив {key,name,size,type}, змінюється на місці.
   * Файли лежать у тому самому сховищі, що й картинки дошки: там на порядки
   * більше місця, ніж у звичайному сховищі браузера.
   */
  function mountFileStrip(root, files) {
    var strip = root.querySelector('[data-fstrip]');
    var input = root.querySelector('[data-file-input]');
    if (!strip || !input) return;

    function render() {
      U.$$('.file-row', strip).forEach(function (x) { x.remove(); });
      files.forEach(function (f) {
        var el = document.createElement('div');
        el.className = 'file-row';
        el.innerHTML = '<span class="file-row__i">' + icon('file', 16) + '</span>' +
          '<span class="file-row__n">' + U.esc(f.name || 'файл') + '</span>' +
          '<span class="small muted">' + fileSize(f.size) + '</span>' +
          '<button type="button" class="icon-btn spacer" data-fdel="' + U.esc(f.key) +
          '" title="Прибрати">' + icon('x', 15) + '</button>';
        strip.insertBefore(el, strip.querySelector('[data-file-add]'));
      });
    }

    strip.addEventListener('click', function (e) {
      var add = e.target.closest('[data-file-add]');
      if (add) { e.preventDefault(); input.click(); return; }
      var del = e.target.closest('[data-fdel]');
      if (del) {
        e.preventDefault();
        var k = del.dataset.fdel;
        for (var i = 0; i < files.length; i++) {
          if (files[i].key === k) { files.splice(i, 1); break; }
        }
        render();
      }
    });

    input.addEventListener('change', function () {
      var picked = Array.prototype.slice.call(input.files || []);
      input.value = '';
      if (!picked.length) return;
      if (!window.ImgStore || !window.ImgStore.available()) {
        U.toast('Браузер не дає зберігати файли', 'err'); return;
      }
      // великі файли не приймаємо: сховище браузера не безмежне
      var tooBig = picked.filter(function (f) { return f.size > 25 * 1048576; });
      if (tooBig.length) {
        U.toast('Файл більший за 25 МБ не поміститься: ' + tooBig[0].name, 'err');
        picked = picked.filter(function (f) { return f.size <= 25 * 1048576; });
        if (!picked.length) return;
      }
      U.toast('Зберігаю ' + U.pl(picked.length, 'файл', 'файли', 'файлів') + '…');
      Promise.all(picked.map(function (f) {
        var key = 'file_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        return window.ImgStore.put(key, f)
          .then(function () { return { key: key, name: f.name, size: f.size, type: f.type }; })
          .catch(function () { return null; });
      })).then(function (added) {
        var okFiles = added.filter(Boolean);
        okFiles.forEach(function (f) { files.push(f); });
        render();
        if (okFiles.length) U.toast('Додано ' + U.pl(okFiles.length, 'файл', 'файли', 'файлів'), 'ok');
        if (okFiles.length < picked.length) U.toast('Частину файлів не вдалося зберегти', 'err');
      });
    });

    render();
  }

  F.material = function (id) {
    var m = id ? S.get('materials', id) : null;
    var isNew = !m;
    var data = m || { title: '', type: 'link', url: '', topic: 'Загальне', note: '', files: [] };
    var files = (data.files || []).slice();

    // підтеми беремо з уже наявних, щоб не плодити майже однакові назви
    var known = [];
    S.db().materials.forEach(function (x) { if (x.topic && known.indexOf(x.topic) < 0) known.push(x.topic); });
    S.TOPICS.forEach(function (t) { if (known.indexOf(t) < 0) known.push(t); });
    if (known.indexOf('Загальне') < 0) known.unshift('Загальне');

    C.modal({
      title: isNew ? 'Новий матеріал' : 'Матеріал',
      body:
        C.field('Назва', C.input('title', data.title, 'placeholder="Напр. Картки «Логарифми», рівні A/B/C"')) +
        '<div class="field-row">' +
          C.field('Тип', C.select('type', data.type, [
            { value: 'link', label: 'Посилання' },
            { value: 'file', label: 'Файл / роздруківка' },
            { value: 'note', label: 'Методична нотатка' }
          ])) +
          C.field('Підтема', C.input('topic', data.topic, 'list="mat-topics" placeholder="Напр. Тригонометрія"') +
            '<datalist id="mat-topics">' +
            known.map(function (t) { return '<option value="' + U.esc(t) + '">'; }).join('') +
            '</datalist>') +
        '</div>' +
        C.field('Файли', fileStripHtml(),
          'PDF, документи, картинки — усе, що роздаєте учням. До 25 МБ на файл.') +
        C.field('Посилання', C.input('url', data.url, 'placeholder="https://…"')) +
        C.field('Опис', C.textarea('note', data.note, 'placeholder="Коли і кому давати, на що звертати увагу"')),
      buttons: [
        !isNew ? { label: 'Видалити', kind: 'btn--danger', act: 'del', onClick: function () {
          S.remove('materials', id); S.gcImages(); U.toast('Матеріал видалено'); refresh();
        } } : null,
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Зберегти', kind: 'btn--primary', act: 'save', icon: 'check',
          onClick: function (root) {
            var v = C.readForm(root);
            if (!v.title) { U.toast('Вкажіть назву', 'err'); return false; }
            if (!v.topic) v.topic = 'Загальне';
            v.files = files.slice();
            if (isNew) S.add('materials', v); else S.update('materials', id, v);
            S.gcImages();
            U.toast('Збережено', 'ok'); refresh();
          } }
      ].filter(Boolean),
      onMount: function (root) { mountFileStrip(root, files); }
    });
  };

  /* ============================================================
     Прогрес по темах
     ============================================================ */

  F.progress = function (studentId) {
    var st = S.get('students', studentId);
    var rows = S.TOPICS.map(function (t) {
      var lvl = S.progressLevel(studentId, t);
      return '<div style="padding:12px 0;border-bottom:1px solid var(--line)">' +
        '<div class="row" style="gap:10px">' +
        '<div style="flex:1;font-size:13.5px;font-weight:600">' + U.esc(t) + '</div>' +
        '<output style="font-size:13px;font-weight:750;color:var(--blue-700);width:42px;text-align:right" ' +
        'data-out="' + U.esc(t) + '">' + (lvl == null ? '—' : lvl + '%') + '</output>' +
        '</div>' +
        '<input type="range" min="0" max="100" step="5" value="' + (lvl == null ? 0 : lvl) + '" ' +
        'data-topic="' + U.esc(t) + '" style="width:100%;margin-top:8px;accent-color:var(--blue-600);cursor:pointer">' +
        '</div>';
    }).join('');

    C.modal({
      title: 'Рівень засвоєння тем',
      sub: st ? st.name : '',
      wide: true,
      body: '<div class="field__hint mb-2">Пересуньте повзунок для кожної теми, яку вже проходили. 0% — тему ще не чіпали.</div>' + rows,
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Зберегти', kind: 'btn--primary', act: 'save', icon: 'check',
          onClick: function (root) {
            U.$$('[data-topic]', root).forEach(function (el) {
              var v = +el.value;
              var topic = el.dataset.topic;
              var existing = S.progressLevel(studentId, topic);
              if (v > 0 || existing != null) S.setProgress(studentId, topic, v);
            });
            U.toast('Прогрес оновлено', 'ok'); refresh();
          } }
      ],
      onMount: function (root) {
        U.$$('[data-topic]', root).forEach(function (el) {
          el.addEventListener('input', function () {
            var out = root.querySelector('[data-out="' + CSS.escape(el.dataset.topic) + '"]');
            if (out) out.textContent = el.value + '%';
          });
        });
      }
    });
  };

  /* ============================================================
     Згенерувати уроки на тиждень за постійним розкладом
     ============================================================ */

  /* ============================================================
     Вивантаження оплат
     ============================================================

     Таблиця для звіту чи податкової. CSV, бо його відкриє і Excel, і
     Google Таблиці, і будь-що інше — на відміну від нашого формату
     резервної копії, який зрозуміла б лише сама програма. */

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    // кома, лапки й переноси рядків мають бути екрановані, інакше стовпці поїдуть
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  F.exportPayments = function () {
    var today = U.today();
    var from = new Date(today.getFullYear(), today.getMonth(), 1);
    var to = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    C.modal({
      title: 'Вивантажити оплати',
      sub: 'таблиця для звіту — відкриється в Excel чи Google Таблицях',
      body:
        '<div class="field-row">' +
          C.field('З', C.input('from', U.ymd(from), 'type="date"')) +
          C.field('По', C.input('to', U.ymd(to), 'type="date"')) +
        '</div>' +
        '<div class="field__hint">Один рядок — одна оплата: дата, учень, сума, валюта, ' +
        'спосіб і примітка. Суми лишаються у своїй валюті, без переведення — ' +
        'щоб у звіті стояли ті самі числа, які ви отримали.</div>',
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Зберегти файл', kind: 'btn--primary', act: 'go', icon: 'download',
          onClick: function (root) {
            var v = C.readForm(root);
            var a1 = U.toDate(v.from), b1 = U.toDate(v.to);
            if (!v.from || !v.to || a1 > b1) { U.toast('Перевірте дати', 'err'); return false; }

            var rows = U.sortBy(S.paymentsBetween(a1, b1), function (p) { return p.date; });
            if (!rows.length) { U.toast('За цей проміжок оплат немає', 'err'); return false; }

            var head = ['Дата', 'Учень', 'Сума', 'Валюта', 'Спосіб', 'Примітка'];
            var body = rows.map(function (p) {
              var st = S.get('students', p.studentId);
              return [
                p.date.slice(0, 10),
                st ? st.name : 'Видалений учень',
                // кома як десятковий роздільник — так очікує українська локаль Excel
                String(p.amount == null ? '' : p.amount).replace('.', ','),
                S.paymentCur(p),
                p.method || '',
                p.note || ''
              ].map(csvCell).join(';');
            });

            /* BOM на початку: без нього Excel читає файл у своєму кодуванні
               й українські імена перетворюються на кракозябри. */
            var csv = '﻿' + [head.map(csvCell).join(';')].concat(body).join('\r\n');
            var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'oplaty-' + v.from + '_' + v.to + '.csv';
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
            U.toast('Вивантажено ' + U.pl(rows.length, 'оплату', 'оплати', 'оплат'), 'ok');
          } }
      ]
    });
  };

  F.generateWeek = function () {
    var monday = U.startOfWeek(U.addDays(new Date(), 7));
    var body =
      C.field('Починаючи з', C.input('from', U.ymd(monday), 'type="date"')) +
      /* Раніше тут був вибір із чотирьох тижнів, і це змушувало повертатися
         до вікна щомісяця. Поле вільне: скільки треба, стільки й наперед. */
      C.field('На скільки тижнів вперед',
        C.input('weeks', 4, 'type="number" min="1" max="104" step="1" list="weeks-list"') +
        '<datalist id="weeks-list">' +
        [1, 2, 4, 8, 12, 26, 52].map(function (w) { return '<option value="' + w + '">'; }).join('') +
        '</datalist>',
        'Хоч на рік наперед — 52. Уроки можна буде переносити й скасовувати як завжди.') +
      '<div class="field__hint">Уроки створяться для всіх учнів, у яких заповнений постійний розклад. Учні в архіві пропускаються. Дублікати на ту саму дату й час теж.</div>';

    C.modal({
      title: 'Створити уроки за розкладом',
      body: body,
      buttons: [
        { label: 'Скасувати', kind: 'btn--ghost', act: 'cancel' },
        { label: 'Створити', kind: 'btn--primary', act: 'go', icon: 'sparkles',
          onClick: function (root) {
            var v = C.readForm(root);
            var start = U.startOfWeek(v.from);
            var weeks = U.clamp(+v.weeks || 4, 1, 104);
            var made = 0;

            for (var w = 0; w < weeks; w++) {
              S.students().forEach(function (st) {
                (st.schedule || []).forEach(function (slot) {
                  var d = U.addDays(start, (w * 7) + slot.day - 1);
                  var iso = U.ymd(d) + 'T' + slot.time;
                  var dup = S.db().lessons.some(function (l) {
                    return l.studentId === st.id && l.date === iso;
                  });
                  if (dup) return;
                  S.add('lessons', {
                    studentId: st.id, date: iso, duration: st.duration || 60,
                    price: st.price, currency: st.currency || 'UAH',
                    topic: '', status: 'planned', notes: ''
                  });
                  made++;
                });
              });
            }
            U.toast(made ? 'Створено ' + U.pl(made, 'урок', 'уроки', 'уроків') : 'Нових уроків не з\'явилося', made ? 'ok' : null);
            refresh();
          } }
      ]
    });
  };

  window.F = F;
})();
