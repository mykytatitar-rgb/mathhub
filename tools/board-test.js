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

// size — розмір полотна на екрані; його можна змінити посеред сценарію (поворот телефона)
function makeCanvas(size) {
  size = size || { w: 1000, h: 700 };
  return {
    width: size.w, height: size.h, style: {},
    getContext: function () { return makeCtx(); },
    getBoundingClientRect: function () { return { left: 0, top: 0, width: size.w, height: size.h }; },
    addEventListener: function () {}, removeEventListener: function () {},
    setPointerCapture: function () {}, releasePointerCapture: function () {},
    toDataURL: function () { return 'data:,'; }
  };
}

// найпростіший елемент сторінки — для шару курсорів поверх полотна
function fakeEl() {
  var path = { attrs: {}, setAttribute: function (k, v) { this.attrs[k] = v; } };
  var span = { style: {}, textContent: '' };
  return {
    style: {}, className: '', attrs: {}, children: [], parentNode: null, innerHTML: '',
    setAttribute: function (k, v) { this.attrs[k] = v; },
    appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
    remove: function () {
      var p = this.parentNode;
      if (p) { var i = p.children.indexOf(this); if (i >= 0) p.children.splice(i, 1); }
      this.parentNode = null;
    },
    querySelector: function (q) { return q === 'path' ? path : span; }
  };
}

/* o: { w, h — розмір полотна; touch — головний вказівник палець (телефон);
        dpr — щільність екрана; onTextPlace; dom — у полотна є батьківський
        елемент (для курсорів інших); onCursor } */
