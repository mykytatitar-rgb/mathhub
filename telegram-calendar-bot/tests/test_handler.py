"""End-to-end through process_update with fake Telegram, Groq and Google servers."""
import json

import httpx2
import pytest

from bot.handler import process_update

EVENT_JSON = {"error": "", "title": "Зустріч з Олею", "date": "2026-10-17", "time": "15:00",
              "duration_minutes": 60, "location": "кафе", "notes": ""}


class World:
    def __init__(self):
        self.tg = []          # (method, params)
        self.inserted = []    # google event bodies
        self.transcript = "завтра о 15 зустріч з Олею в кафе"
        self.llm = EVENT_JSON
        self.next_message_id = 100

    def __call__(self, req: httpx2.Request) -> httpx2.Response:
        host, path = req.url.host, req.url.path
        if host == "api.telegram.org" and path.startswith("/file/"):
            return httpx2.Response(200, content=b"OggS-fake")
        if host == "api.telegram.org":
            method = path.rsplit("/", 1)[-1]
            params = json.loads(req.content or b"{}")
            self.tg.append((method, params))
            if method == "getFile":
                return httpx2.Response(200, json={"ok": True, "result": {"file_path": "voice/file_1.oga"}})
            if method == "sendMessage":
                self.next_message_id += 1
                return httpx2.Response(200, json={"ok": True, "result": {"message_id": self.next_message_id}})
            return httpx2.Response(200, json={"ok": True, "result": True})
        if path.endswith("/audio/transcriptions"):
            assert b'filename="audio.ogg"' in req.content
            return httpx2.Response(200, json={"text": self.transcript})
        if path.endswith("/chat/completions"):
            return httpx2.Response(200, json={"choices": [{"message": {"content": json.dumps(self.llm)}}]})
        if host == "oauth2.googleapis.com":
            return httpx2.Response(200, json={"access_token": "at"})
        if host == "www.googleapis.com" and req.method == "POST":
            body = json.loads(req.content)
            if any(b["id"] == body["id"] for b in self.inserted):
                return httpx2.Response(409, json={})
            self.inserted.append(body)
            return httpx2.Response(200, json={"htmlLink": "https://calendar.google.com/e/1"})
        if host == "www.googleapis.com":
            return httpx2.Response(200, json={"htmlLink": "https://calendar.google.com/e/1"})
        raise AssertionError(f"unexpected request {req.method} {req.url}")

    def sent(self, method):
        return [p for m, p in self.tg if m == method]


@pytest.fixture
def world(mock_http):
    w = World()
    mock_http(w)
    return w


def voice_update(user_id=42, duration=4):
    return {"update_id": 1, "message": {
        "message_id": 5, "chat": {"id": 42}, "from": {"id": user_id},
        "voice": {"file_id": "F1", "duration": duration, "mime_type": "audio/ogg"}}}


def button_update(text, data="ok", user_id=42):
    return {"update_id": 2, "callback_query": {
        "id": "cb1", "from": {"id": user_id}, "data": data,
        "message": {"message_id": 101, "chat": {"id": 42}, "date": 1, "text": text}}}


def test_voice_to_confirmation(world):
    process_update(voice_update())
    [msg] = world.sent("sendMessage")
    assert msg["chat_id"] == 42
    assert "🗣 «завтра о 15 зустріч з Олею в кафе»" in msg["text"]
    assert "📌 Зустріч з Олею" in msg["text"]
    assert "📅 Сб, 17.10.2026 15:00 (60 хв)" in msg["text"]
    assert [b["callback_data"] for b in msg["reply_markup"]["inline_keyboard"][0]] == ["ok", "no"]
    assert world.inserted == []  # nothing is written before ✅


def test_confirm_writes_calendar_and_is_idempotent(world):
    process_update(voice_update())
    confirmation = world.sent("sendMessage")[0]["text"]
    process_update(button_update(confirmation))
    process_update(button_update(confirmation))  # double tap
    assert len(world.inserted) == 1
    body = world.inserted[0]
    assert body["summary"] == "Зустріч з Олею" and body["location"] == "кафе"
    assert body["start"] == {"dateTime": "2026-10-17T15:00:00", "timeZone": "Europe/Kyiv"}
    edits = world.sent("editMessageText")
    assert edits[0]["text"].startswith("✅ Додано в календар")
    assert edits[1]["text"].startswith("✅ Вже в календарі")
    assert "reply_markup" not in edits[0]


def test_cancel(world):
    process_update(voice_update())
    process_update(button_update(world.sent("sendMessage")[0]["text"], data="no"))
    assert world.inserted == []
    assert world.sent("editMessageText")[0]["text"].startswith("❌ Скасовано")


def test_text_message_has_no_transcript_line(world):
    process_update({"update_id": 3, "message": {"message_id": 6, "chat": {"id": 42}, "from": {"id": 42},
                                                "text": "завтра о 15 зустріч з Олею"}})
    [msg] = world.sent("sendMessage")
    assert "🗣" not in msg["text"] and "📌 Зустріч з Олею" in msg["text"]


def test_strangers_are_ignored(world):
    process_update(voice_update(user_id=666))
    process_update(button_update("📌 x\n📅 Сб, 17.10.2026, весь день", user_id=666))
    assert world.sent("sendMessage") == [] and world.inserted == []
    assert [m for m, _ in world.tg] == ["answerCallbackQuery"]


def test_not_an_event(world):
    world.llm = EVENT_JSON | {"error": "Це схоже на питання, а не на подію."}
    process_update(voice_update())
    [msg] = world.sent("sendMessage")
    assert "🤔 Це схоже на питання" in msg["text"] and "reply_markup" not in msg


def test_long_voice_rejected(world):
    process_update(voice_update(duration=600))
    assert "Задовге" in world.sent("sendMessage")[0]["text"]
    assert world.sent("getFile") == []


def test_empty_transcript(world):
    world.transcript = "  "
    process_update(voice_update())
    assert "Нічого не розчув" in world.sent("sendMessage")[0]["text"]


def test_start_command(world):
    process_update({"update_id": 4, "message": {"message_id": 7, "chat": {"id": 42}, "from": {"id": 42},
                                                "text": "/start"}})
    assert "Надішли голосове" in world.sent("sendMessage")[0]["text"]


def test_inaccessible_message(world):
    upd = button_update("")
    upd["callback_query"]["message"] = {"message_id": 101, "chat": {"id": 42}, "date": 0}
    process_update(upd)
    [ans] = world.sent("answerCallbackQuery")
    assert "застаріле" in ans["text"]
    assert world.inserted == []


def test_upstream_failure_is_reported_not_raised(mock_http):
    w = World()

    def handler(req):
        if req.url.path.endswith("/audio/transcriptions"):
            return httpx2.Response(500, text="boom")
        return w(req)

    mock_http(handler)
    process_update(voice_update())
    assert "Не вдалося обробити" in w.sent("sendMessage")[0]["text"]
