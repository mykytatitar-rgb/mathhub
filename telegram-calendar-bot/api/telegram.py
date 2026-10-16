"""Vercel serverless entry: Telegram POSTs every update here (webhook)."""
import hmac
import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.config import settings  # noqa: E402
from bot.handler import process_update  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token"


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        secret = settings().telegram_webhook_secret
        got = self.headers.get(SECRET_HEADER, "")
        # Fail closed: without a configured secret nobody gets in.
        if not secret or not hmac.compare_digest(got.encode(), secret.encode()):
            self._reply(401, "unauthorized")
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            update = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            self._reply(400, "bad request")
            return
        process_update(update)  # never raises
        self._reply(200, "ok")

    def do_GET(self):
        self._reply(200, "bot is alive")

    def _reply(self, status: int, body: str) -> None:
        data = body.encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):  # keep Vercel logs free of access-log noise
        pass
