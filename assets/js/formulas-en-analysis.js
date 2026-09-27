/* База формул англійською: початки аналізу. Див. formulas-en-algebra.js.
   Штрих похідної — ′. */

(function () {
  'use strict';

  var E = window.FORMULAS_EN = window.FORMULAS_EN || { sections: {}, items: {} };
  function sec(id, title, note) { E.sections[id] = { title: title, note: note || '' }; }
  function f(id, t, o) { o = o || {}; o.t = t; E.items[id] = o; }

  /* ================================================================ Limits */
  sec('lim', 'Important limits',
    'Two limits the table of derivatives rests on: without the first you cannot derive the derivative of sine, without the second — the derivative of the exponential.');

  f('lim-sin', 'The fundamental trigonometric limit', {
    w: 'The angle $x$ is in radians. Hence $\\sin x \\approx x$ for small angles.',
    p: [
      'Let $0 < x < \\frac{\\pi}{2}$. On the unit circle with centre $O$ take the points $A = (1; 0)$ and $P$ such that $\\angle AOP = x$. The tangent to the circle at $A$ meets the ray $OP$ at $T$.',
      'Compare the areas: $S_{\\triangle OAP} = \\frac{1}{2}\\sin x$, the area of the sector $OAP$ is $\\frac{x}{2}$, $S_{\\triangle OAT} = \\frac{1}{2}\\tg x$.',
      'Triangle $OAP$ lies inside the sector, and the sector lies inside triangle $OAT$. Therefore $$\\sin x < x < \\tg x.$$',
      'Divide by $\\sin x > 0$: $1 < \\frac{x}{\\sin x} < \\frac{1}{\\cos x}$, i.e. $\\cos x < \\frac{\\sin x}{x} < 1$.',
      'As $x \\to 0$, cosine tends to $1$, so the fraction squeezed between $\\cos x$ and $1$ also tends to $1$.',
      'For negative $x$ the fraction is the same: $\\frac{\\sin(-x)}{-x} = \\frac{\\sin x}{x}$.'
    ]
  });

  f('lim-exp', 'The limit that defines $e$', {
    f: '\\lim_{x \\to 0} \\frac{e^x - 1}{x} = 1, \\qquad e = \\lim_{n \\to \\infty}\\left(1 + \\frac{1}{n}\\right)^n \\approx 2.718',
    p: [
      'The number $e$ is chosen exactly so: it is the base of the exponential function whose graph passes through $(0; 1)$ at $45^\\circ$ — the tangent there has slope $1$.',
      'The slope of the tangent at zero is $\\lim_{x \\to 0}\\frac{e^x - e^0}{x - 0} = \\lim_{x \\to 0}\\frac{e^x - 1}{x}$. So “equals $1$” is the property that defines $e$.',
      'The other definition, via $\\left(1 + \\frac{1}{n}\\right)^n$, gives the same number. This is proved in a university analysis course; at school it is enough to know that the two descriptions are equivalent.'
    ]
  });

  /* ================================================================ Derivatives */
  sec('deriv', 'Derivatives of elementary functions',
    'No line of the table of derivatives is an axiom: each is derived from the definition or from the previous lines.');

  f('der-def', 'Definition of the derivative', {
    w: 'If this limit exists, the function is called differentiable at $x_0$.',
    note: 'Geometric meaning: $f′(x_0)$ is the slope of the tangent to the graph at $x_0$. Physical meaning: if $s(t)$ is distance, then $s′(t)$ is the instantaneous speed.'
  });

  f('der-const', 'Derivative of a constant', {
    p: ['$f(x + h) - f(x) = C - C = 0$, so the fraction is zero for every $h \\ne 0$, and its limit is $0$.']
  });

  f('der-xn', 'Power rule', {
    w: 'Proved below for natural $n$. The formula holds for any real exponent (for $x > 0$), in particular $\\left(\\frac{1}{x}\\right)′ = -\\frac{1}{x^2}$, $(\\sqrt{x})′ = \\frac{1}{2\\sqrt{x}}$.',
    ex: '$(x^5)′ = 5x^4$, $\\left(\\frac{1}{x^3}\\right)′ = (x^{-3})′ = -3x^{-4}$',
    p: [
      'By the difference of $n$-th powers: $$(x + h)^n - x^n = h\\left((x + h)^{n-1} + (x + h)^{n-2}x + \\ldots + x^{n-1}\\right).$$',
      'Divide by $h$. The bracket has $n$ terms, and each tends to $x^{n-1}$ as $h \\to 0$.',
      'So the limit equals $nx^{n-1}$.'
    ]
  });

  f('der-sqrt', 'Derivative of the square root', {
    w: '$x > 0$. At zero there is no derivative: the tangent to the graph there is vertical.',
    p: [
      'Multiply the difference quotient by the conjugate: $$\\frac{\\sqrt{x + h} - \\sqrt{x}}{h} = \\frac{(x + h) - x}{h(\\sqrt{x + h} + \\sqrt{x})} = \\frac{1}{\\sqrt{x + h} + \\sqrt{x}}.$$',
      'As $h \\to 0$ the denominator tends to $2\\sqrt{x}$.'
    ]
  });

  f('der-inv', 'Derivative of $1/x$', {
    w: '$x \\ne 0$.',
    p: [
      '$$\\frac{1}{h}\\left(\\frac{1}{x + h} - \\frac{1}{x}\\right) = \\frac{x - (x + h)}{h\\,x(x + h)} = -\\frac{1}{x(x + h)}.$$',
      'As $h \\to 0$ this tends to $-\\frac{1}{x^2}$.'
    ]
  });

  f('der-sin', 'Derivative of sine', {
    p: [
      'By the difference of sines: $\\sin(x + h) - \\sin x = 2\\sin\\frac{h}{2}\\cos\\left(x + \\frac{h}{2}\\right)$.',
      'Divide by $h$: $$\\frac{\\sin(x + h) - \\sin x}{h} = \\frac{\\sin\\frac{h}{2}}{\\frac{h}{2}} \\cdot \\cos\\left(x + \\frac{h}{2}\\right).$$',
      'As $h \\to 0$ the first factor tends to $1$ (the fundamental trigonometric limit), the second — to $\\cos x$ (cosine is continuous).'
    ]
  });

  f('der-cos', 'Derivative of cosine', {
    p: [
      'By the difference of cosines: $\\cos(x + h) - \\cos x = -2\\sin\\left(x + \\frac{h}{2}\\right)\\sin\\frac{h}{2}$.',
      'Divide by $h$: $-\\sin\\left(x + \\frac{h}{2}\\right) \\cdot \\frac{\\sin\\frac{h}{2}}{\\frac{h}{2}} \\to -\\sin x \\cdot 1$.'
    ]
  });

  f('der-tg', 'Derivatives of tangent and cotangent', {
    w: 'Wherever the functions are defined: $\\cos x \\ne 0$, respectively $\\sin x \\ne 0$.',
    p: [
      'By the quotient rule: $$\\left(\\frac{\\sin x}{\\cos x}\\right)′ = \\frac{\\cos x \\cdot \\cos x - \\sin x \\cdot (-\\sin x)}{\\cos^2 x} = \\frac{\\cos^2 x + \\sin^2 x}{\\cos^2 x} = \\frac{1}{\\cos^2 x}.$$',
      'Likewise $\\left(\\frac{\\cos x}{\\sin x}\\right)′ = \\frac{-\\sin^2 x - \\cos^2 x}{\\sin^2 x} = -\\frac{1}{\\sin^2 x}$.'
    ]
  });

  f('der-exp', 'Derivative of the exponential', {
    p: [
      '$$\\frac{e^{x + h} - e^x}{h} = e^x \\cdot \\frac{e^h - 1}{h}.$$',
      'As $h \\to 0$ the second factor tends to $1$ — the very property that defines $e$.'
    ],
    note: 'The only functions equal to their own derivative are $Ce^x$. That is why the exponential appears in growth and decay problems.'
  });

  f('der-ax', 'Derivative of $a^x$', {
    w: '$a > 0$, $a \\ne 1$.',
    p: [
      'By the inverse property of logarithms $a = e^{\\ln a}$, so $a^x = e^{x\\ln a}$.',
      'By the chain rule: $\\left(e^{x\\ln a}\\right)′ = e^{x\\ln a} \\cdot \\ln a = a^x\\ln a$.'
    ]
  });

  f('der-ln', 'Derivative of the natural logarithm', {
    w: '$x > 0$. For $\\ln|x|$ the formula is the same for all $x \\ne 0$.',
    p: [
      'For $x > 0$ we have $e^{\\ln x} = x$. Differentiate both sides: the right-hand side gives $1$, the left-hand side is a composite function.',
      '$e^{\\ln x} \\cdot (\\ln x)′ = 1$, i.e. $x \\cdot (\\ln x)′ = 1$, whence $(\\ln x)′ = \\frac{1}{x}$.',
      '(That the logarithm is differentiable follows from the theorem on the derivative of an inverse function.)'
    ]
  });

  f('der-log', 'Derivative of a logarithm to any base', {
    w: '$x > 0$; $a > 0$, $a \\ne 1$.',
    p: [
      'Switch to natural logarithms: $\\log_a x = \\frac{\\ln x}{\\ln a}$, where $\\ln a$ is a constant.',
      'So $(\\log_a x)′ = \\frac{1}{\\ln a} \\cdot \\frac{1}{x}$.'
    ]
  });

  /* ================================================================ Rules */
  sec('deriv-rules', 'Rules of differentiation');

  f('der-sum', 'Sum and constant multiple rules', {
    p: [
      'The difference quotient of a sum is the sum of the difference quotients: $$\\frac{(u + v)(x + h) - (u + v)(x)}{h} = \\frac{u(x + h) - u(x)}{h} + \\frac{v(x + h) - v(x)}{h}.$$',
      'The limit of a sum equals the sum of the limits. A constant factor comes out of the limit in the same way.'
    ]
  });

  f('der-prod', 'Product rule', {
    ex: '$(x^2\\sin x)′ = 2x\\sin x + x^2\\cos x$',
    p: [
      'Add and subtract $u(x + h)v(x)$: $$u(x + h)v(x + h) - u(x)v(x) = u(x + h)\\big(v(x + h) - v(x)\\big) + \\big(u(x + h) - u(x)\\big)v(x).$$',
      'Divide by $h$ and pass to the limit: $u(x + h) \\to u(x)$ (a differentiable function is continuous), and the fractions tend to $v′(x)$ and $u′(x)$.'
    ],
    err: '$(uv)′ \\ne u′v′$: $(x \\cdot x)′ = 2x$, not $1 \\cdot 1$.'
  });

  f('der-quot', 'Quotient rule', {
    w: '$v(x) \\ne 0$.',
    p: [
      'First find $\\left(\\frac{1}{v}\\right)′$: $$\\frac{1}{h}\\left(\\frac{1}{v(x + h)} - \\frac{1}{v(x)}\\right) = -\\frac{v(x + h) - v(x)}{h} \\cdot \\frac{1}{v(x + h)\\,v(x)} \\to -\\frac{v′}{v^2}.$$',
      'Now $\\frac{u}{v} = u \\cdot \\frac{1}{v}$, and by the product rule: $u′ \\cdot \\frac{1}{v} + u \\cdot \\left(-\\frac{v′}{v^2}\\right) = \\frac{u′v - uv′}{v^2}$.'
    ],
    err: 'The terms in the numerator get swapped. The order “derivative of the numerator first” is easy to check on $\\left(\\frac{x}{1}\\right)′ = 1$.'
  });

  f('der-chain', 'Chain rule', {
    ex: '$\\left(\\sin(3x^2)\\right)′ = \\cos(3x^2) \\cdot 6x$; $\\left(e^{-x}\\right)′ = -e^{-x}$',
    p: [
      'Let $u = g(x)$ and $\\Delta u = g(x + h) - g(x)$. Then $$\\frac{f(g(x + h)) - f(g(x))}{h} = \\frac{f(u + \\Delta u) - f(u)}{\\Delta u} \\cdot \\frac{\\Delta u}{h}.$$',
      'As $h \\to 0$ also $\\Delta u \\to 0$ (since $g$ is continuous), so the first factor tends to $f′(u)$ and the second to $g′(x)$.',
      'A rigorous proof treats separately the case $\\Delta u = 0$ for arbitrarily small $h$ (then one cannot divide by $\\Delta u$); the answer does not change.'
    ]
  });

  f('tangent', 'Equation of the tangent line', {
    ex: 'The tangent to $y = x^2$ at $x_0 = 1$: $y = 1 + 2(x - 1) = 2x - 1$.',
    p: [
      'The tangent passes through the point of the graph $(x_0; f(x_0))$ and has slope $k = f′(x_0)$ — this is the geometric meaning of the derivative.',
      'A line with slope $k$ through the point $(x_0; y_0)$ has the equation $y - y_0 = k(x - x_0)$.'
    ]
  });

  f('der-mono', 'Increasing/decreasing test', {
    f: 'f′(x) > 0 \\text{ on an interval} \\Rightarrow f \\text{ is increasing on it}',
    w: 'Likewise: $f′ < 0$ — the function decreases. If $f′$ changes sign from $+$ to $-$, the point is a maximum; from $-$ to $+$ — a minimum.',
    p: [
      'Take $x_1 < x_2$ on the interval. By the mean value theorem there is a point $c$ between them at which $f(x_2) - f(x_1) = f′(c)(x_2 - x_1)$.',
      'Both factors on the right are positive, so $f(x_2) > f(x_1)$.'
    ],
    note: 'The mean value theorem visually: between two points of a smooth graph there is a point where the tangent is parallel to the chord.'
  });

  f('fermat', 'Fermat’s theorem on stationary points', {
    f: 'x_0 \\text{ is an extremum, } f′(x_0) \\text{ exists} \\Rightarrow f′(x_0) = 0',
    w: 'So extrema are sought among critical points — where $f′ = 0$ or does not exist.',
    p: [
      'Let $x_0$ be a maximum point: near it $f(x_0 + h) \\le f(x_0)$.',
      'Then for $h > 0$ the fraction $\\frac{f(x_0 + h) - f(x_0)}{h} \\le 0$, and for $h < 0$ it is $\\ge 0$.',
      'Hence the right limit is $\\le 0$ and the left one $\\ge 0$, and it is the same number $f′(x_0)$. So $f′(x_0) = 0$. For a minimum — likewise.'
    ],
    err: 'The converse is false: for $f(x) = x^3$ the derivative at zero is zero, but there is no extremum. And an extremum can occur where there is no derivative: $|x|$ at zero.'
  });

  f('extr-segment', 'Greatest and least values on a closed interval', {
    f: '\\max_{[a; b]} f, \\; \\min_{[a; b]} f \\;\\text{ are among }\\; f(a), \\; f(b), \\; f(x_{\\text{crit}})',
    w: '$f$ is continuous on $[a; b]$; $x_{\\text{crit}}$ are the critical points inside the interval.',
    p: [
      'A function continuous on a closed interval attains its greatest and least values (the extreme value theorem).',
      'If such a value is attained inside the interval, it is an extremum point, and by Fermat’s theorem $f′ = 0$ there or the derivative does not exist. Otherwise it is attained at an end.',
      'So it is enough to compare the values at the ends and at the critical points.'
    ]
  });

  /* ================================================================ Integrals */
  sec('integ', 'Antiderivatives and integrals',
    'An antiderivative is a derivative in reverse. So every formula of the section is checked by differentiating, and the bridge between antiderivatives and area is the Newton–Leibniz formula.');

  f('int-table', 'Table of antiderivatives', {
    p: [
      'Every line is checked by differentiating: the derivative of the right-hand side must equal the integrand.',
      '$\\left(\\frac{x^{n+1}}{n + 1}\\right)′ = \\frac{(n + 1)x^n}{n + 1} = x^n$; $(-\\cos x)′ = \\sin x$; $\\left(\\frac{a^x}{\\ln a}\\right)′ = a^x$; $(\\tg x)′ = \\frac{1}{\\cos^2 x}$.',
      'For $\\ln|x|$ with $x < 0$: $(\\ln(-x))′ = \\frac{1}{-x} \\cdot (-1) = \\frac{1}{x}$ — hence the modulus under the logarithm.',
      '$+C$ — because the derivative of a constant is zero: there are infinitely many antiderivatives, and they all differ by a constant.'
    ]
  });

  f('int-rules', 'Rules of integration', {
    w: '$F$ is an antiderivative of $f$, $k \\ne 0$.',
    ex: '$\\int \\cos(3x - 1)\\,dx = \\frac{1}{3}\\sin(3x - 1) + C$',
    p: [
      'The first two rules are the sum and constant multiple rules for derivatives read in reverse.',
      'Check the third by differentiating: $\\left(\\frac{1}{k}F(kx + b)\\right)′ = \\frac{1}{k} \\cdot F′(kx + b) \\cdot k = f(kx + b)$ — by the chain rule.'
    ],
    err: 'There is no simple rule for a product or a quotient: $\\int x\\sin x\\,dx \\ne \\frac{x^2}{2} \\cdot (-\\cos x)$.'
  });

  f('newton-leibniz', 'Newton–Leibniz formula', {
    w: '$f$ is continuous on $[a; b]$, $F$ is any of its antiderivatives.',
    ex: '$\\int_0^{\\pi} \\sin x\\,dx = -\\cos\\pi + \\cos 0 = 2$',
    p: [
      'Consider $S(x) = \\int_a^x f(t)\\,dt$ — the area under the graph from $a$ to $x$ (for clarity $f \\ge 0$).',
      'The increment $S(x + h) - S(x)$ is the area of a narrow strip of width $h$. It lies between $h \\cdot m$ and $h \\cdot M$, where $m$ and $M$ are the least and greatest values of $f$ on $[x; x + h]$.',
      'Divide by $h$: $m \\le \\frac{S(x + h) - S(x)}{h} \\le M$. As $h \\to 0$ both bounds tend to $f(x)$ (continuity), so $S′(x) = f(x)$: $S$ is an antiderivative.',
      'Any other antiderivative differs by a constant: $F(x) = S(x) + C$.',
      'Then $F(b) - F(a) = S(b) - S(a) = S(b) - 0 = \\int_a^b f(x)\\,dx$.'
    ]
  });

  f('area-curve', 'Area under a graph and between graphs', {
    w: '$f(x) \\ge g(x)$ on $[a; b]$. The area under a graph is the special case $g = 0$.',
    ex: 'Between $y = x$ and $y = x^2$: $\\int_0^1 (x - x^2)\\,dx = \\frac{1}{2} - \\frac{1}{3} = \\frac{1}{6}$.',
    p: [
      'The area under the graph of a non-negative function is $\\int_a^b f(x)\\,dx$.',
      'The region between the graphs is the area under the upper one minus the area under the lower one.',
      'If the graphs go below the $x$-axis, raise both by the same constant $c$: the area of the region does not change, and neither does the difference $(f + c) - (g + c)$.'
    ],
    err: 'If the function changes sign, $\\int_a^b f\\,dx$ is not an area: the parts below the axis are subtracted. The area is computed separately on each interval of constant sign.'
  });

  f('vol-rot', 'Volume of revolution', {
    w: 'The solid is obtained by rotating the graph of $y = f(x)$, $x \\in [a; b]$, about the $x$-axis.',
    ex: 'A cone: rotate $y = \\frac{R}{h}x$ on $[0; h]$: $V = \\pi\\frac{R^2}{h^2}\\int_0^h x^2\\,dx = \\frac{1}{3}\\pi R^2 h$.',
    p: [
      'The cross-section of the solid by a plane perpendicular to the $x$-axis at the point $x$ is a disc of radius $|f(x)|$ with area $\\pi f^2(x)$.',
      'A thin slice of thickness $\\Delta x$ is almost a cylinder of volume $\\pi f^2(x)\\Delta x$. The sum of such slices gives the integral in the limit.'
    ]
  });
})();
