# Refactor Cleanup — Duplication Removal + Readability Splits

**Date:** 2026-06-22
**Status:** Design — approved scope (Tier 1 + Tier 3)
**Topic:** Targeted, evidence-driven cleanup for readability / maintainability / no duplicates

---

## 1. Context

A request to make the code "easily readable, maintainable, and free of duplicates"
was scoped against the actual state of the codebase rather than treated as a
rewrite. An audit (fallow 2.101.0 `health` / `dupes` / `dead-code`, plus file-size
analysis) found the codebase is already healthy:

- `40,150 LOC · maintainability 90.8 (good) · avg cyclomatic 1.6 · p90 3`
- `0` raw cyclomatic/cognitive violations (the prior fallow-complexity campaign cleared them)
- Total duplication `4.05%`, and **43 of 78 clone groups are test boilerplate**
  (intentionally allowed per `fallow.toml`, non-blocking).

The current structure already matches 2026 best practice for large Next.js App
Router apps (feature-grouped `lib/` + `components/`, ADRs, documented architecture).
**No re-architecture is warranted.** This is a surgical cleanup of the small set of
_real_ production offenders.

## 2. Goals

1. Remove the genuine production duplication identified in the audit (Tier 1).
2. Split the largest "large-but-simple" functions for readability (Tier 3).
3. Every change verified by tests and the fallow commit gate; zero behavior change.

## 3. Non-goals (explicitly out of scope)

- **No new architecture.** No `src/` move, no Feature-Sliced Design, no per-feature
  `index.ts` barrels. (Tier "Adopt FSD + barrels" was declined.)
- **No API route-handler consolidation (Tier 2).** The `collections ≈ components ≈
pages` route clones are REST symmetry; consolidating risks false coupling. Left as-is.
- **No dead-code pruning (Tier 4).** The 17 "unused" exports are mostly the deliberate
  `lib/observability` barrel surface; the 1 unused file is a k6 load-test artifact. Not worth the churn.
- **No behavior, styling, or API changes.** Pure structural refactor.

## 4. Guiding principles

- **Incremental.** One offender per change/commit. Each is independently revertible.
- **Test-first / test-backed.** Prefer characterization tests before extraction where
  none exist; reuse existing tests where they cover the surface. Behavior must be identical.
- **YAGNI / no premature abstraction.** Extract only what is genuinely duplicated.
  A shared helper must have ≥2 real consumers and a nameable single purpose.
- **Respect the fallow gate.** Gate is new-only + CRAP-driven (CC²·(1−coverage)³ + CC).
  Touching an untested function can flip its inherited finding to `introduced` and fail
  the gate. Run vitest with v8 coverage and pass it to `fallow audit --coverage`.
- **Do not run `next build` while `next dev` is live** (shared `.next/` → render loops).
  The gate is `tsc` + `vitest` + `eslint` + `prettier --check` + `fallow audit`.
- **No justification comments** in the resulting diffs.

---

## 5. Tier 1 — Real production duplication

### T1.1 — Storefront page shell (🔴 biggest win, ~107 dup lines)

**Evidence:** `dup:30e992fa` (93 lines) + a 14-line clone between
`app/store/page.tsx` and `app/store/[handle]/page.tsx`.

**What's shared (identical in both):**

- `resolveStoreSiteId()` — host-resolve → active-site fallback.
- Site + store load + `notFound()` guards.
- CSS assembly: `designSystemCss(ds.colors, ds.textStyles) + responsiveCss([...header, ...MIDDLE, ...footer])`.
- The entire JSX shell: `ProductsProvider → <style> → CartProvider → <main>` with
  header / middle / footer `BlockRenderer`s (identical props: `viewport="desktop" animate inlineStyles={false} products={map}`).

**What differs:** only the **middle `tree`** — index uses a `product-grid` block;
detail uses the token-applied product template.

**Extraction:**

- `lib/store/resolve-store-site.ts` → `resolveStoreSiteId()` (move the shared helper).
- `lib/store/load-store.ts` → `loadStoreSite(siteId)` returning `{ site, store }` or
  triggering `notFound()` (shared load + guard).
