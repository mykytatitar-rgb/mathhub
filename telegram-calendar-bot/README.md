# Telegram voice → Google Calendar

Voice message (uk/ru/en mix) → local Whisper → Claude parses → ✅/❌ confirm → Google Calendar.

## Setup (once)
1. `python -m venv .venv && source .venv/bin/activate` (Windows: `.venv\Scripts\activate`)
2. `pip install -r requirements.txt`
3. `cp .env.example .env` and fill in:
   - `TELEGRAM_BOT_TOKEN` — from @BotFather (`/newbot`)
   - `ALLOWED_USER_ID` — from @userinfobot
   - `ANTHROPIC_API_KEY`
4. Google: console.cloud.google.com → new project → enable **Google Calendar API** →
   OAuth consent screen (External, add yourself as test user) → Credentials → **OAuth client ID, Desktop app** →
   download JSON as `credentials.json` here.
5. `python -m bot.calendar_client` — browser opens, allow access → `token.json` created.

## Run
`python -m bot.main` (keep it running; it polls Telegram, no public server needed).

## Test
`pytest`
