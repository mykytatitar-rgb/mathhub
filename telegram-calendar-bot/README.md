# Telegram voice → Google Calendar

Voice message (uk/ru/en mix) → speech-to-text → Claude parses → ✅/❌ confirm → Google Calendar.

## 1. Keys (once)
| Env var | Where |
|---|---|
| `TELEGRAM_BOT_TOKEN` | @BotFather → `/newbot` |
| `ALLOWED_USER_ID` | @userinfobot |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `STT_API_KEY` | console.groq.com → API Keys |

## 2. Google token (once, on your PC)
1. console.cloud.google.com → new project → enable **Google Calendar API**.
2. **OAuth consent screen** → External → add yourself as test user → then **Publish app**
   (in "Testing" mode Google kills the token after 7 days; an "unverified app" warning on login is fine for personal use).
3. Credentials → **OAuth client ID → Desktop app** → download JSON as `credentials.json` here.
4. `pip install -r requirements.txt && python -m bot.calendar_client`
   → browser opens, allow → it prints one JSON line. That line is `GOOGLE_TOKEN_JSON`.

## 3. Deploy 24/7 (Railway)
1. railway.com → New Project → **Deploy from GitHub repo** → pick this repo.
2. Service → Settings → **Root Directory** = `telegram-calendar-bot`, branch = the one with this code.
   Railway finds the `Dockerfile` itself. No public domain needed (the bot polls Telegram).
3. Variables → add everything from `.env.example` (`STT_BACKEND=api`, `GOOGLE_TOKEN_JSON=<line from step 2>`).
4. Deploy → write to the bot in Telegram.

Only one copy may run at a time: stop the local bot once the server one is up (otherwise Telegram returns `Conflict`).

Any Docker host works the same way: `docker build -t calbot . && docker run --env-file .env calbot`.

## Run locally instead
`cp .env.example .env`, fill it, then `python -m bot.main`.
For offline Whisper: `pip install -r requirements-local.txt` and `STT_BACKEND=local`.

## Test
`pytest`
