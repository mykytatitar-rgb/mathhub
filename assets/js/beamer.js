/* Друкований слайд у вигляді LaTeX Beamer.

   Рукопис із дошки Claude переписує в зміст слайда (див. функцію
   supabase/functions/board-latex): заголовок і блоки — абзаци, формули,
   пункти, рисунки. Тут із цього змісту збираються дві речі:

   1) картинка слайда для дошки — як справжній кадр Beamer (тема Madrid:
      синя смуга заголовка, трикутні маркери). Формули набирає MathJax —
      той самий LaTeX, шрифт Computer Modern, дроби й корені як у документі.
      Картинка — SVG, переведене в PNG: жодних зовнішніх шрифтів чи
      foreignObject, тож полотно лишається «чистим» і його можна зберегти;
   2) файл .tex — справжня презентація Beamer, яку збирає pdflatex
      (MiKTeX) або Overleaf.

   MathJax важить понад 2 МБ, тож вантажиться лише тут і лише коли
   перетворення справді запустили (App.need('beamer')). Цей файл іде в
   групі першим і задає налаштування MathJax до того, як той запуститься. */

(function () {
  'use strict';

  /* Налаштування MathJax — до завантаження самого MathJax. fontCache 'none':
     кожна формула — самодостатнє SVG без посилань на спільні гліфи, інакше
     окремою картинкою її не намалювати. */
  if (!window.MathJax || !window.MathJax.tex2svg) {
    window.MathJax = {
      tex: {
        macros: {
          tg: '\\operatorname{tg}', ctg: '\\operatorname{ctg}',
          arctg: '\\operatorname{arctg}', arcctg: '\\operatorname{arcctg}',
          cosec: '\\operatorname{cosec}'
        }
      },
      svg: { fontCache: 'none' },
      startup: { typeset: false }
    };
  }

  var BLUE = '#3333B3';            // колір структури Beamer
  var W = 1280, PAD = 64;          // ширина кадру й поля
  var FS = 34;                     // кегль тексту
  var LH = Math.round(FS * 1.5);   // найменша висота рядка
  var SERIF = "Georgia, 'Times New Roman', 'Noto Serif', serif";

  var measureCtx = null;
  function textWidth(s, size, italic) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = (italic ? 'italic ' : '') + size + 'px ' + SERIF;
    return measureCtx.measureText(s).width;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- Формула через MathJax ----------
     Розміри беремо з viewBox (тисячні частки em): ширина, висота над
     рядком і глибина під ним — без здогадок про висоту літери x. */
  function math(tex, size, display) {
    var node, svg;
    try {
      node = window.MathJax.tex2svg(tex, { display: !!display });
      svg = node.querySelector('svg');
    } catch (e) { svg = null; }
    // формула з помилкою: MathJax показує її червоним — краще звичайним текстом
    if (!svg || node.querySelector('[data-mml-node="merror"]')) return null;
    var vb = (svg.getAttribute('viewBox') || '0 0 0 0').split(/\s+/).map(Number);
    var k = size / 1000;
    return {
      svg: svg,
      vb: vb,
      w: vb[2] * k,
      asc: -vb[1] * k,
      desc: (vb[1] + vb[3]) * k
    };
  }

  var serializer = null;
  function placeMath(m, x, top, scale) {
    scale = scale || 1;
    /* XMLSerializer, а не innerHTML: HTML-запис дає «&nbsp;», а картинка
       SVG — це XML, де такої назви немає, і вся картинка не відкрилася б. */
    if (!serializer) serializer = new XMLSerializer();
    var inner = Array.prototype.map.call(m.svg.childNodes, function (n) {
      return serializer.serializeToString(n);
    }).join('');
    return '<svg x="' + x.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + (m.w * scale).toFixed(1) +
      '" height="' + ((m.asc + m.desc) * scale).toFixed(1) + '" viewBox="' + m.vb.join(' ') +
      '" overflow="visible" fill="currentColor" stroke="currentColor" stroke-width="0">' + inner + '</svg>';
  }

  /* ---------- Рядок із текстом і формулами ----------
     «Розвʼяжемо $x^2 = 4$.» — слова й формули йдуть підряд і переносяться
     по ширині кадру, як в абзаці LaTeX. */
  function tokens(src, size, italic) {
    var out = [];
    var re = /\$([^$]+)\$/g, at = 0, m;
    function words(t) {
      t.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { if (out.length) out[out.length - 1].space = true; return; }
        out.push({ word: w, w: textWidth(w, size, italic), asc: size * 0.8, desc: size * 0.25 });
      });
    }
    while ((m = re.exec(src))) {
      words(src.slice(at, m.index));
      var mm = math(m[1], size, false);
      if (mm) out.push({ m: mm, w: mm.w, asc: mm.asc, desc: mm.desc });
      else words(m[1]);
      at = m.index + m[0].length;
    }
    words(src.slice(at));
    return out;
  }

  function flow(src, x0, maxX, top, size, color, italic) {
    var toks = tokens(src, size, italic);
    var space = textWidth(' ', size, italic);
    var lines = [], line = [], x = x0;
    toks.forEach(function (t, i) {
      var gap = line.length && toks[i - 1].space ? space : 0;
      if (line.length && x + gap + t.w > maxX) { lines.push(line); line = []; x = x0; gap = 0; }
      t.x = x + gap;
      x = t.x + t.w;
      line.push(t);
    });
    if (line.length) lines.push(line);

    var svg = '', y = top;
    lines.forEach(function (ln) {
      var asc = size * 0.8, desc = size * 0.3;
      ln.forEach(function (t) { asc = Math.max(asc, t.asc); desc = Math.max(desc, t.desc); });
      var h = Math.max(LH * size / FS, asc + desc + size * 0.25);
      var base = y + (h - asc - desc) / 2 + asc;
      ln.forEach(function (t) {
        if (t.m) svg += '<g color="' + color + '">' + placeMath(t.m, t.x, base - t.m.asc) + '</g>';
        else svg += '<text x="' + t.x.toFixed(1) + '" y="' + base.toFixed(1) + '" font-size="' + size +
          '" font-family="' + esc(SERIF) + '"' + (italic ? ' font-style="italic"' : '') +
          ' fill="' + color + '">' + esc(t.word) + '</text>';
      });
      y += h;
    });
    return { svg: svg, bottom: y };
  }

  /* ---------- Кадр ---------- */
  function frameSvg(slide) {
    var body = '', y;
    var title = String(slide.title || '').trim();

    // смуга заголовка, як у темі Madrid; без заголовка — одразу зміст
    var head = '';
    if (title) {
      var t = flow(title, PAD, W - PAD, 18, 40, '#ffffff');
      var barH = Math.max(92, t.bottom + 18);
      head = '<rect x="0" y="0" width="' + W + '" height="' + barH + '" fill="' + BLUE + '"/>' + t.svg;
      y = barH + 34;
    } else {
      y = 46;
    }

    var maxX = W - PAD;
    (slide.blocks || []).forEach(function (b) {
      if (b.kind === 'math') {
        var m = math(b.tex, FS * 1.08, true);
        if (!m) { var f0 = flow(b.tex, PAD, maxX, y, FS, '#1a1a1a'); body += f0.svg; y = f0.bottom + 8; return; }
        var scale = Math.min(1, (W - 2 * PAD) / m.w);
        var h = (m.asc + m.desc) * scale;
        y += FS * 0.35;
        body += '<g color="#111">' + placeMath(m, (W - m.w * scale) / 2, y, scale) + '</g>';
        y += h + FS * 0.5;
      } else if (b.kind === 'item') {
        // маркер — синій трикутник, як у Beamer за замовчуванням
        var cy = y + LH / 2 + 2;
        body += '<polygon points="' + (PAD + 4) + ',' + (cy - 9) + ' ' + (PAD + 20) + ',' + cy + ' ' +
          (PAD + 4) + ',' + (cy + 9) + '" fill="' + BLUE + '"/>';
        var fi = flow(b.tex, PAD + 40, maxX, y, FS, '#1a1a1a');
        body += fi.svg;
        y = fi.bottom + 6;
      } else if (b.kind === 'figure') {
        var ff = flow('(' + b.tex + ')', PAD, maxX, y, FS * 0.85, '#6b6b80', true);
        body += ff.svg;
        y = ff.bottom + 8;
      } else {
        var ft = flow(b.tex, PAD, maxX, y, FS, '#1a1a1a');
        body += ft.svg;
        y = ft.bottom + 10;
      }
    });

    /* Висота — за змістом. Кадр 16:9 із двома рядками — це дві третини
       порожнечі, і на дошці текст виходив дрібнішим за почерк. Справжні
       кадри 16:9 — у файлі .tex. */
    var H = Math.max(260, Math.ceil(y + 40));
    return {
      w: W, h: H,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + W +
        '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
        '<rect x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '" fill="#ffffff" stroke="#d6d6e4"/>' +
        head + body + '</svg>'
    };
  }

  var B = {};

  /** MathJax готовий до набору (вантажиться разом із цим файлом). */
  B.ready = function () {
    var mj = window.MathJax;
    if (mj && mj.startup && mj.startup.promise) return mj.startup.promise;
    return Promise.reject(new Error('MathJax не завантажився'));
  };

  /** Слайд → PNG (Blob). */
  B.render = function (slide) {
    return B.ready().then(function () {
      var fr = frameSvg(slide);
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(new Blob([fr.svg], { type: 'image/svg+xml' }));
        var img = new Image();
        img.onload = function () {
          var k = 1.4;                                   // чіткість на великих екранах
          var cv = document.createElement('canvas');
          cv.width = Math.round(fr.w * k);
          cv.height = Math.round(fr.h * k);
          var ctx = cv.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          URL.revokeObjectURL(url);
          cv.toBlob(function (blob) {
            if (blob) resolve(blob); else reject(new Error('Не вдалося зберегти слайд'));
          }, 'image/png');
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Не вдалося намалювати слайд')); };
        img.src = url;
      });
    });
  };

  /* ---------- Файл .tex ---------- */

  // спецсимволи LaTeX у звичайному тексті (поза $…$)
  function texText(s) {
    return String(s)
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/([#%&_{}])/g, '\\$1')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/ʼ/g, '\'');                // pdflatex не знає U+02BC
  }
  function texMixed(s) {
    var out = '', re = /\$([^$]+)\$/g, at = 0, m;
    while ((m = re.exec(s))) {
      out += texText(s.slice(at, m.index)) + '$' + m[1] + '$';
      at = m.index + m[0].length;
    }
    return out + texText(s.slice(at));
  }

  /** Кадри (як їх повернув розпізнавач) → повний документ Beamer. */
  B.toTex = function (frames) {
    var langs = {};
    frames.forEach(function (f) { langs[f.lang || 'uk'] = 1; });
    var BABEL = { en: 'english', ru: 'russian', uk: 'ukrainian' };
    var order = ['en', 'ru', 'uk'].filter(function (l) { return langs[l]; });
    if (!order.length) order = ['uk'];
    // основна мова — остання в переліку babel
    var main = langs.uk ? 'uk' : order[order.length - 1];
    order = order.filter(function (l) { return l !== main; }).concat(main);
    var cyr = langs.uk || langs.ru;

    var out = [
      '% Слайди, перетворені з дошки «Вектора».',
      '% Зібрати: pdflatex (MiKTeX, TeX Live) або завантажити в Overleaf.',
      '\\documentclass[aspectratio=169]{beamer}',
      '\\usetheme{Madrid}',
      '\\setbeamertemplate{navigation symbols}{}',
      cyr ? '\\usepackage[T2A,T1]{fontenc}' : '\\usepackage[T1]{fontenc}',
      '\\usepackage[utf8]{inputenc}',
      '\\usepackage[' + order.map(function (l) { return BABEL[l]; }).join(',') + ']{babel}',
      '\\usepackage{amsmath,amssymb}',
      '\\providecommand{\\tg}{\\operatorname{tg}}',
      '\\providecommand{\\ctg}{\\operatorname{ctg}}',
      '\\providecommand{\\arctg}{\\operatorname{arctg}}',
      '\\providecommand{\\arcctg}{\\operatorname{arcctg}}',
      '',
      '\\begin{document}',
      ''
    ];

    frames.forEach(function (f) {
      out.push('\\begin{frame}[t]' + (f.title ? '{' + texText(f.title) + '}' : ''));
      var inList = false;
      (f.blocks || []).forEach(function (b) {
        if (b.kind === 'item' && !inList) { out.push('\\begin{itemize}'); inList = true; }
        if (b.kind !== 'item' && inList) { out.push('\\end{itemize}'); inList = false; }
        if (b.kind === 'item') out.push('  \\item ' + texMixed(b.tex));
        else if (b.kind === 'math') out.push('\\[', '  ' + b.tex, '\\]');
        else if (b.kind === 'figure') out.push('\\textit{(' + texText(b.tex) + ')}', '');
        else out.push(texMixed(b.tex), '');
      });
      if (inList) out.push('\\end{itemize}');
      out.push('\\end{frame}', '');
    });

    out.push('\\end{document}', '');
    return out.join('\n');
  };

  window.Beamer = B;
})();
