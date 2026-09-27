/* База формул англійською: тригонометрія. Див. formulas-en-algebra.js.
   tg/ctg у формулах сторінка сама показує як tan/cot. */

(function () {
  'use strict';

  var E = window.FORMULAS_EN = window.FORMULAS_EN || { sections: {}, items: {} };
  function sec(id, title, note) { E.sections[id] = { title: title, note: note || '' }; }
  function f(id, t, o) { o = o || {}; o.t = t; E.items[id] = o; }

  /* ================================================================ Basic identities */
  sec('trig-base', 'Basic identities',
    'Sine and cosine are the coordinates of a point on the unit circle. The Pythagorean identity, parity and periodicity all follow from this definition.');

  f('trig-def', 'Sine, cosine, tangent', {
    w: '$(x; y)$ is the point of the unit circle to which the point $(1; 0)$ moves under a rotation about the origin through the angle $\\alpha$.',
    note: 'This is a definition. For an acute angle it agrees with the school “opposite side over hypotenuse”: here the hypotenuse equals 1.'
  });

  f('trig-pyth', 'Pythagorean identity', {
    ex: 'If $\\sin\\alpha = \\frac{3}{5}$ and $\\alpha$ is in the second quadrant, then $\\cos\\alpha = -\\sqrt{1 - \\frac{9}{25}} = -\\frac{4}{5}$.',
    p: [
      'The point $(\\cos\\alpha; \\sin\\alpha)$ lies on the unit circle, whose equation is $x^2 + y^2 = 1$.',
      'Substituting the coordinates of the point gives $\\cos^2\\alpha + \\sin^2\\alpha = 1$.'
    ],
    err: 'When taking the square root, the sign is forgotten: $\\cos\\alpha = \\pm\\sqrt{1 - \\sin^2\\alpha}$, and the quadrant decides the sign.'
  });

  f('trig-tgctg', 'Tangent times cotangent', {
    w: '$\\alpha \\ne \\frac{\\pi k}{2}$ — otherwise one of the factors does not exist.',
    p: [
      '$\\tg\\alpha \\cdot \\ctg\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha} \\cdot \\frac{\\cos\\alpha}{\\sin\\alpha} = 1$.'
    ]
  });

  f('trig-1tg', 'Tangent and cosine', {
    w: 'The first holds for $\\cos\\alpha \\ne 0$, the second for $\\sin\\alpha \\ne 0$.',
    ex: 'If $\\tg\\alpha = 2$, then $\\cos^2\\alpha = \\frac{1}{1 + 4} = \\frac{1}{5}$.',
    p: [
      'Divide the identity $\\sin^2\\alpha + \\cos^2\\alpha = 1$ by $\\cos^2\\alpha$: $\\tg^2\\alpha + 1 = \\frac{1}{\\cos^2\\alpha}$.',
      'Dividing by $\\sin^2\\alpha$ gives the second one: $1 + \\ctg^2\\alpha = \\frac{1}{\\sin^2\\alpha}$.'
    ]
  });

  f('trig-values', 'Exact values for 30°, 45°, 60°', {
    w: 'Tangents: $\\tg 30^\\circ = \\frac{\\sqrt{3}}{3}$, $\\tg 45^\\circ = 1$, $\\tg 60^\\circ = \\sqrt{3}$.',
    p: [
      'Take an equilateral triangle with side 2. An altitude splits it into two right triangles with angles $30^\\circ$ and $60^\\circ$, hypotenuse 2 and shorter leg 1.',
      'By Pythagoras the other leg is $\\sqrt{4 - 1} = \\sqrt{3}$.',
      'Hence $\\sin 30^\\circ = \\frac{1}{2}$, $\\sin 60^\\circ = \\frac{\\sqrt{3}}{2}$, $\\cos 30^\\circ = \\frac{\\sqrt{3}}{2}$, $\\cos 60^\\circ = \\frac{1}{2}$.',
      'In an isosceles right triangle with legs 1 the hypotenuse is $\\sqrt{2}$, so $\\sin 45^\\circ = \\cos 45^\\circ = \\frac{1}{\\sqrt{2}} = \\frac{\\sqrt{2}}{2}$.'
    ]
  });

  f('trig-parity', 'Even and odd identities', {
    p: [
      'A rotation through $-\\alpha$ is the mirror image of a rotation through $\\alpha$ in the $x$-axis.',
      'Under this reflection the $x$-coordinate stays the same and the $y$-coordinate changes sign: $\\cos(-\\alpha) = \\cos\\alpha$, $\\sin(-\\alpha) = -\\sin\\alpha$.',
      'Tangent and cotangent are quotients of an odd and an even function, so they are odd.'
    ]
  });

  f('trig-period', 'Periodicity', {
    w: '$k$ is any integer. The smallest positive period of sine and cosine is $2\\pi$, of tangent and cotangent — $\\pi$.',
    p: [
      'A rotation through $2\\pi$ is a full turn: the point returns to its place, so sine and cosine do not change.',
      'A rotation through $\\pi$ takes the point $(x; y)$ to the diametrically opposite point $(-x; -y)$.',
      'Both coordinates change sign, but their quotient does not: $\\tg(\\alpha + \\pi) = \\frac{-y}{-x} = \\frac{y}{x} = \\tg\\alpha$.'
    ]
  });

  /* ================================================================ Addition formulas */
  sec('trig-add', 'Addition formulas',
    'The key formula of the section is the cosine of a difference. All the other trigonometric formulas are derived from it.');

  f('cos-diff', 'Cosine of a difference', {
    p: [
      'The points of the unit circle $A = (\\cos\\alpha; \\sin\\alpha)$ and $B = (\\cos\\beta; \\sin\\beta)$ correspond to rotations through $\\alpha$ and $\\beta$.',
      'The vectors $\\vec{OA}$ and $\\vec{OB}$ have length 1. The angle $\\varphi$ between them differs from $\\alpha - \\beta$ only by sign and whole turns, so $\\cos\\varphi = \\cos(\\alpha - \\beta)$ (cosine is even and has period $2\\pi$).',
      'The dot product in coordinates: $\\vec{OA} \\cdot \\vec{OB} = \\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta$.',
      'The same product via lengths and angle: $|\\vec{OA}| \\cdot |\\vec{OB}| \\cdot \\cos\\varphi = \\cos(\\alpha - \\beta)$.',
      'Equating the two expressions for the same number gives the formula.'
    ]
  });

  f('cos-sum', 'Cosine of a sum', {
    ex: '$\\cos 75^\\circ = \\cos 45^\\circ\\cos 30^\\circ - \\sin 45^\\circ\\sin 30^\\circ = \\frac{\\sqrt{6} - \\sqrt{2}}{4}$',
    p: [
      'Write $\\alpha + \\beta = \\alpha - (-\\beta)$ and apply the cosine of a difference: $$\\cos(\\alpha + \\beta) = \\cos\\alpha\\cos(-\\beta) + \\sin\\alpha\\sin(-\\beta).$$',
      'Cosine is even, sine is odd: $\\cos(-\\beta) = \\cos\\beta$, $\\sin(-\\beta) = -\\sin\\beta$. Hence the formula.'
    ]
  });

  f('trig-cofunc', 'Cofunction identities', {
    w: 'In a right triangle, the sine of one acute angle equals the cosine of the other.',
    p: [
      'By the cosine of a difference: $\\cos\\left(\\frac{\\pi}{2} - \\alpha\\right) = \\cos\\frac{\\pi}{2}\\cos\\alpha + \\sin\\frac{\\pi}{2}\\sin\\alpha = 0 \\cdot \\cos\\alpha + 1 \\cdot \\sin\\alpha = \\sin\\alpha$.',
      'Substitute $\\frac{\\pi}{2} - \\alpha$ for $\\alpha$ in this equality: $\\cos\\alpha = \\sin\\left(\\frac{\\pi}{2} - \\alpha\\right)$.'
    ]
  });

  f('sin-sum', 'Sine of a sum and a difference', {
    p: [
      'Switch to cosine: $\\sin(\\alpha + \\beta) = \\cos\\left(\\frac{\\pi}{2} - \\alpha - \\beta\\right) = \\cos\\left(\\left(\\frac{\\pi}{2} - \\alpha\\right) - \\beta\\right)$.',
      'By the cosine of a difference: $$\\cos\\left(\\frac{\\pi}{2} - \\alpha\\right)\\cos\\beta + \\sin\\left(\\frac{\\pi}{2} - \\alpha\\right)\\sin\\beta = \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta.$$',
      'For the difference replace $\\beta$ by $-\\beta$: $\\sin(\\alpha - \\beta) = \\sin\\alpha\\cos\\beta - \\cos\\alpha\\sin\\beta$.'
    ]
  });

  f('tg-sum', 'Tangent of a sum and a difference', {
    w: '$\\cos\\alpha$, $\\cos\\beta$, $\\cos(\\alpha \\pm \\beta)$ are non-zero.',
    p: [
      '$$\\tg(\\alpha + \\beta) = \\frac{\\sin(\\alpha + \\beta)}{\\cos(\\alpha + \\beta)} = \\frac{\\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta}{\\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta}.$$',
      'Divide the numerator and the denominator by $\\cos\\alpha\\cos\\beta \\ne 0$: we get $\\frac{\\tg\\alpha + \\tg\\beta}{1 - \\tg\\alpha\\tg\\beta}$.',
      'For the difference replace $\\beta$ by $-\\beta$ (tangent is odd).'
    ]
  });

  /* ================================================================ Double and half angle */
  sec('trig-double', 'Double and half angle',
    'Double-angle formulas are the addition formulas with $\\beta = \\alpha$. Read right to left, they give power reduction and the half-angle formulas.');

  f('sin-2', 'Sine of a double angle', {
    ex: '$\\sin 15^\\circ \\cos 15^\\circ = \\frac{1}{2}\\sin 30^\\circ = \\frac{1}{4}$',
    p: [
      '$\\sin 2\\alpha = \\sin(\\alpha + \\alpha) = \\sin\\alpha\\cos\\alpha + \\cos\\alpha\\sin\\alpha = 2\\sin\\alpha\\cos\\alpha$.'
    ],
    err: '$\\sin 2\\alpha \\ne 2\\sin\\alpha$: $\\sin 60^\\circ = \\frac{\\sqrt{3}}{2}$, while $2\\sin 30^\\circ = 1$.'
  });

  f('cos-2', 'Cosine of a double angle', {
    p: [
      '$\\cos 2\\alpha = \\cos(\\alpha + \\alpha) = \\cos\\alpha\\cos\\alpha - \\sin\\alpha\\sin\\alpha = \\cos^2\\alpha - \\sin^2\\alpha$.',
      'Replacing $\\sin^2\\alpha = 1 - \\cos^2\\alpha$ gives $2\\cos^2\\alpha - 1$.',
      'Replacing $\\cos^2\\alpha = 1 - \\sin^2\\alpha$ gives $1 - 2\\sin^2\\alpha$.'
    ]
  });

  f('tg-2', 'Tangent of a double angle', {
    w: '$\\tg\\alpha \\ne \\pm 1$, $\\cos\\alpha \\ne 0$.',
    p: [
      'Put $\\beta = \\alpha$ in the tangent of a sum: $\\tg 2\\alpha = \\frac{\\tg\\alpha + \\tg\\alpha}{1 - \\tg\\alpha \\cdot \\tg\\alpha}$.'
    ]
  });

  f('trig-lower', 'Power-reduction formulas', {
    ex: '$\\sin^2 15^\\circ = \\frac{1 - \\cos 30^\\circ}{2} = \\frac{2 - \\sqrt{3}}{4}$',
    p: [
      'From $\\cos 2\\alpha = 2\\cos^2\\alpha - 1$ express $\\cos^2\\alpha = \\frac{1 + \\cos 2\\alpha}{2}$.',
      'From $\\cos 2\\alpha = 1 - 2\\sin^2\\alpha$ express $\\sin^2\\alpha = \\frac{1 - \\cos 2\\alpha}{2}$.'
    ],
    note: 'Useful for integrals: $\\int \\sin^2 x\\,dx = \\frac{x}{2} - \\frac{\\sin 2x}{4} + C$.'
  });

  f('trig-half', 'Half-angle formulas', {
    w: 'The sign in front of the root is chosen by the quadrant of $\\frac{\\alpha}{2}$. The tangent formulas need no sign.',
    p: [
      'Power reduction for the angle $\\frac{\\alpha}{2}$: $\\sin^2\\frac{\\alpha}{2} = \\frac{1 - \\cos\\alpha}{2}$, $\\cos^2\\frac{\\alpha}{2} = \\frac{1 + \\cos\\alpha}{2}$ — take square roots.',
      'For the tangent multiply the numerator and the denominator by $2\\cos\\frac{\\alpha}{2}$: $$\\tg\\frac{\\alpha}{2} = \\frac{2\\sin\\frac{\\alpha}{2}\\cos\\frac{\\alpha}{2}}{2\\cos^2\\frac{\\alpha}{2}} = \\frac{\\sin\\alpha}{1 + \\cos\\alpha}.$$',
      'Multiplying by $2\\sin\\frac{\\alpha}{2}$ instead gives $\\frac{2\\sin^2\\frac{\\alpha}{2}}{2\\sin\\frac{\\alpha}{2}\\cos\\frac{\\alpha}{2}} = \\frac{1 - \\cos\\alpha}{\\sin\\alpha}$.'
    ]
  });

  f('trig-triple', 'Triple-angle formulas', {
    p: [
      '$\\sin 3\\alpha = \\sin(2\\alpha + \\alpha) = \\sin 2\\alpha\\cos\\alpha + \\cos 2\\alpha\\sin\\alpha = 2\\sin\\alpha\\cos^2\\alpha + (1 - 2\\sin^2\\alpha)\\sin\\alpha$.',
      'Replace $\\cos^2\\alpha = 1 - \\sin^2\\alpha$: $2\\sin\\alpha - 2\\sin^3\\alpha + \\sin\\alpha - 2\\sin^3\\alpha = 3\\sin\\alpha - 4\\sin^3\\alpha$.',
      '$\\cos 3\\alpha = \\cos 2\\alpha\\cos\\alpha - \\sin 2\\alpha\\sin\\alpha = (2\\cos^2\\alpha - 1)\\cos\\alpha - 2\\sin^2\\alpha\\cos\\alpha$.',
      'Replace $\\sin^2\\alpha = 1 - \\cos^2\\alpha$: $2\\cos^3\\alpha - \\cos\\alpha - 2\\cos\\alpha + 2\\cos^3\\alpha = 4\\cos^3\\alpha - 3\\cos\\alpha$.'
    ]
  });

  f('trig-univ', 'Tangent half-angle substitution', {
    w: '$\\alpha \\ne \\pi + 2\\pi k$ — there $\\tg\\frac{\\alpha}{2}$ does not exist. When solving equations with this substitution, such points are checked separately.',
    p: [
      'By the double-angle formula and the Pythagorean identity (divide by $1$): $$\\sin\\alpha = \\frac{2\\sin\\frac{\\alpha}{2}\\cos\\frac{\\alpha}{2}}{\\sin^2\\frac{\\alpha}{2} + \\cos^2\\frac{\\alpha}{2}}.$$',
      'Divide the numerator and the denominator by $\\cos^2\\frac{\\alpha}{2} \\ne 0$: we get $\\frac{2t}{t^2 + 1}$.',
      'Likewise $\\cos\\alpha = \\frac{\\cos^2\\frac{\\alpha}{2} - \\sin^2\\frac{\\alpha}{2}}{\\cos^2\\frac{\\alpha}{2} + \\sin^2\\frac{\\alpha}{2}} = \\frac{1 - t^2}{1 + t^2}$.'
    ]
  });

  /* ================================================================ Sum and product */
  sec('trig-sum', 'Sum and product',
    'A sum of sines or cosines turns into a product — and back. This is the main technique for trigonometric equations: a product is zero when one of its factors is zero.');

  f('sum-sin', 'Sum of sines', {
    p: [
      'Let $x = \\frac{\\alpha + \\beta}{2}$, $y = \\frac{\\alpha - \\beta}{2}$. Then $\\alpha = x + y$, $\\beta = x - y$.',
      'By the sine of a sum and a difference: $$\\sin(x + y) + \\sin(x - y) = (\\sin x\\cos y + \\cos x\\sin y) + (\\sin x\\cos y - \\cos x\\sin y) = 2\\sin x\\cos y.$$'
    ]
  });

  f('diff-sin', 'Difference of sines', {
    p: [
      'The same substitution $\\alpha = x + y$, $\\beta = x - y$: $$\\sin(x + y) - \\sin(x - y) = 2\\cos x\\sin y.$$'
    ]
  });

  f('sum-cos', 'Sum of cosines', {
    p: [
      'Substitute $\\alpha = x + y$, $\\beta = x - y$: $$\\cos(x + y) + \\cos(x - y) = (\\cos x\\cos y - \\sin x\\sin y) + (\\cos x\\cos y + \\sin x\\sin y) = 2\\cos x\\cos y.$$'
    ]
  });

  f('diff-cos', 'Difference of cosines', {
    p: [
      'Substitute $\\alpha = x + y$, $\\beta = x - y$: $$\\cos(x + y) - \\cos(x - y) = -2\\sin x\\sin y.$$'
    ],
    err: 'The minus in front of the product gets lost. Check: for $\\alpha = 0$, $\\beta = \\pi$ the left-hand side is $1 - (-1) = 2$, the right-hand side is $-2\\sin\\frac{\\pi}{2}\\sin\\left(-\\frac{\\pi}{2}\\right) = 2$.'
  });

  f('prod-sum', 'Product-to-sum formulas', {
    p: [
      'Add the formulas for the sine of a sum and of a difference: $\\sin(\\alpha + \\beta) + \\sin(\\alpha - \\beta) = 2\\sin\\alpha\\cos\\beta$.',
      'Add the cosine of a difference and the cosine of a sum: $\\cos(\\alpha - \\beta) + \\cos(\\alpha + \\beta) = 2\\cos\\alpha\\cos\\beta$.',
      'Subtract them: $\\cos(\\alpha - \\beta) - \\cos(\\alpha + \\beta) = 2\\sin\\alpha\\sin\\beta$. It remains to divide by 2.'
    ]
  });

  f('aux-angle', 'Auxiliary angle method', {
    w: '$\\cos\\varphi = \\frac{a}{\\sqrt{a^2 + b^2}}$, $\\sin\\varphi = \\frac{b}{\\sqrt{a^2 + b^2}}$; $a$ and $b$ are not both zero.',
    ex: '$\\sin x + \\sqrt{3}\\cos x = 2\\sin\\left(x + \\frac{\\pi}{3}\\right)$ — the greatest value of the expression is 2, the least is $-2$.',
    p: [
      'Take out $R = \\sqrt{a^2 + b^2}$: $a\\sin x + b\\cos x = R\\left(\\frac{a}{R}\\sin x + \\frac{b}{R}\\cos x\\right)$.',
      'The numbers $\\frac{a}{R}$ and $\\frac{b}{R}$ satisfy $\\left(\\frac{a}{R}\\right)^2 + \\left(\\frac{b}{R}\\right)^2 = 1$, i.e. the point with these coordinates lies on the unit circle. So there is an angle $\\varphi$ with $\\cos\\varphi = \\frac{a}{R}$, $\\sin\\varphi = \\frac{b}{R}$.',
      'Then the bracket is $\\sin x\\cos\\varphi + \\cos x\\sin\\varphi = \\sin(x + \\varphi)$.'
    ],
    note: 'Hence $-\\sqrt{a^2 + b^2} \\le a\\sin x + b\\cos x \\le \\sqrt{a^2 + b^2}$ — this is how the greatest and least values are found.'
  });

  /* ================================================================ Reduction formulas */
  sec('trig-red', 'Reduction formulas');

  f('reduction', 'Reduction formulas', {
    w: 'Rule. If the argument contains $\\frac{\\pi}{2}$ or $\\frac{3\\pi}{2}$, the function changes to its “cofunction” (sine ↔ cosine, tangent ↔ cotangent); if $\\pi$ or $2\\pi$, it stays. The sign is the one the original function has in the resulting quadrant, taking $\\alpha$ acute.',
    ex: '$\\cos 150^\\circ = \\cos(180^\\circ - 30^\\circ) = -\\cos 30^\\circ = -\\frac{\\sqrt{3}}{2}$; $\\tg\\left(\\frac{3\\pi}{2} - \\alpha\\right) = \\ctg\\alpha$.',
    p: [
      'Every reduction formula is a special case of the addition formulas. For example: $\\cos\\left(\\frac{\\pi}{2} + \\alpha\\right) = \\cos\\frac{\\pi}{2}\\cos\\alpha - \\sin\\frac{\\pi}{2}\\sin\\alpha = -\\sin\\alpha$.',
      '$\\sin(\\pi - \\alpha) = \\sin\\pi\\cos\\alpha - \\cos\\pi\\sin\\alpha = \\sin\\alpha$, and $\\cos(\\pi + \\alpha) = \\cos\\pi\\cos\\alpha - \\sin\\pi\\sin\\alpha = -\\cos\\alpha$.',
      'Since $\\sin\\frac{\\pi}{2} = 1$, $\\cos\\frac{\\pi}{2} = 0$, $\\sin\\pi = 0$, $\\cos\\pi = -1$, only one term of the addition formula survives. For $\\frac{\\pi}{2}$ it is the term with the other function — hence the “cofunction”.',
      'The sign also comes from $\\cos\\pi = -1$ and the like; the “quadrant” rule is just a way not to compute it: for acute $\\alpha$ the angle $\\pi + \\alpha$ lies in the third quadrant, where sine is negative, so $\\sin(\\pi + \\alpha) = -\\sin\\alpha$.'
    ]
  });

  /* ================================================================ Equations and inverse functions */
  sec('trig-eq', 'Equations and inverse functions',
    'An inverse trigonometric function returns one angle — from the interval where the function is monotonic. All solutions of an equation are obtained from it by symmetry and periodicity.');

  f('arc-def', 'Arcsine, arccosine, arctangent', {
    w: '$\\arcsin a$ is the angle from this interval whose sine equals $a$ ($|a| \\le 1$). Likewise for arccosine ($|a| \\le 1$) and arctangent (any $a$).',
    p: [
      'There are infinitely many angles with sine $a$. To make “the angle by its sine” unique, we take an interval where sine increases and takes every value from $-1$ to $1$ exactly once — $\\left[-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right]$.',
      'Cosine is not monotonic on this interval, so for it we take $[0; \\pi]$ — there it decreases from $1$ to $-1$.',
      'Tangent increases on $\\left(-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right)$ and takes all real values.'
    ]
  });

  f('eq-sin', 'The equation $\\sin x = a$', {
    w: '$|a| \\le 1$; for $|a| > 1$ there are no solutions. Special cases: $\\sin x = 0 \\iff x = \\pi k$; $\\sin x = \\pm 1 \\iff x = \\pm\\frac{\\pi}{2} + 2\\pi k$.',
    ex: '$\\sin x = \\frac{1}{2}$: $x = (-1)^k \\frac{\\pi}{6} + \\pi k$, i.e. $\\frac{\\pi}{6} + 2\\pi n$ and $\\frac{5\\pi}{6} + 2\\pi n$.',
    p: [
      'On $\\left[-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right]$ sine increases, so the equation has exactly one root there — $\\arcsin a$.',
      'On $\\left[\\frac{\\pi}{2}; \\frac{3\\pi}{2}\\right]$ sine decreases from $1$ to $-1$ — there is exactly one root there too: $\\pi - \\arcsin a$, since $\\sin(\\pi - t) = \\sin t$.',
      'Together these two intervals make a full period. Adding $2\\pi n$ gives all the solutions: $x = \\arcsin a + 2\\pi n$ and $x = \\pi - \\arcsin a + 2\\pi n$.',
      'Both families are one formula: even $k = 2n$ gives the first, odd $k = 2n + 1$ the second, since $-\\arcsin a + \\pi(2n + 1) = \\pi - \\arcsin a + 2\\pi n$.'
    ]
  });

  f('eq-cos', 'The equation $\\cos x = a$', {
    w: '$|a| \\le 1$. Special cases: $\\cos x = 0 \\iff x = \\frac{\\pi}{2} + \\pi k$; $\\cos x = 1 \\iff x = 2\\pi k$; $\\cos x = -1 \\iff x = \\pi + 2\\pi k$.',
    p: [
      'On $[0; \\pi]$ cosine decreases, so there is one root there — $\\arccos a$.',
      'Cosine is even, so on $[-\\pi; 0]$ the root is $-\\arccos a$.',
      'Together this is a full period; adding $2\\pi k$ gives all the solutions.'
    ]
  });

  f('eq-tg', 'The equation $\\tg x = a$', {
    w: 'For any $a$. Likewise $\\ctg x = a \\iff x = \\arcctg a + \\pi k$.',
    p: [
      'On $\\left(-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right)$ tangent increases and takes every value once — at the point $\\arctg a$.',
      'The period of tangent is $\\pi$, so all solutions are obtained by adding $\\pi k$.'
    ]
  });

  f('arc-neg', 'Inverse functions of a negative argument', {
    ex: '$\\arccos\\left(-\\frac{1}{2}\\right) = \\pi - \\frac{\\pi}{3} = \\frac{2\\pi}{3}$',
    p: [
      'The number $-\\arcsin a$ lies in $\\left[-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right]$, and its sine is $-\\sin(\\arcsin a) = -a$. By definition this is $\\arcsin(-a)$.',
      'The number $\\pi - \\arccos a$ lies in $[0; \\pi]$, and $\\cos(\\pi - \\arccos a) = -\\cos(\\arccos a) = -a$. So this is $\\arccos(-a)$.',
      'For arctangent — the same as for arcsine.'
    ],
    err: '$\\arccos(-a) \\ne -\\arccos a$: arccosine is never negative.'
  });

  f('arc-sum', 'Arcsine plus arccosine', {
    w: '$|a| \\le 1$. Likewise $\\arctg a + \\arcctg a = \\frac{\\pi}{2}$.',
    p: [
      'The number $\\frac{\\pi}{2} - \\arccos a$ lies in $\\left[-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right]$, since $\\arccos a \\in [0; \\pi]$.',
      'Its sine: $\\sin\\left(\\frac{\\pi}{2} - \\arccos a\\right) = \\cos(\\arccos a) = a$.',
      'By the definition of arcsine $\\arcsin a = \\frac{\\pi}{2} - \\arccos a$.'
    ]
  });
})();
