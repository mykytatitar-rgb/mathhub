/* Hola — курс іспанської з нуля за рівнями CEFR (A0 → B2).
   Кожна картка: en (іспанською), ua (переклад),
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
    subtitle: 'Cuándo, Dónde, Quién — з чого починаються запитання',
    cards: [
      { en: 'cuándo',  ua: 'коли',   tr: 'ку[а]ндо' },
      { en: 'dónde',   ua: 'де',     tr: 'д[о]нде' },
      { en: 'quién',   ua: 'хто',    tr: 'кь[е]н' },
      { en: 'qué',     ua: 'що',     tr: 'к[е]' },
      { en: 'por qué', ua: 'чому',   tr: 'пор к[е]' },
      { en: 'cómo',    ua: 'як',     tr: 'к[о]мо' },
      { en: 'cuál',    ua: 'котрий', tr: 'ку[а]ль' },
    ],
    examples: [
      { en: '¿Cuándo nos vemos?', ua: 'Коли побачимось?', tr: 'ку[а]ндо нос б[е]мос' },
      { en: '¿Dónde estás?',      ua: 'Де ти?',           tr: 'д[о]нде ест[а]с' },
    ],
  },
  {
    id: 2, level: 'A0', icon: '🙋', title: 'Займенники',
    subtitle: 'Я, ти, він, вона — хто виконує дію',
    cards: [
      { en: 'yo',       ua: 'я',    tr: 'йо' },
      { en: 'tú',       ua: 'ти',   tr: 'т[у]' },
      { en: 'él',       ua: 'він',  tr: '[е]ль' },
      { en: 'ella',     ua: 'вона', tr: '[е]йя' },
      { en: 'nosotros', ua: 'ми',   tr: 'нос[о]трос' },
      { en: 'vosotros', ua: 'ви',   tr: 'бос[о]трос' },
      { en: 'ellos',    ua: 'вони', tr: '[е]йос' },
    ],
    examples: [
      { en: 'Yo te quiero.',       ua: 'Я тебе люблю.',    tr: 'йо те кь[е]ро' },
      { en: 'Ella es mi hermana.', ua: 'Вона моя сестра.', tr: '[е]йя ес мі ерм[а]на' },
    ],
  },
  {
    id: 3, level: 'A0', icon: '🔢', title: 'Числа 1–10',
    subtitle: 'Рахуємо іспанською',
    cards: [
      { en: 'uno',    ua: 'один',    tr: '[у]но' },
      { en: 'dos',    ua: 'два',     tr: 'дос' },
      { en: 'tres',   ua: 'три',     tr: 'трес' },
      { en: 'cuatro', ua: 'чотири',  tr: 'ку[а]тро' },
      { en: 'cinco',  ua: "п'ять",   tr: 'с[і]нко' },
      { en: 'seis',   ua: 'шість',   tr: 'с[е]йс' },
      { en: 'siete',  ua: 'сім',     tr: 'сь[е]те' },
      { en: 'ocho',   ua: 'вісім',   tr: '[о]чо' },
      { en: 'nueve',  ua: "дев'ять", tr: 'ну[е]бе' },
      { en: 'diez',   ua: 'десять',  tr: 'дь[е]с' },
    ],
    examples: [
      { en: 'Tengo dos hermanos.', ua: 'У мене два брати.', tr: 'т[е]нго дос ерм[а]нос' },
      { en: 'Tengo cinco años.',   ua: "Мені п'ять років.", tr: 'т[е]нго с[і]нко [а]ньйос' },
    ],
  },
  {
    id: 4, level: 'A0', icon: '👋', title: 'Перші фрази',
    subtitle: 'Привітатися і бути ввічливим',
    cards: [
      { en: 'hola',      ua: 'привіт',       tr: '[о]ла' },
      { en: 'adiós',     ua: 'до побачення', tr: 'адь[о]с' },
      { en: 'por favor', ua: 'будь ласка',   tr: 'пор фаб[о]р' },
      { en: 'gracias',   ua: 'дякую',        tr: 'гр[а]сьяс' },
      { en: 'sí',        ua: 'так',          tr: 'с[і]' },
      { en: 'no',        ua: 'ні',           tr: 'но' },
      { en: 'perdón',    ua: 'вибач',        tr: 'перд[о]н' },
      { en: 'me llamo',  ua: 'мене звати…',  tr: 'ме й[а]мо' },
    ],
    examples: [
      { en: '¡Hola! ¿Cómo estás?', ua: 'Привіт! Як справи?', tr: '[о]ла к[о]мо ест[а]с' },
      { en: 'Me llamo Ana.',       ua: 'Мене звати Ана.',    tr: 'ме й[а]мо [а]на' },
    ],
  },

  /* ============ A1 ============ */
  {
    id: 5, level: 'A1', icon: '🔗', title: 'Дієслово ser',
    subtitle: 'soy / eres / es — маленьке слово «бути»',
    cards: [
      { en: 'ser',   ua: 'бути',       tr: 'сер' },
      { en: 'soy',   ua: 'я є',        tr: 'с[о]й' },
      { en: 'eres',  ua: 'ти є',       tr: '[е]рес' },
      { en: 'es',    ua: 'він/вона є', tr: 'ес' },
      { en: 'somos', ua: 'ми є',       tr: 'с[о]мос' },
      { en: 'son',   ua: 'вони є',     tr: 'сон' },
    ],
    examples: [
      { en: 'Soy estudiante.',   ua: 'Я студент.',    tr: 'с[о]й естудь[а]нте' },
      { en: 'Ellos son de aquí.', ua: 'Вони звідси.', tr: '[е]йос сон де ак[і]' },
    ],
  },
  {
    id: 6, level: 'A1', icon: '👨‍👩‍👧', title: 'Родина',
    subtitle: 'Найближчі люди',
    cards: [
      { en: 'madre',   ua: 'мама',   tr: 'м[а]дре' },
      { en: 'padre',   ua: 'тато',   tr: 'п[а]дре' },
      { en: 'hermana', ua: 'сестра', tr: 'ерм[а]на' },
      { en: 'hermano', ua: 'брат',   tr: 'ерм[а]но' },
      { en: 'hijo',    ua: 'син',    tr: '[і]хо' },
      { en: 'hija',    ua: 'дочка',  tr: '[і]ха' },
      { en: 'familia', ua: 'родина', tr: 'фам[і]ліа' },
      { en: 'padres',  ua: 'батьки', tr: 'п[а]дрес' },
    ],
    examples: [
      { en: 'Esta es mi madre.', ua: 'Це моя мама.',   tr: '[е]ста ес мі м[а]дре' },
      { en: 'Tengo un hermano.', ua: 'У мене є брат.', tr: 'т[е]нго ун ерм[а]но' },
    ],
  },
  {
    id: 7, level: 'A1', icon: '🎨', title: 'Кольори',
    subtitle: 'Основні кольори',
    cards: [
      { en: 'rojo',     ua: 'червоний',     tr: 'р[о]хо' },
      { en: 'azul',     ua: 'синій',        tr: 'ас[у]ль' },
      { en: 'verde',    ua: 'зелений',      tr: 'б[е]рде' },
      { en: 'amarillo', ua: 'жовтий',       tr: 'амар[і]йо' },
      { en: 'negro',    ua: 'чорний',       tr: 'н[е]гро' },
      { en: 'blanco',   ua: 'білий',        tr: 'бл[а]нко' },
      { en: 'naranja',  ua: 'помаранчевий', tr: 'нар[а]нха' },
      { en: 'rosa',     ua: 'рожевий',      tr: 'р[о]са' },
    ],
    examples: [
      { en: 'El cielo es azul.', ua: 'Небо синє.',                 tr: 'ель сь[е]ло ес ас[у]ль' },
      { en: 'Me gusta el rojo.', ua: 'Мені подобається червоний.', tr: 'ме г[у]ста ель р[о]хо' },
    ],
  },
  {
    id: 8, level: 'A1', icon: '📅', title: 'Дні тижня',
    subtitle: 'Від понеділка до неділі',
    cards: [
      { en: 'lunes',     ua: 'понеділок', tr: 'л[у]нес' },
      { en: 'martes',    ua: 'вівторок',  tr: 'м[а]ртес' },
      { en: 'miércoles', ua: 'середа',    tr: 'мь[е]рколес' },
      { en: 'jueves',    ua: 'четвер',    tr: 'ху[е]бес' },
      { en: 'viernes',   ua: "п'ятниця",  tr: 'бь[е]рнес' },
      { en: 'sábado',    ua: 'субота',    tr: 'с[а]бадо' },
      { en: 'domingo',   ua: 'неділя',    tr: 'дом[і]нго' },
      { en: 'hoy',       ua: 'сьогодні',  tr: '[о]й' },
      { en: 'mañana',    ua: 'завтра',    tr: 'мань[а]на' },
    ],
    examples: [
      { en: 'Nos vemos el lunes.', ua: 'Побачимось у понеділок.', tr: 'нос б[е]мос ель л[у]нес' },
      { en: 'Hoy es viernes.',     ua: "Сьогодні п'ятниця.",      tr: '[о]й ес бь[е]рнес' },
    ],
  },
  {
    id: 9, level: 'A1', icon: '🍎', title: 'Їжа і напої',
    subtitle: 'Що їмо і п’ємо',
    cards: [
      { en: 'agua',   ua: 'вода',   tr: '[а]гуа' },
      { en: 'pan',    ua: 'хліб',   tr: 'пан' },
      { en: 'café',   ua: 'кава',   tr: 'каф[е]' },
      { en: 'té',     ua: 'чай',    tr: 'те' },
      { en: 'manzana',ua: 'яблуко', tr: 'манс[а]на' },
      { en: 'leche',  ua: 'молоко', tr: 'л[е]че' },
      { en: 'carne',  ua: "м'ясо",  tr: 'к[а]рне' },
      { en: 'huevo',  ua: 'яйце',   tr: 'у[е]бо' },
    ],
    examples: [
      { en: 'Quiero agua, por favor.', ua: 'Я хочу води, будь ласка.', tr: 'кь[е]ро [а]гуа пор фаб[о]р' },
      { en: '¿Café o té?',             ua: 'Кава чи чай?',             tr: 'каф[е] о те' },
    ],
  },

  /* ============ A2 ============ */
  {
    id: 10, level: 'A2', icon: '☕', title: 'У кафе',
    subtitle: 'Замовити і розрахуватись',
    cards: [
      { en: 'menú',       ua: 'меню',       tr: 'мен[у]' },
      { en: 'cuenta',     ua: 'рахунок',    tr: 'ку[е]нта' },
      { en: 'pedido',     ua: 'замовлення', tr: 'пед[і]до' },
      { en: 'mesa',       ua: 'столик',     tr: 'м[е]са' },
      { en: 'camarero',   ua: 'офіціант',   tr: 'камар[е]ро' },
      { en: 'delicioso',  ua: 'смачно',     tr: 'делісь[о]со' },
      { en: 'cuánto',     ua: 'скільки',    tr: 'ку[а]нто' },
      { en: 'quisiera',   ua: 'я б хотів',  tr: 'кісь[е]ра' },
    ],
    examples: [
      { en: '¿Me trae el menú?',   ua: 'Принесете меню?',      tr: 'ме тр[а]е ель мен[у]' },
      { en: 'La cuenta, por favor.', ua: 'Рахунок, будь ласка.', tr: 'ла ку[е]нта пор фаб[о]р' },
    ],
  },
  {
    id: 11, level: 'A2', icon: '🕒', title: 'Час',
    subtitle: 'Котра година',
    cards: [
      { en: 'hora',    ua: 'година',  tr: '[о]ра' },
      { en: 'minuto',  ua: 'хвилина', tr: 'мін[у]то' },
      { en: 'ahora',   ua: 'зараз',   tr: 'а[о]ра' },
      { en: 'temprano',ua: 'рано',    tr: 'темпр[а]но' },
      { en: 'tarde',   ua: 'пізно',   tr: 'т[а]рде' },
      { en: 'mañana',  ua: 'ранок',   tr: 'мань[а]на' },
      { en: 'noche',   ua: 'вечір, ніч', tr: 'н[о]че' },
      { en: '¿Qué hora es?', ua: 'котра година?', tr: 'ке [о]ра ес' },
    ],
    examples: [
      { en: 'Son las tres.', ua: 'Зараз третя.',  tr: 'сон лас трес' },
      { en: 'Llego tarde.',  ua: 'Я запізнююсь.', tr: 'й[е]го т[а]рде' },
    ],
  },
  {
    id: 12, level: 'A2', icon: '🌦️', title: 'Погода',
    subtitle: 'Яка погода надворі',
    cards: [
      { en: 'sol',    ua: 'сонце',    tr: 'соль' },
      { en: 'lluvia', ua: 'дощ',      tr: 'й[у]бія' },
      { en: 'nieve',  ua: 'сніг',     tr: 'нь[е]бе' },
      { en: 'viento', ua: 'вітер',    tr: 'бь[е]нто' },
      { en: 'calor',  ua: 'спека',    tr: 'кал[о]р' },
      { en: 'frío',   ua: 'холод',    tr: 'фр[і]о' },
      { en: 'nube',   ua: 'хмара',    tr: 'н[у]бе' },
      { en: 'tiempo', ua: 'погода',   tr: 'ть[е]мпо' },
    ],
    examples: [
      { en: 'Está lloviendo.',  ua: 'Іде дощ.',         tr: 'ест[а] йобь[е]ндо' },
      { en: 'Hoy hace frío.',   ua: 'Сьогодні холодно.', tr: '[о]й [а]се фр[і]о' },
    ],
  },
  {
    id: 13, level: 'A2', icon: '🏠', title: 'Дім',
    subtitle: 'Будинок і кімнати',
    cards: [
      { en: 'casa',    ua: 'будинок', tr: 'к[а]са' },
      { en: 'cuarto',  ua: 'кімната', tr: 'ку[а]рто' },
      { en: 'cocina',  ua: 'кухня',   tr: 'кос[і]на' },
      { en: 'puerta',  ua: 'двері',   tr: 'пу[е]рта' },
      { en: 'ventana', ua: 'вікно',   tr: 'бент[а]на' },
      { en: 'cama',    ua: 'ліжко',   tr: 'к[а]ма' },
      { en: 'silla',   ua: 'стілець', tr: 'с[і]йя' },
      { en: 'suelo',   ua: 'підлога', tr: 'су[е]ло' },
    ],
    examples: [
      { en: 'Mi cuarto es pequeño.', ua: 'Моя кімната маленька.', tr: 'мі ку[а]рто ес пек[е]ньйо' },
      { en: 'Abre la puerta.',       ua: 'Відчини двері.',        tr: '[а]бре ла пу[е]рта' },
    ],
  },

  /* ============ B1 ============ */
  {
    id: 14, level: 'B1', icon: '✈️', title: 'Подорожі',
    subtitle: 'Аеропорт і готель',
    cards: [
      { en: 'aeropuerto', ua: 'аеропорт',    tr: 'аеропу[е]рто' },
      { en: 'billete',    ua: 'квиток',      tr: 'бій[е]те' },
      { en: 'equipaje',   ua: 'багаж',       tr: 'екіп[а]хе' },
      { en: 'pasaporte',  ua: 'паспорт',     tr: 'пасап[о]рте' },
      { en: 'hotel',      ua: 'готель',      tr: 'от[е]ль' },
      { en: 'vuelo',      ua: 'рейс',        tr: 'бу[е]ло' },
      { en: 'reservar',   ua: 'забронювати', tr: 'ресерв[а]р' },
      { en: 'llegada',    ua: 'прибуття',    tr: 'йег[а]да' },
    ],
    examples: [
      { en: '¿Dónde está mi puerta?', ua: 'Де мій вихід?',        tr: 'д[о]нде ест[а] мі пу[е]рта' },
      { en: 'Reservé un hotel.',      ua: 'Я забронював готель.', tr: 'ресерв[е] ун от[е]ль' },
    ],
  },
  {
    id: 15, level: 'B1', icon: '💼', title: 'Робота',
    subtitle: 'Офіс і професії',
    cards: [
      { en: 'trabajo',   ua: 'робота',    tr: 'траб[а]хо' },
      { en: 'oficina',   ua: 'офіс',      tr: 'офіс[і]на' },
      { en: 'reunión',   ua: 'зустріч',   tr: 'реунь[о]н' },
      { en: 'jefe',      ua: 'начальник', tr: 'х[е]фе' },
      { en: 'sueldo',    ua: 'зарплата',  tr: 'су[е]льдо' },
      { en: 'compañero', ua: 'колега',    tr: 'компань[е]ро' },
      { en: 'empresa',   ua: 'фірма',     tr: 'емпр[е]са' },
      { en: 'trabajar',  ua: 'працювати', tr: 'трабах[а]р' },
    ],
    examples: [
      { en: 'Tengo una reunión.',      ua: 'У мене зустріч.',       tr: 'т[е]нго [у]на реунь[о]н' },
      { en: 'Ella trabaja en una oficina.', ua: 'Вона працює в офісі.', tr: '[е]йя траб[а]ха ен [у]на офіс[і]на' },
    ],
  },
  {
    id: 16, level: 'B1', icon: '🩺', title: 'Здоров’я',
    subtitle: 'У лікаря',
    cards: [
      { en: 'médico',    ua: 'лікар',   tr: 'м[е]діко' },
      { en: 'dolor',     ua: 'біль',    tr: 'дол[о]р' },
      { en: 'medicina',  ua: 'ліки',    tr: 'медіс[і]на' },
      { en: 'enfermo',   ua: 'хворий',  tr: 'енф[е]рмо' },
      { en: 'cabeza',    ua: 'голова',  tr: 'каб[е]са' },
      { en: 'doler',     ua: 'боліти',  tr: 'дол[е]р' },
      { en: 'sano',      ua: 'здоровий', tr: 'с[а]но' },
      { en: 'hospital',  ua: 'лікарня', tr: 'оспіт[а]ль' },
    ],
    examples: [
      { en: 'Estoy enfermo.',        ua: 'Я хворий.',             tr: 'ест[о]й енф[е]рмо' },
      { en: 'Me duele la cabeza.',   ua: 'У мене болить голова.', tr: 'ме ду[е]ле ла каб[е]са' },
    ],
  },
  {
    id: 17, level: 'B1', icon: '⏪', title: 'Минулий час',
    subtitle: 'Розповідаємо про вчора',
    cards: [
      { en: 'ayer',      ua: 'вчора',       tr: 'ай[е]р' },
      { en: 'fui',       ua: 'я був / пішов', tr: 'фу[і]' },
      { en: 'era',       ua: 'був (стан)',  tr: '[е]ра' },
      { en: 'estuve',    ua: 'я перебував', tr: 'ест[у]бе' },
      { en: 'hice',      ua: 'я зробив',    tr: '[і]се' },
      { en: 'vi',        ua: 'я бачив',     tr: 'бі' },
      { en: 'pasado',    ua: 'минулий',     tr: 'пас[а]до' },
      { en: 'hace',      ua: 'тому (назад)', tr: '[а]се' },
    ],
    examples: [
      { en: 'Ayer estuve en casa.', ua: 'Вчора я був удома.',   tr: 'ай[е]р ест[у]бе ен к[а]са' },
      { en: 'Fuimos al parque.',    ua: 'Ми ходили в парк.',    tr: 'фу[і]мос аль п[а]рке' },
    ],
  },

  /* ============ B2 ============ */
  {
    id: 18, level: 'B2', icon: '💭', title: 'Думки і аргументи',
    subtitle: 'Висловити позицію',
    cards: [
      { en: 'opinión',      ua: 'думка',         tr: 'опінь[о]н' },
      { en: 'estar de acuerdo', ua: 'погоджуватись', tr: 'ест[а]р де аку[е]рдо' },
      { en: 'sin embargo',  ua: 'однак',         tr: 'сін емб[а]рго' },
      { en: 'porque',       ua: 'тому що',       tr: 'п[о]рке' },
      { en: 'aunque',       ua: 'хоча',          tr: '[а]унке' },
      { en: 'quizás',       ua: 'можливо',       tr: 'кіс[а]с' },
      { en: 'razón',        ua: 'причина',       tr: 'рас[о]н' },
      { en: 'creo que',     ua: 'я думаю, що',   tr: 'кр[е]о ке' },
    ],
    examples: [
      { en: 'Estoy de acuerdo contigo.', ua: 'Я з тобою згоден.', tr: 'ест[о]й де аку[е]рдо конт[і]го' },
      { en: 'Sin embargo, es difícil.',  ua: 'Однак це важко.',   tr: 'сін емб[а]рго ес діф[і]сіль' },
    ],
  },
  {
    id: 19, level: 'B2', icon: '📈', title: 'Бізнес',
    subtitle: 'Компанія і гроші',
    cards: [
      { en: 'empresa',   ua: 'компанія',    tr: 'емпр[е]са' },
      { en: 'cliente',   ua: 'клієнт',      tr: 'клі[е]нте' },
      { en: 'ganancia',  ua: 'прибуток',    tr: 'ган[а]нсія' },
      { en: 'mercado',   ua: 'ринок',       tr: 'мерк[а]до' },
      { en: 'invertir',  ua: 'інвестувати', tr: 'інверт[і]р' },
      { en: 'contrato',  ua: 'контракт',    tr: 'контр[а]то' },
      { en: 'crecimiento', ua: 'зростання', tr: 'кресімь[е]нто' },
      { en: 'estrategia', ua: 'стратегія',  tr: 'естрат[е]хія' },
    ],
    examples: [
      { en: 'Nuestra ganancia crece.', ua: 'Наш прибуток зростає.',  tr: 'ну[е]стра ган[а]нсія кр[е]се' },
      { en: 'Firmamos un contrato.',   ua: 'Ми підписали контракт.', tr: 'фірм[а]мос ун контр[а]то' },
    ],
  },
  {
    id: 20, level: 'B2', icon: '🏛️', title: 'Суспільство',
    subtitle: 'Держава і люди',
    cards: [
      { en: 'gobierno',  ua: 'уряд',        tr: 'гобь[е]рно' },
      { en: 'ley',       ua: 'закон',       tr: 'лей' },
      { en: 'libertad',  ua: 'свобода',     tr: 'ліберт[а]д' },
      { en: 'sociedad',  ua: 'суспільство', tr: 'сосьєд[а]д' },
      { en: 'derechos',  ua: 'права',       tr: 'дер[е]чос' },
      { en: 'elección',  ua: 'вибори',      tr: 'елексь[о]н' },
      { en: 'cambio',    ua: 'зміна',       tr: 'к[а]мбіо' },
      { en: 'futuro',    ua: 'майбутнє',    tr: 'фут[у]ро' },
    ],
    examples: [
      { en: 'La gente quiere cambio.',  ua: 'Люди хочуть змін.', tr: 'ла х[е]нте кь[е]ре к[а]мбіо' },
      { en: 'La libertad es importante.', ua: 'Свобода важлива.', tr: 'ла ліберт[а]д ес імпорт[а]нте' },
    ],
  },
  {
    id: 21, level: 'B2', icon: '🗣️', title: 'Ідіоми і вирази',
    subtitle: 'Як говорять носії',
    cards: [
      { en: 'por supuesto', ua: 'звісно',       tr: 'пор супу[е]сто' },
      { en: 'de nada',      ua: 'нема за що',   tr: 'де н[а]да' },
      { en: 'a propósito',  ua: 'до речі',      tr: 'а проп[о]сіто' },
      { en: 'no importa',   ua: 'неважливо',    tr: 'но імп[о]рта' },
      { en: 'tener razón',  ua: 'мати рацію',   tr: 'тен[е]р рас[о]н' },
      { en: 'darse cuenta', ua: 'усвідомити',   tr: 'д[а]рсе ку[е]нта' },
      { en: 'vale',         ua: 'гаразд, ок',   tr: 'б[а]ле' },
      { en: 'poco a poco',  ua: 'потроху',      tr: 'п[о]ко а п[о]ко' },
    ],
    examples: [
      { en: '¡Por supuesto!', ua: 'Звісно!',        tr: 'пор супу[е]сто' },
      { en: 'Tienes razón.',  ua: 'Ти маєш рацію.', tr: 'ть[е]нес рас[о]н' },
    ],
  },
];
