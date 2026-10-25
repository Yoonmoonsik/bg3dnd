"use strict";

const T = {
  en: {
    title: "Backgrounds", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod", wiki: "Wiki",
    nav_home: "Home", nav_spells: "Spells", nav_feats: "Feats", nav_species: "Species", nav_backgrounds: "Backgrounds",
    search: "Search backgrounds by name, skill or feat", filters: "Filters", reset: "Reset",
    col_name: "Name", col_skills: "Skills", col_feat: "Feat",
    empty: "No backgrounds match these filters.", footer: "Generated from the mod's game data.",
    count: (n, all) => `${n} of ${all} backgrounds`,
    f_skills: "Skill proficiency", new: "New",
    inspiration: "Each Long Rest, you have a chance to gain Heroic Inspiration.",
  },
  ko: {
    title: "배경", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드", wiki: "위키",
    nav_home: "홈", nav_spells: "주문", nav_feats: "재주", nav_species: "종족", nav_backgrounds: "배경",
    search: "배경 이름, 기술, 재주로 검색", filters: "필터", reset: "초기화",
    col_name: "이름", col_skills: "기술", col_feat: "재주",
    empty: "조건에 맞는 배경이 없습니다.", footer: "모드 게임 데이터에서 생성했습니다.",
    count: (n, all) => `배경 ${all}종 중 ${n}종`,
    f_skills: "기술 숙련", new: "새 배경",
    inspiration: "긴 휴식을 할 때마다 확률로 영웅적 영감을 얻습니다.",
  },
};

const state = { lang: "en", q: "", skills: new Set(), dir: 1, open: null };
let BACKGROUNDS = [];
let SKILLS = [];  // [{id, name}] from the data, one per skill
let FEATS = {};   // feat id -> feat from feats.json, for the hover preview

const $ = s => document.querySelector(s);
const t = k => T[state.lang][k] ?? k;
const L = o => o[state.lang] || o.en;

function esc(x) {
  return String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Selected skills are AND-ed: a background has to grant every chosen skill.
function matches(b) {
  if (state.q) {
    const q = state.q.toLowerCase();
    const hay = [b.name.en, b.name.ko, b.desc.en, b.desc.ko, ...b.skills.flatMap(s => [s.name.en, s.name.ko]),
      ...b.feats.flatMap(f => [f.name.en, f.name.ko])].join("\n").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  for (const s of state.skills) if (!b.skills.some(x => x.id === s)) return false;
  return true;
}

function renderFilters() {
  const chips = [...SKILLS].sort((a, b) => L(a.name).localeCompare(L(b.name))).map(s =>
    `<button type="button" class="chip" data-v="${esc(s.id)}" aria-pressed="${state.skills.has(s.id)}">${esc(L(s.name))}</button>`);
  $("#filters").innerHTML = `<div class="fgroup"><div class="label">${esc(t("f_skills"))}</div><div class="chips">${chips.join("")}</div></div>`;
}

function renderTable() {
  const rows = BACKGROUNDS.filter(matches).sort((a, b) => state.dir * L(a.name).localeCompare(L(b.name)));
  $("#count").textContent = t("count")(rows.length, BACKGROUNDS.length);
  $("#empty").hidden = rows.length > 0;
  document.querySelector('th[data-sort="name"]').setAttribute("aria-sort", state.dir > 0 ? "ascending" : "descending");
  $("#backgrounds tbody").innerHTML = rows.map(b => {
    const open = state.open === b.id;
    const row = `<tr class="row" data-id="${esc(b.id)}" aria-expanded="${open}">
      <td><strong>${esc(L(b.name))}</strong>${b.new ? `<span class="tags"><span class="tag new">${esc(t("new"))}</span></span>` : ""}</td>
      <td>${esc(b.skills.map(s => L(s.name)).join(", "))}</td>
      <td>${b.feats.map(featLink).join(", ")}</td>
    </tr>`;
    const detail = `<tr class="detail"><td colspan="3">
      ${L(b.desc) ? `<p>${esc(L(b.desc))}</p>` : ""}
      ${b.new ? `<p class="mini">${esc(t("inspiration"))}</p>` : ""}
    </td></tr>`;
    return open ? row + detail : row;
  }).join("");
}

// A feat the data links to opens its row on the feat page; hovering shows its ability scores and text.
function featLink(f) {
  const name = esc(L(f.name));
  if (!f.id) return name;
  const feat = FEATS[f.id];
  const tip = feat ? `<span class="tip" role="tooltip">${esc(L(feat.desc))}</span>` : "";
  return `<a class="feat-link" href="feats.html#lang=${state.lang}&open=${encodeURIComponent(f.id)}">${name}${tip}</a>`;
}

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll(".lang button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === state.lang));
  document.querySelectorAll("nav.pages a").forEach(a => {
    a.href = a.getAttribute("href").split("#")[0] + "#lang=" + state.lang;
  });
  document.title = `${t("title")} · D&D 5.5e All-in-One BEYOND`;
}

// Filters live in the URL hash so a search can be shared: #lang=ko&skills=Stealth,Survival
function writeHash() {
  const p = new URLSearchParams();
  p.set("lang", state.lang);
  if (state.q) p.set("q", state.q);
  if (state.skills.size) p.set("skills", [...state.skills].join(","));
  if (state.dir !== 1) p.set("sort", "-name");
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
  state.skills = new Set((p.get("skills") || "").split(",").filter(Boolean));
  state.dir = p.get("sort") === "-name" ? -1 : 1;
}

function render() { renderFilters(); renderTable(); writeHash(); }

function bind() {
  window.addEventListener("hashchange", () => { readHash(); $("#q").value = state.q; render(); });
  $("#q").addEventListener("input", e => { state.q = e.target.value.trim(); renderTable(); writeHash(); });
  $("#filters").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.skills.has(b.dataset.v) ? state.skills.delete(b.dataset.v) : state.skills.add(b.dataset.v);
    b.setAttribute("aria-pressed", state.skills.has(b.dataset.v));
    renderTable(); writeHash();
  });
  document.querySelector('th[data-sort="name"]').addEventListener("click", () => {
    state.dir = -state.dir; renderTable(); writeHash();
  });
  $("#backgrounds tbody").addEventListener("click", e => {
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
  $("#reset").addEventListener("click", () => { state.q = ""; state.skills = new Set(); $("#q").value = ""; render(); });
  $("#toggle-filters").addEventListener("click", e => {
    const box = $("#filters");
    box.hidden = !box.hidden;
    e.currentTarget.setAttribute("aria-expanded", !box.hidden);
  });
}

Promise.all([fetch("data/backgrounds.json").then(r => r.json()),
  fetch("data/feats.json").then(r => r.json()).catch(() => ({ feats: [] }))])
  .then(([d, f]) => {
    for (const feat of f.feats) FEATS[feat.id] = feat;
    BACKGROUNDS = d.backgrounds;
    const seen = new Map();
    for (const b of BACKGROUNDS) for (const s of b.skills) if (!seen.has(s.id)) seen.set(s.id, s);
    SKILLS = [...seen.values()];
    readHash();
    $("#q").value = state.q;
    bind();
    render();
    if (d.generated) $("#generated").textContent = "· " + d.generated;
  });