function engine(o) {
  o = o || {};
  var size = { w: o.w || 1000, h: o.h || 700 };
  var ctx = {
    console: console, Math: Math, JSON: JSON, Date: Date, Object: Object, Array: Array,
    String: String, Number: Number, RegExp: RegExp, Error: Error, isNaN: isNaN, parseFloat: parseFloat,
    setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval, Promise: Promise, WeakMap: WeakMap, Map: Map, Set: Set,
    devicePixelRatio: o.dpr || 1,
    requestAnimationFrame: function () { return 1; }, cancelAnimationFrame: function () {},
    addEventListener: function () {}, removeEventListener: function () {},
    // div — шар курсорів інших (присутність); решта — полотна
    document: { createElement: function (tag) { return tag === 'div' ? fakeEl() : makeCanvas(); } }
  };
  if (o.touch) ctx.matchMedia = function (q) { return { matches: /coarse/.test(q) }; };
  ctx.window = ctx;
  vm.createContext(ctx);
  ['share/engine/points.js', 'share/engine/constructions.js', 'share/engine/board.js'].forEach(function (f) {
    vm.runInContext(src(f), ctx, { filename: f });
  });
  var changes = 0;
  var cv = makeCanvas(size);
  if (o.dom) cv.parentElement = fakeEl();
  var b = new ctx.Board(cv, { onChange: function () { changes++; }, onTextPlace: o.onTextPlace, onCursor: o.onCursor });
  b.setSlide({ id: 'sl1', items: [], bg: 'grid' });
  b.scale = 1; b.cam = { x: 0, y: 0 };
  return { b: b, Board: ctx.Board, size: size, canvas: cv };
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

scenario('Долоня двома дотиками посунула й масштабувала полотно — перо повертає і місце, і масштаб', function () {
  var b = engine().b;
  b.setTool('pen');
  b._pointerDown(penEv(225, 10, 10));
  b._pointerUp(penEv(225, 10, 10));                       // стилус на пристрої вже був
  var view = b.cam.x + ',' + b.cam.y + ',' + b.scale;
  b._pointerDown(penEv(226, 600, 500, 'touch'));          // долоня — першим дотиком
  b._pointerDown(penEv(227, 700, 520, 'touch'));          // і другим: це вже «масштаб»
  b._pointerMove(penEv(226, 560, 470, 'touch'));          // долоня ковзнула й розійшлась
  b._pointerMove(penEv(227, 800, 560, 'touch'));
  ok(b.cam.x + ',' + b.cam.y + ',' + b.scale !== view, 'поки лягала — полотно поїхало');
  b._pointerDown(penEv(228, 300, 300));                   // перо
  same(b.cam.x + ',' + b.cam.y + ',' + b.scale, view, 'перо торкнулось — полотно й масштаб як були');
  b._pointerMove(penEv(228, 340, 310));
  b._pointerUp(penEv(228, 340, 310));
  b._pointerUp(penEv(226, 560, 470, 'touch'));
  b._pointerUp(penEv(227, 800, 560, 'touch'));
  var last = b.items()[b.items().length - 1];
  same(last.d[0] + ',' + last.d[1], '300,300', 'штрих почався там, де торкнулось перо');
  same(b._touchView, null, 'нічого не лишилось на наступний жест');
});

scenario('Свідомий масштаб двома пальцями, потім перо — масштаб лишається', function () {
  var b = engine().b;
  b.setTool('select');
  b._pointerDown(finger(229, 400, 300));
  b._pointerDown(finger(230, 600, 300));
  b._pointerMove(finger(229, 350, 300));
  b._pointerMove(finger(230, 650, 300));
  b._pointerUp(finger(229, 350, 300));
  b._pointerUp(finger(230, 650, 300));                    // пальці підняли — жест скінчився
  var view = b.cam.x + ',' + b.cam.y + ',' + b.scale;
  b.setTool('pen');
  b._pointerDown(penEv(231, 300, 300));
  b._pointerUp(penEv(231, 320, 300));
  same(b.cam.x + ',' + b.cam.y + ',' + b.scale, view, 'перо нічого не повертає');
});

/* ---------- Телефон: пальці ---------- */

function finger(id, x, y, extra) { return Object.assign(penEv(id, x, y, 'touch'), extra || {}); }

scenario('Два пальці рухають полотно за серединою між ними, а не лише масштабують', function () {
  var b = engine().b;
  b.setTool('pen');
  b._pointerDown(finger(300, 300, 300));
  b._pointerDown(finger(301, 500, 300));
  b._pointerMove(finger(300, 340, 320));
  b._pointerMove(finger(301, 540, 320));
  b._pointerUp(finger(300, 340, 320));
  b._pointerUp(finger(301, 540, 320));
  same(b.scale, 1, 'відстань між пальцями та сама — масштаб той самий');
  same(b.cam.x + ',' + b.cam.y, '-40,-20', 'полотно пішло за пальцями');
  same(b.items().length, 0, 'нічого не написано');
});

scenario('Розвели пальці — місце креслення між ними лишається між ними', function () {
  var b = engine().b;
  b.setTool('select');
  var before = b.toWorld(500, 300);
  b._pointerDown(finger(310, 400, 300));
  b._pointerDown(finger(311, 600, 300));
  b._pointerMove(finger(310, 350, 300));
  b._pointerMove(finger(311, 650, 300));
  same(b.scale, 1.5, 'масштаб за відстанню між пальцями');
  var now = b.toWorld(500, 300);
  ok(Math.abs(now.x - before.x) < 1e-6 && Math.abs(now.y - before.y) < 1e-6, 'під серединою — те саме місце');
  b._pointerUp(finger(310, 350, 300));
  b._pointerUp(finger(311, 650, 300));
});

scenario('Точка пальцем ставиться, коли його підняли; початок масштабу — жодної точки', function () {
  var b = engine().b;
  b.setTool('point');
  b._pointerDown(finger(320, 100, 100));
  same(b.items().length, 0, 'поки палець на склі — точки ще немає');
  b._pointerUp(finger(320, 100, 100));
  same(b.items().length, 1, 'підняли — точка є');
  var steps = b.history.length;
  b._pointerDown(finger(321, 200, 200));
  b._pointerDown(finger(322, 400, 400));                    // другий палець — це масштаб
  b._pointerMove(finger(321, 180, 180));
  b._pointerMove(finger(322, 420, 420));
  b._pointerUp(finger(321, 180, 180));
  b._pointerUp(finger(322, 420, 420));
  same(b.items().length, 1, 'зайвої точки немає');
  same(b.history.length, steps, 'і порожнього кроку назад теж');
});

scenario('Точка пальцем, що поїхав, — рух полотна, а не точка', function () {
  var b = engine().b;
  b.setTool('point');
  b._pointerDown(finger(330, 100, 100));
  b._pointerMove(finger(330, 130, 100));
  b._pointerMove(finger(330, 160, 100));
  b._pointerUp(finger(330, 160, 100));
  same(b.items().length, 0, 'точки немає');
  same(b.cam.x, -60, 'полотно пішло за пальцем');
});

scenario('Лінія пальцем: два дотики — дві точки й відрізок між ними', function () {
  var b = engine().b;
  b.setTool('link');
  b._pointerDown(finger(335, 100, 100)); b._pointerUp(finger(335, 100, 100));
  b._pointerDown(finger(336, 300, 100)); b._pointerUp(finger(336, 300, 100));
  same(b.items().filter(function (i) { return i.t === 'o'; }).length, 2, 'дві точки');
  same(b.items().filter(function (i) { return i.t === 'c'; }).length, 1, 'відрізок між ними');
});

scenario('Штрих першим пальцем, потім другий — штриха й кроку немає', function () {
  var b = engine().b;
  b.setTool('pen');
  b._pointerDown(finger(340, 100, 100));
  b._pointerMove(finger(340, 130, 110));
  b._pointerDown(finger(341, 400, 300));
  same(b.draft, null, 'почате першим пальцем скасовано');
  b._pointerMove(finger(340, 120, 120));
  b._pointerMove(finger(341, 420, 320));
  b._pointerUp(finger(340, 120, 120));
  b._pointerUp(finger(341, 420, 320));
  same(b.items().length, 0, 'на дошці нічого');
  same(b.history.length, 0, 'в історії нічого');
});

scenario('Фігура першим пальцем, потім масштаб — порожнього кроку назад немає', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  b.setTool('shape');
  b._pointerDown(finger(350, 400, 300));
  b._pointerMove(finger(350, 450, 340));
  b._pointerDown(finger(351, 600, 500));
  b._pointerUp(finger(350, 450, 340));
  b._pointerUp(finger(351, 600, 500));
  same(b.items().length, 1, 'фігури немає');
  b.undo();
  same(b.items().length, 0, 'перший же крок назад прибрав штрих, а не «нічого»');
});

