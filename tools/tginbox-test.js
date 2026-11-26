// Telegram → дошка: що береться з повідомлень і як лягає.  node tools/tginbox-test.js
'use strict';
var fs = require('fs'), vm = require('vm'), path = require('path');
var SRC = fs.readFileSync(path.join(__dirname, '../assets/js/tginbox.js'), 'utf8');

var fails = 0, passes = 0;
function ok(c, m) { if (c) { passes++; console.log('  ✓ ' + m); } else { fails++; console.log('  ✗ ' + m); } }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

var win = {};
vm.runInNewContext(SRC, { window: win, Math: Math, Date: Date, JSON: JSON });
var T = win.TgInbox;

console.log('• Що береться з повідомлення');
var photo = T.parseUpdate({ update_id: 501, message: {
  message_id: 7, date: 1764150000, chat: { id: 11, type: 'private', first_name: 'Микита' },
  photo: [{ file_id: 'small', width: 90, height: 60 }, { file_id: 'big', width: 1280, height: 853 },
          { file_id: 'mid', width: 320, height: 213 }],
  caption: '#Софія Розв’яжіть рівняння'
} });
ok(photo && photo.id === 'tg501', 'запис названо за номером оновлення — двічі не ляже');
ok(photo.photo === 'big' && photo.pw === 1280 && photo.ph === 853, 'фото — найбільше з розмірів');
ok(photo.tag === 'Софія' && photo.text === 'Розв’яжіть рівняння', 'тег учня знято з підпису');
ok(photo.at === new Date(1764150000 * 1000).toISOString(), 'час повідомлення');

var post = T.parseUpdate({ update_id: 502, channel_post: {
  message_id: 3, date: 1764150100, chat: { id: -100, type: 'channel', title: 'Завдання' },
  text: 'Знайдіть 6 : 0,36\nі поясніть.'
} });
ok(post && !post.photo && post.text === 'Знайдіть 6 : 0,36\nі поясніть.', 'пост каналу — текст із переносами');
ok(post.from === 'Завдання', 'звідки — назва каналу');

var doc = T.parseUpdate({ update_id: 503, message: {
  message_id: 8, date: 1, chat: { id: 11 },
  document: { file_id: 'scan', mime_type: 'image/jpeg', file_name: 'a.jpg' }
} });
ok(doc && doc.photo === 'scan', 'картинка, надіслана файлом, — теж фото');

ok(T.parseUpdate({ update_id: 504, message: { message_id: 9, date: 1, chat: { id: 1 },
  document: { file_id: 'x', mime_type: 'application/zip' } } }) === null, 'архів — не завдання');
ok(T.parseUpdate({ update_id: 505, message: { message_id: 9, date: 1, chat: { id: 1 }, sticker: {} } }) === null,
  'стікер — не завдання');
ok(T.parseUpdate({ update_id: 506, edited_message: { message_id: 1, date: 1, chat: { id: 1 }, text: 'x' } }) === null,
  'виправлене повідомлення не дублює завдання');
ok(T.parseUpdate({ update_id: 507, message: { message_id: 2, date: 1, chat: { id: 1 }, text: '/start' } }) === null,
  'команда боту — не завдання');

console.log('• Від кого приймати');
ok(photo.kind === 'private' && post.kind === 'channel', 'особисте й канал розрізняються');
var mine = T.parseUpdate({ update_id: 510, message: { message_id: 1, date: 1,
  chat: { id: 77, type: 'private' }, from: { id: 77, first_name: 'Микита' }, text: 'задача' } });
var stranger = T.parseUpdate({ update_id: 511, message: { message_id: 1, date: 1,
  chat: { id: 99, type: 'private' }, from: { id: 99 }, text: 'реклама' } });
var group = T.parseUpdate({ update_id: 512, message: { message_id: 1, date: 1,
  chat: { id: -5, type: 'group' }, from: { id: 77 }, text: 'x' } });
ok(T.allowed(mine, 0), 'власника ще немає — перший, хто написав, ним стає');
ok(T.allowed(mine, 77) && !T.allowed(stranger, 77), 'далі — лише власник, чужі повідомлення не ляжуть');
ok(T.allowed(post, 77), 'канал приймається: бота туди додали адміністратором ви');
ok(!T.allowed(group, 77), 'групи — ні');

console.log('• Тег учня');
ok(same(T.tagOf('#Андрій_К задача 5'), { tag: 'Андрій_К', text: 'задача 5' }), 'підкреслення в тегу');
ok(same(T.tagOf('  #ольга\nТекст'), { tag: 'ольга', text: 'Текст' }), 'тег окремим рядком');
ok(same(T.tagOf('Задача #3'), { tag: '', text: 'Задача #3' }), 'решітка посеред тексту — не тег');
ok(same(T.tagOf(''), { tag: '', text: '' }), 'порожньо');

