import json
import re
from datetime import date, datetime, time, timedelta

import httpx2
import pytest

from bot import calendar_client
from bot.event import Event

EV = Event("Зустріч", date(2026, 10, 17), time(15, 0), 60)


class FakeCalendar:
    """Google token endpoint + events collection keyed by id (keeps deleted ids like Google does)."""

    def __init__(self, render_offset="+03:00", render_shift_hours=0):
        self.events = {}
        self.requests = []
        # Google renders dateTime in the *calendar's* zone, which may differ from TIMEZONE
        self.render_offset = render_offset
        self.render_shift_hours = render_shift_hours

    def __call__(self, req):
        self.requests.append(req)
        if req.url.host == "oauth2.googleapis.com":
            assert b"refresh_token=rt" in req.content
            return httpx2.Response(200, json={"access_token": "at"})
        assert req.headers["Authorization"] == "Bearer at"
        path = req.url.path
        if req.method == "POST":
            body = json.loads(req.content)
            if body["id"] in self.events:
                return httpx2.Response(409, json={"error": {"message": "The requested identifier already exists."}})
            self.events[body["id"]] = body | {"status": "confirmed", "htmlLink": f"https://cal/{body['id'][:6]}"}
            stored = self.events[body["id"]]
            if "dateTime" in stored["start"]:
                local = datetime.fromisoformat(stored["start"]["dateTime"]) + timedelta(hours=self.render_shift_hours)
                stored["start"] = stored["start"] | {"dateTime": local.isoformat() + self.render_offset}
            return httpx2.Response(200, json=stored)
        eid = path.rsplit("/", 1)[-1]
        if eid not in self.events:
            return httpx2.Response(404, json={})
        if req.method == "DELETE":
            if self.events[eid]["status"] == "cancelled":
                return httpx2.Response(410, json={})
            self.events[eid]["status"] = "cancelled"
            return httpx2.Response(204)
        return httpx2.Response(200, json=self.events[eid])


@pytest.fixture
def cal(mock_http):
    c = FakeCalendar()
    mock_http(c)
    return c


def test_event_ids_are_deterministic_base32hex_and_include_bot(monkeypatch):
    a = calendar_client.event_ids(42, 7)
    assert a == calendar_client.event_ids(42, 7) != calendar_client.event_ids(42, 8)
    assert len(set(a)) == calendar_client.ID_SLOTS
    assert all(re.fullmatch(r"[0-9a-v]{5,1024}", i) for i in a)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "999:other")
    calendar_client.settings.cache_clear()
    assert calendar_client.event_ids(42, 7) != a  # a new bot does not collide with old events


def test_insert_then_repeat_is_idempotent(cal):
    first = calendar_client.insert_event(EV, 42, 7)
    second = calendar_client.insert_event(EV, 42, 7)
    assert not first.already_existed and second.already_existed
    assert first.link == second.link and len(cal.events) == 1
    [body] = cal.events.values()
    assert body["start"]["dateTime"].startswith("2026-10-17T15:00:00")
    assert "/calendars/primary/events" in str(cal.requests[1].url)


def test_id_taken_by_unrelated_event_uses_next_slot(cal):
    first_id = calendar_client.event_ids(42, 7)[0]
    cal.events[first_id] = {"id": first_id, "summary": "Зустріч", "status": "confirmed",
                            "start": {"date": "2020-01-01"}, "htmlLink": "https://cal/old"}  # no marker
    res = calendar_client.insert_event(EV, 42, 7)
    assert not res.already_existed and res.link != "https://cal/old"
    assert len(cal.events) == 2


def test_deleted_event_id_does_not_fake_success(cal):
    calendar_client.insert_event(EV, 42, 7)
    assert calendar_client.delete_event(42, 7) is True
    res = calendar_client.insert_event(EV, 42, 7)  # ✅ again after a cancel
    assert not res.already_existed
    assert sum(e["status"] != "cancelled" for e in cal.events.values()) == 1


def test_delete_when_nothing_was_written(cal):
    assert calendar_client.delete_event(42, 7) is False
    assert not any(r.method == "DELETE" for r in cal.requests)


def test_calendar_in_another_time_zone_still_deduplicates(mock_http):
    cal = FakeCalendar(render_offset="+02:00", render_shift_hours=-1)  # calendar in Europe/Warsaw
    mock_http(cal)
    calendar_client.insert_event(EV, 42, 7)
    assert calendar_client.insert_event(EV, 42, 7).already_existed
    assert calendar_client.delete_event(42, 7) is True
    assert all(e["status"] == "cancelled" for e in cal.events.values())


def test_insert_marks_event_with_confirmation_key(cal):
    calendar_client.insert_event(EV, 42, 7)
    [body] = cal.events.values()
    assert body["extendedProperties"]["private"]["tg_confirmation"] == "tg:123:42:7"


def test_revoked_refresh_token(mock_http):
    mock_http(lambda req: httpx2.Response(400, json={"error": "invalid_grant"}))
    with pytest.raises(calendar_client.GoogleAuthExpired) as e:
        calendar_client.insert_event(EV, 42, 7)
    assert "google_auth.py" in e.value.hint


@pytest.mark.parametrize("status,body,hint_part", [
    (403, '{"error":{"errors":[{"reason":"accessNotConfigured"}]}}', "API не увімкнено"),
    (403, '{"error":{"errors":[{"reason":"requiredAccessLevel"}]}}', "права запису"),
    (403, '{"error":{"errors":[{"reason":"rateLimitExceeded"}]}}', "обмежив"),
    (403, '{"error":{"errors":[{"reason":"insufficientPermissions"}]}}', "google_auth.py"),
    (401, "unauthorized", "google_auth.py"),
    (404, "not found", "GOOGLE_CALENDAR_ID"),
    (500, "boom", "ще раз за хвилину"),
])
def test_calendar_error_hints(mock_http, status, body, hint_part):
    def handler(req):
        if req.url.host == "oauth2.googleapis.com":
            return httpx2.Response(200, json={"access_token": "at"})
        return httpx2.Response(status, text=body)

    mock_http(handler)
    with pytest.raises(calendar_client.CalendarError) as e:
        calendar_client.insert_event(EV, 42, 7)
    assert hint_part in e.value.hint


def test_network_error_becomes_calendar_error(mock_http):
    def handler(req):
        raise httpx2.ConnectError("boom")

    mock_http(handler)
    with pytest.raises(calendar_client.CalendarError):
        calendar_client.insert_event(EV, 42, 7)


def test_bad_token_json(monkeypatch):
    monkeypatch.setenv("GOOGLE_TOKEN_JSON", "{not json")
    calendar_client.settings.cache_clear()
    with pytest.raises(calendar_client.CalendarError) as e:
        calendar_client.insert_event(EV, 42, 7)
    assert "GOOGLE_TOKEN_JSON" in e.value.hint
