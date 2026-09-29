/* Сторінка уроку для учня — на тому самому рушії, що й дошка репетитора.

   Досі учень бачив спрощену копію: кабінет складав окрему сторінку й
   перевидавав її після змін. Тепер учень відкриває справжню дошку:
   стан береться прямо з бази (знімок плюс дії після нього), зміни
   репетитора приходять живим каналом, а написане учнем записується в той
   самий журнал дій, що й у репетитора. Однаковий рушій — однакова картинка:
   точки, побудови, тіла, графіки виглядають так само, як у кабінеті.

   Що дозволено учневі: бачити відкриті слайди й писати поверх них. Своє
   він може рухати, змінювати й стирати; дошку репетитора — лише бачити.
   Це тримає і сам рушій (opts.canEdit), і база, яка перевіряє кожну дію.

   Сторінку запускає share.html через StudentBoard.start(env) — у env усе,
   що стосується мережі: виклики бази, живий канал, завантаження фото. */

(function () {
  'use strict';

  var SB = {};
  var core = function () { return window.BoardCore; };

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function el(id) { return document.getElementById(id); }

  var COLORS = ['#0D2149', '#4B3FDB', '#E24A4A', '#16A34A', '#F2A93B', '#8B5CF6', '#DB2777', '#64748B'];
  var WIDTHS = [2, 4, 7];
  var TOOLS = [
    ['hand', '✋', 'Рух по полотну (або пробіл)'],
    ['select', '↖', 'Вибрати й пересунути своє'],
    ['pen', '✎', 'Олівець'],
    ['eraser', '◻', 'Гумка — стирає лише ваше'],
    ['text', 'T', 'Текст'],
    ['shape:rect', '▭', 'Прямокутник'],
    ['shape:circle', '◯', 'Коло'],
    ['shape:tri-right', '◺', 'Прямокутний трикутник'],
    ['point', '•', 'Точка'],
    ['link', '╱', 'Відрізок між точками']
  ];

  /* ============================================================
     Вигляд
     ============================================================ */

  var CSS =
    '*{box-sizing:border-box}html,body{margin:0;height:100%;font-family:Manrope,"Segoe UI",system-ui,sans-serif;background:#F6F5FB;color:#17163A}' +
    '.sb{display:flex;flex-direction:column;height:100%}' +
    '.sb-top{display:flex;align-items:center;gap:14px;padding:10px 16px;background:#fff;border-bottom:1px solid #E7E5F2;flex-wrap:wrap}' +
    '.sb-ttl{font-weight:750;font-size:15px}.sb-sub{font-size:12px;color:#7E90AE;margin-top:2px}' +
    '.sb-sp{margin-left:auto;display:flex;align-items:center;gap:8px}' +
    '.sb-btn{border:1.5px solid #E7E5F2;background:#fff;border-radius:999px;padding:7px 13px;font:inherit;font-size:13px;font-weight:650;cursor:pointer;color:#3D3B63}' +
    '.sb-btn:hover{background:#F1EFFE;border-color:#8FB4FF;color:#3A31B0}.sb-btn:disabled{opacity:.4;cursor:not-allowed}' +
    '.sb-pos{font-size:13px;font-weight:700;min-width:64px;text-align:center}' +
    '.sb-body{flex:1;position:relative;min-height:0}' +
    '.sb-body canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;background:#fff}' +
    '.sb-name{position:absolute;left:72px;top:12px;background:rgba(255,255,255,.94);border:1px solid #E7E5F2;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:700;box-shadow:0 4px 14px rgba(23,22,58,.07);max-width:calc(100% - 100px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none}' +
    '.sb-tools{position:absolute;left:12px;top:50%;transform:translateY(-50%);background:#fff;border-radius:16px;box-shadow:0 6px 24px rgba(23,22,58,.13);padding:6px;display:flex;flex-direction:column;gap:3px;z-index:3;max-height:calc(100% - 24px);overflow-y:auto}' +
    '.sb-tl{width:40px;height:40px;border:0;background:none;border-radius:11px;cursor:pointer;font-size:17px;line-height:1;color:#3D3B63;display:flex;align-items:center;justify-content:center}' +
    '.sb-tl:hover{background:#F1EFFE;color:#3A31B0}.sb-tl.on{background:#4B3FDB;color:#fff}' +
    '.sb-opts{position:absolute;left:64px;bottom:16px;background:#fff;border-radius:14px;box-shadow:0 6px 24px rgba(23,22,58,.13);padding:8px;display:flex;gap:10px;align-items:center;z-index:3;flex-wrap:wrap;max-width:calc(100% - 180px)}' +
    '.sb-sw{width:24px;height:24px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}.sb-sw.on{border-color:#17163A;box-shadow:0 0 0 2px #fff inset}' +
    '.sb-wd{width:30px;height:26px;border:0;background:none;cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center}.sb-wd.on,.sb-wd:hover{background:#F1EFFE}' +
    '.sb-wd i{display:block;width:16px;background:#3D3B63;border-radius:99px}' +
    '.sb-zoom{position:absolute;right:14px;bottom:16px;background:#fff;border-radius:999px;box-shadow:0 6px 24px rgba(23,22,58,.12);padding:4px;display:flex;gap:2px;align-items:center;z-index:3}' +
    '.sb-zoom button{width:32px;height:32px;border:0;background:none;border-radius:50%;cursor:pointer;font-size:16px;font-weight:700;color:#3D3B63}.sb-zoom button:hover{background:#F1EFFE}' +
    '.sb-zv{min-width:48px;text-align:center;font-size:12px;font-weight:700}' +
    '.sb-rail{flex:0 0 auto;display:flex;gap:8px;padding:9px 14px;background:#fff;border-top:1px solid #E7E5F2;overflow-x:auto}' +
    '.sb-sc{flex:0 0 auto;border:2px solid #E7E5F2;background:#fff;border-radius:10px;padding:6px 12px;cursor:pointer;font:inherit;font-size:12px;font-weight:650;color:#3D3B63;white-space:nowrap}.sb-sc.on{border-color:#4B3FDB;color:#3A31B0;background:#F1EFFE}' +
    '.sb-tag{flex:0 0 auto;align-self:center;font-size:10.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:#AAA8C2;padding:0 4px 0 8px;border-left:2px solid #E7E5F2;white-space:nowrap}.sb-tag:first-child{border-left:0;padding-left:0}.sb-tag.hw{color:#B06A10}' +
    '.sb-note{padding:10px 16px;background:#F1EFFE;border-top:1px solid #E7E5F2;font-size:13px;line-height:1.6;white-space:pre-wrap}' +
    '.sb-extra{max-height:34vh;overflow-y:auto;border-top:1px solid #E7E5F2;background:#fff}' +
    '.sb-extra h3{margin:0;padding:12px 16px 6px;font-size:13px;letter-spacing:.6px;text-transform:uppercase;color:#AAA8C2}' +
    '.sb-hw{padding:10px 16px 14px;border-bottom:1px solid #E7E5F2}.sb-hw:last-child{border-bottom:0}.sb-hw b{font-size:14px}' +
    '.sb-meta{font-size:12px;color:#7E90AE;margin-top:3px}.sb-sent{color:#16A34A;font-weight:700}' +
    '.sb-desc{font-size:13px;line-height:1.6;margin-top:7px;white-space:pre-wrap;background:#F1EFFE;padding:10px 12px;border-radius:10px}' +
    '.sb-shots{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}.sb-shots a{display:block;width:90px;height:90px;border:1.5px solid #E7E5F2;border-radius:10px;overflow:hidden}.sb-shots img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.sb-add{display:inline-block;margin-top:9px;cursor:pointer}.sb-add input{display:none}.sb-add span{display:inline-block;border:1.5px dashed #8FB4FF;border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:650;color:#3A31B0;background:#F7FAFF}.sb-add.busy span{opacity:.55}' +
    '.sb-mats{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}.sb-matf{display:inline-block;border:1.5px solid #E7E5F2;border-radius:10px;padding:7px 13px;font-size:12.5px;font-weight:650;color:#3A31B0;text-decoration:none;background:#fff}' +
    '.sb-sheet{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-top:10px}' +
    '.sb-rule{border:1px solid #E7E5F2;border-radius:12px;padding:10px;background:#fff}.sb-rule__h{font-weight:700;font-size:12px;color:#3A31B0;margin-bottom:7px}' +
    '.sb-rule__f{text-align:center;font-size:17px;padding:9px 8px;background:#F7F6FD;border-radius:9px;overflow-x:auto}' +
    '.sb-rule__e{text-align:center;font-size:13px;padding:6px 8px;margin-top:6px;background:#E9F8F0;border-radius:9px}' +
    '.mf{font-family:"Source Serif 4","Cambria Math",Georgia,serif;font-weight:600}.mf .mf-v{font-style:italic}.mf sup,.mf sub{font-size:.66em;line-height:1}' +
    '.mf-frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 .2em;line-height:1.08}.mf-den{border-top:2px solid currentColor}' +
    '.sb-tin{position:absolute;z-index:6;min-width:170px;min-height:34px;border:2px solid #4B3FDB;border-radius:8px;padding:5px 8px;font-family:inherit;font-weight:500;line-height:1.25;background:rgba(255,255,255,.97);outline:none;resize:none;overflow:hidden}' +
    '.sb-del{position:absolute;right:14px;top:12px;z-index:4;color:#C62828;border-color:#F3C4C4;box-shadow:0 4px 14px rgba(23,22,58,.1)}.sb-del[hidden]{display:none}' +
    '.sb-toast{position:fixed;left:50%;bottom:74px;transform:translateX(-50%);background:#17163A;color:#fff;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;opacity:0;transition:opacity .2s;pointer-events:none;z-index:9}.sb-toast.show{opacity:1}' +
    '@media(max-width:640px){.sb-top{padding:8px 10px}.sb-sp{width:100%;justify-content:space-between}.sb-tl{width:34px;height:34px;font-size:15px}.sb-opts{left:56px;max-width:calc(100% - 70px)}.sb-name{left:56px}}';

  /* ============================================================
     Старт
     ============================================================ */

  SB.start = function (env) {
    var token = env.token;
    var canWrite = !!env.row.can_write;
    var meta = env.meta || {};

    /* ---------- Розмітка ---------- */

    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    env.root.innerHTML =
      '<div class="sb">' +
        '<div class="sb-top">' +
          '<div><div class="sb-ttl">' + esc(meta.title || 'Урок') + '</div>' +
          '<div class="sb-sub">' + esc([meta.student, meta.date].filter(Boolean).join(' · ')) + '</div></div>' +
          '<div class="sb-sp">' +
            (canWrite
              ? '<button class="sb-btn" id="sb-undo" title="Скасувати (Ctrl+Z)" disabled>↶</button>' +
                '<button class="sb-btn" id="sb-redo" title="Повернути (Ctrl+Y)" disabled>↷</button>'
              : '') +
            '<button class="sb-btn" id="sb-prev">← Назад</button>' +
            '<span class="sb-pos" id="sb-pos"></span>' +
            '<button class="sb-btn" id="sb-next">Далі →</button>' +
          '</div>' +
        '</div>' +
        '<div class="sb-body" id="sb-body">' +
          '<canvas id="sb-canvas"></canvas>' +
          '<div class="sb-name" id="sb-name"></div>' +
          (canWrite
            ? '<div class="sb-tools" id="sb-tools">' +
                TOOLS.map(function (t) {
                  return '<button class="sb-tl" data-tool="' + t[0] + '" title="' + esc(t[2]) + '">' + t[1] + '</button>';
                }).join('') +
                '<label class="sb-tl" title="Додати фото або скріншот (можна Ctrl+V)">🖼' +
                  '<input type="file" accept="image/*" multiple hidden id="sb-pic"></label>' +
              '</div>' +
              '<div class="sb-opts" id="sb-opts"></div>' +
              /* На телефоні клавіші Delete немає, а гумка бере лише штрихи:
                 зайве фото, фігуру чи текст інакше було не прибрати. */
              '<button class="sb-btn sb-del" id="sb-del" hidden>🗑 Видалити</button>'
            : '') +
          '<div class="sb-zoom"><button id="sb-zo" title="Віддалити">−</button><span class="sb-zv" id="sb-zv">100%</span>' +
            '<button id="sb-zi" title="Наблизити">+</button><button id="sb-zf" title="Вмістити" style="font-size:13px">⤢</button></div>' +
        '</div>' +
        '<div class="sb-rail" id="sb-rail"></div>' +
        '<div id="sb-panels"></div>' +
      '</div>' +
      '<div class="sb-toast" id="sb-toast"></div>';

    var toastTimer = null;
    function toast(text) {
      var t = el('sb-toast');
      t.textContent = text;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
    }

    /* ---------- Стан ---------- */

    var board = { slides: (env.row.data && env.row.data.slides) || [] };
    var base = null;                 // що відомо серверу — від нього рахуємо свої зміни
    var after = 0;                   // номер останньої прочитаної дії
    var localSrc = {};               // свіжі фото учня, ще без адреси в сховищі репетитора
    var idx = 0;

    function visible() {
      return board.slides.filter(function (s) { return !(s.hidden === 1 || s.hidden === true); });
    }

    function slideById(id) {
      for (var i = 0; i < board.slides.length; i++) if (board.slides[i].id === id) return board.slides[i];
      return null;
    }

    function findItem(state, sid, id) {
      var sl = null;
      (state.slides || []).forEach(function (s) { if (s.id === sid) sl = s; });
      if (!sl) return null;
      for (var i = 0; i < (sl.items || []).length; i++) if (sl.items[i].id === id) return sl.items[i];
      return null;
    }

    /** Хто власник обʼєкта в стані: true — учень, false — репетитор, null — немає. */
    function ownerIn(state) {
      return function (id) {
        var found = null;
        (state.slides || []).some(function (sl) {
          return (sl.items || []).some(function (it) {
            if (it && it.id === id) { found = it.by === 'student'; return true; }
            return false;
          });
        });
        return found;
      };
    }

    /* ---------- Рушій ---------- */

    Board.imageSource = function (key, item) {
      if (item && item.src) return item.src;
      if (localSrc[key]) return localSrc[key];
      if (meta.images && meta.images[key]) return meta.images[key];
      return env.API + '/storage/v1/object/public/shares/' + encodeURIComponent(env.uid) + '/' +
        encodeURIComponent(token) + '/img/' + encodeURIComponent(key);
    };

    var engine = new Board(el('sb-canvas'), {
      readOnly: !canWrite,
      /* Своє — позначене учнівським або ще не відоме серверу (щойно
         намальоване, до відправки). Усе, що прийшло від репетитора, серверу
         відоме й позначки учня не має. */
      canEdit: function (it) {
        if (!it) return false;
        if (it.by === 'student') return true;
        var cur = currentSlide();
        return !!(base && cur && !findItem(base, cur.id, it.id));
      },
      onChange: function () { scheduleSend(); },
      onSelect: function (sel) {
        var d = el('sb-del');
        if (d) d.hidden = !(sel && sel.length);
      },
      onViewChange: paintZoom,
      onToolChange: paintTools,
      onTextPlace: placeText
    });
    engine.color = COLORS[0];
    engine.width = WIDTHS[0];
    SB.engine = engine;              // для перевірки на стенді
    if (canWrite) engine.setTool('pen'); else engine.setTool('hand');

    /* ---------- Слайди ---------- */

    var SAVE_KEY = 'vektor.sb.view.' + token;

    function go(i, keepView) {
      var list = visible();
      if (!list.length) {
        el('sb-pos').textContent = '—';
        el('sb-name').textContent = 'Слайдів поки немає';
        paintRail();
        return;
      }
      idx = Math.max(0, Math.min(i, list.length - 1));
      var s = list[idx];
      s.items = s.items || [];
      engine.setSlide(s, keepView);
      el('sb-pos').textContent = (idx + 1) + ' / ' + list.length;
      el('sb-prev').disabled = idx === 0;
      el('sb-next').disabled = idx === list.length - 1;
      el('sb-name').textContent = s.title || ('Слайд ' + (idx + 1));
      paintRail();
      paintZoom();
      try { localStorage.setItem(SAVE_KEY, s.id); } catch (e) {}
    }

    function currentSlide() { return visible()[idx] || null; }

    function paintRail() {
      var list = visible();
      var html = '', lastKind = null;
      list.forEach(function (s, i) {
        var kind = s.kind === 'hw' ? 'hw' : 'lesson';
        if (kind !== lastKind) {
          html += '<span class="sb-tag' + (kind === 'hw' ? ' hw' : '') + '">' + (kind === 'hw' ? 'ДЗ' : 'Урок') + '</span>';
          lastKind = kind;
        }
        html += '<button class="sb-sc' + (i === idx ? ' on' : '') + '" data-go="' + i + '">' +
          esc(s.title || ('Слайд ' + (i + 1))) + '</button>';
      });
      el('sb-rail').innerHTML = html;
    }

    el('sb-rail').addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]');
      if (b) { flushSend(); go(+b.getAttribute('data-go')); }
    });
    el('sb-prev').onclick = function () { flushSend(); go(idx - 1); };
    el('sb-next').onclick = function () { flushSend(); go(idx + 1); };

    /* ---------- Масштаб ---------- */

    function paintZoom() {
      var z = el('sb-zv');
      if (z) z.textContent = Math.round(engine.scale * 100) + '%';
    }
    el('sb-zi').onclick = function () { engine.zoomAt(1.25, engine.cssW / 2, engine.cssH / 2); };
    el('sb-zo').onclick = function () { engine.zoomAt(1 / 1.25, engine.cssW / 2, engine.cssH / 2); };
    el('sb-zf').onclick = function () { engine.fit(); };

    /* ---------- Інструменти ---------- */

    function paintTools() {
      var box = el('sb-tools');
      if (!box) return;
      box.querySelectorAll('[data-tool]').forEach(function (b) {
        var t = b.getAttribute('data-tool');
        var on = t.indexOf('shape:') === 0
          ? engine.tool === 'shape' && engine.shape === t.slice(6)
          : engine.tool === t;
        b.classList.toggle('on', on);
      });
      var opts = el('sb-opts');
      if (!opts) return;
      opts.innerHTML =
        COLORS.map(function (c) {
          return '<button class="sb-sw' + (engine.color === c ? ' on' : '') + '" data-color="' + c +
            '" style="background:' + c + '" title="Колір"></button>';
        }).join('') +
        '<span style="width:1px;height:22px;background:#E7E5F2"></span>' +
        WIDTHS.map(function (w) {
          return '<button class="sb-wd' + (engine.width === w ? ' on' : '') + '" data-width="' + w + '" title="Товщина">' +
            '<i style="height:' + Math.max(2, w) + 'px"></i></button>';
        }).join('');
    }

    if (canWrite) {
      el('sb-tools').addEventListener('click', function (e) {
        var b = e.target.closest('[data-tool]');
        if (!b) return;
        var t = b.getAttribute('data-tool');
        if (t.indexOf('shape:') === 0) engine.setShape(t.slice(6)); else engine.setTool(t);
      });
      el('sb-opts').addEventListener('click', function (e) {
        var c = e.target.closest('[data-color]');
        var w = e.target.closest('[data-width]');
        if (c) engine.color = c.getAttribute('data-color');
        if (w) engine.width = +w.getAttribute('data-width');
        paintTools();
      });
    }

    /* ---------- Текст ---------- */

    function placeText(world, screen) {
      if (!canWrite) return;
      var body = el('sb-body');
      var ta = document.createElement('textarea');
      ta.className = 'sb-tin';
      ta.style.left = screen.x + 'px';
      ta.style.top = screen.y + 'px';
      ta.style.fontSize = Math.max(12, engine.fontSize * engine.scale) + 'px';
      ta.style.color = engine.color;
      body.appendChild(ta);
      setTimeout(function () { ta.focus(); }, 0);

      var done = false;
      function finish() {
        if (done) return;
        done = true;
        var v = ta.value.trim();
        ta.remove();
        if (v) engine.addText(world, v);
      }
      ta.addEventListener('blur', finish);
      ta.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { ta.value = ''; finish(); }
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) finish();
      });
      ta.addEventListener('input', function () {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }

    /* ============================================================
       Відправлення свого
       ============================================================

       Рушій змінює дошку на місці. Раз на коротку паузу рахуємо різницю між
       дошкою й тим, що відомо серверу, і залишаємо з неї лише своє. Черга
       лежить у памʼяті браузера: закрита вкладка чи зниклий інтернет нічого
       не забирають. */

    var QKEY = 'vektor.sb.queue.' + token;
    var queue = [];
    try { queue = JSON.parse(localStorage.getItem(QKEY) || '[]') || []; } catch (e) { queue = []; }
    var sending = false, sendTimer = null, retryMs = 800;
    var undoStack = [], redoStack = [], replay = null;

    function keepQueue() {
      try {
        if (queue.length) localStorage.setItem(QKEY, JSON.stringify(queue));
        else localStorage.removeItem(QKEY);
      } catch (e) {}
    }

    function scheduleSend() {
      if (!canWrite) return;
      clearTimeout(sendTimer);
      sendTimer = setTimeout(flushSend, 350);
    }

    /** Порахувати своє й поставити в чергу. */
    function flushSend() {
      if (!canWrite || !base) return;
      clearTimeout(sendTimer);
      if (engine.draft || engine.band) { sendTimer = setTimeout(flushSend, 250); return; }

      // нове, що зʼявилось на цьому пристрої, — учнівське за визначенням
      board.slides.forEach(function (sl) {
        (sl.items || []).forEach(function (it) {
          if (it && it.id && !it.by && !findItem(base, sl.id, it.id)) it.by = 'student';
        });
      });

      var ops = core().diff(base, board);
      var ownedBefore = ownerIn(base), ownedNow = ownerIn(board);
      var mine = ops.filter(function (op) {
        return core().studentAllowed(op, function (id) {
          var b = ownedBefore(id);
          return b === null ? ownedNow(id) : b;
        });
      });

      if (mine.length) {
        record(mine);
        queue = queue.concat(mine);
        keepQueue();
        push();
      }

      /* Усе, що не своє (рушій сам перерахував геометрію чужої фігури чи
         запамʼятав вигляд слайда), лишається тут: серверу воно не належить. */
      base = clone(board);
      paintUndo();
    }

    function push() {
      if (sending || !queue.length) return;
      sending = true;
      var batch = queue.slice(0, 150);

      env.rpc('share_ops_write', { p_token: token, p_ops: batch }).then(function (res) {
        if (res.ok) return res.json().then(function (last) {
          queue = queue.slice(batch.length);
          keepQueue();
          retryMs = 800;
          if (last > after) { /* свої дії назад не застосовуємо — вони вже тут */ }
          env.live.send('ops', { from: 'student' });
        });
        /* Відмова бази — це не збій мережі: дія суперечить правилам (наприклад,
           слайд щойно сховали). Повторювати таку безглуздо, тож відкидаємо. */
        if (res.status >= 400 && res.status < 500) {
          return res.text().then(function (t) {
            console.warn('Дію учня не прийнято:', t);
            queue = queue.slice(batch.length);
            keepQueue();
          });
        }
        throw new Error('http ' + res.status);
      }).catch(function () {
        retryMs = Math.min(retryMs * 2, 15000);
        setTimeout(push, retryMs);
      }).then(function () {
        sending = false;
        if (queue.length) setTimeout(push, 100);
      });
    }

    window.addEventListener('pagehide', function () {
      flushSend();
      if (!queue.length) return;
      try {
        fetch(env.API + '/rest/v1/rpc/share_ops_write', {
          method: 'POST', keepalive: true,
          headers: { apikey: env.KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_token: token, p_ops: queue.slice(0, 150) })
        });
      } catch (e) {}
    });
    window.addEventListener('online', function () { retryMs = 800; push(); });

    /* ---------- Скасувати й повернути — лише своє ---------- */

    function record(ops) {
      var group = [];
      ops.forEach(function (op) {
        if (op.t === 'i+') group.push({ s: op.s, id: op.it.id, before: null, after: clone(op.it) });
        if (op.t === 'i~') group.push({ s: op.s, id: op.it.id, before: clone(findItem(base, op.s, op.it.id)), after: clone(op.it) });
        if (op.t === 'i-') (op.ids || []).forEach(function (id) {
          group.push({ s: op.s, id: id, before: clone(findItem(base, op.s, id)), after: null });
        });
      });
      if (!group.length) return;
      if (replay === 'undo') redoStack.push(group);
      else {
        undoStack.push(group);
        if (undoStack.length > 60) undoStack.shift();
        if (replay !== 'redo') redoStack = [];
      }
    }

    function applyGroup(group, useBefore) {
      group.slice().reverse().forEach(function (c) {
        var sl = slideById(c.s);
        if (!sl) return;
        var want = useBefore ? c.before : c.after;
        sl.items = (sl.items || []).filter(function (it) { return it.id !== c.id; });
        if (want) sl.items.push(clone(want));
      });
    }

    function undo() {
      if (!undoStack.length) return;
      replay = 'undo';
      applyGroup(undoStack.pop(), true);
      go(idx, true);
      flushSend();
      replay = null;
    }

    /* У стеку «повернути» лежать зміни, які зробило саме скасування, тому
       повернення — це знову «як було до них». */
    function redo() {
      if (!redoStack.length) return;
      replay = 'redo';
      applyGroup(redoStack.pop(), true);
      go(idx, true);
      flushSend();
      replay = null;
    }

    function paintUndo() {
      var u = el('sb-undo'), r = el('sb-redo');
      if (u) u.disabled = !undoStack.length;
      if (r) r.disabled = !redoStack.length;
    }

    if (canWrite) {
      el('sb-undo').onclick = undo;
      el('sb-redo').onclick = redo;
      // те саме, що клавіша Delete: прибрати виділене своє
      el('sb-del').onclick = function () {
        if (engine.selection.length) engine.deleteSelection();
        el('sb-del').hidden = true;
      };
    }

    window.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (/^(INPUT|TEXTAREA)$/.test(tag)) return;
      var k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { e.preventDefault(); flushSend(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); flushSend(); redo(); return; }
      if ((k === 'delete' || k === 'backspace') && canWrite && engine.selection.length) {
        e.preventDefault();
        engine.deleteSelection();
        return;
      }
      if (k === 'arrowright' || k === 'pagedown') { flushSend(); go(idx + 1); }
      if (k === 'arrowleft' || k === 'pageup') { flushSend(); go(idx - 1); }
    });

    /* ============================================================
       Отримання чужого
       ============================================================ */

    var pendingRemote = [];

    /** Застосувати дії, що прийшли ззовні, — до дошки й до «відомого серверу». */
    function applyRemote(list) {
      if (!list.length) return;
      if (engine.draft || engine.band) {        // посеред штриха не чіпаємо полотно
        pendingRemote = pendingRemote.concat(list);
        return;
      }
      flushSend();                              // своє спершу в чергу, щоб не загубилось

      var cur = currentSlide();
      var curId = cur ? cur.id : null;
      var structure = false, touchedCur = false, needReload = false;

      list.forEach(function (row) {
        var op = row.op;
        if (!op) return;
        if (row.author === 'student' && !core().studentAllowed(op, ownerIn(board))) return;

        if (op.t === 's+' && op.sl && (op.sl.hidden === 1 || op.sl.hidden === true)) return;
        if (op.t === 's~' && op.p && 'hidden' in op.p && !slideById(op.s) && !op.p.hidden) {
          needReload = true;                    // відкрили слайд, якого в нас немає
          return;
        }

        var a = core().apply(board, op);
        core().apply(base, op);
        if (a) {
          if (op.t === 's+' || op.t === 's-' || op.t === 's~' || op.t === 'so') structure = true;
          if (op.s === curId) touchedCur = true;
        }
      });

      if (needReload) { reload(); return; }

      if (structure) {
        var list2 = visible();
        var at = -1;
        list2.forEach(function (s, i) { if (s.id === curId) at = i; });
        go(at >= 0 ? at : Math.min(idx, list2.length - 1), at >= 0);
      } else if (touchedCur) {
        go(idx, true);
      }
    }

    setInterval(function () {
      if (pendingRemote.length && !engine.draft && !engine.band) {
        var list = pendingRemote;
        pendingRemote = [];
        applyRemote(list);
      }
    }, 300);

    /** Дочитати журнал після номера after. Запасний шлях, коли живий канал мовчить. */
    function poll() {
      return env.rpc('share_ops_read', { p_token: token, p_after: after })
        .then(function (res) { return res.ok ? res.json() : []; })
        .then(function (rows) {
          if (!rows || !rows.length) return;
          rows.forEach(function (r) { if (r.id > after) after = r.id; });
          applyRemote(rows);
        })
        .catch(function () {});
    }

    function pollLoop() {
      setTimeout(function () {
        if (document.visibilityState === 'hidden') return pollLoop();
        poll().then(pollLoop, pollLoop);
      }, env.live.alive() ? 10000 : 2500);
    }

    /* Живий канал: зміни репетитора — одразу; сигнал «перевидано» — свіжі
       матеріали й адреси картинок. */
    env.live.onMessage = function (event, data) {
      if (event === 'ops' && data.ops) {
        applyRemote(data.ops.map(function (op) { return { op: op, author: 'tutor' }; }));
      } else if (event === 'ops' && data.from === 'student') {
        poll();                                 // той самий учень з іншого пристрою
      } else if (event === 'republished') {
        refreshMeta();
      }
    };

    /* ---------- Повне перезавантаження стану ---------- */

    function loadOps(since) {
      return env.rpc('share_board_ops', { p_token: token, p_since: since })
        .then(function (res) { return res.ok ? res.json() : []; })
        .then(function (rows) {
          (rows || []).forEach(function (r) {
            if (r.id > after) after = r.id;
            if (r.author === 'student' && !core().studentAllowed(r.op, ownerIn(board))) return;
            core().apply(board, r.op);
          });
        });
    }

    function reload() {
      return env.rpc('share_board', { p_token: token })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (rows) {
          var row = rows && rows[0];
          if (!row || !row.data) return;
          var keepId = currentSlide() ? currentSlide().id : null;
          board.slides = row.data.slides || [];
          return loadOps(row.since).then(function () {
            base = clone(board);
            var list = visible(), at = 0;
            list.forEach(function (s, i) { if (s.id === keepId) at = i; });
            go(at, false);
          });
        })
        .catch(function () {});
    }

    /* ---------- Матеріали й домашнє ---------- */

    function refreshMeta() {
      env.readMeta().then(function (m) {
        if (!m) return;
        meta = m;
        Object.keys(m.images || {}).forEach(function (k) { Board.forgetImage(k); });
        engine.ensureImages();
        engine.render();
        paintPanels();
      }).catch(function () {});
    }

    function paintPanels() {
      var html = '';
      if (meta.notes) html += '<div class="sb-note"><b>Конспект уроку:</b>\n' + esc(meta.notes) + '</div>';

      if (meta.materials && meta.materials.length) {
        html += '<div class="sb-extra"><h3>Матеріали</h3>' + meta.materials.map(function (m) {
          return '<div class="sb-hw"><b>' + esc(m.title) + '</b>' +
            (m.note ? '<div class="sb-desc">' + esc(m.note) + '</div>' : '') +
            ((m.rules || []).length
              ? '<div class="sb-sheet">' + m.rules.map(function (r) {
                  return '<div class="sb-rule"><div class="sb-rule__h">' + esc(r.title || 'Правило') + '</div>' +
                    (r.plot ? '<div>' + r.plot + '</div>' : '') +
                    (r.f ? '<div class="sb-rule__f">' + r.f + '</div>' : '') +
                    (r.ex ? '<div class="sb-rule__e">' + r.ex + '</div>' : '') + '</div>';
                }).join('') + '</div>'
              : '') +
            (m.url ? '<div class="sb-meta"><a href="' + esc(m.url) + '" target="_blank" rel="noopener">Відкрити посилання</a></div>' : '') +
            ((m.files || []).length
              ? '<div class="sb-mats">' + m.files.map(function (f) {
                  return '<a class="sb-matf" href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a>';
                }).join('') + '</div>'
              : '') +
            '</div>';
        }).join('') + '</div>';
      }

      if (meta.homework && meta.homework.length) {
        html += '<div class="sb-extra"><h3>Домашнє завдання</h3>' + meta.homework.map(function (h) {
          return '<div class="sb-hw"><b>' + esc(h.title) + '</b>' +
            '<div class="sb-meta">' + (h.due ? 'до ' + esc(h.due) : '') +
              (h.sent ? ' · <span class="sb-sent">надіслано ' + h.sent + '</span>' : '') + '</div>' +
            (h.desc ? '<div class="sb-desc">' + esc(h.desc) + '</div>' : '') +
            (h.feedback ? '<div class="sb-meta">Відгук: ' + esc(h.feedback) + '</div>' : '') +
            '<div class="sb-shots">' + (h.photos || []).map(function (k) {
              var u = (meta.images || {})[k];
              return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img alt="Фото завдання" src="' + esc(u) + '"></a>' : '';
            }).join('') + '</div>' +
            (canWrite
              ? '<label class="sb-add"><input type="file" accept="image/*" multiple data-hw="' + esc(h.id || '') + '">' +
                '<span>+ Додати фото розвʼязання</span></label>'
              : '') +
            '</div>';
        }).join('') + '</div>';
      }

      el('sb-panels').innerHTML = html;
    }

    el('sb-panels').addEventListener('change', function (e) {
      var inp = e.target.closest('input[data-hw]');
      if (!inp || !inp.files || !inp.files.length) return;
      var label = inp.closest('.sb-add');
      label.classList.add('busy');
      label.querySelector('span').textContent = 'Надсилаю…';
      env.sendHomework(inp.getAttribute('data-hw'), [].slice.call(inp.files)).then(function () {
        toast('Фото надіслано репетитору');
        label.querySelector('span').textContent = '+ Додати ще фото';
      }).catch(function () {
        toast('Не вдалося надіслати фото — спробуйте ще раз');
        label.querySelector('span').textContent = '+ Додати фото розвʼязання';
      }).then(function () {
        label.classList.remove('busy');
        inp.value = '';
      });
    });

    /* ---------- Фото на дошку ---------- */

    function addPics(files) {
      files = files.filter(function (f) { return /^image\//.test(f.type); }).slice(0, 6);
      if (!files.length || !canWrite || !currentSlide()) return;
      toast('Завантажую фото…');
      files.reduce(function (chain, f, i) {
        return chain.then(function () {
          return env.shrink(f).then(function (r) {
            return env.uploadPhoto(r.blob).then(function (up) {
              localSrc[up.key] = up.url;
              var item = engine.addImage({ key: up.key, w: r.w, h: r.h }, i ? { x: engine.cssW / 2 + 24 * i, y: engine.cssH / 2 + 24 * i } : null);
              if (item) {
                item.src = up.url;
                item.by = 'student';
                engine.changed();
              }
            });
          });
        });
      }, Promise.resolve()).then(function () { toast('Фото на дошці'); }, function () { toast('Фото не завантажилось'); });
    }

    if (canWrite) {
      el('sb-pic').addEventListener('change', function (e) {
        addPics([].slice.call(e.target.files || []));
        e.target.value = '';
      });
      window.addEventListener('paste', function (e) {
        var files = [].slice.call((e.clipboardData && e.clipboardData.files) || []);
        if (files.length) { e.preventDefault(); addPics(files); }
      });
    }

    /* ---------- Запуск ---------- */

    /* Полотно міняє розмір не лише разом із вікном: розгортаються панелі
       домашнього, телефон повертають. Рушій про це сам не дізнається. */
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var wasZero = !engine.cssW || !engine.cssH;
        engine.resize();
        // сторінку відкрили у згорнутій вкладці: слайд вмістили в нуль — вміщуємо заново
        if (wasZero && engine.cssW && engine.cssH && currentSlide()) go(idx, false);
      }).observe(el('sb-body'));
    }

    return loadOps(env.row.since).then(function () {
      base = clone(board);
      var saved = null;
      try { saved = localStorage.getItem(SAVE_KEY); } catch (e) {}
      var at = 0;
      visible().forEach(function (s, i) { if (s.id === saved) at = i; });
      paintTools();
      paintPanels();
      engine.resize();                          // розмір відомий лише тепер, коли панелі на місці
      go(at, false);
      if (queue.length) push();                 // те, що не доїхало минулого разу
      env.live.connect();
      pollLoop();
    });
  };

  window.StudentBoard = SB;
})();
