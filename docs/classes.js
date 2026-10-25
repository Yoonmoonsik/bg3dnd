"use strict";

const T = {
  en: {
    title: "Classes", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod", wiki: "Wiki",
    nav_home: "Home", nav_backgrounds: "Backgrounds", nav_classes: "Classes", nav_feats: "Feats",
    nav_fighting: "Fighting Styles", nav_species: "Species", nav_spells: "Spells", nav_mastery: "Weapon Mastery",
    search: "Search classes or subclasses by name or feature", filters: "Filters", reset: "Reset",
    col_name: "Class", col_hp: "Hit Points", col_primary: "Primary Ability", col_caster: "Spellcasting",
    col_subclasses: "Subclasses",
    empty: "No classes match these filters.", footer: "Generated from the mod's game data.",
    count: (n, all) => `${n} of ${all} classes`,
    f_caster: "Spellcasting", f_primary: "Primary Ability", f_source: "Source",
    full: "Full caster", half: "Half caster", pact: "Pact magic", third: "Third caster (subclass)", none: "None",
    third_tag: "Third caster", new_sub: "New subclass",
    new: "New", revised: "Revised", vanilla: "Unchanged",
    hp: h => `${h.base} + ${h.per_level}/level`, saves: "Saving Throws", armor: "Armour", weapons: "Weapons",
    feat_levels: "Feat levels", subclasses_at: n => `Subclasses (chosen at level ${n})`, features: "Class features",
    light: "Light Armour", medium: "Medium Armour", heavy: "Heavy Armour", shield: "Shields",
    SimpleWeapons: "Simple Weapons", MartialWeapons: "Martial Weapons", casting: a => `${a} (spellcasting)`,
  },
  ko: {
    title: "직업", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드", wiki: "위키",
    nav_home: "홈", nav_backgrounds: "배경", nav_classes: "직업", nav_feats: "재주",
    nav_fighting: "전투 방식", nav_species: "종족", nav_spells: "주문", nav_mastery: "무기 숙련술",
    search: "직업이나 하위 직업 이름, 기능으로 검색", filters: "필터", reset: "초기화",
    col_name: "직업", col_hp: "생명력", col_primary: "주 능력치", col_caster: "주문 시전",
    col_subclasses: "하위 직업",
    empty: "조건에 맞는 직업이 없습니다.", footer: "모드 게임 데이터에서 생성했습니다.",
    count: (n, all) => `직업 ${all}종 중 ${n}종`,
    f_caster: "주문 시전", f_primary: "주 능력치", f_source: "구분",
    full: "전 시전자", half: "반 시전자", pact: "계약 마법", third: "1/3 시전자 (하위 직업)", none: "없음",
    third_tag: "1/3 시전자", new_sub: "새 하위 직업",
    new: "새 직업", revised: "개정", vanilla: "변경 없음",
    hp: h => `${h.base} + 레벨당 ${h.per_level}`, saves: "내성 굴림", armor: "갑옷", weapons: "무기",
    feat_levels: "재주 레벨", subclasses_at: n => `하위 직업 (${n}레벨에 선택)`, features: "직업 기능",
    light: "경갑", medium: "평갑", heavy: "중갑", shield: "방패",
    SimpleWeapons: "단순 무기", MartialWeapons: "군용 무기", casting: a => `${a} (주문 시전)`,
  },
};
const ABILITY = {
  Strength: ["Strength", "근력"], Dexterity: ["Dexterity", "민첩"], Constitution: ["Constitution", "건강"],
  Intelligence: ["Intelligence", "지능"], Wisdom: ["Wisdom", "지혜"], Charisma: ["Charisma", "매력"],
};

const state = { lang: "en", q: "", sel: {}, open: null, openSub: null };
let CLASSES = [];
let SUBS = {};  // class id -> subclasses
let FILTERS = [];

const $ = s => document.querySelector(s);
const t = k => T[state.lang][k] ?? k;
const L = o => o[state.lang] || o.en;
const ab = a => a && ABILITY[a] ? ABILITY[a][state.lang === "ko" ? 1 : 0] : "—";
const esc = x => String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function buildFilters() {
  FILTERS = [
    { key: "caster", label: "f_caster", values: ["full", "half", "pact", "third", "none"], text: v => t(v),
      test: (c, v) => v === "third" ? (SUBS[c.id] || []).some(s => s.caster === "third") : (c.caster || "none") === v },
    { key: "primary", label: "f_primary", values: Object.keys(ABILITY), text: v => ab(v), test: (c, v) => c.primary === v },
    { key: "source", label: "f_source", values: ["new", "revised", "vanilla"], text: v => t(v), test: (c, v) => c.source === v },
  ];
}

