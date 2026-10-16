import json
import re
from datetime import date, time

import httpx2
import pytest

from bot import calendar_client
from bot.event import Event

EV = Event("Зустріч", date(2026, 10, 17), time(15, 0), 60)


class FakeCalendar:
    """Google token endpoint + events collection keyed by id (keeps deleted ids like Google does)."""

    def __init__(self):
        self.events = {}
        self.requests = []

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
            # Google echoes dateTime with an offset
            stored = self.events[body["id"]]
            if "dateTime" in stored["start"]:
                stored["start"] = stored["start"] | {"dateTime": stored["start"]["dateTime"] + "+03:00"}
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
    cal.events[first_id] = {"id": first_id, "summary": "Old thing", "status": "confirmed",
                            "start": {"date": "2020-01-01"}, "htmlLink": "https://cal/old"}
    res = calendar_client.insert_event(EV, 42, 7)
    assert not res.already_existed and res.link != "https://cal/old"
    assert len(cal.events) == 2


def test_deleted_event_id_does_not_fake_success(cal):
    calendar_client.insert_event(EV, 42, 7)
    assert calendar_client.delete_event(EV, 42, 7) is True
    res = calendar_client.insert_event(EV, 42, 7)  # ✅ again after a cancel
    assert not res.already_existed
    assert sum(e["status"] != "cancelled" for e in cal.events.values()) == 1


def test_delete_when_nothing_was_written(cal):
    assert calendar_client.delete_event(EV, 42, 7) is False
    assert not any(r.method == "DELETE" for r in cal.requests)


def test_revoked_refresh_token(mock_http):
    mock_http(lambda req: httpx2.Response(400, json={"error": "invalid_grant"}))
    with pytest.raises(calendar_client.GoogleAuthExpired) as e:
        calendar_client.insert_event(EV, 42, 7)
    assert "google_auth.py" in e.value.hint


@pytest.mark.parametrize("status,hint_part", [(403, "google_auth.py"), (404, "GOOGLE_CALENDAR_ID"),
                                              (500, "ще раз за хвилину")])
def test_calendar_error_hints(mock_http, status, hint_part):
    def handler(req):
        if req.url.host == "oauth2.googleapis.com":
            return httpx2.Response(200, json={"access_token": "at"})
        return httpx2.Response(status, text="nope")

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
