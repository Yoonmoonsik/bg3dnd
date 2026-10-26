"use strict";

const T = {
  en: {
    title: "Rules", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod",
    nav_home: "Home", nav_backgrounds: "Backgrounds", nav_builder: "Build Simulator", nav_classes: "Classes", nav_feats: "Feats", nav_fighting: "Fighting Styles",
    nav_rules: "Rules", nav_species: "Species", nav_spells: "Spells", nav_mastery: "Weapon Mastery", nav_weapons: "Weapons",
    search: "Search rules by name or description", reset: "Reset",
    col_name: "Name", col_desc: "Description",
    empty: "No rules match this search.", footer: "Generated from the mod's game data.",
    count: (n, all) => `${n} of ${all} rules`,
  },
  ko: {
    title: "규칙", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드",
    nav_home: "홈", nav_backgrounds: "배경", nav_builder: "빌드 시뮬레이터", nav_classes: "직업", nav_feats: "재주", nav_fighting: "전투 방식",
    nav_rules: "규칙", nav_species: "종족", nav_spells: "주문", nav_mastery: "무기 숙련술", nav_weapons: "무기",
    search: "규칙 이름이나 설명으로 검색", reset: "초기화",
    col_name: "이름", col_desc: "설명",
    empty: "검색에 맞는 규칙이 없습니다.", footer: "모드 게임 데이터에서 생성했습니다.",
    count: (n, all) => `규칙 ${all}개 중 ${n}개`,
  },
};

const state = { lang: "en", q: "", open: null };
let RULES = [];

const $ = s => document.querySelector(s);
const t = k => T[state.lang][k] ?? k;
const L = o => o[state.lang] || o.en;
const esc = x => String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function matches(r) {
  if (!state.q) return true;
  return [r.name.en, r.name.ko, r.desc.en, r.desc.ko].join("\n").toLowerCase().includes(state.q.toLowerCase());
}

function renderTable() {
  const rows = RULES.filter(matches).sort((a, b) => L(a.name).localeCompare(L(b.name), state.lang));
  $("#count").textContent = t("count")(rows.length, RULES.length);
  $("#empty").hidden = rows.length > 0;
  $("#list tbody").innerHTML = rows.map(r => {
    const open = state.open === r.id;
    const row = `<tr class="row" data-id="${esc(r.id)}" aria-expanded="${open}">
      <td><strong>${esc(L(r.name))}</strong></td>
      <td>${esc(L(r.desc).split("\n")[0])}</td>
    </tr>`;
    const detail = `<tr class="detail"><td colspan="2">
      <p><strong>${esc(L(r.name))}</strong></p>
      <p>${esc(L(r.desc))}</p>
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
}

function render() { renderTable(); writeHash(); }

function bind() {
  window.addEventListener("hashchange", () => { readHash(); $("#q").value = state.q; renderTable(); applyLang(); });
  $("#q").addEventListener("input", e => { state.q = e.target.value.trim(); render(); });
  $("#list tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr.row");
    if (!tr) return;
    state.open = state.open === tr.dataset.id ? null : tr.dataset.id;
    render();
  });
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => {
    state.lang = b.dataset.lang;
    try { localStorage.setItem("bg3dnd-lang", state.lang); } catch (e) { /* storage blocked */ }
    render();
  }));
  $("#reset").addEventListener("click", () => { state.q = ""; state.open = null; $("#q").value = ""; render(); });
}

fetch("data/rules.json")
  .then(r => r.json())
  .then(d => {
    RULES = d.rules;
    readHash();
    $("#q").value = state.q;
    bind();
    render();
    // #open=<id> expands that row; scroll to it once.
    const row = [...document.querySelectorAll("tr.row")].find(r => r.dataset.id === state.open);
    if (row) row.scrollIntoView({ block: "center" });
    if (d.generated) $("#generated").textContent = "· " + d.generated;
  });
