/* База формул англійською: алгебра.

   Переклад прив’язаний до формул за id (див. formulas-algebra.js). Сама
   формула f спільна для обох мов, крім тих, де в ній українські слова, —
   для них тут своя f. Позначення tg/ctg і десяткову кому сторінка сама
   переводить в англійські (tan/cot, крапка). Повноту перекладу перевіряє
   tools/formulas-check.js. Апостроф в англійському тексті — ’. */

(function () {
  'use strict';

  var E = window.FORMULAS_EN = window.FORMULAS_EN || { sections: {}, items: {} };
  function sec(id, title, note) { E.sections[id] = { title: title, note: note || '' }; }
  function f(id, t, o) { o = o || {}; o.t = t; E.items[id] = o; }

  /* ================================================================ Powers */
  sec('pow', 'Powers',
    'All properties of powers follow from one definition — “$n$ equal factors”. ' +
    'Zero, negative and fractional exponents are defined precisely so that these properties have no exceptions.');

  f('pow-def', 'Definition of a power', {
    f: 'a^n = a \\cdot a \\cdot \\ldots \\cdot a \\quad (n \\text{ factors})',
    w: '$n$ is a natural number; $a$ is the base, $n$ is the exponent. $a^1 = a$.',
    note: 'This is a definition, so there is nothing to prove. All the properties below follow from it.'
  });

  f('pow-mul', 'Product of powers with the same base', {
    w: 'For natural $m, n$ — by definition; for integer and fractional exponents the rule is the same (for $a > 0$).',
    ex: '$2^3 \\cdot 2^4 = 2^7 = 128$',
    p: [
      'By definition $a^m$ is $m$ factors of $a$, and $a^n$ is another $n$ factors of $a$.',
      'Multiplying them gives $m + n$ equal factors in a row: $$a^m \\cdot a^n = (a \\cdot \\ldots \\cdot a) \\cdot (a \\cdot \\ldots \\cdot a) = a^{m+n}.$$'
    ]
  });

  f('pow-div', 'Quotient of powers with the same base', {
    w: '$a \\ne 0$.',
    ex: '$\\frac{5^7}{5^5} = 5^2 = 25$',
    p: [
      'Let $m > n$. By the product rule $a^{m-n} \\cdot a^n = a^{(m-n)+n} = a^m$.',
      'So $a^{m-n}$ is the number which, multiplied by $a^n$, gives $a^m$, i.e. the quotient $a^m : a^n$ (division is allowed since $a \\ne 0$).',
      'For $m \\le n$ the equality stays true thanks to the definitions $a^0 = 1$ and $a^{-k} = \\frac{1}{a^k}$ — they are chosen exactly for this.'
    ]
  });

  f('pow-pow', 'Power of a power', {
    ex: '$(2^3)^2 = 2^6 = 64$',
    p: [
      'By definition $(a^m)^n = a^m \\cdot a^m \\cdot \\ldots \\cdot a^m$ — $n$ equal factors.',
      'By the product rule the exponents add up: $m + m + \\ldots + m = mn$. So $(a^m)^n = a^{mn}$.'
    ],
    err: 'Confusing it with the product rule: $(a^2)^3 = a^6$, not $a^5$. And $a^{3^2} = a^9$, which is not the same as $(a^3)^2 = a^6$.'
  });

  f('pow-prod', 'Power of a product', {
    ex: '$2^5 \\cdot 5^5 = 10^5$',
    p: [
      '$(ab)^n = (ab)(ab) \\ldots (ab)$ — $n$ equal brackets.',
      'Multiplication is commutative and associative, so all the $a$’s can be grouped together and all the $b$’s together: $$(ab)^n = (a \\cdot \\ldots \\cdot a)(b \\cdot \\ldots \\cdot b) = a^n b^n.$$'
    ],
    err: '$(a + b)^n \\ne a^n + b^n$: a power distributes over factors, not over terms.'
  });

  f('pow-quot', 'Power of a quotient', {
    w: '$b \\ne 0$.',
    p: [
      'Fractions are multiplied numerator by numerator and denominator by denominator.',
      'Multiplying $n$ equal fractions $\\frac{a}{b}$ gives $\\frac{a \\cdot \\ldots \\cdot a}{b \\cdot \\ldots \\cdot b} = \\frac{a^n}{b^n}$.'
    ]
  });

  f('pow-zero', 'Zero exponent', {
    w: '$a \\ne 0$. The expression $0^0$ is left undefined at school level.',
    p: [
      'We want the quotient rule to work for $m = n$ as well: $a^n : a^n = a^{n-n} = a^0$.',
      'But any non-zero number divided by itself gives $1$. So the only consistent choice is $a^0 = 1$.'
    ]
  });

  f('pow-neg', 'Negative exponent', {
    w: '$a \\ne 0$.',
    ex: '$2^{-3} = \\frac{1}{8}$, $\\left(\\frac{2}{3}\\right)^{-2} = \\frac{9}{4}$',
    p: [
      'The product rule must also hold for negative exponents: $a^{-n} \\cdot a^n = a^{-n+n} = a^0 = 1$.',
      'So $a^{-n}$ is the reciprocal of $a^n$: $a^{-n} = \\frac{1}{a^n}$.'
    ]
  });

  f('pow-frac', 'Fractional exponent', {
    w: '$a > 0$, $n$ is a natural number, $n \\ge 2$, $m$ is an integer.',
    ex: '$8^{\\frac{2}{3}} = \\sqrt[3]{64} = 4$',
    p: [
      'The power-of-a-power rule must hold here too: $\\left(a^{\\frac{m}{n}}\\right)^n = a^{\\frac{m}{n} \\cdot n} = a^m$.',
      'So $a^{\\frac{m}{n}}$ is a positive number whose $n$-th power is $a^m$. By the definition of a root this is $\\sqrt[n]{a^m}$.'
    ],
    err: 'Fractional powers of negative bases are not defined: $(-8)^{\\frac{1}{3}}$ is treated as meaningless, even though $\\sqrt[3]{-8} = -2$.'
  });

  /* ================================================================ Roots */
  sec('root', 'Roots',
    'A root is defined through a power, so every property of roots is proved the same way: ' +
    'raise the right-hand side to the power and check that it fits the definition.');

  f('root-def', 'Principal root', {
    w: 'For even $n$ — only $a \\ge 0$. For odd $n$ the root exists for every $a$ and has the sign of $a$: $\\sqrt[3]{-8} = -2$.',
    note: 'This is a definition. It immediately gives $(\\sqrt[n]{a})^n = a$ and $\\sqrt[n]{a^n} = a$ for $a \\ge 0$.'
  });

  f('root-sq-abs', 'Square root of a square', {
    ex: '$\\sqrt{(1 - \\sqrt{2})^2} = |1 - \\sqrt{2}| = \\sqrt{2} - 1$',
    p: [
      'By definition $\\sqrt{a^2}$ is the non-negative number whose square is $a^2$.',
      '$|a| \\ge 0$ and $|a|^2 = a^2$ (since $|a| = \\pm a$). So $|a|$ fits the definition.',
      'There are no other such numbers: only $a$ and $-a$ square to $a^2$, and just one of them is non-negative — $|a|$.'
    ],
    err: '$\\sqrt{a^2} = a$ is wrong for $a < 0$: $\\sqrt{(-3)^2} = 3$, not $-3$. For an odd power there is no modulus: $\\sqrt[3]{a^3} = a$.'
  });

  f('root-mul', 'Root of a product', {
    w: '$a \\ge 0$, $b \\ge 0$ (for odd $n$ — any).',
    ex: '$\\sqrt{72} = \\sqrt{36} \\cdot \\sqrt{2} = 6\\sqrt{2}$',
    p: [
      'The right-hand side is non-negative as a product of non-negative numbers.',
      'Raise it to the power $n$: $\\left(\\sqrt[n]{a} \\cdot \\sqrt[n]{b}\\right)^n = \\left(\\sqrt[n]{a}\\right)^n \\left(\\sqrt[n]{b}\\right)^n = ab$.',
      'So the right-hand side is a non-negative number whose $n$-th power is $ab$. By definition it is $\\sqrt[n]{ab}$.'
    ],
    err: '$\\sqrt{(-4)(-9)} = 6$, but $\\sqrt{-4} \\cdot \\sqrt{-9}$ does not exist. For $ab \\ge 0$ the correct form is $\\sqrt{ab} = \\sqrt{|a|} \\cdot \\sqrt{|b|}$.'
  });

  f('root-div', 'Root of a quotient', {
    w: '$a \\ge 0$, $b > 0$.',
    p: [
      'The right-hand side is non-negative. Raise it to the power $n$: $\\left(\\frac{\\sqrt[n]{a}}{\\sqrt[n]{b}}\\right)^n = \\frac{a}{b}$.',
      'By the definition of a root the right-hand side equals $\\sqrt[n]{\\frac{a}{b}}$.'
    ]
  });

  f('root-pow', 'Power of a root', {
    w: '$a \\ge 0$.',
    p: [
      'The left-hand side is non-negative. Its $n$-th power: $\\left(\\left(\\sqrt[n]{a}\\right)^k\\right)^n = \\left(\\left(\\sqrt[n]{a}\\right)^n\\right)^k = a^k$.',
      'By definition this is $\\sqrt[n]{a^k}$.'
    ]
  });

  f('root-root', 'Root of a root', {
    w: '$a \\ge 0$.',
    ex: '$\\sqrt{\\sqrt[3]{64}} = \\sqrt[6]{64} = 2$',
    p: [
      'The left-hand side is non-negative. Raise it to the power $mn$: $$\\left(\\sqrt[m]{\\sqrt[n]{a}}\\right)^{mn} = \\left(\\left(\\sqrt[m]{\\sqrt[n]{a}}\\right)^m\\right)^n = \\left(\\sqrt[n]{a}\\right)^n = a.$$',
      'So the left-hand side equals $\\sqrt[mn]{a}$.'
    ]
  });

  f('root-ext', 'Simplifying the index', {
    w: '$a \\ge 0$. The index of the root and the exponent can be divided by a common factor.',
    ex: '$\\sqrt[6]{a^4} = \\sqrt[3]{a^2}$',
    p: [
      'The right-hand side is non-negative. Raise it to the power $nk$: $$\\left(\\sqrt[n]{a^m}\\right)^{nk} = \\left(\\left(\\sqrt[n]{a^m}\\right)^n\\right)^k = (a^m)^k = a^{mk}.$$',
      'By definition this is $\\sqrt[nk]{a^{mk}}$.'
    ],
    err: 'For negative $a$ you cannot cancel: $\\sqrt[6]{(-2)^2} = \\sqrt[6]{4} > 0$, while $\\sqrt[3]{-2} < 0$.'
  });

  f('root-conj', 'Rationalising the denominator', {
    w: '$a, b \\ge 0$, $a \\ne b$.',
    ex: '$\\frac{1}{\\sqrt{3} - \\sqrt{2}} = \\sqrt{3} + \\sqrt{2}$',
    p: [
      'Multiply the numerator and the denominator by the conjugate $\\sqrt{a} + \\sqrt{b}$ — the fraction does not change.',
      'The denominator becomes a difference of squares: $(\\sqrt{a} - \\sqrt{b})(\\sqrt{a} + \\sqrt{b}) = a - b$.'
    ]
  });

  f('root-irr', '$\\sqrt{2}$ is irrational', {
    p: [
      'Suppose $\\sqrt{2} = \\frac{p}{q}$ is a fraction in lowest terms ($p$, $q$ are natural numbers).',
      'Then $p^2 = 2q^2$, so $p^2$ is even. The square of an odd number is odd, hence $p$ itself is even: $p = 2k$.',
      'Substituting: $4k^2 = 2q^2$, so $q^2 = 2k^2$ — and $q$ is even as well.',
      'But then the fraction $\\frac{p}{q}$ can be reduced by 2 — a contradiction. Hence $\\sqrt{2}$ is not a rational number.'
    ],
    note: 'The same argument shows that $\\sqrt{3}$, $\\sqrt{5}$ and in general $\\sqrt{n}$ are irrational whenever $n$ is not a perfect square.'
  });

  /* ================================================================ Special products */
  sec('fsm', 'Special products',
    'All these formulas are simply expanded brackets. Know them by heart and read them both ways: ' +
    'left to right to expand, right to left to factorise.');

  f('fsm-sqsum', 'Square of a sum', {
    ex: '$51^2 = (50 + 1)^2 = 2500 + 100 + 1 = 2601$',
    p: [
      '$(a + b)^2 = (a + b)(a + b)$.',
      'Expand the brackets — each term of the first by each term of the second: $$(a + b)(a + b) = a^2 + ab + ba + b^2 = a^2 + 2ab + b^2.$$',
      'Geometrically: a square with side $a + b$ consists of the squares $a^2$, $b^2$ and two equal rectangles $ab$.'
    ],
    err: '$(a + b)^2 \\ne a^2 + b^2$ — the doubled product $2ab$ gets lost.'
  });

  f('fsm-sqdiff', 'Square of a difference', {
    ex: '$49^2 = (50 - 1)^2 = 2500 - 100 + 1 = 2401$',
    p: [
      'Replace $b$ by $-b$ in the square of a sum: $$(a - b)^2 = (a + (-b))^2 = a^2 + 2a(-b) + (-b)^2 = a^2 - 2ab + b^2.$$'
    ]
  });

  f('fsm-diffsq', 'Difference of squares', {
    ex: '$99 \\cdot 101 = (100 - 1)(100 + 1) = 100^2 - 1 = 9999$',
    p: [
      'Expand the right-hand side: $(a - b)(a + b) = a^2 + ab - ba - b^2 = a^2 - b^2$.'
    ]
  });

  f('fsm-cubesum', 'Cube of a sum', {
    p: [
      '$(a + b)^3 = (a + b)^2 (a + b) = (a^2 + 2ab + b^2)(a + b)$.',
      'Expand and collect like terms: $$a^3 + a^2b + 2a^2b + 2ab^2 + ab^2 + b^3 = a^3 + 3a^2b + 3ab^2 + b^3.$$'
    ]
  });

  f('fsm-cubediff', 'Cube of a difference', {
    p: [
      'Replace $b$ by $-b$ in the cube of a sum: odd powers of $b$ change sign, even ones do not: $$(a - b)^3 = a^3 + 3a^2(-b) + 3a(-b)^2 + (-b)^3 = a^3 - 3a^2b + 3ab^2 - b^3.$$'
    ]
  });

  f('fsm-sumcubes', 'Sum of cubes', {
    ex: '$x^3 + 8 = (x + 2)(x^2 - 2x + 4)$',
    p: [
      'Expand the right-hand side: $$(a + b)(a^2 - ab + b^2) = a^3 - a^2b + ab^2 + a^2b - ab^2 + b^3.$$',
      'The middle terms cancel, leaving $a^3 + b^3$.'
    ],
    note: 'The second factor $a^2 - ab + b^2$ is positive for $(a, b) \\ne (0, 0)$ and does not factorise further over the reals.'
  });

  f('fsm-diffcubes', 'Difference of cubes', {
    ex: '$27 - x^3 = (3 - x)(9 + 3x + x^2)$',
    p: [
      'Expand the right-hand side: $$(a - b)(a^2 + ab + b^2) = a^3 + a^2b + ab^2 - a^2b - ab^2 - b^3 = a^3 - b^3.$$'
    ]
  });

  f('fsm-sq3', 'Square of a trinomial', {
    p: [
      'Group the terms: $(a + b + c)^2 = ((a + b) + c)^2 = (a + b)^2 + 2(a + b)c + c^2$.',
      'Use the square of a sum again: $a^2 + 2ab + b^2 + 2ac + 2bc + c^2$ — the same as the right-hand side.'
    ]
  });

  f('fsm-ndiff', 'Difference of $n$-th powers', {
    p: [
      'Multiply $a$ by the second bracket: $a^n + a^{n-1}b + \\ldots + a^2b^{n-2} + ab^{n-1}$.',
      'Multiply $-b$ by the second bracket: $-a^{n-1}b - a^{n-2}b^2 - \\ldots - ab^{n-1} - b^n$.',
      'Add them: all the intermediate terms cancel in pairs, leaving $a^n - b^n$.'
    ],
    note: 'Hence $a^n - b^n$ is divisible by $a - b$ for integers $a$, $b$. For example, $7^n - 1$ is divisible by 6. The same formula gives the derivative $(x^n)′ = nx^{n-1}$.'
  });

  f('fsm-sq-complete', 'Completing the square', {
    ex: '$x^2 - 6x + 11 = (x - 3)^2 + 2$, so the expression is always $\\ge 2$',
    p: [
      'By the square of a sum $\\left(x + \\frac{p}{2}\\right)^2 = x^2 + px + \\frac{p^2}{4}$.',
      'So $x^2 + px = \\left(x + \\frac{p}{2}\\right)^2 - \\frac{p^2}{4}$. Adding $q$ to both sides gives the formula.'
    ],
    note: 'This technique gives both the quadratic formula and the coordinates of the vertex of a parabola.'
  });

  /* ================================================================ Quadratic equations */
  sec('quad', 'Quadratic equations',
    'The equation $ax^2 + bx + c = 0$, $a \\ne 0$. Everything in this section comes from one technique — completing the square.');

  f('quad-roots', 'Quadratic formula', {
    w: '$D > 0$ — two roots, $D = 0$ — one root, $D < 0$ — no real roots.',
    ex: '$2x^2 - 5x + 2 = 0$: $D = 25 - 16 = 9$, $x = \\frac{5 \\pm 3}{4}$, i.e. $x = 2$ or $x = \\frac{1}{2}$.',
    p: [
      'Divide by $a \\ne 0$: $x^2 + \\frac{b}{a}x + \\frac{c}{a} = 0$.',
      'Complete the square: $$\\left(x + \\frac{b}{2a}\\right)^2 - \\frac{b^2}{4a^2} + \\frac{c}{a} = 0.$$',
      'Move terms and use a common denominator: $$\\left(x + \\frac{b}{2a}\\right)^2 = \\frac{b^2 - 4ac}{4a^2} = \\frac{D}{4a^2}.$$',
      'The left-hand side is a square, i.e. non-negative. If $D < 0$, equality is impossible: there are no roots.',
      'If $D \\ge 0$, take the square root: $x + \\frac{b}{2a} = \\pm\\frac{\\sqrt{D}}{2|a|}$. The $\\pm$ runs through both signs anyway, so the modulus can be dropped: $x + \\frac{b}{2a} = \\pm\\frac{\\sqrt{D}}{2a}$.',
      'Hence $x = \\frac{-b \\pm \\sqrt{D}}{2a}$. For $D = 0$ both signs give the same number.'
    ]
  });

  f('quad-even', 'Formula for even $b$', {
    ex: '$x^2 - 6x + 5 = 0$: $k = -3$, $x = 3 \\pm \\sqrt{9 - 5} = 3 \\pm 2$.',
    p: [
      'Substitute $b = 2k$: $D = 4k^2 - 4ac = 4(k^2 - ac)$, so $\\sqrt{D} = 2\\sqrt{k^2 - ac}$.',
      'Then $$x = \\frac{-2k \\pm 2\\sqrt{k^2 - ac}}{2a} = \\frac{-k \\pm \\sqrt{k^2 - ac}}{a}.$$'
    ],
    note: 'The expression $k^2 - ac = \\frac{D}{4}$ is often written as $D_1$. The numbers are smaller, so there are fewer arithmetic slips.'
  });

  f('quad-vieta', 'Vieta’s formulas', {
    w: 'For an equation with $D \\ge 0$ (for $D = 0$ the root counts twice). For the monic equation $x^2 + px + q = 0$: $x_1 + x_2 = -p$, $x_1 x_2 = q$.',
    p: [
      'By the quadratic formula $x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a}$.',
      'Sum: $x_1 + x_2 = \\frac{-b + \\sqrt{D} - b - \\sqrt{D}}{2a} = \\frac{-2b}{2a} = -\\frac{b}{a}$.',
      'Product — the numerator is a difference of squares: $$x_1 x_2 = \\frac{(-b)^2 - (\\sqrt{D})^2}{4a^2} = \\frac{b^2 - b^2 + 4ac}{4a^2} = \\frac{c}{a}.$$'
    ],
    err: 'Before using Vieta, check that the roots exist. For $x^2 + x + 5 = 0$ “the sum of the roots is $-1$” is a sum of roots that do not exist.'
  });

  f('quad-vieta-inv', 'Converse of Vieta’s theorem', {
    w: 'Numbers $x_1$, $x_2$ with this sum and product are the roots of $x^2 + px + q = 0$.',
    ex: 'The roots of $x^2 - 7x + 12 = 0$ are the numbers with sum 7 and product 12, i.e. 3 and 4.',
    p: [
      'Substitute $p = -(x_1 + x_2)$ and $q = x_1 x_2$: $$x^2 + px + q = x^2 - (x_1 + x_2)x + x_1x_2 = (x - x_1)(x - x_2).$$',
      'A product is zero if and only if $x = x_1$ or $x = x_2$.'
    ]
  });

  f('quad-factor', 'Factorising a quadratic', {
    w: '$x_1$, $x_2$ are the roots ($D \\ge 0$). If $D < 0$, the quadratic does not factorise into linear factors.',
    ex: '$2x^2 - 5x + 2 = 2(x - 2)\\left(x - \\frac{1}{2}\\right) = (x - 2)(2x - 1)$',
    p: [
      'Take out $a$: $ax^2 + bx + c = a\\left(x^2 + \\frac{b}{a}x + \\frac{c}{a}\\right)$.',
      'By Vieta $\\frac{b}{a} = -(x_1 + x_2)$, $\\frac{c}{a} = x_1 x_2$, so the bracket is $x^2 - (x_1 + x_2)x + x_1x_2 = (x - x_1)(x - x_2)$.'
    ]
  });

  f('quad-abc', 'If $a + b + c = 0$', {
    ex: '$5x^2 - 8x + 3 = 0$: $5 - 8 + 3 = 0$, so $x = 1$ and $x = \\frac{3}{5}$.',
    p: [
      'Substitute $x = 1$: $a \\cdot 1^2 + b \\cdot 1 + c = a + b + c = 0$ — so $1$ is a root.',
      'By Vieta $x_1 x_2 = \\frac{c}{a}$, so the other root is $\\frac{c}{a}$.',
      'Likewise, if $a - b + c = 0$, then $x = -1$ is a root and the other root is $-\\frac{c}{a}$.'
    ]
  });

  f('quad-incomplete', 'Incomplete quadratic equations', {
    f: 'ax^2 + bx = 0 \\Rightarrow x = 0 \\text{ or } x = -\\frac{b}{a}; \\quad ax^2 + c = 0 \\Rightarrow x^2 = -\\frac{c}{a}',
    p: [
      'When $c = 0$: $x(ax + b) = 0$. A product is zero when at least one factor is zero: $x = 0$ or $x = -\\frac{b}{a}$.',
      'When $b = 0$: $x^2 = -\\frac{c}{a}$. If $-\\frac{c}{a} > 0$, the roots are $\\pm\\sqrt{-\\frac{c}{a}}$; if $-\\frac{c}{a} < 0$, there are no roots.'
    ],
    err: 'Dividing $ax^2 + bx = 0$ by $x$ loses the root $x = 0$.'
  });

  f('quad-vertex', 'Vertex of a parabola', {
    w: 'For $y = ax^2 + bx + c$, $a \\ne 0$.',
    ex: '$y = x^2 - 4x + 1$: $x_0 = 2$, $y_0 = -3$ — the least value of the function.',
    p: [
      'Complete the square: $$ax^2 + bx + c = a\\left(x + \\frac{b}{2a}\\right)^2 - \\frac{b^2 - 4ac}{4a}.$$',
      'The first term is zero at $x = -\\frac{b}{2a}$ and has the sign of $a$ at every other point.',
      'So exactly at this point the function takes its least (for $a > 0$) or greatest (for $a < 0$) value $-\\frac{D}{4a}$.',
      'The values at $x_0 + t$ and $x_0 - t$ are equal — the graph is symmetric about the line $x = x_0$.'
    ]
  });

  /* ================================================================ Modulus and inequalities */
  sec('abs', 'Absolute value and inequalities',
    'Absolute value is distance: $|a|$ — from the point $a$ to zero, $|a - b|$ — between the points $a$ and $b$. ' +
    'The classical inequalities at the end of the section are proved by one technique: reduce the difference to a square.');

  f('abs-def', 'Absolute value', {
    f: '|a| = \\begin{cases} a, \\; a \\ge 0 \\\\ -a, \\; a < 0 \\end{cases}',
    note: 'This is a definition. Hence $|a| \\ge 0$, $|-a| = |a|$, $|a|^2 = a^2$. Geometrically $|a - b|$ is the distance between the points $a$ and $b$ on the number line.'
  });

  f('abs-mul', 'Absolute value of a product and a quotient', {
    p: [
      'Both sides are non-negative, so it is enough to compare their squares.',
      '$|ab|^2 = (ab)^2 = a^2b^2$ and $(|a| \\cdot |b|)^2 = |a|^2 |b|^2 = a^2b^2$ — equal.',
      'Non-negative numbers with equal squares are equal. The same works for a quotient.'
    ],
    err: 'In general $|a + b| \\ne |a| + |b|$: $|3 + (-5)| = 2$, but $|3| + |-5| = 8$.'
  });

  f('abs-ineq', 'Absolute value inequalities', {
    f: '|x| < a \\iff -a < x < a; \\quad |x| > a \\iff x < -a \\text{ or } x > a',
    w: '$a > 0$. For $|x - c| < a$ the same holds: $c - a < x < c + a$.',
    p: [
      'If $x \\ge 0$, then $|x| = x$, and the condition $|x| < a$ means $x < a$.',
      'If $x < 0$, then $|x| = -x$, and the condition means $-x < a$, i.e. $x > -a$.',
      'Combining both cases gives $-a < x < a$. The second equivalence is the negation of the first (taking into account $|x| = a$ at $x = \\pm a$).',
      'Geometrically: the points less than $a$ away from zero fill the interval $(-a; a)$.'
    ]
  });

  f('abs-tri', 'Triangle inequality', {
    w: 'Equality holds when $a$ and $b$ have the same sign (or one of them is zero). Corollary: $\\big||a| - |b|\\big| \\le |a - b|$.',
    p: [
      'Both sides are non-negative — compare the squares.',
      '$|a + b|^2 = a^2 + 2ab + b^2$, and $(|a| + |b|)^2 = a^2 + 2|a||b| + b^2$.',
      'Since $ab \\le |ab| = |a||b|$, the left-hand side is not greater than the right. Equality holds only when $ab = |ab|$, i.e. $ab \\ge 0$.'
    ]
  });

  f('ineq-amgm', 'AM–GM inequality', {
    w: '$a, b \\ge 0$. Equality only for $a = b$.',
    ex: 'Among rectangles with perimeter $P$ the square has the largest area: $ab \\le \\left(\\frac{a + b}{2}\\right)^2 = \\frac{P^2}{16}$.',
    p: [
      'Consider the difference: $$\\frac{a + b}{2} - \\sqrt{ab} = \\frac{a - 2\\sqrt{ab} + b}{2} = \\frac{(\\sqrt{a} - \\sqrt{b})^2}{2}.$$',
      'A square is non-negative, so the difference is $\\ge 0$. It is zero only when $\\sqrt{a} = \\sqrt{b}$, i.e. $a = b$.'
    ]
  });

  f('ineq-recip', 'Sum of reciprocals', {
    w: '$a > 0$; equality only for $a = 1$. For $a < 0$: $a + \\frac{1}{a} \\le -2$.',
    p: [
      'By AM–GM for the numbers $a$ and $\\frac{1}{a}$: $\\frac{1}{2}\\left(a + \\frac{1}{a}\\right) \\ge \\sqrt{a \\cdot \\frac{1}{a}} = 1$.',
      'Or directly: $a + \\frac{1}{a} - 2 = \\frac{a^2 - 2a + 1}{a} = \\frac{(a - 1)^2}{a} \\ge 0$ for $a > 0$.'
    ]
  });

  f('ineq-qm', 'Quadratic mean and arithmetic mean', {
    w: 'For any real $a$, $b$; equality for $a = b \\ge 0$.',
    p: [
      'If $a + b < 0$, the inequality is obvious: the left-hand side is non-negative.',
      'Otherwise both sides are non-negative, and it is enough to compare the squares: $$\\frac{a^2 + b^2}{2} - \\frac{(a + b)^2}{4} = \\frac{2a^2 + 2b^2 - a^2 - 2ab - b^2}{4} = \\frac{(a - b)^2}{4} \\ge 0.$$'
    ],
    note: 'For $a, b > 0$ there is a whole chain: $\\frac{2ab}{a + b} \\le \\sqrt{ab} \\le \\frac{a + b}{2} \\le \\sqrt{\\frac{a^2 + b^2}{2}}$.'
  });

  /* ================================================================ Sequences */
  sec('prog', 'Sequences and series',
    'In an arithmetic sequence you add the same number $d$ each time, in a geometric one you multiply by the same number $q$.');

  f('ap-n', '$n$-th term of an arithmetic sequence', {
    p: [
      'By definition each term is $d$ more than the previous one: $a_2 = a_1 + d$, $a_3 = a_1 + 2d$, …',
      'From $a_1$ to $a_n$ there are exactly $n - 1$ steps, and each adds $d$. So $a_n = a_1 + (n - 1)d$ (rigorously — by induction on $n$).'
    ]
  });

  f('ap-mid', 'Property of an arithmetic sequence', {
    w: '$n \\ge 2$. Conversely: if every term except the end ones is the arithmetic mean of its neighbours, the sequence is arithmetic.',
    p: [
      '$a_{n-1} = a_n - d$ and $a_{n+1} = a_n + d$.',
      'So $a_{n-1} + a_{n+1} = 2a_n$.'
    ]
  });

  f('ap-sum', 'Sum of the first $n$ terms of an arithmetic sequence', {
    ex: '$1 + 2 + \\ldots + 100 = \\frac{1 + 100}{2} \\cdot 100 = 5050$',
    p: [
      'Write the sum twice — in direct and in reverse order: $$S_n = a_1 + a_2 + \\ldots + a_n, \\qquad S_n = a_n + a_{n-1} + \\ldots + a_1.$$',
      'Add column by column. In each column $a_k + a_{n+1-k} = (a_1 + (k-1)d) + (a_1 + (n-k)d) = 2a_1 + (n-1)d = a_1 + a_n$ — the same sum.',
      'There are $n$ columns, so $2S_n = n(a_1 + a_n)$, whence $S_n = \\frac{a_1 + a_n}{2} \\cdot n$.',
      'Substituting $a_n = a_1 + (n - 1)d$ gives the second form.'
    ]
  });

  f('gp-n', '$n$-th term of a geometric sequence', {
    w: '$b_1 \\ne 0$, $q \\ne 0$.',
    p: [
      'Each term equals the previous one multiplied by $q$: $b_2 = b_1q$, $b_3 = b_1q^2$, …',
      'From $b_1$ to $b_n$ there are $n - 1$ multiplications by $q$, so $b_n = b_1q^{n-1}$.'
    ]
  });

  f('gp-mid', 'Property of a geometric sequence', {
    w: '$n \\ge 2$. For positive terms $b_n = \\sqrt{b_{n-1} b_{n+1}}$ — the geometric mean of its neighbours; hence the name.',
    p: [
      '$b_{n-1} = \\frac{b_n}{q}$ and $b_{n+1} = b_n q$.',
      'Their product is $\\frac{b_n}{q} \\cdot b_n q = b_n^2$.'
    ]
  });

  f('gp-sum', 'Sum of the first $n$ terms of a geometric sequence', {
    w: '$q \\ne 1$. For $q = 1$ all terms are equal and $S_n = nb_1$.',
    ex: '$1 + 2 + 4 + \\ldots + 2^9 = \\frac{2^{10} - 1}{2 - 1} = 1023$',
    p: [
      '$S_n = b_1 + b_1q + b_1q^2 + \\ldots + b_1q^{n-1}$.',
      'Multiply by $q$: $qS_n = b_1q + b_1q^2 + \\ldots + b_1q^{n-1} + b_1q^n$.',
      'Subtract the first equality from the second — all terms except the end ones cancel: $qS_n - S_n = b_1q^n - b_1$.',
      'So $S_n(q - 1) = b_1(q^n - 1)$, and for $q \\ne 1$ we divide by $q - 1$.'
    ]
  });

  f('gp-inf', 'Sum to infinity of a geometric series', {
    w: '$|q| < 1$.',
    ex: '$0.(3) = 0.3 + 0.03 + 0.003 + \\ldots = \\frac{0.3}{1 - 0.1} = \\frac{1}{3}$',
    p: [
      'Rewrite the sum of the first $n$ terms: $S_n = \\frac{b_1(1 - q^n)}{1 - q} = \\frac{b_1}{1 - q} - \\frac{b_1}{1 - q} \\cdot q^n$.',
      'For $|q| < 1$ the powers $q^n$ tend to zero as $n \\to \\infty$.',
      'So $S_n \\to \\frac{b_1}{1 - q}$ — this number is called the sum of the infinite series.'
    ]
  });

  f('sum-squares', 'Sum of squares', {
    p: [
      'Base case: for $n = 1$ the left-hand side is $1$, the right-hand side is $\\frac{1 \\cdot 2 \\cdot 3}{6} = 1$.',
      'Inductive step: let the formula hold for $n$. Then $$S_{n+1} = \\frac{n(n + 1)(2n + 1)}{6} + (n + 1)^2 = \\frac{(n + 1)(2n^2 + 7n + 6)}{6}.$$',
      'Since $2n^2 + 7n + 6 = (n + 2)(2n + 3)$, we get $S_{n+1} = \\frac{(n + 1)(n + 2)(2n + 3)}{6}$ — the formula for $n + 1$.'
    ]
  });

  f('sum-cubes', 'Sum of cubes', {
    note: 'In other words, the sum of the cubes equals the square of the sum: $1^3 + \\ldots + n^3 = (1 + \\ldots + n)^2$.',
    p: [
      'Base case: for $n = 1$ both sides equal $1$.',
      'Inductive step: $$S_{n+1} = \\frac{n^2(n + 1)^2}{4} + (n + 1)^3 = \\frac{(n + 1)^2(n^2 + 4n + 4)}{4} = \\frac{(n + 1)^2(n + 2)^2}{4}.$$',
      'This is the formula for $n + 1$.'
    ]
  });

  /* ================================================================ Logarithms */
  sec('log', 'Logarithms',
    'A logarithm is an exponent. So every property of logarithms is a property of powers translated into the language of logarithms.');

  f('log-def', 'Definition of a logarithm', {
    w: '$a > 0$, $a \\ne 1$, $b > 0$. Hence $\\log_a 1 = 0$, $\\log_a a = 1$.',
    p: [
      'If $a < 0$, the powers $a^c$ with fractional $c$ are undefined — most numbers would have no logarithm.',
      'If $a = 1$, then $1^c = 1$ for all $c$: the equation $1^c = b$ has either no solutions or infinitely many.',
      'An exponential function with base $a > 0$ takes only positive values, so a logarithm exists only for $b > 0$.'
    ]
  });

  f('log-identity', 'Inverse property of logarithms', {
    w: '$a > 0$, $a \\ne 1$, $b > 0$.',
    ex: '$5^{\\log_5 7} = 7$, $2^{3 + \\log_2 5} = 8 \\cdot 5 = 40$',
    p: [
      'By definition $\\log_a b$ is the exponent to which $a$ must be raised to get $b$.',
      'Raising $a$ to that exponent gives exactly $b$.'
    ]
  });

  f('log-prod', 'Logarithm of a product', {
    w: '$x > 0$, $y > 0$.',
    p: [
      'Let $u = \\log_a x$ and $v = \\log_a y$; then $x = a^u$, $y = a^v$.',
      'So $xy = a^u \\cdot a^v = a^{u + v}$.',
      'By the definition of a logarithm $\\log_a (xy) = u + v$.'
    ],
    err: '$\\log_a (x + y) \\ne \\log_a x + \\log_a y$. And if $x$, $y$ may be negative: $\\log_a (xy) = \\log_a |x| + \\log_a |y|$ — otherwise solutions get lost.'
  });

  f('log-quot', 'Logarithm of a quotient', {
    w: '$x > 0$, $y > 0$.',
    p: [
      'Let $x = a^u$, $y = a^v$. Then $\\frac{x}{y} = a^{u - v}$.',
      'By definition $\\log_a \\frac{x}{y} = u - v = \\log_a x - \\log_a y$.'
    ]
  });

  f('log-pow', 'Logarithm of a power', {
    w: '$x > 0$, $p$ is any real number.',
    ex: '$\\log_2 \\sqrt{8} = \\frac{1}{2} \\log_2 8 = \\frac{3}{2}$',
    p: [
      'Let $u = \\log_a x$, i.e. $x = a^u$.',
      'Then $x^p = (a^u)^p = a^{pu}$, and by definition $\\log_a x^p = pu = p\\log_a x$.'
    ],
    err: 'For even $p$ and $x$ of any sign the correct form is $\\log_a x^2 = 2\\log_a |x|$. Writing $2\\log_a x$ narrows the domain — roots get lost.'
  });

  f('log-change', 'Change of base', {
    w: '$a, c > 0$; $a, c \\ne 1$; $b > 0$.',
    ex: '$\\log_8 32 = \\frac{\\log_2 32}{\\log_2 8} = \\frac{5}{3}$',
    p: [
      'Let $\\log_a b = t$, i.e. $a^t = b$.',
      'Take logarithms to base $c$ of both sides: $\\log_c a^t = \\log_c b$, i.e. $t\\log_c a = \\log_c b$.',
      '$\\log_c a \\ne 0$ because $a \\ne 1$. So $t = \\frac{\\log_c b}{\\log_c a}$.'
    ]
  });

  f('log-swap', 'Swapping base and argument', {
    w: '$a, b > 0$; $a, b \\ne 1$.',
    p: [
      'Change to base $b$: $\\log_a b = \\frac{\\log_b b}{\\log_b a} = \\frac{1}{\\log_b a}$.'
    ]
  });

  f('log-base-pow', 'Power in the base', {
    w: '$k \\ne 0$. Together with the power rule: $\\log_{a^k} x^m = \\frac{m}{k} \\log_a x$.',
    ex: '$\\log_9 27 = \\log_{3^2} 3^3 = \\frac{3}{2}$',
    p: [
      'Change to base $a$: $\\log_{a^k} x = \\frac{\\log_a x}{\\log_a a^k} = \\frac{\\log_a x}{k}$.'
    ]
  });

  f('log-exch', 'Swapping in the exponent', {
    w: '$a, c > 0$, $b > 0$, $b \\ne 1$.',
    ex: '$3^{\\log_2 5} = 5^{\\log_2 3}$',
    p: [
      'Take logarithms to base $b$ of both sides.',
      'The left-hand side gives $\\log_b c \\cdot \\log_b a$, the right-hand side $\\log_b a \\cdot \\log_b c$: the same.',
      'A logarithmic function takes each value only once, so the numbers themselves are equal.'
    ]
  });

  f('log-mono', 'Comparing logarithms', {
    p: [
      'For $a > 1$ the function $a^t$ is increasing: a larger exponent gives a larger value. So its inverse $\\log_a x$ is increasing too.',
      'For $0 < a < 1$ the function $a^t$ is decreasing — and so is $\\log_a x$, which flips the inequality sign.'
    ],
    err: 'When solving $\\log_{0.5} x > 1$, people forget to flip the sign. Correct: $0 < x < 0.5$.'
  });

  /* ================================================================ Percentages */
  sec('pct', 'Percentages and proportions');

  f('prop-main', 'Cross-multiplication', {
    w: '$b \\ne 0$, $d \\ne 0$.',
    p: [
      'Multiply both sides of the proportion by $bd \\ne 0$: $\\frac{a}{b} \\cdot bd = \\frac{c}{d} \\cdot bd$, i.e. $ad = bc$.',
      'Conversely, dividing $ad = bc$ by $bd$ brings back the proportion.'
    ]
  });

  f('pct-part', 'Percentage of a number and a number from its percentage', {
    f: 'p\\% \\text{ of } a = \\frac{ap}{100}; \\qquad a = \\frac{b \\cdot 100}{p}, \\text{ if } p\\% \\text{ of } a \\text{ equals } b',
    p: [
      'One percent is one hundredth: $1\\% \\text{ of } a = \\frac{a}{100}$. So $p\\%$ is $\\frac{a}{100} \\cdot p$.',
      'If $\\frac{ap}{100} = b$, multiplying by $100$ and dividing by $p$ gives $a = \\frac{100b}{p}$.'
    ]
  });

  f('pct-compound', 'Compound interest', {
    w: '$S_0$ is the initial amount, $p\\%$ is the rate per period, $n$ is the number of periods.',
    ex: 'UAH 10,000 at 10% a year for 3 years: $10\\,000 \\cdot 1.1^3 = 13\\,310$ UAH.',
    p: [
      'Over one period the amount grows by $p\\%$, i.e. is multiplied by $1 + \\frac{p}{100}$.',
      'Interest is charged each time on the already increased amount, so over $n$ periods the factor is applied $n$ times. The amounts form a geometric sequence.'
    ],
    err: 'A 20% price cut followed by a 20% rise does not return the original price: $0.8 \\cdot 1.2 = 0.96$ — the price is 4% lower.'
  });
})();
