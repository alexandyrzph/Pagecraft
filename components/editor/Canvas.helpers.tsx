"use client";

import { useMemo, useState } from "react";
import type { Block, CollectionMap, Theme, Viewport } from "@/lib/types";
import { useEditor } from "@/store/editor-store";
import { useBreakpoints, widthBand, type Breakpoint } from "@/store/breakpoints";
import { useCanvasZoom } from "@/store/canvas-zoom";
import { BlockRenderer } from "@/components/BlockRenderer";
import { SlottedChildren } from "./EditorBlock";
import { useComponents, type ComponentItem } from "./components-context";
import { useCollections } from "./collections-context";
import { useSite } from "./site-context";
import { useIframe, type FrameInfo } from "./iframe-context";

type ResizeSide = "left" | "right" | null;

export type Avail = { w: number; h: number };

type CanvasState = {
  tree: Block[];
  previewMode: boolean;
  slug: string;
  theme: Theme;
  pageId: string | null;
  select: (id: string | null) => void;
  setViewport: (vp: Viewport) => void;
  componentsMap: Record<string, ComponentItem>;
  collectionsMap: CollectionMap;
  header: Block[];
  footer: Block[];
  active: Breakpoint;
  dragWidth: number | null;
  setDragWidth: (w: number | null) => void;
  zoom: number;
  setZoom: (z: number) => void;
  setViewportWidth: (w: number) => void;
  frame: FrameInfo | null;
  resizeSide: ResizeSide;
  setResizeSide: (side: ResizeSide) => void;
  avail: Avail;
  setAvail: (a: Avail) => void;
  cssExtra: Block[] | undefined;
};

// All of Canvas's store / context reads (plus the two local UI state slots and
// the derived `cssExtra`) live here so the component itself stays at ~1 hook of
// density. No inline conditionals — just hook calls and a flat return.
function useCanvasStores() {
  const tree = useEditor((s) => s.tree);
  const previewMode = useEditor((s) => s.previewMode);
  const slug = useEditor((s) => s.slug);
  const theme = useEditor((s) => s.theme);
  const pageId = useEditor((s) => s.pageId);
  const select = useEditor((s) => s.select);
  const setViewport = useEditor((s) => s.setViewport);
  const components = useComponents();
  const collections = useCollections();
  return {
    tree,
    previewMode,
    slug,
    theme,
    pageId,
    select,
    setViewport,
    componentsMap: components.map,
    collectionsMap: collections.map,
  };
}

function useCanvasLayout(previewMode: boolean) {
  const site = useSite();
  const { active, setDragWidth, dragWidth } = useBreakpoints();
  const zoom = useCanvasZoom((s) => s.zoom);
  const setZoom = useCanvasZoom((s) => s.setZoom);
  const setViewportWidth = useCanvasZoom((s) => s.setViewportWidth);
  const { frame } = useIframe();
  const [resizeSide, setResizeSide] = useState<ResizeSide>(null);
  const [avail, setAvail] = useState<Avail>({ w: 0, h: 0 });
  const cssExtra = useMemo(
    () => deriveCssExtra(previewMode, site.header, site.footer),
    [previewMode, site.header, site.footer],
  );
  return {
    header: site.header,
    footer: site.footer,
    active,
    dragWidth,
    setDragWidth,
    zoom,
    setZoom,
    setViewportWidth,
    frame,
    resizeSide,
    setResizeSide,
    avail,
    setAvail,
    cssExtra,
  };
}

// All of Canvas's store/context reads and local UI state, split across two
// sub-hooks so neither (nor the component) is hook-dense.
export function useCanvasState(): CanvasState {
  const stores = useCanvasStores();
  const layout = useCanvasLayout(stores.previewMode);
  return { ...stores, ...layout };
}

// Stable reference so CanvasFrame's CSS effect doesn't loop.
export function deriveCssExtra(
  previewMode: boolean,
  header: Block[],
  footer: Block[],
): Block[] | undefined {
  return previewMode ? [...header, ...footer] : undefined;
}

export function isDesktopFill(active: Breakpoint, dragWidth: number | null): boolean {
  return active.id === "desktop" && dragWidth == null;
}

export function deriveRenderWidth(
  desktopFill: boolean,
  availW: number,
  active: Breakpoint,
): number {
  return desktopFill && availW ? Math.round(availW) : active.width;
}

export function deriveRenderZoom(desktopFill: boolean, zoom: number): number {
  return desktopFill ? 1 : zoom;
}

