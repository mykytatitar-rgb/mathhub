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
     Реєстр
     ============================================================ */

  var EXTRAS = {
    'disc.binomial': binomial
  };

  window.MathExtras = {
    has: function (id) { return !!EXTRAS[id]; },
    mount: function (id, el) {
      if (!EXTRAS[id] || !el) return;
      try { EXTRAS[id](el); } catch (e) { console.warn('Вставка теми ' + id + ':', e); }
    }
  };
})();
