/* Перевірка обміну «як у Miro» без справжнього сервера.

   Запуск:  node tools/sync-test.js

   Імітує Supabase (журнал дій, знімки дошок, записи) у памʼяті й кілька
   пристроїв, кожен у власному оточенні зі своїм сховищем. Сценарії —
   ті, на яких раніше губилися дані: одночасне малювання, стирання на
   одному пристрої й зміни на іншому, робота без мережі, давній пристрій,
   учень, що пише посеред запису репетитора, пізно видимі записи бази. */

'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
function src(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

/* ============================================================
   Сервер
   ============================================================ */

function Server() {
  this.ops = [];          // {id, board, op, author, at, visible}
  this.boards = {};       // board_id -> {rev, data, updated_at}
  this.records = {};      // kind/id -> {kind,id,data,rev,deleted,updated_at}
  this.nextId = 1;
  this.clock = Date.parse('2026-09-22T10:00:00Z');
  this.hold = false;      // нові дії поки не видно (імітація пізнього коміту)
}
Server.prototype.now = function () { this.clock += 7; return new Date(this.clock).toISOString(); };

function parseFilters(url) {
  var q = url.split('?')[1] || '';
  var out = [];
  q.split('&').forEach(function (kv) {
    if (!kv) return;
    var i = kv.indexOf('=');
    out.push([decodeURIComponent(kv.slice(0, i)), decodeURIComponent(kv.slice(i + 1))]);
  });
  return out;
}

function cmp(val, opv) {
  var m = opv.match(/^(eq|gt|lte|lt|gte|in)\.(.*)$/);
  if (!m) throw new Error('op? ' + opv);
  var o = m[1], v = m[2];
  if (o !== 'in') v = v.replace(/^"(.*)"$/, '$1');     // значення в лапках, як їх шле обмін
  if (o === 'in') {
    var list = v.replace(/^\(|\)$/g, '').split(',').map(function (x) { return x.replace(/^"|"$/g, ''); });
    return list.indexOf(String(val)) >= 0;
  }
  var a = val, b = v;
  if (typeof val === 'number') b = Number(v);
  if (o === 'eq') return String(a) === String(b);
  if (o === 'gt') return a > b;
  if (o === 'lt') return a < b;
  if (o === 'lte') return a <= b;
  if (o === 'gte') return a >= b;
}

/* or=(a.gt.1,and(b.gt.2,c.gt.3)) — розбір із вкладеністю, як у PostgREST. */
function logic(kind, text) {
  var inner = text.replace(/^\(/, '').replace(/\)$/, '');
  var parts = [], depth = 0, cur = '';
  for (var i = 0; i < inner.length; i++) {
    var ch = inner[i];
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur) parts.push(cur);
  var tests = parts.map(function (pt) {
    var m = pt.match(/^(and|or)(\(.*\))$/);
    if (m) return logic(m[1], m[2]);
    var d = pt.indexOf('.');
    var col = pt.slice(0, d), rest = pt.slice(d + 1);
    return function (o) { return cmp(o[col], rest); };
  });
  return kind === 'or'
    ? function (o) { return tests.some(function (t) { return t(o); }); }
    : function (o) { return tests.every(function (t) { return t(o); }); };
}

Server.prototype.handle = function (who, url, opts) {
  var self = this;
  var method = (opts && opts.method) || 'GET';
  var body = opts && opts.body ? JSON.parse(opts.body) : null;
  var p = url.split('?')[0];
  var F = parseFilters(url);
  function get(name) { var f = F.filter(function (x) { return x[0] === name; }); return f.map(function (x) { return x[1]; }); }

  if (p === '/rest/v1/rpc/append_board_ops') {
    body.p_ops.forEach(function (op) {
      self.ops.push({ id: self.nextId++, board: body.p_board, op: JSON.parse(JSON.stringify(op)),
                      author: 'tutor', at: self.now(), visible: !self.hold });
    });
    var mx = 0;
    self.ops.forEach(function (o) { if (o.board === body.p_board && o.id > mx) mx = o.id; });
    return mx;
  }
  if (p === '/rest/v1/rpc/save_board') {
    var cur = self.boards[body.p_board];
    if (!cur) { self.boards[body.p_board] = { rev: 1, data: body.p_data, updated_at: self.now() }; return 1; }
    if (cur.rev !== body.p_rev) return -1;
    cur.rev++; cur.data = body.p_data; cur.updated_at = self.now();
    return cur.rev;
  }
  if (p === '/rest/v1/rpc/save_record') {
    var k = body.p_kind + '/' + body.p_id;
    var r = self.records[k];
    if (!r) r = self.records[k] = { kind: body.p_kind, id: body.p_id, rev: 0 };
    r.data = JSON.parse(JSON.stringify(body.p_data)); r.rev++; r.deleted = false; r.updated_at = self.now();
    return r.rev;
  }
  if (p === '/rest/v1/rpc/delete_record') {
    var k2 = body.p_kind + '/' + body.p_id;
    var r2 = self.records[k2];
    if (!r2) return 0;
    r2.deleted = true; r2.rev++; r2.updated_at = self.now();
    return r2.rev;
  }
  if (p === '/rest/v1/board_ops' && method === 'GET') {
    var rows = self.ops.filter(function (o) { return o.visible; });
    F.forEach(function (f) {
      var k = f[0], v = f[1];
      if (k === 'board') rows = rows.filter(function (o) { return cmp(o.board, v); });
      else if (k === 'id') rows = rows.filter(function (o) { return cmp(o.id, v); });
      else if (k === 'op->>t') rows = rows.filter(function (o) { return cmp(o.op.t, v); });
      else if (k === 'or') {
        var expr = logic('or', v);
        rows = rows.filter(function (o) { return expr(o); });
      }
    });
    rows.sort(function (a, b) { return a.id - b.id; });
    var lim = Number(get('limit')[0] || 1000);
    return rows.slice(0, lim).map(function (o) {
      return { id: o.id, op: JSON.parse(JSON.stringify(o.op)), author: o.author, at: o.at };
    });
  }
  if (p === '/rest/v1/boards' && method === 'GET') {
    var sel = get('select')[0] || '';
    var ids = Object.keys(self.boards);
    F.forEach(function (f) { if (f[0] === 'board_id') ids = ids.filter(function (id) { return cmp(id, f[1]); }); });
    return ids.map(function (id) {
      var b = self.boards[id];
      var row = { board_id: id, rev: b.rev, updated_at: b.updated_at };
      if (sel.indexOf('data->_seen') >= 0) row.seen = b.data._seen;
      else if (sel.indexOf('data') >= 0) row.data = JSON.parse(JSON.stringify(b.data));
      return row;
    });
  }
  if (p === '/rest/v1/boards' && method === 'DELETE') {
    F.forEach(function (f) { if (f[0] === 'board_id') delete self.boards[f[1].slice(3)]; });
    return null;
  }
  if (p === '/rest/v1/records' && method === 'GET') {
    var recs = Object.keys(self.records).map(function (k) { return self.records[k]; });
    F.forEach(function (f) {
      if (f[0] === 'updated_at') recs = recs.filter(function (r) { return cmp(r.updated_at, f[1]); });
      if (f[0] === 'kind') recs = recs.filter(function (r) { return cmp(r.kind, f[1]); });
      if (f[0] === 'deleted') recs = recs.filter(function (r) { return cmp(String(!!r.deleted), f[1]); });
      if (f[0] === 'or') { var ex = logic('or', f[1]); recs = recs.filter(function (r) { return ex(r); }); }
    });
    function key3(r) { return [r.updated_at, r.kind, r.id]; }
    recs.sort(function (a, b) {
      var x = key3(a), y = key3(b);
      for (var i = 0; i < 3; i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; }
      return 0;
    });
    var off = Number(get('offset')[0] || 0), l2 = Number(get('limit')[0] || 1000);
    return JSON.parse(JSON.stringify(recs.slice(off, off + l2)));
  }
  throw new Error('Невідомий запит: ' + method + ' ' + url);
};

/* ============================================================
   Пристрій
   ============================================================ */

// sharedLs — сховище іншої вкладки того самого браузера (спільне), інакше своє
function Device(name, server, sharedLs) {
  var ls = sharedLs || {};
  var ctx = {
    console: { log: console.log, warn: function () {}, info: function () {}, error: console.error },
    setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval,
    Promise: Promise, JSON: JSON, Math: Math, Date: Date, Object: Object, Array: Array, String: String, Number: Number,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    localStorage: {
      getItem: function (k) { return k in ls ? ls[k] : null; },
      setItem: function (k, v) { ls[k] = String(v); },
      removeItem: function (k) { delete ls[k]; }
    },
    navigator: { onLine: true, platform: name },
    document: { visibilityState: 'visible', addEventListener: function () {}, querySelector: function () { return null; } },
    addEventListener: function () {}
  };
  ctx.window = ctx;
  var dev = this;
  this.name = name;
  this.online = true;
  this.server = server;
  this.ls = ls;
  var n = 0;
  ctx.U = { uid: function (p) { return (p || 'x') + '-' + name + '-' + (++n); } };

  var hooks = [];
  var db = { students: [], lessons: [], payments: [], homeworks: [], progress: [], roadmap: [], desk: [],
             mathmap: [], stumap: [], materials: [], notes: [], boards: [], tutor: { name: 'Т' }, version: 1 };
  var lastDoc = '';
  ctx.S = {
    db: function () { return db; },
    getBoard: function (id) { return db.boards.filter(function (b) { return b.lessonId === id; })[0] || null; },
    touchBoards: function () {},
    save: function () {
      var doc = {};
      Object.keys(db).forEach(function (k) { if (k !== 'boards') doc[k] = db[k]; });
      lastDoc = JSON.stringify(doc);
      hooks.forEach(function (f) { f(); });
    },
    lastDoc: function () { return lastDoc; },
    onSave: function (f) { hooks.push(f); },
    newSlide: function () { return { id: ctx.U.uid('sl'), title: '', bg: 'grid', items: [], kind: 'lesson', hidden: 0 }; },
    ensureItemIds: function () { return false; },
    saveBoard: function (b) { ctx.BoardSync.mark(b.lessonId); },
    removeBoards: function (ids) {
      var n = 0;
      (ids || []).forEach(function (id) {
        var i = db.boards.findIndex(function (b) { return b.lessonId === id; });
        if (i >= 0) { db.boards.splice(i, 1); n++; }
      });
      return n;
    }
  };
  ctx.Cloud = {
    available: function () { return true; },
    signedIn: function () { return true; },
    writesBlocked: function () { return false; },
    request: function (url, opts) {
      return new Promise(function (resolve, reject) {
        setImmediate(function () {
          if (!dev.online) { reject(new Error('offline')); return; }
          try {
            var out = server.handle(name, url, opts);
            resolve({ ok: true, status: 200, json: function () { return Promise.resolve(out); } });
          } catch (e) { reject(e); }
        });
      });
    }
  };
  vm.createContext(ctx);
  ['share/engine/ops.js', 'assets/js/boardops.js', 'assets/js/boardsync.js', 'assets/js/recsync.js']
    .forEach(function (f) { vm.runInContext(src(f), ctx, { filename: f }); });
  this.ctx = ctx;
  this.db = db;
}
Device.prototype.setOnline = function (on) { this.online = on; this.ctx.navigator.onLine = on; };
Device.prototype.board = function (id) { return this.ctx.S.getBoard(id); };
Device.prototype.newBoard = function (id) {
  var b = { id: this.ctx.U.uid('brd'), lessonId: id, slides: [{ id: 'sl0-' + id, title: '', bg: 'grid', items: [], kind: 'lesson', hidden: 0 }] };
  this.db.boards.push(b);
  this.ctx.BoardOps.prepare(b);
  return b;
};
Device.prototype.draw = function (id, slideIdx, itemId, extra) {
  var it = Object.assign({ id: itemId, t: 'p', d: [1, 2, 3] }, extra || {});
  this.board(id).slides[slideIdx || 0].items.push(it);
  return it;
};
Device.prototype.erase = function (id, itemId) {
  this.board(id).slides.forEach(function (s) { s.items = s.items.filter(function (x) { return x.id !== itemId; }); });
};
Device.prototype.send = function (id) { return this.ctx.BoardOps.record(id).then(function () { return wait(); }); };
Device.prototype.pull = function (id) { return this.ctx.BoardOps.pull(id).then(function () { return wait(); }); };
Device.prototype.sync = function (id) { var d = this; return d.send(id).then(function () { return d.pull(id); }); };
Device.prototype.content = function (id) {
  var b = this.board(id);
  return b ? JSON.stringify(this.ctx.BoardCore.strip(b)) : null;
};
Device.prototype.ids = function (id) {
  var out = [];
  var b = this.board(id);
  if (b) b.slides.forEach(function (s) { s.items.forEach(function (it) { out.push(it.id); }); });
  return out.sort();
};

function wait(ms) { return new Promise(function (r) { setTimeout(r, ms || 15); }); }

/* ============================================================
   Перевірки
   ============================================================ */

var fails = 0, passes = 0;
function ok(cond, msg) {
  if (cond) { passes++; console.log('  ✓ ' + msg); }
  else { fails++; console.log('  ✗ ' + msg); }
}
function same(a, b, msg) {
  ok(a === b, msg + (a === b ? '' : '\n      ' + a + '\n      ' + b));
}

var scenarios = [];
function scenario(name, fn) { scenarios.push({ name: name, fn: fn }); }

scenario('Новий пристрій бачить дошку, створену на іншому', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  A.newBoard('L1');
  A.draw('L1', 0, 'a1'); A.draw('L1', 0, 'a2');
  return A.sync('L1').then(function () {
    return B.ctx.BoardOps.fetchMissing();
  }).then(function () {
    return B.pull('L1');
  }).then(function () {
    same(B.content('L1'), A.content('L1'), 'B має ту саму дошку, що й A');
  });
});

