/* База формул англійською: координати, вектори, стереометрія.
   Див. formulas-en-algebra.js. Індекси «осн», «біч» тут — base, lat. */

(function () {
  'use strict';

  var E = window.FORMULAS_EN = window.FORMULAS_EN || { sections: {}, items: {} };
  function sec(id, title, note) { E.sections[id] = { title: title, note: note || '' }; }
  function f(id, t, o) { o = o || {}; o.t = t; E.items[id] = o; }

  /* ================================================================ Coordinates */
  sec('crd', 'Coordinates in the plane',
    'Points $A(x_1; y_1)$ and $B(x_2; y_2)$. All of coordinate geometry rests on one formula — the distance between points, i.e. on Pythagoras’ theorem.');

  f('crd-dist', 'Distance formula', {
    w: 'In space, $(z_2 - z_1)^2$ is added under the root.',
    p: [
      'Draw through $A$ a line parallel to the $x$-axis and through $B$ one parallel to the $y$-axis. They meet at $C(x_2; y_1)$, and triangle $ACB$ is right-angled.',
      'The legs: $AC = |x_2 - x_1|$, $CB = |y_2 - y_1|$. By Pythagoras $AB^2 = (x_2 - x_1)^2 + (y_2 - y_1)^2$.'
    ]
  });

  f('crd-mid', 'Midpoint formula', {
    w: 'The point dividing $AB$ in the ratio $AM : MB = \\lambda$: $x = \\frac{x_1 + \\lambda x_2}{1 + \\lambda}$ (and the same for $y$).',
    p: [
      'Project the points onto the $x$-axis along lines parallel to the $y$-axis. By the intercept theorem the projection of the midpoint is the midpoint of the projections.',
      'The midpoint of the segment $[x_1; x_2]$ of the number line is $\\frac{x_1 + x_2}{2}$: it is $\\frac{|x_2 - x_1|}{2}$ away from both ends. The same for the $y$-coordinate.'
    ]
  });

  f('crd-circle', 'Equation of a circle', {
    w: '$(a; b)$ is the centre, $R$ is the radius. The unit circle centred at the origin: $x^2 + y^2 = 1$.',
    ex: '$x^2 + y^2 - 4x + 6y = 12 \\iff (x - 2)^2 + (y + 3)^2 = 25$ — a circle with centre $(2; -3)$ and radius 5.',
    p: [
      'A circle is the set of points at the distance $R$ from the centre $(a; b)$.',
      'By the distance formula the condition $\\sqrt{(x - a)^2 + (y - b)^2} = R$ is equivalent to $(x - a)^2 + (y - b)^2 = R^2$: both sides are non-negative.'
    ]
  });

  f('crd-line', 'Equation of a line', {
    w: '$\\alpha$ is the angle of inclination of the line to the $x$-axis. The line through $(x_0; y_0)$: $y - y_0 = k(x - x_0)$. The general equation $Ax + By + C = 0$ also covers vertical lines.',
    p: [
      'Take two points on a non-vertical line. The ratio $\\frac{y_2 - y_1}{x_2 - x_1}$ does not depend on the choice of points: right triangles with such legs and the hypotenuse on the line are similar. Call it $k$; it equals $\\tg\\alpha$.',
      'Then for any point $(x; y)$ of the line $\\frac{y - y_0}{x - x_0} = k$, i.e. $y = y_0 + k(x - x_0) = kx + b$, where $b = y_0 - kx_0$.'
    ]
  });

  f('crd-parallel', 'Parallel and perpendicular lines', {
    p: [
      'Parallel lines have equal angles of inclination, hence equal tangents. If also $b_1 = b_2$, it is the same line.',
      'The vectors $(1; k_1)$ and $(1; k_2)$ point along the lines (one step right — $k$ up). The lines are perpendicular when the dot product of these vectors is zero: $1 + k_1k_2 = 0$.'
    ]
  });

  f('crd-point-line', 'Distance from a point to a line', {
    w: 'The line $Ax + By + C = 0$, the point $M(x_0; y_0)$.',
    p: [
      'The vector $\\vec{n} = (A; B)$ is perpendicular to the line: for two of its points, subtracting the equations gives $A(x_2 - x_1) + B(y_2 - y_1) = 0$.',
      'Take a point $P(x_1; y_1)$ on the line. The distance from $M$ to the line is the length of the projection of $\\vec{PM}$ onto the direction of $\\vec{n}$: $d = \\frac{|\\vec{PM} \\cdot \\vec{n}|}{|\\vec{n}|}$.',
      '$\\vec{PM} \\cdot \\vec{n} = A(x_0 - x_1) + B(y_0 - y_1) = Ax_0 + By_0 - (Ax_1 + By_1) = Ax_0 + By_0 + C$, since $Ax_1 + By_1 = -C$.'
    ]
  });

  /* ================================================================ Vectors */
  sec('vec', 'Vectors',
    'Vectors $\\vec{a}(x_1; y_1)$ and $\\vec{b}(x_2; y_2)$. In space a third coordinate is added to every formula.');

  f('vec-len', 'Magnitude of a vector', {
    w: 'The vector $\\vec{AB}$ has coordinates $(x_2 - x_1; y_2 - y_1)$ — “end minus start”.',
    p: ['Place the vector at the origin: its end is the point $(x; y)$, and its length is the distance from this point to $(0; 0)$.']
  });

  f('vec-ops', 'Vector operations in coordinates', {
    p: [
      'The coordinates of a vector are the horizontal and vertical shifts. Two shifts in a row (the triangle rule) give the total shift — the coordinates add.',
      'Stretching a vector $k$ times multiplies both shifts by $k$ — by similar triangles. For $k < 0$ the direction is reversed.'
    ]
  });

  f('vec-dot', 'Dot product', {
    w: 'The first equality is the definition, the second is a theorem.',
    p: [
      'Place the vectors at a point $O$: $\\vec{OA} = \\vec{a}$, $\\vec{OB} = \\vec{b}$; then $\\vec{AB} = \\vec{b} - \\vec{a}$.',
      'By the law of cosines in triangle $OAB$: $$|\\vec{b} - \\vec{a}|^2 = |\\vec{a}|^2 + |\\vec{b}|^2 - 2|\\vec{a}||\\vec{b}|\\cos\\varphi.$$',
      'In coordinates: $(x_2 - x_1)^2 + (y_2 - y_1)^2 = x_1^2 + y_1^2 + x_2^2 + y_2^2 - 2|\\vec{a}||\\vec{b}|\\cos\\varphi$.',
      'Expanding the left-hand side and cancelling the squares: $-2x_1x_2 - 2y_1y_2 = -2|\\vec{a}||\\vec{b}|\\cos\\varphi$, i.e. $x_1x_2 + y_1y_2 = |\\vec{a}||\\vec{b}|\\cos\\varphi$.',
      'For collinear vectors there is no triangle, but then $\\vec{b} = k\\vec{a}$, and the equality is checked directly.'
    ]
  });

  f('vec-angle', 'Angle between vectors', {
    ex: '$\\vec{a}(1; 0)$, $\\vec{b}(1; 1)$: $\\cos\\varphi = \\frac{1}{1 \\cdot \\sqrt{2}}$, $\\varphi = 45^\\circ$.',
    p: ['Express $\\cos\\varphi$ from the two forms of the dot product and write the lengths in coordinates.']
  });

  f('vec-perp', 'Perpendicular and parallel vectors', {
    w: 'For non-zero vectors. Collinearity means proportional coordinates: $\\frac{x_1}{x_2} = \\frac{y_1}{y_2}$ when the denominators are non-zero.',
    p: [
      'An angle of $90^\\circ$ means $\\cos\\varphi = 0$, i.e. a zero dot product.',
      'Collinear vectors are $\\vec{a} = k\\vec{b}$: $x_1 = kx_2$, $y_1 = ky_2$. Then $x_1y_2 - x_2y_1 = kx_2y_2 - kx_2y_2 = 0$; conversely, this equality makes the coordinates proportional.'
    ]
  });

  /* ================================================================ Polyhedra */
  sec('poly', 'Polyhedra',
    'Volumes in solid geometry rest on Cavalieri’s principle: if two solids of equal height have cross-sections of equal area at every level, their volumes are equal.');

  f('box-diag', 'Space diagonal of a cuboid', {
    ex: 'The diagonal of a cube with edge $a$: $d = a\\sqrt{3}$.',
    p: [
      'The base diagonal $AB_1$ is the hypotenuse of a right triangle with legs $a$ and $b$: $AB_1^2 = a^2 + b^2$.',
      'The edge $B_1C_1$ is perpendicular to the plane of the base, hence to $AB_1$. Triangle $AB_1C_1$ is right-angled: $AC_1^2 = AB_1^2 + c^2 = a^2 + b^2 + c^2$.'
    ]
  });

  f('prism-vol', 'Volume of a prism', {
    f: 'V = S_{\\text{base}} \\cdot h; \\qquad V_{\\text{cuboid}} = abc',
    p: [
      'A cuboid with integer edges consists of $abc$ unit cubes: $a$ in a row, $b$ rows, $c$ layers. For fractional and irrational edges the formula is the same — by passing to the limit.',
      'Every cross-section of a prism parallel to the base is a figure of area $S_{\\text{base}}$. Take a cuboid with the same height and base area: its cross-sections have the same area.',
      'By Cavalieri’s principle the volumes are equal: $V = S_{\\text{base}} \\cdot h$.'
    ]
  });

  f('prism-lat', 'Lateral area of a right prism', {
    f: 'S_{\\text{lat}} = P_{\\text{base}} \\cdot h',
    p: [
      'The lateral faces of a right prism are rectangles with height $h$ and bases equal to the sides of the base of the prism.',
      'The sum of their areas: $a_1h + a_2h + \\ldots + a_nh = (a_1 + \\ldots + a_n)h = P_{\\text{base}} \\cdot h$.'
    ]
  });

  f('pyramid-vol', 'Volume of a pyramid', {
    f: 'V = \\frac{1}{3}S_{\\text{base}} \\cdot h',
    p: [
      'Pyramids with equal base areas and equal heights have equal volumes: the cross-section at the distance $x$ from the apex is similar to the base with ratio $\\frac{x}{h}$, so its area $S \\cdot \\frac{x^2}{h^2}$ is the same for both pyramids (Cavalieri’s principle).',
      'Cut the triangular prism $ABCA_1B_1C_1$ into three triangular pyramids: $A_1ABC$, $A_1BCB_1$ and $A_1CC_1B_1$.',
      'The first and the third have equal bases ($ABC$ and, if we view the third as a pyramid with apex $C$, $A_1B_1C_1$) and the same height — the height of the prism.',
      'The second and the third share the apex $A_1$, and their bases $BCB_1$ and $CC_1B_1$ are two halves of the parallelogram $BCC_1B_1$: equal areas in one plane.',
      'So all three pyramids have equal volumes, and each is a third of the prism: $V = \\frac{1}{3}Sh$. Any pyramid can be split into triangular ones with the same height.'
    ]
  });

  f('pyr-lat', 'Lateral area of a regular pyramid', {
    f: 'S_{\\text{lat}} = \\frac{1}{2}P_{\\text{base}} \\cdot l',
    w: '$l$ is the slant height (apothem), i.e. the height of a lateral face.',
    p: [
      'The lateral faces of a regular pyramid are $n$ congruent isosceles triangles with base $a$ and height $l$.',
      '$S = n \\cdot \\frac{1}{2}al = \\frac{1}{2}(na) \\cdot l = \\frac{1}{2}P_{\\text{base}} \\cdot l$.'
    ]
  });

  f('frustum-vol', 'Volume of a frustum', {
    w: '$S_1$, $S_2$ are the areas of the lower and upper bases, $h$ is the height.',
    p: [
      'Complete the frustum to a full pyramid of height $H$. The cut-off top is a pyramid of height $H - h$, similar to the full one.',
      'The base areas are in the ratio of the squares of the heights: $\\frac{S_2}{S_1} = \\frac{(H - h)^2}{H^2}$. Hence $H = \\frac{h\\sqrt{S_1}}{\\sqrt{S_1} - \\sqrt{S_2}}$ and $H - h = \\frac{h\\sqrt{S_2}}{\\sqrt{S_1} - \\sqrt{S_2}}$.',
      'The volume is the difference of two pyramids: $$V = \\frac{1}{3}S_1H - \\frac{1}{3}S_2(H - h) = \\frac{h}{3} \\cdot \\frac{S_1\\sqrt{S_1} - S_2\\sqrt{S_2}}{\\sqrt{S_1} - \\sqrt{S_2}}.$$',
      'The numerator is a difference of cubes of $\\sqrt{S_1}$ and $\\sqrt{S_2}$; cancelling gives $S_1 + \\sqrt{S_1S_2} + S_2$.'
    ]
  });

  f('three-perp', 'Theorem of three perpendiculars', {
    w: '$AA_1$ is the perpendicular to the plane, $AB$ is an oblique line, $A_1B$ is its projection, $l$ is a line in the plane through $B$.',
    p: [
      'The line $AA_1$ is perpendicular to the plane, hence to the line $l$ lying in it.',
      'If $l \\perp A_1B$, then $l$ is perpendicular to two intersecting lines $AA_1$ and $A_1B$ — hence to the whole plane $AA_1B$, in particular to $AB$.',
      'Conversely, if $l \\perp AB$, then $l$ is perpendicular to $AB$ and $AA_1$ — again to the plane $AA_1B$, and so to $A_1B$.'
    ]
  });

  f('euler', 'Euler’s polyhedron formula', {
    f: 'V - E + F = 2',
    w: 'V is the number of vertices, E of edges, F of faces of a convex polyhedron.',
    ex: 'Cube: $8 - 12 + 6 = 2$; tetrahedron: $4 - 6 + 4 = 2$.',
    p: [
      'Remove one face and flatten the rest onto the plane. The numbers of vertices and edges stay the same, the faces are one fewer — so we need to prove that for this flat net $V - E + F = 1$.',
      'Split the faces into triangles by diagonals. Each diagonal adds one edge and one face — the quantity $V - E + F$ does not change.',
      'Remove the triangles from the boundary one by one. A triangle with one edge on the boundary takes away one edge and one face; with two — one vertex, two edges and one face. The quantity again does not change.',
      'When one triangle remains: $3 - 3 + 1 = 1$.'
    ]
  });

  /* ================================================================ Solids of revolution */
  sec('rot', 'Solids of revolution');

  f('cyl', 'Cylinder', {
    f: 'V = \\pi R^2 h, \\quad S_{\\text{lat}} = 2\\pi Rh',
    w: 'Total surface area: $S = 2\\pi R(R + h)$.',
    p: [
      'Every cross-section of the cylinder parallel to the base is a disc of area $\\pi R^2$, just as for a prism with the same base area and height. By Cavalieri’s principle $V = \\pi R^2 h$.',
      'The lateral surface unrolls into a rectangle with sides $h$ and $2\\pi R$ — the circumference of the base.'
    ]
  });

  f('cone', 'Cone', {
    f: 'V = \\frac{1}{3}\\pi R^2 h, \\quad S_{\\text{lat}} = \\pi Rl',
    w: '$l$ is the slant height: $l^2 = R^2 + h^2$. Total surface area: $S = \\pi R(R + l)$.',
    p: [
      'The cross-sections of a cone and of a pyramid with the same base area and height have equal areas at every level (both are similar to the base with ratio $\\frac{x}{h}$). So $V = \\frac{1}{3}\\pi R^2 h$.',
      'The lateral surface unrolls into a sector of radius $l$ whose arc length is $2\\pi R$.',
      'The area of a sector is proportional to its arc: it is the fraction $\\frac{2\\pi R}{2\\pi l}$ of a disc of radius $l$, i.e. $\\frac{R}{l} \\cdot \\pi l^2 = \\pi Rl$.'
    ]
  });

  f('frustum-cone', 'Frustum of a cone', {
    f: 'V = \\frac{\\pi h}{3}(R^2 + Rr + r^2), \\quad S_{\\text{lat}} = \\pi(R + r)l',
    p: [
      'For the volume — the frustum formula with bases $S_1 = \\pi R^2$ and $S_2 = \\pi r^2$: $\\sqrt{S_1S_2} = \\pi Rr$, so $V = \\frac{h}{3}(\\pi R^2 + \\pi Rr + \\pi r^2)$.',
      'The lateral surface is the difference of the lateral surfaces of the full cone (slant height $L$) and of the cut-off one (slant height $L - l$): $S = \\pi RL - \\pi r(L - l)$.',
      'By similarity $\\frac{L - l}{L} = \\frac{r}{R}$, i.e. $(R - r)L = Rl$. Then $S = \\pi(R - r)L + \\pi rl = \\pi Rl + \\pi rl$.'
    ]
  });

  f('sphere-vol', 'Volume of a sphere', {
    p: [
      'A ball is the solid obtained by rotating the semicircle $y = \\sqrt{R^2 - x^2}$, $x \\in [-R; R]$, about the $x$-axis.',
      'By the volume-of-revolution formula: $$V = \\pi\\int_{-R}^{R}(R^2 - x^2)\\,dx = \\pi\\left(R^2x - \\frac{x^3}{3}\\right)\\Big|_{-R}^{R} = \\pi\\left(2R^3 - \\frac{2R^3}{3}\\right) = \\frac{4}{3}\\pi R^3.$$'
    ],
    note: 'Without integrals, as Archimedes did: by Cavalieri’s principle a hemisphere has the same volume as a cylinder of the same radius and height with a cone cut out of it — $\\pi R^3 - \\frac{1}{3}\\pi R^3 = \\frac{2}{3}\\pi R^3$.'
  });

  f('sphere-area', 'Surface area of a sphere', {
    p: [
      'Think of the ball as a multitude of thin “pyramids” with the apex at the centre and bases on the sphere. The height of each is $R$.',
      'Their volumes together: $\\frac{1}{3}R \\cdot S = V = \\frac{4}{3}\\pi R^3$, whence $S = 4\\pi R^2$.',
      'Alternatively: when the radius grows by a small amount, the volume grows by a thin layer of area $S$. So $S = V′(R) = \\left(\\frac{4}{3}\\pi R^3\\right)′ = 4\\pi R^2$.'
    ]
  });

  f('sphere-segment', 'Spherical cap', {
    w: '$H$ is the height of the cap, $R$ is the radius of the sphere. For $H = 2R$ — the volume of the whole ball.',
    p: [
      'The cap is obtained by rotating the arc $y = \\sqrt{R^2 - x^2}$ on $[R - H; R]$: $$V = \\pi\\int_{R-H}^{R}(R^2 - x^2)\\,dx.$$',
      'The antiderivative is $R^2x - \\frac{x^3}{3}$. Substituting the limits: $\\frac{2R^3}{3} - R^2(R - H) + \\frac{(R - H)^3}{3}$.',
      'Expand $(R - H)^3 = R^3 - 3R^2H + 3RH^2 - H^3$: $$\\frac{2R^3}{3} - R^3 + R^2H + \\frac{R^3}{3} - R^2H + RH^2 - \\frac{H^3}{3} = RH^2 - \\frac{H^3}{3}.$$'
    ]
  });
})();
