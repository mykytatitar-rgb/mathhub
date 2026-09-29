/* Перевірка рушія дошки без браузера.

   Запуск:  node tools/board-test.js

   Справжні share/engine/points.js, constructions.js і board.js, полотно —
   заглушка. Сценарії — ті, на яких губилося чуже чи ламалося своє:
   «крок назад» після того, як написав учень; крок, що нічого не повертав;
   копії креслень зі звʼязками; перенесення на іншу дошку. */

'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
function src(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

function makeCtx() {
  var noop = function () {};
  var target = {
    measureText: function (s) { return { width: String(s).length * 8 }; },
    createLinearGradient: function () { return { addColorStop: noop }; },
    createRadialGradient: function () { return { addColorStop: noop }; },
    getImageData: function () { return { data: [] }; },
    isPointInPath: function () { return false; },
    setLineDash: noop, getLineDash: function () { return []; }
  };
  return new Proxy(target, {
    get: function (t, k) { return k in t ? t[k] : noop; },
    set: function (t, k, v) { t[k] = v; return true; }
  });
}

function makeCanvas() {
  return {
    width: 1000, height: 700, style: {},
    getContext: function () { return makeCtx(); },
    getBoundingClientRect: function () { return { left: 0, top: 0, width: 1000, height: 700 }; },
    addEventListener: function () {}, removeEventListener: function () {},
    setPointerCapture: function () {}, releasePointerCapture: function () {},
    toDataURL: function () { return 'data:,'; }
  };
}

function engine() {
  var ctx = {
    console: console, Math: Math, JSON: JSON, Date: Date, Object: Object, Array: Array,
    String: String, Number: Number, RegExp: RegExp, Error: Error, isNaN: isNaN, parseFloat: parseFloat,
    setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise, WeakMap: WeakMap, Map: Map, Set: Set,
    devicePixelRatio: 1,
    requestAnimationFrame: function () { return 1; }, cancelAnimationFrame: function () {},
    addEventListener: function () {}, removeEventListener: function () {},
    document: { createElement: function () { return makeCanvas(); } }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  ['share/engine/points.js', 'share/engine/constructions.js', 'share/engine/board.js'].forEach(function (f) {
    vm.runInContext(src(f), ctx, { filename: f });
  });
  var changes = 0;
  var b = new ctx.Board(makeCanvas(), { onChange: function () { changes++; } });
  b.setSlide({ id: 'sl1', items: [], bg: 'grid' });
  b.scale = 1; b.cam = { x: 0, y: 0 };
  return { b: b, Board: ctx.Board };
}

var fails = 0, passes = 0;
function ok(cond, msg) {
  if (cond) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); }
}
function same(a, b, msg) {
  ok(a === b, msg + (a === b ? '' : '   (є ' + JSON.stringify(a) + ', має бути ' + JSON.stringify(b) + ')'));
}
function scenario(name, fn) {
  console.log('\n• ' + name);
  try { fn(); } catch (e) { fails++; console.log('  ✗ впало: ' + (e && e.stack || e)); }
}

var pid = 1;
function ev(x, y, extra) {
  return Object.assign({ pointerId: pid, button: 0, clientX: x, clientY: y, shiftKey: false,
    preventDefault: function () {} }, extra || {});
}
function stroke(b, x, y) {
  b.setTool('pen');
  pid++;
  b._pointerDown(ev(x, y));
  b._pointerMove(ev(x + 30, y + 10));
  b._pointerMove(ev(x + 60, y));
  b._pointerUp(ev(x + 60, y));
}
function tap(b, x, y) {
  b.setTool('select');
  pid++;
  b._pointerDown(ev(x, y));
  b._pointerUp(ev(x, y));
}
function drag(b, x, y, dx, dy) {
  b.setTool('select');
  pid++;
  b._pointerDown(ev(x, y));
  b._pointerMove(ev(x + dx / 2, y + dy / 2));
  b._pointerMove(ev(x + dx, y + dy));
  b._pointerUp(ev(x + dx, y + dy));
}
// так чуже лягає на слайд: спершу рушій закриває свої кроки, потім зміна
function remote(b, it) {
  b.sealHistory();
  b.slide.items.push(it);
}
function ids(b) { return b.items().map(function (i) { return i.id; }).sort().join(','); }
function REMOTE() { return { id: 'remote-T', t: 'p', c: '#f00', w: 3, d: [500, 500, 520, 520] }; }

/* ============================================================ */

scenario('Два своїх штрихи, потім учень написав — два кроки назад не стирають учня', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  stroke(b, 100, 300);
  same(b.items().length, 2, 'два штрихи на дошці');
  remote(b, REMOTE());
  b.undo(); b.undo();
  same(ids(b), 'remote-T', 'лишився тільки штрих учня');
  b.redo(); b.redo();
  same(b.items().length, 3, 'крок уперед повертає обидва свої');
});

scenario('Тап по фігурі, учень написав, крок назад — учня не зачеплено', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  var mine = b.items()[0].id;
  tap(b, 130, 110);                     // просто виділили, нічого не змінили
  remote(b, REMOTE());
  b.undo();
  ok(b.items().some(function (i) { return i.id === 'remote-T'; }), 'штрих учня на місці');
  ok(!b.items().some(function (i) { return i.id === mine; }), 'скасовано свій штрих, а не «порожній» тап');
});

