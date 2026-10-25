"use strict";

const T = {
  en: {
    title: "Weapons", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod", wiki: "Wiki",
    nav_home: "Home", nav_backgrounds: "Backgrounds", nav_classes: "Classes", nav_feats: "Feats", nav_fighting: "Fighting Styles",
    nav_rules: "Rules", nav_species: "Species", nav_spells: "Spells", nav_mastery: "Weapon Mastery", nav_weapons: "Weapons",
    search: "Search weapons by name, type or location", filters: "Filters", reset: "Reset",
    col_name: "Name", col_kind: "Type", col_damage: "Damage", col_where: "Where to find",
    empty: "No weapons match these filters.", footer: "Generated from the mod's game data.",
    count: (n, all) => `${n} of ${all} weapons`,
    f_category: "Unique", general: "Not unique", unique: "Unique",
    f_src: "Source", mod: "Added by the mod", vanilla: "Vanilla",
    f_kind: "Weapon type", f_group: "Weapon group", f_mastery: "Mastery", none: "None",
    group: "Group", range: "Range", props: "Properties", rarity: "Rarity", mastery: "Mastery", effects: "Effects",
    m: n => `${n}m`,
  },
  ko: {
    title: "무기", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드", wiki: "위키",
    nav_home: "홈", nav_backgrounds: "배경", nav_classes: "직업", nav_feats: "재주", nav_fighting: "전투 방식",
    nav_rules: "규칙", nav_species: "종족", nav_spells: "주문", nav_mastery: "무기 숙련술", nav_weapons: "무기",
    search: "무기 이름, 종류, 얻는 곳으로 검색", filters: "필터", reset: "초기화",
    col_name: "이름", col_kind: "종류", col_damage: "피해", col_where: "얻는 곳",
    empty: "조건에 맞는 무기가 없습니다.", footer: "모드 게임 데이터에서 생성했습니다.",
    count: (n, all) => `무기 ${all}종 중 ${n}종`,
    f_category: "고유 여부", general: "고유 아님", unique: "고유",
    f_src: "출처", mod: "모드 추가", vanilla: "바닐라",
    f_kind: "무기 종류", f_group: "무기 분류", f_mastery: "숙련술", none: "없음",
    group: "분류", range: "사거리", props: "속성", rarity: "등급", mastery: "숙련술", effects: "효과",
    m: n => `${n}m`,
  },
};

const state = { lang: "en", q: "", src: new Set(), cat: new Set(), kind: new Set(), mas: new Set(), grp: new Set(), open: null };
let WEAPONS = [];
let GROUPS = [];
let KINDS = [];
let MASTERIES = [];

const $ = s => document.querySelector(s);
const t = k => T[state.lang][k] ?? k;
const L = o => (o ? o[state.lang] || o.en : "");
const esc = x => String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cat = w => (w.unique ? "unique" : "general");
const src = w => (w.new ? "mod" : "vanilla");
const mas = w => (w.mastery ? w.mastery.en : "none");
const damage = w => `${w.damage} ${L(w.damageType)}`;

function matches(w) {
  if (state.q) {
    const q = state.q.toLowerCase();
    const text = [w.name, w.kind, w.where, w.damageType].flatMap(o => [o.en, o.ko]).join("\n").toLowerCase();
    if (!text.includes(q)) return false;
  }
  if (state.src.size && !state.src.has(src(w))) return false;
  if (state.cat.size && !state.cat.has(cat(w))) return false;
  if (state.mas.size && !state.mas.has(mas(w))) return false;
  if (state.kind.size && !state.kind.has(w.kind.en)) return false;
  return !state.grp.size || state.grp.has(w.group.en);
}

function chip(v, label, sel) {
  return `<button type="button" class="chip" data-v="${esc(v)}" aria-pressed="${sel.has(v)}">${esc(label)}</button>`;
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
    `<div class="fgroup" data-f="grp"><div class="label">${esc(t("f_group"))}</div><div class="chips">${
      GROUPS.map(g => chip(g.en, L(g), state.grp)).join("")}</div></div>` +
    `<div class="fgroup" data-f="mas"><div class="label">${esc(t("f_mastery"))}</div><div class="chips">${
      byName(MASTERIES).map(m => chip(m.en, L(m), state.mas)).join("")}${chip("none", t("none"), state.mas)}</div></div>`;
}

