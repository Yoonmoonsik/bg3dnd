"use strict";

// The per-level table of a progression (class and subclass features on the class page).
const LEVEL_T = {
  en: {
    level: "Level", content: "Features", spells: "Spells", learn_cantrip: n => `Learn ${n} cantrip${n > 1 ? "s" : ""}`,
    learn_spell: n => `Learn ${n} spell${n > 1 ? "s" : ""}`, choose: n => `Choose ${n}`,
    skills: n => `${n} skill proficienc${n > 1 ? "ies" : "y"}`, expertise: n => `Expertise in ${n} skill${n > 1 ? "s" : ""}`,
    feat: "Feat", slot: n => `Level ${n} spell slot`, proficiency: "Proficiency",
  },
  ko: {
    level: "레벨", content: "내용", spells: "주문", learn_cantrip: n => `소마법 ${n}개 습득`,
    learn_spell: n => `주문 ${n}개 습득`, choose: n => `${n}개 선택`,
    skills: n => `기술 숙련 ${n}개`, expertise: n => `기술 통달 ${n}개`,
    feat: "재주", slot: n => `${n}레벨 주문 슬롯`, proficiency: "숙련",
  },
};

// Pages that explain a choice option: passive id -> {href, desc}. The class page fills it from
// fighting_styles.json and weapon_mastery.json.
const PREVIEWS = {};

function option(o, lang, esc) {
  const L = x => x[lang] || x.en;
  const p = PREVIEWS[o.id];
  if (!p) return esc(L(o.name));
  return `<a class="feat-link" href="${p.href}#lang=${lang}&open=${encodeURIComponent(o.id)}">${esc(L(o.name))}`
    + `<span class="tip" role="tooltip">${esc(L(p.desc))}</span></a>`;
}

// One level's grants, one HTML string each; chip marks items that come from another table (the class).
function levelItems(l, lang, esc, chip) {
  const t = k => LEVEL_T[lang][k];
  const L = o => o[lang] || o.en;
  const tag = chip ? ` <span class="tag from">${esc(chip)}</span>` : "";
  const spell = x => x.id
    ? `<a class="feat-link" href="spells.html#lang=${lang}&q=${encodeURIComponent(x.name.en)}">${esc(L(x.name))}</a>`
    : esc(L(x.name));
  const res = r => r.slot ? `${t("slot")(r.slot)} +${r.count}` : `${L(r.name)} +${r.count}`;
  return [
    ...l.traits.map(x => `<strong>${esc(L(x.name))}</strong>${tag}${L(x.desc) ? ` — ${esc(L(x.desc))}` : ""}`),
    l.spells.length ? `${esc(t("spells"))}: ${l.spells.map(spell).join(", ")}${tag}` : "",
    ...l.learn.map(x => `${esc(t(x.kind === "cantrip" ? "learn_cantrip" : "learn_spell")(x.count))}${tag}`),
    // A named choice ("Choose 1: Eldritch Invocations") folds its options under the name.
    ...l.choices.map(c => c.label
      ? `<details class="choice"><summary>${esc(t("choose")(c.count))}: ${esc(L(c.label))}${tag}</summary>`
        + `${c.options.map(o => option(o, lang, esc)).join(", ")}</details>`
      : `${esc(t("choose")(c.count))}: ${c.options.map(o => option(o, lang, esc)).join(", ")}${tag}`),
    l.skills ? `${esc(t("skills")(l.skills))}${tag}` : "",
    l.expertise ? `${esc(t("expertise")(l.expertise))}${tag}` : "",
    (l.proficiencies || []).length ? `${esc(t("proficiency"))}: ${l.proficiencies.map(x => esc(L(x))).join(", ")}${tag}` : "",
    l.feat ? `${esc(t("feat"))}${tag}` : "",
    l.resources.length ? `${esc(l.resources.map(res).join(", "))}${tag}` : "",
  ].filter(Boolean);
}

// levels: this table's levels. base: {levels, name} of the class a subclass belongs to; its
// levels are merged in and chipped with the class name.
function renderLevels(levels, lang, esc, base) {
  const t = k => LEVEL_T[lang][k];
  const rows = new Map();
  const add = (l, chip) => {
    const items = levelItems(l, lang, esc, chip);
    if (items.length) rows.set(l.level, [...(rows.get(l.level) || []), ...items]);
  };
  if (base) for (const l of base.levels) add(l, base.name);
  for (const l of levels) add(l, null);
  // One table row per grant; the level cell spans all rows of its level.
  const body = [...rows.keys()].sort((a, b) => a - b).map(n => rows.get(n).map((item, i) =>
    `<tr${i ? "" : ' class="lv-first"'}>${i ? "" : `<td class="lv-n" rowspan="${rows.get(n).length}">${n}</td>`}<td>${item}</td></tr>`).join("")).join("");
  return `<table class="lv"><thead><tr><th>${esc(t("level"))}</th><th>${esc(t("content"))}</th></tr></thead><tbody>${body}</tbody></table>`;
}
