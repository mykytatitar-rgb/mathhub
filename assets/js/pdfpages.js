/* PDF на дошку: кожна сторінка — окрема картинка, усі в один рядок.

   Розрізає файл бібліотека pdf.js (assets/vendor/pdfjs, Mozilla, Apache 2.0).
   Вантажиться разом із цим файлом лише тоді, коли PDF справді вставляють
   (група «pdf» у app.js). Тут — що вважати PDF, які сторінки брати, як
   їх розкласти і сам рендер сторінки в картинку. */

(function (root) {
  'use strict';

  var P = {};

  /* Понад стільки сторінок — спершу питаємо, які саме: підручник на 300
     сторінок цілим на дошку — це хвилини роботи й сотні мегабайт. */
  P.MANY = 20;

  /* Довша сторона сторінки в пікселях — та сама стеля, що й у сховищі
     картинок (imagestore.js, MAX_SIDE): більше воно однаково зменшить. */
  P.SIDE = 1800;

  P.isPdf = function (f) {
    return !!f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''));
  };

  /** «1-5, 8» → [1,2,3,4,5,8] у межах 1..n; порожньо — усі сторінки. */
  P.parseRange = function (text, n) {
    var s = String(text || '').trim();
    var out = {};
    if (!s) { for (var a = 1; a <= n; a++) out[a] = 1; }
    s.split(/[,;\s]+/).forEach(function (part) {
      var m = /^(\d+)(?:[-–—](\d+))?$/.exec(part);
      if (!m) return;
      var x = +m[1], y = m[2] ? +m[2] : x;
      if (x > y) { var t = x; x = y; y = t; }
      for (var i = Math.max(1, x); i <= Math.min(n, y); i++) out[i] = 1;
    });
    return Object.keys(out).map(Number).sort(function (p, q) { return p - q; });
  };

  /**
   * Рамки сторінок у світі дошки: однакова висота H, у рядок зліва
   * направо з проміжком gap; перша — по центру точки вставки.
   */
  P.layout = function (sizes, at, H, gap) {
    var x = null;
    return sizes.map(function (s) {
      var w = H * s.w / s.h;
      if (x === null) x = at.x - w / 2;
      var box = { x: x, y: at.y - H / 2, w: w, h: H };
      x += w + gap;
      return box;
    });
  };

  /** Масштаб рендеру: довша сторона — side пікселів, але не більше ×4. */
  P.scaleFor = function (w, h, side) {
    return Math.min(4, side / Math.max(w, h));
  };

  /* ---------- Робота з pdf.js (лише в браузері) ---------- */

  function lib() {
    var L = root.pdfjsLib;
    if (!L) throw new Error('pdf.js не завантажився');
    if (!L.GlobalWorkerOptions.workerSrc && root.App) {
      L.GlobalWorkerOptions.workerSrc = root.App.versioned('assets/vendor/pdfjs/pdf.worker.min.js');
    }
    return L;
  }

  /** Відкрити файл. Повертає документ pdf.js (numPages, getPage). */
  P.open = function (file) {
    return file.arrayBuffer().then(function (buf) {
      /* isEvalSupported: false — захист сторінки (CSP) не дозволяє eval,
         і pdf.js без цього прапорця щоразу впирався б у заборону. */
      return lib().getDocument({ data: buf, isEvalSupported: false }).promise;
    });
  };

  /** Сторінка num → картинка (Blob) і її пропорції. */
  P.pageImage = function (doc, num) {
    return doc.getPage(num).then(function (page) {
      var base = page.getViewport({ scale: 1 });
      var vp = page.getViewport({ scale: P.scaleFor(base.width, base.height, P.SIDE) });
      var c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      var g = c.getContext('2d');
      g.fillStyle = '#fff';                       // прозорі сторінки — на білому, як на папері
      g.fillRect(0, 0, c.width, c.height);
      /* intent 'print' — малює одним махом, не чекаючи кадрів анімації:
         у звичайному режимі pdf.js стояв, щойно вкладку чи вікно сховали
         (перейшли в інше вікно, поки ріжеться книжка). */
      return page.render({ canvasContext: g, viewport: vp, intent: 'print' }).promise.then(function () {
        return new Promise(function (resolve, reject) {
          c.toBlob(function (b) {
            var size = { w: c.width, h: c.height };
            c.width = c.height = 0;                 // памʼять полотна — одразу назад
            page.cleanup();
            if (!b) { reject(new Error('сторінка ' + num + ' не намалювалась')); return; }
            var f;
            try { f = new File([b], 'page-' + num + '.png', { type: 'image/png' }); } catch (e) { f = b; }
            resolve({ file: f, w: size.w, h: size.h });
          }, 'image/png');
        });
      });
    });
  };

  root.PdfPages = P;
})(window);
