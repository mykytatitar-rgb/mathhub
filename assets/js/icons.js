/* Іконки — тонкі лінійні, у стилі скріншота */
(function () {
  'use strict';

  var P = {
    home:      '<path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    book:      '<path d="M4 5a2 2 0 0 1 2-2h4v18H6a2 2 0 0 1-2-2zM14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4z"/><path d="M10 3v18"/>',
    users:     '<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/>',
    user:      '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    calendar:  '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock:     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.9"/>',
    chart:     '<path d="M3 21h18"/><rect x="5" y="11" width="4" height="8" rx="1.2"/><rect x="11" y="6" width="4" height="13" rx="1.2"/><rect x="17" y="14" width="4" height="5" rx="1.2"/>',
    pie:       '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15.5 3.8A9 9 0 0 1 20.2 8.5H15.5z"/>',
    trophy:    '<path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/><path d="M9 21h6M12 15v6"/>',
    target:    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    checklist: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M3.5 6 4.8 7.3 7 5M3.5 12l1.3 1.3L7 11M3.5 18l1.3 1.3L7 17"/>',
    card:      '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/>',
    wallet:    '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2"/><path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2"/><circle cx="17" cy="14" r="1.3" fill="currentColor" stroke="none"/>',
    folder:    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    file:      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    note:      '<path d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-3.5-2.2L12 20l-3.5-2.2L5 20z"/><path d="M9 8h6M9 12h4"/>',
    link:      '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7L11.8 6.5"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0L5 13.3a4 4 0 1 0 5.7 5.7l1.5-1.5"/>',
    cloud:     '<path d="M7 18a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 9.5a3.8 3.8 0 0 1 .4 8.5z"/>',
    // числова вісь: риска зі стрілкою і діленнями
    axes:      '<path d="M4 20V4M4 20h16"/><path d="M4 4l-1.8 2.4M4 4l1.8 2.4"/><path d="M20 20l-2.4-1.8M20 20l-2.4 1.8"/><path d="M6.5 17.5c3-1 4.5-4.5 5.5-7.5s2.5-5 4.5-5.5"/>',
    sigma:     '<path d="M17 5H7l6 7-6 7h10"/>',
    cube3d:    '<path d="M12 3l8 4.4v9.2L12 21l-8-4.4V7.4z"/><path d="M4 7.4l8 4.4 8-4.4M12 11.8V21"/>',
    dot:       '<circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8"/>',
    link2:     '<circle cx="6" cy="18" r="2.6"/><circle cx="18" cy="6" r="2.6"/><path d="M7.9 16.1 16.1 7.9"/>',
    ruler:     '<path d="M3 12h17M20 12l-3.2-2.4M20 12l-3.2 2.4"/><path d="M6 9.4v5.2M10 9.4v5.2M14 9.4v5.2"/>',
    refresh:   '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4h-4"/>',
    plus:      '<path d="M12 5v14M5 12h14"/>',
    minus:     '<path d="M5 12h14"/>',
    check:     '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
    x:         '<path d="M6 6l12 12M18 6 6 18"/>',
    chevronR:  '<path d="M9 5l7 7-7 7"/>',
    chevronL:  '<path d="M15 5l-7 7 7 7"/>',
    chevronD:  '<path d="M6 9l6 6 6-6"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrowRight:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUp:   '<path d="M12 19V5M6 11l6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    edit:      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5z"/>',
    trash:     '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M5.5 7l1 12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2l1-12M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
    search:    '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
    settings:  '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.9 19.4l-.1.1A2 2 0 1 1 5 16.7l.1-.1A1.6 1.6 0 0 0 4 13.9H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.9l-.1-.1A2 2 0 1 1 7.3 5l.1.1a1.6 1.6 0 0 0 1.8.3H9.3A1.6 1.6 0 0 0 10.3 4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1A2 2 0 1 1 20 6.9l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.4 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    power:     '<path d="M12 3v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    send:      '<path d="M21.5 2.5 11 13"/><path d="M21.5 2.5 15 21l-4-8-8-4z"/>',
    mail:      '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    phone:     '<path d="M22 16.9v2.5a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h2.5a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.7 9.7a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    star:      '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    flame:     '<path d="M12 22a7 7 0 0 0 7-7c0-5-4-6-4-10 0 0-3 1.5-3 5 0 1.5-1 2-1.6 1.2C9.5 10 9 8.5 9 8.5S5 11 5 15a7 7 0 0 0 7 7z"/>',
    download:  '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    upload:    '<path d="M12 20V8M7 12l5-5 5 5"/><path d="M4 4h16"/>',
    alert:     '<path d="M12 3.5 22 20H2z"/><path d="M12 9.5v4.5M12 17.2v.1"/>',
    info:      '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/>',
    sparkles:  '<path d="m12 3 1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/>',
    grid:      '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    layers:    '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/>',
    brain:     '<path d="M9.5 3A3 3 0 0 0 7 7.5 3 3 0 0 0 5 13a3 3 0 0 0 2.5 3 3 3 0 0 0 4.5 2.5V3.5A2 2 0 0 0 9.5 3z"/><path d="M14.5 3A3 3 0 0 1 17 7.5 3 3 0 0 1 19 13a3 3 0 0 1-2.5 3A3 3 0 0 1 12 18.5V3.5A2 2 0 0 1 14.5 3z"/>',
    bell:      '<path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
    calc:      '<rect x="4" y="2.5" width="16" height="19" rx="3"/><path d="M8 7h8"/><path d="M8.5 12h.1M12 12h.1M15.5 12h.1M8.5 16h.1M12 16h.1M15.5 16v.1"/>',
    copy:      '<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8"/>',
    filter:    '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    print:     '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',

    /* --- інструменти дошки --- */
    pen:       '<path d="M3 21l1.2-4.2L15.5 5.5a2.1 2.1 0 0 1 3 3L7.2 19.8z"/><path d="M13.5 7.5l3 3"/>',
    eraser:    '<path d="M8.5 20H20"/><path d="M15.5 4.5 20 9a1.7 1.7 0 0 1 0 2.4L12.4 19a1.7 1.7 0 0 1-2.4 0l-5-5a1.7 1.7 0 0 1 0-2.4l8.1-7.1a1.7 1.7 0 0 1 2.4 0z"/><path d="M8 8.5 15.5 16"/>',
    textT:     '<path d="M4 6V4h16v2"/><path d="M12 4v16"/><path d="M8.5 20h7"/>',
    shapeLine: '<path d="M5 19 19 5"/>',
    shapes:    '<path d="M8.2 3.5 13.4 12H3z"/><rect x="12.5" y="12.5" width="8.5" height="8" rx="1.6"/><circle cx="17" cy="7" r="3.6"/>',
    globe:     '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/>',
    mathmap:   '<circle cx="12" cy="12" r="2.6"/><path d="M12 9.4V4.6M14.3 13.3l4.4 2.5M9.7 13.3l-4.4 2.5"/><circle cx="12" cy="3.2" r="1.6"/><circle cx="20" cy="16.6" r="1.6"/><circle cx="4" cy="16.6" r="1.6"/>',
    compass:   '<circle cx="12" cy="4.4" r="1.7"/><path d="M12 6.1 6 20"/><path d="M12 6.1 18 20"/><path d="M8.8 14h6.4"/>',
    shapeRect: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/>',
    shapeCirc: '<circle cx="12" cy="12" r="8.5"/>',
    hand:      '<path d="M10 11V4.8a1.6 1.6 0 0 1 3.2 0V11"/><path d="M13.2 11V3.6a1.6 1.6 0 0 1 3.2 0V11"/><path d="M16.4 11.5V6.8a1.6 1.6 0 0 1 3.2 0V15a6 6 0 0 1-6 6h-1.7a5 5 0 0 1-3.6-1.5l-3.8-3.9a1.7 1.7 0 0 1 2.3-2.4L10 15.5V6.4a1.6 1.6 0 0 1 3.2 0"/>',
    cursor:    '<path d="M5 3l14 8-6.2 1.6L10.5 19z"/>',
    undo:      '<path d="M4 8h9a5.5 5.5 0 0 1 0 11H8"/><path d="M8 4 4 8l4 4"/>',
    redo:      '<path d="M20 8h-9a5.5 5.5 0 0 0 0 11h5"/><path d="M16 4l4 4-4 4"/>',
    zoomIn:    '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.6-4.6M10.5 8v5M8 10.5h5"/>',
    zoomOut:   '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.6-4.6M8 10.5h5"/>',
    fit:       '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>',
    present:   '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8.5 20h7"/>',
    board:     '<rect x="2.5" y="4" width="19" height="13" rx="2.5"/><path d="M12 17v3M8 20h8"/><path d="M6.5 12.5s1.8-4 3.2-4 1 3.4 2.3 3.4 2-2.4 3.5-2.4"/>',
    share:     '<circle cx="18" cy="5.5" r="2.8"/><circle cx="6" cy="12" r="2.8"/><circle cx="18" cy="18.5" r="2.8"/><path d="M8.5 10.7 15.5 6.9M8.5 13.3l7 3.8"/>',
    image:     '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.5" cy="10" r="1.8"/><path d="m3.5 17 4.8-4.3a2 2 0 0 1 2.7 0l3.4 3.1 2-1.7a2 2 0 0 1 2.6 0l1.5 1.3"/>',
    eye:       '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12"/><circle cx="12" cy="12" r="3.2"/>',
    eyeOff:    '<path d="M10.6 6.1A8.6 8.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.7M6.3 7.9A17 17 0 0 0 2.5 12S6 18 12 18a8.9 8.9 0 0 0 3.4-.65"/><path d="M9.9 9.9a3.2 3.2 0 0 0 4.3 4.3"/><path d="M3.5 3.5l17 17"/>',
    swap:      '<path d="M4 8.5h13M13.5 5 17 8.5 13.5 12"/><path d="M20 15.5H7M10.5 12 7 15.5 10.5 19"/>'
  };

  window.icon = function (name, size, extra) {
    var d = P[name];
    if (!d) { d = P.info; }
    var s = size || 19;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
      (extra || '') + '>' + d + '</svg>';
  };

  window.ICON_NAMES = Object.keys(P);
})();
