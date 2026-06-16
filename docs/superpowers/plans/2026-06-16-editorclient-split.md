# EditorClient Split (Plan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Split the 605-line `EditorClient` god-component into a ~150-line thin orchestrator by extracting `GhostCard` (its own file) and five focused hooks, behavior-preserving.

**Architecture:** Move each cohesive concern out of `EditorClient` into a co-located unit — `GhostCard.tsx`, `useEditorData` (data loading + provider contexts), `useEditorPersistence` (save/publish/unpublish/export + autosave + unload-warn), `useKeyboardShortcuts` (the `onKey` handler), `useDragDropManager` (sensors/measure/auto-scroll/drag handlers), `usePageNavigation` (in-place page switching + component-save) — then have `EditorClient` call them and render. Each task is a verbatim move + call-site rewire; nothing's behavior changes.

**Tech Stack:** Next.js 16, React 19, @dnd-kit/core, framer-motion, zustand, Vitest 4 (node + jsdom), TypeScript 5.

---

> **Verification reality:** `EditorClient` wires the whole editor (iframe canvas, dnd-kit, autosave timing, iframe-scoped keyboard) and has NO unit test — it can't be meaningfully rendered in jsdom. So every task here is a **behavior-preserving extract-refactor verified by `npx tsc --noEmit` + `npm test` (111 must stay green) + `npm run build` + a manual editor smoke pass.** There is no new automated coverage for these hooks. The subtle behaviors to NOT regress: debounced autosave (1200ms), drag frame-passthrough + iframe auto-scroll, keyboard listening inside the canvas iframe, and the unsaved-changes guard.

> **Move verbatim.** The code being extracted already exists in `components/editor/EditorClient.tsx`. Move each block UNCHANGED into its hook/file — do not rewrite logic. Only its location + the wiring (params in, values out) changes. Each task ends with `EditorClient` fully working.

> **`tsc` drives import cleanup.** After each extraction, `EditorClient` will have dangling imports (e.g. `motion`, `cn`, `getDefinition` after Task 1). Run `npx tsc --noEmit` and delete exactly what it flags as unused in the files you touched.

> **Every commit** ends with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
> **Branch first:** `git switch -c refactor/editorclient-split`. Don't stage `prisma/dev.db`.

---

## File Structure

| File | Responsibility | Task |
|------|----------------|------|
| `components/editor/GhostCard.tsx` | drag-overlay preview card (+ ghost size consts) | 1 |
| `components/editor/use-editor-data.ts` | load components/collections/site; build the 3 provider contexts + maps | 2 |
| `components/editor/use-editor-persistence.ts` | `save`/`publish`/`unpublish`/`exportHtml` + autosave + beforeunload; owns `exportRef` | 3 |
| `components/editor/use-keyboard-shortcuts.ts` | the global `onKey` handler (window + iframe) | 4 |
| `components/editor/use-drag-drop.ts` | `sensors`, `measure`, auto-scroll, `onDragStart/End/Cancel`, drag state | 5 |
| `components/editor/use-page-navigation.ts` | `loadPageInPlace`/`confirmLeave`/`switchPage` + `saveAsComponent`/`persistComponent` + `actionsCtx` + pending/saveComp state | 6 |
| `components/editor/EditorClient.tsx` | thin orchestrator: frame glue + page-init + hook calls + JSX | 1–6 |

`EditorClient` retains: the `mode` flags; frame glue (`frame`, `frameRef`, `registerFrame`, `bumpFrame`, `iframeCtx`); `paletteOpen`/`historyOpen`/`ready` state; the page-init effect + readiness gate; `tree` (for the export render); and the JSX tree.

---

## Task 1: Extract `GhostCard` to its own file

**Files:** Create `components/editor/GhostCard.tsx`; modify `EditorClient.tsx`.

- [ ] **Step 1: Create `components/editor/GhostCard.tsx`**

Move the `GHOST_W`/`GHOST_H`/`GHOST_STAGE` constants (EditorClient.tsx lines 64–66) and the entire `GhostCard` function (lines 68–112) into a new file, VERBATIM. Add this header so it stands alone:

