"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEditor, useSelectedBlock } from "@/store/editor-store";
import { useCanvasZoom } from "@/store/canvas-zoom";
import { useIframe } from "../iframe-context";
import { useDrag } from "../drag-context";
import {
  PANEL_WIDTH,
  clampW,
  measurePos,
  setFramePassthrough,
  undockedPos,
  dragMovePos,
  isInDockZone,
  shouldShow,
  panelStyle,
  type PanelPos,
} from "./useFloatingPanel.helpers";

/**
 * Bundles every store selector / context read / piece of panel state into one
 * hook so the component-facing `useFloatingPanel` stays at low hook-density.
 */
function useFloatingPanelStores() {
  const block = useSelectedBlock();
  const selectedId = useEditor((s) => s.selectedId);
  const tree = useEditor((s) => s.tree);
  const viewport = useEditor((s) => s.viewport);
  const previewMode = useEditor((s) => s.previewMode);
  const select = useEditor((s) => s.select);
  const { frame, tick } = useIframe();
  const zoom = useCanvasZoom((s) => s.zoom);
  const dragActive = !!useDrag().type;
  return { block, selectedId, tree, viewport, previewMode, select, frame, tick, zoom, dragActive };
}

function useFloatingPanelLocalState(selectedId: string | null) {
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [dragPos, setDragPos] = useState<PanelPos | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [docked, setDocked] = useState(false);
  const [dockHint, setDockHint] = useState(false);
  const [width, setWidth] = useState(PANEL_WIDTH);
  const [anchoredId, setAnchoredId] = useState(selectedId);
  return {
    pos,
    setPos,
    dragPos,
    setDragPos,
    dragging,
    setDragging,
    resizing,
    setResizing,
    docked,
    setDocked,
    dockHint,
    setDockHint,
    width,
    setWidth,
    anchoredId,
    setAnchoredId,
  };
}

function useFloatingPanelState() {
  const stores = useFloatingPanelStores();
  const local = useFloatingPanelLocalState(stores.selectedId);
  return { ...stores, ...local };
}

/** ESC closes the panel (deselect). */
function useEscToClose(select: (id: string | null) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && useEditor.getState().selectedId) select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);
}

/**
 * Drives the floating inspector panel: tracks the selected block, computes the
 * anchored position (translating iframe-internal rects to top-document/zoom
 * coords), and handles drag-to-move, edge-resize, dock-to-right, ESC-to-close,
 * and live repositioning on scroll/resize/zoom.
 */
export function useFloatingPanel() {
  const s = useFloatingPanelState();
  const {
    block,
    selectedId,
    tree,
    viewport,
    previewMode,
    select,
    pos,
    setPos,
    dragPos,
    setDragPos,
    dragging,
    setDragging,
    resizing,
    setResizing,
    docked,
    setDocked,
    dockHint,
    setDockHint,
    width,
    setWidth,
    frame,
    tick,
    zoom,
    dragActive,
    anchoredId,
    setAnchoredId,
  } = s;

  const posInputs = useRef({ frame, zoom, width });

  if (selectedId !== anchoredId) {
    setAnchoredId(selectedId);
    setDragPos(null);
  }

  useEscToClose(select);

  function handlePointerDown(e: React.PointerEvent) {
    const vw = window.innerWidth;
    let base = dragPos ?? pos;
    if (docked) {
      // undock: pop out as a floating panel near the right edge
      base = undockedPos(vw, width);
      setDocked(false);
      setDragPos(base);
    }
    if (!base) return;
    const start = { x: e.clientX, y: e.clientY, left: base.left, top: base.top };
    setDragging(true);
    setFramePassthrough(frame, true);
    const onMove = (ev: PointerEvent) => {
      setDragPos(dragMovePos(ev, start, vw, width));
      setDockHint(isInDockZone(ev.clientX, vw));
    };
    const onUp = (ev: PointerEvent) => {
      setDragging(false);
      setFramePassthrough(frame, false);
      if (isInDockZone(ev.clientX, vw)) setDocked(true);
      setDockHint(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    e.preventDefault();
  }

  function handleResizeDown(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const vw = window.innerWidth;
    const base = dragPos ?? pos;
    const rightEdge = docked ? vw : base ? base.left + width : vw - 8;
    setResizing(true);
    setFramePassthrough(frame, true);
    const onMove = (ev: PointerEvent) => {
      const w = clampW(rightEdge - ev.clientX);
      setWidth(w);
      if (!docked && base) {
        setDragPos({ left: rightEdge - w, top: base.top, maxHeight: base.maxHeight });
      }
    };
    const onUp = () => {
      setResizing(false);
      setFramePassthrough(frame, false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  const compute = useCallback(() => {
    setPos(measurePos(selectedId, frame, zoom, width));
  }, [selectedId, width, frame, zoom, setPos]);

  useLayoutEffect(() => {
    posInputs.current = { frame, zoom, width };
    const { frame: f, zoom: z, width: w } = posInputs.current;
    setPos(measurePos(selectedId, f, z, w));
  }, [selectedId, width, frame, zoom, tree, viewport, tick, setPos]);

  useEffect(() => {
    if (!selectedId) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    // iframe-internal scroll doesn't propagate to the parent window, so listen on
    // the iframe's own window too (the canvas no longer bumps `tick` on scroll).
    const fw = frame?.el.contentWindow;
    fw?.addEventListener("scroll", onScroll, true);
    let ro: ResizeObserver | undefined;
    const el = document.querySelector(`[data-block-id="${selectedId}"]`);
    if (el && "ResizeObserver" in window) {
      ro = new ResizeObserver(onScroll);
      ro.observe(el);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      fw?.removeEventListener("scroll", onScroll, true);
      ro?.disconnect();
    };
  }, [selectedId, compute, frame]);

  const eff = dragPos ?? pos;
  const show = shouldShow(block, previewMode, dragActive, docked, eff);
  const style = panelStyle(docked, width, eff);
  const toggleDock = useCallback(() => setDocked((d) => !d), [setDocked]);

  return {
    block,
    show,
    style,
    width,
    dragging,
    resizing,
    docked,
    dockHint,
    handlePointerDown,
    handleResizeDown,
    toggleDock,
  };
}
