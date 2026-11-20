/* Середовище сцени «Візуалізувати» (scene.html, ізольоване вікно).

   Код сцени пише Claude (функція Supabase, режим scene) або репетитор
   вручну. Код отримує два імена: S — команди цього файлу — і THREE.
   Найпростіша сцена:

     S.view3d({ camera: [6, 5, 7] });
     S.axes(4);
     S.param('a', { min: -2, max: 2, value: 1, label: 'a' });
     S.build(function (p) {
       S.surface(function (x, y) { return p.a * (x * x - y * y) / 4; },
                 { x: [-3, 3], y: [-3, 3], color: '#4B3FDB' });
     });

   Усе, що малює build, будується наново після кожної зміни повзунка,
   кроку чи часу (S.steps, S.animate) — так код лишається коротким.

   Звʼязок із дошкою — лише postMessage:
     дошка → сцена: { type: 'load', code, role, state } | { type: 'apply', state }
     сцена → дошка: { type: 'state', state } | { type: 'poster', url } |
                    { type: 'error', message } | { type: 'ready' }
   Стан: { cam: { p, t, z }, par: { імʼя: число }, step, play, time }.
   Репетитор веде; учень бачить те саме, а покрутивши сам — відчіплюється,
   доки не натисне «До вчителя». */
(function () {
  'use strict';

  /* ============================================================
     Ядро без малювання: параметри, кроки, час, хто веде.
     Окремо від three.js — так його можна перевірити без браузера
     (tools/scene-test.js).
     ============================================================ */

  function Core() {
    this.role = 'tutor';
    this.params = {};        // імʼя → { min, max, step, value, label }
    this.order = [];
    this.stepTitles = [];
    this.step = 0;
    this.animated = false;
    this.playing = false;
    this.time = 0;
    this.detached = false;   // учень покрутив сам — чуже вже не застосовуємо
    this.cam = null;
  }

  Core.prototype.param = function (name, o) {
    o = o || {};
    var min = Number(o.min), max = Number(o.max);
    if (!isFinite(min)) min = 0;
    if (!isFinite(max) || max <= min) max = min + 1;
    var v = Number(o.value);
    if (!isFinite(v)) v = min;
    if (!this.params[name]) this.order.push(name);
    this.params[name] = { min: min, max: max, step: Number(o.step) > 0 ? Number(o.step) : (max - min) / 100,
                          value: Math.min(max, Math.max(min, v)), label: o.label || name };
    return this.params[name].value;
  };

  /** Те, що бачить build: значення повзунків, крок, час. */
  Core.prototype.values = function () {
    var p = { step: this.step, t: this.time };
    for (var k in this.params) p[k] = this.params[k].value;
    return p;
  };

  Core.prototype.setParam = function (name, v) {
    var d = this.params[name];
    if (!d) return false;
    v = Number(v);
    if (!isFinite(v)) return false;
    d.value = Math.min(d.max, Math.max(d.min, v));
    return true;
  };

  Core.prototype.setStep = function (n) {
    var max = Math.max(0, this.stepTitles.length - 1);
    n = Math.round(Number(n));
    if (!isFinite(n)) return false;
    this.step = Math.min(max, Math.max(0, n));
    return true;
  };

  Core.prototype.state = function () {
    var par = {};
    for (var k in this.params) par[k] = this.params[k].value;
    return { cam: this.cam, par: par, step: this.step, play: this.playing, time: Math.round(this.time * 100) / 100 };
  };

  /** Чужий стан (від репетитора). Учень, що відчепився, його не бере. */
  Core.prototype.apply = function (st, force) {
    if (!st || typeof st !== 'object') return false;
    if (this.detached && !force) return false;
    var self = this;
    if (st.par && typeof st.par === 'object') {
      Object.keys(st.par).forEach(function (k) { self.setParam(k, st.par[k]); });
    }
    if (st.step != null) this.setStep(st.step);
    if (typeof st.play === 'boolean') this.playing = st.play && this.animated;
    if (typeof st.time === 'number' && isFinite(st.time)) this.time = st.time;
    if (st.cam && Array.isArray(st.cam.p) && Array.isArray(st.cam.t)) this.cam = st.cam;
    return true;
  };

  /** Людина тут щось покрутила сама. Учень відчіплюється від репетитора. */
  Core.prototype.touched = function () {
    if (this.role === 'student') this.detached = true;
  };

  if (typeof window !== 'undefined') window.SceneCore = Core;
  if (typeof THREE === 'undefined' || typeof document === 'undefined' || !document.getElementById('sc-root')) return;

  /* ============================================================
     Малювання (three.js)
     ============================================================ */

  var root = document.getElementById('sc-root');
  var core = new Core();
  var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0xffffff, 1);
  root.appendChild(renderer.domElement);

  var labelsEl = document.createElement('div'); labelsEl.className = 'sc-labels'; root.appendChild(labelsEl);
  var captionEl = document.createElement('div'); captionEl.className = 'sc-caption'; root.appendChild(captionEl);
  var panel = document.createElement('div'); panel.className = 'sc-panel'; root.appendChild(panel);
  var followBtn = document.createElement('button');
  followBtn.className = 'sc-btn sc-follow'; followBtn.textContent = 'До вчителя'; followBtn.hidden = true;
  root.appendChild(followBtn);

  var scene = new THREE.Scene();
  // світло мʼяке з двох боків: поверхня читається, а не чорніє з тіньового боку
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3f0, 1.6));
  var sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(6, -4, 10);
  scene.add(sun);
  var back = new THREE.DirectionalLight(0xffffff, 0.6);
  back.position.set(-6, 5, -4);
  scene.add(back);
  var built = new THREE.Group();
  scene.add(built);
  var labels = [];

  var mode = '3d';
  var cam3 = new THREE.PerspectiveCamera(45, 1, 0.05, 2000);
  var cam2 = new THREE.OrthographicCamera(-10, 10, 6, -6, -100, 100);
  var camera = cam3;
  var target = new THREE.Vector3(0, 0, 0);
  var orbit = { r: 12, th: 0.8, ph: 1.05 };       // відстань, азимут, кут від осі Z
  var view2 = { cx: 0, cy: 0, h: 12 };            // 2D: центр і висота видимого

  var build = null, buildError = null;
  var lastAnim = 0;
  var fresh = true;                                // перший кадр — обкладинка для дошки

  function post(msg) { try { parent.postMessage(msg, '*'); } catch (e) {} }

  /* ---------- Камера ---------- */

  function placeCamera() {
    if (mode === '2d') {
      var w = root.clientWidth || 1, h = root.clientHeight || 1, a = w / h;
      cam2.left = view2.cx - view2.h * a / 2; cam2.right = view2.cx + view2.h * a / 2;
      cam2.top = view2.cy + view2.h / 2; cam2.bottom = view2.cy - view2.h / 2;
      cam2.position.set(0, 0, 50); cam2.up.set(0, 1, 0); cam2.lookAt(0, 0, 0);
      cam2.updateProjectionMatrix();
      return;
    }
    var sp = Math.sin(orbit.ph);
    cam3.position.set(target.x + orbit.r * sp * Math.cos(orbit.th),
                      target.y + orbit.r * sp * Math.sin(orbit.th),
                      target.z + orbit.r * Math.cos(orbit.ph));
    cam3.up.set(0, 0, 1);                          // вісь Z — вгору, як у підручнику
    cam3.lookAt(target);
  }

  function camState() {
    if (mode === '2d') return { p: [view2.cx, view2.cy, view2.h], t: [0, 0, 0], z: 1 };
    return { p: [orbit.r, orbit.th, orbit.ph], t: [target.x, target.y, target.z] };
  }

  function useCam(c) {
    if (!c) return;
    if (mode === '2d') { view2.cx = +c.p[0] || 0; view2.cy = +c.p[1] || 0; view2.h = Math.max(0.01, +c.p[2] || 12); }
    else {
      orbit.r = Math.max(0.1, +c.p[0] || 12); orbit.th = +c.p[1] || 0; orbit.ph = Math.min(3.1, Math.max(0.05, +c.p[2] || 1));
      target.set(+c.t[0] || 0, +c.t[1] || 0, +c.t[2] || 0);
    }
  }

  /* ---------- Керування мишею й пальцями ---------- */

  var drag = null, pinch = null, pts = {};
  var cv = renderer.domElement;
  cv.addEventListener('pointerdown', function (e) {
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    var ids = Object.keys(pts);
    if (ids.length === 2) {
      var a = pts[ids[0]], b = pts[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), r: orbit.r, h: view2.h };
      drag = null;
    } else {
      drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey || mode === '2d' };
    }
  });
  cv.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pts);
    if (pinch && ids.length === 2) {
      var a = pts[ids[0]], b = pts[ids[1]];
      var k = pinch.d / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
      if (mode === '2d') view2.h = pinch.h * k; else orbit.r = pinch.r * k;
      interacted();
      return;
    }
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) {
      if (mode === '2d') {
        var s = view2.h / (root.clientHeight || 1);
        view2.cx -= dx * s; view2.cy += dy * s;
      } else {
        var m = orbit.r / (root.clientHeight || 1);
        var right = new THREE.Vector3().setFromMatrixColumn(cam3.matrixWorld, 0);
        var up = new THREE.Vector3().setFromMatrixColumn(cam3.matrixWorld, 1);
        target.addScaledVector(right, -dx * m).addScaledVector(up, dy * m);
      }
    } else {
      orbit.th -= dx * 0.008;
      orbit.ph = Math.min(3.1, Math.max(0.05, orbit.ph - dy * 0.008));
    }
    interacted();
  });
  function up(e) { delete pts[e.pointerId]; if (Object.keys(pts).length < 2) pinch = null; if (!Object.keys(pts).length) drag = null; }
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    var k = Math.exp(e.deltaY * 0.0012);
    if (mode === '2d') view2.h *= k; else orbit.r *= k;
    interacted();
  }, { passive: false });

  /* Людина змінила вигляд сама: репетитор — шле стан учневі; учень — відчіплюється. */
  var sendT = null;
  function interacted() {
    core.touched();
    followBtn.hidden = !core.detached;
    core.cam = camState();
    if (core.role === 'tutor' && !sendT) {
      sendT = setTimeout(function () { sendT = null; post({ type: 'state', state: core.state() }); }, 120);
    }
    redraw();
  }

  followBtn.addEventListener('click', function () {
    core.detached = false;
    followBtn.hidden = true;
    post({ type: 'follow' });                     // дошка віддасть останній стан репетитора
  });

  /* ---------- Побудова ---------- */

  function clearBuilt() {
    built.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); });
    });
    built.clear();
    labels.forEach(function (l) { l.el.remove(); });
    labels = [];
  }

  function rebuild() {
    clearBuilt();
    if (!build) return;
    try { build(core.values()); buildError = null; }
    catch (e) { showError(e); }
  }

  var errEl = null;
  function showError(e) {
    buildError = e;
    var msg = (e && e.message) ? e.message : String(e);
    if (!errEl) { errEl = document.createElement('div'); errEl.className = 'sc-error'; root.appendChild(errEl); }
    errEl.textContent = 'Сцена не побудувалась:\n' + msg;
    post({ type: 'error', message: msg });
  }

  var raf = null;
  function redraw() { if (!raf) raf = requestAnimationFrame(frame); }

  function frame(now) {
    raf = null;
    var w = root.clientWidth || 1, h = root.clientHeight || 1;
    renderer.setSize(w, h, false);
    cam3.aspect = w / h; cam3.updateProjectionMatrix();
    if (core.playing && core.animated) {
      var dt = lastAnim ? Math.min(0.1, (now - lastAnim) / 1000) : 0;
      lastAnim = now;
      core.time += dt;
      rebuild();
      raf = requestAnimationFrame(frame);
    } else lastAnim = 0;
    placeCamera();
    renderer.render(scene, camera);
    placeLabels(w, h);
    if (fresh) {
      fresh = false;
      setTimeout(function () {
        try { post({ type: 'poster', url: renderer.domElement.toDataURL('image/jpeg', 0.85) }); } catch (e) {}
      }, 60);
    }
  }

  function placeLabels(w, h) {
    var v = new THREE.Vector3();
    labels.forEach(function (l) {
      v.copy(l.p).project(camera);
      var hide = v.z > 1 || v.z < -1;
      l.el.hidden = hide;
      if (!hide) { l.el.style.left = ((v.x + 1) / 2 * w) + 'px'; l.el.style.top = ((1 - v.y) / 2 * h) + 'px'; }
    });
  }

  window.addEventListener('resize', redraw);

  /* ---------- Панель: повзунки, кроки, «пуск» ---------- */

  function fmt(v, step) {
    var dec = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step)));
    return Number(v).toFixed(dec);
  }

  function renderPanel() {
    panel.innerHTML = '';
    core.order.forEach(function (name) {
      var d = core.params[name];
      var row = document.createElement('label'); row.className = 'sc-slider';
      var t = document.createElement('span'); t.textContent = d.label;
      var r = document.createElement('input');
      r.type = 'range'; r.min = d.min; r.max = d.max; r.step = d.step; r.value = d.value;
      var b = document.createElement('b'); b.textContent = fmt(d.value, d.step);
      r.addEventListener('input', function () {
        core.setParam(name, r.value);
        b.textContent = fmt(core.params[name].value, d.step);
        rebuild(); interacted();
      });
      row.appendChild(t); row.appendChild(r); row.appendChild(b);
      row._sync = function () { r.value = core.params[name].value; b.textContent = fmt(core.params[name].value, d.step); };
      panel.appendChild(row);
    });
    if (core.stepTitles.length > 1) {
      var box = document.createElement('div'); box.className = 'sc-steps';
      var prev = document.createElement('button'); prev.className = 'sc-btn'; prev.textContent = '◀';
      var next = document.createElement('button'); next.className = 'sc-btn'; next.textContent = '▶';
      var lab = document.createElement('span');
      function sync() {
        prev.disabled = core.step <= 0; next.disabled = core.step >= core.stepTitles.length - 1;
        lab.textContent = (core.step + 1) + '/' + core.stepTitles.length + ' · ' + (core.stepTitles[core.step] || '');
      }
      prev.addEventListener('click', function () { core.setStep(core.step - 1); sync(); rebuild(); interacted(); });
      next.addEventListener('click', function () { core.setStep(core.step + 1); sync(); rebuild(); interacted(); });
      box.appendChild(prev); box.appendChild(lab); box.appendChild(next);
      box._sync = sync; sync();
      panel.appendChild(box);
    }
    if (core.animated) {
      var play = document.createElement('button'); play.className = 'sc-btn';
      function syncPlay() { play.textContent = core.playing ? '❚❚ Пауза' : '▶ Пуск'; }
      play.addEventListener('click', function () {
        core.playing = !core.playing; syncPlay(); interacted();
      });
      play._sync = syncPlay; syncPlay();
      panel.appendChild(play);
    }
  }

  function syncPanel() {
    Array.prototype.forEach.call(panel.children, function (c) { if (c._sync) c._sync(); });
  }

  /* ============================================================
     Команди для коду сцени (S)
     ============================================================ */

  function col(c, d) { return new THREE.Color(c || d || '#4B3FDB'); }
  function vec(p) { return new THREE.Vector3(+p[0] || 0, +p[1] || 0, +(p[2] || 0)); }
  function add(o) { built.add(o); return o; }

  var S = {};

  S.view3d = function (o) {
    o = o || {}; mode = '3d'; camera = cam3;
    var c = o.camera || [7, 6, 5], t = o.target || [0, 0, 0];
    target.set(+t[0] || 0, +t[1] || 0, +t[2] || 0);
    var d = new THREE.Vector3(+c[0] - target.x, +c[1] - target.y, +c[2] - target.z);
    orbit.r = Math.max(0.5, d.length());
    orbit.th = Math.atan2(d.y, d.x);
    orbit.ph = Math.acos(Math.min(1, Math.max(-1, d.z / orbit.r)));
  };

  S.view2d = function (o) {
    o = o || {}; mode = '2d'; camera = cam2;
    var x = o.x || [-10, 10], y = o.y || [-6, 6];
    view2.cx = (x[0] + x[1]) / 2; view2.cy = (y[0] + y[1]) / 2; view2.h = Math.abs(y[1] - y[0]) || 12;
  };

  S.caption = function (text) { captionEl.textContent = text || ''; };

  S.param = function (name, o) { return core.param(name, o); };

  S.steps = function (titles) { core.stepTitles = (titles || []).map(String); core.setStep(core.step); };

  S.animate = function (on) { core.animated = on !== false; if (on === 'play') core.playing = true; };

  S.build = function (fn) { build = typeof fn === 'function' ? fn : null; };

  S.label = function (text, p, o) {
    o = o || {};
    var el = document.createElement('div'); el.className = 'sc-label';
    el.textContent = text; el.style.color = o.color || '#17163A';
    if (o.size) el.style.fontSize = o.size + 'px';
    labelsEl.appendChild(el);
    labels.push({ el: el, p: vec(p) });
  };

  S.point = function (p, o) {
    o = o || {};
    var r = o.size || (mode === '2d' ? view2.h / 120 : 0.08);
    var m = add(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: col(o.color, '#17163A') })));
    m.position.copy(vec(p));
    if (o.label) S.label(o.label, p, { color: o.color });
    return m;
  };

  function lineMat(o) {
    return o.dashed
      ? new THREE.LineDashedMaterial({ color: col(o.color, '#17163A'), dashSize: o.dash || 0.2, gapSize: o.dash || 0.15 })
      : new THREE.LineBasicMaterial({ color: col(o.color, '#17163A') });
  }

  S.polyline = function (points, o) {
    o = o || {};
    var g = new THREE.BufferGeometry().setFromPoints(points.map(vec));
    var l = add(new THREE.Line(g, lineMat(o)));
    if (o.dashed) l.computeLineDistances();
    return l;
  };

  S.line = function (a, b, o) { return S.polyline([a, b], o); };

  S.vector = function (a, b, o) {
    o = o || {};
    var A = vec(a), B = vec(b), d = B.clone().sub(A), len = d.length();
    if (len < 1e-9) return null;
    var head = Math.min(len * 0.3, o.head || (mode === '2d' ? view2.h / 30 : 0.3));
    var arrow = add(new THREE.ArrowHelper(d.normalize(), A, len, col(o.color, '#E5484D').getHex(), head, head * 0.55));
    if (o.label) S.label(o.label, b, { color: o.color || '#E5484D' });
    return arrow;
  };

  S.axes = function (size, o) {
    o = o || {};
    var n = size || 5, names = o.labels === false ? null : (o.names || ['x', 'y', 'z']);
    var dims = mode === '2d' ? 2 : 3;
    for (var i = 0; i < dims; i++) {
      var a = [0, 0, 0], b = [0, 0, 0];
      a[i] = -n; b[i] = n;
      S.vector(a, b, { color: '#7E90AE', head: n / 18 });
      if (names) S.label(names[i], b, { color: '#7E90AE' });
    }
  };

  S.grid = function (size, o) {
    o = o || {};
    var n = size || 10, step = o.step || 1, pts = [];
    for (var v = -n; v <= n + 1e-9; v += step) {
      pts.push(new THREE.Vector3(v, -n, 0), new THREE.Vector3(v, n, 0), new THREE.Vector3(-n, v, 0), new THREE.Vector3(n, v, 0));
    }
    return add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: col(o.color, '#E3E8F2') })));
  };

  S.curve = function (fn, o) {
    o = o || {};
    var t = o.t || [0, 1], n = o.n || 200, pts = [];
    for (var i = 0; i <= n; i++) {
      var p = fn(t[0] + (t[1] - t[0]) * i / n);
      if (p && isFinite(p[0]) && isFinite(p[1])) pts.push(p);
    }
    return S.polyline(pts, o);
  };

  S.graph = function (f, o) {
    o = o || {};
    var x = o.x || [-10, 10], n = o.n || 400, segs = [], cur = [];
    for (var i = 0; i <= n; i++) {
      var xv = x[0] + (x[1] - x[0]) * i / n, yv = f(xv);
      if (isFinite(yv) && Math.abs(yv) < 1e6) cur.push([xv, yv, 0]);
      else if (cur.length) { segs.push(cur); cur = []; }
    }
    if (cur.length) segs.push(cur);
    segs.forEach(function (s) { if (s.length > 1) S.polyline(s, { color: o.color || '#4B3FDB', dashed: o.dashed }); });
  };

  function meshMat(o, dflt) {
    return new THREE.MeshPhongMaterial({ color: col(o.color, dflt), side: THREE.DoubleSide, shininess: 30,
      transparent: o.opacity != null && o.opacity < 1, opacity: o.opacity != null ? o.opacity : 1 });
  }

  S.parametric = function (fn, o) {
    o = o || {};
    var u = o.u || [0, 1], v = o.v || [0, 1], n = o.n || 40, m = o.m || n;
    var pos = [], idx = [];
    for (var i = 0; i <= n; i++) for (var j = 0; j <= m; j++) {
      var p = fn(u[0] + (u[1] - u[0]) * i / n, v[0] + (v[1] - v[0]) * j / m) || [0, 0, 0];
      pos.push(+p[0] || 0, +p[1] || 0, +p[2] || 0);
    }
    for (i = 0; i < n; i++) for (j = 0; j < m; j++) {
      var a = i * (m + 1) + j, b = a + m + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    var mesh = add(new THREE.Mesh(g, meshMat(o, '#4B3FDB')));
    if (o.wire !== false) add(new THREE.LineSegments(new THREE.WireframeGeometry(g),
      new THREE.LineBasicMaterial({ color: 0x17163A, transparent: true, opacity: 0.18 })));
    return mesh;
  };

  S.surface = function (f, o) {
    o = o || {};
    var x = o.x || [-3, 3], y = o.y || [-3, 3];
    return S.parametric(function (u, v) { return [u, v, f(u, v)]; },
      { u: x, v: y, n: o.n || 40, color: o.color || '#8B80F9', opacity: o.opacity, wire: o.wire });
  };

  S.polygon = function (points, o) {
    o = o || {};
    if (!points || points.length < 3) return null;
    var pos = [];
    for (var i = 1; i < points.length - 1; i++) {
      [points[0], points[i], points[i + 1]].forEach(function (p) { pos.push(+p[0] || 0, +p[1] || 0, +(p[2] || 0)); });
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    var mesh = add(new THREE.Mesh(g, meshMat(o, '#4B3FDB')));
    if (o.edges !== false) S.polyline(points.concat([points[0]]), { color: o.edgeColor || '#17163A' });
    return mesh;
  };

  /** Многогранник: вершини й грані (масиви номерів вершин), ребра — видимі. */
  S.polyhedron = function (vertices, faces, o) {
    o = o || {};
    faces.forEach(function (f) {
      S.polygon(f.map(function (k) { return vertices[k]; }),
        { color: o.color || '#4B3FDB', opacity: o.opacity != null ? o.opacity : 0.18, edges: o.edges, edgeColor: o.edgeColor });
    });
    (o.labels || []).forEach(function (name, k) { if (name && vertices[k]) S.label(name, vertices[k]); });
  };

  S.sphere = function (c, r, o) {
    o = o || {};
    var m = add(new THREE.Mesh(new THREE.SphereGeometry(r || 1, 40, 28), meshMat(o, '#4B3FDB')));
    m.position.copy(vec(c || [0, 0, 0]));
    return m;
  };

  /** Свій обʼєкт three.js — для того, чого немає серед команд. */
  S.add = function (obj) { return add(obj); };
  S.THREE = THREE;

  /* ============================================================
     Звʼязок із дошкою
     ============================================================ */

  function run(code) {
    clearBuilt();
    build = null;
    core = Object.assign(new Core(), { role: core.role });
    captionEl.textContent = '';
    if (errEl) { errEl.remove(); errEl = null; }
    S.view3d();
    try {
      // eslint-disable-next-line no-new-func
      new Function('S', 'THREE', String(code || ''))(S, THREE);
    } catch (e) { showError(e); }
    renderPanel();
    rebuild();
    core.cam = camState();
    fresh = true;
    redraw();
  }

  window.addEventListener('message', function (e) {
    if (e.source !== parent) return;                // лише від дошки, що нас відкрила
    var m = e.data || {};
    if (m.type === 'load') {
      core.role = m.role === 'student' ? 'student' : 'tutor';
      run(m.code);
      if (m.state) applyState(m.state, true);
    } else if (m.type === 'apply') {
      applyState(m.state, false);
    } else if (m.type === 'poster') {
      fresh = true; redraw();
    }
  });

  function applyState(st, force) {
    if (!core.apply(st, force)) return;
    if (core.cam) useCam(core.cam);
    syncPanel();
    rebuild();
    redraw();
  }

  post({ type: 'ready' });
})();