function renderTable() {
  // Data order: mod weapon types (base, +1, +2), mod unique weapons by name, then vanilla weapon types.
  const rows = WEAPONS.filter(matches);
  $("#count").textContent = t("count")(rows.length, WEAPONS.length);
  $("#empty").hidden = rows.length > 0;
  $("#list tbody").innerHTML = rows.map(w => {
    const open = state.open === w.id;
    const row = `<tr class="row" data-id="${esc(w.id)}" aria-expanded="${open}">
      <td><strong>${esc(L(w.name))}</strong></td>
      <td>${esc(L(w.kind))}</td>
      <td>${esc(damage(w))}</td>
      <td>${esc(L(w.where))}</td>
    </tr>`;
    const facts = [
      [t("group"), L(w.group)],
      [t("col_damage"), damage(w) + (w.plus ? ` (+${w.plus})` : "")],
      w.range ? [t("range"), t("m")(w.range)] : null,
      w.props.length ? [t("props"), w.props.map(L).join(", ")] : null,
      [t("rarity"), L(w.rarity)],
      w.mastery ? [t("mastery"), L(w.mastery)] : null,
      w.effects.length ? [t("effects"), w.effects.map(L).join(", ")] : null,
      L(w.where) ? [t("col_where"), L(w.where)] : null,
    ].filter(Boolean);
    const detail = `<tr class="detail"><td colspan="4">
      <p><strong>${esc(L(w.name))}</strong> — ${esc(L(w.kind))}</p>
      <div class="grid">${facts.map(([k, v]) => `<div><div class="k">${esc(k)}</div><div>${esc(v)}</div></div>`).join("")}</div>
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
  if (state.cat.size) p.set("cat", [...state.cat].join(","));
  if (state.kind.size) p.set("type", [...state.kind].join(","));
  if (state.grp.size) p.set("group", [...state.grp].join(","));
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
  state.cat = new Set((p.get("cat") || "").split(",").filter(Boolean));
  state.kind = new Set((p.get("type") || "").split(",").filter(Boolean));
  state.grp = new Set((p.get("group") || "").split(",").filter(Boolean));
}

function render() { renderFilters(); renderTable(); writeHash(); }

function bind() {
  window.addEventListener("hashchange", () => { readHash(); $("#q").value = state.q; renderFilters(); renderTable(); applyLang(); });
  $("#q").addEventListener("input", e => { state.q = e.target.value.trim(); renderTable(); writeHash(); });
  $("#filters").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const sel = { src: state.src, cat: state.cat, kind: state.kind, grp: state.grp, mas: state.mas }[b.closest(".fgroup").dataset.f];
    sel.has(b.dataset.v) ? sel.delete(b.dataset.v) : sel.add(b.dataset.v);
    b.setAttribute("aria-pressed", sel.has(b.dataset.v));
    renderTable(); writeHash();
  });
  $("#list tbody").addEventListener("click", e => {
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
    state.q = ""; state.src = new Set(); state.mas = new Set(); state.cat = new Set(); state.kind = new Set(); state.grp = new Set(); state.open = null; $("#q").value = ""; render();
  });
  $("#toggle-filters").addEventListener("click", e => {
    const box = $("#filters");
    box.hidden = !box.hidden;
    e.currentTarget.setAttribute("aria-expanded", !box.hidden);
  });
}

fetch("data/weapons.json")
  .then(r => r.json())
  .then(d => {
    WEAPONS = d.weapons;
    const seen = new Map();
    for (const w of WEAPONS) if (!seen.has(w.group.en)) seen.set(w.group.en, w.group);
    GROUPS = [...seen.values()];
    MASTERIES = [...new Map(WEAPONS.filter(w => w.mastery).map(w => [w.mastery.en, w.mastery])).values()];
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
