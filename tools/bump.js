/* Підняти версію кабінету — перед кожним розгортанням.

     node tools/bump.js

   Номер живе в трьох місцях, і вони мусять збігатися:
     assets/js/app.js  — App.BUILD = 'v112'
     sw.js             — VERSION = 'vektor-v112'
     index.html        — ?v=112 в адресі кожного скрипту й стилю

   Браузер бере файл з адресою ?v=112 зі свого кешу, не питаючи сервер.
   Змінити код і не підняти номер — означає, що зміни ніхто не побачить,
   тож руками це не правимо: лише цим скриптом. Він же перевіряє, що в
   index.html не лишилося жодного свого файлу без номера. */

'use strict';

var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
function file(p) { return path.join(root, p); }
function read(p) { return fs.readFileSync(file(p), 'utf8'); }
function write(p, s) { fs.writeFileSync(file(p), s); }

var app = read('assets/js/app.js');
var m = /App\.BUILD = 'v(\d+)';/.exec(app);
if (!m) { console.error('У app.js не знайшовся рядок App.BUILD'); process.exit(1); }

var from = Number(m[1]);
var to = process.argv[2] ? Number(process.argv[2]) : from + 1;
if (!(to > 0)) { console.error('Номер має бути числом'); process.exit(1); }

var sw = read('sw.js');
var html = read('index.html');

var swFrom = /var VERSION = 'vektor-v(\d+)';/.exec(sw);
if (!swFrom) { console.error('У sw.js не знайшовся рядок VERSION'); process.exit(1); }

/* Свої файли без номера в index.html — саме та помилка, від якої цей
   скрипт захищає: такий файл закешується назавжди. */
var bare = html.match(/<(?:script src|link rel="stylesheet" href)="(?:assets|share)\/[^"?]+"/g);
if (bare) {
  console.error('У index.html є файли без ?v=:\n  ' + bare.join('\n  '));
  process.exit(1);
}

app = app.replace(m[0], "App.BUILD = 'v" + to + "';");
sw = sw.replace(swFrom[0], "var VERSION = 'vektor-v" + to + "';");
var n = 0;
html = html.replace(/(\.(?:js|css))\?v=\d+"/g, function (_, ext) { n++; return ext + '?v=' + to + '"'; });

/* Сторінка учня вантажить рушій сама, з номером ENGINE_V — той самий номер,
   що й у кабінету, тоді service worker віддає файли однієї версії. */
var share = read('share.html');
var ev = /var ENGINE_V = (\d+);/.exec(share);
if (!ev) { console.error('У share.html не знайшовся рядок ENGINE_V'); process.exit(1); }
share = share.replace(ev[0], 'var ENGINE_V = ' + to + ';');

write('assets/js/app.js', app);
write('sw.js', sw);
write('index.html', html);
write('share.html', share);

console.log('v' + from + ' → v' + to + ' (index.html: ' + n + ' адрес)');
/* Усі чотири мусять поїхати разом. v154 поїхала без app.js — і кожна
   вкладка перезавантажувалась по колу (див. tools/check-live.js). */
console.log('У коміт — усі чотири: assets/js/app.js sw.js index.html share.html');
console.log('Після викладки: node tools/check-live.js ' + to);
