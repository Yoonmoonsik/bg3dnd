"use strict";

const T = {
  en: {
    title: "Build Simulator", subtitle: "D&D 5.5e All-in-One BEYOND · Baldur's Gate 3 mod",
    nav_home: "Home", nav_backgrounds: "Backgrounds", nav_builder: "Build Simulator", nav_classes: "Classes", nav_feats: "Feats",
    nav_fighting: "Fighting Styles", nav_rules: "Rules", nav_species: "Species", nav_spells: "Spells", nav_mastery: "Weapon Mastery", nav_weapons: "Weapons",
    footer: "Generated from the mod's game data.",
    save: "Save JSON", load: "Load JSON", md: "Export Markdown", reset: "Reset",
    loaded: "Build loaded.", bad_file: "This file is not a saved build.", missing: n => `Not in the current data, skipped: ${n}`,
    character: "Character", species: "Species", background: "Background", abilities: "Ability Scores",
    points: (u, all) => `Points ${u} / ${all}`, preset: "Class preset", over: "Over the 27-point budget",
    level: n => `Level ${n}`, add_level: "Add level", remove_level: "Remove last level",
    cls: "Class", subclass: "Subclass", multiclass: "multiclass", choose: "— choose —",
    granted: "Gained", spells: "Spells", feat: "Feat", feat_abilities: "Ability increase",
    asi_two: "+2 to one", asi_split: "+1 to two", requirement: "Prerequisite",
    pick: (n, all) => `${n} / ${all}`, cantrip: "Cantrips", spell: "Spells", skill: "Skill proficiency",
    expertise: "Expertise", ability: "Ability bonus", passive: "Choose",
    feat_choice: "Feat options", feat_skills: "Feat skill proficiency", feat_expertise: "Feat expertise",
    summary: "Summary", hp: "Hit Points", total: "Total level", saves: "Saving Throws", skills: "Skills",
    prof: "Proficiencies", traits: "Features", slots: "Spell Slots", pact: "Pact Slots", resources: "Resources",
    choices: "Choices", feats: "Feats", none: "—", caster_level: n => `caster level ${n}`,
    slot_note: "Two or more spellcasting classes: slots from the multiclass caster level (each class's level × 1 / 0.5 / 0.34, rounded down).",
    md_title: "Build", md_species: "Species", md_background: "Background", md_classes: "Classes", md_levels: "Levels",
  },
  ko: {
    title: "빌드 시뮬레이터", subtitle: "D&D 5.5e All-in-One BEYOND · 발더스 게이트 3 모드",
    nav_home: "홈", nav_backgrounds: "배경", nav_builder: "빌드 시뮬레이터", nav_classes: "직업", nav_feats: "재주",
    nav_fighting: "전투 방식", nav_rules: "규칙", nav_species: "종족", nav_spells: "주문", nav_mastery: "무기 숙련술", nav_weapons: "무기",
    footer: "모드 게임 데이터에서 생성했습니다.",
    save: "JSON 저장", load: "JSON 불러오기", md: "마크다운 내보내기", reset: "초기화",
    loaded: "빌드를 불러왔습니다.", bad_file: "저장한 빌드 파일이 아닙니다.", missing: n => `현재 데이터에 없어 건너뛴 항목: ${n}`,
    character: "캐릭터", species: "종족", background: "배경", abilities: "능력치",
    points: (u, all) => `포인트 ${u} / ${all}`, preset: "직업 기본 분배", over: "27포인트를 넘었습니다",
    level: n => `${n}레벨`, add_level: "레벨 추가", remove_level: "마지막 레벨 삭제",
    cls: "직업", subclass: "하위 직업", multiclass: "멀티클래스", choose: "— 선택 —",
    granted: "획득", spells: "주문", feat: "재주", feat_abilities: "능력치 증가",
    asi_two: "한 능력치 +2", asi_split: "두 능력치 +1", requirement: "선행 조건",
    pick: (n, all) => `${n} / ${all}`, cantrip: "소마법", spell: "주문", skill: "기술 숙련",
    expertise: "전문화", ability: "능력치 보너스", passive: "선택",
    feat_choice: "재주 선택지", feat_skills: "재주 기술 숙련", feat_expertise: "재주 전문화",
    summary: "요약", hp: "생명력", total: "총 레벨", saves: "내성 굴림", skills: "기술",
    prof: "숙련", traits: "기능", slots: "주문 슬롯", pact: "계약 슬롯", resources: "자원",
    choices: "선택", feats: "재주", none: "—", caster_level: n => `시전자 레벨 ${n}`,
    slot_note: "주문 시전 직업이 둘 이상이면 멀티클래스 시전자 레벨(직업 레벨 × 1 / 0.5 / 0.34 합계, 내림)로 슬롯을 계산합니다.",
    md_title: "빌드", md_species: "종족", md_background: "배경", md_classes: "직업", md_levels: "레벨",
  },
};