scenario('Одночасне малювання на двох пристроях — нічого не губиться', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  A.newBoard('L1'); B.newBoard('L1');
  A.draw('L1', 0, 'a1'); B.draw('L1', 0, 'b1');
  return Promise.all([A.send('L1'), B.send('L1')]).then(function () {
    A.draw('L1', 0, 'a2'); B.draw('L1', 0, 'b2');
    return Promise.all([A.sync('L1'), B.sync('L1')]);
  }).then(function () { return Promise.all([A.pull('L1'), B.pull('L1')]); })
  .then(function () {
    same(A.ids('L1').join(), 'a1,a2,b1,b2', 'A має все');
    same(B.ids('L1').join(), 'a1,a2,b1,b2', 'B має все');
    same(A.board('L1').slides.length, 1, 'перші слайди злилися в один');
  });
});

scenario('Стерте на одному пристрої не воскресає, змінене на іншому — лишається', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  A.newBoard('L1');
  A.draw('L1', 0, 'x'); A.draw('L1', 0, 'y');
  return A.sync('L1').then(function () {
    DBG('snap _seen', srv.boards.L1 && srv.boards.L1.data._seen, 'ops', srv.ops.map(function (o) { return o.id + o.op.t; }).join(' '));
    return B.ctx.BoardOps.fetchMissing();
  })
  .then(function () { DBG('B seen', B.board('L1')._sync.seen); return B.pull('L1'); })
  .then(function () {
    A.erase('L1', 'x');
    B.board('L1').slides[0].items.filter(function (i) { return i.id === 'y'; })[0].c = 'red';
    return Promise.all([A.send('L1'), B.send('L1')]);
  }).then(function () { return Promise.all([A.pull('L1'), B.pull('L1')]); })
  .then(function () { return Promise.all([A.pull('L1'), B.pull('L1')]); })
  .then(function () {
    same(A.ids('L1').join(), 'y', 'на A лише y');
    same(A.content('L1'), B.content('L1'), 'A і B однакові');
    var y = A.board('L1').slides[0].items[0];
    same(y.c, 'red', 'зміна кольору з B дійшла до A');
  });
});

