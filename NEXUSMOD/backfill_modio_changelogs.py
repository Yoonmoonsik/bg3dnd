"""
mod.io changelog backfill.
For every release (commit touching meta.lsx) that has a modfile on mod.io, newest first, builds
the same changelog as upload_mod.build_changelog — release commit message + subjects of commits
since the previous release — and sets it on the modfile with the matching version.
Releases never uploaded to mod.io fold into the next uploaded release's changelog.
Reads configuration from modio_config.json (or a path specified via --config).
"""

import argparse
import sys
import time
from pathlib import Path

import requests

from update_modio_changelog import DEFAULT_BASE_URL, _raise_for_status, version_at
from upload_mod import META_LSX_REL, _git, changelog_subjects, load_config


def release_changelogs(repo: Path, uploaded: set[str]) -> list[tuple[str, str]]:
    """[(version, changelog)] newest first, for versions in `uploaded`.
    Each changelog reaches back to the previous uploaded release, so releases missing on mod.io
    (and repeated commits of the same version) fold into the next uploaded one."""
    commits = _git(repo, "log", "--format=%H", "HEAD", "--", META_LSX_REL).splitlines()
    versions = [version_at(repo, c) for c in commits]
    result, seen = [], set()
    for i, (newest, version) in enumerate(zip(commits, versions)):
        if version not in uploaded or version in seen:
            continue
        seen.add(version)
        prev = next((commits[j] for j in range(i + 1, len(commits))
                     if versions[j] in uploaded and versions[j] != version), None)
        rev_range = f"{prev}..{newest}~1" if prev else f"{newest}~1"
        head_msg = _git(repo, "log", "-1", "--format=%B", newest)
        subjects = changelog_subjects(repo, rev_range)
        result.append((version, f"{head_msg}\n\n{subjects}" if subjects else head_msg))
    return result


def fetch_modfiles(cfg: dict) -> list[dict]:
    url = f"{cfg['base_url']}/games/{cfg['game_id']}/mods/{cfg['mod_id']}/files"
    headers = {"Authorization": f"Bearer {cfg['access_token']}", "Accept": "application/json"}
    files, offset = [], 0
    while True:
        resp = requests.get(url, headers=headers, params={"_limit": 100, "_offset": offset}, timeout=30)
        _raise_for_status(resp, "get modfiles")
        body = resp.json()
        files += body["data"]
        offset += body["result_count"]
        if not body["result_count"] or offset >= body["result_total"]:
            return files


def put_changelog(cfg: dict, file_id: int, changelog: str) -> None:
    url = f"{cfg['base_url']}/games/{cfg['game_id']}/mods/{cfg['mod_id']}/files/{file_id}"
    headers = {"Authorization": f"Bearer {cfg['access_token']}", "Accept": "application/json"}
    for _ in range(5):
        resp = requests.put(url, headers=headers, data={"changelog": changelog}, timeout=30)
        if resp.status_code != 429:
            _raise_for_status(resp, f"edit modfile {file_id}")
            return
        wait = max(int(resp.headers.get("retry-after", 60)), 1)
        print(f"[WARN] Rate limited (429). Waiting {wait}s …")
        time.sleep(wait)
    sys.exit("[ERROR] Rate limit not resolved after maximum retries.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill mod.io changelogs for all releases, newest first.")
    parser.add_argument(
        "--config",
        default=Path(__file__).parent / "modio_config.json",
        help="Path to the JSON configuration file (default: modio_config.json next to this script).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print matches without editing.")
    args = parser.parse_args()

    cfg = load_config(str(args.config))
    missing = [k for k in ("access_token", "game_id", "mod_id") if not cfg.get(k)]
    if missing:
        sys.exit(f"[ERROR] Missing required config fields: {', '.join(missing)}")
    cfg.setdefault("base_url", DEFAULT_BASE_URL)

    by_version: dict[str, list[dict]] = {}
    for f in fetch_modfiles(cfg):
        by_version.setdefault(f.get("version") or "", []).append(f)
    print(f"[INFO] {sum(map(len, by_version.values()))} modfiles on mod.io")

    updated = 0
    for version, changelog in release_changelogs(Path(__file__).parent.parent, set(by_version)):
        for f in by_version[version]:
            if f.get("changelog") == changelog:
                print(f"[SAME] {version} (file {f['id']})")
                continue
            print(f"[EDIT] {version} (file {f['id']})")
            if not args.dry_run:
                put_changelog(cfg, f["id"], changelog)
            updated += 1
    print(f"[DONE] edited {updated}{' (dry run)' if args.dry_run else ''}")


if __name__ == "__main__":
    main()
