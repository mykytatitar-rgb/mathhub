/* Esperanto — курс есперанто з нуля (A0 → B2). Перша версія: блок A0.
   Есперанто фонетична: читається як пишеться, наголос завжди на передостанньому складі. */

const LEVELS = [
  { id: 'A0', name: 'Перші кроки', hint: 'Слова-цеглинки: привітання, числа, займенники' },
];

const LESSONS = [
  {
    id: 1, level: 'A0', icon: '❓', title: 'Питальні слова', subtitle: 'З чого починаються запитання',
    grammar: 'Питальні слова починаються на <b>ki-</b>: kiam (коли), kie (де), kiu (хто).',
    cards: [
      { en: 'kiam', ua: 'коли',   tr: 'кі[а]м' },
      { en: 'kie',  ua: 'де',     tr: 'кі[е]' },
      { en: 'kiu',  ua: 'хто',    tr: 'кі[у]' },
      { en: 'kio',  ua: 'що',     tr: 'кі[о]' },
      { en: 'kial', ua: 'чому',   tr: 'кі[а]ль' },
      { en: 'kiel', ua: 'як',     tr: 'кі[е]ль' },
      { en: 'kioma', ua: 'котрий', tr: 'кі[о]ма' },
    ],
    sentences: [
      { en: 'Kiam ni renkontiĝos?', ua: 'Коли ми зустрінемось?', tr: 'кі[а]м ні ренконт[і]джос' },
      { en: 'Kie vi estas?',        ua: 'Де ти?',                tr: 'кі[е] ві естас' },
      { en: 'Kiu estas?',           ua: 'Хто це?',               tr: 'кі[у] естас' },
      { en: 'Kio estas?',           ua: 'Що це?',                tr: 'кі[о] естас' },
    ],
  },
  {
    id: 2, level: 'A0', icon: '🙋', title: 'Займенники', subtitle: 'Хто виконує дію',
    grammar: 'Дієслово в теперішньому часі має закінчення <b>-as</b> для всіх осіб: mi amas, vi amas.',
    cards: [
      { en: 'mi',  ua: 'я',        tr: 'м[і]' },
      { en: 'vi',  ua: 'ти, ви',   tr: 'в[і]' },
      { en: 'li',  ua: 'він',      tr: 'л[і]' },
      { en: 'ŝi',  ua: 'вона',     tr: 'ш[і]' },
      { en: 'ĝi',  ua: 'воно, це', tr: 'дж[і]' },
      { en: 'ni',  ua: 'ми',       tr: 'н[і]' },
      { en: 'ili', ua: 'вони',     tr: '[і]лі' },
    ],
    sentences: [
      { en: 'Mi amas vin.',          ua: 'Я тебе люблю.',    tr: 'м[і] амас він' },
      { en: 'Ŝi estas mia fratino.', ua: 'Вона моя сестра.', tr: 'ш[і] естас міа фрат[і]но' },
      { en: 'Ni estas ĉi tie.',      ua: 'Ми тут.',          tr: 'н[і] естас чі т[і]е' },
    ],
  },
  {
    id: 3, level: 'A0', icon: '🔢', title: 'Числа 1–12', subtitle: 'Рахуємо есперанто',
    grammar: 'Числа незмінні. 11 = dek unu (10 та 1), 12 = dek du (10 та 2).',
    cards: [
      { en: 'unu',     ua: 'один',       tr: '[у]ну' },
      { en: 'du',      ua: 'два',        tr: 'д[у]' },
      { en: 'tri',     ua: 'три',        tr: 'тр[і]' },
      { en: 'kvar',    ua: 'чотири',     tr: 'кв[а]р' },
      { en: 'kvin',    ua: "п'ять",      tr: 'кв[і]н' },
      { en: 'ses',     ua: 'шість',      tr: 'с[е]с' },
      { en: 'sep',     ua: 'сім',        tr: 'с[е]п' },
      { en: 'ok',      ua: 'вісім',      tr: '[о]к' },
      { en: 'naŭ',     ua: "дев'ять",    tr: 'н[а]у' },
      { en: 'dek',     ua: 'десять',     tr: 'д[е]к' },
      { en: 'dek unu', ua: 'одинадцять', tr: 'дек [у]ну' },
      { en: 'dek du',  ua: 'дванадцять', tr: 'дек д[у]' },
    ],
    sentences: [
      { en: 'Mi havas du fratojn.', ua: 'У мене два брати.', tr: 'м[і] хавас ду фр[а]тойн' },
      { en: 'Ŝi estas kvinjara.',   ua: "Їй п'ять років.",   tr: 'ш[і] естас квінь[я]ра' },
      { en: 'Ni estas tri.',        ua: 'Нас троє.',         tr: 'н[і] естас тр[і]' },
    ],
  },
  {
    id: 4, level: 'A0', icon: '🔟', title: 'Числа 13–100', subtitle: 'Десятки і велике',
    grammar: 'Десятки: dudek (20), tridek (30), kvardek (40). Сотня — <b>cent</b>.',
    cards: [
      { en: 'dek tri',  ua: 'тринадцять',  tr: 'дек тр[і]' },
      { en: 'dek kvin', ua: "п'ятнадцять", tr: 'дек кв[і]н' },
      { en: 'dudek',    ua: 'двадцять',    tr: 'д[у]дек' },
      { en: 'tridek',   ua: 'тридцять',    tr: 'тр[і]дек' },
      { en: 'kvardek',  ua: 'сорок',       tr: 'кв[а]рдек' },
      { en: 'kvindek',  ua: "п'ятдесят",   tr: 'кв[і]ндек' },
      { en: 'okdek',    ua: 'вісімдесят',  tr: '[о]кдек' },
      { en: 'cent',     ua: 'сто',         tr: 'ц[е]нт' },
    ],
    sentences: [
      { en: 'Mi estas dudekjara.',   ua: 'Мені двадцять.',       tr: 'м[і] естас дудекь[я]ра' },
      { en: 'Ĝi kostas kvindek.',    ua: "Це коштує п'ятдесят.", tr: 'дж[і] костас кв[і]ндек' },
      { en: 'Estas dek tri.',        ua: 'Їх тринадцять.',       tr: '[е]стас дек трі' },
    ],
  },
  {
    id: 5, level: 'A0', icon: '👋', title: 'Перші фрази', subtitle: 'Привітатися і бути ввічливим',
    grammar: 'Ввічливе прохання — <b>bonvolu</b> («будь ласка»). Подяка — dankon.',
    cards: [
      { en: 'saluton', ua: 'привіт',          tr: 'сал[у]тон' },
      { en: 'sal',     ua: 'привіт (неформ.)', tr: 'с[а]ль' },
      { en: 'ĝis',     ua: 'до побачення',    tr: 'дж[і]с' },
      { en: 'bonvolu', ua: 'будь ласка',      tr: 'бонв[о]лу' },
      { en: 'dankon',  ua: 'дякую',           tr: 'д[а]нкон' },
      { en: 'jes',     ua: 'так',             tr: 'й[е]с' },
      { en: 'ne',      ua: 'ні',              tr: 'н[е]' },
      { en: 'pardonu', ua: 'вибач',           tr: 'пард[о]ну' },
    ],
    sentences: [
      { en: 'Saluton, kiel vi fartas?', ua: 'Привіт, як справи?', tr: 'сал[у]тон, кіель ві ф[а]ртас' },
      { en: 'Mi nomiĝas Anna.',         ua: 'Мене звати Анна.',   tr: 'м[і] ном[і]джас анна' },
      { en: 'Jes, bonvolu.',            ua: 'Так, будь ласка.',   tr: 'й[е]с, бонв[о]лу' },
    ],
  },
  {
    id: 6, level: 'A0', icon: '👉', title: 'Це і той', subtitle: 'Показуємо на речі',
    grammar: '<b>ĉi tio</b> — це (близько), <b>tio</b> — те (далеко). Погано = mal- + bona: malbona.',
    cards: [
      { en: 'ĉi tio',    ua: 'це, цей', tr: 'чі т[і]о' },
      { en: 'tio',       ua: 'те, той', tr: 'т[і]о' },
      { en: 'ĉi tie',    ua: 'тут',     tr: 'чі т[і]е' },
      { en: 'tie',       ua: 'там',     tr: 'т[і]е' },
      { en: 'bona',      ua: 'добре',   tr: 'б[о]на' },
      { en: 'malbona',   ua: 'погано',  tr: 'мальб[о]на' },
      { en: 'granda',    ua: 'великий', tr: 'гр[а]нда' },
      { en: 'malgranda', ua: 'малий',   tr: 'мальгр[а]нда' },
    ],
    sentences: [
      { en: 'Ĝi estas bona.',       ua: 'Це добре.',  tr: 'дж[і] естас б[о]на' },
      { en: 'Tio estas granda.',    ua: 'Те велике.', tr: 'т[і]о естас гр[а]нда' },
      { en: 'Mi estas ĉi tie.',     ua: 'Я тут.',     tr: 'м[і] естас чі т[і]е' },
      { en: 'Ĝi estas malgranda.',  ua: 'Воно мале.', tr: 'дж[і] естас мальгр[а]нда' },
    ],
  },
];
