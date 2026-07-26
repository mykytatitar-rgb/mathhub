/* Утиліти: дати, форматування, DOM, тости */
(function () {
  'use strict';

  var U = {};

  /* ---------- Дати ---------- */

  U.DAYS_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  U.DAYS_FULL = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];
  U.MONTHS_GEN = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
                  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  U.MONTHS_NOM = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
                  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  U.pad = pad;

  /** Локальна дата у форматі YYYY-MM-DD (без зсуву часових поясів). */
  U.ymd = function (d) {
    d = U.toDate(d);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };

  U.toDate = function (v) {
    if (v instanceof Date) return v;
    if (typeof v === 'string') {
      // 'YYYY-MM-DD' або 'YYYY-MM-DDTHH:mm' — парсимо як локальний час
      var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v);
      if (m) {
        return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
      }
    }
    return new Date(v);
  };

  U.today = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };

  U.addDays = function (d, n) { var x = new Date(U.toDate(d)); x.setDate(x.getDate() + n); return x; };

  /** Понеділок того тижня, в який потрапляє дата. */
  U.startOfWeek = function (d) {
    var x = U.toDate(d); x = new Date(x.getFullYear(), x.getMonth(), x.getDate());
    var wd = (x.getDay() + 6) % 7; // Пн = 0
    x.setDate(x.getDate() - wd);
    return x;
  };

  U.isSameDay = function (a, b) { return U.ymd(a) === U.ymd(b); };

  U.daysBetween = function (a, b) {
    var x = U.toDate(a), y = U.toDate(b);
    x = new Date(x.getFullYear(), x.getMonth(), x.getDate());
    y = new Date(y.getFullYear(), y.getMonth(), y.getDate());
    return Math.round((y - x) / 86400000);
  };

  /** "24.07.26 15:30" — як на скріншоті. */
  U.fmtDateTime = function (v) {
    var d = U.toDate(v);
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  };

  U.fmtDate = function (v) {
    var d = U.toDate(v);
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2);
  };

  U.fmtTime = function (v) {
    var d = U.toDate(v);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  };

  /** "24 липня" / "24 липня 2027" якщо інший рік. */
  U.fmtDateLong = function (v) {
    var d = U.toDate(v);
    var s = d.getDate() + ' ' + U.MONTHS_GEN[d.getMonth()];
    if (d.getFullYear() !== new Date().getFullYear()) s += ' ' + d.getFullYear();
    return s;
  };

  /** "сьогодні", "завтра", "вчора", "через 3 дні", "5 днів тому". */
  U.fmtRelative = function (v) {
    var n = U.daysBetween(new Date(), v);
    if (n === 0) return 'сьогодні';
    if (n === 1) return 'завтра';
    if (n === 2) return 'післязавтра';
    if (n === -1) return 'вчора';
    if (n === -2) return 'позавчора';
    if (n > 0) return 'через ' + n + ' ' + U.plural(n, 'день', 'дні', 'днів');
    return Math.abs(n) + ' ' + U.plural(Math.abs(n), 'день', 'дні', 'днів') + ' тому';
  };

  /** Українське відмінювання: 1 урок / 2 уроки / 5 уроків. */
  U.plural = function (n, one, few, many) {
    n = Math.abs(Math.round(n));
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };

  U.pl = function (n, one, few, many) { return n + ' ' + U.plural(n, one, few, many); };

  /* ---------- Числа / текст ---------- */

  /* ---------- Валюти ---------- */

  U.CURRENCIES = {
    UAH: { symbol: '₴',  label: 'Гривня',               after: true,  step: 50 },
    USD: { symbol: '$',  label: 'Долар США',            after: false, step: 5 },
    EUR: { symbol: '€',  label: 'Євро',                 after: false, step: 5 },
    PLN: { symbol: 'zł', label: 'Злотий',               after: true,  step: 10 },
    GBP: { symbol: '£',  label: 'Фунт стерлінгів',      after: false, step: 5 },
    CZK: { symbol: 'Kč', label: 'Чеська крона',         after: true,  step: 100 },
    CAD: { symbol: 'C$', label: 'Канадський долар',     after: false, step: 5 },
    AUD: { symbol: 'A$', label: 'Австралійський долар', after: false, step: 5 }
  };

  U.CURRENCY_CODES = Object.keys(U.CURRENCIES);

  U.cur = function (code) { return U.CURRENCIES[code] || U.CURRENCIES.UAH; };

  U.symbol = function (code) { return U.cur(code).symbol; };

  /** Сума з символом валюти: 12 500 ₴, $180, 250 zł. */
  U.money = function (n, code) {
    var c = U.cur(code);
    var v = Number(n) || 0;
    var neg = v < 0;
    v = Math.abs(v);
    var rounded = Math.round(v * 100) / 100;
    var str = rounded.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      .replace(/[   ]/g, ' ');
    var core = c.after ? str + ' ' + c.symbol : c.symbol + str;
    return (neg ? '−' : '') + core;
  };

  /**
   * Кілька валют одним рядком: {UAH: 12500, USD: 180} → "12 500 ₴ · $180".
   * Нулі приховуються; якщо все порожнє — повертає нуль у базовій валюті.
   */
  U.moneyMap = function (map, base) {
    var keys = Object.keys(map || {}).filter(function (k) { return Math.abs(map[k]) > 0.005; });
    if (!keys.length) return U.money(0, base || 'UAH');
    keys.sort(function (a, b) { return Math.abs(map[b]) - Math.abs(map[a]); });
    return keys.map(function (k) { return U.money(map[k], k); }).join(' · ');
  };

  /** Скільки валют реально задіяно у мапі. */
  U.mapSize = function (map) {
    return Object.keys(map || {}).filter(function (k) { return Math.abs(map[k]) > 0.005; }).length;
  };

  U.num = function (n, digits) {
    var v = Number(n) || 0;
    return digits ? v.toFixed(digits).replace(/\.0+$/, '') : String(Math.round(v));
  };

  U.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  U.initials = function (name) {
    var parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  /**
   * Кличний відмінок імені для звертання: Микита → Микито, Андрій → Андрію.
   * Покриває поширені випадки; для незвичних імен повертає вихідну форму.
   */
  U.vocative = function (fullName) {
    var name = String(fullName || '').trim().split(/\s+/)[0];
    if (name.length < 3) return name;
    var lower = name.toLowerCase();
    var last = lower.slice(-1);
    var body = name.slice(0, -1);

    if (lower.slice(-2) === 'ія') return body + 'є';          // Марія → Маріє
    if (last === 'а') return body + 'о';                       // Микита → Микито
    if (last === 'я') return body + 'ю';                       // Наталя → Наталю
    if (last === 'о') return body + 'е';                       // Петро → Петре
    if (last === 'й') return body + 'ю';                       // Андрій → Андрію
    if (last === 'ь') return body + 'ю';                       // Василь → Василю
    if ('кгх'.indexOf(last) >= 0) return name + 'у';           // Олег → Олегу
    if ('бвгдджзлмнпрстфцчшщ'.indexOf(last) >= 0) return name + 'е'; // Іван → Іване
    return name;
  };

  U.uid = function (prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };

  U.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };

  U.sum = function (arr, fn) {
    return arr.reduce(function (a, x) { return a + (fn ? (Number(fn(x)) || 0) : (Number(x) || 0)); }, 0);
  };

  U.groupBy = function (arr, fn) {
    var out = {};
    arr.forEach(function (x) {
      var k = fn(x);
      (out[k] = out[k] || []).push(x);
    });
    return out;
  };

  U.sortBy = function (arr, fn, desc) {
    return arr.slice().sort(function (a, b) {
      var x = fn(a), y = fn(b);
      if (x < y) return desc ? 1 : -1;
      if (x > y) return desc ? -1 : 1;
      return 0;
    });
  };

  /* ---------- DOM ---------- */

  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /** Делегування подій по data-атрибуту. */
  U.onClick = function (root, selector, handler) {
    root.addEventListener('click', function (e) {
      var el = e.target.closest(selector);
      if (el && root.contains(el)) handler(el, e);
    });
  };

  /* ---------- Тости ---------- */

  U.toast = function (msg, kind) {
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    var ic = kind === 'err' ? 'alert' : kind === 'ok' ? 'check' : 'info';
    el.innerHTML = window.icon(ic, 17) + '<span>' + U.esc(msg) + '</span>';
    root.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      setTimeout(function () { el.remove(); }, 260);
    }, 2600);
  };

  window.U = U;
})();
