"use strict";

// The per-level list of a progression table (class and subclass features on the class page).
const LEVEL_T = {
  en: {
    level: n => `Level ${n}`, spells: "Spells", learn_cantrip: n => `Learn ${n} cantrip${n > 1 ? "s" : ""}`,
    learn_spell: n => `Learn ${n} spell${n > 1 ? "s" : ""}`, choose: n => `Choose ${n}`,
    skills: n => `${n} skill proficienc${n > 1 ? "ies" : "y"}`, expertise: n => `Expertise in ${n} skill${n > 1 ? "s" : ""}`,
    feat: "Feat", slot: n => `Level ${n} spell slot`,
  },
  ko: {
    level: n => `${n}레벨`, spells: "주문", learn_cantrip: n => `소마법 ${n}개 습득`,
    learn_spell: n => `주문 ${n}개 습득`, choose: n => `${n}개 선택`,
    skills: n => `기술 숙련 ${n}개`, expertise: n => `기술 통달 ${n}개`,
    feat: "재주", slot: n => `${n}레벨 주문 슬롯`,
  },
};

function renderLevels(levels, lang, esc) {
  const t = k => LEVEL_T[lang][k];
  const L = o => o[lang] || o.en;
  const spell = x => x.id
    ? `<a class="feat-link" href="spells.html#lang=${lang}&q=${encodeURIComponent(x.name.en)}">${esc(L(x.name))}</a>`
    : esc(L(x.name));
  const res = r => r.slot ? `${t("slot")(r.slot)} +${r.count}` : `${L(r.name)} +${r.count}`;
  return levels.map(l => {
    const items = [
      ...l.traits.map(x => `<li><strong>${esc(L(x.name))}</strong>${L(x.desc) ? ` — ${esc(L(x.desc))}` : ""}</li>`),
      l.spells.length ? `<li>${esc(t("spells"))}: ${l.spells.map(spell).join(", ")}</li>` : "",
      ...l.learn.map(x => `<li>${esc(t(x.kind === "cantrip" ? "learn_cantrip" : "learn_spell")(x.count))}</li>`),
      ...l.choices.map(c => `<li>${esc(t("choose")(c.count))}: ${c.options.map(o => esc(L(o))).join(", ")}</li>`),
      l.skills ? `<li>${esc(t("skills")(l.skills))}</li>` : "",
      l.expertise ? `<li>${esc(t("expertise")(l.expertise))}</li>` : "",
      l.feat ? `<li>${esc(t("feat"))}</li>` : "",
      l.resources.length ? `<li>${esc(l.resources.map(res).join(", "))}</li>` : "",
    ].join("");
    return `<div class="k">${esc(t("level")(l.level))}</div><ul>${items}</ul>`;
  }).join("");
}
