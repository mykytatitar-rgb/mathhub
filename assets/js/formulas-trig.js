/* База формул: тригонометрія.

   Уся тригонометрія тут виводиться з одного місця — косинуса різниці,
   доведеного через скалярний добуток. З нього — синус суми, з нього —
   подвійний кут, з нього — пониження степеня й половинний кут, і так далі.
   Поле uses показує цей ланцюжок. Опис полів — у formulas-algebra.js. */

(function () {
  'use strict';

  var D = window.FORMULAS = window.FORMULAS || { sections: [], items: [] };
  var cur = null;
  function sec(id, dom, title, map, note) {
    D.sections.push({ id: id, dom: dom, title: title, map: map, note: note || '' });
    cur = id;
  }
  function f(id, t, formula, o) {
    o = o || {};
    o.id = id; o.t = t; o.f = formula; o.sec = cur;
    D.items.push(o);
  }

  // одиничне коло з осями: спільна основа кількох малюнків
  function circle(extra) {
    var F = {
      v: [210, 200],
      p: { O: [105, 100], L: [15, 100], R: [196, 100], T: [105, 12], B: [105, 190] },
      s: 'L-R T-B', c: [['O', 78]], q: 'L R T B', lp: { O: [-10, 13] }
    };
    Object.keys(extra).forEach(function (k) {
      if (k === 'p') Object.keys(extra.p).forEach(function (n) { F.p[n] = extra.p[n]; });
      else if (k === 'q') F.q = F.q + ' ' + extra.q;
      else if (k === 's') F.s = F.s + ' ' + extra.s;
      else F[k] = extra[k];
    });
    return F;
  }

  /* ================================================================ Основні тотожності */
  sec('trig-base', 'trig', 'Основні тотожності', 'an.trigidentities',
    'Синус і косинус — координати точки на одиничному колі. З цього означення випливають і основна тотожність, і парність, і періодичність.');

  f('trig-def', 'Синус, косинус, тангенс', '\\cos\\alpha = x, \\quad \\sin\\alpha = y, \\quad \\tg\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha}, \\quad \\ctg\\alpha = \\frac{\\cos\\alpha}{\\sin\\alpha}', {
    en: 'Unit circle definitions', map: 'an.radian',
    w: '$(x; y)$ — точка одиничного кола, у яку переходить точка $(1; 0)$ при повороті навколо початку координат на кут $\\alpha$.',
    fig: circle({ p: { P: [155.1, 40.3], X: [155.1, 100], A: [183, 100] }, s: 'O-P', d: 'P-X',
      r: 'P-X-O', q: 'X A', a: [['A', 'O', 'P', 'α']],
      t: [[130, 116, 'cos α', 'm'], [178, 74, 'sin α', 'm'], [120, 60, '1', 'm']] }),
    note: 'Це означення. Для гострого кута воно збігається зі шкільним «протилежний катет до гіпотенузи»: гіпотенуза тут дорівнює 1.'
  });

  f('trig-pyth', 'Основна тригонометрична тотожність', '\\sin^2\\alpha + \\cos^2\\alpha = 1', {
    en: 'Pythagorean identity', uses: ['trig-def', 'crd-circle'],
    ex: 'Якщо $\\sin\\alpha = \\frac{3}{5}$ і $\\alpha$ у II чверті, то $\\cos\\alpha = -\\sqrt{1 - \\frac{9}{25}} = -\\frac{4}{5}$.',
    p: [
      'Точка $(\\cos\\alpha; \\sin\\alpha)$ лежить на одиничному колі, а його рівняння — $x^2 + y^2 = 1$.',
      'Підставивши координати точки, отримуємо $\\cos^2\\alpha + \\sin^2\\alpha = 1$.'
    ],
    err: 'Добуваючи корінь, забувають про знак: $\\cos\\alpha = \\pm\\sqrt{1 - \\sin^2\\alpha}$, і знак визначає чверть.'
  });

  f('trig-tgctg', 'Добуток тангенса й котангенса', '\\tg\\alpha \\cdot \\ctg\\alpha = 1', {
    en: 'Tangent times cotangent', uses: ['trig-def'],
    w: '$\\alpha \\ne \\frac{\\pi k}{2}$ — інакше один із множників не існує.',
    p: [
      '$\\tg\\alpha \\cdot \\ctg\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha} \\cdot \\frac{\\cos\\alpha}{\\sin\\alpha} = 1$.'
    ]
  });

  f('trig-1tg', 'Звʼязок тангенса з косинусом', '1 + \\tg^2\\alpha = \\frac{1}{\\cos^2\\alpha}, \\quad 1 + \\ctg^2\\alpha = \\frac{1}{\\sin^2\\alpha}', {
    en: 'Tangent–secant identity', uses: ['trig-pyth'],
    w: 'Перша — при $\\cos\\alpha \\ne 0$, друга — при $\\sin\\alpha \\ne 0$.',
    ex: 'Якщо $\\tg\\alpha = 2$, то $\\cos^2\\alpha = \\frac{1}{1 + 4} = \\frac{1}{5}$.',
    p: [
      'Поділимо основну тотожність $\\sin^2\\alpha + \\cos^2\\alpha = 1$ на $\\cos^2\\alpha$: $\\tg^2\\alpha + 1 = \\frac{1}{\\cos^2\\alpha}$.',
      'Поділивши на $\\sin^2\\alpha$, отримаємо другу: $1 + \\ctg^2\\alpha = \\frac{1}{\\sin^2\\alpha}$.'
    ]
  });

  f('trig-values', 'Значення для 30°, 45°, 60°', '\\sin 30^\\circ = \\cos 60^\\circ = \\frac{1}{2} \\\\ \\sin 45^\\circ = \\cos 45^\\circ = \\frac{\\sqrt{2}}{2} \\\\ \\sin 60^\\circ = \\cos 30^\\circ = \\frac{\\sqrt{3}}{2}', {
    en: 'Exact values', uses: ['right-pyth'], map: 'geo.righttrig',
    w: 'Тангенси: $\\tg 30^\\circ = \\frac{\\sqrt{3}}{3}$, $\\tg 45^\\circ = 1$, $\\tg 60^\\circ = \\sqrt{3}$.',
    fig: { v: [200, 175], p: { A: [20, 150], B: [180, 150], C: [100, 11.4], H: [100, 150] },
      s: 'AB BC CA', d: 'CH', r: 'CHB', a: [['H', 'A', 'C', '60°'], ['A', 'C', 'H', '30°', 26]],
      t: [[60, 166, '1', 'm'], [48, 76, '2', 'm'], [112, 90, '√3', 'm']] },
    p: [
      'Візьмемо рівносторонній трикутник зі стороною 2. Висота ділить його на два прямокутні трикутники з кутами $30^\\circ$ і $60^\\circ$, гіпотенузою 2 і меншим катетом 1.',
      'За теоремою Піфагора другий катет дорівнює $\\sqrt{4 - 1} = \\sqrt{3}$.',
      'Звідси $\\sin 30^\\circ = \\frac{1}{2}$, $\\sin 60^\\circ = \\frac{\\sqrt{3}}{2}$, $\\cos 30^\\circ = \\frac{\\sqrt{3}}{2}$, $\\cos 60^\\circ = \\frac{1}{2}$.',
      'У рівнобедреному прямокутному трикутнику з катетами 1 гіпотенуза $\\sqrt{2}$, тож $\\sin 45^\\circ = \\cos 45^\\circ = \\frac{1}{\\sqrt{2}} = \\frac{\\sqrt{2}}{2}$.'
    ]
  });

  f('trig-parity', 'Парність і непарність', '\\cos(-\\alpha) = \\cos\\alpha, \\quad \\sin(-\\alpha) = -\\sin\\alpha, \\quad \\tg(-\\alpha) = -\\tg\\alpha', {
    en: 'Even and odd identities', uses: ['trig-def'], map: 'an.trigfn',
    p: [
      'Поворот на $-\\alpha$ — дзеркальне відображення повороту на $\\alpha$ відносно осі $Ox$.',
      'При такому відображенні абсциса точки не змінюється, а ордината змінює знак: $\\cos(-\\alpha) = \\cos\\alpha$, $\\sin(-\\alpha) = -\\sin\\alpha$.',
      'Тангенс і котангенс — частки непарної й парної функцій, тому непарні.'
    ]
  });

  f('trig-period', 'Періодичність', '\\sin(\\alpha + 2\\pi k) = \\sin\\alpha, \\quad \\cos(\\alpha + 2\\pi k) = \\cos\\alpha, \\quad \\tg(\\alpha + \\pi k) = \\tg\\alpha', {
    en: 'Periodicity', uses: ['trig-def'], map: 'an.trigfn',
    w: '$k$ — будь-яке ціле число. Найменший додатний період синуса й косинуса — $2\\pi$, тангенса й котангенса — $\\pi$.',
    p: [
      'Поворот на $2\\pi$ — повний оберт: точка повертається на місце, тож синус і косинус не змінюються.',
      'Поворот на $\\pi$ переводить точку $(x; y)$ у діаметрально протилежну $(-x; -y)$.',
      'Обидві координати змінюють знак, а їхня частка — ні: $\\tg(\\alpha + \\pi) = \\frac{-y}{-x} = \\frac{y}{x} = \\tg\\alpha$.'
    ]
  });

  /* ================================================================ Формули додавання */
  sec('trig-add', 'trig', 'Формули додавання', 'an.trigformulas',
    'Головна формула розділу — косинус різниці. Усі інші формули тригонометрії виводяться з неї.');

  f('cos-diff', 'Косинус різниці', '\\cos(\\alpha - \\beta) = \\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta', {
    en: 'Cosine of a difference', uses: ['trig-def', 'vec-dot', 'trig-parity', 'trig-period'],
    pt: 'Доведення (через скалярний добуток)',
    fig: circle({ p: { A: [131.7, 26.7], Bp: [178.3, 73.3], X: [183, 100] }, s: 'O-A O-Bp', d: 'A-Bp',
      q: 'X', n: { Bp: 'B' }, a: [['Bp', 'O', 'A', 'α − β', 30], ['X', 'O', 'Bp', 'β', 50]] }),
    p: [
      'Точки одиничного кола $A = (\\cos\\alpha; \\sin\\alpha)$ і $B = (\\cos\\beta; \\sin\\beta)$ відповідають поворотам на кути $\\alpha$ і $\\beta$.',
      'Вектори $\\vec{OA}$ і $\\vec{OB}$ мають довжину 1. Кут між ними $\\varphi$ відрізняється від $\\alpha - \\beta$ лише знаком і цілими обертами, тож $\\cos\\varphi = \\cos(\\alpha - \\beta)$ (косинус парний і має період $2\\pi$).',
      'Скалярний добуток через координати: $\\vec{OA} \\cdot \\vec{OB} = \\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta$.',
      'Той самий добуток через довжини й кут: $|\\vec{OA}| \\cdot |\\vec{OB}| \\cdot \\cos\\varphi = \\cos(\\alpha - \\beta)$.',
      'Прирівнявши два вирази для одного числа, отримуємо формулу.'
    ]
  });

  f('cos-sum', 'Косинус суми', '\\cos(\\alpha + \\beta) = \\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta', {
    en: 'Cosine of a sum', uses: ['cos-diff', 'trig-parity'],
    ex: '$\\cos 75^\\circ = \\cos 45^\\circ\\cos 30^\\circ - \\sin 45^\\circ\\sin 30^\\circ = \\frac{\\sqrt{6} - \\sqrt{2}}{4}$',
    p: [
      'Запишемо $\\alpha + \\beta = \\alpha - (-\\beta)$ і застосуємо косинус різниці: $$\\cos(\\alpha + \\beta) = \\cos\\alpha\\cos(-\\beta) + \\sin\\alpha\\sin(-\\beta).$$',
      'Косинус парний, синус непарний: $\\cos(-\\beta) = \\cos\\beta$, $\\sin(-\\beta) = -\\sin\\beta$. Звідси формула.'
    ]
  });

  f('trig-cofunc', 'Доповняльний кут', '\\cos\\left(\\frac{\\pi}{2} - \\alpha\\right) = \\sin\\alpha, \\quad \\sin\\left(\\frac{\\pi}{2} - \\alpha\\right) = \\cos\\alpha', {
    en: 'Cofunction identities', uses: ['cos-diff'],
    w: 'У прямокутному трикутнику: синус одного гострого кута дорівнює косинусу другого.',
    p: [
      'За косинусом різниці: $\\cos\\left(\\frac{\\pi}{2} - \\alpha\\right) = \\cos\\frac{\\pi}{2}\\cos\\alpha + \\sin\\frac{\\pi}{2}\\sin\\alpha = 0 \\cdot \\cos\\alpha + 1 \\cdot \\sin\\alpha = \\sin\\alpha$.',
      'Підставимо в цю рівність $\\frac{\\pi}{2} - \\alpha$ замість $\\alpha$: $\\cos\\alpha = \\sin\\left(\\frac{\\pi}{2} - \\alpha\\right)$.'
    ]
  });

  f('sin-sum', 'Синус суми й різниці', '\\sin(\\alpha \\pm \\beta) = \\sin\\alpha\\cos\\beta \\pm \\cos\\alpha\\sin\\beta', {
    en: 'Sine of a sum', uses: ['cos-diff', 'trig-cofunc', 'trig-parity'],
    p: [
      'Перейдемо до косинуса: $\\sin(\\alpha + \\beta) = \\cos\\left(\\frac{\\pi}{2} - \\alpha - \\beta\\right) = \\cos\\left(\\left(\\frac{\\pi}{2} - \\alpha\\right) - \\beta\\right)$.',
      'За косинусом різниці: $$\\cos\\left(\\frac{\\pi}{2} - \\alpha\\right)\\cos\\beta + \\sin\\left(\\frac{\\pi}{2} - \\alpha\\right)\\sin\\beta = \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta.$$',
      'Для різниці замінимо $\\beta$ на $-\\beta$: $\\sin(\\alpha - \\beta) = \\sin\\alpha\\cos\\beta - \\cos\\alpha\\sin\\beta$.'
    ]
  });

  f('tg-sum', 'Тангенс суми й різниці', '\\tg(\\alpha \\pm \\beta) = \\frac{\\tg\\alpha \\pm \\tg\\beta}{1 \\mp \\tg\\alpha\\tg\\beta}', {
    en: 'Tangent of a sum', uses: ['sin-sum', 'cos-sum'],
    w: '$\\cos\\alpha$, $\\cos\\beta$, $\\cos(\\alpha \\pm \\beta)$ не дорівнюють нулю.',
    p: [
      '$$\\tg(\\alpha + \\beta) = \\frac{\\sin(\\alpha + \\beta)}{\\cos(\\alpha + \\beta)} = \\frac{\\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta}{\\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta}.$$',
      'Поділимо чисельник і знаменник на $\\cos\\alpha\\cos\\beta \\ne 0$: отримаємо $\\frac{\\tg\\alpha + \\tg\\beta}{1 - \\tg\\alpha\\tg\\beta}$.',
      'Для різниці замінимо $\\beta$ на $-\\beta$ (тангенс непарний).'
    ]
  });

  /* ================================================================ Подвійний і половинний кут */
  sec('trig-double', 'trig', 'Подвійний і половинний кут', 'an.trigformulas',
    'Формули подвійного кута — формули додавання з $\\beta = \\alpha$. Прочитані справа наліво, вони дають пониження степеня й половинний кут.');

  f('sin-2', 'Синус подвійного кута', '\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha', {
    en: 'Double-angle formula for sine', uses: ['sin-sum'],
    ex: '$\\sin 15^\\circ \\cos 15^\\circ = \\frac{1}{2}\\sin 30^\\circ = \\frac{1}{4}$',
    p: [
      '$\\sin 2\\alpha = \\sin(\\alpha + \\alpha) = \\sin\\alpha\\cos\\alpha + \\cos\\alpha\\sin\\alpha = 2\\sin\\alpha\\cos\\alpha$.'
    ],
    err: '$\\sin 2\\alpha \\ne 2\\sin\\alpha$: $\\sin 60^\\circ = \\frac{\\sqrt{3}}{2}$, а $2\\sin 30^\\circ = 1$.'
  });

  f('cos-2', 'Косинус подвійного кута', '\\cos 2\\alpha = \\cos^2\\alpha - \\sin^2\\alpha = 2\\cos^2\\alpha - 1 = 1 - 2\\sin^2\\alpha', {
    en: 'Double-angle formulas for cosine', uses: ['cos-sum', 'trig-pyth'],
    p: [
      '$\\cos 2\\alpha = \\cos(\\alpha + \\alpha) = \\cos\\alpha\\cos\\alpha - \\sin\\alpha\\sin\\alpha = \\cos^2\\alpha - \\sin^2\\alpha$.',
      'Замінивши $\\sin^2\\alpha = 1 - \\cos^2\\alpha$, отримаємо $2\\cos^2\\alpha - 1$.',
      'Замінивши $\\cos^2\\alpha = 1 - \\sin^2\\alpha$, отримаємо $1 - 2\\sin^2\\alpha$.'
    ]
  });

  f('tg-2', 'Тангенс подвійного кута', '\\tg 2\\alpha = \\frac{2\\tg\\alpha}{1 - \\tg^2\\alpha}', {
    en: 'Double-angle formula for tangent', uses: ['tg-sum'],
    w: '$\\tg\\alpha \\ne \\pm 1$, $\\cos\\alpha \\ne 0$.',
    p: [
      'У формулі тангенса суми покладемо $\\beta = \\alpha$: $\\tg 2\\alpha = \\frac{\\tg\\alpha + \\tg\\alpha}{1 - \\tg\\alpha \\cdot \\tg\\alpha}$.'
    ]
  });

  f('trig-lower', 'Пониження степеня', '\\cos^2\\alpha = \\frac{1 + \\cos 2\\alpha}{2}, \\quad \\sin^2\\alpha = \\frac{1 - \\cos 2\\alpha}{2}', {
    en: 'Power-reduction formulas', uses: ['cos-2'],
    ex: '$\\sin^2 15^\\circ = \\frac{1 - \\cos 30^\\circ}{2} = \\frac{2 - \\sqrt{3}}{4}$',
    p: [
      'З формули $\\cos 2\\alpha = 2\\cos^2\\alpha - 1$ виразимо $\\cos^2\\alpha = \\frac{1 + \\cos 2\\alpha}{2}$.',
      'З формули $\\cos 2\\alpha = 1 - 2\\sin^2\\alpha$ виразимо $\\sin^2\\alpha = \\frac{1 - \\cos 2\\alpha}{2}$.'
    ],
    note: 'Корисно для інтегралів: $\\int \\sin^2 x\\,dx = \\frac{x}{2} - \\frac{\\sin 2x}{4} + C$.'
  });

  f('trig-half', 'Половинний кут', '\\sin\\frac{\\alpha}{2} = \\pm\\sqrt{\\frac{1 - \\cos\\alpha}{2}}, \\quad \\cos\\frac{\\alpha}{2} = \\pm\\sqrt{\\frac{1 + \\cos\\alpha}{2}}, \\quad \\tg\\frac{\\alpha}{2} = \\frac{\\sin\\alpha}{1 + \\cos\\alpha} = \\frac{1 - \\cos\\alpha}{\\sin\\alpha}', {
    en: 'Half-angle formulas', uses: ['trig-lower', 'sin-2'],
    w: 'Знак перед коренем — за чвертю, у якій лежить кут $\\frac{\\alpha}{2}$. Формули для тангенса знака не потребують.',
    p: [
      'Пониження степеня для кута $\\frac{\\alpha}{2}$: $\\sin^2\\frac{\\alpha}{2} = \\frac{1 - \\cos\\alpha}{2}$, $\\cos^2\\frac{\\alpha}{2} = \\frac{1 + \\cos\\alpha}{2}$ — добуваємо корінь.',
      'Для тангенса помножимо чисельник і знаменник на $2\\cos\\frac{\\alpha}{2}$: $$\\tg\\frac{\\alpha}{2} = \\frac{2\\sin\\frac{\\alpha}{2}\\cos\\frac{\\alpha}{2}}{2\\cos^2\\frac{\\alpha}{2}} = \\frac{\\sin\\alpha}{1 + \\cos\\alpha}.$$',
      'Помноживши натомість на $2\\sin\\frac{\\alpha}{2}$, отримаємо $\\frac{2\\sin^2\\frac{\\alpha}{2}}{2\\sin\\frac{\\alpha}{2}\\cos\\frac{\\alpha}{2}} = \\frac{1 - \\cos\\alpha}{\\sin\\alpha}$.'
    ]
  });

  f('trig-triple', 'Потрійний кут', '\\sin 3\\alpha = 3\\sin\\alpha - 4\\sin^3\\alpha, \\quad \\cos 3\\alpha = 4\\cos^3\\alpha - 3\\cos\\alpha', {
    en: 'Triple-angle formulas', uses: ['sin-sum', 'cos-sum', 'sin-2', 'cos-2', 'trig-pyth'],
    p: [
      '$\\sin 3\\alpha = \\sin(2\\alpha + \\alpha) = \\sin 2\\alpha\\cos\\alpha + \\cos 2\\alpha\\sin\\alpha = 2\\sin\\alpha\\cos^2\\alpha + (1 - 2\\sin^2\\alpha)\\sin\\alpha$.',
      'Замінимо $\\cos^2\\alpha = 1 - \\sin^2\\alpha$: $2\\sin\\alpha - 2\\sin^3\\alpha + \\sin\\alpha - 2\\sin^3\\alpha = 3\\sin\\alpha - 4\\sin^3\\alpha$.',
      '$\\cos 3\\alpha = \\cos 2\\alpha\\cos\\alpha - \\sin 2\\alpha\\sin\\alpha = (2\\cos^2\\alpha - 1)\\cos\\alpha - 2\\sin^2\\alpha\\cos\\alpha$.',
      'Замінимо $\\sin^2\\alpha = 1 - \\cos^2\\alpha$: $2\\cos^3\\alpha - \\cos\\alpha - 2\\cos\\alpha + 2\\cos^3\\alpha = 4\\cos^3\\alpha - 3\\cos\\alpha$.'
    ]
  });

  f('trig-univ', 'Універсальна підстановка', '\\sin\\alpha = \\frac{2t}{1 + t^2}, \\quad \\cos\\alpha = \\frac{1 - t^2}{1 + t^2}, \\quad t = \\tg\\frac{\\alpha}{2}', {
    en: 'Tangent half-angle substitution', uses: ['sin-2', 'cos-2', 'trig-pyth'],
    w: '$\\alpha \\ne \\pi + 2\\pi k$ — там $\\tg\\frac{\\alpha}{2}$ не існує. Розвʼязуючи рівняння цією заміною, такі точки перевіряють окремо.',
    p: [
      'За формулою подвійного кута й основною тотожністю (поділимо на $1$): $$\\sin\\alpha = \\frac{2\\sin\\frac{\\alpha}{2}\\cos\\frac{\\alpha}{2}}{\\sin^2\\frac{\\alpha}{2} + \\cos^2\\frac{\\alpha}{2}}.$$',
      'Поділимо чисельник і знаменник на $\\cos^2\\frac{\\alpha}{2} \\ne 0$: отримаємо $\\frac{2t}{t^2 + 1}$.',
      'Так само $\\cos\\alpha = \\frac{\\cos^2\\frac{\\alpha}{2} - \\sin^2\\frac{\\alpha}{2}}{\\cos^2\\frac{\\alpha}{2} + \\sin^2\\frac{\\alpha}{2}} = \\frac{1 - t^2}{1 + t^2}$.'
    ]
  });

  /* ================================================================ Сума й добуток */
  sec('trig-sum', 'trig', 'Сума й добуток', 'an.trigformulas',
    'Сума синусів чи косинусів перетворюється на добуток — і навпаки. Це основний прийом у тригонометричних рівняннях: добуток дорівнює нулю, коли нулю дорівнює один із множників.');

  f('sum-sin', 'Сума синусів', '\\sin\\alpha + \\sin\\beta = 2\\sin\\frac{\\alpha + \\beta}{2}\\cos\\frac{\\alpha - \\beta}{2}', {
    en: 'Sum-to-product for sine', uses: ['sin-sum'],
    p: [
      'Позначимо $x = \\frac{\\alpha + \\beta}{2}$, $y = \\frac{\\alpha - \\beta}{2}$. Тоді $\\alpha = x + y$, $\\beta = x - y$.',
      'За формулами синуса суми й різниці: $$\\sin(x + y) + \\sin(x - y) = (\\sin x\\cos y + \\cos x\\sin y) + (\\sin x\\cos y - \\cos x\\sin y) = 2\\sin x\\cos y.$$'
    ]
  });

  f('diff-sin', 'Різниця синусів', '\\sin\\alpha - \\sin\\beta = 2\\sin\\frac{\\alpha - \\beta}{2}\\cos\\frac{\\alpha + \\beta}{2}', {
    en: 'Difference-to-product for sine', uses: ['sin-sum'],
    p: [
      'Та сама заміна $\\alpha = x + y$, $\\beta = x - y$: $$\\sin(x + y) - \\sin(x - y) = 2\\cos x\\sin y.$$'
    ]
  });

  f('sum-cos', 'Сума косинусів', '\\cos\\alpha + \\cos\\beta = 2\\cos\\frac{\\alpha + \\beta}{2}\\cos\\frac{\\alpha - \\beta}{2}', {
    en: 'Sum-to-product for cosine', uses: ['cos-sum', 'cos-diff'],
    p: [
      'Заміна $\\alpha = x + y$, $\\beta = x - y$: $$\\cos(x + y) + \\cos(x - y) = (\\cos x\\cos y - \\sin x\\sin y) + (\\cos x\\cos y + \\sin x\\sin y) = 2\\cos x\\cos y.$$'
    ]
  });

  f('diff-cos', 'Різниця косинусів', '\\cos\\alpha - \\cos\\beta = -2\\sin\\frac{\\alpha + \\beta}{2}\\sin\\frac{\\alpha - \\beta}{2}', {
    en: 'Difference-to-product for cosine', uses: ['cos-sum', 'cos-diff'],
    p: [
      'Заміна $\\alpha = x + y$, $\\beta = x - y$: $$\\cos(x + y) - \\cos(x - y) = -2\\sin x\\sin y.$$'
    ],
    err: 'Губиться мінус перед добутком. Перевірка: при $\\alpha = 0$, $\\beta = \\pi$ ліворуч $1 - (-1) = 2$, праворуч $-2\\sin\\frac{\\pi}{2}\\sin\\left(-\\frac{\\pi}{2}\\right) = 2$.'
  });

  f('prod-sum', 'Добуток у суму', '\\sin\\alpha\\cos\\beta = \\frac{\\sin(\\alpha + \\beta) + \\sin(\\alpha - \\beta)}{2} \\\\ \\cos\\alpha\\cos\\beta = \\frac{\\cos(\\alpha - \\beta) + \\cos(\\alpha + \\beta)}{2} \\\\ \\sin\\alpha\\sin\\beta = \\frac{\\cos(\\alpha - \\beta) - \\cos(\\alpha + \\beta)}{2}', {
    en: 'Product-to-sum formulas', uses: ['sin-sum', 'cos-sum', 'cos-diff'],
    p: [
      'Додамо формули синуса суми й різниці: $\\sin(\\alpha + \\beta) + \\sin(\\alpha - \\beta) = 2\\sin\\alpha\\cos\\beta$.',
      'Додамо косинус різниці й косинус суми: $\\cos(\\alpha - \\beta) + \\cos(\\alpha + \\beta) = 2\\cos\\alpha\\cos\\beta$.',
      'Віднімемо: $\\cos(\\alpha - \\beta) - \\cos(\\alpha + \\beta) = 2\\sin\\alpha\\sin\\beta$. Лишається поділити на 2.'
    ]
  });

  f('aux-angle', 'Метод допоміжного кута', 'a\\sin x + b\\cos x = \\sqrt{a^2 + b^2}\\,\\sin(x + \\varphi)', {
    en: 'Harmonic addition (auxiliary angle)', uses: ['sin-sum', 'trig-pyth'],
    w: '$\\cos\\varphi = \\frac{a}{\\sqrt{a^2 + b^2}}$, $\\sin\\varphi = \\frac{b}{\\sqrt{a^2 + b^2}}$; $a$ і $b$ не дорівнюють нулю одночасно.',
    ex: '$\\sin x + \\sqrt{3}\\cos x = 2\\sin\\left(x + \\frac{\\pi}{3}\\right)$ — найбільше значення виразу 2, найменше $-2$.',
    p: [
      'Винесемо $R = \\sqrt{a^2 + b^2}$: $a\\sin x + b\\cos x = R\\left(\\frac{a}{R}\\sin x + \\frac{b}{R}\\cos x\\right)$.',
      'Числа $\\frac{a}{R}$ і $\\frac{b}{R}$ задовольняють $\\left(\\frac{a}{R}\\right)^2 + \\left(\\frac{b}{R}\\right)^2 = 1$, тобто точка з такими координатами лежить на одиничному колі. Отже, є кут $\\varphi$ з $\\cos\\varphi = \\frac{a}{R}$, $\\sin\\varphi = \\frac{b}{R}$.',
      'Тоді в дужках $\\sin x\\cos\\varphi + \\cos x\\sin\\varphi = \\sin(x + \\varphi)$.'
    ],
    note: 'Звідси $-\\sqrt{a^2 + b^2} \\le a\\sin x + b\\cos x \\le \\sqrt{a^2 + b^2}$ — так шукають найбільше й найменше значення.'
  });

  /* ================================================================ Формули зведення */
  sec('trig-red', 'trig', 'Формули зведення', 'an.trigformulas');

  f('reduction', 'Формули зведення', '\\sin\\left(\\frac{\\pi}{2} \\pm \\alpha\\right) = \\cos\\alpha, \\quad \\cos\\left(\\frac{\\pi}{2} \\pm \\alpha\\right) = \\mp\\sin\\alpha \\\\ \\sin(\\pi \\pm \\alpha) = \\mp\\sin\\alpha, \\quad \\cos(\\pi \\pm \\alpha) = -\\cos\\alpha', {
    en: 'Reduction formulas', uses: ['sin-sum', 'cos-sum'], k: 'зведення кофункція',
    w: 'Правило. Якщо в аргументі $\\frac{\\pi}{2}$ чи $\\frac{3\\pi}{2}$ — функція змінюється на «кофункцію» (синус ↔ косинус, тангенс ↔ котангенс); якщо $\\pi$ чи $2\\pi$ — не змінюється. Знак — той, який має початкова функція в отриманій чверті, якщо вважати $\\alpha$ гострим.',
    ex: '$\\cos 150^\\circ = \\cos(180^\\circ - 30^\\circ) = -\\cos 30^\\circ = -\\frac{\\sqrt{3}}{2}$; $\\tg\\left(\\frac{3\\pi}{2} - \\alpha\\right) = \\ctg\\alpha$.',
    p: [
      'Кожна формула зведення — окремий випадок формул додавання. Наприклад: $\\cos\\left(\\frac{\\pi}{2} + \\alpha\\right) = \\cos\\frac{\\pi}{2}\\cos\\alpha - \\sin\\frac{\\pi}{2}\\sin\\alpha = -\\sin\\alpha$.',
      '$\\sin(\\pi - \\alpha) = \\sin\\pi\\cos\\alpha - \\cos\\pi\\sin\\alpha = \\sin\\alpha$, а $\\cos(\\pi + \\alpha) = \\cos\\pi\\cos\\alpha - \\sin\\pi\\sin\\alpha = -\\cos\\alpha$.',
      'Оскільки $\\sin\\frac{\\pi}{2} = 1$, $\\cos\\frac{\\pi}{2} = 0$, $\\sin\\pi = 0$, $\\cos\\pi = -1$, у формулі додавання завжди лишається один доданок. Для $\\frac{\\pi}{2}$ це доданок з іншою функцією — звідси «кофункція».',
      'Знак теж видно зі знаків $\\cos\\pi = -1$ тощо; правило «чверті» — просто спосіб його не обчислювати: при гострому $\\alpha$ кут $\\pi + \\alpha$ лежить у III чверті, де синус відʼємний, тому $\\sin(\\pi + \\alpha) = -\\sin\\alpha$.'
    ]
  });

  /* ================================================================ Рівняння й аркфункції */
  sec('trig-eq', 'trig', 'Рівняння й аркфункції', 'an.trigeq',
    'Аркфункція повертає один кут — із проміжку, де функція монотонна. Усі розвʼязки рівняння отримують із нього симетрією й періодом.');

  f('arc-def', 'Арксинус, арккосинус, арктангенс', '\\arcsin a \\in \\left[-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right], \\quad \\arccos a \\in [0; \\pi], \\quad \\arctg a \\in \\left(-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right)', {
    en: 'Inverse trigonometric functions', map: 'an.arcfn', pt: 'Чому саме такі проміжки',
    w: '$\\arcsin a$ — кут із цього проміжку, синус якого дорівнює $a$ ($|a| \\le 1$). Так само для арккосинуса ($|a| \\le 1$) і арктангенса (будь-яке $a$).',
    p: [
      'Кутів із синусом $a$ безліч. Щоб «кут за синусом» був однозначним, беруть проміжок, де синус зростає і набуває всіх значень від $-1$ до $1$ рівно один раз, — це $\\left[-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right]$.',
      'Косинус на цьому проміжку не монотонний, тому для нього беруть $[0; \\pi]$ — там він спадає від $1$ до $-1$.',
      'Тангенс на $\\left(-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right)$ зростає й набуває всіх дійсних значень.'
    ]
  });

  f('eq-sin', 'Рівняння $\\sin x = a$', 'x = (-1)^k \\arcsin a + \\pi k, \\quad k \\in \\mathbb{Z}', {
    en: 'Solving sin x = a', uses: ['arc-def', 'reduction', 'trig-period'],
    w: '$|a| \\le 1$; при $|a| > 1$ розвʼязків немає. Окремі випадки: $\\sin x = 0 \\iff x = \\pi k$; $\\sin x = \\pm 1 \\iff x = \\pm\\frac{\\pi}{2} + 2\\pi k$.',
    ex: '$\\sin x = \\frac{1}{2}$: $x = (-1)^k \\frac{\\pi}{6} + \\pi k$, тобто $\\frac{\\pi}{6} + 2\\pi n$ і $\\frac{5\\pi}{6} + 2\\pi n$.',
    p: [
      'На проміжку $\\left[-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right]$ синус зростає, тож рівняння має там рівно один корінь — $\\arcsin a$.',
      'На $\\left[\\frac{\\pi}{2}; \\frac{3\\pi}{2}\\right]$ синус спадає від $1$ до $-1$ — там теж рівно один корінь: $\\pi - \\arcsin a$, бо $\\sin(\\pi - t) = \\sin t$.',
      'Ці два проміжки разом — повний період. Додаючи $2\\pi n$, отримуємо всі розвʼязки: $x = \\arcsin a + 2\\pi n$ і $x = \\pi - \\arcsin a + 2\\pi n$.',
      'Обидві серії — одна формула: при парному $k = 2n$ маємо першу, при непарному $k = 2n + 1$ — другу, бо $-\\arcsin a + \\pi(2n + 1) = \\pi - \\arcsin a + 2\\pi n$.'
    ]
  });

  f('eq-cos', 'Рівняння $\\cos x = a$', 'x = \\pm\\arccos a + 2\\pi k, \\quad k \\in \\mathbb{Z}', {
    en: 'Solving cos x = a', uses: ['arc-def', 'trig-parity', 'trig-period'],
    w: '$|a| \\le 1$. Окремі випадки: $\\cos x = 0 \\iff x = \\frac{\\pi}{2} + \\pi k$; $\\cos x = 1 \\iff x = 2\\pi k$; $\\cos x = -1 \\iff x = \\pi + 2\\pi k$.',
    p: [
      'На $[0; \\pi]$ косинус спадає, тож там один корінь — $\\arccos a$.',
      'Косинус парний, тому на $[-\\pi; 0]$ корінь — $-\\arccos a$.',
      'Разом це повний період; додаючи $2\\pi k$, отримуємо всі розвʼязки.'
    ]
  });

  f('eq-tg', 'Рівняння $\\tg x = a$', 'x = \\arctg a + \\pi k, \\quad k \\in \\mathbb{Z}', {
    en: 'Solving tan x = a', uses: ['arc-def', 'trig-period'],
    w: 'Для будь-якого $a$. Так само $\\ctg x = a \\iff x = \\arcctg a + \\pi k$.',
    p: [
      'На $\\left(-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right)$ тангенс зростає й набуває кожного значення один раз — у точці $\\arctg a$.',
      'Період тангенса $\\pi$, тож усі розвʼязки отримуємо, додаючи $\\pi k$.'
    ]
  });

  f('arc-neg', 'Аркфункції відʼємного аргументу', '\\arcsin(-a) = -\\arcsin a, \\quad \\arccos(-a) = \\pi - \\arccos a, \\quad \\arctg(-a) = -\\arctg a', {
    en: 'Inverse functions of negative arguments', uses: ['arc-def', 'trig-parity', 'reduction'], map: 'an.arcfn',
    ex: '$\\arccos\\left(-\\frac{1}{2}\\right) = \\pi - \\frac{\\pi}{3} = \\frac{2\\pi}{3}$',
    p: [
      'Число $-\\arcsin a$ лежить у $\\left[-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right]$, а його синус дорівнює $-\\sin(\\arcsin a) = -a$. За означенням це $\\arcsin(-a)$.',
      'Число $\\pi - \\arccos a$ лежить у $[0; \\pi]$, і $\\cos(\\pi - \\arccos a) = -\\cos(\\arccos a) = -a$. Отже, це $\\arccos(-a)$.',
      'Для арктангенса — так само, як для арксинуса.'
    ],
    err: '$\\arccos(-a) \\ne -\\arccos a$: арккосинус завжди невідʼємний.'
  });

  f('arc-sum', 'Сума арксинуса й арккосинуса', '\\arcsin a + \\arccos a = \\frac{\\pi}{2}', {
    en: 'arcsin + arccos', uses: ['trig-cofunc', 'arc-def'], map: 'an.arcfn',
    w: '$|a| \\le 1$. Так само $\\arctg a + \\arcctg a = \\frac{\\pi}{2}$.',
    p: [
      'Число $\\frac{\\pi}{2} - \\arccos a$ лежить у $\\left[-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right]$, бо $\\arccos a \\in [0; \\pi]$.',
      'Його синус: $\\sin\\left(\\frac{\\pi}{2} - \\arccos a\\right) = \\cos(\\arccos a) = a$.',
      'За означенням арксинуса $\\arcsin a = \\frac{\\pi}{2} - \\arccos a$.'
    ]
  });
})();
