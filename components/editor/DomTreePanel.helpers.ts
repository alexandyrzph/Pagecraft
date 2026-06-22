"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/types";
import { useEditor } from "@/store/editor-store";
import { useEditorUI } from "@/store/editor-ui";
import { useIframe, type FrameInfo } from "./iframe-context";

export type Mode = "dock" | "full" | "float";
export type Float = { x: number; y: number; w: number; h: number };
export type Dims = "h-top" | "w" | "h" | "wh";

const DRAG_THRESHOLD = 5; // px the pointer must move before a drag/detach starts
const DOCK_ZONE = 90; // px from the bottom edge that re-docks the panel

export function countNodes(tree: Block[]): number {
  return tree.reduce((n, b) => n + 1 + countNodes(b.children), 0);
}

export function asideClassName(float: boolean, mode: Mode): string {
  return cn(
    "fixed z-[35] flex flex-col border-zinc-200 bg-white",
    float
      ? "rounded-xl border shadow-2xl ring-1 ring-black/5"
      : cn(
          "right-0 border-t shadow-[0_-8px_24px_rgba(0,0,0,0.08)]",
          mode === "dock" ? "left-0 lg:left-[294px]" : "left-0",
        ),
  );
}

export function dockZoneClassName(lastDock: Mode): string {
  return cn(
    "pointer-events-none fixed bottom-0 right-0 z-[34] flex h-28 items-end justify-center border-t-2 border-dashed border-indigo-400 bg-gradient-to-t from-indigo-500/15 to-transparent",
    lastDock === "dock" ? "left-0 lg:left-[294px]" : "left-0",
  );
}

// For docked modes leave left/right to classes (inline left:0 would override
// the lg:left-[294px] canvas offset); only set bottom/height inline.
export function positionStyleFor(float: boolean, flt: Float, height: number): React.CSSProperties {
  return float ? { left: flt.x, top: flt.y, width: flt.w, height: flt.h } : { bottom: 0, height };
}

function nextDockHeight(startHeight: number, sy: number, clientY: number): number {
  // docked: dragging the top edge up grows the panel
  return Math.max(140, Math.min(startHeight + (sy - clientY), window.innerHeight - 100));
}

function nextFloatSize(
  dims: Dims,
  start: { w: number; h: number },
  ev: PointerEvent,
  sx: number,
  sy: number,
  f: Float,
): Float {
  return {
    ...f,
    w:
      dims === "w" || dims === "wh"
        ? Math.max(280, Math.min(start.w + (ev.clientX - sx), window.innerWidth - f.x - 8))
        : f.w,
    h:
      dims === "h" || dims === "wh"
        ? Math.max(160, Math.min(start.h + (ev.clientY - sy), window.innerHeight - f.y - 8))
        : f.h,
  };
}

// detach: pop out under the cursor (cursor near the title), keep size
function detachFloatSize(initialized: boolean, startFlt: Float): { w: number; h: number } {
  return {
    w: initialized ? startFlt.w : Math.min(520, window.innerWidth - 360),
    h: initialized ? startFlt.h : 420,
  };
}

// While dragging/resizing, make the iframe pointer-inert so it doesn't
// swallow pointermove/up (same gotcha the FloatingInspector handles).
export function makePassthrough(frame: FrameInfo | null) {
  return (on: boolean) => {
    const el = frame?.el;
    if (!el) return;
    if (on) el.style.setProperty("pointer-events", "none");
    else el.style.removeProperty("pointer-events");
  };
}

// Store/state wiring for the panel, kept in one hook so the component body is
// just the drag/resize handlers and render.
export function useDomTreePanelState() {
  const { open, close } = useEditorUI(
    useShallow((s) => ({ open: s.domTree, close: s.closeDomTree })),
  );
  const tree = useEditor((s) => s.tree);
  const { frame } = useIframe();

  const [mode, setMode] = useState<Mode>("dock");
  const [height, setHeight] = useState(320); // docked height (px)
  const [flt, setFlt] = useState<Float>({ x: 0, y: 0, w: 460, h: 380 });
  const [dragging, setDragging] = useState(false);
  const [dockHint, setDockHint] = useState(false);
  const [lastDock, setLastDock] = useState<Mode>("dock"); // which docked mode to restore on re-dock

  return {
    open,
    close,
    tree,
    frame,
    mode,
    setMode,
    height,
    setHeight,
    flt,
    setFlt,
    dragging,
    setDragging,
    dockHint,
    setDockHint,
    lastDock,
    setLastDock,
  };
}

