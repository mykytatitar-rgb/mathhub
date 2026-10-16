"""Speech-to-text, fully local (faster-whisper). Language is auto-detected,
so a uk/ru/en mix works."""
from functools import lru_cache

from faster_whisper import WhisperModel

from .config import WHISPER_MODEL


@lru_cache(maxsize=1)
def _model() -> WhisperModel:
    return WhisperModel(WHISPER_MODEL, device="auto", compute_type="int8")


def transcribe(path: str) -> str:
    segments, _info = _model().transcribe(path, vad_filter=True, beam_size=5)
    return " ".join(s.text.strip() for s in segments).strip()
