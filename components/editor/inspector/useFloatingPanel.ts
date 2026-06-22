"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEditor, useSelectedBlock } from "@/store/editor-store";
import { useCanvasZoom } from "@/store/canvas-zoom";
import { useIframe } from "../iframe-context";
import { useDrag } from "../drag-context";
import {
  PANEL_WIDTH,
  measurePos,
  shouldShow,
  panelStyle,
  createPanelPointerDown,
  createPanelResizeDown,
  subscribeReposition,
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

  const base = dragPos ?? pos;
  const handlePointerDown = createPanelPointerDown({
    base,
    docked,
    width,
    frame,
    setDocked,
    setDragPos,
    setDragging,
    setDockHint,
  });
  const handleResizeDown = createPanelResizeDown({
    base,
    docked,
    width,
    frame,
    setResizing,
    setWidth,
    setDragPos,
  });

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
    return subscribeReposition(selectedId, frame, compute);
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
