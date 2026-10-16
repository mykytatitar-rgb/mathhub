import os
import sys

import httpx2
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ENV = {
    "TELEGRAM_BOT_TOKEN": "123:abc",
    "TELEGRAM_WEBHOOK_SECRET": "s3cret",
    "ALLOWED_USER_ID": "42",
    "GROQ_API_KEY": "gsk_test",
    "GOOGLE_TOKEN_JSON": '{"client_id":"cid","client_secret":"cs","refresh_token":"rt",'
                         '"token_uri":"https://oauth2.googleapis.com/token"}',
    "TIMEZONE": "Europe/Kyiv",
}


@pytest.fixture(autouse=True)
def env(monkeypatch):
    for k, v in ENV.items():
        monkeypatch.setenv(k, v)
    for k in ("LLM_BACKEND", "STT_LANGUAGE", "ANTHROPIC_API_KEY"):
        monkeypatch.delenv(k, raising=False)
    from bot.config import settings
    settings.cache_clear()
    yield
    settings.cache_clear()


@pytest.fixture
def mock_http(monkeypatch):
    """Route every outgoing request to `handler(request) -> httpx2.Response`."""
    from bot import calendar_client, parser, stt, telegram_api

    def install(handler):
        client = httpx2.Client(transport=httpx2.MockTransport(handler))
        for mod in (calendar_client, parser, stt, telegram_api):
            monkeypatch.setattr(mod, "http", client)
        return client

    return install
