# Page preview thumbnails (cached screenshots)

**Date:** 2026-06-16
**Status:** Approved — ready for implementation plan

## Problem

The "Your pages" dashboard (`components/dashboard/Dashboard.tsx:208`) renders each page
as a colored gradient with the page title's first letter. The gradient is purely
cosmetic (`GRADIENTS[i % 6]`) and tells the user nothing about what the page actually
looks like. Real page builders (Webflow, Framer) show a rendered preview of the page.

We want each card to show a **real rendered preview** of its page.

## Decision summary

- **Technique:** cached **screenshot** (Webflow-style), served as a plain `<img>`.
  Captured with Playwright (already a devDependency). Chosen over live/scaled iframes
  because it scales to many cards with instant paint.
- **Regeneration trigger:** **lazy, on dashboard view.** A page's screenshot is
  regenerated when it is missing or stale; generation happens in the background and the
  card shows the last-known image (or the gradient fallback) until the fresh one lands.
- **Storage:** local disk under `public/uploads/thumbnails/`, reusing the existing
  upload pattern in `app/api/upload/route.ts`. No cloud/CDN.
- **What Playwright shoots:** a new **token-gated internal render route** that reuses the
  exact public-page render logic but works for drafts too.

## Existing building blocks (reused, not rebuilt)

- `app/p/[slug]/page.tsx` — faithful public render: `designSystemCss(...) +
responsiveCss(...)` injected as `<style>`, `themeVars(theme)` on `<main>`, header/footer
  from `Site`, `components` and `collections` resolved from the DB, rendered via
  `BlockRenderer` with `inlineStyles={false}`. **Gated by `page.published`.**
- `components/BlockRenderer.tsx` — chrome-free recursive renderer. Takes an `animate` prop
  (framer-motion entrance animations).
- `app/api/upload/route.ts` — writes files to `public/uploads/`, served statically; URL
  shape `/uploads/<filename>`.
- `prisma/schema.prisma` — `Page` has `content` (JSON Block[]), `theme`, `workspaceId`,
  `published`, `updatedAt` (bumps on every save/publish). No thumbnail field yet.

## Data model

Add two nullable fields to `Page` (Prisma migration):

```prisma
thumbnailUrl String?   // e.g. "/uploads/thumbnails/<pageId>.png"
thumbnailAt  DateTime? // capture time; null = never captured
```

**Staleness predicate (single source of truth):**

```
isStale(page) = page.thumbnailAt == null || page.thumbnailAt < page.updatedAt
```

No separate version counter is needed — `updatedAt` already advances on every content
save and on publish-toggle, which is exactly when the preview should be considered stale.

## Component: internal render route

**`app/internal/shot/[id]/page.tsx`** (new)

- Renders the same content as `app/p/[slug]/page.tsx`, factored so both share one render
  helper rather than duplicating the css/header/footer/components/collections assembly.
  Extract the shared assembly (e.g. `lib/blocks/render-page.tsx` or similar) and have both
  routes call it.
- Differences from the public route:
  - **No `published` gate** — renders drafts.
  - Looks up the page by **id**, not slug.
  - Renders `BlockRenderer` with **`animate={false}`** so the screenshot captures the final
    frame, not a mid-animation state.
  - **Token-gated:** requires a valid `?t=<token>` query param (HMAC over `id` + expiry,
    signed with an app secret; short TTL, e.g. 60s). Invalid/expired/missing → `notFound()`.
    The route is never linked from the UI; it exists only for the screenshot service.

### Token

- A small helper (`lib/thumbnails/token.ts`): `signShotToken(id)` → `{token}` and
  `verifyShotToken(id, token)` → bool. HMAC-SHA256 using an env secret
  (`THUMBNAIL_SECRET`, falling back to an existing session/app secret if one exists).
  Encodes an expiry timestamp; verify checks signature + not-expired.

## Component: screenshot service

**`lib/thumbnails/screenshot.ts`** (new, server-only)