scenario('Гумка пальцем: дотик першого пальця масштабу нічого не стирає, рух — стирає', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  var steps = b.history.length;
  b.setTool('eraser');
  b._pointerDown(finger(360, 130, 105));                   // на штриху
  same(b.items().length, 1, 'дотик сам по собі не стер');
  b._pointerDown(finger(361, 500, 500));                   // це був масштаб
  b._pointerMove(finger(360, 140, 110));
  b._pointerUp(finger(360, 140, 110));
  b._pointerUp(finger(361, 500, 500));
  same(b.items().length, 1, 'штрих цілий');
  same(b.history.length, steps, 'кроку не додалось');

  b._pointerDown(finger(362, 100, 100));
  b._pointerMove(finger(362, 130, 105));
  b._pointerUp(finger(362, 130, 105));
  same(b.items().length, 0, 'повели гумкою — стерла');
  b.undo();
  same(b.items().length, 1, 'крок назад повернув');
});

scenario('Перетягування першим пальцем, потім масштаб — обʼєкт на своєму місці', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  var x0 = b.items()[0].d[0], steps = b.history.length;
  b.setTool('select');
  b._pointerDown(finger(370, 130, 105));
  b._pointerMove(finger(370, 170, 105));
  b._pointerDown(finger(371, 500, 500));
  same(b.items()[0].d[0], x0, 'посунуте вернулось');
  same(b.history.length, steps, 'кроку не додалось');
  b._pointerUp(finger(370, 170, 105));
  b._pointerUp(finger(371, 500, 500));
});

scenario('Текст пальцем: поле — коли підняли (тоді iPhone відкриває клавіатуру), мишею — одразу', function () {
  var placed = [];
  var b = engine({ onTextPlace: function (w, s, kind) { placed.push(kind); } }).b;
  b.setTool('text');
  b._pointerDown(finger(380, 200, 200));
  same(placed.length, 0, 'дотик — ще не поле');
  b._pointerUp(finger(380, 202, 201));
  same(placed.join(), 'touch', 'підняли — поле, і рушій каже, що це палець');
  b._pointerDown(finger(381, 200, 200));
  b._pointerUp(finger(381, 200, 200, { type: 'pointercancel' }));
  same(placed.length, 1, 'перерваний дотик поля не відкриває');
  b._pointerDown(ev(300, 300, { pointerId: 382, pointerType: 'mouse' }));
  same(placed.join(), 'touch,mouse', 'мишею — одразу, як було');
});

scenario('Текст пером графічного планшета на компʼютері — одразу, як мишею; стилусом телефона — коли підняли', function () {
  var placed = [];
  var pc = engine({ onTextPlace: function (w, s, kind) { placed.push(kind); } }).b;
  pc.setTool('text');
  pc._pointerDown(penEv(383, 200, 200));
  same(placed.join(), 'pen', 'компʼютер: поле на натисканні пера');
  pc._pointerMove(penEv(383, 240, 200));
  pc._pointerUp(penEv(383, 240, 200));
  same(pc.cam.x + ',' + pc.cam.y, '0,0', 'і перо, що поїхало, полотна не рухає');

  var got = [];
  var ph = engine({ touch: true, onTextPlace: function (w, s, kind) { got.push(kind); } }).b;
  ph.setTool('text');
  ph._pointerDown(penEv(384, 200, 200));
  same(got.length, 0, 'телефон: дотик стилусом — ще не поле');
  ph._pointerUp(penEv(384, 200, 200));
  same(got.join(), 'pen', 'підняли — поле');
});