scenario('Той самий обʼєкт змінили обидва — всюди однаково (пізніший)', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  A.newBoard('L1'); A.draw('L1', 0, 'z');
  return A.sync('L1').then(function () { return B.ctx.BoardOps.fetchMissing(); })
  .then(function () { return B.pull('L1'); })
  .then(function () {
    A.board('L1').slides[0].items[0].c = 'blue';
    B.board('L1').slides[0].items[0].c = 'green';
    return A.send('L1');
  }).then(function () { return B.send('L1'); })
  .then(function () { return Promise.all([A.pull('L1'), B.pull('L1')]); })
  .then(function () {
    same(A.content('L1'), B.content('L1'), 'A і B збіглися');
    same(A.board('L1').slides[0].items[0].c, 'green', 'перемагає пізніший запис');
  });
});

scenario('Без мережі: намальоване й стерте тут доїжджає, чуже не губиться', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  A.newBoard('L1'); A.draw('L1', 0, 'a1'); A.draw('L1', 0, 'a2');
  return A.sync('L1').then(function () { return B.ctx.BoardOps.fetchMissing(); })
  .then(function () { return B.pull('L1'); })
  .then(function () {
    B.setOnline(false);
    B.draw('L1', 0, 'b-off'); B.erase('L1', 'a1');
    return B.send('L1');
  }).then(function () {
    A.draw('L1', 0, 'a3');
    return A.sync('L1');
  }).then(function () {
    B.setOnline(true);
    return B.ctx.BoardOps.flush();
  }).then(function () { return wait(40); })
  .then(function () { return Promise.all([A.pull('L1'), B.pull('L1')]); })
  .then(function () {
    same(A.ids('L1').join(), 'a2,a3,b-off', 'A: стерте B зникло, нове B і A лишилось');
    same(A.content('L1'), B.content('L1'), 'A і B однакові');
  });
});

scenario('Давній пристрій (стара версія, без журналу) не воскрешає стерте й не губить своє', function () {
  var srv = new Server(), A = new Device('A', srv), C = new Device('C', srv);
  A.newBoard('L1'); A.draw('L1', 0, 'k1'); A.draw('L1', 0, 'k2'); A.draw('L1', 0, 'k3');
  // C колись отримав копію цілком (стара синхронізація), журналу не знає
  var copy = JSON.parse(JSON.stringify(A.board('L1')));
  delete copy._sync;
  return A.sync('L1').then(function () {
    A.erase('L1', 'k2');
    return A.sync('L1');
  }).then(function () {
    copy.slides[0].items.push({ id: 'c-local', t: 'p', d: [9] });  // намальоване на C, ніде не записане
    C.db.boards.push(copy);
    return C.pull('L1');
  }).then(function () { return C.send('L1'); })
  .then(function () { return Promise.all([A.pull('L1'), C.pull('L1')]); })
  .then(function () {
    same(C.ids('L1').join(), 'c-local,k1,k3', 'C: k2 не воскрес, своє лишилось');
    same(A.ids('L1').join(), 'c-local,k1,k3', 'A отримав своє C');
  });
});

