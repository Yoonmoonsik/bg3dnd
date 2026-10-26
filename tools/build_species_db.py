#!/usr/bin/env python
"""Build docs/data/species.json for the GitHub Pages species browser from the mod's game data.

  python tools/build_species_db.py

Species: every (RaceUUID, SubRaceUUID) pair of the merged CharacterCreationPresets, so only what
character creation offers (the mod's creature-type Race nodes for monsters are left out). Race,
preset and progression nodes merge by UUID over the vanilla paks, then the mod. Nothing is read
from the wiki text.
  host races   Aasimar, Changeling, Dhampir, Goliath, Kalashtar … are Human subraces only because
               of Larian's console certification rules; they are shown as species of their own.
               Every Human subrace except Human's own (HumanHuman) is promoted this way and marked
               "human_subrace", since character creation lists it under Human.
  Dhampir      one Dhampir subrace per parent species; they share the Dhampir traits and are shown
               as one species listing its parents.
  traits       the parent's progression table plus the subrace's, ProgressionType 2, by level:
               PassivesAdded (IsHidden ones left out), Boosts, Selectors.
  speed        sum of ActionResource(Movement,X) in the tables, in metres
  darkvision   DarkvisionRangeMin(X) in the granted passives' Boosts
  spells       AddSpells lists and UnlockSpell in the passives' Boosts (RaceSpell_*), one per name;
               entries without the IsSpell flag go to "actions". SelectSpells lists are choices.
  choices      SelectPassives lists; skills SelectSkills counts and ProficiencyBonus(Skill,X)
  resistances  Resistance(Type,...) in the passives' Boosts
  uses         ActionResource(R,n) other than Movement, with its ReplenishType
  source       "new" when no vanilla Race node has the shown race's UUID; "revised" when the mod
               changes that Race node, one of its progression nodes or a granted passive
"""
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / ".claude" / "skills" / "bg3-data" / "scripts"))
sys.path.insert(0, str(REPO / ".claude" / "skills" / "new-subrace" / "scripts"))
sys.path.insert(0, str(REPO / "tools"))
import stats  # noqa: E402
from build_feat_db import name_of, text  # noqa: E402
from build_spell_db import describe  # noqa: E402
from subrace_data import NULL, PUB, UNPACKED, nodes  # noqa: E402

OUT = REPO / "docs" / "data" / "species.json"
# Character creation portraits of the subraces the mod adds (wiki screenshots, Race_<key>_Male/Female.png),
# keyed by the shown Race node's Name. Copied to docs/portraits at 300px.
FACES = REPO / "assets" / "bg3dnd_race_faces" / "cropped"
PORTRAIT_OUT = REPO / "docs" / "portraits"
PORTRAITS = {"Eladrin": "ElfEladrin", "Elf_IceElf": "ElfIce", "ShadarKai": "ElfShadarKai",
             "HumanAasimar": "HumanAasimar", "Changeling": "HumanChangeling", "Goliath": "HumanGoliath",
             "Kalashtar": "HumanKalashtar", "Dhampir": "HumanDhampir"}
VANILLA_PAKS = ["Shared/Public/Shared", "Shared/Public/SharedDev", "Gustav/Public/Gustav",
                "Gustav/Public/GustavDev", "GustavX/Public/GustavX"]
HUMAN_OWN = "HumanHuman"
# Subrace slots that only carry the parent's own traits: the species is the parent itself.
STRUCTURAL = {"HumanHuman", "OrcOrc"}
LIMITED = {"Rest": "long", "ShortRest": "short"}


def layered(rel, kind):
    """(vanilla merge, vanilla + mod merge) keyed by UUID; later paks win."""
    van = {}
    for pak in VANILLA_PAKS:
        f = UNPACKED / pak / rel
        if f.exists():
            van.update({d["UUID"]: d for d in nodes(f, kind) if d.get("UUID")})
    full = dict(van)
    if (PUB / rel).exists():
        full.update({d["UUID"]: d for d in nodes(PUB / rel, kind) if d.get("UUID")})
    return van, full


def lst(v, sep=";"):
    return [x.strip() for x in (v or "").split(sep) if x.strip()]


