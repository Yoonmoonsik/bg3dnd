#!/usr/bin/env python
"""Build docs/data/weapons.json from the mod's game data.

  python tools/build_weapon_db.py

  weapons  the weapon types the mod adds (base, +1, +2) and its unique magic weapons: name (RootTemplate
           DisplayName), damage, range, properties, rarity, enchantment, mastery, the passives and
           spells the weapon grants, and where to find it.
Where to find it comes from the mod's own placements, checked by hand against the game data:
  others   the rest of the mod's Weapon.txt (SKIP drops variants, creature and spell weapons), left blank
  general  TreasureTable.txt merges each type into the vanilla ST_Martial*Weapons(_1/_2) tables
           (+1 StartLevel 3, +2 StartLevel 6), which vanilla weapon traders and random loot use
  unique   Levels/*.lsf placements, Equipment.txt sets on level characters, and the
           MOO_BugBearvendor_Trade table
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / ".claude" / "skills" / "bg3-data" / "scripts"))
sys.path.insert(0, str(REPO / "tools"))
import loca      # noqa: E402
import stats     # noqa: E402
import template  # noqa: E402
from build_combat_db import DATA, Data, write  # noqa: E402
from build_feat_db import name_of  # noqa: E402

TYPES = ["WPN_Blunderbuss", "WPN_Musket", "WPN_Pistol", "WPN_Whip"]
LOOT = {
    "ranged": {"en": "Ranged weapon traders and random weapon loot",
               "ko": "원거리 무기 상인과 무작위 무기 전리품"},
    "melee": {"en": "Melee weapon traders and random weapon loot",
              "ko": "근접 무기 상인과 무작위 무기 전리품"},
}
TIER = {1: {"en": " (from level 3)", "ko": " (3레벨부터)"}, 2: {"en": " (from level 6)", "ko": " (6레벨부터)"}}
UNIQUE = {
    "WPN_Blunderbuss_GiantSlayer": {"en": "Moonrise Towers, sold by Lann Tarv",
                                    "ko": "달오름 탑, 란 타브가 판매"},
    "MAG_HolyAvenger": {"en": "Rosymorn Monastery, beside the Lathander prayer spot",
                        "ko": "장밋빛 아침 수도원, 라샌더 기도 장소 옆"},
    "WPN_Musket_LucentDestroyer": {"en": "Crèche Y'llek, in the Blue Jay's Find buried chest",
                                   "ko": "일릭 양성소, '큰어치가 발견한 것' 묻힌 상자"},
    "MAG_MoonSickle": {"en": "Emerald Grove, beside the Sacred Pool where the druids hold their ritual",
                       "ko": "에메랄드 숲, 드루이드가 의식을 치르는 신성한 연못 옆"},
    "WPN_Pistol_Thunderbuss": {"en": "Underdark - Ancient Forge, buried chest near the Animated Armour",
                               "ko": "언더다크 - 고대 용광로, 움직이는 갑옷 근처 묻힌 상자"},
    "MAG_TrueName": {"en": "Shadow-Cursed Lands, equipped by He Who Was",
                     "ko": "그림자 저주에 물든 땅, 소멸된 자가 장착"},
    "MAG_Voltedge": {"en": "Underdark - Arcane Tower, equipped by an Animated Armour",
                     "ko": "언더다크 - 비전의 탑, 움직이는 갑옷이 장착"},
}
# Weapon.txt entries players do not use as their own weapon: variants, creature and spell weapons.
SKIP = re.compile(r"_(Pact|Rusty|B|C|Copy|NoPassives|Makeshift|Gith|Shar|AnimateDead|CelestialSpirit|Druid)$"
                  r"|^WPN_(Goblin|Kuotoa|Imp|Merregon|ShadowBlade|CrimsonLash|FeyBlade|Scimitar_FlameBlade)_?"
                  r"|^(MAG_Infernal_Mace_2|WPN_MagicStaff|WPN_Dart|WPN_Sling|WPN_KingsKnife)$"
                  r"|^WPN_(Pitchfork|ToySword|MinePickaxe|MeatCleaver|Torch|Salami|WhippingCane|Lantern)$")
# Passives every weapon of its kind carries, or that only drive visuals: not listed as effects.
HIDDEN = re.compile(r"^(WeaponMastery|Firearm_|VFX_|HeavyWeapon_)")
PROPS = ["Finesse", "Light", "Heavy", "Reach", "Versatile", "Twohanded", "Ammunition", "Loading", "Magical"]
PROP_NAMES = {"Twohanded": "Two-Handed"}
# Korean names of the weapon properties (Finesse -> "Finesse Weapon", Loading -> 장전, not 불러오는 중).
PROP_HANDLES = {
    "Finesse": "h95e41a96g0bbcg4932gabf4g1fda223a1ee9", "Light": "h5cc9c7e9g048ag43c7g8b08gba53ec2423a2",
    "Heavy": "h5bc7fbd4gfd81g4e6eg94a5g1b655286b07c", "Reach": "ha287aa54g9a53g4c18ga0f4gfeb652a28da4",
    "Versatile": "h3aa10065g9edcg407bg82f8g4c445f4c0ae2", "Twohanded": "hc18aa105g6477g47dcg9962gc0554eda3c77",
    "Ammunition": "hc2a87d26g99e3g40f8gb2cag8145328af515", "Loading": "hff3fef16g4dcbg44e3g8bfbg3b15c27102c5",
    "Magical": "h9da3be37gadf4g4777ga7e6g6ef0c1f907b0",
}
GROUPS = {
    "SimpleMeleeWeapon": {"en": "Simple Melee", "ko": "일반 근접"},
    "MartialMeleeWeapon": {"en": "Martial Melee", "ko": "군용 근접"},
    "SimpleRangedWeapon": {"en": "Simple Ranged", "ko": "일반 원거리"},
    "MartialRangedWeapon": {"en": "Martial Ranged", "ko": "군용 원거리"},
}
RARITY = {
    "Common": {"en": "Common", "ko": "일반"}, "Uncommon": {"en": "Uncommon", "ko": "고급"},
    "Rare": {"en": "Rare", "ko": "희귀"}, "VeryRare": {"en": "Very Rare", "ko": "진귀"},
    "Legendary": {"en": "Legendary", "ko": "전설"},
}


def fields(db, n):
    return {k: v[0] for k, v in stats.all_fields(db, n).items()}


INDEX = None


def template_name(uuid):
    """DisplayName of a RootTemplate, following ParentTemplateId when the template has none."""
    global INDEX
    INDEX = INDEX or template.load_index()
    while uuid in INDEX:
        node = INDEX[uuid][-1][2]
        h = (node.val("DisplayName") or "").split(";")[0]
        if h:
            return {"en": loca.text(h), "ko": loca.korean(h)[0] or loca.text(h)}
        uuid = node.val("ParentTemplateId")
    return None


def prop(d, p):
    ko = re.sub(r"(<|&lt;).*?(>|&gt;)", "", loca.korean(PROP_HANDLES[p])[0])
    return {"en": PROP_NAMES.get(p, p), "ko": ko}


def weapon(d, n, where):
    f = fields(d.db, n)
    name = template_name(f["RootTemplate"])
    plus = re.search(r"WeaponEnchantment\((\d)\)", f.get("DefaultBoosts", ""))
    plus = int(plus.group(1)) if plus else 0
    # WPN_Pistol_1 shares the base template; WPN_Whip_1 has its own named "Whip +1".
    if n.startswith("WPN_") and n.split("_")[-1].isdigit():
        name = {k: v if v.endswith(f"+{plus}") else f"{v} +{plus}" for k, v in name.items()}
    # The weapon type is the plain base entry in the using chain (MAG_Voltedge -> WPN_Shortsword).
    base = next(c for c in stats.chain(d.db, n) if re.fullmatch(r"WPN_[A-Za-z]+", c))
    kind = template_name(fields(d.db, base)["RootTemplate"])
    passives = [p for p in re.split(r"[;,]", f.get("PassivesOnEquip", "")) if p.strip()]
    # Light weapons carry Nick in PassivesOffHand (WPN_Sickle -> MAG_MoonSickle).
    offhand = [p for p in f.get("PassivesOffHand", "").split(";") if p.strip()]
    mastery = next((p for p in passives + offhand if p.startswith("WeaponMastery")), None)
    effects = [name_of(d.db, p) for p in passives + [x for x in f.get("PassivesMainHand", "").split(";") if x]
               if not HIDDEN.match(p)]
    spells = re.findall(r"UnlockSpell\(([^)]+)\)", f.get("Boosts", "") + f.get("BoostsOnEquipMainHand", ""))
    effects += [name_of(d.db, s) for s in spells]
    props = [p for p in PROPS if p in f.get("Weapon Properties", "").split(";")]
    group = f.get("Weapon Group", "")
    return {
        "id": n, "name": name, "unique": n not in (base, base + "_1", base + "_2"),
        "new": n not in stats.load(include_mod=False),
        "kind": kind, "group": GROUPS[group], "melee": "Melee" in group,
        "damage": f["Damage"], "damageType": d.term(f["Damage Type"]),
        "range": None if "Melee" in group else int(f["WeaponRange"]) / 100,
        "props": [prop(d, p) for p in props],
        "rarity": RARITY[f.get("Rarity") or "Common"], "plus": plus,
        "mastery": name_of(d.db, mastery) if mastery else None,
        "effects": effects, "where": where,
    }


def weapons(d):
    out = []
    for t in TYPES:
        loot = LOOT["melee" if t == "WPN_Whip" else "ranged"]
        for i, s in enumerate(("", "_1", "_2")):
            where = {k: v + (TIER[i][k] if i else "") for k, v in loot.items()}
            out.append(weapon(d, t + s, where))
    for n, where in UNIQUE.items():
        out.append(weapon(d, n, where))
    # The rest of the mod's Weapon.txt, where to find left blank for now.
    done = {w["id"] for w in out}
    for n in re.findall(r'^new entry "([^"]+)"', stats.MOD_TXT.joinpath("Weapon.txt").read_text("utf-8-sig"), re.M):
        if n not in done and not n.startswith("__") and not SKIP.search(n):
            out.append(weapon(d, n, {"en": "", "ko": ""}))
    return out


def main():
    write(DATA / "weapons.json", "weapons", weapons(Data()))


if __name__ == "__main__":
    main()