scenario('Текст: права кнопка миші рухає полотно, а не відкриває поле', function () {
  var placed = [];
  var b = engine({ onTextPlace: function () { placed.push(1); } }).b;
  b.setTool('text');
  b._pointerDown(ev(300, 300, { pointerId: 385, pointerType: 'mouse', button: 2 }));
  b._pointerMove(ev(260, 300, { pointerId: 385, pointerType: 'mouse', button: 2 }));
  b._pointerUp(ev(260, 300, { pointerId: 385, pointerType: 'mouse', button: 2 }));
  same(placed.length, 0, 'поля немає');
  same(b.cam.x, 40, 'полотно пішло за мишею');
  b._pointerDown(ev(300, 300, { pointerId: 386, pointerType: 'mouse', button: 1 }));
  b._pointerUp(ev(300, 300, { pointerId: 386, pointerType: 'mouse', button: 1 }));
  same(placed.length, 0, 'середня кнопка без руху — теж без поля');
});

scenario('Пальцем у тонку лінію влучити легше, ніж мишею', function () {
  var b = engine().b;
  stroke(b, 100, 100);                                      // (100,100)→(130,110)→(160,100)
  b.setTool('select');
  b._pointerDown(ev(130, 124, { pointerId: 390, pointerType: 'mouse' }));
  b._pointerUp(ev(130, 124, { pointerId: 390, pointerType: 'mouse' }));
  same(b.selection.length, 0, 'мишею за 14 px — повз');
  b._pointerDown(finger(391, 130, 124));
  b._pointerUp(finger(391, 130, 124));
  same(b.selection.length, 1, 'пальцем за 14 px — влучив');
});

/* ---------- Телефон: екран ---------- */

scenario('Вигляд слайда запамʼятовує розмір екрана', function () {
  var b = engine().b;
  stroke(b, 100, 100);
  b.saveCurrentView();
  same(b.slide.view.w + 'x' + b.slide.view.h, '1000x700', 'ширина й висота екрана в збереженому вигляді');
});

scenario('Слайд, підготовлений на ноутбуці, на телефоні вміщується, а не обрізається', function () {
  var b = engine({ w: 375, h: 600 }).b;
  b.setSlide({ id: 'sl2', items: [{ id: 'q', t: 'l', c: '#000', w: 3, a: [0, 0, 1300, 700] }],
               view: { x: 0, y: 0, s: 1, w: 1300, h: 700 } });
  ok(Math.abs(b.scale - 375 / 1300) < 1e-9, 'масштаб — щоб уся ширина влізла');
  var c = b.toScreen(650, 350);
  ok(Math.abs(c.x - 187.5) < 1e-6 && Math.abs(c.y - 300) < 1e-6, 'середина збереженого вигляду — посередині екрана');

  var d = engine().b;                                     // компʼютер: як і було
  d.setSlide({ id: 'sl3', items: [{ id: 'q', t: 'l', c: '#000', w: 3, a: [0, 0, 1300, 700] }],
               view: { x: 10, y: 20, s: 1, w: 1300, h: 700 } });
  same(d.scale + ' ' + d.cam.x + ',' + d.cam.y, '1 10,20', 'на компʼютері вигляд саме такий, яким збережений');
});

scenario('Поворот телефона: посередині екрана те саме місце; полотно не важче за 2× пікселів', function () {
  var e = engine({ w: 375, h: 700, touch: true, dpr: 3 });
  var b = e.b;
  b.resize();
  same(e.canvas.width, 750, 'щільність полотна — 2, а не 3');
  b.cam = { x: 40, y: 80 }; b.scale = 2;
  var mid = b.toWorld(375 / 2, 350);
  e.size.w = 700; e.size.h = 375;
  b.resize();
  var now = b.toWorld(350, 375 / 2);
  ok(Math.abs(now.x - mid.x) < 1e-9 && Math.abs(now.y - mid.y) < 1e-9, 'центр той самий');

  var pc = engine();                                       // компʼютер: лівий верхній кут на місці
  pc.b.cam = { x: 40, y: 80 };
  pc.size.w = 800; pc.size.h = 600;
  pc.b.resize();
  same(pc.b.cam.x + ',' + pc.b.cam.y, '40,80', 'на компʼютері камера не зсувається');
});