// A search matches a class or any of its subclasses (names and feature names).
function featureText(x) {
  return [x.name.en, x.name.ko, ...x.levels.flatMap(l => l.traits.flatMap(f => [f.name.en, f.name.ko]))];
}
function matches(c) {
  if (state.q) {
    const q = state.q.toLowerCase();
    const hay = [...featureText(c), ...(SUBS[c.id] || []).flatMap(featureText)].join("\n").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  for (const f of FILTERS) {
    const sel = state.sel[f.key];
    if (sel && sel.size && ![...sel].some(v => f.test(c, v))) return false;
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

function subList(c) {
  const q = state.q.toLowerCase();
  return (SUBS[c.id] || []).map(s => {
    const open = state.openSub === s.id;
    const hit = q && featureText(s).join("\n").toLowerCase().includes(q);
    const tag = (s.source !== "vanilla" ? ` <span class="tag ${s.source}">${esc(t(s.source === "new" ? "new_sub" : s.source))}</span>` : "")
      + (s.caster === "third" ? ` <span class="tag blood">${esc(t("third_tag"))} · ${esc(ab(s.spellcasting))}</span>` : "");
    return `<li class="sub${hit ? " hit" : ""}"><button type="button" class="sub-toggle" data-sub="${esc(s.id)}"
      aria-expanded="${open}">${esc(L(s.name))}</button>${tag}
      ${open ? `<div class="sub-detail">${L(s.desc) ? `<p>${esc(L(s.desc))}</p>` : ""}${renderLevels(s.levels, state.lang, esc)}</div>` : ""}</li>`;
  }).join("");
}

function detail(c) {
  const facts = [
    [t("saves"), c.saves.map(ab).join(", ")],
    [t("armor"), c.armor.map(t).join(", ") || "—"],
    [t("weapons"), c.weapons.map(t).join(", ") || "—"],
    [t("feat_levels"), c.feat_levels.join(", ")],
  ];
  return `<tr class="detail"><td colspan="5">
    <div class="grid">${facts.map(([k, v]) => `<div><div class="k">${esc(k)}</div>${esc(v)}</div>`).join("")}</div>
    ${L(c.desc) ? `<p>${esc(L(c.desc))}</p>` : ""}
    ${c.subclasses.length ? `<div class="k">${esc(t("subclasses_at")(c.subclass_level))}</div><ul class="subs">${subList(c)}</ul>` : ""}
    <div class="k">${esc(t("features"))}</div>
    ${renderLevels(c.levels, state.lang, esc)}
  </td></tr>`;
}

function renderTable() {
  const rows = CLASSES.filter(matches).sort((a, b) => L(a.name).localeCompare(L(b.name), state.lang));
  $("#count").textContent = t("count")(rows.length, CLASSES.length);
  $("#empty").hidden = rows.length > 0;
  $("#list tbody").innerHTML = rows.map(c => {
    const open = state.open === c.id;
    const tag = c.source !== "vanilla" ? `<span class="tags"><span class="tag ${c.source}">${esc(t(c.source))}</span></span>` : "";
    const row = `<tr class="row" data-id="${esc(c.id)}" aria-expanded="${open}">
      <td><strong>${esc(L(c.name))}</strong>${tag}</td>
      <td class="hide-sm">${esc(t("hp")(c.hp))}</td>
      <td>${esc(ab(c.primary))}</td>
      <td class="hide-sm">${esc(t(c.caster || "none"))}${c.spellcasting ? ` · ${esc(ab(c.spellcasting))}` : ""}</td>
      <td class="hide-md">${c.subclasses.length}</td>
    </tr>`;
    return open ? row + detail(c) : row;
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
  for (const [k, v] of Object.entries(state.sel)) if (v.size) p.set(k, [...v].join(","));
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
  $("#list tbody").addEventListener("click", e => {
    if (e.target.closest("a")) return;
    const sub = e.target.closest(".sub-toggle");
    if (sub) {
      state.openSub = state.openSub === sub.dataset.sub ? null : sub.dataset.sub;
      renderTable();
      return;
    }
    const tr = e.target.closest("tr.row");
    if (!tr) return;
    state.open = state.open === tr.dataset.id ? null : tr.dataset.id;
    state.openSub = null;
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

Promise.all([fetch("data/classes.json").then(r => r.json()), fetch("data/subclasses.json").then(r => r.json())])
  .then(([c, s]) => {
    CLASSES = c.classes;
    for (const x of s.subclasses) (SUBS[x.class.id] = SUBS[x.class.id] || []).push(x);
    for (const id in SUBS) SUBS[id].sort((a, b) => a.name.en.localeCompare(b.name.en));
    buildFilters();
    readHash();
    $("#q").value = state.q;
    bind();
    render();
    if (c.generated) $("#generated").textContent = "· " + c.generated;
  });
