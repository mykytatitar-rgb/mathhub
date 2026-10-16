import json
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

import httpx2
import pytest

from bot import parser

NOW = datetime(2026, 10, 16, 10, 0, tzinfo=ZoneInfo("Europe/Kyiv"))
GOOD = {"error": "", "title": "Стоматолог", "date": "2026-10-23", "time": "10:00",
        "duration_minutes": 30, "location": "", "notes": ""}


def chat_response(content: dict) -> httpx2.Response:
    return httpx2.Response(200, json={"choices": [{"message": {"content": json.dumps(content)}}]})


def test_event_from_json_timed():
    ev = parser.event_from_json(GOOD)
    assert (ev.title, ev.day, ev.start, ev.duration_minutes) == ("Стоматолог", date(2026, 10, 23), time(10, 0), 30)


@pytest.mark.parametrize("t,expected", [("9:05", time(9, 5)), ("09:05:00", time(9, 5)), ("", None)])
def test_event_from_json_time_formats(t, expected):
    assert parser.event_from_json(GOOD | {"time": t}).start == expected


@pytest.mark.parametrize("patch", [
    {"error": "Це не подія"},
    {"title": "  "},
    {"date": "next friday"},
    {"time": "25:00"},
    {"time": "ten"},
])
def test_event_from_json_rejects(patch):
    with pytest.raises(parser.NotAnEvent):
        parser.event_from_json(GOOD | patch)


@pytest.mark.parametrize("raw,expected", [(0, 60), (None, 60), (1, 5), (10_000, 1440), ("45", 45)])
def test_duration_defaults_and_clamps(raw, expected):
    assert parser.event_from_json(GOOD | {"duration_minutes": raw}).duration_minutes == expected


def test_groq_strict_schema_request(mock_http):
    seen = []

    def handler(req):
        seen.append(json.loads(req.content))
        return chat_response(GOOD)

    mock_http(handler)
    ev = parser.parse_event("в пʼятницю о 10 стоматолог на пів години", now=NOW)
    assert ev.day == date(2026, 10, 23)
    body = seen[0]
    assert body["response_format"]["type"] == "json_schema"
    assert body["response_format"]["json_schema"]["strict"] is True
    assert body["model"] == "openai/gpt-oss-120b" and body["reasoning_effort"] == "low"
    assert "2026-10-16 10:00 (Friday)" in body["messages"][0]["content"]
    assert body["messages"][1]["content"].startswith("в пʼятницю")


def test_groq_falls_back_to_json_mode(mock_http):
    calls = []

    def handler(req):
        body = json.loads(req.content)
        calls.append(body["response_format"]["type"])
        if body["response_format"]["type"] == "json_schema":
            return httpx2.Response(400, json={"error": {"message": "response_format json_schema not supported"}})
        return chat_response(GOOD)

    mock_http(handler)
    assert parser.parse_event("x", now=NOW).title == "Стоматолог"
    assert calls == ["json_schema", "json_object"]


def test_groq_http_error_is_parse_error(mock_http):
    mock_http(lambda req: httpx2.Response(429, text="rate limited"))
    with pytest.raises(parser.ParseError):
        parser.parse_event("x", now=NOW)


def test_groq_bad_json_is_parse_error(mock_http):
    mock_http(lambda req: httpx2.Response(200, json={"choices": [{"message": {"content": "not json"}}]}))
    with pytest.raises(parser.ParseError):
        parser.parse_event("x", now=NOW)


def test_claude_backend(monkeypatch):
    monkeypatch.setenv("LLM_BACKEND", "claude")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    parser.settings.cache_clear()
    captured = {}

    class Block:
        type = "text"
        text = json.dumps(GOOD)

    class Resp:
        stop_reason = "end_turn"
        content = [Block()]

    class Messages:
        def create(self, **kw):
            captured.update(kw)
            return Resp()

    class Client:
        class beta:
            messages = Messages()

    monkeypatch.setattr(parser, "_anthropic_client", lambda: Client())
    assert parser.parse_event("x", now=NOW).title == "Стоматолог"
    assert captured["model"] == "claude-opus-5-5"
    assert captured["fallbacks"] == "default"
    assert captured["output_config"]["format"]["type"] == "json_schema"


def test_claude_refusal_is_not_an_event(monkeypatch):
    monkeypatch.setenv("LLM_BACKEND", "claude")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    parser.settings.cache_clear()

    class Resp:
        stop_reason = "refusal"
        content = []

    class Client:
        class beta:
            class messages:
                @staticmethod
                def create(**kw):
                    return Resp()

    monkeypatch.setattr(parser, "_anthropic_client", lambda: Client())
    with pytest.raises(parser.NotAnEvent):
        parser.parse_event("x", now=NOW)


@pytest.mark.parametrize("path,name", [
    ("voice/file_1.oga", "audio.ogg"),
    ("music/file_2.MP3", "audio.mp3"),
    ("music/file_3.m4a", "audio.m4a"),
    ("documents/file_4", "audio.ogg"),
    ("", "audio.ogg"),
])
def test_stt_upload_name(path, name):
    from bot.stt import upload_name
    assert upload_name(path) == name


@pytest.mark.parametrize("data", [
    GOOD | {"location": None, "notes": None},
    GOOD | {"duration_minutes": 30.0},
    GOOD | {"error": None},
    GOOD | {"error": False},
])
def test_event_from_json_tolerates_nulls_and_floats(data):
    ev = parser.event_from_json(data)
    assert ev.location == "" and ev.notes == "" and ev.duration_minutes == 30


def test_event_from_json_non_dict():
    with pytest.raises(parser.ParseError):
        parser.event_from_json(["not", "a", "dict"])


def test_invalid_timezone_is_a_clear_config_error(monkeypatch):
    monkeypatch.setenv("TIMEZONE", "Europe/Nowhere")
    parser.settings.cache_clear()
    with pytest.raises(RuntimeError, match="Invalid TIMEZONE"):
        parser.settings()


@pytest.mark.parametrize("tz", ["Europe", "Kyiv", "UTC+3"])
def test_invalid_timezone_variants(monkeypatch, tz):
    monkeypatch.setenv("TIMEZONE", tz)
    parser.settings.cache_clear()
    with pytest.raises(RuntimeError, match="Invalid TIMEZONE"):
        parser.settings()


def test_timezone_is_stripped(monkeypatch):
    monkeypatch.setenv("TIMEZONE", " Europe/Kyiv \n")
    parser.settings.cache_clear()
    assert parser.settings().timezone == "Europe/Kyiv"