scenario('Третій палець посеред масштабу не пише; підняли один із трьох — полотно не стрибає', function () {
  var b = engine().b;
  b.setTool('pen');
  b._pointerDown(finger(400, 300, 300));
  b._pointerDown(finger(401, 500, 300));
  b._pointerDown(finger(402, 400, 500));                   // третій
  b._pointerMove(finger(402, 420, 520));
  same(b.draft, null, 'третій палець штриха не почав');
  b._pointerUp(finger(400, 300, 300));                     // підняли один із перших двох
  var cam = b.cam.x + ',' + b.cam.y + ',' + b.scale;
  b._pointerMove(finger(401, 500, 300));                   // ті, що лишились, — на місці
  b._pointerMove(finger(402, 420, 520));
  same(b.cam.x + ',' + b.cam.y + ',' + b.scale, cam, 'без руху пальців — без руху полотна');
  b._pointerMove(finger(401, 510, 300));
  b._pointerMove(finger(402, 430, 520));
  ok(Math.abs(b.cam.x - (-10)) < 1e-6 && Math.abs(b.scale - 1) < 1e-9, 'два, що лишились, рухають полотно як звичайно');
  b._pointerUp(finger(401, 510, 300));
  b._pointerUp(finger(402, 430, 520));
  same(b.items().length, 0, 'на дошці нічого');
});

scenario('«Вмістити все»: на компʼютері поля ті самі 60 px, на телефоні — вужчі', function () {
  var item = { id: 'q', t: 'l', c: '#000', w: 3, a: [0, 0, 1000, 500] };
  var d = engine().b;
  d.slide.items.push(JSON.parse(JSON.stringify(item)));
  d.fit();
  ok(Math.abs(d.scale - Math.min(880 / 1000, 580 / 500)) < 0.02, 'компʼютер: як і було (60 px з кожного боку)');
  var p = engine({ w: 375, h: 600 }).b;
  p.slide.items.push(JSON.parse(JSON.stringify(item)));
  p.fit();
  ok(p.scale > (375 - 120) / 1000 + 0.05, 'телефон: креслення займає більше ширини');
});

scenario('Вигляд без розміру екрана: на телефоні — усе написане, на планшеті — як збережено', function () {
  var it = [{ id: 'q', t: 'l', c: '#000', w: 3, a: [0, 0, 1300, 700] }];
  var ph = engine({ w: 375, h: 600 }).b;
  ph.setSlide({ id: 's1', items: JSON.parse(JSON.stringify(it)), view: { x: 0, y: 0, s: 1 } });
  ok(ph.scale < 0.5, 'телефон вмістив слайд');
  var tb = engine({ w: 1024, h: 700, touch: true }).b;
  tb.setSlide({ id: 's2', items: JSON.parse(JSON.stringify(it)), view: { x: 5, y: 6, s: 1.5 } });
  same(tb.scale + ' ' + tb.cam.x + ',' + tb.cam.y, '1.5 5,6', 'планшет відкрив збережений вигляд');
});

/* ---------- Дуга ---------- */

function arcGesture(b, cx, cy, sx, sy, path) {
  b.setTool('arc');
  pid++;
  b._pointerDown(ev(cx, cy));                 // центр
  b._pointerMove(ev(sx, sy));                 // до початку дуги
  b._pointerUp(ev(sx, sy));
  pid++;
  b._pointerDown(ev(sx, sy));                 // по колу
  path.forEach(function (q) { b._pointerMove(ev(q[0], q[1])); });
  var last = path[path.length - 1];
  b._pointerUp(ev(last[0], last[1]));
}
function arcs(b) { return b.items().filter(function (i) { return i.t === 'q'; }); }

scenario('Дуга як циркулем: центр, радіус, розмах за рукою', function () {
  var b = engine().b;
  var steps = b.history.length;
  arcGesture(b, 100, 100, 200, 100, [[171, 171], [100, 200], [29, 171], [1, 103]]);
  var q = arcs(b)[0];
  ok(!!q, 'дугу намальовано');
  same(q && q.o.join(','), '100,100', 'центр там, де натиснули');
  same(q && q.r, 100, 'радіус — до початку дуги');
  same(q && q.a0, 0, 'початок — праворуч від центра');
  same(q && q.s, 180, 'розмах ~180° прилип точно до 180°');
  same(b.history.length, steps + 1, 'один крок історії на всю дугу');
  ok(b.items().some(function (it) { return it.t === 'q'; }) && b.undo() && arcs(b).length === 0, 'крок назад прибрав дугу цілком');
});