```tsx
"use client";

import { motion } from "framer-motion";
import { getDefinition } from "@/lib/registry";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/types";
import { BlockRenderer, type ComponentMap } from "@/components/BlockRenderer";
import { Wireframe } from "./Wireframe";

// (paste GHOST_W/GHOST_H/GHOST_STAGE consts + the GhostCard function verbatim here)
export { /* nothing extra */ };
```
…and `export function GhostCard(...)` (change the existing `function GhostCard` to `export function GhostCard`). Drop the placeholder `export {}` line — just export the function.

- [ ] **Step 2: Rewire `EditorClient.tsx`**

Delete the `GHOST_W/H/STAGE` consts + the `GhostCard` function from `EditorClient.tsx`. Add `import { GhostCard } from "./GhostCard";`. The render's `<GhostCard block={drag.ghost} components={componentsMap} />` (line 669) stays.

- [ ] **Step 3: Clean imports + verify**

Run `npx tsc --noEmit` and remove whatever it flags as now-unused in `EditorClient.tsx` (expected: `motion`, `cn`, `getDefinition`, `Wireframe`, and the `type ComponentMap` from the `BlockRenderer` import — but KEEP `BlockRenderer`, still used by the export render; KEEP `createBlock`/`createComponentInstance` from `@/lib/registry`, still used by drag). Then `npm test` → 111; `npm run build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/editor/GhostCard.tsx components/editor/EditorClient.tsx
git commit -m "refactor(editor): extract GhostCard to its own file

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Extract `useEditorData`

Moves data loading + the three provider contexts out of `EditorClient`.

**Files:** Create `components/editor/use-editor-data.ts`; modify `EditorClient.tsx`.

- [ ] **Step 1: Create `components/editor/use-editor-data.ts`**

```ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDesignSystem } from "@/store/design-system";
import type { Block, CollectionData } from "@/lib/types";
import type { ComponentItem } from "./components-context";

/**
 * Loads reusable components, CMS collections, and the site header/footer, and
 * builds the provider context objects + lookup maps the editor renders with.
 */
export function useEditorData(mode: "page" | "component" | "site" | "collection") {
  const [componentList, setComponentList] = useState<ComponentItem[]>([]);
  const [collectionList, setCollectionList] = useState<CollectionData[]>([]);
  const [site, setSite] = useState<{ header: Block[]; footer: Block[] }>({ header: [], footer: [] });

  // (move refreshComponents / refreshCollections / refreshSite VERBATIM from
  //  EditorClient.tsx lines 179-207)

  const loadDesignSystem = useDesignSystem((s) => s.load);

  // (move the load useEffect VERBATIM from EditorClient.tsx lines 211-217)

  // (move componentsMap / componentsCtx / collectionsMap / collectionsCtx / siteCtx
  //  VERBATIM from EditorClient.tsx lines 219-240)

  return { componentsCtx, collectionsCtx, siteCtx, componentsMap, collectionsMap, refreshComponents };
}
```
Paste the named blocks verbatim where indicated. (`refreshComponents`/`refreshCollections`/`refreshSite` are `useCallback`; the maps/ctx are `useMemo`. All move unchanged.)

- [ ] **Step 2: Rewire `EditorClient.tsx`**

Delete from `EditorClient`: the `componentList`/`collectionList`/`site` `useState` lines (139–141), the three `refresh*` callbacks (179–207), `loadDesignSystem` + the load effect (209–217), and the maps/ctx memos (219–240). Replace with:
```tsx
  const { componentsCtx, collectionsCtx, siteCtx, componentsMap, collectionsMap, refreshComponents } =
    useEditorData(mode);
