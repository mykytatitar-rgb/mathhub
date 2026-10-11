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

/* Чуже, що лягає ПОСЕРЕД жесту: живий урок, учень пише безперервно, а
   читання журналу закінчується саме тоді, коли репетитор веде лінію. */
scenario('Учень написав посеред мого штриха — крок назад прибирає саме мій штрих', function () {
  var b = engine().b;
  stroke(b, 100, 100);                              // A
  var a = b.items()[0].id;
  b.setTool('pen'); pid++;
  b._pointerDown(ev(100, 300));                     // B почався
  b._pointerMove(ev(130, 310));
  remote(b, REMOTE());                              // посеред штриха
  b._pointerMove(ev(160, 300));
  b._pointerUp(ev(160, 300));
  same(b.items().length, 3, 'на дошці A, B і учнівське');
  b.undo();
  ok(b.items().some(function (i) { return i.id === a; }), 'A лишився');
  ok(b.items().some(function (i) { return i.id === 'remote-T'; }), 'учнівське лишилось');
  same(b.items().length, 2, 'прибрано лише B');
  b.undo();
  same(ids(b), 'remote-T', 'другий крок назад прибрав A, учнівське на місці');
});

scenario('Учень написав посеред перетягування — своє вернулось, чуже лишилось', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  var x0 = b.items()[0].d[0];
  b.setTool('select'); pid++;
  b._pointerDown(ev(130, 110));
  b._pointerMove(ev(200, 110));
  remote(b, REMOTE());
  b._pointerMove(ev(300, 110));
  b._pointerUp(ev(300, 110));
  b.undo();
  same(b.items().filter(function (i) { return i.id !== 'remote-T'; })[0].d[0], x0, 'штрих на старому місці');
  ok(b.items().some(function (i) { return i.id === 'remote-T'; }), 'учнівське на місці');
});

scenario('Учень написав посеред гумки — стерте вертається, чуже лишається', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  stroke(b, 100, 300);
  var gone = b.items()[1].id;
  b.setTool('eraser'); pid++;
  b._pointerDown(ev(130, 310));
  remote(b, REMOTE());
  b._pointerMove(ev(140, 305));
  b._pointerUp(ev(140, 305));
  ok(!b.items().some(function (i) { return i.id === gone; }), 'гумка стерла другий штрих');
  b.undo();
  ok(b.items().some(function (i) { return i.id === gone; }), 'крок назад повернув стерте');
  ok(b.items().some(function (i) { return i.id === 'remote-T'; }), 'учнівське на місці');
});

scenario('Відкинута крихітна лінія посеред чужого не зʼїдає попередній крок', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  stroke(b, 100, 300);
  b.setTool('line'); pid++;
  b._pointerDown(ev(500, 100));
  remote(b, REMOTE());
  b._pointerUp(ev(501, 100));                       // 1 пиксель — лінію відкинуто
  same(b.items().length, 3, 'лінії немає, два штрихи й учнівське');
  b.undo();
  same(b.items().length, 2, 'крок назад прибрав останній штрих, а не «нічого»');
  ok(b.items().some(function (i) { return i.id === 'remote-T'; }), 'учнівське на місці');
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

/* ---------- Перо ---------- */

function penEv(id, x, y, kind, between) {
  var e = ev(x, y, { pointerId: id, pointerType: kind || 'pen' });
  if (between) {
    e.getCoalescedEvents = function () {
      return between.map(function (q) { return { clientX: q[0], clientY: q[1] }; }).concat([{ clientX: x, clientY: y }]);
    };
  }
  return e;
}

scenario('Перо: беруться всі проміжні точки, а не одна на кадр', function () {
  var b = engine().b;
  b.setTool('pen');
  b._pointerDown(penEv(70, 0, 0));
  b._pointerMove(penEv(70, 40, 10, 'pen', [[10, 0], [20, 5], [30, 10]]));
  b._pointerUp(penEv(70, 40, 10));
  same(b.items().length, 1, 'штрих на дошці');
  same(b.items()[0].d.length / 2, 5, 'усі 5 точок: перша й чотири з одного кадру');
});

scenario('Перо: штрих отримує крок назад лише коли перо піднялось', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  var steps = b.history.length;
  b.setTool('pen');
  b._pointerDown(penEv(71, 10, 400));
  same(b.history.length, steps, 'перо торкнулось — слайд не переписується в історію');
  b._pointerMove(penEv(71, 60, 420));
  b._pointerUp(penEv(71, 60, 420));
  same(b.history.length, steps + 1, 'перо піднялось — рівно один новий крок');
  b.undo();
  same(b.items().length, 1, 'крок назад прибрав саме цей штрих');
});