scenario('Учень пише між записами репетитора — нічого не пропускається', function () {
  var srv = new Server(), A = new Device('A', srv);
  A.newBoard('L1'); A.draw('L1', 0, 't1');
  return A.sync('L1').then(function () {
    // учень дописує в журнал, репетитор ще не читав
    srv.ops.push({ id: srv.nextId++, board: 'L1', author: 'student', at: srv.now(), visible: true,
      op: { t: 'i+', s: 'sl0-L1', it: { id: 'st1', t: 'p', by: 'student', d: [5] } } });
    A.draw('L1', 0, 't2');
    return A.send('L1');         // після запису номер журналу вже за дією учня
  }).then(function () { return A.pull('L1'); })
  .then(function () {
    same(A.ids('L1').join(), 'st1,t1,t2', 'дія учня на дошці репетитора');
  });
});

scenario('Запис бази, видимий із запізненням, не губиться', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  A.newBoard('L1'); A.draw('L1', 0, 'first');
  return A.sync('L1').then(function () { return B.ctx.BoardOps.fetchMissing(); })
  .then(function () { return B.pull('L1'); })
  .then(function () {
    srv.hold = true;                       // запис A ще не закомічено
    A.draw('L1', 0, 'late');
    return A.ctx.BoardOps.record('L1');
  }).then(function () {
    srv.hold = false;
    B.draw('L1', 0, 'early');
    return B.send('L1');                   // запис B видно раніше, хоч номер більший
  }).then(function () { return B.pull('L1'); })
  .then(function () {
    srv.ops.forEach(function (o) { o.visible = true; });   // тепер видно й запізнілий
    return B.pull('L1');
  }).then(function () { return A.pull('L1'); })
  .then(function () {
    same(B.ids('L1').join(), 'early,first,late', 'B має й запізнілий запис A');
    // порядок «що над чим» тут може різнитися — записи бази прийшли не по черзі
    same(A.ids('L1').join(), B.ids('L1').join(), 'A і B мають те саме');
  });
});

scenario('Порядок слайдів і що над чим — доходять', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  var b = A.newBoard('L1');
  b.slides.push({ id: 's2', title: 'Два', bg: 'grid', items: [], kind: 'lesson', hidden: 0 });
  b.slides.push({ id: 's3', title: 'Три', bg: 'grid', items: [], kind: 'lesson', hidden: 0 });
  A.draw('L1', 0, 'p'); A.draw('L1', 0, 'q');
  return A.sync('L1').then(function () { return B.ctx.BoardOps.fetchMissing(); })
  .then(function () { return B.pull('L1'); })
  .then(function () {
    var s = A.board('L1').slides;
    s.unshift(s.pop());                         // «Три» — першим
    var items = s[1].items; items.push(items.shift());   // p — нагору
    return A.sync('L1');
  }).then(function () { return B.pull('L1'); })
  .then(function () {
    same(B.board('L1').slides.map(function (x) { return x.id; }).join(), 's3,sl0-L1,s2', 'порядок слайдів');
    same(B.board('L1').slides[1].items.map(function (x) { return x.id; }).join(), 'q,p', 'що над чим');
  });
});

scenario('Знімок + журнал = та сама дошка (як бачить учень і новий пристрій)', function () {
  var srv = new Server(), A = new Device('A', srv);
  A.newBoard('L1');
  var chain = Promise.resolve();
  for (var i = 0; i < 6; i++) (function (i) {
    chain = chain.then(function () {
      A.draw('L1', 0, 'm' + i);
      if (i === 3) A.erase('L1', 'm1');
      return A.sync('L1');
    });
  })(i);
  return chain.then(function () {
    var snap = srv.boards.L1;
    ok(!!snap, 'знімок є на сервері');
    var st = JSON.parse(JSON.stringify(snap.data));
    var K = A.ctx.BoardCore;
    srv.ops.filter(function (o) { return o.id > (snap.data._seen || 0); })
      .forEach(function (o) { K.apply(st, o.op); });
    same(JSON.stringify(K.strip(st)), A.content('L1'), 'знімок + дії після нього = дошка A');
  });
});

scenario('Ctrl+Z після стирання повертає обʼєкт усюди', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  A.newBoard('L1'); A.draw('L1', 0, 'u1'); A.draw('L1', 0, 'u2');
  var keep;
  return A.sync('L1').then(function () { return B.ctx.BoardOps.fetchMissing(); })
  .then(function () { return B.pull('L1'); })
  .then(function () {
    keep = JSON.parse(JSON.stringify(A.board('L1').slides[0].items[0]));
    A.erase('L1', 'u1');
    return A.sync('L1');
  }).then(function () { return B.pull('L1'); })
  .then(function () {
    same(B.ids('L1').join(), 'u2', 'стерте зникло на B');
    A.board('L1').slides[0].items.unshift(keep);          // скасування стирання
    return A.sync('L1');
  }).then(function () { return B.pull('L1'); })
  .then(function () {
    same(B.ids('L1').join(), 'u1,u2', 'повернене зʼявилось на B');
    same(A.content('L1'), B.content('L1'), 'A і B однакові');
  });
});

scenario('Слайд видалили на одному пристрої, поки на ньому малюють на іншому', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  var b = A.newBoard('L1');
  b.slides.push({ id: 'sX', title: 'Задача', bg: 'grid', items: [], kind: 'lesson', hidden: 0 });
  A.draw('L1', 1, 'old');
  return A.sync('L1').then(function () { return B.ctx.BoardOps.fetchMissing(); })
  .then(function () { return B.pull('L1'); })
  .then(function () {
    A.board('L1').slides.splice(1, 1);                 // A видаляє слайд
    B.draw('L1', 1, 'fresh-ink');                      // B саме на ньому пише
    return A.sync('L1');
  }).then(function () { return B.sync('L1'); })
  .then(function () { return wait(500); })            // B сам довозить повернений слайд
  .then(function () { return Promise.all([A.pull('L1'), B.pull('L1')]); })
  .then(function () {
    ok(B.ids('L1').indexOf('fresh-ink') >= 0, 'написане на B лишилось');
    ok(A.ids('L1').indexOf('fresh-ink') >= 0, 'і дійшло до A разом зі слайдом');
    same(A.content('L1'), B.content('L1'), 'A і B однакові');
  });
});

