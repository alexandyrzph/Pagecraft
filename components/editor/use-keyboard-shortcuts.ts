"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/store/editor-store";
import { useCanvasZoom } from "@/store/canvas-zoom";
import type { FrameInfo } from "./iframe-context";

/**
 * Global editor keyboard shortcuts (undo/redo, save, zoom, copy/paste/dup/delete,
 * palette, escape). Listens on window AND inside the canvas iframe (focus may live
 * there). `togglePalette` is read via a ref so an inline callback doesn't re-bind
 * the listener — the effect re-subscribes only when `save` or `frame` change.
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
      const el = e.target as HTMLElement | null;
      const editing =
        !!el &&
        (el.isContentEditable ||
          el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT");
      const mod = e.metaKey || e.ctrlKey;
      const st = useEditor.getState();

      if (e.key === "Escape") {
        // blur any active field first, then close the settings panel
        (el as HTMLElement | null)?.blur?.();
        if (st.selectedId) {
          e.preventDefault();
          st.select(null);
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleRef.current();
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
        return;
      }
      // canvas zoom — ⌘+ / ⌘- / ⌘0 (works while focused anywhere)
      if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        useCanvasZoom.getState().zoomIn();
        return;
      }
      if (mod && e.key === "-") {
        e.preventDefault();
        useCanvasZoom.getState().zoomOut();
        return;
      }
      if (mod && e.key === "0") {
        e.preventDefault();
        useCanvasZoom.getState().reset();
        return;
      }
      if (editing) return;
      // ⌘⌥C / ⌘⌥V — copy & paste styles (use e.code; Alt mangles e.key on Mac)
      if (mod && e.altKey && e.code === "KeyC" && st.selectedId) {
        e.preventDefault();
        st.copyStyles(st.selectedId);
        return;
      }
      if (mod && e.altKey && e.code === "KeyV" && (st.selectedId || st.selectedIds.length)) {
        e.preventDefault();
        st.pasteStyles(st.selectedId ?? st.selectedIds[0]);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && (st.selectedId || st.selectedIds.length)) {
        e.preventDefault();
        st.removeSelected();
      }
      if (mod && e.key.toLowerCase() === "d" && (st.selectedId || st.selectedIds.length)) {
        e.preventDefault();
        st.duplicateSelected();
      }
      if (mod && !e.altKey && e.key.toLowerCase() === "c" && st.selectedId) {
        e.preventDefault();
        st.copy(st.selectedId);
      }
      if (mod && e.key.toLowerCase() === "x" && st.selectedId) {
        e.preventDefault();
        st.cut(st.selectedId);
      }
      if (mod && !e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        st.paste(st.selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    // also listen inside the canvas iframe (focus may live there)
    const fw = frame?.el.contentWindow;
    fw?.addEventListener("keydown", onKey as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      fw?.removeEventListener("keydown", onKey as EventListener);
    };
  }, [save, frame]);
}
