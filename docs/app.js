"use strict";

const T = {
  en: {
    title: "Spells", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod", wiki: "Wiki",
    nav_home: "Home", nav_spells: "Spells", nav_feats: "Feats", nav_backgrounds: "Backgrounds",
    search: "Search spells by name or description", filters: "Filters", reset: "Reset",
    col_name: "Name", col_level: "Level", col_cast: "Casting Time", col_range: "Range",
    col_effect: "Attack / Save", col_damage: "Damage", col_school: "School",
    empty: "No spells match these filters.", footer: "Generated from the mod's game data.",
    count: (n, all) => `${n} of ${all} spells`,
    f_level: "Level", f_class: "Class", f_school: "School", f_cast: "Casting Time",
    f_props: "Properties", f_damage: "Damage Type", f_save: "Saving Throw", f_attack: "Attack",
    f_source: "Source",
    cantrip: "Cantrip", level: n => `${n}`,
    action: "Action", bonus: "Bonus Action", reaction: "Reaction",
    concentration: "Concentration", ritual: "Ritual", scroll: "Has a scroll", sangromancy: "Sangromancy",
    new: "New", revised: "Revised", vanilla: "Unchanged",
    save_suffix: " save", self: "Self", melee: "Melee", touch: "Touch",
    d_components: "Components", d_area: "Area", d_classes: "Classes", d_variants: "Options",
    d_id: "Spell ID", d_scroll: "Scroll", yes: "Yes", no: "No",
    shape_Cone: "Cone", shape_Square: "Square", radius: "radius", weapon_range: "Weapon range",
  },
  ko: {
    title: "주문", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드", wiki: "위키",
    nav_home: "홈", nav_spells: "주문", nav_feats: "재주", nav_backgrounds: "배경",
    search: "주문 이름이나 설명으로 검색", filters: "필터", reset: "초기화",
    col_name: "이름", col_level: "레벨", col_cast: "시전 시간", col_range: "사거리",
    col_effect: "공격 / 내성", col_damage: "피해", col_school: "학파",
    empty: "조건에 맞는 주문이 없습니다.", footer: "모드 게임 데이터에서 생성했습니다.",
    count: (n, all) => `주문 ${all}종 중 ${n}종`,
    f_level: "레벨", f_class: "직업", f_school: "학파", f_cast: "시전 시간",
    f_props: "속성", f_damage: "피해 유형", f_save: "내성 굴림", f_attack: "공격",
    f_source: "구분",
    cantrip: "소마법", level: n => `${n}레벨`,
    action: "행동", bonus: "보조 행동", reaction: "대응",
    concentration: "집중", ritual: "의식", scroll: "두루마리 있음", sangromancy: "혈마법",
    new: "새 주문", revised: "개정", vanilla: "변경 없음",
    save_suffix: " 내성", self: "자신", melee: "근접", touch: "접촉",
    d_components: "구성 요소", d_area: "범위", d_classes: "직업", d_variants: "선택지",
    d_id: "주문 ID", d_scroll: "두루마리", yes: "있음", no: "없음",
    shape_Cone: "원뿔", shape_Square: "사각형", radius: "반경", weapon_range: "무기 사거리",
  },
};

const NAMES = {
  school: {
    Abjuration: ["Abjuration", "방호술"], Conjuration: ["Conjuration", "창조술"],
    Divination: ["Divination", "예지술"], Enchantment: ["Enchantment", "환혹술"],
    Evocation: ["Evocation", "방출술"], Illusion: ["Illusion", "환영술"],
    Necromancy: ["Necromancy", "사령술"], Transmutation: ["Transmutation", "변환술"],
  },
  classes: {
    Artificer: ["Artificer", "아티피서"], Bard: ["Bard", "바드"], Cleric: ["Cleric", "클레릭"],
    Druid: ["Druid", "드루이드"], Paladin: ["Paladin", "팔라딘"], Ranger: ["Ranger", "레인저"],
    Sorcerer: ["Sorcerer", "소서러"], Warlock: ["Warlock", "워락"], Wizard: ["Wizard", "위저드"],
  },
  damage: {
    Acid: ["Acid", "산성"], Bludgeoning: ["Bludgeoning", "타격"], Cold: ["Cold", "냉기"],
    Fire: ["Fire", "화염"], Force: ["Force", "역장"], Lightning: ["Lightning", "번개"],
    Necrotic: ["Necrotic", "사령"], Piercing: ["Piercing", "관통"], Poison: ["Poison", "독"],
    Psychic: ["Psychic", "정신"], Radiant: ["Radiant", "광휘"], Slashing: ["Slashing", "참격"],
    Thunder: ["Thunder", "천둥"],
  },
  saves: {
    Strength: ["Strength", "근력"], Dexterity: ["Dexterity", "민첩"], Constitution: ["Constitution", "건강"],
    Intelligence: ["Intelligence", "지능"], Wisdom: ["Wisdom", "지혜"], Charisma: ["Charisma", "매력"],
  },
  attack: {
    MeleeSpellAttack: ["Melee Spell Attack", "근접 주문 공격"],
    RangedSpellAttack: ["Ranged Spell Attack", "원거리 주문 공격"],
    MeleeWeaponAttack: ["Melee Weapon Attack", "근접 무기 공격"],
    RangedWeaponAttack: ["Ranged Weapon Attack", "원거리 무기 공격"],
  },
};