scenario('Розгорнутий кут: точка на прямій — дуга від променя до протилежного', function () {
  var b = engine().b;
  b.slide.items.push({ id: 'ln', t: 'l', c: '#000', w: 3, a: [0, 100, 300, 100] });
  // центр трохи повз пряму, початок трохи під кутом — усе прилипає
  arcGesture(b, 101, 101, 160, 106, [[130, 150], [100, 160], [60, 140], [42, 108]]);
  var q = arcs(b)[0];
  ok(!!q, 'дугу намальовано');
  same(q && q.a0, 0, 'початок прилип до прямої');
  same(q && Math.abs(q.s), 180, 'кінець — на протилежному промені: рівно 180°');
});

scenario('Дуга: влучання лише в саму дугу, кінцем міняється розмах, Escape скасовує', function () {
  var b = engine().b;
  arcGesture(b, 100, 100, 200, 100, [[171, 171], [100, 200]]);
  var q = arcs(b)[0];
  same(q && q.s, 90, 'чверть кола');
  b.setTool('select');
  ok(b._hitTest(171, 171) === q, 'точка на дузі — влучання');
  ok(b._hitTest(100, 0) !== q, 'протилежний бік кола — повз');
  b.setSelection([q]);
  var h = b._handles().filter(function (x) { return x.id === 'q1'; })[0];
  ok(!!h, 'у дуги є ручка кінця');
  pid++;
  b._pointerDown(ev(h.x, h.y));
  b._pointerMove(ev(1, 101));
  b._pointerUp(ev(1, 101));
  same(q.s, 180, 'кінцем дотягнули до 180°');
  // недомальована дуга скасовується
  var n = b.items().length;
  b.setTool('arc');
  pid++;
  b._pointerDown(ev(300, 300)); b._pointerMove(ev(380, 300)); b._pointerUp(ev(380, 300));
  ok(b.cancelArc(), 'Escape: є що скасувати');
  same(b.items().length, n, 'нічого не додалось');
});

/* ---------- Присутність: курсор учня в кабінеті й навпаки ---------- */

// курсор гостя на дошці (перший, якщо їх кілька)
function peerEl(b) { for (var k in b.peers) return b.peers[k].el; return null; }

/* Два рушії (кабінет і сторінка учня), між ними — уявний канал: повідомлення
   копіюється, як через мережу. */
function presencePair() {
  var pT = null, pS = null, sent = [], sentData = [], peersT = [];
  var T = engine({ dom: true, onCursor: function (w, sl) { if (pT) pT.cursor(w, sl); } });
  var St = engine({ dom: true, onCursor: function (w, sl) { if (pS) pS.cursor(w, sl); } });
  // мережа: повідомлення доходять не в ту ж мить, а коли «дійде черга» (net)
  var wireQ = [], down = false;          // down — зʼєднання впало: усе, що шлють, губиться
  function wire(from, to) {
    return function (ev, d) {
      if (down) return;
      sent.push(from + ':' + ev);
      sentData.push({ from: from, ev: ev, d: JSON.parse(JSON.stringify(d)) });
      wireQ.push(function () { var p = to(); if (p) p.message(ev, JSON.parse(JSON.stringify(d))); });
    };
  }
  function net() { for (var k = 0; wireQ.length && k < 100; k++) wireQ.shift()(); }
  // як у справжніх сторінках: кабінет свого не показує, учень чужого не малює
  pT = T.Board.presence(T.b, {
    me: 'tutor', other: 'student', color: '#E5484D', name: function () { return 'Марія'; }, mine: false,
    send: wire('T', function () { return pS; }),
    onPeer: function (info) { peersT.push(info); }
  });
  pS = St.Board.presence(St.b, {
    me: 'student', other: 'tutor', theirs: false,
    send: wire('S', function () { return pT; })
  });
  net();
  return { T: T.b, S: St.b, pT: pT, pS: pS, sent: sent, sentData: sentData, peersT: peersT, net: net,
    setDown: function (v) { down = v; } };
}

