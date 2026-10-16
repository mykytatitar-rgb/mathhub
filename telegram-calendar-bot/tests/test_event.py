from datetime import date, time

from bot.event import Event, parse_rendered


def test_roundtrip_timed_with_details():
    ev = Event("Зустріч з Олею", date(2026, 10, 17), time(15, 0), 90, "Кафе «Львів»", "взяти ноутбук")
    assert parse_rendered(ev.render()) == ev


def test_roundtrip_all_day():
    ev = Event("День народження мами", date(2026, 12, 1))
    text = ev.render()
    assert "весь день" in text
    assert parse_rendered(text) == ev


def test_parse_inside_confirmation_message():
    ev = Event("Stand-up", date(2026, 10, 19), time(9, 30), 15)
    msg = f"🗣 «📌 fake title typed by user»\n\n{ev.render()}\n\nДодати в календар?"
    assert parse_rendered(msg) == ev


def test_newlines_in_fields_are_flattened():
    ev = Event("a\nb", date(2026, 1, 2), time(8, 0), 60, "x\ny", "n1\nn2")
    back = parse_rendered(ev.render())
    assert (back.title, back.location, back.notes) == ("a b", "x y", "n1 n2")


def test_parse_garbage_returns_none():
    assert parse_rendered("hello") is None
    assert parse_rendered("📌 x\n📅 32.13.2026 10:00 (60 хв)") is None


def test_google_body_timed_crosses_midnight():
    body = Event("Ніч", date(2026, 10, 17), time(23, 30), 90).google_body("Europe/Kyiv")
    assert body["start"] == {"dateTime": "2026-10-17T23:30:00", "timeZone": "Europe/Kyiv"}
    assert body["end"] == {"dateTime": "2026-10-18T01:00:00", "timeZone": "Europe/Kyiv"}
    assert "location" not in body and "description" not in body


def test_google_body_all_day_end_is_exclusive():
    body = Event("Відпустка", date(2026, 12, 31)).google_body("Europe/Kyiv")
    assert body["start"] == {"date": "2026-12-31"}
    assert body["end"] == {"date": "2027-01-01"}
