"""One shared HTTP client, reused while a Vercel instance stays warm."""
import logging

import httpx2

# httpx2 logs every request URL at INFO, and Telegram URLs contain the bot token.
for name in ("httpx2", "httpx", "httpcore2", "httpcore"):
    logging.getLogger(name).setLevel(logging.WARNING)

# Per-call budgets keep one update well under Telegram's ~60 s webhook wait
# (download 15 s + speech-to-text 20 s + LLM 20 s), so errors still get reported.
TIMEOUT = httpx2.Timeout(15.0, connect=5.0)
STT_TIMEOUT = httpx2.Timeout(20.0, connect=5.0)
LLM_TIMEOUT = httpx2.Timeout(20.0, connect=5.0)

http = httpx2.Client(timeout=TIMEOUT)
HTTPError = httpx2.HTTPError
