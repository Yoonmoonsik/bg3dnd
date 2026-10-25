#!/usr/bin/env python
"""Write every spell count and spell list in the mod's docs from docs/data/spells.json, and the
feat count from docs/data/feats.json.

  python tools/sync_spell_docs.py            README lists, meta.lsx and thumbnail spell counts
  python tools/sync_spell_docs.py --slides   slides 08-14 (name lists and big numbers) and their PNGs

spells.json (tools/build_spell_db.py) is the single source for spells; the wiki Spells.md only
links to the spell browser. The git hooks run this on a release: pre-commit for the counts that
ship in meta.lsx, post-commit for the rest (slides follow the meta.lsx commit).
"""
import argparse
import html
import json
import math
import re
import shutil
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
MOD = "DnD2024_897914ef-5c96-053c-44af-0be823f895fe"
DATA = REPO / "docs" / "data" / "spells.json"
FEAT_DATA = REPO / "docs" / "data" / "feats.json"
META = REPO / "Mods" / MOD / "meta.lsx"
THUMB_SVG = REPO / "thumbnail.svg"
THUMB_PNG = REPO / "thumbnail.png"
PROJECT_THUMB = REPO / "Projects" / MOD / "thumbnail.png"
SLIDE_DIR = REPO / "slides"
SLIDES = {0: "08-spells-cantrips.svg", 1: "09-spells-level1.svg", 2: "10-spells-level2.svg",
          3: "11-spells-level3.svg", 4: "12-spells-level4.svg", 5: "13-spells-level5.svg",
          6: "14-spells-level6.svg"}
TOP, BOTTOM, LEFT, RIGHT = 228, 660, 70, 1210
MAX_STEP = 26
README_INTRO = ("The lists below cover every spell in the mod. "
                "The wiki has per-level tables with schools, classes and scrolls.")


def levels():
    spells = json.loads(DATA.read_text(encoding="utf-8"))["spells"]
    out = {lv: [] for lv in SLIDES}
    for s in spells:
        out[s["level"]].append(s["name"]["en"])
    return {lv: sorted(names, key=str.lower) for lv, names in out.items()}


def rewrite(path, fn):
    raw = path.read_bytes()
    bom = raw.startswith(b"\xef\xbb\xbf")
    old = raw.decode("utf-8-sig")
    new = fn(old)
    if new != old:
        path.write_bytes((b"\xef\xbb\xbf" if bom else b"") + new.encode("utf-8"))
        print("updated", path.relative_to(REPO))


def sub_once(pattern, repl, text, label):
    text, n = re.subn(pattern, repl, text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"{label}: pattern not found")
    return text


def readmes(lv):
    lists = {k: ", ".join(v) + "." for k, v in lv.items()}
    styles = {
        "README.md": (r"(### Cantrips\r?\n\r?\n).*?(\r?\n)", lambda n: (f"- Level {n}: ", "\n")),
        "README_Modio.html": (r"(<h3>Cantrips</h3>\r?\n\r?\n<p>).*?(</p>)",
                              lambda n: (f"<li><strong>Level {n}:</strong> ", "</li>")),
        "README_NexusMods.txt": (r"(\[size=4\]\[b\]Cantrips\[/b\]\[/size\]\r?\n\r?\n).*?(\r?\n)",
                                 lambda n: (f"[*][b]Level {n}:[/b] ", "\n")),
    }
    for name, (cantrips, level_line) in styles.items():
        def fix(t, cantrips=cantrips, level_line=level_line, name=name):
            t = sub_once(cantrips, lambda m: m.group(1) + lists[0] + m.group(2), t, f"{name} cantrips")
            for n in range(1, 7):
                pre, post = level_line(n)
                t = sub_once(re.escape(pre) + r"[^\n]*?" + re.escape(post),
                             lambda m, pre=pre, post=post, n=n: pre + lists[n] + post, t, f"{name} level {n}")
            return t
        rewrite(REPO / name, fix)


def counts(total, feats):
    rewrite(META, lambda t: sub_once(r"(\d+)( spells,)", lambda m: f"{total}{m.group(2)}", t, "meta.lsx"))
    rewrite(META, lambda t: sub_once(r"(\d+)( feats)", lambda m: f"{feats}{m.group(2)}", t, "meta.lsx feats"))
    before = THUMB_SVG.read_text(encoding="utf-8")
    rewrite(THUMB_SVG, lambda t: sub_once(r">\d+(</text>\s*<text[^>]*>Spells</text>)",
                                          lambda m: f">{total}{m.group(1)}", t, "thumbnail.svg"))
    rewrite(THUMB_SVG, lambda t: sub_once(r">\d+(</text>\s*<text[^>]*>Feats</text>)",
                                          lambda m: f">{feats}{m.group(1)}", t, "thumbnail.svg feats"))
    if THUMB_SVG.read_text(encoding="utf-8") != before:
        subprocess.run(["magick", "-density", "144", "-background", "none", str(THUMB_SVG), str(THUMB_PNG)],
                       check=True)
        shutil.copy2(THUMB_PNG, PROJECT_THUMB)
        print("rendered thumbnail.png and copied it to", PROJECT_THUMB.relative_to(REPO))