scenario('Долоня поруч зі стилусом не обриває штрих і не масштабує', function () {
  var b = engine().b;
  b.setTool('pen');
  var scale0 = b.scale;
  b._pointerDown(penEv(80, 100, 100));
  b._pointerDown(penEv(81, 400, 500, 'touch'));            // долоня лягла на екран
  b._pointerMove(penEv(81, 420, 520, 'touch'));
  b._pointerMove(penEv(80, 160, 120));
  b._pointerUp(penEv(81, 420, 520, 'touch'));              // долоню прибрали
  b._pointerMove(penEv(80, 200, 100));
  b._pointerUp(penEv(80, 200, 100));
  same(b.items().length, 1, 'штрих дописано до кінця');
  same(b.items()[0].d.length / 2, 3, 'усі три точки пера, жодної від долоні');
  same(b.scale, scale0, 'масштаб не змінився');
});

scenario('Долоня, що лягла раніше за перо, — не штрих і не масштаб', function () {
  var b = engine().b;
  b.setTool('pen');
  b._pointerDown(penEv(90, 400, 500, 'touch'));            // спершу долоня
  b._pointerMove(penEv(90, 410, 505, 'touch'));
  b._pointerDown(penEv(91, 100, 100));                     // потім перо
  b._pointerMove(penEv(91, 150, 110));
  b._pointerMove(penEv(90, 430, 520, 'touch'));            // долоня ворухнулась
  b._pointerUp(penEv(91, 150, 110));
  b._pointerUp(penEv(90, 430, 520, 'touch'));
  same(b.items().length, 1, 'на дошці лише штрих пера');
  same(b.items()[0].d[0], 100, 'і почався він там, де торкнулось перо');
});

scenario('Після стилуса один палець рухає полотно, а не пише', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  b.setTool('pen');
  b._pointerDown(penEv(95, 10, 10));
  b._pointerUp(penEv(95, 10, 10));                         // стилус на цьому пристрої вже був
  var n = b.items().length, cx = b.cam.x;
  b._pointerDown(penEv(96, 300, 300, 'touch'));
  b._pointerMove(penEv(96, 250, 300, 'touch'));
  b._pointerUp(penEv(96, 250, 300, 'touch'));
  same(b.items().length, n, 'пальцем нічого не написано');
  same(b.cam.x, cx + 50, 'полотно зсунулось за пальцем');
});

scenario('Долоня потягнула обʼєкт, потім торкнулось перо: потягнуте вертається, чуже після «кроку назад» лишається', function () {
  var b = engine().b;
  stroke(b, 100, 100);                                    // A
  var a = b.items()[0], ax = a.d[0];
  stroke(b, 100, 300);                                    // B
  b.setTool('select');
  b._pointerDown(penEv(200, 130, 105, 'touch'));          // долоня лягла на A
  b._pointerMove(penEv(200, 150, 115, 'touch'));          // і посунула його
  b._pointerDown(penEv(201, 700, 600));                   // перо
  b._pointerUp(penEv(201, 700, 600));
  b._pointerUp(penEv(200, 150, 115, 'touch'));
  same(b.items()[0].d[0], ax, 'A на своєму місці');
  ok(!b._drag && !b.band, 'жодного незакінченого жесту');
  remote(b, REMOTE());                                    // учень написав
  b.undo(); b.undo();
  ok(b.items().some(function (i) { return i.id === 'remote-T'; }), 'два кроки назад не стерли учнівського');
});

scenario('Рамка виділення від долоні не висить після того, як торкнулось перо', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  b.setTool('select');
  b._pointerDown(penEv(210, 600, 500, 'touch'));          // долоня на порожньому — рамка
  b._pointerMove(penEv(210, 620, 520, 'touch'));
  b._pointerDown(penEv(211, 130, 105));                   // перо на обʼєкті
  b._pointerUp(penEv(211, 130, 105));
  b._pointerUp(penEv(210, 620, 520, 'touch'));
  same(b.band, null, 'рамки немає');
  same(Object.keys(b._pointers).length, 0, 'дотиків, що «висять», немає');
});

scenario('Долоня, що посунула полотно, поки лягала, — полотно вертається', function () {
  var b = engine().b;
  b.setTool('pen');
  b._pointerDown(penEv(220, 10, 10));
  b._pointerUp(penEv(220, 10, 10));                       // стилус на пристрої вже був
  var cx = b.cam.x, cy = b.cam.y;
  b._pointerDown(penEv(221, 600, 500, 'touch'));          // долоня
  b._pointerMove(penEv(221, 612, 507, 'touch'));          // ковзнула
  b._pointerDown(penEv(222, 300, 300));                   // перо
  b._pointerMove(penEv(222, 340, 310));
  b._pointerUp(penEv(222, 340, 310));
  same(b.cam.x + ',' + b.cam.y, cx + ',' + cy, 'полотно на місці');
  var last = b.items()[b.items().length - 1];
  same(last.d[0] + ',' + last.d[1], '300,300', 'штрих почався там, де торкнулось перо');
});

console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
process.exit(fails ? 1 : 0);
