#!/usr/bin/env python
"""Build docs/data/feats.json for the GitHub Pages feat browser from the mod's game data.

  python tools/build_feat_db.py

Feats: every Feat node the game loads (vanilla Shared, SharedDev, GustavX, then the mod, merged by
UUID), with its FeatDescription. Nothing is read from the wiki text. Each field comes from data:
  abilities     SelectAbilities -> AbilityLists "Abilities", and Ability(...) in the passive Boosts
  requirement   Feats "Requirements": ability score, proficiency or species tag (a score above
                30 can never be met; those deprecated feats are skipped)
  repeatable    "CanBeTakenMultipleTimes"
  passives      PassivesAdded (fixed) and SelectPassives -> PassiveLists (one of them is chosen)
  spells        SelectSpells -> SpellLists, and UnlockSpell in the passive Boosts, when the
                entry has the IsSpell flag; other unlocked entries are actions (by UseCosts)
  reactions     UnlockInterrupt in the passive Boosts
  proficiency   SelectSkills / SelectSkillsExpertise, Boosts Proficiency(...) and
                ProficiencyBonus(SavingThrow|Skill, ...)
  defense       Boosts AC(, Initiative(, Resistance(, StatusImmunity(, DarkvisionRangeMin(,
                ActionResource(Movement, ...)
  uses          ActionResource(...) whose definition replenishes on a Rest or ShortRest
  source        "new" when no vanilla Feat node has the UUID; "revised" when the mod changes the
                Feat node or any field of one of its passives; otherwise "vanilla"
"""
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / ".claude" / "skills" / "bg3-data" / "scripts"))
import loca   # noqa: E402
import stats  # noqa: E402
from bg3paths import MOD, UNPACKED  # noqa: E402

OUT = REPO / "docs" / "data" / "feats.json"
MOD_PUBLIC = REPO / "Public" / MOD
VANILLA_PAKS = ["Shared/Public/Shared", "Shared/Public/SharedDev", "GustavX/Public/GustavX"]
NODE_ATTR = re.compile(r'id="(\w+)" type="\w+" (?:value|handle)="([^"]*)"')
SPECIES = {"DRAGONBORN": "Dragonborn", "DWARF": "Dwarf", "ELF": "Elf", "HALFELF": "Half-Elf",
           "GNOME": "Gnome", "HALFLING": "Halfling", "HALFORC": "Half-Orc", "TIEFLING": "Tiefling",
           "HUMAN": "Human", "GITHYANKI": "Githyanki", "DROW": "Drow"}
ARMOR = {"LightArmor": "light", "MediumArmor": "medium", "HeavyArmor": "heavy", "Shields": "shield"}
LIMITED = {"Rest": "long", "ShortRest": "short"}
# A score requirement above the cap can never be met: the mod gates deprecated feats this way
# (Magic Initiate Bard/Sorcerer/Warlock need Charisma 100), so they are left out.
MAX_SCORE = 30


def nodes(path, kind):
    try:
        text = path.read_text(encoding="utf-8-sig")
    except FileNotFoundError:
        return {}
    out = {}
    for body in re.findall(rf'<node id="{kind}">(.*?)</node>', text, re.S):
        a = {k: html_unescape(v) for k, v in NODE_ATTR.findall(body)}
        out[a.get("UUID") or a.get("Name")] = a
    return out


def html_unescape(v):
    return v.replace("&apos;", "'").replace("&quot;", '"').replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")


def layered(rel, kind):
    """(vanilla merge, vanilla + mod merge) of one lsx kind, keyed by UUID (later paks win)."""
    van = {}
    for pak in VANILLA_PAKS:
        van.update(nodes(UNPACKED / pak / rel, kind))
    full = dict(van)
    full.update(nodes(MOD_PUBLIC / rel, kind))
    return van, full


def text(handle, ko):
    if not handle:
        return ""
    t = loca.korean(handle)[0] if ko else loca.text(handle)
    t = re.sub(r"<br\s*/?>", "\n", t or "", flags=re.I)
    return re.sub(r"<[^>]+>", "", html_unescape(t)).strip()


