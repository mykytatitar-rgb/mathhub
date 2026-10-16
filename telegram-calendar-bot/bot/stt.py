"""Speech-to-text via Groq's hosted Whisper (OpenAI-compatible endpoint, free tier).

Language is auto-detected unless STT_LANGUAGE is set, so a uk/ru/en mix works.
"""
from __future__ import annotations

from .config import settings
from .http import http

# Nudges Whisper toward the vocabulary of scheduling requests.
PROMPT = "Зустріч завтра о 15:00. Встреча в пятницу. Meeting on Monday at 10 am."


class SttError(RuntimeError):
    pass


def transcribe(audio: bytes) -> str:
    s = settings()
    data = {"model": s.stt_model, "response_format": "json", "prompt": PROMPT}
    if s.stt_language:
        data["language"] = s.stt_language
    r = http.post(
        f"{s.groq_base_url}/audio/transcriptions",
        headers={"Authorization": f"Bearer {s.groq_api_key}"},
        data=data,
        # Telegram names voice notes *.oga, which Groq rejects; it is the same Ogg container.
        files={"file": ("voice.ogg", audio, "audio/ogg")},
        timeout=60.0,
    )
    if r.status_code != 200:
        raise SttError(f"transcription failed: {r.status_code} {r.text[:300]}")
    return (r.json().get("text") or "").strip()