const ABILITIES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
const AB_NAME = {
  Strength: ["Strength", "근력"], Dexterity: ["Dexterity", "민첩"], Constitution: ["Constitution", "건강"],
  Intelligence: ["Intelligence", "지능"], Wisdom: ["Wisdom", "지혜"], Charisma: ["Charisma", "매력"],
};
const COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const BUDGET = 27, MAX_LEVEL = 12, SCORE_CAP = 20, SAVE_VERSION = 1;
const ASI = "AbilityScoreIncrease";

let D = {};
const state = { lang: "en" };
let build = blank();

const t = k => T[state.lang][k] ?? k;
const L = o => (o && (o[state.lang] || o.en)) || "";
const ab = a => AB_NAME[a] ? AB_NAME[a][state.lang === "ko" ? 1 : 0] : a;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mod = s => Math.floor((s - 10) / 2);
const sign = n => (n >= 0 ? "+" : "") + n;

function blank() {
  return { version: SAVE_VERSION, species: null, background: null,
           base: { Strength: 8, Dexterity: 8, Constitution: 8, Intelligence: 8, Wisdom: 8, Charisma: 8 },
           levels: [], picks: {} };
}

// ---- data lookups -------------------------------------------------------------------------------

const cls = id => D.classes.find(c => c.id === id);
const sub = (c, id) => c && c.subclasses.find(s => s.id === id);
const speciesKey = s => `${s.race}|${s.sub || ""}`;
const spec = () => D.species.find(s => speciesKey(s) === build.species);
const bg = () => D.backgrounds.find(b => b.id === build.background);
const feat = id => D.feats.find(f => f.id === id);
const spellName = id => L(D.spells[id]?.name) || id;
const skillName = id => L(D.skills[id]) || id;

// Everything the build has at character level i: the class, its level, the progression nodes.
function timeline() {
  const counts = {}, out = [];
  build.levels.forEach((lv, i) => {
    const c = cls(lv.class);
    if (!c) return;
    counts[c.id] = (counts[c.id] || 0) + 1;
    const k = counts[c.id], level = i + 1;
    const nodes = [];
    const own = k === 1 && i > 0 ? c.multiclass : c.levels.filter(n => n.level === k);
    own.forEach(n => nodes.push({ src: `c:${c.id}:${k}${k === 1 && i > 0 ? "m" : ""}`, node: n }));
    const s = sub(c, build.subclass?.[c.id]);
    if (s && k >= c.subclass_level) {
      s.levels.filter(n => k === c.subclass_level ? n.level <= k : n.level === k)
        .forEach(n => nodes.push({ src: `s:${s.id}:${n.level}`, node: n }));
    }
    const sp = spec();
    if (sp) sp.levels.filter(n => n.level === level).forEach(n => nodes.push({ src: `r:${level}`, node: n }));
    out.push({ level, c, k, multi: k === 1 && i > 0, s, nodes });
  });
  return out;
}

const pickKey = (src, j) => `${src}:${j}`;
const picked = key => build.picks[key] || [];

// ---- derived character ---------------------------------------------------------------------------

