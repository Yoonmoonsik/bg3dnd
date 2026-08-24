---
name: patchnotes
description: Write the Korean patch notes for this mod covering everything since a given released version. Use when the user asks for 패치노트 / 릴리스 노트 / patch notes / release notes, or says "X 버전 이후로 패치노트". Produces one consolidated, category-grouped Korean document as a temporary .md file - never a per-version changelog.
---

# 패치노트 작성

Turn a range of git history into the Korean patch notes that go on the mod page.

## Output shape

- **한국어만.** No English section unless the user asks for one.
- **버전별로 나누지 않는다.** The whole range collapses into one document grouped by
  category. The user does not want a per-release changelog.
- Write to a temporary `.md` file in the scratchpad directory, then hand it over with
  `SendUserFile`. Do not paste the whole document into the reply as well.
- Filename: `patchnotes_<기준버전>_이후.md`.

Sections, in this order — drop any that end up empty:

```
# 패치노트 — <기준버전> 이후
## 신규 콘텐츠        새 서브클래스·종족·주문·기능·두루마리, 새로 채운 보물 테이블
## 규칙 변경          룰 자체가 바뀐 것, 호환성 훅
## 클래스 및 서브클래스
## 주문 · 상태 · 두루마리
## 아이템 및 장비
## 로컬라이제이션      언어별 한 줄씩으로 압축 + 기여자 크레딧
## 호환성 주의        BREAKING CHANGE, 리스펙·새 캠페인이 필요한 변경
```

Each bullet: **굵게 쓴 한 줄 요약** + 왜 문제였는지/무엇이 달라지는지 한두 문장. Take the
symptom straight from the commit body — those are already written from the player's side.
Do not cite commit hashes, issue numbers, or file names; this is a player-facing document.

## Steps

### 1. 범위 확정

The release commit is *usually* a commit whose subject is a bare version number, but not
always — 4.12.3.0 rode along on a `docs:` commit. Always resolve it from `meta.lsx` history:

```bash
git log --oneline -- Mods/*/meta.lsx | head -30
```

Decode a `Version64` value to check which release a commit produced:

```bash
python -c "v=145804044378570752; print((v>>55)&0x1FF,(v>>47)&0xFF,(v>>31)&0xFFFF,v&0x7FFFFFFF)"
```

The user's 기준 버전 is **exclusive** — start from the commit *after* that release commit.
`git log --oneline <baseline>..HEAD`. Also `git fetch` and check `origin/main`: contributor
PRs land there before they reach the local checkout.

Never edit, stage, or commit `meta.lsx`. Read it only.

### 2. 커밋 본문 읽기

Subjects alone are not enough — the bodies carry the player-visible symptom.

```bash
git log --no-merges --format="=====%n%h %s%n%b" <baseline>..HEAD \
  -- . ':!Mods/*/Localization/Spanish*' ':!Mods/*/Localization/LatinSpanish*'
```

Excluding the bulk translation paths keeps the output readable; count those separately for
the 로컬라이제이션 section.

### 3. 되돌린 것은 상쇄한다

This is the step that makes a consolidated note different from a stitched-together
changelog. Only the **net difference between the baseline and HEAD** belongs in the
document. Something added mid-range and reverted before HEAD never happened.

- `git log --grep=Revert` and read what each revert undoes.
- A feature that was reworked twice and then reverted to its original behaviour leaves only
  the incidental fixes that survived — write those, not the round trip.
- Never write "…and was later reverted". The player never saw it.

### 4. 기여자 크레딧

```bash
git log --format="%h %an | %s" --no-merges <baseline>..HEAD | grep -i "(#[0-9]"
```

Credit non-maintainer authors by name in the 로컬라이제이션 section. Collapse a run of
translation PRs from one person into a single line.

### 5. 한국어 용어 확정 — 필수

Do **not** translate game terms from memory. Every subclass, spell, status, feature,
creature, damage type, and mechanic name must come from the mod's own korean.xml, or from
the vanilla Korean text when the mod does not rename it. Mod wording wins over vanilla.

```bash
python .claude/skills/patchnotes/scripts/loca_lookup.py "Studied Response" "Rend Vision"
python .claude/skills/patchnotes/scripts/loca_lookup.py --sub "Agonising Blast"
```

Exact match first; fall back to `--sub` when it comes back empty — feature names are often
stored only as `Level 3: X`.

Terms that get guessed wrong most often, for reference:

| English | 한국어 |
| --- | --- |
| Bonus Action / Action / Reaction | 보조 행동 / 행동 / 대응 |
| Cantrip | 소마법 |
| Ki Point | 기력 |
| Wild Shape | 야생 형상 |
| Hotbar | 단축 바 |
| Attack Roll / Opportunity Attack | 명중 굴림 / 허점 공격 |
| Necrotic / Radiant / Psychic | 사령 / 광휘 / 정신 |
| Frightened / Blinded / Prone | 겁에 질림 / 실명 / 넘어짐 |
| Advantage / Disadvantage | 유리 보정 / 불리 보정 |
| Conjuration | 창조술 |
| Relentless Endurance | 끈질긴 생명력 |
| Faerie Fire | 요정불 |
| Phantasmal Killer | 환영 살해자 |
| House of Hope | 희망의 저택 |
| Half-Orc / Duergar / Dhampir | 하프오크 / 드웨가 / 댐피르 |
| Honour Mode / easy mode | 명예 모드 / 탐험가 모드 |

Rules terminology: always **5.5 룰**, never "2024 룰".

### 6. 호환성 주의 — 커밋 푸터를 그대로 옮기지 말 것

종족 분리 커밋(`refactor(races)!:` / `feat(races)!:`)의 `BREAKING CHANGE:` 푸터는 "리스펙
권장"이라고 적혀 있지만 **그건 잘못된 안내다.** 이전 버전에서 만든 캐릭터를 기존 세이브에서
리스펙하면 게임이 크래시될 수 있다. 플레이어에게 안내할 구제책은 항상 **새 캠페인**이다:

> 새로 시작하는 게임에서는 정상적으로 이용할 수 있지만, 이전 버전에서 만든 XXX 캐릭터를
> 기존 세이브에서 리스펙하면 크래시가 발생할 수 있습니다.

같은 원칙으로, 커밋 푸터·본문의 내부 관점 서술(파일명, 표 UUID, "using 체인" 같은 구현
용어)은 플레이어 관점으로 바꿔 쓴다.

Distances are metres in game data — quote them as written (36m), and mention the foot value
only when the commit body itself frames it that way.
