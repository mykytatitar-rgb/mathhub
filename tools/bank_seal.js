/* Зашифрувати банк задач перед розгортанням.

     node tools/bank_seal.js

   Звідки: assets/data/{book,olymp}/…  — відкриті файли, їх збирають
           book_build.py і olymp_build.py; у git вони НЕ йдуть.
   Куди:   assets/bank/…                — зашифровані копії, їх і бачить сайт.

   Навіщо. Задачі з підручників — чужі тексти, і лежати у відкритому доступі
   вони не можуть. Раніше весь сайт закривав Cloudflare Access — і змушував
   щоразу вводити код із пошти. Тепер сайт відкритий, а закрите лише це:
   файли банку зашифровані, і ключ є тільки в акаунті репетитора (він
   синхронізується разом з іншими даними, див. assets/js/bankseal.js).

   Ключ — tools/books/bank.key (теж поза git). Якщо його немає, скрипт
   створить новий; тоді кабінету треба передати його заново посиланням
   https://mathhub-7dw.pages.dev/#/bank-key/<ключ>.

   Шифр — AES-256-GCM. Вектор ініціалізації виводиться з самого вмісту
   (HMAC), тож незмінений файл дає той самий результат: git не бачить
   «змін» там, де їх немає. JSON перед шифруванням стискається gzip —
   так він ще й важить уп'ятеро менше. */

'use strict';

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var crypto = require('crypto');

var root = path.join(__dirname, '..');
var SRC = path.join(root, 'assets', 'data');
var OUT = path.join(root, 'assets', 'bank');
var KEYFILE = path.join(__dirname, 'books', 'bank.key');

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

var key;
if (fs.existsSync(KEYFILE)) {
  key = unb64url(fs.readFileSync(KEYFILE, 'utf8').trim());
} else {
  key = crypto.randomBytes(32);
  fs.writeFileSync(KEYFILE, b64url(key) + '\n');
  console.log('Створено новий ключ: ' + path.relative(root, KEYFILE));
  console.log('Передайте його кабінету: https://mathhub-7dw.pages.dev/#/bank-key/' + b64url(key));
}
if (key.length !== 32) { console.error('Ключ має бути 32 байти'); process.exit(1); }

// позначка ключа — щоб кабінет відрізнив «ключа немає» від «ключ не той»
var kid = crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);

function walk(dir) {
  var out = [];
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    var p = path.join(dir, d.name);
    if (d.isDirectory()) out = out.concat(walk(p));
    else if (/\.(json|png|jpe?g|webp)$/i.test(d.name)) out.push(p);
  });
  return out;
}

function seal(plain) {
  var iv = crypto.createHmac('sha256', key).update(plain).digest().subarray(0, 12);
  var c = crypto.createCipheriv('aes-256-gcm', key, iv);
  var body = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, body, c.getAuthTag()]);
}

var files = walk(SRC);
if (!files.length) {
  console.error('Немає що шифрувати: ' + path.relative(root, SRC) + ' порожня');
  process.exit(1);
}

var manifest = { v: 1, kid: kid, files: {} };
var keep = {};
var written = 0, raw = 0, sealed = 0;

files.forEach(function (f) {
  var rel = path.relative(SRC, f).split(path.sep).join('/');
  var data = fs.readFileSync(f);
  var isJson = /\.json$/i.test(rel);
  var plain = isJson ? zlib.gzipSync(data, { level: 9 }) : data;
  var out = seal(plain);

  var dest = path.join(OUT, rel + '.bin');
  keep[dest] = 1;
  var old = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
  if (!old || !old.equals(out)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, out);
    written++;
  }
  manifest.files[rel] = crypto.createHash('sha256').update(out).digest('hex').slice(0, 16);
  raw += data.length;
  sealed += out.length;
});

// те, чого вже немає в джерелі, прибираємо — інакше лежало б вічно
(function prune(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    var p = path.join(dir, d.name);
    if (d.isDirectory()) { prune(p); return; }
    if (/\.bin$/.test(d.name) && !keep[p]) { fs.unlinkSync(p); console.log('прибрано ' + path.relative(root, p)); }
  });
})(OUT);

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');

console.log(Object.keys(manifest.files).length + ' файлів, змінено ' + written +
  '; ' + (raw / 1048576).toFixed(1) + ' МБ → ' + (sealed / 1048576).toFixed(1) + ' МБ');
