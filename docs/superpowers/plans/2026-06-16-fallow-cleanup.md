# Fallow Cleanup (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Clear the low-risk, high-value findings from `npx fallow`: remove unused dependencies, break the one circular dependency, and de-duplicate the clearest clone groups (file-upload logic, the dropdown popover, the sidebar dismiss-menu) — all behavior-preserving.

**Architecture:** Extract three shared units — `useUpload` (lib hook), `<Popover>` (editor component, mirrors the existing `<Modal>`), and `useDismissOnOutsideClick` (lib hook) — and rewire their duplicated call sites. Break the `collection.defs → CollectionInspector → editor-store → registry → collection.defs` cycle by making the block's `CustomContent` a `React.lazy` (dynamic import) rendered under `Suspense`.

**Tech Stack:** Next.js 16, React 19, framer-motion, Vitest 4 (node + jsdom), TypeScript 5.

---

> **Scope note:** This is the cleanup/duplication slice. The god-file splits (`EditorClient` 605 LOC, `Inspector` 806 LOC) are deferred to dedicated follow-up plans (B/C). The API by-id route "duplication" fallow flags is intentionally NOT extracted — a cross-model Prisma-delegate helper would add generic-type complexity for ~3 lines saved; the per-resource bodies genuinely differ. `IconPicker`'s inline dropdown is NOT migrated to `<Popover>` (it has no animation; folding it in would change behavior).

> **Verification:** `npx tsc --noEmit` + `npm test` (currently 108) + `npm run build` after each task. Task 3 additionally re-runs `npx fallow` to confirm the circular dependency is gone. New dom render test for `<Popover>`. Behavior-preserving throughout.

> **Every commit** ends with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
> **Branch first:** `git switch -c refactor/fallow-cleanup`. Don't stage `prisma/dev.db`.

---

## File Structure

| File | Responsibility | Task |
|------|----------------|------|
| `package.json` / `package-lock.json` | drop 3 unused deps | 1 |
| `lib/use-upload.ts` | `useUpload(onUploaded)` hook | 2 |
| `components/editor/controls.tsx` | `ImageInput`/`FileInput` use `useUpload` | 2 |
| `components/blocks/collection.defs.ts` | lazy `CustomContent` (breaks cycle) | 3 |
| `lib/registry-types.ts` | widen `CustomContent` type for lazy (if needed) | 3 |
| `components/editor/Inspector.tsx` | render `CustomContent` under `<Suspense>` | 3 |
| `components/editor/Popover.tsx` | shared fixed-overlay animated dropdown | 4 |
| `lib/use-dismiss.ts` | `useDismissOnOutsideClick(open, close)` hook | 4 |
| `components/editor/{BreakpointSwitcher,TopBar,ZoomControl}.tsx` | use `<Popover>` | 4 |
| `components/app-shell/{SidebarProfile,WorkspaceSwitcher}.tsx` | use `useDismissOnOutsideClick` | 4 |
| `tests/popover.dom.test.tsx` | render test for `<Popover>` | 4 |

---

## Task 1: Remove unused dependencies

`fallow` flags 3 unused deps in the root `package.json`; verified 0 importers across `app`/`components`/`lib`/`store`.

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Re-confirm zero importers**

Run: `for d in "@dnd-kit/sortable" "@dnd-kit/utilities" "@tiptap/extension-link"; do echo "$d: $(grep -rl "$d" app components lib store 2>/dev/null | wc -l | tr -d ' ')"; done`
Expected: each `: 0`. If any is non-zero, STOP and report (do not remove that one).

- [ ] **Step 2: Uninstall**

Run: `npm uninstall @dnd-kit/sortable @dnd-kit/utilities @tiptap/extension-link`
Expected: they're removed from `package.json` dependencies; `@dnd-kit/core` and `@tiptap/react`/`@tiptap/starter-kit`/`@tiptap/pm` REMAIN (still used).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → clean. `npm test` → 108 pass. `npm run build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): remove unused @dnd-kit/sortable, @dnd-kit/utilities, @tiptap/extension-link

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `useUpload` hook (dedupe `controls.tsx` upload)