scenario('Перетягнули, учень написав, крок назад — своє вернулось на місце, учень лишився', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  var x0 = b.items()[0].d[0];
  drag(b, 130, 110, 200, 0);
  ok(b.items()[0].d[0] !== x0, 'штрих пересунуто');
  remote(b, REMOTE());
  b.undo();
  same(b.items().filter(function (i) { return i.id !== 'remote-T'; })[0].d[0], x0, 'штрих на старому місці');
  ok(b.items().some(function (i) { return i.id === 'remote-T'; }), 'штрих учня на місці');
});

scenario('Зміна кольору скасовується; повзунок — одним кроком', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  var it = b.items()[0];
  b.setSelection([it]);
  b.beginEdit('style:c');
  it.c = '#ff0000';
  b.changed();
  b.undo();
  ok(b.items().length === 1 && b.items()[0].c !== '#ff0000', 'колір повернувся, штрих на місці');

  var b2 = engine().b;
  stroke(b2, 100, 100);
  var w0 = b2.items()[0].w;
  b2.setSelection([b2.items()[0]]);
  for (var i = 1; i <= 6; i++) {           // повзунок: шість подій поспіль
    b2.beginEdit('style:w');
    b2.items()[0].w = w0 + i;
    b2.changed();
  }
  same(b2.history.length, 2, 'у історії: штрих + одна правка товщини');
  b2.undo();
  same(b2.items()[0].w, w0, 'один крок назад повертає товщину до початкової');
  same(b2.items().length, 1, 'сам штрих лишився');
});

scenario('Повзунок після чужої зміни — новий крок, а не злиття з попереднім', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  b.setSelection([b.items()[0]]);
  b.beginEdit('style:w'); b.items()[0].w = 7; b.changed();
  remote(b, REMOTE());
  b.beginEdit('style:w'); b.items().filter(function (i) { return i.id !== 'remote-T'; })[0].w = 9; b.changed();
  b.undo();
  same(b.items().filter(function (i) { return i.id !== 'remote-T'; })[0].w, 7, 'перший крок назад — лише друга правка');
  ok(b.items().some(function (i) { return i.id === 'remote-T'; }), 'штрих учня на місці');
});

function triangle(b) {
  var tri = { id: 'sh-1', t: 'g', sh: 'tri-sca', c: '#1358F5', w: 3, a: [0, 0, 200, 150] };
  var pa = { id: 'pt-a', t: 'o', c: '#000', n: 'A', p: [0, 0], on: { pid: 'sh-1', kind: 'vertex', i: 0 } };
  var pb = { id: 'pt-b', t: 'o', c: '#000', n: 'B', p: [400, 0] };
  var seg = { id: 'sg-1', t: 'c', c: '#f00', w: 2, a1: 'pt-a', a2: 'pt-b' };
  b.slide.items.push(tri, pa, pb, seg);
  b.addConstruction(tri, { k: 'median', i: 0 });
  b.changed();
  return tri;
}

scenario('Ctrl+D фігури: копія має власні точки й побудови', function () {
  var b = engine().b;
  var tri = triangle(b);
  b.setTool('select');
  b.setSelection([tri]);
  same(b.duplicateSelection(), 1, 'дубльовано 1 (як виділено)');
  var copy = b.items().filter(function (i) { return i.t === 'g' && i.id !== 'sh-1'; })[0];
  ok(!!copy, 'є копія трикутника');
  ok(b.items().some(function (i) { return i.t === 'o' && i.on && i.on.pid === copy.id; }), 'точка копії — на копії');
  ok(b.items().some(function (i) { return i.t === 'd' && i.pid === copy.id; }), 'медіана копії — на копії');
  same(b.items().filter(function (i) { return i.t === 'o' && i.on && i.on.pid === 'sh-1'; }).length, 1, 'на оригіналі одна точка, як і була');
  b.undo();
  same(b.items().filter(function (i) { return i.t === 'g'; }).length, 1, 'крок назад прибирає копію цілком');
});

scenario('Перенесення: вивантаження й вставка переписують звʼязки', function () {
  var b = engine().b;
  triangle(b);
  b.setSelection(b.items().filter(function (i) { return i.id === 'pt-a' || i.id === 'pt-b'; }));
  var ex = b.exportSelection();
  ok(ex.items.some(function (i) { return i.t === 'c'; }), 'відрізок їде разом з обома точками');
  var a = ex.items.filter(function (i) { return i.id === 'pt-a'; })[0];
  ok(!a.on, 'точка без своєї фігури стає вільною');
  var other = engine().b;
  var placed = other.importItems(ex.items, 50, 50);
  var seg = placed.filter(function (i) { return i.t === 'c'; })[0];
  var pts = placed.filter(function (i) { return i.t === 'o'; }).map(function (i) { return i.id; });
  ok(seg && pts.indexOf(seg.a1) >= 0 && pts.indexOf(seg.a2) >= 0, 'новий відрізок зʼєднує нові точки');
  ok(pts.indexOf('pt-a') < 0, 'номери нові');
});

scenario('Видалення точки прибирає її відрізок', function () {
  var b = engine().b;
  triangle(b);
  b.setSelection(b.items().filter(function (i) { return i.id === 'pt-b'; }));
  b.deleteSelection();
  ok(!b.items().some(function (i) { return i.t === 'c'; }), 'відрізок без точки прибрано');
  b.undo();
  ok(b.items().some(function (i) { return i.t === 'c'; }), 'крок назад повертає і точку, і відрізок');
});

scenario('Порожній крок не зʼїдає «крок назад»', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  b.setTool('eraser');
  pid++;
  b._pointerDown(ev(800, 600));             // гумка повз
  b._pointerUp(ev(800, 600));
  b.undo();
  same(b.items().length, 0, 'перший же крок назад прибрав штрих');
});

console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
process.exit(fails ? 1 : 0);
