"""Point Telegram at your Vercel deployment.

    python scripts/set_webhook.py https://<your-project>.vercel.app

Reads TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from .env (same values as in Vercel).
"""
import json
import os
import sys

import httpx2
from dotenv import load_dotenv


def main() -> None:
    load_dotenv()
    if len(sys.argv) != 2 or not sys.argv[1].startswith("https://"):
        sys.exit("usage: python scripts/set_webhook.py https://<your-project>.vercel.app")
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    secret = os.environ["TELEGRAM_WEBHOOK_SECRET"]
    url = sys.argv[1].rstrip("/") + "/api/telegram"
    api = f"https://api.telegram.org/bot{token}"
    r = httpx2.post(f"{api}/setWebhook", json={
        "url": url,
        "secret_token": secret,
        "allowed_updates": ["message", "callback_query"],
        "drop_pending_updates": True,
        "max_connections": 1,  # one update at a time: simple and enough for a personal bot
    })
    print("setWebhook:", r.json())
    info = httpx2.get(f"{api}/getWebhookInfo").json()
    print("getWebhookInfo:", json.dumps(info, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