function derive() {
  const tl = timeline();
  const bonus = Object.fromEntries(ABILITIES.map(a => [a, 0]));
  const r = { tl, saves: new Set(), prof: new Map(), skills: new Set(), expertise: new Set(), traits: [],
              spells: [], choices: [], feats: [], res: new Map(), slots: {}, pact: null, casterLevel: null };
  const b = bg();
  if (b) b.skills.forEach(s => r.skills.add(s.id));
  tl.forEach(e => {
    e.nodes.forEach(({ src, node }) => {
      if (e.level === 1 || !e.multi) node.saves.forEach(s => r.saves.add(s));
      node.prof.forEach(p => r.prof.set(p.en, p));
      node.traits.forEach(x => r.traits.push(x));
      node.spells.forEach(x => r.spells.push(x));
      node.resources.forEach(x => {
        if (/SpellSlot$/.test(x.id)) return;
        const key = x.id, cur = r.res.get(key);
        r.res.set(key, { name: x.name, count: (cur ? cur.count : 0) + x.count });
      });
      node.picks.forEach((p, j) => {
        const v = picked(pickKey(src, j));
        if (p.kind === "ability") {
          if (v[0]) bonus[v[0]] += p.bonuses[0];
          if (v[1]) bonus[v[1]] += p.bonuses[1];
        } else if (p.kind === "skill") v.forEach(s => r.skills.add(s));
        else if (p.kind === "expertise") v.forEach(s => r.expertise.add(s));
        else if (p.kind === "passive") v.forEach(id => {
          const o = p.options.find(o => o.id === id);
          if (o) r.choices.push(o.name);
        });
        else v.forEach(s => r.spells.push(s));
      });
    });
    const f = build.levels[e.level - 1].feat;
    if (f && f.id && feat(f.id)) {
      const fd = feat(f.id);
      r.feats.push(fd.name);
      (f.abilities || []).forEach((a, j) => { if (a) bonus[a] += f.id === ASI && f.mode !== "split" ? 2 : 1; });
      (f.skills || []).forEach(s => r.skills.add(s));
      (f.expertise || []).forEach(s => r.expertise.add(s));
      (f.choices || []).forEach(i => fd.choices[i] && r.choices.push(fd.choices[i]));
      fd.proficiency.saves.length === 1 && r.saves.add(fd.proficiency.saves[0]);
    }
  });
  r.scores = Object.fromEntries(ABILITIES.map(a => [a, Math.min(SCORE_CAP, build.base[a] + bonus[a])]));
  r.bonus = bonus;
  // Hit points: the first class's BaseHp at level 1, HpPerLevel after; Constitution modifier each level.
  const con = mod(r.scores.Constitution);
  r.hp = tl.reduce((hp, e) => hp + (e.level === 1 ? e.c.hp.base : e.c.hp.per_level) + con, 0);
  // Spell slots: one spellcasting class -> its own grants; two or more -> the multiclass caster level
  // on the full caster (Wizard) table. Pact slots are always their own.
  const casters = {};
  const levels = {};
  tl.forEach(e => {
    levels[e.c.id] = e.k;
    const m = e.c.caster || (e.s && e.k >= e.c.subclass_level ? e.s.caster : 0);
    if (m) casters[e.c.id] = m;
  });
  const own = {};
  const pact = {};
  tl.forEach(e => e.nodes.forEach(({ node }) => node.resources.forEach(x => {
    if (x.id === "SpellSlot") own[x.slot] = (own[x.slot] || 0) + x.count;
    if (x.id === "WarlockSpellSlot") pact[x.slot] = (pact[x.slot] || 0) + x.count;
  })));
  const ids = Object.keys(casters);
  if (ids.length >= 2) {
    const cl = Math.floor(ids.reduce((s, id) => s + levels[id] * casters[id] + 1e-9, 0));
    r.casterLevel = cl;
    const wiz = cls("Wizard");
    wiz.levels.filter(n => n.level <= cl).forEach(n => n.resources.forEach(x => {
      if (x.id === "SpellSlot") r.slots[x.slot] = (r.slots[x.slot] || 0) + x.count;
    }));
  } else r.slots = own;
  const top = Math.max(0, ...Object.keys(pact).map(Number));
  if (top) r.pact = { slot: top, count: pact[top] };
  return r;
}

// ---- rendering ----------------------------------------------------------------------------------

function abilityBlock(r) {
  const used = ABILITIES.reduce((s, a) => s + COST[build.base[a]], 0);
  const first = cls(build.levels[0]?.class);
  return `<section class="bld-card"><h2>${esc(t("abilities"))}</h2>
    <p class="mini">${esc(t("points")(used, BUDGET))}${used > BUDGET ? ` · <strong>${esc(t("over"))}</strong>` : ""}
    ${first?.preset ? ` · <button type="button" class="chip" data-act="preset">${esc(t("preset"))}: ${esc(L(first.name))}</button>` : ""}</p>
    <table class="lv bld-ab"><tbody>${ABILITIES.map(a => `<tr><th>${esc(ab(a))}</th>
      <td><button type="button" class="chip" data-act="dec" data-ab="${a}" ${build.base[a] <= 8 ? "disabled" : ""}>−</button>
      <strong>${build.base[a]}</strong>
      <button type="button" class="chip" data-act="inc" data-ab="${a}" ${build.base[a] >= 15 || used - COST[build.base[a]] + COST[build.base[a] + 1] > BUDGET ? "disabled" : ""}>+</button></td>
      <td>${r.bonus[a] ? sign(r.bonus[a]) : ""}</td><td><strong>${r.scores[a]}</strong> (${sign(mod(r.scores[a]))})</td></tr>`).join("")}
    </tbody></table></section>`;
}

function characterBlock() {
  const sp = D.species.map(s => [speciesKey(s), s.sub_name ? `${L(s.race_name)} · ${L(s.sub_name)}` : L(s.race_name)])
    .sort((a, b) => a[1].localeCompare(b[1], state.lang));
  const bgs = D.backgrounds.map(b => [b.id, L(b.name)]).sort((a, b) => a[1].localeCompare(b[1], state.lang));
  const sel = (act, list, cur) => `<select data-act="${act}"><option value="">${esc(t("choose"))}</option>${list.map(([v, n]) =>
    `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  const b = bg();
  return `<section class="bld-card"><h2>${esc(t("character"))}</h2>
    <label class="bld-row"><span>${esc(t("species"))}</span>${sel("species", sp, build.species)}</label>
    <label class="bld-row"><span>${esc(t("background"))}</span>${sel("background", bgs, build.background)}</label>
    ${b ? `<p class="mini">${esc(t("skills"))}: ${b.skills.map(s => esc(L(s.name))).join(", ")} · ${esc(t("feats"))}: ${b.feats.map(f => esc(L(f.name))).join(", ")}</p>` : ""}
  </section>`;
}

