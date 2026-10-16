import os
from zoneinfo import ZoneInfo

os.environ.update(TELEGRAM_BOT_TOKEN="x", ALLOWED_USER_ID="1", ANTHROPIC_API_KEY="x")

from bot.calendar_client import event_body  # noqa: E402
from bot.parser import build_event  # noqa: E402

TZ = ZoneInfo("Europe/Kyiv")


def test_timed_event():
    ev = build_event({"title": "Зустріч з Олею", "start": "2026-10-17T15:00:00", "duration_minutes": 90}, TZ)
    b = event_body(ev)
    assert b["start"]["dateTime"].startswith("2026-10-17T15:00:00")
    assert b["end"]["dateTime"].startswith("2026-10-17T16:30:00")


def test_default_duration():
    ev = build_event({"title": "x", "start": "2026-10-17T09:00:00"}, TZ)
    assert ev.duration_minutes == 60


def test_all_day():
    b = event_body(build_event({"title": "День народження", "start": "2026-10-20"}, TZ))
    assert b["start"] == {"date": "2026-10-20"} and b["end"] == {"date": "2026-10-21"}
