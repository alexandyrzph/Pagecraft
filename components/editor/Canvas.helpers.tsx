"use client";

import type { Block, CollectionMap } from "@/lib/types";
import { widthBand, type Breakpoint } from "@/store/breakpoints";
import { BlockRenderer } from "@/components/BlockRenderer";
import { SlottedChildren } from "./EditorBlock";
import type { FrameInfo } from "./iframe-context";
import type { ComponentItem } from "./components-context";

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
