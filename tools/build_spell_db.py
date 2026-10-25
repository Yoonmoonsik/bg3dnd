#!/usr/bin/env python
"""Build docs/data/spells.json for the GitHub Pages spell browser from the mod's game data.

  python tools/build_spell_db.py            write docs/data/spells.json and the icons
  python tools/build_spell_db.py --check    only print the counts

Spells: every entry of a base class spell list ("5.5 <Class> Cantrip ..." / "5.5 <Class> SLevel
N ..." / "Warlock Mysic Arcanum ..") plus real spells on a class-level feature list ("5.5 Paladin
Level 5": Find Steed); class copies sharing a name and level are merged.
Fields come from the stats (vanilla merged with Honour and the mod, through `using`, by the
bg3-data scripts) and the mod localization; nothing is read from the wiki text.
  source       "new" when neither the id nor its vanilla container is on a vanilla spell list
               other than the scroll lists (vanilla stats alone can be dummy data); "revised" when any field of the merged entry differs from the
               vanilla merge (technical fixes included); else "vanilla"
  scroll       a *_spellscroll / *_Scroll entry inherits from the spell or one of its variants
  sangromancy  the spell or a variant is in IsSangromancySpell() (Wizard.khn)
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
from bg3paths import MOD, UNPACKED  # noqa: E402

WIZARD_KHN = REPO / "Mods" / MOD / "Scripts" / "thoth" / "helpers" / "Wizard.khn"
ICON_PNG = REPO.parent / "bg3dnd.wiki" / "bg3dnd_icons" / "bg3dnd_action" / "4_Readme_48"
OUT = REPO / "docs" / "data" / "spells.json"
ICON_OUT = REPO / "docs" / "icons"
VANILLA_ICON_DDS = UNPACKED / "Game" / "Public" / "Game" / "GUI" / "AssetsLowRes" / "Tooltips" / "Icons"
SPELL_LISTS_TBL = REPO / "Editor" / "Mods" / MOD / "Lists" / "SpellLists.tbl"

CLASSES = ["Artificer", "Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Warlock", "Wizard"]
BASE_LIST = re.compile(r"^(?:5\.5 )?(%s) (?:Cantrip|SLevel \d|Mysic Arcanum)" % "|".join(CLASSES))
VANILLA_LIST_PAKS = ["Shared/Public/Shared", "Shared/Public/SharedDev", "GustavX/Public/GustavX"]
# Class-level feature lists of the mod ("5.5 Paladin Level 5" grants Find Steed).
CLASS_FEATURE_LIST = re.compile(r"^5\.5 (%s) Level \d+$" % "|".join(CLASSES))
SCROLL_SPELL = re.compile(r"_(?:spellscroll|Scroll)$", re.I)

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


def game_names(db, sid, wiki_en, wiki_ko):
    """In-game DisplayName in English and Korean; the fallbacks only when the entry has none."""
    r = stats.resolve(db, sid, "DisplayName")
    h = handle_of(r[0]) if r else None
    en = clean(loca.text(h)) if h else ""
    ko = clean(loca.korean(h)[0]) if h else ""
    return {"en": en or wiki_en, "ko": ko or wiki_ko}


def changed(db, vanilla, sid):
    """True when the mod changes any field of sid after `using` resolves."""
    a = {k: v[0] for k, v in stats.all_fields(vanilla, sid).items()}
    b = {k: v[0] for k, v in stats.all_fields(db, sid).items()}
    return a != b


def out_type_is_zone(f):
    return f.get("SpellType") in ("Zone", "Wall") or bool(f.get("Shape"))

def vanilla_list_spells():
    """Spell ids on any vanilla spell list except the scroll lists: class, subclass and feature
    lists (Destructive Wave sits only in "Cleric Tempest Domain 9", Banishing Smite only in
    "Bard Magical Secrets 10"). A later pak's node with the same UUID replaces the earlier one.
    Entries in vanilla stats that are on no such list are dummy data (Alter Self, Arcane Eye;
    Arcane Eye is only on "Wizard spell scroll list")."""
    lists = {}
    for pak in VANILLA_LIST_PAKS:
        text = (UNPACKED / pak / "Lists" / "SpellLists.lsx").read_text(encoding="utf-8-sig")
        for node in re.findall(r'<node id="SpellList">(.*?)</node>', text, re.S):
            a = dict(re.findall(r'id="(\w+)" type="\w+" value="([^"]*)"', node))
            lists[a["UUID"]] = (a.get("Name", ""), a.get("Spells", ""))
    return {sid for name, spells in lists.values() if "scroll" not in name.lower()
            for sid in spells.split(";") if sid}


def in_vanilla(vanilla, listed, sid):
    """sid, or the vanilla container it belongs to, is on a vanilla spell list
    (Target_Smite_Banishing -> SpellContainerID Projectile_Smite_Banishing_Container)."""
    if sid in listed:
        return True
    r = stats.resolve(vanilla, sid, "SpellContainerID") if sid in vanilla else None
    return bool(r and r[0] in listed)


def class_feature_spells(db):
    """id -> [class] for real spells (IsSpell, spends a spell slot) on a class-level feature list."""
    text = SPELL_LISTS_TBL.read_text(encoding="utf-8-sig")
    out = {}
    for obj in stats.OBJ.findall(text):
        fields = {a["name"]: a.get("value", "") for a in
                  (dict(stats.ATTR.findall(f)) for f in stats.FIELD.findall(obj))}
        m = CLASS_FEATURE_LIST.match(fields.get("Name", ""))
        if not m:
            continue
        for sid in filter(None, fields.get("Spells", "").split(";")):
            f = {k: v[0] for k, v in stats.all_fields(db, sid).items()} if sid in db else {}
            if "IsSpell" in f.get("SpellFlags", "") and "SpellSlotsGroup" in f.get("UseCosts", ""):
                out.setdefault(sid, []).append(m.group(1))
    return out


def sangromancy_ids():
    """Spell ids in IsSangromancySpell() (Wizard.khn), the mod's list of blood magic spells."""
    text = WIZARD_KHN.read_text(encoding="utf-8-sig")
    body = text[text.index("function IsSangromancySpell()"):]
    body = body[:body.index("\nend")]
    return set(re.findall(r"SpellId\('([^']+)'\)", body))


