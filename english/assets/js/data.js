/* Anglo — курс англійської з нуля.
   Дані уроків. Кожна картка: en (англійською), ua (переклад),
   tr (транскрипція українськими літерами; наголошений склад у [дужках]).
   Транскрипції приблизні — щоб було легко повторити вголос. */

const LESSONS = [
  {
    id: 1,
    icon: '❓',
    title: 'Питальні слова',
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
      { en: 'Who is it?',         ua: 'Хто це?',               tr: 'гу із іт' },
    ],
  },
  {
    id: 2,
    icon: '🙋',
    title: 'Займенники',
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
      { en: 'I love you.',        ua: 'Я тебе люблю.',   tr: 'ай лав ю' },
      { en: 'She is my sister.',  ua: 'Вона моя сестра.', tr: 'ші із май с[і]стер' },
    ],
  },
  {
    id: 3,
    icon: '🔗',
    title: 'Дієслово to be',
    subtitle: 'am / is / are — маленьке слово «є»',
    cards: [
      { en: 'to be', ua: 'бути',                tr: 'ту б[і]' },
      { en: 'am',    ua: 'є (з I)',             tr: '[ем]' },
      { en: 'is',    ua: 'є (з he / she / it)', tr: '[із]' },
      { en: 'are',   ua: 'є (з you / we / they)', tr: '[а]' },
    ],
    examples: [
      { en: 'I am a student.', ua: 'Я студент.',    tr: 'ай ем е ст[ю]дент' },
      { en: 'He is happy.',    ua: 'Він щасливий.', tr: 'гі із г[е]пі' },
      { en: 'They are here.',  ua: 'Вони тут.',     tr: 'зей а г[і]а' },
    ],
  },
  {
    id: 4,
    icon: '🔢',
    title: 'Числа 1–10',
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
    id: 5,
    icon: '👋',
    title: 'Перші фрази',
    subtitle: 'Привітатися і бути ввічливим',
    cards: [
      { en: 'hello',      ua: 'привіт',        tr: 'гел[о]у' },
      { en: 'hi',         ua: 'привіт (неформ.)', tr: 'г[а]й' },
      { en: 'goodbye',    ua: 'до побачення',  tr: 'гудб[а]й' },
      { en: 'please',     ua: 'будь ласка',    tr: 'пл[і]з' },
      { en: 'thank you',  ua: 'дякую',         tr: 'с[е]нк ю' },
      { en: 'yes',        ua: 'так',           tr: '[є]с' },
      { en: 'no',         ua: 'ні',            tr: 'н[о]у' },
      { en: 'sorry',      ua: 'вибач',         tr: 'с[о]рі' },
    ],
    examples: [
      { en: 'Hello, how are you?', ua: 'Привіт, як справи?', tr: 'гел[о]у гау а ю' },
      { en: 'My name is Anna.',    ua: 'Мене звати Анна.',   tr: 'май н[ей]м із [е]на' },
    ],
  },
];
