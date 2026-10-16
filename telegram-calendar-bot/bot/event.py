"""Calendar event model.

Vercel functions keep no memory between requests, so the event waiting for
✅/❌ lives in the bot's own confirmation message: `render()` writes it in a
fixed format and `parse_rendered()` reads it back when the button is pressed.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

WEEKDAYS_UK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"]

TITLE, WHEN, PLACE, NOTES = "📌 ", "📅 ", "📍 ", "📝 "
_WHEN_RE = re.compile(r"(\d{2})\.(\d{2})\.(\d{4})(?: (\d{2}):(\d{2}) \((\d+) хв\))?")


def _one_line(s: str) -> str:
    return " ".join(s.split())


@dataclass(frozen=True)
class Event:
    title: str
    day: date
    start: time | None = None  # None = all-day event
    duration_minutes: int = 60
    location: str = ""
    notes: str = ""

    @property
    def all_day(self) -> bool:
        return self.start is None

    def google_body(self, timezone: str) -> dict:
        body: dict = {"summary": self.title}
        if self.location:
            body["location"] = self.location
        if self.notes:
            body["description"] = self.notes
        if self.all_day:
            body["start"] = {"date": self.day.isoformat()}
            body["end"] = {"date": (self.day + timedelta(days=1)).isoformat()}
        else:
            # Local wall-clock time + timeZone: Google applies DST itself.
            start = datetime.combine(self.day, self.start)
            end = start + timedelta(minutes=self.duration_minutes)
            body["start"] = {"dateTime": start.isoformat(timespec="seconds"), "timeZone": timezone}
            body["end"] = {"dateTime": end.isoformat(timespec="seconds"), "timeZone": timezone}
        return body

    def render(self) -> str:
        when = f"{WEEKDAYS_UK[self.day.weekday()]}, {self.day:%d.%m.%Y}"
        when += ", весь день" if self.all_day else f" {self.start:%H:%M} ({self.duration_minutes} хв)"
        lines = [TITLE + _one_line(self.title), WHEN + when]
        if self.location:
            lines.append(PLACE + _one_line(self.location))
        if self.notes:
            lines.append(NOTES + _one_line(self.notes))
        return "\n".join(lines)


def parse_rendered(text: str) -> Event | None:
    """Inverse of Event.render(); finds the block anywhere in a longer message."""
    fields: dict[str, str] = {}
    for line in text.splitlines():
        for prefix in (TITLE, WHEN, PLACE, NOTES):
            if line.startswith(prefix):
                fields[prefix] = line[len(prefix):].strip()
    if TITLE not in fields or WHEN not in fields:
        return None
    m = _WHEN_RE.search(fields[WHEN])
    if not m:
        return None
    dd, mm, yyyy, hh, mi, dur = m.groups()
    try:
        day = date(int(yyyy), int(mm), int(dd))
        start = time(int(hh), int(mi)) if hh else None
    except ValueError:
        return None
    return Event(
        title=fields[TITLE],
        day=day,
        start=start,
        duration_minutes=int(dur) if dur else 60,
        location=fields.get(PLACE, ""),
        notes=fields.get(NOTES, ""),
    )
