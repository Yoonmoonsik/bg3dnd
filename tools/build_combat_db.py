#!/usr/bin/env python
"""Build docs/data/fighting_styles.json and docs/data/weapon_mastery.json from the mod's game data.

  python tools/build_combat_db.py

Nothing is read from the wiki text. Lists, progressions, class descriptions and feats merge by UUID
over the vanilla paks, then the mod (tools/build_species_db.layered).
Fighting styles
  styles     every FightingStyle_* passive the mod defines: name, description
  sources    each PassiveList holding the style, then every progression node (class or subclass,
             IsMulticlass nodes left out) and feat whose SelectPassives uses that list; NPC
             progressions are left out
Weapon mastery
  masteries  HasWeaponMastery_<X> passives on the WeaponMasteryList: name, description
  weapons    weapon stats whose PassivesOnEquip / PassivesOffHand hold WeaponMastery<X>; a weapon
             type is its Proficiency Group (Longswords …), except the mod's own weapon bases
             (OWN_TYPES) which are types of their own. A type's mastery is the one most of its
             weapons carry; the few unique weapons that differ are not listed.
  sources    progression nodes (IsMulticlass left out) and feats selecting from WeaponMasteryList
"""
import collections
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / ".claude" / "skills" / "bg3-data" / "scripts"))
sys.path.insert(0, str(REPO / "tools"))
import loca   # noqa: E402
import stats  # noqa: E402
from build_feat_db import name_of, text  # noqa: E402
from build_species_db import layered  # noqa: E402
from build_spell_db import describe  # noqa: E402

DATA = REPO / "docs" / "data"
# Weapon bases the mod adds: shown as their own type although they borrow a vanilla Proficiency Group.
OWN_TYPES = {"WPN_Musket": "Musket", "WPN_Whip": "Whip", "WPN_Blunderbuss": "Blunderbuss", "WPN_Pistol": "Pistol"}
MASTERY_LIST_NAME = "WeaponMasteryList"


def english_handles():
    out = {}
    for _, table in loca.english():
        for h, (t, _) in table.items():
            out.setdefault(t.strip(), h)
    return out


def source_order(s):
    """Classes in abc order, each followed by its subclasses in abc order; feats last."""
    return (s["kind"] == "feat", (s.get("class") or s["name"])["en"], s["kind"] == "subclass",
            s["name"]["en"], s["level"] or 0)


class Data:
    def __init__(self):
        self.db = stats.load(include_mod=True)
        _, self.plists = layered("Lists/PassiveLists.lsx", "PassiveList")
        _, self.progs = layered("Progressions/Progressions.lsx", "Progression")
        _, classes = layered("ClassDescriptions/ClassDescriptions.lsx", "ClassDescription")
        _, self.feats = layered("Feats/Feats.lsx", "Feat")
        _, descs = layered("Feats/FeatDescriptions.lsx", "FeatDescription")
        self.feat_desc = {d["FeatId"]: d for d in descs.values()}
        self.table, self.parent = {}, {}
        names = {}
        for c in classes.values():
            h = c.get("DisplayName")
            names[c["UUID"]] = {"en": text(h, False) or c.get("Name"), "ko": text(h, True) or c.get("Name")}
        for c in classes.values():
            if c.get("ProgressionTableUUID"):
                self.table[c["ProgressionTableUUID"]] = names[c["UUID"]]
                # A subclass's ParentGuid is its class: sources sort under it (Fighter, then Champion).
                self.parent[c["ProgressionTableUUID"]] = names.get(c.get("ParentGuid"), names[c["UUID"]])
        self.en = english_handles()

    def passive(self, p):
        f = {k: v[0] for k, v in stats.all_fields(self.db, p).items()}
        h = (f.get("Description") or "").split(";")[0]
        prm = f.get("DescriptionParams", "")
        return {"id": p, "name": name_of(self.db, p),
                "desc": {"en": describe(h, prm, False), "ko": describe(h, prm, True)}}

    def term(self, english):
        h = self.en.get(english)
        return {"en": english, "ko": (loca.korean(h)[0] if h else None) or english}

    def sources(self, list_uuid):
        """Who picks from a PassiveList: classes/subclasses by level, and feats."""
        out = []
        for p in self.progs.values():
            if p.get("IsMulticlass") == "true" or p.get("TableUUID") not in self.table:
                continue
            for n in re.findall(r"SelectPassives\(%s,(\d+)" % re.escape(list_uuid), p.get("Selectors", "")):
                out.append({"kind": "subclass" if p.get("ProgressionType") == "1" else "class",
                            "name": self.table[p["TableUUID"]], "class": self.parent[p["TableUUID"]],
                            "level": int(p["Level"]), "count": int(n)})
        for f in self.feats.values():
            if list_uuid in f.get("Selectors", ""):
                d = self.feat_desc.get(f["UUID"], {})
                out.append({"kind": "feat", "name": {"en": text(d.get("DisplayName"), False) or f["Name"],
                                                    "ko": text(d.get("DisplayName"), True) or f["Name"]},
                            "level": None, "count": 1})
        out.sort(key=source_order)
        return out


