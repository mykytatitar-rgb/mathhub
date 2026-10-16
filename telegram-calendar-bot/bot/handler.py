"""Telegram update → reply. Stateless: everything a button press needs is in
the confirmation message itself (see event.py)."""
from __future__ import annotations

import logging

from . import calendar_client, parser, stt, telegram_api as tg
from .config import settings
from .event import parse_rendered

log = logging.getLogger("bot")

MAX_VOICE_SECONDS = 5 * 60
MAX_TRANSCRIPT_CHARS = 1000

HELP = (
    "Надішли голосове або текст, наприклад:\n"
    "• «завтра о 15 зустріч з Олею в кафе на годину»\n"
    "• «в пятницу в 10 стоматолог»\n"
    "• «next Monday call with Tom at 9am»\n\n"
    "Я покажу, що зрозумів, а ти підтвердиш ✅ або скасуєш ❌."
)
CONFIRM_KEYBOARD = [[
    {"text": "✅ Додати", "callback_data": "ok"},
    {"text": "❌ Скасувати", "callback_data": "no"},
]]


GENERIC_ERROR = "⚠️ Щось пішло не так. Спробуй ще раз за хвилину."


def process_update(update: dict) -> None:
    """Never raises: Telegram re-sends updates that fail, which would spam the chat.
    On an unexpected error the user still gets a short notice."""
    chat_id = None
    try:
        if "callback_query" in update:
            chat_id = ((update["callback_query"].get("message") or {}).get("chat") or {}).get("id")
            _on_button(update["callback_query"])
        elif "message" in update:
            chat_id = (update["message"].get("chat") or {}).get("id")
            _on_message(update["message"])
    except Exception:
        log.exception("unhandled error for update %s", update.get("update_id"))
        if chat_id is not None and _is_owner_chat(chat_id):
            try:
                tg.send_message(chat_id, GENERIC_ERROR)
            except Exception:
                log.exception("could not report the error")


def _is_owner_chat(chat_id: int) -> bool:
    try:
        return chat_id == settings().allowed_user_id  # private chat id == user id
    except RuntimeError:
        return False


def _allowed(user: dict | None) -> bool:
    return bool(user) and user.get("id") == settings().allowed_user_id


def _on_message(msg: dict) -> None:
    chat_id = msg["chat"]["id"]
    if not _allowed(msg.get("from")):
        log.info("ignored message from user %s", (msg.get("from") or {}).get("id"))
        return

    text = (msg.get("text") or "").strip()
    if text.startswith("/"):
        tg.send_message(chat_id, HELP)
        return

    voice = msg.get("voice") or msg.get("audio")
    transcript = None
    try:
        if voice:
            too_big = (voice.get("file_size") or 0) > tg.MAX_DOWNLOAD_BYTES
            if too_big or (voice.get("duration") or 0) > MAX_VOICE_SECONDS:
                tg.send_message(chat_id, "Задовге голосове — до 5 хвилин, будь ласка.")
                return
            tg.typing(chat_id)
            audio, path = tg.download_file(voice["file_id"])
            transcript = stt.transcribe(audio, path)
            text = transcript
        if not text:
            tg.send_message(chat_id, "Надішли голосове або текст з подією 🙂" if not voice else "Нічого не розчув 🤷")
            return
        tg.typing(chat_id)
        event = parser.parse_event(text)
    except parser.NotAnEvent as e:
        heard = f"🗣 «{_short(transcript)}»\n\n" if transcript else ""
        tg.send_message(chat_id, f"{heard}🤔 {e}")
        return
    except (stt.SttError, parser.ParseError, tg.TelegramError) as e:
        log.exception("processing failed")
        what = {"SttError": "розпізнати голос", "ParseError": "розібрати текст"}.get(type(e).__name__, "обробити")
        tg.send_message(chat_id, f"⚠️ Не вдалося {what}. Спробуй ще раз за хвилину.")
        return

    heard = f"🗣 «{_short(transcript)}»\n\n" if transcript else ""
    tg.send_message(chat_id, f"{heard}{event.render()}\n\nДодати в календар?", CONFIRM_KEYBOARD)


def _on_button(cq: dict) -> None:
    msg = cq.get("message") or {}
    if not _allowed(cq.get("from")):
        tg.answer_callback(cq["id"])
        return
    if not msg.get("text"):  # "inaccessible message" (older than 48h) has no text
        tg.answer_callback(cq["id"], "Повідомлення застаріле — надішли подію ще раз.")
        return
    tg.answer_callback(cq["id"])  # stop the button spinner right away
    chat_id, message_id = msg["chat"]["id"], msg["message_id"]
    event = parse_rendered(msg["text"])
    if event is None:
        tg.edit_message(chat_id, message_id, "Не можу прочитати подію — надішли її ще раз.")
        return

    if cq.get("data") != "ok":
        _cancel(event, chat_id, message_id)
        return

    try:
        result = calendar_client.insert_event(event, chat_id, message_id)
    except calendar_client.CalendarError as e:
        log.exception("calendar insert failed")
        tg.send_message(chat_id, f"⚠️ {e.hint}")
        return

    status = "✅ Вже в календарі" if result.already_existed else "✅ Додано в календар"
    link = f"\n\n{result.link}" if result.link else ""
    tg.edit_message(chat_id, message_id, f"{status}\n\n{event.render()}{link}")


def _cancel(event, chat_id: int, message_id: int) -> None:
    # ❌ can arrive right after ✅ (both carry the original text), so undo a
    # write that may already have happened. Best effort: the cancel itself stands.
    removed = False
    try:
        removed = calendar_client.delete_event(chat_id, message_id)
    except calendar_client.CalendarError:
        log.exception("could not check for an event to remove")
    note = " (прибрав з календаря)" if removed else ""
    tg.edit_message(chat_id, message_id, f"❌ Скасовано{note}\n\n{event.render()}")


def _short(s: str | None) -> str:
    s = " ".join((s or "").split())
    return s if len(s) <= MAX_TRANSCRIPT_CHARS else s[:MAX_TRANSCRIPT_CHARS] + "…"