def scroll_targets(db):
    """Every entry a scroll spell inherits from. A scroll spell is named *_spellscroll (mod) or
    *_Scroll (vanilla) and `using`s the spell it casts (Target_SearingSmite_spellscroll ->
    Target_Smite_Searing)."""
    out = set()
    for name in db:
        if SCROLL_SPELL.search(name):
            out.update(stats.chain(db, name)[1:])
    return out


def variant_names(db, ids):
    out = []
    for c in ids:
        r = stats.resolve(db, c, "DisplayName")
        out.append({"id": c, "name": game_names(db, c, c, c)} if r else {"id": c, "name": {"en": c, "ko": c}})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    classes = list_spells(base_only=True)
    db = stats.load(include_mod=True)
    vanilla = stats.load(include_mod=False)
    blood = sangromancy_ids()
    scrolls = scroll_targets(db)
    vanilla_spells = vanilla_list_spells()
    for sid, cls in class_feature_spells(db).items():
        classes.setdefault(sid, sorted(cls))

    # Class copies of one spell (Shout_Shield_Sorcerer / _Wizard) share a name and level: merge them.
    groups, missing = {}, []
    for sid in classes:
        if sid not in db:
            missing.append(sid)
            continue
        m = mechanics(db, sid)
        groups.setdefault((m["level"], game_names(db, sid, sid, sid)["en"]), []).append((sid, m))

    spells = []
    for (level, _), cands in groups.items():
        cands.sort(key=lambda c: c[0])
        sid, m = cands[0]
        ids = [s for s, _ in cands]
        related = set(ids) | {c for _, k in cands for c in k["children"]}
        new = not any(in_vanilla(vanilla, vanilla_spells, i) for i in ids)
        revised = not new and any(changed(db, vanilla, i) for i in ids if i in vanilla)
        spells.append({
            "id": sid,
            "ids": ids,
            "level": level,
            "school": m["school"],
            "sangromancy": bool(related & blood),
            "classes": sorted({c for s in ids for c in classes[s]}, key=lambda c: (c == "Artificer", c)),
            "source": "new" if new else ("revised" if revised else "vanilla"),
            "icon": m["icon"],
            "scroll": bool(related & scrolls),
            "name": game_names(db, sid, sid, sid),
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
            "variants": variant_names(db, [c for c in m["children"] if c in db]),
        })
    spells.sort(key=lambda s: (s["level"], s["name"]["en"]))

    print(f"spells {len(spells)} from {len(classes)} base-list entries")
    for sid in missing:
        print("  not in stats:", sid)
    if args.check:
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    built = subprocess.run(["git", "-C", str(REPO), "log", "-1", "--format=%cs %h"],
                           capture_output=True, text=True).stdout.strip()
    OUT.write_text(json.dumps({"generated": built, "spells": spells}, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    copy_icons(spells)
    print(f"wrote {OUT.relative_to(REPO)} ({OUT.stat().st_size // 1024} KB)")


def copy_icons(spells):
    """48px PNGs named by the stat Icon. The wiki keeps those renders of the game icons; a vanilla
    icon it lacks is converted from the unpacked game DDS."""
    ICON_OUT.mkdir(parents=True, exist_ok=True)
    for old in ICON_OUT.glob("*.png"):
        old.unlink()
    for s in spells:
        dst = ICON_OUT / f"{s['icon']}.png"
        png = ICON_PNG / dst.name
        dds = VANILLA_ICON_DDS / f"{s['icon']}.DDS"
        if png.exists():
            shutil.copy2(png, dst)
        elif dds.exists():
            subprocess.run(["magick", str(dds), "-resize", "48x48", str(dst)], check=True)
        else:
            print("  no icon:", s["icon"], s["id"])


if __name__ == "__main__":
    main()
