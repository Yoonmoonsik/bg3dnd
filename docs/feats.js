"use strict";

const T = {
  en: {
    title: "Feats", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod", wiki: "Wiki",
    nav_home: "Home", nav_spells: "Spells", nav_feats: "Feats", nav_fighting: "Fighting Styles", nav_mastery: "Weapon Mastery", nav_weapons: "Weapons", nav_rules: "Rules", nav_species: "Species", nav_backgrounds: "Backgrounds", nav_classes: "Classes",
    search: "Search feats by name or description", filters: "Filters", reset: "Reset",
    col_name: "Name", col_abilities: "Ability Score", col_requirement: "Prerequisite", col_grants: "Grants",
    empty: "No feats match these filters.", footer: "Generated from the mod's game data.",
    count: (n, all) => `${n} of ${all} feats`,
    f_abilities: "Ability Score +1", f_requirement: "Prerequisite", f_grants: "Grants",
    f_proficiency: "Proficiency", f_defense: "Defense and Senses", f_uses: "Limited Uses", f_source: "Source",
    req_none: "None", req_proficiency: "Armour proficiency", req_species: "Species",
    repeatable: "Repeatable", spells: "Spells", action: "Action", bonus: "Bonus Action", reaction: "Reaction",
    free: "Free", choices: "Choice of options",
    skills: "Skills", expertise: "Expertise", armor: "Armour", weapons: "Weapons", saves: "Saving Throws",
    tools: "Instruments",
    ac: "Armour Class", initiative: "Initiative", resistance: "Resistance", immunity: "Condition Immunity",
    darkvision: "Darkvision", speed: "Movement Speed",
    long: "Per Long Rest", short: "Per Short Rest",
    new: "New", revised: "Revised", vanilla: "Unchanged",
    LightArmor: "Light Armour", MediumArmor: "Medium Armour", HeavyArmor: "Heavy Armour",
    light: "Light Armour", medium: "Medium Armour", heavy: "Heavy Armour", shield: "Shields",
    MartialWeapons: "Martial Weapons", MusicalInstrument: "Musical Instrument",
    d_id: "Feat ID", d_choices: "Choose one", d_spells: "Spells", d_actions: "Actions",
    d_proficiency: "Proficiency", plus: n => `+${n}`,
  },
  ko: {
    title: "재주", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드", wiki: "위키",
    nav_home: "홈", nav_spells: "주문", nav_feats: "재주", nav_fighting: "전투 방식", nav_mastery: "무기 숙련술", nav_weapons: "무기", nav_rules: "규칙", nav_species: "종족", nav_backgrounds: "배경", nav_classes: "직업",
    search: "재주 이름이나 설명으로 검색", filters: "필터", reset: "초기화",
    col_name: "이름", col_abilities: "능력치", col_requirement: "선행 조건", col_grants: "얻는 것",
    empty: "조건에 맞는 재주가 없습니다.", footer: "모드 게임 데이터에서 생성했습니다.",
    count: (n, all) => `재주 ${all}종 중 ${n}종`,
    f_abilities: "능력치 +1", f_requirement: "선행 조건", f_grants: "얻는 것",
    f_proficiency: "숙련", f_defense: "방어와 감각", f_uses: "횟수 제한", f_source: "구분",
    req_none: "없음", req_proficiency: "갑옷 숙련", req_species: "종족",
    repeatable: "여러 번 선택 가능", spells: "주문", action: "행동", bonus: "보조 행동", reaction: "대응",
    free: "자유", choices: "선택지",
    skills: "기술", expertise: "통달", armor: "갑옷", weapons: "무기", saves: "내성 굴림",
    tools: "악기",
    ac: "방어도", initiative: "선제권", resistance: "저항", immunity: "상태 면역",
    darkvision: "암시야", speed: "이동 속도",
    long: "긴 휴식마다", short: "짧은 휴식마다",
    new: "새 재주", revised: "개정", vanilla: "변경 없음",
    LightArmor: "경갑", MediumArmor: "평갑", HeavyArmor: "중갑",
    light: "경갑", medium: "평갑", heavy: "중갑", shield: "방패",
    MartialWeapons: "군용 무기", MusicalInstrument: "악기",
    d_id: "재주 ID", d_choices: "하나를 고름", d_spells: "주문", d_actions: "행동",
    d_proficiency: "숙련", plus: n => `+${n}`,
  },
};

