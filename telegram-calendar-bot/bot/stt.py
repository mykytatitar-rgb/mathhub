"""Speech-to-text via Groq's hosted Whisper (OpenAI-compatible endpoint, free tier).

Language is auto-detected unless STT_LANGUAGE is set, so a uk/ru/en mix works.
"""
from __future__ import annotations

from .config import settings
from .http import http

# Nudges Whisper toward the vocabulary of scheduling requests.
PROMPT = "Зустріч завтра о 15:00. Встреча в пятницу. Meeting on Monday at 10 am."


# Extensions Groq accepts. Telegram voice notes come as *.oga (same Ogg container
# as .ogg, but Groq rejects the name), and audio files can be anything.
GROQ_EXTENSIONS = {"flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "opus", "wav", "webm"}


class SttError(RuntimeError):
    pass


def upload_name(telegram_file_path: str) -> str:
    ext = telegram_file_path.rsplit(".", 1)[-1].lower() if "." in telegram_file_path else ""
    return f"audio.{ext}" if ext in GROQ_EXTENSIONS else "audio.ogg"


def transcribe(audio: bytes, telegram_file_path: str = "") -> str:
    s = settings()
    data = {"model": s.stt_model, "response_format": "json", "prompt": PROMPT}
    if s.stt_language:
        data["language"] = s.stt_language
    r = http.post(
        f"{s.groq_base_url}/audio/transcriptions",
        headers={"Authorization": f"Bearer {s.groq_api_key}"},
        data=data,
        files={"file": (upload_name(telegram_file_path), audio, "application/octet-stream")},
        timeout=60.0,
    )
    if r.status_code != 200:
        raise SttError(f"transcription failed: {r.status_code} {r.text[:300]}")
    return (r.json().get("text") or "").strip()