export function contentMotionKey(pageId: string | null, previewMode: boolean): string {
  return (pageId ?? "page") + (previewMode ? ":preview" : ":edit");
}

// Measure the scrollable canvas area so the zoomed device gets a correctly
// sized scroll footprint (CSS transforms don't affect layout/scroll area) and
// so the zoom control can offer "fit to width".
export function measureAvail(
  el: HTMLDivElement,
  setAvail: (a: Avail) => void,
  setViewportWidth: (w: number) => void,
): void {
  const cs = getComputedStyle(el);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const w = el.clientWidth - padX;
  const h = el.clientHeight - padY;
  setAvail({ w, h });
  setViewportWidth(w);
}

type FitArgs = {
  availW: number;
  desktopFill: boolean;
  activeId: string;
  activeWidth: number;
  lastFitKey: { current: string };
  setZoom: (z: number) => void;
};

// Auto-fit: when a breakpoint is wider than the canvas area, fit it to width on
// load and on every breakpoint switch (so it never overflows by default).
// Keyed on the breakpoint id so manual zoom + resizes afterward are preserved
// until the next switch.
export function applyAutoFit({
  availW,
  desktopFill,
  activeId,
  activeWidth,
  lastFitKey,
  setZoom,
}: FitArgs): void {
  if (!availW) return;
  if (desktopFill) {
    lastFitKey.current = "";
    setZoom(1);
    return;
  }
  if (lastFitKey.current === activeId) return; // already fit this breakpoint
  lastFitKey.current = activeId;
  const fit = availW / activeWidth;
  setZoom(fit < 0.999 ? fit : 1);
}

type StartResizeDeps = {
  active: Breakpoint;
  zoom: number;
  frame: FrameInfo | null;
  setResizeSide: (side: "left" | "right" | null) => void;
  setDragWidth: (w: number | null) => void;
};

// Drag-to-resize the preview width via the side "pipes". Centered device, so a
// drag of dx on one side changes the width by 2·dx (divided by zoom, since the
// device is visually scaled) to keep that edge under the cursor.
export function createStartResize({
  active,
  zoom,
  frame,
  setResizeSide,
  setDragWidth,
}: StartResizeDeps) {
  return (side: "left" | "right") => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startW = active.width;
    const [minW, maxW] = widthBand(active.base);
    setResizeSide(side);
    const fr = frame?.el;
    fr?.style.setProperty("pointer-events", "none");
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const next = startW + ((side === "right" ? dx : -dx) * 2) / zoom;
      setDragWidth(Math.max(minW, Math.min(maxW, next)));
    };
    const end = () => {
      setResizeSide(null);
      fr?.style.removeProperty("pointer-events");
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      if (handle.hasPointerCapture(e.pointerId)) {
        handle.releasePointerCapture(e.pointerId);
      }
    };
    // With pointer capture, events stay on the handle even when the cursor
    // crosses the iframe — window listeners alone lose the drag over iframes.
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  };
}

type CanvasContentProps = {
  previewMode: boolean;
  tree: Block[];
  header: Block[];
  footer: Block[];
  componentsMap: Record<string, ComponentItem>;
  collectionsMap: CollectionMap;
};

// Content is portaled into the iframe by CanvasFrame.
export function CanvasContent({
  previewMode,
  tree,
  header,
  footer,
  componentsMap,
  collectionsMap,
}: CanvasContentProps) {
  if (previewMode) {
    return (
      <>
        {header.length > 0 && (
          <BlockRenderer
            tree={header}
            viewport="desktop"
            animate
            inlineStyles={false}
            components={componentsMap}
            collections={collectionsMap}
          />
        )}
        <BlockRenderer
          tree={tree}
          viewport="desktop"
          animate
          inlineStyles={false}
          components={componentsMap}
          collections={collectionsMap}
        />
        {footer.length > 0 && (
          <BlockRenderer
            tree={footer}
            viewport="desktop"
            animate
            inlineStyles={false}
            components={componentsMap}
            collections={collectionsMap}
          />
        )}
      </>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="p-8">
        <SlottedChildren parentId={null} parentType="root" items={tree} emptyMinHeight={360} />
      </div>
    );
  }

  return (
    <>
      <SlottedChildren parentId={null} parentType="root" items={tree} />
      <div className="flex justify-center px-8 py-6">
        <button
          data-open-inserter="root"
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-white/70 px-4 py-2.5 text-sm font-semibold text-zinc-500 shadow-xs transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
        >
          <span className="text-base leading-none">+</span> Add section
        </button>
      </div>
    </>
  );
}