```
Add `import { useEditorData } from "./use-editor-data";`. (`componentsMap`/`collectionsMap` still feed the `DragOverlay` ghost + the export `BlockRenderer`; `refreshComponents` still feeds `persistComponent` — all now from the hook.)

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (clean; remove unused imports it flags, e.g. `useDesignSystem` if no longer used directly in EditorClient — but note `designSystemCss`/`useDesignSystem.getState()` is used by `exportHtml`, still in EditorClient until Task 3, so keep what's used), `npm test` (111), `npm run build`.

- [ ] **Step 4: Commit**
```bash
git add components/editor/use-editor-data.ts components/editor/EditorClient.tsx
git commit -m "refactor(editor): extract useEditorData (loading + provider contexts)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Extract `useEditorPersistence`

**Files:** Create `components/editor/use-editor-persistence.ts`; modify `EditorClient.tsx`.

- [ ] **Step 1: Create `components/editor/use-editor-persistence.ts`**

```ts
"use client";

import { useCallback, useEffect, useRef } from "react";
import { buildExportDocument } from "@/lib/export-html";
import { designSystemCss } from "@/lib/design-system";
import { useEditor } from "@/store/editor-store";
import { useDesignSystem } from "@/store/design-system";

/**
 * Save/publish/unpublish/export for whichever editor mode is active, plus the
 * debounced autosave and the unsaved-changes unload warning. Owns the hidden
 * export node's ref (attach the returned `exportRef` to the export <div>).
 */
export function useEditorPersistence(opts: {
  isSiteMode: boolean;
  isCollectionMode: boolean;
  isComponentMode: boolean;
  siteRegion?: "header" | "footer";
}) {
  const { isSiteMode, isCollectionMode, isComponentMode, siteRegion } = opts;
  const exportRef = useRef<HTMLDivElement>(null);
  const dirty = useEditor((s) => s.dirty);
  const tree = useEditor((s) => s.tree);

  // (move save / publish / unpublish / exportHtml VERBATIM from EditorClient.tsx
  //  lines 265-352 — they already read useEditor.getState()/useDesignSystem.getState()
  //  and use exportRef; their useCallback deps stay identical)

  // (move the beforeunload effect VERBATIM from lines 426-435)
  // (move the debounced autosave effect VERBATIM from lines 438-442 — deps [dirty, tree, save])

  return { save, publish, unpublish, exportHtml, exportRef };
}
```
Paste the blocks verbatim. Note: `save`'s `useCallback` deps are `[isComponentMode, isSiteMode, isCollectionMode, siteRegion]`; `publish` deps `[save]`; `unpublish`/`exportHtml` deps `[]`. The autosave effect references `save`, `dirty`, `tree` (all now local to the hook).

- [ ] **Step 2: Rewire `EditorClient.tsx`**

Delete from `EditorClient`: `exportRef` (177), `save`/`publish`/`unpublish`/`exportHtml` (265–352), the beforeunload effect (426–435), the autosave effect (438–442), and the `dirty` store subscription (130) IF it's now unused there (the autosave that used it moved). Keep `tree` (still used by the export render at 683). Replace with:
```tsx
  const { save, publish, unpublish, exportHtml, exportRef } = useEditorPersistence({
    isSiteMode,
    isCollectionMode,
    isComponentMode,
    siteRegion,
  });
```
Add `import { useEditorPersistence } from "./use-editor-persistence";`. The export `<div ref={exportRef} …>` (682) keeps using the returned `exportRef`. `save`/`publish`/`unpublish`/`exportHtml` are consumed by `TopBar`, `CommandPalette`, `UnsavedModal`, `VersionHistory` (unchanged).

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (clean; remove now-unused imports in EditorClient: `buildExportDocument`, `designSystemCss`, and `useDesignSystem` if no longer referenced there). `npm test` (111). `npm run build`.

- [ ] **Step 4: Commit**
```bash
git add components/editor/use-editor-persistence.ts components/editor/EditorClient.tsx
git commit -m "refactor(editor): extract useEditorPersistence (save/publish/export/autosave)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Extract `useKeyboardShortcuts`

**Files:** Create `components/editor/use-keyboard-shortcuts.ts`; modify `EditorClient.tsx`.

- [ ] **Step 1: Create `components/editor/use-keyboard-shortcuts.ts`**

```ts
"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/store/editor-store";
import { useCanvasZoom } from "@/store/canvas-zoom";
import type { FrameInfo } from "./iframe-context";

