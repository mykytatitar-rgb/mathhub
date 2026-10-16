"""Google Calendar via plain REST (no heavy google-api-python-client in the bundle).

GOOGLE_TOKEN_JSON is the line printed by scripts/google_auth.py: it holds the
refresh_token, which never expires as long as the OAuth app is "In production".
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from urllib.parse import quote

from .config import settings
from .event import Event
from .http import http

TOKEN_URL = "https://oauth2.googleapis.com/token"
EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/{cal}/events"


class CalendarError(RuntimeError):
    pass


class GoogleAuthExpired(CalendarError):
    pass


@dataclass(frozen=True)
class Inserted:
    link: str
    already_existed: bool


def _access_token() -> str:
    try:
        tok = json.loads(settings().google_token_json)
        data = {
            "client_id": tok["client_id"],
            "client_secret": tok["client_secret"],
            "refresh_token": tok["refresh_token"],
            "grant_type": "refresh_token",
        }
    except (ValueError, KeyError) as e:
        raise CalendarError(f"GOOGLE_TOKEN_JSON is not valid: {e}") from e
    r = http.post(tok.get("token_uri") or TOKEN_URL, data=data)
    if r.status_code in (400, 401) and "invalid_grant" in r.text:
        raise GoogleAuthExpired("refresh token revoked or expired")
    if r.status_code != 200:
        raise CalendarError(f"token refresh failed: {r.status_code} {r.text[:200]}")
    return r.json()["access_token"]


def event_id(chat_id: int, message_id: int) -> str:
    """Deterministic id per confirmation message: a double tap on ✅ or a
    Telegram retry hits 409 instead of creating a duplicate event.
    Hex digits are valid base32hex, as the Calendar API requires."""
    return hashlib.sha1(f"tg:{chat_id}:{message_id}".encode()).hexdigest()


def insert_event(ev: Event, chat_id: int, message_id: int) -> Inserted:
    s = settings()
    url = EVENTS_URL.format(cal=quote(s.google_calendar_id, safe=""))
    eid = event_id(chat_id, message_id)
    headers = {"Authorization": f"Bearer {_access_token()}"}
    body = ev.google_body(s.timezone) | {"id": eid}
    r = http.post(url, json=body, headers=headers)
    if r.status_code == 409:  # already created by an earlier tap
        g = http.get(f"{url}/{eid}", headers=headers)
        link = g.json().get("htmlLink", "") if g.status_code == 200 else ""
        return Inserted(link=link, already_existed=True)
    if r.status_code not in (200, 201):
        raise CalendarError(f"insert failed: {r.status_code} {r.text[:300]}")
    return Inserted(link=r.json().get("htmlLink", ""), already_existed=False)
