"use strict";

const T = {
  en: {
    title: "Species", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod",
    nav_home: "Home", nav_backgrounds: "Backgrounds", nav_builder: "Build Simulator", nav_classes: "Classes", nav_feats: "Feats", nav_fighting: "Fighting Styles", nav_mastery: "Weapon Mastery", nav_weapons: "Weapons", nav_rules: "Rules", nav_species: "Species", nav_spells: "Spells",
    search: "Search species by name, trait or spell", filters: "Filters", reset: "Reset",
    col_name: "Name", col_parent: "Parent Species", col_speed: "Speed", col_darkvision: "Darkvision", col_spells: "Spells",
    empty: "No species match these filters.", footer: "Generated from the mod's game data.",
    count: (n, all) => `${n} of ${all} species`,
    f_parent: "Parent Species", f_darkvision: "Darkvision", f_spells: "Species Spells", f_traits: "Traits",
    f_source: "Source", none: "None", own: "Own species", has_spells: "Has spells", spell_level: n => `Level ${n}`,
    resistance: "Resistance", skills: "Skill proficiency", choices: "Choice of traits",
    new: "New", revised: "Revised", vanilla: "Unchanged",
    human_note: "In character creation, this species is selectable as a Human subrace.", male: "male", female: "female",
    d_level: n => `Level ${n}`, d_spells: "Spells", d_actions: "Actions", d_action: "Action:", d_choose: (n, k) => `Choose ${n} ${k}`,
    k_spell: "spell", k_trait: "trait", d_parents: "Parent species", d_resist: "Resistances", d_uses: "Limited uses",
    d_skills: n => `${n} skill proficiencies`, long: "per Long Rest", short: "per Short Rest",
  },
  ko: {
    title: "종족", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드",
    nav_home: "홈", nav_backgrounds: "배경", nav_builder: "빌드 시뮬레이터", nav_classes: "직업", nav_feats: "재주", nav_fighting: "전투 방식", nav_mastery: "무기 숙련술", nav_weapons: "무기", nav_rules: "규칙", nav_species: "종족", nav_spells: "주문",
    search: "종족 이름, 특성, 주문으로 검색", filters: "필터", reset: "초기화",
    col_name: "이름", col_parent: "상위 종족", col_speed: "이동 속도", col_darkvision: "암시야", col_spells: "주문",
    empty: "조건에 맞는 종족이 없습니다.", footer: "모드 게임 데이터에서 생성했습니다.",
    count: (n, all) => `종족 ${all}종 중 ${n}종`,
    f_parent: "상위 종족", f_darkvision: "암시야", f_spells: "종족 주문", f_traits: "특성",
    f_source: "구분", none: "없음", own: "독립 종족", has_spells: "주문 있음", spell_level: n => `${n}레벨`,
    resistance: "저항", skills: "기술 숙련", choices: "특성 선택",
    new: "새 종족", revised: "개정", vanilla: "변경 없음",
    human_note: "캐릭터 생성에서 인간의 하위 종족으로서 선택할 수 있습니다.", male: "남성", female: "여성",
    d_level: n => `${n}레벨`, d_spells: "주문", d_actions: "행동", d_action: "행동:", d_choose: (n, k) => `${k} ${n}개 선택`,
    k_spell: "주문", k_trait: "특성", d_parents: "상위 종족", d_resist: "저항", d_uses: "횟수 제한",
    d_skills: n => `기술 숙련 ${n}개`, long: "긴 휴식마다", short: "짧은 휴식마다",
  },
};

const DAMAGE_KO = { Acid: "산성", Cold: "냉기", Fire: "화염", Lightning: "번개", Necrotic: "사령", Poison: "독",
  Psychic: "정신", Radiant: "광휘", Thunder: "천둥", Force: "역장" };

const state = { lang: "en", q: "", sel: {}, dir: 1, open: null };
let SPECIES = [];
let FILTERS = [];

const $ = s => document.querySelector(s);
const t = k => T[state.lang][k] ?? k;
const L = o => o[state.lang] || o.en;
const dmg = d => state.lang === "ko" ? DAMAGE_KO[d] || d : d;
const spells = s => s.levels.flatMap(l => l.spells);
const parentKey = s => s.parent ? s.parent.en : "own";

