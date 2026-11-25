// Старт сховища: що підтягується в памʼять.  node tools/disk-test.js
'use strict';
var fs = require('fs'), vm = require('vm'), path = require('path');
var SRC = fs.readFileSync(path.join(__dirname, '../assets/js/disk.js'), 'utf8');

var fails = 0, passes = 0;
function ok(c, m) { if (c) passes++; else { fails++; console.log('  ✗ ' + m); } }

// найпростіший IndexedDB: одне сховище kv, читання по ключу й курсором по діапазону
function fakeIDB(data, reads) {
  function req(fn) {
    var r = {};
    setImmediate(function () { fn(r); });
    return r;
  }
  var store = {
    get: function (k) { return req(function (r) { reads.push(k); r.result = k in data ? data[k] : undefined; r.onsuccess(); }); },
    put: function (v, k) { data[k] = v; },
    delete: function (k) { delete data[k]; },
    openCursor: function (range) {
      var keys = Object.keys(data).filter(function (k) { return k >= range.lo && k <= range.hi; }).sort(), i = 0;
      var r = {};
      function step() {
        setImmediate(function () {
          if (i >= keys.length) { r.result = null; r.onsuccess(); return; }
          var k = keys[i++];
          reads.push(k);
          r.result = { key: k, value: data[k], continue: step };
          r.onsuccess();
        });
      }
      step();
      return r;
    }
  };
  var db = {
    transaction: function () {
      var tx = { objectStore: function () { return store; } };
      setImmediate(function () { if (tx.oncomplete) tx.oncomplete(); });
      return tx;
    }
  };
  return {
    open: function () { return req(function (r) { r.result = db; r.onsuccess(); }); }
  };
}

function boot(data) {
  var reads = [], ls = { 'mathhub.disk.moved': '1' };
  var win = {
    indexedDB: fakeIDB(data, reads),
    localStorage: {
      getItem: function (k) { return k in ls ? ls[k] : null; },
      setItem: function (k, v) { ls[k] = String(v); },
      removeItem: function (k) { delete ls[k]; }
    }
  };
  var ctx = { window: win, localStorage: win.localStorage, indexedDB: win.indexedDB, console: { warn: function () {}, error: console.error },
    setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise, String: String, Object: Object,
    IDBKeyRange: { bound: function (lo, hi) { return { lo: lo, hi: hi }; } } };
  vm.runInNewContext(SRC, ctx);
  return new Promise(function (resolve) { win.Disk.ready(function () { resolve({ D: win.Disk, reads: reads }); }); });
}

var BIG = new Array(1000).join('x');
var full = {
  'mathhub.boards.order': '["a","b"]',
  'mathhub.board:a': '{"lessonId":"a","_sync":{}}',
  'mathhub.board:b': '{"lessonId":"b","_sync":{}}',
  'mathhub.boards.v1': '[' + BIG + ']',
  'mathhub.ops.base': '{' + BIG + '}',
  'mathhub.rec.hash': '{}'
};

boot(Object.assign({}, full)).then(function (r) {
  ok(r.D.get('mathhub.board:a') !== null, 'дошки прочитані');
  ok(r.reads.indexOf('mathhub.boards.v1') < 0, 'старий спільний запис дошок не читається, коли нові записи повні');
  ok(r.reads.indexOf('mathhub.ops.base') < 0, 'стара копія «відомого серверу» не читається, коли в дошок своя');

  // дошки b немає окремим записом — тоді без давнього запису не обійтись
  var gap = Object.assign({}, full);
  delete gap['mathhub.board:b'];
  return boot(gap);
}).then(function (r) {
  ok(r.D.get('mathhub.boards.v1') !== null, 'бракує дошки — давній запис прочитано');

  // дошка без власної копії «відомого серверу» — потрібна стара
  var old = Object.assign({}, full);
  old['mathhub.board:b'] = '{"lessonId":"b"}';
  return boot(old);
}).then(function (r) {
  ok(r.D.get('mathhub.ops.base') !== null, 'дошка без _sync — стару копію прочитано');

  // нового формату ще немає — читаємо давній
  return boot({ 'mathhub.boards.v1': '[]' });
}).then(function (r) {
  ok(r.D.get('mathhub.boards.v1') === '[]', 'без нового формату давній запис читається');
  console.log(fails ? passes + ' пройдено, ' + fails + ' не пройдено' : passes + ' пройдено, 0 не пройдено');
  process.exit(fails ? 1 : 0);
});