- Lazy **singleton Chromium**: launch once, reuse the browser across shots (avoid per-shot
  cold start). Create a fresh page/context per shot.
- `captureThumbnail(pageId)`:
  1. Mint a shot token for `pageId`.
  2. Navigate to `${BASE_URL}/internal/shot/${pageId}?t=${token}` where `BASE_URL` comes
     from env (default `http://localhost:3000`).
  3. Set viewport `1280×800`; `waitUntil: "networkidle"`; await `document.fonts.ready`.
  4. Screenshot **clipped to the top** at the card aspect (~16:10), write PNG to
     `public/uploads/thumbnails/<pageId>.png` (overwrite).
  5. Update `page.thumbnailUrl` + `page.thumbnailAt` (now).
- Errors are thrown to the caller (the API route), which logs and returns a non-fatal
  error. Browser-binary-missing is detected and surfaced with a clear message
  (`npx playwright install chromium`).

## Component: generation API

**`app/api/pages/[id]/thumbnail/route.ts`** — `POST` (new)

- Auth: same workspace guard as other page APIs (`withRole`).
- **Idempotent:** re-reads the page; if not stale, returns the current
  `{thumbnailUrl, thumbnailAt}` without shooting.
- **Per-pageId in-memory lock:** if a shot for this id is already in flight, await/return
  the same result rather than launching a second.
- On success returns `{thumbnailUrl, thumbnailAt}`.
- On failure returns a non-2xx with a message; caller treats failure as "keep current
  image / gradient."

## Component: dashboard wiring

**`app/(app)/page.tsx`** (server component)

- Add `thumbnailUrl`, `thumbnailAt` (ISO), and `updatedAt` (ISO, already present) to the
  per-page DTO passed to `Dashboard`.

**`components/dashboard/Dashboard.tsx`** (client)

- Replace the gradient thumbnail block with a small `PageThumbnail` piece:
  - If `thumbnailUrl` present → render `<img>` (object-cover, top-anchored, fixed aspect),
    cache-busted with `?v=<thumbnailAt epoch>`.
  - If no `thumbnailUrl` at all → render the **current gradient + letter** as the fallback.
  - Keep the existing `LIVE` badge overlay.
- On mount, compute `stale = !thumbnailUrl || thumbnailAt < updatedAt` per card.
- A module-level **client queue (max ~2 concurrent)** runs `POST /api/pages/[id]/thumbnail`
  for stale/missing cards so 10 cards don't spawn 10 browser tabs at once. On success, swap
  the `<img src>` to the returned URL with the new `?v=`. Show a subtle shimmer while a
  shot for that card is in flight.
- Failures are swallowed (card keeps last image / gradient); no error UI required.

## Lifecycle / cleanup

- On page delete, best-effort delete `public/uploads/thumbnails/<pageId>.png`.
- Publish bumps `updatedAt` → next dashboard view regenerates automatically.

## Error handling principles

- The dashboard must **never** break because a screenshot failed. Every failure path keeps
  the last-known image or the gradient fallback.
- All server-side failures are logged; the client treats any non-2xx as "no change."

## Testing

Gate is `tsc` + `vitest` (no `next build` — it clobbers the running `next dev`).

- **Unit:** `isStale` predicate; `signShotToken`/`verifyShotToken` (valid, tampered,
  expired); client queue respects the concurrency cap.
- **Integration:** `POST /api/pages/[id]/thumbnail` with Playwright/screenshot mocked —
  asserts a file path is written and `thumbnailUrl`/`thumbnailAt` are updated; idempotent
  no-op when fresh; lock prevents double-shoot.
- **Not in the default gate:** a real-browser E2E capture (slow/flaky). Provide an optional
  manual verify script instead.

## Out of scope (YAGNI)

- Cloud storage / CDN (local `public/uploads` only).
- OG-image auto-generation (separate `ogImage` field stays manual).
- Mobile/tablet viewport variants (desktop shot only).
- Real-time regeneration on keystroke (lazy-on-view only).
- A user-facing "refresh preview" button (possible later; not required).