`ImageInput` (`controls.tsx` ~438-451) and `FileInput` (~503-518) duplicate the same upload handler (`uploading` state + `uploadFile` + error alert).

**Files:** Create `lib/use-upload.ts`; modify `components/editor/controls.tsx`.

- [ ] **Step 1: Create `lib/use-upload.ts`**

```ts
"use client";

import { useState } from "react";
import { uploadFile } from "./upload";

/**
 * Upload a single file via `uploadFile`, tracking progress and surfacing errors.
 * Calls `onUploaded(url)` on success.
 */
export function useUpload(onUploaded: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const a = await uploadFile(file);
      onUploaded(a.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }
  return { uploading, upload };
}
```

- [ ] **Step 2: Rewire `ImageInput` in `controls.tsx`**

In `ImageInput`: remove the `const [uploading, setUploading] = useState(false);` line and the entire `async function onFile(file?: File) { … }`. Add `import { useUpload } from "@/lib/use-upload";` at the top. Inside the component add `const { uploading, upload } = useUpload(onChange);`. Change the file input's handler from `onChange={(e) => onFile(e.target.files?.[0])}` to `onChange={(e) => upload(e.target.files?.[0])}`. (`uploading` is still referenced by the Upload button's disabled/spinner — unchanged. The other state — `loaded`, `picker` — stays.)

- [ ] **Step 3: Rewire `FileInput` in `controls.tsx`**

Same: remove its `const [uploading, setUploading] = useState(false);` and `async function onFile(...)`; add `const { uploading, upload } = useUpload(onChange);`; change `onChange={(e) => onFile(e.target.files?.[0])}` → `onChange={(e) => upload(e.target.files?.[0])}`. (`picker` state stays.)

