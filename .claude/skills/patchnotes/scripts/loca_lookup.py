#!/usr/bin/env python
"""Look up the Korean rendering of an English game term.

Searches the mod's own localization first (MOD), then the vanilla reference
files (VAN). Mod wording wins when both exist.

Usage:
    python .claude/skills/patchnotes/scripts/loca_lookup.py "Agonising Blast" "Wild Shape"
    python .claude/skills/patchnotes/scripts/loca_lookup.py --sub "House of Hope"

Run from the repo root. --sub does substring matching (use when the exact
lookup comes back empty; feature names are often only in "Level 3: X" form).
"""
import glob
import io
import os
import re
import sys

MOD = glob.glob("Mods/*/Localization")
VAN_EN = "레퍼런스/bg3-original-english.xml"
VAN_KO = "레퍼런스/bg3-original-korean.xml"
ENTRY = re.compile(r'contentuid="([^"]+)"[^>]*>(.*?)</content>')


def load(path):
    out = {}
    if not os.path.exists(path):
        return out
    with io.open(path, encoding="utf-8-sig", errors="replace") as fh:
        for line in fh:
            m = ENTRY.search(line)
            if m:
                out[m.group(1)] = m.group(2)
    return out


def main():
    args = list(sys.argv[1:])
    sub = "--sub" in args
    terms = [a for a in args if not a.startswith("--")]
    if not terms:
        print(__doc__)
        return 1
    if not MOD:
        print("error: no Mods/*/Localization directory found - run from the repo root")
        return 1
    base = MOD[0]
    pairs = [
        ((load(base + "/English/english.xml"), load(base + "/Korean/korean.xml")), "MOD"),
        ((load(VAN_EN), load(VAN_KO)), "VAN"),
    ]
    for term in terms:
        print("### " + term)
        hits, seen = 0, set()
        for (en, ko), tag in pairs:
            for handle, value in en.items():
                text = value.strip()
                if sub:
                    ok = term.lower() in text.lower() and len(text) < 90
                else:
                    ok = text.lower() == term.lower()
                if not ok:
                    continue
                korean = ko.get(handle, "(no ko)")
                if (text, korean) in seen:
                    continue
                seen.add((text, korean))
                hits += 1
                print("  [%s] %s  ->  %s" % (tag, text[:80], korean[:80]))
        if not hits:
            print("  (no match - retry with --sub, or the term has no localised name)")
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
