/* База формул англійською: планіметрія. Див. formulas-en-algebra.js.
   Креслення спільні для обох мов — підписи на них латиницею. */

(function () {
  'use strict';

  var E = window.FORMULAS_EN = window.FORMULAS_EN || { sections: {}, items: {} };
  function sec(id, title, note) { E.sections[id] = { title: title, note: note || '' }; }
  function f(id, t, o) { o = o || {}; o.t = t; E.items[id] = o; }

  /* ================================================================ Triangle */
  sec('tri', 'Triangle',
    'Basic properties of a triangle: the angle sum, the triangle inequality, the isosceles triangle, the midsegment, medians and angle bisectors.');

  f('tri-sum', 'Angle sum of a triangle', {
    p: [
      'Draw through the vertex $C$ the line parallel to $AB$.',
      'The angle between this line and the side $CA$ equals $\\angle A$, and the angle between it and the side $CB$ equals $\\angle B$ — these are alternate angles at parallel lines.',
      'These two angles together with the angle $C$ form a straight angle, i.e. $180^\\circ$.'
    ]
  });

  f('tri-ext', 'Exterior angle theorem', {
    w: 'An exterior angle equals the sum of the two interior angles not adjacent to it.',
    p: [
      'The exterior angle $CBD$ and the interior angle $B$ are supplementary: $\\angle CBD = 180^\\circ - \\angle B$.',
      'By the angle sum of a triangle $\\angle A + \\angle C = 180^\\circ - \\angle B$ — the same number.'
    ]
  });

  f('tri-isosceles', 'Properties of an isosceles triangle', {
    w: 'The bisector of the apex angle is also a median and an altitude.',
    p: [
      'Draw the bisector $CM$ of the angle $C$.',
      'Triangles $ACM$ and $BCM$ are congruent by two sides and the included angle: $AC = BC$, $CM$ is common, $\\angle ACM = \\angle BCM$.',
      'So $\\angle A = \\angle B$. Also $AM = MB$ and $\\angle AMC = \\angle BMC$, and since these angles are supplementary, each equals $90^\\circ$.'
    ]
  });

  f('tri-ineq', 'Triangle inequality', {
    w: 'Each side is less than the sum of the other two and greater than their difference: $|b - c| < a < b + c$.',
    p: [
      'Let $a = BC$, $b = AC$, $c = AB$. On the extension of the side $CA$ beyond $A$ mark $AD = AB = c$. Then $CD = b + c$.',
      'Triangle $ABD$ is isosceles, so $\\angle ADB = \\angle ABD$.',
      'In triangle $BCD$ the angle at $B$ equals $\\angle ABD + \\angle ABC$, i.e. it is greater than the angle $D$.',
      'The greater side lies opposite the greater angle, so $CD > BC$: $b + c > a$.'
    ]
  });

  f('tri-midline', 'Midsegment theorem', {
    w: '$M$ and $N$ are the midpoints of the sides $AC$ and $BC$.',
    p: [
      'Triangles $CMN$ and $CAB$ share the angle $C$, and the sides at it are proportional: $\\frac{CM}{CA} = \\frac{CN}{CB} = \\frac{1}{2}$.',
      'By the SAS similarity test they are similar with ratio $\\frac{1}{2}$, so $MN = \\frac{1}{2}AB$.',
      'From the similarity $\\angle CMN = \\angle CAB$ — corresponding angles at the lines $MN$, $AB$ and the transversal $AC$. So $MN \\parallel AB$.'
    ]
  });

  f('tri-medians', 'Centroid divides the medians 2 : 1', {
    w: 'The three medians meet at one point $M$ (the centroid), which divides each median in the ratio $2 : 1$ counting from the vertex.',
    p: [
      'Let the medians $AA_1$ and $BB_1$ meet at $M$. The segment $A_1B_1$ is a midsegment: $A_1B_1 \\parallel AB$ and $A_1B_1 = \\frac{1}{2}AB$.',
      'Triangles $MA_1B_1$ and $MAB$ are similar (vertical angles at $M$ and alternate angles at parallel lines) with ratio $\\frac{1}{2}$. So $MA_1 = \\frac{1}{2}AM$, i.e. $AM : MA_1 = 2 : 1$.',
      'Hence any other median meets $AA_1$ exactly at the point dividing it as $2 : 1$ — the same point $M$. All three medians pass through $M$.'
    ]
  });

  f('tri-bisector', 'Angle bisector theorem', {
    w: '$CL$ bisects the angle $C$: it divides the opposite side in proportion to the adjacent sides.',
    p: [
      'Triangles $ACL$ and $BCL$ have a common altitude from $C$, so the ratio of their areas equals $\\frac{AL}{LB}$.',
      'On the other hand, $S_{ACL} = \\frac{1}{2}AC \\cdot CL \\cdot \\sin\\varphi$ and $S_{BCL} = \\frac{1}{2}BC \\cdot CL \\cdot \\sin\\varphi$, so the ratio of the areas equals $\\frac{AC}{BC}$.',
      'Equating the two expressions gives the formula.'
    ]
  });

  f('tri-median-len', 'Length of a median', {
    p: [
      'Double the median: complete the triangle to a parallelogram with sides $a$ and $b$ and diagonals $c$ and $2m_c$.',
      'By the parallelogram law $c^2 + (2m_c)^2 = 2(a^2 + b^2)$.',
      'Hence $4m_c^2 = 2a^2 + 2b^2 - c^2$.'
    ]
  });

  /* ================================================================ Right triangle */
  sec('right', 'Right triangle',
    'Legs $a$, $b$, hypotenuse $c$. Pythagoras’ theorem is the most important formula of school geometry: the distance formula, the equation of a circle and the law of cosines all rest on it.');

  f('right-pyth', 'Pythagorean theorem', {
    p: [
      'Take a square with side $a + b$ and place four copies of the triangle in it as in the picture.',
      'In the middle there remains a quadrilateral with sides $c$. Its angles are right: at each vertex it stands together with the two acute angles of the triangle, which add up to $90^\\circ$. So it is a square.',
      'The area of the big square in two ways: $(a + b)^2 = 4 \\cdot \\frac{ab}{2} + c^2$.',
      'Expand the brackets: $a^2 + 2ab + b^2 = 2ab + c^2$, whence $a^2 + b^2 = c^2$.'
    ]
  });

  f('right-conv', 'Converse of the Pythagorean theorem', {
    ex: 'A triangle with sides 3, 4, 5 is right-angled (the “Egyptian” triangle); so are 5, 12, 13 and 8, 15, 17.',
    p: [
      'Construct a right triangle with legs $a$ and $b$. By Pythagoras its hypotenuse is $\\sqrt{a^2 + b^2} = c$.',
      'So it is congruent to the given one by three sides — and in the given triangle the angle between the sides $a$ and $b$ is right too.'
    ]
  });

  f('right-trig', 'Sine, cosine, tangent of an acute angle (SOH CAH TOA)', {
    w: '$a$ is the leg opposite the angle $\\alpha$, $b$ is the adjacent leg, $c$ is the hypotenuse.',
    p: [
      'Two right triangles with the same acute angle $\\alpha$ are similar by two angles.',
      'In similar triangles the ratios of corresponding sides are equal, so $\\frac{a}{c}$, $\\frac{b}{c}$ and $\\frac{a}{b}$ depend only on the angle $\\alpha$.',
      'For a triangle with hypotenuse $1$ the legs are exactly $\\sin\\alpha$ and $\\cos\\alpha$ from the unit circle, so both definitions agree.'
    ]
  });

  f('right-height', 'Altitude to the hypotenuse', {
    w: '$h$ is the altitude to the hypotenuse; $a_c$, $b_c$ are the projections of the legs $a$, $b$ onto the hypotenuse. Also $h = \\frac{ab}{c}$.',
    p: [
      'The altitude divides the triangle into two triangles similar to it and to each other: each has a right angle and an acute angle shared with the big triangle.',
      'From the similarity of the two smaller triangles: $\\frac{h}{a_c} = \\frac{b_c}{h}$, i.e. $h^2 = a_c b_c$.',
      'From the similarity of the smaller triangle $BCH$ and the big one $ABC$ (common angle $B$): $\\frac{a}{c} = \\frac{a_c}{a}$, i.e. $a^2 = c \\cdot a_c$. Likewise $b^2 = c \\cdot b_c$.',
      'The area in two ways: $\\frac{1}{2}ab = \\frac{1}{2}ch$, whence $h = \\frac{ab}{c}$.'
    ]
  });

  f('right-median', 'Median to the hypotenuse', {
    w: 'The circumcentre of a right triangle is the midpoint of the hypotenuse.',
    p: [
      'Complete the right triangle to a rectangle: the hypotenuse becomes its diagonal.',
      'The diagonals of a rectangle are equal (by Pythagoras both are $\\sqrt{a^2 + b^2}$) and bisect each other.',
      'So the midpoint of the hypotenuse is $\\frac{c}{2}$ away from all three vertices: the median equals $\\frac{c}{2}$, and this point is the circumcentre.'
    ]
  });

  f('right-30', 'The leg opposite 30°', {
    w: '$a$ is the leg opposite the angle $30^\\circ$. Conversely: if a leg is half the hypotenuse, the opposite angle is $30^\\circ$.',
    p: [
      'Let $\\angle A = 30^\\circ$, then $\\angle B = 60^\\circ$. Draw the median $CM$ to the hypotenuse: $CM = MB = \\frac{c}{2}$.',
      'Triangle $CMB$ is isosceles with a $60^\\circ$ base angle, so both base angles are $60^\\circ$ and the third is $60^\\circ$ too. It is equilateral.',
      'So $BC = MB = \\frac{c}{2}$, and $BC$ is exactly the leg opposite the angle $A = 30^\\circ$.'
    ]
  });

  f('right-r', 'Inradius and circumradius of a right triangle', {
    ex: 'For the 3, 4, 5 triangle: $r = \\frac{3 + 4 - 5}{2} = 1$, $R = 2.5$.',
    p: [
      'The incentre together with the points of tangency on the legs and the vertex $C$ forms a square with side $r$: the angle $C$ is right, and the radii to the points of tangency are perpendicular to the legs.',
      'So the tangent segments from the vertex $C$ equal $r$, from $A$ — $b - r$, from $B$ — $a - r$.',
      'The hypotenuse consists of the tangent segments from $A$ and $B$: $c = (b - r) + (a - r)$, whence $r = \\frac{a + b - c}{2}$.',
      '$R = \\frac{c}{2}$ — the midpoint of the hypotenuse is equidistant from the vertices.'
    ]
  });

  /* ================================================================ Solving triangles and areas */
  sec('solve', 'Laws of sines and cosines, areas',
    'The sides $a$, $b$, $c$ lie opposite the angles $\\alpha$, $\\beta$, $\\gamma$; $p$ is the semiperimeter, $r$ and $R$ are the radii of the inscribed and circumscribed circles.');

  f('cos-law', 'Law of cosines', {
    p: [
      'Place the vertex $C$ at the origin and the side $CB$ along the $x$-axis: $C = (0; 0)$, $B = (a; 0)$. By the definition of sine and cosine $A = (b\\cos\\gamma; b\\sin\\gamma)$.',
      'By the distance formula: $$c^2 = AB^2 = (b\\cos\\gamma - a)^2 + (b\\sin\\gamma)^2 = b^2\\cos^2\\gamma - 2ab\\cos\\gamma + a^2 + b^2\\sin^2\\gamma.$$',
      'Since $\\cos^2\\gamma + \\sin^2\\gamma = 1$, we get $c^2 = a^2 + b^2 - 2ab\\cos\\gamma$.'
    ],
    note: 'For $\\gamma = 90^\\circ$ this is Pythagoras’ theorem. The sign of $\\cos\\gamma$ tells the kind of angle: $c^2 < a^2 + b^2$ — $\\gamma$ is acute, $c^2 > a^2 + b^2$ — obtuse.'
  });

  f('sin-law', 'Law of sines', {
    p: [
      'Draw the diameter $BD$ of the circumcircle through the vertex $B$.',
      'Let the angle $\\alpha$ be acute. The inscribed angles $A$ and $D$ subtend the same arc $BC$, so they are equal.',
      'The angle $BCD$ subtends a diameter, so it is right. From the right triangle $BCD$: $BC = BD \\cdot \\sin D$, i.e. $a = 2R\\sin\\alpha$.',
      'If $\\alpha$ is obtuse, then $\\angle D = 180^\\circ - \\alpha$ (the cyclic quadrilateral $ABDC$), and the sine does not change. If $\\alpha$ is right, $a$ is itself a diameter: $a = 2R = 2R\\sin 90^\\circ$.',
      'Likewise $b = 2R\\sin\\beta$ and $c = 2R\\sin\\gamma$.'
    ]
  });

  f('area-base-h', 'Area of a triangle: half base times height', {
    p: [
      'A right triangle is half of a rectangle with sides equal to its legs, so its area is half the product of the legs.',
      'The altitude $h_a$ divides the triangle into two right triangles with the common leg $h_a$ (if an angle at the base is obtuse, the triangle is their difference).',
      'The sum (or difference) of their areas: $\\frac{1}{2}x h_a \\pm \\frac{1}{2}y h_a = \\frac{1}{2}(x \\pm y)h_a = \\frac{1}{2}a h_a$, since $x \\pm y = a$.'
    ]
  });

  f('area-sin', 'Area from two sides and the included angle', {
    p: [
      'The altitude from $A$ to the side $a$: $h_a = b\\sin\\gamma$ (from a right triangle; for an obtuse $\\gamma$ — via the supplementary angle, which has the same sine).',
      'Then $S = \\frac{1}{2}a h_a = \\frac{1}{2}ab\\sin\\gamma$.'
    ]
  });

  f('heron', 'Heron’s formula', {
    ex: 'The 13, 14, 15 triangle: $p = 21$, $S = \\sqrt{21 \\cdot 8 \\cdot 7 \\cdot 6} = 84$.',
    p: [
      '$S = \\frac{1}{2}ab\\sin\\gamma$, so $16S^2 = 4a^2b^2\\sin^2\\gamma = (2ab)^2 - (2ab\\cos\\gamma)^2$.',
      'By the law of cosines $2ab\\cos\\gamma = a^2 + b^2 - c^2$, so $16S^2 = (2ab)^2 - (a^2 + b^2 - c^2)^2$.',
      'A difference of squares: $(2ab - a^2 - b^2 + c^2)(2ab + a^2 + b^2 - c^2) = \\big(c^2 - (a - b)^2\\big)\\big((a + b)^2 - c^2\\big)$.',
      'Differences of squares again: $(c - a + b)(c + a - b)(a + b - c)(a + b + c)$.',
      'Each factor via $p$: $a + b + c = 2p$, $b + c - a = 2(p - a)$, $a + c - b = 2(p - b)$, $a + b - c = 2(p - c)$. So $16S^2 = 16p(p - a)(p - b)(p - c)$.'
    ]
  });

  f('area-pr', 'Area via the inradius', {
    w: 'The same holds for any polygon with an inscribed circle: $S = pr$.',
    p: [
      'Join the incentre $I$ to the vertices. The triangle splits into three triangles with bases $a$, $b$, $c$.',
      'The altitude of each is the radius to the point of tangency: it is perpendicular to the side. So all three altitudes equal $r$.',
      '$S = \\frac{1}{2}ar + \\frac{1}{2}br + \\frac{1}{2}cr = \\frac{a + b + c}{2} \\cdot r = pr$.'
    ]
  });

  f('area-R', 'Area via the circumradius', {
    p: [
      'By the law of sines $\\sin\\gamma = \\frac{c}{2R}$.',
      'Substitute into $S = \\frac{1}{2}ab\\sin\\gamma$: $S = \\frac{1}{2}ab \\cdot \\frac{c}{2R} = \\frac{abc}{4R}$.'
    ]
  });

  f('equilateral', 'Equilateral triangle', {
    p: [
      'The altitude is a leg of a right triangle with hypotenuse $a$ and other leg $\\frac{a}{2}$: $h = \\sqrt{a^2 - \\frac{a^2}{4}} = \\frac{a\\sqrt{3}}{2}$. The area is $\\frac{1}{2}ah = \\frac{a^2\\sqrt{3}}{4}$.',
      'In an equilateral triangle the altitudes are also medians and bisectors, so the centres of both circles are at the intersection of the medians.',
      'This point divides the altitude as $2 : 1$: $R = \\frac{2}{3}h = \\frac{a\\sqrt{3}}{3}$, $r = \\frac{1}{3}h = \\frac{a\\sqrt{3}}{6}$.'
    ]
  });

  /* ================================================================ Quadrilaterals */
  sec('quads', 'Quadrilaterals and polygons');

  f('poly-sum', 'Interior angle sum of a polygon', {
    w: 'For a convex $n$-gon. The sum of the exterior angles (one at each vertex) is always $360^\\circ$.',
    ex: 'The angle of a regular hexagon: $\\frac{4 \\cdot 180^\\circ}{6} = 120^\\circ$.',
    p: [
      'The diagonals from one vertex divide a convex $n$-gon into $n - 2$ triangles.',
      'The angles of these triangles together make up the angles of the polygon, so the sum is $(n - 2) \\cdot 180^\\circ$.',
      'The exterior and interior angles at a vertex add up to $180^\\circ$, so the sum of the exterior angles is $n \\cdot 180^\\circ - (n - 2) \\cdot 180^\\circ = 360^\\circ$.'
    ]
  });

  f('par-props', 'Properties of a parallelogram', {
    p: [
      'The diagonal $AC$ divides the parallelogram into triangles $ABC$ and $CDA$. They are congruent by a side and the adjacent angles: $AC$ is common, $\\angle BAC = \\angle DCA$ and $\\angle BCA = \\angle DAC$ as alternate angles at parallel lines.',
      'Hence opposite sides and opposite angles are equal.',
      'Triangles $AOB$ and $COD$ are congruent by the side $AB = CD$ and the adjacent (alternate) angles, so $AO = OC$ and $BO = OD$: the diagonals bisect each other.'
    ]
  });

  f('par-diag', 'Parallelogram law', {
    p: [
      'Let $\\angle A = \\alpha$. The neighbouring angle is $B = 180^\\circ - \\alpha$, and $\\cos B = -\\cos\\alpha$.',
      'By the law of cosines in triangles $ABD$ and $ABC$: $BD^2 = a^2 + b^2 - 2ab\\cos\\alpha$ and $AC^2 = a^2 + b^2 + 2ab\\cos\\alpha$.',
      'Adding: $d_1^2 + d_2^2 = 2a^2 + 2b^2$.'
    ]
  });

  f('par-area', 'Area of a parallelogram', {
    w: '$\\alpha$ is the angle between the sides, $\\varphi$ is the angle between the diagonals.',
    p: [
      'A diagonal divides the parallelogram into two congruent triangles. So $S = 2 \\cdot \\frac{1}{2}ah_a = ah_a$ and $S = 2 \\cdot \\frac{1}{2}ab\\sin\\alpha = ab\\sin\\alpha$.',
      'The diagonals divide the parallelogram into four triangles with the angle $\\varphi$ or $180^\\circ - \\varphi$ between the halves of the diagonals; the sines of these angles are equal.',
      'The sum of their areas: $4 \\cdot \\frac{1}{2} \\cdot \\frac{d_1}{2} \\cdot \\frac{d_2}{2} \\cdot \\sin\\varphi = \\frac{1}{2}d_1d_2\\sin\\varphi$.'
    ]
  });

  f('rhombus', 'Rhombus: diagonals and area', {
    w: 'The formula $S = \\frac{1}{2}d_1d_2$ holds for any quadrilateral with perpendicular diagonals.',
    p: [
      'A rhombus is a parallelogram, so its diagonals bisect each other.',
      'Triangle $ABD$ is isosceles ($AB = AD$), and $AO$ is its median, hence also its altitude: $AC \\perp BD$.',
      'The area of a parallelogram via the diagonals with $\\varphi = 90^\\circ$: $S = \\frac{1}{2}d_1d_2$.'
    ]
  });

  f('trap-mid', 'Midsegment of a trapezoid', {
    w: '$a = AD$, $b = BC$ are the bases; $M$, $N$ are the midpoints of the legs.',
    p: [
      'Draw the line through the vertex $B$ and the midpoint $N$ of the side $CD$ until it meets the line $AD$ at $K$.',
      'Triangles $BCN$ and $KDN$ are congruent: $CN = ND$, the angles at $N$ are vertical, $\\angle BCN = \\angle KDN$ as alternate angles. So $DK = BC = b$ and $BN = NK$.',
      'In triangle $ABK$ the segment $MN$ joins the midpoints of two sides — it is a midsegment: $MN \\parallel AK$ and $MN = \\frac{1}{2}AK = \\frac{a + b}{2}$.'
    ]
  });

  f('trap-area', 'Area of a trapezoid', {
    w: '$a$, $b$ are the bases, $h$ is the height. Also: $S = MN \\cdot h$ — the midsegment times the height.',
    p: [
      'A diagonal divides the trapezoid into two triangles with bases $a$ and $b$ and the same height $h$ — the distance between the parallel bases.',
      '$S = \\frac{1}{2}ah + \\frac{1}{2}bh = \\frac{a + b}{2} \\cdot h$.'
    ]
  });

  f('inscribed-quad', 'Cyclic quadrilateral', {
    w: 'Conversely: if opposite angles add up to $180^\\circ$, a circle can be drawn through the vertices.',
    p: [
      'The angles $A$ and $C$ are inscribed and subtend the arcs $BCD$ and $DAB$, which together make the whole circle — $360^\\circ$.',
      'An inscribed angle is half its arc, so $\\angle A + \\angle C = \\frac{360^\\circ}{2} = 180^\\circ$.'
    ]
  });

  f('circum-quad', 'Tangential quadrilateral', {
    w: 'Conversely: if the sums of opposite sides of a convex quadrilateral are equal, a circle can be inscribed in it.',
    p: [
      'Tangent segments from one point to a circle are equal. Denote them $x$, $y$, $z$, $t$ for the vertices $A$, $B$, $C$, $D$.',
      'Then $AB + CD = (x + y) + (z + t)$ and $BC + AD = (y + z) + (t + x)$ — the same.'
    ]
  });

  /* ================================================================ Circle */
  sec('circle', 'Circle and disc');

  f('circ-len', 'Circumference and arc length', {
    w: '$\\alpha$ is the arc in degrees, $\\varphi$ — in radians.',
    p: [
      'All circles are similar, so the ratio of the circumference to the diameter is the same for all of them. This number is denoted $\\pi$: $C = \\pi \\cdot 2R$.',
      'The length of an arc is proportional to its angle: an arc of $\\alpha^\\circ$ is $\\frac{\\alpha}{360}$ of the circle, i.e. $\\frac{2\\pi R\\alpha}{360} = \\frac{\\pi R\\alpha}{180}$.',
      'The radian measure of an angle is defined exactly so: $\\varphi = \\frac{l}{R}$. Hence $l = R\\varphi$, and a full circle is $2\\pi$ radians.'
    ]
  });

  f('circ-area', 'Area of a disc and a sector', {
    f: 'S = \\pi R^2, \\quad S_{\\text{sector}} = \\frac{\\pi R^2\\alpha}{360^\\circ} = \\frac{1}{2}R^2\\varphi',
    p: [
      'Cut the disc into many narrow sectors and lay them out as “teeth”, alternately point up and point down.',
      'The shape gets ever closer to a rectangle with sides $\\pi R$ (half the circumference) and $R$. So $S = \\pi R \\cdot R = \\pi R^2$.',
      'A sector with angle $\\alpha^\\circ$ is $\\frac{\\alpha}{360}$ of the disc; in radians — $\\frac{\\varphi}{2\\pi} \\cdot \\pi R^2 = \\frac{1}{2}R^2\\varphi$.',
      'Rigorously this is proved via inscribed and circumscribed regular polygons or by integration.'
    ]
  });

  f('inscribed-angle', 'Inscribed angle theorem', {
    w: 'An inscribed angle is half the central angle subtending the same arc. Corollaries: inscribed angles subtending one arc are equal; an angle subtending a diameter is right.',
    p: [
      'First the case when the side $CB$ passes through the centre $O$. Triangle $AOC$ is isosceles ($OA = OC = R$), so $\\angle OAC = \\angle OCA$.',
      'The angle $AOB$ is exterior to triangle $AOC$: $\\angle AOB = \\angle OAC + \\angle OCA = 2\\angle ACB$.',
      'General case: draw the diameter $CD$. If the centre lies inside the angle $ACB$, the angle splits into two angles of the first case: $\\angle ACD + \\angle DCB = \\frac{1}{2}\\angle AOD + \\frac{1}{2}\\angle DOB = \\frac{1}{2}\\angle AOB$.',
      'If the centre is outside the angle — the same, with a difference of two angles instead of a sum.'
    ]
  });

  f('tangent-perp', 'A tangent is perpendicular to the radius', {
    w: '$T$ is the point where the line $l$ touches the circle with centre $O$.',
    p: [
      'Suppose $OT$ is not perpendicular to $l$. Drop the perpendicular $OH$ from $O$ to $l$; then $OH < OT = R$ — a leg is shorter than the hypotenuse.',
      'So $H$ lies inside the circle, and the line $l$, passing through an interior point, meets the circle at two points. But a tangent has one common point with the circle — a contradiction.'
    ]
  });

  f('tangent-seg', 'Two tangent theorem', {
    w: '$MA$ and $MB$ are tangent segments from the point $M$ to the circle; $A$, $B$ are the points of tangency. Also $MO$ bisects the angle $AMB$.',
    p: [
      'The radii $OA$ and $OB$ are perpendicular to the tangents, so triangles $OAM$ and $OBM$ are right-angled.',
      'They are congruent by the hypotenuse ($OM$ is common) and a leg ($OA = OB = R$). So $MA = MB$ and $\\angle OMA = \\angle OMB$.'
    ]
  });

  f('tangent-chord', 'Tangent–chord angle', {
    w: 'The angle between a tangent and a chord drawn to the point of tangency is half the arc between them — i.e. equal to the inscribed angle subtending that arc.',
    p: [
      'Draw the diameter $TD$. It is perpendicular to the tangent, so the angle between the tangent and the chord $TA$ equals $90^\\circ - \\angle ATD$.',
      'The angle $TAD$ subtends a diameter, so it is right, and in triangle $TAD$: $\\angle TDA = 90^\\circ - \\angle ATD$.',
      'So the angle between the tangent and the chord equals $\\angle TDA$ — the inscribed angle subtending the arc $TA$, i.e. half of that arc.'
    ]
  });

  f('chord-chord', 'Intersecting chords theorem', {
    p: [
      'Triangles $AEC$ and $DEB$ are similar: the angles at $E$ are vertical, and $\\angle CAB = \\angle CDB$ as inscribed angles subtending the same arc $CB$.',
      'From the similarity $\\frac{AE}{DE} = \\frac{CE}{BE}$, whence $AE \\cdot EB = CE \\cdot ED$.'
    ]
  });

  f('tangent-secant', 'Tangent–secant theorem', {
    w: 'From the point $M$ a tangent $MT$ and a secant meeting the circle at $A$ and $B$ are drawn. For two secants: $MA \\cdot MB = MC \\cdot MD$.',
    p: [
      'Triangles $MTA$ and $MBT$ are similar: the angle $M$ is common, and $\\angle MTA = \\angle MBT$ — the angle between the tangent and the chord $TA$ equals the inscribed angle subtending the arc $TA$.',
      'From the similarity $\\frac{MT}{MB} = \\frac{MA}{MT}$, i.e. $MT^2 = MA \\cdot MB$.'
    ]
  });

  f('circumcenter', 'Circumcentre', {
    w: 'The centre of the circle circumscribed about a triangle is the intersection of the perpendicular bisectors of its sides. For an acute triangle it is inside, for an obtuse one outside, for a right triangle at the midpoint of the hypotenuse.',
    p: [
      'A point of the perpendicular bisector of the segment $AB$ is equidistant from $A$ and $B$ — by congruent right triangles; conversely, every such point lies on the perpendicular bisector.',
      'The perpendicular bisectors of $AB$ and $BC$ meet at a point $O$: $OA = OB$ and $OB = OC$.',
      'Then $OA = OC$, so $O$ also lies on the third perpendicular bisector. The circle with centre $O$ and radius $OA$ passes through all three vertices.'
    ]
  });

  f('incenter', 'Incentre', {
    w: 'The centre of the circle inscribed in a triangle is the intersection of the angle bisectors.',
    p: [
      'The points of an angle bisector are equidistant from the sides of the angle (congruent right triangles by the hypotenuse and an acute angle).',
      'The bisectors of the angles $A$ and $B$ meet at a point $I$ equidistant from all three sides; so $I$ also lies on the bisector of the angle $C$.',
      'The circle with centre $I$ and radius equal to this distance touches all the sides. And $r = \\frac{S}{p}$ follows from $S = pr$.'
    ]
  });

  f('regular-poly', 'Regular polygon', {
    ex: 'Hexagon: $a_6 = 2R\\sin 30^\\circ = R$; square: $a_4 = R\\sqrt{2}$; triangle: $a_3 = R\\sqrt{3}$.',
    p: [
      'Join the centre to the vertices: the polygon splits into $n$ congruent isosceles triangles with legs $R$ and the angle $\\frac{360^\\circ}{n}$ at the centre.',
      'The altitude of such a triangle is the inradius $r$. It divides the triangle into two right triangles with the angle $\\frac{180^\\circ}{n}$ at the centre and hypotenuse $R$.',
      'Hence $\\frac{a_n}{2} = R\\sin\\frac{180^\\circ}{n}$ and $r = R\\cos\\frac{180^\\circ}{n}$.'
    ]
  });

  /* ================================================================ Similarity */
  sec('similar', 'Thales and similarity');

  f('thales', 'Intercept theorem (Thales)', {
    w: 'If parallel lines $A_1B_1$, $A_2B_2$, $A_3B_3$ cut off equal segments on one side of an angle, they cut off equal segments on the other side too. Generalisation: parallel lines cut off proportional segments on the sides of an angle.',
    p: [
      'Draw through $B_1$ and $B_2$ lines parallel to the side $OA_3$ until they meet the lines $A_2B_2$ and $A_3B_3$ at $K$ and $L$.',
      'The quadrilaterals $A_1A_2KB_1$ and $A_2A_3LB_2$ are parallelograms, so $B_1K = A_1A_2$ and $B_2L = A_2A_3$, i.e. $B_1K = B_2L$.',
      'Triangles $B_1KB_2$ and $B_2LB_3$ are congruent: $B_1K = B_2L$, and the angles at these sides are equal as corresponding angles at parallel lines. So $B_1B_2 = B_2B_3$.'
    ]
  });

  f('sim-signs', 'Similar triangles', {
    w: 'Similarity tests: 1) two angles of one triangle equal two angles of the other (AA); 2) two sides are proportional and the included angles are equal (SAS); 3) three sides are proportional (SSS). The first one is proved below.',
    p: [
      'Let $\\angle A = \\angle A_1$, $\\angle B = \\angle B_1$, $k = \\frac{A_1B_1}{AB}$. On the ray $AB$ mark the point $B_2$ with $AB_2 = A_1B_1$ and draw $B_2C_2 \\parallel BC$ ($C_2$ on the ray $AC$).',
      'Triangle $AB_2C_2$ is congruent to $A_1B_1C_1$ by a side and the adjacent angles: $\\angle AB_2C_2 = \\angle B = \\angle B_1$ as corresponding angles at parallel lines.',
      'By the generalised intercept theorem $\\frac{AC_2}{AC} = \\frac{AB_2}{AB} = k$. Drawing through $C_2$ a line parallel to $AB$ gives in the same way $\\frac{B_2C_2}{BC} = k$.',
      'So the sides of triangle $A_1B_1C_1$ (equal to the sides of $AB_2C_2$) are proportional to the sides of $ABC$ with ratio $k$.'
    ]
  });

  f('sim-area', 'Areas of similar figures', {
    w: '$k$ is the scale factor. Volumes of similar solids are in the ratio $k^3$.',
    ex: 'If the sides are doubled, the area becomes four times larger and the volume eight times.',
    p: [
      'In similar triangles the corresponding altitudes are in the same ratio as the sides: $h_1 = kh$ (they are legs of similar right triangles).',
      '$S_1 = \\frac{1}{2}a_1h_1 = \\frac{1}{2}(ka)(kh) = k^2S$.',
      'Any polygon splits into triangles, so for polygons (and, by passing to the limit, for other figures) the ratio of the areas is $k^2$ as well.'
    ]
  });
})();
