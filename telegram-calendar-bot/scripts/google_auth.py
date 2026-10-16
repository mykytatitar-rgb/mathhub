"""One-time Google login on YOUR computer (needs a browser).

    pip install -r requirements-dev.txt
    python scripts/google_auth.py

Prints one JSON line: paste it into Vercel as GOOGLE_TOKEN_JSON.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow

ROOT = Path(__file__).resolve().parent.parent
CLIENT_SECRETS = ROOT / "credentials.json"
OUT = ROOT / "google_token.json"
SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


def find_client_secrets() -> Path | None:
    """credentials.json, or what Windows Explorer makes of a rename
    (credentials.json.json), or the file exactly as Google downloads it."""
    for candidate in (CLIENT_SECRETS, ROOT / "credentials.json.json"):
        if candidate.exists():
            return candidate
    downloads = sorted(ROOT.glob("client_secret_*.json"))
    return downloads[0] if len(downloads) == 1 else None


def main() -> None:
    secrets = find_client_secrets()
    if secrets is None:
        sys.exit(f"Put the OAuth 'Desktop app' JSON from Google Cloud Console at {CLIENT_SECRETS}")
    flow = InstalledAppFlow.from_client_secrets_file(str(secrets), SCOPES)
    # offline + consent guarantees a refresh_token even if you logged in before
    creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")
    if not creds.refresh_token:
        sys.exit("Google returned no refresh_token — remove the app at myaccount.google.com/permissions and retry.")
    line = json.dumps(json.loads(creds.to_json()), separators=(",", ":"))
    OUT.write_text(line)
    print(f"\nSaved to {OUT.name}. Paste this whole line into Vercel as GOOGLE_TOKEN_JSON:\n")
    print(line)


if __name__ == "__main__":
    main()
