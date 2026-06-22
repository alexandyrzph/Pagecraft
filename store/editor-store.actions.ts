"use client";

import type { StoreApi } from "zustand";
import type { Block, ResponsiveStyles } from "@/lib/types";
import { createBlock, createComponentInstance } from "@/lib/blocks/registry";
import {
  cloneWithNewIds,
  findBlockById,
  insertBlock,
  locate,
  moveBlock,
  removeBlock,
  replaceNode,
  setBlockStyles,
  updateBlockProp,
  updateBlockStyle,
} from "@/lib/blocks/tree";
import type { EditorState } from "./editor-store";

const HISTORY_LIMIT = 100;

type Set = StoreApi<EditorState>["setState"];
type Get = StoreApi<EditorState>["getState"];

const createCommit = (set: Set) => {
  /** Apply a new tree, recording history (with optional coalescing tag). */
  const commit = (next: Block[], tag: string | null = null) => {
    set((s) => {
      const coalesce = tag !== null && tag === s.lastTag;
      const past = coalesce ? s.past : [...s.past, s.tree].slice(-HISTORY_LIMIT);
      return { tree: next, past, future: [], dirty: true, lastTag: tag };
    });
  };
  return commit;
};

type LifecycleActions = Pick<
  EditorState,
  "init" | "setSaving" | "markSaved" | "clearLastAdded" | "setSeo" | "setTheme"
>;

export const createLifecycleActions = (set: Set): LifecycleActions => ({
  init: (page) =>
    set({
      pageId: page.id,
      title: page.title,
      slug: page.slug,
      published: page.published,
      seo: page.seo ?? {},
      theme: page.theme ?? {},
      tree: page.tree,
      selectedId: null,
      selectedIds: [],
      hoveredId: null,
      past: [],
      future: [],
      lastTag: null,
      lastAddedId: null,
      dirty: false,
    }),

  setSaving: (saving) => set({ saving }),
  markSaved: (at) => set({ dirty: false, saving: false, savedAt: at }),
  clearLastAdded: () => set({ lastAddedId: null }),
  setSeo: (partial) => set((s) => ({ seo: { ...s.seo, ...partial }, dirty: true })),
  setTheme: (partial) => set((s) => ({ theme: { ...s.theme, ...partial }, dirty: true })),
});

type MetaActions = Pick<EditorState, "setTitle" | "setPublished">;

export const createMetaActions = (set: Set): MetaActions => ({
  setTitle: (title) => set({ title, dirty: true }),
  setPublished: (published) => set({ published }),
});

type SelectionActions = Pick<
  EditorState,
  "select" | "toggleSelect" | "hover" | "setViewport" | "togglePreview"
>;

export const createSelectionActions = (set: Set): SelectionActions => ({
  select: (id) => set({ selectedId: id, selectedIds: id ? [id] : [] }),
  toggleSelect: (id) =>
    set((s) => {
      if (!id) return {};
      if (s.selectedIds.includes(id)) {
        const next = s.selectedIds.filter((x) => x !== id);
        return { selectedIds: next, selectedId: next[next.length - 1] ?? null };
      }
      return { selectedIds: [...s.selectedIds, id], selectedId: id };
    }),
  hover: (id) => set({ hoveredId: id }),
  setViewport: (viewport) => set({ viewport }),
  togglePreview: () =>
    set((s) => ({ previewMode: !s.previewMode, selectedId: null, selectedIds: [] })),
});

type BlockActions = Pick<
  EditorState,
  | "addBlock"
  | "addComponentInstance"
  | "replaceWithComponent"
  | "detachComponent"
  | "insertTree"
  | "moveExisting"
  | "remove"
  | "duplicate"
  | "removeSelected"
  | "duplicateSelected"
  | "moveRelative"
  | "setProp"
  | "setStyle"
  | "replaceTree"
>;