- `components/store/StorefrontPage.tsx` → a server component taking
  `{ site, store, map, content }` (where `content` is the middle block tree) and
  rendering the shared CSS + shell. Both pages reduce to: resolve siteId → load →
  build their own `content` tree → `<StorefrontPage … content={tree} />`.

**Acceptance:** both store pages render byte-identical HTML to today; `fallow dupes`
no longer reports `dup:30e992fa`; a test covers `StorefrontPage` shell + both page
entrypoints (grid path and template/token path).

### T1.2 — `Record<string,string>` JSON parse (🟠 38-line clone)

**Evidence:** `dup:0810ed6e` — `lib/commerce/pricing.ts:17-29` (`parseOptions`)
is byte-identical to `lib/commerce/product-service.ts:46-58` (`parseData`): both
`JSON.parse → object-not-array → coerce values to String → {}` on failure.

**Extraction:** add `parseStringRecord(json: string): Record<string,string>` (likely
in `lib/commerce/pricing.ts` or a small `lib/json.ts`). `parseOptions` becomes a thin
alias / direct call; delete `parseData` and call the shared helper in `buildProductMap`.

**Acceptance:** `buildProductMap` and `variantForOptions` behavior unchanged;
existing commerce/pricing tests pass; clone group gone.

### T1.3 — Field wrapper for `TextField` / `Textarea` (🟡 19-line clone)

**Evidence:** `dup:` between `components/ui/TextField.tsx` and `components/ui/Textarea.tsx`.
Shared: RAC `TextField` wrapper with `isInvalid`, the `flex flex-col gap-1.5` className
function, `<Label>`, the control style-token string (`border-border-strong … focus:ring-brand-100
… data-[invalid]:border-danger-500 disabled:opacity-50`), and `<FieldError>`. Differs:
`<Input>` vs `<TextArea rows resize-y>`, and `description` (TextField only).

**Extraction:** a `FieldShell` wrapper (Label + RAC wrapper + FieldError + optional
description) and a shared `controlClassName` constant in `components/ui` (e.g.
`components/ui/field-shell.tsx`). `TextField` and `Textarea` pass their control element
as the child. Keep both public component APIs (`TextFieldProps`, `TextareaProps`) exactly as-is.

**Acceptance:** rendered DOM/classes unchanged for both; consumers untouched;
ui-primitives tests pass; clone gone.

### T1.4 — Dashboard ↔ RichText shared helper (🟡 21-line clone)

**Evidence:** `dup:88c5cec3` — `components/dashboard/Dashboard.helpers.tsx:118-131`
≈ `components/editor/RichTextToolbar.parts.tsx:31-51`.

**Action:** read both regions, identify the shared unit, lift to the nearest sensible
shared location (likely `lib/` or a shared `components/ui` helper) with one name. Only
extract if it's a true single-purpose unit; if the similarity is incidental, document
that and skip.

**Acceptance:** both consumers use the shared helper (or a written note explains why it
was incidental); behavior unchanged.

### T1.5 — Settings ↔ SiteSettings client bits (🟢 small, judgment call)

**Evidence:** two ~7-line clones between `components/app-shell/settings/SettingsClient.tsx`
and `components/app-shell/site/SiteSettingsClient.tsx`.

**Action:** evaluate during execution. Extract the shared form/section bit only if it's a
clean reusable unit; otherwise record as accepted (small, low-value) and move on. This task
may legitimately resolve to "no change."

---

## 6. Tier 3 — Readability splits (large-but-simple functions)

These are **not** complexity violations (cyclomatic is fine) — they are large by line
count. Splitting is purely for readability and aligns with the existing
`*.helpers.tsx` / `*.parts.tsx` extraction pattern.

**Targets (by size), each split in its own change:**

