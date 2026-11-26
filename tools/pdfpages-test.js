// PDF на дошку: які сторінки й як лягають.  node tools/pdfpages-test.js
'use strict';
var fs = require('fs'), vm = require('vm'), path = require('path');
var SRC = fs.readFileSync(path.join(__dirname, '../assets/js/pdfpages.js'), 'utf8');

var fails = 0, passes = 0;
function ok(c, m) { if (c) { passes++; console.log('  ✓ ' + m); } else { fails++; console.log('  ✗ ' + m); } }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

var win = {};
vm.runInNewContext(SRC, { window: win, Math: Math });
var P = win.PdfPages;

console.log('• Що вважати PDF');
ok(P.isPdf({ type: 'application/pdf', name: 'a' }), 'за типом');
ok(P.isPdf({ type: '', name: 'Алгебра 8.PDF' }), 'за назвою, коли браузер не дав типу');
ok(!P.isPdf({ type: 'image/png', name: 'x.png' }), 'картинка — не PDF');

console.log('• Які сторінки');
ok(same(P.parseRange('', 4), [1, 2, 3, 4]), 'порожньо — усі');
ok(same(P.parseRange('3-5, 1', 10), [1, 3, 4, 5]), 'проміжок і окремі, по порядку');
ok(same(P.parseRange('2–3', 10), [2, 3]), 'довге тире як дефіс');
ok(same(P.parseRange('8-20, 0, abc', 10), [8, 9, 10]), 'поза файлом і сміття — відкидаються');
ok(same(P.parseRange('5-3', 10), [3, 4, 5]), 'проміжок навпаки');
ok(same(P.parseRange('2,2,2', 10), [2]), 'без повторів');

console.log('• Розкладка — горизонтально в рядок');
var boxes = P.layout([{ w: 600, h: 800 }, { w: 800, h: 600 }, { w: 600, h: 800 }], { x: 1000, y: 500 }, 400, 20);
ok(boxes.length === 3, 'по рамці на сторінку');
ok(boxes.every(function (b) { return b.h === 400 && b.y === 300; }), 'однакова висота, один рядок, по центру точки');
ok(boxes[0].x === 1000 - 150 && boxes[0].w === 300, 'перша — по центру точки вставки, пропорції збережені');
ok(boxes[1].x === boxes[0].x + boxes[0].w + 20, 'друга — праворуч від першої з проміжком');
ok(Math.abs(boxes[1].w - 400 * 800 / 600) < 1e-9, 'альбомна сторінка ширша');
ok(boxes[2].x === boxes[1].x + boxes[1].w + 20, 'третя — далі праворуч');

console.log('• Чіткість рендеру');
ok(P.scaleFor(595, 842, 1800) === 1800 / 842, 'А4 — довша сторона 1800 px, як стеля сховища картинок');
ok(P.scaleFor(50, 50, 1800) === 4, 'крихітна сторінка — не більше ×4');

console.log('\n' + passes + ' пройшло, ' + fails + ' впало');
process.exit(fails ? 1 : 0);
