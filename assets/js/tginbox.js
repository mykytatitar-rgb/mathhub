/* Завдання з Telegram — на дошку.

   Репетитор пересилає завдання своєму боту (або в канал, де бот —
   адміністратор). Кабінет, поки відкритий, раз на хвилину забирає нові
   повідомлення у «скриньку»: записи tginbox, легкі — лише номер файлу в
   Telegram, підпис і тег учня. Самі картинки тягнуться тільки тоді, коли
   завдання кладуть на дошку.

   Скринька — звичайні записи (RecSync), а не одне поле налаштувань: два
   пристрої забирають повідомлення незалежно, і кожне лягає окремим
   записом із назвою за номером оновлення — затерти чуже чи вставити двічі
   не вийде. З якого місця читати далі (offset), кожен пристрій пам'ятає
   сам; якщо забуде, ті самі оновлення просто впізнаються за назвою.

   Токен бота — у налаштуваннях репетитора (tutor.tg) на всіх його
   пристроях. Учням він не їде: на сторінку уроку налаштування не
   потрапляють.

   Telegram пускає сюди лише прості GET-запити (на попередній запит
   OPTIONS відповідає 501), тому все — GET з параметрами в адресі. */

(function () {
  'use strict';

  var T = {};
  var API = 'https://api.telegram.org/';
  var KIND = 'tginbox';
  var POLL_MS = 60000;
  var KEEP_DAYS = 30;
  var MAX_TEXT = 4000;

  /* ============ Чиста логіка (tools/tginbox-test.js) ============ */

  /** Перший рядок «#Софія …» — для кого завдання. */
  T.tagOf = function (text) {
    var s = String(text || '');
    var m = /^\s*#([\p{L}\p{N}_'’ʼ-]+)[ \t]*\n?/u.exec(s);
    if (!m) return { tag: '', text: s.trim() };
    return { tag: m[1], text: s.slice(m[0].length).trim() };
  };

  function biggest(sizes) {
    var best = null;
    (sizes || []).forEach(function (p) {
      if (!best || (p.width * p.height) > (best.width * best.height)) best = p;
    });
    return best;
  }

  /* Мініатюра для вибору — найменша, що ще не дрібна. */
  function thumb(sizes) {
    var list = (sizes || []).slice().sort(function (a, b) { return a.width - b.width; });
    for (var i = 0; i < list.length; i++) if (list[i].width >= 240) return list[i];
    return list[list.length - 1] || null;
  }

  /** Оновлення Telegram → запис скриньки, або null, якщо це не завдання. */
  T.parseUpdate = function (u) {
    if (!u || u.update_id == null) return null;
    var m = u.message || u.channel_post;     // виправлені повідомлення — ні: завдання вже лежить
    if (!m) return null;
    var item = {
      id: 'tg' + u.update_id,
      at: new Date((m.date || 0) * 1000).toISOString(),
      kind: u.channel_post ? 'channel' : ((m.chat && m.chat.type) || 'private'),
      chat: m.chat ? m.chat.id : null,
      fromId: m.from ? m.from.id : null,
      from: (m.chat && (m.chat.title || m.chat.first_name)) || ''
    };
    if (m.media_group_id) item.media = String(m.media_group_id);

    var raw = m.caption || m.text || '';
    if (m.photo && m.photo.length) {
      var big = biggest(m.photo), th = thumb(m.photo);
      item.photo = big.file_id; item.pw = big.width; item.ph = big.height;
      if (th && th.file_id !== big.file_id) item.th = th.file_id;
    } else if (m.document && /^image\//.test(m.document.mime_type || '')) {
      item.photo = m.document.file_id;
      if (m.document.thumbnail) item.th = m.document.thumbnail.file_id;
    } else if (!m.text || /^\//.test(m.text)) {
      return null;                           // стікер, голос, архів, команда боту
    }
    var t = T.tagOf(raw);
    item.tag = t.tag;
    item.text = t.text.slice(0, MAX_TEXT);
    return item;
  };

  /** Чи приймати: канал — так (бота туди додали ви), особисте — лише від власника. */
  T.allowed = function (item, owner) {
    if (!item) return false;
    if (item.kind === 'channel') return true;
    if (item.kind !== 'private') return false;
    return !owner || item.fromId === owner;
  };

  function squash(s) { return String(s || '').toLowerCase().replace(/[\s_'’ʼ-]+/g, ''); }

  /** Чи тег про цього учня (ім'я, прізвище, обидва разом чи початок від 3 літер). */
  T.matches = function (tag, names) {
    var t = squash(tag);
    if (t.length < 3) return false;
    return (names || []).some(function (name) {
      if (!name) return false;
      if (squash(name).indexOf(t) === 0) return true;
      return String(name).split(/\s+/).some(function (w) { return squash(w).indexOf(t) === 0; });
    });
  };

  function rank(it, names) {
    if (it.used) return 3;
    if (!it.tag) return 1;
    return T.matches(it.tag, names) ? 0 : 2;
  }

  /** Порядок у вікні: свої, без тегу, чужі, уже вставлені; усередині — як надсилали. */
  T.order = function (items, names) {
    return (items || []).slice().sort(function (a, b) {
      var d = rank(a, names) - rank(b, names);
      if (d) return d;
      if (a.at !== b.at) return a.at < b.at ? -1 : 1;
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });
  };

  /** Що позначити одразу: свої невставлені, а якщо таких немає — без тегу. */
  T.preselect = function (items, names) {
    var own = items.filter(function (it) { return rank(it, names) === 0; });
    var pick = own.length ? own : items.filter(function (it) { return rank(it, names) === 1; });
    return pick.map(function (it) { return it.id; });
  };

  T.fresh = function (items) {
    return (items || []).filter(function (it) { return !it.used; }).length;
  };

  /**
   * Сітка: однакова ширина W, проміжки gap, верхи кожного рядка на одній
   * лінії, новий рядок — під найвищим. Уся сітка по центру точки at.
   */
  T.grid = function (sizes, at, W, gap) {
    var n = sizes.length;
    if (!n) return [];
    var cols = n === 4 ? 2 : Math.min(4, n <= 3 ? n : Math.ceil(Math.sqrt(n)));
    var hs = sizes.map(function (s) { return s.w > 0 ? W * s.h / s.w : W; });
    var rows = [];
    for (var i = 0; i < n; i += cols) rows.push(Math.max.apply(null, hs.slice(i, i + cols)));
    var totalW = cols * W + (cols - 1) * gap;
    var totalH = rows.reduce(function (a, h) { return a + h; }, 0) + (rows.length - 1) * gap;
    var x0 = at.x - totalW / 2, y = at.y - totalH / 2;
    var out = [];
    rows.forEach(function (rh, r) {
      for (var c = 0; c < cols; c++) {
        var k = r * cols + c;
        if (k >= n) break;
        out.push({ x: x0 + c * (W + gap), y: y, w: W, h: hs[k] });
      }
      y += rh + gap;
    });
    return out;
  };

  /** Текст рядками, що влазять у maxW (measure — ширина рядка). */
  T.wrap = function (text, measure, maxW) {
    var out = [];
    String(text || '').trim().split('\n').forEach(function (para) {
      var words = para.trim().split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); return; }
      var line = '';
      words.forEach(function (w) {
        while (measure(w) > maxW && w.length > 1) {   // задовге слово — шматками
          if (line) { out.push(line); line = ''; }
          var cut = 1;
          while (cut < w.length && measure(w.slice(0, cut + 1)) <= maxW) cut++;
          out.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        var next = line ? line + ' ' + w : w;
        if (line && measure(next) > maxW) { out.push(line); line = w; } else line = next;
      });
      if (line) out.push(line);
    });
    return out;
  };

  /* ============ Зв'язок із Telegram ============ */

  var S = window.S;

  function conf() {
    var t = S && S.db() && S.db().tutor;
    return (t && t.tg) || null;
  }

  T.enabled = function () { var c = conf(); return !!(c && c.token); };
  T.bot = function () { var c = conf(); return (c && c.bot) || ''; };

  function call(token, method, params) {
    var q = Object.keys(params || {}).map(function (k) {
      return k + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return fetch(API + 'bot' + token + '/' + method + (q ? '?' + q : ''), { cache: 'no-store' })
      .then(function (r) {
        return r.json().catch(function () { return { ok: false, description: 'HTTP ' + r.status }; });
      })
      .then(function (j) {
        if (!j || !j.ok) {
          var e = new Error((j && j.description) || 'Telegram не відповів');
          e.code = j && j.error_code;
          throw e;
        }
        return j.result;
      });
  }

  function saveConf(patch) {
    var t = S.db().tutor || (S.db().tutor = {});
    t.tg = patch ? Object.assign({}, t.tg || {}, patch) : undefined;
    if (!patch) delete t.tg;
    t.updatedAt = new Date().toISOString();
    S.save();
  }

  /** Перевірити токен і запам'ятати бота. */
  T.connect = function (token) {
    token = String(token || '').trim();
    if (!/^\d+:[\w-]{30,}$/.test(token)) return Promise.reject(new Error('Це не схоже на токен бота'));
    return call(token, 'getMe').then(function (me) {
      saveConf({ token: token, bot: me.username || '', owner: 0 });
      setTimeout(T.poll, 0);
      return me;
    });
  };

  T.disconnect = function () { saveConf(null); state = {}; };

  var OFFSET = 'mathhub.tg.offset.';
  function offsetKey() { return OFFSET + String(conf().token).split(':')[0]; }
  function getOffset() { try { return Number(localStorage.getItem(offsetKey())) || 0; } catch (e) { return 0; } }
  function setOffset(n) { try { localStorage.setItem(offsetKey(), String(n)); } catch (e) {} }

  var state = {};
  var busy = null;
  var lastPoll = 0;
  T.state = function () { return state; };

  function told() { try { window.dispatchEvent(new CustomEvent('tginbox')); } catch (e) {} }

  /** Забрати нові повідомлення. Відповідь — скільки нових завдань. */
  T.poll = function () {
    if (!T.enabled()) return Promise.resolve(0);
    if (busy) return busy;
    lastPoll = Date.now();
    var c = conf();
    busy = call(c.token, 'getUpdates', {
      offset: getOffset(), timeout: 0, allowed_updates: '["message","channel_post"]'
    }).then(function (list) {
      var added = 0, max = -1;
      (list || []).forEach(function (u) {
        max = Math.max(max, u.update_id);
        var it = T.parseUpdate(u);
        if (!it) return;
        var cc = conf();
        if (!T.allowed(it, cc.owner)) return;
        if (it.kind === 'private' && !cc.owner && it.fromId) saveConf({ owner: it.fromId });
        if (S.get(KIND, it.id)) return;
        S.add(KIND, it);
        added++;
      });
      // підтверджуємо лише після запису: впаде посередині — наступного разу прийде знову
      if (max >= 0) setOffset(max + 1);
      state = { ok: true, at: Date.now() };
      if (added) told();
      return added;
    }).catch(function (e) {
      state = { ok: false, at: Date.now(), code: e.code,
        err: e.code === 409 ? 'у бота ввімкнено webhook — повідомлення йдуть не сюди'
          : e.code === 401 ? 'Telegram не впізнав токен' : (e.message || 'немає звʼязку') };
      return 0;
    }).then(function (n) { busy = null; return n; });
    return busy;
  };

  T.list = function () {
    var db = S.db();
    return (db && Array.isArray(db[KIND])) ? db[KIND].slice() : [];
  };

  T.markUsed = function (ids) {
    var now = new Date().toISOString();
    ids.forEach(function (id) { S.update(KIND, id, { used: now }); });
    told();
  };

  function prune() {
    var edge = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString();
    T.list().forEach(function (it) { if (it.at && it.at < edge) S.remove(KIND, it.id); });
  }

  /* ============ Картинки ============ */

  var paths = {};
  function fileUrl(fileId) {
    var c = conf();
    if (paths[fileId]) return Promise.resolve(paths[fileId]);
    return call(c.token, 'getFile', { file_id: fileId }).then(function (f) {
      // адреса файлу живе годину — тримаємо лише в пам'яті цієї вкладки
      paths[fileId] = API + 'file/bot' + c.token + '/' + f.file_path;
      return paths[fileId];
    });
  }

  /** Мініатюра для вікна вибору (адреса картинки). */
  T.thumbUrl = function (item) { return fileUrl(item.th || item.photo); };

  function loadImg(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () { resolve(img); };   // адресу звільняємо після малювання
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('картинка не читається')); };
      img.src = url;
      img._url = url;
    });
  }

  function fontsReady(spec) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([
      document.fonts.load(spec).catch(function () {}),
      new Promise(function (r) { setTimeout(r, 1500); })
    ]);
  }

  var INK = '#1f2430', LINE = '#dfe3e8';
  var MAX_LINES = 140;

  /* «Скрін» повідомлення: фото зверху (якщо є), під ним текст. */
  function card(text, img) {
    var CW = img ? Math.max(800, Math.min(1400, img.naturalWidth)) : 1000;
    var k = CW / 1000, pad = Math.round(60 * k), fs = Math.round(40 * k), lh = Math.round(fs * 1.45);
    var spec = '500 ' + fs + 'px Manrope, "Segoe UI", system-ui, sans-serif';
    return fontsReady(spec).then(function () {
      var c = document.createElement('canvas');
      var g = c.getContext('2d');
      g.font = spec;
      var lines = text ? T.wrap(text, function (s) { return g.measureText(s).width; }, CW - 2 * pad) : [];
      if (lines.length > MAX_LINES) { lines = lines.slice(0, MAX_LINES); lines[MAX_LINES - 1] += ' …'; }
      var ph = img ? Math.round(CW * img.naturalHeight / img.naturalWidth) : 0;
      var th = lines.length ? pad * 2 + (lines.length - 1) * lh + fs : 0;
      c.width = CW;
      c.height = Math.max(ph + th, 1);
      g = c.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, c.width, c.height);
      if (img) g.drawImage(img, 0, 0, CW, ph);
      if (lines.length) {
        g.font = spec;
        g.fillStyle = INK;
        g.textBaseline = 'top';
        lines.forEach(function (ln, i) { g.fillText(ln, pad, ph + pad + i * lh); });
      }
      g.strokeStyle = LINE;
      g.lineWidth = Math.max(2, Math.round(2 * k));
      g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, c.width - g.lineWidth, c.height - g.lineWidth);
      return new Promise(function (resolve) {
        var type = img ? 'image/jpeg' : 'image/png';
        c.toBlob(function (b) { resolve(b); }, type, 0.92);
      });
    });
  }

  /** Картинка завдання — файл для ImgStore.ingest. */
  T.image = function (item) {
    var name = 'telegram-' + item.id;
    function asFile(blob, ext) {
      return new File([blob], name + ext, { type: blob.type || 'image/png' });
    }
    if (!item.photo) return card(item.text, null).then(function (b) { return asFile(b, '.png'); });
    return fileUrl(item.photo)
      .then(function (url) { return fetch(url); })
      .then(function (r) {
        if (!r.ok) throw new Error('Telegram не віддав файл (' + r.status + ')');
        return r.blob();
      })
      .then(function (blob) {
        if (!item.text) return asFile(blob, '.jpg');
        return loadImg(blob).then(function (img) {
          return card(item.text, img).then(function (b) {
            URL.revokeObjectURL(img._url);
            return asFile(b, '.jpg');
          });
        });
      });
  };

  /* ============ Розклад опитування ============ */

  var started = false;
  T.start = function () {
    if (started || !S) return;
    started = true;
    setTimeout(function () {
      if (!T.enabled()) return;
      try { prune(); } catch (e) {}
      T.poll();
    }, 3000);
    setInterval(function () {
      if (document.visibilityState === 'visible') T.poll();
    }, POLL_MS);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && Date.now() - lastPoll > 15000) T.poll();
    });
  };

  window.TgInbox = T;
})();
