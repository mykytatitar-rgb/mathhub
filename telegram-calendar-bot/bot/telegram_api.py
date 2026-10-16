"""Minimal Telegram Bot API client (only the calls this bot needs)."""
from __future__ import annotations

from .config import settings
from .http import HTTPError, http

API = "https://api.telegram.org"
MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024  # Bot API getFile limit


class TelegramError(RuntimeError):
    pass


def call(method: str, **params) -> dict:
    try:
        r = http.post(f"{API}/bot{settings().telegram_bot_token}/{method}", json=params)
    except HTTPError as e:  # never let the URL (it holds the token) into a message
        raise TelegramError(f"{method}: {type(e).__name__}") from None
    data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    if not data.get("ok"):
        raise TelegramError(f"{method}: {r.status_code} {data.get('description', r.text[:200])}")
    return data["result"]


def send_message(chat_id: int, text: str, keyboard: list[list[dict]] | None = None) -> dict:
    params: dict = {"chat_id": chat_id, "text": text, "link_preview_options": {"is_disabled": True}}
    if keyboard:
        params["reply_markup"] = {"inline_keyboard": keyboard}
    return call("sendMessage", **params)


def edit_message(chat_id: int, message_id: int, text: str) -> None:
    """Replaces the text and drops the inline keyboard."""
    try:
        call("editMessageText", chat_id=chat_id, message_id=message_id, text=text,
             link_preview_options={"is_disabled": True})
    except TelegramError as e:
        if "message is not modified" not in str(e):
            raise


def answer_callback(callback_id: str, text: str = "") -> None:
    try:
        call("answerCallbackQuery", callback_query_id=callback_id, text=text)
    except TelegramError:
        pass  # too old to answer; not worth failing the update


def typing(chat_id: int) -> None:
    try:
        call("sendChatAction", chat_id=chat_id, action="typing")
    except TelegramError:
        pass


def download_file(file_id: str) -> tuple[bytes, str]:
    """Returns (content, file_path)."""
    info = call("getFile", file_id=file_id)
    path = info.get("file_path")
    if not path:
        raise TelegramError("getFile returned no file_path (file too big?)")
    try:
        r = http.get(f"{API}/file/bot{settings().telegram_bot_token}/{path}")
    except HTTPError as e:
        raise TelegramError(f"download: {type(e).__name__}") from None
    if r.status_code != 200:
        raise TelegramError(f"download failed: {r.status_code}")
    return r.content, path
