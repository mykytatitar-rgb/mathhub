import json
import threading
from http.server import HTTPServer

import httpx2
import pytest


@pytest.fixture
def server(monkeypatch):
    import api.telegram as entry

    received = []
    monkeypatch.setattr(entry, "process_update", received.append)
    srv = HTTPServer(("127.0.0.1", 0), entry.handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_port}/api/telegram", received
    srv.shutdown()


def test_rejects_wrong_secret(server):
    url, received = server
    r = httpx2.post(url, json={"update_id": 1}, headers={"X-Telegram-Bot-Api-Secret-Token": "nope"})
    assert r.status_code == 401 and received == []


def test_rejects_missing_secret(server):
    url, received = server
    assert httpx2.post(url, json={"update_id": 1}).status_code == 401


def test_fails_closed_without_configured_secret(server, monkeypatch):
    from bot.config import settings
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", "")
    settings.cache_clear()
    url, received = server
    r = httpx2.post(url, json={"update_id": 1}, headers={"X-Telegram-Bot-Api-Secret-Token": ""})
    assert r.status_code == 401 and received == []


def test_accepts_update(server):
    url, received = server
    r = httpx2.post(url, content=json.dumps({"update_id": 9}),
                    headers={"X-Telegram-Bot-Api-Secret-Token": "s3cret", "Content-Type": "application/json"})
    assert r.status_code == 200 and received == [{"update_id": 9}]


def test_bad_json(server):
    url, received = server
    r = httpx2.post(url, content=b"{oops", headers={"X-Telegram-Bot-Api-Secret-Token": "s3cret"})
    assert r.status_code == 400 and received == []


def test_get_health(server):
    url, _ = server
    assert httpx2.get(url).text == "bot is alive"
