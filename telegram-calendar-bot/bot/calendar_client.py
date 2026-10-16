"""Google Calendar writer. First run opens a browser for OAuth consent and
stores token.json next to credentials.json."""
from __future__ import annotations

from datetime import timedelta
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from .config import GOOGLE_CALENDAR_ID, TIMEZONE
from .parser import Event

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
ROOT = Path(__file__).resolve().parent.parent
CREDS = ROOT / "credentials.json"
TOKEN = ROOT / "token.json"


def _service():
    creds = None
    if TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            creds = InstalledAppFlow.from_client_secrets_file(str(CREDS), SCOPES).run_local_server(port=0)
        TOKEN.write_text(creds.to_json())
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def event_body(ev: Event) -> dict:
    body = {"summary": ev.title, "location": ev.location, "description": ev.description}
    if ev.all_day_date:
        from datetime import date

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


if __name__ == "__main__":  # `python -m bot.calendar_client` = run OAuth once
    _service()
    print("OK, token.json saved")
