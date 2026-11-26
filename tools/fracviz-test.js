// Візуалізація множення й ділення дробів.  node tools/fracviz-test.js
'use strict';
var fs = require('fs'), vm = require('vm'), path = require('path');
var SRC = fs.readFileSync(path.join(__dirname, '../assets/js/fracviz.js'), 'utf8');

var fails = 0, passes = 0;
function ok(c, m) { if (c) { passes++; console.log('  ✓ ' + m); } else { fails++; console.log('  ✗ ' + m); } }
function same(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), m + (JSON.stringify(a) === JSON.stringify(b) ? '' : '  (є ' + JSON.stringify(a) + ')')); }

var win = {};
vm.runInNewContext(SRC, { window: win, Math: Math, JSON: JSON });
var F = win.FracViz;

console.log('• Числа, як їх пишуть');
same(F.parse('6'), { p: 6, q: 1, t: '6' }, 'ціле');
same(F.parse('0,36'), { p: 36, q: 100, t: '0,36' }, 'десятковий з комою — у сотих, як написано');
same(F.parse('0.36'), { p: 36, q: 100, t: '0,36' }, 'і з крапкою');
same(F.parse('2/3'), { p: 2, q: 3, t: '2/3' }, 'звичайний дріб');
same(F.parse('1 1/2'), { p: 3, q: 2, t: '1 1/2' }, 'мішане число');
ok(F.parse('abc') === null && F.parse('1/0') === null && F.parse('') === null, 'сміття й /0 — не число');

console.log('• 6 : 0,36 — скільки порцій по 0,36 у шести');
var d = F.plan('6', ':', '0,36');
ok(!d.error && d.kind === 'div', 'ділення');
same([d.D, d.grid.cols, d.grid.rows], [100, 10, 10], 'кожен — на 100 клітинок, 10×10');
same([d.A, d.B, d.units], [600, 36, 6], '600 клітинок, порція — 36, шість цілих');
same([d.full, d.rem], [16, 24], '16 повних порцій і 24 клітинки з 36');
same(F.answer(d.res), '16 2/3 ≈ 16,67', 'відповідь — мішаним числом і наближено');

console.log('• 2/3 : 1/4 — звичайні дроби');
var d2 = F.plan('2/3', ':', '1/4');
same([d2.D, d2.grid.cols, d2.grid.rows, d2.A, d2.B, d2.units], [12, 4, 3, 8, 3, 1], 'на 12 клітинок, 8 з них, порція — 3');
same(F.answer(d2.res), '2 2/3 ≈ 2,67', '2⅔');

console.log('• 6 × 0,36 — шість порцій по 0,36, зібрані в цілі');
var m = F.plan('6', '×', '0,36');
ok(m.kind === 'groups', 'групи: ціле × дріб');
same([m.n.p, m.per, m.D, m.total, m.resUnits], [6, 36, 100, 216, 3], '6 груп по 36 клітинок = 216 = 2 цілих і 16');
same(F.answer(m.res), '2,16', 'точна десяткова відповідь');
same(F.plan('0,36', '*', '6').n.p, 6, 'порядок множників — не важливий');

console.log('• 2/3 × 3/4 — модель площі');
var a = F.plan('2/3', 'x', '3/4');
ok(a.kind === 'area', 'обидва дробові — площа');
same([a.W, a.H, a.cells, a.cell], [1, 1, 6, 12], 'перетин — 6 клітинок по 1/12');
same(F.answer(a.res), '1/2', 'нескоротне — скорочено');

console.log('• Чого не намалювати');
ok(/нуль/.test(F.plan('6', ':', '0').error), 'на нуль ділити не можна');
ok(/дрібн/.test(F.plan('1/7', ':', '1/97').error || ''), 'надто дрібні частини — пояснює');
ok(/число/i.test(F.plan('шість', ':', '2').error || ''), 'не число — пояснює');

console.log('• Сцена будується на кожному кроці й для кожного предмета');
function fakeThree() {
  function C() {} C.prototype.set = function () { this.r = this.g = this.b = 0.5; return this; };
  function G() {} G.prototype.setAttribute = function () { return this; }; G.prototype.setFromPoints = function () { return this; };
  function V(x, y, z) { this.x = x; this.y = y; this.z = z; }
  function O() { this.position = { set: function () {} }; this.scale = { set: function () {} }; }
  return { Color: C, BufferGeometry: G, Float32BufferAttribute: function () {}, Vector3: V,
    Mesh: O, LineSegments: O, Sprite: O, MeshBasicMaterial: function () {}, LineBasicMaterial: function () {},
    SpriteMaterial: function () {}, CanvasTexture: function () {}, DoubleSide: 2, SRGBColorSpace: 'srgb' };
}
[['6', ':', '0,36'], ['6', '×', '0,36'], ['2/3', '×', '3/4'], ['1 1/2', ':', '3/4'], ['5', '×', '3']].forEach(function (c) {
  Object.keys(F.SKINS).forEach(function (skin) {
    var p = F.plan(c[0], c[1], c[2]);
    var code = F.code(p, skin), built = null, steps = [], adds = 0, labels = 0, caps = [];
    var S = { view2d: function () {}, steps: function (t) { steps = t; }, build: function (fn) { built = fn; },
      add: function () { adds++; }, label: function () { labels++; }, caption: function (t) { caps.push(t); } };
    var doc = { getElementById: function () { return { clientWidth: 800, clientHeight: 500 }; },
      createElement: function () { return { getContext: function () { return { fillText: function () {} }; } }; } };
    var err = null;
    try {
      vm.runInNewContext('(function(S,THREE){' + code + '})(S,THREE)', { S: S, THREE: fakeThree(), document: doc, Math: Math });
      for (var st = 0; st < steps.length; st++) built({ step: st });
    } catch (e) { err = e; }
    ok(!err && steps.length >= 3 && adds > 0 && caps.length === steps.length,
      c.join(' ') + ' · ' + skin + ': ' + steps.length + ' кроки' + (err ? ' — ' + err.message : ''));
  });
});

console.log('\n' + passes + ' пройшло, ' + fails + ' впало');
process.exit(fails ? 1 : 0);