scenario('Присутність: обидва знають одне про одного, курсор учня їде в кабінет', function () {
  var x = presencePair();
  ok(x.pT.here() && x.pS.here(), 'обидва знають, що інший на дошці (hi і відповідь)');
  same(x.pT.peer() && x.pT.peer().sl, 'sl1', 'репетитор знає слайд учня ще до руху мишею');
  pid++;
  x.S._pointerMove(ev(300, 200)); x.net();
  var p = x.pT.peer();
  same(p && p.x + ',' + p.y, '300,200', 'курсор учня приїхав у кабінет у координатах дошки');
  var el = peerEl(x.T);
  same(el && el.style.opacity, '1', 'той самий слайд — курсор видно');
  same(el && el.style.transform, 'translate(300px,200px)', 'курсор стоїть там, де рука учня');
  same(el && el.querySelector('span').textContent, 'Марія', 'на курсорі — ім’я учня');
  var n = x.sent.length;
  x.S._pointerMove(ev(310, 205)); x.net();
  same(x.sent.length, n, 'наступний рух у межах 90 мс чекає — канал не засипаємо');
  x.T.cam = { x: 100, y: 50 };
  x.T._placePeers();
  same(el.style.transform, 'translate(200px,150px)', 'зсунули свою дошку — курсор учня на тому ж місці креслення');
  x.pT.stop(); x.pS.stop(); x.net();
});

scenario('Присутність: інший слайд, мишу прибрали, свій же другий пристрій', function () {
  var x = presencePair();
  pid++;
  x.S._pointerMove(ev(300, 200)); x.net();
  x.S.setSlide({ id: 'sl2', items: [] });
  x.pS.slide('sl2'); x.net();
  var p = x.pT.peer();
  same(p && p.sl, 'sl2', 'учень перейшов на інший слайд — кабінет знає котрий');
  same(peerEl(x.T).style.opacity, '0', 'на чужому слайді курсора не видно');
  same(x.peersT[x.peersT.length - 1] && x.peersT[x.peersT.length - 1].sl, 'sl2', 'кабінету сказали про перехід (позначка в шапці)');
  x.pT.stop(); x.pS.stop();
  // свіжа пара: перший рух їде одразу, без 90 мс очікування
  x = presencePair();
  pid++;
  x.S._pointerMove(ev(320, 220)); x.net();
  x.S._onLeave({ pointerType: 'touch' }); x.net();
  ok(isFinite(x.pT.peer().x), 'палець відпустили — курсор лишається');
  x.S._onLeave({ pointerType: 'mouse' }); x.net();
  p = x.pT.peer();
  ok(p && !isFinite(p.x) && p.sl === 'sl1', 'мишу прибрали з дошки — курсор сховано, слайд відомий');
  ok(x.pT.message('cur', { who: 'tutor', sl: 'sl1', x: 5, y: 5 }) && x.pT.peer().x !== 5,
    'свій же другий пристрій учнем не вважається');
  same(x.pT.message('ops', {}), false, 'чужі події (ops) присутність не забирає');
  x.pT.stop(); x.pS.stop(); x.net();
});

scenario('Присутність в один бік: учень репетитора не бачить; «бувай»', function () {
  var x = presencePair();
  ok(x.pS.here(), 'сторінка учня знає, що репетитор тут (є кому слати свій курсор)');
  var n = x.sent.length;
  pid++;
  x.T._pointerMove(ev(100, 100)); x.net();
  same(x.sent.length, n, 'курсор репетитора нікуди не їде');
  x.T.setSlide({ id: 'sl2', items: [] });
  x.pT.slide('sl2'); x.net();
  same(x.sent.length, n, 'і його слайд теж');
  var fromT = x.sentData.filter(function (m) { return m.from === 'T'; });
  ok(fromT.length > 0 && fromT.every(function (m) {
    return (m.ev === 'hi' || m.ev === 'bye') && !('sl' in m.d) && !('x' in m.d) && !('gone' in m.d);
  }), 'від кабінету — лише «я тут», без слайда й курсора');
  // навіть якби старий кабінет надіслав свій курсор — сторінка учня його не малює
  x.pS.message('cur', { who: 'tutor', id: 'old', sl: 'sl1', x: 5, y: 5 });
  same(Object.keys(x.S.peers || {}).length, 0, 'на дошці учня жодного чужого курсора');
  same(x.pS.peer(), null, 'і нічого про те, де репетитор');
  x.pS.stop(); x.net();
  ok(!x.pT.peer() && !x.pT.here(), 'учень закрив дошку — кабінет одразу прибрав його');
  same(x.peersT[x.peersT.length - 1], null, 'і позначку в шапці теж');
  x.pT.stop(); x.net();
});

