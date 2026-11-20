/* Ядро сцени «Візуалізувати» без браузера.

   Запуск:  node tools/scene-test.js

   Справжній assets/js/scene-runtime.js; малювання (three.js) тут не
   вмикається — перевіряється те, від чого залежить урок: повзунки й
   кроки не виходять за межі, сміття з каналу нічого не ламає, учень
   бачить стан репетитора, а покрутивши сам — відчіплюється. */

'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var fails = 0, passes = 0;
function ok(c, m) { if (c) { passes++; console.log('  ✓ ' + m); } else { fails++; console.log('  ✗ ' + m); } }

var ctx = { Math: Math, Number: Number, Object: Object, Array: Array, String: String, isFinite: isFinite };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/scene-runtime.js'), 'utf8'), ctx);
var Core = ctx.SceneCore;

console.log('\n• Повзунки й кроки');
var c = new Core();
c.param('a', { min: -2, max: 2, value: 5 });
ok(c.values().a === 2, 'значення поза межами притискається до краю');
c.setParam('a', -9);
ok(c.values().a === -2, 'і при зміні теж');
ok(c.setParam('a', 'x') === false && c.values().a === -2, 'не число — не приймається');
c.stepTitles = ['Умова', 'Побудова', 'Відповідь'];
c.setStep(7);
ok(c.step === 2, 'крок не далі останнього');
c.setStep(-3);
ok(c.step === 0, 'і не раніше першого');

console.log('\n• Учень бачить репетитора, а покрутивши сам — відчіплюється');
var s = new Core();
s.role = 'student';
s.param('a', { min: 0, max: 10, value: 1 });
s.stepTitles = ['1', '2'];
ok(s.apply({ par: { a: 4 }, step: 1, cam: { p: [10, 1, 1], t: [0, 0, 0] } }) && s.values().a === 4 && s.step === 1,
   'стан репетитора застосовано: повзунок, крок, камера');
s.touched();
ok(s.detached, 'покрутив сам — відчепився');
ok(s.apply({ par: { a: 9 } }) === false && s.values().a === 4, 'чуже вже не тягне його назад');
ok(s.apply({ par: { a: 9 } }, true) && s.values().a === 9, '«До вчителя» — знову те саме, що в репетитора');
var t = new Core();
t.touched();
ok(!t.detached, 'репетитор від себе не відчіплюється');

console.log('\n• Сміття з каналу');
var g = new Core();
g.param('a', { min: 0, max: 1, value: 0.5 });
var threw = false;
try { g.apply(null); g.apply('x'); g.apply({ par: { a: 'нуль', b: 3 }, step: 'x', cam: { p: 1 } }); } catch (e) { threw = true; }
ok(!threw && g.values().a === 0.5 && g.cam === null, 'нічого не ламає й нічого не змінює');

console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
process.exit(fails ? 1 : 0);
