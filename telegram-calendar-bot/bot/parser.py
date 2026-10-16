"""Text -> structured calendar event, via Claude tool use."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import anthropic

from .config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL, TIMEZONE

_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

TOOL = {
    "name": "create_event",
    "description": "Create a calendar event from the user's spoken request.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Short event title, in the user's language"},
            "start": {
                "type": "string",
                "description": "Start as ISO 8601 local time without offset, e.g. 2026-10-17T15:00:00. "
                "For all-day events use a date only: 2026-10-17",
            },
            "duration_minutes": {
                "type": "integer",
                "description": "Duration in minutes. Default 60 if not said. Ignored for all-day.",
            },
            "location": {"type": "string"},
            "description": {"type": "string"},
        },
        "required": ["title", "start"],
    },
}


@dataclass
class Event:
    title: str
    start: datetime | None  # None for all-day
    all_day_date: str | None
    duration_minutes: int
    location: str = ""
    description: str = ""

    @property
    def end(self) -> datetime | None:
        return self.start + timedelta(minutes=self.duration_minutes) if self.start else None

    def pretty(self) -> str:
        when = self.all_day_date if self.all_day_date else self.start.strftime("%a %d.%m.%Y %H:%M")
        dur = "" if self.all_day_date else f" ({self.duration_minutes} хв)"
        loc = f"\n📍 {self.location}" if self.location else ""
        return f"📌 {self.title}\n🕒 {when}{dur}{loc}"


def parse_event(text: str, now: datetime | None = None) -> Event:
    tz = ZoneInfo(TIMEZONE)
    now = now or datetime.now(tz)
    system = (
        f"Current local time: {now.strftime('%A %Y-%m-%d %H:%M')} ({TIMEZONE}). "
        "The user dictated a calendar request (Ukrainian/Russian/English, possibly mixed, may contain "
        "speech-recognition typos). Resolve relative dates ('завтра', 'в пʼятницю', 'next Monday') "
        "against the current time. Always call create_event."
    )
    resp = _client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=500,
        system=system,
        tools=[TOOL],
        tool_choice={"type": "tool", "name": "create_event"},
        messages=[{"role": "user", "content": text}],
    )
    data = next(b.input for b in resp.content if b.type == "tool_use")
    return build_event(data, tz)


def build_event(data: dict, tz: ZoneInfo) -> Event:
    start_raw = data["start"]
    common = dict(
        title=data["title"].strip(),
        duration_minutes=int(data.get("duration_minutes") or 60),
        location=data.get("location", "") or "",
        description=data.get("description", "") or "",
    )
    if "T" not in start_raw:  # all-day
        return Event(start=None, all_day_date=start_raw, **common)
    start = datetime.fromisoformat(start_raw)
    if start.tzinfo is None:
        start = start.replace(tzinfo=tz)
    return Event(start=start, all_day_date=None, **common)
