/* Deutsch — курс німецької з нуля (A0 → B2). Перша версія: блок A0. */

const LEVELS = [
  { id: 'A0', name: 'Перші кроки', hint: 'Слова-цеглинки: привітання, числа, займенники' },
];

const LESSONS = [
  {
    id: 1, level: 'A0', icon: '❓', title: 'Питальні слова', subtitle: 'З чого починаються запитання',
    grammar: 'У питанні дієслово стоїть на <b>другому</b> місці: <b>Wo</b> bist du? — Де ти?',
    cards: [
      { en: 'wann',    ua: 'коли',   tr: 'в[а]н' },
      { en: 'wo',      ua: 'де',     tr: 'в[о]' },
      { en: 'wer',     ua: 'хто',    tr: 'в[е]а' },
      { en: 'was',     ua: 'що',     tr: 'в[а]с' },
      { en: 'warum',   ua: 'чому',   tr: 'вар[у]м' },
      { en: 'wie',     ua: 'як',     tr: 'в[і]' },
      { en: 'welcher', ua: 'котрий', tr: 'в[е]льхер' },
    ],
    sentences: [
      { en: 'Wann treffen wir uns?', ua: 'Коли ми зустрінемось?', tr: 'в[а]н тр[е]фен вір унс' },
      { en: 'Wo bist du?',           ua: 'Де ти?',                tr: 'в[о] біст ду' },
      { en: 'Wer ist das?',          ua: 'Хто це?',               tr: 'в[е]а іст дас' },
      { en: 'Was ist das?',          ua: 'Що це?',                tr: 'в[а]с іст дас' },
    ],
  },
  {
    id: 2, level: 'A0', icon: '🙋', title: 'Займенники', subtitle: 'Хто виконує дію',
    grammar: 'Займенник-підмет обов’язковий. sie = «вона» і «вони» (за дієсловом видно, хто).',
    cards: [
      { en: 'ich', ua: 'я',        tr: '[і]х' },
      { en: 'du',  ua: 'ти, ви',   tr: 'д[у]' },
      { en: 'er',  ua: 'він',      tr: '[е]а' },
      { en: 'sie', ua: 'вона',     tr: 'з[і]' },
      { en: 'es',  ua: 'воно, це', tr: '[е]с' },
      { en: 'wir', ua: 'ми',       tr: 'в[і]а' },
      { en: 'sie ', ua: 'вони',    tr: 'з[і]' },
    ],
    sentences: [
      { en: 'Ich liebe dich.',         ua: 'Я тебе люблю.',    tr: 'іх л[і]бе діх' },
      { en: 'Sie ist meine Schwester.', ua: 'Вона моя сестра.', tr: 'зі іст м[а]йне шв[е]стер' },
      { en: 'Wir sind hier.',          ua: 'Ми тут.',          tr: 'в[і]а зінт хір' },
    ],
  },
  {
    id: 3, level: 'A0', icon: '🔢', title: 'Числа 1–12', subtitle: 'Рахуємо німецькою',
    grammar: 'Число ставимо перед іменником: <b>zwei</b> Brüder (два брати).',
    cards: [
      { en: 'eins',   ua: 'один',       tr: '[а]йнс' },
      { en: 'zwei',   ua: 'два',        tr: 'цв[а]й' },
      { en: 'drei',   ua: 'три',        tr: 'др[а]й' },
      { en: 'vier',   ua: 'чотири',     tr: 'ф[і]а' },
      { en: 'fünf',   ua: "п'ять",      tr: 'ф[ю]нф' },
      { en: 'sechs',  ua: 'шість',      tr: 'з[е]кс' },
      { en: 'sieben', ua: 'сім',        tr: 'з[і]бен' },
      { en: 'acht',   ua: 'вісім',      tr: '[а]хт' },
      { en: 'neun',   ua: "дев'ять",    tr: 'н[о]йн' },
      { en: 'zehn',   ua: 'десять',     tr: 'ц[е]н' },
      { en: 'elf',    ua: 'одинадцять', tr: '[е]льф' },
      { en: 'zwölf',  ua: 'дванадцять', tr: 'цв[о]льф' },
    ],
    sentences: [
      { en: 'Ich habe zwei Brüder.', ua: 'У мене два брати.', tr: 'іх х[а]бе цвай бр[ю]дер' },
      { en: 'Sie ist fünf Jahre alt.', ua: "Їй п'ять років.",  tr: 'зі іст фюнф [я]ре альт' },
      { en: 'Wir sind drei.',        ua: 'Нас троє.',         tr: 'віа зінт др[а]й' },
    ],
  },
  {
    id: 4, level: 'A0', icon: '🔟', title: 'Числа 13–100', subtitle: 'Десятки і велике',
    grammar: 'Десятки: -zig (zwanzig, dreißig). Сотня — <b>hundert</b>.',
    cards: [
      { en: 'dreizehn', ua: 'тринадцять',  tr: 'др[а]йцен' },
      { en: 'fünfzehn', ua: "п'ятнадцять", tr: 'ф[ю]нфцен' },
      { en: 'zwanzig',  ua: 'двадцять',    tr: 'цв[а]нціх' },
      { en: 'dreißig',  ua: 'тридцять',    tr: 'др[а]йсіх' },
      { en: 'vierzig',  ua: 'сорок',       tr: 'ф[і]рціх' },
      { en: 'fünfzig',  ua: "п'ятдесят",   tr: 'ф[ю]нфціх' },
      { en: 'achtzig',  ua: 'вісімдесят',  tr: '[а]хтціх' },
      { en: 'hundert',  ua: 'сто',         tr: 'х[у]ндерт' },
    ],
    sentences: [
      { en: 'Ich bin zwanzig.',    ua: 'Мені двадцять.',       tr: 'іх бін цв[а]нціх' },
      { en: 'Das kostet fünfzig.', ua: "Це коштує п'ятдесят.", tr: 'дас к[о]стет ф[ю]нфціх' },
      { en: 'Es sind dreizehn.',   ua: 'Їх тринадцять.',       tr: 'ес зінт др[а]йцен' },
    ],
  },
  {
    id: 5, level: 'A0', icon: '👋', title: 'Перші фрази', subtitle: 'Привітатися і бути ввічливим',
    grammar: '<b>bitte</b> = «будь ласка», <b>danke</b> = «дякую». Ввічливе прохання — просто bitte.',
    cards: [
      { en: 'hallo',          ua: 'привіт',          tr: 'х[а]ло' },
      { en: 'hi',             ua: 'привіт (неформ.)', tr: 'х[а]й' },
      { en: 'tschüss',        ua: 'до побачення',    tr: 'ч[ю]с' },
      { en: 'bitte',          ua: 'будь ласка',      tr: 'б[і]те' },
      { en: 'danke',          ua: 'дякую',           tr: 'д[а]нке' },
      { en: 'ja',             ua: 'так',             tr: 'й[а]' },
      { en: 'nein',           ua: 'ні',              tr: 'н[а]йн' },
      { en: 'Entschuldigung', ua: 'вибач',           tr: 'енчульд[і]гунг' },
    ],
    sentences: [
      { en: "Hallo, wie geht's?", ua: 'Привіт, як справи?', tr: 'х[а]ло, ві гетс' },
      { en: 'Ich heiße Anna.',    ua: 'Мене звати Анна.',   tr: 'іх х[а]йсе [а]на' },
      { en: 'Ja, bitte.',         ua: 'Так, будь ласка.',   tr: 'йа, б[і]те' },
    ],
  },
  {
    id: 6, level: 'A0', icon: '👉', title: 'Це і той', subtitle: 'Показуємо на речі',
    grammar: '<b>dies</b> — це, <b>das</b> — те. «Добре/погано» — gut / schlecht.',
    cards: [
      { en: 'dies',    ua: 'це, цей', tr: 'д[і]с' },
      { en: 'das',     ua: 'те, той', tr: 'д[а]с' },
      { en: 'hier',    ua: 'тут',     tr: 'х[і]а' },
      { en: 'dort',    ua: 'там',     tr: 'д[о]рт' },
      { en: 'gut',     ua: 'добре',   tr: 'г[у]т' },
      { en: 'schlecht', ua: 'погано', tr: 'шл[е]хт' },
      { en: 'groß',    ua: 'великий', tr: 'гр[о]с' },
      { en: 'klein',   ua: 'малий',   tr: 'кл[а]йн' },
    ],
    sentences: [
      { en: 'Das ist gut.',   ua: 'Це добре.',  tr: 'дас іст г[у]т' },
      { en: 'Das ist groß.',  ua: 'Те велике.', tr: 'дас іст гр[о]с' },
      { en: 'Ich bin hier.',  ua: 'Я тут.',     tr: 'іх бін х[і]а' },
      { en: 'Es ist klein.',  ua: 'Воно мале.', tr: 'ес іст кл[а]йн' },
    ],
  },
];
