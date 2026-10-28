"use strict";

const T = {
  en: {
    title: "Weapons", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod",
    nav_home: "Home", nav_backgrounds: "Backgrounds", nav_builder: "Build Simulator", nav_classes: "Classes", nav_feats: "Feats", nav_fighting: "Fighting Styles",
    nav_rules: "Rules", nav_species: "Species", nav_spells: "Spells", nav_mastery: "Weapon Mastery", nav_weapons: "Weapons",
    search: "Search weapons by name, type or location", filters: "Filters", reset: "Reset",
    col_name: "Name", col_kind: "Type", col_damage: "Damage", col_where: "Where to find",
    empty: "No weapons match these filters.", footer: "Generated from the mod's game data.",
    count: (n, all) => `${n} of ${all} weapons`,
    f_category: "Unique", general: "Not unique", unique: "Unique",
    f_src: "Source", mod: "Added by the mod", vanilla: "Vanilla",
    f_kind: "Weapon type", f_prof: "Proficiency", f_rng: "Range", f_mastery: "Mastery", none: "None", f_plus: "Enchantment", f_rarity: "Rarity", enchant: "Enchantment",
    prof: "Proficiency", rng: "Range", range: "Range", props: "Properties", rarity: "Rarity", mastery: "Mastery", effects: "Effects",
    simpleWeaponTip: "Simple weapons are treated as something all characters are proficient in.",
    m: n => `${n}m`,
  },
  ko: {
    title: "무기", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드",
    nav_home: "홈", nav_backgrounds: "배경", nav_builder: "빌드 시뮬레이터", nav_classes: "직업", nav_feats: "재주", nav_fighting: "전투 방식",
    nav_rules: "규칙", nav_species: "종족", nav_spells: "주문", nav_mastery: "무기 숙련술", nav_weapons: "무기",
    search: "무기 이름, 종류, 얻는 곳으로 검색", filters: "필터", reset: "초기화",
    col_name: "이름", col_kind: "종류", col_damage: "피해", col_where: "얻는 곳",
    empty: "조건에 맞는 무기가 없습니다.", footer: "모드 게임 데이터에서 생성했습니다.",
    count: (n, all) => `무기 ${all}종 중 ${n}종`,
    f_category: "고유 여부", general: "고유 아님", unique: "고유",
    f_src: "출처", mod: "모드 추가", vanilla: "바닐라",
    f_kind: "무기 종류", f_prof: "숙련", f_rng: "범위", f_mastery: "숙련술", none: "없음", f_plus: "강화", f_rarity: "등급", enchant: "강화",
    prof: "숙련", rng: "범위", range: "사거리", props: "속성", rarity: "등급", mastery: "숙련술", effects: "효과",
    simpleWeaponTip: "일반 무기는 모든 캐릭터가 숙련된 것으로 취급됩니다.",
    m: n => `${n}m`,
  },
};

const state = { lang: "en", q: "", src: new Set(), cat: new Set(), kind: new Set(), mas: new Set(), plus: new Set(), rar: new Set(), prof: new Set(), rng: new Set(), open: null };
let WEAPONS = [];
let PROFICIENCIES = [];
const RANGES = [{ en: "Melee", ko: "근접" }, { en: "Ranged", ko: "원거리" }];
let KINDS = [];
let MASTERIES = [];
let PLUSES = [];
let RARITIES = [];
let MASTERY = new Map();  // English name -> weapon_mastery.json entry

