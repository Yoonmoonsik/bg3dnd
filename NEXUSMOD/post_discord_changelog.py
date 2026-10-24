"""
Discord changelog poster.
Posts the release changelog (same as the Nexus Mods one: HEAD commit message + commits since the
previous meta.lsx commit) to a Discord channel through a webhook.
Run by the post-commit hook when meta.lsx is committed.
Reads configuration from discord_config.json (or a path specified via --config).
"""

import argparse
import sys
from pathlib import Path

import requests

from upload_mod import build_changelog, load_config, read_version_from_meta

MAX_LEN = 2000  # Discord message content limit


def split_message(text: str) -> list[str]:
    """Split on line boundaries so each chunk fits in one Discord message."""
    chunks, current = [], ""
    for line in text.splitlines():
        while len(line) > MAX_LEN:
            if current:
                chunks.append(current)
                current = ""
            chunks.append(line[:MAX_LEN])
            line = line[MAX_LEN:]
        candidate = f"{current}\n{line}" if current else line
        if len(candidate) > MAX_LEN:
            chunks.append(current)
            current = line
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def post(webhook_url: str, content: str) -> None:
    resp = requests.post(
        webhook_url,
        json={"content": content, "allowed_mentions": {"parse": []}},
        timeout=30,
    )
    if not resp.ok:
        sys.exit(f"[ERROR] Discord post failed ({resp.status_code}): {resp.text}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Post the release changelog to Discord.")
    parser.add_argument(
        "--config",
        default=Path(__file__).parent / "discord_config.json",
        help="Path to the JSON configuration file (default: discord_config.json next to this script).",
    )
    args = parser.parse_args()

    cfg = load_config(str(args.config))
    if not cfg.get("webhook_url"):
        sys.exit("[ERROR] Missing required config field: webhook_url")

    repo = Path(__file__).parent.parent
    version = read_version_from_meta(repo / "Mods" / "DnD2024_897914ef-5c96-053c-44af-0be823f895fe" / "meta.lsx")
    changelog = build_changelog(repo)
    message = f"**{version}**\n{changelog}" if changelog.splitlines()[0] != version else changelog
    print(f"[INFO] Changelog:\n{message}")
    for chunk in split_message(message):
        post(cfg["webhook_url"], chunk)
    print("[SUCCESS] Changelog posted to Discord.")


if __name__ == "__main__":
    main()