const FILTERS = [
  { key: "level", label: "f_level", values: [0, 1, 2, 3, 4, 5, 6] },
  { key: "classes", label: "f_class", values: Object.keys(NAMES.classes) },
  { key: "school", label: "f_school", values: Object.keys(NAMES.school) },
  { key: "cast", label: "f_cast", values: ["action", "bonus", "reaction"] },
  { key: "props", label: "f_props", values: ["concentration", "ritual", "scroll", "sangromancy"], all: true },
  { key: "damage", label: "f_damage", values: Object.keys(NAMES.damage) },
  { key: "saves", label: "f_save", values: Object.keys(NAMES.saves) },
  { key: "attack", label: "f_attack", values: Object.keys(NAMES.attack) },
  { key: "source", label: "f_source", values: ["new", "revised", "vanilla"] },
];

const state = { lang: "en", q: "", sel: {}, sort: "level", dir: 1, open: null };
let SPELLS = [];

const $ = s => document.querySelector(s);
const t = k => T[state.lang][k] ?? k;
const nm = (group, v) => (NAMES[group] && NAMES[group][v]) ? NAMES[group][v][state.lang === "ko" ? 1 : 0] : v;

function valueLabel(f, v) {
  if (f.key === "level") return v === 0 ? t("cantrip") : t("level")(v);
  if (["cast", "props", "source"].includes(f.key)) return t(v);
  return nm(f.key, v);
}

function rangeText(s) {
  const r = s.range;
  if (r === "MeleeMainWeaponRange") return t("melee");
  if (r === "RangedMainWeaponRange") return t("weapon_range");
  if (r === "" || r === "0") return t("self");
  if (r === "1.5") return t("touch") + " (1.5m)";
  return `${r}m`;
}
function rangeNum(s) {
  const n = parseFloat(s.range);
  return Number.isFinite(n) ? n : (s.range === "MeleeMainWeaponRange" ? 1.5 : 0);
}
function levelText(l) { return l === 0 ? t("cantrip") : t("level")(l); }
function effectText(s) {
  return [...s.attack.map(a => nm("attack", a)), ...s.saves.map(a => nm("saves", a) + t("save_suffix"))].join(", ");
}

