/* Google Календар — одразу, а не «колись».

   Підписка на файл .ics (ics.js) лишається, але Google перечитує її за
   власним розкладом — раз на кілька годин, а то й рідше. Перетягнутий у
   розкладі урок у Google лишався на старому місці до вечора. Підштовхнути
   це ззовні неможливо.

   Тому тут — запис у календар напряму. Не через Google Cloud (проєкт,
   екран згоди, ключі OAuth, токени, що спливають), а через маленький
   скрипт Google Apps Script у власному акаунті репетитора: він працює від
   його імені й сам має доступ до його календаря. Кабінет надсилає скрипту
   розклад, скрипт приводить до нього окремий календар «Уроки · Вектор»:
   створює, переносить і прибирає події.

   Скрипт пускає лише того, хто знає секрет: випадковий код, який кабінет
   вписує в текст скрипта, коли репетитор його копіює. Код і адреса скрипта
   лежать у налаштуваннях репетитора — на всіх його пристроях.

   Відправляється завжди весь розклад у вікні (тиждень тому — 12 тижнів
   уперед), а не окремі зміни: так однаково з будь-якого пристрою, і
   пропущена зміна не губиться — наступна відправка її виправить. Скрипт
   сам знає, що вже стоїть у календарі, і чіпає лише змінене. */