scenario('Посилання для учня, створене на одному пристрої, видно на іншому', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  A.newBoard('L1'); A.draw('L1', 0, 'q');
  return A.sync('L1').then(function () { return B.ctx.BoardOps.fetchMissing(); })
  .then(function () { return B.pull('L1'); })
  .then(function () {
    A.board('L1').share = { token: 'tok123', v: 9, materials: [] };
    return A.sync('L1');
  }).then(function () { return B.pull('L1'); })
  .then(function () {
    same(B.board('L1').share && B.board('L1').share.token, 'tok123', 'B знає посилання');
  });
});

scenario('Записи: різні учні з двох пристроїв, той самий — пізніший, видалення доходить', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  var RA = A.ctx.RecSync, RB = B.ctx.RecSync;
  RA.start(); RB.start();
  return wait(50).then(function () {
    A.db.students.push({ id: 's1', name: 'Оля' });
    A.ctx.S.save();
    B.db.students.push({ id: 's2', name: 'Петро' });
    B.ctx.S.save();
    RA.scan(); RB.scan();
    return Promise.all([RA.flush(), RB.flush()]);
  }).then(function () { return Promise.all([RA.pull(), RB.pull()]); })
  .then(function () {
    same(A.db.students.map(function (s) { return s.id; }).sort().join(), 's1,s2', 'A бачить обох учнів');
    same(B.db.students.map(function (s) { return s.id; }).sort().join(), 's1,s2', 'B бачить обох учнів');
    // той самий учень
    A.db.students.filter(function (s) { return s.id === 's1'; })[0].name = 'Оля А';
    A.ctx.S.save(); RA.scan();
    return RA.flush();
  }).then(function () {
    B.db.students.filter(function (s) { return s.id === 's1'; })[0].name = 'Оля Б';
    B.ctx.S.save(); RB.scan();
    return RB.flush();
  }).then(function () { return Promise.all([RA.pull(), RB.pull()]); })
  .then(function () {
    var a = A.db.students.filter(function (s) { return s.id === 's1'; })[0].name;
    var b = B.db.students.filter(function (s) { return s.id === 's1'; })[0].name;
    same(a + '|' + b, 'Оля Б|Оля Б', 'обидва мають пізнішу правку');
    // налаштування
    A.db.tutor = { name: 'Микита', price: 600 };
    A.ctx.S.save(); RA.scan();
    return RA.flush();
  }).then(function () { return RB.pull(); })
  .then(function () {
    same(B.db.tutor.price, 600, 'налаштування доїхали');
    // видалення
    A.db.students = A.db.students.filter(function (s) { return s.id !== 's2'; });
    RA.markDeleted('students', 's2');
    return RA.flush();
  }).then(function () { return RB.pull(); })
  .then(function () {
    same(B.db.students.map(function (s) { return s.id; }).join(), 's1', 'видалення дійшло');
  });
});

scenario('Дві вкладки: відправлене іншою «видалено» не стирає урок, який тим часом повернули', function () {
  var srv = new Server();
  var T1 = new Device('A', srv), T2 = new Device('A', srv, T1.ls), B = new Device('B', srv);
  var R1 = T1.ctx.RecSync, R2 = T2.ctx.RecSync, RB = B.ctx.RecSync;
  srv.records['lessons/tpl_1'] = { kind: 'lessons', id: 'tpl_1', rev: 1, deleted: false,
    updated_at: srv.now(), data: { id: 'tpl_1', date: '2030-01-07T10:00' } };
  T1.setOnline(false); T2.setOnline(false);
  // вкладка 1 без мережі видаляє урок
  R1.markDeleted('lessons', 'tpl_1');
  // вкладка 2 щось зберігає — і підхоплює чуже «видалено» зі спільної черги
  T2.db.students.push({ id: 's9', name: 'Нова' });
  R2.mark('students', 's9');
  return wait(30).then(function () {
    T1.setOnline(true);
    return R1.flush();                               // вкладка 1 відправила своє
  }).then(function () {
    same(srv.records['lessons/tpl_1'].deleted, true, 'видалення дійшло');
    // той самий урок шаблону повернули на іншому пристрої
    B.db.lessons.push({ id: 'tpl_1', date: '2030-01-07T10:00' });
    RB.mark('lessons', 'tpl_1');
    return RB.flush();
  }).then(function () {
    same(srv.records['lessons/tpl_1'].deleted, false, 'урок знову живий');
    T2.setOnline(true);
    return R2.flush();                               // вкладка 2 нарешті в мережі
  }).then(function () {
    same(srv.records['lessons/tpl_1'].deleted, false, 'застаріле «видалено» з вкладки 2 його не стерло');
    ok(!!srv.records['students/s9'], 'своє вкладка 2 відправила');
  });
});

scenario('Дві вкладки: своя правка запису, перейнятого від іншої вкладки, не випадає з черги', function () {
  var srv = new Server();
  var T1 = new Device('A', srv), T2 = new Device('A', srv, T1.ls);
  var R1 = T1.ctx.RecSync, R2 = T2.ctx.RecSync;
  function L(dev) { return dev.db.lessons.filter(function (l) { return l.id === 'L'; })[0]; }
  srv.records['lessons/L'] = { kind: 'lessons', id: 'L', rev: 1, deleted: false,
    updated_at: srv.now(), data: { id: 'L', status: 'planned', date: '2030-01-07T10:00' } };
  return R1.pull(true).then(function () { return R2.pull(true); })
  .then(function () {
    // вкладка 1 відмічає урок проведеним
    L(T1).status = 'done'; L(T1).updatedAt = '2030-01-07T11:00:00Z';
    T1.ctx.S.save(); R1.mark('lessons', 'L');
    // вкладка 2 отримує подію сховища: перевірка змін, перечитування, зведення відбитків
    R2.scan();
    L(T2).status = 'done'; L(T2).updatedAt = '2030-01-07T11:00:00Z';
    T2.ctx.S.save(); R2.rebase();
    return R1.flush();                               // вкладка 1 відправила своє
  }).then(function () {
    same(srv.records['lessons/L'].data.status, 'done', 'відмітка вкладки 1 дійшла');
    // вкладка 2 знімає відмітку — зміну знаходить перегляд змін, а не R.mark
    L(T2).status = 'planned'; L(T2).updatedAt = '2030-01-07T11:05:00Z';
    T2.ctx.S.save(); R2.scan();
    return R2.flush();
  }).then(function () {
    same(srv.records['lessons/L'].data.status, 'planned', 'правка вкладки 2 теж дійшла, а не випала з черги');
  });
});