function esc(x) {
  return String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Filter values come from the data; values in one group are OR-ed, groups are AND-ed.
function buildFilters() {
  const parents = new Map();
  for (const s of SPECIES) if (s.parent) parents.set(s.parent.en, s.parent);
  const darks = [...new Set(SPECIES.map(s => s.darkvision))].sort((a, b) => a - b);
  const levels = [...new Set(SPECIES.flatMap(s => s.levels.filter(l => l.spells.length).map(l => l.level)))].sort((a, b) => a - b);
  FILTERS = [
    { key: "parent", label: "f_parent", values: [...[...parents.keys()].sort(), "own"],
      text: v => v === "own" ? t("own") : L(parents.get(v)), test: (s, v) => parentKey(s) === v },
    { key: "darkvision", label: "f_darkvision", values: darks.map(String),
      text: v => v === "0" ? t("none") : `${v}m`, test: (s, v) => String(s.darkvision) === v },
    { key: "spells", label: "f_spells", values: ["any", ...levels.map(String)],
      text: v => v === "any" ? t("has_spells") : t("spell_level")(v),
      test: (s, v) => v === "any" ? spells(s).length > 0 : s.levels.some(l => String(l.level) === v && l.spells.length) },
    { key: "traits", label: "f_traits", values: ["resistance", "skills", "choices"], text: v => t(v),
      test: (s, v) => v === "resistance" ? s.resistances.length > 0 : v === "skills" ? s.skills > 0
        : s.levels.some(l => l.choices.length) },
    { key: "source", label: "f_source", values: ["new", "revised", "vanilla"], text: v => t(v),
      test: (s, v) => s.source === v },
  ];
}

function matches(s) {
  if (state.q) {
    const q = state.q.toLowerCase();
    const hay = [s.name.en, s.name.ko, s.desc.en, s.desc.ko, ...s.levels.flatMap(l => [
      ...l.traits.flatMap(x => [x.name.en, x.name.ko]), ...l.spells.flatMap(x => [x.name.en, x.name.ko]),
      ...l.actions.flatMap(x => [x.name.en, x.name.ko])])].join("\n").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  for (const f of FILTERS) {
    const sel = state.sel[f.key];
    if (sel && sel.size && ![...sel].some(v => f.test(s, v))) return false;
  }
  return true;
}

function renderFilters() {
  $("#filters").innerHTML = FILTERS.map(f => `
    <div class="fgroup">
      <div class="label">${esc(t(f.label))}</div>
      <div class="chips">${f.values.map(v => {
        const on = state.sel[f.key] && state.sel[f.key].has(v);
        return `<button type="button" class="chip" data-f="${f.key}" data-v="${esc(v)}" aria-pressed="${!!on}">${esc(f.text(v))}</button>`;
      }).join("")}</div>
    </div>`).join("");
}

function spellItem(x) {
  return x.id ? `<a class="feat-link" href="spells.html#lang=${state.lang}&q=${encodeURIComponent(x.name.en)}">${esc(L(x.name))}</a>`
    : esc(L(x.name));
}

function detail(s) {
  const facts = [
    s.parents.length && [t("d_parents"), s.parents.map(L).join(", ")],
    s.resistances.length && [t("d_resist"), s.resistances.map(dmg).join(", ")],
    s.skills && [t("skills"), t("d_skills")(s.skills)],
    s.uses.length && [t("d_uses"), s.uses.map(t).join(", ")],
  ].filter(Boolean);
  const levels = s.levels.map(l => {
    const items = [
      ...l.traits.map(x => `<li><strong>${esc(L(x.name))}</strong>${L(x.desc) ? ` — ${esc(L(x.desc))}` : ""}</li>`),
      l.spells.length ? `<li>${esc(t("d_spells"))}: ${l.spells.map(spellItem).join(", ")}</li>` : "",
      ...l.actions.map(x => `<li>${esc(t("d_action"))} <strong>${esc(L(x.name))}</strong>${x.desc && L(x.desc) ? ` — ${esc(L(x.desc))}` : ""}</li>`),
      ...l.choices.map(c => `<li>${esc(t("d_choose")(c.count, t("k_" + c.kind)))}: ${c.options.map(o => c.kind === "spell" ? spellItem(o) : esc(L(o.name))).join(", ")}</li>`),
    ].join("");
    return `<div class="k">${esc(t("d_level")(l.level))}</div><ul>${items}</ul>`;
  }).join("");
  return `<tr class="detail"><td colspan="5">
    ${facts.length ? `<div class="grid">${facts.map(([k, v]) => `<div><div class="k">${esc(k)}</div>${esc(v)}</div>`).join("")}</div>` : ""}
    ${s.portrait ? `<div class="portraits">${["Male", "Female"].map(x =>
      `<img src="portraits/Race_${esc(s.portrait)}_${x}.png" alt="${esc(L(s.name))} ${x === "Male" ? t("male") : t("female")}" width="150" height="150" loading="lazy">`).join("")}</div>` : ""}
    ${s.human_subrace ? `<p class="note">${esc(t("human_note"))}</p>` : ""}
    ${L(s.desc) ? `<p>${esc(L(s.desc))}</p>` : ""}
    ${levels}
  </td></tr>`;
}

function renderTable() {
  const rows = SPECIES.filter(matches).sort((a, b) => state.dir * L(a.name).localeCompare(L(b.name)));
  $("#count").textContent = t("count")(rows.length, SPECIES.length);
  $("#empty").hidden = rows.length > 0;
  document.querySelector('th[data-sort="name"]').setAttribute("aria-sort", state.dir > 0 ? "ascending" : "descending");
  $("#species tbody").innerHTML = rows.map(s => {
    const open = state.open === s.id;
    const tags = [
      s.source !== "vanilla" ? `<span class="tag ${s.source}">${esc(t(s.source))}</span>` : "",
    ].join("");
    const tag = tags ? `<span class="tags">${tags}</span>` : "";
    const row = `<tr class="row" data-id="${esc(s.id)}" aria-expanded="${open}">
      <td><strong>${esc(L(s.name))}</strong>${tag}</td>
      <td class="hide-sm">${esc(s.parent ? L(s.parent) : s.parents.length ? s.parents.map(L).join(", ") : "—")}</td>
      <td>${esc(s.speed)}m</td>
      <td class="hide-sm">${s.darkvision ? esc(s.darkvision) + "m" : "—"}</td>
      <td class="hide-md">${spells(s).length || "—"}</td>
    </tr>`;
    return open ? row + detail(s) : row;
  }).join("");
}

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll(".lang button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === state.lang));
  // Menu order follows the shown language: Home first, then the page names sorted (abc / 가나다).
  const nav = document.querySelector("nav.pages");
  if (nav) {
    const links = [...nav.querySelectorAll("a")];
    const rest = links.filter(a => a.dataset.i18n !== "nav_home")
      .sort((a, b) => a.textContent.localeCompare(b.textContent, state.lang));
    [...links.filter(a => a.dataset.i18n === "nav_home"), ...rest].forEach(a => nav.appendChild(a));
    nav.appendChild(nav.querySelector("[data-i18n=nav_builder]")); // Build Simulator is a tool, not a lookup: last
  }
  document.querySelectorAll("nav.pages a").forEach(a => {
    a.href = a.getAttribute("href").split("#")[0] + "#lang=" + state.lang;
  });
  document.title = `${t("title")} · D&D 5.5e All-in-One BEYOND`;
}

// Filters live in the URL hash so a search can be shared: #lang=ko&darkvision=24
function writeHash() {
  const p = new URLSearchParams();
  p.set("lang", state.lang);
  if (state.q) p.set("q", state.q);
  for (const [k, v] of Object.entries(state.sel)) if (v.size) p.set(k, [...v].join(","));
  if (state.dir !== 1) p.set("sort", "-name");
  if (state.open) p.set("open", state.open);
  history.replaceState(null, "", "#" + p.toString());
  applyLang();
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  let lang = p.get("lang");
  if (!lang) {
    try { lang = localStorage.getItem("bg3dnd-lang"); } catch (e) { /* storage blocked */ }
  }
  if (!lang) lang = (navigator.language || "").startsWith("ko") ? "ko" : "en";
  state.lang = T[lang] ? lang : "en";
  state.q = p.get("q") || "";
  state.sel = {};
  for (const f of FILTERS) {
    const v = p.get(f.key);
    if (v) state.sel[f.key] = new Set(v.split(","));
  }
  state.dir = p.get("sort") === "-name" ? -1 : 1;
  state.open = p.get("open") || state.open;
}

function render() { renderFilters(); renderTable(); writeHash(); }

function bind() {
  window.addEventListener("hashchange", () => { readHash(); $("#q").value = state.q; render(); });
  $("#q").addEventListener("input", e => { state.q = e.target.value.trim(); renderTable(); writeHash(); });
  $("#filters").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const set = state.sel[b.dataset.f] || (state.sel[b.dataset.f] = new Set());
    set.has(b.dataset.v) ? set.delete(b.dataset.v) : set.add(b.dataset.v);
    b.setAttribute("aria-pressed", set.has(b.dataset.v));
    renderTable(); writeHash();
  });
  document.querySelector('th[data-sort="name"]').addEventListener("click", () => {
    state.dir = -state.dir; renderTable(); writeHash();
  });
  $("#species tbody").addEventListener("click", e => {
    if (e.target.closest("a")) return;
    const tr = e.target.closest("tr.row");
    if (!tr) return;
    state.open = state.open === tr.dataset.id ? null : tr.dataset.id;
    renderTable();
  });
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => {
    state.lang = b.dataset.lang;
    try { localStorage.setItem("bg3dnd-lang", state.lang); } catch (e) { /* storage blocked */ }
    render();
  }));
  $("#reset").addEventListener("click", () => { state.q = ""; state.sel = {}; $("#q").value = ""; render(); });
  $("#toggle-filters").addEventListener("click", e => {
    const box = $("#filters");
    box.hidden = !box.hidden;
    e.currentTarget.setAttribute("aria-expanded", !box.hidden);
  });
}

fetch("data/species.json")
  .then(r => r.json())
  .then(d => {
    SPECIES = d.species;
    buildFilters();
    readHash();
    $("#q").value = state.q;
    bind();
    render();
    // #open=<id> (shared links, site search) expands that row; scroll to it once.
    const row = [...document.querySelectorAll("tr.row")].find(r => r.dataset.id === state.open);
    if (row) row.scrollIntoView({ block: "center" });
    if (d.generated) $("#generated").textContent = "· " + d.generated;
  });
