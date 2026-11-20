/* Рендер відео Manim на ноутбуці репетитора — за чергою з кабінету.

   Запуск:  node tools/manim-worker/worker.js   (або start.cmd поруч)

   Кабінет (з будь-якого пристрою, і з телефона) кладе в таблицю
   manim_jobs код сцени. Ця програма раз на 15 с питає чергу, забирає
   завдання, рендерить його через C:\anim (uv + manim + MiKTeX, як
   render.cmd) і кладе відео в сховище boards — кабінет сам ставить його
   на дошку. Ноутбук вимкнений — завдання чекає, доки він увімкнеться.

   Вхід. Програма діє від імені репетитора, як кабінет. Пароль вона не
   зберігає й не бачить ніхто, крім Supabase: при першому запуску
   відкривається локальна сторінка http://127.0.0.1:8041 — там вводять
   пошту й пароль, програма обмінює їх на ключ продовження входу
   (refresh token) і тримає лише його — у %APPDATA%\vektor-manim\auth.json.
   Ключ сервісу (service_role) не потрібен і не використовується. */

'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..', '..');
var ANIM = process.env.VEKTOR_ANIM || 'C:\\anim';
var DIR = path.join(process.env.APPDATA || ANIM, 'vektor-manim');
var AUTH = path.join(DIR, 'auth.json');
var LOG = path.join(DIR, 'worker.log');
var PORT = 8041;
var POLL_MS = 15000;
var RENDER_MS = 12 * 60000;

function log() {
  var line = new Date().toISOString() + ' ' + Array.prototype.join.call(arguments, ' ');
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch (e) {}
}

/* Адреса бази й публічний ключ — з config.json поруч (його пише install.js,
   коли копіює програму в C:\anim\worker) або з cloudconfig.js кабінету. */
function config() {
  try {
    var c = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
    if (c.url && c.key) return { url: c.url.replace(/\/+$/, ''), key: c.key };
  } catch (e) {}
  var s = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'cloudconfig.js'), 'utf8');
  var url = (s.match(/url:\s*'([^']+)'/) || [])[1];
  var key = (s.match(/anonKey:\s*'([^']+)'/) || [])[1];
  if (!url || !key) throw new Error('у cloudconfig.js немає url чи anonKey');
  return { url: url.replace(/\/+$/, ''), key: key };
}
var CFG = config();

/* ---------- Вхід ---------- */

var session = null;              // { access, refresh, uid, exp }

function readAuth() {
  try { return JSON.parse(fs.readFileSync(AUTH, 'utf8')); } catch (e) { return null; }
}
function saveAuth(refresh, uid) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(AUTH, JSON.stringify({ refresh: refresh, uid: uid }), { mode: 0o600 });
}

function tokenRequest(grant, body) {
  return fetch(CFG.url + '/auth/v1/token?grant_type=' + grant, {
    method: 'POST',
    headers: { apikey: CFG.key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      if (!r.ok) { var e = new Error(j.error_description || j.msg || ('вхід: ' + r.status)); e.status = r.status; throw e; }
      return j;
    });
  });
}

function useTokens(j) {
  session = { access: j.access_token, refresh: j.refresh_token, uid: j.user && j.user.id,
              exp: Date.now() + ((j.expires_in || 3600) - 120) * 1000 };
  saveAuth(session.refresh, session.uid);       // ключ продовження щоразу новий — зберігаємо свіжий
}

function ensureSession() {
  if (session && Date.now() < session.exp) return Promise.resolve(session);
  var a = session || readAuth();
  if (!a || !a.refresh) return Promise.reject(Object.assign(new Error('немає входу'), { login: true }));
  return tokenRequest('refresh_token', { refresh_token: a.refresh }).then(function (j) {
    useTokens(j); return session;
  }, function (e) {
    // 400/401 — ключ недійсний: потрібен новий вхід; інше — тимчасово, спробуємо пізніше
    if (e.status === 400 || e.status === 401) { session = null; try { fs.unlinkSync(AUTH); } catch (er) {} e.login = true; }
    throw e;
  });
}

/* Локальна сторінка входу — лише на цьому компʼютері (127.0.0.1). */
var PAGE = '<!doctype html><meta charset="utf-8"><title>Вектор · рендер Manim</title>' +
  '<style>body{font:15px system-ui;max-width:420px;margin:60px auto;color:#17163A}' +
  'input{display:block;width:100%;padding:10px;margin:6px 0 14px;border:1px solid #ccd;border-radius:10px;font:inherit}' +
  'button{padding:11px 18px;border:0;border-radius:10px;background:#4B3FDB;color:#fff;font:600 15px system-ui}</style>' +
  '<h2>Рендер відео Manim</h2><p>Увійдіть тим самим акаунтом, що й у «Вектор». Пароль іде лише в Supabase; ' +
  'програма зберігає тільки ключ продовження входу.</p>' +
  '<form method="post" action="/login"><label>Пошта<input name="email" type="email" required></label>' +
  '<label>Пароль<input name="password" type="password" required></label><button>Увійти</button></form>';