export const createBlockActions = (set: Set, get: Get): BlockActions => {
  const commit = createCommit(set);

  return {
    addBlock: (type, parentId, index) => {
      const block = createBlock(type);
      commit(insertBlock(get().tree, block, parentId, index));
      set({ selectedId: block.id, lastTag: null, lastAddedId: block.id });
    },

    addComponentInstance: (componentId, parentId, index) => {
      const block = createComponentInstance(componentId);
      commit(insertBlock(get().tree, block, parentId, index));
      set({ selectedId: block.id, lastTag: null, lastAddedId: block.id });
    },

    replaceWithComponent: (blockId, componentId) => {
      const inst = createComponentInstance(componentId);
      commit(replaceNode(get().tree, blockId, [inst]));
      set({ selectedId: inst.id, lastTag: null, lastAddedId: inst.id });
    },

    detachComponent: (instanceId, content) => {
      const clones = content.map(cloneWithNewIds);
      commit(replaceNode(get().tree, instanceId, clones));
      set({ selectedId: clones[0]?.id ?? null, lastTag: null });
    },

    insertTree: (block, parentId, index) => {
      commit(insertBlock(get().tree, block, parentId, index));
      set({ selectedId: block.id, lastTag: null, lastAddedId: block.id });
    },

    moveExisting: (id, parentId, index) => {
      commit(moveBlock(get().tree, id, parentId, index));
      set({ lastTag: null });
    },

    remove: (id) => {
      const { tree, removed } = removeBlock(get().tree, id);
      if (!removed) return;
      commit(tree);
      set((s) => ({
        selectedId: s.selectedId === id ? null : s.selectedId,
        selectedIds: s.selectedIds.filter((x) => x !== id),
        lastTag: null,
      }));
    },

    duplicate: (id) => {
      const tree = get().tree;
      const loc = locate(tree, id);
      const orig = findBlockById(tree, id);
      if (!orig || !loc) return;
      const clone = cloneWithNewIds(orig);
      commit(insertBlock(tree, clone, loc.parentId, loc.index + 1));
      set({ selectedId: clone.id, lastTag: null, lastAddedId: clone.id });
    },

    removeSelected: () => {
      const ids = get().selectedIds;
      if (ids.length <= 1) {
        const id = ids[0] ?? get().selectedId;
        if (id) get().remove(id);
        return;
      }
      let tree = get().tree;
      for (const id of ids) tree = removeBlock(tree, id).tree;
      commit(tree);
      set({ selectedId: null, selectedIds: [], lastTag: null });
    },

    duplicateSelected: () => {
      const ids = get().selectedIds;
      if (ids.length <= 1) {
        const id = ids[0] ?? get().selectedId;
        if (id) get().duplicate(id);
        return;
      }
      let tree = get().tree;
      const newIds: string[] = [];
      // Duplicate each in place; re-locate per step since the tree shifts.
      for (const id of ids) {
        const loc = locate(tree, id);
        const orig = findBlockById(tree, id);
        if (!orig || !loc) continue;
        const clone = cloneWithNewIds(orig);
        newIds.push(clone.id);
        tree = insertBlock(tree, clone, loc.parentId, loc.index + 1);
      }
      if (!newIds.length) return;
      commit(tree);
      set({ selectedIds: newIds, selectedId: newIds[newIds.length - 1], lastTag: null });
    },

    moveRelative: (id, dir) => {
      const tree = get().tree;
      const loc = locate(tree, id);
      if (!loc) return;
      if (dir === -1 && loc.index === 0) return;
      // moveBlock uses "slot" indices and subtracts 1 when moving down within
      // the same parent, so up = index-1 and down = index+2.
      const slot = dir === -1 ? loc.index - 1 : loc.index + 2;
      commit(moveBlock(tree, id, loc.parentId, slot));
      set({ lastTag: null, selectedId: id });
    },

    setProp: (id, key, value) =>
      commit(updateBlockProp(get().tree, id, key, value), `prop:${id}:${key}`),

    setStyle: (id, vp, key, value) =>
      commit(updateBlockStyle(get().tree, id, vp, key, value), `style:${id}:${vp}:${String(key)}`),

    replaceTree: (tree) => {
      commit(tree);
      set({ lastTag: null, selectedId: null, selectedIds: [] });
    },
  };
};

type ClipboardActions = Pick<EditorState, "copy" | "cut" | "paste" | "copyStyles" | "pasteStyles">;

export const createClipboardActions = (set: Set, get: Get): ClipboardActions => {
  const commit = createCommit(set);

  return {
    copy: (id) => {
      const b = findBlockById(get().tree, id);
      if (!b) return;
      try {
        localStorage.setItem("pc-clipboard", JSON.stringify(b));
      } catch {
        /* ignore */
      }
    },

    cut: (id) => {
      get().copy(id);
      get().remove(id);
    },

    paste: (afterId) => {
      let block: Block | null = null;
      try {
        const raw = localStorage.getItem("pc-clipboard");
        if (raw) block = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      if (!block || !block.type) return;
      const clone = cloneWithNewIds(block);
      const tree = get().tree;
      const loc = afterId ? locate(tree, afterId) : null;
      if (loc) commit(insertBlock(tree, clone, loc.parentId, loc.index + 1));
      else commit(insertBlock(tree, clone, null, tree.length));
      set({ selectedId: clone.id, lastTag: null, lastAddedId: clone.id });
    },

    copyStyles: (id) => {
      const b = findBlockById(get().tree, id);
      if (!b) return;
      try {
        localStorage.setItem("pc-style-clipboard", JSON.stringify(b.styles ?? {}));
      } catch {
        /* ignore */
      }
    },

    pasteStyles: (id) => {
      let styles: ResponsiveStyles | null = null;
      try {
        const raw = localStorage.getItem("pc-style-clipboard");
        if (raw) styles = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      if (!styles) return;
      const sel = get().selectedIds;
      const ids = sel.length ? sel : id ? [id] : [];
      if (!ids.length) return;
      let tree = get().tree;
      for (const tid of ids) tree = setBlockStyles(tree, tid, styles);
      commit(tree);
      set({ lastTag: null });
    },
  };
};

type HistoryActions = Pick<EditorState, "undo" | "redo" | "canUndo" | "canRedo">;

export const createHistoryActions = (set: Set, get: Get): HistoryActions => ({
  undo: () =>
    set((s) => {
      if (!s.past.length) return {};
      const previous = s.past[s.past.length - 1];
      return {
        tree: previous,
        past: s.past.slice(0, -1),
        future: [s.tree, ...s.future].slice(0, HISTORY_LIMIT),
        dirty: true,
        lastTag: null,
        lastAddedId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return {};
      const next = s.future[0];
      return {
        tree: next,
        past: [...s.past, s.tree].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        dirty: true,
        lastTag: null,
        lastAddedId: null,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
});