/**
 * Global editor keyboard shortcuts (undo/redo, save, zoom, copy/paste/dup/delete,
 * palette, escape). Listens on window AND inside the canvas iframe (focus may live
 * there). `togglePalette` is read via a ref so an inline callback doesn't re-bind
 * the listener — effect re-subscribes only when `save` or `frame` change.
 */
export function useKeyboardShortcuts(opts: {
  save: () => void | Promise<void>;
  togglePalette: () => void;
  frame: FrameInfo | null;
}) {
  const { save, togglePalette, frame } = opts;
  const toggleRef = useRef(togglePalette);
  toggleRef.current = togglePalette;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // (move the ENTIRE onKey body VERBATIM from EditorClient.tsx lines 446-530,
      //  EXCEPT change the ⌘K branch `setPaletteOpen((o) => !o)` to `toggleRef.current()`)
    };
    window.addEventListener("keydown", onKey);
    const fw = frame?.el.contentWindow;
    fw?.addEventListener("keydown", onKey as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      fw?.removeEventListener("keydown", onKey as EventListener);
    };
  }, [save, frame]);
}
```
Move the `onKey` body verbatim; the ONLY change is the ⌘K handler (was `setPaletteOpen((o) => !o)`) becomes `toggleRef.current();`. Everything else (`useEditor.getState()`, `useCanvasZoom.getState()`, `save()`) is unchanged. Effect deps stay `[save, frame]` (matching the original).

- [ ] **Step 2: Rewire `EditorClient.tsx`**

Delete the keyboard `useEffect` (445–539). Add:
```tsx
  useKeyboardShortcuts({ save, togglePalette: () => setPaletteOpen((o) => !o), frame });
```
Add `import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";`. (`save` is from Task 3's hook; `setPaletteOpen` + `frame` remain in EditorClient.)

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (clean; `useCanvasZoom` may now be unused in EditorClient — remove if so). `npm test` (111). `npm run build`. Manual: undo/redo (⌘Z/⌘⇧Z), ⌘S save, ⌘K palette, ⌘+/-/0 zoom, Delete/⌘D/⌘C/⌘X/⌘V on a selected block, ⌘⌥C/⌘⌥V styles, Escape deselect — all still work, including when focus is inside the canvas.

- [ ] **Step 4: Commit**
```bash
git add components/editor/use-keyboard-shortcuts.ts components/editor/EditorClient.tsx
git commit -m "refactor(editor): extract useKeyboardShortcuts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Extract `useDragDropManager`

Moves the entire drag-and-drop subsystem (state, sensors, measure, auto-scroll, handlers).

**Files:** Create `components/editor/use-drag-drop.ts`; modify `EditorClient.tsx`.

- [ ] **Step 1: Create `components/editor/use-drag-drop.ts`**

```ts
"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import {
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { createBlock, createComponentInstance } from "@/lib/registry";
import { findBlockById, getDescendantIds } from "@/lib/tree";
import { useEditor } from "@/store/editor-store";
import { useCanvasZoom } from "@/store/canvas-zoom";
import type { DragInfo } from "./drag-context";
import type { FrameInfo } from "./iframe-context";

const EMPTY: DragInfo = { type: null, id: null, invalid: new Set(), ghost: null };

/**
 * The canvas drag-and-drop manager: dnd-kit sensors, a `measure` that maps
 * iframe-internal rects into top-document (scaled) coords, custom iframe
 * auto-scroll, and the drag start/end/cancel handlers. `frameRef` is the live
 * canvas iframe handle (used for pointer passthrough + scrolling).
 */