function matches(s) {
  if (state.q) {
    const q = state.q.toLowerCase();
    const hay = [s.name.en, s.name.ko, s.desc.en, s.desc.ko, s.id].join("\n").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  for (const f of FILTERS) {
    const sel = state.sel[f.key];
    if (!sel || !sel.size) continue;
    if (f.key === "props") {
      for (const p of sel) if (!s[p]) return false;
      continue;
    }
    const v = s[f.key];
    const vals = Array.isArray(v) ? v : [v];
    if (!vals.some(x => sel.has(x))) return false;
  }
  return true;
}

const CAST_ORDER = { action: 0, bonus: 1, reaction: 2 };
function sortKey(s) {
  switch (state.sort) {
    case "name": return s.name[state.lang].toLowerCase();
    case "cast": return CAST_ORDER[s.cast[0]] ?? 9;
    case "range": return rangeNum(s);
    case "school": return nm("school", s.school);
    default: return s.level;
  }
}

function esc(x) {
  return String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderFilters() {
  const box = $("#filters");
  box.innerHTML = FILTERS.map(f => `
    <div class="fgroup">
      <div class="label">${esc(t(f.label))}</div>
      <div class="chips">${f.values.map(v => {
        const on = state.sel[f.key] && state.sel[f.key].has(v);
        return `<button type="button" class="chip" data-f="${f.key}" data-v="${esc(v)}" aria-pressed="${!!on}">${esc(valueLabel(f, v))}</button>`;
      }).join("")}</div>
    </div>`).join("");
}

function renderTable() {
  const rows = SPELLS.filter(matches).sort((a, b) => {
    const x = sortKey(a), y = sortKey(b);
    if (x < y) return -state.dir;
    if (x > y) return state.dir;
    return a.name[state.lang].localeCompare(b.name[state.lang]);
  });
  $("#count").textContent = t("count")(rows.length, SPELLS.length);
  $("#empty").hidden = rows.length > 0;
  document.querySelectorAll("th[data-sort]").forEach(th => {
    th.setAttribute("aria-sort", th.dataset.sort === state.sort ? (state.dir > 0 ? "ascending" : "descending") : "none");
  });
  const L = state.lang;
  $("#spells tbody").innerHTML = rows.map(s => {
    const open = state.open === s.id;
    const tags = [
      s.source !== "vanilla" ? `<span class="tag ${s.source}">${esc(t(s.source))}</span>` : "",
      s.sangromancy ? `<span class="tag blood">${esc(t("sangromancy"))}</span>` : "",
    ].join("");
    const flags = [s.concentration ? t("concentration") : "", s.ritual ? t("ritual") : ""].filter(Boolean).join(" · ");
    const row = `<tr class="row" data-id="${esc(s.id)}" aria-expanded="${open}">
      <td><div class="name"><img src="icons/${esc(s.icon)}.png" alt="" loading="lazy" width="32" height="32">
        <div><strong>${esc(s.name[L])}</strong><span class="tags">${tags}</span>${flags ? `<div class="mini">${esc(flags)}</div>` : ""}</div></div></td>
      <td>${esc(levelText(s.level))}</td>
      <td>${esc(s.cast.map(t).join(", "))}</td>
      <td class="hide-sm">${esc(rangeText(s))}</td>
      <td class="hide-sm">${esc(effectText(s))}</td>
      <td class="hide-md">${esc(s.damage.map(d => nm("damage", d)).join(", "))}</td>
      <td class="hide-md">${esc(nm("school", s.school))}</td>
    </tr>`;
    return open ? row + detail(s) : row;
  }).join("");
}

function detail(s) {
  const L = state.lang;
  const area = s.area ? `${s.area}m ${t("radius")}` : (s.shape ? t("shape_" + s.shape) : "");
  const items = [
    [t("col_level"), levelText(s.level)],
    [t("col_school"), nm("school", s.school) + (s.sangromancy ? ` (${t("sangromancy")})` : "")],
    [t("col_cast"), s.cast.map(t).join(", ")],
    [t("col_range"), rangeText(s)],
    area && [t("d_area"), area],
    [t("d_components"), s.components.join(", ") || "—"],
    [t("concentration"), s.concentration ? t("yes") : t("no")],
    s.ritual && [t("ritual"), t("yes")],
    effectText(s) && [t("col_effect"), effectText(s)],
    s.damage.length && [t("col_damage"), s.damage.map(d => nm("damage", d)).join(", ")],
    [t("d_classes"), s.classes.map(c => nm("classes", c)).join(", ")],
    [t("d_scroll"), s.scroll ? t("yes") : t("no")],
    [t("d_id"), s.id],
  ].filter(Boolean);
  return `<tr class="detail"><td colspan="7">
    <div class="grid">${items.map(([k, v]) => `<div><div class="k">${esc(k)}</div>${esc(v)}</div>`).join("")}</div>
    ${s.desc[L] ? `<p>${esc(s.desc[L])}</p>` : ""}
    ${s.variants.length ? `<div class="k">${esc(t("d_variants"))}</div><ul>${s.variants.map(v => `<li>${esc(v.name[L])}</li>`).join("")}</ul>` : ""}
  </td></tr>`;
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

// Filters live in the URL hash so a search can be shared: #lang=ko&level=1,2&classes=Wizard
function writeHash() {
  const p = new URLSearchParams();
  p.set("lang", state.lang);
  if (state.q) p.set("q", state.q);
  for (const [k, v] of Object.entries(state.sel)) if (v.size) p.set(k, [...v].join(","));
  if (state.sort !== "level" || state.dir !== 1) p.set("sort", (state.dir < 0 ? "-" : "") + state.sort);
  history.replaceState(null, "", "#" + p.toString());
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
    if (v) state.sel[f.key] = new Set(v.split(",").map(x => f.key === "level" ? Number(x) : x));
  }
  const s = p.get("sort");
  if (s) { state.dir = s.startsWith("-") ? -1 : 1; state.sort = s.replace(/^-/, ""); }
}

function render() { applyLang(); renderFilters(); renderTable(); writeHash(); }

function bind() {
  window.addEventListener("hashchange", () => { readHash(); $("#q").value = state.q; render(); });
  $("#q").addEventListener("input", e => { state.q = e.target.value.trim(); renderTable(); writeHash(); });
  $("#filters").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const f = FILTERS.find(x => x.key === b.dataset.f);
    const v = f.key === "level" ? Number(b.dataset.v) : b.dataset.v;
    const set = state.sel[f.key] || (state.sel[f.key] = new Set());
    set.has(v) ? set.delete(v) : set.add(v);
    b.setAttribute("aria-pressed", set.has(v));
    renderTable(); writeHash();
  });
  document.querySelector("#spells thead").addEventListener("click", e => {
    const th = e.target.closest("th[data-sort]");
    if (!th) return;
    if (state.sort === th.dataset.sort) state.dir = -state.dir; else { state.sort = th.dataset.sort; state.dir = 1; }
    renderTable(); writeHash();
  });
  $("#spells tbody").addEventListener("click", e => {
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

fetch("data/spells.json")
  .then(r => r.json())
  .then(d => {
    SPELLS = d.spells;
    readHash();
    $("#q").value = state.q;
    bind();
    render();
    if (d.generated) $("#generated").textContent = "· " + d.generated;
  });