ok(T.matches('Софія', ['Софія Коваленко']), 'тег — ім’я учня');
ok(T.matches('софія', ['Софія Коваленко']), 'без різниці великих і малих');
ok(T.matches('СофіяКоваленко', ['Софія Коваленко']), 'ім’я й прізвище разом');
ok(T.matches('Коваленко', ['Софія Коваленко']), 'лише прізвище');
ok(T.matches('Соф', ['Софія Коваленко']), 'початок імені від трьох літер');
ok(!T.matches('Со', ['Софія Коваленко']), 'двох літер замало');
ok(!T.matches('Андрій', ['Софія Коваленко', 'Урок']), 'чужий учень');
ok(!T.matches('', ['Софія']), 'без тегу — нічий');

console.log('• Що показати першим і що позначити');
var items = [
  { id: 'a', at: '2026-11-26T10:00:00Z', tag: 'Андрій' },
  { id: 'b', at: '2026-11-26T10:01:00Z', tag: '' },
  { id: 'c', at: '2026-11-26T10:02:00Z', tag: 'Софія' },
  { id: 'd', at: '2026-11-26T10:03:00Z', tag: 'Софія', used: '2026-11-26T11:00:00Z' },
  { id: 'e', at: '2026-11-26T10:00:30Z', tag: 'Софія' }
];
var ord = T.order(items, ['Софія Коваленко']);
ok(same(ord.map(function (x) { return x.id; }), ['e', 'c', 'b', 'a', 'd']),
  'спершу свої (за порядком надсилання), далі без тегу, далі чужі, вставлені — в кінці');
ok(same(T.preselect(ord, ['Софія Коваленко']), ['e', 'c']), 'позначено свої невставлені');
ok(same(T.preselect(ord, ['Олег']), ['b']), 'своїх немає — позначено ті, що без тегу');
ok(same(T.preselect([{ id: 'z', tag: '', used: 'x' }], ['Олег']), []), 'вставлене вдруге саме не позначається');
ok(T.fresh(items) === 4, 'на кнопці — скільки ще не вставлено');

console.log('• Сітка: рівно, з відступами');
var g = T.grid([{ w: 1000, h: 500 }, { w: 500, h: 500 }, { w: 1000, h: 1000 }], { x: 0, y: 0 }, 600, 40);
ok(g.length === 3, 'по рамці на завдання');
ok(g.every(function (b) { return b.w === 600; }), 'однакова ширина');
ok(g[0].y === g[1].y && g[1].y === g[2].y, 'троє — одним рядком, верхи на одній лінії');
ok(g[1].x - (g[0].x + g[0].w) === 40 && g[2].x - (g[1].x + g[1].w) === 40, 'однакові проміжки');
ok(g[0].h === 300 && g[2].h === 600, 'пропорції збережено');
var cx = (g[0].x + g[2].x + g[2].w) / 2;
ok(Math.abs(cx) < 1e-9, 'сітка по центру точки вставки');

var g4 = T.grid([{ w: 1, h: 1 }, { w: 2, h: 1 }, { w: 1, h: 2 }, { w: 1, h: 1 }], { x: 0, y: 0 }, 100, 10);
ok(g4[0].y === g4[1].y && g4[2].y === g4[3].y && g4[2].x === g4[0].x, 'четверо — два на два');
ok(g4[2].y === g4[0].y + 100 + 10, 'новий рядок — під найвищим у попередньому, з тим самим проміжком');
var g7 = T.grid(new Array(7).fill({ w: 1, h: 1 }), { x: 0, y: 0 }, 100, 10);
ok(g7[3].y > g7[0].y && g7[2].y === g7[0].y && g7[6].x === g7[0].x, 'семеро — по три в рядку');
var g20 = T.grid(new Array(20).fill({ w: 1, h: 1 }), { x: 0, y: 0 }, 100, 10);
ok(g20[4].y > g20[3].y && g20[3].y === g20[0].y, 'багато — не ширше чотирьох');

console.log('• Текст картки — рядками');
function m(s) { return s.length * 10; }
ok(same(T.wrap('один два три', m, 85), ['один два', 'три']), 'переносить словами');
ok(same(T.wrap('а\n\nб', m, 100), ['а', '', 'б']), 'порожній рядок лишається');
ok(same(T.wrap('ааааааааааааа', m, 50), ['ааааа', 'ааааа', 'ааа']), 'задовге слово ріжеться');
ok(same(T.wrap('  x  ', m, 100), ['x']), 'пробіли по краях — геть');

console.log('\n' + (fails ? '✗ ' + fails + ' з ' + (fails + passes) : '✓ усі ' + passes));
process.exit(fails ? 1 : 0);
