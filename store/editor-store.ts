"use client";

import { create } from "zustand";
import type { Block, Seo, StyleProps, Theme, Viewport } from "@/lib/types";
import { findBlockById } from "@/lib/blocks/tree";
import {
  createBlockActions,
  createClipboardActions,
  createHistoryActions,
  createLifecycleActions,
  createMetaActions,
  createSelectionActions,
} from "./editor-store.actions";

export type EditorState = {
  // page meta
  pageId: string | null;
  title: string;
  slug: string;
  published: boolean;
  seo: Seo;
  theme: Theme;

  // document
  tree: Block[];

  // ui
  selectedId: string | null;
  /** All selected block ids (multi-select). `selectedId` is the primary/anchor. */
  selectedIds: string[];
  hoveredId: string | null;
  viewport: Viewport;
  previewMode: boolean;

  // history
  past: Block[][];
  future: Block[][];
  lastTag: string | null;

  // transient: id of the most recently added block (drives enter anim + scroll)
  lastAddedId: string | null;

  // persistence
  dirty: boolean;
  saving: boolean;
  savedAt: number | null;

  // --- lifecycle ---
  init: (page: {
    id: string;
    title: string;
    slug: string;
    published: boolean;
    tree: Block[];
    seo?: Seo;
    theme?: Theme;
  }) => void;
  setSaving: (saving: boolean) => void;
  markSaved: (at: number) => void;
  clearLastAdded: () => void;
  setSeo: (partial: Seo) => void;
  setTheme: (partial: Theme) => void;

  // --- meta ---
  setTitle: (title: string) => void;
  setPublished: (published: boolean) => void;

  // --- selection / ui ---
  select: (id: string | null) => void;
  /** Add/remove a block from the multi-selection (shift/cmd-click). */
  toggleSelect: (id: string) => void;
  hover: (id: string | null) => void;
  setViewport: (vp: Viewport) => void;
  togglePreview: () => void;

  // --- document mutations ---
  addBlock: (type: string, parentId: string | null, index: number) => void;
  addComponentInstance: (componentId: string, parentId: string | null, index: number) => void;
  replaceWithComponent: (blockId: string, componentId: string) => void;
  detachComponent: (instanceId: string, content: Block[]) => void;
  insertTree: (block: Block, parentId: string | null, index: number) => void;
  moveExisting: (id: string, parentId: string | null, index: number) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  copy: (id: string) => void;
  cut: (id: string) => void;
  paste: (afterId: string | null) => void;
  copyStyles: (id: string) => void;
  pasteStyles: (id: string) => void;
  moveRelative: (id: string, dir: -1 | 1) => void;
  setProp: (id: string, key: string, value: unknown) => void;
  setStyle: (id: string, vp: Viewport, key: keyof StyleProps, value: string) => void;
  replaceTree: (tree: Block[]) => void;

  // --- history ---
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export const useEditor = create<EditorState>((set, get) => ({
  pageId: null,
  title: "Untitled Page",
  slug: "",
  published: false,
  seo: {},
  theme: {},
  tree: [],
  selectedId: null,
  selectedIds: [],
  hoveredId: null,
  viewport: "desktop",
  previewMode: false,
  past: [],
  future: [],
  lastTag: null,
  lastAddedId: null,
  dirty: false,
  saving: false,
  savedAt: null,

  ...createLifecycleActions(set),
  ...createMetaActions(set),
  ...createSelectionActions(set),
  ...createBlockActions(set, get),
  ...createClipboardActions(set, get),
  ...createHistoryActions(set, get),
}));

/** Convenience selector for the currently-selected block. */
export function useSelectedBlock(): Block | null {
  return useEditor((s) => (s.selectedId ? findBlockById(s.tree, s.selectedId) : null));
}