const $ = s => document.querySelector(s);
const t = k => T[state.lang][k] ?? k;
const L = o => (o ? o[state.lang] || o.en : "");
const esc = x => String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cat = w => (w.unique ? "unique" : "general");
const src = w => (w.new ? "mod" : "vanilla");
const plus = w => (w.plus ? `+${w.plus}` : "—");
const mas = w => (w.mastery ? w.mastery.en : "none");
// Simple weapons are a universal proficiency: every character has them, so flag them for the tooltip.
const isSimple = w => w.proficiency.en === "Simple";
const rng = w => (w.melee ? "Melee" : "Ranged");
// Item frame colors from the game's rarityFrame_*_front textures; Common has no frame color.
const RARITY_COLOR = { Uncommon: "#01bd39", Rare: "#01bfff", "Very Rare": "#d1017b", Legendary: "#e7b64d" };
const tint = r => (RARITY_COLOR[r.en] ? ` class="rarity" style="--rarity:${RARITY_COLOR[r.en]}"` : "");
// Mastery name linking to its row on the Weapon Mastery page, with the description on hover.
function masteryLink(w) {
  if (!w.mastery) return "—";
  const m = MASTERY.get(w.mastery.en);
  if (!m) return esc(L(w.mastery));
  const href = `weapon-mastery.html#lang=${state.lang}&open=${encodeURIComponent(m.id)}`;
  return `<a class="mastery tip-host" href="${href}">${esc(L(w.mastery))}<span class="tip">${esc(L(m.desc))}</span></a>`;
}
// Damage type colors from the game's GenericIcon_DamageType_* icons (glow average); physical types stay uncolored.
const DAMAGE_COLOR = {
  Acid: "#eff25c", Cold: "#33c4e7", Fire: "#e17528", Force: "#df7072", Lightning: "#5389e6", Necrotic: "#4fbf79",
  Poison: "#bfdd4c", Psychic: "#c657ac", Radiant: "#dcc154", Thunder: "#ac73c7",
};
const damageCell = w => `${esc(w.damage)} ${DAMAGE_COLOR[w.damageType.en]
  ? `<span class="dmg" style="--dmg:${DAMAGE_COLOR[w.damageType.en]}">${esc(L(w.damageType))}</span>` : esc(L(w.damageType))}`;

function matches(w) {
  if (state.q) {
    const q = state.q.toLowerCase();
    const text = [w.name, w.kind, w.where, w.damageType].flatMap(o => [o.en, o.ko]).join("\n").toLowerCase();
    if (!text.includes(q)) return false;
  }
  if (state.src.size && !state.src.has(src(w))) return false;
  if (state.cat.size && !state.cat.has(cat(w))) return false;
  if (state.mas.size && !state.mas.has(mas(w))) return false;
  if (state.plus.size && !state.plus.has(String(w.plus))) return false;
  if (state.rar.size && !state.rar.has(w.rarity.en)) return false;
  if (state.kind.size && !state.kind.has(w.kind.en)) return false;
  if (state.prof.size && !state.prof.has(w.proficiency.en)) return false;
  if (state.rng.size && !state.rng.has(rng(w))) return false;
  return true;
}

function chip(v, label, sel, tipText) {
  const tip = tipText ? `<span class="tip">${esc(tipText)}</span>` : "";
  return `<button type="button" class="chip${tipText ? " tip-host" : ""}" data-v="${esc(v)}" aria-pressed="${sel.has(v)}">${esc(label)}${tip}</button>`;
}
function renderFilters() {
  const byName = list => [...list].sort((a, b) => L(a).localeCompare(L(b), state.lang));
  $("#filters").innerHTML =
    `<div class="fgroup" data-f="src"><div class="label">${esc(t("f_src"))}</div><div class="chips">${
      ["mod", "vanilla"].map(c => chip(c, t(c), state.src)).join("")}</div></div>` +
    `<div class="fgroup" data-f="cat"><div class="label">${esc(t("f_category"))}</div><div class="chips">${
      ["general", "unique"].map(c => chip(c, t(c), state.cat)).join("")}</div></div>` +
    `<div class="fgroup" data-f="kind"><div class="label">${esc(t("f_kind"))}</div><div class="chips">${
      byName(KINDS).map(k => chip(k.en, L(k), state.kind)).join("")}</div></div>` +
    `<div class="fgroup" data-f="prof"><div class="label">${esc(t("f_prof"))}</div><div class="chips">${
      PROFICIENCIES.map(p => chip(p.en, L(p), state.prof, p.en === "Simple" ? t("simpleWeaponTip") : null)).join("")}</div></div>` +
    `<div class="fgroup" data-f="rng"><div class="label">${esc(t("f_rng"))}</div><div class="chips">${
      RANGES.map(r => chip(r.en, L(r), state.rng)).join("")}</div></div>` +
    `<div class="fgroup" data-f="mas"><div class="label">${esc(t("f_mastery"))}</div><div class="chips">${
      byName(MASTERIES).map(m => chip(m.en, L(m), state.mas)).join("")}${chip("none", t("none"), state.mas)}</div></div>` +
    `<div class="fgroup" data-f="plus"><div class="label">${esc(t("f_plus"))}</div><div class="chips">${
      PLUSES.map(n => chip(String(n), n ? `+${n}` : t("none"), state.plus)).join("")}</div></div>` +
    `<div class="fgroup" data-f="rar"><div class="label">${esc(t("f_rarity"))}</div><div class="chips">${
      RARITIES.map(r => tint(r) ? chip(r.en, L(r), state.rar).replace('class="chip"', tint(r).replace('class="', 'class="chip ')) : chip(r.en, L(r), state.rar)).join("")}</div></div>`;
}

