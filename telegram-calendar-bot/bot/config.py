import os

from dotenv import load_dotenv

load_dotenv()


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing env var {name} (see .env.example)")
    return value


TELEGRAM_BOT_TOKEN = _required("TELEGRAM_BOT_TOKEN")
ALLOWED_USER_ID = int(_required("ALLOWED_USER_ID"))
ANTHROPIC_API_KEY = _required("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-5-5")
TIMEZONE = os.getenv("TIMEZONE", "Europe/Kyiv")
GOOGLE_CALENDAR_ID = os.getenv("GOOGLE_CALENDAR_ID", "primary")
GOOGLE_TOKEN_JSON = os.getenv("GOOGLE_TOKEN_JSON", "")

STT_BACKEND = os.getenv("STT_BACKEND", "api")
STT_API_KEY = os.getenv("STT_API_KEY", "")
STT_API_BASE = os.getenv("STT_API_BASE", "https://api.groq.com/openai/v1")
STT_API_MODEL = os.getenv("STT_API_MODEL", "whisper-large-v3-turbo")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
