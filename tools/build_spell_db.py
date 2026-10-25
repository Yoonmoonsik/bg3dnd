#!/usr/bin/env python
"""Build docs/data/spells.json for the GitHub Pages spell browser.

  python tools/build_spell_db.py            write docs/data/spells.json and copy icons
  python tools/build_spell_db.py --check    only report rows that could not be matched

Which entries count as spells:
  - an entry of a base class spell list ("5.5 <Class> Cantrip ..." / "5.5 <Class> SLevel N ...")
  - that also has a row in the wiki Spells.md (the wiki is the editorial list of real spells;
    class features such as EC_ForceBallista also sit in spell lists).
Wiki rows are matched to entries by Icon + level. The wiki supplies new/revised, the short
change notes and the scroll column; every mechanic comes from the stats (vanilla merged with
Honour and the mod, through `using`, by the bg3-data scripts).
"""
import argparse
import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / ".claude" / "skills" / "bg3-data" / "scripts"))
import loca   # noqa: E402
import stats  # noqa: E402
from bg3paths import MOD, MOD_PUBLIC  # noqa: E402

WIKI = REPO.parent / "bg3dnd.wiki"
OUT = REPO / "docs" / "data" / "spells.json"
ICON_OUT = REPO / "docs" / "icons"
SPELL_LISTS_TBL = REPO / "Editor" / "Mods" / MOD / "Lists" / "SpellLists.tbl"

CLASSES = ["Artificer", "Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Warlock", "Wizard"]
BASE_LIST = re.compile(r"^(?:5\.5 )?(%s) (?:Cantrip|SLevel \d|Mysic Arcanum)" % "|".join(CLASSES))
# Wiki rows whose icon is on no entry (the wiki made its own parent icon).
WIKI_ICON_IDS = {(3, "Spell_Necromancy_BestowCurse"): "Target_BestowCurse"}

DAMAGE_KO = {"Acid": "산성", "Bludgeoning": "타격", "Cold": "냉기", "Fire": "화염", "Force": "역장",
             "Lightning": "번개", "Necrotic": "사령", "Piercing": "관통", "Poison": "독",
             "Psychic": "정신", "Radiant": "광휘", "Slashing": "참격", "Thunder": "천둥"}
ABILITIES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]

def list_spells(base_only=True):
    """spell id -> sorted class names. base_only=False adds every list (class name "")."""
    text = SPELL_LISTS_TBL.read_text(encoding="utf-8-sig")
    out = {}
    for obj in stats.OBJ.findall(text):
        fields = {a["name"]: a.get("value", "") for a in
                  (dict(stats.ATTR.findall(f)) for f in stats.FIELD.findall(obj))}
        m = BASE_LIST.match(fields.get("Name", ""))
        is_base = bool(m) and " to " not in fields.get("Name", "")
        if not is_base and base_only:
            continue
        for sid in filter(None, fields.get("Spells", "").split(";")):
            out.setdefault(sid, set())
            if is_base:
                out[sid].add(m.group(1))
    return {k: sorted(v) for k, v in out.items()}

ROW = re.compile(r"^\| !\[icon\]\([^)]*/([^/)]+)\.png\) \| (.*?) \| (.*?) \| (.*?) \| (.*?) \| (.*?) \|$")
LEVEL_HEAD = re.compile(r"^## (?:Cantrips|Level (\d))|^## (?:소마법|(\d)레벨)")

def wiki_rows(path):
    """[(level, icon, name, school, note, has_scroll)] from a Spells table page."""
    rows, level = [], None
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if line.startswith("## "):
            m = LEVEL_HEAD.match(line)
            level = (int(m.group(1) or m.group(2) or 0)) if m else None
            continue
        m = ROW.match(line)
        if m and level is not None:
            icon, name, school, cls, note, scroll = m.groups()
            rows.append((level, icon, name.strip(), school.strip(), note.strip(), "SCROLL" in scroll,
                         [c.strip() for c in cls.split(",") if c.strip()]))
    return rows

TAG = re.compile(r"<[^>]+>")

def clean(s):
    if not s:
        return ""
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    return html.unescape(TAG.sub("", html.unescape(s))).strip()

def handle_of(v):
    return v.split(";")[0] if v else None

DICE_MAP = re.compile(r"LevelMapValue\((?:D(\d+)Cantrip|([A-Za-z0-9_]+))\)")

