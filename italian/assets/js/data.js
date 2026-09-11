/* Italiano — курс італійської з нуля (A0 → B2). Перша версія: блок A0. */

const LEVELS = [
  { id: 'A0', name: 'Перші кроки', hint: 'Слова-цеглинки: привітання, числа, займенники' },
];

const LESSONS = [
  {
    id: 1, level: 'A0', icon: '❓', title: 'Питальні слова', subtitle: 'З чого починаються запитання',
    grammar: 'Питання часто лише інтонацією: <b>Dove</b> sei? — Де ти?',
    cards: [
      { en: 'quando',  ua: 'коли',   tr: 'ку[а]ндо' },
      { en: 'dove',    ua: 'де',     tr: 'д[о]ве' },
      { en: 'chi',     ua: 'хто',    tr: 'к[і]' },
      { en: 'cosa',    ua: 'що',     tr: 'к[о]за' },
      { en: 'perché',  ua: 'чому',   tr: 'перк[е]' },
      { en: 'come',    ua: 'як',     tr: 'к[о]ме' },
      { en: 'quale',   ua: 'котрий', tr: 'ку[а]ле' },
    ],
    sentences: [
      { en: 'Quando ci vediamo?', ua: 'Коли ми зустрінемось?', tr: 'ку[а]ндо чі ведь[а]мо' },
      { en: 'Dove sei?',          ua: 'Де ти?',                tr: 'д[о]ве с[е]й' },
      { en: 'Chi è?',             ua: 'Хто це?',               tr: 'к[і] е' },
      { en: "Cos'è?",             ua: 'Що це?',                tr: 'коз[е]' },
    ],
  },
  {
    id: 2, level: 'A0', icon: '🙋', title: 'Займенники', subtitle: 'Хто виконує дію',
    grammar: 'Займенник часто <b>пропускають</b> (дієслово показує особу): amo = «я люблю».',
    cards: [
      { en: 'io',   ua: 'я',        tr: '[і]о' },
      { en: 'tu',   ua: 'ти',       tr: 'т[у]' },
      { en: 'lui',  ua: 'він',      tr: 'л[у]і' },
      { en: 'lei',  ua: 'вона',     tr: 'л[е]й' },
      { en: 'esso', ua: 'воно, це', tr: '[е]со' },
      { en: 'noi',  ua: 'ми',       tr: 'н[о]й' },
      { en: 'loro', ua: 'вони',     tr: 'л[о]ро' },
    ],
    sentences: [
      { en: 'Ti amo.',              ua: 'Я тебе люблю.',    tr: 'ті [а]мо' },
      { en: 'Lei è mia sorella.',   ua: 'Вона моя сестра.', tr: 'л[е]й е міа сор[е]ла' },
      { en: 'Noi siamo qui.',       ua: 'Ми тут.',          tr: 'н[о]й сь[а]мо ку[і]' },
    ],
  },
  {
    id: 3, level: 'A0', icon: '🔢', title: 'Числа 1–12', subtitle: 'Рахуємо італійською',
    grammar: 'Число ставимо перед іменником: <b>due</b> fratelli (два брати).',
    cards: [
      { en: 'uno',     ua: 'один',       tr: '[у]но' },
      { en: 'due',     ua: 'два',        tr: 'д[у]е' },
      { en: 'tre',     ua: 'три',        tr: 'тр[е]' },
      { en: 'quattro', ua: 'чотири',     tr: 'ку[а]тро' },
      { en: 'cinque',  ua: "п'ять",      tr: 'ч[і]нкуе' },
      { en: 'sei',     ua: 'шість',      tr: 'с[е]й' },
      { en: 'sette',   ua: 'сім',        tr: 'с[е]те' },
      { en: 'otto',    ua: 'вісім',      tr: '[о]то' },
      { en: 'nove',    ua: "дев'ять",    tr: 'н[о]ве' },
      { en: 'dieci',   ua: 'десять',     tr: 'дь[е]чі' },
      { en: 'undici',  ua: 'одинадцять', tr: '[у]ндічі' },
      { en: 'dodici',  ua: 'дванадцять', tr: 'д[о]дічі' },
    ],
    sentences: [
      { en: 'Ho due fratelli.',   ua: 'У мене два брати.', tr: 'о д[у]е фрат[е]лі' },
      { en: 'Lei ha cinque anni.', ua: "Їй п'ять років.",  tr: 'л[е]й а ч[і]нкуе [а]ні' },
      { en: 'Siamo in tre.',      ua: 'Нас троє.',         tr: 'сь[а]мо ін тр[е]' },
    ],
  },
  {
    id: 4, level: 'A0', icon: '🔟', title: 'Числа 13–100', subtitle: 'Десятки і велике',
    grammar: 'Десятки: venti (20), trenta (30), quaranta (40). Сотня — <b>cento</b>.',
    cards: [
      { en: 'tredici',   ua: 'тринадцять',  tr: 'тр[е]дічі' },
      { en: 'quindici',  ua: "п'ятнадцять", tr: 'ку[і]ндічі' },
      { en: 'venti',     ua: 'двадцять',    tr: 'в[е]нті' },
      { en: 'trenta',    ua: 'тридцять',    tr: 'тр[е]нта' },
      { en: 'quaranta',  ua: 'сорок',       tr: 'куар[а]нта' },
      { en: 'cinquanta', ua: "п'ятдесят",   tr: 'чінку[а]нта' },
      { en: 'ottanta',   ua: 'вісімдесят',  tr: 'от[а]нта' },
      { en: 'cento',     ua: 'сто',         tr: 'ч[е]нто' },
    ],
    sentences: [
      { en: 'Ho venti anni.',       ua: 'Мені двадцять.',       tr: 'о в[е]нті [а]ні' },
      { en: 'Costa cinquanta.',     ua: "Це коштує п'ятдесят.", tr: 'к[о]ста чінку[а]нта' },
      { en: 'Sono tredici.',        ua: 'Їх тринадцять.',       tr: 'с[о]но тр[е]дічі' },
    ],
  },
  {
    id: 5, level: 'A0', icon: '👋', title: 'Перші фрази', subtitle: 'Привітатися і бути ввічливим',
    grammar: 'Ввічливе прохання — <b>per favore</b> («будь ласка»). Подяка — grazie.',
    cards: [
      { en: 'ciao',        ua: 'привіт',          tr: 'ч[а]о' },
      { en: 'salve',       ua: 'привіт (неформ.)', tr: 'с[а]льве' },
      { en: 'arrivederci', ua: 'до побачення',    tr: 'аррівед[е]рчі' },
      { en: 'per favore',  ua: 'будь ласка',      tr: 'пер фав[о]ре' },
      { en: 'grazie',      ua: 'дякую',           tr: 'гр[а]цьє' },
      { en: 'sì',          ua: 'так',             tr: 'с[і]' },
      { en: 'no',          ua: 'ні',              tr: 'н[о]' },
      { en: 'scusa',       ua: 'вибач',           tr: 'ск[у]за' },
    ],
    sentences: [
      { en: 'Ciao, come stai?',   ua: 'Привіт, як справи?', tr: 'ч[а]о, к[о]ме ст[а]й' },
      { en: 'Mi chiamo Anna.',    ua: 'Мене звати Анна.',   tr: 'мі кь[а]мо [а]на' },
      { en: 'Sì, per favore.',    ua: 'Так, будь ласка.',   tr: 'с[і], пер фав[о]ре' },
    ],
  },
  {
    id: 6, level: 'A0', icon: '👉', title: 'Це і той', subtitle: 'Показуємо на речі',
    grammar: '<b>questo</b> — це (близько), <b>quello</b> — те (далеко). Добре/погано — buono / cattivo.',
    cards: [
      { en: 'questo',  ua: 'це, цей', tr: 'ку[е]сто' },
      { en: 'quello',  ua: 'те, той', tr: 'ку[е]ло' },
      { en: 'qui',     ua: 'тут',     tr: 'ку[і]' },
      { en: 'lì',      ua: 'там',     tr: 'л[і]' },
      { en: 'buono',   ua: 'добре',   tr: 'бу[о]но' },
      { en: 'cattivo', ua: 'погано',  tr: 'кат[і]во' },
      { en: 'grande',  ua: 'великий', tr: 'гр[а]нде' },
      { en: 'piccolo', ua: 'малий',   tr: 'п[і]коло' },
    ],
    sentences: [
      { en: 'Questo è buono.',  ua: 'Це добре.',  tr: 'ку[е]сто е бу[о]но' },
      { en: 'Quello è grande.', ua: 'Те велике.', tr: 'ку[е]ло е гр[а]нде' },
      { en: 'Sono qui.',        ua: 'Я тут.',     tr: 'с[о]но ку[і]' },
      { en: 'È piccolo.',       ua: 'Воно мале.', tr: 'е п[і]коло' },
    ],
  },
];
