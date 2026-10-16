"""Text → Event with an LLM that answers in a fixed JSON schema.

LLM_BACKEND=groq   (default, free tier) — Groq chat completions
LLM_BACKEND=claude                      — Claude API (paid, more accurate on tricky phrasing)
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime, time
from functools import lru_cache
from zoneinfo import ZoneInfo

from .config import settings
from .event import Event
from .http import LLM_TIMEOUT, HTTPError, http

SCHEMA = {
    "type": "object",
    "properties": {
        "error": {
            "type": "string",
            "description": "Empty if this is a scheduling request; otherwise a short reason in Ukrainian.",
        },
        "title": {"type": "string", "description": "Short event title in the user's language, without date/time words."},
        "date": {"type": "string", "description": "YYYY-MM-DD"},
        "time": {"type": "string", "description": "HH:MM 24h start time, or empty string for an all-day event."},
        "duration_minutes": {"type": "integer", "description": "60 if not stated."},
        "location": {"type": "string", "description": "Empty if not stated."},
        "notes": {"type": "string", "description": "Extra details worth keeping, else empty."},
    },
    "required": ["error", "title", "date", "time", "duration_minutes", "location", "notes"],
    "additionalProperties": False,
}

SYSTEM = """You turn one dictated request into one Google Calendar event.
The text comes from speech recognition: Ukrainian, Russian, English or a mix, and may contain recognition mistakes — read it charitably.

Now it is {now} ({weekday}), time zone {tz}.
- Resolve relative dates against now: "сьогодні/сегодня/today", "завтра/tomorrow", "післязавтра/послезавтра".
- A bare weekday ("у пʼятницю", "в пятницу", "on Friday") means the nearest such day after today; "наступного/следующего/next <weekday>" means that weekday of next week.
- A date without a year means the nearest such date that is not in the past.
- "о 3", "в 3" without am/pm or context means 15:00 (business hours); "вранці/утром/morning" means before 12:00, "ввечері/вечером/evening" means after 17:00.
- No time mentioned → all-day event: time = "".
- Duration: use what was said ("на півтори години" = 90); otherwise 60.
- Title: short and natural, in the language the user spoke, no date or time words in it.
- If the text is not a request to put something in the calendar, fill "error" with a short reason in Ukrainian and leave the other strings empty (date "", duration 0).
Answer only with JSON matching the schema."""


_TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})")


class ParseError(RuntimeError):
    """The LLM call itself failed (network, quota, bad JSON)."""


class NotAnEvent(ValueError):
    """The text was understood but is not a usable scheduling request."""


def _system_prompt(now: datetime, tz: str) -> str:
    return SYSTEM.format(now=now.strftime("%Y-%m-%d %H:%M"), weekday=now.strftime("%A"), tz=tz)


def parse_event(text: str, now: datetime | None = None) -> Event:
    s = settings()
    now = now or datetime.now(ZoneInfo(s.timezone))
    system = _system_prompt(now, s.timezone)
    data = _ask_claude(system, text) if s.llm_backend == "claude" else _ask_groq(system, text)
    return event_from_json(data)


def _text(data: dict, key: str) -> str:
    """Field as one clean line; tolerates null/number from a non-strict model."""
    value = data.get(key)
    return "" if value is None else " ".join(str(value).split())


def event_from_json(data: dict) -> Event:
    if not isinstance(data, dict):
        raise ParseError("LLM answer is not a JSON object")
    if error := _text(data, "error"):
        raise NotAnEvent(error)
    title = _text(data, "title")
    if not title:
        raise NotAnEvent("Не зрозумів, що саме записати.")
    try:
        day = date.fromisoformat(_text(data, "date"))
    except ValueError:
        raise NotAnEvent("Не зрозумів дату.") from None
    raw_time = _text(data, "time")
    start = None
    if raw_time:
        m = _TIME_RE.match(raw_time)
        try:
            start = time(int(m.group(1)), int(m.group(2))) if m else None
        except ValueError:
            start = None
        if start is None:
            raise NotAnEvent("Не зрозумів час.")
    try:
        duration = int(float(data.get("duration_minutes") or 60))
    except (TypeError, ValueError):
        duration = 60
    duration = min(max(duration, 5), 24 * 60)
    return Event(
        title=title[:200],
        day=day,
        start=start,
        duration_minutes=duration,
        location=_text(data, "location")[:200],
        notes=_text(data, "notes")[:500],
    )


# --- Groq (OpenAI-compatible chat completions) --------------------------------

def _ask_groq(system: str, text: str) -> dict:
    s = settings()
    payload = {
        "model": s.groq_llm_model,
        "temperature": 0,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": text}],
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "calendar_event", "strict": True, "schema": SCHEMA},
        },
    }
    if s.groq_llm_model.startswith("openai/gpt-oss"):
        payload["reasoning_effort"] = "low"  # simple task; keeps latency and free-tier tokens down
    headers = {"Authorization": f"Bearer {s.groq_api_key}"}
    url = f"{s.groq_base_url}/chat/completions"
    try:
        r = http.post(url, json=payload, headers=headers, timeout=LLM_TIMEOUT)
        if r.status_code == 400 and "response_format" in r.text:
            # Model without strict structured outputs (fails fast): fall back to JSON mode.
            payload["response_format"] = {"type": "json_object"}
            payload["messages"][0]["content"] += "\nJSON schema:\n" + json.dumps(SCHEMA)
            r = http.post(url, json=payload, headers=headers, timeout=LLM_TIMEOUT)
    except HTTPError as e:
        raise ParseError(f"Groq request failed: {type(e).__name__}") from e
    if r.status_code != 200:
        raise ParseError(f"Groq chat failed: {r.status_code} {r.text[:300]}")
    try:
        return json.loads(r.json()["choices"][0]["message"]["content"])
    except (KeyError, IndexError, TypeError, ValueError) as e:
        raise ParseError(f"Groq returned unexpected output: {e}") from e


# --- Claude (official Anthropic SDK) ------------------------------------------

@lru_cache(maxsize=1)
def _anthropic_client():
    import anthropic

    # No retries: the whole update must finish within Telegram's ~60 s webhook wait.
    return anthropic.Anthropic(api_key=settings().anthropic_api_key, timeout=25.0, max_retries=0)


def _ask_claude(system: str, text: str) -> dict:
    import anthropic

    s = settings()
    try:
        response = _anthropic_client().beta.messages.create(
            model=s.anthropic_model,
            max_tokens=4096,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}},
            system=system,
            messages=[{"role": "user", "content": text}],
        )
    except anthropic.APIError as e:
        raise ParseError(f"Claude API error: {e}") from e
    if response.stop_reason == "refusal":
        raise NotAnEvent("Модель відмовилась обробити цей запит.")
    try:
        body = next(b.text for b in response.content if b.type == "text")
        return json.loads(body)
    except (StopIteration, ValueError) as e:
        raise ParseError(f"Claude returned unexpected output: {e}") from e