(function () {
  'use strict';

  var U = window.U, S = window.S;
  var G = {};

  var PAST_DAYS = 7;
  var AHEAD_DAYS = 84;
  var DELAY = 2000;          // зміни йдуть пачкою (перетягування — кілька збережень)
  var SIG = 'mathhub.gcal.sig';

  function conf() {
    var t = (S.db() && S.db().tutor) || {};
    return t.gcal || null;
  }

  G.enabled = function () { var c = conf(); return !!(c && c.url && c.secret); };

  function newSecret() {
    var bytes = new Uint8Array(18);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    var out = '';
    for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
    return out;
  }

  /** Секрет для скрипта — створюється раз і живе в налаштуваннях. */
  G.secret = function () {
    var t = S.db().tutor || (S.db().tutor = {});
    if (!t.gcal) t.gcal = {};
    if (!t.gcal.secret) {
      t.gcal.secret = newSecret();
      t.updatedAt = new Date().toISOString();
      S.save();
    }
    return t.gcal.secret;
  };

  /* ---------- Розклад ---------- */

  function minutes(l) {
    var d = Number(l && l.duration);
    if (d > 0) return d;
    var t = S.db().tutor || {};
    return Number(t.defaultDuration) > 0 ? Number(t.defaultDuration) : 60;
  }

  function eventOf(l) {
    var start = new Date(l.date);
    if (isNaN(start.getTime())) return null;
    var end = new Date(start.getTime() + minutes(l) * 60000);
    var st = S.get('students', l.studentId);
    var desc = [];
    if (l.topic) desc.push(l.topic);
    if (l.price) desc.push('Вартість: ' + U.money(l.price, S.lessonCur(l)));
    return {
      id: String(l.id),
      start: start.toISOString(),
      end: end.toISOString(),
      title: (st ? st.name : 'Урок') + (l.topic ? ' · ' + l.topic : ''),
      desc: desc.join('\n'),
      location: S.meetUrlFor(l.studentId) || ''
    };
  }

  /** Що має стояти в календарі. Скасоване й перенесене — не стоїть. */
  G.build = function () {
    var from = U.addDays(U.today(), -PAST_DAYS);
    var to = U.addDays(U.today(), AHEAD_DAYS);
    var list = (S.db().lessons || []).filter(function (l) {
      if (l.status === 'cancelled' || l.status === 'moved') return false;
      var d = new Date(l.date);
      return !isNaN(d.getTime()) && d >= from && d <= to;
    });
    // розклад триває й далі, ніж заповнено уроками
    if (S.slotOccurrences) list = list.concat(S.slotOccurrences(from, to));
    var events = list.map(eventOf).filter(Boolean);
    events.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    return { from: from.toISOString(), to: to.toISOString(), events: events };
  };

  /* ---------- Відправка ---------- */

  function fp(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36) + ':' + str.length;
  }

  var state = { at: 0, ok: null, err: '', n: 0 };
  G.state = function () { return state; };

  function call(url, body) {
    /* text/plain — «простий» запит без попередньої перевірки CORS: Apps
       Script на неї не відповідає. Відповідь приходить після переадресації
       на script.googleusercontent.com, і її читати можна. */
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow'
    }).then(function (res) {
      if (!res.ok) throw new Error('Google відповів ' + res.status);
      return res.text();
    }).then(function (t) {
      var j;
      try { j = JSON.parse(t); } catch (e) { throw new Error('Скрипт відповів не тим — перевірте адресу (має закінчуватись на /exec)'); }
      if (!j || !j.ok) {
        throw new Error(j && j.error === 'secret'
          ? 'Скрипт не впізнав секрет — скопіюйте код ще раз і перерозгорніть'
          : (j && j.error) || 'Скрипт повернув помилку');
      }
      return j;
    });
  }

  /** Перевірити адресу скрипта (кнопка «Підключити»). */
  G.ping = function (url) {
    return call(url, { secret: G.secret(), action: 'ping' });
  };

  var sending = null, again = false, retry = null;

  /** Привести календар у Google до розкладу. force — навіть якщо нічого не змінилось. */
  G.push = function (force) {
    var c = conf();
    if (!c || !c.url || !c.secret) return Promise.resolve(null);
    if (sending) { again = true; return sending; }
    var b = G.build();
    var sig = fp(JSON.stringify(b));
    var last = '';
    try { last = localStorage.getItem(SIG) || ''; } catch (e) {}
    if (!force && sig === last) return Promise.resolve({ ok: true, same: true });

    if (retry) { clearTimeout(retry); retry = null; }
    sending = call(c.url, { secret: c.secret, action: 'sync', from: b.from, to: b.to, events: b.events })
      .then(function (j) {
        state = { at: Date.now(), ok: true, err: '', n: b.events.length,
                  created: j.created || 0, updated: j.updated || 0, deleted: j.deleted || 0 };
        if (j.more) {
          /* Скрипт зробив частину (Google обмежує, скільки подій можна
             створити поспіль) — наступну порцію шлемо одразу, а якщо Google
             попросив почекати, то за пів хвилини. Відбиток «уже надіслано»
             не ставимо, поки все не ляже. */
          retry = setTimeout(function () { retry = null; G.push(true); }, j.note ? 30000 : 1500);
        } else {
          try { localStorage.setItem(SIG, sig); } catch (e) {}
        }
        return j;
      }, function (e) {
        state = { at: Date.now(), ok: false, err: (e && e.message) || 'немає звʼязку', n: b.events.length };
        console.warn('Google Календар не оновився:', state.err);
        retry = setTimeout(function () { retry = null; G.push(); }, 60000);
        return null;
      })
      .then(function (r) {
        sending = null;
        if (again) { again = false; G.push(); }
        return r;
      });
    return sending;
  };

  G.connect = function (url) {
    url = String(url || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
      return Promise.reject(new Error('Потрібна адреса вебзастосунку: https://script.google.com/macros/s/…/exec'));
    }
    return G.ping(url).then(function () {
      var t = S.db().tutor;
      t.gcal = { secret: G.secret(), url: url };
      t.updatedAt = new Date().toISOString();
      S.save();
      try { localStorage.removeItem(SIG); } catch (e) {}
      return G.push(true);
    });
  };

  G.disconnect = function () {
    var t = S.db().tutor || {};
    if (t.gcal) { delete t.gcal.url; t.updatedAt = new Date().toISOString(); S.save(); }
    try { localStorage.removeItem(SIG); } catch (e) {}
    state = { at: 0, ok: null, err: '', n: 0 };
  };

  /* ---------- Стежити за розкладом ---------- */

  var timer = null;
  var started = false;
  G.start = function () {
    if (started || !S.onSave) return;
    started = true;
    S.onSave(function () {
      if (!G.enabled()) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { timer = null; G.push(); }, DELAY);
    });
    window.addEventListener('online', function () { if (G.enabled() && state.ok === false) G.push(); });
    /* Перша відправка — коли записи вже звірені з сервером: пристрій із
       давніми даними інакше повернув би в Google вчорашній розклад. */
    function first() { if (G.enabled()) G.push(); }
    if (window.RecSync && RecSync.afterFirstPull && window.Cloud && Cloud.available() && Cloud.signedIn()) {
      RecSync.afterFirstPull(first);
    } else {
      setTimeout(first, 3000);
    }
  };

  /* ---------- Скрипт для Google ----------
     Те, що репетитор вставляє в script.google.com. Секрет уже вписаний. */
  G.scriptCode = function () {
    var secret = G.secret();
    return [
      '/* Вектор → Google Календар.',
      '   Вставте цей код у новий проєкт на script.google.com повністю,',
      '   нічого не змінюючи, і розгорніть як вебзастосунок',
      '   (виконувати від імені: я; доступ: усі). Секрет нижче знає лише ваш кабінет. */',
      '',
      "var SECRET = '" + secret + "';",
      "var CAL_NAME = 'Уроки · Вектор';",
      '',
      'function doGet() {',
      "  return out({ ok: true, hint: 'Вектор: звʼязок із календарем працює' });",
      '}',
      '',
      'function doPost(e) {',
      '  var req;',
      '  try { req = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false, error: "bad-json" }); }',
      '  if (!req || req.secret !== SECRET) return out({ ok: false, error: "secret" });',
      '  if (req.action === "ping") return out({ ok: true, calendar: cal().getName() });',
      '  var lock = LockService.getScriptLock();',
      '  lock.waitLock(60000);',
      '  try { return out(sync(req)); } finally { lock.releaseLock(); }',
      '}',
      '',
      '// окремий календар, щоб нічого свого в основному не чіпати',
      'function cal() {',
      '  var props = PropertiesService.getScriptProperties();',
      '  var id = props.getProperty("calId");',
      '  var c = id ? CalendarApp.getCalendarById(id) : null;',
      '  if (!c) {',
      '    c = CalendarApp.createCalendar(CAL_NAME, { timeZone: "Europe/Kyiv" });',
      '    props.setProperty("calId", c.getId());',
      '  }',
      '  return c;',
      '}',
      '',
      '/* Привести календар до розкладу. Для кожного уроку памʼятаємо подію й',
      '   відбиток її вмісту: незмінене не чіпаємо. Прибираємо лише те, що в',
      '   межах надісланого вікна: давніша історія лишається. */',
      'function sync(req) {',
      '  var c = cal();',
      '  var props = PropertiesService.getScriptProperties();',
      '  var all = props.getProperties();',
      '  var from = new Date(req.from).getTime(), to = new Date(req.to).getTime();',
      '  var want = {};',
      '  (req.events || []).forEach(function (w) { want[w.id] = w; });',
      '  var created = 0, updated = 0, deleted = 0;',
      '',
      '  Object.keys(all).forEach(function (k) {',
      '    if (k.indexOf("e:") !== 0) return;',
      '    var id = k.slice(2);',
      '    if (want[id]) return;',
      '    var rec = all[k].split("|");',
      '    var at = Number(rec[2]);',
      '    if (at && (at < from || at > to)) return;',
      '    var ev = find(c, rec[0]);',
      '    if (ev) ev.deleteEvent();',
      '    props.deleteProperty(k);',
      '    deleted++;',
      '  });',
      '',
      '  /* Не більше LIMIT змін за раз: Google не любить сотні подій поспіль.',
      '     Решту кабінет надішле одразу наступним запитом (more). Зроблене',
      '     записується одразу, тож обрив посередині нічого не губить. */',
      '  var LIMIT = 60, more = false, err = "";',
      '  var ids = Object.keys(want);',
      '  for (var i = 0; i < ids.length; i++) {',
      '    var id = ids[i], w = want[id], k = "e:" + id, h = digest(w);',
      '    var rec = all[k] ? all[k].split("|") : null;',
      '    if (rec && rec[1] === h) continue;',
      '    if (created + updated >= LIMIT) { more = true; break; }',
      '    var s = new Date(w.start), en = new Date(w.end);',
      '    try {',
      '      var ev = rec ? find(c, rec[0]) : null;',
      '      if (ev) {',
      '        ev.setTime(s, en);',
      '        ev.setTitle(w.title);',
      '        ev.setDescription(w.desc || "");',
      '        ev.setLocation(w.location || "");',
      '        updated++;',
      '      } else {',
      '        ev = c.createEvent(w.title, s, en, { description: w.desc || "", location: w.location || "" });',
      '        created++;',
      '      }',
      '      props.setProperty(k, ev.getId() + "|" + h + "|" + s.getTime());',
      '    } catch (x) {',
      '      // Google просить почекати — зупиняємось, решта наступним заходом',
      '      more = true; err = String(x && x.message || x); break;',
      '    }',
      '  }',
      '',
      '  return { ok: true, created: created, updated: updated, deleted: deleted, more: more, note: err };',
      '}',
      '',
      'function find(c, id) {',
      '  try { return id ? c.getEventById(id) : null; } catch (x) { return null; }',
      '}',
      '',
      'function digest(w) {',
      '  var s = JSON.stringify([w.start, w.end, w.title, w.desc || "", w.location || ""]);',
      '  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s, Utilities.Charset.UTF_8));',
      '}',
      '',
      'function out(o) {',
      '  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);',
      '}',
      ''
    ].join('\n');
  };

  window.GCal = G;
})();
