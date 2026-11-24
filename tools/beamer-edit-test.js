// Правка напису: зміст (tx) ↔ текст у полі й назад без втрат.
// node tools/beamer-edit-test.js
'use strict';
var fs = require('fs'), vm = require('vm'), path = require('path');

var win = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/beamer.js'), 'utf8'),
  { window: win, document: {}, console: console });
var B = win.Beamer, fails = 0, n = 0;

function eq(name, got, want) {
  n++;
  var g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { fails++; console.log('ПРОВАЛ', name, '\n  є:    ', g, '\n  треба:', w); }
}

var tx = {
  title: 'Виділення квадрата',
  blocks: [
    { kind: 'math', tex: 'y = ax^2 + bx + c' },
    { kind: 'text', tex: 'Звідси $D = b^2 - 4ac$' },
    { kind: 'item', tex: 'перший пункт' },
    { kind: 'figure', tex: 'парабола' }
  ],
  lang: 'uk'
};

var text = B.toLines(tx);
eq('у текст', text,
  '# Виділення квадрата\n$$ y = ax^2 + bx + c $$\nЗвідси $D = b^2 - 4ac$\n- перший пункт\n(рисунок: парабола)');
eq('назад без втрат', B.fromLines(text, tx), tx);

// правка однієї формули міняє лише її
var edited = B.fromLines(text.split('+ c $$').join('+ C $$'), tx);
eq('правка формули', edited.blocks[0], { kind: 'math', tex: 'y = ax^2 + bx + C' });
eq('решта ціла', edited.blocks.slice(1), tx.blocks.slice(1));

// без заголовка; порожні рядки пропускаються; мова лишається
eq('без заголовка', B.fromLines('$$a$$\n\n$$ b $$', { lang: 'en' }),
  { title: '', blocks: [{ kind: 'math', tex: 'a' }, { kind: 'math', tex: 'b' }], lang: 'en' });

console.log(fails ? fails + ' з ' + n + ' провалено' : 'Гаразд: ' + n + ' перевірок');
process.exit(fails ? 1 : 0);
