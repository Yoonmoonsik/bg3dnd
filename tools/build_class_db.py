#!/usr/bin/env python
"""Build docs/data/classes.json and docs/data/subclasses.json from the mod's game data.

  python tools/build_class_db.py

ClassDescriptions and Progressions merge by UUID over the vanilla paks, then the mod
(tools/build_species_db.layered). Nothing is read from the wiki text. Levels stop at 12, the
mod's level cap; IsMulticlass progression nodes are left out.
  class        a ClassDescription without ParentGuid: BaseHp/HpPerLevel, PrimaryAbility,
               SpellCastingAbility, MulticlassSpellcasterModifier (1 full, 0.5 half caster),
               level-1 saving throw and armour/weapon proficiencies, AllowImprovement levels
  subclass     a ClassDescription whose ParentGuid is a class; every subclass is picked at level 3
               (SUBCLASS_LEVEL). A subclass with MulticlassSpellcasterModifier is a third caster.
  levels       per progression node: PassivesAdded (IsHidden left out, with descriptions),
               AddSpells (granted spells), SelectSpells (learn N cantrips/spells), SelectPassives
               (choose N of a list; each option with its Description and ExtraDescription), SelectSkills / SelectSkillsExpertise, AllowImprovement (feat),
               ActionResource gains (spell slots and class resources; hit dice, movement and IsHidden left out)
  source       "new" when no vanilla node has the UUID; "revised" when the mod changes the
               ClassDescription or one of its progression nodes; otherwise "vanilla"
"""
import json
import re
import subprocess
import sys
from collections import defaultdict
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
MAX_LEVEL = 12
# Every class picks its subclass at level 3 in this mod (user's statement, 2026-10-25); some subclass
# tables also hold lower-level nodes, so the level is not derived from the tables.
SUBCLASS_LEVEL = 3
ABILITY = {1: "Strength", 2: "Dexterity", 3: "Constitution", 4: "Intelligence", 5: "Wisdom", 6: "Charisma"}
SKIP_RESOURCES = re.compile(r"^(HitPointDice\d+|Movement)$")
ARMOR = {"LightArmor": "light", "MediumArmor": "medium", "HeavyArmor": "heavy", "Shields": "shield"}
TOOLS = {"MusicalInstrument"}
# Game spelling of the armour proficiency names (the ids are American: LightArmor).
# SelectPassives with no ProgressionDescription name (Rune Knight runes, Barbarian skills …) are
# labelled with the vanilla "Passive" string (Korean 상시 발동).
PASSIVE_LABEL = "h68b5a020ga692g416eg8606gef8a995b12ba"
ARMOR_EN = {"LightArmor": "Light Armour", "MediumArmor": "Medium Armour", "HeavyArmor": "Heavy Armour", "Shields": "Shields"}


def lst(v, sep=";"):
    return [x.strip() for x in (v or "").split(sep) if x.strip()]


