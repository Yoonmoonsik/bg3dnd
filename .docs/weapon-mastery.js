"use strict";

const T = {
  en: {
    title: "Weapon Mastery", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod",
    nav_home: "Home", nav_backgrounds: "Backgrounds", nav_builder: "Build Simulator", nav_classes: "Classes", nav_feats: "Feats", nav_fighting: "Fighting Styles",
    nav_rules: "Rules", nav_species: "Species", nav_spells: "Spells", nav_mastery: "Weapon Mastery", nav_weapons: "Weapons",
    search: "Search masteries by name, weapon or effect", filters: "Filters", reset: "Reset",
    col_name: "Mastery", col_weapons: "Weapons",
    empty: "No masteries match these filters.", footer: "Generated from the mod's game data.",
    count: (n, all) => `${n} of ${all} masteries`,
    f_weapon: "Weapon type", who: "Who gets weapon mastery", level: n => `Level ${n}`, feat: "Feat",
    masteries: n => `${n} ${n > 1 ? "masteries" : "mastery"}`, plus: n => `+${n}`,
  },
  ko: {
    title: "무기 숙련술", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드",
    nav_home: "홈", nav_backgrounds: "배경", nav_builder: "빌드 시뮬레이터", nav_classes: "직업", nav_feats: "재주", nav_fighting: "전투 방식",
    nav_rules: "규칙", nav_species: "종족", nav_spells: "주문", nav_mastery: "무기 숙련술", nav_weapons: "무기",
    search: "숙련술 이름, 무기, 효과로 검색", filters: "필터", reset: "초기화",
    col_name: "숙련술", col_weapons: "무기",
    empty: "조건에 맞는 숙련술이 없습니다.", footer: "모드 게임 데이터에서 생성했습니다.",
    count: (n, all) => `숙련술 ${all}종 중 ${n}종`,
    f_weapon: "무기 종류", who: "무기 숙련술을 얻는 곳", level: n => `${n}레벨`, feat: "재주",
    masteries: n => `숙련술 ${n}개`, plus: n => `+${n}`,
  },
};

const state = { lang: "en", q: "", sel: new Set(), open: null };
let KINDS = new Map();  // Korean weapon type name -> English name the Weapons page filters by
let MASTERIES = [];
let WEAPONS = [];
let SOURCES = [];