function checklist(key, options, count, label, nameOf, taken) {
  const v = picked(key);
  return `<details class="choice bld-pick" ${v.length < count ? "open" : ""}><summary>${esc(label)} <span class="mini">${esc(t("pick")(v.length, count))}</span>
    ${v.length ? `— ${v.map(x => esc(nameOf(x))).join(", ")}` : ""}</summary>
    <div class="chips">${options.map(o => {
      const on = v.includes(o), dis = !on && (v.length >= count || (taken && taken.has(o)));
      return `<button type="button" class="chip" data-act="pick" data-key="${esc(key)}" data-val="${esc(o)}" data-max="${count}"
        aria-pressed="${on}" ${dis ? "disabled" : ""}>${esc(nameOf(o))}</button>`;
    }).join("")}</div></details>`;
}

function abilityPick(key, p) {
  const v = picked(key);
  const one = (j) => `<select data-act="abpick" data-key="${esc(key)}" data-j="${j}"><option value="">${esc(t("choose"))}</option>
    ${p.options.map(a => `<option value="${a}" ${v[j] === a ? "selected" : ""} ${v[1 - j] === a ? "disabled" : ""}>${esc(ab(a))}</option>`).join("")}</select>`;
  return `<div class="bld-pick">${esc(t("ability"))}: +${p.bonuses[0]} ${one(0)} +${p.bonuses[1]} ${one(1)}</div>`;
}

function nodeBlock(src, node, r) {
  const parts = [];
  const got = [...new Set([...node.traits.map(L), ...node.spells.map(spellName)])];
  if (got.length) parts.push(`<p class="mini">${esc(t("granted"))}: ${got.map(esc).join(", ")}</p>`);
  node.picks.forEach((p, j) => {
    const key = pickKey(src, j);
    if (p.kind === "ability") parts.push(abilityPick(key, p));
    else if (p.kind === "passive") {
      const names = Object.fromEntries(p.options.map(o => [o.id, L(o.name)]));
      parts.push(checklist(key, p.options.map(o => o.id), p.count, L(p.label) || t("passive"), id => names[id] || id));
    } else if (p.kind === "skill") parts.push(checklist(key, p.options, p.count, t("skill"), skillName, otherSkills(r, key)));
    else if (p.kind === "expertise") parts.push(checklist(key, p.options, p.count, t("expertise"), skillName));
    else parts.push(checklist(key, p.options, p.count, t(p.kind), spellName));
  });
  return parts.join("");
}

// Skills the character already has from elsewhere (so a skill pick can't take them twice).
function otherSkills(r, key) {
  const own = new Set(picked(key));
  return new Set([...r.skills].filter(s => !own.has(s)));
}

function featBlock(i, r) {
  const f = build.levels[i].feat || {};
  const list = D.feats.slice().sort((a, b) => L(a.name).localeCompare(L(b.name), state.lang));
  const taken = new Set(build.levels.filter((x, j) => j !== i && x.feat?.id).map(x => x.feat.id));
  let html = `<label class="bld-row"><span>${esc(t("feat"))}</span><select data-act="feat" data-i="${i}">
    <option value="">${esc(t("choose"))}</option>${list.map(x => `<option value="${x.id}" ${x.id === f.id ? "selected" : ""}
    ${taken.has(x.id) && !x.repeatable ? "disabled" : ""}>${esc(L(x.name))}</option>`).join("")}</select></label>`;
  const fd = feat(f.id);
  if (!fd) return html;
  if (fd.requirement) {
    const q = fd.requirement;
    html += `<p class="mini">${esc(t("requirement"))}: ${esc(q.type === "species" ? q.species.map(L).join(", ") : q.proficiency)}</p>`;
  }
  if (fd.abilities.length) {
    const n = fd.id === ASI && f.mode === "split" ? 2 : 1;
    if (fd.id === ASI) html += `<div class="chips"><button type="button" class="chip" data-act="asimode" data-i="${i}" data-mode="two" aria-pressed="${f.mode !== "split"}">${esc(t("asi_two"))}</button>
      <button type="button" class="chip" data-act="asimode" data-i="${i}" data-mode="split" aria-pressed="${f.mode === "split"}">${esc(t("asi_split"))}</button></div>`;
    const v = f.abilities || [];
    html += `<div class="bld-pick">${esc(t("feat_abilities"))}: ${[...Array(n).keys()].map(j => `<select data-act="featab" data-i="${i}" data-j="${j}">
      <option value="">${esc(t("choose"))}</option>${fd.abilities.map(a => `<option value="${a}" ${v[j] === a ? "selected" : ""} ${v[1 - j] === a && n === 2 ? "disabled" : ""}>${esc(ab(a))}</option>`).join("")}</select>`).join(" ")}</div>`;
  }
  const fkey = k => `f:${i}:${k}`;
  if (fd.choices.length) {
    const idx = fd.choices.map((_, j) => String(j));
    html += checklist(fkey("choices"), idx, fd.choices.length, t("feat_choice"), j => L(fd.choices[j]));
  }
  if (fd.proficiency.skills) html += checklist(fkey("skills"), Object.keys(D.skills), fd.proficiency.skills, t("feat_skills"), skillName, otherSkills(r, fkey("skills")));
  if (fd.proficiency.expertise) html += checklist(fkey("expertise"), Object.keys(D.skills), fd.proficiency.expertise, t("feat_expertise"), skillName);
  return html;
}