function renderTable() {
  // Data order: mod weapon types (base, +1, +2), mod unique weapons by name, then vanilla weapon types.
  const rows = WEAPONS.filter(matches);
  $("#count").textContent = t("count")(rows.length, WEAPONS.length);
  $("#empty").hidden = rows.length > 0;
  $("#list tbody").innerHTML = rows.map(w => {
    const open = state.open === w.id;
    const row = `<tr class="row" data-id="${esc(w.id)}" aria-expanded="${open}">
      <td><strong${tint(w.rarity)}>${esc(L(w.name))}</strong></td>
      <td>${esc(L(w.kind))}</td>
      <td>${damageCell(w)}</td>
      <td>${masteryLink(w)}</td>
      <td>${esc(plus(w))}</td>
    </tr>`;
    const profHtml = isSimple(w)
      ? `<span class="tip-host">${esc(L(w.proficiency))}<span class="tip">${esc(t("simpleWeaponTip"))}</span></span>`
      : null;
    const facts = [
      [t("prof"), L(w.proficiency), profHtml],
      [t("rng"), L(RANGES.find(r => r.en === rng(w)))],
      [t("col_damage"), null, damageCell(w)],
      [t("enchant"), plus(w)],
      w.range ? [t("range"), t("m")(w.range)] : null,
      w.props.length ? [t("props"), w.props.map(L).join(", ")] : null,
      [t("rarity"), L(w.rarity)],
      w.mastery ? [t("mastery"), L(w.mastery)] : null,
      w.effects.length ? [t("effects"), w.effects.map(L).join(", ")] : null,
      L(w.where) ? [t("col_where"), L(w.where)] : null,
    ].filter(Boolean);
    const detail = `<tr class="detail"><td colspan="5">
      <p><strong>${esc(L(w.name))}</strong> — ${esc(L(w.kind))}</p>
      <div class="grid">${facts.map(([k, v, html]) => `<div><div class="k">${esc(k)}</div><div>${html ?? esc(v)}</div></div>`).join("")}</div>
    </td></tr>`;
    return open ? row + detail : row;
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
  document.querySelectorAll("nav.pages a").forEach(a => { a.href = a.getAttribute("href").split("#")[0] + "#lang=" + state.lang; });
  document.title = `${t("title")} · D&D 5.5e All-in-One BEYOND`;
}

function writeHash() {
  const p = new URLSearchParams();
  p.set("lang", state.lang);
  if (state.q) p.set("q", state.q);
  if (state.src.size) p.set("source", [...state.src].join(","));
  if (state.mas.size) p.set("mastery", [...state.mas].join(","));
  if (state.plus.size) p.set("plus", [...state.plus].join(","));
  if (state.rar.size) p.set("rarity", [...state.rar].join(","));
  if (state.cat.size) p.set("cat", [...state.cat].join(","));
  if (state.kind.size) p.set("type", [...state.kind].join(","));
  if (state.prof.size) p.set("prof", [...state.prof].join(","));
  if (state.rng.size) p.set("rng", [...state.rng].join(","));
  if (state.open) p.set("open", state.open);
  history.replaceState(null, "", "#" + p.toString());
  applyLang();
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.open = p.get("open") || state.open;
  let lang = p.get("lang");
  if (!lang) {
    try { lang = localStorage.getItem("bg3dnd-lang"); } catch (e) { /* storage blocked */ }
  }
  if (!lang) lang = (navigator.language || "").startsWith("ko") ? "ko" : "en";
  state.lang = T[lang] ? lang : "en";
  state.q = p.get("q") || "";
  state.src = new Set((p.get("source") || "").split(",").filter(Boolean));
  state.mas = new Set((p.get("mastery") || "").split(",").filter(Boolean));
  state.plus = new Set((p.get("plus") || "").split(",").filter(Boolean));
  state.rar = new Set((p.get("rarity") || "").split(",").filter(Boolean));
  state.cat = new Set((p.get("cat") || "").split(",").filter(Boolean));
  state.kind = new Set((p.get("type") || "").split(",").filter(Boolean));
  state.prof = new Set((p.get("prof") || "").split(",").filter(Boolean));
  state.rng = new Set((p.get("rng") || "").split(",").filter(Boolean));
}

function render() { renderFilters(); renderTable(); writeHash(); }

function bind() {
  window.addEventListener("hashchange", () => { readHash(); $("#q").value = state.q; renderFilters(); renderTable(); applyLang(); });
  $("#q").addEventListener("input", e => { state.q = e.target.value.trim(); renderTable(); writeHash(); });
  $("#filters").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const sel = { src: state.src, cat: state.cat, kind: state.kind, prof: state.prof, rng: state.rng, mas: state.mas, plus: state.plus, rar: state.rar }[b.closest(".fgroup").dataset.f];
    sel.has(b.dataset.v) ? sel.delete(b.dataset.v) : sel.add(b.dataset.v);
    b.setAttribute("aria-pressed", sel.has(b.dataset.v));
    renderTable(); writeHash();
  });
  $("#list tbody").addEventListener("click", e => {
    if (e.target.closest("a")) return;
    const tr = e.target.closest("tr.row");
    if (!tr) return;
    state.open = state.open === tr.dataset.id ? null : tr.dataset.id;
    renderTable(); writeHash();
  });
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => {
    state.lang = b.dataset.lang;
    try { localStorage.setItem("bg3dnd-lang", state.lang); } catch (e) { /* storage blocked */ }
    render();
  }));
  $("#reset").addEventListener("click", () => {
    state.q = ""; state.src = new Set(); state.mas = new Set(); state.plus = new Set(); state.rar = new Set(); state.cat = new Set(); state.kind = new Set(); state.prof = new Set(); state.rng = new Set(); state.open = null; $("#q").value = ""; render();
  });
  $("#toggle-filters").addEventListener("click", e => {
    const box = $("#filters");
    box.hidden = !box.hidden;
    e.currentTarget.setAttribute("aria-expanded", !box.hidden);
  });
}

