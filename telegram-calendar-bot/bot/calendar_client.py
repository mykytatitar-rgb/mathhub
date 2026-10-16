"""Google Calendar writer.

Credentials come from GOOGLE_TOKEN_JSON (servers) or token.json (local).
Create them once on your own PC with `python -m bot.calendar_client`.
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from .config import GOOGLE_CALENDAR_ID, GOOGLE_TOKEN_JSON, TIMEZONE
from .parser import Event

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
ROOT = Path(__file__).resolve().parent.parent
CREDS = ROOT / "credentials.json"
TOKEN = ROOT / "token.json"


def _load_creds() -> Credentials:
    if GOOGLE_TOKEN_JSON:
        creds = Credentials.from_authorized_user_info(json.loads(GOOGLE_TOKEN_JSON), SCOPES)
    elif TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    else:
        raise RuntimeError("No Google token: run `python -m bot.calendar_client` on your PC first")
    if not creds.valid:
        creds.refresh(Request())  # access token lives 1h; refresh_token renews it
    return creds


def _service():
    return build("calendar", "v3", credentials=_load_creds(), cache_discovery=False)


def event_body(ev: Event) -> dict:
    body = {"summary": ev.title, "location": ev.location, "description": ev.description}
    if ev.all_day_date:
        d = date.fromisoformat(ev.all_day_date)
        body["start"] = {"date": d.isoformat()}
        body["end"] = {"date": (d + timedelta(days=1)).isoformat()}
    else:
        body["start"] = {"dateTime": ev.start.isoformat(), "timeZone": TIMEZONE}
        body["end"] = {"dateTime": ev.end.isoformat(), "timeZone": TIMEZONE}
    return body


def add_event(ev: Event) -> str:
    created = _service().events().insert(calendarId=GOOGLE_CALENDAR_ID, body=event_body(ev)).execute()
    return created.get("htmlLink", "")


def authorize() -> None:
    """One-time interactive OAuth in a browser; saves token.json and prints it for a server."""
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = InstalledAppFlow.from_client_secrets_file(str(CREDS), SCOPES).run_local_server(port=0)
    TOKEN.write_text(creds.to_json())
    print("token.json saved. For a server, set GOOGLE_TOKEN_JSON to this line:\n")
    print(creds.to_json())


if __name__ == "__main__":
    authorize()