def fmt_param(p, ko):
    p = p.strip()
    p = DICE_MAP.sub(lambda m: "1d" + m.group(1) if m.group(1) else m.group(2), p)
    m = re.match(r"DealDamage\(([^,]+),\s*(\w+)", p)
    if m:
        amt, typ = m.groups()
        return f"{amt} {DAMAGE_KO.get(typ, typ)} 피해" if ko else f"{amt} {typ} damage"
    m = re.match(r"RegainHitPoints\(([^)]+)\)", p)
    if m:
        return f"생명력 {m.group(1)}" if ko else f"{m.group(1)} hit points"
    m = re.match(r"Distance\(([\d.]+)\)", p)
    if m:
        return f"{m.group(1)}m"
    m = re.match(r"(?:Temporary)?HitPoints?\(([^)]+)\)", p)
    if m:
        return m.group(1)
    return p

def describe(handle, params, ko):
    if not handle:
        return ""
    if ko:
        t, _ = loca.korean(handle)
    else:
        t = loca.text(handle)
    t = clean(t)
    plist = [x for x in (params or "").split(";")]
    for i, p in enumerate(plist, 1):
        t = t.replace(f"[{i}]", fmt_param(p, ko))
    return t

SAVE = re.compile(r"SavingThrow\(Ability\.(\w+)")
ATTACK = re.compile(r"Attack\(AttackType\.(\w+)")
DMG_TYPE = re.compile(r"DealDamage\([^,]+,\s*(\w+)")

def mechanics(db, sid, depth=0):
    f = {k: v[0] for k, v in stats.all_fields(db, sid).items()}
    flags = set(filter(None, f.get("SpellFlags", "").split(";")))
    costs = f.get("UseCosts", "")
    roll = f.get("SpellRoll", "")
    out = {
        "type": f.get("SpellType", ""),
        # The slot a spell spends is its real level (Theft of Vitae: Level 1, slot 2).
        "level": int(slot.group(1)) if (slot := re.search(r"SpellSlotsGroup:\d+:\d+:(\d+)", costs))
                 else int(f.get("Level") or 0),
        "school": f.get("SpellSchool", "None"),
        "icon": f.get("Icon", ""),
        "name_h": handle_of(f.get("DisplayName")),
        "desc_h": handle_of(f.get("Description")),
        "params": f.get("DescriptionParams", ""),
        "concentration": "IsConcentration" in flags,
        "ritual": bool(f.get("RitualCosts")),
        "verbal": "HasVerbalComponent" in flags,
        "somatic": "HasSomaticComponent" in flags,
        "cast": [c for c, k in (("action", "ActionPoint"), ("bonus", "BonusActionPoint"),
                                ("reaction", "ReactionActionPoint")) if re.search(rf"(^|;){k}:", costs)],
        "saves": sorted(set(SAVE.findall(roll))),
        "attack": sorted(set(ATTACK.findall(roll))),
        "damage": damage_types(f),
        "range": f.get("TargetRadius") or f.get("Range") or "",
        "area": f.get("AreaRadius") or f.get("ExplodeRadius") or "",
        "shape": f.get("Shape", "") if out_type_is_zone(f) else "",
        "children": [c for c in f.get("ContainerSpells", "").split(";") if c],
    }
    if "interrupt" in costs.lower() or f.get("InterruptPrototype"):
        out["cast"].append("reaction")
    # Container spells: the parent is never cast, so mechanics come from the variants.
    if out["children"] and depth == 0:
        for c in out["children"]:
            if c in db:
                k = mechanics(db, c, 1)
                out["damage"] |= set(k["damage"])
                out["saves"] = sorted(set(out["saves"]) | set(k["saves"]))
                out["attack"] = sorted(set(out["attack"]) | set(k["attack"]))
                out["concentration"] = out["concentration"] or k["concentration"]
                if not out["cast"]:
                    out["cast"] = k["cast"]
                out["range"] = out["range"] or k["range"]
                out["area"] = out["area"] or k["area"]
                out["shape"] = out["shape"] or k["shape"]
    out["damage"] = sorted(d for d in out["damage"] if d in DAMAGE_KO)
    return out

def damage_types(f):
    """What the tooltip shows; otherwise the unconditional DealDamage of the functors.
    Functors also carry passive-gated extras (Eldritch Blast: IF(HasPassive(...)):DealDamage)."""
    shown = set(DMG_TYPE.findall(f.get("TooltipDamageList", "") + " " + f.get("DescriptionParams", "")))
    if shown:
        return shown
    if f.get("DamageType") not in (None, "", "None"):
        return {f["DamageType"]}
    plain = [seg for k in ("SpellSuccess", "SpellFail", "SpellProperties")
             for seg in f.get(k, "").split(";") if not seg.strip().startswith("IF(")]
    return set(DMG_TYPE.findall(" ".join(plain)))