Promise.all([fetch("data/weapons.json").then(r => r.json()), fetch("data/weapon_mastery.json").then(r => r.json())])
  .then(([d, wm]) => {
    MASTERY = new Map(wm.masteries.map(m => [m.name.en, m]));
    WEAPONS = d.weapons;
    const seen = new Map();
    for (const w of WEAPONS) if (!seen.has(w.proficiency.en)) seen.set(w.proficiency.en, w.proficiency);
    PROFICIENCIES = [...seen.values()];
    MASTERIES = [...new Map(WEAPONS.filter(w => w.mastery).map(w => [w.mastery.en, w.mastery])).values()];
    PLUSES = [...new Set(WEAPONS.map(w => w.plus))].sort((a, b) => a - b);
    // Rarity in game order, Common to Legendary.
    const order = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"];
    RARITIES = [...new Map(WEAPONS.map(w => [w.rarity.en, w.rarity])).values()]
      .sort((a, b) => order.indexOf(a.en) - order.indexOf(b.en));
    KINDS = [...new Map(WEAPONS.map(w => [w.kind.en, w.kind])).values()];
    readHash();
    $("#q").value = state.q;
    bind();
    render();
    // #open=<id> expands that row; scroll to it once.
    const row = [...document.querySelectorAll("tr.row")].find(r => r.dataset.id === state.open);
    if (row) row.scrollIntoView({ block: "center" });
    if (d.generated) $("#generated").textContent = "· " + d.generated;
  });
