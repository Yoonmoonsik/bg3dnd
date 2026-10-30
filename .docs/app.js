"use strict";

const T = {
  en: {
    title: "Spells", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod",
    nav_home: "Home", nav_spells: "Spells", nav_feats: "Feats", nav_fighting: "Fighting Styles", nav_mastery: "Weapon Mastery", nav_weapons: "Weapons", nav_rules: "Rules", nav_species: "Species", nav_backgrounds: "Backgrounds", nav_builder: "Build Simulator", nav_classes: "Classes",
    search: "Search spells by name or description", filters: "Filters", reset: "Reset",
    col_name: "Name", col_level: "Level", col_cast: "Casting Time", col_range: "Range",
    col_effect: "Attack / Save", col_damage: "Damage", col_school: "School",
    empty: "No spells match these filters.", footer: "Generated from the mod's game data.",
    count: (n, all) => `${n} of ${all} spells`,
    f_level: "Level", f_class: "Class", f_school: "School", f_cast: "Casting Time", f_dur: "Duration",
    f_props: "Properties", f_damage: "Damage Type", f_save: "Saving Throw", f_attack: "Attack",
    f_source: "Source",
    dur_instant: "Instant", dur_1min: "1 minute", dur_10min: "10 minutes", dur_long: "Until long rest",
    d_upcast: "Upcast",
    cantrip: "Cantrip", level: n => `${n}`,
    action: "Action", bonus: "Bonus Action", reaction: "Reaction",
    concentration: "Concentration", ritual: "Ritual", scroll: "Has a scroll", sangromancy: "Sangromancy",
    new: "New", revised: "Revised", vanilla: "Unchanged",
    save_suffix: " save", self: "Self", melee: "Melee", touch: "Touch",
    d_components: "Components", d_area: "Area", d_classes: "Classes", d_variants: "Options",
    d_damage: "Damage", d_status: "Statuses",
    d_id: "Spell ID", d_scroll: "Scroll", yes: "Yes", no: "No",
    d_diff: n => `Changed from vanilla (${n} fields)`, d_field: "Field", d_vanilla: "Vanilla", d_mod: "This mod",
    turn_long: "until long rest", turns: n => n === 1 ? "1 turn" : n + " turns",
    shape_Cone: "Cone", shape_Square: "Square", radius: "radius", weapon_range: "Weapon range",
  },
  ko: {
    title: "주문", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드",
    nav_home: "홈", nav_spells: "주문", nav_feats: "재주", nav_fighting: "전투 방식", nav_mastery: "무기 숙련술", nav_weapons: "무기", nav_rules: "규칙", nav_species: "종족", nav_backgrounds: "배경", nav_builder: "빌드 시뮬레이터", nav_classes: "직업",
    search: "주문 이름이나 설명으로 검색", filters: "필터", reset: "초기화",
    col_name: "이름", col_level: "레벨", col_cast: "시전 시간", col_range: "사거리",
    col_effect: "공격 / 내성", col_damage: "피해", col_school: "학파",
    empty: "조건에 맞는 주문이 없습니다.", footer: "모드 게임 데이터에서 생성했습니다.",
    count: (n, all) => `주문 ${all}종 중 ${n}종`,
    f_level: "레벨", f_class: "직업", f_school: "학파", f_cast: "시전 시간", f_dur: "지속 시간",
    f_props: "속성", f_damage: "피해 유형", f_save: "내성 굴림", f_attack: "공격",
    f_source: "구분",
    dur_instant: "즉시", dur_1min: "1분", dur_10min: "10분", dur_long: "긴 휴식까지",
    d_upcast: "업캐스트",
    cantrip: "소마법", level: n => `${n}레벨`,
    action: "행동", bonus: "보조 행동", reaction: "대응",
    concentration: "집중", ritual: "의식", scroll: "두루마리 있음", sangromancy: "혈마법",
    new: "새 주문", revised: "개정", vanilla: "변경 없음",
    save_suffix: " 내성", self: "자신", melee: "근접", touch: "접촉",
    d_components: "구성 요소", d_area: "범위", d_classes: "직업", d_variants: "선택지",
    d_damage: "피해", d_status: "상태 효과",
    d_id: "주문 ID", d_scroll: "두루마리", yes: "있음", no: "없음",
    d_diff: n => `바닐라 대비 변경 (필드 ${n}개)`, d_field: "필드", d_vanilla: "바닐라", d_mod: "이 모드",
    turn_long: "긴 휴식까지", turns: n => n + "턴",
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
    Fire: ["Fire", "화염"], Force: ["Force", "역장"], Heal: ["Heal", "치유"],
    Lightning: ["Lightning", "번개"], Necrotic: ["Necrotic", "사령"], Piercing: ["Piercing", "관통"],
    Poison: ["Poison", "독"], Psychic: ["Psychic", "정신"], Radiant: ["Radiant", "광휘"],
    Slashing: ["Slashing", "참격"], Thunder: ["Thunder", "천둥"],
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
  { key: "dur", label: "f_dur", values: ["instant", "1min", "10min", "long"] },
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
// Damage type colors from the game's GenericIcon_DamageType_* icons (glow average); physical types stay uncolored.
const DAMAGE_COLOR = {
  Acid: "#eff25c", Cold: "#33c4e7", Fire: "#e17528", Force: "#df7072", Heal: "#5ae4de",
  Lightning: "#5389e6", Necrotic: "#4fbf79", Poison: "#bfdd4c", Psychic: "#c657ac",
  Radiant: "#dcc154", Thunder: "#ac73c7",
};
// Casting-time colors from the game's ActionPoint / BonusActionPoint / ReactionActionPoint icons.
const CAST_COLOR = {
  action: "#00a540", bonus: "#ff5200", reaction: "#fe88fa",
};
const dmgSpan = d => (DAMAGE_COLOR[d] ? `<span class="dmg" style="--dmg:${DAMAGE_COLOR[d]}">${esc(nm("damage", d))}</span>` : esc(nm("damage", d)));
const castSpan = c => (CAST_COLOR[c] ? `<span class="cast" style="--cast:${CAST_COLOR[c]}">${esc(t(c))}</span>` : esc(t(c)));
const nm = (group, v) => (NAMES[group] && NAMES[group][v]) ? NAMES[group][v][state.lang === "ko" ? 1 : 0] : v;
// Color the damage-type word inside a damage expression ("1d10 Piercing damage" -> the type word).
// When the type word isn't in the text (heal: "1d4 hit points"), color the whole line.
const tdlSpan = e => {
  const txt = e[state.lang];
  if (!e.type || !DAMAGE_COLOR[e.type]) return esc(txt);
  const word = nm("damage", e.type);
  const i = txt.indexOf(word);
  if (i < 0) return `<span class="dmg" style="--dmg:${DAMAGE_COLOR[e.type]}">${esc(txt)}</span>`;
  const span = `<span class="dmg" style="--dmg:${DAMAGE_COLOR[e.type]}">${esc(word)}</span>`;
  return esc(txt.slice(0, i)) + span + esc(txt.slice(i + word.length));
};
// A status id ("ARMS_OF_HADAR") as a readable name ("Arms of Hadar"); small words stay lowercase.
const statusName = id => {
  const small = new Set(["of", "and", "the", "for", "to"]);
  return id.replace(/_/g, " ").toLowerCase().split(" ").map((w, i) =>
    (i !== 0 && small.has(w)) ? w : (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
};
const durText = n => n === -1 ? t("turn_long") : t("turns")(n);
// One lasting condition: the localized name + duration, with the localized description below it.
const tsaBlock = e => {
  const L = state.lang;
  const name = esc((e.name && (e.name[L] || e.name.en)) || statusName(e.status));
  const desc = e.desc && e.desc[L] ? `<div class="tsa-d">${esc(e.desc[L])}</div>` : "";
  return `<div class="tsa"><span class="tsa-n">${name}</span> <span class="tsa-dur">(${esc(durText(e.turns))})</span>${desc}</div>`;
};

function valueLabel(f, v) {
  if (f.key === "level") return v === 0 ? t("cantrip") : t("level")(v);
  if (["cast", "props", "source"].includes(f.key)) return t(v);
  if (f.key === "dur") return t("dur_" + v);
  return nm(f.key, v);
}
// Damage-type filter chips show the type in its matching damage color (physical types stay uncolored).
// Casting-time filter chips show the type in its matching cast color.
const chipLabel = (f, v) => {
  if (f.key === "damage" && DAMAGE_COLOR[v])
    return `<span class="dmg" style="--dmg:${DAMAGE_COLOR[v]}">${esc(valueLabel(f, v))}</span>`;
  if (f.key === "cast" && CAST_COLOR[v])
    return `<span class="cast" style="--cast:${CAST_COLOR[v]}">${esc(valueLabel(f, v))}</span>`;
  return esc(valueLabel(f, v));
};

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
  box.innerHTML = FILTERS.map(f => {
    let vals = f.values;
    if (state.lang === "ko" && f.key === "damage")
      vals = [...vals].sort((a, b) => NAMES.damage[a][1].localeCompare(NAMES.damage[b][1], "ko"));
    return `
    <div class="fgroup">
      <div class="label">${esc(t(f.label))}</div>
      <div class="chips">${vals.map(v => {
        const on = state.sel[f.key] && state.sel[f.key].has(v);
        return `<button type="button" class="chip" data-f="${f.key}" data-v="${esc(v)}" aria-pressed="${!!on}">${chipLabel(f, v)}</button>`;
      }).join("")}</div>
    </div>`;
  }).join("");
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
      <td>${s.cast.map(castSpan).join(", ")}</td>
      <td class="hide-sm">${esc(rangeText(s))}</td>
      <td class="hide-sm">${esc(effectText(s))}</td>
      <td class="hide-md">${s.damage.map(dmgSpan).join(", ")}</td>
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
    [t("col_cast"), null, s.cast.map(castSpan).join(", ")],
    [t("col_range"), rangeText(s)],
    area && [t("d_area"), area],
    [t("d_components"), s.components.join(", ") || "—"],
    [t("concentration"), s.concentration ? t("yes") : t("no")],
    s.ritual && [t("ritual"), t("yes")],
    effectText(s) && [t("col_effect"), effectText(s)],
    (s.tdl.length ? [t("d_damage"), null, s.tdl.map(tdlSpan).join("<br>")] : (s.damage.length && [t("col_damage"), null, s.damage.map(dmgSpan).join(", ")])),
    s.tsa.length && [t("d_status"), null, `<div class="tsa-list">${s.tsa.map(tsaBlock).join("")}</div>`, "tsa-cell"],
    [t("d_classes"), s.classes.map(c => nm("classes", c)).join(", ")],
    [t("d_scroll"), s.scroll ? t("yes") : t("no")],
    [t("d_id"), s.id],
  ].filter(Boolean);
  return `<tr class="detail"><td colspan="7">
    <div class="grid">${items.map(([k, v, html, cls]) => `<div${cls ? ` class="${cls}"` : ""}><div class="k">${esc(k)}</div>${html ?? esc(v)}</div>`).join("")}</div>
    ${s.desc[L] ? `<p>${esc(s.desc[L])}</p>` : ""}
    ${s.upcast ? `<div class="k">${esc(t("d_upcast"))}</div><p>${esc(s.upcast[L])}</p>` : ""}
    ${s.variants.length ? `<div class="k">${esc(t("d_variants"))}</div><ul>${s.variants.map(v => `<li>${esc(v.name[L])}</li>`).join("")}</ul>` : ""}
    ${diffBlock(s.diff)}
  </td></tr>`;
}

// Raw stat fields the mod changed, vanilla value beside the mod value.
function diffBlock(rows) {
  if (!rows || !rows.length) return "";
  return `<details class="vdiff"><summary>${esc(t("d_diff")(rows.length))}</summary><table>
    <tr><th>${esc(t("d_field"))}</th><th>${esc(t("d_vanilla"))}</th><th>${esc(t("d_mod"))}</th></tr>
    ${rows.map(r => `<tr><td>${esc(r.field)}</td><td><code>${esc(r.vanilla || "—")}</code></td><td><code>${esc(r.mod || "—")}</code></td></tr>`).join("")}
  </table></details>`;
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
  if (state.open) p.set("open", state.open);
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
  state.open = p.get("open") || state.open;
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
    // #open=<id> (shared links, site search) expands that row; scroll to it once.
    const row = [...document.querySelectorAll("tr.row")].find(r => r.dataset.id === state.open);
    if (row) row.scrollIntoView({ block: "center" });
    if (d.generated) $("#generated").textContent = "· " + d.generated;
  });
