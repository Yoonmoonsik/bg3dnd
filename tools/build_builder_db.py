#!/usr/bin/env python
"""Build docs/data/builder.json for the GitHub Pages build simulator from the mod's game data.

  python tools/build_builder_db.py

Reuses tools/build_class_db.Builder (ClassDescriptions, Progressions, lists merged over the vanilla
paks, then the mod). Levels stop at 12. Run build_spell_db.py first (spell ids for links).
  presets      AbilityDistributionPresets.tbl (Editor source), ClassUUID -> six scores; the game's
               starting point-buy distribution of each class
  classes      per class: the normal progression table, and "multiclass": the IsMulticlass level-1
               nodes the game uses when the class is taken as a second or later class
  maxhp        unconditional IncreaseMaxHP(...) arguments (percentages left out) from a node's Boosts,
               its passives' Boosts, a passive option's Boosts and a feat's passives (Tough: Level*2, given by a
               one-option SelectPassives list);
               the page evaluates them on the finished build
  desc         descriptions (DescriptionParams filled in) of spells, passives, choices, classes,
               subclasses and species, shown on hover
  levels       PassivesAdded, AddSpells, SelectSpells (with the list's options), SelectPassives,
               SelectSkills / SelectSkillsExpertise (with the SkillList), SelectAbilityBonus
               (AbilityList and the bonuses), Proficiency / ProficiencyBonus(SavingThrow) boosts,
               AllowImprovement, ActionResource gains (SpellSlot / WarlockSpellSlot kept by id)
  caster       MulticlassSpellcasterModifier of the class or subclass (1, 0.5, 0.34)
  species      every (RaceUUID, SubRaceUUID) pair of CharacterCreationPresets, with the race and
               subrace progression tables (ProgressionType 2) read the same way
  backgrounds  docs/data/backgrounds.json is loaded by the page itself; feats come from feats.json
"""
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / ".claude" / "skills" / "bg3-data" / "scripts"))
sys.path.insert(0, str(REPO / ".claude" / "skills" / "new-subrace" / "scripts"))
sys.path.insert(0, str(REPO / "tools"))
import build_class_db as bcd  # noqa: E402
from build_class_db import MAX_LEVEL, SUBCLASS_LEVEL, lst, write  # noqa: E402
from build_feat_db import name_of, text  # noqa: E402
from build_species_db import layered  # noqa: E402
from build_spell_db import describe  # noqa: E402
from subrace_data import NULL  # noqa: E402

DATA = REPO / "docs" / "data"
PRESETS = (REPO / "Editor" / "Mods" / "DnD2024_897914ef-5c96-053c-44af-0be823f895fe"
           / "CharacterCreationPresets" / "AbilityDistributionPresets.tbl")
MAXHP = re.compile(r"(?:^|;)\s*IncreaseMaxHP\(((?:[^()]|\([^()]*\))*)\)")
ABILITIES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]


def presets():
    out = {}
    for obj in ET.parse(PRESETS).getroot().iter("stat_object"):
        f = {x.get("name"): x.get("value") for x in obj.iter("field")}
        out[f["ClassUUID"]] = {a: int(f[a]) for a in ABILITIES}
    return out


