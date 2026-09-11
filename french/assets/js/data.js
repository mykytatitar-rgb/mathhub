/* Français — курс французької з нуля (A0 → B2). Перша версія: блок A0. */

const LEVELS = [
  { id: 'A0', name: 'Перші кроки', hint: 'Слова-цеглинки: привітання, числа, займенники' },
];

const LESSONS = [
  {
    id: 1, level: 'A0', icon: '❓', title: 'Питальні слова', subtitle: 'З чого починаються запитання',
    grammar: 'Просте питання — інтонацією або <b>est-ce que</b>: <b>Où</b> es-tu? — Де ти?',
    cards: [
      { en: 'quand',    ua: 'коли',   tr: 'к[а]н' },
      { en: 'où',       ua: 'де',     tr: '[у]' },
      { en: 'qui',      ua: 'хто',    tr: 'к[і]' },
      { en: 'que',      ua: 'що',     tr: 'к[ё]' },
      { en: 'pourquoi', ua: 'чому',   tr: 'пуркв[а]' },
      { en: 'comment',  ua: 'як',     tr: 'ком[а]н' },
      { en: 'quel',     ua: 'котрий', tr: 'к[е]ль' },
    ],
    sentences: [
      { en: 'Quand se voit-on?',    ua: 'Коли ми зустрінемось?', tr: 'к[а]н сё вуат[о]н' },
      { en: 'Où es-tu?',            ua: 'Де ти?',                tr: '[у] е тю' },
      { en: 'Qui est-ce?',          ua: 'Хто це?',               tr: 'к[і] ес' },
      { en: "Qu'est-ce que c'est?", ua: 'Що це?',                tr: 'кес кё с[е]' },
    ],
  },
  {
    id: 2, level: 'A0', icon: '🙋', title: 'Займенники', subtitle: 'Хто виконує дію',
    grammar: 'Займенник-підмет обов’язковий: <b>je</b> suis, <b>tu</b> es, <b>elle</b> est.',
    cards: [
      { en: 'je',   ua: 'я',        tr: 'ж[ё]' },
      { en: 'tu',   ua: 'ти',       tr: 'т[ю]' },
      { en: 'il',   ua: 'він',      tr: '[і]ль' },
      { en: 'elle', ua: 'вона',     tr: '[е]ль' },
      { en: 'ce',   ua: 'воно, це', tr: 'с[ё]' },
      { en: 'nous', ua: 'ми',       tr: 'н[у]' },
      { en: 'ils',  ua: 'вони',     tr: '[і]ль' },
    ],
    sentences: [
      { en: "Je t'aime.",           ua: 'Я тебе люблю.',    tr: 'жё т[е]м' },
      { en: 'Elle est ma sœur.',    ua: 'Вона моя сестра.', tr: 'ель е ма с[ё]р' },
      { en: 'Nous sommes ici.',     ua: 'Ми тут.',          tr: 'ну сом іс[і]' },
    ],
  },
  {
    id: 3, level: 'A0', icon: '🔢', title: 'Числа 1–12', subtitle: 'Рахуємо французькою',
    grammar: 'Число ставимо перед іменником: <b>deux</b> frères (два брати).',
    cards: [
      { en: 'un',     ua: 'один',       tr: '[е]н' },
      { en: 'deux',   ua: 'два',        tr: 'д[ё]' },
      { en: 'trois',  ua: 'три',        tr: 'тр[у]а' },
      { en: 'quatre', ua: 'чотири',     tr: 'к[а]тр' },
      { en: 'cinq',   ua: "п'ять",      tr: 'с[е]нк' },
      { en: 'six',    ua: 'шість',      tr: 'с[і]с' },
      { en: 'sept',   ua: 'сім',        tr: 'с[е]т' },
      { en: 'huit',   ua: 'вісім',      tr: 'ю[і]т' },
      { en: 'neuf',   ua: "дев'ять",    tr: 'н[ё]ф' },
      { en: 'dix',    ua: 'десять',     tr: 'д[і]с' },
      { en: 'onze',   ua: 'одинадцять', tr: '[о]нз' },
      { en: 'douze',  ua: 'дванадцять', tr: 'д[у]з' },
    ],
    sentences: [
      { en: "J'ai deux frères.",  ua: 'У мене два брати.', tr: 'же д[ё] фр[е]р' },
      { en: 'Elle a cinq ans.',   ua: "Їй п'ять років.",   tr: 'ель а с[е]нк ан' },
      { en: 'Nous sommes trois.', ua: 'Нас троє.',         tr: 'ну сом труа' },
    ],
  },
  {
    id: 4, level: 'A0', icon: '🔟', title: 'Числа 13–100', subtitle: 'Десятки і велике',
    grammar: 'Десятки: vingt (20), trente (30), quarante (40). Сотня — <b>cent</b>.',
    cards: [
      { en: 'treize',        ua: 'тринадцять',  tr: 'тр[е]з' },
      { en: 'quinze',        ua: "п'ятнадцять", tr: 'к[е]нз' },
      { en: 'vingt',         ua: 'двадцять',    tr: 'в[е]н' },
      { en: 'trente',        ua: 'тридцять',    tr: 'тр[а]нт' },
      { en: 'quarante',      ua: 'сорок',       tr: 'кар[а]нт' },
      { en: 'cinquante',     ua: "п'ятдесят",   tr: 'с[е]нкант' },
      { en: 'quatre-vingts', ua: 'вісімдесят',  tr: 'катрёв[е]н' },
      { en: 'cent',          ua: 'сто',         tr: 'с[а]н' },
    ],
    sentences: [
      { en: "J'ai vingt ans.",       ua: 'Мені двадцять.',       tr: 'же в[е]н ан' },
      { en: 'Ça coûte cinquante.',   ua: "Це коштує п'ятдесят.", tr: 'са кут с[е]нкант' },
      { en: 'Il y en a treize.',     ua: 'Їх тринадцять.',       tr: 'іль ян а тр[е]з' },
    ],
  },
  {
    id: 5, level: 'A0', icon: '👋', title: 'Перші фрази', subtitle: 'Привітатися і бути ввічливим',
    grammar: 'Ввічливе прохання — <b>s’il vous plaît</b> («будь ласка»). Подяка — merci.',
    cards: [
      { en: 'bonjour',        ua: 'привіт',          tr: 'бонж[у]р' },
      { en: 'salut',          ua: 'привіт (неформ.)', tr: 'сал[ю]' },
      { en: 'au revoir',      ua: 'до побачення',    tr: 'о рёву[а]р' },
      { en: "s'il vous plaît", ua: 'будь ласка',     tr: 'сіль ву пл[е]' },
      { en: 'merci',          ua: 'дякую',           tr: 'мерс[і]' },
      { en: 'oui',            ua: 'так',             tr: 'в[і]' },
      { en: 'non',            ua: 'ні',              tr: 'н[о]н' },
      { en: 'pardon',         ua: 'вибач',           tr: 'пард[о]н' },
    ],
    sentences: [
      { en: 'Bonjour, ça va?',       ua: 'Привіт, як справи?', tr: 'бонж[у]р, са ва' },
      { en: "Je m'appelle Anna.",    ua: 'Мене звати Анна.',   tr: 'жё мап[е]ль [а]на' },
      { en: "Oui, s'il vous plaît.", ua: 'Так, будь ласка.',   tr: 'в[і], сіль ву пл[е]' },
    ],
  },
  {
    id: 6, level: 'A0', icon: '👉', title: 'Це і той', subtitle: 'Показуємо на речі',
    grammar: '<b>ceci</b> — це, <b>cela</b> — те. «Добре/погано» — bon / mauvais.',
    cards: [
      { en: 'ceci',    ua: 'це, цей', tr: 'сёс[і]' },
      { en: 'cela',    ua: 'те, той', tr: 'сёл[а]' },
      { en: 'ici',     ua: 'тут',     tr: 'іс[і]' },
      { en: 'là',      ua: 'там',     tr: 'л[а]' },
      { en: 'bon',     ua: 'добре',   tr: 'б[о]н' },
      { en: 'mauvais', ua: 'погано',  tr: 'мов[е]' },
      { en: 'grand',   ua: 'великий', tr: 'гр[а]н' },
      { en: 'petit',   ua: 'малий',   tr: 'пёт[і]' },
    ],
    sentences: [
      { en: "C'est bon.",     ua: 'Це добре.',  tr: 'се б[о]н' },
      { en: "C'est grand.",   ua: 'Те велике.', tr: 'се гр[а]н' },
      { en: 'Je suis ici.',   ua: 'Я тут.',     tr: 'жё сюі іс[і]' },
      { en: "C'est petit.",   ua: 'Воно мале.', tr: 'се пёт[і]' },
    ],
  },
];