class Builder:
    def __init__(self):
        self.db = stats.load(include_mod=True)
        self.vdb = stats.load(include_mod=False)
        self.van_races, self.races = layered("Races/Races.lsx", "Race")
        _, self.presets = layered("CharacterCreationPresets/CharacterCreationPresets.lsx", "CharacterCreationPreset")
        self.van_prog, prog = layered("Progressions/Progressions.lsx", "Progression")
        self.tables = defaultdict(list)
        for p in prog.values():
            if p.get("ProgressionType") == "2":
                self.tables[p["TableUUID"]].append(p)
        _, self.plists = layered("Lists/PassiveLists.lsx", "PassiveList")
        _, self.slists = layered("Lists/SpellLists.lsx", "SpellList")
        _, res = layered("ActionResourceDefinitions/ActionResourceDefinitions.lsx", "ActionResourceDefinition")
        self.replenish = {r["Name"]: r.get("ReplenishType", "") for r in res.values()}
        self.spell_ids = {i for s in json.loads((REPO / "docs/data/spells.json").read_text(encoding="utf-8"))["spells"]
                          for i in s["ids"]}
        van_tables = {p["UUID"] for p in self.van_prog.values() if p.get("ProgressionType") == "2"}
        mod_tables = {p["UUID"] for p in prog.values() if p.get("ProgressionType") == "2"}
        self.stats_line = (f"race progression nodes: vanilla {len(van_tables)}, overridden by the mod "
                           f"{len(van_tables & set(self.mod_prog_uuids()))}, vanilla only "
                           f"{len(van_tables - set(self.mod_prog_uuids()))}, mod only {len(mod_tables - van_tables)}")

    def mod_prog_uuids(self):
        f = PUB / "Progressions/Progressions.lsx"
        return [d["UUID"] for d in nodes(f, "Progression") if d.get("ProgressionType") == "2"]

    def fields(self, entry, db=None):
        db = db or self.db
        return {k: v[0] for k, v in stats.all_fields(db, entry).items()} if entry in db else {}

    def spell(self, sid):
        """id is set when the spell browser lists it; spell is false for actions (no IsSpell flag).
        Actions carry their own description (DescriptionParams filled in): no other page shows them."""
        f = self.fields(sid)
        out = {"id": sid if sid in self.spell_ids else None, "name": name_of(self.db, sid),
               "spell": "IsSpell" in f.get("SpellFlags", "")}
        if not out["spell"]:
            h = (f.get("Description") or "").split(";")[0]
            out["desc"] = {"en": describe(h, f.get("DescriptionParams", ""), False),
                           "ko": describe(h, f.get("DescriptionParams", ""), True)}
        return out

    def traits(self, race_nodes):
        """Merged traits of the given Race nodes' progression tables."""
        levels = defaultdict(lambda: {"traits": [], "spells": [], "choices": []})
        speed, dark, skills, res, uses, passives_seen = 0.0, 0, 0, set(), {}, []
        for race in race_nodes:
            for p in sorted(self.tables.get(race.get("ProgressionTableUUID"), []), key=lambda p: int(p["Level"])):
                lv = levels[int(p["Level"])]
                boosts, sel = p.get("Boosts", ""), p.get("Selectors", "")
                for m in re.findall(r"ActionResource\((\w+),([\d.]+),\d+\)", boosts):
                    if m[0] == "Movement":
                        speed += float(m[1])
                    elif self.replenish.get(m[0]) in LIMITED:
                        uses[m[0]] = LIMITED[self.replenish[m[0]]]
                for lid in re.findall(r"AddSpells\(([\w-]+)", sel):
                    lv["spells"] += [self.spell(s) for s in lst(self.slists.get(lid, {}).get("Spells"))]
                # SelectSpells / SelectPassives offer a list to pick from: kept apart from granted spells.
                for lid, n in re.findall(r"SelectSpells\(([\w-]+),(\d+)", sel):
                    opts = [self.spell(x) for x in lst(self.slists.get(lid, {}).get("Spells"))]
                    if opts:
                        lv["choices"].append({"kind": "spell", "count": int(n), "options": opts})
                for lid, n in re.findall(r"SelectPassives\(([\w-]+),(\d+)", sel):
                    opts = [{"id": None, "name": name_of(self.db, x)}
                            for x in lst(self.plists.get(lid, {}).get("Passives"), ",")]
                    if opts:
                        lv["choices"].append({"kind": "trait", "count": int(n), "options": opts})
                skills += sum(int(n) for n in re.findall(r"SelectSkills\([\w-]+,(\d+)", sel))
                for ps in lst(p.get("PassivesAdded")):
                    f = self.fields(ps)
                    if not f:
                        continue
                    passives_seen.append(ps)
                    b = f.get("Boosts", "")
                    for d in re.findall(r"DarkvisionRangeMin\((\d+)\)", b):
                        dark = max(dark, int(d))
                    res |= set(re.findall(r"\bResistance\((\w+),", b))
                    skills += len(re.findall(r"\bProficiencyBonus\(Skill,", b))
                    for m in re.findall(r"ActionResource\((\w+),[\d.]+,\d+\)", b):
                        if self.replenish.get(m) in LIMITED:
                            uses[m] = LIMITED[self.replenish[m]]
                    for s in re.findall(r"\bUnlockSpell\((\w+)", b):
                        lv["spells"].append(self.spell(s))
                    if "IsHidden" in f.get("Properties", ""):
                        continue
                    h = (f.get("Description") or "").split(";")[0]
                    params = f.get("DescriptionParams", "")
                    lv["traits"].append({"name": name_of(self.db, ps),
                                         "desc": {"en": describe(h, params, False), "ko": describe(h, params, True)}})
        for v in levels.values():
            seen, uniq = set(), []
            for x in v["spells"]:
                if x["name"]["en"] not in seen:
                    seen.add(x["name"]["en"])
                    uniq.append(x)
            v["actions"] = [x for x in uniq if not x["spell"]]
            v["spells"] = [x for x in uniq if x["spell"]]
        out = [{"level": k, **v} for k, v in sorted(levels.items()) if any(v.values())]
        return {
            "speed": speed, "darkvision": dark, "skills": skills, "resistances": sorted(res),
            "uses": sorted(set(uses.values())),
            "levels": out,
        }, passives_seen

    def changed(self, race_nodes, passives):
        for r in race_nodes:
            if self.van_races.get(r["UUID"]) != r:
                return True
            for p in self.tables.get(r.get("ProgressionTableUUID"), []):
                if self.van_prog.get(p["UUID"]) != p:
                    return True
        return any(self.fields(p, self.vdb) != self.fields(p) for p in passives)

    def run(self):
        pairs = sorted({(p.get("RaceUUID"), p.get("SubRaceUUID") or NULL) for p in self.presets.values()})
        human = next(u for u, r in self.races.items() if r.get("Name") == "Human"
                     and r.get("ParentGuid") not in self.races or r.get("Name") == "Human" and
                     self.races.get(r.get("ParentGuid"), {}).get("Name") != "Human")
        out, dhampir = [], None
        for race_id, sub_id in pairs:
            race = self.races.get(race_id)
            sub = self.races.get(sub_id) if sub_id != NULL else None
            if not race:
                continue
            chain = [race] + ([sub] if sub else [])
            info, passives = self.traits(chain)
            if sub and sub.get("Name") in STRUCTURAL:
                sub = None
            shown = sub or race
            promoted = bool(sub) and race_id == human
            entry = {
                "id": shown["UUID"],
                "name": {"en": text(shown.get("DisplayName"), False), "ko": text(shown.get("DisplayName"), True)},
                "parent": None if promoted or not sub else
                          {"en": text(race.get("DisplayName"), False), "ko": text(race.get("DisplayName"), True)},
                "desc": {"en": text(shown.get("Description"), False), "ko": text(shown.get("Description"), True)},
                # Character creation lists it under Human: players look for it there.
                "human_subrace": promoted,
                "portrait": PORTRAITS.get(shown.get("Name")),
                "source": "new" if shown["UUID"] not in self.van_races else
                          ("revised" if self.changed(chain, passives) else "vanilla"),
                **info,
            }
            if sub and sub.get("Name", "").startswith("Dhampir"):
                parent = {"en": text(race.get("DisplayName"), False), "ko": text(race.get("DisplayName"), True)}
                if dhampir is None:
                    dhampir = entry
                    dhampir["parents"] = []
                    dhampir["parent"] = None
                # Human's Dhampir table carries everything the trait list needs (incl. Darkvision).
                if race_id == human:
                    keep = dhampir["parents"]
                    dhampir.clear()
                    dhampir.update(entry, parent=None, parents=keep)
                dhampir["parents"].append(parent)
                continue
            out.append(entry)
        if dhampir:
            dhampir["parents"].sort(key=lambda p: p["en"])
            out.append(dhampir)
        for e in out:
            e.setdefault("parents", [])
        out.sort(key=lambda e: e["name"]["en"].lower())
        return out