class Sim(bcd.Builder):
    def __init__(self):
        super().__init__()
        _, prog = layered("Progressions/Progressions.lsx", "Progression")
        self.multi = defaultdict(list)
        self.race_tables = defaultdict(list)
        for p in prog.values():
            if p.get("ProgressionType") == "2":
                self.race_tables[p["TableUUID"]].append(p)
            elif p.get("TableUUID") and p.get("IsMulticlass") == "true":
                self.multi[p["TableUUID"]].append(p)
        _, sk = layered("Lists/SkillLists.lsx", "SkillList")
        self.skill_lists = {u: lst(s.get("Skills"), ",") for u, s in sk.items()}
        _, ab = layered("Lists/AbilityLists.lsx", "AbilityList")
        self.ability_lists = {u: lst(a.get("Abilities"), ",") for u, a in ab.items()}
        # Resources the game keeps off the action resource panel (MoonSickle, HolyAvenger: attunement
        # markers) are hidden as well; spell slots are kept for the slot table.
        _, res = layered("ActionResourceDefinitions/ActionResourceDefinitions.lsx", "ActionResourceDefinition")
        self.res_hidden |= {r["Name"] for r in res.values() if r.get("ShowOnActionResourcePanel") != "true"
                            and r["Name"] not in ("SpellSlot", "WarlockSpellSlot")}
        self.spells = {}
        self.skills = {}

    def spell_ref(self, sid):
        if sid not in self.spells:
            f = self.fields(sid)
            self.spells[sid] = {"name": name_of(self.db, sid), "level": int(f.get("Level") or 0),
                                "link": sid in self.spell_ids, "desc": self.desc(f),
                                # false for class actions (Turn Undead): no IsSpell flag
                                "spell": "IsSpell" in f.get("SpellFlags", "")}
        return sid

    @staticmethod
    def desc(f, key="Description"):
        h = (f.get(key) or "").split(";")[0]
        prm = f.get(key + "Params", "")
        return {"en": describe(h, prm, False), "ko": describe(h, prm, True)}

    def maxhp(self, boosts):
        return [x.strip() for x in MAXHP.findall(boosts or "") if "%" not in x]

    def skill_ref(self, s):
        if s not in self.skills:
            self.skills[s] = self.term(s)
        return s

    def node(self, p, lvl=None):
        """One progression node -> what the level grants and what it asks the player to pick."""
        boosts, sel = p.get("Boosts", ""), p.get("Selectors", "")
        out = {"level": lvl or int(p["Level"]), "traits": [], "spells": [], "picks": [], "resources": [],
               "prof": [], "saves": re.findall(r"ProficiencyBonus\(SavingThrow,\s*(\w+)\)", boosts),
               "feat": p.get("AllowImprovement") == "true", "maxhp": self.maxhp(boosts)}
        ids = re.findall(r"\bProficiency\((\w+)\)", boosts)
        for ps in lst(p.get("PassivesAdded")):
            f = self.fields(ps)
            if not f:
                continue
            ids += re.findall(r"\bProficiency\((\w+)\)", f.get("Boosts", ""))
            out["saves"] += re.findall(r"ProficiencyBonus\(SavingThrow,\s*(\w+)\)", f.get("Boosts", ""))
            out["maxhp"] += self.maxhp(f.get("Boosts"))
            if "IsHidden" not in f.get("Properties", ""):
                out["traits"].append({"name": name_of(self.db, ps), "desc": self.desc(f)})
        out["prof"] = [self.term(x) for x in dict.fromkeys(ids) if x not in bcd.TOOLS]
        for lid in re.findall(r"AddSpells\(([\w-]+)", sel):
            out["spells"] += [self.spell_ref(s) for s in lst(self.slists.get(lid, {}).get("Spells"))]
        for lid, n in re.findall(r"SelectSpells\(([\w-]+),(\d+)", sel):
            opts = [self.spell_ref(s) for s in lst(self.slists.get(lid, {}).get("Spells"))]
            if int(n) and opts:
                cantrip = all(self.spells[s]["level"] == 0 for s in opts)
                out["picks"].append({"kind": "cantrip" if cantrip else "spell", "count": int(n), "options": opts})
        for lid, n, key in re.findall(r"SelectPassives\(([\w-]+),(\d+)(?:,(\w*))?", sel):
            ids = lst(self.plists.get(lid, {}).get("Passives"), ",")
            for m in self.merged.get(lid, []):
                ids += lst(m.get("Passives"), ",")
            opts = [{**self.option(x), "maxhp": self.maxhp(self.fields(x).get("Boosts")),
                     "skills": [self.skill_ref(k) for k in
                                re.findall(r"ProficiencyBonus\(Skill,\s*(\w+)\)", self.fields(x).get("Boosts", ""))]}
                    for x in dict.fromkeys(ids)
                    if self.fields(x) and "IsHidden" not in self.fields(x).get("Properties", "")]
            label = self.selector_name.get((key, p.get("TableUUID"))) or self.selector_name.get((key, None))
            if opts:
                out["picks"].append({"kind": "passive", "count": int(n), "label": label, "options": opts})
        for kind, rx in (("skill", r"SelectSkills\(([\w-]+),(\d+)"), ("expertise", r"SelectSkillsExpertise\(([\w-]+),(\d+)")):
            for lid, n in re.findall(rx, sel):
                opts = [self.skill_ref(s) for s in self.skill_lists.get(lid, [])]
                if int(n):
                    out["picks"].append({"kind": kind, "count": int(n), "options": opts})
        for lid, _, a, b in re.findall(r"SelectAbilityBonus\(([\w-]+),(\w+),(\d+),(\d+)\)", sel):
            out["picks"].append({"kind": "ability", "bonuses": [int(a), int(b)],
                                 "options": self.ability_lists.get(lid, ABILITIES)})
        for r, n, lv in re.findall(r"ActionResource\((\w+),([\d.]+),(\d+)\)", boosts):
            if bcd.SKIP_RESOURCES.match(r) or r in self.res_hidden:
                continue
            out["resources"].append({"id": r, "name": self.res_name.get(r, {"en": r, "ko": r}),
                                     "count": float(n) if "." in n else int(n), "slot": int(lv)})
        return out

    def merged_nodes(self, nodes):
        """Several nodes of one table and level (a blank mod override beside the vanilla node) -> one."""
        by = defaultdict(list)
        seen = set()
        for p in nodes:
            # The same node under two UUIDs (Shared and SharedDev, both overridden alike) counts once.
            same = (p["Level"], p.get("Boosts", ""), p.get("Selectors", ""), p.get("PassivesAdded", ""))
            if same in seen:
                continue
            seen.add(same)
            by[int(p["Level"])].append(self.node(p))
        out = []
        for lv, parts in sorted(by.items()):
            m = parts[0]
            for x in parts[1:]:
                for k in ("traits", "spells", "picks", "resources", "prof", "saves", "maxhp"):
                    m[k] += x[k]
                m["feat"] = m["feat"] or x["feat"]
            out.append(m)
        return out

    def table(self, uuid, limit=MAX_LEVEL):
        return self.merged_nodes([p for p in self.tables.get(uuid, []) if int(p["Level"]) <= limit])

    def species(self):
        _, races = layered("Races/Races.lsx", "Race")
        _, cc = layered("CharacterCreationPresets/CharacterCreationPresets.lsx", "CharacterCreationPreset")
        out = []
        for race_id, sub_id in sorted({(p.get("RaceUUID"), p.get("SubRaceUUID") or NULL) for p in cc.values()}):
            race = races.get(race_id)
            if not race:
                continue
            sub = races.get(sub_id) if sub_id != NULL else None
            nodes = []
            for r in [race] + ([sub] if sub else []):
                nodes += [p for p in self.race_tables.get(r.get("ProgressionTableUUID"), [])
                          if int(p["Level"]) <= MAX_LEVEL]
            out.append({"race": race_id, "race_name": self.name(race),
                        "desc": self.name(sub or race, "Description"),
                        "sub": sub["UUID"] if sub else None, "sub_name": self.name(sub) if sub else None,
                        "levels": self.merged_nodes(nodes)})
        out.sort(key=lambda s: (s["race_name"]["en"], (s["sub_name"] or {}).get("en", "")))
        return out

    def build(self):
        pre = presets()
        bases = {u: c for u, c in self.cls.items() if not c.get("ParentGuid")}
        subs = defaultdict(list)
        for c in self.cls.values():
            if c.get("ParentGuid") in bases:
                subs[c["ParentGuid"]].append(c)
        classes = []
        for u, c in bases.items():
            t = c["ProgressionTableUUID"]
            classes.append({
                "id": c["Name"], "uuid": u, "name": self.name(c), "desc": self.name(c, "Description"),
                "hp": {"base": int(c.get("BaseHp", 0)), "per_level": int(c.get("HpPerLevel", 0))},
                "primary": bcd.ABILITY.get(int(c.get("PrimaryAbility", 0))),
                "spellcasting": bcd.ABILITY.get(int(c.get("SpellCastingAbility", 0))),
                "caster": float(c.get("MulticlassSpellcasterModifier") or 0),
                "preset": pre.get(u),
                "subclass_level": SUBCLASS_LEVEL if subs[u] else None,
                "levels": self.table(t),
                "multiclass": self.merged_nodes(self.multi.get(t, [])),
                "subclasses": sorted(({
                    "id": s["Name"], "name": self.name(s), "desc": self.name(s, "Description"),
                    "caster": float(s.get("MulticlassSpellcasterModifier") or 0),
                    "spellcasting": bcd.ABILITY.get(int(s.get("SpellCastingAbility", 0)))
                                    if s.get("MulticlassSpellcasterModifier") else None,
                    "levels": self.table(s["ProgressionTableUUID"]),
                } for s in subs[u]), key=lambda s: s["name"]["en"]),
            })
        classes.sort(key=lambda c: c["name"]["en"])
        return classes, self.species()


