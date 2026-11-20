/* Встановити рендер Manim на цей ноутбук.

   Запуск:  node tools/manim-worker/install.js          — встановити й запустити
            node tools/manim-worker/install.js --remove — прибрати автозапуск

   Що робить:
   1. Копіює worker.js у C:\anim\worker (шлях латиницею: cmd.exe ламається
      на кириличних теках, а репозиторій лежить у C:\Users\Микита\…).
   2. Пише туди config.json — адресу бази й ПУБЛІЧНИЙ ключ із cloudconfig.js
      (жодних секретів), start.cmd (лише ASCII, CRLF) і hidden.vbs, що
      запускає його без чорного вікна.
   3. Автозапуск: значення VektorManim у HKCU\…\Run — лише для цього
      користувача, без прав адміністратора. --remove його прибирає.
   4. Запускає рендер. Перший запуск відкриє сторінку входу. */

'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var DEST = 'C:\\anim\\worker';
var RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
var NAME = 'VektorManim';

if (process.argv.indexOf('--remove') > 0) {
  try { cp.execFileSync('reg', ['delete', RUN_KEY, '/v', NAME, '/f'], { stdio: 'ignore' }); } catch (e) {}
  console.log('Автозапуск прибрано. Файли лишились у ' + DEST + ' — їх можна видалити вручну.');
  process.exit(0);
}

if (!fs.existsSync('C:\\anim')) { console.error('Немає C:\\anim — Manim не встановлено.'); process.exit(1); }
fs.mkdirSync(DEST, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'worker.js'), path.join(DEST, 'worker.js'));

var s = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'js', 'cloudconfig.js'), 'utf8');
var url = (s.match(/url:\s*'([^']+)'/) || [])[1];
var key = (s.match(/anonKey:\s*'([^']+)'/) || [])[1];
if (!url || !key) { console.error('У cloudconfig.js немає url чи anonKey'); process.exit(1); }
fs.writeFileSync(path.join(DEST, 'config.json'), JSON.stringify({ url: url, key: key }, null, 2));

var node = process.execPath;
if (/[^\x00-\x7f]/.test(node)) { console.error('Шлях до node не латиницею: ' + node); process.exit(1); }
var cmd = ['@echo off', 'cd /d ' + DEST, '"' + node + '" worker.js', ''].join('\r\n');
fs.writeFileSync(path.join(DEST, 'start.cmd'), cmd, 'ascii');
var vbs = ['Set sh = CreateObject("WScript.Shell")', 'sh.Run """' + DEST + '\\start.cmd""", 0, False', ''].join('\r\n');
fs.writeFileSync(path.join(DEST, 'hidden.vbs'), vbs, 'ascii');

cp.execFileSync('reg', ['add', RUN_KEY, '/v', NAME, '/t', 'REG_SZ', '/d',
  'wscript.exe "' + DEST + '\\hidden.vbs"', '/f'], { stdio: 'ignore' });

cp.spawn('wscript.exe', [path.join(DEST, 'hidden.vbs')], { detached: true, stdio: 'ignore' }).unref();
console.log('Встановлено в ' + DEST + ', автозапуск увімкнено, рендер запущено.');
console.log('Журнал: %APPDATA%\\vektor-manim\\worker.log');