export function useDragDropManager(frameRef: RefObject<FrameInfo | null>) {
  const addBlock = useEditor((s) => s.addBlock);
  const addComponentInstance = useEditor((s) => s.addComponentInstance);
  const moveExisting = useEditor((s) => s.moveExisting);

  const [drag, setDrag] = useState<DragInfo>(EMPTY);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // (move VERBATIM from EditorClient.tsx: measure 162-175, setFramePassthrough 544-549,
  //  dragPointerY/autoScrollRaf/onWindowPointerMove/startAutoScroll/stopAutoScroll 553-580,
  //  onDragStart 582-604, onDragEnd 606-621)

  const onDragCancel = useCallback(() => {
    setDrag(EMPTY);
    setFramePassthrough(false);
    stopAutoScroll();
  }, [stopAutoScroll]);

  return { drag, sensors, measure, onDragStart, onDragEnd, onDragCancel };
}
```
Move the named blocks verbatim. Notes: `measure` uses `frameRef.current` + `useCanvasZoom.getState()` (unchanged). `setFramePassthrough` reads `frameRef.current?.el`. `onDragStart`/`onDragEnd` use `addBlock`/`addComponentInstance`/`moveExisting` (now local), `createBlock`/`createComponentInstance`/`findBlockById`/`getDescendantIds`, and `setDrag`. `onDragCancel` replaces the inline cancel handler that was in the DndContext (lines 642–646). Keep `measure`/`onDragStart`/`onDragEnd` as the same kind of function they were (plain functions / `useCallback`) — preserve exactly.

- [ ] **Step 2: Rewire `EditorClient.tsx`**

Delete from `EditorClient`: the `EMPTY` const (114), `drag` state (135), `measure` (162–175), `sensors` (260–262), the whole drag section (544–621), the store actions `addBlock`/`addComponentInstance`/`moveExisting` (131–133). Replace with:
```tsx
  const { drag, sensors, measure, onDragStart, onDragEnd, onDragCancel } = useDragDropManager(frameRef);
```
Add `import { useDragDropManager } from "./use-drag-drop";`. Wire the `DndContext`: `sensors={sensors}`, the `measuring` config keeps `measure`, `onDragStart={onDragStart}`, `onDragEnd={onDragEnd}`, and replace the inline `onDragCancel={() => {...}}` with `onDragCancel={onDragCancel}`. The `DragProvider value={drag}` and `DragOverlay` `drag.ghost` stay. Keep `frameRef` (+ `frame`/`registerFrame`/`bumpFrame`/`iframeCtx`) in EditorClient — `frameRef` is passed to the hook.

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (clean; remove now-unused EditorClient imports: the `@dnd-kit/core` symbols `MeasuringStrategy`/`PointerSensor`/`useSensor`/`useSensors`/`DragStartEvent`/`DragEndEvent` move to the hook — keep `DndContext`/`DragOverlay`/`closestCenter` which are still used in the render; also `createBlock`/`createComponentInstance`/`findBlockById`/`getDescendantIds` move out; `DragInfo` type import — keep only if still referenced). `npm test` (111). `npm run build`. Manual: drag a NEW block from the palette into the canvas (drops at the slot), drag to reorder an EXISTING block, drag near the top/bottom canvas edge (iframe auto-scrolls), and confirm the ghost card follows the cursor — all unchanged.

- [ ] **Step 4: Commit**
```bash
git add components/editor/use-drag-drop.ts components/editor/EditorClient.tsx
git commit -m "refactor(editor): extract useDragDropManager

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Extract `usePageNavigation`

Moves in-place page switching + component-save.

**Files:** Create `components/editor/use-page-navigation.ts`; modify `EditorClient.tsx`.

- [ ] **Step 1: Create `components/editor/use-page-navigation.ts`**

