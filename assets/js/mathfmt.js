/* Набір формул.

   Навіщо взагалі. Формулу можна написати картинкою або зверстати руками —
   так зроблено на більшості шпаргалок в інтернеті. Обидва шляхи погані:
   картинку не відредагуєш і не збільшиш, ручна верстка означає, що кожну
   нову формулу доводиться складати з тегів.

   Тут формулу пишуть текстом — a^2, \frac{1}{2}, \sqrt[3]{8} — а показується
   вона як формула: степінь угорі, дріб рискою, корінь із хвостиком.

   Свій маленький набір, а не готова бібліотека. KaTeX важить більше, ніж уся
   ця програма разом, і тягне за собою шрифти з чужого сервера. Тут потрібна
   шкільна математика, а не журнальна стаття: степені, індекси, дроби,
   корені й десяток знаків. Це вміщається у сто рядків і працює без мережі. */

(function () {
  'use strict';

  var M = {};

  /* Слова, які пишуть із похилою рискою. Назви ті самі, що в TeX: якщо
     людина колись бачила формули в інтернеті, вона їх уже знає. */
  var SYM = {
    cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓',
    le: '≤', ge: '≥', ne: '≠', approx: '≈', equiv: '≡',
    to: '→', Rightarrow: '⇒', Leftrightarrow: '⇔', mapsto: '↦',
    infty: '∞', deg: '°', angle: '∠', triangle: '△',
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
    theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', phi: 'φ', omega: 'ω',
    Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω',
    in: '∈', notin: '∉', subset: '⊂', cup: '∪', cap: '∩', varnothing: '∅',
    forall: '∀', exists: '∃', sum: '∑', prod: '∏', int: '∫',
    iint: '∬', iiint: '∭', oint: '∮', oiint: '∯',
    partial: '∂', nabla: '∇', Int: '∫',
    parallel: '∥', perp: '⊥', sim: '∼', propto: '∝',
    ldots: '…', cdots: '⋯', quad: ' ', qquad: '  '
  };

  /* stacked — межі зверху й знизу; інакше збоку, як заведено для інтеграла. */
  var BIGOP = {
    int:   { glyph: '∫', stacked: false },
    iint:  { glyph: '∬', stacked: false },
    iiint: { glyph: '∭', stacked: false },
    oint:  { glyph: '∮', stacked: false },
    sum:   { glyph: '∑', stacked: true },
    prod:  { glyph: '∏', stacked: true },
    lim:   { glyph: 'lim', stacked: true, fn: true },
    max:   { glyph: 'max', stacked: true, fn: true },
    min:   { glyph: 'min', stacked: true, fn: true }
  };

  /* Скорочення для тих, хто не хоче пам'ятати похилі риски. Замінюємо до
     розбору, бо після нього рядок уже містить теги. */
  var SHORT = [
    [/<=/g, '≤'], [/>=/g, '≥'], [/!=/g, '≠'], [/->/g, '→'], [/=>/g, '⇒'],
    [/\+-/g, '±'], [/\*/g, '·']
  ];

  function esc(c) {
    return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;'
         : c === '"' ? '&quot;' : c;
  }

  /** Прочитати {…} з урахуванням вкладених дужок. */
  function readGroup(s, i) {
    if (s[i] !== '{') return { body: '', end: i };
    var depth = 0, start = i + 1;
    for (var j = i; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') { depth--; if (!depth) return { body: s.slice(start, j), end: j + 1 }; }
    }
    return { body: s.slice(start), end: s.length };     // забули закрити — беремо решту
  }

  /** Аргумент степеня чи індексу: або {група}, або один символ. */
  function readArg(s, i) {
    if (s[i] === '{') return readGroup(s, i);
    if (i >= s.length) return { body: '', end: i };
    // багатоцифрове число зверху читається як одне ціле: x^10, а не x^1 0
    var m = /^\d+/.exec(s.slice(i));
    if (m) return { body: m[0], end: i + m[0].length };
    return { body: s[i], end: i + 1 };
  }

  function parse(s) {
    var out = '';
    var i = 0;

    while (i < s.length) {
      var c = s.charAt(i);

      if (c === '\\') {
        /* Проміжки й екрановані знаки. Без цього \\, перетворювалося на
           звичайну кому — і «120\\,000» читалося як «120,000», тобто зовсім
           інше число. */
        var nxt = s.charAt(i + 1);
        /* Вузький НЕрозривний пробіл: у «120\\,000» розрив між тисячами
           перетворив би одне число на два. */
        if (nxt === ',' || nxt === ':' || nxt === ';') { out += '\u202F'; i += 2; continue; }
        if (nxt === '!') { i += 2; continue; }
        if (nxt === '{' || nxt === '}' || nxt === '%' || nxt === '&' || nxt === '\\') {
          out += esc(nxt); i += 2; continue;
        }

        var m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
        if (!m) { i++; continue; }
        var name = m[1];
        i += m[0].length;

        if (name === 'frac') {
          var a = readGroup(s, i);
          var b = readGroup(s, a.end);
          i = b.end;
          out += '<span class="mf-frac">' +
                   '<span class="mf-num">' + parse(a.body) + '</span>' +
                   '<span class="mf-den">' + parse(b.body) + '</span>' +
                 '</span>';
          continue;
        }

        /* Команди TeX, що кажуть «розтягни дужку під вміст». Тут
           дужки й так звичайні, тож просто пропускаємо самі слова — інакше
           посеред формули стояли б самі ці слова. */
        if (name === 'left' || name === 'right') continue;

        if (name === 'sqrt') {
          var idx = '';
          if (s.charAt(i) === '[') {
            var close = s.indexOf(']', i);
            if (close > 0) { idx = s.slice(i + 1, close); i = close + 1; }
          }
          var g = readGroup(s, i);
          i = g.end;
          out += '<span class="mf-root">' +
                   (idx ? '<span class="mf-idx">' + parse(idx) + '</span>' : '') +
                   '<span class="mf-sign">√</span>' +
                   '<span class="mf-under">' + parse(g.body) + '</span>' +
                 '</span>';
          continue;
        }

        /* Диференціал. У «dx» буква d означає дію, а не величину, тож
           курсив тут неправильний — і в підручнику вона пряма. */
        if (name === 'd') {
          var dg = s.charAt(i) === '{' ? readGroup(s, i) : null;
          if (dg) i = dg.end;
          out += '<span class="mf-d">d</span>' + (dg ? parse(dg.body) : '');
          continue;
        }

        /* Великі оператори: інтеграл, сума, добуток, границя.

           Межі в них стоять не в рядок, а біля самого знака — і по-різному:
           у суми зверху й знизу, в інтеграла збоку. Це не оформлення, а
           те, як формулу читають: «сума від i=1 до n» видно одним поглядом,
           а «∑_i=1^n» доводиться розбирати. */
        if (BIGOP[name]) {
          var sub = '', sup = '';
          for (var g2 = 0; g2 < 2; g2++) {
            if (s.charAt(i) === '_') { var ra = readArg(s, i + 1); sub = ra.body; i = ra.end; }
            else if (s.charAt(i) === '^') { var rb = readArg(s, i + 1); sup = rb.body; i = rb.end; }
            else break;
          }

          var glyph = BIGOP[name].glyph;
          var stacked = BIGOP[name].stacked;
          var head = BIGOP[name].fn
            ? '<span class="mf-fn">' + glyph + '</span>'
            : '<span class="mf-opsign">' + glyph + '</span>';

          if (!sub && !sup) { out += head; continue; }

          out += stacked
            ? '<span class="mf-big">' +
                '<span class="mf-over">' + (sup ? parse(sup) : '') + '</span>' +
                head +
                '<span class="mf-under2">' + (sub ? parse(sub) : '') + '</span>' +
              '</span>'
            : '<span class="mf-side">' + head +
                '<span class="mf-lim">' +
                  '<span class="mf-sup2">' + (sup ? parse(sup) : '') + '</span>' +
                  '<span class="mf-sub2">' + (sub ? parse(sub) : '') + '</span>' +
                '</span>' +
              '</span>';
          continue;
        }

        /* Назви функцій ставимо прямим шрифтом: sin x — це функція, а не
           добуток трьох літер, і курсив тут збиває. */
        if (/^(sin|cos|tg|ctg|tan|cot|log|ln|lg|arcsin|arccos|arctg|arcctg|sh|ch|th)$/.test(name)) {
          out += '<span class="mf-fn">' + name + '</span>';
          continue;
        }

        out += SYM[name] || ('\\' + name);
        continue;
      }

      if (c === '^' || c === '_') {
        var arg = readArg(s, i + 1);
        i = arg.end;
        out += c === '^'
          ? '<sup>' + parse(arg.body) + '</sup>'
          : '<sub>' + parse(arg.body) + '</sub>';
        continue;
      }

      /* Літери курсивом, решта прямим — так набирають математику всюди,
         від підручника до статті. Це не примха: у «2x» курсивна двійка
         читається як частина позначення, а не як число, і вираз миттєво
         стає чужим. Тому нахиляємо тільки те, що позначає величину. */
      var run = '';
      while (i < s.length && isVar(s.charAt(i))) { run += s.charAt(i); i++; }
      if (run) { out += '<i class="mf-v">' + run + '</i>'; continue; }

      out += esc(c);
      i++;
    }

    return out;
  }

  /* Латиниця й мала грека — величини. Велика грека (Δ, Σ, Ω) традиційно
     лишається прямою, як і цифри та знаки дій. */
  function isVar(ch) {
    return /[A-Za-z\u03B1-\u03C9]/.test(ch);
  }

  /**
   * Формула в HTML. Порожнє на вході — порожнє на виході, без «undefined»
   * посеред аркуша.
   */
  M.render = function (src) {
    var s = String(src == null ? '' : src);
    if (!s.trim()) return '';
    SHORT.forEach(function (r) { s = s.replace(r[0], r[1]); });
    return '<span class="mf">' + parse(s) + '</span>';
  };

  /** Те саме, але цілим блоком по центру — для головної формули картки. */
  M.block = function (src) {
    var html = M.render(src);
    return html ? '<div class="mf-block">' + html + '</div>' : '';
  };

  /* ============================================================
     Схеми графіків
     ============================================================

     Маленький малюнок замість слів «парабола вітками вгору». Форму графіка
     впізнають оком за мить, а з опису доводиться її відновлювати — саме
     тому в паперових шпаргалках ці ескізи є завжди.

     Намальовано вручну кривими, а не бібліотекою графіків: тут не потрібна
     точність по точках, потрібен упізнаваний силует. Він масштабується,
     друкується й важить кілька сотень байтів.

     Колір береться від тексту (currentColor), тож схема однаково доречна і
     в кабінеті, і на сторінці учня, і на папері. */

  var PLOTS = {
    'parabola-up':   'M26,16 Q60,78 94,16',
    'parabola-down': 'M26,68 Q60,6 94,68',
    'abs':           'M28,14 L60,62 L92,14',
    'line-up':       'M14,68 L106,16',
    'line-down':     'M14,16 L106,68',
    'exp-up':        'M12,70 C46,69 68,62 98,8',
    'exp-down':      'M22,8 C52,62 74,69 108,70',
    'sqrt':          'M60,62 C72,44 88,34 114,26',
    'cubic':         'M18,72 C44,70 76,14 102,12',
    'sin':           'M8,42 C20,8 32,8 44,42 C56,76 68,76 80,42 C92,8 104,8 114,42',
    'cos':           'M8,12 C20,12 32,72 44,72 C56,72 68,12 80,12 C92,12 104,72 114,72'
  };

  /* Гіпербола — дві гілки, тому окремо. */
  var TWO = {
    'hyperbola': ['M66,10 C80,34 84,38 114,41', 'M6,43 C36,46 40,50 54,74']
  };

  /**
   * Схема графіка як SVG. Невідома назва — порожньо, а не поламана картинка
   * посеред аркуша.
   */
  M.plot = function (name) {
    var d = PLOTS[name];
    var two = TWO[name];
    if (!d && !two) return '';

    var lines = two || [d];
    var body = lines.map(function (p) {
      return '<path d="' + p + '" fill="none" stroke="currentColor" stroke-width="2.4" ' +
             'stroke-linecap="round"/>';
    }).join('');

    return '<svg class="mf-plot" viewBox="0 0 120 84" width="120" height="84" ' +
      'role="img" aria-hidden="true">' +
      '<path d="M6,42 H114 M60,6 V78" stroke="#CBD5E1" stroke-width="1.4" fill="none"/>' +
      body +
      '</svg>';
  };

  /** Які схеми взагалі є — для підказки в редакторі. */
  M.plots = function () {
    return Object.keys(PLOTS).concat(Object.keys(TWO));
  };

  window.MathFmt = M;
})();