function levelBlock(e, r) {
  const i = e.level - 1, lv = build.levels[i];
  const classes = D.classes.slice().sort((a, b) => L(a.name).localeCompare(L(b.name), state.lang));
  let html = `<section class="bld-card"><h2>${esc(t("level")(e.level))} · ${esc(L(e.c.name))} ${e.k}${e.multi ? ` <span class="tag">${esc(t("multiclass"))}</span>` : ""}</h2>
    <label class="bld-row"><span>${esc(t("cls"))}</span><select data-act="class" data-i="${i}">${classes.map(c =>
      `<option value="${c.id}" ${c.id === lv.class ? "selected" : ""}>${esc(L(c.name))}</option>`).join("")}</select></label>`;
  if (e.c.subclass_level && e.k === e.c.subclass_level) {
    html += `<label class="bld-row"><span>${esc(t("subclass"))}</span><select data-act="subclass" data-c="${e.c.id}">
      <option value="">${esc(t("choose"))}</option>${e.c.subclasses.map(s => `<option value="${s.id}" ${s.id === build.subclass?.[e.c.id] ? "selected" : ""}>${esc(L(s.name))}</option>`).join("")}</select></label>`;
  }
  e.nodes.forEach(({ src, node }) => { html += nodeBlock(src, node, r); });
  if (e.nodes.some(({ node }) => node.feat)) html += featBlock(i, r);
  return html + "</section>";
}

function summaryBlock(r) {
  const counts = {};
  r.tl.forEach(e => { counts[e.c.id] = e.k; });
  const clsLine = Object.entries(counts).map(([id, k]) => {
    const c = cls(id), s = sub(c, build.subclass?.[id]);
    return `${L(c.name)} ${k}${s ? ` (${L(s.name)})` : ""}`;
  }).join(" / ");
  const list = (title, items) => `<dt>${esc(title)}</dt><dd>${items.length ? items.map(esc).join(", ") : t("none")}</dd>`;
  const slots = Object.entries(r.slots).filter(([, n]) => n).map(([l, n]) => `${l}: ${n}`);
  const uniq = a => [...new Set(a)];
  return `<h2>${esc(t("summary"))}</h2><dl class="plist">
    <dt>${esc(t("total"))}</dt><dd>${r.tl.length} · ${esc(clsLine || t("none"))}</dd>
    <dt>${esc(t("hp"))}</dt><dd>${r.tl.length ? r.hp : t("none")}</dd>
    <dt>${esc(t("abilities"))}</dt><dd>${ABILITIES.map(a => `${esc(ab(a))} ${r.scores[a]}`).join(" · ")}</dd>
    ${list(t("saves"), [...r.saves].map(ab))}
    ${list(t("skills"), [...r.skills].map(s => skillName(s) + (r.expertise.has(s) ? " ★" : "")))}
    ${list(t("prof"), [...r.prof.values()].map(L))}
    ${list(t("slots"), slots.concat(r.casterLevel != null ? [`(${t("caster_level")(r.casterLevel)})`] : []))}
    ${r.pact ? list(t("pact"), [`${r.pact.slot}: ${r.pact.count}`]) : ""}
    ${list(t("resources"), [...r.res.values()].map(x => `${L(x.name)} ${x.count}`))}
    ${list(t("feats"), r.feats.map(L))}
    ${list(t("choices"), uniq(r.choices.map(L)))}
    ${list(t("traits"), uniq(r.traits.map(L)))}
    ${list(t("spells"), uniq(r.spells.map(spellName)))}
  </dl>${r.casterLevel != null ? `<p class="mini">${esc(t("slot_note"))}</p>` : ""}`;
}

