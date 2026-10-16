import asyncio
import logging
import tempfile
from pathlib import Path

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (Application, CallbackQueryHandler, CommandHandler,
                          ContextTypes, MessageHandler, filters)

from . import calendar_client, config, parser, stt

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("bot")

PENDING = "pending_event"


def _allowed(update: Update) -> bool:
    return update.effective_user is not None and update.effective_user.id == config.ALLOWED_USER_ID


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if _allowed(update):
        await update.message.reply_text("Скинь голосове або текст: «завтра о 15 зустріч з Олею».")


async def handle_input(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not _allowed(update):
        return
    msg = update.message
    try:
        if msg.voice:
            tg_file = await msg.voice.get_file()
            with tempfile.TemporaryDirectory() as d:
                path = str(Path(d) / "voice.ogg")
                await tg_file.download_to_drive(path)
                text = await asyncio.to_thread(stt.transcribe, path)
        else:
            text = msg.text
        if not text:
            await msg.reply_text("Нічого не розчув 🤷")
            return
        ev = await asyncio.to_thread(parser.parse_event, text)
    except Exception:
        log.exception("processing failed")
        await msg.reply_text("Помилка при обробці, дивись лог.")
        return

    ctx.user_data[PENDING] = ev
    kb = InlineKeyboardMarkup(
        [[InlineKeyboardButton("✅ Додати", callback_data="ok"),
          InlineKeyboardButton("❌ Скасувати", callback_data="no")]]
    )
    await msg.reply_text(f"🗣 «{text}»\n\n{ev.pretty()}", reply_markup=kb)


async def on_button(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    await q.answer()
    if not _allowed(update):
        return
    ev = ctx.user_data.pop(PENDING, None)
    if q.data == "no" or ev is None:
        await q.edit_message_text("Скасовано." if q.data == "no" else "Подія застаріла, надішли ще раз.")
        return
    try:
        link = await asyncio.to_thread(calendar_client.add_event, ev)
    except Exception:
        log.exception("calendar insert failed")
        await q.edit_message_text("Не вдалося додати в Google Calendar, дивись лог.")
        return
    await q.edit_message_text(f"✅ Додано\n\n{ev.pretty()}\n{link}")


def main():
    app = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.VOICE | (filters.TEXT & ~filters.COMMAND), handle_input))
    app.add_handler(CallbackQueryHandler(on_button))
    app.run_polling()


if __name__ == "__main__":
    main()
