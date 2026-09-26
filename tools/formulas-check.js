/* Перевірка бази формул: node tools/formulas-check.js

   Що ловить:
   - повторені id формул і розділів, розділи без формул;
   - посилання uses на формули, яких немає, і цикли в доведеннях
     (формула не може спиратися сама на себе через ланцюжок);
   - теми карти (map), яких немає в mathmap-data.js;
   - команди TeX, яких не знає набірник MathFmt (вони показалися б
     учневі як «\tfrac»), і пастки його скорочень: «n!=» стає «n≠»;
   - посилання на точки малюнка, яких немає.

   Нічого не змінює, лише звітує. Код виходу 1, якщо є помилки. */

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.join(__dirname, '..');
var ctx = { window: {}, console: console };
ctx.window.window = ctx.window;
vm.createContext(ctx);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), ctx, { filename: rel });
}

load('assets/js/mathfmt.js');
load('assets/js/mathmap-data.js');
var app = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
var files = (/formulas:\s*\[([\s\S]*?)\]/.exec(app) || [, ''])[1].match(/'[^']+'/g).map(function (s) { return s.slice(1, -1); });
files.forEach(load);

var W = ctx.window, D = W.FORMULAS, M = W.MathFmt;
var errors = [], warns = [];
function err(m) { errors.push(m); }

var topics = {};
W.MATH_MAP.topics.forEach(function (t) { topics[t.id] = t; });

var byId = {}, secs = {};
D.sections.forEach(function (s) {
  if (secs[s.id]) err('розділ повторюється: ' + s.id);
  secs[s.id] = s;
  if (s.map && !topics[s.map]) err('розділ ' + s.id + ': немає теми карти ' + s.map);
});
D.items.forEach(function (it) {
  if (byId[it.id]) err('формула повторюється: ' + it.id);
  byId[it.id] = it;
});
D.sections.forEach(function (s) {
  if (!D.items.some(function (it) { return it.sec === s.id; })) err('порожній розділ: ' + s.id);
});

// TeX: усі шматки, які піде рендерити набірник
function texOf(it) {
  var out = [['f', it.f]];
  [['t', it.t], ['w', it.w], ['ex', it.ex], ['note', it.note], ['err', it.err]].concat(
    (it.p || []).map(function (s, i) { return ['p' + (i + 1), s]; })
  ).forEach(function (x) {
    if (!x[1]) return;
    String(x[1]).replace(/\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g, function (w, a, b) { out.push([x[0], a != null ? a : b]); return w; });
    // непарний долар — формула «протекла» в текст
    var bare = String(x[1]).replace(/\$\$[\s\S]*?\$\$|\$[^$]+\$/g, '');
    if (bare.indexOf('$') >= 0) err(it.id + ' [' + x[0] + ']: непарний знак $');
  });
  return out;
}

D.items.forEach(function (it) {
  (it.uses || []).forEach(function (u) { if (!byId[u]) err(it.id + ': uses → немає формули «' + u + '»'); });
  if (it.map && !topics[it.map]) err(it.id + ': немає теми карти ' + it.map);
  if (!it.sec || !secs[it.sec]) err(it.id + ': без розділу');

  texOf(it).forEach(function (x) {
    var src = x[1];
    if (/![ ]*=/.test(src) && /!=/.test(src)) err(it.id + ' [' + x[0] + ']: «!=» набірник перетворить на ≠ — поставте пробіл: «n! =»');
    var html = M.render(src);
    var left = html.replace(/<[^>]+>/g, '').match(/\\[a-zA-Z]+/g);
    if (left) err(it.id + ' [' + x[0] + ']: невідома команда ' + left.join(', '));
  });

  if (it.fig) {
    var P = it.fig.p || {};
    function need(n, where) { if (!P[n]) err(it.id + ': малюнок, ' + where + ' — немає точки «' + n + '»'); }
    function pair(tok) { return tok.indexOf('-') >= 0 ? tok.split('-') : tok.split(''); }
    function list(v) { return !v ? [] : Array.isArray(v) ? v : String(v).split(/\s+/).filter(Boolean); }
    ['s', 'd', 'h', 'vec'].forEach(function (k) {
      list(it.fig[k]).forEach(function (t) {
        var q = pair(t);
        if (q.length !== 2) err(it.id + ': малюнок ' + k + ' «' + t + '» — не дві точки');
        q.forEach(function (n) { need(n, k); });
      });
    });
    list(it.fig.r).forEach(function (t) {
      var q = pair(t);
      if (q.length !== 3) err(it.id + ': малюнок r «' + t + '» — не три точки');
      q.forEach(function (n) { need(n, 'r'); });
    });
    (it.fig.a || []).forEach(function (a) { [a[0], a[1], a[2]].forEach(function (n) { need(n, 'a'); }); });
    (it.fig.tk || []).forEach(function (a) { [a[0], a[1]].forEach(function (n) { need(n, 'tk'); }); });
    (it.fig.arc || []).forEach(function (a) { a.forEach(function (n) { need(n, 'arc'); }); });
    list(it.fig.q).forEach(function (n) { need(n, 'q'); });
  }
});

// цикли в доведеннях
var state = {};
function visit(id, trail) {
  if (state[id] === 2) return;
  if (state[id] === 1) { err('цикл у доведеннях: ' + trail.concat(id).join(' → ')); return; }
  state[id] = 1;
  (byId[id].uses || []).forEach(function (u) { if (byId[u]) visit(u, trail.concat(id)); });
  state[id] = 2;
}
Object.keys(byId).forEach(function (id) { visit(id, []); });

var withProof = D.items.filter(function (it) { return (it.p || []).length; }).length;
var withFig = D.items.filter(function (it) { return it.fig; }).length;
console.log('Розділів: ' + D.sections.length + ', формул: ' + D.items.length +
  ', з доведенням: ' + withProof + ', з малюнком: ' + withFig);
warns.forEach(function (w) { console.log('увага: ' + w); });
errors.forEach(function (e) { console.log('ПОМИЛКА: ' + e); });
console.log(errors.length ? errors.length + ' помилок' : 'усе гаразд');
process.exit(errors.length ? 1 : 0);
