"use strict";

const T = {
  en: {
    title: "Version History", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod",
    nav_home: "Home", nav_backgrounds: "Backgrounds", nav_builder: "Build Simulator", nav_changes: "Version History", nav_classes: "Classes", nav_feats: "Feats", nav_fighting: "Fighting Styles",
    nav_rules: "Rules", nav_species: "Species", nav_spells: "Spells", nav_mastery: "Weapon Mastery", nav_weapons: "Weapons",
    search: "Search changes by name or commit message", reset: "Reset",
    empty: "No changes match this search.", footer: "Generated from the mod's git history and game data.",
    count: (n, all) => `${n} of ${all} releases`,
    unreleased: "Next release (not yet published)", added: "Added", changed: "Changed", removed: "Removed", commits: "Commits",
    subclasses: "Subclasses",
  },
  ko: {
    title: "변경 이력", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드",
    nav_home: "홈", nav_backgrounds: "배경", nav_builder: "빌드 시뮬레이터", nav_changes: "변경 이력", nav_classes: "직업", nav_feats: "재주", nav_fighting: "전투 방식",
    nav_rules: "규칙", nav_species: "종족", nav_spells: "주문", nav_mastery: "무기 숙련술", nav_weapons: "무기",
    search: "이름이나 커밋 메시지로 검색", reset: "초기화",
    empty: "검색에 맞는 변경이 없습니다.", footer: "모드의 git 이력과 게임 데이터에서 생성했습니다.",
    count: (n, all) => `릴리스 ${all}개 중 ${n}개`,
    unreleased: "다음 릴리스 (아직 배포 안 됨)", added: "추가", changed: "변경", removed: "삭제", commits: "커밋",
    subclasses: "하위 직업",
  },
};
// kind -> menu name key
const KIND = { spells: "nav_spells", feats: "nav_feats", weapons: "nav_weapons", backgrounds: "nav_backgrounds", species: "nav_species",
  classes: "nav_classes", subclasses: "subclasses", fighting: "nav_fighting", mastery: "nav_mastery", rules: "nav_rules" };

const state = { lang: "en", q: "" };
let RELEASES = [];

const $ = s => document.querySelector(s);
const t = k => T[state.lang][k] ?? k;
const L = o => (o ? o[state.lang] || o.en : "");
const esc = x => String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function hit(text) { return !state.q || text.toLowerCase().includes(state.q.toLowerCase()); }

// Entries of one group, by kind, each linking to the page that shows it.
function group(label, list) {
  list = list.filter(e => hit([e.n.en, e.n.ko].join(" ")));
  if (!list.length) return "";
  const byKind = {};
  for (const e of list) (byKind[e.k] = byKind[e.k] || []).push(e);
  return `<div class="k">${esc(label)} (${list.length})</div><ul>${Object.entries(byKind).map(([k, es]) =>
    `<li><b>${esc(t(KIND[k]))}</b>: ${es.sort((a, b) => L(a.n).localeCompare(L(b.n), state.lang))
      .map(e => `<a href="${e.p}#${encodeURI(e.h)}&lang=${state.lang}">${esc(L(e.n))}</a>`).join(", ")}</li>`).join("")}</ul>`;
}

function render() {
  const shown = RELEASES.map(r => {
    const commits = r.commits.filter(hit);
    const body = group(t("added"), r.added) + group(t("changed"), r.changed) + group(t("removed"), r.removed)
      + (commits.length ? `<div class="k">${esc(t("commits"))} (${commits.length})</div><ul>${commits.map(c => `<li><code>${esc(c)}</code></li>`).join("")}</ul>` : "");
    if (!body) return "";
    const title = r.version === "unreleased" ? t("unreleased") : r.version;
    return `<details class="release" open><summary><b>${esc(title)}</b> <span class="sub">${esc(r.date)}</span></summary>${body}</details>`;
  }).filter(Boolean);
  $("#releases").innerHTML = shown.join("");
  $("#count").textContent = t("count")(shown.length, RELEASES.length);
  $("#empty").hidden = shown.length > 0;
  writeHash();
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
}

function bind() {
  window.addEventListener("hashchange", () => { readHash(); $("#q").value = state.q; render(); });
  $("#q").addEventListener("input", e => { state.q = e.target.value.trim(); render(); });
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => {
    state.lang = b.dataset.lang;
    try { localStorage.setItem("bg3dnd-lang", state.lang); } catch (e) { /* storage blocked */ }
    render();
  }));
  $("#reset").addEventListener("click", () => { state.q = ""; $("#q").value = ""; render(); });
}

fetch("data/changes.json")
  .then(r => r.json())
  .then(d => {
    RELEASES = d.releases;
    readHash();
    $("#q").value = state.q;
    bind();
    render();
  });
