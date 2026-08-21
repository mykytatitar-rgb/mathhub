/* Готовий довідник: теми, розділи, формули.

   Це перенесений Math Cheat Sheet — той самий зміст, але живе всередині
   кабінету: шукається разом з рештою матеріалів, прикріплюється до уроку,
   друкується й правиться без сторонніх сервісів.

   Мова змісту англійська, як в оригіналі. Це не недогляд: серед учнів є
   ті, хто йде за Cambridge AS/A Level і Precalculus, і термінологію їм
   потрібно бачити тією мовою, якою буде іспит.

   Формули записані так, як їх набирають: a^2, \frac{a}{b}, \sqrt[3]{8}.
   Малює їх MathFmt — і в кабінеті, і на сторінці учня.

   Види блоків:
     rule — підпис, формула, приклад
     text — абзац пояснення
     warn — те, на чому найчастіше помиляються
     item — пункт списку
     pair — рядок таблиці: ліворуч питання, праворуч відповідь */

(function () {
  'use strict';

  function r(group, title, formula, example, note) {
    return { group: group, kind: 'rule', title: title || '', formula: formula || '',
             example: example || '', note: note || '' };
  }
  function t(group, note)  { return { group: group, kind: 'text', note: note }; }
  function w(group, note)  { return { group: group, kind: 'warn', note: note }; }
  function i(group, note)  { return { group: group, kind: 'item', note: note }; }
  function p(group, a, b)  { return { group: group, kind: 'pair', formula: a, example: b }; }

  var SHEETS = [];

  /* ---------------------------------------------------------------- 1 */
  SHEETS.push({ title: 'Exponents', topic: 'Числа і вирази', rules: [
    t('What Is an Exponent?', 'An exponent shows how many times a number is multiplied by itself.'),
    r('What Is an Exponent?', '', 'a^n = a \\cdot a \\cdot a \\cdot \\ldots \\cdot a', '', 'n times'),
    t('What Is an Exponent?', 'In a^n: a is the base, n is the exponent.'),

    r('Special Exponents', 'Exponent 1', 'a^1 = a'),
    r('Special Exponents', 'Exponent 0', 'a^0 = 1'),
    r('Special Exponents', 'Even exponent', '(-a)^{2k} > 0', '(-4)^2 = 16', 'Even exponent → result is positive'),
    r('Special Exponents', 'Odd exponent', '(-a)^{2k+1} < 0', '(-3)^3 = -27', 'Odd exponent → result is negative'),

    r('Properties of Exponents', 'Multiplying — same base', 'a^m \\cdot a^n = a^{m+n}', '5^2 \\cdot 5 = 5^3 = 125'),
    r('Properties of Exponents', 'Dividing — same base', '\\frac{a^m}{a^n} = a^{m-n}', '\\frac{2^{10}}{2^{11}} = 2^{-1} = \\frac{1}{2}'),
    r('Properties of Exponents', 'Negative exponent', 'a^{-n} = \\frac{1}{a^n}', '3^{-2} = \\frac{1}{9}'),
    r('Properties of Exponents', 'Fraction with a negative exponent', '(\\frac{a}{b})^{-n} = (\\frac{b}{a})^n', '(\\frac{3}{2})^{-2} = (\\frac{2}{3})^2'),
    r('Properties of Exponents', 'Fractional exponent', 'a^{m/n} = \\sqrt[n]{a^m}', '8^{2/3} = \\sqrt[3]{8^2} = \\sqrt[3]{64} = 4'),

    r('Powers of Products', 'Power to a power', '(a^m)^n = a^{m \\cdot n}', '(2^2)^3 = 2^6 = 64'),
    r('Powers of Products', 'Power of a product', '(a \\cdot b)^n = a^n \\cdot b^n', '(3 \\cdot 4)^2 = 9 \\cdot 16 = 144'),
    r('Powers of Products', 'Power of a quotient', '(\\frac{a}{b})^n = \\frac{a^n}{b^n}', '(\\frac{1}{2})^3 = \\frac{1}{8}'),

    t('Scientific Notation', 'Write a number as a_1 · 10^n where 1 ≤ a_1 < 10 and n is an integer.'),
    r('Scientific Notation', '', 'a_1 \\cdot 10^n', '120\\,000 = 1.2 \\cdot 10^5')
  ]});

  /* ---------------------------------------------------------------- 2 */
  SHEETS.push({ title: 'Polynomials', topic: 'Числа і вирази', rules: [
    r('Monomials and Polynomials', 'Monomial', '3ab, \\quad 4x^2, \\quad -nm^2', '', 'An expression containing letters'),
    r('Monomials and Polynomials', 'Polynomial', '3ab + 9x, \\quad -ab + 4x^2', '', 'Sum of several monomials'),

    r('Brackets in Polynomials', 'Plus before brackets', '4x^2 + (x - 4) = 4x^2 + x - 4', '',
      'If there is a plus before brackets, you can simply remove the brackets.'),
    r('Brackets in Polynomials', 'Minus before brackets', 'x^2 - (x + a^3) = x^2 - x - a^3', '',
      'If there is a minus before brackets, remove them BUT flip all signs inside.'),
    w('Brackets in Polynomials', 'A minus before brackets flips every sign inside — not only the first one.'),

    t('Multiplying Monomial × Polynomial', 'Multiply every term in the brackets by the monomial.'),
    r('Multiplying Monomial × Polynomial', '', '2(x - 6) = 2 \\cdot x - 2 \\cdot 6 = 2x - 12'),

    t('Multiplying Polynomial × Polynomial', 'Multiply every term of the first polynomial by every term of the second.'),
    r('Multiplying Polynomial × Polynomial', '', '(2x-3)(x^2+7) = 2x^3 + 14x - 3x^2 - 21'),

    t('Factoring', 'One method: factor out the common factor.'),
    r('Factoring', '', 'ax + ay = a(x + y)'),
    t('Factoring', 'The common factor can be a whole expression:'),
    r('Factoring', '', 'a(x+y) + b(x+y) = (x+y)(a+b)'),

    r('Short Multiplication Formulas', 'Square of a sum', '(a + b)^2 = a^2 + 2ab + b^2'),
    r('Short Multiplication Formulas', 'Square of a difference', '(a - b)^2 = a^2 - 2ab + b^2'),
    r('Short Multiplication Formulas', 'Difference of squares', 'a^2 - b^2 = (a - b)(a + b)')
  ]});

  /* ---------------------------------------------------------------- 3 */
  SHEETS.push({ title: 'Functions', topic: 'Функції та графіки', rules: [
    t('What Is a Function?', 'A function is a relationship between two quantities.'),
    r('What Is a Function?', '', 'y = 5x + 4 \\quad f(x) = 5x + 4'),
    i('What Is a Function?', 'x — independent variable (argument)'),
    i('What Is a Function?', 'y — dependent variable (function value)'),
    w('What Is a Function?', 'Each value of x corresponds to EXACTLY ONE value of y.'),
    r('What Is a Function?', 'Graph of a function', '', '', 'The set of all points belonging to the function.'),
    r('What Is a Function?', 'Zero of a function', 'y = 2x-2 \\to 2x-2 = 0 \\to x = 1', '', 'Value of x where y = 0.'),

    r('Intersections with Axes', 'Intersection with Ox', '', '(x; 0)', 'Set y = 0 and solve for x.'),
    r('Intersections with Axes', 'Intersection with Oy', '', '(0; y)', 'Set x = 0 and find y.'),

    r('Domain and Range', 'Domain', 'D(y), \\quad D(f)', '', 'All allowable values of x.'),
    r('Domain and Range', 'Range', 'E(y), \\quad E(f)', '', 'All allowable values of y.'),

    r('Even and Odd Functions', 'Even function', 'f(x) = f(-x)', '', 'Symmetric about the y-axis'),
    r('Even and Odd Functions', 'Odd function', 'f(-x) = -f(x)', '', 'Symmetric about the origin'),

    t('Monotonicity', 'Monotonicity — the intervals of increase and decrease of a function.'),

    r('Graph Transformations', 'Original', 'y = f(x)'),
    r('Graph Transformations', 'Vertical shift', 'y = f(x) + m', '', 'By |m| units; up if m > 0, down if m < 0'),
    r('Graph Transformations', 'Horizontal shift', 'y = f(x + b)', '', 'By |b| units; left if b > 0, right if b < 0'),
    r('Graph Transformations', 'Reflection about Ox', 'y = -f(x)'),
    r('Graph Transformations', 'Reflection about Oy', 'y = f(-x)')
  ]});

  /* ---------------------------------------------------------------- 4 */
  SHEETS.push({ title: 'Linear Function', topic: 'Функції та графіки', rules: [
    r('Linear Function', 'General form', 'y = kx + b'),
    r('Linear Function', 'Value of k', '', '', 'If k > 0 the function is increasing; if k < 0 it is decreasing.'),
    r('Linear Function', 'Value of b', '', '', 'b is the y-coordinate of the intersection with the y-axis.'),
    w('Linear Function', 'The graph of a linear function is a straight line.'),

    r('Increasing or Decreasing?', 'Increasing', '', '', 'Acute angle with positive x-axis direction'),
    r('Increasing or Decreasing?', 'Decreasing', '', '', 'Obtuse angle with positive x-axis direction'),

    r('Direct Proportionality', 'General form', 'y = kx', '', 'Direct proportionality is a linear function where b = 0.'),
    w('Direct Proportionality', 'The graph always passes through the origin.'),
    r('Direct Proportionality', 'Special case y = x', 'y = x \\quad (k = 1, b = 0)'),
    i('Direct Proportionality', 'Passes through origin (0; 0)'),
    i('Direct Proportionality', 'Bisects quadrants I and III'),

    t('Parallel Graphs', 'Two linear functions y = k_1 x + b_1 and y = k_2 x + b_2 are parallel if k_1 = k_2.'),

    r('Special Cases', 'Parallel to x-axis', 'k = 0 \\to y = b'),
    r('Special Cases', 'Parallel to y-axis', 'x = b'),

    t('Linear Equations', 'A linear equation has the form:'),
    r('Linear Equations', '', 'a \\cdot x = b'),
    r('Linear Equations', 'If a ≠ 0', 'ax = b \\to x = \\frac{b}{a}', '', 'One solution'),
    r('Linear Equations', 'If a = 0, b ≠ 0', '0x = b', '', 'No solution'),
    r('Linear Equations', 'If a = 0 and b = 0', '0x = 0', '', 'Infinitely many solutions')
  ]});

  /* ---------------------------------------------------------------- 5 */
  SHEETS.push({ title: 'Quadratic Equations', topic: 'Рівняння і нерівності', rules: [
    r('Quadratic Equation', '', 'ax^2 + bx + c = 0'),
    r('Quadratic Equation', 'Discriminant', 'D = b^2 - 4ac'),
    r('Quadratic Equation', 'Roots', 'x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a}'),
    i('Quadratic Equation', 'D < 0 → no real roots'),
    i('Quadratic Equation', 'D = 0 → one root: x = −b/(2a)'),
    i('Quadratic Equation', 'D > 0 → two roots'),
    r('Quadratic Equation', "Vieta's theorem", 'x_1 + x_2 = -\\frac{b}{a}, \\quad x_1 \\cdot x_2 = \\frac{c}{a}'),

    r('Factoring Formula', '', 'ax^2 + bx + c = a(x - x_1)(x - x_2)'),

    t("Solving with Vieta's Theorem", 'Usually used for reduced quadratic equations:'),
    r("Solving with Vieta's Theorem", '', 'x^2 + bx + c = 0'),
    r("Solving with Vieta's Theorem", 'Sum of roots', 'x_1 + x_2 = -b'),
    r("Solving with Vieta's Theorem", 'Product of roots', 'x_1 \\cdot x_2 = c'),
    t("Solving with Vieta's Theorem", 'Find two integers whose product equals c and whose sum equals −b.'),

    r('Quadratic Function', '', 'y = ax^2 + bx + c', '', 'The graph of a quadratic function is a parabola.'),
    r('Quadratic Function', 'a > 0', '', '', 'Opens upward ∪'),
    r('Quadratic Function', 'a < 0', '', '', 'Opens downward ∩'),
    t('Quadratic Function', 'The value of c is the y-intercept — where the graph meets the y-axis.'),

    r('Elements of a Parabola', 'Vertex', 'x_v = -\\frac{b}{2a}', '', 'To find the y-coordinate, substitute x_v into the function.'),
    r('Elements of a Parabola', 'Zeros', 'ax^2 + bx + c = 0', '', 'Set y = 0 and solve; x_1 and x_2 are the zeros.'),

    t('Biquadratic Equations', 'Solve by substituting x^2 = t, where t ≥ 0:'),
    r('Biquadratic Equations', '', 'ax^4 + bx^2 + c = 0'),
    r('Biquadratic Equations', '', 'at^2 + bt + c = 0')
  ]});

  /* ---------------------------------------------------------------- 6 */
  SHEETS.push({ title: 'Inequalities', topic: 'Рівняння і нерівності', rules: [
    t('Inequalities', 'An inequality is a statement that two mathematical objects are not equal.'),
    r('Inequalities', 'Strict signs', '> \\quad <'),
    r('Inequalities', 'Non-strict signs', '\\ge \\quad \\le'),
    i('Inequalities', 'You can move terms to the other side, but flip the sign.'),
    i('Inequalities', 'You can expand brackets and combine like terms.'),
    i('Inequalities', 'You can multiply or divide both sides by the same nonzero number.'),
    w('Inequalities', 'When multiplying or dividing by a negative number, FLIP the inequality sign!'),

    r('Intervals and Brackets', 'Round bracket (', '', '', 'Point excluded — strict sign ○'),
    r('Intervals and Brackets', 'Square bracket [', '', '', 'Point included — non-strict sign ●'),

    t('Linear Inequality', 'A linear inequality has the form:'),
    r('Linear Inequality', '', 'ax < b'),
    t('Linear Inequality', 'Divide both sides so only x remains on one side, then write the interval.'),

    t('Double Inequality', 'Inequalities with two inequality signs.'),
    t('Double Inequality', 'Transform so that only x remains in the middle.'),

    t('Quadratic Inequality', 'A quadratic inequality is of the form ax^2 + bx + c ≥ 0.'),
    r('Quadratic Inequality', 'Method 1 — via parabola', '', '', '1. Determine direction of the branches. 2. Find zeros. 3. Sketch the graph. 4. Find intervals on the x-axis satisfying the inequality.'),
    r('Quadratic Inequality', 'Method 2 — interval method', '', '', '1. Find zeros. 2. Place them on the number line and divide into intervals. 3. Take any number from each interval, substitute, check the sign. 4. Minus → function < 0; plus → function > 0.')
  ]});

  /* ---------------------------------------------------------------- 7 */
  SHEETS.push({ title: 'Absolute Value', topic: 'Числа і вирази', rules: [
    t('Absolute Value', 'Absolute value in math is the distance from 0 to a point on the number line.'),
    r('Absolute Value', '', '|-3| = 3 \\quad |+4| = 4'),
    w('Absolute Value', 'Absolute value is a distance — it can never be negative!'),

    r('Properties', 'Positive number', '|4| = 4', '', 'A positive number gives itself.'),
    r('Properties', 'Negative number', '|-4| = 4', '', 'A negative number gives its opposite.'),
    r('Properties', 'Zero', '|0| = 0'),
    r('Properties', 'Absolute value of a product', '|a \\cdot b| = |a| \\cdot |b|'),
    r('Properties', 'Absolute value of a quotient', '|\\frac{a}{b}| = \\frac{|a|}{|b|}'),

    r('Absolute Value Function', 'General form', 'y = |x|'),
    i('Absolute Value Function', 'Passes through the origin (0; 0)'),
    i('Absolute Value Function', 'Bisects quadrants I and II'),
    i('Absolute Value Function', 'Is an even function'),
    i('Absolute Value Function', 'D(y) = ℝ, E(y) = [0; +∞)')
  ]});

  /* ---------------------------------------------------------------- 8 */
  SHEETS.push({ title: 'Rational Expressions', topic: 'Числа і вирази', rules: [
    t('Rational Expressions', 'Rational expressions are algebraic expressions that include division by a variable.'),
    r('Rational Expressions', '', '\\frac{5}{3 - x}'),
    r('Rational Expressions', '', '\\frac{x^2 + 15}{3 - 8x}'),
    t('Rational Expressions', 'Work with them the same way as with ordinary fractions.'),
    w('Rational Expressions', 'Division by 0 is forbidden. Variable values must never make the denominator zero.'),

    t('Simplification (Cancelling)', 'Simplify a fraction by dividing numerator and denominator by a common expression.'),
    w('Simplification (Cancelling)', 'You can only cancel when there is multiplication between elements!'),
    r('Simplification (Cancelling)', '', '\\frac{15}{3(3-x)} = \\frac{5}{3-x}'),
    i('Simplification (Cancelling)', 'Often you need to factor out a common factor first.'),

    t('Multiplication', 'Multiply numerator × numerator, denominator × denominator.'),
    t('Division', 'Keep the first fraction, change ÷ to ×, flip the second fraction.'),
    t('Same Denominators', 'Keep the denominator, add or subtract the numerators.'),
    t('Different Denominators', 'Multiply one fraction — both numerator and denominator — to make denominators equal, then add or subtract.'),

    r('Function y = k/x', '', 'y = \\frac{k}{x}', '', 'The graph is a hyperbola.'),
    i('Function y = k/x', 'Does not cross the coordinate axes'),
    i('Function y = k/x', 'Is an odd function'),
    i('Function y = k/x', 'D(y) = (−∞; 0) ∪ (0; +∞)'),
    i('Function y = k/x', 'E(y) = (−∞; 0) ∪ (0; +∞)')
  ]});

  /* ---------------------------------------------------------------- 9 */
  SHEETS.push({ title: 'Square Roots', topic: 'Числа і вирази', rules: [
    t('Square Root', 'The square root of a is a number whose square equals a.'),
    r('Square Root', '', '\\sqrt{16} = 4 \\quad \\sqrt{49} = 7'),
    w('Square Root', 'The number under a square root must be non-negative!'),
    t('Square Root', 'Sometimes the number under the root is not a perfect square — leave it as is. Such numbers are irrational.'),
    r('Square Root', '', '\\sqrt{15} \\quad \\sqrt{29}'),

    t('Estimating a Root', 'To estimate an irrational root, find the nearest perfect squares on either side.'),
    r('Estimating a Root', 'Useful to remember', '\\sqrt{2} \\approx 1.4 \\quad \\sqrt{3} \\approx 1.7'),

    t('nth Root', 'The nth root of a is the number whose nth power equals a.'),
    t('nth Root', 'If the root has an odd degree, it can be taken of a negative number:'),
    r('nth Root', '', '\\sqrt[5]{32} = 2 \\quad \\sqrt[3]{-8} = -2'),

    r('Properties of Roots', 'Multiplication', '\\sqrt[n]{ab} = \\sqrt[n]{a} \\cdot \\sqrt[n]{b}'),
    r('Properties of Roots', 'Division', '\\sqrt[n]{\\frac{a}{b}} = \\frac{\\sqrt[n]{a}}{\\sqrt[n]{b}}'),
    r('Properties of Roots', 'Root and power', '(\\sqrt[n]{a})^n = a'),
    r('Properties of Roots', 'Even root of an even power', '\\sqrt[2n]{a^{2n}} = |a|'),

    i('In and Out of a Root', 'Bringing a number inside: raise it to the power of the root index.'),
    i('In and Out of a Root', 'Taking a number outside: take the corresponding root of it.'),

    t('Irrational Denominator', 'Avoid leaving a root in the denominator — like leaving an improper fraction.'),
    i('Irrational Denominator', 'If the denominator is a root → multiply by that root.'),
    i('Irrational Denominator', 'If the denominator is an expression → multiply by its conjugate.'),
    t('Irrational Denominator', 'Conjugate expression — the same expression with the opposite sign.'),

    i('Root Function', 'D(y) = [0; +∞), E(y) = [0; +∞)'),
    i('Root Function', 'Zero of function: y = 0 when x = 0'),
    i('Root Function', 'Increasing on [0; +∞)')
  ]});

  /* --------------------------------------------------------------- 10 */
  SHEETS.push({ title: 'Exponential Function', topic: 'Функції та графіки', rules: [
    t('Exponential Function', 'An exponential function is one where the variable is in the exponent.'),
    r('Exponential Function', 'General form', 'y = a^x, \\quad a > 0, \\quad a \\ne 1'),
    i('Exponential Function', 'If 0 < a < 1 — decreasing; if a > 1 — increasing'),
    i('Exponential Function', 'Passes through the point (0; 1)'),
    i('Exponential Function', 'D(y) = ℝ, E(y) = (0; +∞)'),

    r('Function y = x³', '', 'y = x^3'),
    i('Function y = x³', 'Passes through the origin'),
    i('Function y = x³', 'Is an odd function'),
    i('Function y = x³', 'Is an increasing function'),
    i('Function y = x³', 'D(y) = ℝ, E(y) = ℝ'),

    t('Graph of the Function', 'The shape depends on the base a:'),
    r('Graph of the Function', 'a > 1', '', '', 'Increasing — exponential growth'),
    r('Graph of the Function', '0 < a < 1', '', '', 'Decreasing — exponential decay'),

    t('Exponential Equations', 'An exponential equation has the unknown in the exponent.'),
    r('Exponential Equations', '', 'a^x = b, \\quad a > 0, \\quad a \\ne 1'),

    t('How to Solve?', 'Main method — common base. Bring both sides to the same base, then equate the exponents.'),
    r('How to Solve?', '', 'a^{f(x)} = a^{g(x)} \\to f(x) = g(x)'),

    t('Substitution Method', 'Replace a common exponential expression with a single letter. This usually produces a quadratic equation.'),
    r('Substitution Method', '', '(2^x)^2 + 2^x - 6 = 0'),
    r('Substitution Method', '', '2^x = t \\quad (t > 0)'),
    r('Substitution Method', '', 't^2 + t - 6 = 0'),
    w('Substitution Method', 'The substitution value must be positive — no matter what power you raise 2 to, the result is always positive.')
  ]});

  /* --------------------------------------------------------------- 11 */
  SHEETS.push({ title: 'Exponential Inequalities', topic: 'Рівняння і нерівності', rules: [
    t('Exponential Inequalities', 'Exponential inequalities involve an exponential function.'),
    r('Exponential Inequalities', '', 'a^{f(x)} > a^{g(x)}, \\quad a^{f(x)} < a^{g(x)}'),
    r('Exponential Inequalities', 'Examples', '7^x < 49'),
    r('Exponential Inequalities', '', '8^x \\ge -9'),
    r('Exponential Inequalities', '', '8^{3-x} \\ge 19'),

    t('How to Solve?', 'Simplify the expression to get equal degrees or equal bases, then drop the bases and compare the exponents.'),
    r('How to Solve?', 'If a > 1', 'a^x > a^y \\to x > y'),
    r('How to Solve?', 'If 0 < a < 1', 'a^x > a^y \\to x < y'),
    w('How to Solve?', 'If the base is less than 1, you MUST flip the inequality sign!'),
    t('How to Solve?', 'Sometimes you need to factor out the common factor a^x to solve the inequality.'),

    t('Substitution Method', 'Replace the exponential expression with a new variable, solve the resulting inequality, then substitute back.'),
    r('Substitution Method', 'Example', '4^x - 6 \\cdot 2^x + 8 < 0'),
    r('Substitution Method', '', '2^x = t \\quad (t > 0)'),
    r('Substitution Method', '', 't^2 - 6t + 8 < 0'),
    w('Substitution Method', 'The substitution t must be positive — 2 raised to any power is always positive.')
  ]});

  /* --------------------------------------------------------------- 12 */
  SHEETS.push({ title: 'Logarithms', topic: 'Числа і вирази', rules: [
    t('What Is a Logarithm?', 'A logarithm is an exponent.'),
    r('What Is a Logarithm?', '', '\\log_5(25)', '', 'Here 5 is the base and 25 is the argument.'),

    r('Special Logarithms', 'Common (base 10)', '\\lg a = \\log_{10} a'),
    r('Special Logarithms', 'Natural (base e)', '\\ln a = \\log_e a', '', 'e ≈ 2.72 — mathematical constant'),

    t('Domain of a Logarithm', 'Domain — all allowed values for computing the logarithm.'),
    r('Domain of a Logarithm', '', 'a > 0, \\quad a \\ne 1, \\quad b > 0'),

    r('Logarithmic Function', 'General form', 'y = \\log_a x'),
    i('Logarithmic Function', 'If 0 < a < 1 — decreasing; if a > 1 — increasing'),
    i('Logarithmic Function', 'Passes through the point (1; 0)'),
    i('Logarithmic Function', 'D(y) = (0; +∞), E(y) = ℝ'),

    r('Properties of Logarithms', '', '\\log_a 1 = 0'),
    r('Properties of Logarithms', '', '\\log_a a = 1'),
    r('Properties of Logarithms', 'Product', '\\log_a(b \\cdot c) = \\log_a b + \\log_a c'),
    r('Properties of Logarithms', 'Quotient', '\\log_a \\frac{b}{c} = \\log_a b - \\log_a c'),
    r('Properties of Logarithms', 'Power of the argument', '\\log_a b^m = m \\cdot \\log_a b'),
    r('Properties of Logarithms', 'Power of the base', '\\log_{a^m} b = \\frac{1}{m} \\cdot \\log_a b'),

    r('Change of Base', '', '\\log_a b = \\frac{\\log_c b}{\\log_c a}'),
    r('Change of Base', '', '\\log_a b = \\frac{1}{\\log_b a}'),
    r('Change of Base', 'Fundamental property', 'a^{\\log_a b} = b')
  ]});

  /* --------------------------------------------------------------- 13 */
  SHEETS.push({ title: 'Logarithmic Equations', topic: 'Рівняння і нерівності', rules: [
    t('Logarithmic Equations', "If the unknown is inside the logarithm — it's a logarithmic equation."),
    r('Logarithmic Equations', 'Examples', '\\log_2 x = 5'),
    r('Logarithmic Equations', '', '\\log_{1/3} x = 0'),

    t('Domain (ODZ)', 'All allowed values. The argument of a logarithm must be positive.'),
    r('Domain (ODZ)', '', 'a > 0, \\quad a \\ne 1, \\quad b > 0'),

    t('By Definition', "The argument equals the base raised to the logarithm's value."),
    r('By Definition', '', '\\log_a x = b \\to x = a^b'),
    r('By Definition', 'Example', '\\log_2 x = 5 \\to x = 2^5 = 32'),

    t('Potentiation', 'Potentiation — transition from log_a f(x) = log_a g(x) to f(x) = g(x).'),
    r('Potentiation', 'Example', '\\log_5(x+1) = \\log_5(2x-3)'),
    r('Potentiation', '', 'x + 1 = 2x - 3'),
    r('Potentiation', '', 'x = 4'),

    t('Substitution Method', 'Replace a complex logarithmic expression with one letter.'),
    r('Substitution Method', 'Example', '2\\log_4^2 x - 5\\log_4 x = -2'),
    r('Substitution Method', '', '\\log_4 x = t'),
    r('Substitution Method', '', '2t^2 - 5t = -2'),
    w('Substitution Method', 'In logarithmic equations the substitution t has no restrictions: t ∈ ℝ.')
  ]});

  /* --------------------------------------------------------------- 14 */
  SHEETS.push({ title: 'Logarithmic Inequalities', topic: 'Рівняння і нерівності', rules: [
    t('Logarithmic Inequalities', 'A logarithmic inequality has the form:'),
    r('Logarithmic Inequalities', '', '\\log_a f(x) > \\log_a g(x)'),
    w('Logarithmic Inequalities', 'When solving, always remember the domain (ODZ)!'),
    r('Logarithmic Inequalities', 'Domain', 'f(x) > 0 \\quad and \\quad g(x) > 0'),

    t('Dropping the Logarithm', 'The main method. The base decides which way the sign goes.'),
    r('Dropping the Logarithm', 'If a > 1', '\\log_a f(x) > \\log_a g(x) \\Rightarrow f(x) > g(x)'),
    r('Dropping the Logarithm', 'If 0 < a < 1', '\\log_a f(x) > \\log_a g(x) \\Rightarrow f(x) < g(x)'),
    w('Dropping the Logarithm', 'Pay attention to the base of the logarithm!'),

    t('Logarithm vs a Number', 'Transform using properties until you get a logarithm greater or less than a logarithm.'),
    r('Logarithm vs a Number', 'Example', '\\log_2 x < 5'),
    r('Logarithm vs a Number', '', '\\log_2 x < 5 \\cdot \\log_2 2'),
    r('Logarithm vs a Number', '', '\\log_2 x < \\log_2 2^5'),
    r('Logarithm vs a Number', '', '\\log_2 x < \\log_2 32'),

    t('Substitution Method', 'Replace a complex logarithmic expression with one letter.'),
    r('Substitution Method', 'Example', '2\\log_4^2 x - 5\\log_4 x < -2'),
    r('Substitution Method', '', '\\log_4 x = t'),
    r('Substitution Method', '', '2t^2 - 5t < -2'),
    w('Substitution Method', 'Most importantly — remember to substitute back at the end!')
  ]});

  /* --------------------------------------------------------------- 15 */
  SHEETS.push({ title: 'Trigonometry', topic: 'Тригонометрія', rules: [
    r('Function y = sin x', '', 'D(\\sin x) = ℝ, \\quad E(\\sin x) = [-1; 1]'),
    i('Function y = sin x', 'Odd: sin(−x) = −sin x, symmetric about the origin'),
    r('Function y = sin x', 'Period', 'T = 2\\pi: \\quad \\sin(x + 2\\pi) = \\sin x'),

    r('Function y = cos x', '', 'D(\\cos x) = ℝ, \\quad E(\\cos x) = [-1; 1]'),
    i('Function y = cos x', 'Even: cos(−x) = cos x, symmetric about the y-axis'),
    r('Function y = cos x', 'Period', 'T = 2\\pi: \\quad \\cos(x + 2\\pi) = \\cos x'),

    r('Function y = tg x', '', 'D(\\tg x) = x \\ne \\frac{\\pi}{2} + \\pi n, \\quad n \\in ℤ'),
    r('Function y = tg x', '', 'E(\\tg x) = ℝ'),
    i('Function y = tg x', 'Odd: tg(−x) = −tg x, symmetric about the origin'),
    r('Function y = tg x', 'Period', 'T = \\pi: \\quad \\tg(x + \\pi) = \\tg x'),

    p('Periods', '\\sin x', 'T = 2\\pi'),
    p('Periods', '\\cos x', 'T = 2\\pi'),
    p('Periods', '\\tg x', 'T = \\pi'),

    r('Inverse Trig Functions', '', '\\arcsin(-a) = -\\arcsin a'),
    r('Inverse Trig Functions', '', '\\arccos(-a) = \\pi - \\arccos a'),

    p('Reduction Formulas', '\\sin(90° + a)', '\\cos a'),
    p('Reduction Formulas', '\\sin(180° - a)', '\\sin a'),
    p('Reduction Formulas', '\\cos(90° + a)', '-\\sin a'),
    p('Reduction Formulas', '\\cos(180° - a)', '-\\cos a'),
    p('Reduction Formulas', '\\tg(90° + a)', '-\\frac{1}{\\tg a}'),
    p('Reduction Formulas', '\\tg(180° - a)', '-\\tg a'),

    r('Trigonometric Formulas', 'Pythagorean identity', '\\sin^2 α + \\cos^2 α = 1'),
    r('Trigonometric Formulas', 'Tangent', '\\tg α = \\frac{\\sin α}{\\cos α}'),
    r('Trigonometric Formulas', '', '1 + \\tg^2 α = \\frac{1}{\\cos^2 α}'),
    r('Trigonometric Formulas', 'Double angle', '\\sin 2α = 2 \\sin α \\cdot \\cos α'),
    r('Trigonometric Formulas', '', '\\cos 2α = \\cos^2 α - \\sin^2 α')
  ]});

  /* --------------------------------------------------------------- 16 */
  SHEETS.push({ title: 'Sequences', topic: 'Числові послідовності', rules: [
    t('What Is a Sequence?', 'A sequence is a list of numbers where each term depends on the previous one. This dependency is the same throughout.'),

    t('Arithmetic Sequence', 'An arithmetic sequence is one where a constant d is added to each term.'),
    i('Arithmetic Sequence', 'd — common difference'),
    i('Arithmetic Sequence', 'a_1 — first term, n — number of terms, a_n — nth term'),
    r('Arithmetic Sequence', 'nth term', 'a_n = a_1 + d(n - 1), \\quad n \\in ℕ'),
    r('Arithmetic Sequence', 'Sum', 'S_n = \\frac{a_1 + a_n}{2} \\cdot n'),
    r('Arithmetic Sequence', 'Sum — expanded', 'S_n = \\frac{2a_1 + d(n-1)}{2} \\cdot n'),
    t('Arithmetic Sequence', 'These two formulas are identical — the second substitutes the nth term.'),

    t('Geometric Sequence', 'A geometric sequence is one where each term is multiplied by a constant q.'),
    i('Geometric Sequence', 'q — common ratio'),
    i('Geometric Sequence', 'b_1 — first term, n — number of terms, b_n — nth term'),
    r('Geometric Sequence', 'nth term', 'b_n = b_1 \\cdot q^{n-1}'),
    r('Geometric Sequence', 'Sum', 'S_n = \\frac{b_1(q^n - 1)}{q - 1}, \\quad q \\ne 1'),
    r('Geometric Sequence', 'Infinitely decreasing, |q| < 1', 'S = \\frac{b_1}{1 - q}'),

    t('Useful Formulas', 'Formulas for finding the middle term given adjacent terms:'),
    r('Useful Formulas', 'Arithmetic', 'a_n = \\frac{a_{n-1} + a_{n+1}}{2}'),
    r('Useful Formulas', 'Geometric', 'b_n^2 = b_{n-1} \\cdot b_{n+1}')
  ]});

  /* --------------------------------------------------------------- 17 */
  SHEETS.push({ title: 'Derivatives', topic: 'Похідна та її застосування', rules: [
    t('Derivative', 'A derivative characterizes the rate of change of a function with respect to the argument.'),

    p('Table of Derivatives', 'C', '0'),
    p('Table of Derivatives', 'x', '1'),
    p('Table of Derivatives', 'x^k', 'k \\cdot x^{k-1}'),
    p('Table of Derivatives', '\\sin x', '\\cos x'),
    p('Table of Derivatives', '\\cos x', '-\\sin x'),
    p('Table of Derivatives', '\\tg x', '\\frac{1}{\\cos^2 x}'),
    p('Table of Derivatives', 'e^x', 'e^x'),
    p('Table of Derivatives', '\\frac{1}{x}', '-\\frac{1}{x^2}'),
    p('Table of Derivatives', '\\sqrt{x}', '\\frac{1}{2\\sqrt{x}}'),
    p('Table of Derivatives', '\\ln x', '\\frac{1}{x}'),

    r('Rules', 'Sum and difference', '(U \\pm V)\' = U\' \\pm V\'', '', 'Find each derivative separately and add or subtract.'),
    r('Rules', 'Product', '(U \\cdot V)\' = U\' \\cdot V + U \\cdot V\'', '', 'Derivative of first × second, plus first × derivative of second.'),
    r('Rules', 'Quotient', '(\\frac{U}{V})\' = \\frac{U\'V - UV\'}{V^2}'),

    t('Geometric Meaning', 'The tangent of the angle that the tangent line makes with the positive x-axis direction equals the derivative at the point of tangency.'),
    r('Geometric Meaning', '', 'k = \\tg α = f\'(x_0)'),

    t('Physical Meaning', 'The derivative of the path S with respect to time t equals the instantaneous velocity.'),
    r('Physical Meaning', 'Velocity', 'v = S\'(t)'),
    r('Physical Meaning', 'Acceleration', 'a = v\'(t)')
  ]});

  /* --------------------------------------------------------------- 18 */
  SHEETS.push({ title: 'Integrals', topic: 'Інтеграл і первісна', rules: [
    t('Antiderivative', 'Every function has infinitely many antiderivatives, differing by a constant C.'),

    p('Table of Antiderivatives', '0', 'C'),
    p('Table of Antiderivatives', '1', 'x'),
    p('Table of Antiderivatives', 'x^n', '\\frac{x^{n+1}}{n+1}'),
    p('Table of Antiderivatives', '\\frac{1}{x}', '\\ln|x|'),
    p('Table of Antiderivatives', '\\frac{1}{\\sqrt{x}}', '2\\sqrt{x}'),
    p('Table of Antiderivatives', '\\sin x', '-\\cos x'),
    p('Table of Antiderivatives', '\\cos x', '\\sin x'),
    p('Table of Antiderivatives', '\\frac{1}{\\cos^2 x}', '\\tg x'),
    p('Table of Antiderivatives', 'e^x', 'e^x'),

    r('Definite Integral', '', '\\int_a^b f(x)\\,dx', '', 'a — lower limit, b — upper limit'),
    r('Definite Integral', 'Newton–Leibniz formula', '\\int_a^b f(x)\\,dx = F(b) - F(a)'),

    r('Properties', 'Integral of a sum', '\\int (f+g)\\,dx = \\int f\\,dx + \\int g\\,dx'),
    r('Properties', 'Swapping the limits', '\\int_a^b f\\,dx = -\\int_b^a f\\,dx'),
    w('Properties', 'If the upper and lower limits are equal, the integral equals 0.')
  ]});

  /* --------------------------------------------------------------- 19 */
  SHEETS.push({ title: 'Area & Integrals', topic: 'Інтеграл і первісна', rules: [
    t('Curvilinear Trapezoid', 'A curvilinear trapezoid is a figure bounded by the graph y = f(x), the x-axis, and the lines x = a and x = b.'),
    t('Curvilinear Trapezoid', 'To find the area, use the definite integral and apply the Newton–Leibniz formula.'),
    r('Curvilinear Trapezoid', '', '\\int_a^b f(x)\\,dx = F(b) - F(a)'),

    r('Area of a Curvilinear Trapezoid', 'Above the x-axis', 'S = \\int_a^b f(x)\\,dx', '', 'Integral with a plus sign.'),
    r('Area of a Curvilinear Trapezoid', 'Below the x-axis', 'S = -\\int_a^b f(x)\\,dx', '', 'Integral with a minus sign.'),

    r('Area Between Two Functions', '', 'S = \\int_a^b (f(x) - g(x))\\,dx', '',
      'f(x) is the upper function and g(x) is the lower function.'),
    w('Area Between Two Functions', 'Always read the problem carefully and decide whether an integral is appropriate before calculating.')
  ]});

  /* --------------------------------------------------------------- 20 */
  SHEETS.push({ title: 'Combinatorics', topic: 'Комбінаторика, ймовірність, статистика', rules: [
    r('Combinatorial Rules', 'Multiplication rule', '', '', 'AND — events happen together'),
    r('Combinatorial Rules', 'Addition rule', '', '', 'OR — events happen separately'),

    i('Types of Combinations', 'Permutations'),
    i('Types of Combinations', 'Arrangements'),
    i('Types of Combinations', 'Combinations'),
    t('Types of Combinations', 'Ask first: are all elements used? If yes — permutations. If not — arrangements when order matters, combinations when it does not.'),

    t('Permutations', 'Number of permutations = factorial of the count. Order matters!'),
    r('Permutations', '', 'P(m) = m!'),
    t('Permutations', 'Factorial = product of all numbers up to that number. Rearranging elements gives a new combination.'),

    t('Arrangements', 'Order matters, but not all elements are used.'),
    r('Arrangements', '', 'A_n^m = \\frac{n!}{(n-m)!}', '', 'n — total elements, m — elements to choose'),

    t('Combinations', 'Rearranging elements gives the same combination. Order does NOT matter!'),
    r('Combinations', '', 'C_n^m = \\frac{n!}{m!(n-m)!}', '', 'n — total elements, m — elements to choose')
  ]});

  window.SHEETS_DATA = SHEETS;
})();