class Builder:
    def __init__(self):
        self.db = stats.load(include_mod=True)
        self.van_cls, self.cls = layered("ClassDescriptions/ClassDescriptions.lsx", "ClassDescription")
        self.van_prog, prog = layered("Progressions/Progressions.lsx", "Progression")
        self.tables = defaultdict(list)
        for p in prog.values():
            if p.get("TableUUID") and p.get("IsMulticlass") != "true" and int(p.get("Level", 0)) <= MAX_LEVEL:
                self.tables[p["TableUUID"]].append(p)
        _, self.plists = layered("Lists/PassiveLists.lsx", "PassiveList")
        # A list's options include every list MergedInto it (Warlock invocations: "1 to 12", "2 to 12" …).
        self.merged = defaultdict(list)
        for l in self.plists.values():
            if l.get("MergedInto"):
                self.merged[l["MergedInto"]].append(l)
        # SelectPassives(list, n, <SelectorId>): ProgressionDescriptions name the choice ("Eldritch Invocations").
        _, pdesc = layered("Progressions/ProgressionDescriptions.lsx", "ProgressionDescription")
        self.selector_name = {}
        for d in pdesc.values():
            if d.get("SelectorId"):
                key = (d["SelectorId"], d.get("ProgressionTableId"))
                self.selector_name[key] = {"en": text(d.get("DisplayName"), False), "ko": text(d.get("DisplayName"), True)}
        _, self.slists = layered("Lists/SpellLists.lsx", "SpellList")
        _, res = layered("ActionResourceDefinitions/ActionResourceDefinitions.lsx", "ActionResourceDefinition")
        self.res_name = {r["Name"]: {"en": text(r.get("DisplayName"), False) or r["Name"],
                                     "ko": text(r.get("DisplayName"), True) or r["Name"]} for r in res.values()}
        self.res_hidden = {r["Name"] for r in res.values() if r.get("IsHidden") == "true"}
        self.spell_ids = {i for s in json.loads((DATA / "spells.json").read_text(encoding="utf-8"))["spells"]
                          for i in s["ids"]}

    def term(self, ident):
        """Proficiency id -> {en, ko}: "HandCrossbows" -> "Hand Crossbows" / its game translation."""
        english = ARMOR_EN.get(ident) or re.sub(r"(?<=[a-z])(?=[A-Z])", " ", ident)
        if not hasattr(self, "_en"):
            self._en = {}
            for _, table in loca.english():
                for h, (t, _) in table.items():
                    self._en.setdefault(t.strip(), h)
        h = self._en.get(english)
        return {"en": english, "ko": (loca.korean(h)[0] if h else None) or english}

    def fields(self, entry):
        return {k: v[0] for k, v in stats.all_fields(self.db, entry).items()} if entry in self.db else {}

    def spell(self, sid):
        return {"id": sid if sid in self.spell_ids else None, "name": name_of(self.db, sid)}

    def option(self, ps):
        """A SelectPassives option: name, description, and ExtraDescription, the tooltip's extra line
        (prerequisites such as "Prerequisite: Level 9+ Warlock, Pact of the Blade Invocation", or notes)."""
        f = self.fields(ps)
        out = {"id": ps, "name": name_of(self.db, ps)}
        for key, k in (("Description", "desc"), ("ExtraDescription", "extra")):
            h = (f.get(key) or "").split(";")[0]
            prm = f.get(key + "Params", "")
            out[k] = {"en": describe(h, prm, False), "ko": describe(h, prm, True)}
        return out

    def name(self, node, key="DisplayName"):
        return {"en": text(node.get(key), False) or node.get("Name", ""), "ko": text(node.get(key), True) or node.get("Name", "")}

    def level(self, p, proficiency=False):
        """One progression node -> what the level grants. proficiency: also list the armour and
        weapon proficiencies the node's Boosts and its passives' Boosts give (subclass tables; a
        class's level-1 proficiencies are shown apart)."""
        boosts, sel = p.get("Boosts", ""), p.get("Selectors", "")
        out = {"level": int(p["Level"]), "traits": [], "spells": [], "learn": [], "choices": [], "resources": [],
               "skills": 0, "expertise": 0, "feat": p.get("AllowImprovement") == "true", "proficiencies": []}
        if proficiency:
            ids = re.findall(r"\bProficiency\((\w+)\)", boosts)
            for ps in lst(p.get("PassivesAdded")):
                ids += re.findall(r"\bProficiency\((\w+)\)", self.fields(ps).get("Boosts", ""))
            out["proficiencies"] = [self.term(x) for x in dict.fromkeys(ids) if x not in TOOLS]
        for ps in lst(p.get("PassivesAdded")):
            f = self.fields(ps)
            if not f or "IsHidden" in f.get("Properties", ""):
                continue
            h = (f.get("Description") or "").split(";")[0]
            prm = f.get("DescriptionParams", "")
            out["traits"].append({"name": name_of(self.db, ps),
                                  "desc": {"en": describe(h, prm, False), "ko": describe(h, prm, True)}})
        for lid in re.findall(r"AddSpells\(([\w-]+)", sel):
            out["spells"] += [self.spell(s) for s in lst(self.slists.get(lid, {}).get("Spells"))]
        for lid, n in re.findall(r"SelectSpells\(([\w-]+),(\d+)", sel):
            spells = lst(self.slists.get(lid, {}).get("Spells"))
            cantrips = bool(spells) and all(self.fields(s).get("Level", "0") == "0" for s in spells)
            if int(n):
                out["learn"].append({"kind": "cantrip" if cantrips else "spell", "count": int(n)})
        for lid, n, key in re.findall(r"SelectPassives\(([\w-]+),(\d+)(?:,(\w*))?", sel):
            ids = lst(self.plists.get(lid, {}).get("Passives"), ",")
            for m in self.merged.get(lid, []):
                ids += lst(m.get("Passives"), ",")
            # id: the passive, so the page can link fighting styles and weapon masteries to their pages.
            # Hidden helper passives (ThirstingBlade_Check) are not choices.
            opts = [self.option(x) for x in dict.fromkeys(ids)
                    if self.fields(x) and "IsHidden" not in self.fields(x).get("Properties", "")]
            label = self.selector_name.get((key, p.get("TableUUID"))) or self.selector_name.get((key, None))
            if not label:
                label = {"en": loca.text(PASSIVE_LABEL), "ko": loca.korean(PASSIVE_LABEL)[0]}
            if opts:
                out["choices"].append({"count": int(n), "label": label, "options": opts})
        out["skills"] = sum(int(n) for n in re.findall(r"SelectSkills\([\w-]+,(\d+)", sel))
        out["expertise"] = sum(int(n) for n in re.findall(r"SelectSkillsExpertise\([\w-]+,(\d+)", sel))
        for r, n, lvl in re.findall(r"ActionResource\((\w+),([\d.]+),(\d+)\)", boosts):
            if SKIP_RESOURCES.match(r) or r in self.res_hidden:
                continue
            out["resources"].append({"name": self.res_name.get(r, {"en": r, "ko": r}),
                                     "count": float(n) if "." in n else int(n), "slot": int(lvl)})
        return out

    def levels(self, table, proficiency=False):
        nodes = sorted(self.tables.get(table, []), key=lambda p: int(p["Level"]))
        out = [self.level(p, proficiency) for p in nodes]
        return [l for l in out if any(l[k] for k in ("traits", "spells", "learn", "choices", "resources",
                                                      "skills", "expertise", "feat", "proficiencies"))]

    def source(self, node):
        if node["UUID"] not in self.van_cls:
            return "new"
        if self.van_cls[node["UUID"]] != node:
            return "revised"
        return "revised" if any(self.van_prog.get(p["UUID"]) != p
                                for p in self.tables.get(node.get("ProgressionTableUUID"), [])) else "vanilla"

    def run(self):
        bases = {u: c for u, c in self.cls.items() if not c.get("ParentGuid")}
        subs = defaultdict(list)
        for c in self.cls.values():
            if c.get("ParentGuid") in bases:
                subs[c["ParentGuid"]].append(c)
        classes, subclasses = [], []
        for u, c in bases.items():
            first = next((p for p in self.tables.get(c["ProgressionTableUUID"], []) if p["Level"] == "1"), {})
            b1 = first.get("Boosts", "")
            mc = c.get("MulticlassSpellcasterModifier")
            pact = any("WarlockSpellSlot" in p.get("Boosts", "") for p in self.tables.get(c["ProgressionTableUUID"], []))
            classes.append({
                "id": c["Name"], "name": self.name(c), "desc": self.name(c, "Description"),
                "source": self.source(c),
                "hp": {"base": int(c.get("BaseHp", 0)), "per_level": int(c.get("HpPerLevel", 0))},
                "primary": ABILITY.get(int(c.get("PrimaryAbility", 0))),
                "spellcasting": ABILITY.get(int(c.get("SpellCastingAbility", 0))) if (mc or pact) else None,
                "caster": "pact" if pact else {"1": "full", "0.5": "half"}.get(mc),
                "saves": re.findall(r"ProficiencyBonus\(SavingThrow,\s*(\w+)\)", b1),
                "armor": [ARMOR[x] for x in re.findall(r"\bProficiency\((\w+)\)", b1) if x in ARMOR],
                # Every level-1 Proficiency(...) other than armour and tools: weapon groups and weapon
                # types (Rogue: SimpleWeapons + HandCrossbows, Scimitars, Shortswords, Rapiers).
                "weapons": [self.term(x) for x in re.findall(r"\bProficiency\((\w+)\)", b1)
                            if x not in ARMOR and x not in TOOLS],
                "feat_levels": sorted(int(p["Level"]) for p in self.tables.get(c["ProgressionTableUUID"], [])
                                      if p.get("AllowImprovement") == "true"),
                "subclass_level": SUBCLASS_LEVEL if subs[u] else None,
                "subclasses": sorted(({"id": s["Name"], "name": self.name(s)} for s in subs[u]),
                                     key=lambda s: s["name"]["en"]),
                "levels": self.levels(c["ProgressionTableUUID"]),
            })
            for s in subs[u]:
                lv = self.levels(s["ProgressionTableUUID"], proficiency=True)
                subclasses.append({
                    "id": s["Name"], "name": self.name(s), "desc": self.name(s, "Description"),
                    "class": {"id": c["Name"], "name": self.name(c)}, "source": self.source(s),
                    "start": SUBCLASS_LEVEL,
                    # MulticlassSpellcasterModifier 0.34: a third caster subclass (Eldritch Knight …).
                    "caster": "third" if s.get("MulticlassSpellcasterModifier") else None,
                    "spellcasting": ABILITY.get(int(s.get("SpellCastingAbility", 0)))
                                    if s.get("MulticlassSpellcasterModifier") else None,
                    "spells": any(l["spells"] or l["learn"] for l in lv),
                    "levels": lv,
                })
        classes.sort(key=lambda c: c["name"]["en"])
        subclasses.sort(key=lambda s: (s["class"]["name"]["en"], s["name"]["en"]))
        return classes, subclasses


def write(path, key, items):
    built = subprocess.run(["git", "-C", str(REPO), "log", "-1", "--format=%cs %h"],
                           capture_output=True, text=True).stdout.strip()
    one = lambda v: json.dumps(v, ensure_ascii=False)
    blocks = ["    {\n" + ",\n".join(f"      {one(k)}: {one(v)}" for k, v in x.items()) + "\n    }" for x in items]
    path.write_text('{\n  "generated": ' + one(built) + f',\n  "{key}": [\n' + ",\n".join(blocks) + "\n  ]\n}\n",
                    encoding="utf-8", newline="\n")
    print(f"wrote {path.relative_to(REPO)}: {len(items)} {key} ({path.stat().st_size // 1024} KB)")


def main():
    classes, subclasses = Builder().run()
    write(DATA / "classes.json", "classes", classes)
    write(DATA / "subclasses.json", "subclasses", subclasses)


if __name__ == "__main__":
    main()
