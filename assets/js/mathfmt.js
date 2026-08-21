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
    parallel: '∥', perp: '⊥', sim: '∼', propto: '∝',
    ldots: '…', cdots: '⋯', quad: ' ', qquad: '  '
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

        /* Назви функцій ставимо прямим шрифтом: sin x — це функція, а не
           добуток трьох літер, і курсив тут збиває. */
        if (/^(sin|cos|tg|ctg|tan|cot|log|ln|lg|lim|max|min|arcsin|arccos|arctg)$/.test(name)) {
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

      out += esc(c);
      i++;
    }

    return out;
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

  window.MathFmt = M;
})();