function render() {
  const r = derive();
  const classes = D.classes.slice().sort((a, b) => L(a.name).localeCompare(L(b.name), state.lang));
  let html = characterBlock() + abilityBlock(r);
  r.tl.forEach(e => { html += levelBlock(e, r); });
  html += `<section class="bld-card bld-row">${build.levels.length < MAX_LEVEL ? `<select data-act="addclass">
    ${classes.map(c => `<option value="${c.id}" ${c.id === build.levels[build.levels.length - 1]?.class ? "selected" : ""}>${esc(L(c.name))}</option>`).join("")}</select>
    <button type="button" class="ghost" data-act="add">${esc(t("add_level"))}</button>` : ""}
    ${build.levels.length ? `<button type="button" class="ghost" data-act="remove">${esc(t("remove_level"))}</button>` : ""}</section>`;
  const open = [...document.querySelectorAll("#steps details")].map(d => d.open);
  document.getElementById("steps").innerHTML = html;
  document.getElementById("summary").innerHTML = summaryBlock(r);
  if (open.length) document.querySelectorAll("#steps details").forEach((d, i) => { if (i < open.length && open[i]) d.open = true; });
  save();
}

// ---- events -------------------------------------------------------------------------------------

// Picks keyed by a level's progression node: changing a class drops what that level (and later
// levels, whose class levels shift) had picked.
function dropFrom(i) {
  const keep = {};
  const tl = timeline().filter(e => e.level - 1 < i);
  const valid = new Set();
  tl.forEach(e => e.nodes.forEach(({ src, node }) => node.picks.forEach((_, j) => valid.add(pickKey(src, j)))));
  Object.entries(build.picks).forEach(([k, v]) => {
    if (valid.has(k) || (k.startsWith("f:") && +k.split(":")[1] < i)) keep[k] = v;
  });
  build.picks = keep;
  build.levels.slice(i).forEach(l => { delete l.feat; });
}

function onClick(ev) {
  const b = ev.target.closest("[data-act]");
  if (!b || b.tagName === "SELECT") return;
  const act = b.dataset.act;
  if (act === "inc" || act === "dec") build.base[b.dataset.ab] += act === "inc" ? 1 : -1;
  else if (act === "preset") Object.assign(build.base, cls(build.levels[0].class).preset);
  else if (act === "add") {
    const c = document.querySelector('[data-act="addclass"]').value;
    build.levels.push({ class: c });
    if (build.levels.length === 1 && cls(c).preset) Object.assign(build.base, cls(c).preset);
  } else if (act === "remove") {
    build.levels.pop();
    dropFrom(build.levels.length);
    const have = new Set(build.levels.map(l => l.class));
    Object.keys(build.subclass || {}).forEach(id => { if (!have.has(id)) delete build.subclass[id]; });
  } else if (act === "pick") {
    const v = picked(b.dataset.key).slice(), x = b.dataset.val, at = v.indexOf(x);
    if (at >= 0) v.splice(at, 1); else if (v.length < +b.dataset.max) v.push(x);
    build.picks[b.dataset.key] = v;
    syncFeat(b.dataset.key);
  } else if (act === "asimode") {
    const f = build.levels[+b.dataset.i].feat;
    f.mode = b.dataset.mode;
    f.abilities = [];
  } else return;
  render();
}

// Feat skill / choice picks live in build.picks under f:<i>:<kind>; mirror them on the feat.
function syncFeat(key) {
  const m = /^f:(\d+):(\w+)$/.exec(key);
  if (!m) return;
  const f = build.levels[+m[1]].feat;
  if (f) f[m[2]] = m[2] === "choices" ? picked(key).map(Number) : picked(key);
}

function onChange(ev) {
  const s = ev.target, act = s.dataset.act;
  if (!act) return;
  if (act === "species") { build.species = s.value || null; dropRacePicks(); }
  else if (act === "background") build.background = s.value || null;
  else if (act === "class") {
    const i = +s.dataset.i;
    dropFrom(i);
    build.levels[i].class = s.value;
    if (i === 0 && cls(s.value).preset) Object.assign(build.base, cls(s.value).preset);
  } else if (act === "subclass") {
    build.subclass = build.subclass || {};
    build.subclass[s.dataset.c] = s.value || undefined;
    Object.keys(build.picks).filter(k => k.startsWith("s:")).forEach(k => {
      const id = k.split(":")[1];
      if (!Object.values(build.subclass).includes(id)) delete build.picks[k];
    });
  } else if (act === "abpick") {
    const v = picked(s.dataset.key).slice();
    v[+s.dataset.j] = s.value || null;
    build.picks[s.dataset.key] = v;
  } else if (act === "feat") {
    const i = +s.dataset.i;
    build.levels[i].feat = s.value ? { id: s.value, abilities: [] } : undefined;
    Object.keys(build.picks).filter(k => k.startsWith(`f:${i}:`)).forEach(k => delete build.picks[k]);
  } else if (act === "featab") {
    const f = build.levels[+s.dataset.i].feat;
    f.abilities[+s.dataset.j] = s.value || null;
  } else return;
  render();
}

