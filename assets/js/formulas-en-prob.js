/* База формул англійською: комбінаторика, ймовірність, статистика.
   Див. formulas-en-algebra.js. */

(function () {
  'use strict';

  var E = window.FORMULAS_EN = window.FORMULAS_EN || { sections: {}, items: {} };
  function sec(id, title, note) { E.sections[id] = { title: title, note: note || '' }; }
  function f(id, t, o) { o = o || {}; o.t = t; E.items[id] = o; }

  /* ================================================================ Combinatorics */
  sec('comb', 'Combinatorics',
    'The first question in every problem is whether order matters. If it does — arrangements (or permutations); if not — combinations.');

  f('comb-rule', 'Rule of product', {
    w: 'The first choice can be made in $n_1$ ways, after each of them the second in $n_2$ ways, and so on.',
    ex: 'A plate of 3 digits and 2 letters (out of 26): $10^3 \\cdot 26^2 = 676\\,000$ options.',
    p: [
      'Every way of making the first choice has $n_2$ continuations, so there are $n_1 n_2$ pairs “first + second”: they can be written as a table with $n_1$ rows and $n_2$ columns.',
      'Then step by step in the same way (rigorously — by induction on the number of steps).'
    ],
    note: 'Rule of sum: if an object is chosen either from one group ($n$ options) or from another ($m$ options), and the groups do not overlap, there are $n + m$ options in total.'
  });

  f('comb-perm', 'Permutations', {
    w: 'The number of ways to order $n$ different elements. $0! = 1$ by convention.',
    ex: 'Seating 5 students on 5 chairs: $5! = 120$ ways.',
    p: [
      'The first place can take any of the $n$ elements, the second any of the remaining $n - 1$, …, the last one — the single element left.',
      'By the rule of product: $n(n - 1) \\cdot \\ldots \\cdot 1 = n!$.'
    ]
  });

  f('comb-arr', 'Arrangements', {
    w: 'Ordered selections of $k$ elements out of $n$ — order matters.',
    ex: 'Choosing a class captain and a deputy out of 25 students: $A_{25}^2 = 25 \\cdot 24 = 600$.',
    p: [
      'The first place — $n$ ways, the second — $n - 1$, …, the $k$-th — $n - k + 1$.',
      'By the rule of product $A_n^k = n(n - 1)\\ldots(n - k + 1)$. Multiplying and dividing by $(n - k)!$ gives $\\frac{n!}{(n - k)!}$.'
    ]
  });

  f('comb-c', 'Combinations', {
    w: 'Unordered selections of $k$ elements out of $n$ — order does not matter.',
    ex: 'Choosing 3 problems out of 10: $C_{10}^3 = \\frac{10 \\cdot 9 \\cdot 8}{3!} = 120$.',
    p: [
      'Each combination of $k$ elements can be ordered in $k!$ ways — giving arrangements. Different combinations give different arrangements.',
      'So $A_n^k = C_n^k \\cdot k!$, whence $C_n^k = \\frac{A_n^k}{k!} = \\frac{n!}{k!\\,(n - k)!}$.'
    ],
    err: 'Confusing them with arrangements. If the chosen ones are equal in status (a team, a set) — combinations; if they have different roles (captain and deputy, 1st and 2nd place) — arrangements.'
  });

  f('comb-sym', 'Symmetry of combinations', {
    ex: '$C_{20}^{18} = C_{20}^2 = 190$',
    p: [
      'Choosing the $k$ elements we take is the same as choosing the $n - k$ elements we leave.',
      'Or by the formula: the expression $\\frac{n!}{k!\\,(n - k)!}$ does not change when $k$ is replaced by $n - k$.'
    ]
  });

  f('comb-pascal', 'Pascal’s rule', {
    p: [
      'Count the ways to choose $k + 1$ elements out of $n + 1$. Mark one of the elements as $X$.',
      'Selections containing $X$: the other $k$ elements are taken from the remaining $n$ — $C_n^k$ ways.',
      'Selections without $X$: all $k + 1$ elements come from the other $n$ — $C_n^{k+1}$ ways.',
      'Together $C_n^k + C_n^{k+1}$, while the total number of such selections is $C_{n+1}^{k+1}$.'
    ],
    note: 'Hence Pascal’s triangle: each number is the sum of the two numbers above it.'
  });

  f('comb-binom', 'Binomial theorem', {
    ex: '$(a + b)^4 = a^4 + 4a^3b + 6a^2b^2 + 4ab^3 + b^4$',
    p: [
      'Expanding $(a + b)(a + b)\\ldots(a + b)$, from each of the $n$ brackets we take either $a$ or $b$ and multiply.',
      'The term $a^{n-k}b^k$ appears as many times as there are ways to choose the $k$ brackets from which $b$ is taken — i.e. $C_n^k$ times.'
    ],
    note: 'A step-by-step derivation with Pascal’s triangle is in the “Binomial theorem” topic of the mathematics map.'
  });

  f('comb-2n', 'Sum of binomial coefficients', {
    p: [
      'Put $a = b = 1$ in the binomial theorem: $(1 + 1)^n = \\sum C_n^k$.',
      'Alternatively: the left-hand side is the number of all subsets of an $n$-element set, grouped by size. The right-hand side is the same number, since each element is either taken or not: 2 options $n$ times.'
    ]
  });

  f('comb-rep', 'Permutations with repetition', {
    w: 'How many different “words” can be made of $n$ letters, where the first letter repeats $n_1$ times, the second $n_2$ times, and so on.',
    ex: 'The word “MAMA”: $\\frac{4!}{2!\\,2!} = 6$ different words.',
    p: [
      'If all letters were different, there would be $n!$ words.',
      'But permuting equal letters among themselves ($n_1!$ ways for the first, $n_2!$ for the second, …) does not change the word.',
      'So every word has been counted $n_1!\\,n_2!\\ldots n_k!$ times — and we divide by that.'
    ]
  });

  /* ================================================================ Probability */
  sec('prob', 'Probability',
    'In the classical model probability is the share of favourable outcomes among equally likely ones. The other formulas are ways of counting these outcomes.');

  f('p-classic', 'Classical probability', {
    w: '$n$ is the number of all equally likely outcomes, $m$ is the number of outcomes favourable to the event $A$. $0 \\le P(A) \\le 1$.',
    ex: 'Rolling a die: $P(\\text{even}) = \\frac{3}{6} = \\frac{1}{2}$.',
    note: 'This is a definition.',
    err: 'The outcomes must be equally likely. The sum of two dice: “7” and “2” are not equally likely — 6 and 1 outcomes out of 36.'
  });

  f('p-compl', 'Complementary event', {
    ex: 'At least one six in 3 rolls: $1 - \\left(\\frac{5}{6}\\right)^3 = \\frac{91}{216}$.',
    p: [
      'The outcomes favourable to $\\bar{A}$ are all those not favourable to $A$: there are $n - m$ of them.',
      '$P(\\bar{A}) = \\frac{n - m}{n} = 1 - \\frac{m}{n}$.'
    ],
    note: '“At least one” problems are almost always easier through the complementary event “none”.'
  });

  f('p-union', 'Addition rule', {
    w: 'For mutually exclusive events ($A \\cap B = \\varnothing$): $P(A \\cup B) = P(A) + P(B)$.',
    p: [
      'Count the favourable outcomes: in the sum $|A| + |B|$ the common outcomes are counted twice, so $|A \\cup B| = |A| + |B| - |A \\cap B|$.',
      'Divide by $n$.'
    ]
  });

  f('p-indep', 'Independent events', {
    w: 'Events are independent if one happening does not change the probability of the other — for example, when they concern different rolls.',
    p: [
      'Let the first trial have $n_1$ equally likely outcomes, $m_1$ of them favourable to $A$; the second — $n_2$ outcomes and $m_2$ favourable to $B$.',
      'Pairs of outcomes are equally likely, and there are $n_1 n_2$ of them; favourable to both events — $m_1 m_2$ (rule of product).',
      'So $P(A \\cap B) = \\frac{m_1 m_2}{n_1 n_2} = \\frac{m_1}{n_1} \\cdot \\frac{m_2}{n_2}$.'
    ]
  });

  f('p-cond', 'Conditional probability', {
    w: '$P(B) > 0$. Hence the multiplication rule: $P(A \\cap B) = P(B) \\cdot P(A|B)$.',
    ex: 'Two cards from a 36-card deck without replacement. $P(\\text{both aces}) = \\frac{4}{36} \\cdot \\frac{3}{35} = \\frac{1}{105}$.',
    p: [
      'Once we know that $B$ has happened, “all outcomes” are only the outcomes in $B$, and the favourable ones among them are those in both $A$ and $B$.',
      'So $P(A|B) = \\frac{|A \\cap B|}{|B|} = \\frac{|A \\cap B| / n}{|B| / n} = \\frac{P(A \\cap B)}{P(B)}$.'
    ]
  });

  f('p-bernoulli', 'Binomial probability (Bernoulli’s formula)', {
    w: '$n$ independent repetitions, in each a “success” has probability $p$. $P_n(k)$ is the probability of exactly $k$ successes.',
    ex: 'Exactly 2 sixes in 4 rolls: $C_4^2 \\left(\\frac{1}{6}\\right)^2 \\left(\\frac{5}{6}\\right)^2 = \\frac{25}{216}$.',
    p: [
      'One particular sequence with successes in $k$ chosen places has probability $p^k q^{n-k}$ — the repetitions are independent.',
      'The places for the successes can be chosen in $C_n^k$ ways. These sequences are mutually exclusive, so their equal probabilities add up.'
    ]
  });

  f('p-geom', 'Geometric probability', {
    w: 'A point is thrown at random into a figure of area $S$; $S_A$ is the area of the part where landing is favourable. On a segment use lengths instead of areas, in a solid — volumes.',
    ex: 'A point in a square with side 2 lands in the inscribed disc with probability $\\frac{\\pi \\cdot 1^2}{4} = \\frac{\\pi}{4}$.',
    note: 'This is a definition: “at random” here means exactly that the probability is proportional to the area.'
  });

  /* ================================================================ Statistics */
  sec('stat', 'Statistics');

  f('stat-mean', 'Mean, median, mode', {
    w: 'The median is the middle value of the ordered data (for even $n$ — the average of the two middle values). The mode is the most frequent value. The range is the difference between the largest and the smallest.',
    ex: 'Data $2, 3, 3, 7, 10$: mean $5$, median $3$, mode $3$, range $8$.',
    note: 'The mean is sensitive to outliers, the median is not: for salaries 10, 10, 12 and 100 the mean is 33 and the median is 11.',
    err: 'The median is taken from ordered data. For $7, 2, 10$ the median is $7$, not $2$.'
  });

  f('stat-disp', 'Variance', {
    w: '$\\overline{x^2}$ is the mean of the squares. The standard deviation is $\\sigma = \\sqrt{D}$.',
    p: [
      'Expand the squares: $\\sum (x_i - \\bar{x})^2 = \\sum x_i^2 - 2\\bar{x}\\sum x_i + n\\bar{x}^2$.',
      'Since $\\sum x_i = n\\bar{x}$, we get $\\sum x_i^2 - 2n\\bar{x}^2 + n\\bar{x}^2 = \\sum x_i^2 - n\\bar{x}^2$.',
      'Divide by $n$: $D = \\overline{x^2} - \\bar{x}^2$.'
    ]
  });
})();