| #    | Function            | File                                                 | Lines |
| ---- | ------------------- | ---------------------------------------------------- | ----- |
| T3.1 | `useEditor`         | `store/editor-store.ts:110`                          | 280   |
| T3.2 | `CollectionManager` | `components/app-shell/cms/CollectionManager.tsx:65`  | 279   |
| T3.3 | `Onboarding`        | `components/onboarding/Onboarding.tsx:22`            | 217   |
| T3.4 | `DomTreePanel`      | `components/editor/DomTreePanel.tsx:416`             | 190   |
| T3.5 | `DesignManager`     | `components/app-shell/design/DesignManager.tsx:26`   | 182   |
| T3.6 | `DomainsManager`    | `components/app-shell/site/DomainsManager.tsx:29`    | 179   |
| T3.7 | `StoreAdmin`        | `components/store/StoreAdmin.tsx:39`                 | 175   |
| T3.8 | `useFloatingPanel`  | `components/editor/inspector/useFloatingPanel.ts:90` | 156   |
| T3.9 | `TopBar`            | `components/editor/TopBar.tsx:156`                   | 150   |

**Split approach (per the established pattern + the React cognitive-wall lessons):**

- For **components**: extract self-contained subsections into sibling components and
  pure render/handler helpers into `*.helpers.tsx`/`*.parts.tsx`. Push `'use client'`
  to the smallest interactive leaf where applicable.
- For **hooks/stores** (`useEditor`, `useFloatingPanel`): group related actions/state
  into focused slices/sub-hooks. Do not mutate a ref returned from a custom hook
  (react-compiler lint). Extract effect bodies into helpers so the hook sits near its
  hook-floor.
- **No prop-drilling explosions, no new abstractions** beyond plain extraction. If a
  split would force awkward coupling, stop and leave the function intact (a note in the
  PR explains why).

**Acceptance per split:** behavior identical; existing tests pass and new tests cover
extracted units; the function drops below the very-high-risk size band where it can be
done cleanly; `tsc` + `eslint` + `prettier` + `fallow audit` (with coverage) all clean.

**Ordering:** execute T3 in descending size order, but **T3.1 `useEditor` is the highest-
value readability target** (central store hook, high fan-in) and may be done first.
Each split is independent — pause for review after each.

---

## 7. Execution order & verification

**Order:** Tier 1 first (T1.1 → T1.5), then Tier 3 (T3.1 → T3.9). Tier 1 is higher ROI
and lower risk; finishing it delivers the "no duplicates" goal before touching the
larger readability work.

**Per-change verification (the gate):**

```
npx tsc --noEmit
npx vitest run --coverage --coverage.provider=v8 \
  --coverage.reporter=json --coverage.reportsDirectory=coverage
npx eslint .
npx prettier --check .
<cached-fallow> audit --format json --quiet --explain --gate-marker agent \
  --coverage coverage/coverage-final.json
```

Proceed/commit only when the fallow verdict is not `fail` (`warn` is non-blocking) and
all other steps pass. Do **not** run `next build` while `next dev` is running.

**Stop conditions:** if any extraction would require behavior change, new public API, or
awkward coupling, stop and surface it rather than forcing the abstraction.

## 8. Risks & mitigations

| Risk                                                 | Mitigation                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Store-shell extraction subtly changes rendered HTML  | Snapshot/characterization test on both pages before + after                           |
| Touching untested code flips the CRAP gate to `fail` | Add coverage for each extracted unit; run `fallow audit --coverage` before committing |
| Over-abstraction (esp. T1.4/T1.5, Tier 3)            | Each task has an explicit "skip if incidental / leave intact" escape hatch            |
| Hook splits trip react-compiler lint                 | Keep mutated refs in the component; extract effect bodies, not ref mutations          |

## 9. Deliverables

- Tier 1: real production clone groups removed (`dup:30e992fa`, `dup:0810ed6e`,
  the field-wrapper clone, and T1.4/T1.5 where clean).
- Tier 3: the nine largest functions split into focused units (or explicitly left
  intact with rationale).
- Tests covering every extracted unit; green gate throughout.
- No architectural change; no behavior change.
