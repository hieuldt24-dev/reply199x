---
phase: channels-radio-section-execute
date: 2026-11-18
status: COMPLETE
feature: none
plan: process/general-plans/active/channels-radio-section_18-11-26/channels-radio-section_PLAN_18-11-26.md
---

# EXECUTE report — "Bắt sóng ký ức" radio + Footer links

**BLUF:** All 13 checklist steps are done and every gate G1–G9 that I could run is green. Plan status is `CODE DONE` (not VERIFIED). Next: independent EVL run by vc-tester, then the owner looks at the screenshots in this folder.

## What Was Done

New files (12):

| File (under `src/app/(routes)/` unless shown) | Lines |
|---|---|
| `_types/channels.ts` | 19 |
| `_data/channels.ts` | 62 |
| `_components/ChannelsRadio.tsx` (only `"use client"`) | 79 |
| `_components/RadioSpeaker.tsx` | 12 |
| `_components/RadioDial.tsx` | 55 |
| `_components/RadioKnobs.tsx` | 21 |
| `_components/RadioKeys.tsx` | 48 |
| `_components/RadioNowPlaying.tsx` | 30 |
| `_components/RadioBrandIcon.tsx` | 29 |
| `_components/ChannelsRadio.test.tsx` | 114 |
| `_components/ChannelsSection.test.tsx` | 62 |
| `src/components/Footer.test.tsx` | 72 |

Changed files (git numstat, added/removed):

| File | +/- |
|---|---|
| `_components/ChannelsSection.tsx` (Server shell, `<section className="radio-section" id="kenh-truyen-thong">`) | +14 / -85 |
| `_data/brief.ts` (`projectLinks.zalo`; no key removed) | +2 / -1 |
| `src/components/Footer.tsx` (Facebook if not null, Instagram, Zalo; row `flex flex-wrap items-center gap-3 min-w-0`) | +2 / -2 |
| `src/styles/globals.css` (old channel CSS removed bottom to top; `.radio-*` block appended; 881 -> 945 lines, braces 901/901) | +128 / -64 |
| `process/context/uxui/component-contracts.md` | +7 / -3 |
| `process/context/all-context.md` | +8 / -4 |

Red-first: N10/N11/N12 were written before any component and confirmed RED (3 files failed: ChannelsRadio for the missing module, ChannelsSection on the section class, Footer on link count), then turned green.

## What Was Skipped or Deferred

- Nothing in the checklist was skipped.
- Live liveness of the TikTok/Facebook/Instagram/Zalo destinations (known-gap D): owner opens them by hand after deploy.

## Test Gate Outcomes

| Gate | Result | Exit code |
|---|---|---|
| G1 `npx.cmd vitest run ChannelsRadio ChannelsSection Footer` | 3 files, 10 tests pass | 0 |
| G1b `npx.cmd vitest run TicketRequestDialog` | 26/26 pass | 0 |
| G2 `npm.cmd test` | 367 pass, 1 fail = known `src/lib/supabase/route-client.test.ts` secure-cookie (29 files: 28 pass, 1 known) | 1 (expected) |
| G3 `npm.cmd run typecheck` | clean | 0 |
| G4 `npm.cmd run lint` | 461 problems (269 errors, 192 warnings) = baseline | 1 (expected) |
| G4 scoped eslint (5 paths, `--max-warnings=0`) | clean | 0 |
| G4 extra: `npx.cmd eslint src --max-warnings=0` (proves 0 problems in `src/`) | clean | 0 |
| G5 `npm.cmd run build` | run 1: Next 16.4.3 advisory stop; run 2: compiled, 17 pages | 1, then 0 |
| G6 static checks | all 8 items pass (see below) | — |
| G7 agent-probe (port 3217, own `next start`, stopped after) | pass (see below) | — |
| G8 scope | changed set = Touchpoints exactly (+ hook log + task folder, both excluded) | — |
| G9 check-routing / validate-all-context / validate-protocol-discovery | all clean | 0 / 0 / 0 |

