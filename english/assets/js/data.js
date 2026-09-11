/* Anglo — курс англійської з нуля за рівнями CEFR (A0 → B2).
   Картка-слово: en, ua (переклад), tr (транскрипція укр. літерами, наголос у [дужках]).
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
    grammar: 'Питання часто починається з питального слова (Wh-), а далі — дієслово. <b>What is</b> this? — Що це? · <b>Where are</b> you? — Де ти?',
    cards: [
      { en: 'when',  ua: 'коли',   tr: 'у[е]н' },
      { en: 'where', ua: 'де',     tr: 'у[е]а' },
      { en: 'who',   ua: 'хто',    tr: 'г[у]' },
      { en: 'what',  ua: 'що',     tr: 'у[о]т' },
      { en: 'why',   ua: 'чому',   tr: 'у[а]й' },
      { en: 'how',   ua: 'як',     tr: 'г[а]у' },
      { en: 'which', ua: 'котрий', tr: 'у[і]ч' },
    ],
    sentences: [
      { en: 'When will we meet?', ua: 'Коли ми зустрінемось?', tr: 'у[е]н уіл уі міт' },
      { en: 'Where are you?',     ua: 'Де ти?',                tr: 'у[е]а а ю' },
      { en: 'Who is it?',         ua: 'Хто це?',               tr: 'гу із іт' },
      { en: 'What is this?',      ua: 'Що це?',                tr: 'уот із зіс' },
    ],
  },
  {
    id: 2, level: 'A0', icon: '🙋', title: 'Займенники', subtitle: 'Хто виконує дію',
    grammar: 'Займенник-підмет не пропускаємо: <b>She</b> is happy (а не просто «is happy»). He/she — про людей, it — про речі.',
    cards: [
      { en: 'I',    ua: 'я',        tr: '[а]й' },
      { en: 'you',  ua: 'ти, ви',   tr: '[ю]' },
      { en: 'he',   ua: 'він',      tr: 'г[і]' },
      { en: 'she',  ua: 'вона',     tr: 'ш[і]' },
      { en: 'it',   ua: 'воно, це', tr: '[іт]' },
      { en: 'we',   ua: 'ми',       tr: 'у[і]' },
      { en: 'they', ua: 'вони',     tr: 'з[ей]' },
    ],
    sentences: [
      { en: 'I love you.',       ua: 'Я тебе люблю.',    tr: 'ай лав ю' },
      { en: 'She is my sister.', ua: 'Вона моя сестра.', tr: 'ші із май с[і]стер' },
      { en: 'We are here.',      ua: 'Ми тут.',          tr: 'уі а г[і]а' },
    ],
  },
  {
    id: 3, level: 'A0', icon: '🔢', title: 'Числа 1–12', subtitle: 'Рахуємо англійською',
    grammar: 'Множина іменників — додай <b>-s</b>: one apple → two apple<b>s</b>. Число ставимо перед іменником: <b>two</b> brothers.',
    cards: [
      { en: 'one',    ua: 'один',       tr: 'у[а]н' },
      { en: 'two',    ua: 'два',        tr: 'т[у]' },
      { en: 'three',  ua: 'три',        tr: 'тр[і]' },
      { en: 'four',   ua: 'чотири',     tr: 'ф[о]' },
      { en: 'five',   ua: "п'ять",      tr: 'ф[а]йв' },
      { en: 'six',    ua: 'шість',      tr: 'с[і]кс' },
      { en: 'seven',  ua: 'сім',        tr: 'с[е]вен' },
      { en: 'eight',  ua: 'вісім',      tr: '[ей]т' },
      { en: 'nine',   ua: "дев'ять",    tr: 'н[а]йн' },
      { en: 'ten',    ua: 'десять',     tr: 'т[е]н' },
      { en: 'eleven', ua: 'одинадцять', tr: 'іл[е]вен' },
      { en: 'twelve', ua: 'дванадцять', tr: 'ту[е]лв' },
    ],
    sentences: [
      { en: 'I have two brothers.', ua: 'У мене два брати.', tr: 'ай гев ту бр[а]зерс' },
      { en: 'She is five.',         ua: "Їй п'ять років.",   tr: 'ші із ф[а]йв' },
      { en: 'We are three.',        ua: 'Нас троє.',         tr: 'уі а тр[і]' },
    ],
  },
  {
    id: 4, level: 'A0', icon: '🔟', title: 'Числа 13–100', subtitle: 'Десятки і велике',
    grammar: 'Складені числа пишемо через дефіс: twenty-<b>one</b>, thirty-<b>five</b>. Сотня: <b>one hundred</b>.',
    cards: [
      { en: 'thirteen',  ua: 'тринадцять',    tr: 'сёрт[і]н' },
      { en: 'fourteen',  ua: 'чотирнадцять',  tr: 'фот[і]н' },
      { en: 'fifteen',   ua: "п'ятнадцять",   tr: 'фіфт[і]н' },
      { en: 'sixteen',   ua: 'шістнадцять',   tr: 'сікст[і]н' },
      { en: 'seventeen', ua: 'сімнадцять',    tr: 'севент[і]н' },
      { en: 'eighteen',  ua: 'вісімнадцять',  tr: 'ейт[і]н' },
      { en: 'nineteen',  ua: "дев'ятнадцять", tr: 'найнт[і]н' },
      { en: 'twenty',   ua: 'двадцять',     tr: 'ту[е]нті' },
      { en: 'thirty',   ua: 'тридцять',     tr: 'с[ё]рті' },
      { en: 'forty',    ua: 'сорок',        tr: 'ф[о]рті' },
      { en: 'fifty',    ua: "п'ятдесят",    tr: 'ф[і]фті' },
      { en: 'sixty',    ua: 'шістдесят',    tr: 'с[і]ксті' },
      { en: 'seventy',  ua: 'сімдесят',     tr: 'с[е]венті' },
      { en: 'eighty',   ua: 'вісімдесят',   tr: '[ей]ті' },
      { en: 'ninety',   ua: "дев'яносто",   tr: 'н[а]йнті' },
      { en: 'hundred',  ua: 'сто',          tr: 'г[а]ндред' },
    ],
    sentences: [
      { en: 'I am twenty.',       ua: 'Мені двадцять.',       tr: 'ай ем ту[е]нті' },
      { en: 'It costs fifty.',    ua: "Це коштує п'ятдесят.", tr: 'іт костс ф[і]фті' },
      { en: 'There are thirteen.', ua: 'Їх тринадцять.',      tr: 'зеа а сёрт[і]н' },
    ],
  },
  {
    id: 5, level: 'A0', icon: '👋', title: 'Перші фрази', subtitle: 'Привітатися і бути ввічливим',
    cards: [
      { en: 'hello',     ua: 'привіт',           tr: 'гел[о]у' },
      { en: 'hi',        ua: 'привіт (неформ.)',  tr: 'г[а]й' },
      { en: 'goodbye',   ua: 'до побачення',     tr: 'гудб[а]й' },
      { en: 'please',    ua: 'будь ласка',       tr: 'пл[і]з' },
      { en: 'thank you', ua: 'дякую',            tr: 'с[е]нк ю' },
      { en: 'yes',       ua: 'так',              tr: '[є]с' },
      { en: 'no',        ua: 'ні',               tr: 'н[о]у' },
      { en: 'sorry',     ua: 'вибач',            tr: 'с[о]рі' },
      { en: 'excuse me', ua: 'перепрошую',       tr: 'ікскь[ю]з мі' },
      { en: "you're welcome", ua: 'нема за що',  tr: 'юр у[е]лкам' },
    ],
    sentences: [
      { en: 'Hello, how are you?', ua: 'Привіт, як справи?', tr: 'гел[о]у гау а ю' },
      { en: 'My name is Anna.',    ua: 'Мене звати Анна.',   tr: 'май н[ей]м із [е]на' },
      { en: 'Yes, please.',        ua: 'Так, будь ласка.',   tr: 'єс пл[і]з' },
    ],
  },
  {
    id: 6, level: 'A0', icon: '👉', title: 'Це і той', subtitle: 'Показуємо на речі',
    grammar: '<b>this/these</b> — близько, <b>that/those</b> — далеко: <b>this</b> book, <b>that</b> house.',
    cards: [
      { en: 'this',  ua: 'це, цей',  tr: 'з[і]с' },
      { en: 'that',  ua: 'те, той',  tr: 'з[е]т' },
      { en: 'here',  ua: 'тут',      tr: 'г[і]а' },
      { en: 'there', ua: 'там',      tr: 'з[е]а' },
      { en: 'good',  ua: 'добре',    tr: 'г[у]д' },
      { en: 'bad',   ua: 'погано',   tr: 'б[е]д' },
      { en: 'big',   ua: 'великий',  tr: 'б[і]г' },
      { en: 'small', ua: 'малий',    tr: 'см[о]л' },
    ],
    sentences: [
      { en: 'This is good.', ua: 'Це добре.',  tr: 'зіс із г[у]д' },
      { en: 'That is big.',  ua: 'Те велике.', tr: 'зет із б[і]г' },
      { en: 'I am here.',    ua: 'Я тут.',     tr: 'ай ем г[і]а' },
      { en: 'It is small.',  ua: 'Воно мале.', tr: 'іт із см[о]л' },
    ],
  },

  /* ================= A1 ================= */
  {
    "id": 7,
    "level": "A1",
    "icon": "🔗",
    "title": "Дієслово to be",
    "subtitle": "am/is/are — 3 часи",
    "type": "verbs",
    "grammar": "be = «бути». Часи: Теперішній (am/is/are), Минулий (was/were), Майбутній (will be).<br>Приклад: Tomorrow I will be at home.",
    "verbs": [
      {
        "inf": "to be",
        "ua": "бути",
        "tr": "ту б[і]",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "am",
                "tr": "ай [ем]"
              },
              {
                "p": "you",
                "f": "are",
                "tr": "ю [а]"
              },
              {
                "p": "he/she",
                "f": "is",
                "tr": "гі [із]"
              },
              {
                "p": "we",
                "f": "are",
                "tr": "уі [а]"
              },
              {
                "p": "they",
                "f": "are",
                "tr": "зей [а]"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "was",
                "tr": "ай у[о]з"
              },
              {
                "p": "you",
                "f": "were",
                "tr": "ю у[ё]р"
              },
              {
                "p": "he/she",
                "f": "was",
                "tr": "гі у[о]з"
              },
              {
                "p": "we",
                "f": "were",
                "tr": "уі у[ё]р"
              },
              {
                "p": "they",
                "f": "were",
                "tr": "зей у[ё]р"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will be",
                "tr": "уіл б[і]"
              },
              {
                "p": "you",
                "f": "will be",
                "tr": "уіл б[і]"
              },
              {
                "p": "he/she",
                "f": "will be",
                "tr": "уіл б[і]"
              },
              {
                "p": "we",
                "f": "will be",
                "tr": "уіл б[і]"
              },
              {
                "p": "they",
                "f": "will be",
                "tr": "уіл б[і]"
              }
            ]
          }
        ]
      }
    ],
    "cards": [
      {
        "en": "to be",
        "ua": "бути",
        "tr": "ту б[і]"
      }
    ],
    "sentences": [
      {
        "en": "I am a student.",
        "ua": "Я студент.",
        "tr": "ай ем е ст[ю]дент"
      },
      {
        "en": "She is here.",
        "ua": "Вона тут.",
        "tr": "ші із г[і]а"
      },
      {
        "en": "They are happy.",
        "ua": "Вони щасливі.",
        "tr": "зей а г[е]пі"
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
    "grammar": "Теперішній: з he/she +-s. Минулий: неправильні (went, saw, had). Майбутній: <b>will</b> + дієслово.<br>Приклад: He will go tomorrow.",
    "verbs": [
      {
        "inf": "to want",
        "ua": "хотіти",
        "tr": "ту у[о]нт",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "want",
                "tr": "ай у[о]нт"
              },
              {
                "p": "you",
                "f": "want",
                "tr": "ю у[о]нт"
              },
              {
                "p": "he/she",
                "f": "wants",
                "tr": "гі у[о]нтс"
              },
              {
                "p": "we",
                "f": "want",
                "tr": "уі у[о]нт"
              },
              {
                "p": "they",
                "f": "want",
                "tr": "зей у[о]нт"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "wanted",
                "tr": "у[о]нтід"
              },
              {
                "p": "you",
                "f": "wanted",
                "tr": "у[о]нтід"
              },
              {
                "p": "he/she",
                "f": "wanted",
                "tr": "у[о]нтід"
              },
              {
                "p": "we",
                "f": "wanted",
                "tr": "у[о]нтід"
              },
              {
                "p": "they",
                "f": "wanted",
                "tr": "у[о]нтід"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will want",
                "tr": "уіл у[о]нт"
              },
              {
                "p": "you",
                "f": "will want",
                "tr": "уіл у[о]нт"
              },
              {
                "p": "he/she",
                "f": "will want",
                "tr": "уіл у[о]нт"
              },
              {
                "p": "we",
                "f": "will want",
                "tr": "уіл у[о]нт"
              },
              {
                "p": "they",
                "f": "will want",
                "tr": "уіл у[о]нт"
              }
            ]
          }
        ]
      },
      {
        "inf": "to have",
        "ua": "мати",
        "tr": "ту г[е]в",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "have",
                "tr": "ай г[е]в"
              },
              {
                "p": "you",
                "f": "have",
                "tr": "ю г[е]в"
              },
              {
                "p": "he/she",
                "f": "has",
                "tr": "гі г[е]з"
              },
              {
                "p": "we",
                "f": "have",
                "tr": "уі г[е]в"
              },
              {
                "p": "they",
                "f": "have",
                "tr": "зей г[е]в"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "had",
                "tr": "г[е]д"
              },
              {
                "p": "you",
                "f": "had",
                "tr": "г[е]д"
              },
              {
                "p": "he/she",
                "f": "had",
                "tr": "г[е]д"
              },
              {
                "p": "we",
                "f": "had",
                "tr": "г[е]д"
              },
              {
                "p": "they",
                "f": "had",
                "tr": "г[е]д"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will have",
                "tr": "уіл г[е]в"
              },
              {
                "p": "you",
                "f": "will have",
                "tr": "уіл г[е]в"
              },
              {
                "p": "he/she",
                "f": "will have",
                "tr": "уіл г[е]в"
              },
              {
                "p": "we",
                "f": "will have",
                "tr": "уіл г[е]в"
              },
              {
                "p": "they",
                "f": "will have",
                "tr": "уіл г[е]в"
              }
            ]
          }
        ]
      },
      {
        "inf": "to go",
        "ua": "йти",
        "tr": "ту г[о]у",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "go",
                "tr": "ай г[о]у"
              },
              {
                "p": "you",
                "f": "go",
                "tr": "ю г[о]у"
              },
              {
                "p": "he/she",
                "f": "goes",
                "tr": "гі г[о]уз"
              },
              {
                "p": "we",
                "f": "go",
                "tr": "уі г[о]у"
              },
              {
                "p": "they",
                "f": "go",
                "tr": "зей г[о]у"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "went",
                "tr": "у[е]нт"
              },
              {
                "p": "you",
                "f": "went",
                "tr": "у[е]нт"
              },
              {
                "p": "he/she",
                "f": "went",
                "tr": "у[е]нт"
              },
              {
                "p": "we",
                "f": "went",
                "tr": "у[е]нт"
              },
              {
                "p": "they",
                "f": "went",
                "tr": "у[е]нт"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will go",
                "tr": "уіл г[о]у"
              },
              {
                "p": "you",
                "f": "will go",
                "tr": "уіл г[о]у"
              },
              {
                "p": "he/she",
                "f": "will go",
                "tr": "уіл г[о]у"
              },
              {
                "p": "we",
                "f": "will go",
                "tr": "уіл г[о]у"
              },
              {
                "p": "they",
                "f": "will go",
                "tr": "уіл г[о]у"
              }
            ]
          }
        ]
      },
      {
        "inf": "to like",
        "ua": "подобатись",
        "tr": "ту л[а]йк",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "like",
                "tr": "ай л[а]йк"
              },
              {
                "p": "you",
                "f": "like",
                "tr": "ю л[а]йк"
              },
              {
                "p": "he/she",
                "f": "likes",
                "tr": "гі л[а]йкс"
              },
              {
                "p": "we",
                "f": "like",
                "tr": "уі л[а]йк"
              },
              {
                "p": "they",
                "f": "like",
                "tr": "зей л[а]йк"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "liked",
                "tr": "л[а]йкт"
              },
              {
                "p": "you",
                "f": "liked",
                "tr": "л[а]йкт"
              },
              {
                "p": "he/she",
                "f": "liked",
                "tr": "л[а]йкт"
              },
              {
                "p": "we",
                "f": "liked",
                "tr": "л[а]йкт"
              },
              {
                "p": "they",
                "f": "liked",
                "tr": "л[а]йкт"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will like",
                "tr": "уіл л[а]йк"
              },
              {
                "p": "you",
                "f": "will like",
                "tr": "уіл л[а]йк"
              },
              {
                "p": "he/she",
                "f": "will like",
                "tr": "уіл л[а]йк"
              },
              {
                "p": "we",
                "f": "will like",
                "tr": "уіл л[а]йк"
              },
              {
                "p": "they",
                "f": "will like",
                "tr": "уіл л[а]йк"
              }
            ]
          }
        ]
      },
      {
        "inf": "to need",
        "ua": "потребувати",
        "tr": "ту н[і]д",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "need",
                "tr": "ай н[і]д"
              },
              {
                "p": "you",
                "f": "need",
                "tr": "ю н[і]д"
              },
              {
                "p": "he/she",
                "f": "needs",
                "tr": "гі н[і]дз"
              },
              {
                "p": "we",
                "f": "need",
                "tr": "уі н[і]д"
              },
              {
                "p": "they",
                "f": "need",
                "tr": "зей н[і]д"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "needed",
                "tr": "н[і]дід"
              },
              {
                "p": "you",
                "f": "needed",
                "tr": "н[і]дід"
              },
              {
                "p": "he/she",
                "f": "needed",
                "tr": "н[і]дід"
              },
              {
                "p": "we",
                "f": "needed",
                "tr": "н[і]дід"
              },
              {
                "p": "they",
                "f": "needed",
                "tr": "н[і]дід"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will need",
                "tr": "уіл н[і]д"
              },
              {
                "p": "you",
                "f": "will need",
                "tr": "уіл н[і]д"
              },
              {
                "p": "he/she",
                "f": "will need",
                "tr": "уіл н[і]д"
              },
              {
                "p": "we",
                "f": "will need",
                "tr": "уіл н[і]д"
              },
              {
                "p": "they",
                "f": "will need",
                "tr": "уіл н[і]д"
              }
            ]
          }
        ]
      },
      {
        "inf": "can",
        "ua": "могти",
        "tr": "к[е]н",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "can",
                "tr": "ай к[е]н"
              },
              {
                "p": "you",
                "f": "can",
                "tr": "ю к[е]н"
              },
              {
                "p": "he/she",
                "f": "can",
                "tr": "гі к[е]н"
              },
              {
                "p": "we",
                "f": "can",
                "tr": "уі к[е]н"
              },
              {
                "p": "they",
                "f": "can",
                "tr": "зей к[е]н"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "could",
                "tr": "к[у]д"
              },
              {
                "p": "you",
                "f": "could",
                "tr": "к[у]д"
              },
              {
                "p": "he/she",
                "f": "could",
                "tr": "к[у]д"
              },
              {
                "p": "we",
                "f": "could",
                "tr": "к[у]д"
              },
              {
                "p": "they",
                "f": "could",
                "tr": "к[у]д"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will be able to",
                "tr": "уіл бі [ей]бл ту"
              },
              {
                "p": "you",
                "f": "will be able to",
                "tr": "уіл бі [ей]бл ту"
              },
              {
                "p": "he/she",
                "f": "will be able to",
                "tr": "уіл бі [ей]бл ту"
              },
              {
                "p": "we",
                "f": "will be able to",
                "tr": "уіл бі [ей]бл ту"
              },
              {
                "p": "they",
                "f": "will be able to",
                "tr": "уіл бі [ей]бл ту"
              }
            ]
          }
        ]
      },
      {
        "inf": "to see",
        "ua": "бачити",
        "tr": "ту с[і]",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "see",
                "tr": "ай с[і]"
              },
              {
                "p": "you",
                "f": "see",
                "tr": "ю с[і]"
              },
              {
                "p": "he/she",
                "f": "sees",
                "tr": "гі с[і]з"
              },
              {
                "p": "we",
                "f": "see",
                "tr": "уі с[і]"
              },
              {
                "p": "they",
                "f": "see",
                "tr": "зей с[і]"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "saw",
                "tr": "с[о]"
              },
              {
                "p": "you",
                "f": "saw",
                "tr": "с[о]"
              },
              {
                "p": "he/she",
                "f": "saw",
                "tr": "с[о]"
              },
              {
                "p": "we",
                "f": "saw",
                "tr": "с[о]"
              },
              {
                "p": "they",
                "f": "saw",
                "tr": "с[о]"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will see",
                "tr": "уіл с[і]"
              },
              {
                "p": "you",
                "f": "will see",
                "tr": "уіл с[і]"
              },
              {
                "p": "he/she",
                "f": "will see",
                "tr": "уіл с[і]"
              },
              {
                "p": "we",
                "f": "will see",
                "tr": "уіл с[і]"
              },
              {
                "p": "they",
                "f": "will see",
                "tr": "уіл с[і]"
              }
            ]
          }
        ]
      },
      {
        "inf": "to know",
        "ua": "знати",
        "tr": "ту н[о]у",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "know",
                "tr": "ай н[о]у"
              },
              {
                "p": "you",
                "f": "know",
                "tr": "ю н[о]у"
              },
              {
                "p": "he/she",
                "f": "knows",
                "tr": "гі н[о]уз"
              },
              {
                "p": "we",
                "f": "know",
                "tr": "уі н[о]у"
              },
              {
                "p": "they",
                "f": "know",
                "tr": "зей н[о]у"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "knew",
                "tr": "нь[ю]"
              },
              {
                "p": "you",
                "f": "knew",
                "tr": "нь[ю]"
              },
              {
                "p": "he/she",
                "f": "knew",
                "tr": "нь[ю]"
              },
              {
                "p": "we",
                "f": "knew",
                "tr": "нь[ю]"
              },
              {
                "p": "they",
                "f": "knew",
                "tr": "нь[ю]"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will know",
                "tr": "уіл н[о]у"
              },
              {
                "p": "you",
                "f": "will know",
                "tr": "уіл н[о]у"
              },
              {
                "p": "he/she",
                "f": "will know",
                "tr": "уіл н[о]у"
              },
              {
                "p": "we",
                "f": "will know",
                "tr": "уіл н[о]у"
              },
              {
                "p": "they",
                "f": "will know",
                "tr": "уіл н[о]у"
              }
            ]
          }
        ]
      }
    ],
    "cards": [
      {
        "en": "to want",
        "ua": "хотіти",
        "tr": "ту у[о]нт"
      },
      {
        "en": "to have",
        "ua": "мати",
        "tr": "ту г[е]в"
      },
      {
        "en": "to go",
        "ua": "йти",
        "tr": "ту г[о]у"
      },
      {
        "en": "to like",
        "ua": "подобатись",
        "tr": "ту л[а]йк"
      },
      {
        "en": "to need",
        "ua": "потребувати",
        "tr": "ту н[і]д"
      },
      {
        "en": "can",
        "ua": "могти",
        "tr": "к[е]н"
      },
      {
        "en": "to see",
        "ua": "бачити",
        "tr": "ту с[і]"
      },
      {
        "en": "to know",
        "ua": "знати",
        "tr": "ту н[о]у"
      }
    ],
    "sentences": [
      {
        "en": "I want coffee.",
        "ua": "Я хочу кави.",
        "tr": "ай уонт к[о]фі"
      },
      {
        "en": "She has a cat.",
        "ua": "У неї є кіт.",
        "tr": "ші гез е к[е]т"
      },
      {
        "en": "We like tea.",
        "ua": "Нам подобається чай.",
        "tr": "уі лайк т[і]"
      }
    ]
  },
  {
    id: 9, level: 'A1', icon: '👨‍👩‍👧', title: 'Родина', subtitle: 'Найближчі люди',
    grammar: 'Присвійні: <b>my</b> (мій), <b>your</b> (твій), <b>his</b> (його), <b>her</b> (її): <b>my</b> mother.',
    cards: [
      { en: 'mother',   ua: 'мама',   tr: 'м[а]зер' },
      { en: 'father',   ua: 'тато',   tr: 'ф[а]зер' },
      { en: 'sister',   ua: 'сестра', tr: 'с[і]стер' },
      { en: 'brother',  ua: 'брат',   tr: 'бр[а]зер' },
      { en: 'son',      ua: 'син',    tr: 'с[а]н' },
      { en: 'daughter', ua: 'дочка',  tr: 'д[о]тер' },
      { en: 'family',   ua: 'родина', tr: 'ф[е]мілі' },
      { en: 'parents',  ua: 'батьки', tr: 'п[е]рентс' },
      { en: 'grandmother', ua: 'бабуся', tr: 'гр[е]ндмазер' },
      { en: 'grandfather', ua: 'дідусь', tr: 'гр[е]ндфазер' },
    ],
    sentences: [
      { en: 'This is my mother.', ua: 'Це моя мама.',   tr: 'зіс із май м[а]зер' },
      { en: 'I have a brother.',  ua: 'У мене є брат.', tr: 'ай гев е бр[а]зер' },
      { en: 'We are a family.',   ua: 'Ми родина.',     tr: 'уі а ф[е]мілі' },
    ],
  },
  {
    id: 10, level: 'A1', icon: '🎨', title: 'Кольори', subtitle: 'Основні кольори',
    grammar: 'Колір ставимо перед іменником, і він не змінюється: two <b>red</b> cars.',
    cards: [
      { en: 'red',    ua: 'червоний',     tr: 'р[е]д' },
      { en: 'blue',   ua: 'синій',        tr: 'бл[у]' },
      { en: 'green',  ua: 'зелений',      tr: 'гр[і]н' },
      { en: 'yellow', ua: 'жовтий',       tr: '[є]лоу' },
      { en: 'black',  ua: 'чорний',       tr: 'бл[е]к' },
      { en: 'white',  ua: 'білий',        tr: 'у[а]йт' },
      { en: 'orange', ua: 'помаранчевий', tr: '[о]ріндж' },
      { en: 'pink',   ua: 'рожевий',      tr: 'п[і]нк' },
      { en: 'brown',  ua: 'коричневий',   tr: 'бр[а]ун' },
      { en: 'grey',   ua: 'сірий',        tr: 'гр[е]й' },
    ],
    sentences: [
      { en: 'The sky is blue.',     ua: 'Небо синє.',                 tr: 'зе скай із бл[у]' },
      { en: 'I like red.',          ua: 'Мені подобається червоний.', tr: 'ай лайк р[е]д' },
      { en: 'This apple is green.', ua: 'Це яблуко зелене.',          tr: 'зіс епл із гр[і]н' },
    ],
  },
  {
    id: 11, level: 'A1', icon: '📅', title: 'Дні тижня', subtitle: 'Від понеділка до неділі',
    grammar: 'Дні тижня — з великої літери й з прийменником <b>on</b>: <b>on</b> Monday, <b>on</b> Friday.',
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
      { en: 'weekend',   ua: 'вихідні',   tr: 'у[і]кенд' },
      { en: 'day',       ua: 'день',      tr: 'д[е]й' },
    ],
    sentences: [
      { en: 'See you on Monday.',  ua: 'Побачимось у понеділок.', tr: 'сі ю он м[а]ндей' },
      { en: 'Today is Friday.',    ua: "Сьогодні п'ятниця.",      tr: 'туд[е]й із фр[а]йдей' },
      { en: 'Tomorrow is Sunday.', ua: 'Завтра неділя.',          tr: 'тум[о]роу із с[а]ндей' },
    ],
  },
  {
    id: 12, level: 'A1', icon: '🍂', title: 'Місяці і пори року', subtitle: 'Календар',
    grammar: 'Місяці — з великої літери й з прийменником <b>in</b>: <b>in</b> July, <b>in</b> summer.',
    cards: [
      { en: 'spring',  ua: 'весна',     tr: 'спр[і]нг' },
      { en: 'summer',  ua: 'літо',      tr: 'с[а]мер' },
      { en: 'autumn',  ua: 'осінь',     tr: '[о]тем' },
      { en: 'winter',  ua: 'зима',      tr: 'у[і]нтер' },
      { en: 'January', ua: 'січень',    tr: 'дж[е]нюері' },
      { en: 'July',    ua: 'липень',    tr: 'джул[а]й' },
      { en: 'month',   ua: 'місяць',    tr: 'м[а]нс' },
      { en: 'year',    ua: 'рік',       tr: 'й[і]а' },
      { en: 'week',    ua: 'тиждень',   tr: 'у[і]к' },
      { en: 'season',  ua: 'пора року', tr: 'с[і]зн' },
      { en: 'March',    ua: 'березень', tr: 'м[а]рч' },
      { en: 'December', ua: 'грудень',  tr: 'діс[е]мбер' },
    ],
    sentences: [
      { en: 'Summer is hot.',     ua: 'Літо спекотне.',            tr: 'самер із г[о]т' },
      { en: 'I like autumn.',     ua: 'Мені подобається осінь.',   tr: 'ай лайк [о]тем' },
      { en: 'It is a long year.', ua: 'Це довгий рік.',            tr: 'іт із е лонг й[і]а' },
    ],
  },
  {
    id: 13, level: 'A1', icon: '🍎', title: 'Їжа і напої', subtitle: 'Що їмо і п’ємо',
    grammar: 'Незлічувані слова (water, bread, milk) — без a/an: I want <b>water</b> (не «a water»).',
    cards: [
      { en: 'water',  ua: 'вода',   tr: 'у[о]тер' },
      { en: 'bread',  ua: 'хліб',   tr: 'бр[е]д' },
      { en: 'coffee', ua: 'кава',   tr: 'к[о]фі' },
      { en: 'tea',    ua: 'чай',    tr: 'т[і]' },
      { en: 'apple',  ua: 'яблуко', tr: '[е]пл' },
      { en: 'milk',   ua: 'молоко', tr: 'м[і]лк' },
      { en: 'meat',   ua: "м'ясо",  tr: 'м[і]т' },
      { en: 'egg',    ua: 'яйце',   tr: '[е]г' },
      { en: 'cheese', ua: 'сир',    tr: 'ч[і]з' },
      { en: 'rice',   ua: 'рис',    tr: 'р[а]йс' },
    ],
    sentences: [
      { en: 'I want water, please.',  ua: 'Я хочу води, будь ласка.',        tr: 'ай уонт у[о]тер пл[і]з' },
      { en: 'Coffee or tea?',         ua: 'Кава чи чай?',                    tr: 'к[о]фі о т[і]' },
      { en: 'I like bread and milk.', ua: 'Мені подобається хліб і молоко.', tr: 'ай лайк бред енд м[і]лк' },
    ],
  },
  {
    id: 14, level: 'A1', icon: '🧍', title: 'Тіло', subtitle: 'Частини тіла',
    cards: [
      { en: 'hand',  ua: 'рука',    tr: 'г[е]нд' },
      { en: 'eye',   ua: 'око',     tr: '[а]й' },
      { en: 'ear',   ua: 'вухо',    tr: '[і]а' },
      { en: 'nose',  ua: 'ніс',     tr: 'н[о]уз' },
      { en: 'mouth', ua: 'рот',     tr: 'м[а]ус' },
      { en: 'leg',   ua: 'нога',    tr: 'л[е]г' },
      { en: 'hair',  ua: 'волосся', tr: 'г[е]а' },
      { en: 'heart', ua: 'серце',   tr: 'г[а]рт' },
      { en: 'face',  ua: 'обличчя', tr: 'ф[е]йс' },
      { en: 'finger', ua: 'палець', tr: 'ф[і]нгер' },
      { en: 'tooth',  ua: 'зуб',    tr: 'т[у]с' },
    ],
    sentences: [
      { en: 'My hand hurts.',    ua: 'У мене болить рука.',   tr: 'май генд гёртс' },
      { en: 'Her eyes are blue.', ua: 'Її очі сині.',         tr: 'гё айз а бл[у]' },
      { en: 'I have long hair.', ua: 'У мене довге волосся.', tr: 'ай гев лонг г[е]а' },
    ],
  },
  {
    id: 15, level: 'A1', icon: '👕', title: 'Одяг', subtitle: 'Що вдягаємо',
    cards: [
      { en: 'shirt',    ua: 'сорочка',   tr: 'ш[ё]рт' },
      { en: 'trousers', ua: 'штани',     tr: 'тр[а]узерз' },
      { en: 'shoes',    ua: 'взуття',    tr: 'ш[у]з' },
      { en: 'dress',    ua: 'сукня',     tr: 'др[е]с' },
      { en: 'jacket',   ua: 'куртка',    tr: 'дж[е]кет' },
      { en: 'hat',      ua: 'капелюх',   tr: 'г[е]т' },
      { en: 'socks',    ua: 'шкарпетки', tr: 'с[о]кс' },
      { en: 'coat',     ua: 'пальто',    tr: 'к[о]ут' },
      { en: 'belt',     ua: 'пояс',      tr: 'б[е]лт' },
      { en: 'glasses',  ua: 'окуляри',   tr: 'гл[а]сіз' },
    ],
    sentences: [
      { en: 'I like this dress.', ua: 'Мені подобається ця сукня.', tr: 'ай лайк зіс др[е]с' },
      { en: 'The shoes are new.', ua: 'Взуття нове.',               tr: 'зе шуз а нь[ю]' },
      { en: 'Where is my hat?',   ua: 'Де мій капелюх?',            tr: 'уеа із май г[е]т' },
    ],
  },

  /* ================= A2 ================= */
  {
    id: 16, level: 'A2', icon: '☕', title: 'У кафе', subtitle: 'Замовити і розрахуватись',
    grammar: 'Ввічливе прохання: <b>Can I have…?</b> або <b>I would like…</b> + що саме.',
    cards: [
      { en: 'menu',        ua: 'меню',       tr: 'м[е]нью' },
      { en: 'bill',        ua: 'рахунок',    tr: 'б[і]л' },
      { en: 'order',       ua: 'замовлення', tr: '[о]рдер' },
      { en: 'table',       ua: 'столик',     tr: 'т[е]йбл' },
      { en: 'waiter',      ua: 'офіціант',   tr: 'у[е]йтер' },
      { en: 'delicious',   ua: 'смачно',     tr: 'діл[і]шес' },
      { en: 'how much',    ua: 'скільки',    tr: 'гау м[а]ч' },
      { en: 'I would like', ua: 'я б хотів',  tr: 'ай уд л[а]йк' },
      { en: 'coffee',      ua: 'кава',        tr: 'к[о]фі' },
      { en: 'water',       ua: 'вода',        tr: 'у[о]тер' },
    ],
    sentences: [
      { en: 'Can I have the menu?',   ua: 'Можна меню?',          tr: 'кен ай гев зе м[е]нью' },
      { en: 'The bill, please.',      ua: 'Рахунок, будь ласка.', tr: 'зе біл пл[і]з' },
      { en: 'The food is delicious.', ua: 'Їжа смачна.',          tr: 'зе фуд із діл[і]шес' },
    ],
  },
  {
    id: 17, level: 'A2', icon: '🕒', title: 'Час', subtitle: 'Котра година',
    grammar: 'Котра година: <b>It is</b> + число + <b>o’clock</b>: It is five o’clock.',
    cards: [
      { en: 'hour',    ua: 'година',        tr: '[а]уер' },
      { en: 'minute',  ua: 'хвилина',       tr: 'м[і]ніт' },
      { en: 'now',     ua: 'зараз',         tr: 'н[а]у' },
      { en: 'early',   ua: 'рано',          tr: '[ё]рлі' },
      { en: 'late',    ua: 'пізно',         tr: 'л[е]йт' },
      { en: 'morning', ua: 'ранок',         tr: 'м[о]рнінг' },
      { en: 'evening', ua: 'вечір',         tr: '[і]внінг' },
      { en: "o'clock", ua: 'година (рівно)', tr: 'окл[о]к' },
    ],
    sentences: [
      { en: 'What time is it?',     ua: 'Котра година?', tr: 'уот тайм із іт' },
      { en: "It is three o'clock.", ua: 'Зараз третя.',  tr: 'іт із тр[і] окл[о]к' },
      { en: 'I am late.',           ua: 'Я запізнююсь.', tr: 'ай ем л[е]йт' },
    ],
  },
  {
    id: 18, level: 'A2', icon: '🌦️', title: 'Погода', subtitle: 'Яка погода надворі',
    grammar: 'Про погоду кажемо через <b>It is</b>: <b>It is</b> cold, <b>It is</b> raining.',
    cards: [
      { en: 'sun',   ua: 'сонце',    tr: 'с[а]н' },
      { en: 'rain',  ua: 'дощ',      tr: 'р[е]йн' },
      { en: 'snow',  ua: 'сніг',     tr: 'сн[о]у' },
      { en: 'wind',  ua: 'вітер',    tr: 'у[і]нд' },
      { en: 'hot',   ua: 'спекотно', tr: 'г[о]т' },
      { en: 'cold',  ua: 'холодно',  tr: 'к[о]улд' },
      { en: 'cloud', ua: 'хмара',    tr: 'кл[а]уд' },
      { en: 'warm',  ua: 'тепло',    tr: 'у[о]рм' },
      { en: 'storm', ua: 'буря',     tr: 'ст[о]рм' },
      { en: 'fog',   ua: 'туман',    tr: 'ф[о]г' },
    ],
    sentences: [
      { en: 'It is raining.',    ua: 'Іде дощ.',               tr: 'іт із р[е]йнінг' },
      { en: 'It is cold today.', ua: 'Сьогодні холодно.',      tr: 'іт із к[о]улд туд[е]й' },
      { en: 'I like the snow.',  ua: 'Мені подобається сніг.', tr: 'ай лайк зе сн[о]у' },
    ],
  },
  {
    id: 19, level: 'A2', icon: '🏠', title: 'Дім', subtitle: 'Будинок і кімнати',
    cards: [
      { en: 'house',  ua: 'будинок', tr: 'г[а]ус' },
      { en: 'room',   ua: 'кімната', tr: 'р[у]м' },
      { en: 'kitchen',ua: 'кухня',   tr: 'к[і]чен' },
      { en: 'door',   ua: 'двері',   tr: 'д[о]р' },
      { en: 'window', ua: 'вікно',   tr: 'у[і]ндоу' },
      { en: 'bed',    ua: 'ліжко',   tr: 'б[е]д' },
      { en: 'chair',  ua: 'стілець', tr: 'ч[е]а' },
      { en: 'floor',  ua: 'підлога', tr: 'фл[о]р' },
      { en: 'wall',   ua: 'стіна',   tr: 'у[о]л' },
      { en: 'bathroom', ua: 'ванна', tr: 'б[а]срум' },
    ],
    sentences: [
      { en: 'My room is small.',   ua: 'Моя кімната маленька.', tr: 'май рум із см[о]л' },
      { en: 'Open the door.',      ua: 'Відчини двері.',        tr: '[о]упен зе д[о]р' },
      { en: 'The kitchen is big.', ua: 'Кухня велика.',         tr: 'зе кічен із б[і]г' },
    ],
  },
  {
    id: 20, level: 'A2', icon: '🏙️', title: 'Місто', subtitle: 'Орієнтуємось у місті',
    cards: [
      { en: 'city',    ua: 'місто',    tr: 'с[і]ті' },
      { en: 'street',  ua: 'вулиця',   tr: 'стр[і]т' },
      { en: 'shop',    ua: 'магазин',  tr: 'ш[о]п' },
      { en: 'money',   ua: 'гроші',    tr: 'м[а]ні' },
      { en: 'bus',     ua: 'автобус',  tr: 'б[а]с' },
      { en: 'station', ua: 'станція',  tr: 'ст[е]йшн' },
      { en: 'left',    ua: 'ліворуч',  tr: 'л[е]фт' },
      { en: 'right',   ua: 'праворуч', tr: 'р[а]йт' },
      { en: 'near',    ua: 'близько',  tr: 'н[і]а' },
      { en: 'park',    ua: 'парк',     tr: 'п[а]рк' },
      { en: 'market',  ua: 'ринок',    tr: 'м[а]ркіт' },
    ],
    sentences: [
      { en: 'Where is the bus station?', ua: 'Де автобусна станція?', tr: 'уеа із зе бас ст[е]йшн' },
      { en: 'The shop is on the left.',  ua: 'Магазин ліворуч.',      tr: 'зе шоп із он зе л[е]фт' },
      { en: 'I need money.',             ua: 'Мені потрібні гроші.',  tr: 'ай нід м[а]ні' },
    ],
  },
  {
    id: 21, level: 'A2', icon: '🚗', title: 'Транспорт', subtitle: 'Як пересуватися',
    grammar: 'Спосіб пересування — прийменник <b>by</b>: <b>by</b> car, <b>by</b> bus, <b>by</b> train.',
    cards: [
      { en: 'car',      ua: 'авто',           tr: 'к[а]р' },
      { en: 'train',    ua: 'потяг',          tr: 'тр[е]йн' },
      { en: 'plane',    ua: 'літак',          tr: 'пл[е]йн' },
      { en: 'bike',     ua: 'велосипед',      tr: 'б[а]йк' },
      { en: 'taxi',     ua: 'таксі',          tr: 'т[е]ксі' },
      { en: 'ship',     ua: 'корабель',       tr: 'ш[і]п' },
      { en: 'road',     ua: 'дорога',         tr: 'р[о]уд' },
      { en: 'to drive', ua: 'керувати (авто)', tr: 'ту др[а]йв' },
      { en: 'ticket',   ua: 'квиток',          tr: 'т[і]кіт' },
      { en: 'to walk',  ua: 'йти пішки',       tr: 'ту у[о]к' },
    ],
    sentences: [
      { en: 'I go by car.',      ua: 'Я їду машиною.',    tr: 'ай гоу бай к[а]р' },
      { en: 'The train is late.', ua: 'Потяг спізнюється.', tr: 'зе трейн із л[е]йт' },
      { en: 'Can you drive?',    ua: 'Ти вмієш водити?',  tr: 'кен ю др[а]йв' },
    ],
  },
  {
    id: 22, level: 'A2', icon: '🛒', title: 'Покупки', subtitle: 'У магазині',
    grammar: 'Ціна: <b>How much is…?</b> Оплата: pay <b>by</b> card або <b>in</b> cash.',
    cards: [
      { en: 'store',     ua: 'крамниця', tr: 'ст[о]р' },
      { en: 'price',     ua: 'ціна',     tr: 'пр[а]йс' },
      { en: 'cheap',     ua: 'дешевий',  tr: 'ч[і]п' },
      { en: 'expensive', ua: 'дорогий',  tr: 'іксп[е]нсів' },
      { en: 'to buy',    ua: 'купувати', tr: 'ту б[а]й' },
      { en: 'to pay',    ua: 'платити',  tr: 'ту п[е]й' },
      { en: 'size',      ua: 'розмір',   tr: 'с[а]йз' },
      { en: 'card',      ua: 'картка',   tr: 'к[а]рд' },
      { en: 'to cost',   ua: 'коштувати', tr: 'ту к[о]ст' },
      { en: 'discount',  ua: 'знижка',    tr: 'д[і]скаунт' },
    ],
    sentences: [
      { en: 'How much is it?',        ua: 'Скільки це коштує?',      tr: 'гау мач із іт' },
      { en: 'It is too expensive.',   ua: 'Це надто дорого.',        tr: 'іт із ту іксп[е]нсів' },
      { en: 'I want to pay by card.', ua: 'Я хочу платити карткою.', tr: 'ай уонт ту пей бай к[а]рд' },
    ],
  },
  {
    id: 23, level: 'A2', icon: '📏', title: 'Описи', subtitle: 'Прикметники',
    grammar: 'В англійській прикметник ставимо <b>перед</b> іменником: a <b>big</b> house (не «house big»).',
    cards: [
      { en: 'tall',      ua: 'високий',            tr: 'т[о]л' },
      { en: 'short',     ua: 'низький / короткий', tr: 'ш[о]рт' },
      { en: 'easy',      ua: 'легкий',             tr: '[і]зі' },
      { en: 'difficult', ua: 'важкий',             tr: 'д[і]фікалт' },
      { en: 'fast',      ua: 'швидкий',            tr: 'ф[а]ст' },
      { en: 'slow',      ua: 'повільний',          tr: 'сл[о]у' },
      { en: 'beautiful', ua: 'гарний',             tr: 'бь[ю]тіфул' },
      { en: 'strong',    ua: 'сильний',            tr: 'стр[о]нг' },
    ],
    sentences: [
      { en: 'He is very tall.',       ua: 'Він дуже високий.', tr: 'гі із вері т[о]л' },
      { en: 'This is too difficult.', ua: 'Це надто важко.',   tr: 'зіс із ту д[і]фікалт' },
      { en: 'The car is fast.',       ua: 'Авто швидке.',      tr: 'зе кар із ф[а]ст' },
    ],
  },
  {
    id: 24, level: 'A2', icon: '📍', title: 'Прийменники місця', subtitle: 'Де що знаходиться',
    grammar: 'Прийменник ставимо <b>перед</b> місцем: <b>on</b> the table, <b>in</b> the car, <b>under</b> the bed.',
    cards: [
      { en: 'in',      ua: 'в',       tr: '[ін]' },
      { en: 'on',      ua: 'на',      tr: '[он]' },
      { en: 'under',   ua: 'під',     tr: '[а]ндер' },
      { en: 'behind',  ua: 'позаду',  tr: 'біх[а]йнд' },
      { en: 'next to', ua: 'поруч з', tr: 'н[е]кст ту' },
      { en: 'between', ua: 'між',     tr: 'бітв[і]н' },
      { en: 'over',    ua: 'над',     tr: '[о]увер' },
      { en: 'inside',  ua: 'всередині', tr: 'інс[а]йд' },
    ],
    sentences: [
      { en: 'I am in the car.',       ua: 'Я в авто.',       tr: 'ай ем ін зе к[а]р' },
      { en: 'It is under the table.', ua: 'Воно під столом.', tr: 'іт із андер зе т[е]йбл' },
      { en: 'The shop is next to the bank.', ua: 'Магазин поруч з банком.', tr: 'зе шоп із н[е]кст ту зе бенк' },
    ],
  },

  /* ================= B1 ================= */
  {
    id: 25, level: 'B1', icon: '✈️', title: 'Подорожі', subtitle: 'Аеропорт і готель',
    grammar: 'Напрямок — прийменник <b>to</b>: I fly <b>to</b> Madrid. Готель: I <b>booked</b> a hotel.',
    cards: [
      { en: 'airport',  ua: 'аеропорт',    tr: '[е]апорт' },
      { en: 'ticket',   ua: 'квиток',      tr: 'т[і]кет' },
      { en: 'luggage',  ua: 'багаж',       tr: 'л[а]гідж' },
      { en: 'passport', ua: 'паспорт',     tr: 'п[а]спорт' },
      { en: 'hotel',    ua: 'готель',      tr: 'гоут[е]л' },
      { en: 'flight',   ua: 'рейс',        tr: 'фл[а]йт' },
      { en: 'to book',  ua: 'забронювати', tr: 'ту б[у]к' },
      { en: 'arrival',  ua: 'прибуття',    tr: 'ер[а]йвл' },
      { en: 'gate',     ua: 'вихід (посадка)', tr: 'г[е]йт' },
      { en: 'delay',    ua: 'затримка',    tr: 'діл[е]й' },
    ],
    sentences: [
      { en: 'Where is my gate?',      ua: 'Де мій вихід?',          tr: 'уеа із май г[е]йт' },
      { en: 'I booked a hotel.',      ua: 'Я забронював готель.',   tr: 'ай букт е гоут[е]л' },
      { en: 'My flight has a delay.', ua: 'Мій рейс затримується.', tr: 'май флайт гез е діл[е]й' },
    ],
  },
  {
    id: 26, level: 'B1', icon: '💼', title: 'Робота', subtitle: 'Офіс і професії',
    cards: [
      { en: 'job',      ua: 'робота',    tr: 'дж[о]б' },
      { en: 'office',   ua: 'офіс',      tr: '[о]фіс' },
      { en: 'meeting',  ua: 'зустріч',   tr: 'м[і]тінг' },
      { en: 'boss',     ua: 'начальник', tr: 'б[о]с' },
      { en: 'salary',   ua: 'зарплата',  tr: 'с[е]лері' },
      { en: 'colleague',ua: 'колега',    tr: 'к[о]лі[г]' },
      { en: 'deadline', ua: 'дедлайн',   tr: 'д[е]длайн' },
      { en: 'to work',  ua: 'працювати', tr: 'ту у[ё]рк' },
      { en: 'email',    ua: 'імейл',     tr: '[і]мейл' },
      { en: 'project',  ua: 'проєкт',    tr: 'пр[о]джект' },
    ],
    sentences: [
      { en: 'I have a meeting.',           ua: 'У мене зустріч.',              tr: 'ай гев е м[і]тінг' },
      { en: 'She works in an office.',     ua: 'Вона працює в офісі.',         tr: 'ші уёркс ін ен [о]фіс' },
      { en: 'The project has a deadline.', ua: 'У проєкту є дедлайн.',         tr: 'зе проджект гез е д[е]длайн' },
    ],
  },
  {
    id: 27, level: 'B1', icon: '🩺', title: 'Здоров’я', subtitle: 'У лікаря',
    grammar: 'Скарги на здоровʼя: <b>My</b> head <b>hurts</b> або <b>I have a</b> cold.',
    cards: [
      { en: 'doctor',   ua: 'лікар',     tr: 'д[о]ктер' },
      { en: 'pain',     ua: 'біль',      tr: 'п[е]йн' },
      { en: 'medicine', ua: 'ліки',      tr: 'м[е]дсін' },
      { en: 'sick',     ua: 'хворий',    tr: 'с[і]к' },
      { en: 'head',     ua: 'голова',    tr: 'г[е]д' },
      { en: 'to hurt',  ua: 'боліти',    tr: 'ту г[ё]рт' },
      { en: 'healthy',  ua: 'здоровий',  tr: 'г[е]лсі' },
      { en: 'hospital', ua: 'лікарня',   tr: 'г[о]спітл' },
      { en: 'a cold',   ua: 'застуда',   tr: 'е к[о]улд' },
      { en: 'tired',    ua: 'втомлений', tr: 'т[а]єрд' },
      { en: 'fever',    ua: 'температура', tr: 'ф[і]вер' },
      { en: 'nurse',    ua: 'медсестра',   tr: 'н[ё]рс' },
    ],
    sentences: [
      { en: 'I feel sick.',     ua: 'Мені погано.',          tr: 'ай філ с[і]к' },
      { en: 'My head hurts.',   ua: 'У мене болить голова.', tr: 'май гед г[ё]ртс' },
      { en: 'I am very tired.', ua: 'Я дуже втомлений.',     tr: 'ай ем вері т[а]єрд' },
    ],
  },
  {
    id: 28, level: 'B1', icon: '⏪', title: 'Минулий час', subtitle: 'Розповідаємо про вчора',
    grammar: 'Правильні дієслова у минулому = <b>-ed</b>: work → work<b>ed</b>. Неправильні треба вчити: go → <b>went</b>, see → <b>saw</b>, come → <b>came</b>.',
    cards: [
      { en: 'was',       ua: 'був / була',   tr: 'у[о]з' },
      { en: 'were',      ua: 'були',         tr: 'у[ё]р' },
      { en: 'yesterday', ua: 'вчора',        tr: 'є[с]тердей' },
      { en: 'did',       ua: 'робив (допом.)', tr: 'д[і]д' },
      { en: 'went',      ua: 'пішов, поїхав', tr: 'у[е]нт' },
      { en: 'saw',       ua: 'бачив',        tr: 'с[о]' },
      { en: 'ago',       ua: 'тому (назад)', tr: 'ег[о]у' },
      { en: 'last',      ua: 'минулий',      tr: 'л[а]ст' },
      { en: 'came',      ua: 'прийшов',      tr: 'к[е]йм' },
      { en: 'made',      ua: 'зробив',       tr: 'м[е]йд' },
    ],
    sentences: [
      { en: 'I was at home.',       ua: 'Я був удома.',        tr: 'ай уоз ет г[о]ум' },
      { en: 'We went to the park.', ua: 'Ми ходили в парк.',   tr: 'уі уент ту зе п[а]рк' },
      { en: 'She came yesterday.',  ua: 'Вона прийшла вчора.', tr: 'ші кейм є[с]тердей' },
    ],
  },
  {
    id: 29, level: 'B1', icon: '😊', title: 'Почуття і характер', subtitle: 'Описуємо людей і настрій',
    grammar: 'Почуття — через to be: I <b>am</b> happy, she <b>is</b> tired (не «I have happy»).',
    cards: [
      { en: 'happy',  ua: 'щасливий',  tr: 'г[е]пі' },
      { en: 'sad',    ua: 'сумний',    tr: 'с[е]д' },
      { en: 'angry',  ua: 'злий',      tr: '[е]нгрі' },
      { en: 'afraid', ua: 'наляканий', tr: 'ефр[е]йд' },
      { en: 'kind',   ua: 'добрий',    tr: 'к[а]йнд' },
      { en: 'smart',  ua: 'розумний',  tr: 'см[а]рт' },
      { en: 'funny',  ua: 'смішний',   tr: 'ф[а]ні' },
      { en: 'bored',  ua: 'знуджений', tr: 'б[о]рд' },
    ],
    sentences: [
      { en: 'I am very happy.',  ua: 'Я дуже щасливий.', tr: 'ай ем вері г[е]пі' },
      { en: 'She is not angry.', ua: 'Вона не зла.',     tr: 'ші із нот [е]нгрі' },
      { en: 'He is very kind.',  ua: 'Він дуже добрий.', tr: 'гі із вері к[а]йнд' },
    ],
  },
  {
    id: 30, level: 'B1', icon: '⏩', title: 'Майбутній час', subtitle: 'Плани й наміри',
    grammar: 'Майбутнє: <b>will</b> + дієслово (I <b>will</b> help). Для планів — <b>be going to</b>: I am <b>going to</b> travel.',
    cards: [
      { en: 'will',      ua: 'буде (майб.)',  tr: 'у[і]л' },
      { en: 'going to',  ua: 'збиратися',     tr: 'г[о]уінг ту' },
      { en: 'soon',      ua: 'скоро',         tr: 'с[у]н' },
      { en: 'later',     ua: 'пізніше',       tr: 'л[е]йтер' },
      { en: 'next',      ua: 'наступний',     tr: 'н[е]кст' },
      { en: 'plan',      ua: 'план',          tr: 'пл[е]н' },
      { en: 'hope',      ua: 'сподіватися',   tr: 'г[о]уп' },
      { en: 'to become', ua: 'стати',         tr: 'ту бік[а]м' },
    ],
    sentences: [
      { en: 'I will help you.',        ua: 'Я тобі допоможу.',           tr: 'ай уіл гелп ю' },
      { en: 'We are going to travel.', ua: 'Ми збираємось подорожувати.', tr: 'уі а гоуінг ту тр[е]вл' },
      { en: 'See you soon.',           ua: 'До скорого.',                tr: 'сі ю с[у]н' },
    ],
  },
  {
    id: 31, level: 'B1', icon: '🌳', title: 'Природа', subtitle: 'Світ навколо',
    cards: [
      { en: 'tree',     ua: 'дерево',  tr: 'тр[і]' },
      { en: 'river',    ua: 'річка',   tr: 'р[і]вер' },
      { en: 'mountain', ua: 'гора',    tr: 'м[а]унтін' },
      { en: 'sea',      ua: 'море',    tr: 'с[і]' },
      { en: 'sky',      ua: 'небо',    tr: 'ск[а]й' },
      { en: 'flower',   ua: 'квітка',  tr: 'фл[а]уер' },
      { en: 'forest',   ua: 'ліс',     tr: 'ф[о]рест' },
      { en: 'animal',   ua: 'тварина', tr: '[е]німал' },
    ],
    sentences: [
      { en: 'The sea is blue.',      ua: 'Море синє.',              tr: 'зе сі із бл[у]' },
      { en: 'I like the mountains.', ua: 'Мені подобаються гори.',  tr: 'ай лайк зе м[а]унтінз' },
      { en: 'There is a big tree.',  ua: 'Там велике дерево.',      tr: 'зеа із е біг тр[і]' },
    ],
  },

  /* ================= B2 ================= */
  {
    id: 32, level: 'B2', icon: '💭', title: 'Думки і аргументи', subtitle: 'Висловити позицію',
    grammar: 'Зʼєднуємо думки: <b>because</b> (бо), <b>however</b> (однак), <b>although</b> (хоча).',
    cards: [
      { en: 'opinion',   ua: 'думка',         tr: 'оп[і]ньйон' },
      { en: 'to agree',  ua: 'погоджуватись', tr: 'ту егр[і]' },
      { en: 'however',   ua: 'однак',         tr: 'гау[е]вер' },
      { en: 'because',   ua: 'тому що',       tr: 'бік[о]з' },
      { en: 'although',  ua: 'хоча',          tr: 'олз[о]у' },
      { en: 'probably',  ua: 'мабуть',        tr: 'пр[о]баблі' },
      { en: 'reason',    ua: 'причина',       tr: 'р[і]зн' },
      { en: 'I think',   ua: 'я думаю',       tr: 'ай с[і]нк' },
    ],
    sentences: [
      { en: 'I agree with you.',       ua: 'Я з тобою згоден.',          tr: 'ай егр[і] уіз ю' },
      { en: 'However, it is hard.',    ua: 'Однак це важко.',            tr: 'гау[е]вер іт із г[а]рд' },
      { en: 'I think we need a plan.', ua: 'Думаю, нам потрібен план.',  tr: 'ай сінк уі нід е пл[а]н' },
    ],
  },
  {
    id: 33, level: 'B2', icon: '📈', title: 'Бізнес', subtitle: 'Компанія і гроші',
    grammar: 'Дія триває зараз — <b>be + -ing</b>: the market <b>is growing</b>.',
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
    sentences: [
      { en: 'Our profit is growing.',  ua: 'Наш прибуток зростає.',    tr: '[а]уер профіт із гр[о]уінг' },
      { en: 'We signed a contract.',   ua: 'Ми підписали контракт.',   tr: 'уі сайнд е к[о]нтракт' },
      { en: 'They want to invest.',    ua: 'Вони хочуть інвестувати.', tr: 'зей уонт ту інв[е]ст' },
    ],
  },
  {
    id: 34, level: 'B2', icon: '🏛️', title: 'Суспільство', subtitle: 'Держава і люди',
    grammar: 'Загальні поняття — множина без артикля: <b>people</b> want change.',
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
    sentences: [
      { en: 'People want change.',   ua: 'Люди хочуть змін.', tr: 'п[і]пл уонт ч[е]йндж' },
      { en: 'Freedom is important.', ua: 'Свобода важлива.',  tr: 'фр[і]дом із імп[о]ртент' },
      { en: 'We have rights.',       ua: 'У нас є права.',    tr: 'уі гев р[а]йтс' },
    ],
  },
  {
    id: 35, level: 'B2', icon: '🗣️', title: 'Ідіоми і фразові дієслова', subtitle: 'Як говорять носії',
    grammar: 'Фразове дієслово = дієслово + прийменник, значення ідіоматичне: <b>give up</b> = здаватись.',
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
    sentences: [
      { en: "Don't give up!",        ua: 'Не здавайся!',         tr: 'доунт гів [а]п' },
      { en: 'It makes sense.',       ua: 'Це має сенс.',         tr: 'іт мейкс с[е]нс' },
      { en: 'By the way, I agree.',  ua: 'До речі, я згоден.',   tr: 'бай зе уей ай егр[і]' },
    ],
  },
  {
    id: 36, level: 'B2', icon: '💻', title: 'Технології', subtitle: 'Гаджети та інтернет',
    cards: [
      { en: 'computer', ua: "комп'ютер",    tr: 'компь[ю]тер' },
      { en: 'phone',    ua: 'телефон',      tr: 'ф[о]ун' },
      { en: 'internet', ua: 'інтернет',     tr: '[і]нтернет' },
      { en: 'screen',   ua: 'екран',        tr: 'скр[і]н' },
      { en: 'password', ua: 'пароль',       tr: 'п[а]свёрд' },
      { en: 'app',      ua: 'застосунок',   tr: '[е]п' },
      { en: 'online',   ua: 'онлайн',       tr: 'онл[а]йн' },
      { en: 'file',     ua: 'файл',         tr: 'ф[а]йл' },
      { en: 'data',     ua: 'дані',         tr: 'д[е]йта' },
      { en: 'message',  ua: 'повідомлення', tr: 'м[е]сідж' },
    ],
    sentences: [
      { en: 'I need my password.', ua: 'Мені потрібен пароль.',      tr: 'ай нід май п[а]свёрд' },
      { en: 'The app is online.',  ua: 'Застосунок онлайн.',         tr: 'зе еп із онл[а]йн' },
      { en: 'Send me a message.',  ua: 'Надішли мені повідомлення.', tr: 'сенд мі е м[е]сідж' },
    ],
  },
  {
    id: 37, level: 'A1', icon: '🐶', title: 'Тварини', subtitle: 'Хатні й дикі',
    grammar: 'Перед словом із голосного звуку — <b>an</b>: <b>an</b> apple; перед приголосним — <b>a</b>: <b>a</b> dog.',
    cards: [
      { en: 'dog',   ua: 'собака',  tr: 'д[о]г' },
      { en: 'cat',   ua: 'кіт',     tr: 'к[е]т' },
      { en: 'bird',  ua: 'пташка',  tr: 'б[ё]рд' },
      { en: 'fish',  ua: 'риба',    tr: 'ф[і]ш' },
      { en: 'horse', ua: 'кінь',    tr: 'г[о]рс' },
      { en: 'cow',   ua: 'корова',  tr: 'к[а]у' },
      { en: 'bear',   ua: 'ведмідь', tr: 'б[е]а' },
      { en: 'wolf',   ua: 'вовк',    tr: 'в[у]лф' },
      { en: 'rabbit', ua: 'кролик',  tr: 'р[е]біт' },
      { en: 'mouse',  ua: 'миша',    tr: 'м[а]ус' },
    ],
    sentences: [
      { en: 'I have a dog.',    ua: 'У мене є собака.',       tr: 'ай гев е д[о]г' },
      { en: 'The cat is small.', ua: 'Кіт малий.',            tr: 'зе кет із см[о]л' },
      { en: 'Birds can fly.',   ua: 'Птахи вміють літати.',   tr: 'бёрдз кен фл[а]й' },
    ],
  },
  {
    id: 38, level: 'A2', icon: '🎯', title: 'Хобі і дозвілля', subtitle: 'Чим займаємось',
    grammar: 'Захоплення часто через <b>like + -ing</b>: I like <b>reading</b>, I like <b>dancing</b>.',
    cards: [
      { en: 'music',  ua: 'музика',       tr: 'мь[ю]зік' },
      { en: 'sport',  ua: 'спорт',        tr: 'сп[о]рт' },
      { en: 'game',   ua: 'гра',          tr: 'г[е]йм' },
      { en: 'book',   ua: 'книга',        tr: 'б[у]к' },
      { en: 'film',   ua: 'фільм',        tr: 'ф[і]лм' },
      { en: 'to dance', ua: 'танцювати',  tr: 'ту д[а]нс' },
      { en: 'to sing', ua: 'співати',     tr: 'ту с[і]нг' },
      { en: 'to travel', ua: 'подорожувати', tr: 'ту тр[е]вл' },
    ],
    sentences: [
      { en: 'I like music.',      ua: 'Мені подобається музика.', tr: 'ай лайк мь[ю]зік' },
      { en: 'We play a game.',    ua: 'Ми граємо в гру.',         tr: 'уі плей е г[е]йм' },
      { en: 'She likes to dance.', ua: 'Вона любить танцювати.',  tr: 'ші лайкс ту д[а]нс' },
    ],
  },
  {
    id: 39, level: 'B1', icon: '🍽️', title: 'Ресторан', subtitle: 'Страви і сервіровка',
    grammar: 'Замовлення в ресторані: <b>I’ll have…</b> або <b>Could I get…?</b> + страва.',
    cards: [
      { en: 'dish',    ua: 'страва',   tr: 'д[і]ш' },
      { en: 'starter', ua: 'закуска',  tr: 'ст[а]ртер' },
      { en: 'dessert', ua: 'десерт',   tr: 'діз[ё]рт' },
      { en: 'fork',    ua: 'виделка',  tr: 'ф[о]рк' },
      { en: 'knife',   ua: 'ніж',      tr: 'н[а]йф' },
      { en: 'spoon',   ua: 'ложка',    tr: 'сп[у]н' },
      { en: 'plate',   ua: 'тарілка',  tr: 'пл[е]йт' },
      { en: 'glass',   ua: 'склянка',  tr: 'гл[а]с' },
    ],
    sentences: [
      { en: 'I would like a dessert.', ua: 'Я б хотів десерт.',  tr: 'ай уд лайк е діз[ё]рт' },
      { en: 'This dish is delicious.', ua: 'Ця страва смачна.',  tr: 'зіс діш із діл[і]шес' },
      { en: 'Where is my fork?',       ua: 'Де моя виделка?',    tr: 'уеа із май ф[о]рк' },
    ],
  },
  {
    id: 40, level: 'B1', icon: '🎓', title: 'Школа й навчання', subtitle: 'Освіта',
    grammar: 'Розрізняй: <b>learn</b> (вчити щось), <b>study</b> (вивчати), <b>teach</b> (навчати інших).',
    cards: [
      { en: 'school',   ua: 'школа',   tr: 'ск[у]л' },
      { en: 'teacher',  ua: 'вчитель', tr: 'т[і]чер' },
      { en: 'student',  ua: 'учень',   tr: 'ст[ю]дент' },
      { en: 'notebook', ua: 'зошит',   tr: 'н[о]утбук' },
      { en: 'lesson',   ua: 'урок',    tr: 'л[е]сн' },
      { en: 'exam',     ua: 'іспит',   tr: 'ігз[е]м' },
      { en: 'to learn', ua: 'вчити',   tr: 'ту л[ё]рн' },
      { en: 'to write', ua: 'писати',  tr: 'ту р[а]йт' },
    ],
    sentences: [
      { en: 'I learn English.',    ua: 'Я вчу англійську.', tr: 'ай лёрн [і]нгліш' },
      { en: 'The teacher is kind.', ua: 'Вчитель добрий.',  tr: 'зе тічер із к[а]йнд' },
      { en: 'I have an exam.',     ua: 'У мене іспит.',     tr: 'ай гев ен ігз[е]м' },
    ],
  },
  {
    id: 41, level: 'B2', icon: '🌍', title: 'Довкілля', subtitle: 'Природа і планета',
    grammar: '<b>should</b> = порада/обовʼязок: We <b>should</b> recycle (нам слід переробляти).',
    cards: [
      { en: 'environment', ua: 'довкілля',    tr: 'інв[а]йєрнмент' },
      { en: 'nature',      ua: 'природа',     tr: 'н[е]йчер' },
      { en: 'pollution',   ua: 'забруднення', tr: 'пол[ю]шн' },
      { en: 'climate',     ua: 'клімат',      tr: 'кл[а]ймет' },
      { en: 'energy',      ua: 'енергія',     tr: '[е]нерджі' },
      { en: 'planet',      ua: 'планета',     tr: 'пл[е]нет' },
      { en: 'to recycle',  ua: 'переробляти', tr: 'ту рісс[а]йкл' },
      { en: 'to protect',  ua: 'захищати',    tr: 'ту прот[е]кт' },
    ],
    sentences: [
      { en: 'We should protect nature.', ua: 'Ми маємо захищати природу.', tr: 'уі шуд протект н[е]йчер' },
      { en: 'Pollution is a problem.',   ua: 'Забруднення — проблема.',    tr: 'пол[ю]шн із е пр[о]блем' },
      { en: 'I love our planet.',        ua: 'Я люблю нашу планету.',      tr: 'ай лав ауер пл[е]нет' },
    ],
  },
  {
    id: 42, level: 'B2', icon: '📰', title: 'Медіа і новини', subtitle: 'Інформація',
    grammar: 'Артикль <b>the</b> — коли обидва знають, про що йдеться: <b>the</b> news, <b>the</b> article.',
    cards: [
      { en: 'news',       ua: 'новини',    tr: 'нь[ю]з' },
      { en: 'newspaper',  ua: 'газета',    tr: 'нь[ю]спейпер' },
      { en: 'article',    ua: 'стаття',    tr: '[а]ртікл' },
      { en: 'journalist', ua: 'журналіст', tr: 'дж[ё]рналіст' },
      { en: 'TV',         ua: 'телебачення', tr: 'тів[і]' },
      { en: 'radio',      ua: 'радіо',     tr: 'р[е]йдіоу' },
      { en: 'to report',  ua: 'повідомляти', tr: 'ту ріп[о]рт' },
      { en: 'story',      ua: 'історія',   tr: 'ст[о]рі' },
    ],
    sentences: [
      { en: 'I read the news.',    ua: 'Я читаю новини.',   tr: 'ай рід зе нь[ю]з' },
      { en: 'This article is good.', ua: 'Ця стаття гарна.', tr: 'зіс артікл із г[у]д' },
      { en: 'She is a journalist.', ua: 'Вона журналістка.', tr: 'ші із е дж[ё]рналіст' },
    ],
  },
  {
    "id": 43,
    "level": "A1",
    "icon": "⚙️",
    "title": "Дієслова побуту",
    "subtitle": "Спряження: 3 часи",
    "type": "verbs",
    "grammar": "Теперішній: з he/she +-s. Минулий: часто неправильний (ate, slept, spoke). Майбутній: <b>will</b> + дієслово.<br>Приклад: I will eat later.",
    "verbs": [
      {
        "inf": "to eat",
        "ua": "їсти",
        "tr": "ту [і]т",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "eat",
                "tr": "ай [і]т"
              },
              {
                "p": "you",
                "f": "eat",
                "tr": "ю [і]т"
              },
              {
                "p": "he/she",
                "f": "eats",
                "tr": "гі [і]тс"
              },
              {
                "p": "we",
                "f": "eat",
                "tr": "уі [і]т"
              },
              {
                "p": "they",
                "f": "eat",
                "tr": "зей [і]т"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "ate",
                "tr": "[ей]т"
              },
              {
                "p": "you",
                "f": "ate",
                "tr": "[ей]т"
              },
              {
                "p": "he/she",
                "f": "ate",
                "tr": "[ей]т"
              },
              {
                "p": "we",
                "f": "ate",
                "tr": "[ей]т"
              },
              {
                "p": "they",
                "f": "ate",
                "tr": "[ей]т"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will eat",
                "tr": "уіл [і]т"
              },
              {
                "p": "you",
                "f": "will eat",
                "tr": "уіл [і]т"
              },
              {
                "p": "he/she",
                "f": "will eat",
                "tr": "уіл [і]т"
              },
              {
                "p": "we",
                "f": "will eat",
                "tr": "уіл [і]т"
              },
              {
                "p": "they",
                "f": "will eat",
                "tr": "уіл [і]т"
              }
            ]
          }
        ]
      },
      {
        "inf": "to drink",
        "ua": "пити",
        "tr": "ту др[і]нк",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "drink",
                "tr": "ай др[і]нк"
              },
              {
                "p": "you",
                "f": "drink",
                "tr": "ю др[і]нк"
              },
              {
                "p": "he/she",
                "f": "drinks",
                "tr": "гі др[і]нкс"
              },
              {
                "p": "we",
                "f": "drink",
                "tr": "уі др[і]нк"
              },
              {
                "p": "they",
                "f": "drink",
                "tr": "зей др[і]нк"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "drank",
                "tr": "др[е]нк"
              },
              {
                "p": "you",
                "f": "drank",
                "tr": "др[е]нк"
              },
              {
                "p": "he/she",
                "f": "drank",
                "tr": "др[е]нк"
              },
              {
                "p": "we",
                "f": "drank",
                "tr": "др[е]нк"
              },
              {
                "p": "they",
                "f": "drank",
                "tr": "др[е]нк"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will drink",
                "tr": "уіл др[і]нк"
              },
              {
                "p": "you",
                "f": "will drink",
                "tr": "уіл др[і]нк"
              },
              {
                "p": "he/she",
                "f": "will drink",
                "tr": "уіл др[і]нк"
              },
              {
                "p": "we",
                "f": "will drink",
                "tr": "уіл др[і]нк"
              },
              {
                "p": "they",
                "f": "will drink",
                "tr": "уіл др[і]нк"
              }
            ]
          }
        ]
      },
      {
        "inf": "to sleep",
        "ua": "спати",
        "tr": "ту сл[і]п",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "sleep",
                "tr": "ай сл[і]п"
              },
              {
                "p": "you",
                "f": "sleep",
                "tr": "ю сл[і]п"
              },
              {
                "p": "he/she",
                "f": "sleeps",
                "tr": "гі сл[і]пс"
              },
              {
                "p": "we",
                "f": "sleep",
                "tr": "уі сл[і]п"
              },
              {
                "p": "they",
                "f": "sleep",
                "tr": "зей сл[і]п"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "slept",
                "tr": "сл[е]пт"
              },
              {
                "p": "you",
                "f": "slept",
                "tr": "сл[е]пт"
              },
              {
                "p": "he/she",
                "f": "slept",
                "tr": "сл[е]пт"
              },
              {
                "p": "we",
                "f": "slept",
                "tr": "сл[е]пт"
              },
              {
                "p": "they",
                "f": "slept",
                "tr": "сл[е]пт"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will sleep",
                "tr": "уіл сл[і]п"
              },
              {
                "p": "you",
                "f": "will sleep",
                "tr": "уіл сл[і]п"
              },
              {
                "p": "he/she",
                "f": "will sleep",
                "tr": "уіл сл[і]п"
              },
              {
                "p": "we",
                "f": "will sleep",
                "tr": "уіл сл[і]п"
              },
              {
                "p": "they",
                "f": "will sleep",
                "tr": "уіл сл[і]п"
              }
            ]
          }
        ]
      },
      {
        "inf": "to live",
        "ua": "жити",
        "tr": "ту л[і]в",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "live",
                "tr": "ай л[і]в"
              },
              {
                "p": "you",
                "f": "live",
                "tr": "ю л[і]в"
              },
              {
                "p": "he/she",
                "f": "lives",
                "tr": "гі л[і]вз"
              },
              {
                "p": "we",
                "f": "live",
                "tr": "уі л[і]в"
              },
              {
                "p": "they",
                "f": "live",
                "tr": "зей л[і]в"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "lived",
                "tr": "л[і]вд"
              },
              {
                "p": "you",
                "f": "lived",
                "tr": "л[і]вд"
              },
              {
                "p": "he/she",
                "f": "lived",
                "tr": "л[і]вд"
              },
              {
                "p": "we",
                "f": "lived",
                "tr": "л[і]вд"
              },
              {
                "p": "they",
                "f": "lived",
                "tr": "л[і]вд"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will live",
                "tr": "уіл л[і]в"
              },
              {
                "p": "you",
                "f": "will live",
                "tr": "уіл л[і]в"
              },
              {
                "p": "he/she",
                "f": "will live",
                "tr": "уіл л[і]в"
              },
              {
                "p": "we",
                "f": "will live",
                "tr": "уіл л[і]в"
              },
              {
                "p": "they",
                "f": "will live",
                "tr": "уіл л[і]в"
              }
            ]
          }
        ]
      },
      {
        "inf": "to speak",
        "ua": "говорити",
        "tr": "ту сп[і]к",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "speak",
                "tr": "ай сп[і]к"
              },
              {
                "p": "you",
                "f": "speak",
                "tr": "ю сп[і]к"
              },
              {
                "p": "he/she",
                "f": "speaks",
                "tr": "гі сп[і]кс"
              },
              {
                "p": "we",
                "f": "speak",
                "tr": "уі сп[і]к"
              },
              {
                "p": "they",
                "f": "speak",
                "tr": "зей сп[і]к"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "spoke",
                "tr": "сп[о]ук"
              },
              {
                "p": "you",
                "f": "spoke",
                "tr": "сп[о]ук"
              },
              {
                "p": "he/she",
                "f": "spoke",
                "tr": "сп[о]ук"
              },
              {
                "p": "we",
                "f": "spoke",
                "tr": "сп[о]ук"
              },
              {
                "p": "they",
                "f": "spoke",
                "tr": "сп[о]ук"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will speak",
                "tr": "уіл сп[і]к"
              },
              {
                "p": "you",
                "f": "will speak",
                "tr": "уіл сп[і]к"
              },
              {
                "p": "he/she",
                "f": "will speak",
                "tr": "уіл сп[і]к"
              },
              {
                "p": "we",
                "f": "will speak",
                "tr": "уіл сп[і]к"
              },
              {
                "p": "they",
                "f": "will speak",
                "tr": "уіл сп[і]к"
              }
            ]
          }
        ]
      },
      {
        "inf": "to play",
        "ua": "гратися",
        "tr": "ту пл[е]й",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "play",
                "tr": "ай пл[е]й"
              },
              {
                "p": "you",
                "f": "play",
                "tr": "ю пл[е]й"
              },
              {
                "p": "he/she",
                "f": "plays",
                "tr": "гі пл[е]йз"
              },
              {
                "p": "we",
                "f": "play",
                "tr": "уі пл[е]й"
              },
              {
                "p": "they",
                "f": "play",
                "tr": "зей пл[е]й"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "played",
                "tr": "пл[е]йд"
              },
              {
                "p": "you",
                "f": "played",
                "tr": "пл[е]йд"
              },
              {
                "p": "he/she",
                "f": "played",
                "tr": "пл[е]йд"
              },
              {
                "p": "we",
                "f": "played",
                "tr": "пл[е]йд"
              },
              {
                "p": "they",
                "f": "played",
                "tr": "пл[е]йд"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will play",
                "tr": "уіл пл[е]й"
              },
              {
                "p": "you",
                "f": "will play",
                "tr": "уіл пл[е]й"
              },
              {
                "p": "he/she",
                "f": "will play",
                "tr": "уіл пл[е]й"
              },
              {
                "p": "we",
                "f": "will play",
                "tr": "уіл пл[е]й"
              },
              {
                "p": "they",
                "f": "will play",
                "tr": "уіл пл[е]й"
              }
            ]
          }
        ]
      },
      {
        "inf": "to open",
        "ua": "відчиняти",
        "tr": "ту [о]упен",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "open",
                "tr": "ай [о]упен"
              },
              {
                "p": "you",
                "f": "open",
                "tr": "ю [о]упен"
              },
              {
                "p": "he/she",
                "f": "opens",
                "tr": "гі [о]упенз"
              },
              {
                "p": "we",
                "f": "open",
                "tr": "уі [о]упен"
              },
              {
                "p": "they",
                "f": "open",
                "tr": "зей [о]упен"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "opened",
                "tr": "[о]упенд"
              },
              {
                "p": "you",
                "f": "opened",
                "tr": "[о]упенд"
              },
              {
                "p": "he/she",
                "f": "opened",
                "tr": "[о]упенд"
              },
              {
                "p": "we",
                "f": "opened",
                "tr": "[о]упенд"
              },
              {
                "p": "they",
                "f": "opened",
                "tr": "[о]упенд"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will open",
                "tr": "уіл [о]упен"
              },
              {
                "p": "you",
                "f": "will open",
                "tr": "уіл [о]упен"
              },
              {
                "p": "he/she",
                "f": "will open",
                "tr": "уіл [о]упен"
              },
              {
                "p": "we",
                "f": "will open",
                "tr": "уіл [о]упен"
              },
              {
                "p": "they",
                "f": "will open",
                "tr": "уіл [о]упен"
              }
            ]
          }
        ]
      },
      {
        "inf": "to close",
        "ua": "зачиняти",
        "tr": "ту кл[о]уз",
        "tenses": [
          {
            "t": "Теперішній",
            "rows": [
              {
                "p": "I",
                "f": "close",
                "tr": "ай кл[о]уз"
              },
              {
                "p": "you",
                "f": "close",
                "tr": "ю кл[о]уз"
              },
              {
                "p": "he/she",
                "f": "closes",
                "tr": "гі кл[о]узіз"
              },
              {
                "p": "we",
                "f": "close",
                "tr": "уі кл[о]уз"
              },
              {
                "p": "they",
                "f": "close",
                "tr": "зей кл[о]уз"
              }
            ]
          },
          {
            "t": "Минулий",
            "rows": [
              {
                "p": "I",
                "f": "closed",
                "tr": "кл[о]узд"
              },
              {
                "p": "you",
                "f": "closed",
                "tr": "кл[о]узд"
              },
              {
                "p": "he/she",
                "f": "closed",
                "tr": "кл[о]узд"
              },
              {
                "p": "we",
                "f": "closed",
                "tr": "кл[о]узд"
              },
              {
                "p": "they",
                "f": "closed",
                "tr": "кл[о]узд"
              }
            ]
          },
          {
            "t": "Майбутній",
            "rows": [
              {
                "p": "I",
                "f": "will close",
                "tr": "уіл кл[о]уз"
              },
              {
                "p": "you",
                "f": "will close",
                "tr": "уіл кл[о]уз"
              },
              {
                "p": "he/she",
                "f": "will close",
                "tr": "уіл кл[о]уз"
              },
              {
                "p": "we",
                "f": "will close",
                "tr": "уіл кл[о]уз"
              },
              {
                "p": "they",
                "f": "will close",
                "tr": "уіл кл[о]уз"
              }
            ]
          }
        ]
      }
    ],
    "cards": [
      {
        "en": "to eat",
        "ua": "їсти",
        "tr": "ту [і]т"
      },
      {
        "en": "to drink",
        "ua": "пити",
        "tr": "ту др[і]нк"
      },
      {
        "en": "to sleep",
        "ua": "спати",
        "tr": "ту сл[і]п"
      },
      {
        "en": "to live",
        "ua": "жити",
        "tr": "ту л[і]в"
      },
      {
        "en": "to speak",
        "ua": "говорити",
        "tr": "ту сп[і]к"
      },
      {
        "en": "to play",
        "ua": "гратися",
        "tr": "ту пл[е]й"
      },
      {
        "en": "to open",
        "ua": "відчиняти",
        "tr": "ту [о]упен"
      },
      {
        "en": "to close",
        "ua": "зачиняти",
        "tr": "ту кл[о]уз"
      }
    ],
    "sentences": [
      {
        "en": "I eat an apple.",
        "ua": "Я їм яблуко.",
        "tr": "ай іт ен [е]пл"
      },
      {
        "en": "We speak English.",
        "ua": "Ми говоримо англійською.",
        "tr": "уі спік [і]нгліш"
      },
      {
        "en": "Please close the door.",
        "ua": "Зачини двері, будь ласка.",
        "tr": "пліз клоуз зе д[о]р"
      }
    ]
  },
  {
    id: 44, level: 'A2', icon: '🧭', title: 'Напрямки', subtitle: 'Як пройти',
    grammar: 'Порада напряму — дієслово на початку: <b>Turn</b> left, <b>Go</b> straight, <b>Stop</b> here.',
    cards: [
      { en: 'up',       ua: 'вгору',       tr: '[а]п' },
      { en: 'down',     ua: 'вниз',        tr: 'д[а]ун' },
      { en: 'turn',     ua: 'повертати',   tr: 'т[ё]рн' },
      { en: 'stop',     ua: 'зупинятись',  tr: 'ст[о]п' },
      { en: 'far',      ua: 'далеко',      tr: 'ф[а]р' },
      { en: 'straight', ua: 'прямо',       tr: 'стр[е]йт' },
      { en: 'corner',   ua: 'ріг, кут',    tr: 'к[о]рнер' },
      { en: 'map',      ua: 'карта',       tr: 'м[е]п' },
    ],
    sentences: [
      { en: 'Turn left here.', ua: 'Поверни тут ліворуч.', tr: 'тёрн лефт г[і]а' },
      { en: 'Go straight.',    ua: 'Іди прямо.',            tr: 'гоу стр[е]йт' },
      { en: 'It is far.',      ua: 'Це далеко.',            tr: 'іт із ф[а]р' },
    ],
  },
  {
    id: 45, level: 'B1', icon: '🏦', title: 'Банк і пошта', subtitle: 'Послуги',
    grammar: 'Ввічливе прохання: <b>Could you…?</b> або <b>Can you help me?</b>',
    cards: [
      { en: 'bank',      ua: 'банк',      tr: 'б[е]нк' },
      { en: 'ATM',       ua: 'банкомат',  tr: 'ейті[е]м' },
      { en: 'letter',    ua: 'лист',      tr: 'л[е]тер' },
      { en: 'stamp',     ua: 'марка',     tr: 'ст[е]мп' },
      { en: 'queue',     ua: 'черга',     tr: 'кь[ю]' },
      { en: 'signature', ua: 'підпис',    tr: 'с[і]гнечер' },
      { en: 'help',      ua: 'допомога',  tr: 'г[е]лп' },
      { en: 'to send',   ua: 'надсилати', tr: 'ту с[е]нд' },
    ],
    sentences: [
      { en: 'Can you help me?',        ua: 'Ти можеш мені допомогти?',  tr: 'кен ю гелп мі' },
      { en: 'I need to send a letter.', ua: 'Мені треба надіслати лист.', tr: 'ай нід ту сенд е л[е]тер' },
      { en: 'Where is the bank?',      ua: 'Де банк?',                  tr: 'уеа із зе б[е]нк' },
    ],
  },
  {
    id: 46, level: 'B2', icon: '🔬', title: 'Наука і думки', subtitle: 'Абстрактні поняття',
    grammar: 'Питання з <b>do/does</b>: <b>Do</b> you know? <b>Does</b> it work? Заперечення: I <b>don’t</b> know.',
    cards: [
      { en: 'science',  ua: 'наука',     tr: 'с[а]єнс' },
      { en: 'number',   ua: 'число',     tr: 'н[а]мбер' },
      { en: 'result',   ua: 'результат', tr: 'різ[а]лт' },
      { en: 'question', ua: 'питання',   tr: 'ку[е]счн' },
      { en: 'answer',   ua: 'відповідь', tr: '[а]нсер' },
      { en: 'idea',     ua: 'ідея',      tr: 'айд[і]а' },
      { en: 'problem',  ua: 'проблема',  tr: 'пр[о]блем' },
      { en: 'example',  ua: 'приклад',   tr: 'ігз[а]мпл' },
    ],
    sentences: [
      { en: 'I have an idea.',        ua: 'У мене є ідея.',       tr: 'ай гев ен айд[і]а' },
      { en: 'This is a big problem.', ua: 'Це велика проблема.',  tr: 'зіс із е біг пр[о]блем' },
      { en: 'What is the answer?',    ua: 'Яка відповідь?',       tr: 'уот із зе [а]нсер' },
    ],
  },
  {
    id: 47, level: 'A1', icon: '🔀', title: 'Спряження: теперішній час', subtitle: 'Усі форми дієслова', type: 'verbs',
    grammar: 'Теперішній час: базова форма для I/you/we/they; для he/she/it додаємо <b>-s</b> (he work<b>s</b>). Винятки: be → am/is/are, have → <b>has</b>, do → <b>does</b>, go → <b>goes</b>.',
    verbs: [
      { inf:'to work', ua:'працювати', tr:'ту у[ё]рк', forms:[
        {p:'I', f:'work', tr:'ай у[ё]рк'},{p:'you', f:'work', tr:'ю у[ё]рк'},{p:'he / she', f:'works', tr:'гі у[ё]ркс'},{p:'we', f:'work', tr:'уі у[ё]рк'},{p:'they', f:'work', tr:'зей у[ё]рк'} ]},
      { inf:'to go', ua:'йти, їхати', tr:'ту г[о]у', forms:[
        {p:'I', f:'go', tr:'ай г[о]у'},{p:'you', f:'go', tr:'ю г[о]у'},{p:'he / she', f:'goes', tr:'гі г[о]уз'},{p:'we', f:'go', tr:'уі г[о]у'},{p:'they', f:'go', tr:'зей г[о]у'} ]},
      { inf:'to have', ua:'мати', tr:'ту г[е]в', forms:[
        {p:'I', f:'have', tr:'ай г[е]в'},{p:'you', f:'have', tr:'ю г[е]в'},{p:'he / she', f:'has', tr:'гі г[е]з'},{p:'we', f:'have', tr:'уі г[е]в'},{p:'they', f:'have', tr:'зей г[е]в'} ]},
      { inf:'to be', ua:'бути', tr:'ту б[і]', forms:[
        {p:'I', f:'am', tr:'ай [ем]'},{p:'you', f:'are', tr:'ю [а]'},{p:'he / she', f:'is', tr:'гі [із]'},{p:'we', f:'are', tr:'уі [а]'},{p:'they', f:'are', tr:'зей [а]'} ]},
      { inf:'to do', ua:'робити', tr:'ту д[у]', forms:[
        {p:'I', f:'do', tr:'ай д[у]'},{p:'you', f:'do', tr:'ю д[у]'},{p:'he / she', f:'does', tr:'гі д[а]з'},{p:'we', f:'do', tr:'уі д[у]'},{p:'they', f:'do', tr:'зей д[у]'} ]},
    ],
    cards: [
      { en:'to work', ua:'працювати', tr:'ту у[ё]рк' },
      { en:'to go',   ua:'йти, їхати', tr:'ту г[о]у' },
      { en:'to have', ua:'мати',      tr:'ту г[е]в' },
      { en:'to be',   ua:'бути',      tr:'ту б[і]' },
      { en:'to do',   ua:'робити',    tr:'ту д[у]' },
    ],
    sentences: [
      { en:'He works here.',  ua:'Він тут працює.',     tr:'гі у[ё]ркс г[і]а' },
      { en:'She has a cat.',  ua:'У неї є кіт.',         tr:'ші гез е к[е]т' },
      { en:'They go home.',   ua:'Вони йдуть додому.',   tr:'зей гоу г[о]ум' },
    ],
  },
  {
    id: 48, level: 'B1', icon: '⏳', title: 'Спряження: минулий час', subtitle: 'Дієслова у Past', type: 'verbs',
    grammar: 'Минулий час: правильні дієслова +<b>-ed</b> (work→work<b>ed</b>) — однаково для всіх осіб. Неправильні вчимо напамʼять: go→<b>went</b>, have→<b>had</b>, do→<b>did</b>, be→<b>was/were</b>.',
    verbs: [
      { inf:'to work', ua:'працювати', tr:'ту у[ё]рк', forms:[
        {p:'I', f:'worked', tr:'ай у[ё]ркт'},{p:'you', f:'worked', tr:'ю у[ё]ркт'},{p:'he / she', f:'worked', tr:'гі у[ё]ркт'},{p:'we', f:'worked', tr:'уі у[ё]ркт'},{p:'they', f:'worked', tr:'зей у[ё]ркт'} ]},
      { inf:'to be', ua:'бути', tr:'ту б[і]', forms:[
        {p:'I', f:'was', tr:'ай у[о]з'},{p:'you', f:'were', tr:'ю у[ё]р'},{p:'he / she', f:'was', tr:'гі у[о]з'},{p:'we', f:'were', tr:'уі у[ё]р'},{p:'they', f:'were', tr:'зей у[ё]р'} ]},
      { inf:'to go', ua:'йти, їхати', tr:'ту г[о]у', forms:[
        {p:'I', f:'went', tr:'ай у[е]нт'},{p:'you', f:'went', tr:'ю у[е]нт'},{p:'he / she', f:'went', tr:'гі у[е]нт'},{p:'we', f:'went', tr:'уі у[е]нт'},{p:'they', f:'went', tr:'зей у[е]нт'} ]},
      { inf:'to have', ua:'мати', tr:'ту г[е]в', forms:[
        {p:'I', f:'had', tr:'ай г[е]д'},{p:'you', f:'had', tr:'ю г[е]д'},{p:'he / she', f:'had', tr:'гі г[е]д'},{p:'we', f:'had', tr:'уі г[е]д'},{p:'they', f:'had', tr:'зей г[е]д'} ]},
      { inf:'to do', ua:'робити', tr:'ту д[у]', forms:[
        {p:'I', f:'did', tr:'ай д[і]д'},{p:'you', f:'did', tr:'ю д[і]д'},{p:'he / she', f:'did', tr:'гі д[і]д'},{p:'we', f:'did', tr:'уі д[і]д'},{p:'they', f:'did', tr:'зей д[і]д'} ]},
    ],
    cards: [
      { en:'to work', ua:'працювати (worked)', tr:'ту у[ё]рк' },
      { en:'to be',   ua:'бути (was/were)',    tr:'ту б[і]' },
      { en:'to go',   ua:'йти (went)',         tr:'ту г[о]у' },
      { en:'to have', ua:'мати (had)',         tr:'ту г[е]в' },
      { en:'to do',   ua:'робити (did)',       tr:'ту д[у]' },
    ],
    sentences: [
      { en:'I worked yesterday.', ua:'Я вчора працював.',   tr:'ай у[ё]ркт є[с]тердей' },
      { en:'We were happy.',      ua:'Ми були щасливі.',     tr:'уі уёр г[е]пі' },
      { en:'She went home.',      ua:'Вона пішла додому.',   tr:'ші уент г[о]ум' },
    ],
  },
  {
    id: 49, level: 'A2', icon: '🍳', title: 'Кухня і готування', subtitle: 'Готуємо вдома',
    grammar: 'Дію-дієслово ставимо після <b>to</b>: I like <b>to cook</b>, I want <b>to eat</b>.',
    cards: [
      { en:'to cook',  ua:'готувати',  tr:'ту к[у]к' },
      { en:'pan',      ua:'сковорода', tr:'п[е]н' },
      { en:'oven',     ua:'духовка',   tr:'[а]вен' },
      { en:'to fry',   ua:'смажити',   tr:'ту фр[а]й' },
      { en:'to boil',  ua:'варити',    tr:'ту б[о]йл' },
      { en:'recipe',   ua:'рецепт',    tr:'р[е]сіпі' },
      { en:'hungry',   ua:'голодний',  tr:'г[а]нгрі' },
      { en:'thirsty',  ua:'спраглий',  tr:'с[ё]рсті' },
      { en:'sweet',    ua:'солодкий',  tr:'су[і]т' },
      { en:'salt',     ua:'сіль',      tr:'с[о]лт' },
    ],
    sentences: [
      { en:'I like to cook.',     ua:'Я люблю готувати.', tr:'ай лайк ту к[у]к' },
      { en:'I am hungry.',        ua:'Я голодний.',       tr:'ай ем г[а]нгрі' },
      { en:'The apple is sweet.', ua:'Яблуко солодке.',   tr:'зе епл із су[і]т' },
    ],
  },
  {
    id: 50, level: 'B1', icon: '🎉', title: 'Свята і події', subtitle: 'Дні народження і гості',
    grammar: 'Привітання — без дієслова: <b>Happy</b> birthday! · <b>Merry</b> Christmas!',
    cards: [
      { en:'holiday',      ua:'свято',           tr:'г[о]лідей' },
      { en:'birthday',     ua:'день народження', tr:'б[ё]рсдей' },
      { en:'gift',         ua:'подарунок',       tr:'г[і]фт' },
      { en:'party',        ua:'вечірка',         tr:'п[а]рті' },
      { en:'to celebrate', ua:'святкувати',      tr:'ту с[е]лебрейт' },
      { en:'to invite',    ua:'запрошувати',     tr:'ту інв[а]йт' },
      { en:'cake',         ua:'торт',            tr:'к[е]йк' },
      { en:'guest',        ua:'гість',           tr:'ґ[е]ст' },
      { en:'to wish',      ua:'бажати',          tr:'ту у[і]ш' },
      { en:'surprise',     ua:'сюрприз',         tr:'серпр[а]йз' },
    ],
    sentences: [
      { en:'Happy birthday!', ua:'З днем народження!', tr:'г[е]пі б[ё]рсдей' },
      { en:'This is a gift.', ua:'Це подарунок.',      tr:'зіс із е г[і]фт' },
      { en:'I invite you.',   ua:'Я тебе запрошую.',   tr:'ай інв[а]йт ю' },
    ],
  },
  {
    id: 51, level: 'A2', icon: '🌍', title: 'Країни і мови', subtitle: 'Світ навколо нас',
    grammar: 'Назви країн і мов пишемо з <b>великої</b> літери: <b>Ukraine</b>, <b>English</b>.',
    cards: [
      { en:'country',   ua:'країна',     tr:'к[а]нтрі' },
      { en:'language',  ua:'мова',       tr:'л[е]нгвідж' },
      { en:'world',     ua:'світ',       tr:'у[ё]рлд' },
      { en:'foreign',   ua:'іноземний',  tr:'ф[о]рін' },
      { en:'border',    ua:'кордон',     tr:'б[о]рдер' },
      { en:'capital',   ua:'столиця',    tr:'к[е]пітл' },
      { en:'flag',      ua:'прапор',     tr:'фл[е]г' },
      { en:'nation',    ua:'нація',      tr:'н[е]йшн' },
      { en:'native',    ua:'рідний',     tr:'н[е]йтів' },
      { en:'continent', ua:'континент',  tr:'к[о]нтінент' },
    ],
    sentences: [
      { en:'This is my country.',       ua:'Це моя країна.',       tr:'зіс із май к[а]нтрі' },
      { en:'The world is big.',         ua:'Світ великий.',        tr:'зе уёрлд із б[і]г' },
      { en:'This is a foreign flag.',   ua:'Це іноземний прапор.', tr:'зіс із е ф[о]рін фл[е]г' },
    ],
  },
  {
    id: 52, level: 'B1', icon: '🧑‍🤝‍🧑', title: 'Друзі і стосунки', subtitle: 'Люди поруч',
    grammar: 'Після <b>to</b> — базова форма дієслова: I want <b>to meet</b> you.',
    cards: [
      { en:'friend',       ua:'друг',       tr:'фр[е]нд' },
      { en:'neighbour',    ua:'сусід',      tr:'н[е]йбор' },
      { en:'to meet',      ua:'зустрічати', tr:'ту м[і]т' },
      { en:'together',     ua:'разом',      tr:'туг[е]зер' },
      { en:'alone',        ua:'сам',        tr:'ел[о]ун' },
      { en:'to trust',     ua:'довіряти',   tr:'ту тр[а]ст' },
      { en:'relationship', ua:'стосунки',   tr:'ріл[е]йшеншип' },
      { en:'couple',       ua:'пара',       tr:'к[а]пл' },
      { en:'to share',     ua:'ділитися',   tr:'ту ш[е]а' },
      { en:'close',        ua:'близький',   tr:'кл[о]уз' },
    ],
    sentences: [
      { en:'He is my friend.', ua:'Він мій друг.', tr:'гі із май фр[е]нд' },
      { en:'We are together.', ua:'Ми разом.',     tr:'уі а туг[е]зер' },
      { en:'I trust you.',     ua:'Я тобі довіряю.', tr:'ай тр[а]ст ю' },
    ],
  },
  {
    id: 53, level: 'A2', icon: '🏅', title: 'Спорт', subtitle: 'Ігри та рух',
    grammar: 'Про заняття спортом кажемо <b>play</b> + гра: <b>play</b> football, <b>play</b> tennis.',
    cards: [
      { en:'sport',    ua:'спорт',      tr:'сп[о]рт' },
      { en:'football', ua:'футбол',     tr:'ф[у]тбол' },
      { en:'ball',     ua:"м'яч",       tr:'б[о]л' },
      { en:'team',     ua:'команда',    tr:'т[і]м' },
      { en:'game',     ua:'гра',        tr:'г[е]йм' },
      { en:'player',   ua:'гравець',    tr:'пл[е]єр' },
      { en:'goal',     ua:'гол',        tr:'г[о]ул' },
      { en:'to run',   ua:'бігати',     tr:'ту р[а]н' },
      { en:'to win',   ua:'вигравати',  tr:'ту у[і]н' },
      { en:'to swim',  ua:'плавати',    tr:'ту су[і]м' },
    ],
    sentences: [
      { en:'I like football.', ua:'Мені подобається футбол.', tr:'ай лайк ф[у]тбол' },
      { en:'Our team wins.',   ua:'Наша команда виграє.',     tr:'[а]уер тім у[і]нз' },
      { en:'Can you swim?',    ua:'Ти вмієш плавати?',        tr:'кен ю су[і]м' },
    ],
  },
  {
    id: 54, level: 'B1', icon: '🎵', title: 'Музика і мистецтво', subtitle: 'Творчість і культура',
    cards: [
      { en:'music',    ua:'музика',     tr:'мь[ю]зік' },
      { en:'song',     ua:'пісня',      tr:'с[о]нг' },
      { en:'art',      ua:'мистецтво',  tr:'[а]рт' },
      { en:'picture',  ua:'картина',    tr:'п[і]кчер' },
      { en:'artist',   ua:'митець',     tr:'[а]ртіст' },
      { en:'concert',  ua:'концерт',    tr:'к[о]нсерт' },
      { en:'stage',    ua:'сцена',      tr:'ст[е]йдж' },
      { en:'painting', ua:'живопис',    tr:'п[е]йнтінг' },
      { en:'to sing',  ua:'співати',    tr:'ту с[і]нг' },
      { en:'to dance', ua:'танцювати',  tr:'ту д[а]нс' },
    ],
    sentences: [
      { en:'I love music.',            ua:'Я люблю музику.',   tr:'ай лав мь[ю]зік' },
      { en:'She sings a song.',        ua:'Вона співає пісню.', tr:'ші сінгз е с[о]нг' },
      { en:'This picture is beautiful.', ua:'Ця картина гарна.', tr:'зіс п[і]кчер із бь[ю]тіфул' },
    ],
  },
  {
    id: 55, level: 'A2', icon: '💼', title: 'Професії', subtitle: 'Ким люди працюють',
    grammar: 'Професія — з артиклем <b>a/an</b>: She is <b>a</b> doctor. He is <b>an</b> engineer.',
    cards: [
      { en:'job',      ua:'професія',     tr:'дж[о]б' },
      { en:'engineer', ua:'інженер',      tr:'енджін[і]а' },
      { en:'driver',   ua:'водій',        tr:'др[а]йвер' },
      { en:'cook',     ua:'кухар',        tr:'к[у]к' },
      { en:'farmer',   ua:'фермер',       tr:'ф[а]рмер' },
      { en:'seller',   ua:'продавець',    tr:'с[е]лер' },
      { en:'writer',   ua:'письменник',   tr:'р[а]йтер' },
      { en:'police officer', ua:'поліцейський', tr:'пол[і]с [о]фісер' },
      { en:'musician', ua:'музикант',     tr:'мьюз[і]шен' },
      { en:'actor',    ua:'актор',        tr:'[е]ктер' },
    ],
    sentences: [
      { en:'She is a doctor.',          ua:'Вона лікар.',            tr:'ші із е д[о]ктер' },
      { en:'I want to be an engineer.', ua:'Я хочу бути інженером.', tr:'ай уонт ту бі ен енджін[і]а' },
      { en:'My father is a driver.',    ua:'Мій тато водій.',        tr:'май ф[а]зер із е др[а]йвер' },
    ],
  },
  {
    id: 56, level: 'A2', icon: '🥕', title: 'Овочі і фрукти', subtitle: 'На ринку',
    cards: [
      { en:'banana',     ua:'банан',    tr:'бан[а]на' },
      { en:'tomato',     ua:'помідор',  tr:'том[а]тоу' },
      { en:'potato',     ua:'картопля', tr:'пот[е]йтоу' },
      { en:'carrot',     ua:'морква',   tr:'к[е]рот' },
      { en:'onion',      ua:'цибуля',   tr:'[а]ньйон' },
      { en:'grape',      ua:'виноград', tr:'гр[е]йп' },
      { en:'lemon',      ua:'лимон',    tr:'л[е]мон' },
      { en:'cucumber',   ua:'огірок',   tr:'кь[ю]камбер' },
      { en:'strawberry', ua:'полуниця', tr:'стр[о]бері' },
      { en:'pear',       ua:'груша',    tr:'п[е]а' },
    ],
    sentences: [
      { en:'I like apples.',       ua:'Мені подобаються яблука.', tr:'ай лайк [е]плз' },
      { en:'The tomato is red.',   ua:'Помідор червоний.',        tr:'зе том[а]тоу із р[е]д' },
      { en:'Do you want a banana?', ua:'Хочеш банан?',            tr:'ду ю уонт е бан[а]на' },
    ],
  },
];