function dropRacePicks() {
  Object.keys(build.picks).filter(k => k.startsWith("r:")).forEach(k => delete build.picks[k]);
}

// ---- save / load / markdown ---------------------------------------------------------------------

function save() {
  try { localStorage.setItem("bg3dnd-build", JSON.stringify(build)); } catch (e) { /* storage blocked */ }
}

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

function fileName(ext) {
  const r = derive(), counts = {};
  r.tl.forEach(e => { counts[e.c.id] = e.k; });
  return "bg3dnd-build-" + (Object.entries(counts).map(([id, k]) => id + k).join("-") || "empty") + "." + ext;
}

function load(obj) {
  if (!obj || obj.version !== SAVE_VERSION || !Array.isArray(obj.levels) || !obj.base) throw new Error("bad");
  const missing = [];
  const b = blank();
  b.species = D.species.some(s => speciesKey(s) === obj.species) ? obj.species : (obj.species && missing.push(obj.species), null);
  b.background = D.backgrounds.some(x => x.id === obj.background) ? obj.background : (obj.background && missing.push(obj.background), null);
  ABILITIES.forEach(a => { b.base[a] = COST[obj.base[a]] != null ? obj.base[a] : 8; });
  for (const l of obj.levels.slice(0, MAX_LEVEL)) {
    if (!cls(l.class)) { missing.push(l.class); break; }
    const lv = { class: l.class };
    if (l.feat && feat(l.feat.id)) lv.feat = l.feat; else if (l.feat) missing.push(l.feat.id);
    b.levels.push(lv);
  }
  b.subclass = {};
  Object.entries(obj.subclass || {}).forEach(([c, s]) => { if (sub(cls(c), s)) b.subclass[c] = s; else if (s) missing.push(s); });
  b.picks = obj.picks && typeof obj.picks === "object" ? obj.picks : {};
  build = b;
  return missing;
}

function markdown() {
  const r = derive(), lines = [];
  const sp = spec(), b = bg();
  const counts = {};
  r.tl.forEach(e => { counts[e.c.id] = e.k; });
  lines.push(`# ${t("md_title")}: ${Object.entries(counts).map(([id, k]) => {
    const c = cls(id), s = sub(c, build.subclass?.[id]);
    return `${L(c.name)} ${k}${s ? ` (${L(s.name)})` : ""}`;
  }).join(" / ") || "—"}`, "");
  lines.push(`- **${t("md_species")}:** ${sp ? L(sp.race_name) + (sp.sub_name ? " · " + L(sp.sub_name) : "") : "—"}`);
  lines.push(`- **${t("md_background")}:** ${b ? L(b.name) : "—"}`);
  lines.push(`- **${t("hp")}:** ${r.tl.length ? r.hp : "—"}`, "");
  lines.push(`| ${ABILITIES.map(ab).join(" | ")} |`, `|${ABILITIES.map(() => "---").join("|")}|`,
    `| ${ABILITIES.map(a => `${r.scores[a]} (${sign(mod(r.scores[a]))})`).join(" | ")} |`, "");
  const sum = [[t("saves"), [...r.saves].map(ab)],
    [t("skills"), [...r.skills].map(s => skillName(s) + (r.expertise.has(s) ? " (" + t("expertise") + ")" : ""))],
    [t("prof"), [...r.prof.values()].map(L)],
    [t("slots"), Object.entries(r.slots).filter(([, n]) => n).map(([l, n]) => `${l}: ${n}`)],
    [t("pact"), r.pact ? [`${r.pact.slot}: ${r.pact.count}`] : []],
    [t("feats"), r.feats.map(L)]];
  sum.forEach(([k, v]) => v.length && lines.push(`- **${k}:** ${v.join(", ")}`));
  lines.push("", `## ${t("md_levels")}`, "");
  r.tl.forEach(e => {
    lines.push(`### ${t("level")(e.level)} · ${L(e.c.name)} ${e.k}${e.multi ? ` (${t("multiclass")})` : ""}`);
    if (e.s && e.k === e.c.subclass_level) lines.push(`- ${t("subclass")}: ${L(e.s.name)}`);
    e.nodes.forEach(({ src, node }) => {
      const got = [...new Set([...node.traits.map(L), ...node.spells.map(spellName)])];
      if (got.length) lines.push(`- ${t("granted")}: ${got.join(", ")}`);
      node.picks.forEach((p, j) => {
        const v = picked(pickKey(src, j)).filter(Boolean);
        if (!v.length) return;
        if (p.kind === "ability") lines.push(`- ${t("ability")}: ${v.map((a, i) => `${ab(a)} +${p.bonuses[i]}`).join(", ")}`);
        else if (p.kind === "passive") lines.push(`- ${L(p.label) || t("passive")}: ${v.map(id => L(p.options.find(o => o.id === id)?.name) || id).join(", ")}`);
        else if (p.kind === "skill" || p.kind === "expertise") lines.push(`- ${t(p.kind)}: ${v.map(skillName).join(", ")}`);
        else lines.push(`- ${t(p.kind)}: ${v.map(spellName).join(", ")}`);
      });
    });
    const f = build.levels[e.level - 1].feat, fd = f && feat(f.id);
    if (fd) {
      const abs = (f.abilities || []).filter(Boolean).map(a => `${ab(a)} +${f.id === ASI && f.mode !== "split" ? 2 : 1}`);
      const extra = [...(f.choices || []).map(i => L(fd.choices[i])), ...(f.skills || []).map(skillName), ...(f.expertise || []).map(s => skillName(s) + " ★")];
      lines.push(`- ${t("feat")}: ${L(fd.name)}${abs.length ? ` (${abs.join(", ")})` : ""}${extra.length ? ` — ${extra.join(", ")}` : ""}`);
    }
    lines.push("");
  });
  return lines.join("\n");
}

