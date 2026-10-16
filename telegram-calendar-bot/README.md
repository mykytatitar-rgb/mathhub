# Telegram: голосове → Google Calendar

Надсилаєш боту голосове (укр / рос / англ, можна впереміш), бот показує, що зрозумів, ти тиснеш ✅, і подія з'являється в Google Calendar.
Працює цілодобово на безкоштовному Vercel, комп'ютер для цього не потрібен.

```
🎤 Telegram ──webhook──▶ Vercel (api/telegram.py)
                          ├─ Groq Whisper   голос → текст      (безкоштовно)
                          ├─ Groq gpt-oss   текст → подія      (безкоштовно; або Claude)
                          └─ ✅ → Google Calendar API
```

| Що | Ліміт безкоштовного тарифу | Скільки треба боту |
|---|---|---|
| Vercel Hobby | 1 млн викликів/міс, тільки некомерційне використання | ~2 виклики на подію |
| Groq Whisper | 2 000 запитів/день | 1 на голосове |
| Groq gpt-oss-120b | 1 000 запитів/день | 1 на подію |

## Налаштування (один раз, ~30 хв)

### 1. Telegram
1. @BotFather → `/newbot` → скопіюй **токен** → `TELEGRAM_BOT_TOKEN`.
2. @userinfobot → твій **id** → `ALLOWED_USER_ID` (усіх інших бот ігнорує).
3. Придумай секрет для вебхука → `TELEGRAM_WEBHOOK_SECRET`:
   `python -c "import secrets; print(secrets.token_urlsafe(32))"`

### 2. Groq (без картки)
console.groq.com → **API Keys** → Create → `GROQ_API_KEY`.

### 3. Google Calendar
1. console.cloud.google.com → створи проєкт → **APIs & Services → Enable APIs** → *Google Calendar API* → Enable.
2. **Google Auth Platform / OAuth consent screen** → External → назва будь-яка, твій email.
   **Audience → Publish app** (статус *In production*).
   ⚠️ Якщо лишити *Testing*, Google вимкне доступ через 7 днів.
3. **Clients → Create client → Desktop app** → Download JSON → збережи як `telegram-calendar-bot/credentials.json`.
4. На своєму комп'ютері (один раз):
   ```
   cd telegram-calendar-bot
   python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
   pip install -r requirements-dev.txt
   python scripts/google_auth.py
   ```
   Відкриється браузер. На екрані «Google hasn't verified this app» натисни **Advanced → Go to … (unsafe)**: це твій власний застосунок, тож усе гаразд. Потім дозволь доступ.
   Скрипт надрукує один рядок JSON → це `GOOGLE_TOKEN_JSON`.

### 4. Vercel
1. vercel.com → **Sign up with GitHub** (план Hobby).
2. **Add New → Project** → вибери репозиторій `mathhub` →
   **Root Directory** = `telegram-calendar-bot`, Framework Preset = **Other**.
3. **Environment Variables**: додай усе з `.env.example` (мінімум: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
   `ALLOWED_USER_ID`, `GROQ_API_KEY`, `GOOGLE_TOKEN_JSON`) → **Deploy**.
4. Код має бути в **production-гілці** (зазвичай `main`). Або злий гілку з ботом у `main`, або в
   Settings → Environments → Production → *Branch Tracking* вибери гілку з ботом.
5. **Settings → Domains** → скопіюй домен, наприклад `mathhub-bot.vercel.app`.
   Перевір: `https://<домен>/api/telegram` має показати `bot is alive`.
   ⚠️ Бери саме домен із *Domains*. Preview-адреси (`…-git-…vercel.app`) закриті паролем Vercel, і Telegram до них не достукається.

### 5. Під'єднати Telegram до Vercel
Відкрий у браузері (підстав свої значення):
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<домен>/api/telegram&secret_token=<SECRET>&max_connections=1&allowed_updates=["message","callback_query"]
```
Має бути `"ok":true`. (Або `python scripts/set_webhook.py https://<домен>` з `.env`.)

### 6. Перевірка
Надішли боту голосове «завтра о 15 зустріч з Олею на годину» → ✅ → подія в календарі.

## Якщо не працює

| Симптом | Де дивитись | Причина |
|---|---|---|
| Бот мовчить | `https://api.telegram.org/bot<TOKEN>/getWebhookInfo` → `last_error_message` | — |
| `401` | там само | `secret_token` у вебхуку ≠ `TELEGRAM_WEBHOOK_SECRET` у Vercel |
| `500` | Vercel → Project → Logs | не задана змінна оточення (`Missing env var …`) |
| Змінив змінну, нічого не змінилось | — | після зміни змінних треба **Redeploy** |
| «Google відкликав доступ» | — | застосунок у статусі *Testing* (крок 3.2) → Publish і повтори `google_auth.py` |
| Бот плутає слова | — | постав `STT_LANGUAGE=uk` або спробуй `LLM_BACKEND=claude` |

## Варіант: Claude замість Groq для розбору тексту
`LLM_BACKEND=claude`, `ANTHROPIC_API_KEY=…` (console.anthropic.com, платно, приблизно частки цента за подію).
Краще розуміє складні фрази на кшталт «перенеси на після обіду в четвер через тиждень».

## Для розробки
```
pip install -r requirements-dev.txt
pytest                       # тести, без мережі
python scripts/poll.py       # запустити бота локально (тимчасово знімає вебхук: --delete-webhook)
```

| Файл | Що робить |
|---|---|
| `api/telegram.py` | вхід Vercel: перевіряє секрет, передає update далі |
| `bot/handler.py` | логіка: голос → текст → подія → кнопки ✅/❌ |
| `bot/event.py` | подія; зберігається в тексті повідомлення (Vercel нічого не пам'ятає між запитами) |
| `bot/stt.py`, `bot/parser.py` | Groq Whisper; Groq / Claude → JSON події |
| `bot/calendar_client.py` | Google Calendar REST; повторне ✅ не створює дубль |