FEAT_NAME = re.compile(r'  <text x="([\d.]+)" y="[\d.]+" font-family="Arial, Helvetica, sans-serif" '
                       r'font-size="14\.5" fill="#e8dcc0">[^<]*</text>\n')


def feat_slide(names):
    """Slide 06: the big number and the name columns follow feats.json. The columns keep their x
    positions; names run top to bottom, 17px apart from y 232."""
    p = SLIDE_DIR / "svg" / "06-feats.svg"
    svg = p.read_text(encoding="utf-8")
    xs = sorted({float(x) for x in FEAT_NAME.findall(svg)})
    rows = math.ceil(len(names) / len(xs))
    lines = "".join(f'  <text x="{xs[i // rows]:.1f}" y="{232 + (i % rows) * 17:.1f}" '
                    f'font-family="Arial, Helvetica, sans-serif" font-size="14.5" fill="#e8dcc0">'
                    f'{html.escape(n, quote=False)}</text>\n' for i, n in enumerate(names))
    first = FEAT_NAME.search(svg).start()
    new = svg[:first] + lines + FEAT_NAME.sub("", svg[first:])
    new = re.sub(r'(font-size="80" font-weight="800" fill="url\(#goldGrad\)">)\d+(</text>)',
                 r"\g<1>%d\g<2>" % len(names), new, count=1)
    if new != svg:
        p.write_text(new, encoding="utf-8", newline="\n")
        png = SLIDE_DIR / "png" / "06-feats.png"
        subprocess.run(["magick", "-density", "144", "-background", "none", str(p), str(png)], check=True)
        print("updated", p.relative_to(REPO), "and", png.relative_to(REPO))


def slides(lv):
    for level, fname in SLIDES.items():
        names = lv[level]
        p = SLIDE_DIR / "svg" / fname
        svg = p.read_text(encoding="utf-8")
        head, sep, _ = svg.partition('stroke-width="1.5"/>\n')
        assert sep, fname
        head = re.sub(r'(font-size="80" font-weight="800" fill="url\(#goldGrad\)">)\d+(</text>)',
                      r"\g<1>%d\g<2>" % len(names), head)
        title = "cantrips" if level == 0 else f"level {level} spells"
        head = re.sub(r'(y="160" text-anchor="end"[^>]*>)[^<]*(<)', lambda m: m.group(1) + "total " + title + m.group(2), head)
        if level:
            head = re.sub(r'(font-size="17" font-weight="600" fill="#9089a8">)[^<]*through[^<]*(</text>)',
                          lambda m: m.group(1) + html.escape(f"{names[0]} through {names[-1]} — every level {level} "
                                                             "spell on the class spell lists.", quote=False)
                          + m.group(2), head)
        cols = max(3, math.ceil(len(names) / ((BOTTOM - TOP) // 22 + 1)))
        rows = math.ceil(len(names) / cols)
        step = min(MAX_STEP, (BOTTOM - TOP) / max(rows - 1, 1))
        width = (RIGHT - LEFT) / cols
        body = ['<text x="%.0f" y="%.0f" font-family="Arial, Helvetica, sans-serif" font-size="15" '
                'font-weight="700" fill="#e8b84b">%s</text>' % (LEFT + (i // rows) * width, TOP + (i % rows) * step,
                                                                html.escape(n, quote=False))
                for i, n in enumerate(names)]
        new = head + sep + "\n".join(body) + "\n</svg>\n"
        if new != svg:
            p.write_text(new, encoding="utf-8", newline="\n")
            png = SLIDE_DIR / "png" / fname.replace(".svg", ".png")
            subprocess.run(["magick", "-density", "144", "-background", "none", str(p), str(png)], check=True)
            print("updated", p.relative_to(REPO), "and", png.relative_to(REPO))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slides", action="store_true")
    args = ap.parse_args()
    lv = levels()
    feat_names = sorted((f["name"]["en"] for f in json.loads(FEAT_DATA.read_text(encoding="utf-8"))["feats"]),
                        key=str.lower)
    if args.slides:
        slides(lv)
        feat_slide(feat_names)
        return
    readmes(lv)
    counts(sum(len(v) for v in lv.values()), len(feat_names))


if __name__ == "__main__":
    main()