const ABILITIES = {
  Strength: ["Strength", "근력"], Dexterity: ["Dexterity", "민첩"], Constitution: ["Constitution", "건강"],
  Intelligence: ["Intelligence", "지능"], Wisdom: ["Wisdom", "지혜"], Charisma: ["Charisma", "매력"],
};

// Each filter value is a predicate on a feat; values in one group are OR-ed, groups are AND-ed.
const FILTERS = [
  { key: "abilities", label: "f_abilities", values: Object.keys(ABILITIES),
    test: (f, v) => f.abilities.includes(v), text: v => ab(v) },
  { key: "requirement", label: "f_requirement", values: ["req_none", "req_proficiency", "req_species"],
    test: (f, v) => (f.requirement ? "req_" + f.requirement.type : "req_none") === v },
  { key: "grants", label: "f_grants", values: ["spells", "action", "bonus", "reaction", "choices", "repeatable"],
    test: (f, v) => v === "spells" ? f.spells.length > 0 : v === "choices" ? f.choices.length > 0
      : v === "repeatable" ? f.repeatable : f.actions.some(a => a.cost === v) },
  { key: "proficiency", label: "f_proficiency", values: ["skills", "expertise", "armor", "weapons", "saves", "tools"],
    test: (f, v) => { const p = f.proficiency[v]; return Array.isArray(p) ? p.length > 0 : p > 0; } },
  { key: "defense", label: "f_defense", values: ["ac", "initiative", "resistance", "immunity", "darkvision", "speed"],
    test: (f, v) => f.defense.includes(v) },
  { key: "uses", label: "f_uses", values: ["long", "short"], test: (f, v) => f.uses.includes(v) },
  { key: "source", label: "f_source", values: ["new", "revised", "vanilla"], test: (f, v) => f.source === v },
];

const state = { lang: "en", q: "", sel: {}, dir: 1, open: null };
let FEATS = [];

const $ = s => document.querySelector(s);
const t = k => T[state.lang][k] ?? k;
const L = o => o[state.lang] || o.en;
const ab = v => ABILITIES[v] ? ABILITIES[v][state.lang === "ko" ? 1 : 0] : v;

