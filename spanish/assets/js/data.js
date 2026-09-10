/* Hola — курс іспанської з нуля за рівнями CEFR (A0 → B2).
   Картка-слово: en (іспанською), ua (переклад), tr (транскрипція укр. літерами,
   наголос у [дужках]).
   sentences[] — речення для практики «збери речення»: en, ua, tr.
   Складність і кількість слів зростають від рівня до рівня. */

const LEVELS = [
  { id: 'A0', name: 'Перші кроки',       hint: 'Слова-цеглинки: привітання, числа, займенники' },
  { id: 'A1', name: 'Початковий',        hint: 'Про себе, родина, дієслова, побут' },
  { id: 'A2', name: 'Базовий',           hint: 'Кафе, місто, транспорт, покупки' },
  { id: 'B1', name: 'Середній',          hint: 'Подорожі, робота, здоров’я, час' },
  { id: 'B2', name: 'Вище середнього',   hint: 'Думки, бізнес, суспільство, технології' },
];

const LESSONS = [
  /* ================= A0 ================= */
  {
    id: 1, level: 'A0', icon: '❓', title: 'Питальні слова', subtitle: 'З чого починаються запитання',
    grammar: 'Іспанські питання беруться в перевернутий <b>¿</b> і звичайний <b>?</b>: ¿Qué es esto? Над питальними словами — знак наголосу: qué, dónde, cómo.',
    cards: [
      { en: 'cuándo',  ua: 'коли',   tr: 'ку[а]ндо' },
      { en: 'dónde',   ua: 'де',     tr: 'д[о]нде' },
      { en: 'quién',   ua: 'хто',    tr: 'кь[е]н' },
      { en: 'qué',     ua: 'що',     tr: 'к[е]' },
      { en: 'por qué', ua: 'чому',   tr: 'пор к[е]' },
      { en: 'cómo',    ua: 'як',     tr: 'к[о]мо' },
      { en: 'cuál',    ua: 'котрий', tr: 'ку[а]ль' },
    ],
    sentences: [
      { en: '¿Cuándo nos vemos?', ua: 'Коли побачимось?', tr: 'ку[а]ндо нос б[е]мос' },
      { en: '¿Dónde estás?',      ua: 'Де ти?',           tr: 'д[о]нде ест[а]с' },
      { en: '¿Quién es?',         ua: 'Хто це?',          tr: 'кь[е]н ес' },
      { en: '¿Qué es esto?',      ua: 'Що це?',           tr: 'ке ес [е]сто' },
    ],
  },
  {
    id: 2, level: 'A0', icon: '🙋', title: 'Займенники', subtitle: 'Хто виконує дію',
    grammar: 'В іспанській займенник-підмет часто <b>пропускають</b> — його видно з дієслова: <b>soy</b> = я є (yo не обовʼязково).',
    cards: [
      { en: 'yo',       ua: 'я',    tr: 'йо' },
      { en: 'tú',       ua: 'ти',   tr: 'т[у]' },
      { en: 'él',       ua: 'він',  tr: '[е]ль' },
      { en: 'ella',     ua: 'вона', tr: '[е]йя' },
      { en: 'nosotros', ua: 'ми',   tr: 'нос[о]трос' },
      { en: 'vosotros', ua: 'ви',   tr: 'бос[о]трос' },
      { en: 'ellos',    ua: 'вони', tr: '[е]йос' },
    ],
    sentences: [
      { en: 'Yo te quiero.',        ua: 'Я тебе люблю.',    tr: 'йо те кь[е]ро' },
      { en: 'Ella es mi hermana.',  ua: 'Вона моя сестра.', tr: '[е]йя ес мі ерм[а]на' },
      { en: 'Nosotros estamos aquí.', ua: 'Ми тут.',        tr: 'нос[о]трос ест[а]мос ак[і]' },
    ],
  },
  {
    id: 3, level: 'A0', icon: '🔢', title: 'Числа 1–12', subtitle: 'Рахуємо іспанською',
    grammar: 'Множина: після голосної додай <b>-s</b> (libro→libro<b>s</b>), після приголосної — <b>-es</b> (papel→papel<b>es</b>).',
    cards: [
      { en: 'uno',    ua: 'один',       tr: '[у]но' },
      { en: 'dos',    ua: 'два',        tr: 'дос' },
      { en: 'tres',   ua: 'три',        tr: 'трес' },
      { en: 'cuatro', ua: 'чотири',     tr: 'ку[а]тро' },
      { en: 'cinco',  ua: "п'ять",      tr: 'с[і]нко' },
      { en: 'seis',   ua: 'шість',      tr: 'с[е]йс' },
      { en: 'siete',  ua: 'сім',        tr: 'сь[е]те' },
      { en: 'ocho',   ua: 'вісім',      tr: '[о]чо' },
      { en: 'nueve',  ua: "дев'ять",    tr: 'ну[е]бе' },
      { en: 'diez',   ua: 'десять',     tr: 'дь[е]с' },
      { en: 'once',   ua: 'одинадцять', tr: '[о]нсе' },
      { en: 'doce',   ua: 'дванадцять', tr: 'д[о]се' },
    ],
    sentences: [
      { en: 'Tengo dos hermanos.', ua: 'У мене два брати.', tr: 'т[е]нго дос ерм[а]нос' },
      { en: 'Tengo cinco años.',   ua: "Мені п'ять років.", tr: 'т[е]нго с[і]нко [а]ньйос' },
      { en: 'Somos tres.',         ua: 'Нас троє.',         tr: 'с[о]мос трес' },
    ],
  },
  {
    id: 4, level: 'A0', icon: '🔟', title: 'Числа 13–100', subtitle: 'Десятки і велике',
    grammar: 'Складені: veinti<b>uno</b> (21), а від 31 — через <b>y</b>: treinta <b>y</b> uno.',
    cards: [
      { en: 'trece',     ua: 'тринадцять',  tr: 'тр[е]се' },
      { en: 'quince',    ua: "п'ятнадцять", tr: 'к[і]нсе' },
      { en: 'veinte',    ua: 'двадцять',    tr: 'б[е]йнте' },
      { en: 'treinta',   ua: 'тридцять',    tr: 'тр[е]йнта' },
      { en: 'cuarenta',  ua: 'сорок',       tr: 'куар[е]нта' },
      { en: 'cincuenta', ua: "п'ятдесят",   tr: 'сінку[е]нта' },
      { en: 'ochenta',   ua: 'вісімдесят',  tr: 'оч[е]нта' },
      { en: 'cien',      ua: 'сто',         tr: 'сь[е]н' },
    ],
    sentences: [
      { en: 'Tengo veinte años.', ua: 'Мені двадцять.',       tr: 'т[е]нго б[е]йнте [а]ньйос' },
      { en: 'Cuesta cincuenta.',  ua: "Це коштує п'ятдесят.", tr: 'ку[е]ста сінку[е]нта' },
      { en: 'Hay trece.',         ua: 'Їх тринадцять.',       tr: 'ай тр[е]се' },
    ],
  },
  {
    id: 5, level: 'A0', icon: '👋', title: 'Перші фрази', subtitle: 'Привітатися і бути ввічливим',
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
    sentences: [
      { en: '¡Hola! ¿Cómo estás?', ua: 'Привіт! Як справи?', tr: '[о]ла к[о]мо ест[а]с' },
      { en: 'Me llamo Ana.',       ua: 'Мене звати Ана.',    tr: 'ме й[а]мо [а]на' },
      { en: 'Sí, por favor.',      ua: 'Так, будь ласка.',   tr: 'с[і] пор фаб[о]р' },
    ],
  },
  {
    id: 6, level: 'A0', icon: '👉', title: 'Це і той', subtitle: 'Показуємо на речі',
    grammar: '<b>este/esta</b> — близько, <b>ese/esa</b> — далі, <b>aquel</b> — далеко.',
    cards: [
      { en: 'esto',    ua: 'це',       tr: '[е]сто' },
      { en: 'eso',     ua: 'те',       tr: '[е]со' },
      { en: 'aquí',    ua: 'тут',      tr: 'ак[і]' },
      { en: 'allí',    ua: 'там',      tr: 'ай[і]' },
      { en: 'bueno',   ua: 'добрий',   tr: 'бу[е]но' },
      { en: 'malo',    ua: 'поганий',  tr: 'м[а]ло' },
      { en: 'grande',  ua: 'великий',  tr: 'гр[а]нде' },
      { en: 'pequeño', ua: 'малий',    tr: 'пек[е]ньйо' },
    ],
    sentences: [
      { en: 'Esto es bueno.',  ua: 'Це добре.',   tr: '[е]сто ес бу[е]но' },
      { en: 'Eso es grande.',  ua: 'Те велике.',  tr: '[е]со ес гр[а]нде' },
      { en: 'Estoy aquí.',     ua: 'Я тут.',      tr: 'ест[о]й ак[і]' },
      { en: 'Es pequeño.',     ua: 'Воно мале.',  tr: 'ес пек[е]ньйо' },
    ],
  },

  /* ================= A1 ================= */
  {
    "id": 7,
    "level": "A1",
    "icon": "🔗",
    "title": "Дієслова ser / estar",
    "subtitle": "ser/estar — 3 часи",
    "type": "verbs",
    "grammar": "ser — постійне; estar — стан/місце. Часи: Теперішній, Минулий (pretérito), Майбутній (futuro: seré, estaré).<br>Приклад: Mañana estaré en casa.",
    "verbs": [
      {
        "inf": "ser",
        "ua": "бути (постійно)",
        "tr": "сер",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "soy",
                "tr": "с[о]й"
              },
              {
                "p": "tú",
                "f": "eres",
                "tr": "[е]рес"
              },
              {
                "p": "él/ella",
                "f": "es",
                "tr": "ес"
              },
              {
                "p": "nosotros",
                "f": "somos",
                "tr": "с[о]мос"
              },
              {
                "p": "vosotros",
                "f": "sois",
                "tr": "с[о]йс"
              },
              {
                "p": "ellos",
                "f": "son",
                "tr": "сон"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "fui",
                "tr": "фу[і]"
              },
              {
                "p": "tú",
                "f": "fuiste",
                "tr": "фу[і]сте"
              },
              {
                "p": "él/ella",
                "f": "fue",
                "tr": "фу[е]"
              },
              {
                "p": "nosotros",
                "f": "fuimos",
                "tr": "фу[і]мос"
              },
              {
                "p": "vosotros",
                "f": "fuisteis",
                "tr": "фу[і]стейс"
              },
              {
                "p": "ellos",
                "f": "fueron",
                "tr": "фу[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "seré",
                "tr": "сер[е]"
              },
              {
                "p": "tú",
                "f": "serás",
                "tr": "сер[а]с"
              },
              {
                "p": "él/ella",
                "f": "será",
                "tr": "сер[а]"
              },
              {
                "p": "nosotros",
                "f": "seremos",
                "tr": "сер[е]мос"
              },
              {
                "p": "vosotros",
                "f": "seréis",
                "tr": "сер[е]йс"
              },
              {
                "p": "ellos",
                "f": "serán",
                "tr": "сер[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "estar",
        "ua": "бути (стан/місце)",
        "tr": "ест[а]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "estoy",
                "tr": "ест[о]й"
              },
              {
                "p": "tú",
                "f": "estás",
                "tr": "ест[а]с"
              },
              {
                "p": "él/ella",
                "f": "está",
                "tr": "ест[а]"
              },
              {
                "p": "nosotros",
                "f": "estamos",
                "tr": "ест[а]мос"
              },
              {
                "p": "vosotros",
                "f": "estáis",
                "tr": "ест[а]йс"
              },
              {
                "p": "ellos",
                "f": "están",
                "tr": "ест[а]н"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "estuve",
                "tr": "ест[у]бе"
              },
              {
                "p": "tú",
                "f": "estuviste",
                "tr": "естуб[і]сте"
              },
              {
                "p": "él/ella",
                "f": "estuvo",
                "tr": "ест[у]бо"
              },
              {
                "p": "nosotros",
                "f": "estuvimos",
                "tr": "естуб[і]мос"
              },
              {
                "p": "vosotros",
                "f": "estuvisteis",
                "tr": "естубіст[е]йс"
              },
              {
                "p": "ellos",
                "f": "estuvieron",
                "tr": "естубь[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "estaré",
                "tr": "естар[е]"
              },
              {
                "p": "tú",
                "f": "estarás",
                "tr": "естар[а]с"
              },
              {
                "p": "él/ella",
                "f": "estará",
                "tr": "естар[а]"
              },
              {
                "p": "nosotros",
                "f": "estaremos",
                "tr": "естар[е]мос"
              },
              {
                "p": "vosotros",
                "f": "estaréis",
                "tr": "естар[е]йс"
              },
              {
                "p": "ellos",
                "f": "estarán",
                "tr": "естар[а]н"
              }
            ]
          }
        ]
      }
    ],
    "cards": [
      {
        "en": "ser",
        "ua": "бути (постійно)",
        "tr": "сер"
      },
      {
        "en": "estar",
        "ua": "бути (стан/місце)",
        "tr": "ест[а]р"
      }
    ],
    "sentences": [
      {
        "en": "Soy estudiante.",
        "ua": "Я студент.",
        "tr": "с[о]й естудь[а]нте"
      },
      {
        "en": "Estoy aquí.",
        "ua": "Я тут.",
        "tr": "ест[о]й ак[і]"
      },
      {
        "en": "Ella está cansada.",
        "ua": "Вона втомлена.",
        "tr": "[е]йя ест[а] канс[а]да"
      }
    ]
  },
  {
    "id": 8,
    "level": "A1",
    "icon": "🏃",
    "title": "Основні дієслова",
    "subtitle": "Спряження: 3 часи",
    "type": "verbs",
    "grammar": "Ключові дієслова часто неправильні. Майбутній = основа + <b>-é/-ás/-á…</b> (tendré, podré, querré).<br>Приклад: Mañana tendré tiempo.",
    "verbs": [
      {
        "inf": "querer",
        "ua": "хотіти",
        "tr": "кер[е]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "quiero",
                "tr": "кь[е]ро"
              },
              {
                "p": "tú",
                "f": "quieres",
                "tr": "кь[е]рес"
              },
              {
                "p": "él/ella",
                "f": "quiere",
                "tr": "кь[е]ре"
              },
              {
                "p": "nosotros",
                "f": "queremos",
                "tr": "кер[е]мос"
              },
              {
                "p": "vosotros",
                "f": "queréis",
                "tr": "кер[е]йс"
              },
              {
                "p": "ellos",
                "f": "quieren",
                "tr": "кь[е]рен"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "quise",
                "tr": "к[і]се"
              },
              {
                "p": "tú",
                "f": "quisiste",
                "tr": "кіс[і]сте"
              },
              {
                "p": "él/ella",
                "f": "quiso",
                "tr": "к[і]со"
              },
              {
                "p": "nosotros",
                "f": "quisimos",
                "tr": "кіс[і]мос"
              },
              {
                "p": "vosotros",
                "f": "quisisteis",
                "tr": "кісіст[е]йс"
              },
              {
                "p": "ellos",
                "f": "quisieron",
                "tr": "кісь[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "querré",
                "tr": "керр[е]"
              },
              {
                "p": "tú",
                "f": "querrás",
                "tr": "керр[а]с"
              },
              {
                "p": "él/ella",
                "f": "querrá",
                "tr": "керр[а]"
              },
              {
                "p": "nosotros",
                "f": "querremos",
                "tr": "керр[е]мос"
              },
              {
                "p": "vosotros",
                "f": "querréis",
                "tr": "керр[е]йс"
              },
              {
                "p": "ellos",
                "f": "querrán",
                "tr": "керр[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "tener",
        "ua": "мати",
        "tr": "тен[е]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "tengo",
                "tr": "т[е]нго"
              },
              {
                "p": "tú",
                "f": "tienes",
                "tr": "ть[е]нес"
              },
              {
                "p": "él/ella",
                "f": "tiene",
                "tr": "ть[е]не"
              },
              {
                "p": "nosotros",
                "f": "tenemos",
                "tr": "тен[е]мос"
              },
              {
                "p": "vosotros",
                "f": "tenéis",
                "tr": "тен[е]йс"
              },
              {
                "p": "ellos",
                "f": "tienen",
                "tr": "ть[е]нен"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "tuve",
                "tr": "т[у]бе"
              },
              {
                "p": "tú",
                "f": "tuviste",
                "tr": "туб[і]сте"
              },
              {
                "p": "él/ella",
                "f": "tuvo",
                "tr": "т[у]бо"
              },
              {
                "p": "nosotros",
                "f": "tuvimos",
                "tr": "туб[і]мос"
              },
              {
                "p": "vosotros",
                "f": "tuvisteis",
                "tr": "тубіст[е]йс"
              },
              {
                "p": "ellos",
                "f": "tuvieron",
                "tr": "тубь[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "tendré",
                "tr": "тендр[е]"
              },
              {
                "p": "tú",
                "f": "tendrás",
                "tr": "тендр[а]с"
              },
              {
                "p": "él/ella",
                "f": "tendrá",
                "tr": "тендр[а]"
              },
              {
                "p": "nosotros",
                "f": "tendremos",
                "tr": "тендр[е]мос"
              },
              {
                "p": "vosotros",
                "f": "tendréis",
                "tr": "тендр[е]йс"
              },
              {
                "p": "ellos",
                "f": "tendrán",
                "tr": "тендр[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "ir",
        "ua": "йти, їхати",
        "tr": "ір",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "voy",
                "tr": "бой"
              },
              {
                "p": "tú",
                "f": "vas",
                "tr": "бас"
              },
              {
                "p": "él/ella",
                "f": "va",
                "tr": "ба"
              },
              {
                "p": "nosotros",
                "f": "vamos",
                "tr": "б[а]мос"
              },
              {
                "p": "vosotros",
                "f": "vais",
                "tr": "байс"
              },
              {
                "p": "ellos",
                "f": "van",
                "tr": "бан"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "fui",
                "tr": "фу[і]"
              },
              {
                "p": "tú",
                "f": "fuiste",
                "tr": "фу[і]сте"
              },
              {
                "p": "él/ella",
                "f": "fue",
                "tr": "фу[е]"
              },
              {
                "p": "nosotros",
                "f": "fuimos",
                "tr": "фу[і]мос"
              },
              {
                "p": "vosotros",
                "f": "fuisteis",
                "tr": "фу[і]стейс"
              },
              {
                "p": "ellos",
                "f": "fueron",
                "tr": "фу[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "iré",
                "tr": "ір[е]"
              },
              {
                "p": "tú",
                "f": "irás",
                "tr": "ір[а]с"
              },
              {
                "p": "él/ella",
                "f": "irá",
                "tr": "ір[а]"
              },
              {
                "p": "nosotros",
                "f": "iremos",
                "tr": "ір[е]мос"
              },
              {
                "p": "vosotros",
                "f": "iréis",
                "tr": "ір[е]йс"
              },
              {
                "p": "ellos",
                "f": "irán",
                "tr": "ір[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "poder",
        "ua": "могти",
        "tr": "под[е]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "puedo",
                "tr": "пу[е]до"
              },
              {
                "p": "tú",
                "f": "puedes",
                "tr": "пу[е]дес"
              },
              {
                "p": "él/ella",
                "f": "puede",
                "tr": "пу[е]де"
              },
              {
                "p": "nosotros",
                "f": "podemos",
                "tr": "под[е]мос"
              },
              {
                "p": "vosotros",
                "f": "podéis",
                "tr": "под[е]йс"
              },
              {
                "p": "ellos",
                "f": "pueden",
                "tr": "пу[е]ден"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "pude",
                "tr": "п[у]де"
              },
              {
                "p": "tú",
                "f": "pudiste",
                "tr": "пуд[і]сте"
              },
              {
                "p": "él/ella",
                "f": "pudo",
                "tr": "п[у]до"
              },
              {
                "p": "nosotros",
                "f": "pudimos",
                "tr": "пуд[і]мос"
              },
              {
                "p": "vosotros",
                "f": "pudisteis",
                "tr": "пудіст[е]йс"
              },
              {
                "p": "ellos",
                "f": "pudieron",
                "tr": "пудь[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "podré",
                "tr": "подр[е]"
              },
              {
                "p": "tú",
                "f": "podrás",
                "tr": "подр[а]с"
              },
              {
                "p": "él/ella",
                "f": "podrá",
                "tr": "подр[а]"
              },
              {
                "p": "nosotros",
                "f": "podremos",
                "tr": "подр[е]мос"
              },
              {
                "p": "vosotros",
                "f": "podréis",
                "tr": "подр[е]йс"
              },
              {
                "p": "ellos",
                "f": "podrán",
                "tr": "подр[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "ver",
        "ua": "бачити",
        "tr": "бер",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "veo",
                "tr": "б[е]о"
              },
              {
                "p": "tú",
                "f": "ves",
                "tr": "бес"
              },
              {
                "p": "él/ella",
                "f": "ve",
                "tr": "бе"
              },
              {
                "p": "nosotros",
                "f": "vemos",
                "tr": "б[е]мос"
              },
              {
                "p": "vosotros",
                "f": "veis",
                "tr": "бейс"
              },
              {
                "p": "ellos",
                "f": "ven",
                "tr": "бен"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "vi",
                "tr": "бі"
              },
              {
                "p": "tú",
                "f": "viste",
                "tr": "б[і]сте"
              },
              {
                "p": "él/ella",
                "f": "vio",
                "tr": "бь[о]"
              },
              {
                "p": "nosotros",
                "f": "vimos",
                "tr": "б[і]мос"
              },
              {
                "p": "vosotros",
                "f": "visteis",
                "tr": "б[і]стейс"
              },
              {
                "p": "ellos",
                "f": "vieron",
                "tr": "бь[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "veré",
                "tr": "бер[е]"
              },
              {
                "p": "tú",
                "f": "verás",
                "tr": "бер[а]с"
              },
              {
                "p": "él/ella",
                "f": "verá",
                "tr": "бер[а]"
              },
              {
                "p": "nosotros",
                "f": "veremos",
                "tr": "бер[е]мос"
              },
              {
                "p": "vosotros",
                "f": "veréis",
                "tr": "бер[е]йс"
              },
              {
                "p": "ellos",
                "f": "verán",
                "tr": "бер[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "saber",
        "ua": "знати",
        "tr": "саб[е]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "sé",
                "tr": "се"
              },
              {
                "p": "tú",
                "f": "sabes",
                "tr": "с[а]бес"
              },
              {
                "p": "él/ella",
                "f": "sabe",
                "tr": "с[а]бе"
              },
              {
                "p": "nosotros",
                "f": "sabemos",
                "tr": "саб[е]мос"
              },
              {
                "p": "vosotros",
                "f": "sabéis",
                "tr": "саб[е]йс"
              },
              {
                "p": "ellos",
                "f": "saben",
                "tr": "с[а]бен"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "supe",
                "tr": "с[у]пе"
              },
              {
                "p": "tú",
                "f": "supiste",
                "tr": "суп[і]сте"
              },
              {
                "p": "él/ella",
                "f": "supo",
                "tr": "с[у]по"
              },
              {
                "p": "nosotros",
                "f": "supimos",
                "tr": "суп[і]мос"
              },
              {
                "p": "vosotros",
                "f": "supisteis",
                "tr": "супіст[е]йс"
              },
              {
                "p": "ellos",
                "f": "supieron",
                "tr": "супь[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "sabré",
                "tr": "сабр[е]"
              },
              {
                "p": "tú",
                "f": "sabrás",
                "tr": "сабр[а]с"
              },
              {
                "p": "él/ella",
                "f": "sabrá",
                "tr": "сабр[а]"
              },
              {
                "p": "nosotros",
                "f": "sabremos",
                "tr": "сабр[е]мос"
              },
              {
                "p": "vosotros",
                "f": "sabréis",
                "tr": "сабр[е]йс"
              },
              {
                "p": "ellos",
                "f": "sabrán",
                "tr": "сабр[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "necesitar",
        "ua": "потребувати",
        "tr": "несесіт[а]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "necesito",
                "tr": "несес[і]то"
              },
              {
                "p": "tú",
                "f": "necesitas",
                "tr": "несес[і]тас"
              },
              {
                "p": "él/ella",
                "f": "necesita",
                "tr": "несес[і]та"
              },
              {
                "p": "nosotros",
                "f": "necesitamos",
                "tr": "несесіт[а]мос"
              },
              {
                "p": "vosotros",
                "f": "necesitáis",
                "tr": "несесіт[а]йс"
              },
              {
                "p": "ellos",
                "f": "necesitan",
                "tr": "несес[і]тан"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "necesité",
                "tr": "несесіт[е]"
              },
              {
                "p": "tú",
                "f": "necesitaste",
                "tr": "несесіт[а]сте"
              },
              {
                "p": "él/ella",
                "f": "necesitó",
                "tr": "несесіт[о]"
              },
              {
                "p": "nosotros",
                "f": "necesitamos",
                "tr": "несесіт[а]мос"
              },
              {
                "p": "vosotros",
                "f": "necesitasteis",
                "tr": "несесітаст[е]йс"
              },
              {
                "p": "ellos",
                "f": "necesitaron",
                "tr": "несесіт[а]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "necesitaré",
                "tr": "несесітар[е]"
              },
              {
                "p": "tú",
                "f": "necesitarás",
                "tr": "несесітар[а]с"
              },
              {
                "p": "él/ella",
                "f": "necesitará",
                "tr": "несесітар[а]"
              },
              {
                "p": "nosotros",
                "f": "necesitaremos",
                "tr": "несесітар[е]мос"
              },
              {
                "p": "vosotros",
                "f": "necesitaréis",
                "tr": "несесітар[е]йс"
              },
              {
                "p": "ellos",
                "f": "necesitarán",
                "tr": "несесітар[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "gustar",
        "ua": "подобатись",
        "tr": "густ[а]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "мені (me)",
                "f": "me gusta",
                "tr": "ме г[у]ста"
              },
              {
                "p": "тобі (te)",
                "f": "te gusta",
                "tr": "те г[у]ста"
              },
              {
                "p": "йому/їй (le)",
                "f": "le gusta",
                "tr": "ле г[у]ста"
              },
              {
                "p": "нам (nos)",
                "f": "nos gusta",
                "tr": "нос г[у]ста"
              },
              {
                "p": "вам (os)",
                "f": "os gusta",
                "tr": "ос г[у]ста"
              },
              {
                "p": "їм (les)",
                "f": "les gusta",
                "tr": "лес г[у]ста"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "мені (me)",
                "f": "me gustó",
                "tr": "ме густ[о]"
              },
              {
                "p": "тобі (te)",
                "f": "te gustó",
                "tr": "те густ[о]"
              },
              {
                "p": "йому/їй (le)",
                "f": "le gustó",
                "tr": "ле густ[о]"
              },
              {
                "p": "нам (nos)",
                "f": "nos gustó",
                "tr": "нос густ[о]"
              },
              {
                "p": "вам (os)",
                "f": "os gustó",
                "tr": "ос густ[о]"
              },
              {
                "p": "їм (les)",
                "f": "les gustó",
                "tr": "лес густ[о]"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "мені (me)",
                "f": "me gustará",
                "tr": "ме густар[а]"
              },
              {
                "p": "тобі (te)",
                "f": "te gustará",
                "tr": "те густар[а]"
              },
              {
                "p": "йому/їй (le)",
                "f": "le gustará",
                "tr": "ле густар[а]"
              },
              {
                "p": "нам (nos)",
                "f": "nos gustará",
                "tr": "нос густар[а]"
              },
              {
                "p": "вам (os)",
                "f": "os gustará",
                "tr": "ос густар[а]"
              },
              {
                "p": "їм (les)",
                "f": "les gustará",
                "tr": "лес густар[а]"
              }
            ]
          }
        ]
      }
    ],
    "cards": [
      {
        "en": "querer",
        "ua": "хотіти",
        "tr": "кер[е]р"
      },
      {
        "en": "tener",
        "ua": "мати",
        "tr": "тен[е]р"
      },
      {
        "en": "ir",
        "ua": "йти, їхати",
        "tr": "ір"
      },
      {
        "en": "poder",
        "ua": "могти",
        "tr": "под[е]р"
      },
      {
        "en": "ver",
        "ua": "бачити",
        "tr": "бер"
      },
      {
        "en": "saber",
        "ua": "знати",
        "tr": "саб[е]р"
      },
      {
        "en": "necesitar",
        "ua": "потребувати",
        "tr": "несесіт[а]р"
      },
      {
        "en": "gustar",
        "ua": "подобатись",
        "tr": "густ[а]р"
      }
    ],
    "sentences": [
      {
        "en": "Quiero un café.",
        "ua": "Я хочу каву.",
        "tr": "кь[е]ро ун каф[е]"
      },
      {
        "en": "Tengo una hermana.",
        "ua": "У мене є сестра.",
        "tr": "т[е]нго [у]на ерм[а]на"
      },
      {
        "en": "Me gusta el té.",
        "ua": "Мені подобається чай.",
        "tr": "ме г[у]ста ель те"
      }
    ]
  },
  {
    id: 9, level: 'A1', icon: '👨‍👩‍👧', title: 'Родина', subtitle: 'Найближчі люди',
    grammar: 'Присвійні: <b>mi</b> (мій), <b>tu</b> (твій), <b>su</b> (його/її): <b>mi</b> madre, <b>su</b> hermano.',
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
    sentences: [
      { en: 'Esta es mi madre.',    ua: 'Це моя мама.',   tr: '[е]ста ес мі м[а]дре' },
      { en: 'Tengo un hermano.',    ua: 'У мене є брат.', tr: 'т[е]нго ун ерм[а]но' },
      { en: 'Somos una familia.',   ua: 'Ми родина.',     tr: 'с[о]мос [у]на фам[і]ліа' },
    ],
  },
  {
    id: 10, level: 'A1', icon: '🎨', title: 'Кольори', subtitle: 'Основні кольори',
    grammar: 'Колір ставимо після іменника й узгоджуємо: dos coches <b>rojos</b>, dos casas <b>rojas</b>.',
    cards: [
      { en: 'rojo',     ua: 'червоний',     tr: 'р[о]хо' },
      { en: 'azul',     ua: 'синій',        tr: 'ас[у]ль' },
      { en: 'verde',    ua: 'зелений',      tr: 'б[е]рде' },
      { en: 'amarillo', ua: 'жовтий',       tr: 'амар[і]йо' },
      { en: 'negro',    ua: 'чорний',       tr: 'н[е]гро' },
      { en: 'blanco',   ua: 'білий',        tr: 'бл[а]нко' },
      { en: 'naranja',  ua: 'помаранчевий', tr: 'нар[а]нха' },
      { en: 'rosa',     ua: 'рожевий',      tr: 'р[о]са' },
      { en: 'marrón',   ua: 'коричневий',   tr: 'марр[о]н' },
      { en: 'gris',     ua: 'сірий',        tr: 'гр[і]с' },
    ],
    sentences: [
      { en: 'El cielo es azul.',    ua: 'Небо синє.',                 tr: 'ель сь[е]ло ес ас[у]ль' },
      { en: 'Me gusta el rojo.',    ua: 'Мені подобається червоний.', tr: 'ме г[у]ста ель р[о]хо' },
      { en: 'La manzana es verde.', ua: 'Яблуко зелене.',             tr: 'ла манс[а]на ес б[е]рде' },
    ],
  },
  {
    id: 11, level: 'A1', icon: '📅', title: 'Дні тижня', subtitle: 'Від понеділка до неділі',
    grammar: 'Дні — з малої літери й з артиклем <b>el</b>: <b>el</b> lunes (у понеділок).',
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
    sentences: [
      { en: 'Nos vemos el lunes.', ua: 'Побачимось у понеділок.', tr: 'нос б[е]мос ель л[у]нес' },
      { en: 'Hoy es viernes.',     ua: "Сьогодні п'ятниця.",      tr: '[о]й ес бь[е]рнес' },
      { en: 'Mañana es domingo.',  ua: 'Завтра неділя.',          tr: 'мань[а]на ес дом[і]нго' },
    ],
  },
  {
    id: 12, level: 'A1', icon: '🍂', title: 'Місяці і пори року', subtitle: 'Календар',
    grammar: 'Місяці — з малої літери й з прийменником <b>en</b>: <b>en</b> julio, <b>en</b> verano.',
    cards: [
      { en: 'primavera', ua: 'весна',     tr: 'прімаб[е]ра' },
      { en: 'verano',    ua: 'літо',      tr: 'бер[а]но' },
      { en: 'otoño',     ua: 'осінь',     tr: 'от[о]ньйо' },
      { en: 'invierno',  ua: 'зима',      tr: 'інбь[е]рно' },
      { en: 'enero',     ua: 'січень',    tr: 'ен[е]ро' },
      { en: 'julio',     ua: 'липень',    tr: 'х[у]ліо' },
      { en: 'mes',       ua: 'місяць',    tr: 'мес' },
      { en: 'año',       ua: 'рік',       tr: '[а]ньйо' },
      { en: 'semana',    ua: 'тиждень',   tr: 'сем[а]на' },
    ],
    sentences: [
      { en: 'El verano es caluroso.', ua: 'Літо спекотне.',          tr: 'ель бер[а]но ес калур[о]со' },
      { en: 'Me gusta el otoño.',     ua: 'Мені подобається осінь.', tr: 'ме г[у]ста ель от[о]ньйо' },
      { en: 'Es un año largo.',       ua: 'Це довгий рік.',          tr: 'ес ун [а]ньйо л[а]рго' },
    ],
  },
  {
    id: 13, level: 'A1', icon: '🍎', title: 'Їжа і напої', subtitle: 'Що їмо і п’ємо',
    grammar: 'Артикль за родом: <b>el</b> (чол.) — el pan, <b>la</b> (жін.) — la leche.',
    cards: [
      { en: 'agua',    ua: 'вода',   tr: '[а]гуа' },
      { en: 'pan',     ua: 'хліб',   tr: 'пан' },
      { en: 'café',    ua: 'кава',   tr: 'каф[е]' },
      { en: 'té',      ua: 'чай',    tr: 'те' },
      { en: 'manzana', ua: 'яблуко', tr: 'манс[а]на' },
      { en: 'leche',   ua: 'молоко', tr: 'л[е]че' },
      { en: 'carne',   ua: "м'ясо",  tr: 'к[а]рне' },
      { en: 'huevo',   ua: 'яйце',   tr: 'у[е]бо' },
      { en: 'queso',   ua: 'сир',    tr: 'к[е]со' },
      { en: 'arroz',   ua: 'рис',    tr: 'арр[о]с' },
    ],
    sentences: [
      { en: 'Quiero agua, por favor.', ua: 'Я хочу води, будь ласка.', tr: 'кь[е]ро [а]гуа пор фаб[о]р' },
      { en: '¿Café o té?',             ua: 'Кава чи чай?',             tr: 'каф[е] о те' },
      { en: 'Me gusta el pan.',        ua: 'Мені подобається хліб.',   tr: 'ме г[у]ста ель пан' },
    ],
  },
  {
    id: 14, level: 'A1', icon: '🧍', title: 'Тіло', subtitle: 'Частини тіла',
    cards: [
      { en: 'mano',   ua: 'рука',    tr: 'м[а]но' },
      { en: 'ojo',    ua: 'око',     tr: '[о]хо' },
      { en: 'oreja',  ua: 'вухо',    tr: 'ор[е]ха' },
      { en: 'nariz',  ua: 'ніс',     tr: 'нар[і]с' },
      { en: 'boca',   ua: 'рот',     tr: 'б[о]ка' },
      { en: 'pierna', ua: 'нога',    tr: 'пь[е]рна' },
      { en: 'pelo',   ua: 'волосся', tr: 'п[е]ло' },
      { en: 'cara',   ua: 'обличчя', tr: 'к[а]ра' },
      { en: 'dedo',   ua: 'палець',  tr: 'д[е]до' },
      { en: 'diente', ua: 'зуб',     tr: 'дь[е]нте' },
    ],
    sentences: [
      { en: 'Me duele la mano.',    ua: 'У мене болить рука.',   tr: 'ме ду[е]ле ла м[а]но' },
      { en: 'Sus ojos son azules.', ua: 'Її очі сині.',          tr: 'сус [о]хос сон ас[у]лес' },
      { en: 'Tengo el pelo largo.', ua: 'У мене довге волосся.', tr: 'т[е]нго ель п[е]ло л[а]рго' },
    ],
  },
  {
    id: 15, level: 'A1', icon: '👕', title: 'Одяг', subtitle: 'Що вдягаємо',
    cards: [
      { en: 'camisa',     ua: 'сорочка',   tr: 'кам[і]са' },
      { en: 'pantalón',   ua: 'штани',     tr: 'пантал[о]н' },
      { en: 'zapatos',    ua: 'взуття',    tr: 'сап[а]тос' },
      { en: 'vestido',    ua: 'сукня',     tr: 'бест[і]до' },
      { en: 'chaqueta',   ua: 'куртка',    tr: 'чак[е]та' },
      { en: 'sombrero',   ua: 'капелюх',   tr: 'сомбр[е]ро' },
      { en: 'calcetines', ua: 'шкарпетки', tr: 'калсет[і]нес' },
      { en: 'abrigo',     ua: 'пальто',    tr: 'абр[і]го' },
      { en: 'cinturón',   ua: 'пояс',      tr: 'сінтур[о]н' },
      { en: 'gafas',      ua: 'окуляри',   tr: 'г[а]фас' },
    ],
    sentences: [
      { en: 'Me gusta este vestido.',    ua: 'Мені подобається ця сукня.', tr: 'ме г[у]ста [е]сте бест[і]до' },
      { en: 'Los zapatos son nuevos.',   ua: 'Взуття нове.',               tr: 'лос сап[а]тос сон ну[е]бос' },
      { en: '¿Dónde está mi sombrero?',  ua: 'Де мій капелюх?',            tr: 'д[о]нде ест[а] мі сомбр[е]ро' },
    ],
  },

  /* ================= A2 ================= */
  {
    id: 16, level: 'A2', icon: '☕', title: 'У кафе', subtitle: 'Замовити і розрахуватись',
    grammar: 'Ввічливе прохання: <b>¿Me trae…?</b> або <b>Quisiera…</b> + що саме.',
    cards: [
      { en: 'menú',      ua: 'меню',       tr: 'мен[у]' },
      { en: 'cuenta',    ua: 'рахунок',    tr: 'ку[е]нта' },
      { en: 'pedido',    ua: 'замовлення', tr: 'пед[і]до' },
      { en: 'mesa',      ua: 'столик',     tr: 'м[е]са' },
      { en: 'camarero',  ua: 'офіціант',   tr: 'камар[е]ро' },
      { en: 'delicioso', ua: 'смачно',     tr: 'делісь[о]со' },
      { en: 'cuánto',    ua: 'скільки',    tr: 'ку[а]нто' },
      { en: 'quisiera',  ua: 'я б хотів',  tr: 'кісь[е]ра' },
    ],
    sentences: [
      { en: '¿Me trae el menú?',    ua: 'Принесете меню?',      tr: 'ме тр[а]е ель мен[у]' },
      { en: 'La cuenta, por favor.', ua: 'Рахунок, будь ласка.', tr: 'ла ку[е]нта пор фаб[о]р' },
      { en: 'La comida es deliciosa.', ua: 'Їжа смачна.',        tr: 'ла ком[і]да ес делісь[о]са' },
    ],
  },
  {
    id: 17, level: 'A2', icon: '🕒', title: 'Час', subtitle: 'Котра година',
    grammar: 'Котра година: <b>Son las</b> + число (Son las tres). Для 1-ї: <b>Es la</b> una.',
    cards: [
      { en: 'hora',    ua: 'година',     tr: '[о]ра' },
      { en: 'minuto',  ua: 'хвилина',    tr: 'мін[у]то' },
      { en: 'ahora',   ua: 'зараз',      tr: 'а[о]ра' },
      { en: 'temprano', ua: 'рано',      tr: 'темпр[а]но' },
      { en: 'tarde',   ua: 'пізно',      tr: 'т[а]рде' },
      { en: 'mañana',  ua: 'ранок',      tr: 'мань[а]на' },
      { en: 'noche',   ua: 'вечір, ніч', tr: 'н[о]че' },
      { en: '¿qué hora es?', ua: 'котра година?', tr: 'ке [о]ра ес' },
    ],
    sentences: [
      { en: 'Son las tres.',    ua: 'Зараз третя.',  tr: 'сон лас трес' },
      { en: 'Llego tarde.',     ua: 'Я запізнююсь.', tr: 'й[е]го т[а]рде' },
      { en: 'Hasta la mañana.', ua: 'До ранку.',     tr: '[а]ста ла мань[а]на' },
    ],
  },
  {
    id: 18, level: 'A2', icon: '🌦️', title: 'Погода', subtitle: 'Яка погода надворі',
    grammar: 'Про погоду — через <b>hace</b>: <b>hace</b> frío (холодно), <b>hace</b> calor (спекотно).',
    cards: [
      { en: 'sol',    ua: 'сонце',  tr: 'соль' },
      { en: 'lluvia', ua: 'дощ',    tr: 'й[у]бія' },
      { en: 'nieve',  ua: 'сніг',   tr: 'нь[е]бе' },
      { en: 'viento', ua: 'вітер',  tr: 'бь[е]нто' },
      { en: 'calor',  ua: 'спека',  tr: 'кал[о]р' },
      { en: 'frío',   ua: 'холод',  tr: 'фр[і]о' },
      { en: 'nube',   ua: 'хмара',  tr: 'н[у]бе' },
      { en: 'tiempo', ua: 'погода', tr: 'ть[е]мпо' },
      { en: 'tormenta', ua: 'буря',  tr: 'торм[е]нта' },
      { en: 'niebla',   ua: 'туман', tr: 'нь[е]бла' },
    ],
    sentences: [
      { en: 'Está lloviendo.',    ua: 'Іде дощ.',               tr: 'ест[а] йобь[е]ндо' },
      { en: 'Hoy hace frío.',     ua: 'Сьогодні холодно.',      tr: '[о]й [а]се фр[і]о' },
      { en: 'Me gusta la nieve.', ua: 'Мені подобається сніг.', tr: 'ме г[у]ста ла нь[е]бе' },
    ],
  },
  {
    id: 19, level: 'A2', icon: '🏠', title: 'Дім', subtitle: 'Будинок і кімнати',
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
    sentences: [
      { en: 'Mi cuarto es pequeño.', ua: 'Моя кімната маленька.', tr: 'мі ку[а]рто ес пек[е]ньйо' },
      { en: 'Abre la puerta.',       ua: 'Відчини двері.',        tr: '[а]бре ла пу[е]рта' },
      { en: 'La cocina es grande.',  ua: 'Кухня велика.',         tr: 'ла кос[і]на ес гр[а]нде' },
    ],
  },
  {
    id: 20, level: 'A2', icon: '🏙️', title: 'Місто', subtitle: 'Орієнтуємось у місті',
    cards: [
      { en: 'ciudad',    ua: 'місто',    tr: 'сьюд[а]д' },
      { en: 'calle',     ua: 'вулиця',   tr: 'к[а]йе' },
      { en: 'tienda',    ua: 'магазин',  tr: 'ть[е]нда' },
      { en: 'dinero',    ua: 'гроші',    tr: 'дін[е]ро' },
      { en: 'autobús',   ua: 'автобус',  tr: 'аутоб[у]с' },
      { en: 'estación',  ua: 'станція',  tr: 'естась[о]н' },
      { en: 'izquierda', ua: 'ліворуч',  tr: 'іскь[е]рда' },
      { en: 'derecha',   ua: 'праворуч', tr: 'дер[е]ча' },
    ],
    sentences: [
      { en: '¿Dónde está la estación?',      ua: 'Де станція?',        tr: 'д[о]нде ест[а] ла естась[о]н' },
      { en: 'La tienda está a la izquierda.', ua: 'Магазин ліворуч.',  tr: 'ла ть[е]нда ест[а] а ла іскь[е]рда' },
      { en: 'Necesito dinero.',              ua: 'Мені потрібні гроші.', tr: 'несес[і]то дін[е]ро' },
    ],
  },
  {
    id: 21, level: 'A2', icon: '🚗', title: 'Транспорт', subtitle: 'Як пересуватися',
    grammar: 'Спосіб пересування — прийменник <b>en</b>: <b>en</b> coche, <b>en</b> tren, <b>en</b> avión.',
    cards: [
      { en: 'coche',     ua: 'авто',       tr: 'к[о]че' },
      { en: 'tren',      ua: 'потяг',      tr: 'трен' },
      { en: 'avión',     ua: 'літак',      tr: 'абь[о]н' },
      { en: 'bici',      ua: 'велосипед',  tr: 'б[і]сі' },
      { en: 'taxi',      ua: 'таксі',      tr: 'т[а]ксі' },
      { en: 'barco',     ua: 'корабель',   tr: 'б[а]рко' },
      { en: 'carretera', ua: 'дорога',     tr: 'карет[е]ра' },
      { en: 'conducir',  ua: 'керувати',   tr: 'кондус[і]р' },
    ],
    sentences: [
      { en: 'Voy en coche.',       ua: 'Я їду машиною.',    tr: 'бой ен к[о]че' },
      { en: 'El tren llega tarde.', ua: 'Потяг спізнюється.', tr: 'ель трен й[е]га т[а]рде' },
      { en: '¿Sabes conducir?',    ua: 'Ти вмієш водити?',  tr: 'с[а]бес кондус[і]р' },
    ],
  },
  {
    id: 22, level: 'A2', icon: '🛒', title: 'Покупки', subtitle: 'У магазині',
    grammar: 'Ціна: <b>¿Cuánto cuesta?</b> Оплата: pagar <b>con</b> tarjeta або <b>en</b> efectivo.',
    cards: [
      { en: 'precio',    ua: 'ціна',     tr: 'пр[е]сіо' },
      { en: 'barato',    ua: 'дешевий',  tr: 'бар[а]то' },
      { en: 'caro',      ua: 'дорогий',  tr: 'к[а]ро' },
      { en: 'comprar',   ua: 'купувати', tr: 'компр[а]р' },
      { en: 'pagar',     ua: 'платити',  tr: 'паг[а]р' },
      { en: 'talla',     ua: 'розмір',   tr: 'т[а]йя' },
      { en: 'tarjeta',   ua: 'картка',   tr: 'тарх[е]та' },
      { en: 'efectivo',  ua: 'готівка',  tr: 'ефект[і]бо' },
    ],
    sentences: [
      { en: '¿Cuánto cuesta?',           ua: 'Скільки коштує?',        tr: 'ку[а]нто ку[е]ста' },
      { en: 'Es muy caro.',              ua: 'Це дуже дорого.',        tr: 'ес муй к[а]ро' },
      { en: 'Quiero pagar con tarjeta.', ua: 'Я хочу платити карткою.', tr: 'кь[е]ро паг[а]р кон тарх[е]та' },
    ],
  },
  {
    id: 23, level: 'A2', icon: '📏', title: 'Описи', subtitle: 'Прикметники',
    grammar: 'В іспанській прикметник ставимо <b>після</b> іменника й узгоджуємо в роді: coche roj<b>o</b> (авто червоне), casa roj<b>a</b> (хата червона).',
    cards: [
      { en: 'alto',    ua: 'високий',   tr: '[а]льто' },
      { en: 'bajo',    ua: 'низький',   tr: 'б[а]хо' },
      { en: 'fácil',   ua: 'легкий',    tr: 'ф[а]сіль' },
      { en: 'difícil', ua: 'важкий',    tr: 'діф[і]сіль' },
      { en: 'rápido',  ua: 'швидкий',   tr: 'р[а]підо' },
      { en: 'lento',   ua: 'повільний', tr: 'л[е]нто' },
      { en: 'bonito',  ua: 'гарний',    tr: 'бон[і]то' },
      { en: 'fuerte',  ua: 'сильний',   tr: 'фу[е]рте' },
    ],
    sentences: [
      { en: 'Él es muy alto.',       ua: 'Він дуже високий.', tr: 'ель ес муй [а]льто' },
      { en: 'Esto es muy difícil.',  ua: 'Це дуже важко.',    tr: '[е]сто ес муй діф[і]сіль' },
      { en: 'El coche es rápido.',   ua: 'Авто швидке.',      tr: 'ель к[о]че ес р[а]підо' },
    ],
  },
  {
    id: 24, level: 'A2', icon: '📍', title: 'Прийменники місця', subtitle: 'Де що знаходиться',
    grammar: 'Прийменник + місце: <b>en</b> el coche (в авто), <b>debajo de</b> la mesa (під столом). «de + el» зливається в <b>del</b>.',
    cards: [
      { en: 'en',         ua: 'в, на',  tr: 'ен' },
      { en: 'sobre',      ua: 'на (поверх)', tr: 'с[о]бре' },
      { en: 'debajo de',  ua: 'під',    tr: 'деб[а]хо де' },
      { en: 'detrás de',  ua: 'позаду', tr: 'детр[а]с де' },
      { en: 'al lado de', ua: 'поруч з', tr: 'аль л[а]до де' },
      { en: 'entre',      ua: 'між',    tr: '[е]нтре' },
      { en: 'encima de',  ua: 'над',    tr: 'енс[і]ма де' },
      { en: 'dentro',     ua: 'всередині', tr: 'д[е]нтро' },
    ],
    sentences: [
      { en: 'Estoy en el coche.',        ua: 'Я в авто.',        tr: 'ест[о]й ен ель к[о]че' },
      { en: 'Está debajo de la mesa.',   ua: 'Воно під столом.', tr: 'ест[а] деб[а]хо де ла м[е]са' },
      { en: 'La tienda está entre dos casas.', ua: 'Магазин між двома будинками.', tr: 'ла ть[е]нда ест[а] [е]нтре дос к[а]сас' },
    ],
  },

  /* ================= B1 ================= */
  {
    id: 25, level: 'B1', icon: '✈️', title: 'Подорожі', subtitle: 'Аеропорт і готель',
    grammar: 'Напрямок — прийменник <b>a</b>: viajo <b>a</b> Madrid. Готель: <b>reservé</b> un hotel.',
    cards: [
      { en: 'aeropuerto', ua: 'аеропорт',    tr: 'аеропу[е]рто' },
      { en: 'billete',    ua: 'квиток',      tr: 'бій[е]те' },
      { en: 'equipaje',   ua: 'багаж',       tr: 'екіп[а]хе' },
      { en: 'pasaporte',  ua: 'паспорт',     tr: 'пасап[о]рте' },
      { en: 'hotel',      ua: 'готель',      tr: 'от[е]ль' },
      { en: 'vuelo',      ua: 'рейс',        tr: 'бу[е]ло' },
      { en: 'reservar',   ua: 'забронювати', tr: 'ресерб[а]р' },
      { en: 'llegada',    ua: 'прибуття',    tr: 'йег[а]да' },
      { en: 'maleta',     ua: 'валіза',      tr: 'мал[е]та' },
      { en: 'retraso',    ua: 'затримка',    tr: 'ретр[а]со' },
    ],
    sentences: [
      { en: 'Reservé un hotel.',        ua: 'Я забронював готель.', tr: 'ресерб[е] ун от[е]ль' },
      { en: 'El vuelo tiene retraso.',  ua: 'Рейс затримується.',   tr: 'ель бу[е]ло ть[е]не ретр[а]со' },
      { en: 'Necesito mi pasaporte.',   ua: 'Мені потрібен паспорт.', tr: 'несес[і]то мі пасап[о]рте' },
    ],
  },
  {
    id: 26, level: 'B1', icon: '💼', title: 'Робота', subtitle: 'Офіс і професії',
    cards: [
      { en: 'trabajo',    ua: 'робота',    tr: 'траб[а]хо' },
      { en: 'oficina',    ua: 'офіс',      tr: 'офіс[і]на' },
      { en: 'reunión',    ua: 'зустріч',   tr: 'реунь[о]н' },
      { en: 'jefe',       ua: 'начальник', tr: 'х[е]фе' },
      { en: 'sueldo',     ua: 'зарплата',  tr: 'су[е]льдо' },
      { en: 'compañero',  ua: 'колега',    tr: 'компань[е]ро' },
      { en: 'empresa',    ua: 'фірма',     tr: 'емпр[е]са' },
      { en: 'trabajar',   ua: 'працювати', tr: 'трабах[а]р' },
      { en: 'correo',     ua: 'імейл',     tr: 'кор[е]о' },
      { en: 'proyecto',   ua: 'проєкт',    tr: 'про[е]кто' },
    ],
    sentences: [
      { en: 'Tengo una reunión.',          ua: 'У мене зустріч.',       tr: 'т[е]нго [у]на реунь[о]н' },
      { en: 'Ella trabaja en una oficina.', ua: 'Вона працює в офісі.', tr: '[е]йя траб[а]ха ен [у]на офіс[і]на' },
      { en: 'El proyecto es importante.',   ua: 'Проєкт важливий.',     tr: 'ель про[е]кто ес імпорт[а]нте' },
    ],
  },
  {
    id: 27, level: 'B1', icon: '🩺', title: 'Здоров’я', subtitle: 'У лікаря',
    grammar: 'Біль: <b>Me duele</b> + частина тіла: Me duele la cabeza (болить голова).',
    cards: [
      { en: 'médico',    ua: 'лікар',    tr: 'м[е]діко' },
      { en: 'dolor',     ua: 'біль',     tr: 'дол[о]р' },
      { en: 'medicina',  ua: 'ліки',     tr: 'медіс[і]на' },
      { en: 'enfermo',   ua: 'хворий',   tr: 'енф[е]рмо' },
      { en: 'cabeza',    ua: 'голова',   tr: 'каб[е]са' },
      { en: 'doler',     ua: 'боліти',   tr: 'дол[е]р' },
      { en: 'sano',      ua: 'здоровий', tr: 'с[а]но' },
      { en: 'hospital',  ua: 'лікарня',  tr: 'оспіт[а]ль' },
      { en: 'resfriado', ua: 'застуда',  tr: 'ресфрі[а]до' },
      { en: 'cansado',   ua: 'втомлений', tr: 'канс[а]до' },
    ],
    sentences: [
      { en: 'Estoy enfermo.',       ua: 'Я хворий.',             tr: 'ест[о]й енф[е]рмо' },
      { en: 'Me duele la cabeza.',  ua: 'У мене болить голова.', tr: 'ме ду[е]ле ла каб[е]са' },
      { en: 'Estoy muy cansado.',   ua: 'Я дуже втомлений.',     tr: 'ест[о]й муй канс[а]до' },
    ],
  },
  {
    id: 28, level: 'B1', icon: '⏪', title: 'Минулий час', subtitle: 'Розповідаємо про вчора',
    grammar: 'Минуле (форма «я»): -ar → <b>-é</b> (hablé — я сказав), -er/-ir → <b>-í</b> (comí — я з’їв). Неправильні: ir → <b>fui</b>, hacer → <b>hice</b>.',
    cards: [
      { en: 'ayer',   ua: 'вчора',        tr: 'ай[е]р' },
      { en: 'fui',    ua: 'я був / пішов', tr: 'фу[і]' },
      { en: 'era',    ua: 'був (стан)',   tr: '[е]ра' },
      { en: 'estuve', ua: 'я перебував',  tr: 'ест[у]бе' },
      { en: 'hice',   ua: 'я зробив',     tr: '[і]се' },
      { en: 'vi',     ua: 'я бачив',      tr: 'бі' },
      { en: 'pasado', ua: 'минулий',      tr: 'пас[а]до' },
      { en: 'hace',   ua: 'тому (назад)', tr: '[а]се' },
    ],
    sentences: [
      { en: 'Ayer estuve en casa.', ua: 'Вчора я був удома.',  tr: 'ай[е]р ест[у]бе ен к[а]са' },
      { en: 'Fuimos al parque.',    ua: 'Ми ходили в парк.',   tr: 'фу[і]мос аль п[а]рке' },
      { en: 'Lo hice ayer.',        ua: 'Я зробив це вчора.',  tr: 'ло [і]се ай[е]р' },
    ],
  },
  {
    id: 29, level: 'B1', icon: '😊', title: 'Почуття і характер', subtitle: 'Описуємо людей і настрій',
    grammar: 'Тимчасовий стан — через <b>estar</b>: <b>estoy</b> feliz, <b>está</b> cansado (не ser).',
    cards: [
      { en: 'feliz',       ua: 'щасливий',  tr: 'фел[і]с' },
      { en: 'triste',      ua: 'сумний',    tr: 'тр[і]сте' },
      { en: 'enfadado',    ua: 'злий',      tr: 'енфад[а]до' },
      { en: 'asustado',    ua: 'наляканий', tr: 'асуст[а]до' },
      { en: 'amable',      ua: 'добрий',    tr: 'ам[а]бле' },
      { en: 'inteligente', ua: 'розумний',  tr: 'інтеліх[е]нте' },
      { en: 'divertido',   ua: 'смішний',   tr: 'діберт[і]до' },
      { en: 'aburrido',    ua: 'знуджений', tr: 'абур[і]до' },
    ],
    sentences: [
      { en: 'Estoy muy feliz.',       ua: 'Я дуже щасливий.', tr: 'ест[о]й муй фел[і]с' },
      { en: 'Ella no está enfadada.', ua: 'Вона не зла.',     tr: '[е]йя но ест[а] енфад[а]да' },
      { en: 'Él es muy amable.',      ua: 'Він дуже добрий.', tr: 'ель ес муй ам[а]бле' },
    ],
  },
  {
    id: 30, level: 'B1', icon: '⏩', title: 'Майбутній час', subtitle: 'Плани й наміри',
    grammar: 'Наміри/майбутнє: <b>ir a</b> + дієслово: <b>voy a</b> viajar (я збираюсь подорожувати), <b>vamos a</b> comer (ми зараз їстимемо).',
    cards: [
      { en: 'futuro',   ua: 'майбутнє',   tr: 'фут[у]ро' },
      { en: 'ir a',     ua: 'збиратися',  tr: 'ір а' },
      { en: 'pronto',   ua: 'скоро',      tr: 'пр[о]нто' },
      { en: 'luego',    ua: 'пізніше',    tr: 'лу[е]го' },
      { en: 'próximo',  ua: 'наступний',  tr: 'пр[о]ксімо' },
      { en: 'plan',     ua: 'план',       tr: 'план' },
      { en: 'esperar',  ua: 'сподіватися', tr: 'еспер[а]р' },
      { en: 'después',  ua: 'потім',      tr: 'десп[у]ес' },
    ],
    sentences: [
      { en: 'Te ayudaré.',      ua: 'Я тобі допоможу.',           tr: 'те аюдар[е]' },
      { en: 'Vamos a viajar.',  ua: 'Ми збираємось подорожувати.', tr: 'б[а]мос а біах[а]р' },
      { en: 'Hasta pronto.',    ua: 'До скорого.',                tr: '[а]ста пр[о]нто' },
    ],
  },
  {
    id: 31, level: 'B1', icon: '🌳', title: 'Природа', subtitle: 'Світ навколо',
    cards: [
      { en: 'árbol',    ua: 'дерево',  tr: '[а]рболь' },
      { en: 'río',      ua: 'річка',   tr: 'р[і]о' },
      { en: 'montaña',  ua: 'гора',    tr: 'монт[а]ньйа' },
      { en: 'mar',      ua: 'море',    tr: 'мар' },
      { en: 'cielo',    ua: 'небо',    tr: 'сь[е]ло' },
      { en: 'flor',     ua: 'квітка',  tr: 'флор' },
      { en: 'bosque',   ua: 'ліс',     tr: 'б[о]ске' },
      { en: 'animal',   ua: 'тварина', tr: 'анім[а]ль' },
    ],
    sentences: [
      { en: 'El mar es azul.',         ua: 'Море синє.',             tr: 'ель мар ес ас[у]ль' },
      { en: 'Me gustan las montañas.', ua: 'Мені подобаються гори.', tr: 'ме г[у]стан лас монт[а]ньяс' },
      { en: 'Hay un árbol grande.',    ua: 'Там велике дерево.',     tr: 'ай ун [а]рболь гр[а]нде' },
    ],
  },

  /* ================= B2 ================= */
  {
    id: 32, level: 'B2', icon: '💭', title: 'Думки і аргументи', subtitle: 'Висловити позицію',
    grammar: 'Зʼєднуємо думки: <b>porque</b> (бо), <b>sin embargo</b> (однак), <b>aunque</b> (хоча).',
    cards: [
      { en: 'opinión',          ua: 'думка',         tr: 'опінь[о]н' },
      { en: 'estar de acuerdo', ua: 'погоджуватись', tr: 'ест[а]р де аку[е]рдо' },
      { en: 'sin embargo',      ua: 'однак',         tr: 'сін емб[а]рго' },
      { en: 'porque',           ua: 'тому що',       tr: 'п[о]рке' },
      { en: 'aunque',           ua: 'хоча',          tr: '[а]унке' },
      { en: 'quizás',           ua: 'можливо',       tr: 'кіс[а]с' },
      { en: 'razón',            ua: 'причина',       tr: 'рас[о]н' },
      { en: 'creo que',         ua: 'я думаю, що',   tr: 'кр[е]о ке' },
    ],
    sentences: [
      { en: 'Estoy de acuerdo contigo.',      ua: 'Я з тобою згоден.',         tr: 'ест[о]й де аку[е]рдо конт[і]го' },
      { en: 'Sin embargo, es difícil.',       ua: 'Однак це важко.',           tr: 'сін емб[а]рго ес діф[і]сіль' },
      { en: 'Creo que necesitamos un plan.',  ua: 'Думаю, нам потрібен план.', tr: 'кр[е]о ке несесіт[а]мос ун план' },
    ],
  },
  {
    id: 33, level: 'B2', icon: '📈', title: 'Бізнес', subtitle: 'Компанія і гроші',
    grammar: 'Зараз відбувається — <b>estar</b> + gerundio: el mercado <b>está creciendo</b>.',
    cards: [
      { en: 'compañía',    ua: 'компанія',    tr: 'компань[і]а' },
      { en: 'cliente',     ua: 'клієнт',      tr: 'клі[е]нте' },
      { en: 'ganancia',    ua: 'прибуток',    tr: 'ган[а]нсія' },
      { en: 'mercado',     ua: 'ринок',       tr: 'мерк[а]до' },
      { en: 'invertir',    ua: 'інвестувати', tr: 'інберт[і]р' },
      { en: 'contrato',    ua: 'контракт',    tr: 'контр[а]то' },
      { en: 'crecimiento', ua: 'зростання',   tr: 'кресімь[е]нто' },
      { en: 'estrategia',  ua: 'стратегія',   tr: 'естрат[е]хія' },
    ],
    sentences: [
      { en: 'Nuestra ganancia crece.', ua: 'Наш прибуток зростає.',    tr: 'ну[е]стра ган[а]нсія кр[е]се' },
      { en: 'Firmamos un contrato.',   ua: 'Ми підписали контракт.',   tr: 'фірм[а]мос ун контр[а]то' },
      { en: 'Quieren invertir.',       ua: 'Вони хочуть інвестувати.', tr: 'кь[е]рен інберт[і]р' },
    ],
  },
  {
    id: 34, level: 'B2', icon: '🏛️', title: 'Суспільство', subtitle: 'Держава і люди',
    grammar: '«Люди» = <b>la gente</b> — в іспанській однина: la gente <b>quiere</b> cambio.',
    cards: [
      { en: 'gobierno',  ua: 'уряд',        tr: 'гобь[е]рно' },
      { en: 'ley',       ua: 'закон',       tr: 'лей' },
      { en: 'libertad',  ua: 'свобода',     tr: 'ліберт[а]д' },
      { en: 'sociedad',  ua: 'суспільство', tr: 'сосьєд[а]д' },
      { en: 'derechos',  ua: 'права',       tr: 'дер[е]чос' },
      { en: 'elección',  ua: 'вибори',      tr: 'елексь[о]н' },
      { en: 'cambio',    ua: 'зміна',       tr: 'к[а]мбіо' },
      { en: 'país',      ua: 'країна',      tr: 'па[і]с' },
    ],
    sentences: [
      { en: 'La gente quiere cambio.',    ua: 'Люди хочуть змін.', tr: 'ла х[е]нте кь[е]ре к[а]мбіо' },
      { en: 'La libertad es importante.', ua: 'Свобода важлива.',  tr: 'ла ліберт[а]д ес імпорт[а]нте' },
      { en: 'Tenemos derechos.',          ua: 'У нас є права.',    tr: 'тен[е]мос дер[е]чос' },
    ],
  },
  {
    id: 35, level: 'B2', icon: '🗣️', title: 'Ідіоми і вирази', subtitle: 'Як говорять носії',
    grammar: 'Багато сталих виразів: <b>tener razón</b> = мати рацію, <b>darse cuenta</b> = усвідомити.',
    cards: [
      { en: 'por supuesto', ua: 'звісно',     tr: 'пор супу[е]сто' },
      { en: 'de nada',      ua: 'нема за що',  tr: 'де н[а]да' },
      { en: 'a propósito',  ua: 'до речі',     tr: 'а проп[о]сіто' },
      { en: 'no importa',   ua: 'неважливо',   tr: 'но імп[о]рта' },
      { en: 'tener razón',  ua: 'мати рацію',  tr: 'тен[е]р рас[о]н' },
      { en: 'darse cuenta', ua: 'усвідомити',  tr: 'д[а]рсе ку[е]нта' },
      { en: 'vale',         ua: 'гаразд, ок',  tr: 'б[а]ле' },
      { en: 'poco a poco',  ua: 'потроху',     tr: 'п[о]ко а п[о]ко' },
    ],
    sentences: [
      { en: '¡Por supuesto!', ua: 'Звісно!',        tr: 'пор супу[е]сто' },
      { en: 'Tienes razón.',  ua: 'Ти маєш рацію.', tr: 'ть[е]нес рас[о]н' },
      { en: 'No importa.',    ua: 'Неважливо.',     tr: 'но імп[о]рта' },
    ],
  },
  {
    id: 36, level: 'B2', icon: '💻', title: 'Технології', subtitle: 'Гаджети та інтернет',
    cards: [
      { en: 'ordenador',   ua: "комп'ютер",    tr: 'орденад[о]р' },
      { en: 'teléfono',    ua: 'телефон',      tr: 'тел[е]фоно' },
      { en: 'internet',    ua: 'інтернет',     tr: 'інтерн[е]т' },
      { en: 'pantalla',    ua: 'екран',        tr: 'пант[а]йя' },
      { en: 'contraseña',  ua: 'пароль',       tr: 'контрас[е]ньа' },
      { en: 'aplicación',  ua: 'застосунок',   tr: 'аплікась[о]н' },
      { en: 'en línea',    ua: 'онлайн',       tr: 'ен л[і]неа' },
      { en: 'archivo',     ua: 'файл',         tr: 'арч[і]бо' },
      { en: 'datos',       ua: 'дані',         tr: 'д[а]тос' },
      { en: 'mensaje',     ua: 'повідомлення', tr: 'менс[а]хе' },
    ],
    sentences: [
      { en: 'Necesito mi contraseña.',      ua: 'Мені потрібен пароль.',      tr: 'несес[і]то мі контрас[е]ньа' },
      { en: 'La aplicación está en línea.', ua: 'Застосунок онлайн.',         tr: 'ла аплікась[о]н ест[а] ен л[і]неа' },
      { en: 'Envíame un mensaje.',          ua: 'Надішли мені повідомлення.', tr: 'енб[і]аме ун менс[а]хе' },
    ],
  },
  {
    id: 37, level: 'A1', icon: '🐶', title: 'Тварини', subtitle: 'Хатні й дикі',
    grammar: 'Іменники мають рід: <b>el</b> perro (чол.), <b>la</b> vaca (жін.). Неозначений: <b>un</b> / <b>una</b>.',
    cards: [
      { en: 'perro',   ua: 'собака',  tr: 'п[е]рро' },
      { en: 'gato',    ua: 'кіт',     tr: 'г[а]то' },
      { en: 'pájaro',  ua: 'пташка',  tr: 'п[а]харо' },
      { en: 'pez',     ua: 'риба',    tr: 'пес' },
      { en: 'caballo', ua: 'кінь',    tr: 'каб[а]йо' },
      { en: 'vaca',    ua: 'корова',  tr: 'б[а]ка' },
      { en: 'oso',     ua: 'ведмідь', tr: '[о]со' },
      { en: 'lobo',    ua: 'вовк',    tr: 'л[о]бо' },
      { en: 'conejo',  ua: 'кролик',  tr: 'кон[е]хо' },
      { en: 'ratón',   ua: 'миша',    tr: 'рат[о]н' },
    ],
    sentences: [
      { en: 'Tengo un perro.',       ua: 'У мене є собака.',       tr: 'т[е]нго ун п[е]рро' },
      { en: 'El gato es pequeño.',   ua: 'Кіт малий.',             tr: 'ель г[а]то ес пек[е]ньйо' },
      { en: 'Me gustan los pájaros.', ua: 'Мені подобаються птахи.', tr: 'ме г[у]стан лос п[а]харос' },
    ],
  },
  {
    id: 38, level: 'A2', icon: '🎯', title: 'Хобі і дозвілля', subtitle: 'Чим займаємось',
    grammar: 'Захоплення — через <b>me gusta</b> + іменник/дієслово: me gusta <b>bailar</b> (люблю танцювати).',
    cards: [
      { en: 'música',   ua: 'музика',       tr: 'м[у]сіка' },
      { en: 'deporte',  ua: 'спорт',        tr: 'деп[о]рте' },
      { en: 'juego',    ua: 'гра',          tr: 'ху[е]го' },
      { en: 'libro',    ua: 'книга',        tr: 'л[і]бро' },
      { en: 'película', ua: 'фільм',        tr: 'пел[і]кула' },
      { en: 'bailar',   ua: 'танцювати',    tr: 'байл[а]р' },
      { en: 'cantar',   ua: 'співати',      tr: 'кант[а]р' },
      { en: 'viajar',   ua: 'подорожувати', tr: 'біах[а]р' },
    ],
    sentences: [
      { en: 'Me gusta la música.', ua: 'Мені подобається музика.', tr: 'ме г[у]ста ла м[у]сіка' },
      { en: 'Jugamos un juego.',   ua: 'Ми граємо в гру.',         tr: 'хуг[а]мос ун ху[е]го' },
      { en: 'Le gusta bailar.',    ua: 'Вона любить танцювати.',   tr: 'ле г[у]ста байл[а]р' },
    ],
  },
  {
    id: 39, level: 'B1', icon: '🍽️', title: 'Ресторан', subtitle: 'Страви і сервіровка',
    grammar: 'Замовлення: <b>Para mí…</b> (мені…) або <b>¿Me pone…?</b> + страва.',
    cards: [
      { en: 'plato',      ua: 'страва',   tr: 'пл[а]то' },
      { en: 'entrante',   ua: 'закуска',  tr: 'ентр[а]нте' },
      { en: 'postre',     ua: 'десерт',   tr: 'п[о]стре' },
      { en: 'tenedor',    ua: 'виделка',  tr: 'тенед[о]р' },
      { en: 'cuchillo',   ua: 'ніж',      tr: 'куч[і]йо' },
      { en: 'cuchara',    ua: 'ложка',    tr: 'куч[а]ра' },
      { en: 'copa',       ua: 'келих',    tr: 'к[о]па' },
      { en: 'servilleta', ua: 'серветка', tr: 'сербій[е]та' },
    ],
    sentences: [
      { en: 'Para mí un postre.',       ua: 'Мені десерт.',       tr: 'п[а]ра мі ун п[о]стре' },
      { en: 'El plato es delicioso.',   ua: 'Страва смачна.',     tr: 'ель пл[а]то ес делісь[о]со' },
      { en: '¿Dónde está mi tenedor?',  ua: 'Де моя виделка?',    tr: 'д[о]нде ест[а] мі тенед[о]р' },
    ],
  },
  {
    id: 40, level: 'B1', icon: '🎓', title: 'Школа й навчання', subtitle: 'Освіта',
    grammar: 'Розрізняй: <b>aprender</b> (вчити), <b>estudiar</b> (вивчати), <b>enseñar</b> (навчати інших).',
    cards: [
      { en: 'escuela',  ua: 'школа',   tr: 'ску[е]ла' },
      { en: 'profesor', ua: 'вчитель', tr: 'профес[о]р' },
      { en: 'alumno',   ua: 'учень',   tr: 'ал[у]мно' },
      { en: 'cuaderno', ua: 'зошит',   tr: 'куад[е]рно' },
      { en: 'clase',    ua: 'урок',    tr: 'кл[а]се' },
      { en: 'examen',   ua: 'іспит',   tr: 'екс[а]мен' },
      { en: 'aprender', ua: 'вчити',   tr: 'апренд[е]р' },
      { en: 'escribir', ua: 'писати',  tr: 'ескріб[і]р' },
    ],
    sentences: [
      { en: 'Aprendo español.',       ua: 'Я вчу іспанську.', tr: 'апр[е]ндо еспань[о]ль' },
      { en: 'El profesor es amable.', ua: 'Вчитель добрий.',  tr: 'ель профес[о]р ес ам[а]бле' },
      { en: 'Tengo un examen.',       ua: 'У мене іспит.',    tr: 'т[е]нго ун екс[а]мен' },
    ],
  },
  {
    id: 41, level: 'B2', icon: '🌍', title: 'Довкілля', subtitle: 'Природа і планета',
    grammar: '<b>deber</b> = мати/повинен: <b>debemos</b> reciclar (ми маємо переробляти).',
    cards: [
      { en: 'medio ambiente', ua: 'довкілля',    tr: 'м[е]діо амбь[е]нте' },
      { en: 'naturaleza',     ua: 'природа',     tr: 'натурал[е]са' },
      { en: 'contaminación',  ua: 'забруднення', tr: 'контамінась[о]н' },
      { en: 'clima',          ua: 'клімат',      tr: 'кл[і]ма' },
      { en: 'energía',        ua: 'енергія',     tr: 'енерх[і]а' },
      { en: 'planeta',        ua: 'планета',     tr: 'план[е]та' },
      { en: 'reciclar',       ua: 'переробляти', tr: 'ресікл[а]р' },
      { en: 'proteger',       ua: 'захищати',    tr: 'протех[е]р' },
    ],
    sentences: [
      { en: 'Debemos proteger la naturaleza.', ua: 'Ми маємо захищати природу.', tr: 'деб[е]мос протех[е]р ла натурал[е]са' },
      { en: 'La contaminación es un problema.', ua: 'Забруднення — проблема.',   tr: 'ла контамінась[о]н ес ун пробл[е]ма' },
      { en: 'Amo nuestro planeta.',            ua: 'Я люблю нашу планету.',      tr: '[а]мо ну[е]стро план[е]та' },
    ],
  },
  {
    id: 42, level: 'B2', icon: '📰', title: 'Медіа і новини', subtitle: 'Інформація',
    grammar: 'Артикль <b>la/las</b> для жіночого роду: <b>las</b> noticias, <b>la</b> historia.',
    cards: [
      { en: 'noticias',   ua: 'новини',    tr: 'нот[і]сіас' },
      { en: 'periódico',  ua: 'газета',    tr: 'перь[о]діко' },
      { en: 'artículo',   ua: 'стаття',    tr: 'арт[і]куло' },
      { en: 'periodista', ua: 'журналіст', tr: 'перьйод[і]ста' },
      { en: 'televisión', ua: 'телебачення', tr: 'телебісь[о]н' },
      { en: 'radio',      ua: 'радіо',     tr: 'р[а]діо' },
      { en: 'informar',   ua: 'повідомляти', tr: 'інформ[а]р' },
      { en: 'historia',   ua: 'історія',   tr: 'іст[о]ріа' },
    ],
    sentences: [
      { en: 'Leo las noticias.',    ua: 'Я читаю новини.',   tr: 'л[е]о лас нот[і]сіас' },
      { en: 'El artículo es bueno.', ua: 'Стаття гарна.',    tr: 'ель арт[і]куло ес бу[е]но' },
      { en: 'Ella es periodista.',  ua: 'Вона журналістка.', tr: '[е]йя ес перьйод[і]ста' },
    ],
  },
  {
    "id": 43,
    "level": "A1",
    "icon": "⚙️",
    "title": "Дієслова побуту",
    "subtitle": "Спряження: 3 часи",
    "type": "verbs",
    "grammar": "Регулярні -ar/-er/-ir + зміна кореня. Майбутній = інфінітив + <b>-é/-ás/-á…</b> (comeré).<br>Приклад: Mañana comeré aquí.",
    "verbs": [
      {
        "inf": "comer",
        "ua": "їсти",
        "tr": "ком[е]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "como",
                "tr": "к[о]мо"
              },
              {
                "p": "tú",
                "f": "comes",
                "tr": "к[о]мес"
              },
              {
                "p": "él/ella",
                "f": "come",
                "tr": "к[о]ме"
              },
              {
                "p": "nosotros",
                "f": "comemos",
                "tr": "ком[е]мос"
              },
              {
                "p": "vosotros",
                "f": "coméis",
                "tr": "ком[е]йс"
              },
              {
                "p": "ellos",
                "f": "comen",
                "tr": "к[о]мен"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "comí",
                "tr": "ком[і]"
              },
              {
                "p": "tú",
                "f": "comiste",
                "tr": "ком[і]сте"
              },
              {
                "p": "él/ella",
                "f": "comió",
                "tr": "комь[о]"
              },
              {
                "p": "nosotros",
                "f": "comimos",
                "tr": "ком[і]мос"
              },
              {
                "p": "vosotros",
                "f": "comisteis",
                "tr": "коміст[е]йс"
              },
              {
                "p": "ellos",
                "f": "comieron",
                "tr": "комь[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "comeré",
                "tr": "комер[е]"
              },
              {
                "p": "tú",
                "f": "comerás",
                "tr": "комер[а]с"
              },
              {
                "p": "él/ella",
                "f": "comerá",
                "tr": "комер[а]"
              },
              {
                "p": "nosotros",
                "f": "comeremos",
                "tr": "комер[е]мос"
              },
              {
                "p": "vosotros",
                "f": "comeréis",
                "tr": "комер[е]йс"
              },
              {
                "p": "ellos",
                "f": "comerán",
                "tr": "комер[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "beber",
        "ua": "пити",
        "tr": "беб[е]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "bebo",
                "tr": "б[е]бо"
              },
              {
                "p": "tú",
                "f": "bebes",
                "tr": "б[е]бес"
              },
              {
                "p": "él/ella",
                "f": "bebe",
                "tr": "б[е]бе"
              },
              {
                "p": "nosotros",
                "f": "bebemos",
                "tr": "беб[е]мос"
              },
              {
                "p": "vosotros",
                "f": "bebéis",
                "tr": "беб[е]йс"
              },
              {
                "p": "ellos",
                "f": "beben",
                "tr": "б[е]бен"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "bebí",
                "tr": "беб[і]"
              },
              {
                "p": "tú",
                "f": "bebiste",
                "tr": "беб[і]сте"
              },
              {
                "p": "él/ella",
                "f": "bebió",
                "tr": "бебь[о]"
              },
              {
                "p": "nosotros",
                "f": "bebimos",
                "tr": "беб[і]мос"
              },
              {
                "p": "vosotros",
                "f": "bebisteis",
                "tr": "бебіст[е]йс"
              },
              {
                "p": "ellos",
                "f": "bebieron",
                "tr": "бебь[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "beberé",
                "tr": "бебер[е]"
              },
              {
                "p": "tú",
                "f": "beberás",
                "tr": "бебер[а]с"
              },
              {
                "p": "él/ella",
                "f": "beberá",
                "tr": "бебер[а]"
              },
              {
                "p": "nosotros",
                "f": "beberemos",
                "tr": "бебер[е]мос"
              },
              {
                "p": "vosotros",
                "f": "beberéis",
                "tr": "бебер[е]йс"
              },
              {
                "p": "ellos",
                "f": "beberán",
                "tr": "бебер[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "dormir",
        "ua": "спати",
        "tr": "дорм[і]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "duermo",
                "tr": "ду[е]рмо"
              },
              {
                "p": "tú",
                "f": "duermes",
                "tr": "ду[е]рмес"
              },
              {
                "p": "él/ella",
                "f": "duerme",
                "tr": "ду[е]рме"
              },
              {
                "p": "nosotros",
                "f": "dormimos",
                "tr": "дорм[і]мос"
              },
              {
                "p": "vosotros",
                "f": "dormís",
                "tr": "дорм[і]с"
              },
              {
                "p": "ellos",
                "f": "duermen",
                "tr": "ду[е]рмен"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "dormí",
                "tr": "дорм[і]"
              },
              {
                "p": "tú",
                "f": "dormiste",
                "tr": "дорм[і]сте"
              },
              {
                "p": "él/ella",
                "f": "durmió",
                "tr": "дурмь[о]"
              },
              {
                "p": "nosotros",
                "f": "dormimos",
                "tr": "дорм[і]мос"
              },
              {
                "p": "vosotros",
                "f": "dormisteis",
                "tr": "дорміст[е]йс"
              },
              {
                "p": "ellos",
                "f": "durmieron",
                "tr": "дурмь[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "dormiré",
                "tr": "дормір[е]"
              },
              {
                "p": "tú",
                "f": "dormirás",
                "tr": "дормір[а]с"
              },
              {
                "p": "él/ella",
                "f": "dormirá",
                "tr": "дормір[а]"
              },
              {
                "p": "nosotros",
                "f": "dormiremos",
                "tr": "дормір[е]мос"
              },
              {
                "p": "vosotros",
                "f": "dormiréis",
                "tr": "дормір[е]йс"
              },
              {
                "p": "ellos",
                "f": "dormirán",
                "tr": "дормір[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "vivir",
        "ua": "жити",
        "tr": "біб[і]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "vivo",
                "tr": "б[і]бо"
              },
              {
                "p": "tú",
                "f": "vives",
                "tr": "б[і]бес"
              },
              {
                "p": "él/ella",
                "f": "vive",
                "tr": "б[і]бе"
              },
              {
                "p": "nosotros",
                "f": "vivimos",
                "tr": "біб[і]мос"
              },
              {
                "p": "vosotros",
                "f": "vivís",
                "tr": "біб[і]с"
              },
              {
                "p": "ellos",
                "f": "viven",
                "tr": "б[і]бен"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "viví",
                "tr": "біб[і]"
              },
              {
                "p": "tú",
                "f": "viviste",
                "tr": "біб[і]сте"
              },
              {
                "p": "él/ella",
                "f": "vivió",
                "tr": "бібь[о]"
              },
              {
                "p": "nosotros",
                "f": "vivimos",
                "tr": "біб[і]мос"
              },
              {
                "p": "vosotros",
                "f": "vivisteis",
                "tr": "бібіст[е]йс"
              },
              {
                "p": "ellos",
                "f": "vivieron",
                "tr": "бібь[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "viviré",
                "tr": "бібір[е]"
              },
              {
                "p": "tú",
                "f": "vivirás",
                "tr": "бібір[а]с"
              },
              {
                "p": "él/ella",
                "f": "vivirá",
                "tr": "бібір[а]"
              },
              {
                "p": "nosotros",
                "f": "viviremos",
                "tr": "бібір[е]мос"
              },
              {
                "p": "vosotros",
                "f": "viviréis",
                "tr": "бібір[е]йс"
              },
              {
                "p": "ellos",
                "f": "vivirán",
                "tr": "бібір[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "hablar",
        "ua": "говорити",
        "tr": "абл[а]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "hablo",
                "tr": "[а]бло"
              },
              {
                "p": "tú",
                "f": "hablas",
                "tr": "[а]блас"
              },
              {
                "p": "él/ella",
                "f": "habla",
                "tr": "[а]бла"
              },
              {
                "p": "nosotros",
                "f": "hablamos",
                "tr": "абл[а]мос"
              },
              {
                "p": "vosotros",
                "f": "habláis",
                "tr": "абл[а]йс"
              },
              {
                "p": "ellos",
                "f": "hablan",
                "tr": "[а]блан"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "hablé",
                "tr": "абл[е]"
              },
              {
                "p": "tú",
                "f": "hablaste",
                "tr": "абл[а]сте"
              },
              {
                "p": "él/ella",
                "f": "habló",
                "tr": "абл[о]"
              },
              {
                "p": "nosotros",
                "f": "hablamos",
                "tr": "абл[а]мос"
              },
              {
                "p": "vosotros",
                "f": "hablasteis",
                "tr": "абласт[е]йс"
              },
              {
                "p": "ellos",
                "f": "hablaron",
                "tr": "абл[а]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "hablaré",
                "tr": "аблар[е]"
              },
              {
                "p": "tú",
                "f": "hablarás",
                "tr": "аблар[а]с"
              },
              {
                "p": "él/ella",
                "f": "hablará",
                "tr": "аблар[а]"
              },
              {
                "p": "nosotros",
                "f": "hablaremos",
                "tr": "аблар[е]мос"
              },
              {
                "p": "vosotros",
                "f": "hablaréis",
                "tr": "аблар[е]йс"
              },
              {
                "p": "ellos",
                "f": "hablarán",
                "tr": "аблар[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "jugar",
        "ua": "гратися",
        "tr": "хуг[а]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "juego",
                "tr": "ху[е]го"
              },
              {
                "p": "tú",
                "f": "juegas",
                "tr": "ху[е]гас"
              },
              {
                "p": "él/ella",
                "f": "juega",
                "tr": "ху[е]га"
              },
              {
                "p": "nosotros",
                "f": "jugamos",
                "tr": "хуг[а]мос"
              },
              {
                "p": "vosotros",
                "f": "jugáis",
                "tr": "хуг[а]йс"
              },
              {
                "p": "ellos",
                "f": "juegan",
                "tr": "ху[е]ган"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "jugué",
                "tr": "хуг[е]"
              },
              {
                "p": "tú",
                "f": "jugaste",
                "tr": "хуг[а]сте"
              },
              {
                "p": "él/ella",
                "f": "jugó",
                "tr": "хуг[о]"
              },
              {
                "p": "nosotros",
                "f": "jugamos",
                "tr": "хуг[а]мос"
              },
              {
                "p": "vosotros",
                "f": "jugasteis",
                "tr": "хугаст[е]йс"
              },
              {
                "p": "ellos",
                "f": "jugaron",
                "tr": "хуг[а]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "jugaré",
                "tr": "хугар[е]"
              },
              {
                "p": "tú",
                "f": "jugarás",
                "tr": "хугар[а]с"
              },
              {
                "p": "él/ella",
                "f": "jugará",
                "tr": "хугар[а]"
              },
              {
                "p": "nosotros",
                "f": "jugaremos",
                "tr": "хугар[е]мос"
              },
              {
                "p": "vosotros",
                "f": "jugaréis",
                "tr": "хугар[е]йс"
              },
              {
                "p": "ellos",
                "f": "jugarán",
                "tr": "хугар[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "abrir",
        "ua": "відчиняти",
        "tr": "абр[і]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "abro",
                "tr": "[а]бро"
              },
              {
                "p": "tú",
                "f": "abres",
                "tr": "[а]брес"
              },
              {
                "p": "él/ella",
                "f": "abre",
                "tr": "[а]бре"
              },
              {
                "p": "nosotros",
                "f": "abrimos",
                "tr": "абр[і]мос"
              },
              {
                "p": "vosotros",
                "f": "abrís",
                "tr": "абр[і]с"
              },
              {
                "p": "ellos",
                "f": "abren",
                "tr": "[а]брен"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "abrí",
                "tr": "абр[і]"
              },
              {
                "p": "tú",
                "f": "abriste",
                "tr": "абр[і]сте"
              },
              {
                "p": "él/ella",
                "f": "abrió",
                "tr": "абрь[о]"
              },
              {
                "p": "nosotros",
                "f": "abrimos",
                "tr": "абр[і]мос"
              },
              {
                "p": "vosotros",
                "f": "abristeis",
                "tr": "абріст[е]йс"
              },
              {
                "p": "ellos",
                "f": "abrieron",
                "tr": "абрь[е]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "abriré",
                "tr": "абрір[е]"
              },
              {
                "p": "tú",
                "f": "abrirás",
                "tr": "абрір[а]с"
              },
              {
                "p": "él/ella",
                "f": "abrirá",
                "tr": "абрір[а]"
              },
              {
                "p": "nosotros",
                "f": "abriremos",
                "tr": "абрір[е]мос"
              },
              {
                "p": "vosotros",
                "f": "abriréis",
                "tr": "абрір[е]йс"
              },
              {
                "p": "ellos",
                "f": "abrirán",
                "tr": "абрір[а]н"
              }
            ]
          }
        ]
      },
      {
        "inf": "cerrar",
        "ua": "зачиняти",
        "tr": "серр[а]р",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "yo",
                "f": "cierro",
                "tr": "сь[е]рро"
              },
              {
                "p": "tú",
                "f": "cierras",
                "tr": "сь[е]ррас"
              },
              {
                "p": "él/ella",
                "f": "cierra",
                "tr": "сь[е]рра"
              },
              {
                "p": "nosotros",
                "f": "cerramos",
                "tr": "серр[а]мос"
              },
              {
                "p": "vosotros",
                "f": "cerráis",
                "tr": "серр[а]йс"
              },
              {
                "p": "ellos",
                "f": "cierran",
                "tr": "сь[е]рран"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "yo",
                "f": "cerré",
                "tr": "серр[е]"
              },
              {
                "p": "tú",
                "f": "cerraste",
                "tr": "серр[а]сте"
              },
              {
                "p": "él/ella",
                "f": "cerró",
                "tr": "серр[о]"
              },
              {
                "p": "nosotros",
                "f": "cerramos",
                "tr": "серр[а]мос"
              },
              {
                "p": "vosotros",
                "f": "cerrasteis",
                "tr": "серраст[е]йс"
              },
              {
                "p": "ellos",
                "f": "cerraron",
                "tr": "серр[а]рон"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "yo",
                "f": "cerraré",
                "tr": "серрар[е]"
              },
              {
                "p": "tú",
                "f": "cerrarás",
                "tr": "серрар[а]с"
              },
              {
                "p": "él/ella",
                "f": "cerrará",
                "tr": "серрар[а]"
              },
              {
                "p": "nosotros",
                "f": "cerraremos",
                "tr": "серрар[е]мос"
              },
              {
                "p": "vosotros",
                "f": "cerraréis",
                "tr": "серрар[е]йс"
              },
              {
                "p": "ellos",
                "f": "cerrarán",
                "tr": "серрар[а]н"
              }
            ]
          }
        ]
      }
    ],
    "cards": [
      {
        "en": "comer",
        "ua": "їсти",
        "tr": "ком[е]р"
      },
      {
        "en": "beber",
        "ua": "пити",
        "tr": "беб[е]р"
      },
      {
        "en": "dormir",
        "ua": "спати",
        "tr": "дорм[і]р"
      },
      {
        "en": "vivir",
        "ua": "жити",
        "tr": "біб[і]р"
      },
      {
        "en": "hablar",
        "ua": "говорити",
        "tr": "абл[а]р"
      },
      {
        "en": "jugar",
        "ua": "гратися",
        "tr": "хуг[а]р"
      },
      {
        "en": "abrir",
        "ua": "відчиняти",
        "tr": "абр[і]р"
      },
      {
        "en": "cerrar",
        "ua": "зачиняти",
        "tr": "серр[а]р"
      }
    ],
    "sentences": [
      {
        "en": "Como una manzana.",
        "ua": "Я їм яблуко.",
        "tr": "к[о]мо [у]на манс[а]на"
      },
      {
        "en": "Hablamos español.",
        "ua": "Ми говоримо іспанською.",
        "tr": "абл[а]мос еспань[о]ль"
      },
      {
        "en": "Ella duerme.",
        "ua": "Вона спить.",
        "tr": "[е]йя ду[е]рме"
      }
    ]
  },
  {
    id: 44, level: 'A2', icon: '🧭', title: 'Напрямки', subtitle: 'Як пройти',
    grammar: 'Наказ (ти): -ar → -a (<b>gira</b> — поверни), -er/-ir → -e (<b>sigue</b> recto — йди прямо).',
    cards: [
      { en: 'arriba',  ua: 'вгору',      tr: 'арр[і]ба' },
      { en: 'abajo',   ua: 'вниз',       tr: 'аб[а]хо' },
      { en: 'girar',   ua: 'повертати',  tr: 'хір[а]р' },
      { en: 'parar',   ua: 'зупинятись', tr: 'пар[а]р' },
      { en: 'lejos',   ua: 'далеко',     tr: 'л[е]хос' },
      { en: 'recto',   ua: 'прямо',      tr: 'р[е]кто' },
      { en: 'esquina', ua: 'ріг, кут',   tr: 'ескь[і]на' },
      { en: 'mapa',    ua: 'карта',      tr: 'м[а]па' },
    ],
    sentences: [
      { en: 'Gira a la izquierda.', ua: 'Поверни ліворуч.', tr: 'х[і]ра а ла іскь[е]рда' },
      { en: 'Sigue recto.',         ua: 'Іди прямо.',        tr: 'с[і]ге р[е]кто' },
      { en: 'Está lejos.',          ua: 'Це далеко.',        tr: 'ест[а] л[е]хос' },
    ],
  },
  {
    id: 45, level: 'B1', icon: '🏦', title: 'Банк і пошта', subtitle: 'Послуги',
    grammar: 'Ввічливе прохання: <b>¿Podría…?</b> або <b>¿Me puede ayudar?</b>',
    cards: [
      { en: 'banco',   ua: 'банк',      tr: 'б[а]нко' },
      { en: 'cajero',  ua: 'банкомат',  tr: 'ках[е]ро' },
      { en: 'carta',   ua: 'лист',      tr: 'к[а]рта' },
      { en: 'sello',   ua: 'марка',     tr: 'с[е]йо' },
      { en: 'cola',    ua: 'черга',     tr: 'к[о]ла' },
      { en: 'firma',   ua: 'підпис',    tr: 'ф[і]рма' },
      { en: 'ayuda',   ua: 'допомога',  tr: 'ай[у]да' },
      { en: 'enviar',  ua: 'надсилати', tr: 'енбь[а]р' },
    ],
    sentences: [
      { en: '¿Me puede ayudar?',        ua: 'Ви можете мені допомогти?', tr: 'ме пу[е]де аюд[а]р' },
      { en: 'Necesito enviar una carta.', ua: 'Мені треба надіслати лист.', tr: 'несес[і]то енбь[а]р [у]на к[а]рта' },
      { en: '¿Dónde está el banco?',    ua: 'Де банк?',                  tr: 'д[о]нде ест[а] ель б[а]нко' },
    ],
  },
  {
    id: 46, level: 'B2', icon: '🔬', title: 'Наука і думки', subtitle: 'Абстрактні поняття',
    grammar: 'Питання беремо в <b>¿ ?</b> й піднімаємо інтонацію: ¿Sabes la respuesta? (Ти знаєш відповідь?)',
    cards: [
      { en: 'ciencia',    ua: 'наука',     tr: 'сь[е]нсіа' },
      { en: 'número',     ua: 'число',     tr: 'н[у]меро' },
      { en: 'resultado',  ua: 'результат', tr: 'ресульт[а]до' },
      { en: 'pregunta',   ua: 'питання',   tr: 'прег[у]нта' },
      { en: 'respuesta',  ua: 'відповідь', tr: 'респу[е]ста' },
      { en: 'idea',       ua: 'ідея',      tr: 'ід[е]а' },
      { en: 'problema',   ua: 'проблема',  tr: 'пробл[е]ма' },
      { en: 'ejemplo',    ua: 'приклад',   tr: 'ех[е]мпло' },
    ],
    sentences: [
      { en: 'Tengo una idea.',        ua: 'У мене є ідея.',      tr: 'т[е]нго [у]на ід[е]а' },
      { en: 'Es un problema grande.', ua: 'Це велика проблема.', tr: 'ес ун пробл[е]ма гр[а]нде' },
      { en: '¿Cuál es la respuesta?', ua: 'Яка відповідь?',      tr: 'ку[а]ль ес ла респу[е]ста' },
    ],
  },
  {
    id: 47, level: 'A1', icon: '🔀', title: 'Спряження: теперішній час', subtitle: 'Усі форми дієслова', type: 'verbs',
    grammar: 'Теперішній час за закінченням: <b>-ar</b> (-o, -as, -a, -amos, -áis, -an); <b>-er</b> (-o, -es, -e, -emos, -éis, -en); <b>-ir</b> (-o, -es, -e, -imos, -ís, -en). Неправильні (ser, tener, ir) вчимо окремо.',
    verbs: [
      { inf:'hablar', ua:'говорити (-ar)', tr:'абл[а]р', forms:[
        {p:'yo', f:'hablo', tr:'[а]бло'},{p:'tú', f:'hablas', tr:'[а]блас'},{p:'él / ella', f:'habla', tr:'[а]бла'},{p:'nosotros', f:'hablamos', tr:'абл[а]мос'},{p:'vosotros', f:'habláis', tr:'абл[а]йс'},{p:'ellos', f:'hablan', tr:'[а]блан'} ]},
      { inf:'comer', ua:'їсти (-er)', tr:'ком[е]р', forms:[
        {p:'yo', f:'como', tr:'к[о]мо'},{p:'tú', f:'comes', tr:'к[о]мес'},{p:'él / ella', f:'come', tr:'к[о]ме'},{p:'nosotros', f:'comemos', tr:'ком[е]мос'},{p:'vosotros', f:'coméis', tr:'ком[е]йс'},{p:'ellos', f:'comen', tr:'к[о]мен'} ]},
      { inf:'vivir', ua:'жити (-ir)', tr:'біб[і]р', forms:[
        {p:'yo', f:'vivo', tr:'б[і]бо'},{p:'tú', f:'vives', tr:'б[і]бес'},{p:'él / ella', f:'vive', tr:'б[і]бе'},{p:'nosotros', f:'vivimos', tr:'біб[і]мос'},{p:'vosotros', f:'vivís', tr:'біб[і]с'},{p:'ellos', f:'viven', tr:'б[і]бен'} ]},
      { inf:'ser', ua:'бути (неправ.)', tr:'сер', forms:[
        {p:'yo', f:'soy', tr:'с[о]й'},{p:'tú', f:'eres', tr:'[е]рес'},{p:'él / ella', f:'es', tr:'ес'},{p:'nosotros', f:'somos', tr:'с[о]мос'},{p:'vosotros', f:'sois', tr:'с[о]йс'},{p:'ellos', f:'son', tr:'сон'} ]},
      { inf:'tener', ua:'мати (неправ.)', tr:'тен[е]р', forms:[
        {p:'yo', f:'tengo', tr:'т[е]нго'},{p:'tú', f:'tienes', tr:'ть[е]нес'},{p:'él / ella', f:'tiene', tr:'ть[е]не'},{p:'nosotros', f:'tenemos', tr:'тен[е]мос'},{p:'vosotros', f:'tenéis', tr:'тен[е]йс'},{p:'ellos', f:'tienen', tr:'ть[е]нен'} ]},
      { inf:'ir', ua:'йти (неправ.)', tr:'ір', forms:[
        {p:'yo', f:'voy', tr:'бой'},{p:'tú', f:'vas', tr:'бас'},{p:'él / ella', f:'va', tr:'ба'},{p:'nosotros', f:'vamos', tr:'б[а]мос'},{p:'vosotros', f:'vais', tr:'байс'},{p:'ellos', f:'van', tr:'бан'} ]},
    ],
    cards: [
      { en:'hablar', ua:'говорити', tr:'абл[а]р' },
      { en:'comer',  ua:'їсти',     tr:'ком[е]р' },
      { en:'vivir',  ua:'жити',     tr:'біб[і]р' },
      { en:'ser',    ua:'бути',     tr:'сер' },
      { en:'tener',  ua:'мати',     tr:'тен[е]р' },
      { en:'ir',     ua:'йти',      tr:'ір' },
    ],
    sentences: [
      { en:'Yo hablo español.',     ua:'Я говорю іспанською.', tr:'йо [а]бло еспань[о]ль' },
      { en:'Ella tiene un gato.',   ua:'У неї є кіт.',         tr:'[е]йя ть[е]не ун г[а]то' },
      { en:'Nosotros vamos a casa.', ua:'Ми йдемо додому.',    tr:'нос[о]трос б[а]мос а к[а]са' },
    ],
  },
  {
    id: 48, level: 'B1', icon: '⏳', title: 'Спряження: минулий час', subtitle: 'Pretérito indefinido', type: 'verbs',
    grammar: 'Минулий (pretérito): <b>-ar</b> → (-é, -aste, -ó, -amos, -asteis, -aron); <b>-er/-ir</b> → (-í, -iste, -ió, -imos, -isteis, -ieron). Неправильні: ser/ir → <b>fui…</b>, tener → <b>tuve…</b>',
    verbs: [
      { inf:'hablar', ua:'говорити (-ar)', tr:'абл[а]р', forms:[
        {p:'yo', f:'hablé', tr:'абл[е]'},{p:'tú', f:'hablaste', tr:'абл[а]сте'},{p:'él / ella', f:'habló', tr:'абл[о]'},{p:'nosotros', f:'hablamos', tr:'абл[а]мос'},{p:'vosotros', f:'hablasteis', tr:'абласт[е]йс'},{p:'ellos', f:'hablaron', tr:'абл[а]рон'} ]},
      { inf:'comer', ua:'їсти (-er)', tr:'ком[е]р', forms:[
        {p:'yo', f:'comí', tr:'ком[і]'},{p:'tú', f:'comiste', tr:'ком[і]сте'},{p:'él / ella', f:'comió', tr:'комь[о]'},{p:'nosotros', f:'comimos', tr:'ком[і]мос'},{p:'vosotros', f:'comisteis', tr:'коміст[е]йс'},{p:'ellos', f:'comieron', tr:'комь[е]рон'} ]},
      { inf:'ir / ser', ua:'йти / бути (неправ.)', tr:'ір, сер', forms:[
        {p:'yo', f:'fui', tr:'фу[і]'},{p:'tú', f:'fuiste', tr:'фу[і]сте'},{p:'él / ella', f:'fue', tr:'фу[е]'},{p:'nosotros', f:'fuimos', tr:'фу[і]мос'},{p:'vosotros', f:'fuisteis', tr:'фу[і]стейс'},{p:'ellos', f:'fueron', tr:'фу[е]рон'} ]},
      { inf:'tener', ua:'мати (неправ.)', tr:'тен[е]р', forms:[
        {p:'yo', f:'tuve', tr:'т[у]бе'},{p:'tú', f:'tuviste', tr:'туб[і]сте'},{p:'él / ella', f:'tuvo', tr:'т[у]бо'},{p:'nosotros', f:'tuvimos', tr:'туб[і]мос'},{p:'vosotros', f:'tuvisteis', tr:'тубіст[е]йс'},{p:'ellos', f:'tuvieron', tr:'тубь[е]рон'} ]},
    ],
    cards: [
      { en:'hablar', ua:'говорити (hablé)', tr:'абл[а]р' },
      { en:'comer',  ua:'їсти (comí)',      tr:'ком[е]р' },
      { en:'ir / ser', ua:'йти / бути (fui)', tr:'ір, сер' },
      { en:'tener',  ua:'мати (tuve)',      tr:'тен[е]р' },
    ],
    sentences: [
      { en:'Ayer hablé con Ana.',  ua:'Вчора я говорив з Аною.', tr:'ай[е]р абл[е] кон [а]на' },
      { en:'Fuimos a casa.',       ua:'Ми пішли додому.',        tr:'фу[і]мос а к[а]са' },
      { en:'Ella tuvo una idea.',  ua:'У неї була ідея.',        tr:'[е]йя т[у]бо [у]на ід[е]а' },
    ],
  },
  {
    id: 49, level: 'A2', icon: '🍳', title: 'Кухня і готування', subtitle: 'Готуємо вдома',
    grammar: 'Дію-дієслово беремо в інфінітиві після <b>gusta</b>: me gusta <b>cocinar</b>.',
    cards: [
      { en:'cocinar',    ua:'готувати',  tr:'косін[а]р' },
      { en:'sartén',     ua:'сковорода', tr:'сарт[е]н' },
      { en:'horno',      ua:'духовка',   tr:'[о]рно' },
      { en:'freír',      ua:'смажити',   tr:'фре[і]р' },
      { en:'hervir',     ua:'варити',    tr:'ерв[і]р' },
      { en:'receta',     ua:'рецепт',    tr:'рес[е]та' },
      { en:'hambriento', ua:'голодний',  tr:'амбрі[е]нто' },
      { en:'sediento',   ua:'спраглий',  tr:'седі[е]нто' },
      { en:'dulce',      ua:'солодкий',  tr:'д[у]льсе' },
      { en:'sal',        ua:'сіль',      tr:'с[а]ль' },
    ],
    sentences: [
      { en:'Me gusta cocinar.',    ua:'Я люблю готувати.', tr:'ме г[у]ста косін[а]р' },
      { en:'Tengo hambre.',        ua:'Я голодний.',       tr:'т[е]нго [а]мбре' },
      { en:'La manzana es dulce.', ua:'Яблуко солодке.',   tr:'ла манс[а]на ес д[у]льсе' },
    ],
  },
  {
    id: 50, level: 'B1', icon: '🎉', title: 'Свята і події', subtitle: 'Дні народження і гості',
    grammar: 'Привітання — без дієслова: <b>¡Feliz</b> cumpleaños! · <b>¡Feliz</b> Navidad!',
    cards: [
      { en:'feriado',    ua:'свято',           tr:'фері[а]до' },
      { en:'cumpleaños', ua:'день народження', tr:'кумпле[а]ньйос' },
      { en:'regalo',     ua:'подарунок',       tr:'рег[а]ло' },
      { en:'fiesta',     ua:'вечірка',         tr:'фі[е]ста' },
      { en:'celebrar',   ua:'святкувати',      tr:'селебр[а]р' },
      { en:'invitar',    ua:'запрошувати',     tr:'інвіт[а]р' },
      { en:'pastel',     ua:'торт',            tr:'паст[е]ль' },
      { en:'invitado',   ua:'гість',           tr:'інвіт[а]до' },
      { en:'desear',     ua:'бажати',          tr:'десе[а]р' },
      { en:'sorpresa',   ua:'сюрприз',         tr:'сорпр[е]са' },
    ],
    sentences: [
      { en:'¡Feliz cumpleaños!', ua:'З днем народження!', tr:'фел[і]с кумпле[а]ньйос' },
      { en:'Esto es un regalo.', ua:'Це подарунок.',      tr:'[е]сто ес ун рег[а]ло' },
      { en:'Te invito.',         ua:'Я тебе запрошую.',   tr:'те інв[і]то' },
    ],
  },
  {
    id: 51, level: 'A2', icon: '🌍', title: 'Країни і мови', subtitle: 'Світ навколо нас',
    grammar: 'Назви мов — з <b>малої</b> літери: hablo <b>español</b>, hablo <b>inglés</b>.',
    cards: [
      { en:'país',       ua:'країна',     tr:'па[і]с' },
      { en:'idioma',     ua:'мова',       tr:'ідь[о]ма' },
      { en:'mundo',      ua:'світ',       tr:'м[у]ндо' },
      { en:'extranjero', ua:'іноземний',  tr:'екстранх[е]ро' },
      { en:'frontera',   ua:'кордон',     tr:'фронт[е]ра' },
      { en:'capital',    ua:'столиця',    tr:'капіт[а]ль' },
      { en:'bandera',    ua:'прапор',     tr:'банд[е]ра' },
      { en:'nación',     ua:'нація',      tr:'нась[о]н' },
      { en:'nativo',     ua:'рідний',     tr:'нат[і]бо' },
      { en:'continente', ua:'континент',  tr:'контін[е]нте' },
    ],
    sentences: [
      { en:'Esto es mi país.',                 ua:'Це моя країна.',       tr:'[е]сто ес мі па[і]с' },
      { en:'El mundo es grande.',              ua:'Світ великий.',        tr:'ель м[у]ндо ес гр[а]нде' },
      { en:'Esto es una bandera extranjera.',  ua:'Це іноземний прапор.', tr:'[е]сто ес [у]на банд[е]ра екстранх[е]ра' },
    ],
  },
  {
    id: 52, level: 'B1', icon: '🧑‍🤝‍🧑', title: 'Друзі і стосунки', subtitle: 'Люди поруч',
    grammar: 'Після дієслова — інфінітив: quiero <b>conocer</b> a mis amigos.',
    cards: [
      { en:'amigo',      ua:'друг',       tr:'ам[і]го' },
      { en:'vecino',     ua:'сусід',      tr:'бес[і]но' },
      { en:'encontrar',  ua:'зустрічати', tr:'енконтр[а]р' },
      { en:'juntos',     ua:'разом',      tr:'х[у]нтос' },
      { en:'solo',       ua:'сам',        tr:'с[о]ло' },
      { en:'confiar',    ua:'довіряти',   tr:'конфі[а]р' },
      { en:'relación',   ua:'стосунки',   tr:'реласьй[о]н' },
      { en:'pareja',     ua:'пара',       tr:'пар[е]ха' },
      { en:'compartir',  ua:'ділитися',   tr:'компарт[і]р' },
      { en:'cercano',    ua:'близький',   tr:'серк[а]но' },
    ],
    sentences: [
      { en:'Él es mi amigo.',  ua:'Він мій друг.',   tr:'ель ес мі ам[і]го' },
      { en:'Estamos juntos.',  ua:'Ми разом.',       tr:'ест[а]мос х[у]нтос' },
      { en:'Confío en ti.',    ua:'Я тобі довіряю.', tr:'конф[і]о ен ті' },
    ],
  },
];
