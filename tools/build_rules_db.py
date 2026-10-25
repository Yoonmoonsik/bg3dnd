#!/usr/bin/env python
"""Build docs/data/rules.json from the mod's game data.

  python tools/build_rules_db.py

  rules  every Rules_* passive the mod defines: name, description. Rules_All is the container
         passive that lists the others and is left out.
"""
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "tools"))
from build_combat_db import DATA, Data, write  # noqa: E402

CONTAINER = "Rules_All"


def rules(d):
    out = [d.passive(e) for e in d.db
           if e.startswith("Rules_") and e != CONTAINER and d.db[e].type == "PassiveData"]
    out.sort(key=lambda r: r["name"]["en"].lower())
    return out


def main():
    write(DATA / "rules.json", "rules", rules(Data()))


if __name__ == "__main__":
    main()
