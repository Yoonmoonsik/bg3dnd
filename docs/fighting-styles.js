"use strict";

const T = {
  en: {
    title: "Fighting Styles", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod",
    nav_home: "Home", nav_backgrounds: "Backgrounds", nav_builder: "Build Simulator", nav_classes: "Classes", nav_feats: "Feats", nav_fighting: "Fighting Styles",
    nav_rules: "Rules", nav_species: "Species", nav_spells: "Spells", nav_mastery: "Weapon Mastery", nav_weapons: "Weapons",
    search: "Search fighting styles by name or description", filters: "Filters", reset: "Reset",
    col_name: "Name", col_sources: "Gained from",
    empty: "No fighting styles match these filters.", footer: "Generated from the mod's game data.",
    count: (n, all) => `${n} of ${all} fighting styles`,
    f_source: "Gained from", level: n => `level ${n}`, feat: "feat", choose: n => `choose ${n}`,
  },
  ko: {
    title: "전투 방식", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드",
    nav_home: "홈", nav_backgrounds: "배경", nav_builder: "빌드 시뮬레이터", nav_classes: "직업", nav_feats: "재주", nav_fighting: "전투 방식",
    nav_rules: "규칙", nav_species: "종족", nav_spells: "주문", nav_mastery: "무기 숙련술", nav_weapons: "무기",
    search: "전투 방식 이름이나 설명으로 검색", filters: "필터", reset: "초기화",
    col_name: "이름", col_sources: "얻는 곳",
    empty: "조건에 맞는 전투 방식이 없습니다.", footer: "모드 게임 데이터에서 생성했습니다.",
    count: (n, all) => `전투 방식 ${all}종 중 ${n}종`,
    f_source: "얻는 곳", level: n => `${n}레벨`, feat: "재주", choose: n => `${n}개 선택`,
  },
};

const state = { lang: "en", q: "", sel: new Set(), open: null };
let STYLES = [];
let SOURCES = [];  // distinct source names (en) in data order

const $ = s => document.querySelector(s);
const t = k => T[state.lang][k] ?? k;
const L = o => o[state.lang] || o.en;
const esc = x => String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// "Fighting Style: Archery" -> "Archery" for the table; the full name stays in the detail.
const short = n => n.replace(/^[^:：]+[:：]\s*/, "");
// Link to where a source comes from: a feat on the Feats page, a class or subclass on the Classes page.
function srcHref(s) {
  const id = x => x.en.replace(/\W/g, "");
  if (s.kind === "feat") return `feats.html#lang=${state.lang}&open=${id(s.name)}`;
  const cls = s.kind === "subclass" ? s.class : s.name;
  return `classes.html#lang=${state.lang}&open=${id(cls)}${s.kind === "subclass" ? `&sub=${encodeURIComponent(s.name.en)}` : ""}`;
}
const srcLink = (s, text) => `<a href="${srcHref(s)}">${esc(text)}</a>`;
const srcText = s => `${L(s.name)} (${s.kind === "feat" ? t("feat") : t("level")(s.level)})`;

function matches(f) {
  if (state.q) {
    const q = state.q.toLowerCase();
    if (![f.name.en, f.name.ko, f.desc.en, f.desc.ko].join("\n").toLowerCase().includes(q)) return false;
  }
  return !state.sel.size || f.sources.some(s => state.sel.has(s.name.en));
}

function renderFilters() {
  const chips = SOURCES.map(s =>
    `<button type="button" class="chip" data-v="${esc(s.en)}" aria-pressed="${state.sel.has(s.en)}">${esc(L(s))}</button>`);
  $("#filters").innerHTML = `<div class="fgroup"><div class="label">${esc(t("f_source"))}</div><div class="chips">${chips.join("")}</div></div>`;
}

function renderTable() {
  const rows = STYLES.filter(matches).sort((a, b) => short(L(a.name)).localeCompare(short(L(b.name))));
  $("#count").textContent = t("count")(rows.length, STYLES.length);
  $("#empty").hidden = rows.length > 0;
  $("#list tbody").innerHTML = rows.map(f => {
    const open = state.open === f.id;
    const row = `<tr class="row" data-id="${esc(f.id)}" aria-expanded="${open}">
      <td><strong>${esc(short(L(f.name)))}</strong></td>
      <td>${[...new Map(f.sources.map(s => [s.name.en, s])).values()].map(s => srcLink(s, L(s.name))).join(", ")}</td>
    </tr>`;
    const detail = `<tr class="detail"><td colspan="2">
      <p><strong>${esc(L(f.name))}</strong></p>
      ${L(f.desc) ? `<p>${esc(L(f.desc))}</p>` : ""}
      <div class="k">${esc(t("col_sources"))}</div>
      <ul>${f.sources.map(s => `<li>${srcLink(s, srcText(s))}${s.count > 1 ? ` — ${esc(t("choose")(s.count))}` : ""}</li>`).join("")}</ul>
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
  if (state.sel.size) p.set("source", [...state.sel].join(","));
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
  state.sel = new Set((p.get("source") || "").split(",").filter(Boolean));
}

function render() { renderFilters(); renderTable(); writeHash(); }

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

fetch("data/fighting_styles.json")
  .then(r => r.json())
  .then(d => {
    STYLES = d.styles;
    const seen = new Map();
    for (const f of STYLES) for (const s of f.sources) if (!seen.has(s.name.en)) seen.set(s.name.en, s.name);
    SOURCES = [...seen.values()];
    readHash();
    $("#q").value = state.q;
    bind();
    render();
    // #open=<id> (links from the class page) expands that row; scroll to it once.
    const row = [...document.querySelectorAll("tr.row")].find(r => r.dataset.id === state.open);
    if (row) row.scrollIntoView({ block: "center" });
    if (d.generated) $("#generated").textContent = "· " + d.generated;
  });
