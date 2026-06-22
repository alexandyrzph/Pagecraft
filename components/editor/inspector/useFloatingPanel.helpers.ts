import type { FrameInfo } from "../iframe-context";
import type { Block } from "@/lib/types";

export const PANEL_WIDTH = 304;
export const LEFT_PANEL = 256; // keep clear of the components panel
export const GAP = 14;
export const DOCK_THRESHOLD = 60; // px from the right edge that triggers docking
export const clampW = (w: number) => Math.max(264, Math.min(w, 560));

export type PanelPos = { left: number; top: number; maxHeight: number };

/**
 * Translate a selected block's rect into the anchored floating-panel position.
 * Pure: takes the measured element + frame/zoom/width and returns coords, so it
 * can be reused by both the synchronous layout pass and the async re-measure.
 */
export function positionFor(
  el: Element,
  frame: FrameInfo | null,
  zoom: number,
  width: number,
): PanelPos {
  const r = el.getBoundingClientRect();
  // translate iframe-relative rect into top-document viewport coords. Blocks
  // inside the iframe are in unscaled internal px, so scale by the canvas zoom
  // to match the visually scaled iframe before offsetting by its position.
  const inFrame = !!(frame && el.ownerDocument === frame.doc);
  const off = inFrame && frame ? frame.el.getBoundingClientRect() : { left: 0, top: 0 };
  const sc = inFrame ? zoom : 1;
  const rect = {
    top: r.top * sc + off.top,
    left: r.left * sc + off.left,
    right: r.right * sc + off.left,
  };
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left: number;
  if (rect.right + GAP + width <= vw - 8) left = rect.right + GAP;
  else if (rect.left - GAP - width >= LEFT_PANEL + 8) left = rect.left - GAP - width;
  else left = vw - width - 8;

  const top = Math.max(64, Math.min(rect.top, vh - 360));
  return { left, top, maxHeight: vh - top - 16 };
}

/** Measure the selected block in its document and return its anchored position. */
export function measurePos(
  selectedId: string | null,
  frame: FrameInfo | null,
  zoom: number,
  width: number,
): PanelPos | null {
  const doc = frame?.doc ?? document;
  const el = doc.querySelector(`[data-block-id="${selectedId ?? ""}"]`);
  return el ? positionFor(el, frame, zoom, width) : null;
}

/** Toggle pointer-events passthrough on the canvas iframe element. */
export function setFramePassthrough(frame: FrameInfo | null, on: boolean) {
  const el = frame?.el;
  if (!el) return;
  if (on) el.style.setProperty("pointer-events", "none");
  else el.style.removeProperty("pointer-events");
}

/** Floating position used when popping a docked panel back out near the right edge. */
export function undockedPos(vw: number, width: number): PanelPos {
  return { left: Math.max(8, vw - width - 16), top: 72, maxHeight: window.innerHeight - 88 };
}

/** Next floating position while dragging the panel by its header. */
export function dragMovePos(
  ev: PointerEvent,
  start: { x: number; y: number; left: number; top: number },
  vw: number,
  width: number,
): PanelPos {
  const left = Math.max(8, Math.min(start.left + ev.clientX - start.x, vw - width - 8));
  const top = Math.max(56, Math.min(start.top + ev.clientY - start.y, window.innerHeight - 90));
  return { left, top, maxHeight: window.innerHeight - top - 16 };
}

/** Whether the pointer is within the right-edge dock-trigger band. */
export function isInDockZone(clientX: number, vw: number) {
  return clientX > vw - DOCK_THRESHOLD;
}

/** Whether the inspector panel should be visible. */
export function shouldShow(
  block: Block | null,
  previewMode: boolean,
  dragActive: boolean,
  docked: boolean,
  eff: PanelPos | null,
): boolean {
  return !!block && !previewMode && !dragActive && (docked || !!eff);
}

/** Inline style for the panel — docked fills the right rail, else floats at `eff`. */
export function panelStyle(
  docked: boolean,
  width: number,
  eff: PanelPos | null,
): React.CSSProperties {
  return docked
    ? { position: "fixed", top: 56, right: 0, bottom: 0, width }
    : {
        position: "fixed",
        left: eff?.left ?? 0,
        top: eff?.top ?? 64,
        width,
        maxHeight: eff?.maxHeight,
      };
}