function loginServer() {
  var srv = http.createServer(function (req, res) {
    if (req.method === 'POST' && req.url === '/login') {
      var body = '';
      req.on('data', function (c) { body += c; if (body.length > 10000) req.destroy(); });
      req.on('end', function () {
        var p = new URLSearchParams(body);
        tokenRequest('password', { email: p.get('email'), password: p.get('password') }).then(function (j) {
          useTokens(j);
          log('вхід виконано');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<meta charset="utf-8"><p style="font:16px system-ui;margin:60px">Готово. Вікно можна закрити — рендер працює.</p>');
          kick();
        }, function (e) {
          res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(PAGE.replace('<form', '<p style="color:#c00">Не вийшло: ' + String(e.message).replace(/</g, '&lt;') + '</p><form'));
        });
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(PAGE);
  });
  srv.listen(PORT, '127.0.0.1', function () { log('сторінка входу: http://127.0.0.1:' + PORT); });
  srv.on('error', function (e) { log('сторінка входу не стартувала:', e.message); });
}

function openLoginPage() {
  try { cp.spawn('cmd', ['/c', 'start', '', 'http://127.0.0.1:' + PORT], { detached: true, stdio: 'ignore' }).unref(); } catch (e) {}
}

/* ---------- База й сховище ---------- */

function api(p, opts) {
  opts = opts || {};
  return ensureSession().then(function (s) {
    var h = Object.assign({ apikey: CFG.key, Authorization: 'Bearer ' + s.access }, opts.headers || {});
    return fetch(CFG.url + p, { method: opts.method || 'GET', headers: h, body: opts.body });
  });
}

function patchJob(id, fields, onlyIf) {
  fields.updated_at = new Date().toISOString();
  return api('/rest/v1/manim_jobs?id=eq.' + id + (onlyIf ? '&status=eq.' + onlyIf : ''), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(fields)
  }).then(function (r) { return r.ok ? r.json() : []; });
}

/* ---------- Рендер ---------- */

function findFile(dir, name) {
  var list;
  try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return null; }
  for (var i = 0; i < list.length; i++) {
    var p = path.join(dir, list[i].name);
    if (list[i].isDirectory()) { var f = findFile(p, name); if (f) return f; }
    else if (list[i].name === name) return p;
  }
  return null;
}

function render(job) {
  var jobs = path.join(ANIM, 'jobs');
  fs.mkdirSync(jobs, { recursive: true });
  var file = path.join(jobs, 'job_' + job.id.replace(/-/g, '') + '.py');
  fs.writeFileSync(file, job.code, 'utf8');
  var out = 'job_' + job.id.replace(/-/g, '');
  var media = path.join(jobs, 'media');
  var env = Object.assign({}, process.env, {
    UV_PYTHON_INSTALL_DIR: path.join(ANIM, '.uv', 'python'),
    UV_CACHE_DIR: path.join(ANIM, '.uv', 'cache'),
    PYTHONIOENCODING: 'utf-8',
    PATH: [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64'),
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links'),
      process.env.PATH || ''
    ].join(';')
  });
  var q = /^[lmh]$/.test(job.quality) ? job.quality : 'm';
  var args = ['run', 'manim', '-q' + q, '--disable_caching', '--media_dir', media, '-o', out + '.mp4', file, 'Main'];
  return new Promise(function (resolve, reject) {
    var tail = '';
    var ch = cp.spawn('uv', args, { cwd: ANIM, env: env, shell: true, windowsHide: true });
    function keep(d) { tail = (tail + d.toString()).slice(-4000); }
    ch.stdout.on('data', keep);
    ch.stderr.on('data', keep);
    var timer = setTimeout(function () { try { ch.kill(); } catch (e) {} }, RENDER_MS);
    ch.on('close', function (code) {
      clearTimeout(timer);
      var mp4 = findFile(media, out + '.mp4');
      if (code === 0 && mp4) resolve(mp4);
      else reject(new Error((code === null ? 'перевищено час рендеру. ' : '') + tail.replace(/\x1b\[[0-9;]*m/g, '').slice(-1500)));
    });
    ch.on('error', function (e) { clearTimeout(timer); reject(e); });
  });
}

function upload(mp4, key) {
  var buf = fs.readFileSync(mp4);
  return api('/storage/v1/object/boards/' + encodeURIComponent(session.uid) + '/' + encodeURIComponent(key), {
    method: 'POST',
    headers: { 'Content-Type': 'video/mp4', 'x-upsert': 'true' },
    body: buf
  }).then(function (r) {
    if (!r.ok && r.status !== 409) return r.text().then(function (t) { throw new Error('сховище ' + r.status + ': ' + t.slice(0, 200)); });
  });
}

/* ---------- Черга ---------- */

var busy = false, timer = null;
function kick() { if (timer) clearTimeout(timer); timer = setTimeout(tick, 200); }

function tick() {
  timer = null;
  if (busy) return;
  busy = true;
  api('/rest/v1/manim_jobs?select=id,code,quality,title&status=eq.queued&order=created_at.asc&limit=1')
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      var job = rows && rows[0];
      if (!job) return;
      // забрати саме це завдання: якщо його вже взяли — нічого
      return patchJob(job.id, { status: 'rendering' }, 'queued').then(function (got) {
        if (!got || !got.length) return;
        log('рендер', job.id, job.title || '');
        var key = 'med_mj' + job.id.replace(/-/g, '').slice(0, 20);
        return render(job)
          .then(function (mp4) { return upload(mp4, key); })
          .then(function () { log('готово', job.id); return patchJob(job.id, { status: 'done', video_key: key, error: null }); })
          .catch(function (e) {
            log('помилка', job.id, e.message.slice(0, 300));
            return patchJob(job.id, { status: 'error', error: String(e.message).slice(0, 1500) });
          })
          .then(function () { kick(); });         // може, в черзі ще щось
      });
    })
    .catch(function (e) {
      if (e.login) { if (!tick.asked) { tick.asked = true; log('потрібен вхід'); openLoginPage(); } }
      else log('черга:', e.message);
    })
    .then(function () {
      busy = false;
      if (!timer) timer = setTimeout(tick, POLL_MS);
    });
}

fs.mkdirSync(DIR, { recursive: true });
log('старт; C:\\anim =', ANIM);
loginServer();
tick();
