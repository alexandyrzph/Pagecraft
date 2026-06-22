"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/store/editor-store";
import { useCanvasZoom } from "@/store/canvas-zoom";
import type { FrameInfo } from "./iframe-context";

type EditorState = ReturnType<typeof useEditor.getState>;

type ShortcutCtx = {
  e: KeyboardEvent;
  el: HTMLElement | null;
  mod: boolean;
  st: EditorState;
  save: () => void | Promise<void>;
  togglePalette: () => void;
};

type Shortcut = {
  /** `global` shortcuts fire even while a text field is focused. */
  global?: boolean;
  match: (c: ShortcutCtx) => boolean;
  run: (c: ShortcutCtx) => void;
};

const key = (e: KeyboardEvent) => e.key.toLowerCase();
const hasSelection = (st: EditorState) => !!st.selectedId || st.selectedIds.length > 0;

// First binding whose `match` passes wins and stops further handling, mirroring
// the original sequential `if (...) return` chain. Order is significant: the
// global group is checked before the selection group, and ⌘⌥-variants before
// their plain counterparts.
const SHORTCUTS: Shortcut[] = [
  {
    global: true,
    match: ({ e }) => e.key === "Escape",
    run: ({ e, el, st }) => {
      // blur any active field first, then close the settings panel
      el?.blur?.();
      if (st.selectedId) {
        e.preventDefault();
        st.select(null);
      }
    },
  },
  {
    global: true,
    match: ({ mod, e }) => mod && key(e) === "k",
    run: ({ e, togglePalette }) => {
      e.preventDefault();
      togglePalette();
    },
  },
  {
    global: true,
    match: ({ mod, e }) => mod && key(e) === "z",
    run: ({ e, st }) => {
      e.preventDefault();
      if (e.shiftKey) st.redo();
      else st.undo();
    },
  },
  {
    global: true,
    match: ({ mod, e }) => mod && key(e) === "s",
    run: ({ e, save }) => {
      e.preventDefault();
      void save();
    },
  },
  // canvas zoom — ⌘+ / ⌘- / ⌘0 (works while focused anywhere)
  {
    global: true,
    match: ({ mod, e }) => mod && (e.key === "=" || e.key === "+"),
    run: ({ e }) => {
      e.preventDefault();
      useCanvasZoom.getState().zoomIn();
    },
  },
  {
    global: true,
    match: ({ mod, e }) => mod && e.key === "-",
    run: ({ e }) => {
      e.preventDefault();
      useCanvasZoom.getState().zoomOut();
    },
  },
  {
    global: true,
    match: ({ mod, e }) => mod && e.key === "0",
    run: ({ e }) => {
      e.preventDefault();
      useCanvasZoom.getState().reset();
    },
  },
  // ⌘⌥C / ⌘⌥V — copy & paste styles (use e.code; Alt mangles e.key on Mac)
  {
    match: ({ mod, e, st }) => mod && e.altKey && e.code === "KeyC" && !!st.selectedId,
    run: ({ e, st }) => {
      if (!st.selectedId) return;
      e.preventDefault();
      st.copyStyles(st.selectedId);
    },
  },
  {
    match: ({ mod, e, st }) => mod && e.altKey && e.code === "KeyV" && hasSelection(st),
    run: ({ e, st }) => {
      e.preventDefault();
      st.pasteStyles(st.selectedId ?? st.selectedIds[0]);
    },
  },
  {
    match: ({ e, st }) => (e.key === "Delete" || e.key === "Backspace") && hasSelection(st),
    run: ({ e, st }) => {
      e.preventDefault();
      st.removeSelected();
    },
  },
  {
    match: ({ mod, e, st }) => mod && key(e) === "d" && hasSelection(st),
    run: ({ e, st }) => {
      e.preventDefault();
      st.duplicateSelected();
    },
  },
  {
    match: ({ mod, e, st }) => mod && !e.altKey && key(e) === "c" && !!st.selectedId,
    run: ({ e, st }) => {
      if (!st.selectedId) return;
      e.preventDefault();
      st.copy(st.selectedId);
    },
  },
  {
    match: ({ mod, e, st }) => mod && key(e) === "x" && !!st.selectedId,
    run: ({ e, st }) => {
      if (!st.selectedId) return;
      e.preventDefault();
      st.cut(st.selectedId);
    },
  },
  {
    match: ({ mod, e }) => mod && !e.altKey && key(e) === "v",
    run: ({ e, st }) => {
      e.preventDefault();
      st.paste(st.selectedId);
    },
  },
];

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
  useEffect(() => {
    toggleRef.current = togglePalette;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const editing =
        !!el &&
        (el.isContentEditable ||
          el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT");
      const ctx: ShortcutCtx = {
        e,
        el,
        mod: e.metaKey || e.ctrlKey,
        st: useEditor.getState(),
        save,
        togglePalette: toggleRef.current,
      };
      for (const shortcut of SHORTCUTS) {
        if (!shortcut.global && editing) continue;
        if (shortcut.match(ctx)) {
          shortcut.run(ctx);
          return;
        }
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