scenario('Дві вкладки: дошку з невідправленим в іншій вкладці не прибирає видалення уроку деінде', function () {
  var srv = new Server();
  var T1 = new Device('A', srv), T2 = new Device('A', srv, T1.ls);
  var lesson = { id: 'L', studentId: 's1', date: '2030-01-07T10:00', status: 'planned', fromTemplate: 1 };
  T1.db.lessons.push(JSON.parse(JSON.stringify(lesson)));
  T2.db.lessons.push(JSON.parse(JSON.stringify(lesson)));
  T1.newBoard('L');
  T1.setOnline(false);
  T1.draw('L', 0, 'a1');
  return T1.ctx.BoardOps.record('L').then(function () {
    // у вкладці 2 — копія тієї ж дошки з диска; її власна памʼять про відправку порожня
    T2.db.boards.push(JSON.parse(JSON.stringify(T1.board('L'))));
    // урок видалили на іншому пристрої
    srv.records['lessons/L'] = { kind: 'lessons', id: 'L', rev: 2, deleted: true, updated_at: srv.now(), data: lesson };
    return T2.ctx.RecSync.pull(true);
  }).then(function () {
    ok(!!T2.board('L'), 'дошка з невідправленим лишилась');
  });
});

scenario('Дошка, відправлена у фоні одразу після малювання, згодом отримує знімок на сервері', function () {
  // годинник, який можна перевести вперед: знімок бере лише дії, старші за 30 с
  var offset = 0, RealDate = Date;
  function FakeDate() {
    if (!(this instanceof FakeDate)) return new RealDate(RealDate.now() + offset).toString();
    return arguments.length
      ? new (Function.prototype.bind.apply(RealDate, [null].concat([].slice.call(arguments))))()
      : new RealDate(RealDate.now() + offset);
  }
  FakeDate.now = function () { return RealDate.now() + offset; };
  FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC; FakeDate.prototype = RealDate.prototype;

  var srv = new Server();
  srv.now = function () { return new RealDate(RealDate.now() + offset).toISOString(); };
  var A = new Device('A', srv);
  A.ctx.Date = FakeDate;
  // довге очікування (≥ 30 с) не чекаємо — переводимо годинник і виконуємо одразу
  A.ctx.setTimeout = function (fn, ms) {
    if (ms >= 30000) return setTimeout(function () { offset += ms; fn(); }, 20);
    return setTimeout(fn, ms);
  };
  var OA = A.ctx.BoardOps;
  A.newBoard('L');
  A.setOnline(false);
  A.draw('L', 0, 'a1'); A.draw('L', 0, 'a2');
  return OA.record('L').then(function () {
    A.setOnline(true);
    return OA.flush();                               // мережа повернулась, дошка закрита
  }).then(function () { return wait(400); })
  .then(function () {
    ok(srv.ops.filter(function (o) { return o.board === 'L'; }).length > 0, 'дії в журналі');
    ok(!!srv.boards.L, 'і знімок дошки на сервері — інший пристрій знає, що дошка є');
  });
});

scenario('Свій штрих повернувся з журналу — «відоме серверу» не ламається, новий штрих лишається невідправленим', function () {
  var srv = new Server(), A = new Device('A', srv);
  var O = A.ctx.BoardOps;
  A.newBoard('L');
  A.draw('L', 0, 'a1');
  return A.send('L').then(function () {
    A.draw('L', 0, 'a2');                              // намальовано, поки перший штрих їхав
    var d0 = O.localDiff('L').map(function (o) { return o.t + ':' + (o.it && o.it.id); }).join(',');
    same(d0, 'i+:a2', 'до читання невідправлене — лише a2');
    return A.pull('L');                                // повертається свій a1
  }).then(function () {
    var d1 = O.localDiff('L').map(function (o) { return o.t + ':' + (o.it && o.it.id); }).join(',');
    same(d1, 'i+:a2', 'після читання — так само лише a2, a1 не задвоївся');
    return A.send('L');
  }).then(function () { return A.pull('L'); })
  .then(function () {
    same(O.localDiff('L').length, 0, 'усе на сервері — різниці немає');
    ok(onServer(srv, 'L', 'a1') && onServer(srv, 'L', 'a2'), 'на сервері обидва штрихи');
    // кожен — один раз: окремою дією чи разом зі слайдом, але не двічі
    function times(id) {
      return srv.ops.filter(function (o) {
        return o.board === 'L' && ((o.op.it && o.op.it.id === id) ||
          (o.op.sl && (o.op.sl.items || []).some(function (it) { return it.id === id; })));
      }).length;
    }
    same(times('a1') + ',' + times('a2'), '1,1', 'жоден не поїхав двічі');
  });
});

scenario('Видалене тут, поки видалення не дійшло, не повертається з сервера', function () {
  var srv = new Server(), A = new Device('A', srv);
  var RA = A.ctx.RecSync;
  srv.records['lessons/l5'] = { kind: 'lessons', id: 'l5', rev: 1, deleted: false,
    updated_at: srv.now(), data: { id: 'l5', topic: 'Вектори' } };
  var orig = srv.handle.bind(srv), refuse = true;
  srv.handle = function (who, url, opts) {
    if (refuse && url.indexOf('/rest/v1/rpc/delete_record') === 0) throw new Error('сервер зайнятий');
    return orig(who, url, opts);
  };
  return RA.pull(true).then(function () {
    same(A.db.lessons.length, 1, 'урок прочитано');
    A.db.lessons.length = 0;
    RA.markDeleted('lessons', 'l5');
    return RA.pull(true);                            // видалення не пройшло, а читання — так
  }).then(function () {
    same(A.db.lessons.length, 0, 'урок не воскрес із сервера');
    refuse = false;
    return RA.flush();
  }).then(function () {
    same(srv.records['lessons/l5'].deleted, true, 'видалення дійшло пізніше');
  });
});

