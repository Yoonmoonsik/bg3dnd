"""
mod.io changelog updater.
The toolkit uploads the mod file to mod.io; this script finds the uploaded modfile whose
version matches meta.lsx and sets its changelog: HEAD commit message + subjects of commits since
the previous release that exists on mod.io (releases never uploaded there fold into this one).
Run by the post-commit hook when meta.lsx is committed.
Reads configuration from modio_config.json (or a path specified via --config).
"""

import argparse
import json
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

import requests

from upload_mod import META_LSX_REL, _decode_version64, _git, load_config, read_version_from_meta

DEFAULT_BASE_URL = "https://g-6715.modapi.io/v1"


def version_at(repo: Path, commit: str) -> str | None:
    root = ET.fromstring(_git(repo, "show", f"{commit}:{META_LSX_REL}"))
    for node in root.iter("node"):
        if node.get("id") == "ModuleInfo":
            for attr in node:
                if attr.get("id") == "Version64":
                    return _decode_version64(int(attr.get("value")))
    return None


def modfiles_with_version(cfg: dict, version: str) -> list[dict]:
    url = f"{cfg['base_url']}/games/{cfg['game_id']}/mods/{cfg['mod_id']}/files"
    headers = {"Authorization": f"Bearer {cfg['access_token']}", "Accept": "application/json"}
    resp = requests.get(url, headers=headers, params={"version": version}, timeout=30)
    _raise_for_status(resp, "get modfiles")
    return resp.json()["data"]


def build_changelog(cfg: dict, repo: Path, version: str) -> str:
    """HEAD commit message, then subjects of commits since the previous release uploaded to mod.io."""
    head_msg = _git(repo, "log", "-1", "--format=%B", "HEAD")
    prev = None
    for commit in _git(repo, "log", "--format=%H", "HEAD~1", "--", META_LSX_REL).splitlines():
        v = version_at(repo, commit)
        if v and v != version and modfiles_with_version(cfg, v):
            prev = commit
            break
    subjects = _git(repo, "log", "--no-merges", "--format=- %s", f"{prev}..HEAD~1" if prev else "HEAD~1")
    return f"{head_msg}\n\n{subjects}" if subjects else head_msg


def find_modfile(cfg: dict, version: str) -> dict:
    url = f"{cfg['base_url']}/games/{cfg['game_id']}/mods/{cfg['mod_id']}/files"
    headers = {"Authorization": f"Bearer {cfg['access_token']}", "Accept": "application/json"}
    files = modfiles_with_version(cfg, version)
    if not files:
        recent = requests.get(url, headers=headers, params={"_sort": "-date_added", "_limit": 5}, timeout=30)
        _raise_for_status(recent, "get recent modfiles")
        versions = [f.get("version") for f in recent.json()["data"]]
        sys.exit(f"[ERROR] No modfile with version '{version}'. Recent versions: {versions}")
    if len(files) > 1:
        print(f"[WARN] {len(files)} modfiles with version '{version}' — using the newest.")
    return max(files, key=lambda f: f["date_added"])


def edit_changelog(cfg: dict, file_id: int, changelog: str) -> dict:
    print(f"[INFO] Editing changelog of modfile {file_id} …")
    resp = requests.put(
        f"{cfg['base_url']}/games/{cfg['game_id']}/mods/{cfg['mod_id']}/files/{file_id}",
        headers={"Authorization": f"Bearer {cfg['access_token']}", "Accept": "application/json"},
        data={"changelog": changelog},
        timeout=30,
    )
    _raise_for_status(resp, "edit modfile")
    return resp.json()


def _raise_for_status(resp: requests.Response, action: str) -> None:
    if not resp.ok:
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        sys.exit(f"[ERROR] {action} failed ({resp.status_code}): {detail}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Set the changelog of the mod.io file matching meta.lsx version.")
    parser.add_argument(
        "--config",
        default=Path(__file__).parent / "modio_config.json",
        help="Path to the JSON configuration file (default: modio_config.json next to this script).",
    )
    args = parser.parse_args()

    cfg = load_config(str(args.config))
    missing = [k for k in ("access_token", "game_id", "mod_id") if not cfg.get(k)]
    if missing:
        sys.exit(f"[ERROR] Missing required config fields: {', '.join(missing)}")
    cfg.setdefault("base_url", DEFAULT_BASE_URL)

    repo = Path(__file__).parent.parent
    version = read_version_from_meta(repo / "Mods" / "DnD2024_897914ef-5c96-053c-44af-0be823f895fe" / "meta.lsx")
    modfile = find_modfile(cfg, version)
    changelog = build_changelog(cfg, repo, version)
    print(f"[INFO] Changelog:\n{changelog}")
    result = edit_changelog(cfg, modfile["id"], changelog)
    print("[SUCCESS] Changelog updated.")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
