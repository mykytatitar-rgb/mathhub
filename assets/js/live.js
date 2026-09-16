/* Живий канал дошки — як у Miro.

   Досі дошка й сторінка учня питали сервер «чи є щось нове» кожні кілька
   секунд. Звідси й затримки, і стан «учень бачить старе»: між двома
   запитами проходили секунди, а якщо запит падав — ще довше.

   Тепер і кабінет, і сторінка учня тримають одне постійне зʼєднання з
   Supabase Realtime (WebSocket) і отримують зміни в ту ж мить, коли їх
   зроблено. Опитування лишається запасним шляхом — на випадок, якщо
   зʼєднання впало, — але в звичайній роботі воно вже нічого не вирішує.

   Правило довіри. Повідомлення в каналі — лише сигнал «щось змінилось» і
   швидкий показ. Правда лежить у базі: кабінет не вписує в дошку нічого,
   що прийшло каналом, а забирає це з бази. Тож чужий, хто знає посилання,
   не зіпсує дошку репетитора, навіть якщо щось надішле в канал.

   Назва каналу містить код уроку — ті самі 128 випадкових бітів, що й у
   посиланні. Хто не має посилання, у канал не потрапить.

   Протокол — Phoenix Channels поверх WebSocket, без сторонніх бібліотек. */

(function () {
  'use strict';

  var L = {};
  var cfg = window.CLOUD_CONFIG || { url: '', anonKey: '' };

  var HEARTBEAT_MS = 25000;

  var sock = null;
  var isOpen = false;
  var ref = 0;
  var topics = {};          // тема → { on, joined, queue }
  var heartbeat = null;
  var retryMs = 1000;
  var retryTimer = null;
  var watchers = [];

  function available() { return !!(cfg.url && cfg.anonKey && window.WebSocket); }

  function wsUrl() {
    return cfg.url.replace(/^http/, 'ws').replace(/\/+$/, '') +
      '/realtime/v1/websocket?apikey=' + encodeURIComponent(cfg.anonKey) + '&vsn=1.0.0';
  }

  function raw(topic, event, payload) {
    if (!sock || !isOpen) return false;
    try {
      sock.send(JSON.stringify({ topic: topic, event: event, payload: payload, ref: String(++ref) }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function changed() {
    watchers.forEach(function (fn) { try { fn(isOpen); } catch (e) {} });
  }

  function join(topic) {
    raw(topic, 'phx_join', {
      config: { broadcast: { self: false, ack: false }, presence: { key: '' }, private: false }
    });
  }

  function connect() {
    if (!available() || sock) return;
    try {
      sock = new WebSocket(wsUrl());
    } catch (e) {
      sock = null;
      reconnectLater();
      return;
    }

    sock.onopen = function () {
      isOpen = true;
      retryMs = 1000;
      Object.keys(topics).forEach(join);
      heartbeat = setInterval(function () { raw('phoenix', 'heartbeat', {}); }, HEARTBEAT_MS);
      changed();
    };

    sock.onmessage = function (m) {
      var msg;
      try { msg = JSON.parse(m.data); } catch (e) { return; }
      var t = topics[msg.topic];
      if (!t) return;

      if (msg.event === 'phx_reply' && msg.payload && msg.payload.status === 'ok' && !t.joined) {
        t.joined = true;
        // те, що хотіли надіслати до приєднання, їде тепер
        var q = t.queue;
        t.queue = [];
        q.forEach(function (item) { send(msg.topic, item.event, item.payload); });
        return;
      }

      if (msg.event === 'broadcast' && msg.payload) {
        try { t.on(msg.payload.event, msg.payload.payload || {}); }
        catch (e) { console.warn('Живий канал:', e); }
      }
    };

    sock.onclose = function () {
      isOpen = false;
      sock = null;
      if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
      Object.keys(topics).forEach(function (k) { topics[k].joined = false; });
      changed();
      if (Object.keys(topics).length) reconnectLater();
    };

    sock.onerror = function () {
      try { sock && sock.close(); } catch (e) {}
    };
  }

  /* Зʼєднання падає — ноутбук заснув, змінилась мережа. Повертаємось самі,
     з наростаючою паузою, щоб не молотити сервер, коли інтернету немає. */
  function reconnectLater() {
    if (retryTimer) return;
    retryTimer = setTimeout(function () {
      retryTimer = null;
      connect();
    }, retryMs);
    retryMs = Math.min(retryMs * 2, 30000);
  }

  function send(topic, event, payload) {
    var t = topics[topic];
    if (!t) return false;
    if (!t.joined) {
      t.queue.push({ event: event, payload: payload });
      if (t.queue.length > 50) t.queue.shift();     // у черзі тримаємо лише свіже
      return false;
    }
    return raw(topic, 'broadcast', { type: 'broadcast', event: event, payload: payload });
  }

  /**
   * Приєднатися до каналу уроку.
   * on(подія, дані) викликається на кожне повідомлення з каналу.
   * Повертає { send(подія, дані), leave() }.
   */
  L.join = function (name, on) {
    if (!available() || !name) return { send: function () { return false; }, leave: function () {} };
    var topic = 'realtime:vektor-' + name;
    topics[topic] = { on: on || function () {}, joined: false, queue: [] };

    if (isOpen) join(topic); else connect();

    return {
      send: function (event, payload) { return send(topic, event, payload); },
      leave: function () {
        if (!topics[topic]) return;
        raw(topic, 'phx_leave', {});
        delete topics[topic];
        if (!Object.keys(topics).length && sock) {
          try { sock.close(); } catch (e) {}
        }
      }
    };
  };

  L.connected = function () { return isOpen; };
  L.onChange = function (fn) { watchers.push(fn); };

  // повернувся інтернет — не чекаємо паузи
  window.addEventListener('online', function () {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (Object.keys(topics).length) connect();
  });

  window.Live = L;
})();