// ---- language -----------------------------------------------------------------------------------

function applyLang() {
  document.documentElement.lang = state.lang;
  document.title = `D&D 5.5e All-in-One BEYOND · ${t("title")}`;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll(".lang button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === state.lang));
  // Menu order follows the shown language: Home first, then the page names sorted (abc / 가나다).
  const nav = document.querySelector("nav.pages");
  const links = [...nav.querySelectorAll("a")];
  const rest = links.filter(a => a.dataset.i18n !== "nav_home").sort((a, b) => a.textContent.localeCompare(b.textContent, state.lang));
  [...links.filter(a => a.dataset.i18n === "nav_home"), ...rest].forEach(a => nav.appendChild(a));
  nav.querySelectorAll("a").forEach(a => { a.href = a.getAttribute("href").split("#")[0] + "#lang=" + state.lang; });
  history.replaceState(null, "", "#lang=" + state.lang);
}

function readLang() {
  let lang = new URLSearchParams(location.hash.slice(1)).get("lang");
  if (!lang) {
    try { lang = localStorage.getItem("bg3dnd-lang"); } catch (e) { /* storage blocked */ }
  }
  if (!lang) lang = (navigator.language || "").startsWith("ko") ? "ko" : "en";
  state.lang = T[lang] ? lang : "en";
}

function bind() {
  document.getElementById("steps").addEventListener("click", onClick);
  document.getElementById("steps").addEventListener("change", onChange);
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => {
    state.lang = b.dataset.lang;
    try { localStorage.setItem("bg3dnd-lang", state.lang); } catch (e) { /* storage blocked */ }
    applyLang();
    render();
  }));
  const msg = document.getElementById("msg");
  document.getElementById("save").addEventListener("click", () =>
    download(fileName("json"), JSON.stringify(build, null, 2), "application/json"));
  document.getElementById("md").addEventListener("click", () => download(fileName("md"), markdown(), "text/markdown"));
  document.getElementById("new").addEventListener("click", () => { build = blank(); msg.textContent = ""; render(); });
  document.getElementById("load").addEventListener("change", async ev => {
    const file = ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    try {
      const missing = load(JSON.parse(await file.text()));
      msg.textContent = t("loaded") + (missing.length ? " " + t("missing")(missing.join(", ")) : "");
    } catch (e) {
      msg.textContent = t("bad_file");
    }
    render();
  });
}

async function init() {
  readLang();
  const get = f => fetch(`data/${f}.json`).then(r => r.json());
  const [b, sp, spl, sk, bgs, fts] = await Promise.all(
    ["builder", "builder_species", "builder_spells", "builder_skills", "backgrounds", "feats"].map(get));
  D = { classes: b.classes, species: sp.species, backgrounds: bgs.backgrounds, feats: fts.feats,
        spells: Object.fromEntries(spl.spells.map(s => [s.id, s])),
        skills: Object.fromEntries(sk.skills.map(s => [s.id, s.name])) };
  document.getElementById("generated").textContent = b.generated ? "· " + b.generated : "";
  try {
    const saved = JSON.parse(localStorage.getItem("bg3dnd-build") || "null");
    if (saved) load(saved);
  } catch (e) { build = blank(); }
  applyLang();
  bind();
  render();
}

init();