def copy_portraits(species):
    """300px copies of the portraits; an existing copy is kept (re-encoding changes the bytes)."""
    PORTRAIT_OUT.mkdir(parents=True, exist_ok=True)
    for s in species:
        for sex in ("Male", "Female") if s["portrait"] else ():
            name = f"Race_{s['portrait']}_{sex}.png"
            src, dst = FACES / name, PORTRAIT_OUT / name
            if not src.exists():
                print("  no portrait:", name)
            elif not dst.exists():
                subprocess.run(["magick", str(src), "-resize", "300x300", "-strip", str(dst)], check=True)


def main():
    b = Builder()
    species = b.run()
    built = subprocess.run(["git", "-C", str(REPO), "log", "-1", "--format=%cs %h"],
                           capture_output=True, text=True).stdout.strip()
    one = lambda v: json.dumps(v, ensure_ascii=False)
    blocks = ["    {\n" + ",\n".join(f"      {one(k)}: {one(v)}" for k, v in s.items()) + "\n    }" for s in species]
    OUT.write_text('{\n  "generated": ' + one(built) + ',\n  "species": [\n' + ",\n".join(blocks) + "\n  ]\n}\n",
                   encoding="utf-8", newline="\n")
    copy_portraits(species)
    print(b.stats_line)
    print(f"species {len(species)}: " + ", ".join(f"{k} {sum(s['source'] == k for s in species)}"
                                                 for k in ("new", "revised", "vanilla")))
    print(f"wrote {OUT.relative_to(REPO)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
