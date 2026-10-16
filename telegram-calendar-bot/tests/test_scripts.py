import logging

import pytest


def test_http_client_does_not_log_urls_with_token():
    import bot.http  # noqa: F401  (configures the loggers)
    assert logging.getLogger("httpx2").getEffectiveLevel() >= logging.WARNING


@pytest.mark.parametrize("files,expected", [
    (["credentials.json"], "credentials.json"),
    (["credentials.json.json"], "credentials.json.json"),
    (["client_secret_123.apps.googleusercontent.com.json"], "client_secret_123.apps.googleusercontent.com.json"),
    (["client_secret_1.json", "client_secret_2.json"], None),  # ambiguous
    ([], None),
])
def test_google_auth_finds_client_secrets(tmp_path, monkeypatch, files, expected):
    from scripts import google_auth
    monkeypatch.setattr(google_auth, "ROOT", tmp_path)
    monkeypatch.setattr(google_auth, "CLIENT_SECRETS", tmp_path / "credentials.json")
    for f in files:
        (tmp_path / f).write_text("{}")
    found = google_auth.find_client_secrets()
    assert (found.name if found else None) == expected
