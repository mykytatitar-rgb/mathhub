"""Google Calendar via plain REST (no heavy google-api-python-client in the bundle).

GOOGLE_TOKEN_JSON is the line printed by scripts/google_auth.py: it holds the
refresh_token, which keeps working as long as the OAuth app is "In production".
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from urllib.parse import quote

from .config import settings
from .event import Event
from .http import HTTPError, http

TOKEN_URL = "https://oauth2.googleapis.com/token"
EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/{cal}/events"
ID_SLOTS = 3
MARKER = "tg_confirmation"


class CalendarError(RuntimeError):
    """`hint` is a short, user-facing explanation in Ukrainian."""

    def __init__(self, message: str, hint: str = "Google Calendar зараз не відповідає. Спробуй ✅ ще раз за хвилину."):
        super().__init__(message)
        self.hint = hint


class GoogleAuthExpired(CalendarError):
    pass


@dataclass(frozen=True)
class Inserted:
    link: str
    already_existed: bool


def _error_for(status: int, text: str) -> CalendarError:
    msg = f"{status} {text[:300]}"
    if status == 403 and ("accessNotConfigured" in text or "SERVICE_DISABLED" in text):
        return CalendarError(msg, "Google Calendar API не увімкнено. Увімкни його (README, крок 3.1) у тому ж "
                                  "проєкті Google Cloud, де створено OAuth client, і зачекай кілька хвилин.")
    if status == 403 and "requiredAccessLevel" in text:
        return CalendarError(msg, "Немає права запису в цей календар — перевір GOOGLE_CALENDAR_ID у Vercel.")
    if status == 403 and any(r in text for r in ("rateLimitExceeded", "userRateLimitExceeded", "quotaExceeded")):
        return CalendarError(msg, "Google тимчасово обмежив запити. Спробуй ✅ ще раз за кілька хвилин.")
    if status in (401, 403):
        return CalendarError(msg, "Google не дає доступу до календаря. Запусти scripts/google_auth.py "
                                  "ще раз, онови GOOGLE_TOKEN_JSON у Vercel і зроби Redeploy.")
    if status == 404:
        return CalendarError(msg, "Календар не знайдено — перевір GOOGLE_CALENDAR_ID у Vercel "
                                                       "(для основного календаря: primary).")
    if status == 400:
        return CalendarError(msg, "Google не прийняв подію (неправильні дані). Перевір TIMEZONE у Vercel.")
    return CalendarError(msg)


def _access_token() -> str:
    try:
        tok = json.loads(settings().google_token_json)
        data = {
            "client_id": tok["client_id"],
            "client_secret": tok["client_secret"],
            "refresh_token": tok["refresh_token"],
            "grant_type": "refresh_token",
        }
    except (ValueError, KeyError, TypeError) as e:
        raise CalendarError(f"GOOGLE_TOKEN_JSON is not valid: {type(e).__name__}",
                            "GOOGLE_TOKEN_JSON у Vercel пошкоджений — встав рядок з scripts/google_auth.py "
                            "повністю і зроби Redeploy.") from None
    try:
        r = http.post(tok.get("token_uri") or TOKEN_URL, data=data)
    except HTTPError as e:
        raise CalendarError(f"token refresh failed: {type(e).__name__}") from e
    if r.status_code in (400, 401) and "invalid_grant" in r.text:
        raise GoogleAuthExpired("refresh token revoked or expired",
                                "Google відкликав доступ. Запусти scripts/google_auth.py ще раз, "
                                "онови GOOGLE_TOKEN_JSON у Vercel і зроби Redeploy.")
    if r.status_code in (400, 401):
        raise CalendarError(f"token refresh failed: {r.status_code} {r.text[:200]}",
                            "Google не прийняв GOOGLE_TOKEN_JSON — запусти scripts/google_auth.py ще раз.")
    if r.status_code != 200:
        raise CalendarError(f"token refresh failed: {r.status_code} {r.text[:200]}")
    return r.json()["access_token"]


def confirmation_key(chat_id: int, message_id: int) -> str:
    """Identifies one confirmation message. The bot id is mixed in because a
    new bot restarts message ids in the same chat."""
    bot_id = settings().telegram_bot_token.split(":", 1)[0]
    return f"tg:{bot_id}:{chat_id}:{message_id}"


def event_ids(chat_id: int, message_id: int) -> list[str]:
    """Deterministic ids, so a double tap on ✅ or a Telegram retry hits 409
    instead of creating a duplicate. Extra slots cover an id already taken by
    an unrelated or deleted event. Hex digits are valid base32hex, as the
    Calendar API requires."""
    key = confirmation_key(chat_id, message_id)
    return [hashlib.sha1(f"{key}:{slot}".encode()).hexdigest() for slot in range(ID_SLOTS)]


def _ours(existing: dict, key: str) -> bool:
    """Created from this confirmation and not deleted. Matching on a private
    marker, not on title/time, survives time zone rendering and later edits."""
    marker = ((existing.get("extendedProperties") or {}).get("private") or {}).get(MARKER)
    return existing.get("status") != "cancelled" and marker == key


def _request(method: str, url: str, token: str, **kw):
    try:
        return http.request(method, url, headers={"Authorization": f"Bearer {token}"}, **kw)
    except HTTPError as e:
        raise CalendarError(f"{method} failed: {type(e).__name__}") from e


def _events_url() -> str:
    return EVENTS_URL.format(cal=quote(settings().google_calendar_id, safe=""))


def insert_event(ev: Event, chat_id: int, message_id: int) -> Inserted:
    url, token = _events_url(), _access_token()
    key = confirmation_key(chat_id, message_id)
    body = ev.google_body(settings().timezone) | {"extendedProperties": {"private": {MARKER: key}}}
    for eid in event_ids(chat_id, message_id):
        r = _request("POST", url, token, json=body | {"id": eid})
        if r.status_code in (200, 201):
            return Inserted(link=r.json().get("htmlLink", ""), already_existed=False)
        if r.status_code != 409:
            raise _error_for(r.status_code, r.text)
        g = _request("GET", f"{url}/{eid}", token)
        if g.status_code == 200 and _ours(g.json(), key):
            return Inserted(link=g.json().get("htmlLink", ""), already_existed=True)
        # id taken by something else (an old bot's event, or a deleted one): next slot
    raise CalendarError("all event id slots are taken")


def delete_event(chat_id: int, message_id: int) -> bool:
    """Removes the event a ✅ tap on this message may already have created
    (❌ pressed right after ✅). Returns True if something was deleted."""
    url, token = _events_url(), _access_token()
    key = confirmation_key(chat_id, message_id)
    for eid in event_ids(chat_id, message_id):
        g = _request("GET", f"{url}/{eid}", token)
        if g.status_code == 200 and _ours(g.json(), key):
            d = _request("DELETE", f"{url}/{eid}", token)
            if d.status_code not in (200, 204, 404, 410):
                raise _error_for(d.status_code, d.text)
            return d.status_code in (200, 204)
        if g.status_code == 404:
            return False  # slots fill in order, so nothing further either
    return False
