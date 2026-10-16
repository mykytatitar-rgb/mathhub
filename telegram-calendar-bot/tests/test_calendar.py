import json
import re
from datetime import date, time

import httpx2
import pytest

from bot import calendar_client
from bot.event import Event

EV = Event("Зустріч", date(2026, 10, 17), time(15, 0), 60)


def test_event_id_is_deterministic_base32hex():
    a = calendar_client.event_id(42, 7)
    assert a == calendar_client.event_id(42, 7) != calendar_client.event_id(42, 8)
    assert re.fullmatch(r"[0-9a-v]{5,1024}", a)


def test_insert_refreshes_token_and_posts_event(mock_http):
    seen = []

    def handler(req):
        seen.append(req)
        if req.url.host == "oauth2.googleapis.com":
            assert b"refresh_token=rt" in req.content
            return httpx2.Response(200, json={"access_token": "at"})
        assert req.headers["Authorization"] == "Bearer at"
        body = json.loads(req.content)
        assert body["id"] == calendar_client.event_id(42, 7)
        assert body["start"]["dateTime"] == "2026-10-17T15:00:00"
        return httpx2.Response(200, json={"htmlLink": "https://cal/1"})

    mock_http(handler)
    res = calendar_client.insert_event(EV, 42, 7)
    assert res == calendar_client.Inserted(link="https://cal/1", already_existed=False)
    assert "/calendars/primary/events" in str(seen[1].url)


def test_insert_duplicate_returns_existing(mock_http):
    def handler(req):
        if req.url.host == "oauth2.googleapis.com":
            return httpx2.Response(200, json={"access_token": "at"})
        if req.method == "POST":
            return httpx2.Response(409, json={"error": {"message": "The requested identifier already exists."}})
        return httpx2.Response(200, json={"htmlLink": "https://cal/1"})

    mock_http(handler)
    assert calendar_client.insert_event(EV, 42, 7) == calendar_client.Inserted("https://cal/1", True)


def test_revoked_refresh_token(mock_http):
    mock_http(lambda req: httpx2.Response(400, json={"error": "invalid_grant"}))
    with pytest.raises(calendar_client.GoogleAuthExpired):
        calendar_client.insert_event(EV, 42, 7)


def test_calendar_error(mock_http):
    def handler(req):
        if req.url.host == "oauth2.googleapis.com":
            return httpx2.Response(200, json={"access_token": "at"})
        return httpx2.Response(403, text="forbidden")

    mock_http(handler)
    with pytest.raises(calendar_client.CalendarError):
        calendar_client.insert_event(EV, 42, 7)


def test_bad_token_json(monkeypatch):
    monkeypatch.setenv("GOOGLE_TOKEN_JSON", "{not json")
    calendar_client.settings.cache_clear()
    with pytest.raises(calendar_client.CalendarError):
        calendar_client.insert_event(EV, 42, 7)
