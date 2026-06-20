# Design: Live template previews in the "Choose a starting point" modal

**Date:** 2026-06-20
**Status:** Approved (design) — pending implementation plan
**Scope:** The new-page template chooser modal (`TemplateModal` in `components/dashboard/Dashboard.tsx`).

## Problem

The "Choose a starting point" modal lists templates (Blank, Landing page, SaaS / Pricing, Portfolio) as **text-only cards** — name + one-line description. There is no visual indication of what each template actually looks like, so picking one is a guess. We want each card to show a real preview of the page.

## Decisions (locked during brainstorming)

1. **Preview type:** **Live mini-render** — render the actual template blocks through the existing `BlockRenderer`, scaled down. Real, accurate, auto-updates whenever a template changes; reuses existing infra. (Rejected: hand-drawn wireframes — abstract + drift; pre-rendered screenshots — go stale + need new tooling since templates have no saved page ID.)
2. **Render method:** **Scaled div + self-contained inline styles** — render into a fixed-width stage and shrink with a CSS `transform: scale()`. No iframe. (Rejected: iframe-per-card — higher fidelity but 3× heavier for small thumbnails.)
3. **Style isolation:** `BlockRenderer` with `inlineStyles={true}` (its default) applies each block's resolved desktop styles inline, so the preview is fully self-contained — no global stylesheet injection and no style leakage into the modal. Tailwind utility classes resolve from the app's global CSS, which the modal already has.

## Architecture

### New unit — `components/dashboard/TemplatePreview.tsx`

One clear responsibility: render a scaled, static thumbnail of a single template's block tree.

- **Input:** `{ blocks: Block[] }` (the result of `template.build()`).
- **Render path:** `<BlockRenderer tree={blocks} viewport="desktop" animate={false} inlineStyles={true} components={{}} collections={{}} />`.
  - `animate={false}` — no framer-motion `whileInView` work in the thumbnail.
  - `components={{}}` / `collections={{}}` — the 4 built-in templates reference neither, so empty maps are correct.
- **Scaling:** the `BlockRenderer` output is wrapped in a **fixed 1280px-wide stage** (`width: 1280px`), shrunk with `transform: scale(boxWidth / 1280)` and `transform-origin: top left`. The stage sits inside a clipped box with a fixed aspect ratio (≈16:10) and `overflow-hidden`, so each card shows the **top** of the real page (accurate colors, type, layout). `boxWidth` is the rendered card width; the scale can be derived from a fixed design width (the card's preview area is a known fixed px width in the 2-column modal, so a constant scale factor is acceptable — no runtime measurement required).
- **Click pass-through:** the stage is `pointer-events-none` so clicks land on the card's select button, not on links/buttons inside the rendered template.
- **Blank template:** when `blocks.length === 0`, render a centered **empty-canvas placeholder** (dashed border + lucide `Plus` icon + muted label) instead of `BlockRenderer`.

### Modified — `TemplateModal` in `components/dashboard/Dashboard.tsx`

- Each template card becomes: **`<TemplatePreview>` thumbnail on top**, then the existing name + description below.
- Unchanged: the `onPick(t)` handler, the `disabled={!!creating}` state, the per-card `creating === t.id` spinner overlay, the 2-column grid, the close button.
- Widen the modal `max-w-2xl` → `max-w-3xl` to give the previews room. Card padding/borders adjusted so the preview reads as a framed thumbnail.

## Performance

- The modal only mounts its content while `open`, so previews render **only when the modal opens**.
- `animate={false}` + a cheap CSS `transform` scale; three small static trees → negligible cost.

## Testing

`tests/template-preview.dom.test.tsx` (jsdom dom project):

- For the `landing` template (`TEMPLATES.find(t => t.id === "landing").build()`), `TemplatePreview` renders the real hero title text **"Ship beautiful pages in minutes"** (proves it renders actual template content via `BlockRenderer`).
- For an empty tree (`blocks={[]}`), it renders the placeholder (e.g. an element with the placeholder label / `Plus` icon) and does **not** attempt a block render.

Gate: `npx tsc --noEmit` (only the 2 pre-existing `components/editor/Canvas.tsx` errors) + `npm test`. Not `next build` (clobbers the live dev server).

## Out of scope (YAGNI)

- No hover-to-expand / full-page preview.
- No animation inside previews.
- No screenshot caching or thumbnail pipeline — the live render is cheap and always current.
- No change to the template definitions themselves (`lib/blocks/templates.ts`).

## Risks

- **Responsive breakpoints:** Tailwind responsive utilities (`md:` etc.) resolve against the **window**, not the 1280px stage. On desktop screens this yields the intended desktop layout (the previews are desktop-width by design). Acceptable for a thumbnail; not pixel-perfect on very narrow windows.
- **Boundary:** `TemplatePreview` is dashboard chrome that _renders_ block output via the shared `BlockRenderer`; it must not be imported into the published-page render path (it's a chooser-only thumbnail).
