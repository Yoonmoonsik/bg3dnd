#!/usr/bin/env python
"""Build docs/data/backgrounds.json for the GitHub Pages background browser from the mod's game data.

  python tools/build_background_db.py

Backgrounds: every Background node the game loads (vanilla Shared, SharedDev, GustavX, then the
mod, merged by UUID). Nothing is read from the wiki text. The Background "Passives" field holds
everything a background grants:
  skills       passives whose Boosts is ProficiencyBonus(Skill,X); the name is the passive's
  feats        the other visible passives (IsHidden ones are parts of a feat), named by DisplayName;
               "id" is the Feat whose PassivesAdded or SelectPassives list holds the passive (null for
               the background-only OriginFeat_* passives, which no Feat node carries)
  new          the background carries InspirationFromBackground: the backgrounds the mod adds,
               which give a chance of Heroic Inspiration on each Long Rest. Haunted One (the Dark
               Urge origin's background) has a mod UUID but no such passive: it is a game background.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / ".claude" / "skills" / "bg3-data" / "scripts"))
sys.path.insert(0, str(REPO / "tools"))
import stats  # noqa: E402
from build_feat_db import layered, name_of, text  # noqa: E402

OUT = REPO / "docs" / "data" / "backgrounds.json"
SKILL = re.compile(r"^ProficiencyBonus\(Skill,\s*(\w+)\)$")
INSPIRATION = "InspirationFromBackground"


def main():
    db = stats.load(include_mod=True)
    van, backgrounds = layered(Path("Backgrounds/Backgrounds.lsx"), "Background")
    _, feat_nodes = layered(Path("Feats/Feats.lsx"), "Feat")
    _, passive_lists = layered(Path("Lists/PassiveLists.lsx"), "PassiveList")
    feat_of = {}
    for feat in feat_nodes.values():
        given = [p for p in feat.get("PassivesAdded", "").split(";") if p]
        given += [p for lid in re.findall(r"SelectPassives\(([\w-]+)", feat.get("Selectors", ""))
                  for p in passive_lists.get(lid, {}).get("Passives", "").split(",") if p]
        for p in given:
            feat_of.setdefault(p, feat["Name"])
    out, missing = [], []
    for uuid, bg in backgrounds.items():
        skills, feats = [], []
        for p in [p for p in bg.get("Passives", "").split(";") if p]:
            f = {k: v[0] for k, v in stats.all_fields(db, p).items()} if p in db else {}
            if not f:
                missing.append(p)
                continue
            m = SKILL.match(f.get("Boosts", "").strip().rstrip(";"))
            if m:
                skills.append({"id": m.group(1), "name": name_of(db, p)})
            elif p != INSPIRATION and "IsHidden" not in f.get("Properties", ""):
                name = name_of(db, p)
                if all(f["name"] != name for f in feats):
                    feats.append({"id": feat_of.get(p), "name": name})
        out.append({
            "id": uuid,
            "name": {"en": text(bg.get("DisplayName"), False), "ko": text(bg.get("DisplayName"), True)},
            "desc": {"en": text(bg.get("Description"), False), "ko": text(bg.get("Description"), True)},
            "new": INSPIRATION in bg.get("Passives", "").split(";"),
            "skills": skills,
            "feats": feats,
        })
    out.sort(key=lambda b: b["name"]["en"].lower())

    built = subprocess.run(["git", "-C", str(REPO), "log", "-1", "--format=%cs %h"],
                           capture_output=True, text=True).stdout.strip()
    one = lambda v: json.dumps(v, ensure_ascii=False)
    blocks = ["    {\n" + ",\n".join(f"      {one(k)}: {one(v)}" for k, v in b.items()) + "\n    }" for b in out]
    OUT.write_text('{\n  "generated": ' + one(built) + ',\n  "backgrounds": [\n' + ",\n".join(blocks) + "\n  ]\n}\n",
                   encoding="utf-8", newline="\n")
    for p in sorted(set(missing)):
        print("  passive not in stats:", p)
    print(f"backgrounds {len(out)} (new {sum(b['new'] for b in out)})")
    print(f"wrote {OUT.relative_to(REPO)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
