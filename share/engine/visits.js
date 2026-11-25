/* Облік відвідувань дошки: хто, коли й скільки пробув.

   Спільний для сторінки учня й кабінету репетитора. Візит — це вхід на
   дошку; поки сторінка на екрані, раз на хвилину на сервер іде позначка
   «ще тут» (кілька байтів — трафіку від неї не набігає). Тривалість —
   від входу до останньої позначки.

   Сховали сторінку (згорнули, перемкнулись) — позначки зупиняються, час
   не набігає. Повернулись за 5 хв — той самий візит; пізніше — новий.

   Сам запис робить send(id, device) — у кожної сторінки свій шлях до
   сервера (учень — за посиланням, репетитор — під своїм входом). Читати
   журнал може лише репетитор: на сервері — RLS, див. supabase/board-visits.sql. */
(function () {
  'use strict';

  var BEAT_MS = 60000;
  var NEW_AFTER_MS = 5 * 60000;

  function newId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    // старі браузери: той самий вигляд uuid v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  function deviceOf(ua) {
    ua = String(ua || '');
    if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'планшет';
    if (/Mobi|iPhone|Android/i.test(ua)) return 'телефон';
    return 'компʼютер';
  }

  /** Хвилин між двома мітками часу — округлено, щонайменше одна. */
  function minutes(from, to) {
    var ms = Date.parse(to) - Date.parse(from);
    return Math.max(1, Math.round(ms / 60000));
  }

  /**
   * Почати облік. Повертає stop() — викликати, коли з дошки пішли.
   * send(id, device) — записати позначку; помилки мовчки ковтаються:
   * облік не має заважати уроку.
   */
  function track(send) {
    var device = deviceOf(window.navigator && navigator.userAgent);
    var id = newId(), timer = null, hiddenAt = null, stopped = false;

    function beat() {
      try {
        var p = send(id, device);
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
    function run() {
      if (timer) return;
      beat();
      timer = setInterval(beat, BEAT_MS);
    }
    function pause() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function onVis() {
      if (stopped) return;
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        pause();
      } else {
        if (hiddenAt !== null && Date.now() - hiddenAt >= NEW_AFTER_MS) id = newId();
        hiddenAt = null;
        run();
      }
    }

    document.addEventListener('visibilitychange', onVis);
    if (document.visibilityState !== 'hidden') run(); else hiddenAt = Date.now();

    return function stop() {
      if (stopped) return;
      stopped = true;
      pause();
      document.removeEventListener('visibilitychange', onVis);
    };
  }

  /**
   * Підсумок для картки учня: візити по уроках учня (свіжі вище, у межах
   * уроку — за часом входу) і скільки хвилин за останні 30 днів.
   */
  function summary(rows, lessonIds, now) {
    var mine = {}, by = {}, order = [];
    (lessonIds || []).forEach(function (id) { mine[id] = 1; });
    var month = { student: 0, studentVisits: 0, tutor: 0, tutorVisits: 0 };
    var from = now - 30 * 86400000;
    (rows || []).forEach(function (r) {
      if (!r || !mine[r.lesson_id]) return;
      var v = { who: r.who, device: r.device || '', start: r.started_at, end: r.last_at, min: minutes(r.started_at, r.last_at) };
      if (!by[r.lesson_id]) { by[r.lesson_id] = { id: r.lesson_id, visits: [], last: '' }; order.push(r.lesson_id); }
      by[r.lesson_id].visits.push(v);
      if (v.start > by[r.lesson_id].last) by[r.lesson_id].last = v.start;
      if (Date.parse(v.start) >= from) {
        if (v.who === 'student') { month.student += v.min; month.studentVisits++; }
        else { month.tutor += v.min; month.tutorVisits++; }
      }
    });
    var lessons = order.map(function (id) {
      var g = by[id];
      g.visits.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
      return g;
    }).sort(function (a, b) { return a.last < b.last ? 1 : -1; });
    return { lessons: lessons, month: month };
  }

  window.Visits = { track: track, deviceOf: deviceOf, minutes: minutes, summary: summary };
})();