- [ ] **Step 4: Drop the now-unused `uploadFile` import from `controls.tsx`** if `tsc` reports it unused (it's now imported by `use-upload.ts` instead).

- [ ] **Step 5: Verify**

`npx tsc --noEmit` → clean. `npm test` → 108. `npm run build` → succeeds. Manual: in `npm run dev`, an Image block and a File block still upload (button shows spinner, URL populates on success).

- [ ] **Step 6: Commit**

```bash
git add lib/use-upload.ts components/editor/controls.tsx
git commit -m "refactor(editor): extract useUpload hook (dedupe Image/File upload)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Break the circular dependency

`fallow` flags: `components/blocks/collection.defs.ts → editor/CollectionInspector.tsx → store/editor-store.ts → lib/registry.ts → collection.defs.ts`. `collection.defs.ts` statically imports `CollectionInspector` only to set `CustomContent`. Make that a dynamic (`React.lazy`) import so the static edge — and the cycle — disappears, and render it under `Suspense`. (Pre-existing cycle; `CollectionInspector` is editor-only and rendered solely as the Collection block's `CustomContent`.)

**Files:** `components/blocks/collection.defs.ts`, `components/editor/Inspector.tsx`, possibly `lib/registry-types.ts`.

- [ ] **Step 1: `components/blocks/collection.defs.ts` — make `CollectionInspector` lazy**

Remove `import { CollectionInspector } from "@/components/editor/CollectionInspector";`. Add `import { lazy } from "react";` and:
```ts
const CollectionInspector = lazy(() =>
  import("@/components/editor/CollectionInspector").then((m) => ({ default: m.CollectionInspector })),
);
```
Keep the def's `CustomContent: CollectionInspector,` line unchanged.

- [ ] **Step 2: If `tsc` rejects the lazy assignment, widen the `CustomContent` type**

In `lib/registry-types.ts`, the field is currently `CustomContent?: ComponentType<{ block: Block }>;`. If `tsc` errors that `LazyExoticComponent<...>` isn't assignable, change it to:
```ts
import type { ComponentType, CSSProperties, LazyExoticComponent, ReactNode } from "react";
// ...
  CustomContent?:
    | ComponentType<{ block: Block }>
    | LazyExoticComponent<ComponentType<{ block: Block }>>;
```
(Add `LazyExoticComponent` to the existing `react` type import.)

- [ ] **Step 3: `components/editor/Inspector.tsx` — render `CustomContent` under Suspense**

Add `Suspense` to the React import (`import { Suspense, useCallback, … } from "react";`). In `InspectorContent`, change the `CustomContent` render from:
```tsx
              {def.CustomContent ? (
                <def.CustomContent block={block} />
              ) : def.fields.length === 0 ? (
```
to:
```tsx
              {def.CustomContent ? (
                <Suspense fallback={null}>
                  <def.CustomContent block={block} />
                </Suspense>
              ) : def.fields.length === 0 ? (
```

- [ ] **Step 4: Verify the cycle is gone**

Run: `npx fallow 2>&1 | grep -A3 "Circular dependencies"` — expect the `collection.defs.ts` cycle to be absent (0 circular dependencies, or the count dropped). If the cycle persists, the dynamic import didn't break the static edge — report findings.
Run: `npx tsc --noEmit` → clean. `npm test` → 108. `npm run build` → succeeds.
Manual: in `npm run dev`, select a Collection List block → the Content tab still shows the collection picker/bindings inspector (it may flash empty for a frame while the lazy chunk loads — acceptable).

- [ ] **Step 5: Commit**

```bash
git add components/blocks/collection.defs.ts components/editor/Inspector.tsx lib/registry-types.ts
git commit -m "refactor(blocks): lazy-load CollectionInspector to break import cycle

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `<Popover>` + `useDismissOnOutsideClick` (dedupe dropdowns)

Two clone groups: (1) a fixed-overlay animated dropdown in `BreakpointSwitcher`, `TopBar` (PublishedMenu), `ZoomControl`; (2) a window-click dismiss menu in `SidebarProfile`, `WorkspaceSwitcher`. Extract a `<Popover>` component (mirrors `<Modal>`) and a `useDismissOnOutsideClick` hook. Behavior-preserving: per-instance positioning/width/padding/content stay; only the shared shell/listener is factored out.

**Files:** Create `components/editor/Popover.tsx`, `lib/use-dismiss.ts`, `tests/popover.dom.test.tsx`; modify the 5 call sites.

- [ ] **Step 1: Create `components/editor/Popover.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Fixed-overlay animated dropdown. Renders a full-screen click-catcher (closes on
 * click) plus a spring-animated panel. Callers supply the trigger button and pass
 * position/width/padding/rounding via `className`. Mirrors <Modal> for popovers.
 */
export function Popover({
  open,
  onClose,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 460, damping: 32 }}
            className={cn(
              "absolute z-50 border border-zinc-200 bg-white shadow-2xl ring-1 ring-black/5",
              className,
            )}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Write the failing `<Popover>` dom test** — `tests/popover.dom.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Popover } from "@/components/editor/Popover";

describe("Popover (dom)", () => {
  it("renders children when open", () => {
    render(<Popover open onClose={() => {}}><span>menu</span></Popover>);
    expect(screen.getByText("menu")).toBeInTheDocument();
  });
  it("renders nothing when closed", () => {
    render(<Popover open={false} onClose={() => {}}><span>menu</span></Popover>);
    expect(screen.queryByText("menu")).toBeNull();
  });
  it("calls onClose when the overlay is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<Popover open onClose={onClose}><span>menu</span></Popover>);
    const overlay = container.querySelector(".fixed.inset-0")!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

Run: `npx vitest run tests/popover.dom.test.tsx` → FAIL (module not found), then PASS after Step 1 exists (3 tests).

- [ ] **Step 3: Create `lib/use-dismiss.ts`**

```ts
"use client";

import { useEffect, useRef } from "react";

/**
 * While `open`, calls `close` on the next window click (used by menus that close
 * on any outside click; the menu wrapper stops propagation on its own clicks).
 * Re-subscribes only when `open` changes — `close` is read via a ref so an inline
 * callback doesn't churn the listener.
 */
export function useDismissOnOutsideClick(open: boolean, close: () => void) {
  const cb = useRef(close);
  cb.current = close;
  useEffect(() => {
    if (!open) return;
    const onClick = () => cb.current();
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);
}
```

- [ ] **Step 4: Rewire the 3 fixed-overlay dropdowns to `<Popover>`**

In each, replace the `<AnimatePresence>{open && (<><div className="fixed inset-0 z-40" onClick={() => setOpen(false)} /><motion.div initial/animate/exit/transition className="absolute …">…</motion.div></>)}</AnimatePresence>` block with `<Popover open={open} onClose={() => setOpen(false)} className="…">…</Popover>`, where `className` carries ONLY that instance's position/width/padding/rounding (everything beyond the shared `absolute z-50 border border-zinc-200 bg-white shadow-2xl ring-1 ring-black/5` base). Keep each trigger button and menu content exactly as-is. Add `import { Popover } from "./Popover";` and remove now-unused `AnimatePresence`/`motion` imports (let `tsc` confirm). The per-instance classNames to pass:
  - `components/editor/BreakpointSwitcher.tsx`: `className="left-1/2 top-11 w-72 -translate-x-1/2 rounded-2xl p-3"`
  - `components/editor/TopBar.tsx` (PublishedMenu): `className="right-0 top-11 w-48 overflow-hidden rounded-xl p-1"`
  - `components/editor/ZoomControl.tsx`: `className="left-1/2 top-11 w-40 -translate-x-1/2 rounded-xl p-1"`

- [ ] **Step 5: Rewire the 2 dismiss-menus to `useDismissOnOutsideClick`**

In `components/app-shell/SidebarProfile.tsx` and `components/app-shell/WorkspaceSwitcher.tsx`: replace the local `useEffect(() => { if (!open) return; const close = () => setOpen(false); window.addEventListener("click", close); return () => window.removeEventListener("click", close); }, [open]);` with `useDismissOnOutsideClick(open, () => setOpen(false));`. Add `import { useDismissOnOutsideClick } from "@/lib/use-dismiss";`. Remove the now-unused `useEffect` import if `tsc` flags it. Keep the wrapper `onClick={(e) => e.stopPropagation()}` and all menu content unchanged.

- [ ] **Step 6: Verify**

`npx vitest run tests/popover.dom.test.tsx` → 3 pass. `npx tsc --noEmit` → clean. `npm test` → 111 (108 + 3). `npm run build` → succeeds.
Re-run `npx fallow 2>&1 | grep -E "Duplicat|clone groups"` — the clone-group count should drop from 31.
Manual: open each dropdown (breakpoint +, Published menu, zoom presets, sidebar profile, workspace switcher) → opens, animates (the 3 editor ones), closes on outside click; selecting items still works.

- [ ] **Step 7: Commit**

```bash
git add components/editor/Popover.tsx lib/use-dismiss.ts tests/popover.dom.test.tsx components/editor/BreakpointSwitcher.tsx components/editor/TopBar.tsx components/editor/ZoomControl.tsx components/app-shell/SidebarProfile.tsx components/app-shell/WorkspaceSwitcher.tsx
git commit -m "refactor(ui): extract Popover + useDismissOnOutsideClick (dedupe dropdowns)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Checklist
- [ ] 3 unused deps gone; `@dnd-kit/core` + tiptap core remain.
- [ ] `useUpload` used by both Image/File inputs; behavior identical.
- [ ] Circular dependency gone (`npx fallow` confirms); Collection inspector still renders (under Suspense).
- [ ] `<Popover>` + `useDismissOnOutsideClick` used by all 5 call sites; per-instance position/width/content preserved; `IconPicker` intentionally NOT migrated.
- [ ] Name consistency: `useUpload`, `Popover`, `useDismissOnOutsideClick`.
- [ ] `npx tsc --noEmit && npm test && npm run build` green (111 tests).

## Deferred (follow-up plans)
- **Plan B:** split `EditorClient.tsx` (605 LOC) — extract `useKeyboardShortcuts`/`useDragDropManager`/`usePersistence`/`usePageNavigation`.
- **Plan C:** split `Inspector.tsx` (806 LOC).
- Other large functions (`useEditor` store 285, `DomTreePanel`, `Dashboard`, `CommandPalette`), remaining minor clone groups, dead exports, and the 2 unused script files (kept — intentional tooling).