export type DomTreePanelState = ReturnType<typeof useDomTreePanelState>;

function ensureFloat({
  fltInit,
  flt,
  setFlt,
}: {
  fltInit: { current: boolean };
  flt: Float;
  setFlt: (f: Float) => void;
}): Float {
  if (!fltInit.current) {
    fltInit.current = true;
    const w = Math.min(520, window.innerWidth - 360);
    const next = { x: window.innerWidth - w - 24, y: 80, w, h: 420 };
    setFlt(next);
    return next;
  }
  return flt;
}

// Drag the header. A plain click does nothing; only once the pointer moves past
// DRAG_THRESHOLD does it start dragging — detaching a docked panel into a
// floating one under the cursor. Releasing over the bottom dock zone re-docks it.
export function runHeaderDown(
  e: React.PointerEvent,
  {
    state,
    fltInit,
    passthrough,
  }: {
    state: DomTreePanelState;
    fltInit: { current: boolean };
    passthrough: (on: boolean) => void;
  },
) {
  const { mode, flt, lastDock, setMode, setFlt, setDragging, setDockHint } = state;
  if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
  const sx = e.clientX,
    sy = e.clientY;
  const startMode = mode;
  const startFlt = flt;
  let started = false;
  let grabX = 0,
    grabY = 0; // cursor offset within the floating panel

  const move = (ev: PointerEvent) => {
    if (!started) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_THRESHOLD) return;
      started = true;
      setDragging(true);
      passthrough(true);
      if (startMode === "float") {
        grabX = sx - startFlt.x;
        grabY = sy - startFlt.y;
      } else {
        const { w, h } = detachFloatSize(fltInit.current, startFlt);
        fltInit.current = true;
        grabX = Math.min(90, w - 40);
        grabY = 16;
        setMode("float");
        setFlt({ x: ev.clientX - grabX, y: ev.clientY - grabY, w, h });
      }
    }
    const x = Math.max(8, Math.min(ev.clientX - grabX, window.innerWidth - 120));
    const y = Math.max(56, Math.min(ev.clientY - grabY, window.innerHeight - 60));
    setFlt((f) => ({ ...f, x, y }));
    setDockHint(ev.clientY > window.innerHeight - DOCK_ZONE);
  };

  const up = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    if (!started) return; // it was a click, not a drag — leave mode unchanged
    setDragging(false);
    passthrough(false);
    setDockHint(false);
    if (ev.clientY > window.innerHeight - DOCK_ZONE) setMode(lastDock);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

// Resize handles. `dims` selects which dimensions an edge affects.
export function runResizeDown(
  e: React.PointerEvent,
  dims: Dims,
  {
    state,
    passthrough,
  }: {
    state: DomTreePanelState;
    passthrough: (on: boolean) => void;
  },
) {
  const { height, flt, setHeight, setFlt } = state;
  e.stopPropagation();
  const sx = e.clientX,
    sy = e.clientY;
  const start = { height, w: flt.w, h: flt.h };
  passthrough(true);
  const move = (ev: PointerEvent) => {
    if (dims === "h-top") {
      setHeight(nextDockHeight(start.height, sy, ev.clientY));
    } else {
      setFlt((f) => nextFloatSize(dims, start, ev, sx, sy, f));
    }
  };
  const up = () => {
    passthrough(false);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

export function runSelectMode(
  m: Mode,
  { state, fltInit }: { state: DomTreePanelState; fltInit: { current: boolean } },
) {
  const { flt, setFlt, setMode, setLastDock } = state;
  if (m === "float") {
    ensureFloat({ fltInit, flt, setFlt });
    setMode("float");
  } else {
    setLastDock(m);
    setMode(m);
  }
}