```ts
"use client";

import { useCallback, useMemo, useState } from "react";
import { parseContent } from "@/lib/page-service";
import { parseTheme } from "@/lib/theme";
import { useEditor } from "@/store/editor-store";
import type { Block } from "@/lib/types";

/**
 * In-place page switching (no full reload) with an unsaved-changes guard, plus
 * the "save selection as a reusable component" flow. Returns the editor-actions
 * context object and the modal state the orchestrator renders.
 */
export function usePageNavigation(opts: { refreshComponents: () => Promise<void> }) {
  const { refreshComponents } = opts;
  const init = useEditor((s) => s.init);
  const [pending, setPending] = useState<{ run: () => void } | null>(null);
  const [saveCompBlock, setSaveCompBlock] = useState<Block | null>(null);

  // (move loadPageInPlace 355-381, confirmLeave 383-386, switchPage 388-394,
  //  saveAsComponent 396, persistComponent 398-418 VERBATIM from EditorClient.tsx)

  const actionsCtx = useMemo(
    () => ({ switchPage, confirmLeave, loadPageInPlace, saveAsComponent }),
    [switchPage, confirmLeave, loadPageInPlace, saveAsComponent],
  );

  return { actionsCtx, pending, setPending, saveCompBlock, setSaveCompBlock, persistComponent };
}
```
Move the named blocks verbatim. `loadPageInPlace` deps `[init]`; `confirmLeave` deps `[]` (uses `setPending`); `switchPage` deps `[confirmLeave, loadPageInPlace]`; `saveAsComponent` = `useCallback((block) => setSaveCompBlock(block), [])`; `persistComponent` deps `[saveCompBlock, refreshComponents]` (uses `setSaveCompBlock`). All preserved.

- [ ] **Step 2: Rewire `EditorClient.tsx`**

Delete from `EditorClient`: `pending` state (142), `saveCompBlock` state (176), `loadPageInPlace`/`confirmLeave`/`switchPage` (354–394), `saveAsComponent`/`persistComponent` (396–418), `actionsCtx` (420–423). Replace with:
```tsx
  const { actionsCtx, pending, setPending, saveCompBlock, setSaveCompBlock, persistComponent } =
    usePageNavigation({ refreshComponents });
```
Add `import { usePageNavigation } from "./use-page-navigation";`. The render keeps using: `EditorActionsProvider value={actionsCtx}`, `UnsavedModal` (`open={!!pending}`, `onCancel/onDiscard/onSave` using `setPending` + `save`), `SaveComponentModal` (`open={!!saveCompBlock}`, `onCancel={() => setSaveCompBlock(null)}`, `onSave={persistComponent}`). `init` is still needed in EditorClient for the page-init effect (242–252) — keep that store subscription.

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (clean; remove now-unused EditorClient imports: `parseContent`, `parseTheme` move to the hook). `npm test` (111). `npm run build`. Manual: switch pages via the page list with unsaved edits → the unsaved-changes modal appears (Cancel/Discard/Save & continue each behave correctly); "Save as component" on a block → names + creates it and swaps the block for the instance.

- [ ] **Step 4: Final orchestrator check + commit**

Confirm `EditorClient`'s function body is now ~150 lines: the `mode` flags, frame glue (`frame`/`frameRef`/`registerFrame`/`bumpFrame`/`iframeCtx`), `paletteOpen`/`historyOpen`/`ready` state, the page-init effect + readiness gate, the six hook calls, and the JSX. Run `npx tsc --noEmit && npm test && npm run build` once more — all green.
```bash
git add components/editor/use-page-navigation.ts components/editor/EditorClient.tsx
git commit -m "refactor(editor): extract usePageNavigation (page switch + component save)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Checklist
- [ ] `GhostCard` + 5 hooks extracted; `EditorClient` is a thin orchestrator (~150 lines).
- [ ] Behavior preserved: autosave (1200ms debounce), publish/unpublish/export, all keyboard shortcuts (incl. inside the iframe), drag new/move + iframe auto-scroll + ghost, unsaved-changes guard, save-as-component.
- [ ] Name consistency: `GhostCard`, `useEditorData`, `useEditorPersistence`, `useKeyboardShortcuts`, `useDragDropManager`, `usePageNavigation`; returned shapes match their call sites.
- [ ] No new circular deps (`npx fallow 2>&1 | grep -i circular` → 0). `npx tsc --noEmit && npm test && npm run build` green (111 tests).
- [ ] Manual editor smoke pass clean (no console errors).

## Deferred
- **Plan C:** split `Inspector.tsx` (806 LOC).
- Other large functions (`useEditor` store, `DomTreePanel`, `Dashboard`, `CommandPalette`), remaining clone groups, dead exports.
