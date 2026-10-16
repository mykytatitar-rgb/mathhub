"""Speech-to-text. Language is auto-detected, so a uk/ru/en mix works.

STT_BACKEND=api   -> OpenAI-compatible cloud endpoint (Groq by default); for servers
STT_BACKEND=local -> faster-whisper on this machine (pip install -r requirements-local.txt)
"""
from functools import lru_cache

from . import config


@lru_cache(maxsize=1)
def _local_model():
    from faster_whisper import WhisperModel

    return WhisperModel(config.WHISPER_MODEL, device="auto", compute_type="int8")


@lru_cache(maxsize=1)
def _api_client():
    from openai import OpenAI

    if not config.STT_API_KEY:
        raise RuntimeError("STT_BACKEND=api needs STT_API_KEY")
    return OpenAI(api_key=config.STT_API_KEY, base_url=config.STT_API_BASE)


def transcribe(path: str) -> str:
    if config.STT_BACKEND == "local":
        segments, _info = _local_model().transcribe(path, vad_filter=True, beam_size=5)
        return " ".join(s.text.strip() for s in segments).strip()
    with open(path, "rb") as f:
        result = _api_client().audio.transcriptions.create(model=config.STT_API_MODEL, file=f)
    return result.text.strip()