const $ = s => document.querySelector(s);
const t = k => T[state.lang][k] ?? k;
const L = o => o[state.lang] || o.en;
const esc = x => String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function matches(m) {
  if (state.q) {
    const q = state.q.toLowerCase();
    const hay = [m.name.en, m.name.ko, m.desc.en, m.desc.ko, ...m.weapons.flatMap(w => [w.en, w.ko])].join("\n").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return !state.sel.size || m.weapons.some(w => state.sel.has(w.en));
}

function renderFilters() {
  const chips = [...WEAPONS].sort((a, b) => L(a).localeCompare(L(b))).map(w =>
    `<button type="button" class="chip" data-v="${esc(w.en)}" aria-pressed="${state.sel.has(w.en)}">${esc(L(w))}</button>`);
  $("#filters").innerHTML = `<div class="fgroup"><div class="label">${esc(t("f_weapon"))}</div><div class="chips">${chips.join("")}</div></div>`;
}

// Who picks masteries: each class's levels in one line ("Fighter: Level 1 3 masteries, Level 4 +1 …").
// Link to where a source comes from: a feat on the Feats page, a class or subclass on the Classes page.
function srcHref(s) {
  const id = x => x.en.replace(/\W/g, "");
  if (s.kind === "feat") return `feats.html#lang=${state.lang}&open=${id(s.name)}`;
  const cls = s.kind === "subclass" ? s.class : s.name;
  return `classes.html#lang=${state.lang}&open=${id(cls)}${s.kind === "subclass" ? `&sub=${encodeURIComponent(s.name.en)}` : ""}`;
}

function renderSources() {
  const by = new Map();
  for (const s of SOURCES) {
    const key = s.name.en;
    if (!by.has(key)) by.set(key, { name: s.name, kind: s.kind, class: s.class, items: [] });
    by.get(key).items.push(s);
  }
  $("#sources").innerHTML = `<div class="k">${esc(t("who"))}</div><ul>${[...by.values()].map(g =>
    `<li><strong><a href="${srcHref(g)}">${esc(L(g.name))}</a></strong>${g.kind === "feat" ? ` (${esc(t("feat"))})` : ""}: ${g.items.map((s, i) =>
      s.level ? `${esc(t("level")(s.level))} ${esc(i ? t("plus")(s.count) : t("masteries")(s.count))}` : esc(t("masteries")(s.count))).join(", ")}</li>`).join("")}</ul>`;
}

// Weapon name linking to that weapon type on the Weapons page; the names match by Korean (Greataxes = Greataxe = 대형 도끼).
function weaponLink(w) {
  const kind = KINDS.get(w.ko);
  if (!kind) return esc(L(w));
  return `<a href="weapons.html#lang=${state.lang}&type=${encodeURIComponent(kind)}">${esc(L(w))}</a>`;
}

function renderTable() {
  const rows = MASTERIES.filter(matches).sort((a, b) => L(a.name).localeCompare(L(b.name)));
  $("#count").textContent = t("count")(rows.length, MASTERIES.length);
  $("#empty").hidden = rows.length > 0;
  $("#list tbody").innerHTML = rows.map(m => {
    const open = state.open === m.id;
    const row = `<tr class="row" data-id="${esc(m.id)}" aria-expanded="${open}">
      <td><strong>${esc(L(m.name))}</strong></td>
      <td>${m.weapons.map(weaponLink).join(", ")}</td>
    </tr>`;
    const detail = `<tr class="detail"><td colspan="2">${L(m.desc) ? `<p>${esc(L(m.desc))}</p>` : ""}</td></tr>`;
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
  if (state.sel.size) p.set("weapon", [...state.sel].join(","));
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
  state.sel = new Set((p.get("weapon") || "").split(",").filter(Boolean));
}

function render() { renderFilters(); renderTable(); renderSources(); writeHash(); }

function bind() {
  window.addEventListener("hashchange", () => { readHash(); $("#q").value = state.q; render(); });
  $("#q").addEventListener("input", e => { state.q = e.target.value.trim(); renderTable(); writeHash(); });
  $("#filters").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.sel.has(b.dataset.v) ? state.sel.delete(b.dataset.v) : state.sel.add(b.dataset.v);
    b.setAttribute("aria-pressed", state.sel.has(b.dataset.v));
    renderTable(); writeHash();
  });
  $("#list tbody").addEventListener("click", e => {
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
  $("#reset").addEventListener("click", () => { state.q = ""; state.sel = new Set(); $("#q").value = ""; render(); });
  $("#toggle-filters").addEventListener("click", e => {
    const box = $("#filters");
    box.hidden = !box.hidden;
    e.currentTarget.setAttribute("aria-expanded", !box.hidden);
  });
}

Promise.all([fetch("data/weapon_mastery.json").then(r => r.json()), fetch("data/weapons.json").then(r => r.json())])
  .then(([d, wd]) => {
    KINDS = new Map(wd.weapons.map(w => [w.kind.ko, w.kind.en]));
    MASTERIES = d.masteries;
    SOURCES = d.sources;
    WEAPONS = MASTERIES.flatMap(m => m.weapons);
    readHash();
    $("#q").value = state.q;
    bind();
    render();
    // #open=<id> (links from the class page) expands that row; scroll to it once.
    const row = [...document.querySelectorAll("tr.row")].find(r => r.dataset.id === state.open);
    if (row) row.scrollIntoView({ block: "center" });
    if (d.generated) $("#generated").textContent = "· " + d.generated;
  });
