/* Розбір і обчислення формул виду f(x) = x^2 - 3x + 1.

   Навіщо власний розбір, а не вбудований обчислювач мови. По-перше, формулу
   пише людина, і помилка в ній має ставати зрозумілим повідомленням, а не
   падінням сторінки. По-друге, формула їде в збереження й у синхронізацію,
   тобто повертається з сервера, — а виконувати те, що прийшло ззовні,
   програма не має права навіть із власного сервера.

   Розбір рекурсивний, за звичайним пріоритетом дій:
     вираз  → доданок { (+|-) доданок }
     доданок → степінь { (*|/) степінь }
     степінь → множник [ ^ степінь ]        (справа наліво: 2^3^2 = 2^9)
     множник → число | x | π | e | функція(вираз) | (вираз) | -множник */
(function () {
  'use strict';

  var P = {};

  var FN = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
    ln: Math.log, lg: function (v) { return Math.log(v) / Math.LN10; },
    log: function (v) { return Math.log(v) / Math.LN10; },
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    sign: function (v) { return v > 0 ? 1 : v < 0 ? -1 : 0; },
    floor: Math.floor, ceil: Math.ceil, round: Math.round
  };

  var CONST = { pi: Math.PI, 'π': Math.PI, e: Math.E };

  /* ============================================================
     Лексика
     ============================================================ */

  function tokenize(src) {
    var s = String(src || '')
      .replace(/,/g, '.')          // кома як десяткова крапка
      .replace(/−/g, '-')          // типографський мінус
      .replace(/[×·]/g, '*')
      .replace(/[÷:]/g, '/')
      .replace(/\s+/g, '');

    var out = [], i = 0;
    while (i < s.length) {
      var ch = s.charAt(i);

      if (/[0-9.]/.test(ch)) {
        var num = '';
        while (i < s.length && /[0-9.]/.test(s.charAt(i))) num += s.charAt(i++);
        if (!isFinite(Number(num))) throw new Error('Незрозуміле число «' + num + '»');
        out.push({ t: 'num', v: Number(num) });
        continue;
      }

      if (/[A-Za-zπ]/.test(ch)) {
        var name = '';
        while (i < s.length && /[A-Za-zπ0-9]/.test(s.charAt(i))) name += s.charAt(i++);
        var low = name.toLowerCase();
        if (FN[low]) out.push({ t: 'fn', v: low });
        else if (low === 'x') out.push({ t: 'x' });
        else if (CONST[low] != null || CONST[name] != null) {
          out.push({ t: 'num', v: CONST[low] != null ? CONST[low] : CONST[name] });
        } else throw new Error('Невідоме позначення «' + name + '»');
        continue;
      }

      if ('+-*/^()'.indexOf(ch) >= 0) { out.push({ t: ch }); i++; continue; }
      throw new Error('Незрозумілий символ «' + ch + '»');
    }
    return out;
  }

  /* Неявне множення: 2x, 3(x+1), (x+1)(x-1), 2sin(x).
     Пишуть саме так, і вимагати зірочку означало б сперечатися зі звичкою. */
  function insertMul(tok) {
    var out = [];
    for (var i = 0; i < tok.length; i++) {
      out.push(tok[i]);
      var a = tok[i], b = tok[i + 1];
      if (!b) break;
      var aEnd = a.t === 'num' || a.t === 'x' || a.t === ')';
      var bStart = b.t === 'num' || b.t === 'x' || b.t === '(' || b.t === 'fn';
      if (aEnd && bStart) out.push({ t: '*' });
    }
    return out;
  }

  /* ============================================================
     Розбір у дерево
     ============================================================ */

  function parse(tok) {
    var pos = 0;

    function peek() { return tok[pos]; }
    function eat(t) {
      if (tok[pos] && tok[pos].t === t) { pos++; return true; }
      return false;
    }

    function expr() {
      var node = term();
      for (;;) {
        if (eat('+')) node = { op: '+', a: node, b: term() };
        else if (eat('-')) node = { op: '-', a: node, b: term() };
        else return node;
      }
    }

    function term() {
      var node = unary();
      for (;;) {
        if (eat('*')) node = { op: '*', a: node, b: unary() };
        else if (eat('/')) node = { op: '/', a: node, b: unary() };
        else return node;
      }
    }

    /* Мінус слабший за степінь: −x² — це −(x²), а не (−x)². Інакше
       найзвичайніша парабола вітками вниз малювалася б вітками вгору. */
    function unary() {
      if (eat('-')) return { op: 'neg', a: unary() };
      if (eat('+')) return unary();
      return power();
    }

    function power() {
      var node = atom();
      // праворуч наліво: 2^3^2 — це 2^(3^2); показник може бути відʼємним
      if (eat('^')) return { op: '^', a: node, b: unary() };
      return node;
    }

    function atom() {
      var t = peek();
      if (!t) throw new Error('Формула обірвалася');

      if (t.t === 'num') { pos++; return { op: 'num', v: t.v }; }
      if (t.t === 'x') { pos++; return { op: 'x' }; }

      if (t.t === 'fn') {
        pos++;
        if (!eat('(')) throw new Error('Після ' + t.v + ' потрібна дужка');
        var arg = expr();
        if (!eat(')')) throw new Error('Не вистачає закритої дужки');
        return { op: 'fn', v: t.v, a: arg };
      }

      if (t.t === '(') {
        pos++;
        var inner = expr();
        if (!eat(')')) throw new Error('Не вистачає закритої дужки');
        return inner;
      }

      throw new Error('Зайвий символ у формулі');
    }

    var root = expr();
    if (pos < tok.length) throw new Error('Зайве в кінці формули');
    return root;
  }

  function evalNode(n, x) {
    switch (n.op) {
      case 'num': return n.v;
      case 'x': return x;
      case 'neg': return -evalNode(n.a, x);
      case '+': return evalNode(n.a, x) + evalNode(n.b, x);
      case '-': return evalNode(n.a, x) - evalNode(n.b, x);
      case '*': return evalNode(n.a, x) * evalNode(n.b, x);
      case '/': return evalNode(n.a, x) / evalNode(n.b, x);
      case '^': return Math.pow(evalNode(n.a, x), evalNode(n.b, x));
      case 'fn': return FN[n.v](evalNode(n.a, x));
    }
    return NaN;
  }

  /* ============================================================
     Назовні
     ============================================================ */

  /**
   * Перетворити текст формули на функцію.
   *
   * Повертає {f, err}. Якщо err не порожній — формула не читається, і саме
   * цей рядок треба показати людині: «Невідоме позначення «у»» корисніше за
   * порожній графік.
   *
   * Функція завжди повертає число або NaN і ніколи не кидає: точку з NaN
   * малювання просто пропускає, і графік з розривом лишається графіком.
   */
  P.compile = function (src) {
    var tree;
    try {
      var tok = insertMul(tokenize(src));
      if (!tok.length) return { f: null, err: 'Формула порожня' };
      tree = parse(tok);
    } catch (e) {
      return { f: null, err: e.message };
    }

    var f = function (x) {
      var v;
      try { v = evalNode(tree, x); } catch (e) { return NaN; }
      return typeof v === 'number' && isFinite(v) ? v : NaN;
    };

    // перевіряємо на кількох точках: формула може розібратись, але не рахувати
    var ok = false;
    for (var i = -3; i <= 3 && !ok; i++) if (!isNaN(f(i + 0.37))) ok = true;
    if (!ok) return { f: null, err: 'Формула нічого не обчислює' };

    return { f: f, err: '' };
  };

  /** Похідна за означенням — саме так, як її показують на уроці. */
  P.slopeAt = function (f, x, h) {
    h = h || 1e-6;
    var a = f(x - h), b = f(x + h);
    if (isNaN(a) || isNaN(b)) {
      // на краю області визначення беремо однобічну
      var c = f(x);
      if (isNaN(c)) return NaN;
      if (!isNaN(b)) return (b - c) / h;
      if (!isNaN(a)) return (c - a) / h;
      return NaN;
    }
    return (b - a) / (2 * h);
  };

  window.Plot = P;
})();
