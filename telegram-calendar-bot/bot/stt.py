"""Speech-to-text via Groq's hosted Whisper (OpenAI-compatible endpoint, free tier).

Language is auto-detected unless STT_LANGUAGE is set, so a uk/ru/en mix works.
"""
from __future__ import annotations

import re

from .config import settings
from .http import STT_TIMEOUT, HTTPError, http

# Vocabulary hint only. Whisper sometimes "hears" its prompt in silent audio,
# so it holds no complete sentence that could turn into a fake event, and
# transcripts that just repeat it are dropped below.
PROMPT = "Календар, зустріч, нагадування, встреча, meeting."

# Extensions Groq accepts. Telegram voice notes come as *.oga (same Ogg container
# as .ogg, but Groq rejects the name), and audio files can be anything.
GROQ_EXTENSIONS = {"flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "opus", "wav", "webm"}


class SttError(RuntimeError):
    pass


def upload_name(telegram_file_path: str) -> str:
    ext = telegram_file_path.rsplit(".", 1)[-1].lower() if "." in telegram_file_path else ""
    return f"audio.{ext}" if ext in GROQ_EXTENSIONS else "audio.ogg"


def _words(s: str) -> str:
    return " ".join(re.findall(r"\w+", s.lower()))


def is_prompt_echo(transcript: str) -> bool:
    words = _words(transcript)
    return not words or words in _words(PROMPT)


def transcribe(audio: bytes, telegram_file_path: str = "") -> str:
    """Returns "" when nothing intelligible was said."""
    s = settings()
    data = {"model": s.stt_model, "response_format": "json", "prompt": PROMPT}
    if s.stt_language:
        data["language"] = s.stt_language
    try:
        r = http.post(
            f"{s.groq_base_url}/audio/transcriptions",
            headers={"Authorization": f"Bearer {s.groq_api_key}"},
            data=data,
            files={"file": (upload_name(telegram_file_path), audio, "application/octet-stream")},
            timeout=STT_TIMEOUT,
        )
    except HTTPError as e:
        raise SttError(f"transcription request failed: {type(e).__name__}") from e
    if r.status_code != 200:
        raise SttError(f"transcription failed: {r.status_code} {r.text[:300]}")
    text = (r.json().get("text") or "").strip()
    return "" if is_prompt_echo(text) else text
