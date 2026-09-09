/* Anglo — курс англійської з нуля за рівнями CEFR (A0 → B2).
   Кожна картка: en (англійською), ua (переклад),
   tr (транскрипція українськими літерами; наголошений склад у [дужках]).
   Транскрипції приблизні — щоб було легко повторити вголос. */

const LEVELS = [
  { id: 'A0', name: 'Перші кроки',       hint: 'Слова-цеглинки: привітання, числа, займенники' },
  { id: 'A1', name: 'Початковий',        hint: 'Проста розмова про себе і побут' },
  { id: 'A2', name: 'Базовий',           hint: 'Кафе, час, погода, дім' },
  { id: 'B1', name: 'Середній',          hint: 'Подорожі, робота, минулий час' },
  { id: 'B2', name: 'Вище середнього',   hint: 'Думки, бізнес, ідіоми' },
];

const LESSONS = [
  /* ============ A0 ============ */
  {
    id: 1, level: 'A0', icon: '❓', title: 'Питальні слова',
    subtitle: 'When, Where, Who — з чого починаються запитання',
    cards: [
      { en: 'when',  ua: 'коли',   tr: 'у[е]н' },
      { en: 'where', ua: 'де',     tr: 'у[е]а' },
      { en: 'who',   ua: 'хто',    tr: 'г[у]' },
      { en: 'what',  ua: 'що',     tr: 'у[о]т' },
      { en: 'why',   ua: 'чому',   tr: 'у[а]й' },
      { en: 'how',   ua: 'як',     tr: 'г[а]у' },
      { en: 'which', ua: 'котрий', tr: 'у[і]ч' },
    ],
    examples: [
      { en: 'When will we meet?', ua: 'Коли ми зустрінемось?', tr: 'у[е]н уіл уі міт' },
      { en: 'Where are you?',     ua: 'Де ти?',                tr: 'у[е]а а ю' },
    ],
  },
  {
    id: 2, level: 'A0', icon: '🙋', title: 'Займенники',
    subtitle: 'Я, ти, він, вона — хто виконує дію',
    cards: [
      { en: 'I',    ua: 'я',        tr: '[а]й' },
      { en: 'you',  ua: 'ти, ви',   tr: '[ю]' },
      { en: 'he',   ua: 'він',      tr: 'г[і]' },
      { en: 'she',  ua: 'вона',     tr: 'ш[і]' },
      { en: 'it',   ua: 'воно, це', tr: '[іт]' },
      { en: 'we',   ua: 'ми',       tr: 'у[і]' },
      { en: 'they', ua: 'вони',     tr: 'з[ей]' },
    ],
    examples: [
      { en: 'I love you.',       ua: 'Я тебе люблю.',    tr: 'ай лав ю' },
      { en: 'She is my sister.', ua: 'Вона моя сестра.', tr: 'ші із май с[і]стер' },
    ],
  },
  {
    id: 3, level: 'A0', icon: '🔢', title: 'Числа 1–10',
    subtitle: 'Рахуємо англійською',
    cards: [
      { en: 'one',   ua: 'один',    tr: 'у[а]н' },
      { en: 'two',   ua: 'два',     tr: 'т[у]' },
      { en: 'three', ua: 'три',     tr: 'тр[і]' },
      { en: 'four',  ua: 'чотири',  tr: 'ф[о]' },
      { en: 'five',  ua: "п'ять",   tr: 'ф[а]йв' },
      { en: 'six',   ua: 'шість',   tr: 'с[і]кс' },
      { en: 'seven', ua: 'сім',     tr: 'с[е]вен' },
      { en: 'eight', ua: 'вісім',   tr: '[ей]т' },
      { en: 'nine',  ua: "дев'ять", tr: 'н[а]йн' },
      { en: 'ten',   ua: 'десять',  tr: 'т[е]н' },
    ],
    examples: [
      { en: 'I have two brothers.', ua: 'У мене два брати.', tr: 'ай гев ту бр[а]зерс' },
      { en: 'She is five.',         ua: "Їй п'ять років.",   tr: 'ші із файв' },
    ],
  },
  {
    id: 4, level: 'A0', icon: '👋', title: 'Перші фрази',
    subtitle: 'Привітатися і бути ввічливим',
    cards: [
      { en: 'hello',     ua: 'привіт',           tr: 'гел[о]у' },
      { en: 'hi',        ua: 'привіт (неформ.)',  tr: 'г[а]й' },
      { en: 'goodbye',   ua: 'до побачення',     tr: 'гудб[а]й' },
      { en: 'please',    ua: 'будь ласка',       tr: 'пл[і]з' },
      { en: 'thank you', ua: 'дякую',            tr: 'с[е]нк ю' },
      { en: 'yes',       ua: 'так',              tr: '[є]с' },
      { en: 'no',        ua: 'ні',               tr: 'н[о]у' },
      { en: 'sorry',     ua: 'вибач',            tr: 'с[о]рі' },
    ],
    examples: [
      { en: 'Hello, how are you?', ua: 'Привіт, як справи?', tr: 'гел[о]у гау а ю' },
      { en: 'My name is Anna.',    ua: 'Мене звати Анна.',   tr: 'май н[ей]м із [е]на' },
    ],
  },

  /* ============ A1 ============ */
  {
    id: 5, level: 'A1', icon: '🔗', title: 'Дієслово to be',
    subtitle: 'am / is / are — маленьке слово «є»',
    cards: [
      { en: 'to be', ua: 'бути',                  tr: 'ту б[і]' },
      { en: 'am',    ua: 'є (з I)',               tr: '[ем]' },
      { en: 'is',    ua: 'є (з he / she / it)',   tr: '[із]' },
      { en: 'are',   ua: 'є (з you / we / they)', tr: '[а]' },
    ],
    examples: [
      { en: 'I am a student.', ua: 'Я студент.',    tr: 'ай ем е ст[ю]дент' },
      { en: 'They are here.',  ua: 'Вони тут.',     tr: 'зей а г[і]а' },
    ],
  },
  {
    id: 6, level: 'A1', icon: '👨‍👩‍👧', title: 'Родина',
    subtitle: 'Найближчі люди',
    cards: [
      { en: 'mother',   ua: 'мама',   tr: 'м[а]зер' },
      { en: 'father',   ua: 'тато',   tr: 'ф[а]зер' },
      { en: 'sister',   ua: 'сестра', tr: 'с[і]стер' },
      { en: 'brother',  ua: 'брат',   tr: 'бр[а]зер' },
      { en: 'son',      ua: 'син',    tr: 'с[а]н' },
      { en: 'daughter', ua: 'дочка',  tr: 'д[о]тер' },
      { en: 'family',   ua: 'родина', tr: 'ф[е]мілі' },
      { en: 'parents',  ua: 'батьки', tr: 'п[е]рентс' },
    ],
    examples: [
      { en: 'This is my mother.', ua: 'Це моя мама.',   tr: 'зіс із май м[а]зер' },
      { en: 'I have a brother.',  ua: 'У мене є брат.', tr: 'ай гев е бр[а]зер' },
    ],
  },
  {
    id: 7, level: 'A1', icon: '🎨', title: 'Кольори',
    subtitle: 'Основні кольори',
    cards: [
      { en: 'red',    ua: 'червоний',     tr: 'р[е]д' },
      { en: 'blue',   ua: 'синій',        tr: 'бл[у]' },
      { en: 'green',  ua: 'зелений',      tr: 'гр[і]н' },
      { en: 'yellow', ua: 'жовтий',       tr: '[є]лоу' },
      { en: 'black',  ua: 'чорний',       tr: 'бл[е]к' },
      { en: 'white',  ua: 'білий',        tr: 'у[а]йт' },
      { en: 'orange', ua: 'помаранчевий', tr: '[о]ріндж' },
      { en: 'pink',   ua: 'рожевий',      tr: 'п[і]нк' },
    ],
    examples: [
      { en: 'The sky is blue.', ua: 'Небо синє.',                tr: 'зе скай із бл[у]' },
      { en: 'I like red.',      ua: 'Мені подобається червоний.', tr: 'ай лайк р[е]д' },
    ],
  },
  {
    id: 8, level: 'A1', icon: '📅', title: 'Дні тижня',
    subtitle: 'Від понеділка до неділі',
    cards: [
      { en: 'Monday',    ua: 'понеділок', tr: 'м[а]ндей' },
      { en: 'Tuesday',   ua: 'вівторок',  tr: 'т[ю]здей' },
      { en: 'Wednesday', ua: 'середа',    tr: 'у[е]нздей' },
      { en: 'Thursday',  ua: 'четвер',    tr: 'с[ё]рздей' },
      { en: 'Friday',    ua: "п'ятниця",  tr: 'фр[а]йдей' },
      { en: 'Saturday',  ua: 'субота',    tr: 'с[е]тердей' },
      { en: 'Sunday',    ua: 'неділя',    tr: 'с[а]ндей' },
      { en: 'today',     ua: 'сьогодні',  tr: 'туд[е]й' },
      { en: 'tomorrow',  ua: 'завтра',    tr: 'тум[о]роу' },
    ],
    examples: [
      { en: 'See you on Monday.', ua: 'Побачимось у понеділок.', tr: 'сі ю он м[а]ндей' },
      { en: 'Today is Friday.',   ua: "Сьогодні п'ятниця.",      tr: 'туд[е]й із фр[а]йдей' },
    ],
  },
  {
    id: 9, level: 'A1', icon: '🍎', title: 'Їжа і напої',
    subtitle: 'Що їмо і п’ємо',
    cards: [
      { en: 'water',  ua: 'вода',    tr: 'у[о]тер' },
      { en: 'bread',  ua: 'хліб',    tr: 'бр[е]д' },
      { en: 'coffee', ua: 'кава',    tr: 'к[о]фі' },
      { en: 'tea',    ua: 'чай',     tr: 'т[і]' },
      { en: 'apple',  ua: 'яблуко',  tr: '[е]пл' },
      { en: 'milk',   ua: 'молоко',  tr: 'м[і]лк' },
      { en: 'meat',   ua: "м'ясо",   tr: 'м[і]т' },
      { en: 'egg',    ua: 'яйце',    tr: '[е]г' },
    ],
    examples: [
      { en: 'I want water, please.', ua: 'Я хочу води, будь ласка.', tr: 'ай уонт у[о]тер пліз' },
      { en: 'Coffee or tea?',        ua: 'Кава чи чай?',             tr: 'к[о]фі о ті' },
    ],
  },

  /* ============ A2 ============ */
  {
    id: 10, level: 'A2', icon: '☕', title: 'У кафе',
    subtitle: 'Замовити і розрахуватись',
    cards: [
      { en: 'menu',       ua: 'меню',       tr: 'м[е]нью' },
      { en: 'bill',       ua: 'рахунок',    tr: 'б[і]л' },
      { en: 'order',      ua: 'замовлення', tr: '[о]рдер' },
      { en: 'table',      ua: 'столик',     tr: 'т[е]йбл' },
      { en: 'waiter',     ua: 'офіціант',   tr: 'у[е]йтер' },
      { en: 'delicious',  ua: 'смачно',     tr: 'діл[і]шес' },
      { en: 'how much',   ua: 'скільки',    tr: 'гау м[а]ч' },
      { en: 'I would like', ua: 'я б хотів', tr: 'ай уд л[а]йк' },
    ],
    examples: [
      { en: 'Can I have the menu?', ua: 'Можна меню?',        tr: 'кен ай гев зе м[е]нью' },
      { en: 'The bill, please.',    ua: 'Рахунок, будь ласка.', tr: 'зе біл пл[і]з' },
    ],
  },
  {
    id: 11, level: 'A2', icon: '🕒', title: 'Час',
    subtitle: 'Котра година',
    cards: [
      { en: 'hour',    ua: 'година',  tr: '[а]уер' },
      { en: 'minute',  ua: 'хвилина', tr: 'м[і]ніт' },
      { en: 'now',     ua: 'зараз',   tr: 'н[а]у' },
      { en: 'early',   ua: 'рано',    tr: '[ё]рлі' },
      { en: 'late',    ua: 'пізно',   tr: 'л[е]йт' },
      { en: 'morning', ua: 'ранок',   tr: 'м[о]рнінг' },
      { en: 'evening', ua: 'вечір',   tr: '[і]внінг' },
      { en: 'What time is it?', ua: 'котра година?', tr: 'уот тайм із іт' },
    ],
    examples: [
      { en: "It is three o'clock.", ua: 'Зараз третя.',  tr: 'іт із тр[і] окл[о]к' },
      { en: 'I am late.',           ua: 'Я запізнююсь.', tr: 'ай ем л[е]йт' },
    ],
  },
  {
    id: 12, level: 'A2', icon: '🌦️', title: 'Погода',
    subtitle: 'Яка погода надворі',
    cards: [
      { en: 'sun',   ua: 'сонце',    tr: 'с[а]н' },
      { en: 'rain',  ua: 'дощ',      tr: 'р[е]йн' },
      { en: 'snow',  ua: 'сніг',     tr: 'сн[о]у' },
      { en: 'wind',  ua: 'вітер',    tr: 'у[і]нд' },
      { en: 'hot',   ua: 'спекотно', tr: 'г[о]т' },
      { en: 'cold',  ua: 'холодно',  tr: 'к[о]улд' },
      { en: 'cloud', ua: 'хмара',    tr: 'кл[а]уд' },
      { en: 'warm',  ua: 'тепло',    tr: 'у[о]рм' },
    ],
    examples: [
      { en: 'It is raining.',     ua: 'Іде дощ.',        tr: 'іт із р[е]йнінг' },
      { en: 'It is cold today.',  ua: 'Сьогодні холодно.', tr: 'іт із к[о]улд туд[е]й' },
    ],
  },
  {
    id: 13, level: 'A2', icon: '🏠', title: 'Дім',
    subtitle: 'Будинок і кімнати',
    cards: [
      { en: 'house',  ua: 'будинок', tr: 'г[а]ус' },
      { en: 'room',   ua: 'кімната', tr: 'р[у]м' },
      { en: 'kitchen',ua: 'кухня',   tr: 'к[і]чен' },
      { en: 'door',   ua: 'двері',   tr: 'д[о]р' },
      { en: 'window', ua: 'вікно',   tr: 'у[і]ндоу' },
      { en: 'bed',    ua: 'ліжко',   tr: 'б[е]д' },
      { en: 'chair',  ua: 'стілець', tr: 'ч[е]а' },
      { en: 'floor',  ua: 'підлога', tr: 'фл[о]р' },
    ],
    examples: [
      { en: 'My room is small.', ua: 'Моя кімната маленька.', tr: 'май рум із см[о]л' },
      { en: 'Open the door.',    ua: 'Відчини двері.',        tr: '[о]упен зе д[о]р' },
    ],
  },

  /* ============ B1 ============ */
  {
    id: 14, level: 'B1', icon: '✈️', title: 'Подорожі',
    subtitle: 'Аеропорт і готель',
    cards: [
      { en: 'airport',  ua: 'аеропорт',    tr: '[е]апорт' },
      { en: 'ticket',   ua: 'квиток',      tr: 'т[і]кет' },
      { en: 'luggage',  ua: 'багаж',       tr: 'л[а]гідж' },
      { en: 'passport', ua: 'паспорт',     tr: 'п[а]спорт' },
      { en: 'hotel',    ua: 'готель',      tr: 'гоут[е]л' },
      { en: 'flight',   ua: 'рейс',        tr: 'фл[а]йт' },
      { en: 'to book',  ua: 'забронювати', tr: 'ту б[у]к' },
      { en: 'arrival',  ua: 'прибуття',    tr: 'ер[а]йвл' },
    ],
    examples: [
      { en: 'Where is my gate?', ua: 'Де мій вихід?',       tr: 'у[е]а із май г[е]йт' },
      { en: 'I booked a hotel.', ua: 'Я забронював готель.', tr: 'ай букт е гоут[е]л' },
    ],
  },
  {
    id: 15, level: 'B1', icon: '💼', title: 'Робота',
    subtitle: 'Офіс і професії',
    cards: [
      { en: 'job',      ua: 'робота',    tr: 'дж[о]б' },
      { en: 'office',   ua: 'офіс',      tr: '[о]фіс' },
      { en: 'meeting',  ua: 'зустріч',   tr: 'м[і]тінг' },
      { en: 'boss',     ua: 'начальник', tr: 'б[о]с' },
      { en: 'salary',   ua: 'зарплата',  tr: 'с[е]лері' },
      { en: 'colleague',ua: 'колега',    tr: 'к[о]лі[г]' },
      { en: 'deadline', ua: 'дедлайн',   tr: 'д[е]длайн' },
      { en: 'to work',  ua: 'працювати', tr: 'ту у[ё]рк' },
    ],
    examples: [
      { en: 'I have a meeting.',       ua: 'У мене зустріч.',       tr: 'ай гев е м[і]тінг' },
      { en: 'She works in an office.', ua: 'Вона працює в офісі.', tr: 'ші у[ё]ркс ін ен [о]фіс' },
    ],
  },
  {
    id: 16, level: 'B1', icon: '🩺', title: 'Здоров’я',
    subtitle: 'У лікаря',
    cards: [
      { en: 'doctor',   ua: 'лікар',   tr: 'д[о]ктер' },
      { en: 'pain',     ua: 'біль',    tr: 'п[е]йн' },
      { en: 'medicine', ua: 'ліки',    tr: 'м[е]дсін' },
      { en: 'sick',     ua: 'хворий',  tr: 'с[і]к' },
      { en: 'head',     ua: 'голова',  tr: 'г[е]д' },
      { en: 'to hurt',  ua: 'боліти',  tr: 'ту г[ё]рт' },
      { en: 'healthy',  ua: 'здоровий', tr: 'г[е]лсі' },
      { en: 'hospital', ua: 'лікарня', tr: 'г[о]спітл' },
    ],
    examples: [
      { en: 'I feel sick.',   ua: 'Мені погано.',          tr: 'ай філ с[і]к' },
      { en: 'My head hurts.', ua: 'У мене болить голова.', tr: 'май гед г[ё]ртс' },
    ],
  },
  {
    id: 17, level: 'B1', icon: '⏪', title: 'Минулий час',
    subtitle: 'Розповідаємо про вчора',
    cards: [
      { en: 'was',       ua: 'був / була',   tr: 'у[о]з' },
      { en: 'were',      ua: 'були',         tr: 'у[ё]р' },
      { en: 'yesterday', ua: 'вчора',        tr: 'є[с]тердей' },
      { en: 'did',       ua: 'робив (допом.)', tr: 'д[і]д' },
      { en: 'went',      ua: 'пішов, поїхав', tr: 'у[е]нт' },
      { en: 'saw',       ua: 'бачив',        tr: 'с[о]' },
      { en: 'ago',       ua: 'тому (назад)', tr: 'ег[о]у' },
      { en: 'last',      ua: 'минулий',      tr: 'л[а]ст' },
    ],
    examples: [
      { en: 'I was at home.',        ua: 'Я був удома.',    tr: 'ай уоз ет г[о]ум' },
      { en: 'We went to the park.',  ua: 'Ми ходили в парк.', tr: 'уі уент ту зе п[а]рк' },
    ],
  },

  /* ============ B2 ============ */
  {
    id: 18, level: 'B2', icon: '💭', title: 'Думки і аргументи',
    subtitle: 'Висловити позицію',
    cards: [
      { en: 'opinion',   ua: 'думка',        tr: 'оп[і]ньйон' },
      { en: 'to agree',  ua: 'погоджуватись', tr: 'ту егр[і]' },
      { en: 'however',   ua: 'однак',        tr: 'гау[е]вер' },
      { en: 'because',   ua: 'тому що',      tr: 'бік[о]з' },
      { en: 'although',  ua: 'хоча',         tr: 'олз[о]у' },
      { en: 'probably',  ua: 'мабуть',       tr: 'пр[о]баблі' },
      { en: 'reason',    ua: 'причина',      tr: 'р[і]зн' },
      { en: 'in my view', ua: 'на мою думку', tr: 'ін май в[ю]' },
    ],
    examples: [
      { en: 'I agree with you.',    ua: 'Я з тобою згоден.', tr: 'ай егр[і] уіз ю' },
      { en: 'However, it is hard.', ua: 'Однак це важко.',   tr: 'гау[е]вер іт із г[а]рд' },
    ],
  },
  {
    id: 19, level: 'B2', icon: '📈', title: 'Бізнес',
    subtitle: 'Компанія і гроші',
    cards: [
      { en: 'company',  ua: 'компанія',     tr: 'к[а]мпані' },
      { en: 'customer', ua: 'клієнт',       tr: 'к[а]стемер' },
      { en: 'profit',   ua: 'прибуток',     tr: 'пр[о]фіт' },
      { en: 'market',   ua: 'ринок',        tr: 'м[а]ркет' },
      { en: 'to invest',ua: 'інвестувати',  tr: 'ту інв[е]ст' },
      { en: 'contract', ua: 'контракт',     tr: 'к[о]нтракт' },
      { en: 'growth',   ua: 'зростання',    tr: 'гр[о]ус' },
      { en: 'strategy', ua: 'стратегія',    tr: 'стр[е]теджі' },
    ],
    examples: [
      { en: 'Our profit is growing.', ua: 'Наш прибуток зростає.', tr: '[а]уер профіт із гр[о]уінг' },
      { en: 'We signed a contract.',  ua: 'Ми підписали контракт.', tr: 'уі сайнд е к[о]нтракт' },
    ],
  },
  {
    id: 20, level: 'B2', icon: '🏛️', title: 'Суспільство',
    subtitle: 'Держава і люди',
    cards: [
      { en: 'government', ua: 'уряд',        tr: 'г[а]вермент' },
      { en: 'law',        ua: 'закон',       tr: 'л[о]' },
      { en: 'freedom',    ua: 'свобода',     tr: 'фр[і]дом' },
      { en: 'society',    ua: 'суспільство', tr: 'сос[а]єті' },
      { en: 'rights',     ua: 'права',       tr: 'р[а]йтс' },
      { en: 'election',   ua: 'вибори',      tr: 'іл[е]кшн' },
      { en: 'change',     ua: 'зміна',       tr: 'ч[е]йндж' },
      { en: 'future',     ua: 'майбутнє',    tr: 'фь[ю]чер' },
    ],
    examples: [
      { en: 'People want change.',   ua: 'Люди хочуть змін.',  tr: 'п[і]пл уонт ч[е]йндж' },
      { en: 'Freedom is important.', ua: 'Свобода важлива.',   tr: 'фр[і]дом із імп[о]ртент' },
    ],
  },
  {
    id: 21, level: 'B2', icon: '🗣️', title: 'Ідіоми і фразові дієслова',
    subtitle: 'Як говорять носії',
    cards: [
      { en: 'give up',    ua: 'здаватись',   tr: 'гів [а]п' },
      { en: 'look for',   ua: 'шукати',      tr: 'лук ф[о]' },
      { en: 'find out',   ua: 'дізнатись',   tr: 'файнд [а]ут' },
      { en: 'of course',  ua: 'звісно',      tr: 'ов к[о]рс' },
      { en: 'by the way', ua: 'до речі',     tr: 'бай зе у[е]й' },
      { en: 'take care',  ua: 'бережи себе', tr: 'тейк к[е]а' },
      { en: 'never mind', ua: 'неважливо',   tr: 'н[е]вер майнд' },
      { en: 'make sense', ua: 'мати сенс',   tr: 'мейк с[е]нс' },
    ],
    examples: [
      { en: "Don't give up!",   ua: 'Не здавайся!', tr: 'доунт гів [а]п' },
      { en: 'It makes sense.',  ua: 'Це має сенс.', tr: 'іт мейкс с[е]нс' },
    ],
  },
];