function esc(x) {
  return String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function reqText(r) {
  if (!r) return "";
  if (r.type === "proficiency") return t(r.proficiency);
  if (r.type === "species") return r.species.map(L).join(", ");
  if (r.type === "ability") return `${ab(r.ability)} ${r.value}`;
  return r.text || "";
}

function grantsList(f) {
  const out = [];
  if (f.spells.length) out.push(`${t("spells")} ${f.spells.length}`);
  for (const cost of ["action", "bonus", "reaction"]) {
    const n = f.actions.filter(a => a.cost === cost).length;
    if (n) out.push(`${t(cost)} ${n}`);
  }
  const p = f.proficiency;
  if (p.skills) out.push(`${t("skills")} ${p.skills}`);
  if (p.expertise) out.push(`${t("expertise")} ${p.expertise}`);
  for (const a of p.armor) out.push(t(a));
  for (const w of p.weapons) out.push(t(w));
  if (p.saves.length) out.push(t("saves"));
  for (const x of p.tools) out.push(t(x));
  for (const d of f.defense) out.push(t(d));
  return out;
}

function matches(f) {
  if (state.q) {
    const q = state.q.toLowerCase();
    const hay = [f.name.en, f.name.ko, f.desc.en, f.desc.ko, f.id,
      ...f.choices.flatMap(c => [c.en, c.ko]), ...f.spells.flatMap(s => [s.en, s.ko])].join("\n").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  for (const flt of FILTERS) {
    const sel = state.sel[flt.key];
    if (sel && sel.size && ![...sel].some(v => flt.test(f, v))) return false;
  }
  return true;
}

function renderFilters() {
  $("#filters").innerHTML = FILTERS.map(f => `
    <div class="fgroup">
      <div class="label">${esc(t(f.label))}</div>
      <div class="chips">${f.values.map(v => {
        const on = state.sel[f.key] && state.sel[f.key].has(v);
        return `<button type="button" class="chip" data-f="${f.key}" data-v="${esc(v)}" aria-pressed="${!!on}">${esc(f.text ? f.text(v) : t(v))}</button>`;
      }).join("")}</div>
    </div>`).join("");
}

function renderTable() {
  const rows = FEATS.filter(matches).sort((a, b) => state.dir * L(a.name).localeCompare(L(b.name)));
  $("#count").textContent = t("count")(rows.length, FEATS.length);
  $("#empty").hidden = rows.length > 0;
  const th = document.querySelector('th[data-sort="name"]');
  th.setAttribute("aria-sort", state.dir > 0 ? "ascending" : "descending");
  $("#feats tbody").innerHTML = rows.map(f => {
    const open = state.open === f.id;
    const tags = [
      f.source !== "vanilla" ? `<span class="tag ${f.source}">${esc(t(f.source))}</span>` : "",
      f.repeatable ? `<span class="tag blood">${esc(t("repeatable"))}</span>` : "",
    ].join("");
    const row = `<tr class="row" data-id="${esc(f.id)}" aria-expanded="${open}">
      <td><strong>${esc(L(f.name))}</strong><span class="tags">${tags}</span></td>
      <td>${esc(f.abilities.map(ab).join(", "))}</td>
      <td class="hide-sm">${esc(reqText(f.requirement))}</td>
      <td class="hide-md">${esc(grantsList(f).join(" · "))}</td>
    </tr>`;
    return open ? row + detail(f) : row;
  }).join("");
}

function list(title, items) {
  return items.length ? `<div class="k">${esc(title)}</div><ul>${items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
}

function detail(f) {
  const p = f.proficiency;
  const prof = [
    p.skills ? `${t("skills")} ${p.skills}` : "", p.expertise ? `${t("expertise")} ${p.expertise}` : "",
    ...p.armor.map(t), ...p.weapons.map(t), ...p.tools.map(t),
    p.saves.length ? `${t("saves")}: ${p.saves.map(ab).join(", ")}` : "",
  ].filter(Boolean);
  const items = [
    [t("col_abilities"), f.abilities.map(ab).join(", ") || "—"],
    f.requirement && [t("col_requirement"), reqText(f.requirement)],
    f.uses.length && [t("f_uses"), f.uses.map(t).join(", ")],
    f.defense.length && [t("f_defense"), f.defense.map(t).join(", ")],
    [t("f_source"), t(f.source)],
    [t("d_id"), f.id],
  ].filter(Boolean);
  return `<tr class="detail"><td colspan="4">
    <div class="grid">${items.map(([k, v]) => `<div><div class="k">${esc(k)}</div>${esc(v)}</div>`).join("")}</div>
    ${L(f.desc) ? `<p>${esc(L(f.desc))}</p>` : ""}
    ${list(t("d_choices"), f.choices.map(L))}
    ${list(t("d_spells"), f.spells.map(L))}
    ${list(t("d_actions"), f.actions.map(a => `${L(a.name)} (${t(a.cost)})`))}
    ${list(t("d_proficiency"), prof)}
  </td></tr>`;
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
  document.querySelectorAll("nav.pages a").forEach(a => {
    a.href = a.getAttribute("href").split("#")[0] + "#lang=" + state.lang;
  });
  document.title = `${t("title")} · D&D 5.5e All-in-One BEYOND`;
}

// Filters live in the URL hash so a search can be shared: #lang=ko&abilities=Strength
function writeHash() {
  const p = new URLSearchParams();
  p.set("lang", state.lang);
  if (state.q) p.set("q", state.q);
  for (const [k, v] of Object.entries(state.sel)) if (v.size) p.set(k, [...v].join(","));
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
  state.sel = {};
  for (const f of FILTERS) {
    const v = p.get(f.key);
    if (v) state.sel[f.key] = new Set(v.split(","));
  }
  state.dir = p.get("sort") === "-name" ? -1 : 1;
  state.open = p.get("open") || state.open;
}

// #open=<feat id> (links from the background page) expands that row and scrolls to it once.
function openFromHash() {
  const id = new URLSearchParams(location.hash.slice(1)).get("open");
  if (!id) return;
  const row = [...document.querySelectorAll("tr.row")].find(r => r.dataset.id === id);
  if (row) row.scrollIntoView({ block: "center" });
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
  $("#feats tbody").addEventListener("click", e => {
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

fetch("data/feats.json")
  .then(r => r.json())
  .then(d => {
    FEATS = d.feats;
    readHash();
    $("#q").value = state.q;
    bind();
    render();
    openFromHash();
    if (d.generated) $("#generated").textContent = "· " + d.generated;
  });