Port 3000 was NOT listening at G5 time (the owner's server had stopped), so G5 ran as the plan says; nothing was killed. Not `NEEDS_OWNER_STOP`.

G6 detail: (1) positive probe `\bvé\b` on `'mua v'+[char]0xE9+' ngay'` = True; 0 hits in the 14 source files and in the `.radio-*` CSS block; (2) banned APIs 0; (3) `"use client"` only in `ChannelsRadio.tsx`; (4) all 12 new files <= 114 lines; (5) all 3 radio transition/animation lines are inside `@media(prefers-reduced-motion:no-preference)`; (6) `reply-channel|kenh-truyen-thong` only in `ChannelsSection.tsx` and `ChannelsSection.test.tsx`, `reply-channel` alone 0; (7) shared `#merch ... #ve` line = 1, shared `.reply-merch ... .reply-process` line = 1; (8) 64 removed CSS lines, exactly 2 touch shared selectors (the two trimmed lines). E1 check: `Select-String -SimpleMatch '(?<![\\p{L}\\p{N}])v\\u00e9'` finds one match per test file (ChannelsSection.test.tsx:9, Footer.test.tsx:25), and each file asserts the positive control.

G7 detail (home page and `/payment/return`, 360/390/768/1280/1440):
- No horizontal scroll anywhere (`scrollWidth == innerWidth` at every width, both routes); no radio element extends past the viewport.
- Layout: >=768 face grid `"speaker dial knobs"` and 4 key columns; <768 `"speaker knobs" "dial dial"` and 2x2 keys, now-playing stacked, CTA full width.
- Targets: keys 100px (desktop) / 84px (mobile); CTA 54px; every Footer link 44px.
- Contrast (computed): intro 5.86, status 5.16, key name 8.26, dial label 6.81, presets label 7.19, CTA 5.61 (all >= 4.5).
- Zalo: handle "Nhóm HỘI ĐỒNG NIÊN REPLY 199X TẠI ĐÀ NẴNG" wraps to 2 lines at 390, 1 line at 1280, stays inside the panel; needle 100%; href `https://zalo.me/g/fhjd7fuvlccje1jwxyvu`.
- Keyboard: focus TikTok key, ArrowRight -> Facebook pressed and focused, `:focus-visible`, outline `solid 3px rgb(227,178,90)` (gold). Footer Zalo link focus outline `rgb(255,184,63)` (gold).
- Reduced motion emulated: needle/key transition `0s`, panel animation `none`, click Instagram -> needle at 75% immediately. With motion allowed: needle `0.5s`, panel `radio-fade`.
- Footer row: 1 line at 1280/1440, 2 lines at 360/390/768, all hrefs/target/rel match `projectLinks`. Neighbours unchanged in order (About before, Timeline after).
- Title font "Reply Lobster", `text-transform:none` at every width.

Screenshots (this folder): `radio-{360,390,768,1280,1440}.png`, `radio-zalo-{390,1280}.png`, `radio-focus-1280.png`, `footer-{360,390,768,1280,1440}.png`, `payment-return-footer-{360,390,768,1280,1440}.png`.

## Plan Deviations

All within the blast radius, no hard-stop class.

1. Positive-control strings use `String.fromCharCode(0xe9 / 0x1ebb / 0x1ec1)` instead of `"é"`-style literals. Why: the Write/Edit tool turned single-backslash `\u` escapes into the literal letters, which put the banned word in the test files and would fail G6 item 1. Same test meaning; the regex itself keeps the required double-backslash form.
2. `ChannelsSection.test.tsx` checks `className === "radio-section"` instead of `not.toHaveClass("reply-channels")`, so G6 item 6 (`reply-channel` 0 hits in `src`) holds. Same proof.
3. `ChannelsSection.test.tsx` went RED on the section class rather than on a missing module (the data module already existed from step 3). Still red-first.
4. Extra CSS variable `--radio-ink:#4A554E` (the plan's AC11 already names this colour for the intro text; it just was not in the variable list).
5. `RadioKeys` also takes an `onKeyDown` prop; the key logic stays in `ChannelsRadio` as N3 says.
6. Context docs: the old "Facebook upcoming/unavailable" and "official Facebook URL unselected" lines were corrected, because `projectLinks.facebook` already holds a URL (unchanged by this task).
7. G7 used viewport screenshots: this agent-browser version saved element screenshots as blank images. A login dialog (existing behaviour, not part of this task) opens on a fresh visit; the probe closed it by script before measuring.

## Test Infra Gaps Found

- agent-browser 0.27 element screenshots came out blank here; viewport screenshots work.
- jsdom has no `matchMedia`; reduced motion is only provable in the browser (done in G7).
- Write/Edit tools decode `\uXXXX` in content: tests that must not contain a literal character should build it from char codes.

## Things for the Owner to Check Visually

- Look at `radio-*.png`, `radio-zalo-*.png` and `footer-*.png` in this folder: wood/green/gold look, dial, key press look, Zalo name wrap.
- At narrow widths the needle sits on top of the "199.1" scale label (by design, like a real dial); say if you want the labels moved.
- Footer now has 5 buttons and wraps to 2 lines below 1024px.
- After deploy, open the 4 radio links and the 3 new Footer links by hand (Zalo group, Facebook, Instagram, TikTok).
- The build printed a Next.js security upgrade recommendation (`next upgrade --agent=security`); it was not run (dependency upgrades need your approval as a separate task).

## Closeout Packet

- Selected plan: `process/general-plans/active/channels-radio-section_18-11-26/channels-radio-section_PLAN_18-11-26.md`
- Finished: checklist 1–13, docs E4/E5.
- Verified by me: G1–G9 as above. Not yet: independent EVL (vc-tester), owner visual approval, live links.
- Remaining: EVL, owner review, commit when the owner asks (none made), UPDATE PROCESS.
- Classification: `Keep in active/testing` until EVL passes and the owner approves the visuals.
- Next valid state: EVL confirmation run (vc-tester re-runs G1–G9).

Follow-up plan stubs created: none. CONTEXT_PARTIAL: none.

## Forward Preview

### Test Infra Found
- Footer now has its first test (`src/components/Footer.test.tsx`) with a `vi.hoisted` + getter mock of `projectLinks`.

### Blast Radius Changes
- `globals.css` lost all `.reply-channel*` rules; the `.radio-*` block lives at the end of the file.

### Commands to Stay Green
- `npx.cmd vitest run ChannelsRadio ChannelsSection Footer`, `npx.cmd vitest run TicketRequestDialog`, `npm.cmd run typecheck`, `npx.cmd eslint src --max-warnings=0`, `npm.cmd run build` (retry once on the advisory).

### Dependency Changes
- None.

TL;DR: radio section and Footer links are built, all runnable gates are green, screenshots are in the task folder; status CODE DONE, waiting for EVL and owner review.
