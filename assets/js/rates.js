/* Курс валют для зведення заробітку в гривні.

   Основне джерело — офіційний API НБУ. Він може бути недоступний (немає
   інтернету, файл відкрито через file://, заблоковано CORS), тому:
   поруч завжди є курс, введений вручну в «Налаштуваннях», і саме він
   використовується, коли автоматичний недоступний. Курс кешується на день. */
(function () {
  'use strict';

  var KEY = 'mathhub.rates';
  var NBU = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json';

  var state = { date: '', map: {}, source: '', manual: {}, loading: false, error: '' };

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) +
      '-' + (d.getDate() < 10 ? '0' : '') + d.getDate();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        date: state.date, map: state.map, source: state.source, manual: state.manual
      }));
    } catch (e) { /* сховище переповнене — курс не критичний */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      state.date = o.date || '';
      state.map = o.map || {};
      state.source = o.source || '';
      state.manual = o.manual || {};
    } catch (e) { /* зіпсований запис — почнемо з чистого */ }
  }
  load();

  var R = {};

  /* ============================================================
     Курс на конкретний день
     ============================================================

     Заняття 17 серпня оплатили за курсом 17 серпня. Перераховувати його
     сьогоднішнім — означає щодня показувати інший заробіток за той самий
     минулий тиждень, хоча гроші давно отримані й не змінилися.

     Тому для минулих днів беремо архів НБУ. Він незмінний, отже кешується
     назавжди: кожну дату питаємо в банку один раз за все життя програми.

     Поки відповідь не прийшла, показуємо поточний курс — це краще, ніж
     порожнє місце, — і перемальовуємо, коли справжній приїде. */

  var HIST = 'mathhub.rates.hist';
  var hist = {};
  var asked = {};

  try { hist = JSON.parse(localStorage.getItem(HIST) || '{}') || {}; } catch (e) { hist = {}; }

  function saveHist() {
    try { localStorage.setItem(HIST, JSON.stringify(hist)); } catch (e) {}
  }

  function ymd(d) {
    return d.getFullYear() +
      (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) +
      (d.getDate() < 10 ? '0' : '') + d.getDate();
  }

  /* Перемальовування збираємо в одне: за тиждень може приїхати сім
     відповідей, і сім перемальовувань поспіль людина побачить як смикання. */
  var redraw = null;
  function scheduleRedraw() {
    if (redraw) clearTimeout(redraw);
    redraw = setTimeout(function () {
      redraw = null;
      if (window.App && App.render) App.render();
    }, 250);
  }

  function fetchHist(code, key) {
    var k = code + '|' + key;
    if (asked[k]) return;
    asked[k] = true;

    fetch(NBU.replace('?json', '') + '?valcode=' + encodeURIComponent(code) +
          '&date=' + key + '&json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        var v = rows && rows[0] && Number(rows[0].rate);
        // 0 означає «банк за цей день нічого не дав» — більше не питаємо
        hist[k] = v > 0 ? v : 0;
        saveHist();
        if (v > 0) scheduleRedraw();
      })
      .catch(function () { /* немає мережі — спитаємо іншим разом */ asked[k] = false; });
  }

  /**
   * Курс на задану дату. Для сьогодні й майбутнього — поточний.
   *
   * Повертає число завжди: якщо архівного ще немає, це поточний курс, і
   * ознаку цього дає R.isHistoric.
   */
  R.forDate = function (code, date) {
    if (!code || code === 'UAH') return 1;

    var d = date ? new Date(date) : null;
    if (!d || isNaN(d.getTime())) return R.get(code);

    var key = ymd(d);
    if (key >= ymd(new Date())) return R.get(code);

    var k = code + '|' + key;
    if (hist[k] > 0) return hist[k];
    if (hist[k] === 0) return R.get(code);      // банк не дав — лишається поточний

    fetchHist(code, key);
    return R.get(code);
  };

  /** Чи це справді курс того дня, а не сьогоднішній замість нього. */
  R.isHistoric = function (code, date) {
    if (!code || code === 'UAH') return true;
    var d = date ? new Date(date) : null;
    if (!d || isNaN(d.getTime())) return false;
    var key = ymd(d);
    if (key >= ymd(new Date())) return true;    // сьогодні поточний курс і є правильним
    return hist[code + '|' + key] > 0;
  };

  /** Перевести суму в гривні за курсом того дня. */
  R.toUAHOn = function (amount, code, date) {
    var rate = R.forDate(code, date);
    return rate > 0 ? Number(amount) * rate : null;
  };

  R.state = function () { return state; };
  R.isFresh = function () { return state.date === today() && Object.keys(state.map).length > 0; };

  /** Курс: скільки гривень за одну одиницю валюти. */
  R.get = function (code) {
    if (!code || code === 'UAH') return 1;
    if (state.map[code] > 0) return state.map[code];
    if (state.manual[code] > 0) return state.manual[code];
    return null;
  };

  R.sourceOf = function (code) {
    if (!code || code === 'UAH') return 'uah';
    if (state.map[code] > 0) return state.source || 'nbu';
    if (state.manual[code] > 0) return 'manual';
    return '';
  };

  /** Перевести суму в гривні. null, якщо курсу немає. */
  R.toUAH = function (amount, code) {
    var k = R.get(code);
    if (k == null) return null;
    return (Number(amount) || 0) * k;
  };

  /**
   * Звести мапу {валюта: сума} в гривні.
   * Повертає {uah, missing:[валюти без курсу], partial}.
   */
  R.sumToUAH = function (map) {
    var uah = 0, missing = [];
    Object.keys(map || {}).forEach(function (c) {
      if (Math.abs(map[c]) < 0.005) return;
      var v = R.toUAH(map[c], c);
      if (v == null) missing.push(c);
      else uah += v;
    });
    return { uah: uah, missing: missing, partial: missing.length > 0 };
  };

  R.setManual = function (code, value) {
    var v = Number(value);
    if (!(v > 0)) delete state.manual[code];
    else state.manual[code] = v;
    save();
  };

  R.manual = function () { return state.manual; };

  /** Підтягнути курс НБУ. Не кидає помилок — повертає true/false. */
  R.refresh = function (force) {
    if (state.loading) return Promise.resolve(false);
    if (!force && R.isFresh()) return Promise.resolve(true);
    // якщо в цьому сеансі вже не вийшло — не смикаємо мережу на кожному рендері
    if (!force && state.tried) return Promise.resolve(false);
    state.tried = true;
    state.loading = true;
    state.error = '';

    return fetch(NBU, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('НБУ відповів ' + r.status);
        return r.json();
      })
      .then(function (list) {
        if (!Array.isArray(list) || !list.length) throw new Error('порожня відповідь');
        var map = {};
        list.forEach(function (row) {
          if (row && row.cc && row.rate > 0) map[row.cc] = row.rate;
        });
        if (!map.USD) throw new Error('немає курсу долара');
        state.map = map;
        state.date = today();
        state.source = 'nbu';
        state.loading = false;
        save();
        return true;
      })
      .catch(function (e) {
        state.loading = false;
        state.error = (e && e.message) ? e.message : 'немає зв’язку';
        return false;
      });
  };

  window.Rates = R;
})();
