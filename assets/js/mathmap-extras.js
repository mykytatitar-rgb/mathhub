/* Інтерактивні вставки до тем карти математики.

   Деяких речей словами не пояснити: трикутник Паскаля треба бачити, як він
   росте, а формулу бінома — як вона складається з дужок. Такі вставки живуть
   тут, по одній на тему, і шухляда теми показує їх під конспектом.

   Звідки вони беруться: репетитор пише в картці теми «Побажання для Claude»,
   Claude доробляє блок і записує, що саме зроблено, у MATH_WISHES_DONE. Поки
   текст побажання той самий, у картці замість нього видно «Зроблено». */

(function () {
  'use strict';

  var U = window.U;

  function M(src) { return window.MathFmt ? MathFmt.render(src) : U.esc(src); }

  /* ============================================================
     Що вже зроблено з побажань
     ============================================================ */

  window.MATH_WISHES_DONE = {
    'disc.binomial': {
      match: 'трикутник паскаля',
      at: '16.09.2026',
      reply: 'Додано покрокове виведення формули з дужок, доведення через правило ' +
        'трикутника й інтерактивний трикутник Паскаля: його можна будувати по ' +
        'клітинці, а клік по числу показує, з яких двох воно складається.'
    }
  };

  /* ============================================================
     Біном Ньютона
     ============================================================ */

  function C(n, k) {
    if (k < 0 || k > n) return 0;
    var r = 1;
    for (var i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return Math.round(r);
  }

  /** (a+b)^n розписаний доданками, з виділеним k-м коефіцієнтом. */
  function expansion(n, hk) {
    var parts = [];
    for (var k = 0; k <= n; k++) {
      var c = C(n, k);
      var a = n - k, b = k;
      var term = (c === 1 && (a || b) ? '' : String(c)) +
        (a ? 'a' + (a > 1 ? '^{' + a + '}' : '') : '') +
        (b ? 'b' + (b > 1 ? '^{' + b + '}' : '') : '');
      parts.push('<span class="mx-term' + (k === hk ? ' is-hl' : '') + '" data-k="' + k + '">' +
        M(term || '1') + '</span>');
    }
    return M('(a+b)^{' + n + '}') + ' = ' + parts.join(' + ');
  }

  var STEPS = [
    {
      t: 'Степінь — це добуток дужок',
      b: 'Піднести до степеня $n$ означає перемножити $n$ однакових дужок:',
      f: '(a+b)^{n} = (a+b)(a+b)\\cdots(a+b)'
    },
    {
      t: 'Кожен доданок — це вибір',
      b: 'Розкриваючи дужки, з кожної беремо або $a$, або $b$ і перемножуємо взяте. ' +
        'Якщо $b$ узяли з $k$ дужок, а $a$ — з решти $n-k$, вийде доданок:',
      f: 'a^{n-k}b^{k}'
    },
    {
      t: 'Скільки однакових доданків',
      b: 'Доданок $a^{n-k}b^{k}$ дає кожен спосіб вибрати ті $k$ дужок, з яких беремо $b$. ' +
        'Таких способів — кількість сполучень із $n$ по $k$:',
      f: 'C_{n}^{k} = \\frac{n!}{k!(n-k)!}'
    },
    {
      t: 'Формула бінома',
      b: 'Складаємо однакові доданки для всіх $k$ від $0$ до $n$:',
      f: '(a+b)^{n} = \\sum_{k=0}^{n} C_{n}^{k} a^{n-k} b^{k}'
    },
    {
      t: 'Чому це трикутник Паскаля',
      b: 'Запишемо $(a+b)^{n} = (a+b)^{n-1}(a+b)$. Доданок $a^{n-k}b^{k}$ зʼявляється двома ' +
        'шляхами: $a^{n-k}b^{k-1}$ домножили на $b$ або $a^{n-k-1}b^{k}$ — на $a$. Тому коефіцієнт ' +
        'дорівнює сумі двох коефіцієнтів попереднього степеня — тих самих двох чисел, що стоять ' +
        'над ним у трикутнику:',
      f: 'C_{n}^{k} = C_{n-1}^{k-1} + C_{n-1}^{k}'
    },
    {
      t: 'Доведення індукцією',
      b: 'Для $n=1$: $(a+b)^{1} = a+b$ — формула правильна. Нехай вона правильна для $n-1$. ' +
        'Помножимо обидві частини на $(a+b)$ і зберемо коефіцієнт при $a^{n-k}b^{k}$: він дорівнює ' +
        '$C_{n-1}^{k-1} + C_{n-1}^{k}$, тобто $C_{n}^{k}$ за правилом трикутника. Отже формула ' +
        'правильна й для $n$, а значить — для всіх натуральних $n$.',
      f: ''
    }
  ];

  function binomial(root) {
    var state = { n: 4, step: 0, built: null, pick: null };

    root.innerHTML =
      '<section class="mx">' +
        '<div class="mx-h">Звідки береться формула</div>' +
        '<div class="mx-steps" data-mx-steps></div>' +
        '<div class="mx-nav">' +
          '<button class="btn btn--ghost btn--sm" data-mx="prev">Назад</button>' +
          '<span class="mx-count" data-mx-count></span>' +
          '<button class="btn btn--soft btn--sm" data-mx="next">Далі</button>' +
        '</div>' +
      '</section>' +
      '<section class="mx">' +
        '<div class="mx-h">Трикутник Паскаля</div>' +
        '<div class="mx-sub">Кожне число — сума двох над ним. Натисніть на число, щоб побачити, ' +
          'з яких воно складається, або будуйте трикутник по клітинці.</div>' +
        '<div class="mx-tri" data-mx-tri></div>' +
        '<div class="mx-sum" data-mx-sum></div>' +
        '<div class="mx-nav">' +
          '<button class="btn btn--ghost btn--sm" data-mx="less">−</button>' +
          '<span class="mx-count" data-mx-n></span>' +
          '<button class="btn btn--ghost btn--sm" data-mx="more">+</button>' +
          '<span class="spacer"></span>' +
          '<button class="btn btn--soft btn--sm" data-mx="build">По клітинці</button>' +
          '<button class="btn btn--ghost btn--sm" data-mx="all">Увесь</button>' +
        '</div>' +
        '<div class="mx-exp" data-mx-exp></div>' +
      '</section>';

    function drawSteps() {
      var box = root.querySelector('[data-mx-steps]');
      box.innerHTML = STEPS.slice(0, state.step + 1).map(function (s, i) {
        return '<div class="mx-step' + (i === state.step ? ' is-new' : '') + '">' +
          '<div class="mx-step__t"><b>' + (i + 1) + '.</b> ' + U.esc(s.t) + '</div>' +
          '<div class="mx-step__b">' + (window.MathFmt ? MathFmt.text(s.b) : U.esc(s.b)) + '</div>' +
          (s.f ? '<div class="mx-step__f">' + M(s.f) + '</div>' : '') +
          '</div>';
      }).join('');
      root.querySelector('[data-mx-count]').textContent = (state.step + 1) + ' з ' + STEPS.length;
    }

    /* Скільки клітинок показано: null — усі. При побудові по клітинці
       рахуємо їх зверху вниз, зліва направо. */
    function cellIndex(n, k) { return n * (n + 1) / 2 + k; }

    function drawTri() {
      var rows = [];
      for (var n = 0; n <= state.n; n++) {
        var cells = [];
        for (var k = 0; k <= n; k++) {
          var idx = cellIndex(n, k);
          var shown = state.built == null || idx < state.built;
          var cls = 'mx-cell';
          if (!shown) cls += ' is-hidden';
          if (state.pick) {
            if (state.pick.n === n && state.pick.k === k) cls += ' is-pick';
            if (state.pick.n - 1 === n && (state.pick.k - 1 === k || state.pick.k === k)) cls += ' is-parent';
          }
          cells.push('<button class="' + cls + '" data-mx-cell="' + n + ',' + k + '">' +
            (shown ? C(n, k) : '') + '</button>');
        }
        rows.push('<div class="mx-row"><span class="mx-rown">' + n + '</span>' + cells.join('') + '</div>');
      }
      root.querySelector('[data-mx-tri]').innerHTML = rows.join('');
      root.querySelector('[data-mx-n]').textContent = 'рядків: ' + (state.n + 1);

      var sum = root.querySelector('[data-mx-sum]');
      var p = state.pick;
      if (p && p.n > 0 && p.k > 0 && p.k < p.n) {
        sum.innerHTML = M('C_{' + p.n + '}^{' + p.k + '} = C_{' + (p.n - 1) + '}^{' + (p.k - 1) + '} + C_{' +
          (p.n - 1) + '}^{' + p.k + '} = ' + C(p.n - 1, p.k - 1) + ' + ' + C(p.n - 1, p.k) + ' = ' + C(p.n, p.k));
      } else if (p) {
        sum.innerHTML = M('C_{' + p.n + '}^{' + p.k + '} = 1') +
          ' — на краю трикутника завжди одиниця: $a^n$ чи $b^n$ виходить одним способом.'
            .replace(/\$([^$]+)\$/g, function (_, f) { return M(f); });
      } else {
        sum.innerHTML = '';
      }

      var row = p ? p.n : state.n;
      root.querySelector('[data-mx-exp]').innerHTML = '<div class="mx-sub">Рядок ' + row +
        ' — це коефіцієнти розкладу:</div><div class="mx-exp__f">' + expansion(row, p ? p.k : -1) + '</div>';
    }

    function stopBuild() {
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
    }

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mx]');
      var cell = e.target.closest('[data-mx-cell]');

      if (cell) {
        var nk = cell.getAttribute('data-mx-cell').split(',').map(Number);
        state.pick = { n: nk[0], k: nk[1] };
        drawTri();
        return;
      }
      if (!b) return;
      var act = b.getAttribute('data-mx');

      if (act === 'next' && state.step < STEPS.length - 1) { state.step++; drawSteps(); }
      if (act === 'prev' && state.step > 0) { state.step--; drawSteps(); }

      if (act === 'more' && state.n < 10) { state.n++; state.pick = null; drawTri(); }
      if (act === 'less' && state.n > 1) { state.n--; state.pick = null; drawTri(); }
      if (act === 'all') { stopBuild(); state.built = null; state.pick = null; drawTri(); }

      /* По клітинці: кожне нове число зʼявляється разом із двома, з яких
         воно складається, — так правило трикутника видно на власні очі. */
      if (act === 'build') {
        stopBuild();
        var total = cellIndex(state.n, state.n) + 1;
        state.built = 1;
        state.pick = null;
        drawTri();
        state.timer = setInterval(function () {
          if (!root.isConnected || state.built >= total) {
            stopBuild();
            state.built = null;
            if (root.isConnected) drawTri();
            return;
          }
          var n = 0;
          while (cellIndex(n + 1, 0) <= state.built) n++;
          var k = state.built - cellIndex(n, 0);
          state.built++;
          state.pick = { n: n, k: k };
          drawTri();
        }, 900);
      }
    });

    drawSteps();
    drawTri();
  }

  /* ============================================================
     Метод математичної індукції
     ============================================================

     Дві речі, які словами пояснюються гірше, ніж руками. Перша — навіщо
     потрібні обидві умови: без бази не падає нічого, без кроку — лише
     перша кісточка. Друга — що саме робить крок: до вже доведеного для n
     додається рівно один новий стовпчик, і формула лишається правильною. */

  var DOMINOES = 12;

  function induction(root) {
    var st = { base: true, step: true, n: 4, timers: [] };

    root.innerHTML =
      '<section class="mx">' +
        '<div class="mx-h">Як працює індукція</div>' +
        '<div class="mx-sub">Кісточка з номером n — це твердження P(n). Вона «падає», коли ' +
          'твердження доведено. Вимкніть базу чи крок і подивіться, що вийде.</div>' +
        '<div class="mx-dom" data-mx-dom></div>' +
        '<div class="mx-nav">' +
          '<label class="mx-check"><input type="checkbox" data-mx-base checked> База: P(1) правильне</label>' +
          '<label class="mx-check"><input type="checkbox" data-mx-step checked> Крок: P(k) ⇒ P(k+1)</label>' +
          '<span class="spacer"></span>' +
          '<button class="btn btn--soft btn--sm" data-mx="push">Запустити</button>' +
        '</div>' +
        '<div class="mx-verdict" data-mx-verdict></div>' +
      '</section>' +
      '<section class="mx">' +
        '<div class="mx-h">Приклад: 1 + 2 + … + n = n(n + 1)/2</div>' +
        '<div class="mx-sub">Сходинки — це сума 1 + 2 + … + n. Дві однакові сходинки складаються ' +
          'в прямокутник n × (n + 1), тому сходинок рівно половина. Крок додає один новий стовпчик.</div>' +
        '<div class="mx-stairs" data-mx-stairs></div>' +
        '<div class="mx-sum" data-mx-proof></div>' +
        '<div class="mx-nav">' +
          '<button class="btn btn--ghost btn--sm" data-mx="n-less">−</button>' +
          '<span class="mx-count" data-mx-nval></span>' +
          '<button class="btn btn--soft btn--sm" data-mx="n-more">Крок: n → n + 1</button>' +
        '</div>' +
      '</section>';

    function clearTimers() {
      st.timers.forEach(clearTimeout);
      st.timers = [];
    }

    function drawDominoes(fallen) {
      var html = '';
      for (var i = 1; i <= DOMINOES; i++) {
        html += '<div class="mx-domino' + (i <= fallen ? ' is-down' : '') + '"><span>' + i + '</span></div>';
      }
      html += '<div class="mx-domino mx-domino--more">…</div>';
      root.querySelector('[data-mx-dom]').innerHTML = html;
    }

    function push() {
      clearTimers();
      drawDominoes(0);
      var verdict = root.querySelector('[data-mx-verdict]');
      verdict.className = 'mx-verdict';
      verdict.textContent = '';

      if (!st.base) {
        verdict.classList.add('is-bad');
        verdict.textContent = 'Без бази нічого не падає: крок каже «якщо P(k), то P(k+1)», але жодне P(k) не доведено — ланцюжку нема з чого почати.';
        return;
      }
      var last = st.step ? DOMINOES : 1;
      for (var i = 1; i <= last; i++) {
        (function (k) {
          st.timers.push(setTimeout(function () {
            if (!root.isConnected) return clearTimers();
            drawDominoes(k);
            if (k === last) {
              verdict.classList.add(st.step ? 'is-good' : 'is-bad');
              verdict.textContent = st.step
                ? 'Падають усі: P(1) доведено, і кожна кісточка валить наступну. Отже, P(n) правильне для кожного n.'
                : 'Без кроку впала лише перша: доведено тільки P(1). Про P(2), P(3), … ми нічого не знаємо.';
            }
          }, 250 + (k - 1) * 170));
        })(i);
      }
    }

    /* Сходинки n стовпчиків: у стовпчику i — i клітинок. Поруч, догори
       дриґом, друга така сама — разом прямокутник n × (n + 1). */
    function drawStairs() {
      var n = st.n, cell = 22, gap = 2;
      var w = n * (cell + gap) + gap, h = (n + 1) * (cell + gap) + gap;
      var rects = [];
      for (var col = 0; col < n; col++) {
        var height = col + 1;
        for (var row = 0; row < n + 1; row++) {
          var mine = row >= n + 1 - height;          // нижні height клітинок — наші сходинки
          var fresh = mine && col === n - 1 && st.fresh;
          rects.push('<rect x="' + (gap + col * (cell + gap)) + '" y="' + (gap + row * (cell + gap)) +
            '" width="' + cell + '" height="' + cell + '" rx="4" class="' +
            (fresh ? 'mx-sq is-new' : mine ? 'mx-sq' : 'mx-sq is-twin') + '"/>');
        }
      }
      root.querySelector('[data-mx-stairs]').innerHTML =
        '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + Math.min(w, 260) + '" role="img" ' +
        'aria-label="Сходинки суми">' + rects.join('') + '</svg>';

      var s = n * (n + 1) / 2;
      var proof = root.querySelector('[data-mx-proof]');
      if (n === 1) {
        proof.innerHTML = '<b>База:</b> ' + M('1 = \\frac{1 \\cdot 2}{2}') + ' — правильно.';
      } else {
        var k = n - 1;
        proof.innerHTML = '<b>Крок від ' + k + ' до ' + n + ':</b> ' +
          M('S_{' + n + '} = S_{' + k + '} + ' + n + ' = \\frac{' + k + ' \\cdot ' + n + '}{2} + ' + n +
            ' = \\frac{' + n + ' \\cdot ' + (n + 1) + '}{2} = ' + s);
      }
      root.querySelector('[data-mx-nval]').textContent = 'n = ' + n + ', сума ' + s;
    }

    root.addEventListener('change', function (e) {
      if (e.target.matches('[data-mx-base]')) st.base = e.target.checked;
      if (e.target.matches('[data-mx-step]')) st.step = e.target.checked;
    });

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mx]');
      if (!b) return;
      var act = b.getAttribute('data-mx');
      if (act === 'push') push();
      if (act === 'n-more' && st.n < 9) { st.n++; st.fresh = true; drawStairs(); }
      if (act === 'n-less' && st.n > 1) { st.n--; st.fresh = false; drawStairs(); }
    });

    drawDominoes(0);
    drawStairs();
  }

  /* ============================================================
     Реєстр
     ============================================================ */

  var EXTRAS = {
    'disc.binomial': binomial,
    'found.induction': induction
  };

  window.MathExtras = {
    has: function (id) { return !!EXTRAS[id]; },
    mount: function (id, el) {
      if (!EXTRAS[id] || !el) return;
      try { EXTRAS[id](el); } catch (e) { console.warn('Вставка теми ' + id + ':', e); }
    }
  };
})();
