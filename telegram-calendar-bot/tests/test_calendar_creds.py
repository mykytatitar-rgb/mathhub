import json
import os

os.environ.update(TELEGRAM_BOT_TOKEN="x", ALLOWED_USER_ID="1", ANTHROPIC_API_KEY="x")

from datetime import datetime, timedelta, timezone  # noqa: E402

from bot import calendar_client  # noqa: E402

TOKEN = {
    "token": "access",
    "refresh_token": "refresh",
    "client_id": "id",
    "client_secret": "secret",
    "token_uri": "https://oauth2.googleapis.com/token",
    "expiry": (datetime.now(timezone.utc) + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ"),
}


def test_creds_from_env(monkeypatch):
    monkeypatch.setattr(calendar_client, "GOOGLE_TOKEN_JSON", json.dumps(TOKEN))
    creds = calendar_client._load_creds()
    assert creds.refresh_token == "refresh" and creds.valid