scenario('Читання сторінками: запис, змінений під час читання, нічого не зсуває', function () {
  var srv = new Server(), A = new Device('A', srv);
  for (var i = 0; i < 1500; i++) {
    var id = 'l' + ('000' + i).slice(-4);
    srv.records['lessons/' + id] = { kind: 'lessons', id: id, rev: 1, deleted: false,
      updated_at: srv.now(), data: { id: id, topic: 'T' + i } };
  }
  // поки йде перша сторінка, інший пристрій змінює перший запис — він «переїжджає» в кінець
  var orig = srv.handle.bind(srv), hit = false, armed = false;
  srv.handle = function (who, url, opts) {
    var out = orig(who, url, opts);
    if (armed && !hit && url.indexOf('/rest/v1/records') === 0 && (!opts || !opts.method || opts.method === 'GET') &&
        Array.isArray(out) && out.length === 1000) {
      hit = true;
      var r = srv.records['lessons/l0000'];
      r.data = { id: 'l0000', topic: 'змінено' }; r.rev++; r.updated_at = srv.now();
    }
    return out;
  };
  var RA = A.ctx.RecSync;
  RA.start();
  return wait(300).then(function () {
    // пристрій починає з нуля, і саме під час цього читання приходить зміна
    A.db.lessons.length = 0;
    armed = true;
    return RA.pull(true);
  }).then(function () {
    same(A.db.lessons.length, 1500, 'прочитано всі 1500 записів');
    var l0 = A.db.lessons.filter(function (l) { return l.id === 'l0000'; })[0];
    same(l0 && l0.topic, 'змінено', 'змінений під час читання — у свіжій версії');
  });
});

/* Розклад наперед заповнюється лише після першого вдалого читання: пристрій
   із давніми даними інакше створював уроки, яких не бачив у іншого. */
scenario('Дія «після першого читання» чекає на вдале читання й виконується один раз', function () {
  var srv = new Server(), A = new Device('A', srv);
  var RA = A.ctx.RecSync;
  var calls = 0;
  RA.afterFirstPull(function () { calls++; });
  A.setOnline(false);
  return RA.pull().then(function () { return wait(30); })
    .then(function () {
      same(calls, 0, 'без мережі не виконалась');
      A.setOnline(true);
      return RA.pull();
    }).then(function () { return wait(30); })
    .then(function () {
      same(calls, 1, 'після вдалого читання виконалась');
      return RA.pull();
    }).then(function () { return wait(30); })
    .then(function () {
      same(calls, 1, 'наступні читання її не повторюють');
      var late = 0;
      RA.afterFirstPull(function () { late++; });
      same(late, 1, 'додана пізніше виконується одразу');
    });
});

scenario('Записи: правка, зроблена поки йде читання, не перекривається серверною', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  var RA = A.ctx.RecSync, RB = B.ctx.RecSync;
  RA.start(); RB.start();
  return wait(50).then(function () {
    A.db.lessons.push({ id: 'l1', topic: 'Логарифми' });
    A.ctx.S.save(); RA.scan();
    return RA.flush();
  }).then(function () { return RB.pull(); })
  .then(function () {
    // B правит урок, але перегляд змін ще не спрацював, а читання вже йде
    B.db.lessons[0].topic = 'Логарифми (повтор)';
    return RB.pull();
  }).then(function () { return RB.flush(); })
  .then(function () { return RA.pull(); })
  .then(function () {
    same(B.db.lessons[0].topic, 'Логарифми (повтор)', 'правка B лишилась у B');
    same(A.db.lessons[0].topic, 'Логарифми (повтор)', 'і доїхала до A');
  });
});

scenario('Перехід зі старої версії: те, що лишалось лише тут, не перекривається сервером', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  // на сервері — домашка без розвʼязань (стара версія їх не відправляла)
  srv.records['homeworks/h1'] = { kind: 'homeworks', id: 'h1', rev: 1, deleted: false,
    updated_at: srv.now(), data: { id: 'h1', title: 'Задачі 1–5', status: 'assigned', solutions: [] } };
  srv.records['lessons/l1'] = { kind: 'lessons', id: 'l1', rev: 1, deleted: false,
    updated_at: srv.now(), data: { id: 'l1', topic: 'Нова тема з телефона' } };
  // на пристрої A — фото учня вже злите локально; урок — давній
  A.db.homeworks.push({ id: 'h1', title: 'Задачі 1–5', status: 'submitted', solutions: [{ key: 'img1' }] });
  A.db.lessons.push({ id: 'l1', topic: 'Стара тема' });
  A.ls['mathhub.rec.migrated'] = '1';
  A.ls['mathhub.rec.since'] = '2026-09-01T00:00:00Z';
  A.ls['mathhub.rec.kinds'] = 'students,lessons,payments,homeworks,progress,roadmap,desk,materials,notes,mathmap,stumap';
  A.ctx.S.save();
  A.ctx.RecSync.start();
  return wait(200).then(function () { return A.ctx.RecSync.flush(); })
  .then(function () { return wait(50); })
  .then(function () {
    var h = A.db.homeworks[0];
    same(h.solutions.length, 1, 'фото розвʼязання лишилось');
    same(A.db.lessons[0].topic, 'Нова тема з телефона', 'новіша тема з сервера прийнята');
    var sh = srv.records['homeworks/h1'].data;
    same((sh.solutions || []).length, 1, 'і фото доїхало на сервер');
  });
});

scenario('Оплати видалених уроків і двійники не рахуються в дохід', function () {
  var srv = new Server(), A = new Device('A', srv);
  function rec(kind, id, data, deleted) {
    srv.records[kind + '/' + id] = { kind: kind, id: id, rev: 1, deleted: !!deleted, updated_at: srv.now(), data: data };
  }
  rec('lessons', 'L-del', { id: 'L-del', price: 500 }, true);          // урок видалено
  rec('lessons', 'L-ok', { id: 'L-ok', price: 500 });
  rec('payments', 'p-orphan', { id: 'p-orphan', lessonId: 'L-del', amount: 500, currency: 'UAH', date: '2026-09-10' });
  rec('payments', 'p-ok', { id: 'p-ok', lessonId: 'L-ok', amount: 500, currency: 'UAH', date: '2026-09-11', createdAt: '2026-09-11T10:00:00Z' });
  rec('payments', 'p-twin', { id: 'p-twin', lessonId: 'L-ok', amount: 500, currency: 'UAH', date: '2026-09-11', createdAt: '2026-09-11T10:05:00Z' });
  rec('payments', 'p-manual', { id: 'p-manual', amount: 3000, currency: 'UAH', date: '2026-09-12' });
  A.ctx.S.paymentCur = function (p) { return p.currency || 'UAH'; };
  A.ctx.RecSync.start();
  return wait(1800).then(function () {
    same(A.db.payments.map(function (p) { return p.id; }).sort().join(), 'p-manual,p-ok', 'лишились справжні оплати');
    ok(srv.records['payments/p-orphan'].deleted, 'оплата видаленого уроку позначена видаленою на сервері');
    ok(srv.records['payments/p-twin'].deleted, 'двійник позначений видаленим');
    ok(!srv.records['payments/p-manual'].deleted, 'ручна оплата без уроку не зачеплена');
  });
});

