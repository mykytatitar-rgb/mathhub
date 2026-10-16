"""Run the bot on your computer for testing, without Vercel (long polling).

    python scripts/poll.py

Telegram allows either a webhook or polling, not both. If a webhook is set,
this script stops unless you pass --delete-webhook. The webhook then stays
removed: run scripts/set_webhook.py again to switch back to Vercel.
"""
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from bot import telegram_api as tg  # noqa: E402
from bot.handler import process_update  # noqa: E402


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    hook = tg.call("getWebhookInfo").get("url")
    if hook:
        if "--delete-webhook" not in sys.argv:
            sys.exit(f"Webhook is set to {hook}. Re-run with --delete-webhook to poll locally.")
        tg.call("deleteWebhook")
        print("Webhook removed. To go back to Vercel later: python scripts/set_webhook.py https://<domain>")
    print("Polling… Ctrl+C to stop.")
    offset = None
    while True:
        updates = tg.call("getUpdates", timeout=25, offset=offset,
                          allowed_updates=["message", "callback_query"])
        for update in updates:
            offset = update["update_id"] + 1
            process_update(update)


if __name__ == "__main__":
    main()