def fighting_styles(d):
    styles = {}
    for e in d.db:
        if e.startswith("FightingStyle_") and d.db[e].type == "PassiveData":
            styles[e] = d.passive(e)
            styles[e]["sources"] = []
    for uuid, lst in d.plists.items():
        members = [p.strip() for p in lst.get("Passives", "").split(",") if p.strip() in styles]
        if not members:
            continue
        src = d.sources(uuid)
        for m in members:
            for s in src:
                if s not in styles[m]["sources"]:
                    styles[m]["sources"].append(s)
    out = [s for s in styles.values() if s["sources"]]
    for s in out:
        s["sources"].sort(key=source_order)
    out.sort(key=lambda s: s["name"]["en"].lower())
    return out


def weapon_mastery(d):
    mastery_list = next(u for u, l in d.plists.items() if l.get("Name") == MASTERY_LIST_NAME)
    types = collections.defaultdict(collections.Counter)
    for n, e in d.db.items():
        if e.type != "Weapon":
            continue
        f = {k: v[0] for k, v in stats.all_fields(d.db, n).items()}
        found = set(re.findall(r"WeaponMastery([A-Za-z]+?)(?:_\d+)?;",
                               f.get("PassivesOnEquip", "") + ";" + f.get("PassivesOffHand", "") + ";"))
        if not found:
            continue
        own = next((OWN_TYPES[c] for c in stats.chain(d.db, n) if c in OWN_TYPES), None)
        group = own or next((g for g in f.get("Proficiency Group", "").split(";") if g and "Weapons" not in g), None)
        if group:
            types[group].update(found)
    by_mastery = collections.defaultdict(list)
    for group, counts in types.items():
        by_mastery[counts.most_common(1)[0][0]].append(group)
    sources = d.sources(mastery_list)
    out = []
    for p in [x.strip() for x in d.plists[mastery_list]["Passives"].split(",")]:
        key = p.replace("HasWeaponMastery_", "")
        m = d.passive(p)
        f = {k: v[0] for k, v in stats.all_fields(d.db, p).items()}
        h = (f.get("ExtraDescription") or "").split(";")[0]
        # Description lists the weapons; the effect text is ExtraDescription.
        m["desc"] = {"en": describe(h, f.get("ExtraDescriptionParams", ""), False),
                     "ko": describe(h, f.get("ExtraDescriptionParams", ""), True)}
        m["weapons"] = sorted((d.term(re.sub(r"(?<=[a-z])(?=[A-Z])", " ", g)) for g in by_mastery.get(key, [])),
                              key=lambda w: w["en"])
        out.append(m)
    out.sort(key=lambda m: m["name"]["en"])
    return out, sources


def write(path, key, items, extra=None):
    built = subprocess.run(["git", "-C", str(REPO), "log", "-1", "--format=%cs %h"],
                           capture_output=True, text=True).stdout.strip()
    one = lambda v: json.dumps(v, ensure_ascii=False)
    head = '{\n  "generated": ' + one(built) + ",\n"
    if extra:
        head += "".join(f"  {one(k)}: {one(v)},\n" for k, v in extra.items())
    blocks = ["    {\n" + ",\n".join(f"      {one(k)}: {one(v)}" for k, v in x.items()) + "\n    }" for x in items]
    path.write_text(head + f'  "{key}": [\n' + ",\n".join(blocks) + "\n  ]\n}\n", encoding="utf-8", newline="\n")
    print(f"wrote {path.relative_to(REPO)}: {len(items)} {key}")


def main():
    d = Data()
    write(DATA / "fighting_styles.json", "styles", fighting_styles(d))
    masteries, sources = weapon_mastery(d)
    write(DATA / "weapon_mastery.json", "masteries", masteries, {"sources": sources})


if __name__ == "__main__":
    main()