scenario('Присутність: репетитор пішов — учень свого курсора нікуди не шле', function () {
  var x = presencePair();
  x.pT.stop(); x.net();
  ok(!x.pS.here(), 'сторінка учня знає, що репетитора немає');
  var n = x.sent.length;
  pid++;
  x.S._pointerMove(ev(200, 200)); x.net();
  same(x.sent.length, n, 'рух учня нікуди не їде');
  x.pS.stop(); x.net();
});

scenario('Присутність: сміття в каналі, «бувай» завжди, курсор, що стоїть, не головний', function () {
  var x = presencePair();
  var threw = false;
  try {
    // обʼєкт, який не можна навіть перетворити на рядок (так буває лише навмисно)
    x.pT.message('cur', JSON.parse('{"who":"student","id":"evil","sl":{"toString":1,"valueOf":1},"x":1,"y":1}'));
  } catch (e) { threw = true; }
  ok(!threw, 'підступне повідомлення нічого не ламає');
  for (var i = 0; i < 8; i++) x.pT.message('hi', { who: 'student', id: 'junk' + i, re: 1 });
  ok(Object.keys(x.T.peers).length <= 6, 'чужих «пристроїв» не більше шести');
  ok(x.T.peers['student:junk7'], 'новенький не відкинутий — місце звільнив найстаріший');
  x.pT.stop(); x.pS.stop();

  x = presencePair();
  pid++;
  x.S._pointerMove(ev(300, 200)); x.net();
  for (var t0 = Date.now(); Date.now() - t0 < 3;) {}
  // другий пристрій учня озивається «я тут» зі своїм курсором, що стоїть
  x.pT.message('hi', { who: 'student', id: 'tablet', sl: 'sl1', x: 5, y: 5, re: 1 });
  same(x.pT.peer() && x.pT.peer().x, 300, 'головний — той, хто рухає курсор, а не той, хто озвався');
  x.pT.stop(); x.pS.stop();

  // ніхто ще не відповів, а дошку вже закрили — «бувай» однаково йде
  var sent = [];
  var lone = engine({ dom: true });
  var p = lone.Board.presence(lone.b, { me: 'student', other: 'tutor', theirs: false,
    send: function (ev) { sent.push(ev); } });
  p.stop();
  same(sent.join(','), 'hi,bye', '«бувай» іде, навіть коли того боку ще не чули');
});

scenario('Присутність: зв’язок учня блимнув саме тоді, як він перегорнув слайд', function () {
  var x = presencePair();
  pid++;
  x.S._pointerMove(ev(300, 200)); x.net();
  x.setDown(true);
  x.S.setSlide({ id: 'sl2', items: [] });
  x.pS.slide('sl2'); x.net();
  same(x.pT.peer() && x.pT.peer().sl, 'sl1', 'поки зв’язку немає, кабінет ще думає, що учень на першому слайді');
  x.setDown(false);
  x.pS.joined(); x.net();                       // канал приєднано знову
  same(x.pT.peer() && x.pT.peer().sl, 'sl2', 'щойно зв’язок повернувся — кабінет знає, де учень');
  x.pT.stop(); x.pS.stop();
});

scenario('Присутність: учень з двох пристроїв — два курсори, головний той, що рухається', function () {
  var x = presencePair();
  // другий пристрій учня (телефон) у тому ж каналі
  var St2 = engine({ dom: true });
  var pS2 = St2.Board.presence(St2.b, {
    me: 'student', other: 'tutor', theirs: false,
    send: function (ev, d) { x.pT.message(ev, JSON.parse(JSON.stringify(d))); }
  });
  // відповідь кабінету в каналі чують усі пристрої учня
  pS2.message('hi', { who: 'tutor', id: 'tut1', sl: 'sl1', re: 1 });
  pid++;
  x.S._pointerMove(ev(300, 200)); x.net();
  for (var t0 = Date.now(); Date.now() - t0 < 3;) {}      // телефон рухнув пізніше, а не в ту ж мілісекунду
  pS2.cursor({ x: 50, y: 60 }, 'sl1');
  same(Object.keys(x.T.peers).length, 2, 'у кабінеті два курсори учня, а не один, що стрибає');
  same(x.pT.peer() && x.pT.peer().x, 50, 'значок у шапці веде до того, хто рухав курсор останнім');
  pS2.stop();
  same(Object.keys(x.T.peers).length, 1, 'телефон закрили — його курсор зник, компʼютерний лишився');
  same(x.pT.peer() && x.pT.peer().x, 300, 'головним знову став компʼютер');
  x.pT.stop(); x.pS.stop();
});

console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
process.exit(fails ? 1 : 0);
