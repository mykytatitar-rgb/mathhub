"""Settings from environment variables (Vercel → Project → Settings → Environment Variables)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing env var {name} (see .env.example)")
    return value


@dataclass(frozen=True)
class Settings:
    telegram_bot_token: str
    telegram_webhook_secret: str
    allowed_user_id: int
    timezone: str
    groq_api_key: str
    groq_base_url: str
    stt_model: str
    stt_language: str
    llm_backend: str  # "groq" (free) or "claude"
    groq_llm_model: str
    anthropic_api_key: str
    anthropic_model: str
    google_token_json: str
    google_calendar_id: str


@lru_cache(maxsize=1)
def settings() -> Settings:
    llm_backend = os.environ.get("LLM_BACKEND", "groq").strip().lower()
    if llm_backend not in ("groq", "claude"):
        raise RuntimeError("LLM_BACKEND must be 'groq' or 'claude'")
    return Settings(
        telegram_bot_token=_required("TELEGRAM_BOT_TOKEN"),
        telegram_webhook_secret=os.environ.get("TELEGRAM_WEBHOOK_SECRET", "").strip(),
        allowed_user_id=int(_required("ALLOWED_USER_ID")),
        timezone=os.environ.get("TIMEZONE", "Europe/Kyiv"),
        groq_api_key=_required("GROQ_API_KEY"),
        groq_base_url=os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/"),
        stt_model=os.environ.get("STT_MODEL", "whisper-large-v3-turbo"),
        stt_language=os.environ.get("STT_LANGUAGE", "").strip(),
        llm_backend=llm_backend,
        groq_llm_model=os.environ.get("GROQ_LLM_MODEL", "openai/gpt-oss-120b"),
        anthropic_api_key=_required("ANTHROPIC_API_KEY") if llm_backend == "claude" else "",
        anthropic_model=os.environ.get("ANTHROPIC_MODEL", "claude-opus-5-5"),
        google_token_json=_required("GOOGLE_TOKEN_JSON"),
        google_calendar_id=os.environ.get("GOOGLE_CALENDAR_ID", "primary"),
    )