def name_of(db, entry):
    r = stats.resolve(db, entry, "DisplayName")
    h = r[0].split(";")[0] if r else None
    return {"en": text(h, False) or entry, "ko": text(h, True) or entry}


def term(english):
    """Korean for a plain game term (species name), from the localization files."""
    for _, table in loca.english():
        for h, (t, _) in table.items():
            if t == english:
                ko, _ = loca.korean(h)
                if ko:
                    return ko
    return english


def fields(db, entry):
    return {k: v[0] for k, v in stats.all_fields(db, entry).items()} if entry in db else {}


def requirement(req):
    if not req:
        return None
    m = re.search(r"FeatRequirementAbilityGreaterEqual\('(\w+)',\s*(\d+)\)", req)
    if m:
        return {"type": "ability", "ability": m.group(1), "value": int(m.group(2))}
    m = re.search(r"FeatRequirementProficiency\('(\w+)'\)", req)
    if m:
        return {"type": "proficiency", "proficiency": m.group(1)}
    tags = re.findall(r"Tagged\('(\w+)'", req)
    if tags:
        names = [SPECIES.get(t, t.title()) for t in tags]
        return {"type": "species", "species": [{"en": n, "ko": term(n)} for n in names]}
    return {"type": "other", "text": req}


def main():
    db = stats.load(include_mod=True)
    vanilla_db = stats.load(include_mod=False)
    van_feats, feats = layered(Path("Feats/Feats.lsx"), "Feat")
    _, descs = layered(Path("Feats/FeatDescriptions.lsx"), "FeatDescription")
    desc_by_feat = {d["FeatId"]: d for d in descs.values()}
    _, ability_lists = layered(Path("Lists/AbilityLists.lsx"), "AbilityList")
    _, passive_lists = layered(Path("Lists/PassiveLists.lsx"), "PassiveList")
    _, spell_lists = layered(Path("Lists/SpellLists.lsx"), "SpellList")
    _, resources = layered(Path("ActionResourceDefinitions/ActionResourceDefinitions.lsx"),
                           "ActionResourceDefinition")
    replenish = {r["Name"]: r.get("ReplenishType", "") for r in resources.values()}

    out = []
    for uuid, feat in feats.items():
        sel = feat.get("Selectors", "")
        req = requirement(feat.get("Requirements", ""))
        if req and req["type"] == "ability" and req["value"] > MAX_SCORE:
            continue
        fixed = [p for p in feat.get("PassivesAdded", "").split(";") if p]
        options = [p for lid in re.findall(r"SelectPassives\(([\w-]+)", sel)
                   for p in passive_lists.get(lid, {}).get("Passives", "").split(",") if p]
        abilities = sorted({a.strip() for lid in re.findall(r"SelectAbilities\(([\w-]+)", sel)
                            for a in ability_lists.get(lid, {}).get("Abilities", "").split(",") if a.strip()})
        boosts = " ".join(fields(db, p).get("Boosts", "") for p in fixed + options)
        abilities = sorted(set(abilities) | set(re.findall(r"\bAbility\((\w+),", boosts)))

        unlocked = [s for lid in re.findall(r"SelectSpells\(([\w-]+)", sel)
                    for s in spell_lists.get(lid, {}).get("Spells", "").split(";") if s]
        unlocked += re.findall(r"\bUnlockSpell\((\w+)", boosts)
        spells, actions = [], {}
        for entry in dict.fromkeys(unlocked):
            f = fields(db, entry)
            if not f:
                continue
            if "IsSpell" in f.get("SpellFlags", ""):
                spells.append(entry)
            else:
                costs = f.get("UseCosts", "")
                kind = ("bonus" if "BonusActionPoint" in costs else "action" if "ActionPoint" in costs
                        else "reaction" if "ReactionActionPoint" in costs else "free")
                actions[entry] = kind
        for entry in dict.fromkeys(re.findall(r"\bUnlockInterrupt\((\w+)", boosts)):
            actions[entry] = "reaction"

        prof = {
            "skills": sum(int(n) for n in re.findall(r"SelectSkills\([\w-]+,(\d+)", sel)),
            "expertise": sum(int(n) for n in re.findall(r"SelectSkillsExpertise\([\w-]+,(\d+)", sel))
                         + len(set(re.findall(r"\bExpertiseBonus\((\w+)", boosts))),
            "armor": sorted({ARMOR[p] for p in re.findall(r"\bProficiency\((\w+)\)", boosts) if p in ARMOR}),
            "weapons": sorted({p for p in re.findall(r"\bProficiency\((\w+)\)", boosts) if "Weapon" in p}),
            "tools": sorted({p for p in re.findall(r"\bProficiency\((\w+)\)", boosts)
                             if p not in ARMOR and "Weapon" not in p}),
            "saves": sorted(set(re.findall(r"\bProficiencyBonus\(SavingThrow,\s*(\w+)", boosts))),
        }
        prof["skills"] += len(set(re.findall(r"\bProficiencyBonus\(Skill,\s*(\w+)", boosts)))

        defense = []
        if re.search(r"\bAC\(", boosts):
            defense.append("ac")
        if re.search(r"\bInitiative\(", boosts):
            defense.append("initiative")
        if re.search(r"\bResistance\(", boosts):
            defense.append("resistance")
        if re.search(r"\bStatusImmunity\(", boosts):
            defense.append("immunity")
        if re.search(r"\bDarkvisionRangeMin\(", boosts):
            defense.append("darkvision")
        if re.search(r"\bActionResource\(Movement,", boosts):
            defense.append("speed")

        uses = sorted({LIMITED[replenish[r]] for r in re.findall(r"\bActionResource\((\w+),", boosts)
                       if replenish.get(r) in LIMITED and r != "Movement"})

        d = desc_by_feat.get(uuid, {})
        if uuid not in van_feats:
            source = "new"
        else:
            changed = van_feats[uuid] != feat or any(
                fields(vanilla_db, p) != fields(db, p) for p in fixed + options)
            source = "revised" if changed else "vanilla"
        out.append({
            "id": feat["Name"],
            "name": {"en": text(d.get("DisplayName"), False) or feat["Name"],
                     "ko": text(d.get("DisplayName"), True) or feat["Name"]},
            "desc": {"en": text(d.get("Description"), False), "ko": text(d.get("Description"), True)},
            "source": source,
            "abilities": abilities,
            "requirement": req,
            "repeatable": feat.get("CanBeTakenMultipleTimes") == "true",
            "choices": [name_of(db, p) for p in options],
            "choice_count": sum(int(n) for n in re.findall(r"SelectPassives\([\w-]+,(\d+)", sel)),
            "spells": [name_of(db, s) for s in spells],
            "actions": [{"name": name_of(db, a), "cost": k} for a, k in actions.items()],
            "proficiency": prof,
            "defense": defense,
            "uses": uses,
        })
    out.sort(key=lambda f: f["name"]["en"].lower())

    built = subprocess.run(["git", "-C", str(REPO), "log", "-1", "--format=%cs %h"],
                           capture_output=True, text=True).stdout.strip()
    one = lambda v: json.dumps(v, ensure_ascii=False)
    blocks = ["    {\n" + ",\n".join(f"      {one(k)}: {one(v)}" for k, v in f.items()) + "\n    }" for f in out]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text('{\n  "generated": ' + one(built) + ',\n  "feats": [\n' + ",\n".join(blocks) + "\n  ]\n}\n",
                   encoding="utf-8", newline="\n")
    print(f"feats {len(out)}: " + ", ".join(f"{k} {sum(f['source'] == k for f in out)}"
                                           for k in ("new", "revised", "vanilla")))
    print(f"wrote {OUT.relative_to(REPO)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
