"use strict";

// The per-level table of a progression (class and subclass features on the class page).
const LEVEL_T = {
  en: {
    level: "Level", content: "Features", spells: "Spells", actions: "Class Actions", learn_cantrip: n => `Learn ${n} cantrip${n > 1 ? "s" : ""}`,
    learn_spell: n => `Learn ${n} spell${n > 1 ? "s" : ""}`, choose: n => `Choose ${n}`,
    skills: n => `${n} skill proficienc${n > 1 ? "ies" : "y"}`, expertise: n => `Expertise in ${n} skill${n > 1 ? "s" : ""}`,
    feat: "Feat", slot: n => `Level ${n} spell slot`, proficiency: "Proficiency", resources: "Resources",
  },
  ko: {
    level: "레벨", content: "내용", spells: "주문", actions: "직업 행동", learn_cantrip: n => `소마법 ${n}개 습득`,
    learn_spell: n => `주문 ${n}개 습득`, choose: n => `${n}개 선택`,
    skills: n => `기술 숙련 ${n}개`, expertise: n => `기술 통달 ${n}개`,
    feat: "재주", slot: n => `${n}레벨 주문 슬롯`, proficiency: "숙련", resources: "자원",
  },
};

// Pages that explain a choice option: passive id -> {href, desc}. The class page fills it from
// fighting_styles.json and weapon_mastery.json.
const PREVIEWS = {};

// scope: the class or subclass id whose option list (under its table) the link jumps to.
function option(o, lang, esc, scope) {
  const L = x => x[lang] || x.en;
  const p = PREVIEWS[o.id];
  if (p) return `<a class="feat-link" href="${p.href}#lang=${lang}&open=${encodeURIComponent(o.id)}">${esc(L(o.name))}`
    + `<span class="tip" role="tooltip">${esc(L(p.desc))}</span></a>`;
  if (!o.desc || !L(o.desc)) return esc(L(o.name));
  const extra = o.extra && L(o.extra) ? `<span class="k">${esc(L(o.extra))}</span>` : "";
  return `<a class="feat-link" href="#" data-jump="${esc(optionAnchor(scope, o.id))}">${esc(L(o.name))}`
    + `<span class="tip" role="tooltip">${extra}${esc(L(o.desc))}</span></a>`;
}
const optionAnchor = (scope, id) => `opt-${scope}-${id}`;

// One level's grants, one HTML string each, led by a chip naming where the item comes from
// (own: the subclass itself, accent-coloured; otherwise the class, muted).
function levelItems(l, lang, esc, chip, own, scope) {
  const t = k => LEVEL_T[lang][k];
  const L = o => o[lang] || o.en;
  const tag = chip ? `<span class="tag ${own ? "own" : "from"}">${esc(chip)}</span> ` : "";
  const spell = x => x.id
    ? `<a class="feat-link" href="spells.html#lang=${lang}&q=${encodeURIComponent(x.name.en)}">${esc(L(x.name))}</a>`
    : esc(L(x.name));
  const res = r => r.slot ? `${t("slot")(r.slot)} +${r.count}` : `${L(r.name)} +${r.count}`;
  return [
    ...l.traits.map(x => `<strong>${esc(L(x.name))}</strong>${L(x.desc) ? ` — ${esc(L(x.desc))}` : ""}`),
    // Granted actions that the spell browser has are spells; the rest (Arcane Recovery) are class actions.
    l.spells.some(x => x.id) ? `${esc(t("spells"))}: ${l.spells.filter(x => x.id).map(spell).join(", ")}` : "",
    l.spells.some(x => !x.id) ? `${esc(t("actions"))}: ${l.spells.filter(x => !x.id).map(spell).join(", ")}` : "",
    ...l.learn.map(x => `${esc(t(x.kind === "cantrip" ? "learn_cantrip" : "learn_spell")(x.count))}`),
    // A named choice ("Choose 1: Eldritch Invocations") folds its options under the name.
    ...l.choices.map(c => c.label
      ? `<details class="choice"><summary>${tag}${esc(t("choose")(c.count))}: ${esc(L(c.label))}</summary>`
        + `${c.options.map(o => option(o, lang, esc, scope)).join(", ")}</details>`
      : `${esc(t("choose")(c.count))}: ${c.options.map(o => option(o, lang, esc, scope)).join(", ")}`),
    l.skills ? `${esc(t("skills")(l.skills))}` : "",
    l.expertise ? `${esc(t("expertise")(l.expertise))}` : "",
    (l.proficiencies || []).length ? `${esc(t("proficiency"))}: ${l.proficiencies.map(x => esc(L(x))).join(", ")}` : "",
    l.feat ? `${esc(t("feat"))}` : "",
    l.resources.length ? `${esc(t("resources"))}: ${esc(l.resources.map(res).join(", "))}` : "",
  ].filter(Boolean).map(x => x.startsWith("<details") ? x : tag + x);
}

// levels: this table's levels, chipped with own (the subclass name) when given. base: {levels, name, id}
// of the class a subclass belongs to; its levels are merged in and chipped with the class name.
// scope: this table's class or subclass id. The table is followed by its named option lists.
function renderLevels(levels, lang, esc, base, own, scope) {
  const t = k => LEVEL_T[lang][k];
  const rows = new Map();
  const add = (l, chip, mine, sc) => {
    const items = levelItems(l, lang, esc, chip, mine, sc);
    if (items.length) rows.set(l.level, [...(rows.get(l.level) || []), ...items]);
  };
  if (base) for (const l of base.levels) add(l, base.name, false, base.id);
  for (const l of levels) add(l, own || null, true, scope);
  // One table row per grant; the level cell spans all rows of its level.
  const body = [...rows.keys()].sort((a, b) => a - b).map(n => rows.get(n).map((item, i) =>
    `<tr${i ? "" : ' class="lv-first"'}>${i ? "" : `<td class="lv-n" rowspan="${rows.get(n).length}">${n}</td>`}<td>${item}</td></tr>`).join("")).join("");
  return `<table class="lv"><thead><tr><th>${esc(t("level"))}</th><th>${esc(t("content"))}</th></tr></thead><tbody>${body}</tbody></table>`
    + optionLists(levels, lang, esc, scope);
}

// Every named choice of a table ("Eldritch Invocations"), once, with all options across its levels:
// name, ExtraDescription (prerequisites or notes) and description.
function optionLists(levels, lang, esc, scope) {
  const L = o => o[lang] || o.en;
  const lists = new Map();
  for (const l of levels) for (const c of l.choices) {
    // Fighting styles and weapon masteries have their own pages (PREVIEWS): not listed here.
    if (!c.label || c.options.every(o => PREVIEWS[o.id])) continue;
    const opts = lists.get(c.label.en) || lists.set(c.label.en, { label: c.label, opts: new Map() }).get(c.label.en);
    for (const o of c.options) opts.opts.set(o.id, o);
  }
  // Each list starts folded; an option link in the table opens it.
  return [...lists.values()].map(x => `<details class="plist-box"><summary class="k">${esc(L(x.label))} (${x.opts.size})</summary><dl class="plist">`
    + [...x.opts.values()].map(o => `<dt id="${esc(optionAnchor(scope, o.id))}">${esc(L(o.name))}</dt><dd>`
      + `${o.extra && L(o.extra) ? `<span class="extra">${esc(L(o.extra))}</span>` : ""}${o.desc ? esc(L(o.desc)) : ""}</dd>`).join("")
    + "</dl></details>").join("");
}