/* ---------- Звірка: памʼять пристрою розійшлася з сервером ---------- */

// пристрій «памʼятає», що сервер має обʼєкт, хоча там його немає
function believe(dev, id, slideIdx, item) {
  var b = dev.board(id);
  b.slides[slideIdx].items.push(JSON.parse(JSON.stringify(item)));
  b._sync.base.slides[slideIdx].items.push(JSON.parse(JSON.stringify(item)));
  /* Хибна памʼять пристрою насправді приходить із диска — новим обʼєктом.
     Так і тут: інакше готове «відоме серверу» (boardops knownView) не
     знало б про підміну, якої жоден код кабінету не робить. */
  b._sync.base = JSON.parse(JSON.stringify(b._sync.base));
}
function onServer(srv, id, itemId) {
  return srv.ops.some(function (o) {
    return o.board === id && ((o.op.it && o.op.it.id === itemId) ||
      (o.op.sl && (o.op.sl.items || []).some(function (it) { return it.id === itemId; })));
  });
}

scenario('Звірка: сервер не має того, що пристрій вважає відправленим, — довозить', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  A.newBoard('L1');
  A.draw('L1', 0, 'a1');
  return A.sync('L1').then(function () { return B.ctx.BoardOps.fetchMissing(); })
  .then(function () { return B.pull('L1'); })
  .then(function () {
    believe(A, 'L1', 0, { id: 'hw1', t: 'i', k: 'photo' });
    return A.send('L1');
  }).then(function () {
    ok(!onServer(srv, 'L1', 'hw1'), 'до звірки фото на сервер не їде (так і губилось)');
    return A.ctx.BoardOps.verify('L1');
  }).then(function (n) {
    ok(n > 0, 'звірка помітила розбіжність');
    return wait(500);
  }).then(function () { return B.pull('L1'); })
  .then(function () {
    ok(onServer(srv, 'L1', 'hw1'), 'після звірки фото на сервері');
    same(B.ids('L1').join(), 'a1,hw1', 'і на другому пристрої');
  });
});

scenario('Звірка: пристрій пропустив чуже — приносить', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  A.newBoard('L1');
  A.draw('L1', 0, 'a1');
  return A.sync('L1').then(function () { return B.ctx.BoardOps.fetchMissing(); })
  .then(function () { return B.pull('L1'); })
  .then(function () { A.draw('L1', 0, 'a2'); return A.sync('L1'); })
  .then(function () {
    var s = B.board('L1')._sync;
    s.seen = srv.nextId + 5; s.floor = s.seen;       // памʼять B «уже прочитала» a2, хоч не бачила
    return B.pull('L1');
  }).then(function () {
    same(B.ids('L1').join(), 'a1', 'звичайне читання a2 не приносить');
    return B.ctx.BoardOps.verify('L1');
  }).then(function () {
    same(B.ids('L1').join(), 'a1,a2', 'після звірки a2 на B');
  });
});

scenario('Звірка не воскрешає стерте, яке пристрій ще не прочитав', function () {
  var srv = new Server(), A = new Device('A', srv), B = new Device('B', srv);
  A.newBoard('L1');
  A.draw('L1', 0, 'x'); A.draw('L1', 0, 'y');
  return A.sync('L1').then(function () { return B.ctx.BoardOps.fetchMissing(); })
  .then(function () { return B.pull('L1'); })
  .then(function () { B.erase('L1', 'x'); return B.sync('L1'); })
  .then(function () { return A.ctx.BoardOps.verify('L1'); })
  .then(function () { return wait(500); })
  .then(function () { return A.pull('L1'); })
  .then(function () { return B.pull('L1'); })
  .then(function () {
    same(A.ids('L1').join(), 'y', 'на A стерте зникло');
    same(B.ids('L1').join(), 'y', 'на B не воскресло');
  });
});

scenario('Знімок складається з журналу, а не з памʼяті пристрою', function () {
  var srv = new Server(), A = new Device('A', srv), C = new Device('C', srv);
  A.newBoard('L1');
  A.draw('L1', 0, 'a1');
  return A.sync('L1').then(function () {
    believe(A, 'L1', 0, { id: 'ghost', t: 'p', d: [9] });   // памʼять A хибна
    A.draw('L1', 0, 'a2');
    A.board('L1')._sync.snapAt = 0;                          // знімок — одразу, без 20 с паузи
    return A.sync('L1');
  }).then(function () { return wait(50); })
  .then(function () {
    var snap = srv.boards.L1 && srv.boards.L1.data;
    ok(!!snap, 'знімок є');
    var ids = [];
    (snap ? snap.slides : []).forEach(function (s) { s.items.forEach(function (it) { ids.push(it.id); }); });
    same(ids.sort().join(), 'a1,a2', 'у знімку лише те, що є в журналі');
    return C.ctx.BoardOps.fetchMissing();
  }).then(function () { return C.pull('L1'); })
  .then(function () {
    same(C.ids('L1').join(), 'a1,a2', 'новий пристрій бачить те саме, що журнал');
  });
});

/* ============================================================ */

var only = process.argv[2];
if (only) scenarios = scenarios.filter(function (s) { return s.name.indexOf(only) >= 0; });
global.DBG = process.env.DBG ? console.log : function () {};

(function run(i) {
  if (i >= scenarios.length) {
    console.log('\n' + passes + ' пройдено, ' + fails + ' не пройдено');
    process.exit(fails ? 1 : 0);
  }
  var sc = scenarios[i];
  console.log('\n• ' + sc.name);
  Promise.resolve().then(sc.fn).catch(function (e) {
    fails++;
    console.log('  ✗ впало: ' + (e && e.stack || e));
  }).then(function () { run(i + 1); });
})(0);
