/* Перевірка після розгортання: чи живий сайт віддає одну версію.

     node tools/check-live.js [номер]

   Номер версії живе в sw.js, у App.BUILD (app.js) і в адресах index.html.
   Якщо на сервер поїхала лише частина (sw.js новий, app.js старий),
   кожна відкрита вкладка вважає свій код застарілим і перезавантажується
   по колу. Так сталося з v154: app.js не потрапив у коміт. Цей скрипт
   ловить таке одразу після викладки. Без номера — просто звіряє частини
   між собою; з номером — ще й чекає, поки сайт віддасть саме його. */

'use strict';

var https = require('https');

var SITE = 'https://mathhub-7dw.pages.dev/';
var want = process.argv[2] ? Number(process.argv[2]) : null;

function get(url) {
  return new Promise(function (resolve, reject) {
    https.get(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'nc=' + Date.now(), {
      headers: { 'Cache-Control': 'no-cache' }
    }, function (res) {
      var body = '';
      res.setEncoding('utf8');
      res.on('data', function (c) { body += c; });
      res.on('end', function () { resolve({ status: res.statusCode, body: body }); });
    }).on('error', reject);
  });
}

function once() {
  return Promise.all([get(SITE + 'sw.js'), get(SITE)]).then(function (r) {
    var sw = (/vektor-v(\d+)/.exec(r[0].body) || [])[1];
    var html = r[1].body;
    var appV = (/assets\/js\/app\.js\?v=(\d+)/.exec(html) || [])[1];
    var shareP = get(SITE + 'share');          // /share.html Cloudflare переадресовує сюди
    return Promise.all([get(SITE + 'assets/js/app.js?v=' + appV), shareP]).then(function (r2) {
      var build = (/App\.BUILD = 'v(\d+)'/.exec(r2[0].body) || [])[1];
      var engine = (/var ENGINE_V = (\d+);/.exec(r2[1].body) || [])[1];
      return { sw: Number(sw), html: Number(appV), build: Number(build), engine: Number(engine) };
    });
  });
}

function same(v) { return v.sw && v.sw === v.html && v.sw === v.build && v.sw === v.engine; }

var tries = 0;
(function loop() {
  once().then(function (v) {
    var line = 'sw.js v' + v.sw + ' · index.html v' + v.html + ' · App.BUILD v' + v.build + ' · share.html v' + v.engine;
    if (same(v) && (!want || v.sw === want)) { console.log('Гаразд: ' + line); process.exit(0); }
    // розгортання ще йде (сайт віддає частини різних версій) — чекаємо до 5 хв
    if (want && tries < 30) {
      tries++;
      return setTimeout(loop, 10000);
    }
    console.error('РОЗБІЖНІСТЬ: ' + line);
    console.error('Якась частина версії не поїхала на сервер — перевірте, чи все закомічено (git status).');
    process.exit(1);
  }).catch(function (e) {
    if (tries++ < 3) return setTimeout(loop, 5000);
    console.error('Сайт не відповів:', e && e.message);
    process.exit(2);
  });
})();