def feat_passives(sim, f):
    """A feat's PassivesAdded, plus a SelectPassives list with a single option (Tough: no real choice)."""
    out = lst(f.get("PassivesAdded"))
    for lid in re.findall(r"SelectPassives\(([\w-]+)", f.get("Selectors", "")):
        opts = lst(sim.plists.get(lid, {}).get("Passives"), ",")
        if len(opts) == 1:
            out += opts
    return out


def main():
    sim = Sim()
    classes, species = sim.build()
    missing = [c["id"] for c in classes if not c["preset"]]
    write(DATA / "builder.json", "classes", classes)
    # species, spells and skills go in their own files: write() takes one list per file.
    write(DATA / "builder_species.json", "species", species)
    write(DATA / "builder_spells.json", "spells", [{"id": k, **v} for k, v in sorted(sim.spells.items())])
    _, feats = layered("Feats/Feats.lsx", "Feat")
    feat_hp = [{"id": f["Name"], "maxhp": hp} for f in feats.values()
               if (hp := [x for ps in feat_passives(sim, f) for x in sim.maxhp(sim.fields(ps).get("Boosts"))])]
    write(DATA / "builder_feat_hp.json", "feats", sorted(feat_hp, key=lambda f: f["id"]))
    write(DATA / "builder_skills.json", "skills", [{"id": k, "name": v} for k, v in sorted(sim.skills.items())])
    print(f"presets {len(presets())}, classes without a preset: {missing or 'none'}")
    print(f"multiclass level-1 nodes: {sum(bool(c['multiclass']) for c in classes)} of {len(classes)} classes")


if __name__ == "__main__":
    main()