def out_type_is_zone(f):
    return f.get("SpellType") in ("Zone", "Wall") or bool(f.get("Shape"))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    classes = list_spells(base_only=False)
    db = stats.load(include_mod=True)
    vanilla = stats.load(include_mod=False)
    en_rows = wiki_rows(WIKI / "Spells.md")
    ko_rows = wiki_rows(WIKI / "ko" / "주문.md")
    if len(en_rows) != len(ko_rows):
        sys.exit(f"wiki rows differ: Spells.md {len(en_rows)} vs ko/주문.md {len(ko_rows)}")

    by_key = {}
    for sid in classes:
        if sid not in db:
            continue
        m = mechanics(db, sid)
        # The wiki sometimes shows a variant's icon (Eyebite_Asleep) and drops apostrophes.
        icons = {m["icon"]} | {stats.resolve(db, c, "Icon")[0] for c in m["children"]
                               if c in db and stats.resolve(db, c, "Icon")}
        for ic in icons:
            by_key.setdefault((m["level"], ic.replace("'", "")), []).append((sid, m))

    spells, unmatched, class_diff = [], [], []
    for en, ko in zip(en_rows, ko_rows):
        level, icon, name, school, note, scroll, wiki_cls = en
        cands = by_key.get((level, icon), [])
        if not cands and (level, icon) in WIKI_ICON_IDS:
            sid = WIKI_ICON_IDS[(level, icon)]
            cands = [(sid, mechanics(db, sid))]
        if not cands:
            unmatched.append(f"L{level} {name} ({icon})")
            continue
        # Same icon twice at one level (class variants such as Shield_Sorcerer/_Wizard): merge.
        # Prefer an entry from a base class list over a feature list's copy.
        cands.sort(key=lambda c: not classes[c[0]])
        sid, m = cands[0]
        data_cls = sorted({c for s, _ in cands for c in classes[s]})
        # Classes come from the base lists (game data wins over the wiki); the wiki is the
        # fallback for spells granted only by a feature list (Find Steed, Paladin).
        order = lambda cs: sorted(cs, key=lambda c: (c == "Artificer", c))
        cls = order(data_cls) if data_cls else wiki_cls
        if data_cls and sorted(c for c in wiki_cls if c in CLASSES) != data_cls:
            class_diff.append(f"L{level} {name}: wiki {wiki_cls} / base lists {data_cls}")

        new = sid not in vanilla
        spells.append({
            "id": sid,
            "ids": [s for s, _ in cands],
            "level": level,
            "school": m["school"],
            "sangromancy": "Sangromancy" in school,
            "classes": cls,
            "source": "new" if new else ("revised" if note else "vanilla"),
            "icon": icon,
            "scroll": scroll,
            "name": {"en": name, "ko": ko[2]},
            "note": {"en": note, "ko": ko[4]},
            "desc": {"en": describe(m["desc_h"], m["params"], False),
                     "ko": describe(m["desc_h"], m["params"], True)},
            "cast": sorted(set(m["cast"])),
            "concentration": m["concentration"],
            "ritual": m["ritual"],
            "components": [c for c, ok in (("V", m["verbal"]), ("S", m["somatic"])) if ok],
            "saves": m["saves"],
            "attack": m["attack"],
            "damage": m["damage"],
            "range": m["range"],
            "area": m["area"],
            "shape": m["shape"],
            "variants": [{"id": c, "name": {"en": clean(loca.text(handle_of(stats.resolve(db, c, "DisplayName")[0]))) if stats.resolve(db, c, "DisplayName") else c,
                                            "ko": clean(loca.korean(handle_of(stats.resolve(db, c, "DisplayName")[0]))[0]) if stats.resolve(db, c, "DisplayName") else c}}
                         for c in m["children"] if c in db],
        })

    print(f"wiki rows {len(en_rows)}, matched {len(spells)}, unmatched {len(unmatched)}")
    for u in unmatched:
        print("  unmatched:", u)
    for d in class_diff:
        print("  classes:", d)
    if args.check:
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    built = subprocess.run(["git", "-C", str(REPO), "log", "-1", "--format=%cs %h"],
                           capture_output=True, text=True).stdout.strip()
    OUT.write_text(json.dumps({"generated": built, "spells": spells}, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    ICON_OUT.mkdir(parents=True, exist_ok=True)
    src = WIKI / "bg3dnd_icons" / "bg3dnd_action" / "4_Readme_48"
    for s in spells:
        p = src / f"{s['icon']}.png"
        if p.exists():
            shutil.copy2(p, ICON_OUT / p.name)
    print(f"wrote {OUT.relative_to(REPO)} ({OUT.stat().st_size // 1024} KB)")

if __name__ == "__main__":
    main()
